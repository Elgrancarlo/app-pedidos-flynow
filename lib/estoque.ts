import { createServiceClient } from "@/lib/supabase";
import {
  getTodayInAppTimezone,
  shiftDateString,
} from "@/lib/app-dates";
import { shouldUseMockData } from "@/lib/data-mode";
import type { EstoqueGrupo, EstoqueMovimentacao } from "@/lib/supabase";

type StockMovementParams = {
  produtoGrupo: string;
  tipo: "entrada" | "venda";
  qtdPotes: number;
  referenciaPedidoId?: string | null;
  observacao?: string | null;
};

export type EstoquePeriodoPreset = "7" | "15" | "30" | "90" | "all";

export type EstoqueProdutoStatus = "critico" | "baixo" | "ok" | "excesso";

export type EstoqueProdutoOferta = {
  id: string;
  produtoGrupo: string;
  nome: string;
  canal: string;
  pedidosPeriodo: number;
  potesPorPedido: number;
  potesVendidosPeriodo: number;
  participacaoPeriodo: number;
  ultimaVenda: string | null;
};

export type EstoqueProdutoResumo = EstoqueGrupo & {
  entradasPeriodo: number;
  vendasPeriodo: number;
  giroPeriodo: number;
  coberturaDias: number | null;
  statusOperacional: EstoqueProdutoStatus;
  ofertas: EstoqueProdutoOferta[];
};

export type EstoquePageData = {
  source: "mock" | "real";
  periodo: {
    preset: EstoquePeriodoPreset;
    label: string;
    desde: string | null;
  };
  grupos: EstoqueProdutoResumo[];
  movimentacoes: EstoqueMovimentacao[];
  totalEntradaPeriodo: number;
  totalVendidoPeriodo: number;
  saldoAtualTotal: number;
  gruposCriticos: number;
  gruposBaixos: number;
  produtoMaiorGiro: string | null;
};

function isMissingRpc(error: unknown) {
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  return message.includes("registrar_movimentacao_estoque") || message.includes("function") || message.includes("rpc");
}

export async function applyStockMovement({
  produtoGrupo,
  tipo,
  qtdPotes,
  referenciaPedidoId = null,
  observacao = null,
}: StockMovementParams) {
  const supabase = createServiceClient();

  try {
    const { error } = await supabase.rpc("registrar_movimentacao_estoque", {
      p_grupo: produtoGrupo,
      p_tipo: tipo,
      p_qtd: qtdPotes,
      p_referencia_pedido_id: referenciaPedidoId,
      p_observacao: observacao,
    });

    if (error) throw error;
    return { ok: true as const, mode: "rpc" as const };
  } catch (error) {
    if (!isMissingRpc(error)) {
      throw error;
    }
  }

  await supabase
    .from("estoque_grupos")
    .upsert({ nome_grupo: produtoGrupo }, { onConflict: "nome_grupo", ignoreDuplicates: true });

  const rpcName = tipo === "entrada" ? "incrementar_estoque" : "decrementar_estoque";
  const { error: rpcError } = await supabase.rpc(rpcName, {
    p_grupo: produtoGrupo,
    p_qtd: qtdPotes,
  });

  if (rpcError) {
    throw rpcError;
  }

  const { error: movementError } = await supabase.from("estoque_movimentacao").insert({
    produto_grupo: produtoGrupo,
    tipo,
    qtd_potes: qtdPotes,
    referencia_pedido_id: referenciaPedidoId,
    observacao,
  });

  if (movementError) {
    const rollbackRpc = tipo === "entrada" ? "decrementar_estoque" : "incrementar_estoque";
    const { error: rollbackError } = await supabase.rpc(rollbackRpc, {
      p_grupo: produtoGrupo,
      p_qtd: qtdPotes,
    });

    if (rollbackError) {
      console.error("[estoque] Falha ao reverter saldo após erro de movimentação:", rollbackError.message);
    }

    throw movementError;
  }

  return { ok: true as const, mode: "fallback" as const };
}

