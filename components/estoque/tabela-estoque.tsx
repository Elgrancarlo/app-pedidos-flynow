"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { EstoqueGrupo, EstoqueMovimentacao } from "@/lib/supabase";

interface TabelaEstoqueProps {
  grupos: EstoqueGrupo[];
  movimentacoes: EstoqueMovimentacao[];
  totaisPorGrupo: Record<string, { entradas: number; vendas: number; ajustes: number; estornos: number }>;
  periodoLabel: string;
}

export default function TabelaEstoque({ grupos, movimentacoes, totaisPorGrupo, periodoLabel }: TabelaEstoqueProps) {
  const router = useRouter();
  const [grupoSelecionado, setGrupoSelecionado] = useState<string | null>(null);
  const [grupoAjustando, setGrupoAjustando] = useState<string | null>(null);
  const [saldoEditado, setSaldoEditado] = useState("");
  const [observacaoAjuste, setObservacaoAjuste] = useState("");
  const [salvandoAjuste, setSalvandoAjuste] = useState(false);
  const [erroAjuste, setErroAjuste] = useState("");

  const movimentacoesFiltradas = grupoSelecionado
    ? movimentacoes.filter((m) => m.produto_grupo === grupoSelecionado)
    : movimentacoes;

  function isManualAdjustment(observacao: string | null) {
    return (observacao ?? "").toLowerCase().startsWith("ajuste manual de saldo");
  }

  function isAutomaticRestock(observacao: string | null) {
    return (observacao ?? "").toLowerCase().startsWith("estorno automático:");
  }

  async function salvarAjuste(grupo: string) {
    setErroAjuste("");
    const saldoFinal = Number(saldoEditado);
    if (!Number.isFinite(saldoFinal)) {
      setErroAjuste("Informe um saldo final válido.");
      return;
    }

    setSalvandoAjuste(true);
    try {
      const res = await fetch("/api/estoque/ajuste", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          produto_grupo: grupo,
          saldo_final: saldoFinal,
          observacao: observacaoAjuste || null,
        }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.erro ?? "Erro ao ajustar saldo");

      setGrupoAjustando(null);
      setSaldoEditado("");
      setObservacaoAjuste("");
      router.refresh();
    } catch (error: unknown) {
      setErroAjuste(error instanceof Error ? error.message : "Erro ao ajustar saldo");
    } finally {
      setSalvandoAjuste(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Saldo por grupo */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">Saldo por Produto</h2>
          <span className="text-xs text-gray-400">{periodoLabel}</span>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-6 py-3 font-medium text-gray-600">Produto</th>
              <th className="text-right px-6 py-3 font-medium text-gray-600">Entradas (período)</th>
              <th className="text-right px-6 py-3 font-medium text-gray-600">Vendidos (período)</th>
              <th className="text-right px-6 py-3 font-medium text-gray-600">Saldo atual</th>
              <th className="px-6 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {grupos.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-gray-400">
                  Nenhum grupo cadastrado ainda
                </td>
              </tr>
            ) : (
              grupos.map((grupo) => {
                const totais = totaisPorGrupo[grupo.nome_grupo] ?? { entradas: 0, vendas: 0, ajustes: 0, estornos: 0 };
                const ajustando = grupoAjustando === grupo.nome_grupo;
                return (
                  <tr key={grupo.id} className="hover:bg-gray-50">
                    <td className="px-6 py-3 font-medium text-gray-900">{grupo.nome_grupo}</td>
                    <td className="px-6 py-3 text-right text-blue-700">
                      +{totais.entradas.toLocaleString("pt-BR")}
                    </td>
                    <td className="px-6 py-3 text-right text-orange-700">
                      -{totais.vendas.toLocaleString("pt-BR")}
                    </td>
                    <td className="px-6 py-3 text-right">
                      <span
                        className={`font-semibold ${
                          grupo.estoque_atual < 0 ? "text-red-600" : "text-green-700"
                        }`}
                      >
                        {grupo.estoque_atual.toLocaleString("pt-BR")}
                      </span>
                      {grupo.estoque_atual < 0 && (
                        <span className="ml-2 text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded">
                          NEGATIVO
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-3 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <button
                          onClick={() =>
                            setGrupoSelecionado(
                              grupoSelecionado === grupo.nome_grupo ? null : grupo.nome_grupo
                            )
                          }
                          className="text-xs text-indigo-600 hover:underline"
                        >
                          {grupoSelecionado === grupo.nome_grupo ? "Fechar" : "Ver extrato"}
                        </button>
                        <button
                          onClick={() => {
                            setGrupoAjustando(ajustando ? null : grupo.nome_grupo);
                            setSaldoEditado(String(grupo.estoque_atual));
                            setObservacaoAjuste("");
                            setErroAjuste("");
                          }}
                          className="text-xs text-gray-600 hover:underline"
                        >
                          {ajustando ? "Cancelar" : "Editar saldo"}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {grupoAjustando && (
          <div className="border-t border-gray-200 bg-gray-50 px-6 py-4">
            <div className="grid gap-3 md:grid-cols-[minmax(0,180px)_minmax(0,1fr)_auto] md:items-end">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-600">Novo saldo</label>
                <input
                  type="number"
                  value={saldoEditado}
                  onChange={(e) => setSaldoEditado(e.target.value)}
                  className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-600">Motivo do ajuste</label>
                <input
                  type="text"
                  value={observacaoAjuste}
                  onChange={(e) => setObservacaoAjuste(e.target.value)}
                  placeholder="Ex: contagem corrigida do inventário"
                  className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <button
                onClick={() => void salvarAjuste(grupoAjustando)}
                disabled={salvandoAjuste}
                className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {salvandoAjuste ? "Salvando..." : "Salvar ajuste"}
              </button>
            </div>
            {erroAjuste && <p className="mt-2 text-sm text-red-600">{erroAjuste}</p>}
          </div>
        )}
      </div>

      {/* Extrato de movimentações */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">
            Extrato de Movimentações
            {grupoSelecionado && (
              <span className="ml-2 text-sm font-normal text-indigo-600">
                — {grupoSelecionado}
              </span>
            )}
          </h2>
          {grupoSelecionado && (
            <button
              onClick={() => setGrupoSelecionado(null)}
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              Ver todos
            </button>
          )}
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-6 py-3 font-medium text-gray-600">Data</th>
              <th className="text-left px-6 py-3 font-medium text-gray-600">Produto</th>
              <th className="text-left px-6 py-3 font-medium text-gray-600">Tipo</th>
              <th className="text-right px-6 py-3 font-medium text-gray-600">Potes</th>
              <th className="text-left px-6 py-3 font-medium text-gray-600">Obs.</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {movimentacoesFiltradas.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-gray-400">
                  Nenhuma movimentação no período
                </td>
              </tr>
            ) : (
              movimentacoesFiltradas.slice(0, 100).map((m) => (
                <tr key={m.id} className="hover:bg-gray-50">
                  <td className="px-6 py-3 text-gray-500 whitespace-nowrap">
                    {new Date(m.created_at).toLocaleDateString("pt-BR")}
                  </td>
                  <td className="px-6 py-3 text-gray-700">{m.produto_grupo}</td>
                  <td className="px-6 py-3">
                    <span
                      className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium ${
                         m.tipo === "entrada"
                          ? isManualAdjustment(m.observacao)
                            ? "bg-indigo-100 text-indigo-700"
                            : isAutomaticRestock(m.observacao)
                              ? "bg-emerald-100 text-emerald-700"
                            : "bg-blue-100 text-blue-700"
                          : isManualAdjustment(m.observacao)
                            ? "bg-indigo-100 text-indigo-700"
                            : "bg-orange-100 text-orange-700"
                      }`}
                    >
                      {isManualAdjustment(m.observacao)
                        ? "Ajuste"
                        : isAutomaticRestock(m.observacao)
                          ? "Estorno"
                          : m.tipo === "entrada"
                            ? "Entrada"
                            : "Venda"}
                    </span>
                  </td>
                  <td
                    className={`px-6 py-3 text-right font-medium ${
                      isManualAdjustment(m.observacao)
                        ? "text-indigo-700"
                        : isAutomaticRestock(m.observacao)
                          ? "text-emerald-700"
                        : m.tipo === "entrada"
                          ? "text-blue-700"
                          : "text-orange-700"
                    }`}
                  >
                    {m.tipo === "entrada" ? "+" : "-"}
                    {m.qtd_potes.toLocaleString("pt-BR")}
                  </td>
                  <td className="px-6 py-3 text-gray-500 text-xs">{m.observacao ?? "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
