import Link from "next/link";

import { AnalyticsPeriodFilter } from "@/components/analytics/analytics-period-filter";
import {
  ProductRevenueChart,
  RevenueInvestmentChart,
} from "@/components/analytics/analytics-charts";
import Shell from "@/components/layout/shell";
import { DashboardHeader } from "@/components/layout/dashboard-header";
import {
  PageBody,
  Panel,
  StatCard,
  StatGrid,
} from "@/components/workspace/operational-ui";
import { defaultAnalyticsDates } from "@/lib/analytics";
import {
  getPerformancePageData,
  type PerformanceChannel,
  type PerformanceRange,
} from "@/lib/performance-pages";
import { logServerTiming, timedServerTask } from "@/lib/server-timing";
import { formatCurrency, formatPercent } from "@/lib/utils";

export const dynamic = "force-dynamic";

type AnalyticsPageParams = {
  startDate?: string;
  endDate?: string;
};

function formatNumber(value: number, maximumFractionDigits = 0) {
  return new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits,
  }).format(value);
}

function formatDecimal(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(value);
}

function isDateString(value: string | undefined) {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value));
}

function resolveRange(params: AnalyticsPageParams): PerformanceRange {
  const defaults = defaultAnalyticsDates();
  const startDate = isDateString(params.startDate)
    ? params.startDate!
    : defaults.startDate;
  const endDate = isDateString(params.endDate) ? params.endDate! : defaults.endDate;

  return startDate <= endDate
    ? { startDate, endDate }
    : { startDate: endDate, endDate: startDate };
}

function ActionText({
  children,
  href,
}: {
  children: React.ReactNode;
  href: string;
}) {
  return (
    <Link
      aria-label="Ver detalhes na página de canais"
      className="inline-flex p-0 text-[11px] font-semibold leading-5 text-[var(--fly-text-muted)] underline decoration-[var(--fly-border-strong)] decoration-1 underline-offset-4 outline-none transition-[color,text-decoration-color] duration-150 hover:text-[var(--fly-brand-strong)] hover:decoration-[var(--fly-brand-strong)] focus-visible:rounded-[4px] focus-visible:text-[var(--fly-brand-strong)] focus-visible:ring-2 focus-visible:ring-[var(--fly-brand-ring)]"
      href={href}
    >
      {children}
    </Link>
  );
}

function ChannelsTable({ channels }: { channels: PerformanceChannel[] }) {
  const rows = [...channels].sort((first, second) => second.revenue - first.revenue);

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] table-fixed text-left text-sm">
        <thead>
          <tr className="border-b border-[var(--fly-divider)] bg-[var(--fly-table-head)] text-[11px] font-semibold uppercase text-[var(--fly-text-muted)]">
            <th className="w-[48%] px-3 py-3">Canal</th>
            <th className="w-[28%] px-3 py-3 text-right">Receita</th>
            <th className="w-[24%] px-3 py-3 text-right">Vendas diretas</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--fly-divider-subtle)]">
          {rows.map((channel) => (
            <tr
              key={channel.channel}
              className="transition-colors duration-150 hover:bg-[var(--fly-row-hover)]"
            >
              <td className="px-3 py-3.5 font-medium text-[var(--fly-text)]">
                <span className="block truncate">{channel.label}</span>
              </td>
              <td className="px-3 py-3.5 text-right font-semibold tabular-nums text-[var(--fly-text-soft)]">
                {formatCurrency(channel.revenue)}
              </td>
              <td className="px-3 py-3.5 text-right tabular-nums text-[var(--fly-text-soft)]">
                {formatNumber(channel.directSales)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<AnalyticsPageParams>;
}) {
  const pageStartedAt = performance.now();
  const params = await searchParams;
  const range = resolveRange(params);
  const data = await timedServerTask("analytics", "data.total", () =>
    getPerformancePageData(range, { timingScope: "analytics" })
  );
  const postProcessStartedAt = performance.now();
  const attributionRatio =
    data.summary.revenueTotal > 0
      ? data.summary.attributedRevenueTotal / data.summary.revenueTotal
      : 0;
  const upsellRatio =
    data.summary.revenueTotal > 0
      ? data.summary.upsellRevenue / data.summary.revenueTotal
      : 0;
  const cvr =
    data.summary.clicksTotal > 0
      ? data.summary.conversionsTotal / data.summary.clicksTotal
      : 0;
  logServerTiming("analytics", "postProcess.kpis", postProcessStartedAt);
  logServerTiming("analytics", "total", pageStartedAt);

  return (
    <Shell>
      <DashboardHeader
        title="Analytics"
        description="Performance de vendas, upsells e mídia no mesmo painel"
        actions={<AnalyticsPeriodFilter range={range} />}
      />

      <PageBody>
        <StatGrid>
          <StatCard
            detail={`${formatPercent(attributionRatio)} atribuída`}
            label="Faturamento total"
            tone="gold"
            value={formatCurrency(data.summary.revenueTotal)}
          />
          <StatCard
            detail="Mídia e canais pagos"
            label="Investimento"
            tone="blue"
            value={formatCurrency(data.summary.spendTotal)}
          />
          <StatCard
            detail="Receita total / investimento"
            label="ROAS RT"
            tone="green"
            value={formatDecimal(data.summary.roas)}
          />
          <StatCard
            detail="Pedidos principais pagos"
            label="Vendas diretas"
            tone="neutral"
            value={formatNumber(data.summary.directSales)}
          />
          <StatCard
            detail="Receita direta por venda"
            label="Ticket venda direta"
            tone="neutral"
            value={formatCurrency(data.summary.aov)}
          />
          <StatCard
            detail={`${formatPercent(upsellRatio)} do faturamento`}
            label="Receita upsells"
            tone="gold"
            value={formatCurrency(data.summary.upsellRevenue)}
          />
          <StatCard
            detail={`${formatPercent(cvr)} conversão RT`}
            label="Clicks"
            tone="blue"
            value={formatNumber(data.summary.clicksTotal)}
          />
          <StatCard
            detail="Conversões reportadas pela mídia"
            label="Conversões RT"
            tone="green"
            value={formatNumber(data.summary.conversionsTotal)}
          />
        </StatGrid>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(360px,0.9fr)]">
          <Panel
            title="Faturamento vs investimento"
            description="Série diária no período selecionado"
          >
            <RevenueInvestmentChart series={data.series} />
          </Panel>

          <Panel
            title="Top produtos por receita"
            description="Ranking por faturamento total"
          >
            <ProductRevenueChart products={data.products} />
          </Panel>
        </div>

        <Panel
          title="Canais com mais receita"
          description="Receita e vendas diretas por origem PayT"
          action={<ActionText href="/canais">Ver detalhes</ActionText>}
        >
          <ChannelsTable channels={data.channels} />
        </Panel>
      </PageBody>
    </Shell>
  );
}
