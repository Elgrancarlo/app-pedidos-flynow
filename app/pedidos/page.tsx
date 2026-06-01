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
} from "@/lib/pedidos-data";
import { shouldUseMockData } from "@/lib/data-mode";

export const dynamic = "force-dynamic";

export default async function PedidosPage() {
  const periodo = getDefaultPedidosRange();
  const datasetRange = getPedidosDatasetRange(30);
  const pedidos = shouldUseMockData()
    ? createMockPedidos()
    : await getPedidosForFrontend(datasetRange);

  return (
    <Shell>
      <PedidosClientView
        pedidos={pedidos}
        periodoInicial={periodo}
        contagemInicial={getPedidosContagemPorStatus(pedidos)}
        financeiroInicial={getPedidosFinanceiroResumo(pedidos)}
        valorPagoInicial={getPedidosValorPago(pedidos)}
      />
    </Shell>
  );
}
