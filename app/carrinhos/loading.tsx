import { WorkspaceTablePageSkeleton } from "@/components/workspace/page-skeleton";

export default function CarrinhosLoading() {
  return (
    <WorkspaceTablePageSkeleton
      title="Carrinhos"
      description="Eventos PayT de checkout e abandono no periodo"
      ariaLabel="Carregando carrinhos"
      actionCount={3}
      metricCount={4}
      summaryCount={5}
      tableColumns={6}
      tableRows={8}
    />
  );
}
