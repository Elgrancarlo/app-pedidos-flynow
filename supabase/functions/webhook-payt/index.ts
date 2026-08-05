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
    if (type === null && get<string>(body, `product.items.${i}.name`) === null) break;
    items.push({
      name:     get<string>(body, `product.items.${i}.name`),
      type:     type,
      quantity: get<number>(body, `product.items.${i}.quantity`) ?? 0,
    });
  }
  return items;
}

/**
 * Registra baixa de estoque de forma IDEMPOTENTE: só decrementa se o pedido
 * ainda não tem movimentação de venda. Cobre tanto o insert (cartão, que já
 * nasce paid) quanto a transição waiting_payment → paid (pix/boleto), que
 * antes NÃO baixava estoque.
 */
async function baixarEstoquePedido(pedidoId: string, produtoGrupo: string | null, qtdPotes: number) {
  if (!produtoGrupo || qtdPotes <= 0) return;

  const { data: jaExiste, error: lookupError } = await supabase
    .from("estoque_movimentacao")
    .select("id")
    .eq("referencia_pedido_id", pedidoId)
    .eq("tipo", "venda")
    .limit(1);

  if (lookupError) {
    console.error("[webhook-payt] Erro ao verificar movimentação:", lookupError.message);
    return;
  }
  if ((jaExiste ?? []).length > 0) return;

  await supabase.from("estoque_grupos")
    .upsert({ nome_grupo: produtoGrupo }, { onConflict: "nome_grupo", ignoreDuplicates: true });

  await supabase.rpc("decrementar_estoque", { p_grupo: produtoGrupo, p_qtd: qtdPotes });

  await supabase.from("estoque_movimentacao").insert({
    produto_grupo:        produtoGrupo,
    tipo:                 "venda",
    qtd_potes:            qtdPotes,
    referencia_pedido_id: pedidoId,
  });
}

/**
 * Devolve estoque em refund/chargeback de forma IDEMPOTENTE: só devolve se
 * houve baixa de venda e ainda não houve estorno para o pedido.
 */
