"use client";

import type { CSSProperties } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Bot,
  Check,
  ChevronDown,
  Headset,
  Mail,
  MessageSquareText,
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
import { Calendar, type RangeValue } from "@/components/ui/calendar";
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
  icon?: React.ReactNode;
  percentage: number;
  accent?: "neutral" | "blue";
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
  icon: React.ReactNode;
}> = [
  { key: "ia_recuperacao", label: "IA", icon: <Bot /> },
  { key: "email", label: "Email", icon: <Mail /> },
  { key: "call_center", label: "Call Center", icon: <Headset /> },
  { key: "sms", label: "SMS", icon: <MessageSquareText /> },
];

function compactCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

function formatDateLabel(value: string) {
  return new Date(`${value}T12:00:00`).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  });
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
  icon,
  percentage,
  accent = "neutral",
}: ConversionItemProps) {
  const barClass =
    accent === "blue"
      ? "bg-gradient-to-r from-[#2563EB] to-[#93C5FD]"
      : "bg-gradient-to-r from-white/30 to-white/55";
  const iconClass =
    accent === "blue"
      ? "border-[#60A5FA]/18 text-[#93C5FD]"
      : "border-white/[0.08] text-[#A3A8B1]";

  return (
    <div className="min-w-0 rounded-[7px] border border-white/[0.055] bg-white/[0.018] px-3 py-2.5 transition-colors duration-200 hover:border-white/[0.1] hover:bg-white/[0.035] sm:px-3.5 sm:py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          {icon ? (
            <span
              className={cn(
                "flex size-7 shrink-0 items-center justify-center rounded-[6px] border bg-[#050607] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] [&_svg]:size-3.5",
                iconClass
              )}
            >
              {icon}
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
    <div className="flynow-dashboard-skeleton space-y-5">
      <div className="flynow-dashboard-skeleton-panel h-[288px] rounded-[8px] border border-white/[0.06] bg-[#0D0F12] md:h-[214px]" />

      <div className="flynow-dashboard-skeleton-panel h-[420px] rounded-[8px] border border-white/[0.06] bg-[#0D0F12] sm:h-[470px] lg:h-[520px]" />

      <div className="grid items-start gap-5 xl:grid-cols-2">
        {Array.from({ length: 2 }).map((_, index) => (
          <div
            key={index}
            className="flynow-dashboard-skeleton-panel h-[316px] rounded-[8px] border border-white/[0.06] bg-[#0D0F12]"
          />
        ))}
      </div>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="rounded-[8px] border border-[#F87171]/30 bg-[#2B1515] p-5 text-sm text-[#FCA5A5]"
    >
      {message}
    </div>
  );
}

