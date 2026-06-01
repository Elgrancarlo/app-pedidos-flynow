"use client";

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { ExternalLink } from "lucide-react";
import type { Pedido } from "@/lib/supabase";

const PAGAMENTO_LABEL: Record<string, string> = {
  credit_card: "Cartão",
  pix:         "Pix",
  boleto:      "Boleto",
};

const PAGAMENTO_ICONE: Record<string, string> = {
  credit_card: "💳",
  pix:         "⚡",
  boleto:      "📄",
};

function fmt(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}

function fmtData(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

interface KanbanCardProps {
  pedido: Pedido;
  onDetalhe?: (pedido: Pedido) => void;
}

export default function KanbanCard({ pedido, onDetalhe }: KanbanCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: pedido.id,
    data: { pedido },
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
  };

  const atrasado =
    pedido.data_prometida_entrega &&
    new Date(pedido.data_prometida_entrega) < new Date() &&
    !["entregue", "devolvido"].includes(pedido.status);

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => onDetalhe?.(pedido)}
      className={[
        "bg-white border rounded-lg p-3 cursor-grab active:cursor-grabbing select-none",
        "hover:border-indigo-300 hover:shadow-sm transition-all",
        isDragging ? "shadow-xl ring-2 ring-indigo-400" : "border-gray-200",
      ].join(" ")}
    >
      {/* Ordem + Nome */}
      <div className="flex items-start justify-between gap-1 mb-1">
        {pedido.ordem_pedido && (
          <span className="text-[10px] text-gray-400 font-mono shrink-0">
            #{pedido.ordem_pedido}
          </span>
        )}
        {pedido.chargeback && (
          <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-medium shrink-0">
            CB
          </span>
        )}
        {atrasado && (
          <span className="text-[10px] bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded font-medium shrink-0">
            Atrasado
          </span>
        )}
      </div>

      <p className="font-semibold text-gray-900 text-sm leading-tight truncate">
        {pedido.cliente_nome}
      </p>

      {/* Produto */}
      <p className="text-xs text-gray-500 mt-0.5 truncate">
        {pedido.produto_grupo ?? pedido.produto_nome ?? "—"}
        {pedido.qtd_potes ? ` · ${pedido.qtd_potes} potes` : ""}
      </p>

      {/* Valor + Pagamento + Data */}
      <div className="flex items-center justify-between mt-2.5">
        <span className="text-sm font-semibold text-emerald-600">
          {pedido.valor_total != null ? fmt(pedido.valor_total) : "—"}
        </span>
        <div className="flex items-center gap-1.5 text-xs text-gray-400">
          <span title={PAGAMENTO_LABEL[pedido.forma_pagamento ?? ""] ?? pedido.forma_pagamento ?? ""}>
            {PAGAMENTO_ICONE[pedido.forma_pagamento ?? ""] ?? "💰"}
          </span>
          <span>{fmtData(pedido.data_pagamento)}</span>
        </div>
      </div>

      {/* Rastreio */}
      {pedido.codigo_rastreio && (
        <p className="text-[10px] text-indigo-500 font-mono mt-1.5 truncate">
          📦 {pedido.codigo_rastreio}
        </p>
      )}

      {/* NFC */}
      {pedido.nfc_numero && (
        <p className="text-[10px] text-gray-400 mt-0.5">
          NF: {pedido.nfc_numero}
        </p>
      )}

      {/* Código Payt com link */}
      <a
        href={`https://app.payt.com.br/admin/vendas/${pedido.payt_transaction_id}`}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        className="inline-flex items-center gap-0.5 text-[10px] text-gray-400 hover:text-indigo-500 font-mono mt-1"
      >
        {pedido.payt_transaction_id}
        <ExternalLink size={9} />
      </a>
    </div>
  );
}
