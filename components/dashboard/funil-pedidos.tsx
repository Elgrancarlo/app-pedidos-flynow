import { STATUS_LABELS } from "@/lib/supabase";
import type { StatusPedido } from "@/lib/supabase";

interface FunilItem {
  status: string;
  total: number;
  valor: number;
}

interface FunilPedidosProps {
  dados: FunilItem[];
}

const ORDEM_FUNIL: StatusPedido[] = [
  "pago", "nota_fiscal", "separacao", "aguardando_postagem",
  "postado", "em_transporte", "aguardando_retirada", "entregue",
];

const COR_BARRA: Record<string, string> = {
  pago:                "bg-emerald-500",
  nota_fiscal:         "bg-sky-500",
  separacao:           "bg-violet-500",
  aguardando_postagem: "bg-yellow-500",
  postado:             "bg-blue-500",
  em_transporte:       "bg-purple-500",
  aguardando_retirada: "bg-orange-500",
  entregue:            "bg-teal-500",
  devolvido:           "bg-red-500",
};

function fmt(v: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(v);
}

export default function FunilPedidos({ dados }: FunilPedidosProps) {
  const dadosOrdenados = ORDEM_FUNIL
    .map((status) => dados.find((d) => d.status === status))
    .filter(Boolean) as FunilItem[];

  // Também incluir devolvido e outros não listados
  const outros = dados.filter((d) => !ORDEM_FUNIL.includes(d.status as StatusPedido));
  const todos = [...dadosOrdenados, ...outros];

  const maxTotal = Math.max(...todos.map((d) => d.total), 1);
  const totalGeral = todos.reduce((s, d) => s + d.total, 0);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Funil de Pedidos</h3>
          <p className="text-xs text-gray-500 mt-0.5">{totalGeral.toLocaleString("pt-BR")} pedidos totais</p>
        </div>
      </div>
      <div className="space-y-3">
        {todos.map((item) => {
          const pct = Math.round((item.total / maxTotal) * 100);
          const label = STATUS_LABELS[item.status as StatusPedido] ?? item.status;
          const cor = COR_BARRA[item.status] ?? "bg-gray-400";
          return (
            <div key={item.status} className="flex items-center gap-3">
              <span className="w-32 text-xs text-gray-600 truncate shrink-0">{label}</span>
              <div className="flex-1 bg-gray-100 rounded-full h-2">
                <div
                  className={`${cor} h-2 rounded-full transition-all duration-500`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="w-10 text-right text-xs font-semibold text-gray-700 tabular-nums">
                {item.total.toLocaleString("pt-BR")}
              </span>
              <span className="w-20 text-right text-xs text-gray-400 tabular-nums">
                {fmt(item.valor)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
