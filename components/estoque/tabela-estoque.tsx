"use client";

import { useMemo, useState } from "react";

import { Panel, StatusPill } from "@/components/workspace/operational-ui";
import type { EstoqueProdutoResumo, EstoqueProdutoStatus } from "@/lib/estoque";
import type { EstoqueMovimentacao } from "@/lib/supabase";
import { cn } from "@/lib/utils";

type TabelaEstoqueProps = {
  grupos: EstoqueProdutoResumo[];
  movimentacoes: EstoqueMovimentacao[];
  periodoLabel: string;
};

type MovementKind = "entrada" | "venda" | "estorno" | "ajuste" | "reativacao";

const STATUS_LABELS: Record<EstoqueProdutoStatus, string> = {
  critico: "Crítico",
  baixo: "Baixo",
  ok: "Saudável",
  excesso: "Excesso",
};

const STATUS_TONES: Record<
  EstoqueProdutoStatus,
  "red" | "gold" | "green" | "blue"
> = {
  critico: "red",
  baixo: "gold",
  ok: "green",
  excesso: "blue",
};

const MOVEMENT_LABELS: Record<MovementKind, string> = {
  entrada: "Entrada",
  venda: "Venda",
  estorno: "Estorno",
  ajuste: "Ajuste",
  reativacao: "Reativação",
};

const MOVEMENT_TONES: Record<
  MovementKind,
  "blue" | "gold" | "green" | "red" | "neutral"
> = {
  entrada: "blue",
  venda: "gold",
  estorno: "green",
  ajuste: "neutral",
  reativacao: "red",
};

function formatNumber(value: number, maximumFractionDigits = 0) {
  return new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits,
  }).format(value);
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function signedNumber(value: number) {
  if (value === 0) return "0";
  return `${value > 0 ? "+" : "-"}${formatNumber(Math.abs(value))}`;
}

function observationContains(
  item: EstoqueMovimentacao,
  ...fragments: string[]
) {
  const observation = item.observacao?.toLocaleLowerCase("pt-BR") ?? "";
  return fragments.some((fragment) => observation.includes(fragment));
}

function getMovementKind(item: EstoqueMovimentacao): MovementKind {
  if (
    observationContains(item, "estorno automatico", "estorno automático")
  ) {
    return "estorno";
  }

  if (
    observationContains(item, "reativacao automatica", "reativação automática")
  ) {
    return "reativacao";
  }

  if (observationContains(item, "ajuste manual")) {
    return "ajuste";
  }

  return item.tipo;
}

function getMovementAmount(item: EstoqueMovimentacao) {
  return item.tipo === "entrada" ? item.qtd_potes : -item.qtd_potes;
}

function getStockTone(value: number) {
  if (value < 0) return "text-[var(--fly-danger-strong)]";
  if (value === 0) return "text-[var(--fly-text-muted)]";
  return "text-[#86EFAC]";
}

function coverageLabel(grupo: EstoqueProdutoResumo) {
  if (grupo.coberturaDias == null) return "Sem vendas no período";
  return `${grupo.coberturaDias} dias de cobertura`;
}

