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
import { defaultAnalyticsDates } from "@/lib/analytics";
import {
  getPerformancePageData,
  type PerformanceCampaign,
  type PerformanceChannel,
  type PerformancePageData,
  type PerformanceRange,
} from "@/lib/performance-pages";
import { cn, formatCurrency } from "@/lib/utils";

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

function normalizeKey(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toUpperCase();
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

function buildChannelOptions(data: PerformancePageData): SelectOption[] {
  const values = [
    ...data.channels.map((item) => item.label),
    ...data.campaigns.map((item) => item.source),
  ];
  const uniqueValues = Array.from(new Set(values.filter(Boolean))).sort((a, b) =>
    a.localeCompare(b, "pt-BR")
  );

  return [
    { value: "all", label: "Todos os canais" },
    ...uniqueValues.map((value) => ({ value, label: value })),
  ];
}

function resolveFilter(value: string | undefined, options: SelectOption[]) {
  if (!value) return "all";

  return options.some((option) => option.value === value) ? value : "all";
}

function matchesSelectedChannel(selectedChannel: string, values: string[]) {
  if (selectedChannel === "all") return true;

  const selected = normalizeKey(selectedChannel);

  return values.some((value) => normalizeKey(value) === selected);
}

function summarizeChannels({
  campaigns,
  channels,
  data,
  selectedChannel,
}: {
  campaigns: PerformanceCampaign[];
  channels: PerformanceChannel[];
  data: PerformancePageData;
  selectedChannel: string;
}): ChannelSummary {
  if (selectedChannel === "all") {
    return {
      clicksTotal: data.summary.clicksTotal,
      conversionsTotal: data.summary.conversionsTotal,
      revenueTotal: data.summary.revenueTotal,
      roas: data.summary.roas,
      spendTotal: data.summary.spendTotal,
      upsellRevenue: data.summary.upsellRevenue,
    };
  }

  const revenueTotal = channels.reduce((total, item) => total + item.revenue, 0);
  const spendTotal =
    campaigns.length > 0
      ? campaigns.reduce((total, item) => total + item.spend, 0)
      : channels.reduce((total, item) => total + item.spend, 0);
  const clicksTotal =
    campaigns.length > 0
      ? campaigns.reduce((total, item) => total + item.clicks, 0)
      : channels.reduce((total, item) => total + item.clicks, 0);
  const conversionsTotal =
    campaigns.length > 0
      ? campaigns.reduce((total, item) => total + item.conversions, 0)
      : channels.reduce((total, item) => total + item.conversions, 0);
  const revenueRatio =
    data.summary.revenueTotal > 0 ? revenueTotal / data.summary.revenueTotal : 0;

  return {
    clicksTotal,
    conversionsTotal,
    revenueTotal,
    roas: spendTotal > 0 ? revenueTotal / spendTotal : 0,
    spendTotal,
    upsellRevenue: data.summary.upsellRevenue * revenueRatio,
  };
}

function buildChannelRevenueRows(
  channels: PerformanceChannel[]
): ChannelRevenueDatum[] {
  return [...channels]
    .sort((first, second) => second.revenue - first.revenue)
    .map((item) => ({
      directSales: item.directSales,
      name: item.label,
      revenue: item.revenue,
      roas: item.roas,
    }));
}

function buildSourceSpendRows(
  campaigns: PerformanceCampaign[],
  channels: PerformanceChannel[]
): SourceSpendDatum[] {
  if (!campaigns.length) {
    return channels
      .filter((item) => item.spend > 0)
      .sort((first, second) => second.spend - first.spend)
      .map((item) => ({
        clicks: item.clicks,
        conversions: item.conversions,
        name: item.label,
        roas: item.roas,
        spend: item.spend,
      }));
  }

  const grouped = new Map<string, SourceSpendDatum & { weightedReturn: number }>();

  campaigns.forEach((campaign) => {
    const current =
      grouped.get(campaign.source) ??
      ({
        clicks: 0,
        conversions: 0,
        name: campaign.source,
        roas: 0,
        spend: 0,
        weightedReturn: 0,
      } satisfies SourceSpendDatum & { weightedReturn: number });

    current.clicks += campaign.clicks;
    current.conversions += campaign.conversions;
    current.spend += campaign.spend;
    current.weightedReturn += campaign.spend * campaign.roas;
    grouped.set(campaign.source, current);
  });

  return Array.from(grouped.values())
    .map((item) => ({
      clicks: item.clicks,
      conversions: item.conversions,
      name: item.name,
      roas: item.spend > 0 ? item.weightedReturn / item.spend : 0,
      spend: item.spend,
    }))
    .sort((first, second) => second.spend - first.spend);
}

function buildRedtrackProductRows(
  campaigns: PerformanceCampaign[]
): RedtrackProductRow[] {
  const grouped = new Map<
    string,
    RedtrackProductRow & {
      leaderSpend: number;
      weightedReturn: number;
    }
  >();

  campaigns.forEach((campaign) => {
    const product = campaign.product || "SEM PRODUTO";
    const current =
      grouped.get(product) ??
      ({
        campaignCount: 0,
        clicks: 0,
        conversions: 0,
        id: normalizeKey(product),
        leaderCampaign: "-",
        leaderSource: "-",
        leaderSpend: -1,
        product,
        roas: 0,
        spend: 0,
        weightedReturn: 0,
      } satisfies RedtrackProductRow & {
        leaderSpend: number;
        weightedReturn: number;
      });

    current.campaignCount += 1;
    current.clicks += campaign.clicks;
    current.conversions += campaign.conversions;
    current.spend += campaign.spend;
    current.weightedReturn += campaign.spend * campaign.roas;

    if (campaign.spend > current.leaderSpend) {
      current.leaderCampaign = campaign.campaign;
      current.leaderSource = campaign.source;
      current.leaderSpend = campaign.spend;
    }

    grouped.set(product, current);
  });

  return Array.from(grouped.values())
    .map((item) => ({
      campaignCount: item.campaignCount,
      clicks: item.clicks,
      conversions: item.conversions,
      id: item.id,
      leaderCampaign: item.leaderCampaign,
      leaderSource: item.leaderSource,
      product: item.product,
      roas: item.spend > 0 ? item.weightedReturn / item.spend : 0,
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
  const params = await searchParams;
  const range = resolveRange(params);
  const data = await getPerformancePageData(range);
  const channelOptions = buildChannelOptions(data);
  const selectedChannel = resolveFilter(params.channel, channelOptions);
  const selectedChannels = data.channels.filter((item) =>
    matchesSelectedChannel(selectedChannel, [item.channel, item.label])
  );
  const selectedCampaigns = data.campaigns.filter((item) =>
    matchesSelectedChannel(selectedChannel, [item.source])
  );
  const summary = summarizeChannels({
    campaigns: selectedCampaigns,
    channels: selectedChannels,
    data,
    selectedChannel,
  });
  const channelRevenueRows = buildChannelRevenueRows(selectedChannels);
  const sourceSpendRows = buildSourceSpendRows(selectedCampaigns, selectedChannels);
  const redtrackRows = buildRedtrackProductRows(selectedCampaigns);
  const pageSize = resolvePageSize(params.pageSize);
  const totalPages = Math.max(Math.ceil(redtrackRows.length / pageSize), 1);
  const currentPage = Math.min(resolvePage(params.page), totalPages);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedRows = redtrackRows.slice(startIndex, startIndex + pageSize);
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
            detail="PayT + receita atribuída"
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
            detail="Investimento RedTrack"
            label="Spend"
            tone="blue"
            value={formatCurrency(summary.spendTotal)}
          />
          <StatCard
            className="xl:col-span-3 min-[1400px]:!col-span-1"
            detail={`${formatNumber(summary.conversionsTotal)} conversões`}
            label="Clicks"
            tone="neutral"
            value={formatNumber(summary.clicksTotal)}
          />
          <StatCard
            className="xl:col-span-3 min-[1400px]:!col-span-1"
            detail="Receita / spend"
            label="ROAS RT"
            tone={summary.roas >= 4 ? "green" : "gold"}
            value={formatDecimal(summary.roas)}
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
            <SourceSpendChart sources={sourceSpendRows} />
          </Panel>
        </div>

        <Panel
          title="Top produtos RedTrack"
          description="Produto, campanha líder, source e eficiência de mídia"
          action={
            <ProductTableControls
              end={tableEnd}
              pageSize={pageSize}
              start={tableStart}
              totalItems={redtrackRows.length}
            />
          }
        >
          <RedtrackProductsTable rows={paginatedRows} />
          <PaginationFooter
            currentPage={currentPage}
            pageSize={pageSize}
            range={range}
            selectedChannel={selectedChannel}
            totalPages={totalPages}
          />
        </Panel>
      </PageBody>
    </Shell>
  );
}
