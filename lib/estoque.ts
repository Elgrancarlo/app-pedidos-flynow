import { createServiceClient } from "@/lib/supabase";
import {
  getTodayInAppTimezone,
  getUtcRangeForAppDates,
  shiftDateString,
} from "@/lib/app-dates";
import { shouldUseMockData } from "@/lib/data-mode";
import { inferirGrupo } from "@/lib/produtos";
import type { EstoqueGrupo, EstoqueMovimentacao } from "@/lib/supabase";

type StockMovementParams = {
  produtoGrupo: string;
  tipo: "entrada" | "venda";
  qtdPotes: number;
  referenciaPedidoId?: string | null;
  observacao?: string | null;
};

export type EstoquePeriodoPreset = "7" | "15" | "30" | "90" | "all";

export const DEFAULT_ESTOQUE_PERIODO_PRESET: EstoquePeriodoPreset = "30";

export type EstoqueProdutoStatus = "critico" | "baixo" | "ok" | "excesso";

export type EstoqueProdutoOferta = {
  id: string;
  produtoGrupo: string;
  nome: string;
  canal: string;
  pedidosPeriodo: number;
  potesPorPedido: number;
  potesVendidosPeriodo: number;
  receitaPeriodo: number;
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

const REAL_MOVEMENT_PAGE_SIZE = 1000;
const REAL_ORDER_PAGE_SIZE = 1000;

type EstoquePedidoOfertaRow = {
  id: string;
  produto_nome: string | null;
  produto_grupo: string | null;
  qtd_potes: number | null;
  valor_total: number | null;
  data_pagamento: string | null;
  status_pagamento: string | null;
  chargeback: boolean | null;
};

type EstoquePedidoOfertaSnapshot = {
  id: string;
  produtoGrupo: string;
  nome: string;
  canal: string;
  qtdPotes: number;
  receita: number;
  paidAt: string | null;
};

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

  const endDate = getTodayInAppTimezone();
  const startDate = shiftDateString(endDate, -(days - 1));
  return getUtcRangeForAppDates(startDate, endDate).startTs;
}

