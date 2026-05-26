"use client";

import type { CSSProperties } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BarChart3,
  Banknote,
  Bot,
  Headset,
  Mail,
  Megaphone,
  MessageSquareText,
  PackageCheck,
  RefreshCw,
  ShoppingBag,
  TrendingUp,
} from "lucide-react";
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

type KpiCardProps = {
  label: string;
  value: string;
  supportingText: string;
  icon: React.ReactNode;
  tone?: "gold" | "blue" | "green";
};

type ConversionCardProps = {
  label: string;
  quantidade: number;
  receita: number;
  taxa?: number;
  icon: React.ReactNode;
  percentage: number;
  accent?: "gold" | "blue";
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
  icon: React.ReactNode;
}> = [
  { key: "frontend", label: "Frontend", icon: <ShoppingBag /> },
  { key: "upsell", label: "Upsell", icon: <TrendingUp /> },
  { key: "downsell", label: "Downsell", icon: <PackageCheck /> },
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
    <div>
      <h2 className="text-[15px] font-semibold leading-none text-[#F5F2EA]">
        {title}
      </h2>
      <p className="mt-1.5 text-sm text-[#7D7A73]">{description}</p>
    </div>
  );
}

function KpiCard({
  label,
  value,
  supportingText,
  icon,
  tone = "gold",
}: KpiCardProps) {
  const toneClass = {
    gold: "border-[#D6A84F]/30 text-[#F0C76A]",
    blue: "border-[#60A5FA]/30 text-[#93C5FD]",
    green: "border-[#4ADE80]/30 text-[#86EFAC]",
  }[tone];

  const accentClass = {
    gold: "bg-[#D6A84F]",
    blue: "bg-[#60A5FA]",
    green: "bg-[#4ADE80]",
  }[tone];

  return (
    <article className="group relative overflow-hidden rounded-lg border border-[#242932] bg-[#12151A] p-5 transition-colors duration-150 hover:border-[#303640]">
      <span
        aria-hidden="true"
        className={cn("absolute inset-x-0 top-0 h-px opacity-70", accentClass)}
      />
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#7D7A73]">
            {label}
          </p>
          <p className="mt-2.5 text-[32px] font-semibold leading-none tabular-nums text-[#F5F2EA]">
            {value}
          </p>
        </div>
        <span
          className={cn(
            "flex size-8 shrink-0 items-center justify-center rounded-md border bg-[#0A0A0B] [&_svg]:size-4",
            toneClass
          )}
        >
          {icon}
        </span>
      </div>
      <p className="mt-4 text-sm leading-5 text-[#7D7A73]">{supportingText}</p>
    </article>
  );
}

function ConversionCard({
  label,
  quantidade,
  receita,
  taxa,
  icon,
  percentage,
  accent = "gold",
}: ConversionCardProps) {
  const barClass = accent === "gold" ? "bg-[#D6A84F]" : "bg-[#60A5FA]";

  return (
    <article className="rounded-lg border border-[#242932] bg-[#12151A] p-4 transition-colors duration-150 hover:border-[#303640]">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-md border border-[#242932] bg-[#0A0A0B] text-[#B8B3A7] [&_svg]:size-4">
            {icon}
          </span>
          <div className="min-w-0">
            <h3 className="truncate text-sm font-medium text-[#F5F2EA]">
              {label}
            </h3>
            <p className="text-xs text-[#7D7A73]">
              {quantidade.toLocaleString("pt-BR")} conversoes
            </p>
          </div>
        </div>
        {taxa !== undefined ? (
          <span className="rounded-full border border-[#4ADE80]/20 bg-[#10291B]/70 px-2 py-0.5 text-xs font-medium tabular-nums text-[#86EFAC]">
            {formatPercent(taxa)}
          </span>
        ) : null}
      </div>

      <div className="mt-4">
        <div className="flex items-end justify-between gap-3">
          <p className="text-lg font-semibold tabular-nums text-[#F5F2EA]">
            {formatCurrency(receita)}
          </p>
          <p className="text-xs tabular-nums text-[#7D7A73]">
            {Math.round(percentage)}% do maior
          </p>
        </div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#242932]">
          <div
            className={cn("h-full rounded-full opacity-80", barClass)}
            style={{ width: `${Math.max(percentage, 4)}%` }}
          />
        </div>
      </div>
    </article>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 xl:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className="h-32 animate-pulse rounded-lg border border-[#242932] bg-[#12151A]"
          />
        ))}
      </div>
      <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="h-[430px] animate-pulse rounded-lg border border-[#242932] bg-[#12151A]" />
        <div className="h-[430px] animate-pulse rounded-lg border border-[#242932] bg-[#12151A]" />
      </div>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="rounded-lg border border-[#F87171]/30 bg-[#2B1515] p-5 text-sm text-[#FCA5A5]"
    >
      {message}
    </div>
  );
}

