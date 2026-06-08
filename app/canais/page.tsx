import Link from "next/link";

import {
  ChannelRevenueChart,
  SourceSpendChart,
  type ChannelRevenueDatum,
  type SourceSpendDatum,
} from "@/components/canais/canais-charts";
import {
  FunilPeriodFilter,
  FunilQuerySelect,
} from "@/components/funil/funil-filters";
import Shell from "@/components/layout/shell";
import { DashboardHeader } from "@/components/layout/dashboard-header";
import {
  PageBody,
  Panel,
  StatCard,
  StatGrid,
} from "@/components/workspace/operational-ui";
import { defaultAnalyticsDates, getChannelAnalytics } from "@/lib/analytics";
import {
  ANALYTICS_CHANNEL_LABELS,
  type AnalyticsCanal,
  type AnalyticsFunilSourceRow,
} from "@/lib/supabase";
import { logServerTiming, timedServerTask } from "@/lib/server-timing";
import { formatCurrency } from "@/lib/utils";

export const dynamic = "force-dynamic";

type CanaisPageParams = {
  channel?: string;
  endDate?: string;
  page?: string;
  pageSize?: string;
  startDate?: string;
};

type SelectOption = {
  value: string;
  label: string;
};

type ChannelAnalyticsData = Awaited<ReturnType<typeof getChannelAnalytics>>;

type ChannelSummary = {
  clicksTotal: number;
  conversionsTotal: number;
  revenueTotal: number;
  roas: number;
  spendTotal: number;
  upsellRevenue: number;
};

type RedtrackProductRow = {
  campaignCount: number;
  clicks: number;
  conversions: number;
  id: string;
  leaderCampaign: string;
  leaderSource: string;
  product: string;
  roas: number;
  spend: number;
};

const pageSizeOptions = [10, 25, 50, 100];

