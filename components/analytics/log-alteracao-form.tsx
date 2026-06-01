"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface LogAlteracaoFormProps {
  defaultDay: string;
  products: string[];
}

const COMPONENT_OPTIONS = [
  "VSL",
  "LP",
  "CHECKOUT",
  "US1",
  "US2",
  "CRIATIVO",
  "OFERTA",
  "COPY",
  "TRAFEGO",
  "WHATSAPP",
  "RECUPERACAO",
  "REEMBOLSO",
  "OUTRO",
];

const CHANGE_TYPE_OPTIONS = [
  "NOVO_TESTE",
  "TROCA_OFERTA",
  "TROCA_COPY",
  "TROCA_CRIATIVO",
  "MUDANCA_CHECKOUT",
  "MUDANCA_UPSELL",
  "MUDANCA_WHATSAPP",
  "MUDANCA_RECUPERACAO",
  "OUTRO",
];

export default function LogAlteracaoForm({ defaultDay, products }: LogAlteracaoFormProps) {
  const router = useRouter();
  const [day, setDay] = useState(defaultDay);
  const [componente, setComponente] = useState("US1");
  const [produtoAfetado, setProdutoAfetado] = useState("");
  const [descricao, setDescricao] = useState("");
  const [responsavel, setResponsavel] = useState("");
  const [tipoAlteracao, setTipoAlteracao] = useState("MUDANCA_UPSELL");
  const [hipotese, setHipotese] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");

    if (!day || !componente || !descricao.trim()) {
      setError("Preencha data, componente e descrição.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/analytics/change_logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          day,
          componente,
          produto_afetado: produtoAfetado || null,
          descricao,
          responsavel: responsavel || null,
          tipo_alteracao: tipoAlteracao || null,
          hipotese: hipotese || null,
        }),
      });

      const data = await response.json();
      if (!data.ok) throw new Error(data.error ?? "Erro ao salvar alteração");

      setDescricao("");
      setResponsavel("");
      setHipotese("");
      router.refresh();
    } catch (submitError: unknown) {
      setError(submitError instanceof Error ? submitError.message : "Erro ao salvar alteração");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-base font-semibold text-gray-900">Registrar alteração do funil</h2>
        <span className="text-xs text-gray-400">Base para impacto e IA</span>
      </div>

      <div className="grid gap-3 md:grid-cols-5">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-600">Data</label>
          <input
            type="date"
            value={day}
            onChange={(event) => setDay(event.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-600">Componente</label>
          <select
            value={componente}
            onChange={(event) => setComponente(event.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {COMPONENT_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-600">Produto</label>
          <select
            value={produtoAfetado}
            onChange={(event) => setProdutoAfetado(event.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Todos</option>
            {products.map((product) => (
              <option key={product} value={product}>
                {product}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-600">Responsável</label>
          <input
            type="text"
            value={responsavel}
            onChange={(event) => setResponsavel(event.target.value)}
            placeholder="Ex: Herberth"
            className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-600">Tipo</label>
          <select
            value={tipoAlteracao}
            onChange={(event) => setTipoAlteracao(event.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {CHANGE_TYPE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-600">Descrição da alteração</label>
          <textarea
            value={descricao}
            onChange={(event) => setDescricao(event.target.value)}
            placeholder="Ex: Criei novo produto e subi como UP1 no lugar da oferta anterior."
            rows={3}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-600">Hipótese</label>
          <textarea
            value={hipotese}
            onChange={(event) => setHipotese(event.target.value)}
            placeholder="Ex: Novo produto em UP1 deve elevar conversão e receita por pedido."
            rows={3}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>
      <div className="flex items-center justify-between gap-4">
        {error ? <p className="text-sm text-red-600">{error}</p> : <div />}
        <button
          type="submit"
          disabled={loading}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Salvando..." : "Salvar alteração"}
        </button>
      </div>
    </form>
  );
}
