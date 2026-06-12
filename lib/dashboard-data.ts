import { buildFunilAiAlerts, defaultAnalyticsDates, getFunilAnalytics } from "@/lib/analytics";
import {
  getTodayInAppTimezone,
  getUtcRangeForAppDate,
  getUtcRangeForAppDates,
  shiftDateString,
} from "@/lib/app-dates";
import {
  createMockCarrinhos,
  getCarrinhosResumo,
  type Carrinho,
} from "@/lib/carrinhos";
import { shouldUseMockData } from "@/lib/data-mode";
import { getFinancialEventMetrics } from "@/lib/financeiro";
import {
  createMockPedidos,
  getPedidosContagemPorStatus,
  getPedidosFinanceiroResumo,
  getPedidosValorPago,
  PEDIDO_STATUS_LOGISTICO_LABELS,
  type Pedido,
  type PedidoStatusLogistico,
} from "@/lib/pedidos";
import { logServerTiming, timedServerTask } from "@/lib/server-timing";
import { createServiceClient, STATUS_LABELS, type StatusPedido } from "@/lib/supabase";

export type DashboardTone = "blue" | "gold" | "green" | "red" | "neutral";

export type DashboardKpi = {
  detail: string;
  label: string;
  period: string;
  tone: DashboardTone;
  value: string;
};

export type DashboardFunnelRow = {
  amount: number;
  count: number;
  label: string;
  tone: DashboardTone;
};

export type DashboardAlert = {
  customerName: string;
  delayDays: number;
  id: string;
  orderNumber: number | null;
  productGroup: string;
  statusLabel: string;
  trackingCode: string | null;
};

export type DashboardFunnelAlert = {
  detail: string;
  level: string;
  source: string;
  title: string;
};

export type DashboardTrendPoint = {
  data: string;
  receita: number;
  reversoes: number;
};

export type DashboardPageData = {
  activeAlerts: DashboardAlert[];
  alertasFunil: DashboardFunnelAlert[];
  checkoutCards: DashboardKpi[];
  funnelRows: DashboardFunnelRow[];
  generatedAtLabel: string;
  operationCards: DashboardKpi[];
  overviewCards: DashboardKpi[];
  trend: DashboardTrendPoint[];
};

type PedidosEmTransitoResponse = {
  count?: number | string | null;
  valor?: number | string | null;
};

type VendasHojeRow = {
  valor_total: number | string | null;
};

type DashboardFunnelRpcRow = {
  status: string | null;
  total: number | string | null;
  valor: number | string | null;
};

type DashboardTrendRpcRow = {
  dia: string;
  receita: number | string | null;
  reembolsos: number | string | null;
};

type DashboardChargebackEventRow = {
  event_at: string | null;
  total_price: number | string | null;
  transaction_id: string | null;
};

type DashboardAlertRpcRow = {
  id: string;
  ordem_pedido: number | null;
  cliente_nome: string | null;
  produto_grupo: string | null;
  codigo_rastreio: string | null;
  data_prometida_entrega: string | null;
  status: string | null;
};

const OPEN_LOGISTICS_STATUSES: PedidoStatusLogistico[] = [
  "postado",
  "em_transporte",
  "aguardando_retirada",
];

const DASHBOARD_PAGE_SIZE = 1000;

