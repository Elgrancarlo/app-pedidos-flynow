import PedidosClientView from "@/components/pedidos/pedidos-client-view";
import Shell from "@/components/layout/shell";
import {
  createMockPedidos,
  getDefaultPedidosRange,
  getPedidosContagemPorStatus,
  getPedidosFinanceiroResumo,
  getPedidosValorPago,
} from "@/lib/pedidos";

export default function PedidosPage() {
  const pedidos = createMockPedidos();
  const periodo = getDefaultPedidosRange();

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
