"use client";

import type { CSSProperties } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Check,
  ChevronDown,
  Inbox,
  RefreshCw,
} from "lucide-react";
import { DropdownMenu as RadixDropdownMenu } from "radix-ui";
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
  endOfDay,
  endOfMonth,
  format,
  startOfMonth,
  startOfDay,
  subDays,
  subMonths,
} from "date-fns";

import { DashboardHeader } from "@/components/layout/dashboard-header";
import {
  SystemDateRangeFilter,
  type RangeValue,
} from "@/components/workspace/system-date-range-filter";
import { useMetrics } from "@/hooks/useMetrics";
import type {
  ChannelConversion,
  MetricsData,
  Offer,
  OfferStageKey,
  RecoveryChannelKey,
} from "@/lib/metrics";
import { cn, formatCurrency, formatPercent } from "@/lib/utils";

type RangePreset = {
  key: string;
  label: string;
  displayLabel: string;
  getRange: () => { from: Date; to: Date };
};

type KpiMetricProps = {
  label: string;
  value: string;
  supportingText: string;
  tone?: "gold" | "blue" | "green";
};

type ConversionItemProps = {
  label: string;
  quantidade: number;
  receita: number;
  taxa?: number | null;
  marker?: string;
  percentage: number;
  accent?: "neutral" | "blue";
};

type RevenueChartTooltipPayload = {
  dataKey?: string | number;
  name?: string | number;
  value?: string | number;
};

type RevenueChartTooltipProps = {
  active?: boolean;
  isCompact: boolean;
  label?: string | number;
  payload?: RevenueChartTooltipPayload[];
};

const ALL_OFFERS_KEY = "all";

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

const STAGE_LABELS: Array<{
  key: OfferStageKey;
  label: string;
}> = [
  { key: "frontend", label: "Frontend" },
  { key: "upsell", label: "Upsell" },
  { key: "downsell", label: "Downsell" },
];

const CHANNEL_LABELS: Array<{
  key: RecoveryChannelKey;
  label: string;
  marker: string;
}> = [
  { key: "ia_recuperacao", label: "IA", marker: "IA" },
  { key: "email", label: "Email", marker: "EM" },
  { key: "call_center", label: "Call Center", marker: "CC" },
  { key: "sms", label: "SMS", marker: "SMS" },
];

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

function formatDateLabel(value: string) {
  return new Date(`${value}T12:00:00`).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  });
}

function getCompactChartTicks(data: MetricsData["serie_temporal"]) {
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

function getOfferLabel(offers: Offer[], value: string) {
  const option = offers.find((item) => item.id === value);

  if (value === ALL_OFFERS_KEY || !option) {
    return "Todas as ofertas";
  }

  return option.nome;
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
  description: string;
}) {
  return (
    <div className="flex min-w-0 items-start gap-3">
      <span
        aria-hidden="true"
        className="mt-0.5 h-8 w-px shrink-0 rounded-full bg-gradient-to-b from-white/[0.18] via-white/[0.08] to-transparent"
      />
      <div className="min-w-0">
        <h2 className="text-[15px] font-semibold leading-none text-[#F5F2EA]">
          {title}
        </h2>
        <p className="mt-1.5 text-[13px] leading-5 text-[#858A94] sm:text-sm">
          {description}
        </p>
      </div>
    </div>
  );
}

