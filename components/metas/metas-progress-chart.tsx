"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { MetasProgressPoint } from "@/lib/metas";
import { formatCurrency } from "@/lib/utils";

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

function formatDateLabel(value: string | number) {
  return new Date(`${String(value)}T12:00:00`).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  });
}

function getLineLabel(dataKey: string) {
  if (dataKey === "target") return "Meta acumulada";
  if (dataKey === "projection") return "Projeção";
  return "Realizado";
}

function ChartTooltip({ active, label, payload }: TooltipProps) {
  if (!active || !payload?.length) return null;

  return (
    <div className="min-w-[190px] rounded-[8px] border border-[var(--fly-border)] bg-[var(--fly-surface-elevated)] p-2.5 text-xs shadow-[var(--fly-tooltip-shadow)] backdrop-blur-xl">
      {label ? (
        <p className="mb-2 text-[10px] font-semibold uppercase text-[var(--fly-text-muted)]">
          {formatDateLabel(label)}
        </p>
      ) : null}
      <div className="space-y-1.5">
        {payload.map((item) => {
          const dataKey = String(item.dataKey ?? item.name ?? "");
          const value = Number(item.value ?? 0);

          return (
            <div
              key={dataKey}
              className="flex items-center justify-between gap-4"
            >
              <span className="text-[var(--fly-text-muted)]">
                {getLineLabel(dataKey)}
              </span>
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

export function MetasProgressChart({
  series,
}: {
  series: MetasProgressPoint[];
}) {
  const ticks =
    series.length <= 5
      ? series.map((item) => item.day)
      : [
          series[0]?.day,
          series[Math.floor(series.length / 2)]?.day,
          series[series.length - 1]?.day,
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
          <Tooltip content={<ChartTooltip />} cursor={false} />
          <Legend
            iconType="circle"
            wrapperStyle={{
              color: "var(--fly-text-muted)",
              fontSize: 12,
              paddingTop: 10,
            }}
          />
          <Line
            activeDot={{
              r: 4,
              stroke: "var(--fly-active-dot-stroke)",
              strokeWidth: 2,
            }}
            animationDuration={700}
            dataKey="target"
            dot={false}
            name="Meta acumulada"
            stroke="var(--fly-chart-revenue)"
            strokeLinecap="round"
            strokeWidth={2}
            type="monotone"
          />
          <Line
            activeDot={{
              r: 4,
              stroke: "var(--fly-active-dot-stroke)",
              strokeWidth: 2,
            }}
            animationDuration={760}
            dataKey="realized"
            dot={false}
            name="Realizado"
            stroke="var(--fly-success)"
            strokeLinecap="round"
            strokeWidth={2}
            type="monotone"
          />
          <Line
            activeDot={false}
            animationDuration={820}
            dataKey="projection"
            dot={false}
            name="Projeção"
            stroke="var(--fly-chart-investment)"
            strokeDasharray="4 4"
            strokeLinecap="round"
            strokeWidth={1.5}
            type="monotone"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
