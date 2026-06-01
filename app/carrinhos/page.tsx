import Shell from "@/components/layout/shell";
import CarrinhosClientView from "@/components/carrinhos/carrinhos-client-view";
import {
  createMockCarrinhos,
  getCarrinhosFunil,
  getCarrinhosResumo,
  getDefaultCarrinhosRange,
} from "@/lib/carrinhos";
import {
  getCarrinhosDatasetRange,
  getCarrinhosForFrontend,
} from "@/lib/carrinhos-data";
import { shouldUseMockData } from "@/lib/data-mode";

export const dynamic = "force-dynamic";

export default async function CarrinhosPage() {
  const periodo = getDefaultCarrinhosRange();
  const datasetRange = getCarrinhosDatasetRange(30);
  const carrinhos = shouldUseMockData()
    ? createMockCarrinhos()
    : await getCarrinhosForFrontend(datasetRange);

  return (
    <Shell>
      <CarrinhosClientView
        carrinhos={carrinhos}
        periodoInicial={periodo}
        resumoInicial={getCarrinhosResumo(carrinhos)}
        funilInicial={getCarrinhosFunil(carrinhos)}
        referenceDate={new Date().toISOString()}
      />
    </Shell>
  );
}