const MOCK_PRODUCTS = [
  { nome: "Power 66", saldo: 1180, baseVendas: 22 },
  { nome: "Derma Bloom", saldo: 760, baseVendas: 17 },
  { nome: "Glico Reset", saldo: 420, baseVendas: 14 },
  { nome: "Lift Prime", saldo: 188, baseVendas: 9 },
  { nome: "Power 66 Televendas", saldo: 96, baseVendas: 8 },
  { nome: "Derma Bloom Televendas", saldo: 54, baseVendas: 6 },
];

function daysForPreset(preset: EstoquePeriodoPreset) {
  return preset === "all" ? null : Number(preset);
}

function periodoLabel(preset: EstoquePeriodoPreset) {
  if (preset === "all") return "Todo o periodo";
  return `Ultimos ${preset} dias`;
}

function periodoDesde(preset: EstoquePeriodoPreset) {
  const days = daysForPreset(preset);
  if (!days) return null;

  return `${shiftDateString(getTodayInAppTimezone(), -(days - 1))}T00:00:00.000Z`;
}

function normalizePreset(value?: string | null): EstoquePeriodoPreset {
  if (value === "7" || value === "15" || value === "30" || value === "90") {
    return value;
  }

  if (value === "all" || value === "" || value == null) {
    return value === "all" ? "all" : "30";
  }

  return "30";
}

function buildPeriodo(preset: EstoquePeriodoPreset) {
  return {
    preset,
    label: periodoLabel(preset),
    desde: periodoDesde(preset),
  };
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(date.getDate() + days);
  return next;
}

function buildMockMovimentacoes(): EstoqueMovimentacao[] {
  const today = new Date(`${getTodayInAppTimezone()}T12:00:00.000Z`);
  const movements: EstoqueMovimentacao[] = [];

  for (let dayIndex = 0; dayIndex < 90; dayIndex += 1) {
    const date = addDays(today, -dayIndex);

    MOCK_PRODUCTS.forEach((product, productIndex) => {
      const venda = Math.max(
        1,
        Math.round(product.baseVendas * (0.72 + ((dayIndex + productIndex) % 5) * 0.08))
      );

      movements.push({
        id: `mock_venda_${productIndex}_${dayIndex}`,
        produto_grupo: product.nome,
        tipo: "venda",
        qtd_potes: venda,
        referencia_pedido_id: `pedido_mock_${String(dayIndex * 10 + productIndex).padStart(5, "0")}`,
        observacao: "Venda sincronizada pelo mock operacional",
        created_at: new Date(
          date.getTime() - (productIndex + 1) * 53 * 60 * 1000
        ).toISOString(),
      });

      if ((dayIndex + productIndex) % 11 === 0) {
        movements.push({
          id: `mock_entrada_${productIndex}_${dayIndex}`,
          produto_grupo: product.nome,
          tipo: "entrada",
          qtd_potes: 180 + productIndex * 28,
          referencia_pedido_id: null,
          observacao: `Reposicao NF ${5400 + dayIndex + productIndex}`,
          created_at: new Date(
            date.getTime() - (productIndex + 2) * 71 * 60 * 1000
          ).toISOString(),
        });
      }
    });
  }

  return movements.sort(
    (first, second) =>
      new Date(second.created_at).getTime() - new Date(first.created_at).getTime()
  );
}

const OFFER_TEMPLATES = [
  { label: "Kit principal", canal: "Front", potesPorPedido: 3, share: 0.46 },
  { label: "Kit promocional", canal: "Front", potesPorPedido: 5, share: 0.24 },
  { label: "Televendas", canal: "Call Center", potesPorPedido: 3, share: 0.2 },
  { label: "Recuperacao", canal: "WhatsApp", potesPorPedido: 1, share: 0.1 },
] as const;

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function latestSaleDate(movimentacoes: EstoqueMovimentacao[]) {
  const latest = movimentacoes
    .filter((item) => item.tipo === "venda")
    .sort(
      (first, second) =>
        new Date(second.created_at).getTime() -
        new Date(first.created_at).getTime()
    )[0];

  return latest?.created_at ?? null;
}

