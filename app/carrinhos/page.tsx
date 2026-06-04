import Shell from "@/components/layout/shell";
import CarrinhosClientView from "@/components/carrinhos/carrinhos-client-view";
import {
  createMockCarrinhos,
  getCarrinhosFunil,
  getCarrinhosResumo,
  getDefaultCarrinhosRange,
} from "@/lib/carrinhos";
import {
  getCarrinhosInitialEventLimit,
  getCarrinhosDatasetRange,
  getCarrinhosForFrontendData,
} from "@/lib/carrinhos-data";
import { shouldUseMockData } from "@/lib/data-mode";

export const dynamic = "force-dynamic";

export default async function CarrinhosPage() {
  const periodo = getDefaultCarrinhosRange();
  const useMockData = shouldUseMockData();
  const datasetRange = useMockData ? getCarrinhosDatasetRange(30) : periodo;
  const data = useMockData
    ? {
        carrinhos: createMockCarrinhos(),
        source: "mock" as const,
        warning: "Modo mock ativo; carrinhos simulados para revisão visual.",
      }
    : await getCarrinhosForFrontendData(datasetRange, {
        maxEvents: getCarrinhosInitialEventLimit(),
      });
  const { carrinhos } = data;

  return (
    <Shell>
      <CarrinhosClientView
        carrinhos={carrinhos}
        dataSource={data.source}
        dataWarning={data.warning}
        periodoInicial={periodo}
        resumoInicial={getCarrinhosResumo(carrinhos)}
        funilInicial={getCarrinhosFunil(carrinhos)}
        referenceDate={new Date().toISOString()}
      />
    </Shell>
  );
}
