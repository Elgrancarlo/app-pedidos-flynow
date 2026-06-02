"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { FinanceiroPageData } from "@/lib/financeiro";
import { formatCurrency, formatPercent } from "@/lib/utils";

type TooltipPayload = {
  color?: string;
  dataKey?: string | number;
  name?: string | number;
  payload?: {
    detail?: string;
    label?: string;
    tone?: string;
  };
  value?: string | number;
};

type TooltipProps = {
  active?: boolean;
  payload?: TooltipPayload[];
};

function clampRatio(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(Math.max(value, 0), 1);
}

function compactCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    currency: "BRL",
    maximumFractionDigits: 1,
    notation: "compact",
    style: "currency",
  }).format(value);
}

function ChartTooltip({ active, payload }: TooltipProps) {
  if (!active || !payload?.length) return null;

  return (
    <div className="min-w-[190px] rounded-[8px] border border-[var(--fly-border)] bg-[var(--fly-surface-elevated)] p-2.5 text-xs shadow-[0_18px_44px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur-xl">
      <div className="space-y-1.5">
        {payload
          .filter((item) => Number(item.value ?? 0) > 0)
          .map((item) => {
            const value = Number(item.value ?? 0);
            const label = String(
              item.name === "Valor"
                ? item.payload?.label ?? "Valor"
                : item.name ?? item.dataKey ?? "Valor"
            );

            return (
              <div key={`${label}-${item.dataKey}`} className="space-y-1">
                <div className="flex items-center justify-between gap-4">
                  <span className="inline-flex min-w-0 items-center gap-1.5 text-[var(--fly-text-muted)]">
                    <span
                      aria-hidden="true"
                      className="size-1.5 shrink-0 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="truncate">{label}</span>
                  </span>
                  <span className="font-semibold tabular-nums text-[var(--fly-text)]">
                    {formatCurrency(value)}
                  </span>
                </div>
                {item.payload?.detail ? (
                  <p className="text-[11px] leading-4 text-[var(--fly-text-muted)]">
                    {item.payload.detail}
                  </p>
                ) : null}
              </div>
            );
          })}
      </div>
    </div>
  );
}

