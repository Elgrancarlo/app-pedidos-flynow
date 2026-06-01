function fmt(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}

interface MetricasFinanceiras {
  chargebacks: number;
  valorChargebacks: number;
  reembolsos: number;
  valorReembolsos: number;
}

interface CardsFinanceiroProps {
  metricas: MetricasFinanceiras;
}

export default function CardsFinanceiro({ metricas }: CardsFinanceiroProps) {
  const totalExposicao = metricas.valorChargebacks + metricas.valorReembolsos;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      {/* Chargebacks — count */}
      <div className="bg-white rounded-lg border border-gray-200 border-l-4 border-l-red-500 p-4">
        <div className="text-2xl font-bold text-red-600">
          {metricas.chargebacks.toLocaleString("pt-BR")}
        </div>
        <div className="text-xs text-gray-600 mt-1">Chargebacks no período</div>
      </div>

      {/* Chargebacks — value */}
      <div className="bg-white rounded-lg border border-gray-200 border-l-4 border-l-red-400 p-4">
        <div className="text-xl font-bold text-red-500 tabular-nums">
          {fmt(metricas.valorChargebacks)}
        </div>
        <div className="text-xs text-gray-600 mt-1">Valor em chargeback no período</div>
      </div>

      {/* Reembolsos — count */}
      <div className="bg-white rounded-lg border border-gray-200 border-l-4 border-l-amber-500 p-4">
        <div className="text-2xl font-bold text-amber-600">
          {metricas.reembolsos.toLocaleString("pt-BR")}
        </div>
        <div className="text-xs text-gray-600 mt-1">Reembolsos no período</div>
      </div>

      {/* Exposição total */}
      <div className="bg-white rounded-lg border border-gray-200 border-l-4 border-l-gray-400 p-4">
        <div className="text-xl font-bold text-gray-700 tabular-nums">
          {fmt(totalExposicao)}
        </div>
        <div className="text-xs text-gray-600 mt-1">Total revertido no período</div>
      </div>
    </div>
  );
}
