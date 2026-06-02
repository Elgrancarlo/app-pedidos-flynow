"use client";

import type { CSSProperties } from "react";
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Inbox, RefreshCw } from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  differenceInCalendarDays,
  endOfDay,
  endOfMonth,
  format,
  startOfDay,
  startOfMonth,
  subDays,
  subMonths,
} from "date-fns";

import { DashboardHeader } from "@/components/layout/dashboard-header";
import {
  SystemDateRangeFilter,
  type RangeValue,
} from "@/components/workspace/system-date-range-filter";
import { useMetrics } from "@/hooks/useMetrics";
import {
  createMockCarrinhos,
  getCarrinhosResumo,
  type Carrinho,
} from "@/lib/carrinhos";
import type { MetricsData } from "@/lib/metrics";
import {
  createMockPedidos,
  getPedidosContagemPorStatus,
  getPedidosFinanceiroResumo,
  getPedidosValorPago,
  PEDIDO_STATUS_LOGISTICO_LABELS,
  type Pedido,
  type PedidoStatusLogistico,
} from "@/lib/pedidos";
import { cn, formatCurrency, formatPercent } from "@/lib/utils";

type RangePreset = {
  key: string;
  label: string;
  displayLabel: string;
  getRange: () => { from: Date; to: Date };
};

type DashboardTone = "blue" | "gold" | "green" | "red" | "neutral";

type KpiMetricProps = {
  detail: string;
  label: string;
  tone?: DashboardTone;
  value: string;
};

type PedidoFunnelRow = {
  amount: number;
  count: number;
  label: string;
  tone: DashboardTone;
};

type DashboardAlert = {
  customerName: string;
  delayDays: number;
  id: string;
  orderNumber: number | null;
  productGroup: string;
  statusLabel: string;
  trackingCode: string | null;
};

type FunnelAlert = {
  detail: string;
  source: string;
  title: string;
};

type TrendPoint = {
  data: string;
  receita: number;
  reembolsos: number;
};

type DashboardData = {
  activeAlerts: DashboardAlert[];
  alertasAtivos: number;
  alertasFunil: FunnelAlert[];
  carrinhos24h: number;
  checkoutMonitorado: number;
  emTransito: number;
  funnelRows: PedidoFunnelRow[];
  pedidosHoje: number;
  receitaLiquida: number;
  reembolsosHojeEventos: number;
  reembolsosHoje: number;
  salesValue: number;
  taxaPerda: number;
  taxaRecuperacao: number;
  taxaReembolso: number;
  trend: TrendPoint[];
};

type TrendChartTooltipPayload = {
  color?: string;
  dataKey?: string | number;
  name?: string | number;
  value?: string | number;
};

type TrendChartTooltipProps = {
  active?: boolean;
  isCompact: boolean;
  label?: string | number;
  payload?: TrendChartTooltipPayload[];
};

const RANGE_PRESETS: RangePreset[] = [
  {
    key: "today",
    label: "Hoje",
    displayLabel: "Hoje",
    getRange: () => {
      const today = new Date();
      return { from: startOfDay(today), to: endOfDay(today) };
    },
  },
  {
    key: "7d",
    label: "7 dias",
    displayLabel: "7D",
    getRange: () => {
      const today = new Date();
      return { from: startOfDay(subDays(today, 6)), to: endOfDay(today) };
    },
  },
  {
    key: "30d",
    label: "30 dias",
    displayLabel: "30D",
    getRange: () => {
      const today = new Date();
      return { from: startOfDay(subDays(today, 29)), to: endOfDay(today) };
    },
  },
  {
    key: "month",
    label: "Este mês",
    displayLabel: "Este mês",
    getRange: () => {
      const today = new Date();
      return { from: startOfMonth(today), to: endOfDay(today) };
    },
  },
  {
    key: "last-month",
    label: "Mês anterior",
    displayLabel: "Mês anterior",
    getRange: () => {
      const previousMonth = subMonths(new Date(), 1);
      return {
        from: startOfMonth(previousMonth),
        to: endOfMonth(previousMonth),
      };
    },
  },
];

const OPEN_LOGISTICS_STATUSES: PedidoStatusLogistico[] = [
  "pago",
  "nota_fiscal",
  "separacao",
  "aguardando_postagem",
  "postado",
  "em_transporte",
  "aguardando_retirada",
];

const toneDotClass: Record<DashboardTone, string> = {
  blue: "bg-[var(--fly-chart-investment)]",
  gold: "bg-[var(--fly-chart-revenue)]",
  green: "bg-[var(--fly-success)]",
  neutral: "bg-[var(--fly-text-muted)]",
  red: "bg-[var(--fly-danger-strong)]",
};

const toneBarClass: Record<DashboardTone, string> = {
  blue: "bg-[var(--fly-chart-investment)]",
  gold: "bg-[var(--fly-chart-revenue)]",
  green: "bg-[var(--fly-success)]",
  neutral: "bg-[var(--fly-text-soft)]",
  red: "bg-[var(--fly-danger-strong)]",
};

function compactCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

