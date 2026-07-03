import { FinanceiroPeriodFilter } from "@/components/financeiro/financeiro-period-filter";
import { FinanceCompositionChart } from "@/components/financeiro/financeiro-composition-chart";
import Shell from "@/components/layout/shell";
import { DashboardHeader } from "@/components/layout/dashboard-header";
import {
  PageBody,
  Panel,
  StatCard,
  StatGrid,
} from "@/components/workspace/operational-ui";
import {
  getFinanceiroPageData,
  type FinanceiroRange,
} from "@/lib/financeiro";
import { getTodayInAppTimezone } from "@/lib/app-dates";
import { logServerTiming, timedServerTask } from "@/lib/server-timing";
import { formatCurrency, formatPercent } from "@/lib/utils";

export const dynamic = "force-dynamic";

function resolveRange(params: { startDate?: string; endDate?: string }) {
  const today = getTodayInAppTimezone();
  const defaults = {
    startDate: `${today.slice(0, 8)}01`,
    endDate: today,
  } satisfies FinanceiroRange;
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

function formatSignedCurrency(value: number) {
  if (value === 0) return formatCurrency(0);
  return `${value > 0 ? "+" : ""}${formatCurrency(value)}`;
}

function ReversalMetricRow({
  label,
  count,
  total,
  value,
  tone,
}: {
  label: string;
  count: number;
  total: number;
  value: number;
  tone: "red" | "gold";
}) {
  const toneClass = {
    red: "bg-[#F87171]",
    gold: "bg-[var(--fly-chart-revenue)]",
  }[tone];
  const meter = total > 0 ? Math.max((value / total) * 100, 4) : 0;

  return (
    <div className="rounded-[8px] border border-[var(--fly-border-subtle)] bg-[var(--fly-row-bg)] px-3 py-2.5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-2">
            <span className={`size-1.5 shrink-0 rounded-full ${toneClass}`} />
            <p className="truncate text-sm font-medium text-[var(--fly-text-soft)]">
              {label}
            </p>
          </div>
          <p className="mt-1 text-xs text-[var(--fly-text-muted)]">
            {count.toLocaleString("pt-BR")} eventos
          </p>
        </div>
        <p className="shrink-0 text-sm font-semibold tabular-nums text-[var(--fly-text)]">
          {formatCurrency(value)}
        </p>
      </div>
      <div className="mt-3 h-1 overflow-hidden rounded-full bg-[var(--fly-divider)]">
        <span
          aria-hidden="true"
          className={`block h-full rounded-full ${toneClass}`}
          style={{ width: `${meter}%` }}
        />
      </div>
    </div>
  );
}

function ReversalLensCard({
  badge,
  title,
  description,
  total,
  chargebacks,
  chargebackValue,
  refunds,
  refundValue,
  footer,
}: {
  badge: string;
  title: string;
  description: string;
  total: number;
  chargebacks: number;
  chargebackValue: number;
  refunds: number;
  refundValue: number;
  footer?: string;
}) {
  const breakdownTotal = Math.max(chargebackValue + refundValue, 0);

  return (
    <article className="min-w-0 rounded-[8px] border border-[var(--fly-border)] bg-[var(--fly-surface-muted)] p-4 shadow-[var(--fly-panel-inset)]">
      <div className="flex min-w-0 items-start justify-between gap-4">
        <div className="min-w-0">
          <span className="inline-flex max-w-full items-center rounded-full border border-[var(--fly-border-subtle)] bg-[var(--fly-control)] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--fly-text-muted)]">
            {badge}
          </span>
          <h3 className="mt-3 text-[15px] font-semibold leading-none text-[var(--fly-text)]">
            {title}
          </h3>
          <p className="mt-2 text-xs leading-5 text-[var(--fly-text-muted)]">
            {description}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-[24px] font-semibold leading-none tabular-nums text-[var(--fly-text)] sm:text-[28px]">
            {formatCurrency(total)}
          </p>
          <p className="mt-2 text-[10px] font-semibold uppercase text-[var(--fly-text-dim)]">
            total revertido
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
        <ReversalMetricRow
          count={chargebacks}
          label="Chargebacks"
          tone="red"
          total={breakdownTotal}
          value={chargebackValue}
        />
        <ReversalMetricRow
          count={refunds}
          label="Reembolsos"
          tone="gold"
          total={breakdownTotal}
          value={refundValue}
        />
      </div>

      {footer ? (
        <p className="mt-3 border-t border-[var(--fly-divider)] pt-3 text-xs leading-5 text-[var(--fly-text-muted)]">
          {footer}
        </p>
      ) : null}
    </article>
  );
}

function ReversalsOverview({ data }: { data: Awaited<ReturnType<typeof getFinanceiroPageData>> }) {
  const eventDateDelta = data.eventDateTotalRevertido - data.totalRevertido;
  const deltaTone =
    eventDateDelta > 0
      ? "text-[var(--fly-danger-strong)]"
      : eventDateDelta < 0
        ? "text-[var(--fly-success-text)]"
        : "text-[var(--fly-text-soft)]";
  const deltaLabel =
    eventDateDelta === 0
      ? "Mesmo valor nas duas leituras"
      : eventDateDelta > 0
        ? "Mais reversões processadas no período"
        : "Menos reversões processadas no período";

  return (
    <Panel
      title="Reversões"
      description="Separe competência da venda e impacto financeiro processado"
    >
      <div className="grid gap-3 xl:grid-cols-2">
        <ReversalLensCard
          badge="data da compra"
          chargebackValue={data.valorChargebacks}
          chargebacks={data.chargebacks}
          description="Vendas do período que depois viraram reembolso ou chargeback."
          footer={`Taxa de chargeback: ${formatPercent(data.taxaChargeback)} sobre vendas aprovadas.`}
          refundValue={data.valorReembolsos}
          refunds={data.reembolsos}
          title="Impacto nas vendas do período"
          total={data.totalRevertido}
        />
        <ReversalLensCard
          badge="data do evento"
          chargebackValue={data.eventDateValorChargebacks}
          chargebacks={data.eventDateChargebacks}
          description="Reversões que caíram neste período, independente da data da venda."
          refundValue={data.eventDateValorReembolsos}
          refunds={data.eventDateReembolsos}
          title="Impacto processado no período"
          total={data.eventDateTotalRevertido}
        />
      </div>

      <div className="mt-3 grid gap-3 rounded-[8px] border border-[var(--fly-border-subtle)] bg-[var(--fly-row-bg)] p-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
        <div className="min-w-0">
          <p className="text-sm font-medium text-[var(--fly-text-soft)]">
            Diferença entre as leituras
          </p>
          <p className="mt-1 text-xs leading-5 text-[var(--fly-text-muted)]">
            Compra mostra a qualidade das vendas do período; evento mostra o que afetou o caixa agora.
          </p>
        </div>
        <div className="shrink-0 text-left sm:text-right">
          <p className={`text-lg font-semibold tabular-nums ${deltaTone}`}>
            {formatSignedCurrency(eventDateDelta)}
          </p>
          <p className="mt-1 text-[10px] font-semibold uppercase text-[var(--fly-text-dim)]">
            {deltaLabel}
          </p>
        </div>
      </div>
    </Panel>
  );
}

export default async function FinanceiroPage({
  searchParams,
}: {
  searchParams: Promise<{ startDate?: string; endDate?: string }>;
}) {
  const pageStartedAt = performance.now();
  const params = await searchParams;
  const range = resolveRange(params);
  const data = await timedServerTask("financeiro", "data.total", () =>
    getFinanceiroPageData(range)
  );
  logServerTiming("financeiro", "total", pageStartedAt);

  return (
    <Shell>
      <DashboardHeader
        title="Financeiro"
        description={`Receita, reembolsos e chargebacks · ${formatDateLong(data.range.endDate)}`}
        actions={<FinanceiroPeriodFilter range={data.range} />}
      />

      <PageBody>
        <StatGrid>
          <StatCard
            label="Receita líquida (Você recebe)"
            value={formatCurrency(data.receitaLiquida)}
            detail={`${data.totalPedidos.toLocaleString("pt-BR")} vendas · líquido Payt menos reversões`}
            tone="green"
          />
          <StatCard
            label="Ticket médio"
            value={formatCurrency(data.ticketMedio)}
            detail="Você recebe / vendas"
            tone="blue"
          />
          <StatCard
            label="Total revertido (data compra)"
            value={formatCurrency(data.totalRevertido)}
            detail={`taxa CB ${formatPercent(data.taxaChargeback)} · ${formatCurrency(data.eventDateTotalRevertido)} no mês (por data evento)`}
            tone="red"
          />
          <StatCard
            label="Vendas aprovadas"
            value={data.totalPedidos.toLocaleString("pt-BR")}
            detail="PayT (compra + upsell)"
            tone="gold"
          />
        </StatGrid>

        <ReversalsOverview data={data} />

        <Panel
          title="Composição financeira"
          description="Receita por data de pagamento; reversões por data do evento financeiro"
        >
          <FinanceCompositionChart data={data} />
        </Panel>
      </PageBody>
    </Shell>
  );
}
