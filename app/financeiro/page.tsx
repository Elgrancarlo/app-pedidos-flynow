import Link from "next/link";

import Shell from "@/components/layout/shell";
import { DashboardHeader } from "@/components/layout/dashboard-header";
import {
  PageBody,
  StatCard,
  StatGrid,
  StatusPill,
} from "@/components/workspace/operational-ui";
import { getTodayInAppTimezone, shiftDateString } from "@/lib/app-dates";
import {
  getDefaultFinanceiroRange,
  getFinanceiroPageData,
  type FinanceiroRange,
} from "@/lib/financeiro";
import { formatCurrency, formatPercent } from "@/lib/utils";

export const dynamic = "force-dynamic";

const PERIOD_PRESETS = [
  {
    key: "today",
    label: "Hoje",
    getRange: () => {
      const today = getTodayInAppTimezone();
      return { startDate: today, endDate: today };
    },
  },
  {
    key: "7d",
    label: "7 dias",
    getRange: () => {
      const today = getTodayInAppTimezone();
      return { startDate: shiftDateString(today, -6), endDate: today };
    },
  },
  {
    key: "15d",
    label: "15 dias",
    getRange: () => {
      const today = getTodayInAppTimezone();
      return { startDate: shiftDateString(today, -14), endDate: today };
    },
  },
  {
    key: "30d",
    label: "30 dias",
    getRange: () => {
      const today = getTodayInAppTimezone();
      return { startDate: shiftDateString(today, -29), endDate: today };
    },
  },
  {
    key: "month",
    label: "Este mês",
    getRange: () => {
      const today = getTodayInAppTimezone();
      return { startDate: today.slice(0, 8) + "01", endDate: today };
    },
  },
] satisfies Array<{
  key: string;
  label: string;
  getRange: () => FinanceiroRange;
}>;

function resolveRange(params: { startDate?: string; endDate?: string }) {
  const defaults = getDefaultFinanceiroRange(1);
  const startDate = params.startDate ?? defaults.startDate;
  const endDate = params.endDate ?? defaults.endDate;

  return startDate <= endDate
    ? ({ startDate, endDate } satisfies FinanceiroRange)
    : ({ startDate: endDate, endDate: startDate } satisfies FinanceiroRange);
}

function formatDateLong(value: string) {
  return new Date(`${value}T12:00:00`).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    weekday: "short",
    year: "numeric",
  });
}

function presetHref(range: FinanceiroRange) {
  return `/financeiro?startDate=${range.startDate}&endDate=${range.endDate}`;
}

function getActivePreset(range: FinanceiroRange) {
  return PERIOD_PRESETS.find((preset) => {
    const presetRange = preset.getRange();
    return (
      presetRange.startDate === range.startDate &&
      presetRange.endDate === range.endDate
    );
  })?.key;
}

function ModeBadge({ source }: { source: "mock" | "real" }) {
  return (
    <StatusPill tone={source === "real" ? "green" : "gold"}>
      {source === "real" ? "Dados reais" : "Mock ativo"}
    </StatusPill>
  );
}

