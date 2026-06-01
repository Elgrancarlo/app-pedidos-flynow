import Shell from "@/components/shell";
import PageHeader from "@/components/page-header";
import AnalyticsFilterBar from "@/components/analytics/filter-bar";
import AnalyticsKpiCard from "@/components/analytics/kpi-card";
import RevenueSpendChart from "@/components/analytics/revenue-spend-chart";
import ChannelBarsChart from "@/components/analytics/channel-bars-chart";
import { defaultAnalyticsDates, getAnalyticsOverview } from "@/lib/analytics";
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

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ startDate?: string; endDate?: string }>;
}) {
  const params = await searchParams;
  const defaults = defaultAnalyticsDates();
  const startDate = params.startDate ?? defaults.startDate;
  const endDate = params.endDate ?? defaults.endDate;
  const data = await getAnalyticsOverview(startDate, endDate);

  return (
    <Shell>
      <PageHeader
        titulo="Analytics"
        subtitulo="Performance de vendas, upsells e mídia no mesmo painel"
      />

      <div className="space-y-6 px-6 pb-8">
        <AnalyticsFilterBar basePath="/analytics" startDate={startDate} endDate={endDate} />

        {!data.configured ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            O schema de analytics ainda não foi provisionado no Supabase ou ainda não recebeu sincronização.
          </div>
        ) : null}

        <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
          <AnalyticsKpiCard label="Faturamento total" value={formatCurrency(data.summary.revenueTotal)} />
          <AnalyticsKpiCard label="Investimento" value={formatCurrency(data.summary.spendTotal)} />
          <AnalyticsKpiCard label="ROAS RT" value={data.summary.roas.toFixed(2)} />
          <AnalyticsKpiCard label="Vendas diretas" value={formatInt(data.summary.directSales)} />
          <AnalyticsKpiCard label="Ticket venda direta" value={formatCurrency(data.summary.aov)} />
          <AnalyticsKpiCard label="Receita upsells" value={formatCurrency(data.summary.upsellRevenue)} />
          <AnalyticsKpiCard label="Clicks" value={formatInt(data.summary.clicksTotal)} />
          <AnalyticsKpiCard label="Conversões RT" value={formatInt(data.summary.conversionsTotal)} />
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.6fr_1fr]">
          <RevenueSpendChart
            data={data.series.map((item) => ({
              day: item.day,
              revenue: item.revenue,
              secondaryValue: item.spend,
              directSales: item.directSales,
            }))}
            title="Faturamento vs investimento"
            secondaryLabel="Investimento"
          />
          <ChannelBarsChart
            title="Top produtos por receita"
            data={data.products.map((item) => ({
              label: item.product,
              revenue: item.revenue,
            }))}
            dataKey="revenue"
          />
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-900">Canais com mais receita</h2>
            <a href="/analytics/canais" className="text-sm font-medium text-gray-700 hover:text-gray-900">
              Ver detalhes
            </a>
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs uppercase tracking-wide text-gray-400">
                  <th className="py-3 pr-4">Canal</th>
                  <th className="py-3 pr-4">Receita</th>
                  <th className="py-3 pr-4">Vendas diretas</th>
                </tr>
              </thead>
              <tbody>
                {data.channels.map((row) => (
                  <tr key={row.channel} className="border-b border-gray-50">
                    <td className="py-3 pr-4 font-medium text-gray-800">
                      {ANALYTICS_CHANNEL_LABELS[row.channel as keyof typeof ANALYTICS_CHANNEL_LABELS] ?? row.label}
                    </td>
                    <td className="py-3 pr-4 text-gray-700">{formatCurrency(row.revenue)}</td>
                    <td className="py-3 pr-4 text-gray-700">{formatInt(row.directSales)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Shell>
  );
}
