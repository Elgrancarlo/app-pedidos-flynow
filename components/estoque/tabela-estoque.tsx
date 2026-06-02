"use client";

import { useState } from "react";

import { Panel, StatusPill } from "@/components/workspace/operational-ui";
import type { EstoqueProdutoResumo, EstoqueProdutoStatus } from "@/lib/estoque";
import { cn } from "@/lib/utils";

type TabelaEstoqueProps = {
  grupos: EstoqueProdutoResumo[];
  periodoLabel: string;
};

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

function getStockTone(value: number) {
  if (value < 0) return "text-[var(--fly-danger-strong)]";
  if (value === 0) return "text-[var(--fly-text-muted)]";
  return "text-[var(--fly-success)]";
}

function coverageLabel(grupo: EstoqueProdutoResumo) {
  if (grupo.coberturaDias == null) return "Sem vendas no período";
  return `${grupo.coberturaDias} dias de cobertura`;
}

export default function TabelaEstoque({
  grupos,
  periodoLabel,
}: TabelaEstoqueProps) {
  const [grupoSelecionado, setGrupoSelecionado] = useState<string | null>(null);
  const selectedGrupo = grupos.find(
    (grupo) => grupo.nome_grupo === grupoSelecionado
  );

  function toggleGrupo(nomeGrupo: string) {
    const nextGrupo = grupoSelecionado === nomeGrupo ? null : nomeGrupo;
    setGrupoSelecionado(nextGrupo);

    if (nextGrupo) {
      window.requestAnimationFrame(() => {
        document
          .getElementById("ofertas-estoque")
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
              <tr className="border-b border-[var(--fly-divider)] bg-[var(--fly-table-head)] text-[11px] font-semibold uppercase text-[var(--fly-text-muted)]">
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
            <tbody className="divide-y divide-[var(--fly-divider-subtle)]">
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
                      onClick={() => toggleGrupo(grupo.nome_grupo)}
                      className={cn(
                        "cursor-pointer transition-colors duration-150 hover:bg-[var(--fly-row-hover)]",
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
                      <td className="px-3 py-3.5 text-right font-semibold tabular-nums text-[var(--fly-chart-investment-active)]">
                        +{formatNumber(grupo.entradasPeriodo)}
                      </td>
                      <td className="px-3 py-3.5 text-right font-semibold tabular-nums text-[var(--fly-warning-strong)]">
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
                            onClick={(event) => {
                              event.stopPropagation();
                              toggleGrupo(grupo.nome_grupo);
                            }}
                            className={cn(
                              "inline-flex p-0 text-[11px] font-semibold leading-5 underline decoration-1 underline-offset-4 outline-none transition-[color,text-decoration-color] duration-150 focus-visible:rounded-[4px] focus-visible:ring-2 focus-visible:ring-[var(--fly-brand-ring)]",
                              isSelected
                                ? "text-[var(--fly-brand-strong)] decoration-[var(--fly-brand-strong)]"
                                : "text-[var(--fly-text-muted)] decoration-[var(--fly-border-strong)] hover:text-[var(--fly-brand-strong)] hover:decoration-[var(--fly-brand-strong)] focus-visible:text-[var(--fly-brand-strong)]"
                            )}
                          >
                            {isSelected ? "Fechar" : "Ver ofertas"}
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

      {selectedGrupo ? (
        <div id="ofertas-estoque" className="scroll-mt-24">
          <Panel
            title="Ofertas vinculadas"
            description={`${selectedGrupo.nome_grupo} · ${selectedGrupo.ofertas.length.toLocaleString("pt-BR")} ofertas no período`}
            action={
              <button
                type="button"
                onClick={() => setGrupoSelecionado(null)}
                className="inline-flex p-0 text-[11px] font-semibold leading-5 text-[var(--fly-text-muted)] underline decoration-[var(--fly-border-strong)] decoration-1 underline-offset-4 outline-none transition-[color,text-decoration-color] duration-150 hover:text-[var(--fly-brand-strong)] hover:decoration-[var(--fly-brand-strong)] focus-visible:rounded-[4px] focus-visible:text-[var(--fly-brand-strong)] focus-visible:ring-2 focus-visible:ring-[var(--fly-brand-ring)]"
              >
                Fechar detalhes
              </button>
            }
          >
            <div className="grid gap-2 border-b border-[var(--fly-divider)] p-3 sm:grid-cols-2 sm:p-4 xl:grid-cols-4">
              <div className="rounded-[8px] bg-[var(--fly-surface-muted)] px-3 py-2.5">
                <p className="text-[10px] font-semibold uppercase text-[var(--fly-text-muted)]">
                  Saldo atual
                </p>
                <p
                  className={cn(
                    "mt-1 text-base font-semibold tabular-nums",
                    getStockTone(selectedGrupo.estoque_atual)
                  )}
                >
                  {formatNumber(selectedGrupo.estoque_atual)} potes
                </p>
              </div>
              <div className="rounded-[8px] bg-[var(--fly-surface-muted)] px-3 py-2.5">
                <p className="text-[10px] font-semibold uppercase text-[var(--fly-text-muted)]">
                  Vendidos no período
                </p>
                <p className="mt-1 text-base font-semibold tabular-nums text-[var(--fly-text)]">
                  {formatNumber(selectedGrupo.vendasPeriodo)} potes
                </p>
              </div>
              <div className="rounded-[8px] bg-[var(--fly-surface-muted)] px-3 py-2.5">
                <p className="text-[10px] font-semibold uppercase text-[var(--fly-text-muted)]">
                  Entradas no período
                </p>
                <p className="mt-1 text-base font-semibold tabular-nums text-[var(--fly-text)]">
                  {formatNumber(selectedGrupo.entradasPeriodo)} potes
                </p>
              </div>
              <div className="rounded-[8px] bg-[var(--fly-surface-muted)] px-3 py-2.5">
                <p className="text-[10px] font-semibold uppercase text-[var(--fly-text-muted)]">
                  Cobertura estimada
                </p>
                <p className="mt-1 text-base font-semibold tabular-nums text-[var(--fly-text)]">
                  {coverageLabel(selectedGrupo)}
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[840px] table-fixed text-left text-sm">
                <thead>
                  <tr className="border-b border-[var(--fly-divider)] bg-[var(--fly-table-head)] text-[11px] font-semibold uppercase text-[var(--fly-text-muted)]">
                    <th className="w-[30%] px-3 py-3">Oferta</th>
                    <th className="w-[16%] px-3 py-3">Canal</th>
                    <th className="w-[13%] px-3 py-3 text-right">Pedidos</th>
                    <th className="w-[13%] px-3 py-3 text-right">
                      Potes/pedido
                    </th>
                    <th className="w-[14%] px-3 py-3 text-right">
                      Potes vendidos
                    </th>
                    <th className="w-[14%] px-3 py-3 text-right">
                      Última venda
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--fly-divider-subtle)]">
                  {selectedGrupo.ofertas.map((oferta) => (
                    <tr
                      key={oferta.id}
                      className="transition-colors duration-150 hover:bg-[var(--fly-row-hover)]"
                    >
                      <td className="px-3 py-3.5 align-middle">
                        <span className="block truncate font-medium text-[var(--fly-text)]">
                          {oferta.nome}
                        </span>
                        <span className="mt-1 block text-xs text-[var(--fly-text-muted)]">
                          Participação{" "}
                          {formatNumber(oferta.participacaoPeriodo * 100, 1)}%
                          no consumo do período
                        </span>
                      </td>
                      <td className="px-3 py-3.5 text-[var(--fly-text-soft)]">
                        {oferta.canal}
                      </td>
                      <td className="px-3 py-3.5 text-right font-semibold tabular-nums text-[var(--fly-text)]">
                        {formatNumber(oferta.pedidosPeriodo)}
                      </td>
                      <td className="px-3 py-3.5 text-right tabular-nums text-[var(--fly-text-soft)]">
                        {formatNumber(oferta.potesPorPedido)}
                      </td>
                      <td className="px-3 py-3.5 text-right font-semibold tabular-nums text-[var(--fly-warning-strong)]">
                        {formatNumber(oferta.potesVendidosPeriodo)}
                      </td>
                      <td className="px-3 py-3.5 text-right tabular-nums text-[var(--fly-text-muted)]">
                        {oferta.ultimaVenda ? formatDate(oferta.ultimaVenda) : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        </div>
      ) : null}
    </>
  );
}
