import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { inferirGrupo } from "@/lib/produtos";
import {
  buildPaytEventStreamRow,
  buildPaytRawWebhookRow,
  extractPaytItems,
  getPaytField,
  normalizePaytEventStatus,
} from "@/lib/payt-events";
import { applyStockMovement } from "@/lib/estoque";

const PAYT_INTEGRATION_KEY = process.env.PAYT_INTEGRATION_KEY;

async function persistPaytPayload(
  supabase: ReturnType<typeof createServiceClient>,
  body: Record<string, unknown>,
) {
  const rawRow = buildPaytRawWebhookRow(body);
  const { error: rawError } = await supabase.from("payt_webhooks_raw").insert(rawRow);

  if (rawError) {
    console.error("[webhook-payt] Erro ao inserir raw (structured):", rawError.message);
    const { error: fallbackError } = await supabase.from("payt_webhooks_raw").insert({ payload: body });
    if (fallbackError) {
      console.error("[webhook-payt] Erro ao logar raw (fallback):", fallbackError.message);
    }
  }

  const { error: eventError } = await supabase.from("payt_event_stream").upsert(buildPaytEventStreamRow(body), {
    onConflict: "event_key",
    ignoreDuplicates: true,
  });

  if (eventError && !eventError.message.toLowerCase().includes("payt_event_stream")) {
    console.error("[webhook-payt] Erro ao logar event stream:", eventError.message);
  }
}

