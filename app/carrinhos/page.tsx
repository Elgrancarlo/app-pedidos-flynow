import Shell from "@/components/layout/shell";
import CarrinhosClientView from "@/components/carrinhos/carrinhos-client-view";
import {
  createMockCarrinhos,
  getCarrinhosFunil,
  getCarrinhosResumo,
  getDefaultCarrinhosRange,
  type Carrinho,
} from "@/lib/carrinhos";
import {
  getCarrinhosInitialEventLimit,
  getCarrinhosDatasetRange,
  getCarrinhosForFrontendData,
} from "@/lib/carrinhos-data";
import { shouldUseMockData } from "@/lib/data-mode";

export const dynamic = "force-dynamic";

type CarrinhosSearchParams = Promise<{
  endDate?: string | string[];
  startDate?: string | string[];
}>;

function getSingleParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function isDateParam(value: string | undefined) {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value));
}

function getPageRange(params: Awaited<CarrinhosSearchParams>) {
  const defaults = getDefaultCarrinhosRange();
  const startDate = getSingleParam(params.startDate);
  const endDate = getSingleParam(params.endDate);

  const range = {
    startDate: isDateParam(startDate) ? startDate! : defaults.startDate,
    endDate: isDateParam(endDate) ? endDate! : defaults.endDate,
  };

  return range.startDate <= range.endDate
    ? range
    : { startDate: range.endDate, endDate: range.startDate };
}

function getCarrinhoPeriodDate(carrinho: Carrinho) {
  return carrinho.lastActivityAt.slice(0, 10);
}

function filterCarrinhosByRange(
  carrinhos: Carrinho[],
  range: { startDate: string; endDate: string }
) {
  return carrinhos.filter((carrinho) => {
    const date = getCarrinhoPeriodDate(carrinho);
    return date >= range.startDate && date <= range.endDate;
  });
}

export default async function CarrinhosPage({
  searchParams,
}: {
  searchParams: CarrinhosSearchParams;
}) {
  const periodo = getPageRange(await searchParams);
  const useMockData = shouldUseMockData();
  const datasetRange = useMockData ? getCarrinhosDatasetRange(30) : periodo;
  const data = useMockData
    ? {
        carrinhos: createMockCarrinhos(),
        metrics: undefined,
        source: "mock" as const,
        warning: "Modo mock ativo; carrinhos simulados para revisão visual.",
      }
    : await getCarrinhosForFrontendData(datasetRange, {
        maxEvents: getCarrinhosInitialEventLimit(),
      });
  const { carrinhos } = data;
  const metricCarrinhos = useMockData
    ? filterCarrinhosByRange(carrinhos, periodo)
    : carrinhos;
  const resumoInicial = data.metrics?.resumo ?? getCarrinhosResumo(metricCarrinhos);
  const funilInicial = data.metrics?.funil ?? getCarrinhosFunil(metricCarrinhos);

  return (
    <Shell>
      <CarrinhosClientView
        carrinhos={carrinhos}
        dataSource={data.source}
        dataWarning={data.warning}
        periodoInicial={periodo}
        resumoInicial={resumoInicial}
        funilInicial={funilInicial}
        referenceDate={new Date().toISOString()}
      />
    </Shell>
  );
}
