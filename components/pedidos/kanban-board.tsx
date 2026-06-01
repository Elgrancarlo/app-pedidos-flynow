"use client";

import { useState, useCallback } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  closestCenter,
} from "@dnd-kit/core";
import type { Pedido, StatusPedido } from "@/lib/supabase";
import { KANBAN_COLUNAS } from "@/lib/supabase";
import KanbanColuna from "./kanban-coluna";
import KanbanCard from "./kanban-card";

interface KanbanBoardProps {
  pedidosIniciais: Pedido[];
  onDetalhe?: (pedido: Pedido) => void;
}

export default function KanbanBoard({ pedidosIniciais, onDetalhe }: KanbanBoardProps) {
  const [pedidos, setPedidos] = useState<Pedido[]>(pedidosIniciais);
  const [draggingPedido, setDraggingPedido] = useState<Pedido | null>(null);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } })
  );

  const handleDragStart = useCallback((event: { active: { data: { current?: { pedido?: Pedido } } } }) => {
    const pedido = event.active.data.current?.pedido;
    if (pedido) setDraggingPedido(pedido);
  }, []);

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      setDraggingPedido(null);
      const { active, over } = event;
      if (!over) return;

      const pedidoId = active.id as string;
      const novoStatus = over.id as StatusPedido;
      const pedido = pedidos.find((p) => p.id === pedidoId);
      if (!pedido || pedido.status === novoStatus) return;

      // Otimistic update
      setPedidos((prev) =>
        prev.map((p) =>
          p.id === pedidoId ? { ...p, status: novoStatus } : p
        )
      );

      try {
        const res = await fetch(`/api/pedidos/${pedidoId}/status`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: novoStatus }),
        });
        if (!res.ok) throw new Error("Falha ao atualizar status");
      } catch (err) {
        // Reverter em caso de erro
        console.error("[kanban] Erro ao mover pedido:", err);
        setPedidos((prev) =>
          prev.map((p) =>
            p.id === pedidoId ? { ...p, status: pedido.status } : p
          )
        );
        alert("Erro ao mover pedido. Tente novamente.");
      }
    },
    [pedidos]
  );

  const pedidosPorStatus = (status: StatusPedido) =>
    pedidos.filter((p) => p.status === status);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="overflow-x-auto pb-6">
        <div className="flex gap-3 min-w-max px-6 pt-4">
          {KANBAN_COLUNAS.map((col) => (
            <KanbanColuna
              key={col.status}
              status={col.status}
              label={col.label}
              corHeader={col.corHeader}
              icone={col.icone}
              pedidos={pedidosPorStatus(col.status)}
              onDetalhe={onDetalhe}
            />
          ))}
        </div>
      </div>

      <DragOverlay>
        {draggingPedido && (
          <div className="w-64 rotate-2 shadow-2xl">
            <KanbanCard pedido={draggingPedido} />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