export default function TabelaEstoque({
  grupos,
  movimentacoes,
  periodoLabel,
}: TabelaEstoqueProps) {
  const [grupoSelecionado, setGrupoSelecionado] = useState<string | null>(null);

  const movimentacoesFiltradas = useMemo(() => {
    if (!grupoSelecionado) return movimentacoes;
    return movimentacoes.filter(
      (movimentacao) => movimentacao.produto_grupo === grupoSelecionado
    );
  }, [grupoSelecionado, movimentacoes]);

  function toggleGrupo(nomeGrupo: string) {
    const nextGrupo = grupoSelecionado === nomeGrupo ? null : nomeGrupo;
    setGrupoSelecionado(nextGrupo);

    if (nextGrupo) {
      window.requestAnimationFrame(() => {
        document
          .getElementById("extrato-estoque")
          ?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
  }

  return (
    <>
      <Panel
        title="Saldo por produto"
        description={`${periodoLabel} · ${grupos.length.toLocaleString("pt-BR")} produtos monitorados`}
        action={
          grupoSelecionado ? (
            <button
              type="button"
              onClick={() => setGrupoSelecionado(null)}
              className="inline-flex h-8 items-center justify-center rounded-[8px] border border-[var(--fly-border)] bg-[var(--fly-control)] px-3 text-xs font-semibold text-[var(--fly-text-muted)] transition-colors duration-150 hover:border-[var(--fly-border-strong)] hover:bg-[var(--fly-control-hover)] hover:text-[var(--fly-text-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--fly-brand-ring)]"
            >
              Ver todos
            </button>
          ) : (
            <StatusPill tone="neutral">Todo o período selecionado</StatusPill>
          )
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[940px] table-fixed text-left text-sm">
            <thead>
              <tr className="border-b border-white/[0.06] bg-white/[0.018] text-[11px] font-semibold uppercase text-[var(--fly-text-muted)]">
                <th className="w-[30%] px-3 py-3">Produto</th>
                <th className="w-[16%] px-3 py-3 text-right">
                  Entradas (período)
                </th>
                <th className="w-[16%] px-3 py-3 text-right">
                  Vendidos (período)
                </th>
                <th className="w-[16%] px-3 py-3 text-right">Saldo atual</th>
                <th className="w-[22%] px-3 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.055]">
              {grupos.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-3 py-10 text-center text-sm text-[var(--fly-text-muted)]"
                  >
                    Nenhum grupo cadastrado ainda
                  </td>
                </tr>
              ) : (
                grupos.map((grupo) => {
                  const isSelected = grupoSelecionado === grupo.nome_grupo;

                  return (
                    <tr
                      key={grupo.id}
                      className={cn(
                        "transition-colors duration-150 hover:bg-white/[0.018]",
                        isSelected && "bg-[var(--fly-brand-soft)]"
                      )}
                    >
                      <td className="px-3 py-3.5 align-middle">
                        <div className="flex min-w-0 items-center gap-2">
                          <span className="truncate font-medium text-[var(--fly-text)]">
                            {grupo.nome_grupo}
                          </span>
                          {grupo.estoque_atual < 0 ? (
                            <StatusPill tone="red">Negativo</StatusPill>
                          ) : null}
                        </div>
                        <div className="mt-1 flex min-w-0 items-center gap-2 text-xs text-[var(--fly-text-muted)]">
                          <span className="truncate">
                            {coverageLabel(grupo)}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span className="shrink-0">
                            giro {formatNumber(grupo.giroPeriodo, 1)}/dia
                          </span>
                          <StatusPill tone={STATUS_TONES[grupo.statusOperacional]}>
                            {STATUS_LABELS[grupo.statusOperacional]}
                          </StatusPill>
                        </div>
                      </td>
                      <td className="px-3 py-3.5 text-right font-semibold tabular-nums text-[#93C5FD]">
                        +{formatNumber(grupo.entradasPeriodo)}
                      </td>
                      <td className="px-3 py-3.5 text-right font-semibold tabular-nums text-[#FDBA74]">
                        -{formatNumber(grupo.vendasPeriodo)}
                      </td>
                      <td
                        className={cn(
                          "px-3 py-3.5 text-right font-semibold tabular-nums",
                          getStockTone(grupo.estoque_atual)
                        )}
                      >
                        {formatNumber(grupo.estoque_atual)}
                      </td>
                      <td className="px-3 py-3.5">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => toggleGrupo(grupo.nome_grupo)}
                            className={cn(
                              "inline-flex h-8 items-center justify-center rounded-[8px] border px-3 text-xs font-semibold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--fly-brand-ring)]",
                              isSelected
                                ? "border-[var(--fly-brand-border)] bg-[var(--fly-brand-surface)] text-[var(--fly-brand-strong)]"
                                : "border-[var(--fly-border)] bg-[var(--fly-control)] text-[var(--fly-text-muted)] hover:border-[var(--fly-border-strong)] hover:bg-[var(--fly-control-hover)] hover:text-[var(--fly-text-soft)]"
                            )}
                          >
                            {isSelected ? "Fechar" : "Ver extrato"}
                          </button>
                          <button
                            type="button"
                            disabled
                            className="inline-flex h-8 items-center justify-center rounded-[8px] border border-[var(--fly-border)] bg-transparent px-3 text-xs font-semibold text-[var(--fly-text-dim)] opacity-70"
                          >
                            Editar saldo
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Panel>

      <div id="extrato-estoque" className="scroll-mt-24">
        <Panel
          title="Extrato de movimentações"
          description={`${periodoLabel} · ${movimentacoesFiltradas.length.toLocaleString("pt-BR")} registros${grupoSelecionado ? ` · ${grupoSelecionado}` : ""}`}
          action={
            grupoSelecionado ? (
              <button
                type="button"
                onClick={() => setGrupoSelecionado(null)}
                className="inline-flex h-8 items-center justify-center rounded-[8px] border border-[var(--fly-border)] bg-[var(--fly-control)] px-3 text-xs font-semibold text-[var(--fly-text-muted)] transition-colors duration-150 hover:border-[var(--fly-border-strong)] hover:bg-[var(--fly-control-hover)] hover:text-[var(--fly-text-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--fly-brand-ring)]"
              >
                Ver todos
              </button>
            ) : null
          }
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] table-fixed text-left text-sm">
              <thead>
                <tr className="border-b border-white/[0.06] bg-white/[0.018] text-[11px] font-semibold uppercase text-[var(--fly-text-muted)]">
                  <th className="w-[14%] px-3 py-3">Data</th>
                  <th className="w-[26%] px-3 py-3">Produto</th>
                  <th className="w-[15%] px-3 py-3">Tipo</th>
                  <th className="w-[15%] px-3 py-3 text-right">Potes</th>
                  <th className="w-[30%] px-3 py-3">Obs.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.055]">
                {movimentacoesFiltradas.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-3 py-10 text-center text-sm text-[var(--fly-text-muted)]"
                    >
                      Nenhuma movimentação no período
                    </td>
                  </tr>
                ) : (
                  movimentacoesFiltradas.slice(0, 120).map((movimentacao) => {
                    const kind = getMovementKind(movimentacao);
                    const amount = getMovementAmount(movimentacao);

                    return (
                      <tr
                        key={movimentacao.id}
                        className="transition-colors duration-150 hover:bg-white/[0.018]"
                      >
                        <td className="px-3 py-3.5 font-medium tabular-nums text-[var(--fly-text-soft)]">
                          {formatDate(movimentacao.created_at)}
                        </td>
                        <td className="px-3 py-3.5 text-[var(--fly-text-soft)]">
                          <span className="block truncate">
                            {movimentacao.produto_grupo}
                          </span>
                        </td>
                        <td className="px-3 py-3.5">
                          <StatusPill tone={MOVEMENT_TONES[kind]}>
                            {MOVEMENT_LABELS[kind]}
                          </StatusPill>
                        </td>
                        <td
                          className={cn(
                            "px-3 py-3.5 text-right font-semibold tabular-nums",
                            amount >= 0
                              ? "text-[#93C5FD]"
                              : "text-[#FDBA74]"
                          )}
                        >
                          {signedNumber(amount)}
                        </td>
                        <td className="px-3 py-3.5 text-xs text-[var(--fly-text-muted)]">
                          <span className="block truncate">
                            {movimentacao.observacao ?? "-"}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>
    </>
  );
}
