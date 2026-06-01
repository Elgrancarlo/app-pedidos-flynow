import { AlertTriangle } from "lucide-react";

interface AlertaPedido {
  id: string;
  ordem_pedido: number | null;
  cliente_nome: string;
  produto_grupo: string | null;
  codigo_rastreio: string | null;
  data_prometida_entrega: string | null;
  status: string;
}

interface AlertasAtivosProps {
  pedidos: AlertaPedido[];
}

function diasAtraso(data: string | null): number {
  if (!data) return 0;
  const diff = new Date().getTime() - new Date(data).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

const STATUS_LABEL: Record<string, string> = {
  pago: "Pago", nota_fiscal: "Nota Fiscal", separacao: "Separação",
  aguardando_postagem: "Aguard. Postagem", postado: "Postado",
  em_transporte: "Em Trânsito", aguardando_retirada: "Saiu p/ Entrega",
};

export default function AlertasAtivos({ pedidos }: AlertasAtivosProps) {
  if (pedidos.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle size={16} className="text-orange-500" />
          <h3 className="text-sm font-semibold text-gray-900">Alertas Ativos</h3>
          <span className="bg-gray-100 text-gray-600 text-xs font-bold px-2 py-0.5 rounded-full">0</span>
        </div>
        <p className="text-sm text-gray-400 text-center py-6">Nenhum pedido atrasado ✓</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-orange-200 p-6">
      <div className="flex items-center gap-2 mb-4">
        <AlertTriangle size={16} className="text-orange-500" />
        <h3 className="text-sm font-semibold text-gray-900">Alertas Ativos</h3>
        <span className="bg-orange-100 text-orange-700 text-xs font-bold px-2 py-0.5 rounded-full">
          {pedidos.length}
        </span>
        <p className="text-xs text-gray-500 ml-auto">Pedidos com data prometida vencida</p>
      </div>
      <div className="space-y-2">
        {pedidos.slice(0, 10).map((p) => {
          const atraso = diasAtraso(p.data_prometida_entrega);
          return (
            <div
              key={p.id}
              className="flex items-center gap-3 py-2.5 px-3 rounded-lg bg-orange-50 border border-orange-100"
            >
              {p.ordem_pedido && (
                <span className="text-xs font-mono text-gray-400 shrink-0">
                  #{p.ordem_pedido}
                </span>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{p.cliente_nome}</p>
                <p className="text-xs text-gray-500 truncate">
                  {p.produto_grupo ?? "—"} · {STATUS_LABEL[p.status] ?? p.status}
                </p>
              </div>
              {p.codigo_rastreio && (
                <span className="text-xs font-mono text-indigo-500 truncate max-w-24">
                  {p.codigo_rastreio}
                </span>
              )}
              <span className="text-xs font-semibold text-orange-700 bg-orange-100 px-2 py-0.5 rounded-full shrink-0">
                {atraso}d atraso
              </span>
            </div>
          );
        })}
        {pedidos.length > 10 && (
          <p className="text-xs text-gray-400 text-center pt-2">
            +{pedidos.length - 10} outros alertas
          </p>
        )}
      </div>
    </div>
  );
}
