"use client";

import type { CSSProperties } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Bot,
  Headset,
  Mail,
  MessageSquareText,
} from "lucide-react";
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
  ProductConversion,
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
  taxa?: number;
  icon?: React.ReactNode;
  percentage: number;
  accent?: "neutral" | "blue";
};

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

const PRODUCT_LABELS: Array<{
  key: keyof MetricsData["conversoes_produto"];
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
        <p className="mt-1.5 text-sm leading-5 text-[#858A94]">
          {description}
        </p>
      </div>
    </div>
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
      <div className="flex items-center gap-2">
        <span
          aria-hidden="true"
          className={cn("size-1.5 rounded-full", dotClass)}
        />
        <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#858A94]">
          {label}
        </p>
      </div>
      <p className="mt-3 text-[30px] font-semibold leading-none tracking-normal tabular-nums text-[#F5F2EA] md:text-[32px]">
        {value}
      </p>
      <p className="mt-3 max-w-[28ch] text-[13px] leading-5 text-[#8B9099]">
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
      <div className="flex flex-col gap-1 border-b border-white/[0.06] px-5 py-4">
        <h2 className="text-[15px] font-semibold leading-none text-[#F5F2EA]">
          Visão geral
        </h2>
        <p className="text-sm leading-5 text-[#858A94]">
          Resumo do período selecionado
        </p>
      </div>

      <div className="grid md:grid-cols-3">
        {metrics.map((metric, index) => (
          <div
            key={metric.label}
            className={cn(
              "px-5 py-5",
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
    <div className="rounded-[7px] border border-white/[0.055] bg-white/[0.018] px-3.5 py-3 transition-colors duration-200 hover:border-white/[0.1] hover:bg-white/[0.035]">
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
        {taxa !== undefined ? (
          <span className="rounded-md border border-[#4ADE80]/16 bg-[#0D1F14]/80 px-2 py-0.5 text-xs font-medium tabular-nums text-[#86EFAC]">
            {formatPercent(taxa)}
          </span>
        ) : null}
      </div>

      <div className="mt-3">
        <div className="flex items-end justify-between gap-3">
          <p className="text-[16px] font-semibold leading-none tabular-nums text-[#F5F2EA]">
            {formatCurrency(receita)}
          </p>
          <p className="text-xs tabular-nums text-[#858A94]">
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
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[8px] border border-white/[0.07] bg-[#0B0D10] p-4 shadow-[0_1px_0_rgba(255,255,255,0.03),inset_0_1px_0_rgba(255,255,255,0.035)]">
      <SectionHeader title={title} description={description} />
      <div className="mt-4 space-y-2.5">{children}</div>
    </section>
  );
}

function DashboardSkeleton() {
  return (
    <div className="flynow-dashboard-skeleton space-y-5">
      <div className="flynow-dashboard-skeleton-panel h-[214px] rounded-[8px] border border-white/[0.06] bg-[#0D0F12]" />

      <div className="flynow-dashboard-skeleton-panel h-[520px] rounded-[8px] border border-white/[0.06] bg-[#0D0F12]" />

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
  return (
    <section className="min-w-0 rounded-[8px] border border-white/[0.07] bg-[#0B0D10] p-5 shadow-[0_1px_0_rgba(255,255,255,0.03),inset_0_1px_0_rgba(255,255,255,0.035)]">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <SectionHeader
          title="Faturamento vs investimento"
          description="Evolução diária no período selecionado"
        />
        <div className="flex items-center gap-4 rounded-md border border-white/[0.06] bg-[#050607] px-3 py-2 text-xs text-[#A3A8B1] shadow-[inset_0_1px_0_rgba(255,255,255,0.035)]">
          <span className="inline-flex items-center gap-2 whitespace-nowrap">
            <span className="size-1.5 rounded-full bg-[#D6A84F]" />
            Faturamento
          </span>
          <span className="inline-flex items-center gap-2 whitespace-nowrap">
            <span className="size-1.5 rounded-full bg-[#60A5FA]" />
            Investimento
          </span>
        </div>
      </div>

      <div className="flynow-chart-stage h-[420px] min-w-0">
        <div className="flynow-chart-plot h-full min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={data}
              margin={{ top: 8, right: 12, bottom: 0, left: 0 }}
            >
              <CartesianGrid
                stroke="rgba(255,255,255,0.065)"
                strokeDasharray="3 3"
                vertical={false}
              />
              <XAxis
                dataKey="data"
                tick={{ fill: "#858A94", fontSize: 11 }}
                tickFormatter={formatDateLabel}
                axisLine={false}
                tickLine={false}
                minTickGap={24}
              />
              <YAxis
                tick={{ fill: "#858A94", fontSize: 11 }}
                tickFormatter={(value) => compactCurrency(Number(value))}
                axisLine={false}
                tickLine={false}
                width={72}
              />
              <Tooltip
                formatter={(value, name) => [
                  formatCurrency(Number(value)),
                  name === "faturamento" ? "Faturamento" : "Investimento",
                ]}
                labelFormatter={(value) => formatDateLabel(String(value))}
                contentStyle={{
                  background: "rgba(5,6,7,0.96)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 8,
                  color: "#F5F2EA",
                  fontSize: 12,
                  boxShadow: "0 18px 44px rgba(0,0,0,0.45)",
                }}
                labelStyle={{ color: "#A3A8B1" }}
              />
              <Line
                isAnimationActive={false}
                type="monotone"
                dataKey="faturamento"
                stroke="#D6A84F"
                strokeWidth={2.25}
                dot={false}
                activeDot={{ r: 4, fill: "#F0C76A", stroke: "#0A0A0B" }}
              />
              <Line
                isAnimationActive={false}
                type="monotone"
                dataKey="investimento"
                stroke="#60A5FA"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: "#93C5FD", stroke: "#0A0A0B" }}
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
  onSelect,
  onCalendarChange,
}: {
  activeRange: string;
  range: { from: Date; to: Date };
  calendarValue: RangeValue | null;
  maxDate: Date;
  onSelect: (preset: RangePreset) => void;
  onCalendarChange: (value: RangeValue | null) => void;
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

    const groupRect = group.getBoundingClientRect();
    const buttonRect = activeButton.getBoundingClientRect();
    const nextUnderline = {
      x: buttonRect.left - groupRect.left + 8,
      y: buttonRect.bottom - groupRect.top - 5,
      width: Math.max(buttonRect.width - 16, 12),
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
      resizeObserver?.disconnect();
    };
  }, [activePreset, updatePresetUnderline]);

  const presetUnderlineStyle = {
    "--flynow-preset-underline-x": `${presetUnderline.x}px`,
    "--flynow-preset-underline-y": `${presetUnderline.y}px`,
    "--flynow-preset-underline-width": `${presetUnderline.width}px`,
  } as CSSProperties;

  return (
    <div className="flex w-full flex-col items-start gap-2 xl:w-auto xl:items-end">
      <div
        role="group"
        aria-label="Filtro de período"
        className="flex w-full max-w-full flex-col gap-1.5 rounded-2xl border border-[#1D2026] bg-[#08090B] p-1.5 shadow-[0_18px_42px_rgba(0,0,0,0.28),inset_0_1px_0_rgba(255,255,255,0.035)] xl:w-auto xl:flex-row xl:items-center"
      >
        <div className="flynow-date-picker dark w-full xl:w-auto">
          <Calendar
            value={calendarValue}
            onChange={onCalendarChange}
            horizontalLayout
            showTimeInput={false}
            maxValue={maxDate}
            popoverAlignment="end"
            triggerActive={isCustomRange}
            className="w-full xl:w-auto"
            triggerClassName={cn(
              "!h-8 !w-full xl:!w-[236px] !rounded-xl !bg-[#0E1014] !px-2.5 !text-xs !font-medium !shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] hover:!bg-[#121418]",
              isCustomRange
                ? "!border-[#D6A84F]/45 !text-[#F5F2EA] !shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_8px_24px_rgba(214,168,79,0.08)]"
                : "!border-[#242932] !text-[#A3A6AE]"
            )}
            popoverClassName="!z-50 !border-[#D6A84F]/20 !bg-[#08090B]/62"
          />
        </div>

        <div
          aria-hidden="true"
          className="hidden h-5 w-px bg-[#20242B] xl:block"
        />

        <div
          ref={presetGroupRef}
          role="group"
          aria-label="Selecionar período"
          className="relative grid w-full grid-cols-2 gap-1 md:grid-cols-5 xl:flex xl:w-auto xl:items-center"
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
                  "relative h-8 whitespace-nowrap rounded-[10px] px-3 text-xs font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D6A84F]/35 xl:min-w-10",
                  isActive
                    ? "bg-[#17191E] text-[#F5F2EA] shadow-[0_1px_0_rgba(255,255,255,0.05),0_10px_24px_rgba(0,0,0,0.28)]"
                    : "text-[#858A94] hover:bg-[#111318] hover:text-[#DADDE2]"
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

  const productMax = data
    ? Math.max(
        ...Object.values(data.conversoes_produto).map(
          (item: ProductConversion) => item.receita
        ),
        1
      )
    : 1;

  const channelMax = data
    ? Math.max(
        ...Object.values(data.conversoes_canal).map(
          (item: ChannelConversion) => item.receita
        ),
        1
      )
    : 1;

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
            onSelect={selectPreset}
            onCalendarChange={selectCalendarRange}
          />
        }
      />

      <div className="px-6 pb-10 pt-6">
        {isInitialLoading ? <DashboardSkeleton /> : null}

        {!isInitialLoading && error ? (
          <ErrorState message="Não foi possível carregar as métricas. Tente novamente em alguns instantes." />
        ) : null}

        {!error && data ? (
          <div
            key={contentVersion}
            aria-busy={loading}
            className={cn(
              "flynow-dashboard-content relative space-y-5",
              loading && "flynow-dashboard-content--refreshing"
            )}
          >
            <div
              className="flynow-dashboard-enter-item"
              style={{ "--flynow-enter-delay": "0ms" } as CSSProperties}
            >
              <OverviewPanel data={data} />
            </div>

            <div
              className="flynow-dashboard-enter-item"
              style={{ "--flynow-enter-delay": "90ms" } as CSSProperties}
            >
              <RevenueChart data={data.serie_temporal} />
            </div>

            <div
              className="flynow-dashboard-enter-item"
              style={{ "--flynow-enter-delay": "180ms" } as CSSProperties}
            >
              <section className="grid items-start gap-5 xl:grid-cols-2">
                <ConversionPanel
                  title="Conversão por produto"
                  description="Frontend, upsell e downsell no período selecionado"
                >
                  {PRODUCT_LABELS.map((item) => {
                    const conversion = data.conversoes_produto[item.key];

                    return (
                      <ConversionItem
                        key={item.key}
                        label={item.label}
                        quantidade={conversion.quantidade}
                        receita={conversion.receita}
                        taxa={conversion.taxa}
                        percentage={(conversion.receita / productMax) * 100}
                        accent="neutral"
                      />
                    );
                  })}
                </ConversionPanel>

                <ConversionPanel
                  title="Conversão por canal de recuperação"
                  description="IA, Email, Call Center e SMS no período selecionado"
                >
                  {CHANNEL_LABELS.map((item) => {
                    const conversion = data.conversoes_canal[item.key];

                    return (
                      <ConversionItem
                        key={item.key}
                        label={item.label}
                        quantidade={conversion.quantidade}
                        receita={conversion.receita}
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
        ) : null}
      </div>
    </>
  );
}