type PerformanceRange = {
  startDate: string;
  endDate: string;
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

function resolveRange(params: CanaisPageParams): PerformanceRange {
  const defaults = defaultAnalyticsDates();
  const startDate = isDateString(params.startDate)
    ? params.startDate!
    : defaults.startDate;
  const endDate = isDateString(params.endDate) ? params.endDate! : defaults.endDate;

  return startDate <= endDate
    ? { startDate, endDate }
    : { startDate: endDate, endDate: startDate };
}

function resolvePageSize(value: string | undefined) {
  const parsed = Number(value);

  return pageSizeOptions.includes(parsed) ? parsed : 25;
}

function resolvePage(value: string | undefined) {
  const parsed = Number(value);

  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 1;
}

function buildChannelOptions(rows: AnalyticsFunilSourceRow[]): SelectOption[] {
  const uniqueValues = Array.from(new Set(rows.map((item) => item.canal))).sort(
    (first, second) =>
      (ANALYTICS_CHANNEL_LABELS[first] ?? first).localeCompare(
        ANALYTICS_CHANNEL_LABELS[second] ?? second,
        "pt-BR"
      )
  );

  return [
    { value: "all", label: "Todos os canais" },
    ...uniqueValues.map((value) => ({
      value,
      label: ANALYTICS_CHANNEL_LABELS[value] ?? value,
    })),
  ];
}

function resolveFilter(value: string | undefined, options: SelectOption[]) {
  if (!value) return "all";

  return options.some((option) => option.value === value) ? value : "all";
}

function summarizeChannels(data: ChannelAnalyticsData): ChannelSummary {
  return {
    clicksTotal: data.summary.clicksTotal,
    conversionsTotal: data.summary.conversionsTotal,
    revenueTotal: data.summary.revenueTotal,
    roas: data.summary.roas,
    spendTotal: data.summary.spendTotal,
    upsellRevenue: data.summary.upsellRevenue,
  };
}

function buildChannelRevenueRows(
  sourceRows: AnalyticsFunilSourceRow[]
): ChannelRevenueDatum[] {
  const grouped = new Map<
    AnalyticsCanal,
    {
      directSales: number;
      name: string;
      revenue: number;
    }
  >();

  sourceRows.forEach((row) => {
    const current =
      grouped.get(row.canal) ??
      ({
        directSales: 0,
        name: ANALYTICS_CHANNEL_LABELS[row.canal] ?? row.canal,
        revenue: 0,
      } satisfies { directSales: number; name: string; revenue: number });

    current.directSales += row.qtd_vendas;
    current.revenue += row.receita_total;
    grouped.set(row.canal, current);
  });

  return Array.from(grouped.values())
    .sort((first, second) => second.revenue - first.revenue)
    .map((item) => ({
      directSales: item.directSales,
      name: item.name,
      revenue: item.revenue,
      roas: null,
    }));
}

function buildSourceSpendRows(
  mediaBySource: ChannelAnalyticsData["mediaBySource"]
): SourceSpendDatum[] {
  return mediaBySource
    .map((item) => ({
      clicks: item.clicks,
      conversions: item.conversions,
      name: item.source,
      roas: item.spend > 0 ? item.revenue / item.spend : 0,
      spend: item.spend,
    }))
    .sort((first, second) => second.spend - first.spend);
}

function buildRedtrackProductRows(
  topCampaigns: ChannelAnalyticsData["topCampaigns"]
): RedtrackProductRow[] {
  return topCampaigns
    .map((item) => ({
      campaignCount: item.campaignCount,
      clicks: item.clicks,
      conversions: item.conversions,
      id: item.product,
      leaderCampaign: item.campaign,
      leaderSource: item.source,
      product: item.product,
      roas: item.roas,
      spend: item.spend,
    }))
    .sort((first, second) => second.spend - first.spend);
}

function buildCanaisHref({
  page,
  pageSize,
  range,
  selectedChannel,
}: {
  page: number;
  pageSize: number;
  range: PerformanceRange;
  selectedChannel: string;
}) {
  const params = new URLSearchParams();
  params.set("startDate", range.startDate);
  params.set("endDate", range.endDate);

  if (selectedChannel !== "all") params.set("channel", selectedChannel);
  if (page > 1) params.set("page", String(page));
  if (pageSize !== 25) params.set("pageSize", String(pageSize));

  return `/canais?${params.toString()}`;
}

function CanaisFilters({
  channelOptions,
  range,
  selectedChannel,
}: {
  channelOptions: SelectOption[];
  range: PerformanceRange;
  selectedChannel: string;
}) {
  return (
    <section className="flynow-dashboard-enter-item rounded-[8px] border border-[var(--fly-border)] bg-[var(--fly-surface)] px-3 py-2.5 shadow-[var(--fly-panel-inset)] sm:px-3.5">
      <div className="flex min-w-0 flex-col gap-2 xl:flex-row xl:items-center xl:justify-between">
        <FunilPeriodFilter
          calendarTriggerClassName="!w-[168px] min-[390px]:!w-[186px] sm:!h-8 sm:!w-[260px] lg:!w-[260px]"
          range={range}
        />

        <FunilQuerySelect
          className="xl:h-8 xl:w-[244px]"
          displayLabel="Canal"
          label="canal"
          options={channelOptions}
          param="channel"
          value={selectedChannel}
        />
      </div>
    </section>
  );
}

function ProductTableControls({
  end,
  pageSize,
  start,
  totalItems,
}: {
  end: number;
  pageSize: number;
  start: number;
  totalItems: number;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-2 text-xs text-[var(--fly-text-muted)] sm:flex-row sm:items-center">
      <span className="shrink-0 tabular-nums">
        {formatNumber(start)}-{formatNumber(end)} de {formatNumber(totalItems)}
      </span>
      <FunilQuerySelect
        className="sm:w-[150px]"
        displayLabel="Linhas"
        label="linhas por pagina"
        options={pageSizeOptions.map((option) => ({
          value: String(option),
          label: String(option),
        }))}
        param="pageSize"
        value={String(pageSize)}
      />
    </div>
  );
}

function RedtrackProductsTable({ rows }: { rows: RedtrackProductRow[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1180px] table-fixed text-left text-sm">
        <thead>
          <tr className="border-b border-[var(--fly-divider)] bg-[var(--fly-table-head)] text-[11px] font-semibold uppercase text-[var(--fly-text-muted)]">
            <th className="w-[16%] px-3 py-3">Produto</th>
            <th className="w-[28%] px-3 py-3">Campanha líder</th>
            <th className="w-[14%] px-3 py-3">Source líder</th>
            <th className="w-[10%] px-3 py-3 text-right">Campanhas</th>
            <th className="w-[13%] px-3 py-3 text-right">Spend</th>
            <th className="w-[10%] px-3 py-3 text-right">Clicks</th>
            <th className="w-[10%] px-3 py-3 text-right">Conversões</th>
            <th className="w-[9%] px-3 py-3 text-right">ROAS</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--fly-divider-subtle)]">
          {rows.length ? (
            rows.map((row) => (
              <tr
                key={row.id}
                className="transition-colors duration-150 hover:bg-[var(--fly-row-hover)]"
              >
                <td className="px-3 py-3.5 font-medium text-[var(--fly-text)]">
                  <span className="block truncate">{row.product}</span>
                </td>
                <td className="px-3 py-3.5 text-[var(--fly-text-soft)]">
                  <span className="block truncate">{row.leaderCampaign}</span>
                </td>
                <td className="px-3 py-3.5 text-[var(--fly-text-soft)]">
                  <span className="block truncate">{row.leaderSource}</span>
                </td>
                <td className="px-3 py-3.5 text-right tabular-nums text-[var(--fly-text-soft)]">
                  {formatNumber(row.campaignCount)}
                </td>
                <td className="px-3 py-3.5 text-right font-semibold tabular-nums text-[var(--fly-text)]">
                  {formatCurrency(row.spend)}
                </td>
                <td className="px-3 py-3.5 text-right tabular-nums text-[var(--fly-text-soft)]">
                  {formatNumber(row.clicks)}
                </td>
                <td className="px-3 py-3.5 text-right tabular-nums text-[var(--fly-text-soft)]">
                  {formatNumber(row.conversions)}
                </td>
                <td className="px-3 py-3.5 text-right font-semibold tabular-nums text-[var(--fly-brand-strong)]">
                  {formatDecimal(row.roas)}
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td
                className="px-3 py-8 text-center text-sm text-[var(--fly-text-muted)]"
                colSpan={8}
              >
                Nenhum produto RedTrack encontrado no recorte selecionado.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function UnavailableRedtrackState() {
  return (
    <div className="flex min-h-[300px] items-center justify-center rounded-[8px] border border-[var(--fly-border-subtle)] bg-[var(--fly-row-bg)] px-4 py-8 text-center text-sm text-[var(--fly-text-muted)] sm:min-h-[340px]">
      Mídia RedTrack indisponível com filtro de canal ativo. O canal PayT e o
      source RedTrack não são a mesma dimensão.
    </div>
  );
}

function PaginationFooter({
  currentPage,
  pageSize,
  range,
  selectedChannel,
  totalPages,
}: {
  currentPage: number;
  pageSize: number;
  range: PerformanceRange;
  selectedChannel: string;
  totalPages: number;
}) {
  const previousHref = buildCanaisHref({
    page: Math.max(currentPage - 1, 1),
    pageSize,
    range,
    selectedChannel,
  });
  const nextHref = buildCanaisHref({
    page: Math.min(currentPage + 1, totalPages),
    pageSize,
    range,
    selectedChannel,
  });
  const controlClassName =
    "inline-flex h-8 items-center justify-center rounded-[7px] border border-[var(--fly-border)] bg-[var(--fly-control)] px-3 text-xs font-semibold text-[var(--fly-text-soft)] outline-none transition-colors duration-150 hover:border-[var(--fly-border-strong)] hover:bg-[var(--fly-control-hover)] focus-visible:ring-2 focus-visible:ring-[var(--fly-brand-ring)]";
  const disabledClassName =
    "inline-flex h-8 items-center justify-center rounded-[7px] border border-[var(--fly-border-subtle)] bg-[var(--fly-row-bg)] px-3 text-xs font-semibold text-[var(--fly-text-dim)]";

  return (
    <div className="flex flex-col gap-3 border-t border-[var(--fly-divider)] bg-[var(--fly-row-bg)] px-3 py-3 text-xs text-[var(--fly-text-muted)] sm:flex-row sm:items-center sm:justify-between sm:px-4">
      <span className="font-medium tabular-nums text-[var(--fly-text-soft)]">
        Pagina {currentPage} de {totalPages}
      </span>
      <div className="flex items-center gap-2">
        {currentPage <= 1 ? (
          <span className={disabledClassName}>Anterior</span>
        ) : (
          <Link className={controlClassName} href={previousHref}>
            Anterior
          </Link>
        )}
        {currentPage >= totalPages ? (
          <span className={disabledClassName}>Proxima</span>
        ) : (
          <Link className={controlClassName} href={nextHref}>
            Proxima
          </Link>
        )}
      </div>
    </div>
  );
}

export default async function CanaisPage({
  searchParams,
}: {
  searchParams: Promise<CanaisPageParams>;
}) {
  const pageStartedAt = performance.now();
  const params = await searchParams;
  const range = resolveRange(params);
  const baseData = await timedServerTask("canais", "data.base", () =>
    getChannelAnalytics(range.startDate, range.endDate)
  );
  const channelOptions = buildChannelOptions(baseData.sourceRows);
  const selectedChannel = resolveFilter(params.channel, channelOptions);
  const selectedCanal =
    selectedChannel === "all" ? null : (selectedChannel as AnalyticsCanal);
  const data = selectedCanal
    ? await timedServerTask("canais", "data.filtered", () =>
        getChannelAnalytics(range.startDate, range.endDate, selectedCanal)
      )
    : baseData;
  const postProcessStartedAt = performance.now();
  const summary = summarizeChannels(data);
  const channelRevenueRows = buildChannelRevenueRows(data.sourceRows);
  const sourceSpendRows = data.redtrackComparable
    ? buildSourceSpendRows(data.mediaBySource)
    : [];
  const redtrackRows = data.redtrackComparable
    ? buildRedtrackProductRows(data.topCampaigns)
    : [];
  const pageSize = resolvePageSize(params.pageSize);
  const totalPages = Math.max(Math.ceil(redtrackRows.length / pageSize), 1);
  const currentPage = Math.min(resolvePage(params.page), totalPages);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedRows = redtrackRows.slice(startIndex, startIndex + pageSize);
  logServerTiming("canais", "postProcess.tablesAndCharts", postProcessStartedAt);
  logServerTiming("canais", "total", pageStartedAt);
  const tableStart = redtrackRows.length === 0 ? 0 : startIndex + 1;
  const tableEnd = Math.min(startIndex + pageSize, redtrackRows.length);

  return (
    <Shell>
      <DashboardHeader
        title="Canais"
        description="Receita PayT por origem, mídia RedTrack e leitura por produto"
      />

      <PageBody>
        <CanaisFilters
          channelOptions={channelOptions}
          range={range}
          selectedChannel={selectedChannel}
        />

        <StatGrid columns="xl:grid-cols-6 min-[1400px]:!grid-cols-5">
          <StatCard
            className="xl:col-span-2 min-[1400px]:!col-span-1"
            detail="Soma PayT do período"
            label="Receita total"
            tone="gold"
            value={formatCurrency(summary.revenueTotal)}
          />
          <StatCard
            className="xl:col-span-2 min-[1400px]:!col-span-1"
            detail="Receita adicional no período"
            label="Receita upsells"
            tone="green"
            value={formatCurrency(summary.upsellRevenue)}
          />
          <StatCard
            className="xl:col-span-2 min-[1400px]:!col-span-1"
            detail={
              data.redtrackComparable
                ? "Investimento RedTrack"
                : "Indisponível por canal"
            }
            label="Spend"
            tone="blue"
            value={
              data.redtrackComparable ? formatCurrency(summary.spendTotal) : "-"
            }
          />
          <StatCard
            className="xl:col-span-3 min-[1400px]:!col-span-1"
            detail={
              data.redtrackComparable
                ? `${formatNumber(summary.conversionsTotal)} conversões`
                : "Indisponível por canal"
            }
            label="Clicks"
            tone="neutral"
            value={
              data.redtrackComparable ? formatNumber(summary.clicksTotal) : "-"
            }
          />
          <StatCard
            className="xl:col-span-3 min-[1400px]:!col-span-1"
            detail={
              data.redtrackComparable ? "Receita RT / spend" : "Indisponível por canal"
            }
            label="ROAS RT"
            tone={
              data.redtrackComparable && summary.roas >= 4 ? "green" : "gold"
            }
            value={data.redtrackComparable ? formatDecimal(summary.roas) : "-"}
          />
        </StatGrid>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
          <Panel
            title="Receita por canal"
            description="Origem PayT ordenada por faturamento"
          >
            <ChannelRevenueChart channels={channelRevenueRows} />
          </Panel>

          <Panel
            title="Spend por source RedTrack"
            description="Investimento, cliques e conversões por origem"
          >
            {data.redtrackComparable ? (
              <SourceSpendChart sources={sourceSpendRows} />
            ) : (
              <UnavailableRedtrackState />
            )}
          </Panel>
        </div>

        <Panel
          title="Top produtos RedTrack"
          description="Produto, campanha líder, source e eficiência de mídia"
          action={
            data.redtrackComparable ? (
              <ProductTableControls
                end={tableEnd}
                pageSize={pageSize}
                start={tableStart}
                totalItems={redtrackRows.length}
              />
            ) : null
          }
        >
          {data.redtrackComparable ? (
            <>
              <RedtrackProductsTable rows={paginatedRows} />
              <PaginationFooter
                currentPage={currentPage}
                pageSize={pageSize}
                range={range}
                selectedChannel={selectedChannel}
                totalPages={totalPages}
              />
            </>
          ) : (
            <p className="rounded-[8px] border border-[var(--fly-brand-border)] bg-[var(--fly-brand-surface)] px-3 py-3 text-sm leading-5 text-[var(--fly-text-soft)]">
              Top produtos RedTrack fica oculto com filtro de canal ativo para
              evitar comparar uma origem PayT com sources de mídia por
              aproximação.
            </p>
          )}
        </Panel>
      </PageBody>
    </Shell>
  );
}
