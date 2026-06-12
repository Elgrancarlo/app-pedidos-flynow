"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type {
  PerformanceProduct,
  PerformanceSeriesPoint,
} from "@/lib/performance-pages";

type RevenueInvestmentChartProps = {
  revenueLabel?: string;
  series: PerformanceSeriesPoint[];
};

type ProductRevenueChartProps = {
  products: PerformanceProduct[];
};

export type RedtrackSourceChartDatum = {
  attributedRevenue: number;
  clicks: number;
  conversions: number;
  roas: number;
  source: string;
  spend: number;
};

type TooltipPayload = {
  dataKey?: string | number;
  name?: string | number;
  payload?: Record<string, unknown>;
  value?: string | number;
};

type TooltipProps = {
  active?: boolean;
  labels?: Partial<Record<string, string>>;
  label?: string | number;
  payload?: TooltipPayload[];
};

function compactCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    currency: "BRL",
    maximumFractionDigits: 1,
    notation: "compact",
    style: "currency",
  }).format(value);
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    currency: "BRL",
    style: "currency",
  }).format(value);
}

function formatDecimal(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(value);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("pt-BR").format(value);
}

function formatDateLabel(value: string | number) {
  return new Date(`${String(value)}T12:00:00`).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  });
}

function ChartTooltip({ active, label, labels, payload }: TooltipProps) {
  if (!active || !payload?.length) return null;

  return (
    <div className="min-w-[178px] rounded-[8px] border border-[var(--fly-border)] bg-[var(--fly-surface-elevated)] p-2.5 text-xs shadow-[var(--fly-tooltip-shadow)] backdrop-blur-xl">
      {label ? (
        <p className="mb-2 text-[10px] font-semibold uppercase text-[var(--fly-text-muted)]">
          {String(label).includes("-") ? formatDateLabel(label) : label}
        </p>
      ) : null}
      <div className="space-y-1.5">
        {payload.map((item) => {
          const dataKey = String(item.dataKey ?? item.name ?? "");
          const labelText =
            labels?.[dataKey] ??
            (dataKey === "revenue"
              ? "Faturamento"
              : dataKey === "spend"
                ? "Investimento"
                : "Receita");
          const value = Number(item.value ?? 0);

          return (
            <div
              key={`${dataKey}-${labelText}`}
              className="flex items-center justify-between gap-4"
            >
              <span className="text-[var(--fly-text-muted)]">{labelText}</span>
              <span className="font-semibold tabular-nums text-[var(--fly-text)]">
                {formatCurrency(value)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function RedtrackSourceTooltip({ active, payload }: TooltipProps) {
  if (!active || !payload?.length) return null;

  const record = payload[0]?.payload as Partial<RedtrackSourceChartDatum> | undefined;
  const source = String(record?.source ?? payload[0]?.name ?? "");
  const rows = [
    ["Investimento", formatCurrency(Number(record?.spend ?? 0))],
    ["Receita atribuída", formatCurrency(Number(record?.attributedRevenue ?? 0))],
    ["ROAS RT", formatDecimal(Number(record?.roas ?? 0))],
    ["Cliques", formatNumber(Number(record?.clicks ?? 0))],
    ["Conversões", formatNumber(Number(record?.conversions ?? 0))],
  ];

  return (
    <div className="min-w-[210px] rounded-[8px] border border-[var(--fly-border)] bg-[var(--fly-surface-elevated)] p-2.5 text-xs shadow-[var(--fly-tooltip-shadow)] backdrop-blur-xl">
      <p className="mb-2 truncate text-[10px] font-semibold uppercase text-[var(--fly-text-muted)]">
        {source}
      </p>
      <div className="space-y-1.5">
        {rows.map(([rowLabel, value]) => (
          <div key={rowLabel} className="flex items-center justify-between gap-4">
            <span className="text-[var(--fly-text-muted)]">{rowLabel}</span>
            <span className="font-semibold tabular-nums text-[var(--fly-text)]">
              {value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function EmptyChart() {
  return (
    <div className="flex h-[300px] items-center justify-center rounded-[8px] border border-[var(--fly-border-subtle)] bg-[var(--fly-row-bg)] text-sm text-[var(--fly-text-muted)] sm:h-[340px]">
      Sem dados para o recorte selecionado.
    </div>
  );
}

export function RevenueInvestmentChart({
  revenueLabel = "Faturamento",
  series,
}: RevenueInvestmentChartProps) {
  const ticks =
    series.length <= 5
      ? series.map((item) => item.day)
      : [
          series[0]?.day,
          series[Math.floor(series.length / 2)]?.day,
          series.at(-1)?.day,
        ].filter((item): item is string => Boolean(item));

  return (
    <div className="h-[320px] min-w-0 sm:h-[360px]">
      <ResponsiveContainer height="100%" width="100%">
        <LineChart
          data={series}
          margin={{ bottom: 4, left: 4, right: 14, top: 8 }}
        >
          <CartesianGrid
            stroke="var(--fly-chart-grid)"
            strokeDasharray="3 3"
            vertical={false}
          />
          <XAxis
            axisLine={false}
            dataKey="day"
            interval="preserveStartEnd"
            tick={{ fill: "var(--fly-chart-axis)", fontSize: 11 }}
            tickFormatter={formatDateLabel}
            tickLine={false}
            ticks={ticks}
          />
          <YAxis
            axisLine={false}
            tick={{ fill: "var(--fly-chart-axis)", fontSize: 11 }}
            tickFormatter={(value) => compactCurrency(Number(value))}
            tickLine={false}
            width={72}
          />
          <Tooltip
            content={
              <ChartTooltip
                labels={{ revenue: revenueLabel, spend: "Investimento" }}
              />
            }
            cursor={false}
          />
          <Line
            activeDot={{ r: 4, stroke: "var(--fly-active-dot-stroke)", strokeWidth: 2 }}
            dataKey="revenue"
            dot={false}
            name="Faturamento"
            stroke="var(--fly-chart-revenue)"
            strokeLinecap="round"
            strokeWidth={2}
            type="monotone"
          />
          <Line
            activeDot={{ r: 4, stroke: "var(--fly-active-dot-stroke)", strokeWidth: 2 }}
            dataKey="spend"
            dot={false}
            name="Investimento"
            stroke="var(--fly-chart-investment)"
            strokeLinecap="round"
            strokeWidth={2}
            type="monotone"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function RedtrackSourcesChart({
  sources,
}: {
  sources: RedtrackSourceChartDatum[];
}) {
  const chartData = [...sources]
    .sort((first, second) => second.spend - first.spend)
    .slice(0, 8);

  if (!chartData.length) return <EmptyChart />;

  return (
    <div className="h-[300px] min-w-0 sm:h-[340px]">
      <ResponsiveContainer height="100%" width="100%">
        <BarChart
          data={chartData}
          margin={{ bottom: 18, left: 0, right: 10, top: 8 }}
        >
          <CartesianGrid
            stroke="var(--fly-chart-grid)"
            strokeDasharray="3 3"
            vertical={false}
          />
          <XAxis
            axisLine={false}
            dataKey="source"
            height={52}
            interval={0}
            tick={{ fill: "var(--fly-chart-axis)", fontSize: 10 }}
            tickFormatter={(value) =>
              String(value).length > 13
                ? `${String(value).slice(0, 12)}...`
                : String(value)
            }
            tickLine={false}
          />
          <YAxis
            axisLine={false}
            tick={{ fill: "var(--fly-chart-axis)", fontSize: 11 }}
            tickFormatter={(value) => compactCurrency(Number(value))}
            tickLine={false}
            width={68}
          />
          <Tooltip
            content={<RedtrackSourceTooltip />}
            cursor={{ fill: "var(--fly-row-bg-strong)" }}
          />
          <Bar
            dataKey="spend"
            fill="var(--fly-chart-investment)"
            maxBarSize={72}
            name="Investimento"
            radius={[6, 6, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ProductRevenueChart({ products }: ProductRevenueChartProps) {
  const chartData = [...products]
    .sort((first, second) => second.revenue - first.revenue)
    .slice(0, 6)
    .map((item) => ({
      product: item.product,
      revenue: item.revenue,
    }));

  return (
    <div className="h-[320px] min-w-0 sm:h-[360px]">
      <ResponsiveContainer height="100%" width="100%">
        <BarChart
          data={chartData}
          margin={{ bottom: 24, left: 0, right: 10, top: 8 }}
        >
          <CartesianGrid
            stroke="var(--fly-chart-grid)"
            strokeDasharray="3 3"
            vertical={false}
          />
          <XAxis
            axisLine={false}
            dataKey="product"
            height={46}
            interval={0}
            tick={{ fill: "var(--fly-chart-axis)", fontSize: 10 }}
            tickFormatter={(value) =>
              String(value).length > 12
                ? `${String(value).slice(0, 12)}...`
                : String(value)
            }
            tickLine={false}
          />
          <YAxis
            axisLine={false}
            tick={{ fill: "var(--fly-chart-axis)", fontSize: 11 }}
            tickFormatter={(value) => compactCurrency(Number(value))}
            tickLine={false}
            width={68}
          />
          <Tooltip
            content={<ChartTooltip />}
            cursor={{ fill: "var(--fly-row-bg-strong)" }}
          />
          <Bar
            dataKey="revenue"
            fill="var(--fly-chart-revenue)"
            maxBarSize={58}
            name="Receita"
            radius={[6, 6, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
