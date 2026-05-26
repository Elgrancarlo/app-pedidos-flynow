import { PerformanceDashboard } from "@/components/dashboard/performance-dashboard";
import { DashboardHeader } from "@/components/layout/dashboard-header";
import Shell from "@/components/layout/shell";

function DashboardPage() {
  return (
    <Shell>
      <DashboardHeader
        title="Dashboard"
        description="Visão geral de performance da operação"
      />

      <PerformanceDashboard />
    </Shell>
  );
}

export default DashboardPage;
