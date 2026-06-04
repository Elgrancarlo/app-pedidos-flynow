import { PerformanceDashboard } from "@/components/dashboard/performance-dashboard";
import Shell from "@/components/layout/shell";
import { createMockCarrinhos } from "@/lib/carrinhos";
import {
  getCarrinhosForFrontendData,
  getCarrinhosInitialEventLimit,
} from "@/lib/carrinhos-data";
import {
  getDashboardOperationalDatasetRange,
  getDefaultDashboardRange,
} from "@/lib/dashboard-range";
import { shouldUseMockData } from "@/lib/data-mode";
import { createMockPedidos } from "@/lib/pedidos";
import { getPedidosForFrontend } from "@/lib/pedidos-data";

export const dynamic = "force-dynamic";

async function DashboardPage() {
  const useMockData = shouldUseMockData();
  const initialRange = getDefaultDashboardRange();
  const operationalRange = getDashboardOperationalDatasetRange();
  const [pedidos, carrinhos] = useMockData
    ? [createMockPedidos(), createMockCarrinhos()]
    : await Promise.all([
        getPedidosForFrontend(operationalRange),
        getCarrinhosForFrontendData(operationalRange, {
          maxEvents: getCarrinhosInitialEventLimit(),
        }).then((data) => data.carrinhos),
      ]);

  return (
    <Shell>
      <PerformanceDashboard
        initialCarrinhos={carrinhos}
        initialPedidos={pedidos}
        initialRange={initialRange}
      />
    </Shell>
  );
}

export default DashboardPage;