function numberValue(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

async function fetchPaidSalesRowsForRange(
  supabase: ReturnType<typeof createServiceClient>,
  startTs: string,
  endTs: string
) {
  const rows: VendasHojeRow[] = [];

  for (let offset = 0; ; offset += DASHBOARD_PAGE_SIZE) {
    const { data, error } = await supabase
      .from("pedidos")
      .select("valor_total")
      .eq("status_pagamento", "paid")
      .not("data_pagamento", "is", null)
      .gte("data_pagamento", startTs)
      .lte("data_pagamento", endTs)
      .order("data_pagamento", { ascending: false })
      .range(offset, offset + DASHBOARD_PAGE_SIZE - 1);

    if (error) throw error;
    if (!data || data.length === 0) break;

    rows.push(...(data as VendasHojeRow[]));

    if (data.length < DASHBOARD_PAGE_SIZE) break;
  }

  return rows;
}

async function fetchChargebackTotalsByDay(
  supabase: ReturnType<typeof createServiceClient>,
  startDate: string,
  endDate: string
) {
  const { startTs, endTs } = getUtcRangeForAppDates(startDate, endDate);
  const rows: DashboardChargebackEventRow[] = [];

  try {
    for (let offset = 0; ; offset += DASHBOARD_PAGE_SIZE) {
      const { data, error } = await supabase
        .from("payt_event_stream")
        .select("transaction_id, total_price, event_at")
        .gte("event_at", startTs)
        .lte("event_at", endTs)
        .in("event_status", ["chargeback", "charged_back"])
        .order("event_at", { ascending: false })
        .range(offset, offset + DASHBOARD_PAGE_SIZE - 1);

      if (error) throw error;
      if (!data || data.length === 0) break;

      rows.push(...(data as DashboardChargebackEventRow[]));

      if (data.length < DASHBOARD_PAGE_SIZE) break;
    }
  } catch (error) {
    if (isMissingPaytEventStream(error)) return new Map<string, number>();
    throw error;
  }

  const latestByTransaction = new Map<string, { day: string; value: number }>();

  for (const row of rows) {
    const transactionId = String(row.transaction_id ?? "").trim();
    const day = appDateKeyFromIso(row.event_at);

    if (!transactionId || !day || latestByTransaction.has(transactionId)) {
      continue;
    }

    latestByTransaction.set(transactionId, {
      day,
      value: numberValue(row.total_price),
    });
  }

  const totals = new Map<string, number>();

  for (const { day, value } of latestByTransaction.values()) {
    totals.set(day, (totals.get(day) ?? 0) + value);
  }

  return totals;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("pt-BR").format(value);
}

function formatPercent(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: 1,
    minimumFractionDigits: 1,
    style: "percent",
  }).format(value);
}

function formatGeneratedAt() {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(new Date());
}

function dateKeyFromIso(value: string | null | undefined) {
  if (!value) return null;
  return value.slice(0, 10);
}

function appDateKeyFromIso(value: string | null | undefined) {
  if (!value) return null;
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return null;

  return new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "America/Sao_Paulo",
    year: "numeric",
  }).format(date);
}

function isMissingPaytEventStream(error: unknown) {
  const message =
    error instanceof Error
      ? error.message.toLowerCase()
      : String(error).toLowerCase();

  return message.includes("payt_event_stream") || message.includes("relation");
}

function appDayTime(date: string) {
  return new Date(`${date.slice(0, 10)}T12:00:00-03:00`).getTime();
}

function getDelayDays(promisedAt: string | null | undefined, today: string) {
  if (!promisedAt) return 0;
  const delay = Math.floor((appDayTime(today) - appDayTime(promisedAt)) / 86_400_000);
  return Math.max(delay, 0);
}

function isActiveDelayedAlert({
  promisedAt,
  status,
  today,
}: {
  promisedAt: string | null | undefined;
  status: string | null | undefined;
  today: string;
}) {
  if (!promisedAt) return false;
  if (status === "entregue" || status === "devolvido") return false;

  return getDelayDays(promisedAt, today) > 0;
}

function normalizeStatusLabel(status: string | null) {
  if (!status) return "Sem status";
  return STATUS_LABELS[status as StatusPedido] ?? status;
}

function normalizeAlert(row: DashboardAlertRpcRow, today: string): DashboardAlert {
  return {
    customerName: row.cliente_nome ?? "Cliente sem nome",
    delayDays: getDelayDays(row.data_prometida_entrega, today),
    id: row.id,
    orderNumber: row.ordem_pedido,
    productGroup: row.produto_grupo ?? "Produto sem grupo",
    statusLabel: normalizeStatusLabel(row.status),
    trackingCode: row.codigo_rastreio,
  };
}