function compactChartValue(value: number) {
  if (Math.abs(value) >= 1_000_000) {
    return `${new Intl.NumberFormat("pt-BR", {
      maximumFractionDigits: 1,
    }).format(value / 1_000_000)} mi`;
  }

  if (Math.abs(value) >= 1_000) {
    return `${new Intl.NumberFormat("pt-BR", {
      maximumFractionDigits: 1,
    }).format(value / 1_000)}k`;
  }

  return new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: 0,
  }).format(value);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("pt-BR").format(value);
}

function formatDateLabel(value: string) {
  return new Date(`${value}T12:00:00`).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  });
}

function getDateFromIso(value: string | null | undefined) {
  if (!value) return null;
  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? null : date;
}

function isWithinRange(value: string | null | undefined, range: { from: Date; to: Date }) {
  const date = getDateFromIso(value);
  if (!date) return false;

  return date.getTime() >= range.from.getTime() && date.getTime() <= range.to.getTime();
}

function getCompactChartTicks(data: TrendPoint[]) {
  if (data.length <= 5) {
    return data.map((item) => item.data);
  }

  const lastIndex = data.length - 1;
  const indexes = [
    0,
    Math.round(lastIndex * 0.25),
    Math.round(lastIndex * 0.5),
    Math.round(lastIndex * 0.75),
    lastIndex,
  ];

  return Array.from(new Set(indexes))
    .map((index) => data[index]?.data)
    .filter((tick): tick is string => Boolean(tick));
}

function isOpenLogisticsStatus(status: PedidoStatusLogistico) {
  return OPEN_LOGISTICS_STATUSES.includes(status);
}

function getDelayDays(pedido: Pedido, index: number) {
  const promisedAt = getDateFromIso(pedido.promisedAt);
  const naturalDelay = promisedAt
    ? differenceInCalendarDays(new Date(), promisedAt)
    : 0;

  if (naturalDelay > 0) return naturalDelay;
  if (pedido.issue === "atrasado") return 1 + ((pedido.orderNumber ?? index) % 70);

  return 0;
}

function getTodaySeriesPoint(data: MetricsData) {
  return data.serie_temporal.at(-1);
}

function getAverageTicket(data: MetricsData, pedidos: Pedido[]) {
  const frontend = data.conversoes_etapa.frontend;
  if (frontend.quantidade > 0 && frontend.receita > 0) {
    return frontend.receita / frontend.quantidade;
  }

  const paidValue = getPedidosValorPago(pedidos);
  const paidCount = pedidos.filter((pedido) => pedido.paymentStatus === "paid").length;

  return paidCount > 0 ? paidValue / paidCount : 192;
}

function buildTrend(data: MetricsData, financeiroRate: number): TrendPoint[] {
  return data.serie_temporal.map((item, index) => {
    const refundPulse = index % 6 === 2 ? 1.45 : index % 7 === 4 ? 0.62 : 1;

    return {
      data: item.data,
      receita: item.faturamento,
      reembolsos: Math.round(item.faturamento * financeiroRate * refundPulse * 100) / 100,
    };
  });
}

function buildFunnelAlerts({
  dashboardData,
  data,
}: {
  dashboardData: Pick<DashboardData, "pedidosHoje" | "taxaPerda">;
  data: MetricsData;
}): FunnelAlert[] {
  const trend = data.serie_temporal;
  const latest = trend.at(-1);
  const previousWindow = trend.slice(Math.max(trend.length - 4, 0), -1);
  const previousAverage =
    previousWindow.length > 0
      ? previousWindow.reduce((total, item) => total + item.faturamento, 0) /
        previousWindow.length
      : latest?.faturamento ?? 0;
  const revenueDrop =
    latest && previousAverage > 0
      ? Math.max(1 - latest.faturamento / previousAverage, 0)
      : 0;

  return [
    {
      title: "Queda de receita no funil",
      detail: `${latest ? latest.data : format(new Date(), "yyyy-MM-dd")}: receita ficou ${formatPercent(revenueDrop)} abaixo da média dos 3 dias anteriores.`,
      source: "IA",
    },
    {
      title: "Diminuição de vendas diretas",
      detail: `${latest ? latest.data : format(new Date(), "yyyy-MM-dd")}: ${dashboardData.pedidosHoje} vendas diretas no recorte monitorado.`,
      source: "IA",
    },
    {
      title: "Impacto de novo produto no funil",
      detail: `A taxa de perda está em ${formatPercent(dashboardData.taxaPerda)}; vale monitorar mudanças de oferta e recuperação.`,
      source: "IA",
    },
  ];
}

