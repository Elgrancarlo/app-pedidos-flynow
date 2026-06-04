import { PerformanceDashboard } from "@/components/dashboard/performance-dashboard";
import Shell from "@/components/layout/shell";
import { getDashboardData } from "@/lib/dashboard-data";

export const dynamic = "force-dynamic";

async function DashboardPage() {
  const data = await getDashboardData();

  return (
    <Shell>
      <PerformanceDashboard data={data} />
    </Shell>
  );
}

export default DashboardPage;
