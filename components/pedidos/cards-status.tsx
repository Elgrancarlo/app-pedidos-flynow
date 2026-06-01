import type { StatusPedido } from "@/lib/supabase";

interface CardsStatusProps {
  contagem: Record<string, number>;
  pipeline: StatusPedido[];
  labels: Record<StatusPedido, string>;
}

const CARD_COLORS: Record<StatusPedido, string> = {
  pago:                "border-l-emerald-400 bg-emerald-50",
  nota_fiscal:         "border-l-sky-400 bg-sky-50",
  separacao:           "border-l-violet-400 bg-violet-50",
  aguardando_postagem: "border-l-yellow-400 bg-yellow-50",
  postado:             "border-l-blue-400 bg-blue-50",
  em_transporte:       "border-l-purple-400 bg-purple-50",
  aguardando_retirada: "border-l-orange-400 bg-orange-50",
  entregue:            "border-l-green-400 bg-green-50",
  devolvido:           "border-l-red-400 bg-red-50",
};

const NUMBER_COLORS: Record<StatusPedido, string> = {
  pago:                "text-emerald-700",
  nota_fiscal:         "text-sky-700",
  separacao:           "text-violet-700",
  aguardando_postagem: "text-yellow-700",
  postado:             "text-blue-700",
  em_transporte:       "text-purple-700",
  aguardando_retirada: "text-orange-700",
  entregue:            "text-green-700",
  devolvido:           "text-red-700",
};

export default function CardsStatus({ contagem, pipeline, labels }: CardsStatusProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
      {pipeline.map((status) => (
        <div
          key={status}
          className={`bg-white rounded-lg border border-gray-200 border-l-4 p-4 ${CARD_COLORS[status]}`}
        >
          <div className={`text-2xl font-bold ${NUMBER_COLORS[status]}`}>
            {(contagem[status] ?? 0).toLocaleString("pt-BR")}
          </div>
          <div className="text-xs text-gray-600 mt-1 leading-tight">{labels[status]}</div>
        </div>
      ))}
    </div>
  );
}