function buildOfertasProduto({
  produtoGrupo,
  vendasPeriodo,
  movimentacoesPeriodo,
}: {
  produtoGrupo: string;
  vendasPeriodo: number;
  movimentacoesPeriodo: EstoqueMovimentacao[];
}): EstoqueProdutoOferta[] {
  const latest = latestSaleDate(movimentacoesPeriodo);
  let allocatedPotes = 0;

  return OFFER_TEMPLATES.map((template, index) => {
    const isLast = index === OFFER_TEMPLATES.length - 1;
    const potesVendidosPeriodo = isLast
      ? Math.max(0, vendasPeriodo - allocatedPotes)
      : Math.round(vendasPeriodo * template.share);

    allocatedPotes += potesVendidosPeriodo;

    return {
      id: `${slugify(produtoGrupo)}-${slugify(template.label)}`,
      produtoGrupo,
      nome: `${produtoGrupo} · ${template.label}`,
      canal: template.canal,
      pedidosPeriodo:
        potesVendidosPeriodo > 0
          ? Math.max(1, Math.round(potesVendidosPeriodo / template.potesPorPedido))
          : 0,
      potesPorPedido: template.potesPorPedido,
      potesVendidosPeriodo,
      participacaoPeriodo:
        vendasPeriodo > 0 ? potesVendidosPeriodo / vendasPeriodo : 0,
      ultimaVenda: potesVendidosPeriodo > 0 ? latest : null,
    };
  });
}

function getStatusOperacional(
  estoqueAtual: number,
  coberturaDias: number | null
): EstoqueProdutoStatus {
  if (estoqueAtual <= 0 || (coberturaDias != null && coberturaDias < 5)) {
    return "critico";
  }

  if (coberturaDias != null && coberturaDias < 12) return "baixo";
  if (coberturaDias != null && coberturaDias > 55) return "excesso";
  return "ok";
}

