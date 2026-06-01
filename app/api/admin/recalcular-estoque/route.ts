import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { inferirGrupo } from "@/lib/produtos";
import { isTrustedAppRequest } from "@/lib/request-origin";

export const dynamic = "force-dynamic";

const BATCH_SIZE = 500;
const PAGE = 1000;


export async function POST(req: NextRequest) {
  if (!isTrustedAppRequest(req)) {
    return NextResponse.json({ ok: false, erro: "forbidden" }, { status: 403 });
  }
  const dry_run = req.nextUrl.searchParams.get("dry_run") === "true";
  const supabase = createServiceClient();

  // ------------------------------------------------------------------
  // Passo 0: Normalizar produto_grupo em TODOS os pedidos (null ou ALL CAPS)
  // ------------------------------------------------------------------
  let normalizados = 0;

  // Buscar TODOS os pedidos pagos — com ou sem produto_nome preenchido
  const todosPedidosNome: { id: string; produto_nome: string | null; produto_grupo: string | null }[] = [];
  for (let offset = 0; ; offset += PAGE) {
    const { data, error } = await supabase
      .from("pedidos")
      .select("id, produto_nome, produto_grupo")
      .eq("status_pagamento", "paid")
      .eq("chargeback", false)
      .range(offset, offset + PAGE - 1);
    if (error) {
      return NextResponse.json({ ok: false, erro: error.message }, { status: 500 });
    }
    if (!data || data.length === 0) break;
    todosPedidosNome.push(...(data as typeof todosPedidosNome));
    if (data.length < PAGE) break;
  }

  // Para cada pedido, inferir o grupo canônico e atualizar se diferente
  const atualizarPorGrupo: Record<string, string[]> = {};
  for (const p of todosPedidosNome) {
    const grupoCanon = inferirGrupo(p.produto_nome, p.produto_grupo);
    if (grupoCanon && grupoCanon !== p.produto_grupo) {
      if (!atualizarPorGrupo[grupoCanon]) atualizarPorGrupo[grupoCanon] = [];
      atualizarPorGrupo[grupoCanon].push(p.id);
    }
  }

  if (!dry_run) {
    for (const [grupo, ids] of Object.entries(atualizarPorGrupo)) {
      for (let i = 0; i < ids.length; i += BATCH_SIZE) {
        const lote = ids.slice(i, i + BATCH_SIZE);
        await supabase.from("pedidos").update({ produto_grupo: grupo }).in("id", lote);
        normalizados += lote.length;
      }
    }
    // Normalizar também em estoque_movimentacao
    for (const [grupo, ids] of Object.entries(atualizarPorGrupo)) {
      for (let i = 0; i < ids.length; i += BATCH_SIZE) {
        const lote = ids.slice(i, i + BATCH_SIZE);
        await supabase
          .from("estoque_movimentacao")
          .update({ produto_grupo: grupo })
          .in("referencia_pedido_id", lote);
      }
    }
  } else {
    for (const ids of Object.values(atualizarPorGrupo)) normalizados += ids.length;
  }

  // ------------------------------------------------------------------
  // Passo 0b: Apagar backfill antigo (sem data correta) para re-inserir
  // ------------------------------------------------------------------
  if (!dry_run) {
    await supabase
      .from("estoque_movimentacao")
      .delete()
      .eq("observacao", "Backfill histórico");
  }

  // ------------------------------------------------------------------
  // Passo 1: Buscar todos os pedidos elegíveis (com data_pagamento)
  // ------------------------------------------------------------------
  const pedidos: { id: string; produto_grupo: string; qtd_potes: number; data_pagamento: string | null }[] = [];
  for (let offset = 0; ; offset += PAGE) {
    const { data, error } = await supabase
      .from("pedidos")
      .select("id, produto_grupo, qtd_potes, data_pagamento")
      .eq("status_pagamento", "paid")
      .eq("chargeback", false)
      .not("qtd_potes", "is", null)
      .not("produto_grupo", "is", null)
      .range(offset, offset + PAGE - 1);
    if (error) {
      console.error("[recalcular-estoque] Erro pedidos:", error);
      return NextResponse.json({ ok: false, erro: error.message }, { status: 500 });
    }
    if (!data || data.length === 0) break;
    pedidos.push(...(data as typeof pedidos));
    if (data.length < PAGE) break;
  }

  // Buscar movimentações de venda existentes (do webhook real, não backfill)
  const movRefs: string[] = [];
  for (let offset = 0; ; offset += PAGE) {
    const { data, error } = await supabase
      .from("estoque_movimentacao")
      .select("referencia_pedido_id")
      .eq("tipo", "venda")
      .not("referencia_pedido_id", "is", null)
      .range(offset, offset + PAGE - 1);
    if (error) {
      return NextResponse.json({ ok: false, erro: error.message }, { status: 500 });
    }
    if (!data || data.length === 0) break;
    movRefs.push(...data.map((m: { referencia_pedido_id: string }) => m.referencia_pedido_id));
    if (data.length < PAGE) break;
  }
  const pedidosComVenda = new Set(movRefs);

  const pedidosSemMovimentacao = pedidos.filter((p) => !pedidosComVenda.has(p.id));

  // ------------------------------------------------------------------
  // Passo 2: Inserir movimentações com created_at = data_pagamento
  // ------------------------------------------------------------------
  let movimentacoes_inseridas = 0;

  if (!dry_run && pedidosSemMovimentacao.length > 0) {
    for (let i = 0; i < pedidosSemMovimentacao.length; i += BATCH_SIZE) {
      const lote = pedidosSemMovimentacao.slice(i, i + BATCH_SIZE);
      const registros = lote.map((p) => ({
        produto_grupo: p.produto_grupo,
        tipo: "venda" as const,
        qtd_potes: p.qtd_potes,
        referencia_pedido_id: p.id,
        observacao: "Backfill histórico",
        created_at: p.data_pagamento ?? new Date().toISOString(),
      }));

      const { error } = await supabase.from("estoque_movimentacao").insert(registros);
      if (error) {
        console.error(`[recalcular-estoque] Erro inserir lote ${i / BATCH_SIZE + 1}:`, error);
        return NextResponse.json({ ok: false, erro: error.message }, { status: 500 });
      }
      movimentacoes_inseridas += lote.length;
    }
  } else if (dry_run) {
    movimentacoes_inseridas = pedidosSemMovimentacao.length;
  }

  // ------------------------------------------------------------------
  // Passo 3: Garantir grupos em estoque_grupos
  // ------------------------------------------------------------------
  const gruposDistintos = [...new Set(pedidos.map((p) => p.produto_grupo))];

  if (!dry_run && gruposDistintos.length > 0) {
    await supabase
      .from("estoque_grupos")
      .upsert(
        gruposDistintos.map((nome_grupo) => ({ nome_grupo })),
        { onConflict: "nome_grupo", ignoreDuplicates: true }
      );
  }

  // ------------------------------------------------------------------
  // Passo 4: Recalcular estoque_atual
  // ------------------------------------------------------------------
  const todasMov: { produto_grupo: string; tipo: string; qtd_potes: number }[] = [];
  for (let offset = 0; ; offset += PAGE) {
    const { data, error } = await supabase
      .from("estoque_movimentacao")
      .select("produto_grupo, tipo, qtd_potes")
      .range(offset, offset + PAGE - 1);
    if (error) {
      return NextResponse.json({ ok: false, erro: error.message }, { status: 500 });
    }
    if (!data || data.length === 0) break;
    todasMov.push(...(data as typeof todasMov));
    if (data.length < PAGE) break;
  }

  const saldos = new Map<string, { entradas: number; vendas: number }>();
  for (const m of todasMov) {
    const s = saldos.get(m.produto_grupo) ?? { entradas: 0, vendas: 0 };
    if (m.tipo === "entrada") s.entradas += m.qtd_potes ?? 0;
    else s.vendas += m.qtd_potes ?? 0;
    saldos.set(m.produto_grupo, s);
  }

  if (dry_run) {
    for (const p of pedidosSemMovimentacao) {
      const s = saldos.get(p.produto_grupo) ?? { entradas: 0, vendas: 0 };
      s.vendas += p.qtd_potes ?? 0;
      saldos.set(p.produto_grupo, s);
    }
  }

  const resumo_por_grupo: { grupo: string; vendas: number; entradas: number; estoque_atual: number }[] = [];
  let grupos_atualizados = 0;

  for (const [grupo, { entradas, vendas }] of saldos.entries()) {
    const estoque_atual = entradas - vendas;
    resumo_por_grupo.push({ grupo, vendas, entradas, estoque_atual });
    if (!dry_run) {
      await supabase
        .from("estoque_grupos")
        .update({ estoque_atual, updated_at: new Date().toISOString() })
        .eq("nome_grupo", grupo);
    }
    grupos_atualizados++;
  }

  resumo_por_grupo.sort((a, b) => a.grupo.localeCompare(b.grupo));

  // ------------------------------------------------------------------
  // Passo 5: Remover grupos que não têm mais movimentações (duplicatas antigas)
  // ------------------------------------------------------------------
  if (!dry_run) {
    const gruposAtivos = new Set(saldos.keys());
    const { data: todosGrupos } = await supabase
      .from("estoque_grupos")
      .select("nome_grupo");
    for (const g of todosGrupos ?? []) {
      if (!gruposAtivos.has(g.nome_grupo)) {
        await supabase.from("estoque_grupos").delete().eq("nome_grupo", g.nome_grupo);
      }
    }
  }

  return NextResponse.json({
    ok: true,
    dry_run,
    normalizados_produto_grupo: normalizados,
    movimentacoes_inseridas,
    grupos_atualizados,
    resumo_por_grupo,
  });
}