function normalizePreset(value?: string | null): EstoquePeriodoPreset {
  if (value === "7" || value === "15" || value === "30" || value === "90") {
    return value;
  }

  if (value === "all") {
    return "all";
  }

  return DEFAULT_ESTOQUE_PERIODO_PRESET;
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

function numberValue(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
}

function normalizeGroup(...candidates: Array<string | null | undefined>) {
  const inferred = inferirGrupo(...candidates);
  if (inferred) return inferred;

  const fallback = candidates.find((value) => value?.trim());
  return fallback?.trim() ?? "Produto sem grupo";
}

function observationContains(
  item: Pick<EstoqueMovimentacao, "observacao">,
  ...fragments: string[]
) {
  const observation = item.observacao?.toLocaleLowerCase("pt-BR") ?? "";
  return fragments.some((fragment) => observation.includes(fragment));
}

function isManualAdjustment(item: Pick<EstoqueMovimentacao, "observacao">) {
  return observationContains(item, "ajuste manual");
}

function isAutomaticRestock(item: Pick<EstoqueMovimentacao, "observacao">) {
  return observationContains(
    item,
    "estorno automatico",
    "estorno automático"
  );
}

function isOperationalMovement(item: EstoqueMovimentacao) {
  return !isManualAdjustment(item) && !isAutomaticRestock(item);
}

function normalizeMovement(item: EstoqueMovimentacao): EstoqueMovimentacao {
  return {
    ...item,
    produto_grupo: normalizeGroup(item.produto_grupo),
  };
}

function aggregateGroups(grupos: EstoqueGrupo[]) {
  const grouped = new Map<string, EstoqueGrupo>();

  for (const grupo of grupos) {
    const nomeGrupo = normalizeGroup(grupo.nome_grupo);
    const current = grouped.get(nomeGrupo);

    if (current) {
      current.estoque_atual += numberValue(grupo.estoque_atual);
      if (grupo.updated_at > current.updated_at) {
        current.updated_at = grupo.updated_at;
      }
      continue;
    }

    grouped.set(nomeGrupo, {
      ...grupo,
      nome_grupo: nomeGrupo,
      estoque_atual: numberValue(grupo.estoque_atual),
    });
  }

  return Array.from(grouped.values()).sort((left, right) =>
    left.nome_grupo.localeCompare(right.nome_grupo)
  );
}

function inferOfferChannel(productName: string) {
  const normalized = productName.toLowerCase();

  if (normalized.includes("televendas") || normalized.includes("call center")) {
    return "Call Center";
  }
  if (normalized.includes("whatsapp") || normalized.includes("recuper")) {
    return "WhatsApp";
  }
  if (
    normalized.includes("upsell") ||
    normalized.includes("downsell") ||
    /\bus\s*[12]\b/.test(normalized) ||
    /\bup\s*[12]\b/.test(normalized)
  ) {
    return "Upsell";
  }

  return "Front";
}

function normalizePedidoOfertaRow(
  row: EstoquePedidoOfertaRow
): EstoquePedidoOfertaSnapshot | null {
  if (row.status_pagamento !== "paid" || row.chargeback === true) return null;

  const nome = (row.produto_nome ?? row.produto_grupo ?? "").trim();
  const produtoGrupo = normalizeGroup(row.produto_nome, row.produto_grupo);
  const displayName = nome || produtoGrupo;

  return {
    id: row.id,
    produtoGrupo,
    nome: displayName,
    canal: inferOfferChannel(displayName),
    qtdPotes: numberValue(row.qtd_potes),
    receita: numberValue(row.valor_total),
    paidAt: row.data_pagamento,
  };
}

function inferPeriodDays(
  preset: EstoquePeriodoPreset,
  movimentacoesPeriodo: EstoqueMovimentacao[]
) {
  const presetDays = daysForPreset(preset);
  if (presetDays) return presetDays;

  const timestamps = movimentacoesPeriodo
    .map((item) => new Date(item.created_at).getTime())
    .filter(Number.isFinite);

  if (timestamps.length === 0) return 0;

  const oldest = Math.min(...timestamps);
  const newest = Math.max(...timestamps, new Date().getTime());
  return Math.max(1, Math.ceil((newest - oldest) / 86_400_000));
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

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function buildOfertasProduto(
  produtoGrupo: string,
  pedidosPeriodo: EstoquePedidoOfertaSnapshot[]
): EstoqueProdutoOferta[] {
  const grouped = new Map<
    string,
    {
      nome: string;
      canal: string;
      pedidosPeriodo: number;
      potesVendidosPeriodo: number;
      receitaPeriodo: number;
      ultimaVenda: string | null;
    }
  >();

  for (const pedido of pedidosPeriodo) {
    if (pedido.produtoGrupo !== produtoGrupo) continue;

    const key = pedido.nome || pedido.produtoGrupo;
    const current = grouped.get(key) ?? {
      nome: key,
      canal: pedido.canal,
      pedidosPeriodo: 0,
      potesVendidosPeriodo: 0,
      receitaPeriodo: 0,
      ultimaVenda: null,
    };

    current.pedidosPeriodo += 1;
    current.potesVendidosPeriodo += pedido.qtdPotes;
    current.receitaPeriodo += pedido.receita;
    if (
      pedido.paidAt &&
      (!current.ultimaVenda || pedido.paidAt > current.ultimaVenda)
    ) {
      current.ultimaVenda = pedido.paidAt;
    }

    grouped.set(key, current);
  }

  const totalPotes = Array.from(grouped.values()).reduce(
    (total, oferta) => total + oferta.potesVendidosPeriodo,
    0
  );

  return Array.from(grouped.values())
    .map((oferta) => ({
      id: `${slugify(produtoGrupo)}-${slugify(oferta.nome)}`,
      produtoGrupo,
      nome: oferta.nome,
      canal: oferta.canal,
      pedidosPeriodo: oferta.pedidosPeriodo,
      potesPorPedido:
        oferta.pedidosPeriodo > 0
          ? oferta.potesVendidosPeriodo / oferta.pedidosPeriodo
          : 0,
      potesVendidosPeriodo: oferta.potesVendidosPeriodo,
      receitaPeriodo: oferta.receitaPeriodo,
      participacaoPeriodo:
        totalPotes > 0 ? oferta.potesVendidosPeriodo / totalPotes : 0,
      ultimaVenda: oferta.ultimaVenda,
    }))
    .sort(
      (first, second) =>
        second.potesVendidosPeriodo - first.potesVendidosPeriodo ||
        second.pedidosPeriodo - first.pedidosPeriodo ||
        first.nome.localeCompare(second.nome)
    );
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
  pedidosOfertas,
  preset,
  source,
}: {
  grupos: EstoqueGrupo[];
  movimentacoes: EstoqueMovimentacao[];
  pedidosOfertas: EstoquePedidoOfertaSnapshot[];
  preset: EstoquePeriodoPreset;
  source: "mock" | "real";
}): EstoquePageData {
  const periodo = buildPeriodo(preset);
  const gruposAgregados = aggregateGroups(grupos);
  const movimentacoesNormalizadas = movimentacoes.map(normalizeMovement);
  const movimentacoesPeriodo = periodo.desde
    ? movimentacoesNormalizadas.filter((item) => item.created_at >= periodo.desde!)
    : movimentacoesNormalizadas;
  const movimentacoesOperacionais = movimentacoesPeriodo.filter(
    isOperationalMovement
  );

  const totals = movimentacoesOperacionais.reduce(
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

  const days = inferPeriodDays(preset, movimentacoesOperacionais);
  const gruposResumo = gruposAgregados
    .map((grupo) => {
      const groupTotals = totals.byGroup.get(grupo.nome_grupo) ?? {
        entradas: 0,
        vendas: 0,
      };
      const giroPeriodo =
        groupTotals.vendas > 0 && days > 0 ? groupTotals.vendas / days : 0;
      const coberturaDias =
        giroPeriodo > 0 ? Math.round(grupo.estoque_atual / giroPeriodo) : null;

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
        ofertas: buildOfertasProduto(grupo.nome_grupo, pedidosOfertas),
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
    saldoAtualTotal: gruposAgregados.reduce(
      (sum, grupo) => sum + grupo.estoque_atual,
      0
    ),
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
  preset: EstoquePeriodoPreset = DEFAULT_ESTOQUE_PERIODO_PRESET
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
    pedidosOfertas: movimentos
      .filter((item) => item.tipo === "venda")
      .map((item) => ({
        id: item.id,
        produtoGrupo: normalizeGroup(item.produto_grupo),
        nome: item.produto_grupo,
        canal: inferOfferChannel(item.produto_grupo),
        qtdPotes: item.qtd_potes,
        receita: item.qtd_potes * 189,
        paidAt: item.created_at,
      })),
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

async function getRealMovimentacoes(
  preset: EstoquePeriodoPreset
): Promise<EstoqueMovimentacao[]> {
  const supabase = createServiceClient();
  const since = periodoDesde(preset);
  const result: EstoqueMovimentacao[] = [];

  for (let offset = 0; ; offset += REAL_MOVEMENT_PAGE_SIZE) {
    let query = supabase
      .from("estoque_movimentacao")
      .select("id, produto_grupo, tipo, qtd_potes, referencia_pedido_id, observacao, created_at")
      .order("created_at", { ascending: false });

    if (since) {
      query = query.gte("created_at", since);
    }

    const { data, error } = await query.range(
      offset,
      offset + REAL_MOVEMENT_PAGE_SIZE - 1
    );

    if (error) {
      console.error("[estoque] Erro ao buscar movimentacoes:", error.message);
      break;
    }

    if (!data || data.length === 0) break;

    result.push(...(data as EstoqueMovimentacao[]));
    if (data.length < REAL_MOVEMENT_PAGE_SIZE) break;
  }

  return result;
}

async function getRealPedidosOfertas(
  preset: EstoquePeriodoPreset
): Promise<EstoquePedidoOfertaSnapshot[]> {
  const supabase = createServiceClient();
  const since = periodoDesde(preset);
  const result: EstoquePedidoOfertaSnapshot[] = [];

  for (let offset = 0; ; offset += REAL_ORDER_PAGE_SIZE) {
    let query = supabase
      .from("pedidos")
      .select("id, produto_nome, produto_grupo, qtd_potes, valor_total, data_pagamento, status_pagamento, chargeback")
      .eq("status_pagamento", "paid")
      .not("data_pagamento", "is", null)
      .order("data_pagamento", { ascending: false });

    if (since) {
      query = query.gte("data_pagamento", since);
    }

    const { data, error } = await query.range(
      offset,
      offset + REAL_ORDER_PAGE_SIZE - 1
    );

    if (error) {
      console.error("[estoque] Erro ao buscar pedidos por oferta:", error.message);
      break;
    }

    if (!data || data.length === 0) break;

    for (const row of data as EstoquePedidoOfertaRow[]) {
      const pedido = normalizePedidoOfertaRow(row);
      if (pedido) result.push(pedido);
    }

    if (data.length < REAL_ORDER_PAGE_SIZE) break;
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

  const [grupos, movimentacoes, pedidosOfertas] = await Promise.all([
    getRealGrupos(),
    getRealMovimentacoes(preset),
    getRealPedidosOfertas(preset),
  ]);

  return buildEstoqueData({
    grupos,
    movimentacoes,
    pedidosOfertas,
    preset,
    source: "real",
  });
}
