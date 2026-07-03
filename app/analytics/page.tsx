import Link from "next/link";

import { AnalyticsPeriodFilter } from "@/components/analytics/analytics-period-filter";
import {
  ProductRevenueChart,
  RedtrackSourcesChart,
  RevenueInvestmentChart,
} from "@/components/analytics/analytics-charts";
import Shell from "@/components/layout/shell";
import { DashboardHeader } from "@/components/layout/dashboard-header";
import {
  PageBody,
  Panel,
  StatCard,
} from "@/components/workspace/operational-ui";
import {
  defaultAnalyticsDates,
  getRedtrackAnalytics,
  type RedtrackAnalyticsData,
} from "@/lib/analytics";
import {
  getPerformancePageData,
  type PerformanceChannel,
  type PerformanceRange,
} from "@/lib/performance-pages";
import { getFinanceiroPageData } from "@/lib/financeiro";
import { logServerTiming, timedServerTask } from "@/lib/server-timing";
import { formatCurrency } from "@/lib/utils";

export const dynamic = "force-dynamic";

type AnalyticsPageParams = {
  startDate?: string;
  endDate?: string;
  view?: string;
};

type AnalyticsView = "geral" | "redtrack";
type PerformancePageData = Awaited<ReturnType<typeof getPerformancePageData>>;
type FinanceiroPageData = Awaited<ReturnType<typeof getFinanceiroPageData>>;

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

function resolveView(value: string | undefined): AnalyticsView {
  return value === "redtrack" ? "redtrack" : "geral";
}

function analyticsViewHref(range: PerformanceRange, view: AnalyticsView) {
  const params = new URLSearchParams({
    endDate: range.endDate,
    startDate: range.startDate,
    view,
  });

  return `/analytics?${params.toString()}`;
}

