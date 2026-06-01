import Shell from "@/components/shell";
import PageHeader from "@/components/page-header";
import AnalyticsFilterBar from "@/components/analytics/filter-bar";
import AnalyticsKpiCard from "@/components/analytics/kpi-card";
import RevenueSpendChart from "@/components/analytics/revenue-spend-chart";
import FunilTakeRateChart from "@/components/analytics/funil-take-rate-chart";
import LogAlteracaoForm from "@/components/analytics/log-alteracao-form";
import TranscriptForm from "@/components/analytics/transcript-form";
import { buildFunilAlerts, defaultAnalyticsDates, getFunilAnalytics } from "@/lib/analytics";
import { type AnalyticsCanal, ANALYTICS_CHANNEL_LABELS } from "@/lib/supabase";

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

function estimateWins(takeRate: number, directSales: number) {
  if (takeRate <= 0 || directSales <= 0) return 0;
  return Math.round(takeRate * directSales);
}

function impactTone(severity: string) {
  switch (severity) {
    case "positivo":
      return "border-emerald-200 bg-emerald-50 text-emerald-900";
    case "alerta":
      return "border-rose-200 bg-rose-50 text-rose-900";
    case "pendente":
      return "border-amber-200 bg-amber-50 text-amber-900";
    default:
      return "border-gray-200 bg-gray-50 text-gray-800";
  }
}

function statusTone(status: string | null | undefined) {
  switch (status) {
    case "analisado":
      return "bg-emerald-100 text-emerald-700";
    case "revisado":
      return "bg-sky-100 text-sky-700";
    default:
      return "bg-amber-100 text-amber-700";
  }
}

