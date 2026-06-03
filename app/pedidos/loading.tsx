import { WorkspaceTablePageSkeleton } from "@/components/workspace/page-skeleton";

export default function PedidosLoading() {
  return (
    <WorkspaceTablePageSkeleton
      title="Pedidos"
      description="Pagamentos, rastreios e entregas em uma visao operacional"
      ariaLabel="Carregando pedidos"
      actionCount={2}
      metricCount={4}
      summaryCount={9}
      tableColumns={6}
      tableRows={8}
    />
  );
}
