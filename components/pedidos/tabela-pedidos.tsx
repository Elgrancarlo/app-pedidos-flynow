"use client";

import { useState, useMemo } from "react";
import { ExternalLink } from "lucide-react";
import type { Pedido, StatusPedido } from "@/lib/supabase";
import { PAYMENT_STATUS_COLORS, PAYMENT_STATUS_LABELS, STATUS_LABELS, STATUS_COLORS } from "@/lib/supabase";

interface TabelaPedidosProps {
  pedidos: Pedido[];
  onDetalhe?: (pedido: Pedido) => void;
}

const FILTRO_STATUS: Array<{ value: string; label: string }> = [
  { value: "", label: "Todos os status" },
  { value: "aguardando_postagem", label: "Aguardando Postagem" },
  { value: "postado", label: "Postado" },
  { value: "em_transporte", label: "Em Transporte" },
  { value: "aguardando_retirada", label: "Aguardando Retirada" },
  { value: "entregue", label: "Entregue" },
  { value: "devolvido", label: "Devolvido" },
  { value: "entregue+chargeback", label: "Entregue + Chargeback" },
];

export default function TabelaPedidos({ pedidos, onDetalhe }: TabelaPedidosProps) {
  const [filtroStatus, setFiltroStatus] = useState("");
  const [filtroProduto, setFiltroProduto] = useState("");
  const [filtroChargeback, setFiltroChargeback] = useState(false);
  const [busca, setBusca] = useState("");
  const [enviandoId, setEnviandoId] = useState<string | null>(null);

  const produtos = useMemo(
    () => [...new Set(pedidos.map((p) => p.produto_grupo).filter(Boolean))] as string[],
    [pedidos]
  );

  const pedidosFiltrados = useMemo(() => {
    return pedidos.filter((p) => {
      if (filtroStatus === "entregue+chargeback") {
        if (p.status !== "entregue" || !p.chargeback) return false;
      } else {
        if (filtroStatus && p.status !== filtroStatus) return false;
        if (filtroChargeback && !p.chargeback) return false;
      }

      if (filtroProduto && p.produto_grupo !== filtroProduto) return false;

      if (busca) {
        const q = busca.toLowerCase();
        const match =
          p.cliente_nome.toLowerCase().includes(q) ||
          p.cliente_email?.toLowerCase().includes(q) ||
          p.cliente_telefone?.includes(q) ||
          p.codigo_rastreio?.toLowerCase().includes(q) ||
          p.payt_transaction_id.toLowerCase().includes(q);
        if (!match) return false;
      }

      return true;
    });
  }, [pedidos, filtroStatus, filtroProduto, filtroChargeback, busca]);

  async function enviarWhatsapp(pedido: Pedido) {
    if (!pedido.cliente_telefone) {
      alert("Pedido sem telefone cadastrado.");
      return;
    }
    setEnviandoId(pedido.id);
    try {
      const res = await fetch("/api/whatsapp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          telefone: pedido.cliente_telefone,
          nomeCliente: pedido.cliente_nome,
          codigoRastreio: pedido.codigo_rastreio ?? "N/A",
        }),
      });
      const data = await res.json();
      if (data.ok) {
        alert("WhatsApp enviado!");
      } else {
        alert(`Erro: ${data.erro}`);
      }
    } catch {
      alert("Falha ao enviar WhatsApp.");
    } finally {
      setEnviandoId(null);
    }
  }

  function formatarValor(v: number | null) {
    if (v == null) return "—";
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
  }

  function formatarData(d: string | null) {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
  }

  function formatarStatusPagamento(status: string | null) {
    if (!status) return "—";
    return PAYMENT_STATUS_LABELS[status] ?? status;
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      {/* Filtros */}
      <div className="p-4 border-b border-gray-200 flex flex-wrap gap-3 items-center">
        <input
          type="text"
          placeholder="Buscar por nome, e-mail, rastreio..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="border border-gray-300 rounded-md px-3 py-1.5 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <select
          value={filtroStatus}
          onChange={(e) => setFiltroStatus(e.target.value)}
          className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          {FILTRO_STATUS.map((f) => (
            <option key={f.value} value={f.value}>{f.label}</option>
          ))}
        </select>
        <select
          value={filtroProduto}
          onChange={(e) => setFiltroProduto(e.target.value)}
          className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">Todos os produtos</option>
          {produtos.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
          <input
            type="checkbox"
            checked={filtroChargeback}
            onChange={(e) => setFiltroChargeback(e.target.checked)}
            className="rounded"
          />
          Só chargebacks
        </label>
        <span className="ml-auto text-sm text-gray-500">
          {pedidosFiltrados.length} pedidos
        </span>
      </div>

      {/* Tabela */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-4 py-3 font-medium text-gray-600 whitespace-nowrap">Cliente</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600 whitespace-nowrap">Cód. Payt</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600 whitespace-nowrap">Produto</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600 whitespace-nowrap">Potes</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600 whitespace-nowrap">Valor</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600 whitespace-nowrap">Status pagto</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600 whitespace-nowrap">Rastreio</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600 whitespace-nowrap">Status</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600 whitespace-nowrap">Ações</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {pedidosFiltrados.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-4 py-8 text-center text-gray-400">
                  Nenhum pedido encontrado
                </td>
              </tr>
            ) : (
              pedidosFiltrados.map((pedido) => (
                <tr key={pedido.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900 truncate max-w-[200px]">
                      {pedido.cliente_nome}
                    </div>
                    {pedido.cliente_email && (
                      <div className="text-xs text-gray-500 truncate max-w-[200px]">
                        {pedido.cliente_email}
                      </div>
                    )}
                    {pedido.cliente_telefone && (
                      <div className="text-xs text-gray-500">{pedido.cliente_telefone}</div>
                    )}
                    {pedido.chargeback && (
                      <span className="inline-block mt-1 text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded">
                        Chargeback
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <a
                      href={`https://app.payt.com.br/admin/vendas/${pedido.payt_transaction_id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 font-mono text-xs text-indigo-600 hover:text-indigo-800"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {pedido.payt_transaction_id}
                      <ExternalLink size={10} />
                    </a>
                  </td>
                  <td className="px-4 py-3 text-gray-700 whitespace-nowrap">
                    {pedido.produto_grupo ?? pedido.produto_nome ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-700 text-center">
                    {pedido.qtd_potes ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-700 whitespace-nowrap">
                    {formatarValor(pedido.valor_total)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div>
                      <span
                        className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${PAYMENT_STATUS_COLORS[pedido.status_pagamento ?? ""] ?? "bg-gray-100 text-gray-700"}`}
                      >
                        {formatarStatusPagamento(pedido.status_pagamento)}
                      </span>
                    </div>
                    <div className="mt-1 text-xs text-gray-500">
                      {pedido.data_pagamento ? formatarData(pedido.data_pagamento) : formatarData(pedido.created_at)}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {pedido.codigo_rastreio ? (
                      <span className="font-mono text-xs text-gray-700">{pedido.codigo_rastreio}</span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-block text-xs px-2 py-1 rounded-full font-medium ${STATUS_COLORS[pedido.status as StatusPedido] ?? "bg-gray-100 text-gray-700"}`}>
                      {STATUS_LABELS[pedido.status as StatusPedido] ?? pedido.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => enviarWhatsapp(pedido)}
                      disabled={enviandoId === pedido.id || !pedido.cliente_telefone}
                      className="text-xs bg-green-600 text-white px-3 py-1.5 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
                    >
                      {enviandoId === pedido.id ? "Enviando..." : "WhatsApp"}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    {onDetalhe && (
                      <button
                        onClick={() => onDetalhe(pedido)}
                        className="text-xs text-gray-500 hover:text-indigo-600 px-2 py-1.5 rounded-md hover:bg-indigo-50 transition-colors whitespace-nowrap"
                      >
                        Detalhe
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