function OfferSelectControl({
  value,
  offers,
  open,
  onChange,
  onOpenChange,
}: {
  value: string;
  offers: Offer[];
  open: boolean;
  onChange: (value: string) => void;
  onOpenChange: (open: boolean) => void;
}) {
  const selectedLabel = getOfferLabel(offers, value);

  return (
    <RadixDropdownMenu.Root
      modal={false}
      open={open}
      onOpenChange={onOpenChange}
    >
      <RadixDropdownMenu.Trigger
        aria-label="Selecionar oferta"
        className="group flex h-10 w-full min-w-[190px] max-w-full items-center justify-between gap-2 rounded-xl border border-[var(--fly-border)] bg-[var(--fly-control)] px-3 text-left text-[11px] font-medium text-[var(--fly-text-soft)] shadow-[inset_0_1px_0_rgba(255,255,255,0.035)] outline-none transition-colors duration-150 hover:border-[var(--fly-border-strong)] hover:bg-[var(--fly-control-hover)] focus-visible:ring-2 focus-visible:ring-[var(--fly-brand-ring)] data-[state=open]:border-[var(--fly-brand-border)] data-[state=open]:bg-[var(--fly-control-hover)] sm:h-8 sm:w-[236px] sm:min-w-[236px] sm:rounded-full sm:px-2.5 lg:rounded-xl lg:border-[var(--fly-border-strong)] lg:bg-[var(--fly-control-solid)] lg:text-xs lg:shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]"
      >
        <span className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--fly-text-muted)]">
          Oferta
        </span>
        <span
          aria-hidden="true"
          className="h-3.5 w-px shrink-0 bg-[var(--fly-border)]"
        />
        <span className="min-w-0 flex-1 truncate">{selectedLabel}</span>
        <ChevronDown
          aria-hidden="true"
          className="size-3.5 shrink-0 text-[var(--fly-text-muted)] transition-transform duration-200 group-data-[state=open]:rotate-180"
        />
      </RadixDropdownMenu.Trigger>

      <RadixDropdownMenu.Portal>
        <RadixDropdownMenu.Content
          align="end"
          avoidCollisions={false}
          side="bottom"
          sideOffset={8}
          className="flynow-calendar-popover flynow-offer-select-content z-[80] max-h-[280px] min-w-[236px] overflow-hidden rounded-xl border border-[var(--fly-brand-border)] bg-[var(--fly-surface-elevated)] p-1 text-[var(--fly-text)] shadow-[0_28px_90px_rgba(0,0,0,0.6),0_0_0_1px_rgba(255,255,255,0.045),inset_0_1px_0_rgba(255,255,255,0.13),inset_0_0_36px_rgba(255,255,255,0.035)] backdrop-blur-[28px] data-[side=bottom]:origin-top-right"
        >
          <RadixDropdownMenu.RadioGroup value={value} onValueChange={onChange}>
            <OfferSelectItem value={ALL_OFFERS_KEY}>
              Todas as ofertas
            </OfferSelectItem>
            {offers.map((offer) => (
              <OfferSelectItem key={offer.id} value={offer.id}>
                {offer.nome}
              </OfferSelectItem>
            ))}
          </RadixDropdownMenu.RadioGroup>
        </RadixDropdownMenu.Content>
      </RadixDropdownMenu.Portal>
    </RadixDropdownMenu.Root>
  );
}

function OfferSelectItem({
  value,
  children,
}: {
  value: string;
  children: React.ReactNode;
}) {
  return (
    <RadixDropdownMenu.RadioItem
      value={value}
      className="relative flex h-8 cursor-pointer select-none items-center rounded-[8px] py-1.5 pl-8 pr-3 text-xs font-medium text-[var(--fly-text-soft)] outline-none transition-colors duration-150 data-[highlighted]:bg-[var(--fly-control-hover)] data-[highlighted]:text-[var(--fly-text)] data-[state=checked]:text-[var(--fly-text)]"
    >
      <RadixDropdownMenu.ItemIndicator className="absolute left-2.5 inline-flex size-3.5 items-center justify-center text-[var(--fly-chart-revenue)]">
        <Check aria-hidden="true" className="size-3.5" />
      </RadixDropdownMenu.ItemIndicator>
      <span className="truncate">{children}</span>
    </RadixDropdownMenu.RadioItem>
  );
}

