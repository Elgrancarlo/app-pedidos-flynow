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

/** Lê chave dot-notation do payload flat da Payt: get(body, "customer.name") */
function get<T>(body: Record<string, unknown>, key: string): T | null {
  return (body[key] as T) ?? null;
}

/** Extrai todos os itens do produto do payload flat (product.items.0.*, product.items.1.*, ...) */
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

  // Logar raw payload para auditoria (tabela criada na migration 014)
  supabase.from("payt_webhooks_raw").insert({ payload: body }).then(({ error }) => {
    if (error) console.error("[webhook-payt] Erro ao logar raw:", error.message);
  });

  // Verificar integration_key
  if (PAYT_INTEGRATION_KEY && body.integration_key !== PAYT_INTEGRATION_KEY) {
    console.warn("[webhook-payt] Chave inválida:", body.integration_key);
    return new Response("Unauthorized", { status: 401 });
  }

  const transactionId = body.transaction_id as string;
  const status        = body.status as string;
  const cartId        = body.cart_id as string ?? null;

  if (!transactionId) {
    return new Response("Missing transaction_id", { status: 400 });
  }

  // ── REEMBOLSO / CHARGEBACK ────────────────────────────────────────────────
  if (status === "refunded" || status === "chargeback" || status === "charged_back") {
    const isChargeback = status !== "refunded";
    const { data: existente } = await supabase
      .from("pedidos")
      .select("id")
      .eq("payt_transaction_id", transactionId)
      .single();

    if (existente) {
      await supabase.from("pedidos").update({
        ...(isChargeback ? { chargeback: true, status_pagamento: "chargeback" } : { status_pagamento: "refunded" }),
        updated_at: new Date().toISOString(),
      }).eq("payt_transaction_id", transactionId);
      console.log(`[webhook-payt] ${status} atualizado: ${transactionId}`);
      return new Response(JSON.stringify({ ok: true, evento: status, id: existente.id }), {
        headers: { "Content-Type": "application/json" },
      });
    }
    // Refund/chargeback sem pedido existente — ignorar
    return new Response(JSON.stringify({ ok: true, evento: status, aviso: "pedido_nao_encontrado" }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  // ── VENDA APROVADA ────────────────────────────────────────────────────────
  if (status !== "paid") {
    return new Response(JSON.stringify({ ok: true, evento: "ignorado", status }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  // Só processar pedidos físicos
  if (!body.tangible) {
    return new Response(JSON.stringify({ ok: true, skipped: "not_tangible" }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  // Dados do cliente (flat dot-notation)
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
    return new Response(JSON.stringify({ ok: false, error: existError.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (existente) {
    return new Response(
      JSON.stringify({ ok: true, skipped: "already_exists", id: existente.id }),
      { headers: { "Content-Type": "application/json" } }
    );
  }

  // Inserir novo pedido — status inicial: "pago" (novo pipeline)
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
    return new Response(JSON.stringify({ ok: false, error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
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

  return new Response(JSON.stringify({ ok: true, id: pedido!.id }), {
    headers: { "Content-Type": "application/json" },
  });
});