function PeriodFilter({ range }: { range: FinanceiroRange }) {
  const activePreset = getActivePreset(range);

  return (
    <section className="flynow-dashboard-enter-item rounded-[8px] border border-white/[0.07] bg-[#0B0D10] p-3 shadow-[0_1px_0_rgba(255,255,255,0.03),inset_0_1px_0_rgba(255,255,255,0.035)] sm:p-4">
      <form
        action="/financeiro"
        className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between"
      >
        <div className="flex min-w-0 flex-col gap-2 lg:flex-row lg:items-center">
          <span className="text-xs font-medium text-[var(--fly-text-muted)]">
            Período
          </span>
          <div className="flex max-w-full gap-1 overflow-x-auto pb-1 lg:pb-0">
            {PERIOD_PRESETS.map((preset) => {
              const isActive = activePreset === preset.key;

              return (
                <Link
                  key={preset.key}
                  href={presetHref(preset.getRange())}
                  aria-current={isActive ? "page" : undefined}
                  className={[
                    "inline-flex h-9 shrink-0 items-center justify-center rounded-[8px] border px-3 text-xs font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--fly-brand-ring)]",
                    isActive
                      ? "border-[var(--fly-brand-border)] bg-[var(--fly-brand-surface)] text-[var(--fly-brand-strong)]"
                      : "border-[var(--fly-border)] bg-[var(--fly-control)] text-[var(--fly-text-muted)] hover:bg-[var(--fly-control-hover)] hover:text-[var(--fly-text-soft)]",
                  ].join(" ")}
                >
                  {preset.label}
                </Link>
              );
            })}
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_auto] sm:items-center xl:min-w-[560px]">
          <label className="min-w-0">
            <span className="sr-only">Data inicial</span>
            <input
              type="date"
              name="startDate"
              defaultValue={range.startDate}
              className="h-10 w-full rounded-[8px] border border-[var(--fly-border)] bg-[var(--fly-control)] px-3 text-sm text-[var(--fly-text-soft)] outline-none transition-colors duration-150 hover:border-[var(--fly-border-strong)] focus:border-[var(--fly-brand-border)] focus:ring-2 focus:ring-[var(--fly-brand-ring)]"
            />
          </label>
          <span className="hidden text-sm text-[var(--fly-text-dim)] sm:block">
            -
          </span>
          <label className="min-w-0">
            <span className="sr-only">Data final</span>
            <input
              type="date"
              name="endDate"
              defaultValue={range.endDate}
              className="h-10 w-full rounded-[8px] border border-[var(--fly-border)] bg-[var(--fly-control)] px-3 text-sm text-[var(--fly-text-soft)] outline-none transition-colors duration-150 hover:border-[var(--fly-border-strong)] focus:border-[var(--fly-brand-border)] focus:ring-2 focus:ring-[var(--fly-brand-ring)]"
            />
          </label>
          <button
            type="submit"
            className="h-10 rounded-[8px] border border-[var(--fly-brand-border)] bg-[var(--fly-brand-surface)] px-4 text-xs font-semibold text-[var(--fly-brand-strong)] transition-colors duration-150 hover:bg-[var(--fly-brand-surface-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--fly-brand-ring)]"
          >
            Filtrar
          </button>
        </div>
      </form>
    </section>
  );
}

function FinanceEventCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "red" | "gold" | "neutral";
}) {
  const borderClass = {
    red: "border-l-[#F87171]",
    gold: "border-l-[#D6A84F]",
    neutral: "border-l-white/35",
  }[tone];
  const valueClass = {
    red: "text-[#FCA5A5]",
    gold: "text-[#F0C76A]",
    neutral: "text-[var(--fly-text)]",
  }[tone];

  return (
    <section
      className={`flynow-dashboard-enter-item min-w-0 rounded-[8px] border border-white/[0.07] border-l-4 ${borderClass} bg-[#0B0D10] p-4 shadow-[0_1px_0_rgba(255,255,255,0.03),inset_0_1px_0_rgba(255,255,255,0.035)]`}
    >
      <p className={`text-[22px] font-semibold leading-none tabular-nums ${valueClass}`}>
        {value}
      </p>
      <p className="mt-3 text-xs leading-5 text-[var(--fly-text-muted)]">
        {label}
      </p>
    </section>
  );
}

export default async function FinanceiroPage({
  searchParams,
}: {
  searchParams: Promise<{ startDate?: string; endDate?: string }>;
}) {
  const params = await searchParams;
  const range = resolveRange(params);
  const data = await getFinanceiroPageData(range);

  return (
    <Shell>
      <DashboardHeader
        title="Financeiro"
        description={`Receita, reembolsos e chargebacks · ${formatDateLong(data.range.endDate)}`}
        actions={<ModeBadge source={data.source} />}
      />

      <PageBody>
        <PeriodFilter range={data.range} />

        <StatGrid>
          <StatCard
            label="Receita bruta"
            value={formatCurrency(data.receitaBruta)}
            detail={`${data.totalPedidos.toLocaleString("pt-BR")} pedidos pagos`}
            tone="gold"
          />
          <StatCard
            label="Receita líquida"
            value={formatCurrency(data.receitaLiquida)}
            detail="bruta do período - reversões por evento no período"
            tone="green"
          />
          <StatCard
            label="Ticket médio"
            value={formatCurrency(data.ticketMedio)}
            detail="por pedido pago"
            tone="blue"
          />
          <StatCard
            label="Total revertido"
            value={formatCurrency(data.totalRevertido)}
            detail={`eventos financeiros no período · taxa CB ${formatPercent(data.taxaChargeback)}`}
            tone="red"
          />
        </StatGrid>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <FinanceEventCard
            label="Chargebacks"
            value={data.chargebacks.toLocaleString("pt-BR")}
            tone="red"
          />
          <FinanceEventCard
            label="Valor em chargeback"
            value={formatCurrency(data.valorChargebacks)}
            tone="red"
          />
          <FinanceEventCard
            label="Reembolsos"
            value={data.reembolsos.toLocaleString("pt-BR")}
            tone="gold"
          />
          <FinanceEventCard
            label="Valor reembolsado"
            value={formatCurrency(data.valorReembolsos)}
            tone="neutral"
          />
        </div>
      </PageBody>
    </Shell>
  );
}
