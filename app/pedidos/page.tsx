import PedidosClientView from "@/components/pedidos/pedidos-client-view";
import Shell from "@/components/layout/shell";
import {
  createMockPedidos,
  getDefaultPedidosRange,
  getPedidosContagemPorStatus,
  getPedidosFinanceiroResumo,
  getPedidosValorPago,
  type Pedido,
} from "@/lib/pedidos";
import {
  getPedidosForFrontend,
  getPedidosRealInitialMetrics,
} from "@/lib/pedidos-data";
import { shouldUseMockData } from "@/lib/data-mode";
import { logServerTiming, timedServerTask } from "@/lib/server-timing";

export const dynamic = "force-dynamic";

type PedidosSearchParams = Promise<{
  endDate?: string | string[];
  startDate?: string | string[];
}>;

function getSingleParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function isDateParam(value: string | undefined) {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value));
}

function getPageRange(params: Awaited<PedidosSearchParams>) {
  const defaults = getDefaultPedidosRange();
  const startDate = getSingleParam(params.startDate);
  const endDate = getSingleParam(params.endDate);

  const range = {
    startDate: isDateParam(startDate) ? startDate! : defaults.startDate,
    endDate: isDateParam(endDate) ? endDate! : defaults.endDate,
  };

  return range.startDate <= range.endDate
    ? range
    : { startDate: range.endDate, endDate: range.startDate };
}

function getPedidoPeriodDate(pedido: Pedido) {
  return (pedido.paidAt ?? pedido.createdAt).slice(0, 10);
}

function filterPedidosByRange(
  pedidos: Pedido[],
  range: { startDate: string; endDate: string }
) {
  return pedidos.filter((pedido) => {
    const date = getPedidoPeriodDate(pedido);
    return date >= range.startDate && date <= range.endDate;
  });
}

export default async function PedidosPage({
  searchParams,
}: {
  searchParams: PedidosSearchParams;
}) {
  const pageStartedAt = performance.now();
  const periodo = getPageRange(await searchParams);
  const useMockData = shouldUseMockData();
  const pedidos = useMockData
    ? createMockPedidos()
    : await timedServerTask("pedidos", "data.pedidos", () =>
        getPedidosForFrontend(periodo)
      );
  const postProcessStartedAt = performance.now();
  const metricasPedidos = filterPedidosByRange(pedidos, periodo);
  logServerTiming("pedidos", "postProcess.filter", postProcessStartedAt);
  const metricas = useMockData
    ? {
        contagem: getPedidosContagemPorStatus(metricasPedidos),
        financeiro: getPedidosFinanceiroResumo(metricasPedidos),
        valorPago: getPedidosValorPago(metricasPedidos),
      }
    : await timedServerTask("pedidos", "data.initialMetrics", () =>
        getPedidosRealInitialMetrics(periodo, pedidos)
      );

  logServerTiming("pedidos", "total", pageStartedAt);

  return (
    <Shell>
      <PedidosClientView
        pedidos={pedidos}
        periodoInicial={periodo}
        contagemInicial={metricas.contagem}
        financeiroInicial={metricas.financeiro}
        valorPagoInicial={metricas.valorPago}
      />
    </Shell>
  );
}
