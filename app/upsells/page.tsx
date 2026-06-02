import Link from "next/link";

import {
  FunilPeriodFilter,
  FunilQuerySelect,
} from "@/components/funil/funil-filters";
import Shell from "@/components/layout/shell";
import { DashboardHeader } from "@/components/layout/dashboard-header";
import { PageBody, StatGrid } from "@/components/workspace/operational-ui";
import { defaultAnalyticsDates } from "@/lib/analytics";
import {
  getPerformancePageData,
  type PerformanceFunnelDay,
  type PerformancePageData,
  type PerformanceRange,
  type PerformanceUpsellProduct,
} from "@/lib/performance-pages";
import { cn, formatCurrency, formatPercent } from "@/lib/utils";

export const dynamic = "force-dynamic";

type UpsellsPageParams = {
  channel?: string;
  endDate?: string;
  product?: string;
  startDate?: string;
};

type MetricTone = "gold" | "blue" | "green" | "neutral";

type SelectOption = {
  value: string;
  label: string;
};

type UpsellDailyRow = {
  day: string;
  directSales: number;
  takeRateTotal: number;
  takeRateUs1: number;
  takeRateUs2: number;
  totalApproved: number;
  upsellRevenue: number;
  us1Wins: number;
  us2Wins: number;
};

type UpsellProductCardData = PerformanceUpsellProduct & {
  dailyRows: UpsellDailyRow[];
  lastDay: UpsellDailyRow | null;
  sevenDayApproved: number;
  sevenDayDirectSales: number;
  sevenDayRevenue: number;
  sevenDayTakeRate: number;
};

const metricToneStyles: Record<
  MetricTone,
  {
    dot: string;
    value: string;
  }
> = {
  gold: {
    dot: "bg-[var(--fly-chart-revenue)]",
    value: "text-[var(--fly-text)]",
  },
  blue: {
    dot: "bg-[var(--fly-chart-investment)]",
    value: "text-[var(--fly-text)]",
  },
  green: {
    dot: "bg-[var(--fly-success)]",
    value: "text-[var(--fly-text)]",
  },
  neutral: {
    dot: "bg-[var(--fly-text-dim)]",
    value: "text-[var(--fly-text)]",
  },
};

function formatNumber(value: number, maximumFractionDigits = 0) {
  return new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits,
  }).format(value);
}

function formatDateShort(value: string) {
  return new Date(`${value}T12:00:00`).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  });
}

function isDateString(value: string | undefined) {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value));
}

