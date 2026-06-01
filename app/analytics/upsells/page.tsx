import Shell from "@/components/shell";
import PageHeader from "@/components/page-header";
import AnalyticsFilterBar from "@/components/analytics/filter-bar";
import AnalyticsKpiCard from "@/components/analytics/kpi-card";
import { defaultAnalyticsDates, getUpsellAnalytics } from "@/lib/analytics";
import { ANALYTICS_CHANNEL_LABELS } from "@/lib/supabase";

export const dynamic = "force-dynamic";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function formatInt(value: number) {
  return new Intl.NumberFormat("pt-BR").format(value);
}

function formatPercent(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}

function formatShortDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  });
}

export default async function AnalyticsUpsellsPage({
  searchParams,
}: {
  searchParams: Promise<{ startDate?: string; endDate?: string; product?: string; channel?: string }>;
}) {
  const params = await searchParams;
  const defaults = defaultAnalyticsDates();
  const startDate = params.startDate ?? defaults.startDate;
  const endDate = params.endDate ?? defaults.endDate;
  const product = params.product ?? null;
  const channel = params.channel ?? null;
  const data = await getUpsellAnalytics(startDate, endDate, product, channel);

  const productOptions = data.products.map((row) => row.product);
  const channelOptions = Object.entries(ANALYTICS_CHANNEL_LABELS).map(([value, label]) => ({ value, label }));

  return (
    <Shell>
      <PageHeader
        titulo="Analytics / Upsells"
        subtitulo="Leitura específica de US1 e US2 por produto, seguindo o modelo do dashboard do Herberth"
      />

      <div className="space-y-6 px-6 pb-8">
        <AnalyticsFilterBar
          basePath="/analytics/upsells"
          startDate={startDate}
          endDate={endDate}
          products={productOptions}
          channels={channelOptions}
          selectedProduct={product}
          selectedChannel={channel}
        />

        {!data.configured ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Sem dados de upsell no período. Rode a sincronização PayT e ajuste o filtro.
          </div>
        ) : null}

        <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
          <AnalyticsKpiCard label="Vendas diretas" value={formatInt(data.summary.directSales)} />
          <AnalyticsKpiCard label="Upsells aprovados" value={formatInt(data.summary.totalApproved)} />
          <AnalyticsKpiCard
            label="Taxa de conversão"
            value={formatPercent(data.summary.directSales > 0 ? data.summary.totalApproved / data.summary.directSales : 0)}
          />
          <AnalyticsKpiCard label="Receita upsells" value={formatCurrency(data.summary.upsellRevenue)} />
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {data.products.map((row) => {
            const latestDay = row.days[row.days.length - 1] ?? null;
            const recentDays = row.days.slice(-7).reverse();
            const last7 = recentDays.reduce(
              (acc, day) => {
                acc.directSales += day.directSales;
                acc.totalApproved += day.totalApproved;
                acc.us1Wins += day.us1Wins;
                acc.us2Wins += day.us2Wins;
                acc.upsellRevenue += day.upsellRevenue;
                return acc;
              },
              { directSales: 0, totalApproved: 0, us1Wins: 0, us2Wins: 0, upsellRevenue: 0 },
            );

            const last7TakeTotal = last7.directSales > 0 ? last7.totalApproved / last7.directSales : 0;
            const last7TakeUs1 = last7.directSales > 0 ? last7.us1Wins / last7.directSales : 0;
            const last7TakeUs2 = last7.directSales > 0 ? last7.us2Wins / last7.directSales : 0;
            const todayApproved = latestDay?.totalApproved ?? 0;
            const hasUsBreakdown = row.us1Wins > 0 || row.us2Wins > 0;

            return (
              <div key={row.product} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-base font-semibold text-gray-900">{row.product}</h2>
                    <p className="mt-1 text-sm text-gray-500">
                      {formatInt(row.directSales)} vendas diretas no período
                    </p>
                  </div>
                  <div className="text-right text-sm">
                    <div className="font-semibold text-gray-900">{formatCurrency(row.upsellRevenue)}</div>
                    <div className="text-gray-500">receita de upsell</div>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
                  <div className="rounded-xl bg-gray-50 p-3">
                    <p className="text-xs uppercase tracking-wide text-gray-400">Hoje</p>
                    <p className="mt-1 text-sm font-semibold text-gray-900">
                      {latestDay ? formatShortDate(latestDay.day) : "—"}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      {latestDay ? `${formatInt(latestDay.directSales)} vendas` : "Sem leitura"}
                    </p>
                  </div>
                  <div className="rounded-xl bg-gray-50 p-3">
                    <p className="text-xs uppercase tracking-wide text-gray-400">Taxa de conversão hoje</p>
                    <p className="mt-1 text-sm font-semibold text-gray-900">
                      {latestDay ? formatPercent(latestDay.takeRateTotal) : "0.0%"}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">{formatInt(todayApproved)} aprovados</p>
                  </div>
                  <div className="rounded-xl bg-gray-50 p-3">
                    <p className="text-xs uppercase tracking-wide text-gray-400">Últimos 7 dias</p>
                    <p className="mt-1 text-sm font-semibold text-gray-900">{formatInt(last7.directSales)} vendas</p>
                    <p className="mt-1 text-xs text-gray-500">{formatCurrency(last7.upsellRevenue)} upsell</p>
                  </div>
                  <div className="rounded-xl bg-gray-50 p-3">
                    <p className="text-xs uppercase tracking-wide text-gray-400">Taxa de conversão 7d</p>
                    <p className="mt-1 text-sm font-semibold text-gray-900">
                      {formatPercent(last7TakeTotal)}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">{formatInt(last7.totalApproved)} aprovados</p>
                  </div>
                </div>

                {hasUsBreakdown ? (
                  <div className="mt-3 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
                    <p className="font-medium">Detalhe por etapa</p>
                    <p className="mt-1">
                      Taxa de conversão US1: {formatPercent(row.takeRateUs1)} · Taxa de conversão US2: {formatPercent(row.takeRateUs2)}
                    </p>
                  </div>
                ) : (
                  <div className="mt-3 rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm text-gray-600">
                    Este produto não tem marcação consistente de US1/US2 no período. A leitura principal aqui é a taxa de conversão total de upsell.
                  </div>
                )}

                <div className="mt-4 rounded-xl border border-gray-100">
                  <div className="border-b border-gray-100 px-4 py-3">
                    <p className="text-sm font-medium text-gray-900">Últimos 7 dias</p>
                    <p className="mt-1 text-xs text-gray-500">Resumo rápido antes de abrir o histórico completo</p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-100 text-left text-xs uppercase tracking-wide text-gray-400">
                          <th className="py-3 pl-4 pr-4">Dia</th>
                          <th className="py-3 pr-4">Vendas</th>
                          <th className="py-3 pr-4">Aprovados</th>
                          <th className="py-3 pr-4">Taxa de conversão</th>
                          <th className="py-3 pr-4">R$ upsell</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recentDays.map((day) => (
                          <tr key={`${row.product}-${day.day}`} className="border-b border-gray-50">
                            <td className="py-3 pl-4 pr-4 text-gray-700">{formatShortDate(day.day)}</td>
                            <td className="py-3 pr-4 text-gray-700">{formatInt(day.directSales)}</td>
                            <td className="py-3 pr-4 text-gray-700">{formatInt(day.totalApproved)}</td>
                            <td className="py-3 pr-4 text-gray-700">{formatPercent(day.takeRateTotal)}</td>
                            <td className="py-3 pr-4 text-gray-700">{formatCurrency(day.upsellRevenue)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <details className="mt-4 rounded-xl border border-gray-100">
                  <summary className="cursor-pointer list-none px-4 py-3 text-sm font-medium text-gray-900">
                    Ver histórico completo do período
                  </summary>
                  <div className="border-t border-gray-100 overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-100 text-left text-xs uppercase tracking-wide text-gray-400">
                          <th className="py-3 pl-4 pr-4">Dia</th>
                          <th className="py-3 pr-4">Vendas</th>
                          <th className="py-3 pr-4">Aprovados</th>
                          <th className="py-3 pr-4">Taxa conv.</th>
                          <th className="py-3 pr-4">Taxa conv. US1</th>
                          <th className="py-3 pr-4">Taxa conv. US2</th>
                          <th className="py-3 pr-4">R$ upsell</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[...row.days].reverse().map((day) => (
                          <tr key={`${row.product}-full-${day.day}`} className="border-b border-gray-50">
                            <td className="py-3 pl-4 pr-4 text-gray-700">{formatShortDate(day.day)}</td>
                            <td className="py-3 pr-4 text-gray-700">{formatInt(day.directSales)}</td>
                            <td className="py-3 pr-4 text-gray-700">{formatInt(day.totalApproved)}</td>
                            <td className="py-3 pr-4 text-gray-700">{formatPercent(day.takeRateTotal)}</td>
                            <td className="py-3 pr-4 text-gray-700">{formatPercent(day.takeRateUs1)}</td>
                            <td className="py-3 pr-4 text-gray-700">{formatPercent(day.takeRateUs2)}</td>
                            <td className="py-3 pr-4 text-gray-700">{formatCurrency(day.upsellRevenue)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </details>
              </div>
            );
          })}
        </div>
      </div>
    </Shell>
  );
}
