import Link from "next/link";

import { AnalyticsPeriodFilter } from "@/components/analytics/analytics-period-filter";
import {
  ProductRevenueChart,
  RevenueInvestmentChart,
} from "@/components/analytics/analytics-charts";
import Shell from "@/components/layout/shell";
import { DashboardHeader } from "@/components/layout/dashboard-header";
import { PageBody, Panel, StatGrid } from "@/components/workspace/operational-ui";
import { defaultAnalyticsDates } from "@/lib/analytics";
import {
  getPerformancePageData,
  type PerformanceChannel,
  type PerformanceRange,
} from "@/lib/performance-pages";
import { formatCurrency, formatPercent } from "@/lib/utils";

export const dynamic = "force-dynamic";

type AnalyticsPageParams = {
  startDate?: string;
  endDate?: string;
};

type MetricTone = "gold" | "blue" | "green" | "neutral";

const metricToneStyles: Record<
  MetricTone,
  {
    dot: string;
    value: string;
  }
> = {
  gold: {
    dot: "bg-[#D6A84F]",
    value: "text-[var(--fly-brand-strong)]",
  },
  blue: {
    dot: "bg-[#60A5FA]",
    value: "text-[#93C5FD]",
  },
  green: {
    dot: "bg-[#4ADE80]",
    value: "text-[#86EFAC]",
  },
  neutral: {
    dot: "bg-white/35",
    value: "text-[var(--fly-text)]",
  },
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

function AnalyticsMetricCard({
  label,
  value,
  detail,
  tone,
}: {
  label: string;
  value: string;
  detail: string;
  tone: MetricTone;
}) {
  const styles = metricToneStyles[tone];

  return (
    <section className="flynow-dashboard-enter-item min-w-0 rounded-[8px] border border-white/[0.07] bg-[#0B0D10] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.025)] sm:p-4">
      <div className="flex min-w-0 items-center gap-2">
        <span className={`size-1.5 shrink-0 rounded-full ${styles.dot}`} />
        <p className="truncate text-[11px] font-medium uppercase text-[var(--fly-text-muted)]">
          {label}
        </p>
      </div>
      <p
        className={`mt-3 whitespace-nowrap text-[24px] font-semibold leading-none tabular-nums sm:text-[26px] 2xl:text-[30px] ${styles.value}`}
      >
        {value}
      </p>
      <p className="mt-2 text-xs leading-5 text-[var(--fly-text-muted)]">
        {detail}
      </p>
    </section>
  );
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
          <tr className="border-b border-white/[0.06] bg-white/[0.018] text-[11px] font-semibold uppercase text-[var(--fly-text-muted)]">
            <th className="w-[42%] px-3 py-3">Canal</th>
            <th className="w-[24%] px-3 py-3 text-right">Receita</th>
            <th className="w-[18%] px-3 py-3 text-right">Vendas diretas</th>
            <th className="w-[16%] px-3 py-3 text-right">ROAS</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/[0.055]">
          {rows.map((channel) => (
            <tr
              key={channel.channel}
              className="transition-colors duration-150 hover:bg-white/[0.018]"
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
              <td className="px-3 py-3.5 text-right font-semibold tabular-nums text-[var(--fly-brand-strong)]">
                {formatDecimal(channel.roas)}
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
  const params = await searchParams;
  const range = resolveRange(params);
  const data = await getPerformancePageData(range);
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

  return (
    <Shell>
      <DashboardHeader
        title="Analytics"
        description="Performance de vendas, upsells e mídia no mesmo painel"
        actions={<AnalyticsPeriodFilter range={range} />}
      />

      <PageBody>
        <StatGrid>
          <AnalyticsMetricCard
            detail={`${formatPercent(attributionRatio)} atribuída`}
            label="Faturamento total"
            tone="gold"
            value={formatCurrency(data.summary.revenueTotal)}
          />
          <AnalyticsMetricCard
            detail="Mídia e canais pagos"
            label="Investimento"
            tone="blue"
            value={formatCurrency(data.summary.spendTotal)}
          />
          <AnalyticsMetricCard
            detail="Receita total / investimento"
            label="ROAS RT"
            tone="green"
            value={formatDecimal(data.summary.roas)}
          />
          <AnalyticsMetricCard
            detail="Pedidos principais pagos"
            label="Vendas diretas"
            tone="neutral"
            value={formatNumber(data.summary.directSales)}
          />
          <AnalyticsMetricCard
            detail="Receita direta por venda"
            label="Ticket venda direta"
            tone="neutral"
            value={formatCurrency(data.summary.aov)}
          />
          <AnalyticsMetricCard
            detail={`${formatPercent(upsellRatio)} do faturamento`}
            label="Receita upsells"
            tone="gold"
            value={formatCurrency(data.summary.upsellRevenue)}
          />
          <AnalyticsMetricCard
            detail={`${formatPercent(cvr)} conversão RT`}
            label="Clicks"
            tone="blue"
            value={formatNumber(data.summary.clicksTotal)}
          />
          <AnalyticsMetricCard
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
          description="Receita, vendas diretas e retorno por canal"
          action={<ActionText href="/canais">Ver detalhes</ActionText>}
        >
          <ChannelsTable channels={data.channels} />
        </Panel>
      </PageBody>
    </Shell>
  );
}