function buildEstoqueData({
  grupos,
  movimentacoes,
  preset,
  source,
}: {
  grupos: EstoqueGrupo[];
  movimentacoes: EstoqueMovimentacao[];
  preset: EstoquePeriodoPreset;
  source: "mock" | "real";
}): EstoquePageData {
  const periodo = buildPeriodo(preset);
  const movimentacoesPeriodo = periodo.desde
    ? movimentacoes.filter((item) => item.created_at >= periodo.desde!)
    : movimentacoes;

  const totals = movimentacoesPeriodo.reduce(
    (acc, item) => {
      const current = acc.byGroup.get(item.produto_grupo) ?? {
        entradas: 0,
        vendas: 0,
      };

      if (item.tipo === "entrada") {
        acc.totalEntradas += item.qtd_potes;
        current.entradas += item.qtd_potes;
      } else {
        acc.totalVendas += item.qtd_potes;
        current.vendas += item.qtd_potes;
      }

      acc.byGroup.set(item.produto_grupo, current);
      return acc;
    },
    {
      totalEntradas: 0,
      totalVendas: 0,
      byGroup: new Map<string, { entradas: number; vendas: number }>(),
    }
  );

  const days = daysForPreset(preset) ?? 90;
  const gruposResumo = grupos
    .map((grupo) => {
      const groupTotals = totals.byGroup.get(grupo.nome_grupo) ?? {
        entradas: 0,
        vendas: 0,
      };
      const giroPeriodo =
        groupTotals.vendas > 0 && days > 0 ? groupTotals.vendas / days : 0;
      const coberturaDias =
        giroPeriodo > 0 ? Math.round(grupo.estoque_atual / giroPeriodo) : null;
      const movimentacoesDoGrupo = movimentacoesPeriodo.filter(
        (item) => item.produto_grupo === grupo.nome_grupo
      );

      return {
        ...grupo,
        entradasPeriodo: groupTotals.entradas,
        vendasPeriodo: groupTotals.vendas,
        giroPeriodo,
        coberturaDias,
        statusOperacional: getStatusOperacional(
          grupo.estoque_atual,
          coberturaDias
        ),
        ofertas: buildOfertasProduto({
          produtoGrupo: grupo.nome_grupo,
          vendasPeriodo: groupTotals.vendas,
          movimentacoesPeriodo: movimentacoesDoGrupo,
        }),
      };
    })
    .sort(
      (first, second) =>
        (first.coberturaDias ?? 9999) - (second.coberturaDias ?? 9999)
    );

  const produtoMaiorGiro =
    [...gruposResumo].sort((first, second) => second.vendasPeriodo - first.vendasPeriodo)[0]
      ?.nome_grupo ?? null;

  return {
    source,
    periodo,
    grupos: gruposResumo,
    movimentacoes: movimentacoesPeriodo,
    totalEntradaPeriodo: totals.totalEntradas,
    totalVendidoPeriodo: totals.totalVendas,
    saldoAtualTotal: grupos.reduce((sum, grupo) => sum + grupo.estoque_atual, 0),
    gruposCriticos: gruposResumo.filter(
      (grupo) => grupo.statusOperacional === "critico"
    ).length,
    gruposBaixos: gruposResumo.filter(
      (grupo) => grupo.statusOperacional === "baixo"
    ).length,
    produtoMaiorGiro,
  };
}

export function createMockEstoqueData(
  preset: EstoquePeriodoPreset = "30"
): EstoquePageData {
  const now = new Date().toISOString();
  const movimentos = buildMockMovimentacoes();
  const grupos: EstoqueGrupo[] = MOCK_PRODUCTS.map((product, index) => ({
    id: `estoque_mock_${index + 1}`,
    nome_grupo: product.nome,
    estoque_atual: product.saldo,
    created_at: now,
    updated_at: now,
  }));

  return buildEstoqueData({
    grupos,
    movimentacoes: movimentos,
    preset,
    source: "mock",
  });
}

async function getRealGrupos(): Promise<EstoqueGrupo[]> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("estoque_grupos")
    .select("id, nome_grupo, estoque_atual, created_at, updated_at")
    .order("nome_grupo");

  if (error) {
    console.error("[estoque] Erro ao buscar grupos:", error.message);
    return [];
  }

  return (data ?? []) as EstoqueGrupo[];
}

async function getRealMovimentacoes(): Promise<EstoqueMovimentacao[]> {
  const supabase = createServiceClient();
  const pageSize = 1000;
  const result: EstoqueMovimentacao[] = [];

  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await supabase
      .from("estoque_movimentacao")
      .select("id, produto_grupo, tipo, qtd_potes, referencia_pedido_id, observacao, created_at")
      .order("created_at", { ascending: false })
      .range(offset, offset + pageSize - 1);

    if (error) {
      console.error("[estoque] Erro ao buscar movimentacoes:", error.message);
      break;
    }

    if (!data || data.length === 0) break;

    result.push(...(data as EstoqueMovimentacao[]));
    if (data.length < pageSize) break;
  }

  return result;
}

export async function getEstoquePageData(
  rawPreset?: string | null
): Promise<EstoquePageData> {
  const preset = normalizePreset(rawPreset);

  if (shouldUseMockData()) {
    return createMockEstoqueData(preset);
  }

  const [grupos, movimentacoes] = await Promise.all([
    getRealGrupos(),
    getRealMovimentacoes(),
  ]);

  return buildEstoqueData({
    grupos,
    movimentacoes,
    preset,
    source: "real",
  });
}
