import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";

// Prioridade dos status — impede regressão (evento atrasado não volta status)
const STATUS_PRIORIDADE: Record<string, number> = {
  aguardando_postagem: 0,
  postado: 1,
  em_transporte: 2,
  aguardando_retirada: 3,
  entregue: 4,
  devolvido: 5,
};

// Mapeamento completo de códigos H7 → status interno
const STATUS_MAP: Record<string, string> = {
  "1":  "postado",
  "2":  "devolvido",       // Cancelado
  "5":  "entregue",        // Entregue
  "6":  "devolvido",       // Recusado pelo destinatário
  "7":  "devolvido",       // Devolução iniciada
  "8":  "devolvido",       // Devolvido
  "11": "em_transporte",   // Em rota
  "13": "em_transporte",   // Conferido
  "15": "em_transporte",   // Medido e pesado
  "16": "em_transporte",   // Saiu de uma base
  "17": "em_transporte",   // Chegou em uma base
  "18": "aguardando_retirada", // Destinatário ausente → aguarda retirada
  "21": "em_transporte",   // Endereço errado (mantém em transporte, problema operacional)
  "22": "em_transporte",   // Aguardando ação do remetente (idem)
};

export async function POST(req: NextRequest) {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ ok: false, erro: "JSON inválido" }, { status: 400 });
  }

  // Suporte ao envelope n8n: [{headers, body, ...}]
  const eventos = Array.isArray(raw) ? raw : [raw];
  const supabase = createServiceClient();
  let processados = 0;
  let atualizados = 0;

  for (const evento of eventos) {
    // Extrair body H7 do envelope n8n
    const h7body = (evento as Record<string, unknown>).body ?? evento;
    const h7 = h7body as Record<string, unknown>;

    const trackingCode = (h7.trackingCode as string) ?? null;
    const loggiKey     = (h7.loggiKey as string) ?? null;
    const statusObj    = (h7.status as Record<string, unknown>) ?? {};
    const statusCode   = (statusObj.code as string) ?? null;
    const statusDesc   = (statusObj.highLevelStatus as string) ?? null;
    const updatedTime  = (statusObj.updatedTime as string) ?? null;

    // 1. Logar raw sempre
    await supabase.from("h7_eventos_raw").insert({
      tracking_code:    trackingCode,
      loggi_key:        loggiKey,
      status_code:      statusCode,
      status_descricao: statusDesc,
      payload_raw:      h7,
    });

    processados++;

    // 2. Mapear status
    const novoStatus = statusCode ? STATUS_MAP[statusCode] : null;
    if (!novoStatus || !trackingCode) {
      console.log(`[webhook-h7] sem mapeamento: code=${statusCode} tracking=${trackingCode}`);
      continue;
    }

    // 3. Buscar pedido pelo código de rastreio ou loggi_key
    let pedidoId: string | null = null;
    let statusAtual: string | null = null;
    let clienteTelefone: string | null = null;
    let clienteNome: string | null = null;
    let codigoRastreioAtual: string | null = null;

    const { data: pedido } = await supabase
      .from("pedidos")
      .select("id, status, cliente_telefone, cliente_nome, codigo_rastreio")
      .eq("codigo_rastreio", trackingCode)
      .single();

    if (pedido) {
      pedidoId = pedido.id;
      statusAtual = pedido.status;
      clienteTelefone = pedido.cliente_telefone;
      clienteNome = pedido.cliente_nome;
      codigoRastreioAtual = pedido.codigo_rastreio;
    } else if (loggiKey) {
      const { data: p2 } = await supabase
        .from("pedidos")
        .select("id, status, cliente_telefone, cliente_nome, codigo_rastreio")
        .eq("loggi_key", loggiKey)
        .single();
      if (p2) {
        pedidoId = p2.id;
        statusAtual = p2.status;
        clienteTelefone = p2.cliente_telefone;
        clienteNome = p2.cliente_nome;
        codigoRastreioAtual = p2.codigo_rastreio;
      }
    }

    if (!pedidoId) {
      console.log(`[webhook-h7] pedido não encontrado: tracking=${trackingCode}`);
      continue;
    }

    // 4. Capturar datas de entrega do payload H7
    // promisedDate vem como "YYYY-MM-DD" (campo raiz do payload H7)
    const promisedDate      = (h7.promisedDate as string) ?? null;
    // data_chegada_logistica: registrada quando status code = 17 ("Chegou em uma base")
    const chegouNaBase      = statusCode === "17";

    // 5. Atualizar pedido
    const update: Record<string, unknown> = {
      loggi_key:  loggiKey,
      updated_at: new Date().toISOString(),
    };

    // Só avança status se a prioridade do novo for maior que o atual
    // (impede que eventos atrasados regridan o pedido)
    const prioAtual = STATUS_PRIORIDADE[statusAtual ?? ""] ?? -1;
    const prioNova  = STATUS_PRIORIDADE[novoStatus] ?? -1;
    if (prioNova > prioAtual) {
      update.status = novoStatus;
    }
    if (!codigoRastreioAtual && trackingCode) update.codigo_rastreio = trackingCode;
    if (novoStatus === "entregue" && updatedTime)  update.data_entrega = updatedTime;

    // Salva data prometida sempre que a H7 informar (pode atualizar)
    if (promisedDate) update.data_prometida_entrega = promisedDate;

    // Salva o momento em que chegou na base logística (primeira ocorrência)
    if (chegouNaBase && updatedTime) update.data_chegou_logistica = updatedTime;

    await supabase.from("pedidos").update(update).eq("id", pedidoId);
    atualizados++;

    console.log(`[webhook-h7] ${trackingCode} → ${novoStatus} (pedido ${pedidoId}) prometida=${promisedDate ?? "n/a"} chegouBase=${chegouNaBase}`);

    // 6. Disparar WhatsApp se chegou em aguardando_retirada (e ainda não era)
    if (novoStatus === "aguardando_retirada" && statusAtual !== "aguardando_retirada" && clienteTelefone) {
      const { data: jaDisparado } = await supabase
        .from("whatsapp_disparos")
        .select("id")
        .eq("pedido_id", pedidoId)
        .eq("tipo_mensagem", "aguardando_retirada")
        .neq("status", "falhou")
        .single();

      if (!jaDisparado) {
        await supabase.from("whatsapp_disparos").insert({
          pedido_id:      pedidoId,
          tipo_mensagem:  "aguardando_retirada",
          status:         "pendente",
          data_envio:     new Date().toISOString(),
        });
      }
    }
  }

  return NextResponse.json({ ok: true, processados, atualizados });
}
