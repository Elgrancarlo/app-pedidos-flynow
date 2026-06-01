"use client";

import { useState } from "react";
import { RefreshCw } from "lucide-react";

interface Resultado {
  ok: boolean;
  normalizados_produto_grupo: number;
  movimentacoes_inseridas: number;
  grupos_atualizados: number;
  resumo_por_grupo: Array<{ grupo: string; vendas: number; entradas: number; estoque_atual: number }>;
  erro?: string;
}

export default function BotaoRecalcular() {
  const [estado, setEstado] = useState<"idle" | "loading" | "ok" | "erro">("idle");
  const [resultado, setResultado] = useState<Resultado | null>(null);

  async function executar() {
    setEstado("loading");
    setResultado(null);
    try {
      const res = await fetch("/api/admin/recalcular-estoque", { method: "POST" });
      const data = await res.json() as Resultado;
      setResultado(data);
      setEstado(data.ok ? "ok" : "erro");
    } catch {
      setEstado("erro");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-gray-700 font-medium">Normalizar produtos e recalcular estoque</p>
          <p className="text-xs text-gray-400 mt-0.5">
            Consolida variações de nome ("Power 66 Televendas" → "Power 66"), reconstrói
            movimentações históricas e recalcula o saldo de cada grupo.
          </p>
        </div>
        <button
          onClick={executar}
          disabled={estado === "loading"}
          className="flex items-center gap-2 bg-indigo-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0"
        >
          <RefreshCw size={14} className={estado === "loading" ? "animate-spin" : ""} />
          {estado === "loading" ? "Processando..." : "Executar"}
        </button>
      </div>

      {estado === "ok" && resultado && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-2">
          <p className="text-sm font-semibold text-green-800">Concluído com sucesso</p>
          <div className="text-xs text-green-700 space-y-1">
            <p>• {resultado.normalizados_produto_grupo} pedidos com produto_grupo normalizado</p>
            <p>• {resultado.movimentacoes_inseridas} movimentações de estoque reconstruídas</p>
            <p>• {resultado.grupos_atualizados} grupos de produto com saldo atualizado</p>
          </div>
          {resultado.resumo_por_grupo.length > 0 && (
            <div className="mt-3 border-t border-green-200 pt-3">
              <p className="text-xs font-semibold text-green-700 mb-2">Saldo por produto</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                {resultado.resumo_por_grupo.map((g) => (
                  <div key={g.grupo} className="flex items-center justify-between text-xs text-green-700">
                    <span className="truncate">{g.grupo}</span>
                    <span className={`font-mono font-medium ml-2 ${g.estoque_atual < 0 ? "text-red-600" : ""}`}>
                      {g.estoque_atual}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {estado === "erro" && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
          {resultado?.erro ?? "Erro ao executar. Tente novamente."}
        </div>
      )}
    </div>
  );
}
