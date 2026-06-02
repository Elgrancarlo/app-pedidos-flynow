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

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;

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
  const [movementsPageSize, setMovementsPageSize] = useState<number>(25);

  const movimentacoesFiltradas = useMemo(() => {
    if (!grupoSelecionado) return movimentacoes;
    return movimentacoes.filter(
      (movimentacao) => movimentacao.produto_grupo === grupoSelecionado
    );
  }, [grupoSelecionado, movimentacoes]);

  const visibleMovimentacoes = useMemo(
    () => movimentacoesFiltradas.slice(0, movementsPageSize),
    [movimentacoesFiltradas, movementsPageSize]
  );

  const movementsDisplayStart = movimentacoesFiltradas.length === 0 ? 0 : 1;
  const movementsDisplayEnd = Math.min(
    movementsPageSize,
    movimentacoesFiltradas.length
  );

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
              className="inline-flex p-0 text-[11px] font-semibold leading-5 text-[var(--fly-text-muted)] underline decoration-[var(--fly-border-strong)] decoration-1 underline-offset-4 outline-none transition-[color,text-decoration-color] duration-150 hover:text-[var(--fly-brand-strong)] hover:decoration-[var(--fly-brand-strong)] focus-visible:rounded-[4px] focus-visible:text-[var(--fly-brand-strong)] focus-visible:ring-2 focus-visible:ring-[var(--fly-brand-ring)]"
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
                        <div className="flex justify-end gap-3">
                          <button
                            type="button"
                            onClick={() => toggleGrupo(grupo.nome_grupo)}
                            className={cn(
                              "inline-flex p-0 text-[11px] font-semibold leading-5 underline decoration-1 underline-offset-4 outline-none transition-[color,text-decoration-color] duration-150 focus-visible:rounded-[4px] focus-visible:ring-2 focus-visible:ring-[var(--fly-brand-ring)]",
                              isSelected
                                ? "text-[var(--fly-brand-strong)] decoration-[var(--fly-brand-strong)]"
                                : "text-[var(--fly-text-muted)] decoration-[var(--fly-border-strong)] hover:text-[var(--fly-brand-strong)] hover:decoration-[var(--fly-brand-strong)] focus-visible:text-[var(--fly-brand-strong)]"
                            )}
                          >
                            {isSelected ? "Fechar" : "Ver extrato"}
                          </button>
                          <button
                            type="button"
                            disabled
                            className="inline-flex p-0 text-[11px] font-semibold leading-5 text-[var(--fly-text-dim)] underline decoration-[var(--fly-border)] decoration-1 underline-offset-4 opacity-70"
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
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
              {grupoSelecionado ? (
                <button
                  type="button"
                  onClick={() => setGrupoSelecionado(null)}
                  className="inline-flex p-0 text-[11px] font-semibold leading-5 text-[var(--fly-text-muted)] underline decoration-[var(--fly-border-strong)] decoration-1 underline-offset-4 outline-none transition-[color,text-decoration-color] duration-150 hover:text-[var(--fly-brand-strong)] hover:decoration-[var(--fly-brand-strong)] focus-visible:rounded-[4px] focus-visible:text-[var(--fly-brand-strong)] focus-visible:ring-2 focus-visible:ring-[var(--fly-brand-ring)]"
                >
                  Ver todos
                </button>
              ) : null}

              <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--fly-text-muted)]">
                <span className="tabular-nums">
                  {movementsDisplayStart.toLocaleString("pt-BR")}-
                  {movementsDisplayEnd.toLocaleString("pt-BR")} de{" "}
                  {movimentacoesFiltradas.length.toLocaleString("pt-BR")}
                </span>
                <span className="hidden text-[var(--fly-text-dim)] sm:inline">
                  /
                </span>
                <label className="flex items-center gap-2">
                  <span>Por página</span>
                  <select
                    aria-label="Movimentações por página"
                    value={movementsPageSize}
                    onChange={(event) =>
                      setMovementsPageSize(Number(event.target.value))
                    }
                    className="h-8 rounded-[7px] border border-[var(--fly-border)] bg-[var(--fly-control)] px-2 text-xs font-semibold text-[var(--fly-text-soft)] outline-none transition-colors duration-150 hover:border-[var(--fly-border-strong)] hover:bg-[var(--fly-control-hover)] focus-visible:ring-2 focus-visible:ring-[var(--fly-brand-ring)]"
                  >
                    {PAGE_SIZE_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>
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
                  visibleMovimentacoes.map((movimentacao) => {
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
