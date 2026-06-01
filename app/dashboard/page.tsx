import { createServiceClient } from "@/lib/supabase";
import { buildFunilAiAlerts, defaultAnalyticsDates, getFunilAnalytics } from "@/lib/analytics";
import { getPaytCheckoutMonitor } from "@/lib/payt-checkout";
import { getFinancialEventMetrics } from "@/lib/financeiro";
import { getTodayInAppTimezone, getUtcRangeForAppDate } from "@/lib/app-dates";
import Shell from "@/components/shell";
import PageHeader from "@/components/page-header";
import CardMetrica from "@/components/dashboard/card-metrica";
import FunilPedidos from "@/components/dashboard/funil-pedidos";
import GraficoTendencia from "@/components/dashboard/grafico-tendencia";
import AlertasAtivos from "@/components/dashboard/alertas-ativos";
import { ShoppingBag, DollarSign, RefreshCw, TrendingDown, Truck, Bell, ShoppingCart } from "lucide-react";

export const dynamic = "force-dynamic";

async function getDashboardData() {
  const supabase = createServiceClient();

  const hoje = getTodayInAppTimezone();
  const { startTs, endTs } = getUtcRangeForAppDate(hoje);

  const [
    emTransito,
    tendencia,
    funil,
    atrasados,
    carrinhos,
    funilAnalytics,
    vendasHojeRows,
    metricasEventoHoje,
  ] = await Promise.all([
    supabase.rpc("pedidos_em_transito"),
    supabase.rpc("tendencia_30_dias"),
    supabase.rpc("funil_pedidos", { p_start: startTs, p_end: endTs }),
    supabase.rpc("pedidos_atrasados"),
    getPaytCheckoutMonitor(24),
    getFunilAnalytics(defaultAnalyticsDates(7).startDate, defaultAnalyticsDates(7).endDate, null, null, {
      skipImpactAnalysis: true,
    }),
    supabase
      .from("pedidos")
      .select("valor_total")
      .eq("status_pagamento", "paid")
      .not("data_pagamento", "is", null)
      .gte("data_pagamento", startTs)
      .lte("data_pagamento", endTs),
    getFinancialEventMetrics(hoje, hoje),
  ]);

  const vendasHoje = {
    count: vendasHojeRows.data?.length ?? 0,
    valor: (vendasHojeRows.data ?? []).reduce((sum, pedido) => sum + Number(pedido.valor_total ?? 0), 0),
  };

  return {
    vendasHoje,
    emTransito:  emTransito.data  as { count: number; valor: number } | null,
    metricasHoje: metricasEventoHoje,
    tendencia: (tendencia.data ?? []) as Array<{ dia: string; receita: number; reembolsos: number }>,
    funil:     (funil.data ?? [])     as Array<{ status: string; total: number; valor: number }>,
    atrasados: (atrasados.data ?? []) as Array<{
      id: string; ordem_pedido: number | null; cliente_nome: string;
      produto_grupo: string | null; codigo_rastreio: string | null;
      data_prometida_entrega: string | null; status: string;
    }>,
    carrinhos,
    funilAlerts: await buildFunilAiAlerts({
      dailyRows: funilAnalytics.dailyRows,
      logs: funilAnalytics.logs,
      transcripts: funilAnalytics.transcripts,
    }),
  };
}

function fmt(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}

