"use client";

import { useMemo, useState } from "react";
import {
  BarChart3,
  Banknote,
  Bot,
  CalendarDays,
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
  endOfMonth,
  format,
  startOfMonth,
  subDays,
  subMonths,
} from "date-fns";

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
};

const RANGE_PRESETS: RangePreset[] = [
  {
    key: "today",
    label: "Hoje",
    getRange: () => {
      const today = new Date();
      return { from: today, to: today };
    },
  },
  {
    key: "7d",
    label: "7 dias",
    getRange: () => {
      const today = new Date();
      return { from: subDays(today, 6), to: today };
    },
  },
  {
    key: "30d",
    label: "30 dias",
    getRange: () => {
      const today = new Date();
      return { from: subDays(today, 29), to: today };
    },
  },
  {
    key: "month",
    label: "Este mes",
    getRange: () => {
      const today = new Date();
      return { from: startOfMonth(today), to: today };
    },
  },
  {
    key: "last-month",
    label: "Mes anterior",
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

function KpiCard({ label, value, supportingText, icon, tone = "gold" }: KpiCardProps) {
  const toneClass = {
    gold: "border-[#D6A84F]/25 bg-[#2A2112] text-[#F0C76A]",
    blue: "border-[#60A5FA]/25 bg-[#102033] text-[#93C5FD]",
    green: "border-[#4ADE80]/25 bg-[#10291B] text-[#86EFAC]",
  }[tone];

  return (
    <article className="rounded-lg border border-[#252B33] bg-[#111418] p-5 shadow-[0_18px_60px_rgba(0,0,0,0.22)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.12em] text-[#7D7A73]">
            {label}
          </p>
          <p className="mt-3 text-3xl font-semibold tabular-nums text-[#F5F2EA]">
            {value}
          </p>
        </div>
        <span className={cn("flex size-10 items-center justify-center rounded-lg border", toneClass)}>
          {icon}
        </span>
      </div>
      <p className="mt-4 text-sm text-[#B8B3A7]">{supportingText}</p>
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
}: ConversionCardProps) {
  return (
    <article className="rounded-lg border border-[#252B33] bg-[#111418] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-lg border border-[#D6A84F]/20 bg-[#2A2112] text-[#F0C76A] [&_svg]:size-4">
            {icon}
          </span>
          <div>
            <h3 className="text-sm font-semibold text-[#F5F2EA]">{label}</h3>
            <p className="text-xs text-[#7D7A73]">
              {quantidade.toLocaleString("pt-BR")} conversoes
            </p>
          </div>
        </div>
        {taxa !== undefined ? (
          <span className="rounded-full border border-[#4ADE80]/20 bg-[#10291B] px-2 py-0.5 text-xs font-medium text-[#86EFAC]">
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
            {Math.round(percentage)}%
          </p>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#252B33]">
          <div
            className="h-full rounded-full bg-[#D6A84F]"
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
            className="h-36 animate-pulse rounded-lg border border-[#252B33] bg-[#111418]"
          />
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-3">
        <div className="h-72 animate-pulse rounded-lg border border-[#252B33] bg-[#111418] xl:col-span-2" />
        <div className="h-72 animate-pulse rounded-lg border border-[#252B33] bg-[#111418]" />
      </div>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-[#F87171]/30 bg-[#2B1515] p-5 text-sm text-[#FCA5A5]">
      {message}
    </div>
  );
}

function RevenueChart({ data }: { data: MetricsData["serie_temporal"] }) {
  return (
    <section className="rounded-lg border border-[#252B33] bg-[#111418] p-5">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-[#F5F2EA]">
            Faturamento vs investimento
          </h2>
          <p className="mt-1 text-sm text-[#7D7A73]">
            Evolucao diaria no periodo selecionado
          </p>
        </div>
        <span className="flex size-9 items-center justify-center rounded-lg border border-[#60A5FA]/25 bg-[#102033] text-[#93C5FD]">
          <BarChart3 size={17} />
        </span>
      </div>

      <div className="h-[320px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid stroke="#252B33" strokeDasharray="3 3" vertical={false} />
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
                background: "#0B0D10",
                border: "1px solid #252B33",
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
              strokeWidth={3}
              dot={false}
              activeDot={{ r: 4, fill: "#F0C76A", stroke: "#2A2112" }}
            />
            <Line
              type="monotone"
              dataKey="investimento"
              stroke="#60A5FA"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: "#93C5FD", stroke: "#102033" }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

function ChannelMixChart({ data }: { data: Record<RecoveryChannelKey, ChannelConversion> }) {
  const chartData = CHANNEL_LABELS.map((item) => ({
    name: item.label,
    receita: data[item.key].receita,
  }));

  return (
    <section className="rounded-lg border border-[#252B33] bg-[#111418] p-5">
      <div className="mb-5">
        <h2 className="text-base font-semibold text-[#F5F2EA]">
          Receita por recuperacao
        </h2>
        <p className="mt-1 text-sm text-[#7D7A73]">
          Distribuicao entre IA, email, call center e SMS
        </p>
      </div>

      <div className="h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 8, right: 4, bottom: 0, left: 0 }}>
            <CartesianGrid stroke="#252B33" strokeDasharray="3 3" vertical={false} />
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
                background: "#0B0D10",
                border: "1px solid #252B33",
                borderRadius: 8,
                color: "#F5F2EA",
                fontSize: 12,
              }}
              labelStyle={{ color: "#B8B3A7" }}
            />
            <Area
              type="monotone"
              dataKey="receita"
              stroke="#D6A84F"
              fill="#D6A84F"
              fillOpacity={0.18}
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

export function PerformanceDashboard() {
  const initialRange = useMemo(() => RANGE_PRESETS[2].getRange(), []);
  const [activeRange, setActiveRange] = useState("30d");
  const [range, setRange] = useState(initialRange);
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
    setActiveRange(preset.key);
    setRange(preset.getRange());
  }

  return (
    <div className="px-6 py-6">
      <div className="mb-6 flex flex-col gap-4 rounded-lg border border-[#252B33] bg-[#0B0D10] p-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-lg border border-[#D6A84F]/25 bg-[#2A2112] text-[#F0C76A]">
            <CalendarDays size={18} />
          </span>
          <div>
            <p className="text-sm font-medium text-[#F5F2EA]">
              {format(range.from, "dd/MM/yyyy")} - {format(range.to, "dd/MM/yyyy")}
            </p>
            <p className="text-xs text-[#7D7A73]">
              Dados de performance do periodo selecionado
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {RANGE_PRESETS.map((preset) => {
            const isActive = activeRange === preset.key;

            return (
              <button
                key={preset.key}
                type="button"
                onClick={() => selectPreset(preset)}
                className={cn(
                  "h-8 rounded-lg border px-3 text-sm font-medium transition-colors",
                  isActive
                    ? "border-[#D6A84F]/40 bg-[#2A2112] text-[#F0C76A]"
                    : "border-[#252B33] bg-[#111418] text-[#B8B3A7] hover:bg-[#171B21] hover:text-[#F5F2EA]"
                )}
              >
                {preset.label}
              </button>
            );
          })}
        </div>
      </div>

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
              icon={<Banknote size={18} />}
              tone="gold"
            />
            <KpiCard
              label="Investimento em anuncios"
              value={formatCurrency(data.investimento_total)}
              supportingText="Midia paga aplicada no periodo"
              icon={<Megaphone size={18} />}
              tone="blue"
            />
            <KpiCard
              label="ROAS"
              value={`${data.roas.toLocaleString("pt-BR", {
                minimumFractionDigits: 1,
                maximumFractionDigits: 1,
              })}x`}
              supportingText="Retorno sobre investimento em anuncios"
              icon={<TrendingUp size={18} />}
              tone="green"
            />
          </section>

          <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
            <div className="space-y-4">
              <div>
                <h2 className="text-base font-semibold text-[#F5F2EA]">
                  Conversao por produto
                </h2>
                <p className="mt-1 text-sm text-[#7D7A73]">
                  Receita, quantidade e taxa por etapa comercial
                </p>
              </div>
              <div className="grid gap-4 lg:grid-cols-3">
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
                    />
                  );
                })}
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <h2 className="text-base font-semibold text-[#F5F2EA]">
                  Canais de recuperacao
                </h2>
                <p className="mt-1 text-sm text-[#7D7A73]">
                  Receita recuperada por canal ativo
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
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
                    />
                  );
                })}
              </div>
            </div>
          </section>

          <section className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
            <RevenueChart data={data.serie_temporal} />
            <ChannelMixChart data={data.conversoes_canal} />
          </section>

          <div className="flex items-center gap-2 text-xs text-[#7D7A73]">
            <RefreshCw size={13} />
            <span>Dados mockados para desenvolvimento ate a API final entrar.</span>
          </div>
        </div>
      ) : null}
    </div>
  );
}