function normalizeTrendPoint(row: DashboardTrendRpcRow): DashboardTrendPoint {
  return {
    data: String(row.dia).slice(0, 10),
    receita: numberValue(row.receita),
    reversoes: numberValue(row.reembolsos),
  };
}

function fillTrendWindow(rows: DashboardTrendPoint[], today: string) {
  const byDay = new Map(rows.map((row) => [row.data, row]));
  const startDate = shiftDateString(today, -29);
  const series: DashboardTrendPoint[] = [];

  for (let day = startDate; day <= today; day = shiftDateString(day, 1)) {
    series.push(byDay.get(day) ?? { data: day, receita: 0, reversoes: 0 });
  }

  return series;
}

function normalizeFunnelRows(rows: DashboardFunnelRpcRow[]) {
  const toneByStatus: Record<string, DashboardTone> = {
    aguardando_postagem: "gold",
    postado: "blue",
    em_transporte: "blue",
    aguardando_retirada: "gold",
    entregue: "green",
    devolvido: "red",
  };

  return rows
    .map((row) => {
      const status = row.status ?? "sem_status";
      return {
        amount: numberValue(row.valor),
        count: numberValue(row.total),
        label: normalizeStatusLabel(status),
        tone: toneByStatus[status] ?? "neutral",
      };
    })
    .filter((row) => row.count > 0);
}

function buildOverviewCards({
  chargebackCount,
  chargebackValue,
  netRevenue,
  refundCount,
  refundValue,
  salesCount,
  salesValue,
}: {
  chargebackCount: number;
  chargebackValue: number;
  netRevenue: number;
  refundCount: number;
  refundValue: number;
  salesCount: number;
  salesValue: number;
}): DashboardKpi[] {
  return [
    {
      detail: `${formatNumber(salesCount)} pedidos pagos`,
      label: "Vendas hoje",
      period: "Hoje",
      tone: "green",
      value: formatCurrency(salesValue),
    },
    {
      detail:
        chargebackValue > 0
          ? `vendas menos ${formatCurrency(refundValue + chargebackValue)} revertidos`
          : "vendas do dia menos reversões",
      label: "Receita líquida",
      period: "Hoje",
      tone: "green",
      value: formatCurrency(netRevenue),
    },
    {
      detail: `${formatNumber(refundCount)} eventos no dia`,
      label: "Reembolsos hoje",
      period: "Hoje",
      tone: "red",
      value: formatCurrency(refundValue),
    },
    {
      detail: `${formatNumber(chargebackCount)} ocorrências no dia`,
      label: "Chargebacks hoje",
      period: "Hoje",
      tone: "gold",
      value: formatCurrency(chargebackValue),
    },
  ];
}

function buildOperationCards({
  activeAlerts,
  abandonedCount,
  carts24h,
  emTransito,
  openCount,
}: {
  activeAlerts: number;
  abandonedCount: number;
  carts24h: number;
  emTransito: number;
  openCount: number;
}): DashboardKpi[] {
  return [
    {
      detail: "pedidos em rota",
      label: "Em trânsito",
      period: "Agora",
      tone: "blue",
      value: formatNumber(emTransito),
    },
    {
      detail: "data prometida vencida",
      label: "Alertas ativos",
      period: "Agora",
      tone: "gold",
      value: formatNumber(activeAlerts),
    },
    {
      detail: `${formatNumber(openCount)} abertos · ${formatNumber(abandonedCount)} abandonos`,
      label: "Carrinhos",
      period: "24h",
      tone: "gold",
      value: formatNumber(carts24h),
    },
  ];
}

