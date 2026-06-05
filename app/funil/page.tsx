import Link from "next/link";

import {
  FunnelRevenueChart,
  FunnelTakeRateChart,
  type FunilChartPoint,
} from "@/components/funil/funil-charts";
import {
  FunilFilterStrip,
  FunilPeriodFilter,
  FunilQuerySelect,
} from "@/components/funil/funil-filters";
import { FunilOperationalForms } from "@/components/funil/funil-operational-forms";
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
  type PerformanceAlert,
  type PerformanceFunnelDay,
  type PerformanceFunnelSourceRow,
  type PerformanceLog,
  type PerformanceRange,
} from "@/lib/performance-pages";
import { cn, formatCurrency, formatPercent } from "@/lib/utils";

export const dynamic = "force-dynamic";

type FunilPageParams = {
  channel?: string;
  endDate?: string;
  page?: string;
  pageSize?: string;
  product?: string;
  startDate?: string;
};

type SelectOption = {
  value: string;
  label: string;
};

type FunnelSummary = {
  aov: number;
  directSales: number;
  revenueTotal: number;
  takeRateUs1: number;
  takeRateUs2: number;
  upsellRatio: number;
  upsellRevenue: number;
};

type SourceSummaryRow = {
  campaign: string;
  channel: string;
  directSales: number;
  id: string;
  medium: string;
  revenueTotal: number;
  source: string;
  upsellRatio: number;
  upsellRevenue: number;
};

const pageSizeOptions = [10, 25, 50, 100];

function formatNumber(value: number, maximumFractionDigits = 0) {
  return new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits,
  }).format(value);
}

function formatDate(value: string) {
  return new Date(`${value}T12:00:00`).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function isDateString(value: string | undefined) {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value));
}