function KpiMetric({
  label,
  value,
  supportingText,
  tone = "gold",
}: KpiMetricProps) {
  const dotClass = {
    gold: "bg-[#D6A84F]",
    blue: "bg-[#60A5FA]",
    green: "bg-[#4ADE80]",
  }[tone];

  return (
    <div className="min-w-0">
      <div className="flex items-start justify-between gap-3 sm:block">
        <div className="flex min-w-0 items-center gap-2">
          <span
            aria-hidden="true"
            className={cn("size-1.5 shrink-0 rounded-full", dotClass)}
          />
          <p className="truncate text-[11px] font-medium uppercase tracking-[0.08em] text-[#858A94]">
            {label}
          </p>
        </div>
        <p className="min-w-0 shrink-0 text-right text-[22px] font-semibold leading-none tracking-normal tabular-nums text-[#F5F2EA] sm:mt-3 sm:text-left sm:text-[30px] md:text-[32px]">
          {value}
        </p>
      </div>
      <p className="mt-1.5 max-w-[32ch] text-[11px] leading-4 text-[#8B9099] sm:mt-3 sm:max-w-[28ch] sm:text-[13px] sm:leading-5">
        {supportingText}
      </p>
    </div>
  );
}

function OverviewPanel({ data }: { data: MetricsData }) {
  const metrics: KpiMetricProps[] = [
    {
      label: "Faturamento",
      value: formatCurrency(data.faturamento_total),
      supportingText: "Receita consolidada no período",
      tone: "gold",
    },
    {
      label: "Investimento",
      value: formatCurrency(data.investimento_total),
      supportingText: "Mídia paga aplicada no período",
      tone: "blue",
    },
    {
      label: "ROAS",
      value: `${data.roas.toLocaleString("pt-BR", {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      })}x`,
      supportingText: "Retorno sobre investimento em anúncios",
      tone: "green",
    },
  ];

  return (
    <section className="overflow-hidden rounded-[8px] border border-white/[0.07] bg-[#0B0D10] shadow-[0_1px_0_rgba(255,255,255,0.03),inset_0_1px_0_rgba(255,255,255,0.035)]">
      <span
        aria-hidden="true"
        className="block h-px bg-gradient-to-r from-transparent via-[#D6A84F]/45 to-transparent"
      />
      <div className="flex flex-col gap-1 border-b border-white/[0.06] px-4 py-3 sm:px-5 sm:py-4">
        <h2 className="text-[15px] font-semibold leading-none text-[#F5F2EA]">
          Visão geral
        </h2>
        <p className="text-[13px] leading-5 text-[#858A94] sm:text-sm">
          Resumo do período selecionado
        </p>
      </div>

      <div className="grid md:grid-cols-3">
        {metrics.map((metric, index) => (
          <div
            key={metric.label}
            className={cn(
              "px-4 py-3 sm:px-5 sm:py-5",
              index > 0 &&
                "border-t border-white/[0.06] md:border-l md:border-t-0"
            )}
          >
            <KpiMetric {...metric} />
          </div>
        ))}
      </div>
    </section>
  );
}

function ConversionItem({
  label,
  quantidade,
  receita,
  taxa,
  marker,
  percentage,
  accent = "neutral",
}: ConversionItemProps) {
  const barClass =
    accent === "blue"
      ? "bg-gradient-to-r from-[#2563EB] to-[#93C5FD]"
      : "bg-gradient-to-r from-white/30 to-white/55";
  const markerClass =
    accent === "blue"
      ? "text-[#93C5FD]"
      : "text-[#A3A8B1]";

  return (
    <div className="min-w-0 rounded-[7px] border border-white/[0.055] bg-white/[0.018] px-3 py-2.5 transition-colors duration-200 hover:border-white/[0.1] hover:bg-white/[0.035] sm:px-3.5 sm:py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          {marker ? (
            <span
              aria-hidden="true"
              className={cn(
                "flynow-channel-marker flex w-8 shrink-0 items-center text-[10px] font-semibold uppercase tracking-[0.12em] transition-colors duration-200",
                markerClass
              )}
            >
              {marker}
            </span>
          ) : null}
          <div className="min-w-0">
            <h3 className="truncate text-[13px] font-medium text-[#F5F2EA]">
              {label}
            </h3>
            <p className="mt-0.5 text-xs text-[#858A94]">
              {quantidade.toLocaleString("pt-BR")} conversões
            </p>
          </div>
        </div>
        {typeof taxa === "number" ? (
          <span className="shrink-0 rounded-md border border-[#4ADE80]/16 bg-[#0D1F14]/80 px-2 py-0.5 text-xs font-medium tabular-nums text-[#86EFAC]">
            {formatPercent(taxa)}
          </span>
        ) : null}
      </div>

      <div className="mt-2.5 sm:mt-3">
        <div className="flex items-end justify-between gap-3">
          <p className="min-w-0 truncate text-[14px] font-semibold leading-none tabular-nums text-[#F5F2EA] sm:text-[16px]">
            {formatCurrency(receita)}
          </p>
          <p className="shrink-0 whitespace-nowrap text-[11px] tabular-nums text-[#858A94] sm:text-xs">
            {Math.round(percentage)}% do maior
          </p>
        </div>
        <div className="mt-2.5 h-1 overflow-hidden rounded-full bg-white/[0.07]">
          <div
            className={cn("flynow-conversion-bar h-full rounded-full", barClass)}
            style={{ width: `${Math.max(percentage, 4)}%` }}
          />
        </div>
      </div>
    </div>
  );
}

