import Shell from "@/components/layout/shell";
import CarrinhosClientView from "@/components/carrinhos/carrinhos-client-view";
import {
  createMockCarrinhos,
  getCarrinhosFunil,
  getCarrinhosResumo,
  getDefaultCarrinhosRange,
} from "@/lib/carrinhos";

export default function CarrinhosPage() {
  const carrinhos = createMockCarrinhos();
  const periodo = getDefaultCarrinhosRange();

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