async function restoreStockForPedido(
  supabase: ReturnType<typeof createServiceClient>,
  pedido: { id: string; produto_grupo: string | null; qtd_potes: number | null },
  motivo: "refund" | "chargeback",
) {
  if (!pedido.produto_grupo || !pedido.qtd_potes || pedido.qtd_potes <= 0) return;

  const { data: existingRestock, error: restockLookupError } = await supabase
    .from("estoque_movimentacao")
    .select("id")
    .eq("referencia_pedido_id", pedido.id)
    .like("observacao", `Estorno automático:%`)
    .limit(1);

  if (restockLookupError) {
    console.error("[webhook-payt] Erro ao verificar estorno de estoque:", restockLookupError.message);
    return;
  }

  if ((existingRestock ?? []).length > 0) return;

  try {
    await applyStockMovement({
      produtoGrupo: pedido.produto_grupo,
      tipo: "entrada",
      qtdPotes: pedido.qtd_potes,
      referenciaPedidoId: pedido.id,
      observacao: `Estorno automático: ${motivo}`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "erro ao devolver estoque";
    console.error("[webhook-payt] Erro ao devolver estoque:", message);
    return;
  }
}

async function reapplyStockForPedidoIfNeeded(
  supabase: ReturnType<typeof createServiceClient>,
  pedido: { id: string; produto_grupo: string | null; qtd_potes: number | null },
) {
  if (!pedido.produto_grupo || !pedido.qtd_potes || pedido.qtd_potes <= 0) return;

  const { data: restockRows, error: restockLookupError } = await supabase
    .from("estoque_movimentacao")
    .select("id, observacao")
    .eq("referencia_pedido_id", pedido.id)
    .like("observacao", "Estorno automático:%");

  if (restockLookupError) {
    console.error("[webhook-payt] Erro ao verificar reativação de estoque:", restockLookupError.message);
    return;
  }

  if (!restockRows || restockRows.length === 0) return;

  const { data: reactivationRows, error: reactivationLookupError } = await supabase
    .from("estoque_movimentacao")
    .select("id")
    .eq("referencia_pedido_id", pedido.id)
    .eq("observacao", "Reativação automática: paid após estorno")
    .limit(1);

  if (reactivationLookupError) {
    console.error("[webhook-payt] Erro ao verificar reativação existente:", reactivationLookupError.message);
    return;
  }

  if ((reactivationRows ?? []).length > 0) return;

  try {
    await applyStockMovement({
      produtoGrupo: pedido.produto_grupo,
      tipo: "venda",
      qtdPotes: pedido.qtd_potes,
      referenciaPedidoId: pedido.id,
      observacao: "Reativação automática: paid após estorno",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "erro ao reaplicar estoque";
    console.error("[webhook-payt] Erro ao reaplicar estoque:", message);
    return;
  }
}

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, erro: "JSON inválido" }, { status: 400 });
  }

  // Validar chave de integração
  if (PAYT_INTEGRATION_KEY && body.integration_key !== PAYT_INTEGRATION_KEY) {
    return NextResponse.json({ ok: false, erro: "Unauthorized" }, { status: 401 });
  }

  const transactionId = body.transaction_id as string;
  const cartId = body.cart_id as string | undefined;
  const status = normalizePaytEventStatus(body.status);
  const supabase = createServiceClient();
  await persistPaytPayload(supabase, body);

  if (!transactionId) {
    if (cartId) {
      return NextResponse.json({ ok: true, evento: "capturado_sem_transaction_id", cart_id: cartId, status });
    }
    return NextResponse.json({ ok: false, erro: "transaction_id ausente" }, { status: 400 });
  }

  const findExistingPedido = () =>
    supabase
      .from("pedidos")
      .select("id, produto_grupo, qtd_potes, chargeback, status_pagamento")
      .eq("payt_transaction_id", transactionId)
      .single();

  // ── REEMBOLSO ──────────────────────────────────────────────────────────────
  if (status === "refunded" || status === "refund_requested" || status === "refund_request") {
    const { data: existente } = await findExistingPedido();

    if (existente) {
      if (status === "refunded") {
        await restoreStockForPedido(supabase, existente, "refund");
      }
      await supabase
        .from("pedidos")
        .update({ status_pagamento: status === "refunded" ? "refunded" : "refund_requested", updated_at: new Date().toISOString() })
        .eq("payt_transaction_id", transactionId);
      return NextResponse.json({ ok: true, evento: status, id: existente.id });
    }
    return NextResponse.json({ ok: true, evento: status, aviso: "pedido não encontrado" });
  }

  // ── CHARGEBACK ─────────────────────────────────────────────────────────────
  if (status === "chargeback" || status === "charged_back") {
    const { data: existente } = await findExistingPedido();

    if (existente) {
      await restoreStockForPedido(supabase, existente, "chargeback");
      await supabase
        .from("pedidos")
        .update({
          chargeback: true,
          status_pagamento: "chargeback",
          updated_at: new Date().toISOString(),
        })
        .eq("payt_transaction_id", transactionId);
      return NextResponse.json({ ok: true, evento: "chargeback", id: existente.id });
    }
    return NextResponse.json({ ok: true, evento: "chargeback", aviso: "pedido não encontrado" });
  }

  if (["awaiting_payment", "waiting_payment", "pending", "processing", "in_analysis", "canceled", "cancelled", "expired", "refused", "failed"].includes(status)) {
    const { data: existente } = await findExistingPedido();

    if (existente) {
      await supabase
        .from("pedidos")
        .update({
          status_pagamento: status,
          updated_at: new Date().toISOString(),
        })
        .eq("payt_transaction_id", transactionId);
    }

    return NextResponse.json({ ok: true, evento: "capturado", status, pedido_encontrado: Boolean(existente) });
  }

  // ── VENDA APROVADA ─────────────────────────────────────────────────────────
  if (status !== "paid") {
    return NextResponse.json({ ok: true, evento: "capturado", status });
  }

  // Só processar pedidos físicos
  if (!body.tangible) {
    return NextResponse.json({ ok: true, evento: "ignorado", motivo: "not_tangible" });
  }

  // Dados do cliente (flat dot-notation)
  const clienteNome     = getPaytField<string>(body, "customer.name") ?? "Desconhecido";
  const clienteEmail    = getPaytField<string>(body, "customer.email");
  const clienteTelefone = getPaytField<string>(body, "customer.phone");
  const clienteCpf      = getPaytField<string>(body, "customer.doc");

  // Dados do produto
  const produtoNome  = getPaytField<string>(body, "product.name");
  const items        = extractPaytItems(body);
  const itensFisicos = items.filter((i) => i.type === "physical");
  const qtdPotes     = itensFisicos.reduce((acc, i) => acc + i.quantity, 0);
  const rawGrupo     = itensFisicos[0]?.name ?? produtoNome ?? null;
  const produtoGrupo = inferirGrupo(rawGrupo) ?? rawGrupo;

  // Transação
  const totalPriceCents = getPaytField<number>(body, "transaction.total_price");
  const valorTotal      = totalPriceCents ? totalPriceCents / 100 : null;
  const formaPagamento  = getPaytField<string>(body, "transaction.payment_method");
  const dataPagamento   = getPaytField<string>(body, "transaction.paid_at");
  const parcelas        = getPaytField<number>(body, "transaction.installments");
  const paytCartId      = (body.cart_id as string) ?? null;

  // Endereço de entrega
  const enderecoEntrega: Record<string, unknown> = {};
  for (const field of ["street", "street_number", "complement", "district", "city", "state", "zipcode", "country"]) {
    const val = getPaytField<string>(body, `shipping.address.${field}`);
    if (val) enderecoEntrega[field] = val;
  }

  console.log(`[webhook-payt] paid | ${transactionId} | ${clienteNome} | ${produtoNome} | ${qtdPotes} potes | R$${valorTotal}`);

  // Idempotência
  const { data: existente } = await supabase
    .from("pedidos")
    .select("id, produto_grupo, qtd_potes")
    .eq("payt_transaction_id", transactionId)
    .single();

  if (existente) {
    await reapplyStockForPedidoIfNeeded(supabase, existente);
    await supabase
      .from("pedidos")
      .update({
        payt_cart_id: paytCartId,
        valor_total: valorTotal,
        forma_pagamento: formaPagamento,
        parcelas,
        data_pagamento: dataPagamento,
        status_pagamento: "paid",
        chargeback: false,
        updated_at: new Date().toISOString(),
      })
      .eq("payt_transaction_id", transactionId);

    return NextResponse.json({ ok: true, evento: "paid_atualizado", id: existente.id });
  }

  // Inserir pedido
  const { data: pedido, error } = await supabase
    .from("pedidos")
    .insert({
      payt_transaction_id: transactionId,
      payt_cart_id:        paytCartId,
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
    return NextResponse.json({ ok: false, erro: error.message }, { status: 500 });
  }

  console.log(`[webhook-payt] Inserido: id=${pedido!.id}`);

  // Decrementar estoque
  if (produtoGrupo && qtdPotes > 0) {
    try {
      await applyStockMovement({
        produtoGrupo,
        tipo: "venda",
        qtdPotes,
        referenciaPedidoId: pedido!.id,
      });
    } catch (error) {
      console.error("[webhook-payt] Erro ao registrar saída de estoque:", error);
    }
  }

  return NextResponse.json({ ok: true, evento: "venda", id: pedido!.id });
}
