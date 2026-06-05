"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type ChannelRevenueDatum = {
  directSales: number;
  name: string;
  revenue: number;
  roas: number | null;
};

export type SourceSpendDatum = {
  clicks: number;
  conversions: number;
  name: string;
  roas: number;
  spend: number;
};

type TooltipPayload = {
  color?: string;
  dataKey?: string | number;
  name?: string | number;
  payload?: Record<string, unknown>;
  value?: string | number;
};

type TooltipProps = {
  active?: boolean;
  payload?: TooltipPayload[];
};

type ChartTooltipProps = TooltipProps & {
  variant: "revenue" | "spend";
};

function toNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

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

function truncateTick(value: string | number) {
  const text = String(value);

  return text.length > 14 ? `${text.slice(0, 13)}...` : text;
}

function ChartTooltip({ active, payload, variant }: ChartTooltipProps) {
  if (!active || !payload?.length) return null;

  const record = payload[0]?.payload ?? {};
  const name = String(record.name ?? payload[0]?.name ?? "");
  const rows =
    variant === "revenue"
      ? [
          ["Receita", formatCurrency(toNumber(record.revenue))],
          ["Vendas diretas", formatNumber(toNumber(record.directSales))],
        ]
      : [
          ["Spend", formatCurrency(toNumber(record.spend))],
          ["Cliques", formatNumber(toNumber(record.clicks))],
          ["Conversões", formatNumber(toNumber(record.conversions))],
          ["ROAS", formatDecimal(toNumber(record.roas))],
        ];

  return (
    <div className="min-w-[190px] rounded-[8px] border border-[var(--fly-border)] bg-[var(--fly-surface-elevated)] p-2.5 text-xs shadow-[var(--fly-tooltip-shadow)] backdrop-blur-xl">
      <p className="mb-2 truncate text-[10px] font-semibold uppercase text-[var(--fly-text-muted)]">
        {name}
      </p>
      <div className="space-y-1.5">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between gap-4">
            <span className="text-[var(--fly-text-muted)]">{label}</span>
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

export function ChannelRevenueChart({
  channels,
}: {
  channels: ChannelRevenueDatum[];
}) {
  if (!channels.length) return <EmptyChart />;

  return (
    <div className="h-[300px] min-w-0 sm:h-[340px]">
      <ResponsiveContainer height="100%" width="100%">
        <BarChart
          data={channels}
          margin={{ bottom: 18, left: 0, right: 10, top: 8 }}
        >
          <CartesianGrid
            stroke="var(--fly-chart-grid)"
            strokeDasharray="3 3"
            vertical={false}
          />
          <XAxis
            axisLine={false}
            dataKey="name"
            height={52}
            interval={0}
            tick={{ fill: "var(--fly-chart-axis)", fontSize: 10 }}
            tickFormatter={truncateTick}
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
            content={<ChartTooltip variant="revenue" />}
            cursor={{ fill: "var(--fly-row-bg-strong)" }}
          />
          <Bar
            animationDuration={760}
            animationEasing="ease-out"
            dataKey="revenue"
            fill="var(--fly-chart-revenue)"
            isAnimationActive
            maxBarSize={72}
            name="Receita"
            radius={[6, 6, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function SourceSpendChart({ sources }: { sources: SourceSpendDatum[] }) {
  if (!sources.length) return <EmptyChart />;

  return (
    <div className="h-[300px] min-w-0 sm:h-[340px]">
      <ResponsiveContainer height="100%" width="100%">
        <BarChart
          data={sources}
          margin={{ bottom: 18, left: 0, right: 10, top: 8 }}
        >
          <CartesianGrid
            stroke="var(--fly-chart-grid)"
            strokeDasharray="3 3"
            vertical={false}
          />
          <XAxis
            axisLine={false}
            dataKey="name"
            height={52}
            interval={0}
            tick={{ fill: "var(--fly-chart-axis)", fontSize: 10 }}
            tickFormatter={truncateTick}
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
            content={<ChartTooltip variant="spend" />}
            cursor={{ fill: "var(--fly-row-bg-strong)" }}
          />
          <Bar
            animationDuration={820}
            animationEasing="ease-out"
            dataKey="spend"
            fill="var(--fly-chart-investment)"
            isAnimationActive
            maxBarSize={72}
            name="Spend"
            radius={[6, 6, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
