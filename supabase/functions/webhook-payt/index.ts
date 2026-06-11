// Supabase Edge Function — Webhook Payt (Vendas)
// Deploy: supabase functions deploy webhook-payt
//
// IMPORTANTE: A Payt envia payload FLAT com dot-notation, não JSON aninhado.
// Exemplo: { "customer.name": "...", "product.items.0.type": "physical", ... }

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const PAYT_INTEGRATION_KEY = Deno.env.get("PAYT_INTEGRATION_KEY");

function get<T>(body: Record<string, unknown>, key: string): T | null {
  return (body[key] as T) ?? null;
}

function textValue(value: unknown): string | null {
  if (value == null) return null;
  const text = String(value).trim();
  return text.length > 0 ? text : null;
}

function numberValue(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const normalized = value.replace(/[^\d,-.]/g, "").replace(/\.(?=.*\.)/g, "").replace(",", ".");
    const parsed = Number.parseFloat(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function toIsoTimestamp(value: unknown): string | null {
  const text = textValue(value);
  if (!text) return null;
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function normalizeStatus(value: unknown): string {
  return textValue(value)?.toLowerCase() ?? "unknown";
}

function classifyEventGroup(status: string): string {
  if (status === "paid") return "sale";
  if (["refunded", "refund_requested", "refund_request", "chargeback", "charged_back"].includes(status)) return "post_sale";
  if (["waiting_payment", "awaiting_payment", "pending", "processing", "in_analysis"].includes(status)) return "checkout";
  if (["canceled", "cancelled", "expired", "refused", "failed", "lost_cart"].includes(status)) return "loss";
  if (["abandoned_cart", "abandoned_checkout"].includes(status) || status.includes("abandon")) return "abandonment";
  return "other";
}

function extractItems(body: Record<string, unknown>): Array<{ name: string | null; type: string | null; quantity: number }> {
  const items = [];
  for (let i = 0; ; i++) {
    const type = get<string>(body, `product.items.${i}.type`);
    const name = get<string>(body, `product.items.${i}.name`);
    if (type === null && name === null) break;
    items.push({
      name,
      type,
      quantity: get<number>(body, `product.items.${i}.quantity`) ?? 0,
    });
  }
  return items;
}

function resolveEventAt(status: string, body: Record<string, unknown>): string {
  const timelineTs =
    toIsoTimestamp(body["transaction.updated_at"]) ??
    toIsoTimestamp(body["updated_at"]) ??
    toIsoTimestamp(body["event_at"]) ??
    toIsoTimestamp(body["created_at"]);
  const paidAt = toIsoTimestamp(body["transaction.paid_at"]);
  if (status === "paid") return paidAt ?? timelineTs ?? new Date().toISOString();
  return timelineTs ?? paidAt ?? new Date().toISOString();
}

// ── Persist: raw + event_stream ─────────────────────────────────────────────

async function persistPayload(body: Record<string, unknown>) {
  const status = normalizeStatus(body.status);
  const transactionId = textValue(body.transaction_id);
  const cartId = textValue(body.cart_id);
  const productName = textValue(body["product.name"]);
  const items = extractItems(body);
  const physicalItems = items.filter((i) => i.type === "physical");
  const quantity = physicalItems.reduce((sum, i) => sum + i.quantity, 0);
  const totalPriceCents = numberValue(body["transaction.total_price"]);
  const eventAt = resolveEventAt(status, body);
  const streamTransactionId = transactionId ?? (cartId ? `cart:${cartId}` : null);

  // 1. Insert structured raw webhook
  const rawRow = {
    payload: body,
    transaction_id: transactionId,
    cart_id: cartId,
    event_status: status,
    event_name: textValue(body.event) ?? textValue(body.event_name),
    integration_key: textValue(body.integration_key),
    tangible: typeof body.tangible === "boolean" ? body.tangible : null,
    customer_email: textValue(body["customer.email"]),
    product_name: productName,
  };

  const { error: rawError } = await supabase.from("payt_webhooks_raw").insert(rawRow);
  if (rawError) {
    console.error("[webhook-payt] Erro raw structured:", rawError.message);
    // Fallback: insert payload only
    const { error: fallbackError } = await supabase.from("payt_webhooks_raw").insert({ payload: body });
    if (fallbackError) console.error("[webhook-payt] Erro raw fallback:", fallbackError.message);
  }

  // 2. Insert into event_stream
  if (streamTransactionId) {
    const eventRow = {
      event_key: [
        cartId ?? streamTransactionId ?? "unknown",
        status,
        eventAt,
        textValue(body.event) ?? textValue(body.event_name) ?? "webhook",
      ].join(":"),
      transaction_id: streamTransactionId,
      cart_id: cartId,
      event_status: status,
      event_name: textValue(body.event) ?? textValue(body.event_name),
      event_group: classifyEventGroup(status),
      tangible: typeof body.tangible === "boolean" ? body.tangible : null,
      customer_name: textValue(body["customer.name"]),
      customer_email: textValue(body["customer.email"]),
      customer_phone: textValue(body["customer.phone"]),
      customer_doc: textValue(body["customer.doc"]),
      product_name: productName,
      product_group: physicalItems[0]?.name ?? productName,
      product_quantity: quantity > 0 ? quantity : null,
      payment_method: textValue(body["transaction.payment_method"]),
      total_price: totalPriceCents != null ? totalPriceCents / 100 : null,
      paid_at: toIsoTimestamp(body["transaction.paid_at"]),
      payload: body,
      event_at: eventAt,
    };

    const { error: streamError } = await supabase
      .from("payt_event_stream")
      .upsert(eventRow, { onConflict: "event_key", ignoreDuplicates: true });

    if (streamError && !streamError.message.toLowerCase().includes("payt_event_stream")) {
      console.error("[webhook-payt] Erro event_stream:", streamError.message);
    }
  }
}

// ── Main handler ────────────────────────────────────────────────────────────

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

  // Persist raw + event_stream (fire and forget for non-blocking)
  persistPayload(body).catch((err) =>
    console.error("[webhook-payt] persistPayload error:", err)
  );

  // Verificar integration_key
  if (PAYT_INTEGRATION_KEY && body.integration_key !== PAYT_INTEGRATION_KEY) {
    console.warn("[webhook-payt] Chave inválida:", body.integration_key);
    return new Response("Unauthorized", { status: 401 });
  }

  const transactionId = body.transaction_id as string;
  const status        = body.status as string;
  const cartId        = body.cart_id as string ?? null;

  if (!transactionId) {
    if (cartId) {
      return Response.json({ ok: true, evento: "capturado_sem_transaction_id", cart_id: cartId, status });
    }
    return new Response("Missing transaction_id", { status: 400 });
  }

  // ── REEMBOLSO / CHARGEBACK ────────────────────────────────────────────────
  if (status === "refunded" || status === "refund_requested" || status === "chargeback" || status === "charged_back") {
    const isChargeback = status === "chargeback" || status === "charged_back";
    const { data: existente } = await supabase
      .from("pedidos")
      .select("id, produto_grupo, qtd_potes")
      .eq("payt_transaction_id", transactionId)
      .single();

    if (existente) {
      await supabase.from("pedidos").update({
        ...(isChargeback
          ? { chargeback: true, status_pagamento: "chargeback" }
          : { status_pagamento: status === "refunded" ? "refunded" : "refund_requested" }),
        updated_at: new Date().toISOString(),
      }).eq("payt_transaction_id", transactionId);

      return Response.json({ ok: true, evento: status, id: existente.id });
    }
    return Response.json({ ok: true, evento: status, aviso: "pedido_nao_encontrado" });
  }

  // ── Status não-pagos (captura evento) ─────────────────────────────────────
  if (["awaiting_payment", "waiting_payment", "pending", "processing", "in_analysis",
       "canceled", "cancelled", "expired", "refused", "failed"].includes(status)) {
    const { data: existente } = await supabase
      .from("pedidos")
      .select("id")
      .eq("payt_transaction_id", transactionId)
      .single();

    if (existente) {
      await supabase.from("pedidos").update({
        status_pagamento: status,
        updated_at: new Date().toISOString(),
      }).eq("payt_transaction_id", transactionId);
    }
    return Response.json({ ok: true, evento: "capturado", status, pedido_encontrado: Boolean(existente) });
  }

  // ── VENDA APROVADA ────────────────────────────────────────────────────────
  if (status !== "paid") {
    return Response.json({ ok: true, evento: "capturado", status });
  }

  // Só processar pedidos físicos
  if (!body.tangible) {
    return Response.json({ ok: true, evento: "ignorado", motivo: "not_tangible" });
  }

  // Dados do cliente
  const clienteNome     = get<string>(body, "customer.name")  ?? "Desconhecido";
  const clienteEmail    = get<string>(body, "customer.email");
  const clienteTelefone = get<string>(body, "customer.phone");
  const clienteCpf      = get<string>(body, "customer.doc");

  // Dados do produto
  const produtoNome  = get<string>(body, "product.name");
  const items        = extractItems(body);
  const itensFisicos = items.filter((i) => i.type === "physical");
  const qtdPotes     = itensFisicos.reduce((acc, i) => acc + i.quantity, 0);
  const produtoGrupo = itensFisicos[0]?.name ?? produtoNome ?? null;

  // Transação
  const totalPriceCents = get<number>(body, "transaction.total_price");
  const valorTotal      = totalPriceCents ? totalPriceCents / 100 : null;
  const formaPagamento  = get<string>(body, "transaction.payment_method");
  const dataPagamento   = get<string>(body, "transaction.paid_at");
  const parcelas        = get<number>(body, "transaction.installments");

  // Endereço de entrega
  const enderecoEntrega: Record<string, unknown> = {};
  for (const field of ["street", "street_number", "complement", "district", "city", "state", "zipcode", "country"]) {
    const val = get<string>(body, `shipping.address.${field}`);
    if (val) enderecoEntrega[field] = val;
  }

  console.log(`[webhook-payt] paid | ${transactionId} | ${clienteNome} | ${produtoNome} | ${qtdPotes} potes | R$${valorTotal}`);

  // Idempotência
  const { data: existente, error: existError } = await supabase
    .from("pedidos")
    .select("id")
    .eq("payt_transaction_id", transactionId)
    .single();

  if (existError && existError.code !== "PGRST116") {
    console.error("[webhook-payt] Erro DB:", existError);
    return Response.json({ ok: false, error: existError.message }, { status: 500 });
  }

  if (existente) {
    // Atualizar pedido existente com dados mais recentes
    await supabase.from("pedidos").update({
      payt_cart_id: cartId,
      valor_total: valorTotal,
      forma_pagamento: formaPagamento,
      parcelas,
      data_pagamento: dataPagamento,
      status_pagamento: "paid",
      chargeback: false,
      updated_at: new Date().toISOString(),
    }).eq("payt_transaction_id", transactionId);

    return Response.json({ ok: true, evento: "paid_atualizado", id: existente.id });
  }

  // Inserir novo pedido
  const { data: pedido, error } = await supabase
    .from("pedidos")
    .insert({
      payt_transaction_id: transactionId,
      payt_cart_id:        cartId,
      cliente_nome:        clienteNome,
      cliente_email:       clienteEmail,
      cliente_telefone:    clienteTelefone,
      cliente_cpf:         clienteCpf,
      produto_nome:        produtoNome,
      produto_grupo:       produtoGrupo,
      qtd_potes:           qtdPotes > 0 ? qtdPotes : null,
      valor_total:         valorTotal,
      forma_pagamento:     formaPagamento,
      parcelas:            parcelas,
      data_pagamento:      dataPagamento,
      endereco_entrega:    Object.keys(enderecoEntrega).length > 0 ? enderecoEntrega : null,
      status:              "pago",
      status_pagamento:    "paid",
      chargeback:          false,
    })
    .select("id")
    .single();

  if (error) {
    console.error("[webhook-payt] Erro ao inserir:", error);
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }

  console.log(`[webhook-payt] Inserido: id=${pedido!.id}`);

  // Decrementar estoque
  if (produtoGrupo && qtdPotes > 0) {
    await supabase.from("estoque_grupos")
      .upsert({ nome_grupo: produtoGrupo }, { onConflict: "nome_grupo", ignoreDuplicates: true });

    await supabase.rpc("decrementar_estoque", { p_grupo: produtoGrupo, p_qtd: qtdPotes });

    await supabase.from("estoque_movimentacao").insert({
      produto_grupo:        produtoGrupo,
      tipo:                 "venda",
      qtd_potes:            qtdPotes,
      referencia_pedido_id: pedido!.id,
    });
  }

  return Response.json({ ok: true, evento: "venda", id: pedido!.id });
});
