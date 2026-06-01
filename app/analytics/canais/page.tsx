import Shell from "@/components/shell";
import PageHeader from "@/components/page-header";
import AnalyticsFilterBar from "@/components/analytics/filter-bar";
import AnalyticsKpiCard from "@/components/analytics/kpi-card";
import ChannelBarsChart from "@/components/analytics/channel-bars-chart";
import { defaultAnalyticsDates, getChannelAnalytics } from "@/lib/analytics";
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

export default async function AnalyticsCanaisPage({
  searchParams,
}: {
  searchParams: Promise<{ startDate?: string; endDate?: string; channel?: string }>;
}) {
  const params = await searchParams;
  const defaults = defaultAnalyticsDates();
  const startDate = params.startDate ?? defaults.startDate;
  const endDate = params.endDate ?? defaults.endDate;
  const channel = params.channel ?? null;
  const data = await getChannelAnalytics(startDate, endDate, channel);

  const channelOptions = Array.from(new Set(data.sourceRows.map((row) => row.canal))).map((value) => ({
    value,
    label: ANALYTICS_CHANNEL_LABELS[value],
  }));

  const revenueByChannel = Array.from(
    data.sourceRows.reduce((acc, row) => {
      const key = row.canal;
      const current = acc.get(key) ?? {
        label: ANALYTICS_CHANNEL_LABELS[row.canal],
        revenue: 0,
      };
      current.revenue += row.receita_total;
      acc.set(key, current);
      return acc;
    }, new Map<string, { label: string; revenue: number }>())
    .values(),
  );

  return (
    <Shell>
      <PageHeader
        titulo="Analytics / Canais"
        subtitulo="Receita PayT por origem, mídia RedTrack por source e leitura heurística por produto"
      />

      <div className="space-y-6 px-6 pb-8">
        <AnalyticsFilterBar
          basePath="/analytics/canais"
          startDate={startDate}
          endDate={endDate}
          channels={channelOptions}
          selectedChannel={channel}
        />

        {!data.configured ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            O schema de analytics ainda não foi provisionado no Supabase ou ainda não recebeu sincronização.
          </div>
        ) : null}

        {!data.redtrackComparable ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Com filtro de canal ativo, os blocos de mídia RedTrack ficam ocultos para evitar comparar receita PayT filtrada com spend agregado de toda a mídia.
          </div>
        ) : null}

        <div className="grid grid-cols-2 gap-4 xl:grid-cols-5">
          <AnalyticsKpiCard label="Receita total" value={formatCurrency(data.summary.revenueTotal)} />
          <AnalyticsKpiCard label="Receita upsells" value={formatCurrency(data.summary.upsellRevenue)} />
          <AnalyticsKpiCard label="Spend" value={formatCurrency(data.summary.spendTotal)} />
          <AnalyticsKpiCard label="Clicks" value={formatInt(data.summary.clicksTotal)} />
          <AnalyticsKpiCard label="ROAS RT" value={data.summary.roas.toFixed(2)} />
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <ChannelBarsChart
            title="Receita por canal"
            data={revenueByChannel}
            dataKey="revenue"
          />

          {data.redtrackComparable ? (
            <ChannelBarsChart
              title="Spend por source RedTrack"
              data={data.mediaBySource.map((row) => ({
                label: row.source,
                revenue: row.spend,
                spend: row.spend,
              }))}
              dataKey="spend"
            />
          ) : (
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <h2 className="text-base font-semibold text-gray-900">Spend por source RedTrack</h2>
              <p className="mt-3 text-sm text-gray-500">
                Indisponível com filtro de canal ativo.
              </p>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold text-gray-900">Top produtos RedTrack</h2>
          <p className="mt-1 text-sm text-gray-500">Consolidação heurística por naming de campanha do RedTrack.</p>
          {!data.redtrackComparable ? (
            <p className="mt-3 text-sm text-gray-500">Indisponível com filtro de canal ativo.</p>
          ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs uppercase tracking-wide text-gray-400">
                  <th className="py-3 pr-4">Produto</th>
                  <th className="py-3 pr-4">Campanha líder</th>
                  <th className="py-3 pr-4">Source líder</th>
                  <th className="py-3 pr-4">Campanhas</th>
                  <th className="py-3 pr-4">Spend</th>
                  <th className="py-3 pr-4">Clicks</th>
                  <th className="py-3 pr-4">Conversões</th>
                  <th className="py-3 pr-4">ROAS</th>
                </tr>
              </thead>
              <tbody>
                {data.topCampaigns.map((row) => (
                  <tr key={row.product} className="border-b border-gray-50">
                    <td className="py-3 pr-4 text-gray-700">{row.product}</td>
                    <td className="py-3 pr-4 text-gray-800">{row.campaign}</td>
                    <td className="py-3 pr-4 text-gray-700">{row.source}</td>
                    <td className="py-3 pr-4 text-gray-700">{formatInt(row.campaignCount)}</td>
                    <td className="py-3 pr-4 text-gray-700">{formatCurrency(row.spend)}</td>
                    <td className="py-3 pr-4 text-gray-700">{formatInt(row.clicks)}</td>
                    <td className="py-3 pr-4 text-gray-700">{formatInt(row.conversions)}</td>
                    <td className="py-3 pr-4 text-gray-700">{row.roas.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          )}
        </div>
      </div>
    </Shell>
  );
}
