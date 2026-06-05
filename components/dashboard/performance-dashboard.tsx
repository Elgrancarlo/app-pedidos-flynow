"use client";

import type { CSSProperties } from "react";
import { useEffect, useMemo, useState } from "react";
import { Inbox } from "lucide-react";
import {
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { DashboardHeader } from "@/components/layout/dashboard-header";
import type {
  DashboardAlert,
  DashboardFunnelAlert,
  DashboardFunnelRow,
  DashboardKpi,
  DashboardPageData,
  DashboardTone,
  DashboardTrendPoint,
} from "@/lib/dashboard-data";
import { cn, formatCurrency } from "@/lib/utils";

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

type PerformanceDashboardProps = {
  data: DashboardPageData;
};

const toneDotClass: Record<DashboardTone, string> = {
  blue: "bg-[var(--fly-chart-investment)]",
  gold: "bg-[var(--fly-chart-revenue)]",
  green: "bg-[var(--fly-success)]",
  neutral: "bg-[var(--fly-text-muted)]",
  red: "bg-[var(--fly-danger-strong)]",
};

const toneChartColor: Record<DashboardTone, string> = {
  blue: "var(--fly-chart-investment)",
  gold: "var(--fly-chart-revenue)",
  green: "var(--fly-success)",
  neutral: "var(--fly-text-soft)",
  red: "var(--fly-danger-strong)",
};

const featuredFinancialKpiLabels = ["Vendas hoje", "Receita líquida"];

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

function normalizeFunnelLabel(label: string) {
  return label
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function isAwaitingShipmentLabel(label: string) {
  const normalized = normalizeFunnelLabel(label);
  return normalized.includes("aguard") && normalized.includes("postag");
}

function isPostedLabel(label: string) {
  return normalizeFunnelLabel(label) === "postado";
}

function formatDateLabel(value: string) {
  return new Date(`${value}T12:00:00`).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  });
}