function buildCheckoutCards({
  alertasFunil,
  checkoutMonitorado,
  taxaPerda,
  taxaRecuperacao,
}: {
  alertasFunil: number;
  checkoutMonitorado: number;
  taxaPerda: number;
  taxaRecuperacao: number;
}): DashboardKpi[] {
  return [
    {
      detail: "checkouts consolidados na janela",
      label: "Checkout monitorado",
      period: "24h",
      tone: "blue",
      value: formatNumber(checkoutMonitorado),
    },
    {
      detail: "abandono e perda no recorte",
      label: "Taxa de perda",
      period: "24h",
      tone: "red",
      value: formatPercent(taxaPerda),
    },
    {
      detail: "recuperados após evento não pago",
      label: "Taxa de recuperação",
      period: "24h",
      tone: "green",
      value: formatPercent(taxaRecuperacao),
    },
    {
      detail: "sinais avaliados pela camada analítica",
      label: "Alertas de funil",
      period: "7 dias",
      tone: "gold",
      value: formatNumber(alertasFunil),
    },
  ];
}

function buildMockCheckout(carrinhos: Carrinho[]) {
  const now = Date.now();
  const recentCarrinhos = carrinhos.filter((carrinho) => {
    const time = new Date(carrinho.lastActivityAt).getTime();
    return Number.isFinite(time) && now - time <= 24 * 60 * 60 * 1000;
  });
  const resumo = getCarrinhosResumo(recentCarrinhos);
  const openCount = resumo.checkout;
  const lostCount = resumo.perdidos;
  const abandonedCount = resumo.abandonados;
  const recoveredCount = resumo.recuperados;
  const carts24h = openCount + lostCount + abandonedCount;
  const taxaPerda =
    carts24h + recoveredCount > 0
      ? (lostCount + abandonedCount) / (carts24h + recoveredCount)
      : 0;
  const taxaRecuperacao =
    carts24h + recoveredCount > 0
      ? recoveredCount / (carts24h + recoveredCount)
      : 0;

  return {
    abandonedCount,
    carts24h,
    checkoutMonitorado: carts24h + recoveredCount,
    openCount,
    taxaPerda,
    taxaRecuperacao,
  };
}

