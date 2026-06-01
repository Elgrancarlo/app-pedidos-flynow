"use client";

import { useDroppable } from "@dnd-kit/core";
import type { Pedido, StatusPedido } from "@/lib/supabase";
import KanbanCard from "./kanban-card";

function fmt(v: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(v);
}

interface KanbanColunaProps {
  status: StatusPedido;
  label: string;
  corHeader: string;
  icone: string;
  pedidos: Pedido[];
  onDetalhe?: (pedido: Pedido) => void;
}

export default function KanbanColuna({
  status,
  label,
  corHeader,
  icone,
  pedidos,
  onDetalhe,
}: KanbanColunaProps) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  const totalValor = pedidos.reduce((s, p) => s + (p.valor_total ?? 0), 0);

  return (
    <div className="w-64 shrink-0 flex flex-col rounded-xl overflow-hidden border border-gray-200 bg-white shadow-sm">
      {/* Header colorido */}
      <div className={`${corHeader} px-4 py-3 flex items-center justify-between`}>
        <div className="flex items-center gap-2">
          <span className="text-base leading-none">{icone}</span>
          <span className="text-white text-sm font-semibold">{label}</span>
        </div>
        <span className="bg-white/20 text-white text-xs font-bold px-2 py-0.5 rounded-full">
          {pedidos.length}
        </span>
      </div>

      {/* Sub-header valor total */}
      <div className="px-4 py-2 border-b border-gray-100 text-xs text-gray-500 font-medium">
        {fmt(totalValor)} em pedidos
      </div>

      {/* Cards droppable */}
      <div
        ref={setNodeRef}
        className={[
          "flex-1 overflow-y-auto p-2.5 space-y-2 transition-colors",
          "max-h-[calc(100vh-280px)]",
          isOver ? "bg-indigo-50" : "bg-gray-50",
        ].join(" ")}
      >
        {pedidos.length === 0 ? (
          <div className={[
            "border-2 border-dashed rounded-lg p-6 text-center transition-colors",
            isOver ? "border-indigo-300 bg-indigo-50" : "border-gray-200",
          ].join(" ")}>
            <p className="text-xs text-gray-400">— vazio —</p>
          </div>
        ) : (
          pedidos.map((p) => (
            <KanbanCard key={p.id} pedido={p} onDetalhe={onDetalhe} />
          ))
        )}
      </div>
    </div>
  );
}