function RevenueChart({ data }: { data: MetricsData["serie_temporal"] }) {
  return (
    <section className="min-w-0 rounded-lg border border-[#242932] bg-[#12151A] p-5">
      <div className="mb-5 flex items-start justify-between gap-4">
        <SectionHeader
          title="Faturamento vs investimento"
          description="Evolucao diaria no periodo selecionado"
        />
        <span className="flex size-8 items-center justify-center rounded-md border border-[#242932] bg-[#0A0A0B] text-[#B8B3A7]">
          <BarChart3 size={16} />
        </span>
      </div>

      <div className="h-[360px] min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
            <CartesianGrid stroke="#242932" strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="data"
              tick={{ fill: "#7D7A73", fontSize: 11 }}
              tickFormatter={formatDateLabel}
              axisLine={false}
              tickLine={false}
              minTickGap={24}
            />
            <YAxis
              tick={{ fill: "#7D7A73", fontSize: 11 }}
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
                background: "#0A0A0B",
                border: "1px solid #242932",
                borderRadius: 8,
                color: "#F5F2EA",
                fontSize: 12,
              }}
              labelStyle={{ color: "#B8B3A7" }}
            />
            <Line
              type="monotone"
              dataKey="faturamento"
              stroke="#D6A84F"
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 4, fill: "#F0C76A", stroke: "#0A0A0B" }}
            />
            <Line
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
    </section>
  );
}

function ChannelMixChart({
  data,
}: {
  data: Record<RecoveryChannelKey, ChannelConversion>;
}) {
  const chartData = CHANNEL_LABELS.map((item) => ({
    name: item.label,
    receita: data[item.key].receita,
  }));

  return (
    <section className="min-w-0 rounded-lg border border-[#242932] bg-[#12151A] p-5">
      <div className="mb-5">
        <SectionHeader
          title="Receita por recuperacao"
          description="Distribuicao entre canais ativos"
        />
      </div>

      <div className="h-[248px] min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 8, right: 4, bottom: 0, left: 0 }}>
            <CartesianGrid stroke="#242932" strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="name"
              tick={{ fill: "#7D7A73", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: "#7D7A73", fontSize: 11 }}
              tickFormatter={(value) => compactCurrency(Number(value))}
              axisLine={false}
              tickLine={false}
              width={64}
            />
            <Tooltip
              formatter={(value) => [formatCurrency(Number(value)), "Receita"]}
              contentStyle={{
                background: "#0A0A0B",
                border: "1px solid #242932",
                borderRadius: 8,
                color: "#F5F2EA",
                fontSize: 12,
              }}
              labelStyle={{ color: "#B8B3A7" }}
            />
            <Area
              type="monotone"
              dataKey="receita"
              stroke="#60A5FA"
              fill="#60A5FA"
              fillOpacity={0.14}
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
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
  const [activeRange, setActiveRange] = useState("30d");
  const [range, setRange] = useState(initialRange);
  const [calendarValue, setCalendarValue] = useState<RangeValue | null>({
    start: initialRange.from,
    end: initialRange.to,
  });
  const { data, loading, error } = useMetrics(range.from, range.to);

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

      <div className="px-6 py-6">
        {loading ? <DashboardSkeleton /> : null}

        {!loading && error ? (
          <ErrorState message="Nao foi possivel carregar as metricas. Tente novamente em alguns instantes." />
        ) : null}

        {!loading && !error && data ? (
          <div className="space-y-6">
            <section className="grid gap-4 xl:grid-cols-3">
              <KpiCard
                label="Faturamento total"
                value={formatCurrency(data.faturamento_total)}
                supportingText="Receita consolidada no periodo"
                icon={<Banknote />}
                tone="gold"
              />
              <KpiCard
                label="Investimento em anuncios"
                value={formatCurrency(data.investimento_total)}
                supportingText="Midia paga aplicada no periodo"
                icon={<Megaphone />}
                tone="blue"
              />
              <KpiCard
                label="ROAS"
                value={`${data.roas.toLocaleString("pt-BR", {
                  minimumFractionDigits: 1,
                  maximumFractionDigits: 1,
                })}x`}
                supportingText="Retorno sobre investimento em anuncios"
                icon={<TrendingUp />}
                tone="green"
              />
            </section>

            <section className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
              <RevenueChart data={data.serie_temporal} />
              <ChannelMixChart data={data.conversoes_canal} />
            </section>

            <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
              <div className="space-y-4">
                <SectionHeader
                  title="Conversao por produto"
                  description="Receita, quantidade e taxa por etapa comercial"
                />
                <div className="grid gap-3 lg:grid-cols-3">
                  {PRODUCT_LABELS.map((item) => {
                    const conversion = data.conversoes_produto[item.key];

                    return (
                      <ConversionCard
                        key={item.key}
                        label={item.label}
                        quantidade={conversion.quantidade}
                        receita={conversion.receita}
                        taxa={conversion.taxa}
                        icon={item.icon}
                        percentage={(conversion.receita / productMax) * 100}
                        accent="gold"
                      />
                    );
                  })}
                </div>
              </div>

              <div className="space-y-4">
                <SectionHeader
                  title="Canais de recuperacao"
                  description="Receita recuperada por canal ativo"
                />
                <div className="grid gap-3 sm:grid-cols-2">
                  {CHANNEL_LABELS.map((item) => {
                    const conversion = data.conversoes_canal[item.key];

                    return (
                      <ConversionCard
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
                </div>
              </div>
            </section>

            <div className="flex items-center gap-2 text-xs text-[#7D7A73]">
              <RefreshCw size={13} />
              <span>Dados mockados para desenvolvimento ate a API final entrar.</span>
            </div>
          </div>
        ) : null}
      </div>
    </>
  );
}