async function getRealDashboardData(): Promise<DashboardPageData> {
  const totalStartedAt = performance.now();
  const supabase = createServiceClient();
  const today = getTodayInAppTimezone();
  const { startTs, endTs } = getUtcRangeForAppDate(today);
  const analyticsRange = defaultAnalyticsDates(7);
  const trendStartDate = shiftDateString(today, -29);

  const queriesStartedAt = performance.now();
  const [
    vendasHojeRows,
    financialMetrics,
    emTransito,
    atrasados,
    checkout,
    funilPedidos,
    tendencia,
    chargebacksTrend,
    funilAnalytics,
  ] = await Promise.all([
    timedServerTask("dashboard", "vendasHoje", () =>
      fetchPaidSalesRowsForRange(supabase, startTs, endTs)
    ),
    timedServerTask("dashboard", "financeiro", () =>
      getFinancialEventMetrics(today, today)
    ),
    timedServerTask("dashboard", "emTransito", () =>
      supabase.rpc("pedidos_em_transito")
    ),
    timedServerTask("dashboard", "atrasados", () =>
      supabase.rpc("pedidos_atrasados")
    ),
    timedServerTask("dashboard", "checkout", async () => {
      const { getPaytCheckoutSummary } = await import("@/lib/payt-checkout");
      return getPaytCheckoutSummary(24);
    }),
    timedServerTask("dashboard", "funilPedidos", () =>
      supabase.rpc("funil_pedidos", { p_start: startTs, p_end: endTs })
    ),
    timedServerTask("dashboard", "tendencia", () =>
      supabase.rpc("tendencia_30_dias")
    ),
    timedServerTask("dashboard", "chargebacksTrend", () =>
      fetchChargebackTotalsByDay(supabase, trendStartDate, today)
    ),
    timedServerTask("dashboard", "funilAnalytics", () =>
      getFunilAnalytics(
        analyticsRange.startDate,
        analyticsRange.endDate,
        null,
        null,
        { skipImpactAnalysis: true }
      )
    ),
  ]);
  logServerTiming("dashboard", "queries.total", queriesStartedAt);

  if (emTransito.error) throw emTransito.error;
  if (atrasados.error) throw atrasados.error;
  if (funilPedidos.error) throw funilPedidos.error;
  if (tendencia.error) throw tendencia.error;

  const postProcessStartedAt = performance.now();
  const salesRows = vendasHojeRows;
  const salesCount = salesRows.length;
  const salesValue = salesRows.reduce(
    (sum, pedido) => sum + numberValue(pedido.valor_total),
    0
  );
  const refundValue = financialMetrics.valorReembolsos;
  const chargebackValue = financialMetrics.valorChargebacks;
  const netRevenue = salesValue - refundValue - chargebackValue;
  const checkoutSummary = checkout.summary;
  const carts24h =
    checkoutSummary.openCount +
    checkoutSummary.lostCount +
    checkoutSummary.abandonedCount;
  const checkoutMonitorado = carts24h + checkoutSummary.recoveredCount;
  const checkoutLossBase = checkoutMonitorado;
  const taxaPerda =
    checkoutLossBase > 0
      ? (checkoutSummary.lostCount + checkoutSummary.abandonedCount) /
        checkoutLossBase
      : 0;
  const taxaRecuperacao =
    checkoutMonitorado > 0 ? checkoutSummary.recoveredCount / checkoutMonitorado : 0;
  const activeAlerts = ((atrasados.data ?? []) as DashboardAlertRpcRow[])
    .filter((row) =>
      isActiveDelayedAlert({
        promisedAt: row.data_prometida_entrega,
        status: row.status,
        today,
      })
    )
    .map((row) => normalizeAlert(row, today));
  const funnelAlerts = await timedServerTask("dashboard", "postProcess.funilAiAlerts", () =>
    buildFunilAiAlerts({
      dailyRows: funilAnalytics.dailyRows,
      logs: funilAnalytics.logs,
      transcripts: funilAnalytics.transcripts,
    })
  );
  const criticalFunnelAlerts = funnelAlerts.filter(
    (alert) => alert.level === "alerta"
  ).length;

  const data = {
    activeAlerts,
    alertasFunil: funnelAlerts,
    checkoutCards: buildCheckoutCards({
      alertasFunil: criticalFunnelAlerts,
      checkoutMonitorado,
      taxaPerda,
      taxaRecuperacao,
    }),
    funnelRows: normalizeFunnelRows((funilPedidos.data ?? []) as DashboardFunnelRpcRow[]),
    generatedAtLabel: formatGeneratedAt(),
    operationCards: buildOperationCards({
      activeAlerts: activeAlerts.length,
      abandonedCount: checkoutSummary.abandonedCount,
      carts24h,
      emTransito: numberValue((emTransito.data as PedidosEmTransitoResponse | null)?.count),
      openCount: checkoutSummary.openCount,
    }),
    overviewCards: buildOverviewCards({
      chargebackCount: financialMetrics.chargebacks,
      chargebackValue,
      netRevenue,
      refundCount: financialMetrics.reembolsos,
      refundValue,
      salesCount,
      salesValue,
    }),
    trend: fillTrendWindow(
      ((tendencia.data ?? []) as DashboardTrendRpcRow[]).map(normalizeTrendPoint),
      today
    ).map((point) => ({
      ...point,
      reversoes: point.reversoes + (chargebacksTrend.get(point.data) ?? 0),
    })),
  };

  logServerTiming("dashboard", "postProcess.total", postProcessStartedAt);
  logServerTiming("dashboard", "total", totalStartedAt);

  return data;
}

