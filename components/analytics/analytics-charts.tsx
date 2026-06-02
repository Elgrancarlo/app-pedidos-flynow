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
  series: PerformanceSeriesPoint[];
};

type ProductRevenueChartProps = {
  products: PerformanceProduct[];
};

type TooltipPayload = {
  dataKey?: string | number;
  name?: string | number;
  value?: string | number;
};

type TooltipProps = {
  active?: boolean;
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

function formatDateLabel(value: string | number) {
  return new Date(`${String(value)}T12:00:00`).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  });
}

function ChartTooltip({ active, label, payload }: TooltipProps) {
  if (!active || !payload?.length) return null;

  return (
    <div className="min-w-[178px] rounded-[8px] border border-[var(--fly-border)] bg-[var(--fly-surface-elevated)] p-2.5 text-xs shadow-[0_18px_44px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur-xl">
      {label ? (
        <p className="mb-2 text-[10px] font-semibold uppercase text-[var(--fly-text-muted)]">
          {String(label).includes("-") ? formatDateLabel(label) : label}
        </p>
      ) : null}
      <div className="space-y-1.5">
        {payload.map((item) => {
          const dataKey = String(item.dataKey ?? item.name ?? "");
          const labelText =
            dataKey === "revenue"
              ? "Faturamento"
              : dataKey === "spend"
                ? "Investimento"
                : "Receita";
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

export function RevenueInvestmentChart({
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
            stroke="rgba(255,255,255,0.06)"
            strokeDasharray="3 3"
            vertical={false}
          />
          <XAxis
            axisLine={false}
            dataKey="day"
            interval="preserveStartEnd"
            tick={{ fill: "rgba(245,242,234,0.48)", fontSize: 11 }}
            tickFormatter={formatDateLabel}
            tickLine={false}
            ticks={ticks}
          />
          <YAxis
            axisLine={false}
            tick={{ fill: "rgba(245,242,234,0.48)", fontSize: 11 }}
            tickFormatter={(value) => compactCurrency(Number(value))}
            tickLine={false}
            width={72}
          />
          <Tooltip content={<ChartTooltip />} cursor={false} />
          <Line
            activeDot={{ r: 4, stroke: "#0B0D10", strokeWidth: 2 }}
            dataKey="revenue"
            dot={false}
            name="Faturamento"
            stroke="#D6A84F"
            strokeLinecap="round"
            strokeWidth={2}
            type="monotone"
          />
          <Line
            activeDot={{ r: 4, stroke: "#0B0D10", strokeWidth: 2 }}
            dataKey="spend"
            dot={false}
            name="Investimento"
            stroke="#60A5FA"
            strokeLinecap="round"
            strokeWidth={2}
            type="monotone"
          />
        </LineChart>
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
            stroke="rgba(255,255,255,0.06)"
            strokeDasharray="3 3"
            vertical={false}
          />
          <XAxis
            axisLine={false}
            dataKey="product"
            height={46}
            interval={0}
            tick={{ fill: "rgba(245,242,234,0.48)", fontSize: 10 }}
            tickFormatter={(value) =>
              String(value).length > 12
                ? `${String(value).slice(0, 12)}...`
                : String(value)
            }
            tickLine={false}
          />
          <YAxis
            axisLine={false}
            tick={{ fill: "rgba(245,242,234,0.48)", fontSize: 11 }}
            tickFormatter={(value) => compactCurrency(Number(value))}
            tickLine={false}
            width={68}
          />
          <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(255,255,255,0.025)" }} />
          <Bar
            dataKey="revenue"
            fill="#D6A84F"
            maxBarSize={58}
            name="Receita"
            radius={[6, 6, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