function RevenueChart({ data }: { data: MetricsData["serie_temporal"] }) {
  const isCompact = useCompactViewport();

  return (
    <section className="min-w-0 rounded-[8px] border border-white/[0.07] bg-[#0B0D10] p-3.5 shadow-[0_1px_0_rgba(255,255,255,0.03),inset_0_1px_0_rgba(255,255,255,0.035)] sm:p-5">
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between lg:mb-6">
        <SectionHeader
          title="Faturamento vs investimento"
          description="Evolução diária no período selecionado"
        />
        <div className="flex w-full flex-wrap items-center justify-between gap-2 rounded-md border border-white/[0.06] bg-[#050607] px-2.5 py-1.5 text-[11px] text-[#A3A8B1] shadow-[inset_0_1px_0_rgba(255,255,255,0.035)] sm:w-auto sm:justify-start sm:gap-4 sm:px-3 sm:py-2 sm:text-xs">
          <span className="inline-flex items-center gap-2 whitespace-nowrap">
            <span className="size-1.5 rounded-full bg-[var(--fly-chart-revenue)]" />
            Faturamento
          </span>
          <span className="inline-flex items-center gap-2 whitespace-nowrap">
            <span className="size-1.5 rounded-full bg-[var(--fly-chart-investment)]" />
            Investimento
          </span>
        </div>
      </div>

      <div className="flynow-chart-stage h-[230px] min-w-0 sm:h-[340px] lg:h-[420px]">
        <div className="flynow-chart-plot h-full min-w-0">
          <ResponsiveContainer
            width="100%"
            height="100%"
            minWidth={1}
            minHeight={isCompact ? 180 : 240}
            initialDimension={{ width: 640, height: 320 }}
          >
            <LineChart
              data={data}
              margin={
                isCompact
                  ? { top: 8, right: 2, bottom: 0, left: -6 }
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
                minTickGap={isCompact ? 16 : 24}
              />
              <YAxis
                tick={{
                  fill: "var(--fly-text-muted)",
                  fontSize: isCompact ? 10 : 11,
                }}
                tickFormatter={(value) => compactCurrency(Number(value))}
                axisLine={false}
                tickLine={false}
                width={isCompact ? 52 : 72}
              />
              <Tooltip
                formatter={(value, name) => [
                  formatCurrency(Number(value)),
                  name === "faturamento" ? "Faturamento" : "Investimento",
                ]}
                labelFormatter={(value) => formatDateLabel(String(value))}
                contentStyle={{
                  background: "var(--fly-surface-elevated)",
                  border: "1px solid var(--fly-border)",
                  borderRadius: 8,
                  color: "var(--fly-text)",
                  fontSize: 12,
                  boxShadow: "0 18px 44px rgba(0,0,0,0.45)",
                }}
                labelStyle={{ color: "var(--fly-text-soft)" }}
              />
              <Line
                isAnimationActive={false}
                type="monotone"
                dataKey="faturamento"
                stroke="var(--fly-chart-revenue)"
                strokeWidth={2.25}
                dot={false}
                activeDot={{
                  r: 4,
                  fill: "var(--fly-chart-revenue-active)",
                  stroke: "var(--fly-surface)",
                }}
              />
              <Line
                isAnimationActive={false}
                type="monotone"
                dataKey="investimento"
                stroke="var(--fly-chart-investment)"
                strokeWidth={2}
                dot={false}
                activeDot={{
                  r: 4,
                  fill: "var(--fly-chart-investment-active)",
                  stroke: "var(--fly-surface)",
                }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
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
  const presetGroupRef = useRef<HTMLDivElement | null>(null);
  const presetButtonRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const activePreset = RANGE_PRESETS.find((preset) => preset.key === activeRange);
  const isCustomRange =
    activeRange === "custom" && Boolean(calendarValue?.start && calendarValue.end);
  const [presetUnderline, setPresetUnderline] = useState({
    x: 0,
    y: 0,
    width: 0,
    visible: false,
  });

  const updatePresetUnderline = useCallback(() => {
    const group = presetGroupRef.current;
    const activeButton = activePreset
      ? presetButtonRefs.current[activePreset.key]
      : null;

    if (!group || !activeButton) {
      setPresetUnderline((currentUnderline) =>
        currentUnderline.visible
          ? { ...currentUnderline, visible: false }
          : currentUnderline
      );
      return;
    }

    const nextUnderline = {
      x: activeButton.offsetLeft + 8,
      y: activeButton.offsetTop + activeButton.offsetHeight - 5,
      width: Math.max(activeButton.offsetWidth - 16, 12),
      visible: true,
    };

    setPresetUnderline((currentUnderline) => {
      if (
        currentUnderline.visible === nextUnderline.visible &&
        Math.abs(currentUnderline.x - nextUnderline.x) < 0.5 &&
        Math.abs(currentUnderline.y - nextUnderline.y) < 0.5 &&
        Math.abs(currentUnderline.width - nextUnderline.width) < 0.5
      ) {
        return currentUnderline;
      }

      return nextUnderline;
    });
  }, [activePreset]);

  useEffect(() => {
    const animationFrame = window.requestAnimationFrame(updatePresetUnderline);

    return () => window.cancelAnimationFrame(animationFrame);
  }, [updatePresetUnderline]);

  useEffect(() => {
    const group = presetGroupRef.current;

    if (!group) {
      return;
    }

    const handleResize = () => updatePresetUnderline();
    window.addEventListener("resize", handleResize);
    group.addEventListener("scroll", handleResize, { passive: true });

    const resizeObserver =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(updatePresetUnderline)
        : null;

    resizeObserver?.observe(group);

    if (activePreset) {
      const activeButton = presetButtonRefs.current[activePreset.key];

      if (activeButton) {
        resizeObserver?.observe(activeButton);
      }
    }

    return () => {
      window.removeEventListener("resize", handleResize);
      group.removeEventListener("scroll", handleResize);
      resizeObserver?.disconnect();
    };
  }, [activePreset, updatePresetUnderline]);

  const presetUnderlineStyle = {
    "--flynow-preset-underline-x": `${presetUnderline.x}px`,
    "--flynow-preset-underline-y": `${presetUnderline.y}px`,
    "--flynow-preset-underline-width": `${presetUnderline.width}px`,
  } as CSSProperties;

  return (
    <div className="contents lg:flex lg:w-auto lg:min-w-0 lg:flex-col lg:items-end lg:gap-2">
      <div
        role="group"
        aria-label="Filtro de período"
        className="flynow-period-filter contents lg:flex lg:w-auto lg:max-w-full lg:flex-row lg:items-center lg:gap-1.5 lg:rounded-[14px] lg:border lg:border-[var(--fly-border)] lg:bg-[var(--fly-surface-elevated)] lg:p-1.5 lg:shadow-[0_18px_42px_rgba(0,0,0,0.28),inset_0_1px_0_rgba(255,255,255,0.035)]"
      >
        <div className="flynow-date-picker dark col-start-2 row-start-1 justify-self-end self-center lg:col-auto lg:row-auto lg:w-auto">
          <Calendar
            value={calendarValue}
            onChange={onCalendarChange}
            horizontalLayout
            showTimeInput={false}
            maxValue={maxDate}
            popoverAlignment="end"
            triggerActive={isCustomRange}
            closeSignal={calendarCloseSignal}
            onBeforeOpen={onCalendarBeforeOpen}
            compactMobileLabel
            className="w-auto lg:w-auto"
            triggerClassName={cn(
              "!h-10 !w-[140px] !rounded-xl !border-[var(--fly-border)] !bg-[var(--fly-control)] !px-3 !text-[11px] !font-medium !text-[var(--fly-text-soft)] !shadow-[inset_0_1px_0_rgba(255,255,255,0.035)] hover:!border-[var(--fly-border-strong)] hover:!bg-[var(--fly-control-hover)] sm:!h-8 sm:!w-[236px] sm:!rounded-full sm:!px-2.5 lg:!rounded-xl lg:!border-[var(--fly-border-strong)] lg:!bg-[var(--fly-control-solid)] lg:!text-xs lg:!shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] lg:hover:!bg-[var(--fly-control-hover)]",
              isCustomRange
                ? "!border-[var(--fly-brand-border)] !text-[var(--fly-text)] !shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_8px_24px_rgba(214,168,79,0.08)]"
                : "lg:!text-[var(--fly-text-soft)]"
            )}
            popoverClassName="!z-50 !border-[var(--fly-brand-border)] !bg-[var(--fly-surface-elevated)]"
          />
        </div>

        <div
          aria-hidden="true"
          className="hidden h-5 w-px bg-[var(--fly-border)] lg:block"
        />

        <div
          ref={presetGroupRef}
          role="group"
          aria-label="Selecionar período"
          className="flynow-period-presets relative col-span-2 row-start-2 -mx-4 flex max-w-[calc(100vw-1px)] gap-1 overflow-x-auto overscroll-x-contain px-4 pb-1 pt-0.5 sm:-mx-5 sm:px-5 md:mx-0 md:grid md:w-full md:max-w-full md:grid-cols-5 md:overflow-visible md:px-0 md:pb-0 lg:col-auto lg:row-auto lg:flex lg:w-auto lg:items-center"
        >
          <span
            aria-hidden="true"
            className="flynow-preset-underline"
            data-visible={presetUnderline.visible ? "true" : "false"}
            style={presetUnderlineStyle}
          />
          {RANGE_PRESETS.map((preset) => {
            const isActive = activeRange === preset.key;

            return (
              <button
                key={preset.key}
                ref={(element) => {
                  presetButtonRefs.current[preset.key] = element;
                }}
                type="button"
                title={preset.label}
                aria-label={preset.label}
                aria-pressed={isActive}
                onClick={() => onSelect(preset)}
                className={cn(
                  "relative h-10 shrink-0 whitespace-nowrap rounded-xl px-3.5 text-xs font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D6A84F]/35 sm:h-8 sm:rounded-[10px] sm:px-3 md:shrink lg:min-w-10",
                  isActive
                    ? "bg-[var(--fly-control)] text-[var(--fly-text)] shadow-[inset_0_1px_0_rgba(255,255,255,0.025)] lg:bg-[var(--fly-control-active)] lg:shadow-[0_1px_0_rgba(255,255,255,0.05),0_10px_24px_rgba(0,0,0,0.28)]"
                    : "text-[var(--fly-text-muted)] hover:bg-[var(--fly-control)] hover:text-[var(--fly-text-soft)] lg:hover:bg-[var(--fly-control-solid)]"
                )}
              >
                {preset.displayLabel}
              </button>
            );
          })}
        </div>
      </div>
      <span className="sr-only">
        Período aplicado: {format(range.from, "dd/MM/yyyy")} -{" "}
        {format(range.to, "dd/MM/yyyy")}
      </span>
    </div>
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
  const { data, loading, error } = useMetrics(range.from, range.to);
  const rangeKey = useMemo(
    () => `${format(range.from, "yyyy-MM-dd")}:${format(range.to, "yyyy-MM-dd")}`,
    [range]
  );
  const [contentVersion, setContentVersion] = useState(initialRangeKey);
  const isInitialLoading = loading && !data;

  useEffect(() => {
    if (!loading && data) {
      setContentVersion(rangeKey);
    }
  }, [data, loading, rangeKey]);

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

        {!isInitialLoading && error ? (
          <ErrorState message="Não foi possível carregar as métricas. Tente novamente em alguns instantes." />
        ) : null}

        {!error && data ? (
          <div
            key={contentVersion}
            aria-busy={loading}
            className={cn(
              "flynow-dashboard-content relative flex flex-col gap-4 sm:gap-5",
              loading && "flynow-dashboard-content--refreshing"
            )}
          >
            <div
              className="flynow-dashboard-enter-item order-1"
              style={{ "--flynow-enter-delay": "0ms" } as CSSProperties}
            >
              <OverviewPanel data={data} />
            </div>

            <div
              className="flynow-dashboard-enter-item order-3 lg:order-2"
              style={{ "--flynow-enter-delay": "90ms" } as CSSProperties}
            >
              <RevenueChart data={data.serie_temporal} />
            </div>

            <div
              className="flynow-dashboard-enter-item order-2 lg:order-3"
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
                    {STAGE_LABELS.map((item) => {
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
                    })}
                  </ConversionPanel>

                  <ConversionPanel
                    title="Conversão por canal de recuperação"
                    description="IA, Email, Call Center e SMS"
                  >
                    {CHANNEL_LABELS.map((item) => {
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
                          icon={item.icon}
                          percentage={(conversion.receita / channelMax) * 100}
                          accent="blue"
                        />
                      );
                    })}
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