function ConversionPanel({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[8px] border border-white/[0.07] bg-[#0B0D10] p-3 shadow-[0_1px_0_rgba(255,255,255,0.03),inset_0_1px_0_rgba(255,255,255,0.035)] sm:p-4">
      <div className="flex min-w-0 flex-col gap-3 2xl:flex-row 2xl:items-start 2xl:justify-between">
        <SectionHeader title={title} description={description} />
        {action ? (
          <div className="min-w-0 2xl:max-w-[260px] 2xl:shrink-0">{action}</div>
        ) : null}
      </div>
      <div className="mt-3 space-y-2.5 sm:mt-4">{children}</div>
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
      <div className="flynow-dashboard-skeleton-panel h-[288px] rounded-[8px] border border-white/[0.06] bg-[#0D0F12] md:h-[214px]">
        <div className="grid h-full md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={index}
              className={cn(
                "flex flex-col justify-end gap-3 p-4 sm:p-5",
                index > 0 &&
                  "border-t border-white/[0.045] md:border-l md:border-t-0"
              )}
            >
              <span className="h-2.5 w-24 rounded-full bg-white/[0.055]" />
              <span className="h-8 w-40 rounded-md bg-white/[0.07]" />
              <span className="h-2.5 w-32 rounded-full bg-white/[0.05]" />
            </div>
          ))}
        </div>
      </div>

      <div className="flynow-dashboard-skeleton-panel h-[420px] rounded-[8px] border border-white/[0.06] bg-[#0D0F12] sm:h-[470px] lg:h-[520px]" />

      <div className="grid items-start gap-5 xl:grid-cols-2">
        {Array.from({ length: 2 }).map((_, index) => (
          <div
            key={index}
            className="flynow-dashboard-skeleton-panel h-[316px] rounded-[8px] border border-white/[0.06] bg-[#0D0F12]"
          />
        ))}
      </div>
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
      className="flynow-dashboard-error-state flex flex-col gap-4 rounded-[8px] border border-[#F87171]/26 bg-[#2B1515]/80 p-4 text-sm text-[#FCA5A5] shadow-[inset_0_1px_0_rgba(255,255,255,0.035)] sm:flex-row sm:items-center sm:justify-between sm:p-5"
    >
      <div className="flex min-w-0 items-start gap-3">
        <span className="flynow-dashboard-error-icon flex size-9 shrink-0 items-center justify-center rounded-[8px] border border-[#F87171]/20 bg-[#3A1B1B] text-[#FCA5A5]">
          <AlertTriangle aria-hidden="true" className="size-4" />
        </span>
        <div className="min-w-0">
          <p className="flynow-dashboard-error-title font-semibold text-[#FECACA]">
            Métricas indisponíveis
          </p>
          <p className="flynow-dashboard-error-message mt-1 leading-5 text-[#FCA5A5]">
            {message}
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={onRetry}
        className="flynow-dashboard-error-action inline-flex h-9 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-[8px] border border-[#F87171]/22 bg-[#3A1B1B] px-3 text-xs font-semibold text-[#FECACA] outline-none transition-colors duration-150 hover:border-[#F87171]/36 hover:bg-[#431F1F] focus-visible:ring-2 focus-visible:ring-[#F87171]/30"
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
      className="flynow-dashboard-warning-state flex flex-col gap-3 rounded-[8px] border border-[#F59E0B]/18 bg-[#1D1609]/70 p-3 text-sm text-[#FCD34D] shadow-[inset_0_1px_0_rgba(255,255,255,0.035)] sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex min-w-0 items-center gap-2.5">
        <AlertTriangle aria-hidden="true" className="size-4 shrink-0" />
        <p className="flynow-dashboard-warning-message min-w-0 text-[13px] leading-5 text-[#F8D88A]">
          Não foi possível atualizar as métricas. Os últimos dados carregados
          continuam visíveis.
        </p>
      </div>
      <button
        type="button"
        onClick={onRetry}
        className="flynow-dashboard-warning-action inline-flex h-8 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-[7px] border border-[#F59E0B]/20 bg-[#2A2112] px-3 text-xs font-semibold text-[#F8D88A] outline-none transition-colors duration-150 hover:border-[#F59E0B]/34 hover:bg-[#332815] focus-visible:ring-2 focus-visible:ring-[#F59E0B]/25"
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
        "flynow-dashboard-empty-state flex min-h-[220px] items-center justify-center rounded-[8px] border border-dashed border-white/[0.08] bg-white/[0.018] px-4 text-center",
        compact && "min-h-[164px]"
      )}
    >
      <div className="max-w-[260px]">
        <span className="flynow-dashboard-empty-icon mx-auto flex size-9 items-center justify-center rounded-[8px] border border-white/[0.07] bg-[#050607] text-[#858A94] shadow-[inset_0_1px_0_rgba(255,255,255,0.035)]">
          <Inbox aria-hidden="true" className="size-4" />
        </span>
        <p className="flynow-dashboard-empty-title mt-3 text-sm font-semibold text-[#F5F2EA]">
          {title}
        </p>
        <p className="flynow-dashboard-empty-description mt-1.5 text-[13px] leading-5 text-[#858A94]">
          {description}
        </p>
      </div>
    </div>
  );
}

