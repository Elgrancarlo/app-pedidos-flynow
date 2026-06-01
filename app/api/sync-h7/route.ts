import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { enviarWhatsappAguardandoRetirada } from "@/lib/whatsapp";
import { isTrustedAppRequest } from "@/lib/request-origin";
import { getTodayInAppTimezone, shiftDateString } from "@/lib/app-dates";

const H7_API_URL = process.env.H7_API_URL ?? "https://api.haga7digital.com.br/api/orders/fly";
const H7_TOKEN = process.env.H7_TOKEN ?? "";
const H7_PER_PAGE = 100;
const INTERNAL_API_SECRET = process.env.INTERNAL_API_SECRET;

const STATUS_PRIORIDADE: Record<string, number> = {
  aguardando_postagem: 0,
  postado: 1,
  em_transporte: 2,
  aguardando_retirada: 3,
  entregue: 4,
  devolvido: 5,
};

function mapearStatusH7(h7Status: string, temRastreio: boolean): string | null {
  switch (h7Status) {
    case "posted_object":  return "postado";
    case "shipping":       return "em_transporte";
    case "waiting_client": return "aguardando_retirada";
    case "delivered":      return "entregue";
    case "returning":
    case "cancelled":      return "devolvido";
    case "paid":           return temRastreio ? "postado" : null;
    default:               return null;
  }
}

interface H7Order {
  code: string;
  status: string;
  tracking_code?: string | null;
  shipping_company?: string | null;
  plan?: { qty?: number; name?: string };
  promised_date?: string | null;        // "YYYY-MM-DD" — prazo prometido pela H7
  delivered_at?: string | null;         // ISO — data de entrega confirmada
  last_hub_arrival?: string | null;     // ISO — última vez que chegou em uma base
}

interface H7Response {
  data?: H7Order[];
  total?: number;
  perPage?: number;
  page?: number;
  totals?: Record<string, number>;
}

interface PedidoRow {
  id: string;
  status: string;
  codigo_rastreio: string | null;
  chargeback: boolean;
  cliente_nome: string;
  cliente_telefone: string | null;
  payt_transaction_id: string;
}