export function FinanceCompositionChart({ data }: { data: FinanceiroPageData }) {
  const grossBase = Math.max(data.receitaBruta, 1);
  const chargebackRatio = clampRatio(data.valorChargebacks / grossBase);
  const refundRatio = clampRatio(data.valorReembolsos / grossBase);
  const revertedRatio = clampRatio(data.totalRevertido / grossBase);
  const retainedRatio = clampRatio(data.receitaLiquida / grossBase);

  const compositionData = [
    {
      chargebacks: data.valorChargebacks,
      label: "Composição",
      liquida: data.receitaLiquida,
      reembolsos: data.valorReembolsos,
    },
  ];

  const segments = [
    {
      color: "#4ADE80",
      key: "liquida",
      label: "Receita líquida",
      ratio: retainedRatio,
      value: data.receitaLiquida,
    },
    {
      color: "#F87171",
      key: "chargebacks",
      label: "Chargebacks",
      ratio: chargebackRatio,
      value: data.valorChargebacks,
    },
    {
      color: "#F0C76A",
      key: "reembolsos",
      label: "Reembolsos",
      ratio: refundRatio,
      value: data.valorReembolsos,
    },
  ] as const;
  const visibleSegmentKeys = segments
    .filter((segment) => segment.value > 0)
    .map((segment) => segment.key);

  function stackRadius(
    segmentKey: (typeof segments)[number]["key"]
  ): number | [number, number, number, number] {
    const firstKey = visibleSegmentKeys[0];
    const lastKey = visibleSegmentKeys.at(-1);

    if (firstKey === segmentKey && lastKey === segmentKey) return [6, 6, 6, 6];
    if (firstKey === segmentKey) return [6, 0, 0, 6];
    if (lastKey === segmentKey) return [0, 6, 6, 0];
    return 0;
  }

  const comparisonData = [
    {
      color: "#D6A84F",
      detail: `${data.totalPedidos.toLocaleString("pt-BR")} pedidos pagos`,
      label: "Receita bruta",
      ratio: 1,
      value: data.receitaBruta,
    },
    {
      color: "#F87171",
      detail: `${data.chargebacks.toLocaleString("pt-BR")} eventos · taxa CB ${formatPercent(data.taxaChargeback)}`,
      label: "Chargebacks",
      ratio: chargebackRatio,
      value: data.valorChargebacks,
    },
    {
      color: "#F0C76A",
      detail: `${data.reembolsos.toLocaleString("pt-BR")} eventos`,
      label: "Reembolsos",
      ratio: refundRatio,
      value: data.valorReembolsos,
    },
    {
      color: "rgba(255,255,255,0.35)",
      detail: `${formatPercent(revertedRatio)} da receita bruta do período`,
      label: "Total revertido",
      ratio: revertedRatio,
      value: data.totalRevertido,
    },
    {
      color: "#4ADE80",
      detail: `${formatPercent(retainedRatio)} da receita bruta preservada`,
      label: "Receita líquida",
      ratio: retainedRatio,
      value: data.receitaLiquida,
    },
  ];

  return (
    <div className="min-h-[430px] space-y-5">
      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase text-[var(--fly-text-muted)]">
            Receita do período
          </p>
          <p className="mt-2 text-[26px] font-semibold leading-none tabular-nums text-[var(--fly-text)] sm:text-[32px]">
            {formatCurrency(data.receitaBruta)}
          </p>
          <p className="mt-2 text-xs leading-5 text-[var(--fly-text-muted)]">
            {data.totalPedidos.toLocaleString("pt-BR")} pedidos pagos · ticket médio{" "}
            {formatCurrency(data.ticketMedio)}
          </p>
        </div>
        <div className="min-w-[118px] border-t border-white/[0.07] pt-3 sm:border-l sm:border-t-0 sm:pl-4 sm:pt-0">
          <p className="text-[10px] font-medium uppercase text-[var(--fly-text-muted)]">
            Retenção
          </p>
          <p className="mt-1 text-xl font-semibold tabular-nums text-[#86EFAC]">
            {formatPercent(retainedRatio)}
          </p>
        </div>
      </div>

      <div className="h-[70px] min-w-0 overflow-hidden rounded-[8px] border border-white/[0.045] bg-white/[0.01]">
        <ResponsiveContainer height="100%" width="100%">
          <BarChart
            data={compositionData}
            layout="vertical"
            margin={{ bottom: 12, left: 0, right: 0, top: 12 }}
          >
            <XAxis domain={[0, grossBase]} hide type="number" />
            <YAxis dataKey="label" hide type="category" />
            <Tooltip content={<ChartTooltip />} cursor={false} />
            {segments.map((segment, index) => (
              <Bar
                animationBegin={140 + index * 110}
                animationDuration={760}
                animationEasing="ease-out"
                dataKey={segment.key}
                fill={segment.color}
                key={segment.key}
                name={segment.label}
                radius={stackRadius(segment.key)}
                stackId="financeiro"
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid gap-2 text-[11px] text-[var(--fly-text-muted)] sm:grid-cols-3">
        {segments.map((segment) => (
          <div
            key={segment.key}
            className="flex min-w-0 items-center justify-between gap-2"
          >
            <span className="inline-flex min-w-0 items-center gap-1.5">
              <span
                aria-hidden="true"
                className="size-1.5 shrink-0 rounded-full"
                style={{ backgroundColor: segment.color }}
              />
              <span className="truncate">{segment.label}</span>
            </span>
            <span className="shrink-0 font-semibold tabular-nums text-[var(--fly-text-soft)]">
              {formatPercent(segment.ratio)}
            </span>
          </div>
        ))}
      </div>

      <div className="h-[285px] min-w-0">
        <ResponsiveContainer height="100%" width="100%">
          <BarChart
            barCategoryGap={14}
            data={comparisonData}
            layout="vertical"
            margin={{ bottom: 4, left: 0, right: 18, top: 4 }}
          >
            <CartesianGrid
              horizontal={false}
              stroke="rgba(255,255,255,0.06)"
              strokeDasharray="3 3"
            />
            <XAxis
              axisLine={false}
              domain={[0, grossBase]}
              tick={{ fill: "rgba(245,242,234,0.48)", fontSize: 11 }}
              tickFormatter={(value) => compactCurrency(Number(value))}
              tickLine={false}
              type="number"
            />
            <YAxis
              axisLine={false}
              dataKey="label"
              tick={{ fill: "rgba(245,242,234,0.62)", fontSize: 11 }}
              tickLine={false}
              type="category"
              width={106}
            />
            <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(255,255,255,0.025)" }} />
            <Bar
              animationBegin={260}
              animationDuration={880}
              animationEasing="ease-out"
              dataKey="value"
              maxBarSize={16}
              name="Valor"
              radius={[0, 6, 6, 0]}
            >
              {comparisonData.map((item) => (
                <Cell fill={item.color} key={item.label} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid gap-2 border-t border-white/[0.055] pt-3 sm:grid-cols-2 xl:grid-cols-5">
        {comparisonData.map((item) => (
          <div key={item.label} className="min-w-0">
            <div className="flex min-w-0 items-center gap-1.5">
              <span
                aria-hidden="true"
                className="size-1.5 shrink-0 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              <p className="truncate text-[11px] font-medium uppercase text-[var(--fly-text-muted)]">
                {item.label}
              </p>
            </div>
            <p className="mt-1.5 whitespace-nowrap text-sm font-semibold leading-none tabular-nums text-[var(--fly-text)]">
              {formatCurrency(item.value)}
            </p>
            <p className="mt-1 text-[11px] leading-4 text-[var(--fly-text-muted)]">
              {item.detail}
            </p>
          </div>
        ))}
      </div>

      <div className="border-t border-white/[0.055] pt-3">
        <p className="text-xs leading-5 text-[var(--fly-text-muted)]">
          <span className="font-medium text-[var(--fly-text-soft)]">
            Leitura:
          </span>{" "}
          {formatCurrency(data.receitaBruta)} brutos menos{" "}
          {formatCurrency(data.valorChargebacks)} em chargebacks e{" "}
          {formatCurrency(data.valorReembolsos)} em reembolsos resultam em{" "}
          <span className="font-semibold text-[var(--fly-text)]">
            {formatCurrency(data.receitaLiquida)}
          </span>
          {" "}líquidos.
        </p>
      </div>
    </div>
  );
}
