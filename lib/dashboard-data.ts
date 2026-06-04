import { buildFunilAlerts, defaultAnalyticsDates, getFunilAnalytics } from "@/lib/analytics";
import {
  getTodayInAppTimezone,
  getUtcRangeForAppDate,
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
  source: string;
  title: string;
};

export type DashboardTrendPoint = {
  data: string;
  receita: number;
  reembolsos: number;
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

function numberValue(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
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

function appDayTime(date: string) {
  return new Date(`${date.slice(0, 10)}T12:00:00-03:00`).getTime();
}

function getDelayDays(promisedAt: string | null | undefined, today: string) {
  if (!promisedAt) return 0;
  const delay = Math.floor((appDayTime(today) - appDayTime(promisedAt)) / 86_400_000);
  return Math.max(delay, 0);
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
    reembolsos: numberValue(row.reembolsos),
  };
}

function fillTrendWindow(rows: DashboardTrendPoint[], today: string) {
  const byDay = new Map(rows.map((row) => [row.data, row]));
  const startDate = shiftDateString(today, -29);
  const series: DashboardTrendPoint[] = [];

  for (let day = startDate; day <= today; day = shiftDateString(day, 1)) {
    series.push(byDay.get(day) ?? { data: day, receita: 0, reembolsos: 0 });
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
  chargebackValue,
  netRevenue,
  refundCount,
  refundRate,
  refundValue,
  salesCount,
  salesValue,
}: {
  chargebackValue: number;
  netRevenue: number;
  refundCount: number;
  refundRate: number;
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
      detail: "com base nas vendas de hoje",
      label: "Taxa de reembolso",
      period: "Hoje",
      tone: "gold",
      value: formatPercent(refundRate),
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
    lostCount + abandonedCount + recoveredCount > 0
      ? recoveredCount / (lostCount + abandonedCount + recoveredCount)
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
  const supabase = createServiceClient();
  const today = getTodayInAppTimezone();
  const { startTs, endTs } = getUtcRangeForAppDate(today);
  const analyticsRange = defaultAnalyticsDates(7);

  const [
    vendasHojeRows,
    financialMetrics,
    emTransito,
    atrasados,
    checkout,
    funilPedidos,
    tendencia,
    funilAnalytics,
  ] = await Promise.all([
    supabase
      .from("pedidos")
      .select("valor_total")
      .eq("status_pagamento", "paid")
      .not("data_pagamento", "is", null)
      .gte("data_pagamento", startTs)
      .lte("data_pagamento", endTs),
    getFinancialEventMetrics(today, today),
    supabase.rpc("pedidos_em_transito"),
    supabase.rpc("pedidos_atrasados"),
    import("@/lib/payt-checkout").then(({ getPaytCheckoutMonitor }) =>
      getPaytCheckoutMonitor(24)
    ),
    supabase.rpc("funil_pedidos", { p_start: startTs, p_end: endTs }),
    supabase.rpc("tendencia_30_dias"),
    getFunilAnalytics(
      analyticsRange.startDate,
      analyticsRange.endDate,
      null,
      null,
      { skipImpactAnalysis: true }
    ),
  ]);

  if (vendasHojeRows.error) throw vendasHojeRows.error;
  if (emTransito.error) throw emTransito.error;
  if (atrasados.error) throw atrasados.error;
  if (funilPedidos.error) throw funilPedidos.error;
  if (tendencia.error) throw tendencia.error;

  const salesRows = (vendasHojeRows.data ?? []) as VendasHojeRow[];
  const salesCount = salesRows.length;
  const salesValue = salesRows.reduce(
    (sum, pedido) => sum + numberValue(pedido.valor_total),
    0
  );
  const refundValue = financialMetrics.valorReembolsos;
  const chargebackValue = financialMetrics.valorChargebacks;
  const netRevenue = Math.max(salesValue - refundValue - chargebackValue, 0);
  const refundRate = salesCount > 0 ? financialMetrics.reembolsos / salesCount : 0;
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
  const recoveryBase =
    checkoutSummary.lostCount +
    checkoutSummary.abandonedCount +
    checkoutSummary.recoveredCount;
  const taxaRecuperacao =
    recoveryBase > 0 ? checkoutSummary.recoveredCount / recoveryBase : 0;
  const activeAlerts = ((atrasados.data ?? []) as DashboardAlertRpcRow[]).map(
    (row) => normalizeAlert(row, today)
  );
  const funnelAlerts = buildFunilAlerts(funilAnalytics.dailyRows).map((alert) => ({
    detail: alert.detail,
    source: "Regras",
    title: alert.title,
  }));

  return {
    activeAlerts,
    alertasFunil: funnelAlerts,
    checkoutCards: buildCheckoutCards({
      alertasFunil: funnelAlerts.length,
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
      chargebackValue,
      netRevenue,
      refundCount: financialMetrics.reembolsos,
      refundRate,
      refundValue,
      salesCount,
      salesValue,
    }),
    trend: fillTrendWindow(
      ((tendencia.data ?? []) as DashboardTrendRpcRow[]).map(normalizeTrendPoint),
      today
    ),
  };
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
  const netRevenue = Math.max(salesValue - refundValue - chargebackValue, 0);
  const refundRate = salesCount > 0 ? todayFinanceiro.reembolsos / salesCount : 0;
  const allStatusCounts = getPedidosContagemPorStatus(pedidos);
  const emTransito = OPEN_LOGISTICS_STATUSES.reduce(
    (sum, status) => sum + allStatusCounts[status],
    0
  );
  const activeAlerts = pedidos
    .filter((pedido) => {
      const delayDays = getDelayDays(pedido.promisedAt, today);
      return (
        delayDays > 0 &&
        !["entregue", "devolvido"].includes(pedido.logisticsStatus)
      );
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
      return { data: day, receita, reembolsos };
    }),
    today
  );
  const alertasFunil: DashboardFunnelAlert[] = [
    {
      detail: `${today}: receita e take rate estaveis na janela recente.`,
      source: "Regras",
      title: "Funil sem alertas críticos",
    },
  ];

  return {
    activeAlerts,
    alertasFunil,
    checkoutCards: buildCheckoutCards({
      alertasFunil: alertasFunil.length,
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
      chargebackValue,
      netRevenue,
      refundCount: todayFinanceiro.reembolsos,
      refundRate,
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