async function devolverEstoquePedido(pedidoId: string, motivo: "refund" | "chargeback") {
  const { data: pedido } = await supabase
    .from("pedidos")
    .select("id, produto_grupo, qtd_potes")
    .eq("id", pedidoId)
    .single();

  if (!pedido?.produto_grupo || !pedido.qtd_potes || pedido.qtd_potes <= 0) return;

  const { data: movs, error: lookupError } = await supabase
    .from("estoque_movimentacao")
    .select("tipo, observacao")
    .eq("referencia_pedido_id", pedidoId);

  if (lookupError) {
    console.error("[webhook-payt] Erro ao verificar estorno:", lookupError.message);
    return;
  }

  const temVenda   = (movs ?? []).some((m) => m.tipo === "venda");
  const temEstorno = (movs ?? []).some((m) => m.tipo === "entrada" && (m.observacao ?? "").startsWith("Estorno automático:"));
  if (!temVenda || temEstorno) return;

  await supabase.rpc("incrementar_estoque", { p_grupo: pedido.produto_grupo, p_qtd: pedido.qtd_potes });

  await supabase.from("estoque_movimentacao").insert({
    produto_grupo:        pedido.produto_grupo,
    tipo:                 "entrada",
    qtd_potes:            pedido.qtd_potes,
    referencia_pedido_id: pedidoId,
    observacao:           `Estorno automático: ${motivo}`,
  });
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

  // Logar raw payload para auditoria
  await supabase.from("payt_webhooks_raw").insert({ payload: body });

  // Verificar integration_key
  if (PAYT_INTEGRATION_KEY && body.integration_key !== PAYT_INTEGRATION_KEY) {
    return new Response("Unauthorized", { status: 401 });
  }

  // Só processar pedidos físicos
  if (!body.tangible) {
    return new Response(JSON.stringify({ ok: true, skipped: "not_tangible" }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  const transactionId = body.transaction_id as string;
  const status        = body.status as string;

  if (!transactionId) {
    return new Response("Missing transaction_id", { status: 400 });
  }

  // Dados do cliente (flat dot-notation)
  const clienteNome     = get<string>(body, "customer.name")  ?? "Desconhecido";
  const clienteEmail    = get<string>(body, "customer.email");
  const clienteTelefone = get<string>(body, "customer.phone");
  const clienteCpf      = get<string>(body, "customer.doc");

  // Dados do produto
  const produtoNome = get<string>(body, "product.name");
  const items       = extractItems(body);
  const itensFisicos = items.filter((i) => i.type === "physical");
  const qtdPotes    = itensFisicos.reduce((acc, i) => acc + i.quantity, 0);
  const produtoGrupo = itensFisicos[0]?.name ?? produtoNome ?? null;

  // Transação
  const totalPriceCents = get<number>(body, "transaction.total_price");
  const valorTotal      = totalPriceCents ? totalPriceCents / 100 : null;
  const formaPagamento  = get<string>(body, "transaction.payment_method");
  const dataPagamento   = get<string>(body, "transaction.paid_at");

  // Endereço de entrega
  const enderecoEntrega: Record<string, unknown> = {};
  for (const field of ["street", "street_number", "complement", "district", "city", "state", "zipcode", "country"]) {
    const val = get<string>(body, `shipping.address.${field}`);
    if (val) enderecoEntrega[field] = val;
  }

  const isChargeback = status === "chargeback" || status === "charged_back";

  console.log(`[webhook-payt] ${transactionId} | ${clienteNome} | ${produtoNome} | ${qtdPotes} potes | R$${valorTotal}`);

  // Idempotência
  const { data: existente, error: existError } = await supabase
    .from("pedidos")
    .select("id, chargeback, status_pagamento")
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
    if (isChargeback) {
      await supabase.from("pedidos")
        .update({ chargeback: true, status_pagamento: "chargeback", updated_at: new Date().toISOString() })
        .eq("payt_transaction_id", transactionId);
      await devolverEstoquePedido(existente.id, "chargeback");
    } else if (status === "refunded" || status === "refund_requested") {
      await supabase.from("pedidos")
        .update({ status_pagamento: status === "refunded" ? "refunded" : "refund_requested", updated_at: new Date().toISOString() })
        .eq("payt_transaction_id", transactionId);
      if (status === "refunded") {
        await devolverEstoquePedido(existente.id, "refund");
      }
    } else if (status === "paid") {
      // Transição waiting_payment/pending → paid: marca como pago e preenche data/valor.
      // (bug anterior: pedido criado no pix ficava travado em waiting_payment)
      await supabase.from("pedidos")
        .update({
          status_pagamento: "paid",
          data_pagamento: dataPagamento,
          valor_total: valorTotal,
          forma_pagamento: formaPagamento,
          chargeback: false,
          updated_at: new Date().toISOString(),
        })
        .eq("payt_transaction_id", transactionId);
      // Baixa idempotente: pix/boleto chegam aqui na aprovação sem nunca terem
      // baixado estoque no insert (bug corrigido em 05/08/2026 — venda pix não
      // decrementava estoque).
      await baixarEstoquePedido(existente.id, produtoGrupo, qtdPotes);
    } else if (existente.status_pagamento !== "paid") {
      // Demais status (waiting_payment, canceled, expired, ...) — nunca rebaixa um pedido já pago.
      await supabase.from("pedidos")
        .update({ status_pagamento: status, updated_at: new Date().toISOString() })
        .eq("payt_transaction_id", transactionId);
    }
    return new Response(
      JSON.stringify({ ok: true, updated: status, id: existente.id }),
      { headers: { "Content-Type": "application/json" } }
    );
  }

  // Inserir novo pedido
  const { data: pedido, error } = await supabase
    .from("pedidos")
    .insert({
      payt_transaction_id: transactionId,
      cliente_nome:        clienteNome,
      cliente_email:       clienteEmail,
      cliente_telefone:    clienteTelefone,
      cliente_cpf:         clienteCpf,
      produto_nome:        produtoNome,
      produto_grupo:       produtoGrupo,
      qtd_potes:           qtdPotes > 0 ? qtdPotes : null,
      valor_total:         valorTotal,
      forma_pagamento:     formaPagamento,
      data_pagamento:      dataPagamento,
      endereco_entrega:    Object.keys(enderecoEntrega).length > 0 ? enderecoEntrega : null,
      status:              "aguardando_postagem",
      status_pagamento:    status,
      chargeback:          isChargeback,
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

  // Decrementar estoque se venda aprovada (idempotente)
  if (status === "paid") {
    await baixarEstoquePedido(pedido!.id, produtoGrupo, qtdPotes);
  }

  return new Response(JSON.stringify({ ok: true, id: pedido!.id }), {
    headers: { "Content-Type": "application/json" },
  });
});