function getCompactChartTicks(data: DashboardTrendPoint[]) {
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

function EmptyState({
  compact = false,
  description,
  title,
}: {
  compact?: boolean;
  description: string;
  title: string;
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

function SectionHeader({
  description,
  period,
  title,
}: {
  description?: string;
  period?: string;
  title: string;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
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
      {period ? (
        <span className="ml-3 inline-flex w-fit shrink-0 items-center text-[11px] font-medium text-[var(--fly-text-dim)]">
          {period}
        </span>
      ) : null}
    </div>
  );
}

function SectionGroup({
  children,
  description,
  period,
  title,
}: {
  children: React.ReactNode;
  description?: string;
  period?: string;
  title: string;
}) {
  return (
    <section className="space-y-3">
      <SectionHeader description={description} period={period} title={title} />
      {children}
    </section>
  );
}

function KpiCard({ detail, label, period, tone, value }: DashboardKpi) {
  return (
    <section className="flynow-dashboard-enter-item min-w-0 rounded-[8px] border border-[var(--fly-border)] bg-[var(--fly-surface)] p-3 shadow-[var(--fly-panel-shadow)] sm:p-4">
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span
            aria-hidden="true"
            className={cn("size-1.5 shrink-0 rounded-full", toneDotClass[tone])}
          />
          <p className="truncate text-[11px] font-medium uppercase text-[var(--fly-text-muted)]">
            {label}
          </p>
        </div>
        <span className="shrink-0 text-[10px] font-semibold uppercase text-[var(--fly-text-dim)]">
          {period}
        </span>
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

function FeaturedKpiGrid({ cards }: { cards: DashboardKpi[] }) {
  return (
    <section className="relative min-w-0 overflow-hidden rounded-[8px] border border-[var(--fly-border)] bg-[var(--fly-surface)] shadow-[var(--fly-panel-shadow)]">
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--fly-chart-revenue)] to-transparent opacity-75"
      />
      <div className="grid md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card, index) => (
          <article
            key={`${card.label}-${card.period}`}
            className={cn(
              "min-w-0 border-[var(--fly-divider-subtle)] p-3 sm:p-4 xl:p-5",
              index > 0 && "border-t md:border-t-0",
              index % 2 === 1 && "md:border-l",
              index >= 2 && "md:border-t xl:border-t-0",
              index > 0 && "xl:border-l"
            )}
          >
            <div className="flex min-w-0 items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <span
                  aria-hidden="true"
                  className={cn(
                    "size-1.5 shrink-0 rounded-full",
                    toneDotClass[
                      featuredFinancialKpiLabels.includes(card.label)
                        ? "gold"
                        : card.tone
                    ]
                  )}
                />
                <p className="truncate text-[11px] font-semibold uppercase text-[var(--fly-text-muted)]">
                  {card.label}
                </p>
              </div>
              <span className="shrink-0 text-[10px] font-semibold uppercase text-[var(--fly-text-dim)]">
                {card.period}
              </span>
            </div>
            <p className="mt-4 text-[27px] font-semibold leading-none tabular-nums text-[var(--fly-text)] sm:text-[30px] 2xl:text-[34px]">
              {card.value}
            </p>
            <p className="mt-3 max-w-[260px] text-xs leading-5 text-[var(--fly-text-muted)]">
              {card.detail}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}

function KpiGrid({
  cards,
  columns = "xl:grid-cols-4",
  featured = false,
}: {
  cards: DashboardKpi[];
  columns?: string;
  featured?: boolean;
}) {
  if (featured) {
    return <FeaturedKpiGrid cards={cards} />;
  }

  return (
    <div className={cn("grid gap-3 md:grid-cols-2", columns)}>
      {cards.map((card) => (
        <KpiCard key={`${card.label}-${card.period}`} {...card} />
      ))}
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
            <div key={key} className="flex items-center justify-between gap-4">
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

type FunnelChartTooltipPayload = {
  payload?: DashboardFunnelRow;
};

function FunnelChartTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: FunnelChartTooltipPayload[];
}) {
  const row = payload?.[0]?.payload;

  if (!active || !row) {
    return null;
  }

  return (
    <div className="flynow-chart-tooltip min-w-[178px] rounded-[8px] border border-[var(--fly-border)] bg-[var(--fly-surface-elevated)] p-2.5 text-xs shadow-[var(--fly-tooltip-shadow)] backdrop-blur-xl">
      <p className="text-[11px] font-semibold text-[var(--fly-text)]">
        {row.label}
      </p>
      <div className="mt-2 space-y-1.5">
        <div className="flex items-center justify-between gap-4">
          <span className="text-[var(--fly-text-muted)]">Pedidos</span>
          <span className="font-semibold tabular-nums text-[var(--fly-text)]">
            {formatNumber(row.count)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-[var(--fly-text-muted)]">Valor</span>
          <span className="font-semibold tabular-nums text-[var(--fly-text)]">
            {compactCurrency(row.amount)}
          </span>
        </div>
      </div>
    </div>
  );
}

function TrendChart({ data }: { data: DashboardTrendPoint[] }) {
  const isCompact = useCompactViewport();
  const hasChartData = data.some((item) => item.receita > 0 || item.reembolsos > 0);
  const compactChartTicks = useMemo(() => getCompactChartTicks(data), [data]);

  return (
    <section className="min-w-0 rounded-[8px] border border-[var(--fly-border)] bg-[var(--fly-surface)] p-3 shadow-[var(--fly-panel-shadow)] sm:p-5">
      <div className="mb-4">
        <SectionHeader
          title="Tendência"
          description="Receita e reembolsos"
          period="Últimos 30 dias"
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
                  stroke="var(--fly-chart-revenue)"
                  strokeWidth={isCompact ? 2.4 : 2.25}
                  dot={false}
                  activeDot={{
                    r: isCompact ? 3.75 : 4,
                    fill: "var(--fly-chart-revenue)",
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
          title="Sem tendência recente"
          description="A curva será exibida quando houver dados suficientes."
        />
      )}
    </section>
  );
}

function OrdersFunnelCard({ rows }: { rows: DashboardFunnelRow[] }) {
  const total = rows.reduce((sum, row) => sum + row.count, 0);
  const awaitingShipment =
    rows.find((row) => isAwaitingShipmentLabel(row.label)) ??
    ({
      amount: 0,
      count: 0,
      label: "Aguard. Postagem",
      tone: "gold" as const,
    } satisfies DashboardFunnelRow);
  const posted =
    rows.find((row) => isPostedLabel(row.label)) ??
    ({
      amount: 0,
      count: 0,
      label: "Postado",
      tone: "blue" as const,
    } satisfies DashboardFunnelRow);
  const priorityRows = [awaitingShipment, posted];
  const secondaryRows = rows.filter(
    (row) => !isAwaitingShipmentLabel(row.label) && !isPostedLabel(row.label)
  );
  const chartRows = [
    ...priorityRows.filter((row) => row.count > 0),
    ...secondaryRows,
  ];

  return (
    <section className="flex h-full min-w-0 flex-col rounded-[8px] border border-[var(--fly-border)] bg-[var(--fly-surface)] p-3 shadow-[var(--fly-panel-shadow)] sm:p-5">
      <div className="mb-4">
        <SectionHeader
          title="Funil de pedidos"
          description="Distribuição do dia por status logístico"
          period="Hoje"
        />
      </div>

      {rows.length > 0 ? (
        <div className="flex flex-1 flex-col">
          <div
            role="img"
            aria-label="Gráfico meia lua do funil de pedidos por status"
            className="flynow-chart-stage relative min-h-[214px] flex-1"
          >
            <ResponsiveContainer
              width="100%"
              height="100%"
              minWidth={1}
              minHeight={210}
              initialDimension={{ width: 420, height: 240 }}
            >
              <PieChart margin={{ top: 6, right: 8, bottom: 0, left: 8 }}>
                <Tooltip
                  content={<FunnelChartTooltip />}
                  cursor={{ fill: "var(--fly-row-bg-strong)" }}
                  wrapperStyle={{
                    outline: "none",
                    pointerEvents: "none",
                    zIndex: 20,
                  }}
                />
                <Pie
                  data={chartRows}
                  dataKey="count"
                  nameKey="label"
                  cx="50%"
                  cy="78%"
                  startAngle={180}
                  endAngle={0}
                  innerRadius={76}
                  outerRadius={114}
                  paddingAngle={2}
                  cornerRadius={6}
                  stroke="var(--fly-surface)"
                  strokeWidth={2}
                  animationBegin={160}
                  animationDuration={760}
                  animationEasing="ease-out"
                >
                  {chartRows.map((row) => (
                    <Cell key={row.label} fill={toneChartColor[row.tone]} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-x-0 bottom-7 text-center">
              <p className="text-[10px] font-semibold uppercase text-[var(--fly-text-dim)]">
                Total
              </p>
              <p className="mt-1 text-[14px] font-semibold leading-none tabular-nums text-[var(--fly-text-soft)]">
                {formatNumber(total)}
              </p>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 divide-x divide-[var(--fly-divider-subtle)] border-y border-[var(--fly-divider-subtle)]">
            {priorityRows.map((row) => (
              <div
                key={row.label}
                className="min-w-0 px-3 py-3 first:pl-0 last:pr-0"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <span
                    aria-hidden="true"
                    className="size-1.5 shrink-0 rounded-full"
                    style={{ backgroundColor: toneChartColor[row.tone] }}
                  />
                  <span className="truncate text-[11px] font-medium uppercase text-[var(--fly-text-muted)]">
                    {row.label}
                  </span>
                </div>
                <p className="mt-2 text-[22px] font-semibold leading-none tabular-nums text-[var(--fly-text)]">
                  {formatNumber(row.count)}
                </p>
                <p className="mt-1 text-xs tabular-nums text-[var(--fly-text-muted)]">
                  {compactCurrency(row.amount)}
                </p>
              </div>
            ))}
          </div>
          {secondaryRows.length > 0 ? (
            <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2">
              {secondaryRows.map((row) => (
                <div
                  key={row.label}
                  className="flex min-w-0 items-center justify-between gap-3"
                >
                  <span className="inline-flex min-w-0 items-center gap-2">
                    <span
                      aria-hidden="true"
                      className="size-1.5 shrink-0 rounded-full"
                      style={{ backgroundColor: toneChartColor[row.tone] }}
                    />
                    <span className="truncate text-xs text-[var(--fly-text-muted)]">
                      {row.label}
                    </span>
                  </span>
                  <span className="shrink-0 text-xs font-semibold tabular-nums text-[var(--fly-text-soft)]">
                    {formatNumber(row.count)}
                  </span>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ) : (
        <EmptyState
          compact
          title="Sem funil hoje"
          description="Os status aparecerão quando houver pedidos pagos no dia."
        />
      )}
    </section>
  );
}

function ActiveAlertsPanel({
  alerts,
  count,
}: {
  alerts: DashboardAlert[];
  count: number;
}) {
  return (
    <section className="rounded-[8px] border border-[var(--fly-border)] bg-[var(--fly-surface)] p-3 shadow-[var(--fly-panel-shadow)] sm:p-5">
      <div className="mb-4 flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-2">
          <span
            aria-hidden="true"
            className="size-1.5 shrink-0 rounded-full bg-[var(--fly-warning-strong)]"
          />
          <h2 className="text-[15px] font-semibold text-[var(--fly-text)]">
            Alertas ativos
          </h2>
          <span aria-hidden="true" className="text-xs text-[var(--fly-text-dim)]">
            ·
          </span>
          <span className="text-xs font-semibold tabular-nums text-[var(--fly-warning-strong)]">
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
              className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)_auto_auto] items-center gap-3 rounded-[8px] border border-transparent bg-transparent px-3 py-2.5 max-md:grid-cols-[auto_minmax(0,1fr)_auto]"
            >
              <span className="text-xs font-medium tabular-nums text-[var(--fly-text-dim)]">
                {alert.orderNumber ? `#${alert.orderNumber}` : "-"}
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
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold tabular-nums text-[var(--fly-warning-strong)]">
                <span
                  aria-hidden="true"
                  className="size-1.5 rounded-full bg-[var(--fly-warning-strong)]"
                />
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
          description="Nenhum pedido atrasado foi encontrado agora."
        />
      )}
    </section>
  );
}

function FunnelAlertsPanel({ alerts }: { alerts: DashboardFunnelAlert[] }) {
  return (
    <section className="rounded-[8px] border border-[var(--fly-border)] bg-[var(--fly-surface)] p-3 shadow-[var(--fly-panel-shadow)] sm:p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-[15px] font-semibold text-[var(--fly-text)]">
            Alertas do funil
          </h2>
          <p className="mt-1 text-xs text-[var(--fly-text-muted)]">
            Leitura dos últimos 7 dias
          </p>
        </div>
        <span className="text-xs text-[var(--fly-text-muted)]">
          {formatNumber(alerts.length)} sinais
        </span>
      </div>
      <div className="divide-y divide-[var(--fly-divider-subtle)]">
        {alerts.map((alert) => (
          <article
            key={`${alert.title}-${alert.detail}`}
            className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-3 py-3 first:pt-0 last:pb-0"
          >
            <span
              aria-hidden="true"
              className="mt-1.5 size-1.5 rounded-full bg-[var(--fly-danger-strong)]"
            />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[var(--fly-text)]">
                {alert.title}
              </p>
              <p className="mt-1 text-sm leading-5 text-[var(--fly-text-soft)]">
                {alert.detail}
              </p>
            </div>
            <span className="shrink-0 text-[10px] font-semibold uppercase text-[var(--fly-text-dim)]">
              {alert.source}
            </span>
          </article>
        ))}
      </div>
    </section>
  );
}

function UpdatedBadge({ value }: { value: string }) {
  return (
    <div className="hidden items-center gap-2 text-xs text-[var(--fly-text-dim)] lg:inline-flex">
      <span
        aria-hidden="true"
        className="size-1.5 rounded-full bg-[var(--fly-text-dim)] opacity-70"
      />
      <span>
        Atualizado{" "}
        <span className="font-medium text-[var(--fly-text-soft)]">{value}</span>
      </span>
    </div>
  );
}

export function PerformanceDashboard({ data }: PerformanceDashboardProps) {
  return (
    <>
      <DashboardHeader
        title="Dashboard"
        description="Métricas do dia atual, sinais operacionais e tendência recente"
        actions={<UpdatedBadge value={data.generatedAtLabel} />}
      />

      <div className="min-w-0 overflow-x-clip px-3.5 pb-28 pt-4 sm:px-5 sm:pt-5 xl:px-6 xl:pb-10 xl:pt-6">
        <div className="flynow-dashboard-content relative flex flex-col gap-5">
          <div
            className="flynow-dashboard-enter-item"
            style={{ "--flynow-enter-delay": "0ms" } as CSSProperties}
          >
            <SectionGroup
              title="Visão geral"
              description="Venda e reversão financeira do dia atual"
              period="Hoje"
            >
              <KpiGrid cards={data.overviewCards} featured />
            </SectionGroup>
          </div>

          <div
            className="flynow-dashboard-enter-item"
            style={{ "--flynow-enter-delay": "70ms" } as CSSProperties}
          >
            <SectionGroup
              title="Operação"
              description="Sinais que precisam representar o estado atual da operação"
              period="Agora + 24h"
            >
              <KpiGrid cards={data.operationCards} columns="xl:grid-cols-3" />
            </SectionGroup>
          </div>

          <div
            className="flynow-dashboard-enter-item"
            style={{ "--flynow-enter-delay": "140ms" } as CSSProperties}
          >
            <SectionGroup
              title="Saúde do checkout"
              description="Eventos de checkout e recuperação em janela curta"
              period="24h + 7 dias"
            >
              <KpiGrid cards={data.checkoutCards} />
            </SectionGroup>
          </div>

          <div
            className="flynow-dashboard-enter-item"
            style={{ "--flynow-enter-delay": "210ms" } as CSSProperties}
          >
            <SectionGroup
              title="Análise recente"
              description="Funil do dia e curva consolidada dos últimos 30 dias"
            >
              <div className="grid gap-5 xl:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)]">
                <OrdersFunnelCard rows={data.funnelRows} />
                <TrendChart data={data.trend} />
              </div>
            </SectionGroup>
          </div>

          <div
            className="flynow-dashboard-enter-item"
            style={{ "--flynow-enter-delay": "280ms" } as CSSProperties}
          >
            <ActiveAlertsPanel
              alerts={data.activeAlerts}
              count={data.activeAlerts.length}
            />
          </div>

          <div
            className="flynow-dashboard-enter-item"
            style={{ "--flynow-enter-delay": "350ms" } as CSSProperties}
          >
            <FunnelAlertsPanel alerts={data.alertasFunil} />
          </div>
        </div>
      </div>
    </>
  );
}