export default async function DashboardPage() {
  const data = await getDashboardData();

  const vendasCount = data.vendasHoje?.count ?? 0;
  const vendasValor = data.vendasHoje?.valor ?? 0;
  const emTransitoCount = data.emTransito?.count ?? 0;
  const reembolsosHoje = data.metricasHoje?.reembolsos ?? 0;
  const valorReembolsosHoje = data.metricasHoje?.valorReembolsos ?? 0;
  const carrinhosAbertos = data.carrinhos.summary.openCount + data.carrinhos.summary.abandonedCount + data.carrinhos.summary.lostCount;

  // Taxa de reembolso: reembolsos / vendas * 100
  const taxaReembolso =
    vendasCount > 0 ? ((reembolsosHoje / vendasCount) * 100).toFixed(1) : "0";

  // Receita líquida = vendas - reembolsos - chargebacks (do dia)
  const receitaLiquida =
    vendasValor -
    (data.metricasHoje?.valorReembolsos ?? 0) -
    (data.metricasHoje?.valorChargebacks ?? 0);
  const totalCheckoutMonitorado =
    data.carrinhos.summary.openCount +
    data.carrinhos.summary.abandonedCount +
    data.carrinhos.summary.lostCount +
    data.carrinhos.summary.recoveredCount;
  const taxaPerdaCheckout =
    totalCheckoutMonitorado > 0
      ? ((data.carrinhos.summary.abandonedCount + data.carrinhos.summary.lostCount) / totalCheckoutMonitorado) * 100
      : 0;
  const taxaRecuperacaoCheckout =
    totalCheckoutMonitorado > 0 ? (data.carrinhos.summary.recoveredCount / totalCheckoutMonitorado) * 100 : 0;
  const totalAlertasFunilCriticos = data.funilAlerts.filter((alert) => alert.level === "alerta").length;

  return (
    <Shell>
      <PageHeader titulo="Dashboard" subtitulo="Métricas do dia atual" />
      <div className="px-6 pb-8 space-y-6">

        {/* Visão Geral */}
        <section>
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Visão Geral</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <CardMetrica
              titulo="Vendas Hoje"
              valor={fmt(vendasValor)}
              subtitulo={`${vendasCount} pedidos`}
              icone={<ShoppingBag size={18} />}
              cor="verde"
            />
            <CardMetrica
              titulo="Receita Líquida"
              valor={fmt(receitaLiquida)}
              subtitulo="vendas do dia - reversões do dia"
              icone={<DollarSign size={18} />}
              cor="verde"
            />
            <CardMetrica
              titulo="Reembolsos Hoje"
              valor={fmt(valorReembolsosHoje)}
              subtitulo={`${reembolsosHoje} eventos`}
              icone={<RefreshCw size={18} />}
              cor="vermelho"
            />
            <CardMetrica
              titulo="Taxa de Reembolso"
              valor={`${taxaReembolso}%`}
              subtitulo="com base nas vendas de hoje"
              icone={<TrendingDown size={18} />}
              cor="laranja"
            />
          </div>
        </section>

        {/* Operacional */}
        <section>
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Operacional</h2>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            <CardMetrica
              titulo="Em Trânsito"
              valor={emTransitoCount.toLocaleString("pt-BR")}
              subtitulo="pedidos em rota"
              icone={<Truck size={18} />}
              cor="azul"
            />
            <CardMetrica
              titulo="Alertas Ativos"
              valor={data.atrasados.length.toString()}
              subtitulo="requerem atenção"
              icone={<Bell size={18} />}
              cor={data.atrasados.length > 0 ? "laranja" : "default"}
            />
            <CardMetrica
              titulo="Carrinhos (24h)"
              valor={carrinhosAbertos.toLocaleString("pt-BR")}
              subtitulo={`${data.carrinhos.summary.openCount} abertos · ${data.carrinhos.summary.abandonedCount} abandonos`}
              icone={<ShoppingCart size={18} />}
              cor={carrinhosAbertos > 0 ? "laranja" : "default"}
            />
          </div>
        </section>

        <section>
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Saúde do Funil</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <CardMetrica
              titulo="Checkout Monitorado"
              valor={totalCheckoutMonitorado.toLocaleString("pt-BR")}
              subtitulo="base dos eventos PayT nas últimas 24h"
              icone={<ShoppingCart size={18} />}
              cor="azul"
            />
            <CardMetrica
              titulo="Taxa de Perda"
              valor={`${taxaPerdaCheckout.toFixed(1)}%`}
              subtitulo={`${data.carrinhos.summary.abandonedCount} abandonos · ${data.carrinhos.summary.lostCount} perdidos`}
              icone={<TrendingDown size={18} />}
              cor={taxaPerdaCheckout >= 40 ? "vermelho" : taxaPerdaCheckout >= 25 ? "laranja" : "default"}
            />
            <CardMetrica
              titulo="Taxa de Recuperação"
              valor={`${taxaRecuperacaoCheckout.toFixed(1)}%`}
              subtitulo={`${data.carrinhos.summary.recoveredCount} recuperados após evento não pago`}
              icone={<RefreshCw size={18} />}
              cor={taxaRecuperacaoCheckout >= 10 ? "verde" : "default"}
            />
            <CardMetrica
              titulo="Alertas de Funil"
              valor={totalAlertasFunilCriticos.toLocaleString("pt-BR")}
              subtitulo={`${data.funilAlerts.length} sinais avaliados pela camada analítica`}
              icone={<Bell size={18} />}
              cor={totalAlertasFunilCriticos > 0 ? "laranja" : "verde"}
            />
          </div>
        </section>

        {/* Análise */}
        <section>
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Análise de Pedidos</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <FunilPedidos dados={data.funil} />
            <GraficoTendencia dados={data.tendencia} />
          </div>
        </section>

        {/* Alertas */}
        <section>
          <AlertasAtivos pedidos={data.atrasados} />
        </section>

        <section>
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-gray-900">Alertas do Funil</h3>
              <span className="text-xs text-gray-400">{data.funilAlerts.length} sinais</span>
            </div>
            <div className="mt-4 space-y-3">
              {data.funilAlerts.map((alert, index) => (
                <div
                  key={`${alert.title}:${index}`}
                  className={`rounded-lg border px-4 py-3 ${
                    alert.level === "alerta"
                      ? "border-rose-200 bg-rose-50"
                      : "border-emerald-200 bg-emerald-50"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-gray-900">{alert.title}</p>
                    <span className="text-[11px] uppercase tracking-wide text-gray-400">{alert.source}</span>
                  </div>
                  <p className="mt-1 text-sm text-gray-600">{alert.detail}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

      </div>
    </Shell>
  );
}
