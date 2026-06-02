import { FinanceiroPeriodFilter } from "@/components/financeiro/financeiro-period-filter";
import Shell from "@/components/layout/shell";
import { DashboardHeader } from "@/components/layout/dashboard-header";
import {
  PageBody,
  Panel,
  StatCard,
  StatGrid,
} from "@/components/workspace/operational-ui";
import {
  getDefaultFinanceiroRange,
  getFinanceiroPageData,
  type FinanceiroDailyPoint,
  type FinanceiroRange,
} from "@/lib/financeiro";
import { formatCurrency, formatPercent } from "@/lib/utils";

export const dynamic = "force-dynamic";

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

function formatDateShort(value: string) {
  return new Date(`${value}T12:00:00`).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  });
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

function FinanceTrend({ series }: { series: FinanceiroDailyPoint[] }) {
  const visibleSeries = series.slice(-14);
  const maxValue = Math.max(
    ...visibleSeries.flatMap((point) => [
      point.receitaBruta,
      point.receitaLiquida,
      point.revertido,
    ]),
    1
  );
  const yAxisLabels = [maxValue, maxValue / 2, 0];
  const getBars = (point: FinanceiroDailyPoint) => [
    {
      label: "Bruta",
      value: point.receitaBruta,
      className: "bg-[#D6A84F]/75 group-hover:bg-[#D6A84F]",
    },
    {
      label: "Líquida",
      value: point.receitaLiquida,
      className: "bg-[#4ADE80]/75 group-hover:bg-[#4ADE80]",
    },
    {
      label: "Revertido",
      value: point.revertido,
      className: "bg-[#F87171]/75 group-hover:bg-[#F87171]",
    },
  ];

  if (visibleSeries.length === 0) {
    return (
      <div className="flex min-h-[420px] items-center justify-center rounded-[8px] border border-white/[0.055] bg-white/[0.012] text-sm text-[var(--fly-text-muted)] sm:min-h-[520px]">
        Sem dados financeiros para o período selecionado.
      </div>
    );
  }

  return (
    <div className="min-h-[420px] space-y-4 sm:min-h-[520px]">
      <div className="grid min-h-[360px] grid-cols-[auto_minmax(0,1fr)] gap-3 sm:min-h-[460px]">
        <div className="flex flex-col justify-between py-2 text-right text-[10px] text-[var(--fly-text-dim)]">
          {yAxisLabels.map((value) => (
            <span key={value}>{value > 0 ? formatCurrency(value) : "R$ 0"}</span>
          ))}
        </div>

        <div className="relative min-w-0 overflow-hidden rounded-[8px] border border-white/[0.055] bg-white/[0.012] px-3 pb-4 pt-5">
          <div className="absolute inset-x-3 top-1/2 border-t border-dashed border-white/[0.06]" />
          <div className="absolute inset-x-3 top-5 border-t border-dashed border-white/[0.04]" />
          <div className="absolute inset-x-3 bottom-12 border-t border-white/[0.06]" />
          {visibleSeries.length === 1 ? (
            <div className="relative z-10 flex h-[300px] flex-col justify-between gap-4 sm:h-[395px]">
              <div className="grid min-h-0 flex-1 grid-cols-3 items-end gap-3 sm:gap-5">
                {getBars(visibleSeries[0]).map((bar) => (
                  <div
                    key={bar.label}
                    className="group flex h-full min-w-0 flex-col justify-end gap-2"
                  >
                    <div className="flex min-h-0 flex-1 items-end justify-center">
                      <span
                        title={`${bar.label}: ${formatCurrency(bar.value)}`}
                        className={`block w-full max-w-[72px] rounded-t-md transition-colors sm:max-w-[132px] ${bar.className}`}
                        style={{
                          height: `${bar.value > 0 ? Math.max((bar.value / maxValue) * 100, 2) : 1}%`,
                        }}
                      />
                    </div>
                    <div className="min-h-[46px] text-center">
                      <p className="truncate text-[10px] font-medium uppercase text-[var(--fly-text-dim)]">
                        {bar.label}
                      </p>
                      <p className="mx-auto max-w-full text-[11px] font-semibold leading-4 text-[var(--fly-text)] [overflow-wrap:anywhere] sm:text-xs">
                        {formatCurrency(bar.value)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <span className="text-center text-[10px] text-[var(--fly-text-dim)]">
                {formatDateShort(visibleSeries[0].day)}
              </span>
            </div>
          ) : (
            <div
              className="relative z-10 grid gap-2"
              style={{
                gridTemplateColumns: `repeat(${visibleSeries.length}, minmax(34px, 1fr))`,
              }}
            >
              {visibleSeries.map((point) => (
                <div key={point.day} className="group flex min-w-0 flex-col gap-3">
                  <div className="flex h-[300px] items-end justify-center gap-1.5 sm:h-[395px]">
                    {getBars(point).map((bar) => (
                      <span
                        key={bar.label}
                        title={`${bar.label}: ${formatCurrency(bar.value)}`}
                        className={`block w-full max-w-[18px] rounded-t-sm transition-colors ${bar.className}`}
                        style={{
                          height: `${bar.value > 0 ? Math.max((bar.value / maxValue) * 100, 2) : 1}%`,
                        }}
                      />
                    ))}
                  </div>
                  <span className="truncate text-center text-[10px] text-[var(--fly-text-dim)]">
                    {formatDateShort(point.day)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-3 text-[11px] text-[var(--fly-text-muted)]">
        <span className="inline-flex items-center gap-1.5">
          <span className="size-1.5 rounded-full bg-[#D6A84F]" />
          Receita bruta
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-1.5 rounded-full bg-[#4ADE80]" />
          Receita líquida
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-1.5 rounded-full bg-[#F87171]" />
          Total revertido
        </span>
      </div>
    </div>
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
        actions={<FinanceiroPeriodFilter range={data.range} source={data.source} />}
      />

      <PageBody>
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

        <Panel
          title="Evolução financeira"
          description="Receita bruta, líquida e total revertido no período"
        >
          <FinanceTrend series={data.dailySeries} />
        </Panel>
      </PageBody>
    </Shell>
  );
}
