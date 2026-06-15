"use client";

import { Fragment, useState } from "react";
import { ChevronDown } from "lucide-react";

import { Panel, StatusPill } from "@/components/workspace/operational-ui";
import { SystemSelect } from "@/components/workspace/system-select";
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

type EstoqueSortMode =
  | "critical"
  | "least-critical"
  | "az"
  | "za"
  | "most-sold";

const SORT_OPTIONS: Array<{ label: string; value: EstoqueSortMode }> = [
  { label: "Mais crítico", value: "critical" },
  { label: "Menos crítico", value: "least-critical" },
  { label: "A - Z", value: "az" },
  { label: "Z - A", value: "za" },
  { label: "Maior giro", value: "most-sold" },
];

const STATUS_PRIORITY: Record<EstoqueProdutoStatus, number> = {
  critico: 0,
  baixo: 1,
  ok: 2,
  excesso: 3,
};

function formatNumber(value: number, maximumFractionDigits = 0) {
  return new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits,
  }).format(value);
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function formatPercent(value: number) {
  return `${formatNumber(value * 100, 2)}%`;
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

function sumPedidos(grupo: EstoqueProdutoResumo) {
  return grupo.ofertas.reduce(
    (total, oferta) => total + oferta.pedidosPeriodo,
    0
  );
}

function sumReceita(grupo: EstoqueProdutoResumo) {
  return grupo.ofertas.reduce(
    (total, oferta) => total + oferta.receitaPeriodo,
    0
  );
}

function averagePotesPerSale(potes: number, pedidos: number) {
  if (pedidos <= 0) return 0;
  return potes / pedidos;
}

function coverageSortValue(grupo: EstoqueProdutoResumo) {
  return grupo.coberturaDias ?? Number.POSITIVE_INFINITY;
}

function compareByCriticality(
  first: EstoqueProdutoResumo,
  second: EstoqueProdutoResumo
) {
  return (
    STATUS_PRIORITY[first.statusOperacional] -
      STATUS_PRIORITY[second.statusOperacional] ||
    coverageSortValue(first) - coverageSortValue(second) ||
    first.estoque_atual - second.estoque_atual ||
    second.vendasPeriodo - first.vendasPeriodo ||
    first.nome_grupo.localeCompare(second.nome_grupo)
  );
}

function sortGroups(grupos: EstoqueProdutoResumo[], sortMode: EstoqueSortMode) {
  return [...grupos].sort((first, second) => {
    switch (sortMode) {
      case "least-critical":
        return (
          STATUS_PRIORITY[second.statusOperacional] -
            STATUS_PRIORITY[first.statusOperacional] ||
          coverageSortValue(second) - coverageSortValue(first) ||
          second.estoque_atual - first.estoque_atual ||
          first.vendasPeriodo - second.vendasPeriodo ||
          first.nome_grupo.localeCompare(second.nome_grupo)
        );
      case "az":
        return first.nome_grupo.localeCompare(second.nome_grupo);
      case "za":
        return second.nome_grupo.localeCompare(first.nome_grupo);
      case "most-sold":
        return (
          second.vendasPeriodo - first.vendasPeriodo ||
          second.giroPeriodo - first.giroPeriodo ||
          first.nome_grupo.localeCompare(second.nome_grupo)
        );
      case "critical":
      default:
        return compareByCriticality(first, second);
    }
  });
}

export default function TabelaEstoque({
  grupos,
  periodoLabel,
}: TabelaEstoqueProps) {
  const [grupoSelecionado, setGrupoSelecionado] = useState<string | null>(null);
  const [sortMode, setSortMode] = useState<EstoqueSortMode>("critical");
  const sortedGrupos = sortGroups(grupos, sortMode);
  const totalPedidosPeriodo = grupos.reduce(
    (total, grupo) => total + sumPedidos(grupo),
    0
  );
  const totalPotesPeriodo = grupos.reduce(
    (total, grupo) => total + grupo.vendasPeriodo,
    0
  );
  const maxPotesPeriodo = Math.max(
    ...grupos.map((grupo) => grupo.vendasPeriodo),
    1
  );

  function toggleGrupo(nomeGrupo: string) {
    const nextGrupo = grupoSelecionado === nomeGrupo ? null : nomeGrupo;
    setGrupoSelecionado(nextGrupo);
  }

  return (
    <>
      <Panel
        title="Detalhamento por produto"
        description={`${periodoLabel} · ${grupos.length.toLocaleString("pt-BR")} produtos monitorados · ofertas e receita por pedidos pagos no período`}
        action={
          <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
            <SystemSelect
              ariaLabel="Ordenar produtos do estoque"
              className="sm:w-[236px]"
              displayLabel="Ordenar"
              onValueChange={(value) => setSortMode(value as EstoqueSortMode)}
              options={SORT_OPTIONS}
              triggerClassName="h-8 rounded-[7px] px-2.5 text-xs"
              value={sortMode}
            />
            {grupoSelecionado ? (
              <button
                type="button"
                onClick={() => setGrupoSelecionado(null)}
                className="inline-flex h-8 items-center justify-start p-0 text-[11px] font-semibold leading-5 text-[var(--fly-text-muted)] underline decoration-[var(--fly-border-strong)] decoration-1 underline-offset-4 outline-none transition-[color,text-decoration-color] duration-150 hover:text-[var(--fly-brand-strong)] hover:decoration-[var(--fly-brand-strong)] focus-visible:rounded-[4px] focus-visible:text-[var(--fly-brand-strong)] focus-visible:ring-2 focus-visible:ring-[var(--fly-brand-ring)] sm:justify-center"
              >
                Ver todos
              </button>
            ) : null}
          </div>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1120px] table-fixed text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--fly-divider)] bg-[var(--fly-table-head)] text-[11px] font-semibold uppercase text-[var(--fly-text-muted)]">
                <th className="w-[36%] px-3 py-3">Produto</th>
                <th className="w-[11%] px-3 py-3 text-right">Vendas</th>
                <th className="w-[9%] px-3 py-3 text-right">Potes</th>
                <th className="w-[15%] px-3 py-3 text-right">
                  Receita pedidos
                </th>
                <th className="w-[10%] px-3 py-3 text-right">Potes/venda</th>
                <th className="w-[11%] px-3 py-3 text-right">Ticket m.</th>
                <th className="w-[8%] px-3 py-3 text-right">Conv.</th>
              </tr>
            </thead>
            <tbody>
              {grupos.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-3 py-10 text-center text-sm text-[var(--fly-text-muted)]"
                  >
                    Nenhum grupo cadastrado ainda
                  </td>
                </tr>
              ) : (
                sortedGrupos.map((grupo) => {
                  const isSelected = grupoSelecionado === grupo.nome_grupo;
                  const expansionId = `estoque-ofertas-${grupo.id}`;
                  const pedidosPeriodo = sumPedidos(grupo);
                  const receitaPedidos = sumReceita(grupo);
                  const ticketMedio =
                    pedidosPeriodo > 0 ? receitaPedidos / pedidosPeriodo : 0;
                  const potesPorVenda = averagePotesPerSale(
                    grupo.vendasPeriodo,
                    pedidosPeriodo
                  );
                  const conversao =
                    totalPotesPeriodo > 0
                      ? grupo.vendasPeriodo / totalPotesPeriodo
                      : 0;
                  const meter = grupo.vendasPeriodo / maxPotesPeriodo;

                  return (
                    <Fragment key={grupo.id}>
                      <tr
                        onClick={() => toggleGrupo(grupo.nome_grupo)}
                        className={cn(
                          "cursor-pointer border-t border-[var(--fly-divider-subtle)] transition-colors duration-150 first:border-t-0 hover:bg-[var(--fly-row-hover)]",
                          isSelected && "bg-[var(--fly-brand-soft)]"
                        )}
                      >
                        <td className="px-3 py-3.5 align-middle">
                          <div className="flex min-w-0 items-start gap-3">
                            <button
                              type="button"
                              aria-controls={expansionId}
                              aria-expanded={isSelected}
                              aria-label={
                                isSelected
                                  ? `Recolher ofertas de ${grupo.nome_grupo}`
                                  : `Expandir ofertas de ${grupo.nome_grupo}`
                              }
                              onClick={(event) => {
                                event.stopPropagation();
                                toggleGrupo(grupo.nome_grupo);
                              }}
                              className="mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-[6px] text-[var(--fly-text-muted)] outline-none transition-colors duration-150 hover:bg-[var(--fly-surface-muted)] hover:text-[var(--fly-text)] focus-visible:ring-2 focus-visible:ring-[var(--fly-brand-ring)]"
                            >
                              <ChevronDown
                                aria-hidden="true"
                                className={cn(
                                  "size-4 transition-transform duration-150",
                                  isSelected && "rotate-180"
                                )}
                              />
                            </button>
                            <div className="min-w-0 flex-1">
                              <div className="flex min-w-0 items-center gap-2">
                                <span className="truncate font-semibold text-[var(--fly-text)]">
                                  {grupo.nome_grupo}
                                </span>
                                {grupo.estoque_atual < 0 ? (
                                  <StatusPill tone="red">Negativo</StatusPill>
                                ) : null}
                                <StatusPill
                                  tone={STATUS_TONES[grupo.statusOperacional]}
                                >
                                  {STATUS_LABELS[grupo.statusOperacional]}
                                </StatusPill>
                              </div>
                              <div className="mt-1 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[var(--fly-text-muted)]">
                                <span className="shrink-0">
                                  {grupo.ofertas.length === 1
                                    ? "1 oferta vendida"
                                    : `${grupo.ofertas.length} ofertas vendidas`}
                                </span>
                                <span aria-hidden="true">·</span>
                                <span
                                  className={cn(
                                    "shrink-0",
                                    getStockTone(grupo.estoque_atual)
                                  )}
                                >
                                  saldo {formatNumber(grupo.estoque_atual)}{" "}
                                  potes
                                </span>
                                <span aria-hidden="true">·</span>
                                <span className="truncate">
                                  {coverageLabel(grupo)}
                                </span>
                              </div>
                              <div className="mt-2 h-1 overflow-hidden rounded-full bg-[var(--fly-divider)]">
                                <span
                                  aria-hidden="true"
                                  className="block h-full rounded-full bg-[var(--fly-success)]"
                                  style={{
                                    width: `${Math.min(
                                      Math.max(meter * 100, 4),
                                      100
                                    )}%`,
                                  }}
                                />
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3.5 text-right tabular-nums">
                          <span className="font-semibold text-[var(--fly-text)]">
                            {formatNumber(pedidosPeriodo)}
                          </span>
                          <span className="text-[var(--fly-text-muted)]">
                            /{formatNumber(totalPedidosPeriodo)}
                          </span>
                        </td>
                        <td className="px-3 py-3.5 text-right font-semibold tabular-nums text-[var(--fly-success)]">
                          {formatNumber(grupo.vendasPeriodo)}
                        </td>
                        <td className="px-3 py-3.5 text-right font-semibold tabular-nums text-[var(--fly-text)]">
                          {formatCurrency(receitaPedidos)}
                        </td>
                        <td className="px-3 py-3.5 text-right font-semibold tabular-nums text-[var(--fly-brand-strong)]">
                          {formatNumber(potesPorVenda, 1)}
                        </td>
                        <td className="px-3 py-3.5 text-right font-semibold tabular-nums text-[var(--fly-text-soft)]">
                          {formatCurrency(ticketMedio)}
                        </td>
                        <td className="px-3 py-3.5 text-right">
                          <span className="inline-flex min-w-[64px] justify-center rounded-full bg-[var(--fly-success-surface)] px-2 py-1 text-[11px] font-semibold tabular-nums text-[var(--fly-success-text)]">
                            {formatPercent(conversao)}
                          </span>
                        </td>
                      </tr>

                      <tr aria-hidden={!isSelected} className="bg-[var(--fly-row-bg)]">
                        <td colSpan={7} className="p-0">
                          <div
                            id={expansionId}
                            className={cn(
                              "grid transition-[grid-template-rows,opacity] duration-300 motion-reduce:transition-none",
                              isSelected
                                ? "grid-rows-[1fr] opacity-100 ease-out"
                                : "grid-rows-[0fr] opacity-0 ease-in"
                            )}
                          >
                            <div className="overflow-hidden">
                              <table className="w-full table-fixed text-left text-sm">
                                <tbody>
                                  {grupo.ofertas.length === 0 ? (
                                    <tr className="border-t border-[var(--fly-divider-subtle)]">
                                      <td
                                        colSpan={7}
                                        className="px-3 py-6 text-center text-sm text-[var(--fly-text-muted)]"
                                      >
                                        Nenhuma oferta paga encontrada para este produto no período.
                                      </td>
                                    </tr>
                                  ) : (
                                    grupo.ofertas.map((oferta, ofertaIndex) => {
                                      const ticketOferta =
                                        oferta.pedidosPeriodo > 0
                                          ? oferta.receitaPeriodo /
                                            oferta.pedidosPeriodo
                                          : 0;

                                      return (
                                        <tr
                                          key={oferta.id}
                                          className={cn(
                                            "border-t border-[var(--fly-divider-subtle)] transition-colors duration-150 hover:bg-[var(--fly-row-hover)]",
                                            ofertaIndex === 0 && "border-t-0"
                                          )}
                                        >
                                          <td className="w-[36%] px-3 py-3 align-middle">
                                            <div
                                              className={cn(
                                                "ml-9 min-w-0 border-l border-[var(--fly-divider)] pl-4 transition-[opacity,transform] duration-200 motion-reduce:transition-none",
                                                isSelected
                                                  ? "translate-y-0 opacity-100"
                                                  : "-translate-y-1 opacity-0"
                                              )}
                                            >
                                              <span className="block truncate font-medium text-[var(--fly-text-soft)]">
                                                {oferta.nome}
                                              </span>
                                              <span className="mt-1 block truncate text-xs text-[var(--fly-text-muted)]">
                                                {oferta.canal} · Última venda{" "}
                                                {oferta.ultimaVenda
                                                  ? formatDate(
                                                      oferta.ultimaVenda
                                                    )
                                                  : "-"}
                                              </span>
                                            </div>
                                          </td>
                                          <td className="w-[11%] px-3 py-3 text-right tabular-nums text-[var(--fly-text-soft)]">
                                            {formatNumber(
                                              oferta.pedidosPeriodo
                                            )}
                                          </td>
                                          <td className="w-[9%] px-3 py-3 text-right font-semibold tabular-nums text-[var(--fly-success)]">
                                            {formatNumber(
                                              oferta.potesVendidosPeriodo
                                            )}
                                          </td>
                                          <td className="w-[15%] px-3 py-3 text-right tabular-nums text-[var(--fly-text-soft)]">
                                            {formatCurrency(
                                              oferta.receitaPeriodo
                                            )}
                                          </td>
                                          <td className="w-[10%] px-3 py-3 text-right tabular-nums text-[var(--fly-text-muted)]">
                                            {formatNumber(
                                              oferta.potesPorPedido,
                                              1
                                            )}
                                          </td>
                                          <td className="w-[11%] px-3 py-3 text-right tabular-nums text-[var(--fly-text-soft)]">
                                            {formatCurrency(ticketOferta)}
                                          </td>
                                          <td className="w-[8%] px-3 py-3 text-right tabular-nums text-[var(--fly-text-muted)]">
                                            {formatPercent(
                                              oferta.participacaoPeriodo
                                            )}
                                          </td>
                                        </tr>
                                      );
                                    })
                                  )}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </td>
                      </tr>
                    </Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Panel>

    </>
  );
}