function buildDashboardData({
  carrinhos,
  data,
  pedidos,
  range,
}: {
  carrinhos: Carrinho[];
  data: MetricsData;
  pedidos: Pedido[];
  range: { from: Date; to: Date };
}): DashboardData {
  const periodPedidos = pedidos.filter((pedido) =>
    isWithinRange(pedido.paidAt ?? pedido.createdAt, range)
  );
  const todayKey = format(range.to, "yyyy-MM-dd");
  const todayPedidos = periodPedidos.filter((pedido) => {
    const paidAt = getDateFromIso(pedido.paidAt ?? pedido.createdAt);
    return paidAt ? format(paidAt, "yyyy-MM-dd") === todayKey : false;
  });
  const periodCarrinhos = carrinhos.filter((carrinho) =>
    isWithinRange(carrinho.lastActivityAt ?? carrinho.createdAt, range)
  );
  const todayCarrinhos = carrinhos.filter((carrinho) => {
    const activity = getDateFromIso(carrinho.lastActivityAt ?? carrinho.createdAt);
    return activity ? activity.getTime() >= subDays(new Date(), 1).getTime() : false;
  });
  const financeiroHoje = getPedidosFinanceiroResumo(todayPedidos);
  const statusCounts = getPedidosContagemPorStatus(periodPedidos);
  const carrinhosResumo = getCarrinhosResumo(periodCarrinhos);
  const todaySeriesPoint = getTodaySeriesPoint(data);
  const averageTicket = getAverageTicket(data, periodPedidos);
  const salesValue =
    todaySeriesPoint?.faturamento ?? getPedidosValorPago(todayPedidos);
  const reembolsosHoje = financeiroHoje.valorReembolsos;
  const receitaLiquida = Math.max(salesValue - reembolsosHoje, 0);
  const pedidosHoje =
    todayPedidos.filter((pedido) => pedido.paymentStatus === "paid").length ||
    Math.round(salesValue / Math.max(averageTicket, 1));
  const activeAlerts = periodPedidos
    .filter((pedido, index) => {
      const delayDays = getDelayDays(pedido, index);

      return (
        isOpenLogisticsStatus(pedido.logisticsStatus) &&
        (pedido.issue === "atrasado" || delayDays > 0)
      );
    })
    .map((pedido, index) => ({
      customerName: pedido.customerName,
      delayDays: getDelayDays(pedido, index),
      id: pedido.id,
      orderNumber: pedido.orderNumber,
      productGroup: pedido.productGroup ?? pedido.productName ?? "Produto sem grupo",
      statusLabel: PEDIDO_STATUS_LOGISTICO_LABELS[pedido.logisticsStatus],
      trackingCode: pedido.trackingCode,
    }))
    .sort((first, second) => second.delayDays - first.delayDays);
  const emTransito =
    statusCounts.postado +
    statusCounts.em_transporte +
    statusCounts.aguardando_retirada;
  const checkoutMonitorado =
    periodCarrinhos.length > 0
      ? periodCarrinhos.length
      : carrinhosResumo.total;
  const perdaBase =
    carrinhosResumo.abandonados + carrinhosResumo.perdidos + carrinhosResumo.recuperados;
  const taxaPerda =
    perdaBase > 0
      ? (carrinhosResumo.abandonados + carrinhosResumo.perdidos) / perdaBase
      : 0;
  const refundRate = salesValue > 0 ? reembolsosHoje / salesValue : 0;
  const financeiroRate =
    data.faturamento_total > 0
      ? Math.max(refundRate, 0.006)
      : 0.006;
  const dashboardDataBase = {
    pedidosHoje,
    taxaPerda,
  };
  const funnelRows: PedidoFunnelRow[] = [
    {
      amount: statusCounts.aguardando_postagem * averageTicket,
      count: statusCounts.aguardando_postagem,
      label: "Aguard. postagem",
      tone: "gold",
    },
    {
      amount: statusCounts.postado * averageTicket,
      count: statusCounts.postado,
      label: "Postado",
      tone: "blue",
    },
  ];

  return {
    activeAlerts,
    alertasAtivos: activeAlerts.length,
    alertasFunil: buildFunnelAlerts({ dashboardData: dashboardDataBase, data }),
    carrinhos24h: todayCarrinhos.length,
    checkoutMonitorado,
    emTransito,
    funnelRows,
    pedidosHoje,
    receitaLiquida,
    reembolsosHojeEventos: financeiroHoje.reembolsos,
    reembolsosHoje,
    salesValue,
    taxaPerda,
    taxaRecuperacao: carrinhosResumo.taxaRecuperacao,
    taxaReembolso: refundRate,
    trend: buildTrend(data, financeiroRate),
  };
}

function useCompactViewport() {
  const [isCompact, setIsCompact] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(max-width: 639px)");
    const updateMatch = () => setIsCompact(query.matches);

    updateMatch();
    query.addEventListener("change", updateMatch);

    return () => query.removeEventListener("change", updateMatch);
  }, []);

  return isCompact;
}

