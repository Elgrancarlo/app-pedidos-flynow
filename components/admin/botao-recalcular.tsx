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
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[var(--fly-text)]">
            Normalizar produtos e recalcular estoque
          </p>
          <p className="mt-1 text-xs leading-5 text-[var(--fly-text-muted)]">
            Consolida variações de nome ("Power 66 Televendas" para "Power 66"),
            reconstrói movimentações históricas e recalcula o saldo de cada grupo.
          </p>
        </div>
        <button
          onClick={executar}
          disabled={estado === "loading"}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-[8px] border border-[var(--fly-brand-border)] bg-[var(--fly-brand)] px-4 text-xs font-semibold text-[var(--fly-on-brand)] outline-none transition-colors duration-150 hover:bg-[var(--fly-brand-strong)] focus-visible:ring-2 focus-visible:ring-[var(--fly-brand-ring)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <RefreshCw
            aria-hidden="true"
            size={14}
            className={estado === "loading" ? "animate-spin" : ""}
          />
          {estado === "loading" ? "Processando..." : "Executar"}
        </button>
      </div>

      {estado === "ok" && resultado && (
        <div className="space-y-3 rounded-[8px] border border-[var(--fly-success-border)] bg-[var(--fly-success-surface)] p-4">
          <p className="text-sm font-semibold text-[var(--fly-success-text)]">
            Concluído com sucesso
          </p>
          <div className="grid gap-2 text-xs text-[var(--fly-success-text)] sm:grid-cols-3">
            <p className="rounded-[7px] border border-[var(--fly-success-border)] px-3 py-2">
              <span className="block text-lg font-semibold leading-none tabular-nums">
                {resultado.normalizados_produto_grupo}
              </span>
              pedidos normalizados
            </p>
            <p className="rounded-[7px] border border-[var(--fly-success-border)] px-3 py-2">
              <span className="block text-lg font-semibold leading-none tabular-nums">
                {resultado.movimentacoes_inseridas}
              </span>
              movimentações reconstruídas
            </p>
            <p className="rounded-[7px] border border-[var(--fly-success-border)] px-3 py-2">
              <span className="block text-lg font-semibold leading-none tabular-nums">
                {resultado.grupos_atualizados}
              </span>
              grupos atualizados
            </p>
          </div>
          {resultado.resumo_por_grupo.length > 0 && (
            <div className="border-t border-[var(--fly-success-border)] pt-3">
              <p className="mb-2 text-xs font-semibold uppercase text-[var(--fly-success-text)]">
                Saldo por produto
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                {resultado.resumo_por_grupo.map((grupo) => (
                  <div
                    key={grupo.grupo}
                    className="flex min-w-0 items-center justify-between gap-3 rounded-[7px] border border-[var(--fly-success-border)] px-3 py-2 text-xs text-[var(--fly-success-text)]"
                  >
                    <span className="truncate">{grupo.grupo}</span>
                    <span
                      className={
                        grupo.estoque_atual < 0
                          ? "shrink-0 font-mono font-semibold text-[var(--fly-danger-strong)]"
                          : "shrink-0 font-mono font-semibold"
                      }
                    >
                      {grupo.estoque_atual}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {estado === "erro" && (
        <div className="rounded-[8px] border border-[var(--fly-danger-border)] bg-[var(--fly-danger-bg)] p-3 text-sm text-[var(--fly-danger-strong)]">
          {resultado?.erro ?? "Erro ao executar. Tente novamente."}
        </div>
      )}
    </div>
  );
}
