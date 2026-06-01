"use client";

import { useState } from "react";
import type { Pedido } from "@/lib/supabase";
import TabelaPedidos from "./tabela-pedidos";
import KanbanBoard from "./kanban-board";
import ViewToggle from "./view-toggle";
import ModalPedido from "./modal-pedido";

interface PedidosClientViewProps {
  pedidos: Pedido[];
  totalPedidos: number;
  valorTotal: number;
}

export default function PedidosClientView({
  pedidos,
  totalPedidos,
  valorTotal,
}: PedidosClientViewProps) {
  const [view, setView] = useState<"tabela" | "kanban">("tabela");
  const [pedidoModal, setPedidoModal] = useState<Pedido | null>(null);
  const pedidosKanban = pedidos.filter((pedido) =>
    pedido.status_pagamento === "paid" ||
    pedido.status_pagamento === "refunded" ||
    pedido.status_pagamento === "chargeback" ||
    pedido.status_pagamento === "charged_back",
  );

  const fmt = (v: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

  return (
    <div>
      {/* Sub-header: total + toggle */}
      <div className="flex items-center justify-between px-6 pb-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl font-bold text-gray-900">{totalPedidos}</span>
          <span className="text-sm text-gray-500">pedidos</span>
          <span className="text-sm font-semibold text-emerald-600">{fmt(valorTotal)}</span>
          <span className="text-sm text-gray-500">faturamento</span>
        </div>
        <ViewToggle view={view} onChange={setView} />
      </div>

      {/* Conteúdo */}
      {view === "tabela" ? (
        <div className="px-6">
          <TabelaPedidos pedidos={pedidos} onDetalhe={setPedidoModal} />
        </div>
      ) : (
        <KanbanBoard pedidosIniciais={pedidosKanban} onDetalhe={setPedidoModal} />
      )}

      {/* Modal de detalhe */}
      {pedidoModal && (
        <ModalPedido pedido={pedidoModal} onClose={() => setPedidoModal(null)} />
      )}
    </div>
  );
}