function SectionHeader({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="flex min-w-0 items-start gap-3">
      <span
        aria-hidden="true"
        className="mt-0.5 h-8 w-px shrink-0 rounded-full bg-gradient-to-b from-[var(--fly-border-strong)] via-[var(--fly-border)] to-transparent"
      />
      <div className="min-w-0">
        <h2 className="text-[15px] font-semibold leading-none text-[var(--fly-text)]">
          {title}
        </h2>
        {description ? (
          <p className="mt-1.5 text-[13px] leading-5 text-[var(--fly-text-muted)] sm:text-sm">
            {description}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function KpiCard({ detail, label, tone = "neutral", value }: KpiMetricProps) {
  return (
    <section className="flynow-dashboard-enter-item min-w-0 rounded-[8px] border border-[var(--fly-border)] bg-[var(--fly-surface)] p-3 shadow-[var(--fly-panel-shadow)] sm:p-4">
      <div className="flex min-w-0 items-center gap-2">
        <span
          aria-hidden="true"
          className={cn("size-1.5 shrink-0 rounded-full", toneDotClass[tone])}
        />
        <p className="truncate text-[11px] font-medium uppercase text-[var(--fly-text-muted)]">
          {label}
        </p>
      </div>
      <p className="mt-3 text-[24px] font-semibold leading-none tabular-nums text-[var(--fly-text)] sm:text-[28px] 2xl:text-[30px]">
        {value}
      </p>
      <p className="mt-2 text-xs leading-5 text-[var(--fly-text-muted)]">
        {detail}
      </p>
    </section>
  );
}

function SectionGroup({
  children,
  title,
}: {
  children: React.ReactNode;
  title: string;
}) {
  return (
    <section className="space-y-3">
      <h2 className="px-1 text-sm font-semibold text-[var(--fly-text-soft)]">
        {title}
      </h2>
      {children}
    </section>
  );
}

function DashboardSkeleton() {
  return (
    <div
      role="status"
      aria-label="Carregando métricas"
      className="flynow-dashboard-skeleton space-y-5"
    >
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="flynow-dashboard-skeleton-panel h-[134px] rounded-[8px] border border-[var(--fly-border)] bg-[var(--fly-surface)]"
          />
        ))}
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className="flynow-dashboard-skeleton-panel h-[126px] rounded-[8px] border border-[var(--fly-border)] bg-[var(--fly-surface)]"
          />
        ))}
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="flynow-dashboard-skeleton-panel h-[126px] rounded-[8px] border border-[var(--fly-border)] bg-[var(--fly-surface)]"
          />
        ))}
      </div>
      <div className="grid gap-5 xl:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
        <div className="flynow-dashboard-skeleton-panel h-[320px] rounded-[8px] border border-[var(--fly-border)] bg-[var(--fly-surface)]" />
        <div className="flynow-dashboard-skeleton-panel h-[320px] rounded-[8px] border border-[var(--fly-border)] bg-[var(--fly-surface)]" />
      </div>
      <div className="flynow-dashboard-skeleton-panel h-[430px] rounded-[8px] border border-[var(--fly-border)] bg-[var(--fly-surface)]" />
      <span className="sr-only">Carregando métricas do dashboard.</span>
    </div>
  );
}

function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div
      role="alert"
      className="flynow-dashboard-error-state flex flex-col gap-4 rounded-[8px] border border-[var(--fly-danger-border)] bg-[var(--fly-danger-surface)] p-4 text-sm text-[var(--fly-danger-text)] shadow-[var(--fly-panel-inset)] sm:flex-row sm:items-center sm:justify-between sm:p-5"
    >
      <div className="flex min-w-0 items-start gap-3">
        <span className="flynow-dashboard-error-icon flex size-9 shrink-0 items-center justify-center rounded-[8px] border border-[var(--fly-danger-border)] bg-[var(--fly-danger-surface)] text-[var(--fly-danger-text)]">
          <AlertTriangle aria-hidden="true" className="size-4" />
        </span>
        <div className="min-w-0">
          <p className="flynow-dashboard-error-title font-semibold text-[var(--fly-danger-strong)]">
            Métricas indisponíveis
          </p>
          <p className="flynow-dashboard-error-message mt-1 leading-5 text-[var(--fly-danger-text)]">
            {message}
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={onRetry}
        className="flynow-dashboard-error-action inline-flex h-9 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-[8px] border border-[var(--fly-danger-border)] bg-[var(--fly-danger-surface)] px-3 text-xs font-semibold text-[var(--fly-danger-strong)] outline-none transition-colors duration-150 hover:border-[var(--fly-danger-border-hover)] hover:bg-[var(--fly-danger-surface-hover)] focus-visible:ring-2 focus-visible:ring-[var(--fly-danger-border-hover)]"
      >
        <RefreshCw aria-hidden="true" className="size-3.5" />
        Tentar novamente
      </button>
    </div>
  );
}

function RefreshErrorNotice({ onRetry }: { onRetry: () => void }) {
  return (
    <div
      role="status"
      className="flynow-dashboard-warning-state flex flex-col gap-3 rounded-[8px] border border-[var(--fly-warning-border)] bg-[var(--fly-warning-surface)] p-3 text-sm text-[var(--fly-warning-text)] shadow-[var(--fly-panel-inset)] sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex min-w-0 items-center gap-2.5">
        <AlertTriangle aria-hidden="true" className="size-4 shrink-0" />
        <p className="flynow-dashboard-warning-message min-w-0 text-[13px] leading-5 text-[var(--fly-warning-text)]">
          Não foi possível atualizar as métricas. Os últimos dados carregados
          continuam visíveis.
        </p>
      </div>
      <button
        type="button"
        onClick={onRetry}
        className="flynow-dashboard-warning-action inline-flex h-8 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-[7px] border border-[var(--fly-warning-border)] bg-[var(--fly-warning-surface)] px-3 text-xs font-semibold text-[var(--fly-warning-text)] outline-none transition-colors duration-150 hover:border-[var(--fly-warning-border-hover)] hover:bg-[var(--fly-warning-surface-hover)] focus-visible:ring-2 focus-visible:ring-[var(--fly-warning-border-hover)]"
      >
        <RefreshCw aria-hidden="true" className="size-3.5" />
        Recarregar
      </button>
    </div>
  );
}

