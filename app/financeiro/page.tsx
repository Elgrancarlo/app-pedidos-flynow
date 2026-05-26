import Shell from "@/components/layout/shell";
import PageHeader from "@/components/page-header";
import FiltroPeriodo from "@/components/pedidos/filtro-periodo";
import { createServiceClient } from "@/lib/supabase";
import { TrendingUp, TrendingDown, ShoppingBag, Wallet } from "lucide-react";

export const dynamic = "force-dynamic";

function defaultDates() {
  const hoje = new Date();
  const inicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  return {
    startDate: inicio.toISOString().slice(0, 10),
    endDate: hoje.toISOString().slice(0, 10),
  };
}

const fmt = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

interface MetricasFinanceiras {
  chargebacks: number;
  valorChargebacks: number;
  reembolsos: number;
  valorReembolsos: number;
}

async function getFinanceiro(startDate: string, endDate: string) {
  const supabase = createServiceClient();
  const p_start = startDate + "T00:00:00Z";
  const p_end   = endDate   + "T23:59:59Z";

  // Buscar receita bruta e total de pedidos pagos no período
  const { data: pedidosPagos } = await supabase
    .from("pedidos")
    .select("valor_total")
    .eq("status_pagamento", "paid")
    .eq("chargeback", false)
    .gte("data_pagamento", p_start)
    .lte("data_pagamento", p_end);

  const receitaBruta = (pedidosPagos ?? []).reduce((s, p) => s + (p.valor_total ?? 0), 0);
  const totalPedidos = pedidosPagos?.length ?? 0;
  const ticketMedio  = totalPedidos > 0 ? receitaBruta / totalPedidos : 0;

  // Chargebacks + reembolsos via RPC
  const { data: metricasRaw } = await supabase
    .rpc("metricas_financeiras", { p_start, p_end });

  const metricas: MetricasFinanceiras = metricasRaw
    ? {
        chargebacks:       Number((metricasRaw as MetricasFinanceiras).chargebacks      ?? 0),
        valorChargebacks:  Number((metricasRaw as MetricasFinanceiras).valorChargebacks ?? 0),
        reembolsos:        Number((metricasRaw as MetricasFinanceiras).reembolsos       ?? 0),
        valorReembolsos:   Number((metricasRaw as MetricasFinanceiras).valorReembolsos  ?? 0),
      }
    : { chargebacks: 0, valorChargebacks: 0, reembolsos: 0, valorReembolsos: 0 };

  const totalRevertido = metricas.valorChargebacks + metricas.valorReembolsos;
  const receitaLiquida = receitaBruta - totalRevertido;
  const taxaCB = totalPedidos > 0
    ? ((metricas.chargebacks / totalPedidos) * 100).toFixed(1)
    : "0";

  return { receitaBruta, receitaLiquida, totalPedidos, ticketMedio, totalRevertido, taxaCB, metricas };
}

export default async function FinanceiroPage({
  searchParams,
}: {
  searchParams: Promise<{ startDate?: string; endDate?: string }>;
}) {
  const params   = await searchParams;
  const defaults = defaultDates();
  const startDate = params.startDate ?? defaults.startDate;
  const endDate   = params.endDate   ?? defaults.endDate;

  const { receitaBruta, receitaLiquida, totalPedidos, ticketMedio, totalRevertido, taxaCB, metricas } =
    await getFinanceiro(startDate, endDate);

  return (
    <Shell>
      <PageHeader titulo="Financeiro" subtitulo="Receita, reembolsos e chargebacks" />
      <div className="px-6 py-6 space-y-6 pb-12">

        {/* Filtro de período */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <FiltroPeriodo startDate={startDate} endDate={endDate} basePath="/financeiro" />
        </div>

        {/* Cards principais */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp size={14} className="text-green-500" />
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Receita Bruta</p>
            </div>
            <p className="text-2xl font-bold text-green-600 mt-1">{fmt(receitaBruta)}</p>
            <p className="text-xs text-gray-400 mt-1">{totalPedidos} pedidos pagos</p>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center gap-2 mb-1">
              <Wallet size={14} className="text-indigo-500" />
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Receita Líquida</p>
            </div>
            <p className={`text-2xl font-bold mt-1 ${receitaLiquida >= 0 ? "text-indigo-600" : "text-red-600"}`}>
              {fmt(receitaLiquida)}
            </p>
            <p className="text-xs text-gray-400 mt-1">bruta − chargebacks − reembolsos</p>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center gap-2 mb-1">
              <ShoppingBag size={14} className="text-blue-500" />
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Ticket Médio</p>
            </div>
            <p className="text-2xl font-bold text-blue-600 mt-1">{fmt(ticketMedio)}</p>
            <p className="text-xs text-gray-400 mt-1">por pedido pago</p>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center gap-2 mb-1">
              <TrendingDown size={14} className="text-red-400" />
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total Revertido</p>
            </div>
            <p className="text-2xl font-bold text-red-500 mt-1">{fmt(totalRevertido)}</p>
            <p className="text-xs text-gray-400 mt-1">taxa CB: {taxaCB}%</p>
          </div>
        </div>

        {/* Detalhamento de chargebacks e reembolsos */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg border border-gray-200 border-l-4 border-l-red-500 p-4">
            <p className="text-2xl font-bold text-red-600">
              {metricas.chargebacks.toLocaleString("pt-BR")}
            </p>
            <p className="text-xs text-gray-600 mt-1">Chargebacks</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 border-l-4 border-l-red-400 p-4">
            <p className="text-xl font-bold text-red-500 tabular-nums">{fmt(metricas.valorChargebacks)}</p>
            <p className="text-xs text-gray-600 mt-1">Valor em chargeback</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 border-l-4 border-l-amber-500 p-4">
            <p className="text-2xl font-bold text-amber-600">
              {metricas.reembolsos.toLocaleString("pt-BR")}
            </p>
            <p className="text-xs text-gray-600 mt-1">Reembolsos</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 border-l-4 border-l-gray-400 p-4">
            <p className="text-xl font-bold text-gray-700 tabular-nums">{fmt(metricas.valorReembolsos)}</p>
            <p className="text-xs text-gray-600 mt-1">Valor reembolsado</p>
          </div>
        </div>

      </div>
    </Shell>
  );
}