function getMockDashboardData(): DashboardPageData {
  const pedidos = createMockPedidos();
  const carrinhos = createMockCarrinhos();
  const today = getTodayInAppTimezone();
  const todayPedidos = pedidos.filter((pedido) => dateKeyFromIso(pedido.paidAt) === today);
  const todayStatusCounts = getPedidosContagemPorStatus(todayPedidos);
  const todayFinanceiro = getPedidosFinanceiroResumo(todayPedidos);
  const salesValue = getPedidosValorPago(todayPedidos);
  const salesCount = todayPedidos.filter((pedido) => pedido.paymentStatus === "paid").length;
  const refundValue = todayFinanceiro.valorReembolsos;
  const chargebackValue = todayFinanceiro.valorChargebacks;
  const netRevenue = salesValue - refundValue - chargebackValue;
  const allStatusCounts = getPedidosContagemPorStatus(pedidos);
  const emTransito = OPEN_LOGISTICS_STATUSES.reduce(
    (sum, status) => sum + allStatusCounts[status],
    0
  );
  const activeAlerts = pedidos
    .filter((pedido) => {
      return isActiveDelayedAlert({
        promisedAt: pedido.promisedAt,
        status: pedido.logisticsStatus,
        today,
      });
    })
    .slice(0, 50)
    .map((pedido) => ({
      customerName: pedido.customerName,
      delayDays: getDelayDays(pedido.promisedAt, today),
      id: pedido.id,
      orderNumber: pedido.orderNumber,
      productGroup: pedido.productGroup ?? pedido.productName ?? "Produto sem grupo",
      statusLabel: PEDIDO_STATUS_LOGISTICO_LABELS[pedido.logisticsStatus],
      trackingCode: pedido.trackingCode,
    }));
  const checkout = buildMockCheckout(carrinhos);
  const funnelRows: DashboardFunnelRow[] = Object.entries(todayStatusCounts)
    .map(([status, count]) => {
      const tone: DashboardTone =
        status === "aguardando_postagem"
          ? "gold"
          : status === "postado" || status === "em_transporte"
            ? "blue"
            : status === "entregue"
              ? "green"
              : status === "devolvido"
                ? "red"
                : "neutral";

      return {
        amount: count * (salesCount > 0 ? salesValue / salesCount : 0),
        count,
        label: PEDIDO_STATUS_LOGISTICO_LABELS[status as PedidoStatusLogistico],
        tone,
      };
    })
    .filter((row) => row.count > 0);
  const trend = fillTrendWindow(
    Array.from({ length: 30 }, (_, index) => {
      const day = shiftDateString(today, index - 29);
      const pulse = index % 6 === 2 ? 1.16 : index % 7 === 4 ? 0.82 : 1;
      const receita = Math.round((45_000 + index * 2_650) * pulse * 100) / 100;
      const reembolsos = index % 5 === 1 ? Math.round(receita * 0.018 * 100) / 100 : 0;
      const chargebacks = index % 9 === 3 ? Math.round(receita * 0.012 * 100) / 100 : 0;
      return { data: day, receita, reversoes: reembolsos + chargebacks };
    }),
    today
  );
  const alertasFunil: DashboardFunnelAlert[] = [
    {
      detail: `${today}: receita e take rate estaveis na janela recente.`,
      level: "ok",
      source: "Regras",
      title: "Funil sem alertas críticos",
    },
  ];
  const criticalFunnelAlerts = alertasFunil.filter(
    (alert) => alert.level === "alerta"
  ).length;

  return {
    activeAlerts,
    alertasFunil,
    checkoutCards: buildCheckoutCards({
      alertasFunil: criticalFunnelAlerts,
      checkoutMonitorado: checkout.checkoutMonitorado,
      taxaPerda: checkout.taxaPerda,
      taxaRecuperacao: checkout.taxaRecuperacao,
    }),
    funnelRows,
    generatedAtLabel: formatGeneratedAt(),
    operationCards: buildOperationCards({
      activeAlerts: activeAlerts.length,
      abandonedCount: checkout.abandonedCount,
      carts24h: checkout.carts24h,
      emTransito,
      openCount: checkout.openCount,
    }),
    overviewCards: buildOverviewCards({
      chargebackCount: todayFinanceiro.chargebacks,
      chargebackValue,
      netRevenue,
      refundCount: todayFinanceiro.reembolsos,
      refundValue,
      salesCount,
      salesValue,
    }),
    trend,
  };
}

export async function getDashboardData() {
  return shouldUseMockData() ? getMockDashboardData() : getRealDashboardData();
}
