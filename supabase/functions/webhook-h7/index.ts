// Supabase Edge Function — Webhook H7/Loggi (Rastreamento)
// Deploy: supabase functions deploy webhook-h7

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

// Mapeamento completo de códigos H7 → status interno
const STATUS_MAP: Record<string, string> = {
  "1":  "postado",
  "2":  "devolvido",           // Cancelado
  "5":  "entregue",            // Entregue
  "6":  "devolvido",           // Recusado pelo destinatário
  "7":  "devolvido",           // Devolução iniciada
  "8":  "devolvido",           // Devolvido
  "11": "em_transporte",       // Em rota
  "13": "em_transporte",       // Conferido
  "15": "em_transporte",       // Medido e pesado
  "16": "em_transporte",       // Saiu de uma base
  "17": "em_transporte",       // Chegou em uma base
  "18": "aguardando_retirada", // Destinatário ausente
  "21": "em_transporte",       // Endereço errado
  "22": "em_transporte",       // Aguardando ação do remetente
};

const WHATSAPP_TRIGGER_STATUS = "aguardando_retirada";

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const trackingCode = body.trackingCode as string;
  const loggiKey = body.loggiKey as string;
  const statusObj = body.status as Record<string, unknown>;
  const statusCode = statusObj?.code as string;
  const statusDescricao = statusObj?.highLevelStatus as string;
  const updatedTime = statusObj?.updatedTime as string;

  // Logar SEMPRE em h7_eventos_raw (para descobrir todos os status codes)
  await supabase.from("h7_eventos_raw").insert({
    tracking_code: trackingCode,
    loggi_key: loggiKey,
    status_code: statusCode,
    status_descricao: statusDescricao,
    payload_raw: body,
  });

  // Mapear para status interno
  const novoStatus = STATUS_MAP[statusCode];
  if (!novoStatus) {
    // Status ainda não mapeado — logado acima, retornar OK
    console.log(`Status H7 não mapeado: code=${statusCode} desc="${statusDescricao}"`);
    return new Response(
      JSON.stringify({ ok: true, skipped: "status_not_mapped", code: statusCode }),
      { headers: { "Content-Type": "application/json" } }
    );
  }

  // Buscar pedido pelo trackingCode
  // O transaction_id da Payt é o mesmo ID de referência na H7
  // Buscar pelo codigo_rastreio (já salvo quando código 1 chegou) ou loggi_key
  let { data: pedido } = await supabase
    .from("pedidos")
    .select("id, status, cliente_nome, cliente_telefone, codigo_rastreio")
    .eq("codigo_rastreio", trackingCode)
    .single();

  // Se não encontrou pelo trackingCode, tentar pelo loggiKey
  if (!pedido && loggiKey) {
    const result = await supabase
      .from("pedidos")
      .select("id, status, cliente_nome, cliente_telefone, codigo_rastreio")
      .eq("loggi_key", loggiKey)
      .single();
    pedido = result.data;
  }

  if (!pedido) {
    console.log(`Pedido não encontrado para trackingCode=${trackingCode}`);
    return new Response(
      JSON.stringify({ ok: true, skipped: "pedido_not_found", trackingCode }),
      { headers: { "Content-Type": "application/json" } }
    );
  }

  // Atualizar pedido
  const updateData: Record<string, unknown> = {
    status: novoStatus,
    updated_at: new Date().toISOString(),
  };

  // Salvar trackingCode se ainda não estiver salvo
  if (!pedido.codigo_rastreio && trackingCode) {
    updateData.codigo_rastreio = trackingCode;
  }
  if (loggiKey) {
    updateData.loggi_key = loggiKey;
  }
  if (novoStatus === "entregue") {
    updateData.data_entrega = updatedTime ?? new Date().toISOString();
  }
  if (statusCode === "17" && updatedTime) {
    updateData.data_chegou_logistica = updatedTime;
  }
  const promisedDate = body.promisedDate as string | undefined;
  if (promisedDate) {
    updateData.data_prometida_entrega = promisedDate;
  }

  await supabase
    .from("pedidos")
    .update(updateData)
    .eq("id", pedido.id);

  // Disparar WhatsApp se status mudou para aguardando_retirada
  if (novoStatus === WHATSAPP_TRIGGER_STATUS && pedido.status !== WHATSAPP_TRIGGER_STATUS) {
    // Verificar se já foi disparado para este pedido
    const { data: disparoExistente } = await supabase
      .from("whatsapp_disparos")
      .select("id")
      .eq("pedido_id", pedido.id)
      .eq("tipo_mensagem", "aguardando_retirada")
      .neq("status", "falhou")
      .single();

    if (!disparoExistente && pedido.cliente_telefone) {
      // Registrar disparo como pendente
      const { data: disparo } = await supabase
        .from("whatsapp_disparos")
        .insert({
          pedido_id: pedido.id,
          tipo_mensagem: "aguardando_retirada",
          status: "pendente",
          data_envio: new Date().toISOString(),
        })
        .select("id")
        .single();

      // Chamar endpoint de envio (via Next.js API ou diretamente a Graph API)
      const whatsappUrl = Deno.env.get("NEXTJS_WHATSAPP_ENDPOINT");
      if (whatsappUrl && disparo) {
        await fetch(whatsappUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${Deno.env.get("INTERNAL_API_SECRET")}`,
          },
          body: JSON.stringify({
            disparoId: disparo.id,
            telefone: pedido.cliente_telefone,
            nomeCliente: pedido.cliente_nome,
            codigoRastreio: trackingCode ?? pedido.codigo_rastreio,
          }),
        }).catch(console.error);
      }
    }
  }

  return new Response(
    JSON.stringify({ ok: true, pedidoId: pedido.id, novoStatus }),
    { headers: { "Content-Type": "application/json" } }
  );
});
