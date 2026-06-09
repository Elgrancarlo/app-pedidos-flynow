"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
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
  payload?: MetasProgressPoint;
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

function getSeriesLabel(dataKey: string) {
  if (dataKey === "target") return "Meta da semana";
  return "Receita realizada";
}

function getPayloadValue(payload: TooltipPayload[], dataKey: string) {
  const item = payload.find((entry) => String(entry.dataKey) === dataKey);
  const value = Number(item?.value ?? 0);

  return Number.isFinite(value) ? value : 0;
}

function CfoWeeklyTooltip({ active, label, payload }: TooltipProps) {
  if (!active || !payload?.length) return null;

  const realized = getPayloadValue(payload, "realized");
  const target = getPayloadValue(payload, "target");
  const investment = payload[0]?.payload?.investment ?? 0;
  const gap = realized - target;
  const roas = investment > 0 ? realized / investment : 0;

  return (
    <div className="min-w-[220px] rounded-[8px] border border-[var(--fly-border)] bg-[var(--fly-surface-elevated)] p-2.5 text-xs shadow-[var(--fly-tooltip-shadow)] backdrop-blur-xl">
      {label ? (
        <p className="mb-2 text-[10px] font-semibold uppercase text-[var(--fly-text-muted)]">
          {String(label)}
        </p>
      ) : null}
      <div className="space-y-1.5">
        {payload.map((item) => {
          const dataKey = String(item.dataKey ?? item.name ?? "");
          const value = Number(item.value ?? 0);

          return (
            <div key={dataKey} className="flex items-center justify-between gap-4">
              <span className="text-[var(--fly-text-muted)]">
                {getSeriesLabel(dataKey)}
              </span>
              <span className="font-semibold tabular-nums text-[var(--fly-text)]">
                {formatCurrency(value)}
              </span>
            </div>
          );
        })}
      </div>
      <div className="mt-2 border-t border-[var(--fly-divider)] pt-2">
        <div className="flex items-center justify-between gap-4">
          <span className="text-[var(--fly-text-muted)]">
            {gap >= 0 ? "Acima da meta" : "Falta para meta"}
          </span>
          <span className="font-semibold tabular-nums text-[var(--fly-text)]">
            {formatCurrency(Math.abs(gap))}
          </span>
        </div>
        <div className="mt-1.5 flex items-center justify-between gap-4">
          <span className="text-[var(--fly-text-muted)]">ROAS da semana</span>
          <span className="font-semibold tabular-nums text-[var(--fly-text)]">
            {new Intl.NumberFormat("pt-BR", {
              maximumFractionDigits: 2,
              minimumFractionDigits: 2,
            }).format(roas)}
          </span>
        </div>
      </div>
    </div>
  );
}

export function CfoWeeklyChart({
  series,
}: {
  series: MetasProgressPoint[];
}) {
  if (series.length === 0) {
    return (
      <div className="flex h-[320px] min-w-0 items-center justify-center rounded-[8px] border border-[var(--fly-border-subtle)] bg-[var(--fly-row-bg)] px-4 text-center sm:h-[360px]">
        <div>
          <p className="text-sm font-medium text-[var(--fly-text)]">
            Nenhuma semana configurada.
          </p>
          <p className="mt-1 text-xs text-[var(--fly-text-muted)]">
            Configure as semanas do mês para visualizar o ritmo financeiro.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[320px] min-h-[320px] min-w-0 sm:h-[360px] sm:min-h-[360px]">
      <ResponsiveContainer height="100%" minHeight={320} minWidth={240} width="100%">
        <BarChart
          barCategoryGap="28%"
          barGap={4}
          data={series}
          layout="vertical"
          margin={{ bottom: 4, left: 4, right: 14, top: 8 }}
        >
          <CartesianGrid
            stroke="var(--fly-chart-grid)"
            strokeDasharray="3 3"
            horizontal={false}
          />
          <XAxis
            axisLine={false}
            tick={{ fill: "var(--fly-chart-axis)", fontSize: 11 }}
            tickFormatter={(value) => compactCurrency(Number(value))}
            tickLine={false}
            type="number"
          />
          <YAxis
            axisLine={false}
            dataKey="day"
            tick={{ fill: "var(--fly-chart-axis)", fontSize: 11 }}
            tickLine={false}
            type="category"
            width={40}
          />
          <Tooltip
            content={<CfoWeeklyTooltip />}
            cursor={{ fill: "var(--fly-row-hover)" }}
          />
          <Legend
            iconType="circle"
            wrapperStyle={{
              color: "var(--fly-text-muted)",
              fontSize: 12,
              paddingTop: 10,
            }}
          />
          <Bar
            animationDuration={700}
            barSize={14}
            dataKey="target"
            fill="var(--fly-chart-investment)"
            fillOpacity={0.5}
            name="Meta da semana"
            radius={[0, 6, 6, 0]}
            stroke="var(--fly-chart-investment-active)"
            strokeOpacity={0.72}
          />
          <Bar
            animationDuration={760}
            barSize={14}
            dataKey="realized"
            fill="var(--fly-chart-revenue)"
            name="Receita realizada"
            radius={[0, 6, 6, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
