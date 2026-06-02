"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type FunilChartPoint = {
  aov: number;
  day: string;
  directSales: number;
  revenueTotal: number;
  takeRateUs1: number;
  takeRateUs2: number;
  upsellRevenue: number;
};

type FunilChartsProps = {
  series: FunilChartPoint[];
};

type TooltipPayload = {
  color?: string;
  dataKey?: string | number;
  name?: string | number;
  value?: string | number;
};

type TooltipProps = {
  active?: boolean;
  label?: string | number;
  payload?: TooltipPayload[];
};

const chartLines: Record<
  string,
  {
    label: string;
    type: "currency" | "percent" | "number";
  }
> = {
  revenueTotal: {
    label: "Receita total",
    type: "currency",
  },
  upsellRevenue: {
    label: "Receita upsells",
    type: "currency",
  },
  takeRateUs1: {
    label: "Take rate US1",
    type: "percent",
  },
  takeRateUs2: {
    label: "Take rate US2",
    type: "percent",
  },
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

function formatDateLabel(value: string | number) {
  return new Date(`${String(value)}T12:00:00`).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  });
}

function formatTooltipValue(value: number, type: "currency" | "percent" | "number") {
  if (type === "currency") return formatCurrency(value);
  if (type === "percent") return formatPercent(value);

  return formatNumber(value);
}

function ChartTooltip({ active, label, payload }: TooltipProps) {
  if (!active || !payload?.length) return null;

  return (
    <div className="min-w-[190px] rounded-[8px] border border-[var(--fly-border)] bg-[var(--fly-surface-elevated)] p-2.5 text-xs shadow-[var(--fly-tooltip-shadow)] backdrop-blur-xl">
      {label ? (
        <p className="mb-2 text-[10px] font-semibold uppercase text-[var(--fly-text-muted)]">
          {String(label).includes("-") ? formatDateLabel(label) : label}
        </p>
      ) : null}
      <div className="space-y-1.5">
        {payload.map((item) => {
          const dataKey = String(item.dataKey ?? item.name ?? "");
          const line = chartLines[dataKey] ?? {
            label: String(item.name ?? dataKey),
            type: "number" as const,
          };
          const value = Number(item.value ?? 0);

          return (
            <div
              key={`${dataKey}-${line.label}`}
              className="flex items-center justify-between gap-4"
            >
              <span className="flex min-w-0 items-center gap-2 text-[var(--fly-text-muted)]">
                <span
                  aria-hidden="true"
                  className="size-1.5 shrink-0 rounded-full"
                  style={{ backgroundColor: item.color ?? "currentColor" }}
                />
                <span className="truncate">{line.label}</span>
              </span>
              <span className="shrink-0 font-semibold tabular-nums text-[var(--fly-text)]">
                {formatTooltipValue(value, line.type)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function chartTicks(series: FunilChartPoint[]) {
  if (series.length <= 5) return series.map((item) => item.day);

  return [
    series[0]?.day,
    series[Math.floor(series.length / 2)]?.day,
    series.at(-1)?.day,
  ].filter((item): item is string => Boolean(item));
}

function EmptyChart() {
  return (
    <div className="flex h-[300px] items-center justify-center rounded-[8px] border border-[var(--fly-border-subtle)] bg-[var(--fly-row-bg)] text-sm text-[var(--fly-text-muted)] sm:h-[340px]">
      Sem dados para o recorte selecionado.
    </div>
  );
}

export function FunnelRevenueChart({ series }: FunilChartsProps) {
  if (!series.length) return <EmptyChart />;

  return (
    <div className="h-[300px] min-w-0 sm:h-[340px]">
      <ResponsiveContainer height="100%" width="100%">
        <AreaChart
          data={series}
          margin={{ bottom: 4, left: 4, right: 14, top: 8 }}
        >
          <defs>
            <linearGradient id="funilRevenueFill" x1="0" x2="0" y1="0" y2="1">
              <stop
                offset="0%"
                stopColor="var(--fly-chart-revenue)"
                stopOpacity={0.24}
              />
              <stop
                offset="100%"
                stopColor="var(--fly-chart-revenue)"
                stopOpacity={0}
              />
            </linearGradient>
            <linearGradient id="funilUpsellFill" x1="0" x2="0" y1="0" y2="1">
              <stop
                offset="0%"
                stopColor="var(--fly-success)"
                stopOpacity={0.18}
              />
              <stop
                offset="100%"
                stopColor="var(--fly-success)"
                stopOpacity={0}
              />
            </linearGradient>
          </defs>
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
            ticks={chartTicks(series)}
          />
          <YAxis
            axisLine={false}
            tick={{ fill: "var(--fly-chart-axis)", fontSize: 11 }}
            tickFormatter={(value) => compactCurrency(Number(value))}
            tickLine={false}
            width={72}
          />
          <Tooltip content={<ChartTooltip />} cursor={false} />
          <Area
            activeDot={{ r: 4, stroke: "var(--fly-active-dot-stroke)", strokeWidth: 2 }}
            animationDuration={760}
            animationEasing="ease-out"
            dataKey="revenueTotal"
            dot={false}
            fill="url(#funilRevenueFill)"
            isAnimationActive
            name="Receita total"
            stroke="var(--fly-chart-revenue)"
            strokeLinecap="round"
            strokeWidth={2}
            type="monotone"
          />
          <Area
            activeDot={{ r: 4, stroke: "var(--fly-active-dot-stroke)", strokeWidth: 2 }}
            animationDuration={820}
            animationEasing="ease-out"
            dataKey="upsellRevenue"
            dot={false}
            fill="url(#funilUpsellFill)"
            isAnimationActive
            name="Receita upsells"
            stroke="var(--fly-success)"
            strokeLinecap="round"
            strokeWidth={2}
            type="monotone"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function FunnelTakeRateChart({ series }: FunilChartsProps) {
  if (!series.length) return <EmptyChart />;

  return (
    <div className="h-[300px] min-w-0 sm:h-[340px]">
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
            ticks={chartTicks(series)}
          />
          <YAxis
            axisLine={false}
            domain={[0, "dataMax + 0.05"]}
            tick={{ fill: "var(--fly-chart-axis)", fontSize: 11 }}
            tickFormatter={(value) => formatPercent(Number(value))}
            tickLine={false}
            width={72}
          />
          <Tooltip content={<ChartTooltip />} cursor={false} />
          <Line
            activeDot={{ r: 4, stroke: "var(--fly-active-dot-stroke)", strokeWidth: 2 }}
            animationDuration={760}
            animationEasing="ease-out"
            dataKey="takeRateUs1"
            dot={false}
            isAnimationActive
            name="Take rate US1"
            stroke="var(--fly-chart-investment)"
            strokeLinecap="round"
            strokeWidth={2}
            type="monotone"
          />
          <Line
            activeDot={{ r: 4, stroke: "var(--fly-active-dot-stroke)", strokeWidth: 2 }}
            animationDuration={820}
            animationEasing="ease-out"
            dataKey="takeRateUs2"
            dot={false}
            isAnimationActive
            name="Take rate US2"
            stroke="var(--fly-violet)"
            strokeLinecap="round"
            strokeWidth={2}
            type="monotone"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
