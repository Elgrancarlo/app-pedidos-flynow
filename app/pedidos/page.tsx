import PedidosClientView from "@/components/pedidos/pedidos-client-view";
import Shell from "@/components/layout/shell";
import {
  createMockPedidos,
  getDefaultPedidosRange,
  getPedidosContagemPorStatus,
  getPedidosFinanceiroResumo,
  getPedidosValorPago,
} from "@/lib/pedidos";
import {
  getPedidosDatasetRange,
  getPedidosForFrontend,
  getPedidosInitialRealLimit,
  getPedidosRealInitialMetrics,
} from "@/lib/pedidos-data";
import { shouldUseMockData } from "@/lib/data-mode";

export const dynamic = "force-dynamic";

export default async function PedidosPage() {
  const periodo = getDefaultPedidosRange();
  const datasetRange = shouldUseMockData() ? getPedidosDatasetRange(30) : periodo;
  const useMockData = shouldUseMockData();
  const pedidos = useMockData
    ? createMockPedidos()
    : await getPedidosForFrontend(datasetRange, {
        maxRows: getPedidosInitialRealLimit(),
      });
  const metricas = useMockData
    ? {
        contagem: getPedidosContagemPorStatus(pedidos),
        financeiro: getPedidosFinanceiroResumo(pedidos),
        valorPago: getPedidosValorPago(pedidos),
      }
    : await getPedidosRealInitialMetrics(datasetRange, pedidos);

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
