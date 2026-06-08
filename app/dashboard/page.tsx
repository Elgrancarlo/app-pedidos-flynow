import { PerformanceDashboard } from "@/components/dashboard/performance-dashboard";
import Shell from "@/components/layout/shell";
import { getDashboardData } from "@/lib/dashboard-data";
import { logServerTiming, timedServerTask } from "@/lib/server-timing";

export const dynamic = "force-dynamic";

async function DashboardPage() {
  const pageStartedAt = performance.now();
  const data = await timedServerTask("dashboard", "data.total", getDashboardData);
  logServerTiming("dashboard", "page.total", pageStartedAt);

  return (
    <Shell>
      <PerformanceDashboard data={data} />
    </Shell>
  );
}

export default DashboardPage;