function resolveRange(params: UpsellsPageParams): PerformanceRange {
  const defaults = defaultAnalyticsDates();
  const startDate = isDateString(params.startDate)
    ? params.startDate!
    : defaults.startDate;
  const endDate = isDateString(params.endDate) ? params.endDate! : defaults.endDate;

  return startDate <= endDate
    ? { startDate, endDate }
    : { startDate: endDate, endDate: startDate };
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

function uniqueOptions(
  values: string[],
  allLabel: string,
  formatter: (value: string) => string = (value) => value
): SelectOption[] {
  const uniqueValues = Array.from(new Set(values.filter(Boolean))).sort((a, b) =>
    formatter(a).localeCompare(formatter(b), "pt-BR")
  );

  return [
    { value: "all", label: allLabel },
    ...uniqueValues.map((value) => ({
      value,
      label: formatter(value),
    })),
  ];
}

function resolveFilter(value: string | undefined, options: SelectOption[]) {
  if (!value) return "all";

  return options.some((option) => option.value === value) ? value : "all";
}

function estimateWins(directSales: number, takeRate: number) {
  return Math.max(0, Math.round(directSales * takeRate));
}

function groupDailyRows(rows: PerformanceFunnelDay[]) {
  const grouped = new Map<
    string,
    UpsellDailyRow & {
      takeRateUs1Base: number;
      takeRateUs2Base: number;
    }
  >();

  rows.forEach((row) => {
    const us1Wins = estimateWins(row.directSales, row.takeRateUs1);
    const us2Wins = estimateWins(row.directSales, row.takeRateUs2);
    const current =
      grouped.get(row.day) ??
      ({
        day: row.day,
        directSales: 0,
        takeRateTotal: 0,
        takeRateUs1: 0,
        takeRateUs1Base: 0,
        takeRateUs2: 0,
        takeRateUs2Base: 0,
        totalApproved: 0,
        upsellRevenue: 0,
        us1Wins: 0,
        us2Wins: 0,
      } satisfies UpsellDailyRow & {
        takeRateUs1Base: number;
        takeRateUs2Base: number;
      });

    current.directSales += row.directSales;
    current.upsellRevenue += row.upsellRevenue;
    current.us1Wins += us1Wins;
    current.us2Wins += us2Wins;
    current.totalApproved += us1Wins + us2Wins;
    current.takeRateUs1Base += row.directSales * row.takeRateUs1;
    current.takeRateUs2Base += row.directSales * row.takeRateUs2;

    grouped.set(row.day, current);
  });

  return Array.from(grouped.values())
    .map((row) => ({
      day: row.day,
      directSales: row.directSales,
      takeRateTotal:
        row.directSales > 0 ? row.totalApproved / row.directSales : 0,
      takeRateUs1:
        row.directSales > 0 ? row.takeRateUs1Base / row.directSales : 0,
      takeRateUs2:
        row.directSales > 0 ? row.takeRateUs2Base / row.directSales : 0,
      totalApproved: row.totalApproved,
      upsellRevenue: row.upsellRevenue,
      us1Wins: row.us1Wins,
      us2Wins: row.us2Wins,
    }))
    .sort((first, second) => second.day.localeCompare(first.day));
}

function buildFallbackDailyRow(
  item: PerformanceUpsellProduct,
  range: PerformanceRange
): UpsellDailyRow {
  return {
    day: range.endDate,
    directSales: item.directSales,
    takeRateTotal: item.takeRateTotal,
    takeRateUs1: item.takeRateUs1,
    takeRateUs2: item.takeRateUs2,
    totalApproved: item.totalApproved,
    upsellRevenue: item.upsellRevenue,
    us1Wins: item.us1Wins,
    us2Wins: item.us2Wins,
  };
}

function enrichProductCard(
  item: PerformanceUpsellProduct,
  dailyRows: UpsellDailyRow[]
): UpsellProductCardData {
  const sevenDayRows = dailyRows.slice(0, 7);
  const sevenDayDirectSales = sevenDayRows.reduce(
    (total, row) => total + row.directSales,
    0
  );
  const sevenDayApproved = sevenDayRows.reduce(
    (total, row) => total + row.totalApproved,
    0
  );
  const sevenDayRevenue = sevenDayRows.reduce(
    (total, row) => total + row.upsellRevenue,
    0
  );

  return {
    ...item,
    dailyRows: sevenDayRows,
    lastDay: sevenDayRows[0] ?? null,
    sevenDayApproved,
    sevenDayDirectSales,
    sevenDayRevenue,
    sevenDayTakeRate:
      sevenDayDirectSales > 0 ? sevenDayApproved / sevenDayDirectSales : 0,
  };
}

function buildProductCards(
  data: PerformancePageData,
  selectedProduct: string,
  selectedChannel: string,
  range: PerformanceRange
): UpsellProductCardData[] {
  const filteredFunnelDays = data.funnelDays.filter((row) => {
    const matchesProduct =
      selectedProduct === "all" || row.product === selectedProduct;
    const matchesChannel =
      selectedChannel === "all" || row.channel === selectedChannel;

    return matchesProduct && matchesChannel;
  });

  if (filteredFunnelDays.length) {
    const groupedByProduct = new Map<string, PerformanceFunnelDay[]>();

    filteredFunnelDays.forEach((row) => {
      groupedByProduct.set(row.product, [
        ...(groupedByProduct.get(row.product) ?? []),
        row,
      ]);
    });

    return Array.from(groupedByProduct.entries())
      .map(([product, rows]) => {
        const dailyRows = groupDailyRows(rows);
        const directSales = dailyRows.reduce(
          (total, row) => total + row.directSales,
          0
        );
        const us1Wins = dailyRows.reduce((total, row) => total + row.us1Wins, 0);
        const us2Wins = dailyRows.reduce((total, row) => total + row.us2Wins, 0);
        const totalApproved = us1Wins + us2Wins;
        const upsellRevenue = dailyRows.reduce(
          (total, row) => total + row.upsellRevenue,
          0
        );

        return enrichProductCard(
          {
            product,
            directSales,
            takeRateTotal:
              directSales > 0 ? totalApproved / directSales : 0,
            takeRateUs1: directSales > 0 ? us1Wins / directSales : 0,
            takeRateUs2: directSales > 0 ? us2Wins / directSales : 0,
            totalApproved,
            upsellRevenue,
            us1Wins,
            us2Wins,
          },
          dailyRows
        );
      })
      .sort((first, second) => {
        const revenueDiff = second.upsellRevenue - first.upsellRevenue;

        return revenueDiff !== 0
          ? revenueDiff
          : second.directSales - first.directSales;
      });
  }

  return data.upsells
    .filter((item) => selectedProduct === "all" || item.product === selectedProduct)
    .map((item) => enrichProductCard(item, [buildFallbackDailyRow(item, range)]))
    .sort((first, second) => second.upsellRevenue - first.upsellRevenue);
}

function buildFunilHistoryHref({
  product,
  range,
  selectedChannel,
}: {
  product: string;
  range: PerformanceRange;
  selectedChannel: string;
}) {
  const params = new URLSearchParams();
  params.set("startDate", range.startDate);
  params.set("endDate", range.endDate);
  params.set("product", product);

  if (selectedChannel !== "all") {
    params.set("channel", selectedChannel);
  }

  return `/funil?${params.toString()}`;
}

function UpsellsMetricCard({
  detail,
  label,
  tone,
  value,
}: {
  detail: string;
  label: string;
  tone: MetricTone;
  value: string;
}) {
  const styles = metricToneStyles[tone];

  return (
    <section className="flynow-dashboard-enter-item min-w-0 rounded-[8px] border border-[var(--fly-border)] bg-[var(--fly-surface)] p-3 shadow-[var(--fly-panel-inset)] sm:p-4">
      <div className="flex min-w-0 items-center gap-2">
        <span className={cn("size-1.5 shrink-0 rounded-full", styles.dot)} />
        <p className="truncate text-[11px] font-medium uppercase text-[var(--fly-text-muted)]">
          {label}
        </p>
      </div>
      <p
        className={cn(
          "mt-3 whitespace-nowrap text-[24px] font-semibold leading-none tabular-nums sm:text-[26px] 2xl:text-[30px]",
          styles.value
        )}
      >
        {value}
      </p>
      <p className="mt-2 text-xs leading-5 text-[var(--fly-text-muted)]">
        {detail}
      </p>
    </section>
  );
}

function UpsellsFilters({
  channelOptions,
  productOptions,
  range,
  selectedChannel,
  selectedProduct,
}: {
  channelOptions: SelectOption[];
  productOptions: SelectOption[];
  range: PerformanceRange;
  selectedChannel: string;
  selectedProduct: string;
}) {
  return (
    <section className="flynow-dashboard-enter-item rounded-[8px] border border-[var(--fly-border)] bg-[var(--fly-surface)] px-3 py-2.5 shadow-[var(--fly-panel-inset)] sm:px-3.5">
      <div className="flex min-w-0 flex-col gap-2 xl:flex-row xl:items-center xl:justify-between">
        <FunilPeriodFilter
          calendarTriggerClassName="!w-[168px] min-[390px]:!w-[186px] sm:!h-8 sm:!w-[260px] lg:!w-[260px]"
          range={range}
        />

        <div className="grid min-w-0 gap-2 sm:grid-cols-2 xl:flex xl:w-auto xl:shrink-0 xl:items-center">
          <FunilQuerySelect
            className="xl:h-8 xl:w-[220px]"
            displayLabel="Produto"
            label="produto"
            options={productOptions}
            param="product"
            value={selectedProduct}
          />
          <FunilQuerySelect
            className="xl:h-8 xl:w-[220px]"
            displayLabel="Canal"
            label="canal"
            options={channelOptions}
            param="channel"
            value={selectedChannel}
          />
        </div>
      </div>
    </section>
  );
}

function ProductMetricItem({
  detail,
  label,
  value,
}: {
  detail: string;
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0 px-3 py-2.5">
      <dt className="truncate text-[10px] font-medium uppercase text-[var(--fly-text-muted)]">
        {label}
      </dt>
      <dd className="mt-1.5 truncate text-base font-semibold leading-5 tabular-nums text-[var(--fly-text)]">
        {value}
      </dd>
      <p className="mt-1 text-[13px] leading-5 text-[var(--fly-text-muted)]">
        {detail}
      </p>
    </div>
  );
}

function ProductMetricStrip({
  item,
  lastDay,
}: {
  item: UpsellProductCardData;
  lastDay: UpsellDailyRow | null;
}) {
  return (
    <dl className="mt-4 grid grid-cols-2 overflow-hidden rounded-[8px] border border-[var(--fly-border-subtle)] bg-[var(--fly-row-bg)] sm:grid-cols-4 sm:divide-x sm:divide-[var(--fly-divider-subtle)]">
      <ProductMetricItem
        label="Hoje"
        value={lastDay ? formatDateShort(lastDay.day) : "-"}
        detail={`${formatNumber(lastDay?.directSales ?? 0)} vendas`}
      />
      <ProductMetricItem
        label="Conversão hoje"
        value={formatPercent(lastDay?.takeRateTotal ?? 0)}
        detail={`${formatNumber(lastDay?.totalApproved ?? 0)} aprovados`}
      />
      <ProductMetricItem
        label="Últimos 7 dias"
        value={`${formatNumber(item.sevenDayDirectSales)} vendas`}
        detail={`${formatCurrency(item.sevenDayRevenue)} upsell`}
      />
      <ProductMetricItem
        label="Conversão 7D"
        value={formatPercent(item.sevenDayTakeRate)}
        detail={`${formatNumber(item.sevenDayApproved)} aprovados`}
      />
    </dl>
  );
}

function CompactDailyHistory({ rows }: { rows: UpsellDailyRow[] }) {
  const visibleRows = rows.slice(0, 3);

  return (
    <div className="mt-4 border-t border-[var(--fly-divider-subtle)] pt-3">
      <div className="flex min-w-0 items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[var(--fly-text)]">
            Histórico recente
          </p>
          <p className="mt-1 text-xs text-[var(--fly-text-muted)]">
            Últimos dias do período
          </p>
        </div>
        <span className="shrink-0 text-xs font-medium tabular-nums text-[var(--fly-text-muted)]">
          {formatNumber(rows.length)} dias
        </span>
      </div>

      <div className="mt-2 divide-y divide-[var(--fly-divider-subtle)]">
        {visibleRows.length ? (
          visibleRows.map((row) => (
            <div
              key={row.day}
              className="grid grid-cols-[58px_minmax(0,1fr)_auto] items-center gap-3 py-2.5"
            >
              <span className="text-[15px] font-medium tabular-nums text-[var(--fly-text)]">
                {formatDateShort(row.day)}
              </span>
              <span className="min-w-0 truncate text-[13px] text-[var(--fly-text-muted)] sm:text-sm">
                {formatNumber(row.directSales)} vendas ·{" "}
                {formatNumber(row.totalApproved)} aprovados
              </span>
              <span className="shrink-0 text-right text-base font-semibold tabular-nums text-[var(--fly-text)]">
                {formatPercent(row.takeRateTotal)}
              </span>
            </div>
          ))
        ) : (
          <p className="py-4 text-sm text-[var(--fly-text-muted)]">
            Nenhum histórico encontrado no período.
          </p>
        )}
      </div>
    </div>
  );
}

function UpsellProductCard({
  item,
  range,
  selectedChannel,
}: {
  item: UpsellProductCardData;
  range: PerformanceRange;
  selectedChannel: string;
}) {
  const lastDay = item.lastDay;

  return (
    <article className="flynow-dashboard-enter-item min-w-0 rounded-[8px] border border-[var(--fly-border)] bg-[var(--fly-surface)] p-3 shadow-[var(--fly-panel-inset)] sm:p-4">
      <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-2.5">
          <span
            aria-hidden="true"
            className="mt-1 h-8 w-px shrink-0 rounded-full bg-[var(--fly-brand-line)]"
          />
          <div className="min-w-0">
            <h2 className="truncate text-[15px] font-semibold uppercase text-[var(--fly-text)]">
              {item.product}
            </h2>
            <p className="mt-1 text-[15px] text-[var(--fly-text-muted)]">
              {formatNumber(item.directSales)} vendas diretas no período
            </p>
          </div>
        </div>

        <div className="shrink-0 text-left sm:text-right">
          <p className="inline-flex items-center gap-2 text-base font-semibold tabular-nums text-[var(--fly-text)] sm:justify-end">
            <span
              aria-hidden="true"
              className="size-1.5 shrink-0 rounded-full bg-[var(--fly-chart-revenue)]"
            />
            {formatCurrency(item.upsellRevenue)}
          </p>
          <p className="mt-1 text-xs text-[var(--fly-text-muted)]">
            receita de upsell
          </p>
        </div>
      </div>

      <ProductMetricStrip item={item} lastDay={lastDay} />
      <CompactDailyHistory rows={item.dailyRows} />

      <div className="mt-3 flex justify-start sm:justify-end">
        <Link
          className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[var(--fly-brand-strong)] underline decoration-[var(--fly-brand-line)] decoration-1 underline-offset-4 outline-none transition-[color,text-decoration-color] duration-150 hover:text-[var(--fly-chart-revenue-active)] hover:decoration-[var(--fly-chart-revenue-active)] focus-visible:rounded-[4px] focus-visible:ring-2 focus-visible:ring-[var(--fly-brand-ring)]"
          href={buildFunilHistoryHref({
            product: item.product,
            range,
            selectedChannel,
          })}
        >
          <span
            aria-hidden="true"
            className="size-1 shrink-0 rounded-full bg-[var(--fly-chart-revenue)]"
          />
          Ver histórico completo
        </Link>
      </div>
    </article>
  );
}

function EmptyProductsState() {
  return (
    <section className="flynow-dashboard-enter-item rounded-[8px] border border-[var(--fly-border)] bg-[var(--fly-surface)] px-4 py-8 text-center shadow-[var(--fly-panel-inset)]">
      <p className="text-sm font-semibold text-[var(--fly-text)]">
        Nenhum produto encontrado
      </p>
      <p className="mt-2 text-sm text-[var(--fly-text-muted)]">
        Ajuste o período ou os filtros para visualizar os upsells.
      </p>
    </section>
  );
}

export default async function UpsellsPage({
  searchParams,
}: {
  searchParams: Promise<UpsellsPageParams>;
}) {
  const params = await searchParams;
  const range = resolveRange(params);
  const data = await getPerformancePageData(range);
  const productOptions = uniqueOptions(
    [
      ...data.upsells.map((item) => item.product),
      ...data.funnelDays.map((item) => item.product),
    ],
    "Todos os produtos"
  );
  const channelOptions = uniqueOptions(
    data.funnelDays.map((item) => item.channel),
    "Todos os canais",
    formatChannelLabel
  );
  const selectedProduct = resolveFilter(params.product, productOptions);
  const selectedChannel = resolveFilter(params.channel, channelOptions);
  const productCards = buildProductCards(
    data,
    selectedProduct,
    selectedChannel,
    range
  );
  const directSales = productCards.reduce(
    (total, item) => total + item.directSales,
    0
  );
  const approved = productCards.reduce(
    (total, item) => total + item.totalApproved,
    0
  );
  const upsellRevenue = productCards.reduce(
    (total, item) => total + item.upsellRevenue,
    0
  );
  const conversionRate = directSales > 0 ? approved / directSales : 0;

  return (
    <Shell>
      <DashboardHeader
        title="Upsells"
        description="Taxa total como leitura principal; US1 e US2 como apoio por produto"
      />

      <PageBody>
        <UpsellsFilters
          channelOptions={channelOptions}
          productOptions={productOptions}
          range={range}
          selectedChannel={selectedChannel}
          selectedProduct={selectedProduct}
        />

        <StatGrid>
          <UpsellsMetricCard
            label="Vendas diretas"
            value={formatNumber(directSales)}
            detail="base do funil no período"
            tone="neutral"
          />
          <UpsellsMetricCard
            label="Upsells aprovados"
            value={formatNumber(approved)}
            detail="US1 + US2 aprovados"
            tone="green"
          />
          <UpsellsMetricCard
            label="Taxa de conversão"
            value={formatPercent(conversionRate)}
            detail="aprovados sobre vendas diretas"
            tone="blue"
          />
          <UpsellsMetricCard
            label="Receita upsells"
            value={formatCurrency(upsellRevenue)}
            detail="receita incremental aprovada"
            tone="gold"
          />
        </StatGrid>

        {productCards.length ? (
          <div className="grid gap-4 xl:grid-cols-2">
            {productCards.map((item) => (
              <UpsellProductCard
                key={item.product}
                item={item}
                range={range}
                selectedChannel={selectedChannel}
              />
            ))}
          </div>
        ) : (
          <EmptyProductsState />
        )}
      </PageBody>
    </Shell>
  );
}