function EmptyState({
  title,
  description,
  compact = false,
}: {
  title: string;
  description: string;
  compact?: boolean;
}) {
  return (
    <div
      role="status"
      className={cn(
        "flynow-dashboard-empty-state flex min-h-[220px] items-center justify-center rounded-[8px] border border-dashed border-[var(--fly-border-strong)] bg-[var(--fly-row-bg)] px-4 text-center",
        compact && "min-h-[164px]"
      )}
    >
      <div className="max-w-[260px]">
        <span className="flynow-dashboard-empty-icon mx-auto flex size-9 items-center justify-center rounded-[8px] border border-[var(--fly-border)] bg-[var(--fly-control)] text-[var(--fly-text-muted)] shadow-[var(--fly-panel-inset)]">
          <Inbox aria-hidden="true" className="size-4" />
        </span>
        <p className="flynow-dashboard-empty-title mt-3 text-sm font-semibold text-[var(--fly-text)]">
          {title}
        </p>
        <p className="flynow-dashboard-empty-description mt-1.5 text-[13px] leading-5 text-[var(--fly-text-muted)]">
          {description}
        </p>
      </div>
    </div>
  );
}

function TrendChartTooltip({
  active,
  isCompact,
  label,
  payload,
}: TrendChartTooltipProps) {
  if (!active || !payload?.length) {
    return null;
  }

  return (
    <div
      className={cn(
        "flynow-chart-tooltip min-w-[178px] rounded-[8px] border border-[var(--fly-border)] bg-[var(--fly-surface-elevated)] p-2.5 text-xs shadow-[var(--fly-tooltip-shadow)] backdrop-blur-xl",
        isCompact && "w-[min(216px,calc(100vw-56px))] min-w-0 p-2"
      )}
    >
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--fly-text-muted)] sm:text-[11px]">
        {formatDateLabel(String(label))}
      </p>
      <div className="space-y-1.5">
        {payload.map((item) => {
          const key = String(item.dataKey ?? item.name);
          const isRevenue = key === "receita";
          const labelText = isRevenue ? "Receita" : "Reembolsos";

          return (
            <div
              key={key}
              className="flex items-center justify-between gap-4"
            >
              <span className="inline-flex items-center gap-2 text-[var(--fly-text-soft)]">
                <span
                  aria-hidden="true"
                  className="size-1.5 rounded-full"
                  style={{ background: item.color }}
                />
                {labelText}
              </span>
              <span className="font-semibold tabular-nums text-[var(--fly-text)]">
                {formatCurrency(Number(item.value ?? 0))}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TrendChart({ data }: { data: TrendPoint[] }) {
  const isCompact = useCompactViewport();
  const hasChartData = data.length > 0;
  const compactChartTicks = useMemo(() => getCompactChartTicks(data), [data]);

  return (
    <section className="min-w-0 rounded-[8px] border border-[var(--fly-border)] bg-[var(--fly-surface)] p-3 shadow-[var(--fly-panel-shadow)] sm:p-5">
      <div className="mb-4">
        <SectionHeader
          title="Tendência"
          description="Receita e reembolsos nos últimos dias"
        />
      </div>

      {hasChartData ? (
        <div
          role="img"
          aria-label="Gráfico de tendência com receita e reembolsos"
          className="flynow-chart-stage h-[292px] min-w-0 sm:h-[320px]"
        >
          <div className="flynow-chart-plot h-full min-w-0">
            <ResponsiveContainer
              width="100%"
              height="100%"
              minWidth={1}
              minHeight={240}
              initialDimension={{ width: 640, height: 320 }}
            >
              <LineChart
                data={data}
                margin={
                  isCompact
                    ? { top: 18, right: 16, bottom: 2, left: -8 }
                    : { top: 8, right: 12, bottom: 0, left: 0 }
                }
              >
                <CartesianGrid
                  stroke="var(--fly-border-subtle)"
                  strokeDasharray="3 3"
                  vertical={false}
                />
                <XAxis
                  dataKey="data"
                  tick={{
                    fill: "var(--fly-text-muted)",
                    fontSize: isCompact ? 10 : 11,
                  }}
                  tickFormatter={formatDateLabel}
                  axisLine={false}
                  tickLine={false}
                  ticks={isCompact ? compactChartTicks : undefined}
                  interval={isCompact ? 0 : "preserveEnd"}
                  minTickGap={isCompact ? 8 : 24}
                  tickMargin={isCompact ? 10 : 8}
                />
                <YAxis
                  tick={{
                    fill: "var(--fly-text-muted)",
                    fontSize: isCompact ? 10 : 11,
                  }}
                  tickFormatter={(value) =>
                    isCompact
                      ? compactChartValue(Number(value))
                      : compactCurrency(Number(value))
                  }
                  axisLine={false}
                  tickLine={false}
                  width={isCompact ? 42 : 72}
                  tickCount={isCompact ? 4 : 5}
                  tickMargin={isCompact ? 5 : 8}
                />
                <Tooltip
                  allowEscapeViewBox={{ x: true, y: true }}
                  content={<TrendChartTooltip isCompact={isCompact} />}
                  cursor={{
                    stroke: "var(--fly-border-strong)",
                    strokeDasharray: "4 4",
                    strokeWidth: 1,
                  }}
                  position={isCompact ? { x: 50, y: 8 } : undefined}
                  wrapperStyle={{
                    outline: "none",
                    pointerEvents: "none",
                    zIndex: 20,
                  }}
                />
                <Line
                  animationBegin={120}
                  animationDuration={820}
                  animationEasing="ease-out"
                  type="monotone"
                  dataKey="receita"
                  stroke="var(--fly-success)"
                  strokeWidth={isCompact ? 2.4 : 2.25}
                  dot={false}
                  activeDot={{
                    r: isCompact ? 3.75 : 4,
                    fill: "var(--fly-success)",
                    stroke: "var(--fly-surface)",
                  }}
                />
                <Line
                  animationBegin={220}
                  animationDuration={720}
                  animationEasing="ease-out"
                  type="monotone"
                  dataKey="reembolsos"
                  stroke="var(--fly-danger-strong)"
                  strokeWidth={isCompact ? 2.05 : 1.9}
                  dot={false}
                  activeDot={{
                    r: isCompact ? 3.4 : 3.75,
                    fill: "var(--fly-danger-strong)",
                    stroke: "var(--fly-surface)",
                  }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : (
        <EmptyState
          compact
          title="Sem tendência no período"
          description="A curva será exibida quando houver dados suficientes."
        />
      )}
    </section>
  );
}

function OrdersFunnelCard({ rows }: { rows: PedidoFunnelRow[] }) {
  const total = rows.reduce((sum, row) => sum + row.count, 0);
  const max = Math.max(...rows.map((row) => row.count), 1);

  return (
    <section className="min-w-0 rounded-[8px] border border-[var(--fly-border)] bg-[var(--fly-surface)] p-3 shadow-[var(--fly-panel-shadow)] sm:p-5">
      <div className="mb-5">
        <SectionHeader
          title="Funil de pedidos"
          description={`${formatNumber(total)} pedidos totais no recorte`}
        />
      </div>
      <div className="space-y-4">
        {rows.map((row) => (
          <div
            key={row.label}
            className="grid grid-cols-[minmax(110px,0.7fr)_minmax(120px,1fr)_auto] items-center gap-3 text-sm max-sm:grid-cols-1"
          >
            <p className="truncate text-[var(--fly-text-soft)]">{row.label}</p>
            <div className="h-2 overflow-hidden rounded-full bg-[var(--fly-divider)]">
              <span
                aria-hidden="true"
                className={cn("block h-full rounded-full", toneBarClass[row.tone])}
                style={{ width: `${Math.max((row.count / max) * 100, 5)}%` }}
              />
            </div>
            <div className="flex min-w-[132px] items-center justify-end gap-5 tabular-nums max-sm:justify-between">
              <span className="font-semibold text-[var(--fly-text)]">
                {formatNumber(row.count)}
              </span>
              <span className="text-xs text-[var(--fly-text-muted)]">
                {compactCurrency(row.amount)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function ActiveAlertsPanel({ alerts, count }: { alerts: DashboardAlert[]; count: number }) {
  return (
    <section className="rounded-[8px] border border-[var(--fly-warning-border)] bg-[var(--fly-surface)] p-3 shadow-[var(--fly-panel-shadow)] sm:p-5">
      <div className="mb-4 flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-2">
          <span
            aria-hidden="true"
            className="size-1.5 shrink-0 rounded-full bg-[var(--fly-warning-strong)]"
          />
          <h2 className="text-[15px] font-semibold text-[var(--fly-text)]">
            Alertas ativos
          </h2>
          <span className="rounded-full border border-[var(--fly-warning-border)] bg-[var(--fly-warning-bg)] px-2 py-0.5 text-xs font-semibold tabular-nums text-[var(--fly-warning-strong)]">
            {formatNumber(count)}
          </span>
        </div>
        <p className="text-xs text-[var(--fly-text-muted)]">
          Pedidos com data prometida vencida
        </p>
      </div>

      {alerts.length ? (
        <div className="space-y-2">
          {alerts.slice(0, 10).map((alert) => (
            <article
              key={alert.id}
              className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)_auto_auto] items-center gap-3 rounded-[8px] border border-[var(--fly-warning-border)] bg-[var(--fly-row-bg)] px-3 py-2.5 transition-colors duration-150 hover:border-[var(--fly-warning-border-hover)] hover:bg-[var(--fly-row-hover)] max-md:grid-cols-[auto_minmax(0,1fr)_auto]"
            >
              <span className="text-xs font-medium tabular-nums text-[var(--fly-text-dim)]">
                {alert.orderNumber ? `#${alert.orderNumber}` : "—"}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-[var(--fly-text)]">
                  {alert.customerName}
                </p>
                <p className="mt-0.5 truncate text-xs text-[var(--fly-text-muted)]">
                  {alert.productGroup} · {alert.statusLabel}
                </p>
              </div>
              <span className="max-w-[120px] truncate text-xs font-medium tabular-nums text-[var(--fly-brand-strong)] max-md:hidden">
                {alert.trackingCode ?? "Sem rastreio"}
              </span>
              <span className="rounded-[7px] border border-[var(--fly-warning-border)] bg-[var(--fly-warning-bg)] px-2 py-1 text-xs font-semibold tabular-nums text-[var(--fly-warning-strong)]">
                {alert.delayDays}d atraso
              </span>
            </article>
          ))}
          {count > 10 ? (
            <p className="pt-2 text-center text-xs text-[var(--fly-text-muted)]">
              +{formatNumber(count - 10)} outros alertas
            </p>
          ) : null}
        </div>
      ) : (
        <EmptyState
          compact
          title="Sem alertas ativos"
          description="Nenhum pedido atrasado foi encontrado para este período."
        />
      )}
    </section>
  );
}

function FunnelAlertsPanel({ alerts }: { alerts: FunnelAlert[] }) {
  return (
    <section className="rounded-[8px] border border-[var(--fly-border)] bg-[var(--fly-surface)] p-3 shadow-[var(--fly-panel-shadow)] sm:p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-[15px] font-semibold text-[var(--fly-text)]">
          Alertas do funil
        </h2>
        <span className="text-xs text-[var(--fly-text-muted)]">
          {formatNumber(alerts.length)} sinais
        </span>
      </div>
      <div className="space-y-2.5">
        {alerts.map((alert) => (
          <article
            key={alert.title}
            className="rounded-[8px] border border-[var(--fly-danger-border)] bg-[var(--fly-danger-bg)] px-3 py-3"
          >
            <div className="flex min-w-0 items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[var(--fly-text)]">
                  {alert.title}
                </p>
                <p className="mt-1 text-sm leading-5 text-[var(--fly-text-soft)]">
                  {alert.detail}
                </p>
              </div>
              <span className="shrink-0 text-[10px] font-semibold uppercase text-[var(--fly-text-muted)]">
                {alert.source}
              </span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function PeriodActions({
  activeRange,
  range,
  calendarValue,
  maxDate,
  calendarCloseSignal,
  onSelect,
  onCalendarChange,
}: {
  activeRange: string;
  range: { from: Date; to: Date };
  calendarValue: RangeValue | null;
  maxDate: Date;
  calendarCloseSignal: number;
  onSelect: (preset: RangePreset) => void;
  onCalendarChange: (value: RangeValue | null) => void;
}) {
  return (
    <SystemDateRangeFilter
      activeRange={activeRange}
      appliedLabel={`Período aplicado: ${format(range.from, "dd/MM/yyyy")} - ${format(range.to, "dd/MM/yyyy")}`}
      ariaLabel="Filtro de período"
      calendarCloseSignal={calendarCloseSignal}
      calendarValue={calendarValue}
      maxDate={maxDate}
      onCalendarChange={onCalendarChange}
      onPresetSelect={onSelect}
      presets={RANGE_PRESETS}
    />
  );
}

export function PerformanceDashboard() {
  const initialRange = useMemo(() => RANGE_PRESETS[2].getRange(), []);
  const maxSelectableDate = useMemo(() => endOfDay(new Date()), []);
  const initialRangeKey = useMemo(
    () =>
      `${format(initialRange.from, "yyyy-MM-dd")}:${format(
        initialRange.to,
        "yyyy-MM-dd"
      )}`,
    [initialRange]
  );
  const pedidosMock = useMemo(() => createMockPedidos(), []);
  const carrinhosMock = useMemo(() => createMockCarrinhos(), []);
  const [activeRange, setActiveRange] = useState("30d");
  const [range, setRange] = useState(initialRange);
  const [calendarValue, setCalendarValue] = useState<RangeValue | null>({
    start: initialRange.from,
    end: initialRange.to,
  });
  const [calendarCloseSignal] = useState(0);
  const {
    data,
    status,
    error,
    isInitialLoading,
    isRefreshing,
    isEmpty,
    retry,
  } = useMetrics(range.from, range.to);
  const rangeKey = useMemo(
    () => `${format(range.from, "yyyy-MM-dd")}:${format(range.to, "yyyy-MM-dd")}`,
    [range]
  );
  const [contentVersion, setContentVersion] = useState(initialRangeKey);
  const dashboardData = useMemo(
    () =>
      data
        ? buildDashboardData({
            carrinhos: carrinhosMock,
            data,
            pedidos: pedidosMock,
            range,
          })
        : null,
    [carrinhosMock, data, pedidosMock, range]
  );

  useEffect(() => {
    if ((status === "success" || status === "empty") && data) {
      setContentVersion(rangeKey);
    }
  }, [data, rangeKey, status]);

  function selectPreset(preset: RangePreset) {
    const nextRange = preset.getRange();

    setActiveRange(preset.key);
    setRange(nextRange);
    setCalendarValue({ start: nextRange.from, end: nextRange.to });
  }

  function selectCalendarRange(value: RangeValue | null) {
    setCalendarValue(value);

    if (!value) {
      setActiveRange("custom");
      return;
    }

    if (value?.start && value.end) {
      setActiveRange("custom");
      setRange({ from: value.start, to: value.end });
    }
  }

  return (
    <>
      <DashboardHeader
        title="Dashboard"
        description="Métricas do dia atual e sinais operacionais"
        actions={
          <PeriodActions
            activeRange={activeRange}
            range={range}
            calendarValue={calendarValue}
            maxDate={maxSelectableDate}
            calendarCloseSignal={calendarCloseSignal}
            onSelect={selectPreset}
            onCalendarChange={selectCalendarRange}
          />
        }
      />

      <div className="min-w-0 overflow-x-clip px-3.5 pb-28 pt-4 sm:px-5 sm:pt-5 xl:px-6 xl:pb-10 xl:pt-6">
        {isInitialLoading ? <DashboardSkeleton /> : null}

        {!isInitialLoading && error && !data ? (
          <ErrorState
            message="Não foi possível carregar as métricas. Tente novamente em alguns instantes."
            onRetry={retry}
          />
        ) : null}

        {!isInitialLoading && isEmpty ? (
          <EmptyState
            title="Sem dados para o período"
            description="Altere o período para visualizar as métricas disponíveis."
          />
        ) : null}

        {data && dashboardData && !isEmpty ? (
          <div
            key={contentVersion}
            aria-busy={isRefreshing}
            className={cn(
              "flynow-dashboard-content relative flex flex-col gap-5",
              isRefreshing && "flynow-dashboard-content--refreshing"
            )}
          >
            {error ? <RefreshErrorNotice onRetry={retry} /> : null}

            <div
              className="flynow-dashboard-enter-item"
              style={{ "--flynow-enter-delay": "0ms" } as CSSProperties}
            >
              <SectionGroup title="Visão geral">
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <KpiCard
                    detail={`${formatNumber(dashboardData.pedidosHoje)} pedidos`}
                    label="Vendas hoje"
                    tone="green"
                    value={formatCurrency(dashboardData.salesValue)}
                  />
                  <KpiCard
                    detail="vendas do dia menos reversões"
                    label="Receita líquida"
                    tone="green"
                    value={formatCurrency(dashboardData.receitaLiquida)}
                  />
                  <KpiCard
                    detail={`${formatNumber(dashboardData.reembolsosHojeEventos)} eventos`}
                    label="Reembolsos hoje"
                    tone="red"
                    value={formatCurrency(dashboardData.reembolsosHoje)}
                  />
                  <KpiCard
                    detail="com base nas vendas de hoje"
                    label="Taxa de reembolso"
                    tone="gold"
                    value={formatPercent(dashboardData.taxaReembolso)}
                  />
                </div>
              </SectionGroup>
            </div>

            <div
              className="flynow-dashboard-enter-item"
              style={{ "--flynow-enter-delay": "70ms" } as CSSProperties}
            >
              <SectionGroup title="Operacional">
                <div className="grid gap-3 md:grid-cols-3">
                  <KpiCard
                    detail="pedidos em rota"
                    label="Em trânsito"
                    tone="blue"
                    value={formatNumber(dashboardData.emTransito)}
                  />
                  <KpiCard
                    detail="requerem atenção"
                    label="Alertas ativos"
                    tone="gold"
                    value={formatNumber(dashboardData.alertasAtivos)}
                  />
                  <KpiCard
                    detail={`${formatNumber(dashboardData.checkoutMonitorado)} monitorados`}
                    label="Carrinhos (24h)"
                    tone="gold"
                    value={formatNumber(dashboardData.carrinhos24h)}
                  />
                </div>
              </SectionGroup>
            </div>

            <div
              className="flynow-dashboard-enter-item"
              style={{ "--flynow-enter-delay": "140ms" } as CSSProperties}
            >
              <SectionGroup title="Saúde do funil">
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <KpiCard
                    detail="base dos eventos PayT no período"
                    label="Checkout monitorado"
                    tone="blue"
                    value={formatNumber(dashboardData.checkoutMonitorado)}
                  />
                  <KpiCard
                    detail="abandono e perda no recorte"
                    label="Taxa de perda"
                    tone="red"
                    value={formatPercent(dashboardData.taxaPerda)}
                  />
                  <KpiCard
                    detail="recuperados após evento não pago"
                    label="Taxa de recuperação"
                    tone="green"
                    value={formatPercent(dashboardData.taxaRecuperacao)}
                  />
                  <KpiCard
                    detail="sinais avaliados pela camada analítica"
                    label="Alertas de funil"
                    tone="gold"
                    value={formatNumber(dashboardData.alertasFunil.length)}
                  />
                </div>
              </SectionGroup>
            </div>

            <div
              className="flynow-dashboard-enter-item"
              style={{ "--flynow-enter-delay": "210ms" } as CSSProperties}
            >
              <SectionGroup title="Análise de pedidos">
                <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
                  <div className="grid gap-5">
                    <OrdersFunnelCard rows={dashboardData.funnelRows} />
                    <FunnelAlertsPanel alerts={dashboardData.alertasFunil} />
                  </div>
                  <TrendChart data={dashboardData.trend} />
                </div>
              </SectionGroup>
            </div>

            <div
              className="flynow-dashboard-enter-item"
              style={{ "--flynow-enter-delay": "280ms" } as CSSProperties}
            >
              <ActiveAlertsPanel
                alerts={dashboardData.activeAlerts}
                count={dashboardData.alertasAtivos}
              />
            </div>
          </div>
        ) : null}
      </div>
    </>
  );
}
