import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { isTrustedAppRequest } from "@/lib/request-origin";
import { applyStockMovement } from "@/lib/estoque";

export const dynamic = "force-dynamic";

// Janela de varredura: pedidos criados/atualizados nas últimas 72h.
// Margem de segurança: ignora pedidos mexidos nos últimos 5 min para não
// competir com o webhook que ainda pode estar processando o mesmo evento.
const JANELA_HORAS = 72;
const MARGEM_MS = 5 * 60 * 1000;
const LOTE_IN = 200;
const PAGE = 1000;

type PedidoRow = {
  id: string;
  produto_grupo: string | null;
  qtd_potes: number | null;
  status_pagamento: string | null;
  chargeback: boolean | null;
  created_at: string;
  updated_at: string | null;
};

export async function POST(req: NextRequest) {
  if (!isTrustedAppRequest(req)) {
    return NextResponse.json({ ok: false, erro: "forbidden" }, { status: 403 });
  }

  const supabase = createServiceClient();
  const desde = new Date(Date.now() - JANELA_HORAS * 3600_000).toISOString();
  const corte = Date.now() - MARGEM_MS;

  // 1. Pedidos recentes (criados OU atualizados na janela)
  const pedidos: PedidoRow[] = [];
  for (let offset = 0; ; offset += PAGE) {
    const { data, error } = await supabase
      .from("pedidos")
      .select("id, produto_grupo, qtd_potes, status_pagamento, chargeback, created_at, updated_at")
      .or(`updated_at.gte.${desde},created_at.gte.${desde}`)
      .range(offset, offset + PAGE - 1);
    if (error) {
      return NextResponse.json({ ok: false, erro: error.message }, { status: 500 });
    }
    if (!data || data.length === 0) break;
    pedidos.push(...(data as PedidoRow[]));
    if (data.length < PAGE) break;
  }

  const elegiveis = pedidos.filter((p) => {
    const ultimaAlteracao = new Date(p.updated_at ?? p.created_at).getTime();
    return ultimaAlteracao < corte && p.produto_grupo && (p.qtd_potes ?? 0) > 0;
  });

  // 2. Movimentações existentes desses pedidos
  const ids = elegiveis.map((p) => p.id);
  const vendasPorPedido = new Set<string>();
  const estornosPorPedido = new Set<string>();
  for (let i = 0; i < ids.length; i += LOTE_IN) {
    const lote = ids.slice(i, i + LOTE_IN);
    const { data, error } = await supabase
      .from("estoque_movimentacao")
      .select("referencia_pedido_id, tipo, observacao")
      .in("referencia_pedido_id", lote);
    if (error) {
      return NextResponse.json({ ok: false, erro: error.message }, { status: 500 });
    }
    for (const m of data ?? []) {
      if (!m.referencia_pedido_id) continue;
      if (m.tipo === "venda") vendasPorPedido.add(m.referencia_pedido_id);
      if (m.tipo === "entrada" && (m.observacao ?? "").startsWith("Estorno automático:")) {
        estornosPorPedido.add(m.referencia_pedido_id);
      }
    }
  }

  // 3a. Pedido pago sem baixa → registrar venda (cobre pix/boleto que
  //     transicionam para paid sem passar pelo caminho de insert do webhook)
  let baixas = 0;
  const errosBaixa: string[] = [];
  for (const p of elegiveis) {
    if (p.status_pagamento !== "paid" || p.chargeback === true) continue;
    if (vendasPorPedido.has(p.id)) continue;
    try {
      await applyStockMovement({
        produtoGrupo: p.produto_grupo!,
        tipo: "venda",
        qtdPotes: p.qtd_potes!,
        referenciaPedidoId: p.id,
        observacao: "Reconciliação automática: baixa pós-pagamento",
      });
      baixas++;
    } catch (error) {
      errosBaixa.push(`${p.id}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // 3b. Pedido estornado/chargeback com baixa e sem estorno → devolver estoque
  let estornos = 0;
  const errosEstorno: string[] = [];
  for (const p of elegiveis) {
    const estornado = p.status_pagamento === "refunded" || p.chargeback === true;
    if (!estornado) continue;
    if (!vendasPorPedido.has(p.id) || estornosPorPedido.has(p.id)) continue;
    try {
      await applyStockMovement({
        produtoGrupo: p.produto_grupo!,
        tipo: "entrada",
        qtdPotes: p.qtd_potes!,
        referenciaPedidoId: p.id,
        observacao: `Estorno automático: ${p.chargeback ? "chargeback" : "refund"} (reconciliação)`,
      });
      estornos++;
    } catch (error) {
      errosEstorno.push(`${p.id}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  if (baixas > 0 || estornos > 0 || errosBaixa.length > 0 || errosEstorno.length > 0) {
    console.log(
      `[reconciliar-estoque] baixas=${baixas} estornos=${estornos} erros=${errosBaixa.length + errosEstorno.length}`
    );
  }

  return NextResponse.json({
    ok: true,
    janela_horas: JANELA_HORAS,
    pedidos_verificados: elegiveis.length,
    baixas_registradas: baixas,
    estornos_registrados: estornos,
    erros: [...errosBaixa, ...errosEstorno],
  });
}