function AnalyticsViewSwitch({
  activeView,
  range,
}: {
  activeView: AnalyticsView;
  range: PerformanceRange;
}) {
  const items: Array<{ label: string; view: AnalyticsView }> = [
    { label: "Visão geral", view: "geral" },
    { label: "RedTrack", view: "redtrack" },
  ];

  return (
    <nav
      aria-label="Visualização do Analytics"
      className="grid w-full max-w-full grid-cols-2 gap-1 rounded-[10px] border border-[var(--fly-border)] bg-[var(--fly-control)] p-1 sm:w-fit sm:min-w-[260px]"
    >
      {items.map((item) => {
        const isActive = activeView === item.view;

        return (
          <Link
            key={item.view}
            aria-current={isActive ? "page" : undefined}
            className={`inline-flex h-8 min-w-0 items-center justify-center rounded-[7px] px-3 text-xs font-semibold outline-none transition-[background-color,color,box-shadow] duration-150 focus-visible:ring-2 focus-visible:ring-[var(--fly-brand-ring)] ${
              isActive
                ? "bg-[var(--fly-surface)] text-[var(--fly-text)] shadow-[0_1px_2px_rgba(0,0,0,0.12)]"
                : "text-[var(--fly-text-muted)] hover:bg-[var(--fly-control-hover)] hover:text-[var(--fly-text-soft)]"
            }`}
            href={analyticsViewHref(range, item.view)}
          >
            <span className="truncate">{item.label}</span>
          </Link>
        );
      })}
    </nav>
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

function RedtrackCampaignsTable({
  campaigns,
}: {
  campaigns: RedtrackAnalyticsData["campaigns"];
}) {
  const rows = campaigns.slice(0, 50);

  if (!rows.length) {
    return (
      <p className="rounded-[8px] border border-[var(--fly-border-subtle)] bg-[var(--fly-row-bg)] px-3 py-3 text-sm leading-5 text-[var(--fly-text-muted)]">
        Sem dados RedTrack para o período selecionado.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1180px] table-fixed text-left text-sm">
        <thead>
          <tr className="border-b border-[var(--fly-divider)] bg-[var(--fly-table-head)] text-[11px] font-semibold uppercase text-[var(--fly-text-muted)]">
            <th className="w-[24%] px-3 py-3">Campanha</th>
            <th className="w-[9%] px-3 py-3">Origem</th>
            <th className="w-[10%] px-3 py-3 text-right">Invest.</th>
            <th className="w-[11%] px-3 py-3 text-right">Receita RT</th>
            <th className="w-[7%] px-3 py-3 text-right">ROAS</th>
            <th className="w-[8%] px-3 py-3 text-right">Cliques</th>
            <th className="w-[8%] px-3 py-3 text-right">Únicos</th>
            <th className="w-[8%] px-3 py-3 text-right">Conv.</th>
            <th className="w-[7%] px-3 py-3 text-right">CPC</th>
            <th className="w-[7%] px-3 py-3 text-right">CPA</th>
            <th className="w-[8%] px-3 py-3 text-right">LP views</th>
            <th className="w-[8%] px-3 py-3 text-right">LP clicks</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--fly-divider-subtle)]">
          {rows.map((campaign) => (
            <tr
              key={`${campaign.campaign}-${campaign.source}`}
              className="transition-colors duration-150 hover:bg-[var(--fly-row-hover)]"
            >
              <td className="px-3 py-3.5 font-medium text-[var(--fly-text)]">
                <span className="block truncate" title={campaign.campaign}>
                  {campaign.campaign}
                </span>
              </td>
              <td className="px-3 py-3.5 text-[var(--fly-text-soft)]">
                <span className="block truncate" title={campaign.source}>
                  {campaign.source}
                </span>
              </td>
              <td className="px-3 py-3.5 text-right font-semibold tabular-nums text-[var(--fly-text-soft)]">
                {formatCurrency(campaign.spend)}
              </td>
              <td className="px-3 py-3.5 text-right font-semibold tabular-nums text-[var(--fly-text-soft)]">
                {formatCurrency(campaign.attributedRevenue)}
              </td>
              <td className="px-3 py-3.5 text-right tabular-nums text-[var(--fly-text-soft)]">
                {formatDecimal(campaign.roas)}
              </td>
              <td className="px-3 py-3.5 text-right tabular-nums text-[var(--fly-text-soft)]">
                {formatNumber(campaign.clicks)}
              </td>
              <td className="px-3 py-3.5 text-right tabular-nums text-[var(--fly-text-soft)]">
                {formatNumber(campaign.uniqueClicks)}
              </td>
              <td className="px-3 py-3.5 text-right tabular-nums text-[var(--fly-text-soft)]">
                {formatNumber(campaign.conversions)}
              </td>
              <td className="px-3 py-3.5 text-right tabular-nums text-[var(--fly-text-soft)]">
                {formatCurrency(campaign.cpc)}
              </td>
              <td className="px-3 py-3.5 text-right tabular-nums text-[var(--fly-text-soft)]">
                {formatCurrency(campaign.cpa)}
              </td>
              <td className="px-3 py-3.5 text-right tabular-nums text-[var(--fly-text-soft)]">
                {formatNumber(campaign.lpViews)}
              </td>
              <td className="px-3 py-3.5 text-right tabular-nums text-[var(--fly-text-soft)]">
                {formatNumber(campaign.lpClicks)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SectionIntro({
  description,
  title,
}: {
  description: string;
  title: string;
}) {
  return (
    <div className="flex min-w-0 items-start gap-3">
      <span
        aria-hidden="true"
        className="mt-0.5 h-8 w-px shrink-0 rounded-full bg-gradient-to-b from-[var(--fly-border-strong)] via-[var(--fly-divider)] to-transparent"
      />
      <div className="min-w-0">
        <h2 className="text-[15px] font-semibold leading-none text-[var(--fly-text)]">
          {title}
        </h2>
        <p className="mt-1.5 text-[13px] leading-5 text-[var(--fly-text-muted)] sm:text-sm">
          {description}
        </p>
      </div>
    </div>
  );
}

function OverviewContent({
  data,
  financeiro,
}: {
  data: PerformancePageData;
  financeiro: FinanceiroPageData;
}) {
  const ticketMedioVoceRecebe = financeiro.totalPedidos > 0
    ? financeiro.receitaBruta / financeiro.totalPedidos
    : 0;
  const totalRoas =
    data.summary.spendTotal > 0
      ? financeiro.totalDasVendas / data.summary.spendTotal
      : 0;

  return (
    <>
      <section className="space-y-3">
        <SectionIntro
          description="Receita, vendas, reversões, investimento e ROAS em uma leitura consolidada"
          title="Resumo do período"
        />

        <div className="grid grid-cols-1 gap-3 md:grid-cols-6 xl:grid-cols-12">
          <StatCard
            className="md:col-span-3 xl:col-span-3"
            detail={`${financeiro.totalPedidos.toLocaleString("pt-BR")} vendas aprovadas — valor cheio pago pelo cliente`}
            label="Receita bruta"
            tone="gold"
            value={formatCurrency(financeiro.receitaBruta)}
          />
          <StatCard
            className="md:col-span-3 xl:col-span-3"
            detail="Vendas aprovadas PayT (incl. upsells)"
            label="Vendas totais"
            tone="neutral"
            value={formatNumber(financeiro.totalPedidos)}
          />
          <StatCard
            className="md:col-span-3 xl:col-span-3"
            detail="Receita líquida / vendas totais"
            label="Ticket médio"
            tone="blue"
            value={formatCurrency(ticketMedioVoceRecebe)}
          />
          <StatCard
            className="md:col-span-3 xl:col-span-3"
            detail={'= "Total das vendas" na Payt (Você recebe)'}
            label="Receita líquida"
            tone="green"
            value={formatCurrency(financeiro.totalDasVendas)}
          />
          <StatCard
            className="md:col-span-3 xl:col-span-4"
            detail="Mídia e canais pagos"
            label="Investimento"
            tone="blue"
            value={formatCurrency(data.summary.spendTotal)}
          />
          <StatCard
            className="md:col-span-6 xl:col-span-4"
            detail="Receita líquida / investimento"
            label="ROAS total"
            tone="green"
            value={formatDecimal(totalRoas)}
          />
          <StatCard
            className="md:col-span-6 xl:col-span-4"
            detail={`${financeiro.reembolsos.toLocaleString("pt-BR")} reembolsos + ${financeiro.chargebacks.toLocaleString("pt-BR")} chargebacks (por data compra) · ${formatCurrency(financeiro.eventDateTotalRevertido)} no mês (por data evento)`}
            label="Reembolsos e chargebacks"
            tone="red"
            value={formatCurrency(financeiro.totalRevertido)}
          />
        </div>
      </section>

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
    </>
  );
}

function RedtrackContent({ redtrack }: { redtrack: RedtrackAnalyticsData }) {
  const redtrackSeries = redtrack.series.map((item) => ({
    day: item.day,
    directSales: item.conversions,
    revenue: item.attributedRevenue,
    spend: item.spend,
  }));
  const visibleCampaigns = redtrack.campaigns.slice(0, 50);

  return (
    <>
      <section className="space-y-3">
        <SectionIntro
          description="Métricas de mídia e atribuição vindas do RedTrack"
          title="RedTrack"
        />

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            detail="Campo cost do RedTrack"
            label="Investimento"
            tone="blue"
            value={formatCurrency(redtrack.summary.spend)}
          />
          <StatCard
            detail="Campo total_revenue do RedTrack"
            label="Receita atribuída RT"
            tone="gold"
            value={formatCurrency(redtrack.summary.attributedRevenue)}
          />
          <StatCard
            detail="Receita atribuída / investimento"
            label="ROAS RT"
            tone="green"
            value={formatDecimal(redtrack.summary.roas)}
          />
          <StatCard
            detail="Cliques registrados"
            label="Cliques"
            tone="neutral"
            value={formatNumber(redtrack.summary.clicks)}
          />
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(360px,0.9fr)]">
        <Panel
          title="Receita atribuída vs investimento"
          description="Série diária com dados RedTrack"
        >
          <RevenueInvestmentChart
            revenueLabel="Receita atribuída RT"
            series={redtrackSeries}
          />
        </Panel>

        <Panel
          title="Investimento por origem"
          description="Origens RedTrack ordenadas por investimento"
        >
          <RedtrackSourcesChart sources={redtrack.sources} />
        </Panel>
      </div>

      <Panel
        title="Campanhas RedTrack"
        description="Campanhas, origem e eficiência de mídia"
        action={
          visibleCampaigns.length ? (
            <span className="text-[11px] font-semibold uppercase text-[var(--fly-text-muted)]">
              Top {formatNumber(visibleCampaigns.length)}
            </span>
          ) : null
        }
      >
        <RedtrackCampaignsTable campaigns={visibleCampaigns} />
      </Panel>
    </>
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
  const activeView = resolveView(params.view);

  let content: React.ReactNode;

  if (activeView === "redtrack") {
    const redtrack = await timedServerTask("analytics", "data.redtrack", () =>
      getRedtrackAnalytics(range.startDate, range.endDate)
    );
    const postProcessStartedAt = performance.now();
    content = <RedtrackContent redtrack={redtrack} />;
    logServerTiming("analytics", "postProcess.kpis", postProcessStartedAt);
  } else {
    const [data, financeiro] = await timedServerTask("analytics", "data.total", () =>
      Promise.all([
        getPerformancePageData(range, { timingScope: "analytics" }),
        getFinanceiroPageData(range),
      ])
    );
    const postProcessStartedAt = performance.now();
    content = <OverviewContent data={data} financeiro={financeiro} />;
    logServerTiming("analytics", "postProcess.kpis", postProcessStartedAt);
  }

  logServerTiming("analytics", "total", pageStartedAt);

  return (
    <Shell>
      <DashboardHeader
        title="Analytics"
        description="Performance de vendas, upsells e mídia no mesmo painel"
        actions={<AnalyticsPeriodFilter range={range} view={activeView} />}
      />

      <PageBody>
        <AnalyticsViewSwitch activeView={activeView} range={range} />
        {content}
      </PageBody>
    </Shell>
  );
}