async function runSync(startDate: string, endDate: string) {
  if (!H7_TOKEN) return { ok: false, erro: "H7_TOKEN não configurado" };

  const supabase = createServiceClient();

  console.log(`[sync-h7] iniciando sync: ${startDate} → ${endDate}`);

  let page = 1;
  let totalProcessados = 0;
  let totalAtualizados = 0;
  let totalWhatsapp = 0;
  const erros: string[] = [];

  while (true) {
    const url = `${H7_API_URL}?token=${H7_TOKEN}&startDate=${startDate}&endDate=${endDate}&page=${page}&perPage=${H7_PER_PAGE}`;

    let h7Data: H7Response;
    try {
      const res = await fetch(url);
      if (!res.ok) { erros.push(`H7 HTTP ${res.status} pág ${page}`); break; }
      h7Data = await res.json() as H7Response;
    } catch (e) {
      erros.push(`Erro H7: ${String(e)}`); break;
    }

    const orders: H7Order[] = h7Data.data ?? [];
    if (orders.length === 0) break;

    // Buscar todos os pedidos desta página de uma vez
    const codes = orders.map((o) => o.code).filter(Boolean);
    const { data: pedidos } = await supabase
      .from("pedidos")
      .select("id, status, codigo_rastreio, chargeback, cliente_nome, cliente_telefone, payt_transaction_id")
      .in("payt_transaction_id", codes);

    const pedidoMap = new Map<string, PedidoRow>(
      (pedidos ?? []).map((p) => [p.payt_transaction_id, p as PedidoRow])
    );

    // Verificar quais pedidos já têm disparo WhatsApp (batch)
    const idsParaCheckWpp = orders
      .filter((o) => o.status === "waiting_client")
      .map((o) => pedidoMap.get(o.code)?.id)
      .filter(Boolean) as string[];

    let disparosExistentes = new Set<string>();
    if (idsParaCheckWpp.length > 0) {
      const { data: disparos } = await supabase
        .from("whatsapp_disparos")
        .select("pedido_id")
        .in("pedido_id", idsParaCheckWpp)
        .eq("tipo_mensagem", "aguardando_retirada");
      disparosExistentes = new Set((disparos ?? []).map((d) => d.pedido_id));
    }

    for (const order of orders) {
      if (!order.code) continue;
      totalProcessados++;

      const pedido = pedidoMap.get(order.code);
      if (!pedido) continue;

      const novoStatus = mapearStatusH7(order.status, !!order.tracking_code);
      const isChargeback = order.status === "chargeback";
      const updates: Record<string, unknown> = {};

      if (order.tracking_code && !pedido.codigo_rastreio) {
        updates.codigo_rastreio = order.tracking_code;
      }
      if (isChargeback && !pedido.chargeback) {
        updates.chargeback = true;
        updates.status_pagamento = "chargeback";
      }
      if (novoStatus) {
        const prioAtual = STATUS_PRIORIDADE[pedido.status] ?? 0;
        const prioNova = STATUS_PRIORIDADE[novoStatus] ?? 0;
        if (prioNova > prioAtual) {
          updates.status = novoStatus;
          if (novoStatus === "entregue") {
            updates.data_entrega = order.delivered_at ?? new Date().toISOString();
          }
        }
      }

      // Capturar data prometida pela H7 (campo promised_date: "YYYY-MM-DD")
      if (order.promised_date) {
        updates.data_prometida_entrega = order.promised_date;
      }

      // Capturar data de chegada na base logística (campo last_hub_arrival)
      if (order.last_hub_arrival) {
        updates.data_chegou_logistica = order.last_hub_arrival;
      }

      if (Object.keys(updates).length === 0) continue;

      updates.updated_at = new Date().toISOString();
      const { error: updateErr } = await supabase
        .from("pedidos").update(updates).eq("id", pedido.id);

      if (updateErr) { erros.push(`Erro pedido ${order.code}: ${updateErr.message}`); continue; }
      totalAtualizados++;

      // WhatsApp automático ao entrar em aguardando_retirada
      if (updates.status === "aguardando_retirada" && pedido.cliente_telefone && !disparosExistentes.has(pedido.id)) {
        const codigoRastreio = (updates.codigo_rastreio as string) ?? pedido.codigo_rastreio ?? "N/A";

        const { data: novoDisparo } = await supabase
          .from("whatsapp_disparos")
          .insert({ pedido_id: pedido.id, tipo_mensagem: "aguardando_retirada", status: "pendente" })
          .select("id").single();

        const { sucesso, messageId, erro } = await enviarWhatsappAguardandoRetirada({
          telefone: pedido.cliente_telefone,
          nomeCliente: pedido.cliente_nome,
          codigoRastreio,
        });

        if (novoDisparo) {
          await supabase.from("whatsapp_disparos").update({
            status: sucesso ? "enviado" : "falhou",
            meta_message_id: messageId ?? null,
            erro_detalhes: erro ?? null,
            data_envio: new Date().toISOString(),
          }).eq("id", novoDisparo.id);
        }

        if (sucesso) totalWhatsapp++;
      }
    }

    const total = h7Data.total ?? 0;
    const perPage = h7Data.perPage ?? H7_PER_PAGE;
    if (total && page * perPage >= total) break;
    if (orders.length < perPage) break;
    page++;
  }

  console.log(`[sync-h7] concluído: ${totalProcessados} processados, ${totalAtualizados} atualizados, ${totalWhatsapp} WhatsApp`);

  return {
    ok: true,
    processados: totalProcessados,
    atualizados: totalAtualizados,
    whatsappEnviados: totalWhatsapp,
    erros: erros.length > 0 ? erros : undefined,
  };
}

function defaultDates(dias = 7) {
  const endDate = getTodayInAppTimezone();
  return {
    startDate: shiftDateString(endDate, -dias),
    endDate,
  };
}

function isAuthorized(req: NextRequest) {
  if (!INTERNAL_API_SECRET) return true;
  const header = req.headers.get("x-internal-secret") ?? req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  return header === INTERNAL_API_SECRET;
}

// GET — chamado pelo cron da Vercel (últimos 7 dias)
export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ ok: false, erro: "unauthorized" }, { status: 401 });
  }
  const { startDate, endDate } = defaultDates(7);
  console.log(`[sync-h7] cron trigger: ${startDate} → ${endDate}`);
  const result = await runSync(startDate, endDate);
  return NextResponse.json(result, { status: result.ok ? 200 : 500 });
}

// POST — chamado manualmente pelo dashboard com datas opcionais
export async function POST(req: NextRequest) {
  if (!isTrustedAppRequest(req)) {
    return NextResponse.json({ ok: false, erro: "forbidden" }, { status: 403 });
  }
  let startDate: string;
  let endDate: string;
  try {
    const body = await req.json().catch(() => ({})) as { startDate?: string; endDate?: string };
    const defaults = defaultDates(7);
    startDate = body.startDate ?? defaults.startDate;
    endDate = body.endDate ?? defaults.endDate;
  } catch {
    return NextResponse.json({ ok: false, erro: "JSON inválido" }, { status: 400 });
  }
  const result = await runSync(startDate, endDate);
  return NextResponse.json(result, { status: result.ok ? 200 : 500 });
}
