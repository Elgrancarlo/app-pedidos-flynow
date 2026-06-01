"use client";

import { useState } from "react";
import { X, Copy, ExternalLink } from "lucide-react";
import type { Pedido, StatusPedido } from "@/lib/supabase";
import { PAYMENT_STATUS_COLORS, PAYMENT_STATUS_LABELS, STATUS_LABELS, STATUS_COLORS } from "@/lib/supabase";

const PAGAMENTO_LABEL: Record<string, string> = {
  credit_card: "Cartão de Crédito",
  pix:         "Pix",
  boleto:      "Boleto",
};

function fmt(v: number | null) {
  if (v == null) return "—";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}

function fmtData(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function Row({
  label,
  value,
  onCopy,
  copiado,
  mono,
}: {
  label: string;
  value: string | number | null | undefined;
  onCopy?: () => void;
  copiado?: boolean;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-1.5 gap-4 border-b border-gray-50 last:border-0">
      <span className="text-xs text-gray-400 shrink-0 w-28">{label}</span>
      <div className="flex items-center gap-1.5 min-w-0">
        <span className={`text-sm text-gray-900 truncate ${mono ? "font-mono" : ""}`}>
          {value ?? "—"}
        </span>
        {onCopy && (
          <button onClick={onCopy} className="text-gray-300 hover:text-gray-500 shrink-0" title="Copiar">
            {copiado ? (
              <span className="text-xs text-green-600 font-medium">✓</span>
            ) : (
              <Copy size={12} />
            )}
          </button>
        )}
      </div>
    </div>
  );
}

interface ModalPedidoProps {
  pedido: Pedido;
  onClose: () => void;
}

export default function ModalPedido({ pedido, onClose }: ModalPedidoProps) {
  const [tab, setTab] = useState<"cliente" | "rastreio" | "whatsapp">("cliente");
  const [copiado, setCopiado] = useState<string | null>(null);
  const [enviandoWpp, setEnviandoWpp] = useState(false);

  function copiarCom(key: string, texto: string) {
    navigator.clipboard.writeText(texto).catch(() => {});
    setCopiado(key);
    setTimeout(() => setCopiado(null), 1500);
  }

  async function enviarWhatsapp() {
    if (!pedido.cliente_telefone) return;
    setEnviandoWpp(true);
    try {
      const res = await fetch("/api/whatsapp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pedidoId: pedido.id,
          telefone: pedido.cliente_telefone,
          nomeCliente: pedido.cliente_nome,
          codigoRastreio: pedido.codigo_rastreio ?? "N/A",
        }),
      });
      const data = await res.json();
      alert(data.ok ? "WhatsApp enviado!" : `Erro: ${data.erro}`);
    } catch {
      alert("Falha ao enviar WhatsApp.");
    } finally {
      setEnviandoWpp(false);
    }
  }

  const paytUrl = `https://app.payt.com.br/admin/vendas/${pedido.payt_transaction_id}`;
  const contatoTexto = [pedido.cliente_nome, pedido.cliente_telefone, pedido.cliente_email]
    .filter(Boolean)
    .join("\n");

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabeçalho */}
        <div className="px-6 pt-5 pb-4 border-b border-gray-100">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-lg font-semibold text-gray-900 truncate">
                {pedido.cliente_nome}
              </h2>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-sm text-gray-400 font-mono">
                  {pedido.payt_transaction_id}
                </span>
                <a
                  href={paytUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                >
                  <ExternalLink size={11} />
                  Ver na Payt
                </a>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => copiarCom("contato", contatoTexto)}
                className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 border border-gray-200 rounded-md px-2.5 py-1.5 transition-colors"
              >
                <Copy size={11} />
                {copiado === "contato" ? "Copiado!" : "Copiar contato"}
              </button>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Status + Valor */}
          <div className="flex items-center gap-2 mt-3">
            <span
              className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium ${
                STATUS_COLORS[pedido.status as StatusPedido] ?? "bg-gray-100 text-gray-700"
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-current opacity-60" />
              {STATUS_LABELS[pedido.status as StatusPedido] ?? pedido.status}
            </span>
            {pedido.chargeback && (
              <span className="text-xs bg-red-100 text-red-700 px-2.5 py-1 rounded-full font-medium">
                Chargeback
              </span>
            )}
            <span className="ml-auto text-base font-bold text-emerald-600">
              {fmt(pedido.valor_total)}
            </span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 px-6">
          {(["cliente", "rastreio", "whatsapp"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={[
                "py-3 px-3 text-sm font-medium border-b-2 -mb-px transition-colors",
                tab === t
                  ? "border-indigo-600 text-indigo-600"
                  : "border-transparent text-gray-500 hover:text-gray-700",
              ].join(" ")}
            >
              {t === "cliente" ? "Cliente" : t === "rastreio" ? "Rastreio" : "WhatsApp"}
            </button>
          ))}
        </div>

        {/* Tab: Cliente */}
        {tab === "cliente" && (
          <div className="px-6 py-4 space-y-4 max-h-80 overflow-y-auto">
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
                Dados do Cliente
              </p>
              <Row label="Nome" value={pedido.cliente_nome} />
              <Row
                label="Telefone"
                value={pedido.cliente_telefone}
                onCopy={pedido.cliente_telefone ? () => copiarCom("tel", pedido.cliente_telefone!) : undefined}
                copiado={copiado === "tel"}
              />
              <Row
                label="E-mail"
                value={pedido.cliente_email}
                onCopy={pedido.cliente_email ? () => copiarCom("email", pedido.cliente_email!) : undefined}
                copiado={copiado === "email"}
              />
              {pedido.cliente_cpf && <Row label="CPF" value={pedido.cliente_cpf} />}
            </div>
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
                Dados do Pedido
              </p>
              <Row label="Produto" value={pedido.produto_grupo ?? pedido.produto_nome} />
              <Row
                label="Pagamento"
                value={PAGAMENTO_LABEL[pedido.forma_pagamento ?? ""] ?? pedido.forma_pagamento}
              />
              {pedido.parcelas && pedido.parcelas > 1 && (
                <Row label="Parcelas" value={`${pedido.parcelas}x`} />
              )}
              <Row label="Valor total" value={fmt(pedido.valor_total)} />
              <div className="flex items-center justify-between py-1.5 gap-4 border-b border-gray-50">
                <span className="text-xs text-gray-400 shrink-0 w-28">Status pagto</span>
                <span
                  className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${PAYMENT_STATUS_COLORS[pedido.status_pagamento ?? ""] ?? "bg-gray-100 text-gray-700"}`}
                >
                  {PAYMENT_STATUS_LABELS[pedido.status_pagamento ?? ""] ?? pedido.status_pagamento ?? "—"}
                </span>
              </div>
              <Row label="Data pagamento" value={fmtData(pedido.data_pagamento)} />
              {pedido.nfc_numero && (
                <Row
                  label="NF-e"
                  value={`${pedido.nfc_numero}${pedido.nfc_valor ? ` — ${fmt(pedido.nfc_valor)}` : ""}`}
                />
              )}
            </div>
          </div>
        )}

        {/* Tab: Rastreio */}
        {tab === "rastreio" && (
          <div className="px-6 py-4 space-y-0 max-h-80 overflow-y-auto">
            <Row label="Código" value={pedido.codigo_rastreio} mono
              onCopy={pedido.codigo_rastreio ? () => copiarCom("rastreio", pedido.codigo_rastreio!) : undefined}
              copiado={copiado === "rastreio"}
            />
            <Row label="Status" value={STATUS_LABELS[pedido.status as StatusPedido] ?? pedido.status} />
            <Row label="Data prometida" value={fmtData(pedido.data_prometida_entrega)} />
            <Row label="Chegou na base" value={fmtData(pedido.data_chegou_logistica)} />
            <Row label="Data entrega" value={fmtData(pedido.data_entrega)} />
            {pedido.endereco_entrega && (
              <div className="mt-3 pt-3 border-t border-gray-100">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
                  Endereço de Entrega
                </p>
                <div className="text-sm text-gray-700 space-y-0.5">
                  {(pedido.endereco_entrega.street != null) && (
                    <p>
                      {String(pedido.endereco_entrega.street)}
                      {pedido.endereco_entrega.street_number != null
                        ? `, ${String(pedido.endereco_entrega.street_number)}`
                        : ""}
                    </p>
                  )}
                  {pedido.endereco_entrega.complement != null && (
                    <p>{String(pedido.endereco_entrega.complement)}</p>
                  )}
                  {pedido.endereco_entrega.district != null && (
                    <p>{String(pedido.endereco_entrega.district)}</p>
                  )}
                  {(pedido.endereco_entrega.city != null || pedido.endereco_entrega.state != null) && (
                    <p>
                      {[pedido.endereco_entrega.city, pedido.endereco_entrega.state]
                        .filter(Boolean)
                        .map(String)
                        .join(" — ")}
                    </p>
                  )}
                  {pedido.endereco_entrega.zipcode != null && (
                    <p>CEP: {String(pedido.endereco_entrega.zipcode)}</p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab: WhatsApp */}
        {tab === "whatsapp" && (
          <div className="px-6 py-4 max-h-80 overflow-y-auto">
            <p className="text-sm text-gray-500 mb-4">
              Envia a notificação de &quot;Pedido saiu para entrega&quot; com o código de rastreio.
            </p>
            {pedido.cliente_telefone ? (
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-700 font-mono">{pedido.cliente_telefone}</span>
                <button
                  onClick={enviarWhatsapp}
                  disabled={enviandoWpp}
                  className="bg-green-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {enviandoWpp ? "Enviando..." : "Enviar WhatsApp"}
                </button>
              </div>
            ) : (
              <p className="text-sm text-red-500">Pedido sem telefone cadastrado.</p>
            )}
          </div>
        )}

        {/* Rodapé */}
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
          <a
            href={paytUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-800"
          >
            Ver na Payt
            <ExternalLink size={13} />
          </a>
          <button
            onClick={onClose}
            className="text-sm text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-lg transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