function RevenueChartTooltip({
  active,
  isCompact,
  label,
  payload,
}: RevenueChartTooltipProps) {
  if (!active || !payload?.length) {
    return null;
  }

  return (
    <div
      className={cn(
        "flynow-chart-tooltip min-w-[178px] rounded-[8px] border border-[var(--fly-border)] bg-[var(--fly-surface-elevated)] p-2.5 text-xs shadow-[0_18px_44px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur-xl",
        isCompact && "w-[min(216px,calc(100vw-56px))] min-w-0 p-2"
      )}
    >
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--fly-text-muted)] sm:text-[11px]">
        {formatDateLabel(String(label))}
      </p>
      <div className="space-y-1.5">
        {payload.map((item) => {
          const key = String(item.dataKey ?? item.name);
          const isRevenue = key === "faturamento";
          const labelText = isCompact
            ? isRevenue
              ? "Receita"
              : "Mídia"
            : isRevenue
              ? "Faturamento"
              : "Investimento";
          const color = isRevenue
            ? "var(--fly-chart-revenue)"
            : "var(--fly-chart-investment)";

          return (
            <div
              key={key}
              className="flex items-center justify-between gap-4"
            >
              <span className="inline-flex items-center gap-2 text-[var(--fly-text-soft)]">
                <span
                  aria-hidden="true"
                  className="size-1.5 rounded-full"
                  style={{ background: color }}
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

function RevenueChart({ data }: { data: MetricsData["serie_temporal"] }) {
  const isCompact = useCompactViewport();
  const hasChartData = data.length > 0;
  const compactChartTicks = useMemo(() => getCompactChartTicks(data), [data]);

  return (
    <section className="min-w-0 rounded-[8px] border border-white/[0.07] bg-[#0B0D10] p-3 shadow-[0_1px_0_rgba(255,255,255,0.03),inset_0_1px_0_rgba(255,255,255,0.035)] sm:p-5">
      <div className="mb-3 flex flex-col gap-2.5 md:flex-row md:items-start md:justify-between lg:mb-6">
        <SectionHeader
          title="Faturamento vs investimento"
          description="Evolução diária no período selecionado"
        />
        <div className="flynow-chart-legend flex w-full items-center gap-1 rounded-[9px] border border-white/[0.06] bg-white/[0.018] p-1 text-[10px] font-medium text-[#A3A8B1] shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] sm:w-auto sm:justify-start sm:gap-4 sm:bg-[#050607] sm:px-3 sm:py-2 sm:text-xs">
          <span className="inline-flex h-7 min-w-0 flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-[7px] bg-white/[0.025] px-2 sm:h-auto sm:flex-none sm:bg-transparent sm:p-0">
            <span
              aria-hidden="true"
              className="size-1.5 rounded-full bg-[var(--fly-chart-revenue)]"
            />
            Faturamento
          </span>
          <span className="inline-flex h-7 min-w-0 flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-[7px] bg-white/[0.025] px-2 sm:h-auto sm:flex-none sm:bg-transparent sm:p-0">
            <span
              aria-hidden="true"
              className="size-1.5 rounded-full bg-[var(--fly-chart-investment)]"
            />
            Investimento
          </span>
        </div>
      </div>

      {hasChartData ? (
        <div
          role="img"
          aria-label="Gráfico diário comparando faturamento e investimento"
          className="flynow-chart-stage h-[292px] min-w-0 sm:h-[340px] lg:h-[420px]"
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
                    ? { top: 18, right: 18, bottom: 2, left: -4 }
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
                  padding={
                    isCompact ? { left: 2, right: 12 } : { left: 0, right: 0 }
                  }
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
                  content={<RevenueChartTooltip isCompact={isCompact} />}
                  cursor={{
                    stroke: "var(--fly-border-strong)",
                    strokeDasharray: "4 4",
                    strokeWidth: 1,
                  }}
                  position={isCompact ? { x: 50, y: 8 } : undefined}
                  wrapperStyle={{ outline: "none", zIndex: 20 }}
                />
                <Line
                  isAnimationActive={false}
                  type="monotone"
                  dataKey="faturamento"
                  stroke="var(--fly-chart-revenue)"
                  strokeWidth={isCompact ? 2.4 : 2.25}
                  dot={false}
                  activeDot={{
                    r: isCompact ? 3.75 : 4,
                    fill: "var(--fly-chart-revenue-active)",
                    stroke: "var(--fly-surface)",
                  }}
                />
                <Line
                  isAnimationActive={false}
                  type="monotone"
                  dataKey="investimento"
                  stroke="var(--fly-chart-investment)"
                  strokeWidth={isCompact ? 2.15 : 2}
                  dot={false}
                  activeDot={{
                    r: isCompact ? 3.75 : 4,
                    fill: "var(--fly-chart-investment-active)",
                    stroke: "var(--fly-surface)",
                  }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : (
        <EmptyState
          title="Sem dados no período"
          description="O gráfico será exibido assim que houver faturamento ou investimento para comparar."
        />
      )}
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
  onCalendarBeforeOpen,
}: {
  activeRange: string;
  range: { from: Date; to: Date };
  calendarValue: RangeValue | null;
  maxDate: Date;
  calendarCloseSignal: number;
  onSelect: (preset: RangePreset) => void;
  onCalendarChange: (value: RangeValue | null) => void;
  onCalendarBeforeOpen: () => void;
}) {
  return (
    <SystemDateRangeFilter
      activeRange={activeRange}
      appliedLabel={`Período aplicado: ${format(range.from, "dd/MM/yyyy")} - ${format(range.to, "dd/MM/yyyy")}`}
      ariaLabel="Filtro de período"
      calendarCloseSignal={calendarCloseSignal}
      calendarValue={calendarValue}
      maxDate={maxDate}
      onCalendarBeforeOpen={onCalendarBeforeOpen}
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
  const [activeRange, setActiveRange] = useState("30d");
  const [range, setRange] = useState(initialRange);
  const [calendarValue, setCalendarValue] = useState<RangeValue | null>({
    start: initialRange.from,
    end: initialRange.to,
  });
  const [selectedOfferId, setSelectedOfferId] = useState(ALL_OFFERS_KEY);
  const [isOfferSelectOpen, setIsOfferSelectOpen] = useState(false);
  const [calendarCloseSignal, setCalendarCloseSignal] = useState(0);
  const [offerTransitionKey, setOfferTransitionKey] = useState(0);
  const [isOfferTransitioning, setIsOfferTransitioning] = useState(false);
  const offerTransitionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
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

  useEffect(() => {
    if ((status === "success" || status === "empty") && data) {
      setContentVersion(rangeKey);
    }
  }, [data, rangeKey, status]);

  useEffect(() => {
    return () => {
      if (offerTransitionTimeoutRef.current) {
        clearTimeout(offerTransitionTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (
      data &&
      selectedOfferId !== ALL_OFFERS_KEY &&
      !data.ofertas.some((offer) => offer.id === selectedOfferId)
    ) {
      setSelectedOfferId(ALL_OFFERS_KEY);
    }
  }, [data, selectedOfferId]);

  const selectedStageConversions =
    data && selectedOfferId !== ALL_OFFERS_KEY
      ? data.conversoes_etapa_por_oferta?.[selectedOfferId] ??
        data.conversoes_etapa
      : data?.conversoes_etapa;

  const selectedChannelConversions =
    data && selectedOfferId !== ALL_OFFERS_KEY
      ? data.conversoes_canal_por_oferta?.[selectedOfferId] ??
        data.conversoes_canal
      : data?.conversoes_canal;

  const stageMax = selectedStageConversions
    ? Math.max(
        ...Object.values(selectedStageConversions).map(
          (item) => item.receita
        ),
        1
      )
    : 1;

  const channelMax = selectedChannelConversions
    ? Math.max(
        ...Object.values(selectedChannelConversions).map(
          (item: ChannelConversion) => item.receita
        ),
        1
      )
    : 1;

  const selectedOfferLabel = data
    ? getOfferLabel(data.ofertas, selectedOfferId)
    : "Todas as ofertas";
  const conversionsDescription =
    selectedOfferId === ALL_OFFERS_KEY
      ? "Todas as ofertas no período selecionado"
      : `${selectedOfferLabel} no período selecionado`;
  const hasStageData = selectedStageConversions
    ? Object.values(selectedStageConversions).some(
        (item) => item.quantidade > 0 || item.receita > 0
      )
    : false;
  const hasChannelData = selectedChannelConversions
    ? Object.values(selectedChannelConversions).some(
        (item) => item.quantidade > 0 || item.receita > 0
      )
    : false;

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

  const closeOfferSelect = useCallback(() => {
    setIsOfferSelectOpen(false);
  }, []);

  const handleOfferSelectOpenChange = useCallback((open: boolean) => {
    if (open) {
      setCalendarCloseSignal((currentSignal) => currentSignal + 1);
    }

    setIsOfferSelectOpen(open);
  }, []);

  function selectOffer(offerId: string) {
    if (offerId === selectedOfferId) {
      return;
    }

    setSelectedOfferId(offerId);
    setOfferTransitionKey((currentKey) => currentKey + 1);
    setIsOfferTransitioning(true);

    if (offerTransitionTimeoutRef.current) {
      clearTimeout(offerTransitionTimeoutRef.current);
    }

    offerTransitionTimeoutRef.current = setTimeout(() => {
      setIsOfferTransitioning(false);
      offerTransitionTimeoutRef.current = null;
    }, 620);
  }

  return (
    <>
      <DashboardHeader
        title="Central da Operação"
        description="Receita, mídia e conversão em tempo real"
        actions={
          <PeriodActions
            activeRange={activeRange}
            range={range}
            calendarValue={calendarValue}
            maxDate={maxSelectableDate}
            calendarCloseSignal={calendarCloseSignal}
            onSelect={selectPreset}
            onCalendarChange={selectCalendarRange}
            onCalendarBeforeOpen={closeOfferSelect}
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
            description="Altere o período ou a oferta para visualizar as métricas disponíveis."
          />
        ) : null}

        {data && !isEmpty ? (
          <div
            key={contentVersion}
            aria-busy={isRefreshing}
            className={cn(
              "flynow-dashboard-content relative flex flex-col gap-4 sm:gap-5",
              isRefreshing && "flynow-dashboard-content--refreshing"
            )}
          >
            {error ? <RefreshErrorNotice onRetry={retry} /> : null}

            <div
              className="flynow-dashboard-enter-item order-1"
              style={{ "--flynow-enter-delay": "0ms" } as CSSProperties}
            >
              <OverviewPanel data={data} />
            </div>

            <div
              className="flynow-dashboard-enter-item order-2"
              style={{ "--flynow-enter-delay": "90ms" } as CSSProperties}
            >
              <RevenueChart data={data.serie_temporal} />
            </div>

            <div
              className="flynow-dashboard-enter-item order-3"
              style={{ "--flynow-enter-delay": "180ms" } as CSSProperties}
            >
              <div
                aria-busy={isOfferTransitioning}
                className={cn(
                  "flynow-offer-conversions relative space-y-4",
                  isOfferTransitioning &&
                    "flynow-offer-conversions--refreshing"
                )}
              >
                <div className="flex min-w-0 flex-col gap-3 px-1 sm:flex-row sm:items-end sm:justify-between">
                  <SectionHeader
                    title="Conversões por oferta"
                    description={conversionsDescription}
                  />
                  <OfferSelectControl
                    value={selectedOfferId}
                    offers={data.ofertas}
                    open={isOfferSelectOpen}
                    onChange={selectOffer}
                    onOpenChange={handleOfferSelectOpenChange}
                  />
                </div>

                <section
                  key={offerTransitionKey}
                  className="flynow-offer-conversions-grid grid items-start gap-5 xl:grid-cols-2"
                >
                  <ConversionPanel
                    title="Conversão por etapa"
                    description="Frontend, upsell e downsell"
                  >
                    {hasStageData ? (
                      STAGE_LABELS.map((item) => {
                        const conversion =
                          selectedStageConversions?.[item.key] ??
                          data.conversoes_etapa[item.key];

                        return (
                          <ConversionItem
                            key={item.key}
                            label={item.label}
                            quantidade={conversion.quantidade}
                            receita={conversion.receita}
                            taxa={conversion.taxa}
                            percentage={(conversion.receita / stageMax) * 100}
                            accent="neutral"
                          />
                        );
                      })
                    ) : (
                      <EmptyState
                        compact
                        title="Sem conversões por etapa"
                        description="As etapas serão listadas quando houver pedidos no período."
                      />
                    )}
                  </ConversionPanel>

                  <ConversionPanel
                    title="Conversão por canal de recuperação"
                    description="IA, Email, Call Center e SMS"
                  >
                    {hasChannelData ? (
                      CHANNEL_LABELS.map((item) => {
                        const conversion =
                          selectedChannelConversions?.[item.key] ??
                          data.conversoes_canal[item.key];

                        return (
                          <ConversionItem
                            key={item.key}
                            label={item.label}
                            quantidade={conversion.quantidade}
                            receita={conversion.receita}
                            taxa={conversion.taxa}
                            marker={item.marker}
                            percentage={(conversion.receita / channelMax) * 100}
                            accent="blue"
                          />
                        );
                      })
                    ) : (
                      <EmptyState
                        compact
                        title="Sem conversões por canal"
                        description="Os canais serão listados quando houver recuperação no período."
                      />
                    )}
                  </ConversionPanel>
                </section>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </>
  );
}
