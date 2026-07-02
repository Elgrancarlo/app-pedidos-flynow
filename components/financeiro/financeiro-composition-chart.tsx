"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
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
    color?: string;
    detail?: string;
    displayValue?: number;
    label?: string;
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

function signedCompactCurrency(value: number) {
  if (value < 0) return `-${compactCurrency(Math.abs(value))}`;
  return compactCurrency(value);
}

function ChartTooltip({ active, payload }: TooltipProps) {
  if (!active || !payload?.length) return null;
  const amountPayload = payload.find((item) => item.dataKey === "amount");
  const point = amountPayload?.payload;

  if (!amountPayload || !point) return null;

  const value = Number(point.displayValue ?? amountPayload.value ?? 0);

  return (
    <div className="min-w-[190px] rounded-[8px] border border-[var(--fly-border)] bg-[var(--fly-surface-elevated)] p-2.5 text-xs shadow-[var(--fly-tooltip-shadow)] backdrop-blur-xl">
      <div className="space-y-1">
        <div className="flex items-center justify-between gap-4">
          <span className="inline-flex min-w-0 items-center gap-1.5 text-[var(--fly-text-muted)]">
            <span
              aria-hidden="true"
              className="size-1.5 shrink-0 rounded-full"
              style={{ backgroundColor: point.color ?? amountPayload.color }}
            />
            <span className="truncate">{point.label}</span>
          </span>
          <span className="font-semibold tabular-nums text-[var(--fly-text)]">
            {value < 0 ? `-${formatCurrency(Math.abs(value))}` : formatCurrency(value)}
          </span>
        </div>
        {point.detail ? (
          <p className="text-[11px] leading-4 text-[var(--fly-text-muted)]">
            {point.detail}
          </p>
        ) : null}
      </div>
    </div>
  );
}

export function FinanceCompositionChart({ data }: { data: FinanceiroPageData }) {
  const grossBase = Math.max(data.receitaBruta, 1);
  const revertedRatio = clampRatio(data.totalRevertido / grossBase);
  const retainedRatio = clampRatio(data.receitaLiquida / grossBase);
  const afterTaxas = Math.max(data.receitaBruta - data.taxasPayt, 0);
  const afterChargebacks = Math.max(afterTaxas - data.valorChargebacks, 0);
  const afterRefunds = Math.max(afterChargebacks - data.valorReembolsos, 0);

  const waterfallData = [
    {
      amount: data.receitaBruta,
      axisLabel: "Bruto",
      color: "var(--fly-chart-revenue)",
      detail: `${data.totalPedidos.toLocaleString("pt-BR")} vendas aprovadas`,
      displayValue: data.receitaBruta,
      label: "Faturamento bruto",
      offset: 0,
    },
    {
      amount: Math.min(data.taxasPayt, data.receitaBruta),
      axisLabel: "Taxas",
      color: "#F0A868",
      detail: "Plataforma, callcenter, fornecedores, afiliados",
      displayValue: -data.taxasPayt,
      label: "Taxas / comissões Payt",
      offset: afterTaxas,
    },
    {
      amount: Math.min(data.valorChargebacks, afterTaxas),
      axisLabel: "CB",
      color: "#F87171",
      detail: `${data.chargebacks.toLocaleString("pt-BR")} eventos · taxa CB ${formatPercent(data.taxaChargeback)}`,
      displayValue: -data.valorChargebacks,
      label: "Chargebacks",
      offset: afterChargebacks,
    },
    {
      amount: Math.min(data.valorReembolsos, afterChargebacks),
      axisLabel: "Reemb.",
      color: "#F0C76A",
      detail: `${data.reembolsos.toLocaleString("pt-BR")} eventos`,
      displayValue: -data.valorReembolsos,
      label: "Reembolsos",
      offset: afterRefunds,
    },
    {
      amount: data.receitaLiquida,
      axisLabel: "Você recebe",
      color: "var(--fly-success)",
      detail: `${formatPercent(retainedRatio)} do bruto é seu`,
      displayValue: data.receitaLiquida,
      label: "Receita líquida (Você recebe)",
      offset: 0,
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
        <div className="min-w-[118px] border-t border-[var(--fly-divider)] pt-3 sm:border-l sm:border-t-0 sm:pl-4 sm:pt-0">
          <p className="text-[10px] font-medium uppercase text-[var(--fly-text-muted)]">
            Retenção
          </p>
          <p className="mt-1 text-xl font-semibold tabular-nums text-[var(--fly-success)]">
            {formatPercent(retainedRatio)}
          </p>
        </div>
      </div>

      <div className="h-[330px] min-w-0 sm:h-[360px]">
        <ResponsiveContainer height="100%" width="100%">
          <BarChart
            barCategoryGap={28}
            data={waterfallData}
            margin={{ bottom: 8, left: 0, right: 12, top: 20 }}
          >
            <CartesianGrid
              stroke="var(--fly-chart-grid)"
              strokeDasharray="3 3"
              vertical={false}
            />
            <XAxis
              axisLine={false}
              dataKey="axisLabel"
              height={34}
              interval={0}
              minTickGap={8}
              tick={{ fill: "var(--fly-chart-axis)", fontSize: 11 }}
              tickLine={false}
            />
            <YAxis
              axisLine={false}
              domain={[0, grossBase]}
              tick={{ fill: "var(--fly-chart-axis)", fontSize: 11 }}
              tickFormatter={(value) => compactCurrency(Number(value))}
              tickLine={false}
              width={72}
            />
            <Tooltip
              content={<ChartTooltip />}
              cursor={{ fill: "var(--fly-row-bg-strong)" }}
              isAnimationActive={false}
              wrapperStyle={{
                outline: "none",
                pointerEvents: "none",
                transition: "none",
              }}
            />
            <Bar
              dataKey="offset"
              fill="transparent"
              isAnimationActive={false}
              stackId="waterfall"
            />
            <Bar
              animationBegin={160}
              animationDuration={820}
              animationEasing="ease-out"
              dataKey="amount"
              maxBarSize={74}
              name="Valor"
              radius={[6, 6, 0, 0]}
              stackId="waterfall"
            >
              {waterfallData.map((item) => (
                <Cell fill={item.color} key={item.label} />
              ))}
              <LabelList
                className="hidden sm:block"
                dataKey="displayValue"
                fill="var(--fly-text-soft)"
                fontSize={11}
                formatter={(value) => signedCompactCurrency(Number(value ?? 0))}
                position="top"
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="rounded-[8px] border border-[var(--fly-border-subtle)] bg-[var(--fly-row-bg)] px-3 py-3">
        <p className="text-xs leading-5 text-[var(--fly-text-muted)] sm:text-sm">
          <span className="font-medium text-[var(--fly-text-soft)]">Perda financeira:</span>{" "}
          <span className="font-semibold text-[var(--fly-text)]">
            {formatCurrency(data.totalRevertido)}
          </span>{" "}
          · {formatPercent(revertedRatio)} da receita bruta no período.
        </p>
      </div>
    </div>
  );
}
