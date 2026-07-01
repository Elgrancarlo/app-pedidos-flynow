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
    red: "border-l-[var(--fly-danger-strong)]",
    gold: "border-l-[var(--fly-chart-revenue)]",
    neutral: "border-l-[var(--fly-border-strong)]",
  }[tone];
  return (
    <section
      className={`flynow-dashboard-enter-item min-w-0 rounded-[8px] border border-[var(--fly-border)] border-l-4 ${borderClass} bg-[var(--fly-surface)] p-4 shadow-[var(--fly-panel-shadow)]`}
    >
      <p className="text-[22px] font-semibold leading-none tabular-nums text-[var(--fly-text)]">
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
            label="Receita bruta"
            value={formatCurrency(data.receitaBruta)}
            detail={`${data.totalPedidos.toLocaleString("pt-BR")} vendas PayT (purchase + upsell)`}
            tone="gold"
          />
          <StatCard
            label="Receita líquida"
            value={formatCurrency(data.receitaLiquida)}
            detail="bruta - reembolsos - chargebacks (por data da compra)"
            tone="green"
          />
          <StatCard
            label="Ticket médio"
            value={formatCurrency(data.ticketMedio)}
            detail="receita bruta / vendas totais"
            tone="blue"
          />
          <StatCard
            label="Total revertido (data compra)"
            value={formatCurrency(data.totalRevertido)}
            detail={`taxa CB ${formatPercent(data.taxaChargeback)} · ${formatCurrency(data.eventDateTotalRevertido)} no mês (por data evento)`}
            tone="red"
          />
        </StatGrid>

        {/* Visão por data da COMPRA (principal) */}
        <Panel title="Reversões por data da compra" description="Compras que depois tiveram reembolso ou chargeback — atribuídas ao mês da venda original">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <FinanceEventCard
              label="Chargebacks (qtd)"
              value={data.chargebacks.toLocaleString("pt-BR")}
              tone="red"
            />
            <FinanceEventCard
              label="Chargebacks (R$)"
              value={formatCurrency(data.valorChargebacks)}
              tone="red"
            />
            <FinanceEventCard
              label="Reembolsos (qtd)"
              value={data.reembolsos.toLocaleString("pt-BR")}
              tone="gold"
            />
            <FinanceEventCard
              label="Reembolsos (R$)"
              value={formatCurrency(data.valorReembolsos)}
              tone="gold"
            />
          </div>
        </Panel>

        {/* Visão por data do EVENTO (secundária) */}
        <Panel title="Reversões por data do evento" description="Descontos efetivamente processados neste período — quando o reembolso/chargeback caiu">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <FinanceEventCard
              label="Chargebacks (qtd)"
              value={data.eventDateChargebacks.toLocaleString("pt-BR")}
              tone="red"
            />
            <FinanceEventCard
              label="Chargebacks (R$)"
              value={formatCurrency(data.eventDateValorChargebacks)}
              tone="red"
            />
            <FinanceEventCard
              label="Reembolsos (qtd)"
              value={data.eventDateReembolsos.toLocaleString("pt-BR")}
              tone="gold"
            />
            <FinanceEventCard
              label="Reembolsos (R$)"
              value={formatCurrency(data.eventDateValorReembolsos)}
              tone="gold"
            />
          </div>
        </Panel>

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
