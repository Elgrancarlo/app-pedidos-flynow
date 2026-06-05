import { Suspense } from "react";
import Shell from "@/components/layout/shell";
import CarrinhosClientView from "@/components/carrinhos/carrinhos-client-view";
import {
  createMockCarrinhos,
  getCarrinhosFunil,
  getCarrinhosResumo,
  getDefaultCarrinhosRange,
  getPresetCarrinhosRange,
  type Carrinho,
  type CarrinhoPeriodoPreset,
} from "@/lib/carrinhos";
import {
  getCarrinhosInitialCartLimit,
  getCarrinhosDatasetRange,
  getCarrinhosForFrontendData,
} from "@/lib/carrinhos-data";
import { toAppDateString } from "@/lib/app-dates";
import { shouldUseMockData } from "@/lib/data-mode";
import CarrinhosLoading from "./loading";

export const dynamic = "force-dynamic";

type CarrinhosSearchParams = Promise<{
  dias?: string | string[];
  endDate?: string | string[];
  startDate?: string | string[];
}>;

function getSingleParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function isDateParam(value: string | undefined) {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value));
}

function getLegacyDaysPreset(value: string | undefined): CarrinhoPeriodoPreset | null {
  if (!value) return null;

  if (value === "1" || value.toLowerCase() === "hoje") return "today";
  if (value.toLowerCase() === "mes" || value.toLowerCase() === "month") return "month";
  if (value === "7" || value === "15" || value === "30") return `${value}d`;

  return null;
}

function getPageRange(params: Awaited<CarrinhosSearchParams>) {
  const defaults = getDefaultCarrinhosRange();
  const startDate = getSingleParam(params.startDate);
  const endDate = getSingleParam(params.endDate);
  const legacyPreset = getLegacyDaysPreset(getSingleParam(params.dias));

  if (!isDateParam(startDate) && !isDateParam(endDate) && legacyPreset) {
    return getPresetCarrinhosRange(legacyPreset);
  }

  const range = {
    startDate: isDateParam(startDate) ? startDate! : defaults.startDate,
    endDate: isDateParam(endDate) ? endDate! : defaults.endDate,
  };

  return range.startDate <= range.endDate
    ? range
    : { startDate: range.endDate, endDate: range.startDate };
}

function getCarrinhoPeriodDate(carrinho: Carrinho) {
  return toAppDateString(carrinho.lastActivityAt);
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

export default function CarrinhosPage({
  searchParams,
}: {
  searchParams: CarrinhosSearchParams;
}) {
  return (
    <Suspense fallback={<CarrinhosLoading />}>
      <CarrinhosDataView searchParams={searchParams} />
    </Suspense>
  );
}

async function CarrinhosDataView({
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
        maxTableCarts: getCarrinhosInitialCartLimit(),
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
