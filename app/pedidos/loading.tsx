import { DashboardHeader } from "@/components/layout/dashboard-header";
import Shell from "@/components/layout/shell";
import {
  PedidosContentSkeleton,
  PedidosHeaderActionsSkeleton,
} from "@/components/pedidos/pedidos-skeleton";

export default function PedidosLoading() {
  return (
    <Shell>
      <DashboardHeader
        title="Pedidos"
        description="Pagamentos, rastreios e entregas em uma visao operacional"
        actions={<PedidosHeaderActionsSkeleton />}
      />

      <div
        role="status"
        aria-label="Carregando pedidos"
        className="min-w-0 overflow-x-clip px-3.5 pb-28 pt-4 sm:px-5 sm:pt-5 xl:px-6 xl:pb-10 xl:pt-6"
      >
        <PedidosContentSkeleton />
        <span className="sr-only">Carregando pedidos.</span>
      </div>
    </Shell>
  );
}