export default async function AnalyticsFunilPage({
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
  const data = await getFunilAnalytics(startDate, endDate, product, channel, {
    skipImpactAnalysis: true,
  });

  const productOptions = Array.from(new Set(data.dailyRows.map((row) => row.product_base))).sort();
  const channelOptions = Array.from(new Set(data.dailyRows.map((row) => row.canal))).map((value) => ({
    value,
    label: ANALYTICS_CHANNEL_LABELS[value],
  }));
  const alerts = buildFunilAlerts(data.dailyRows).map((alert) => ({
    ...alert,
    source: "regras",
  }));

  const series = Array.from(
    data.dailyRows.reduce((map, row) => {
      const current = map.get(row.day) ?? {
        day: row.day,
        revenue: 0,
        upsellRevenue: 0,
        directSales: 0,
        us1Wins: 0,
        us2Wins: 0,
      };
      current.revenue += row.receita_total;
      current.upsellRevenue += row.receita_upsells;
      current.directSales += row.qtd_vendas_diretas;
      current.us1Wins += estimateWins(row.take_rate_us1, row.qtd_vendas_diretas);
      current.us2Wins += estimateWins(row.take_rate_us2, row.qtd_vendas_diretas);
      map.set(row.day, current);
      return map;
    }, new Map<string, { day: string; revenue: number; upsellRevenue: number; directSales: number; us1Wins: number; us2Wins: number }>()),
  )
    .map(([, row]) => ({
      day: row.day,
      revenue: row.revenue,
      secondaryValue: row.upsellRevenue,
      directSales: row.directSales,
      take_rate_us1: row.directSales > 0 ? row.us1Wins / row.directSales : 0,
      take_rate_us2: row.directSales > 0 ? row.us2Wins / row.directSales : 0,
    }))
    .sort((left, right) => left.day.localeCompare(right.day));

  const sourceSummaryRows = Array.from(
    data.sourceRows.reduce((map, row) => {
      const key = [
        row.canal,
        row.utm_campaign ?? "",
        row.utm_medium ?? "",
        row.utm_source ?? "",
      ].join("|");
      const current = map.get(key) ?? {
        canal: row.canal,
        utm_campaign: row.utm_campaign,
        utm_medium: row.utm_medium,
        utm_source: row.utm_source,
        qtd_vendas: 0,
        receita_total: 0,
        qtd_upsells: 0,
        receita_upsells: 0,
      };
      current.qtd_vendas += row.qtd_vendas;
      current.receita_total += row.receita_total;
      current.qtd_upsells += row.qtd_upsells;
      current.receita_upsells += row.receita_upsells;
      map.set(key, current);
      return map;
    }, new Map<string, { canal: AnalyticsCanal; utm_campaign: string | null; utm_medium: string | null; utm_source: string | null; qtd_vendas: number; receita_total: number; qtd_upsells: number; receita_upsells: number }>()),
  )
    .map(([, row]) => ({
      ...row,
      upsell_ratio: row.qtd_vendas > 0 ? row.qtd_upsells / row.qtd_vendas : 0,
    }))
    .sort((left, right) => right.receita_total - left.receita_total)
    .slice(0, 50);

  return (
    <Shell>
      <PageHeader
        titulo="Analytics / Funil"
        subtitulo="Funil diário por produto, canal e take rate de upsells"
      />

      <div className="space-y-6 px-6 pb-8">
        <AnalyticsFilterBar
          basePath="/analytics/funil"
          startDate={startDate}
          endDate={endDate}
          products={productOptions}
          channels={channelOptions}
          selectedProduct={product}
          selectedChannel={channel}
        />

        {!data.configured ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            O schema de analytics ainda não foi provisionado no Supabase ou ainda não recebeu sincronização.
          </div>
        ) : null}

        <div className="grid grid-cols-2 gap-4 xl:grid-cols-3">
          <AnalyticsKpiCard label="Vendas diretas" value={formatInt(data.summary.directSales)} />
          <AnalyticsKpiCard label="Receita total" value={formatCurrency(data.summary.revenueTotal)} />
          <AnalyticsKpiCard label="Receita upsells" value={formatCurrency(data.summary.upsellRevenue)} />
          <AnalyticsKpiCard label="AOV médio" value={formatCurrency(data.summary.averageAov)} />
          <AnalyticsKpiCard label="Take rate US1" value={formatPercent(data.summary.averageTakeRateUs1)} />
          <AnalyticsKpiCard label="Take rate US2" value={formatPercent(data.summary.averageTakeRateUs2)} />
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <RevenueSpendChart
            data={series}
            title="Faturamento vs receita de upsell"
            secondaryLabel="Receita upsells"
          />
          <FunilTakeRateChart data={series} />
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-gray-900">Alertas automáticos do funil</h2>
            <span className="text-xs text-gray-400">{alerts.length} sinais na janela</span>
          </div>
          <div className="mt-4 space-y-3">
            {alerts.map((alert, index) => (
              <div
                key={`${alert.title}:${index}`}
                className={`rounded-xl border px-4 py-3 ${impactTone(alert.level === "alerta" ? "alerta" : "neutro")}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium">{alert.title}</p>
                  <span className="text-[11px] uppercase tracking-wide opacity-60">{alert.source}</span>
                </div>
                <p className="mt-1 text-sm opacity-80">{alert.detail}</p>
              </div>
            ))}
          </div>
        </div>

        <LogAlteracaoForm defaultDay={endDate} products={productOptions} />
        <TranscriptForm defaultDay={endDate} products={productOptions} />

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold text-gray-900">Resumo por fonte no período</h2>
          {product ? (
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              O resumo por fonte não possui dimensão de produto na fact atual. Com filtro de produto ativo, esta seção fica oculta para evitar leitura incorreta.
            </div>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left text-xs uppercase tracking-wide text-gray-400">
                    <th className="py-3 pr-4">Canal</th>
                    <th className="py-3 pr-4">UTM campaign</th>
                    <th className="py-3 pr-4">UTM source</th>
                    <th className="py-3 pr-4">Vendas</th>
                    <th className="py-3 pr-4">Receita</th>
                    <th className="py-3 pr-4">Receita upsells</th>
                    <th className="py-3 pr-4">Upsell ratio</th>
                  </tr>
                </thead>
                <tbody>
                  {sourceSummaryRows.map((row) => (
                    <tr
                      key={[
                        row.canal,
                        row.utm_campaign ?? "",
                        row.utm_medium ?? "",
                        row.utm_source ?? "",
                      ].join("|")}
                      className="border-b border-gray-50"
                    >
                      <td className="py-3 pr-4 text-gray-700">{ANALYTICS_CHANNEL_LABELS[row.canal]}</td>
                      <td className="py-3 pr-4 text-gray-700">{row.utm_campaign ?? "—"}</td>
                      <td className="py-3 pr-4 text-gray-700">{row.utm_source ?? "—"}</td>
                      <td className="py-3 pr-4 text-gray-700">{formatInt(row.qtd_vendas)}</td>
                      <td className="py-3 pr-4 text-gray-700">{formatCurrency(row.receita_total)}</td>
                      <td className="py-3 pr-4 text-gray-700">{formatCurrency(row.receita_upsells)}</td>
                      <td className="py-3 pr-4 text-gray-700">{formatPercent(row.upsell_ratio)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold text-gray-900">Log de alterações</h2>
          <div className="mt-4 space-y-3">
            {data.logs.length === 0 ? (
              <p className="text-sm text-gray-500">Nenhuma alteração registrada no período.</p>
            ) : (
              data.logs.slice(0, 20).map((log) => {
                const impact = data.logImpacts.find((item) => item.logId === log.id);
                return (
                <div key={log.id} className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
                  <p className="text-xs uppercase tracking-wide text-gray-400">
                    {log.day} · {log.componente}
                  </p>
                  <p className="mt-1 text-sm text-gray-800">{log.descricao ?? "Sem descrição"}</p>
                  <p className="mt-1 text-xs text-gray-500">
                    Produto: {log.produto_afetado ?? "Todos"} · Responsável: {log.responsavel ?? "—"}
                  </p>
                  {log.tipo_alteracao || log.hipotese ? (
                    <p className="mt-1 text-xs text-gray-500">
                      Tipo: {log.tipo_alteracao ?? "—"} · Hipótese: {log.hipotese ?? "—"}
                    </p>
                  ) : null}
                  {impact ? (
                    <div className={`mt-3 rounded-xl border px-3 py-3 ${impactTone(impact.severity)}`}>
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-xs uppercase tracking-wide opacity-70">Impacto da alteração</p>
                        <div className="flex items-center gap-2">
                          <span className={`rounded-full px-2 py-1 text-[11px] font-medium uppercase tracking-wide ${statusTone(log.status_analise)}`}>
                            {log.status_analise ?? "pendente"}
                          </span>
                          <span className="text-[11px] uppercase tracking-wide opacity-60">{impact.source}</span>
                        </div>
                      </div>
                      <p className="mt-1 text-sm font-medium">{impact.insight}</p>
                      <p className="mt-2 text-xs opacity-80">{impact.context}</p>
                      <div className="mt-2 grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <p className="opacity-70">Antes (7 dias)</p>
                          <p>Receita/dia: {formatCurrency(impact.before.revenuePerDay)}</p>
                          <p>Take rate US1: {formatPercent(impact.before.avgTakeRateUs1)}</p>
                        </div>
                        <div>
                          <p className="opacity-70">Depois (7 dias)</p>
                          <p>Receita/dia: {formatCurrency(impact.after.revenuePerDay)}</p>
                          <p>Take rate US1: {formatPercent(impact.after.avgTakeRateUs1)}</p>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              )})
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold text-gray-900">Transcrições operacionais</h2>
          <div className="mt-4 space-y-3">
            {data.transcripts.length === 0 ? (
              <p className="text-sm text-gray-500">
                Nenhuma transcrição encontrada no período. Se o formulário acima retornar erro de schema, aplique a migration 017 no Supabase.
              </p>
            ) : (
              data.transcripts.slice(0, 10).map((item) => (
                <div key={item.id} className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
                  <p className="text-xs uppercase tracking-wide text-gray-400">
                    {item.happened_at ? new Date(item.happened_at).toLocaleString("pt-BR") : "Sem data"} · {item.area ?? "Sem área"}
                  </p>
                  <p className="mt-1 text-sm font-medium text-gray-900">{item.title}</p>
                  {item.summary ? <p className="mt-1 text-sm text-gray-700">{item.summary}</p> : null}
                  <p className="mt-1 text-xs text-gray-500">
                    Participantes: {item.participants.length > 0 ? item.participants.join(", ") : "—"} · Produtos: {item.related_products.length > 0 ? item.related_products.join(", ") : "—"}
                  </p>
                  {item.tags.length > 0 ? (
                    <p className="mt-1 text-xs text-gray-500">
                      Tags: {item.tags.join(", ")}
                    </p>
                  ) : null}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </Shell>
  );
}