function resolveRange(params: FunilPageParams): PerformanceRange {
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

function formatChannelLabel(channel: string) {
  const labels: Record<string, string> = {
    CALLCENTER: "Call Center",
    EMAIL_MAUTIC: "Email / Mautic",
    IA_WHATSAPP: "IA / WhatsApp",
    SMS: "SMS",
  };

  return labels[channel] ?? channel.replace(/_/g, " ");
}

function uniqueOptions(values: string[], allLabel: string): SelectOption[] {
  const uniqueValues = Array.from(new Set(values.filter(Boolean))).sort((a, b) =>
    a.localeCompare(b, "pt-BR")
  );

  return [
    { value: "all", label: allLabel },
    ...uniqueValues.map((value) => ({
      value,
      label: allLabel === "Todos os canais" ? formatChannelLabel(value) : value,
    })),
  ];
}

function resolveFilter(value: string | undefined, options: SelectOption[]) {
  if (!value) return "all";

  return options.some((option) => option.value === value) ? value : "all";
}

function filterFunnelDays(
  rows: PerformanceFunnelDay[],
  selectedProduct: string,
  selectedChannel: string
) {
  return rows.filter((row) => {
    const matchesProduct =
      selectedProduct === "all" || row.product === selectedProduct;
    const matchesChannel =
      selectedChannel === "all" || row.channel === selectedChannel;

    return matchesProduct && matchesChannel;
  });
}

function summarizeFunnel(rows: PerformanceFunnelDay[]): FunnelSummary {
  const directSales = rows.reduce((total, item) => total + item.directSales, 0);
  const revenueTotal = rows.reduce((total, item) => total + item.revenueTotal, 0);
  const upsellRevenue = rows.reduce((total, item) => total + item.upsellRevenue, 0);
  const takeRateUs1Base = rows.reduce(
    (total, item) => total + item.directSales * item.takeRateUs1,
    0
  );
  const takeRateUs2Base = rows.reduce(
    (total, item) => total + item.directSales * item.takeRateUs2,
    0
  );

  return {
    aov: directSales > 0 ? revenueTotal / directSales : 0,
    directSales,
    revenueTotal,
    takeRateUs1: directSales > 0 ? takeRateUs1Base / directSales : 0,
    takeRateUs2: directSales > 0 ? takeRateUs2Base / directSales : 0,
    upsellRatio: revenueTotal > 0 ? upsellRevenue / revenueTotal : 0,
    upsellRevenue,
  };
}

function buildDailySeries(rows: PerformanceFunnelDay[]): FunilChartPoint[] {
  const grouped = new Map<
    string,
    FunilChartPoint & {
      takeRateUs1Base: number;
      takeRateUs2Base: number;
    }
  >();

  rows.forEach((row) => {
    const current =
      grouped.get(row.day) ??
      ({
        aov: 0,
        day: row.day,
        directSales: 0,
        revenueTotal: 0,
        takeRateUs1: 0,
        takeRateUs1Base: 0,
        takeRateUs2: 0,
        takeRateUs2Base: 0,
        upsellRevenue: 0,
      } satisfies FunilChartPoint & {
        takeRateUs1Base: number;
        takeRateUs2Base: number;
      });

    current.directSales += row.directSales;
    current.revenueTotal += row.revenueTotal;
    current.upsellRevenue += row.upsellRevenue;
    current.takeRateUs1Base += row.directSales * row.takeRateUs1;
    current.takeRateUs2Base += row.directSales * row.takeRateUs2;

    grouped.set(row.day, current);
  });

  return Array.from(grouped.values())
    .map((item) => ({
      aov: item.directSales > 0 ? item.revenueTotal / item.directSales : 0,
      day: item.day,
      directSales: item.directSales,
      revenueTotal: item.revenueTotal,
      takeRateUs1:
        item.directSales > 0 ? item.takeRateUs1Base / item.directSales : 0,
      takeRateUs2:
        item.directSales > 0 ? item.takeRateUs2Base / item.directSales : 0,
      upsellRevenue: item.upsellRevenue,
    }))
    .sort((first, second) => first.day.localeCompare(second.day));
}

function buildSourceRows(
  rows: PerformanceFunnelSourceRow[],
  selectedChannel: string
): SourceSummaryRow[] {
  const grouped = new Map<
    string,
    SourceSummaryRow & {
      upsellCount: number;
    }
  >();

  rows
    .filter(
      (row) => selectedChannel === "all" || row.channel === selectedChannel
    )
    .forEach((row) => {
      const campaign = row.campaign ?? "-";
      const medium = row.medium ?? "-";
      const source = row.source ?? "-";
      const id = `${row.channel}-${campaign}-${medium}-${source}`;
      const current =
        grouped.get(id) ??
        ({
          campaign,
          channel: row.channel,
          directSales: 0,
          id,
          medium,
          revenueTotal: 0,
          source,
          upsellRatio: 0,
          upsellCount: 0,
          upsellRevenue: 0,
        } satisfies SourceSummaryRow & { upsellCount: number });

      current.directSales += row.directSales;
      current.revenueTotal += row.revenueTotal;
      current.upsellRevenue += row.upsellRevenue;
      current.upsellCount += row.upsellCount;

      grouped.set(id, current);
    });

  return Array.from(grouped.values())
    .map((item) => ({
      campaign: item.campaign,
      channel: item.channel,
      directSales: item.directSales,
      id: item.id,
      medium: item.medium,
      revenueTotal: item.revenueTotal,
      source: item.source,
      upsellRatio: item.directSales > 0 ? item.upsellCount / item.directSales : 0,
      upsellRevenue: item.upsellRevenue,
    }))
    .sort((first, second) => second.revenueTotal - first.revenueTotal);
}

function buildFunilHref({
  page,
  pageSize,
  range,
  selectedChannel,
  selectedProduct,
}: {
  page: number;
  pageSize: number;
  range: PerformanceRange;
  selectedChannel: string;
  selectedProduct: string;
}) {
  const params = new URLSearchParams();
  params.set("startDate", range.startDate);
  params.set("endDate", range.endDate);

  if (selectedProduct !== "all") params.set("product", selectedProduct);
  if (selectedChannel !== "all") params.set("channel", selectedChannel);
  if (page > 1) params.set("page", String(page));
  if (pageSize !== 25) params.set("pageSize", String(pageSize));

  return `/funil?${params.toString()}`;
}

function AlertList({ alerts }: { alerts: PerformanceAlert[] }) {
  const toneByLevel: Record<
    PerformanceAlert["level"],
    { border: string; dot: string }
  > = {
    danger: {
      border: "border-[var(--fly-danger-border)]",
      dot: "bg-[#F87171]",
    },
    info: {
      border: "border-[var(--fly-info-border)]",
      dot: "bg-[var(--fly-chart-investment)]",
    },
    ok: {
      border: "border-[var(--fly-success-border)]",
      dot: "bg-[var(--fly-success)]",
    },
    warning: {
      border: "border-[var(--fly-warning-border)]",
      dot: "bg-[var(--fly-warning-strong)]",
    },
  };

  return (
    <div className="grid gap-2">
      {alerts.length ? (
        alerts.map((alert) => {
          const tone = toneByLevel[alert.level];

          return (
            <article
              key={`${alert.level}-${alert.title}`}
              className={cn(
                "rounded-[8px] border bg-[var(--fly-row-bg)] px-3 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]",
                tone.border
              )}
            >
              <div className="flex min-w-0 items-center gap-2">
                <span className={cn("size-1.5 shrink-0 rounded-full", tone.dot)} />
                <p className="truncate text-sm font-semibold text-[var(--fly-text)]">
                  {alert.title}
                </p>
              </div>
              <p className="mt-1.5 text-sm leading-5 text-[var(--fly-text-muted)]">
                {alert.detail}
              </p>
            </article>
          );
        })
      ) : (
        <p className="rounded-[8px] border border-[var(--fly-border-subtle)] bg-[var(--fly-row-bg)] px-3 py-3 text-sm text-[var(--fly-text-muted)]">
          Nenhum alerta registrado no periodo.
        </p>
      )}
    </div>
  );
}

function SourceTableControls({
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

function SourceSummaryTable({ rows }: { rows: SourceSummaryRow[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1040px] table-fixed text-left text-sm">
        <thead>
          <tr className="border-b border-[var(--fly-divider)] bg-[var(--fly-table-head)] text-[11px] font-semibold uppercase text-[var(--fly-text-muted)]">
            <th className="w-[18%] px-3 py-3">Canal</th>
            <th className="w-[25%] px-3 py-3">UTM campaign</th>
            <th className="w-[17%] px-3 py-3">UTM source</th>
            <th className="w-[10%] px-3 py-3 text-right">Vendas</th>
            <th className="w-[13%] px-3 py-3 text-right">Receita</th>
            <th className="w-[13%] px-3 py-3 text-right">Receita upsells</th>
            <th className="w-[9%] px-3 py-3 text-right">Upsell ratio</th>
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
                  <span className="block truncate">
                    {formatChannelLabel(row.channel)}
                  </span>
                </td>
                <td className="px-3 py-3.5 text-[var(--fly-text-soft)]">
                  <span className="block truncate">{row.campaign}</span>
                </td>
                <td className="px-3 py-3.5 text-[var(--fly-text-soft)]">
                  <span className="block truncate">{row.source}</span>
                </td>
                <td className="px-3 py-3.5 text-right tabular-nums text-[var(--fly-text-soft)]">
                  {formatNumber(row.directSales)}
                </td>
                <td className="px-3 py-3.5 text-right font-semibold tabular-nums text-[var(--fly-text)]">
                  {formatCurrency(row.revenueTotal)}
                </td>
                <td className="px-3 py-3.5 text-right tabular-nums text-[var(--fly-text-soft)]">
                  {formatCurrency(row.upsellRevenue)}
                </td>
                <td className="px-3 py-3.5 text-right font-semibold tabular-nums text-[var(--fly-brand-strong)]">
                  {formatPercent(row.upsellRatio)}
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td
                className="px-3 py-8 text-center text-sm text-[var(--fly-text-muted)]"
                colSpan={7}
              >
                Nenhum dado encontrado para o recorte selecionado.
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
  selectedProduct,
  totalPages,
}: {
  currentPage: number;
  pageSize: number;
  range: PerformanceRange;
  selectedChannel: string;
  selectedProduct: string;
  totalPages: number;
}) {
  const previousHref = buildFunilHref({
    page: Math.max(currentPage - 1, 1),
    pageSize,
    range,
    selectedChannel,
    selectedProduct,
  });
  const nextHref = buildFunilHref({
    page: Math.min(currentPage + 1, totalPages),
    pageSize,
    range,
    selectedChannel,
    selectedProduct,
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

function LogsTable({ logs }: { logs: PerformanceLog[] }) {
  return (
    <div className="grid gap-2">
      {logs.length ? (
        logs.map((log) => (
          <article
            key={`${log.day}-${log.title}-${log.owner}`}
            className="rounded-[8px] border border-[var(--fly-border-subtle)] bg-[var(--fly-row-bg)] px-3 py-3 transition-colors duration-150 hover:border-[var(--fly-border-strong)] hover:bg-[var(--fly-row-hover)]"
          >
            <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-[var(--fly-text)]">
                  {log.title}
                </p>
                <p className="mt-1 text-sm leading-5 text-[var(--fly-text-muted)]">
                  {log.detail}
                </p>
              </div>
              <div className="shrink-0 text-left sm:text-right">
                <p className="text-xs font-semibold tabular-nums text-[var(--fly-text-soft)]">
                  {formatDate(log.day)}
                </p>
                <p className="mt-1 text-xs text-[var(--fly-text-muted)]">
                  {log.owner}
                </p>
              </div>
            </div>
            <p className="mt-2 text-xs font-medium text-[var(--fly-brand-strong)]">
              {log.impact}
            </p>
          </article>
        ))
      ) : (
        <p className="rounded-[8px] border border-[var(--fly-border-subtle)] bg-[var(--fly-row-bg)] px-3 py-3 text-sm text-[var(--fly-text-muted)]">
          Nenhuma alteracao registrada no periodo.
        </p>
      )}
    </div>
  );
}

export default async function FunilPage({
  searchParams,
}: {
  searchParams: Promise<FunilPageParams>;
}) {
  const params = await searchParams;
  const range = resolveRange(params);
  const data = await getPerformancePageData(range);
  const productOptions = uniqueOptions(
    data.funnelDays.map((item) => item.product),
    "Todos os produtos"
  );
  const channelOptions = uniqueOptions(
    data.funnelDays.map((item) => item.channel),
    "Todos os canais"
  );
  const selectedProduct = resolveFilter(params.product, productOptions);
  const selectedChannel = resolveFilter(params.channel, channelOptions);
  const pageSize = resolvePageSize(params.pageSize);
  const filteredFunnelDays = filterFunnelDays(
    data.funnelDays,
    selectedProduct,
    selectedChannel
  );
  const summary = summarizeFunnel(filteredFunnelDays);
  const chartSeries = buildDailySeries(filteredFunnelDays);
  const canShowSourceRows = selectedProduct === "all";
  const sourceRows = canShowSourceRows
    ? buildSourceRows(data.funnelSourceRows, selectedChannel)
    : [];
  const totalPages = Math.max(Math.ceil(sourceRows.length / pageSize), 1);
  const currentPage = Math.min(resolvePage(params.page), totalPages);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedSourceRows = sourceRows.slice(startIndex, startIndex + pageSize);
  const tableStart = sourceRows.length === 0 ? 0 : startIndex + 1;
  const tableEnd = Math.min(startIndex + pageSize, sourceRows.length);

  return (
    <Shell>
      <DashboardHeader
        title="Funil"
        description="Funil diario por produto, canal e take rate de upsells"
        actions={<FunilPeriodFilter range={range} />}
      />

      <PageBody>
        <div className="grid gap-3">
          <FunilFilterStrip
            channels={channelOptions}
            products={productOptions}
            selectedChannel={selectedChannel}
            selectedProduct={selectedProduct}
          />
        </div>

        <StatGrid columns="xl:grid-cols-3">
          <StatCard
            detail="Pedidos principais no recorte"
            label="Vendas diretas"
            tone="neutral"
            value={formatNumber(summary.directSales)}
          />
          <StatCard
            detail="Direta + upsells no periodo"
            label="Receita total"
            tone="gold"
            value={formatCurrency(summary.revenueTotal)}
          />
          <StatCard
            detail={`${formatPercent(summary.upsellRatio)} da receita total`}
            label="Receita upsells"
            tone="green"
            value={formatCurrency(summary.upsellRevenue)}
          />
          <StatCard
            detail="Receita media por venda direta"
            label="AOV medio"
            tone="blue"
            value={formatCurrency(summary.aov)}
          />
          <StatCard
            detail="Media ponderada por vendas"
            label="Take rate US1"
            tone="neutral"
            value={formatPercent(summary.takeRateUs1)}
          />
          <StatCard
            detail="Media ponderada por vendas"
            label="Take rate US2"
            tone="neutral"
            value={formatPercent(summary.takeRateUs2)}
          />
        </StatGrid>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(360px,0.85fr)]">
          <Panel
            title="Faturamento vs receita de upsell"
            description="Evolucao diaria do recorte selecionado"
          >
            <FunnelRevenueChart series={chartSeries} />
          </Panel>

          <Panel
            title="Take rate de upsells"
            description="US1 e US2 ponderados por vendas diretas"
          >
            <FunnelTakeRateChart series={chartSeries} />
          </Panel>
        </div>

        <Panel
          title="Alertas automaticos do funil"
          description={`${data.alerts.length} sinais na janela`}
        >
          <AlertList alerts={data.alerts} />
        </Panel>

        <FunilOperationalForms products={productOptions} />

        <Panel
          title="Resumo por fonte no periodo"
          description="Canal, UTM, vendas, receita e take de upsell"
          action={
            canShowSourceRows ? (
              <SourceTableControls
                end={tableEnd}
                pageSize={pageSize}
                start={tableStart}
                totalItems={sourceRows.length}
              />
            ) : null
          }
        >
          {canShowSourceRows ? (
            <>
              <SourceSummaryTable rows={paginatedSourceRows} />
              <PaginationFooter
                currentPage={currentPage}
                pageSize={pageSize}
                range={range}
                selectedChannel={selectedChannel}
                selectedProduct={selectedProduct}
                totalPages={totalPages}
              />
            </>
          ) : (
            <p className="rounded-[8px] border border-[var(--fly-brand-border)] bg-[var(--fly-brand-surface)] px-3 py-3 text-sm leading-5 text-[var(--fly-text-soft)]">
              O resumo por fonte nao possui dimensao confiavel de produto na fact
              atual. Com filtro de produto ativo, esta secao fica oculta para
              evitar leitura incorreta.
            </p>
          )}
        </Panel>

        <div className="grid gap-4 xl:grid-cols-2">
          <Panel title="Log de alteracoes" description="Eventos com leitura de impacto">
            <LogsTable logs={data.logs} />
          </Panel>

          <Panel
            title="Transcricoes operacionais"
            description="Registro operacional do periodo"
          >
            <p className="rounded-[8px] border border-[var(--fly-border-subtle)] bg-[var(--fly-row-bg)] px-3 py-3 text-sm text-[var(--fly-text-muted)]">
              Nenhuma transcricao encontrada no periodo.
            </p>
          </Panel>
        </div>
      </PageBody>
    </Shell>
  );
}
