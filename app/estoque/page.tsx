import { EstoquePeriodFilter } from "@/components/estoque/estoque-period-filter";
import FormEntrada from "@/components/estoque/form-entrada";
import TabelaEstoque from "@/components/estoque/tabela-estoque";
import Shell from "@/components/layout/shell";
import { DashboardHeader } from "@/components/layout/dashboard-header";
import {
  PageBody,
  Panel,
  StatCard,
  StatGrid,
} from "@/components/workspace/operational-ui";
import { getEstoquePageData } from "@/lib/estoque";
import { logServerTiming, timedServerTask } from "@/lib/server-timing";
import type { EstoqueMovimentacao } from "@/lib/supabase";

export const dynamic = "force-dynamic";

function formatNumber(value: number, maximumFractionDigits = 0) {
  return new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits,
  }).format(value);
}

function formatSignedNumber(value: number) {
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

function isAutomaticRestock(item: EstoqueMovimentacao) {
  return observationContains(
    item,
    "estorno automatico",
    "estorno automático"
  );
}

function isManualAdjustment(item: EstoqueMovimentacao) {
  return observationContains(item, "ajuste manual");
}

function signedMovementQuantity(item: EstoqueMovimentacao) {
  return item.tipo === "entrada" ? item.qtd_potes : -item.qtd_potes;
}

function MockEntryForm() {
  return (
    <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_112px] 2xl:grid-cols-[minmax(0,1fr)_112px_minmax(0,1.1fr)_max-content]">
      {["Produto", "Qtd potes", "Observação"].map((label, index) => (
        <label
          key={label}
          className={`grid min-w-0 gap-1 ${
            index === 2 ? "md:col-span-2 2xl:col-span-1" : ""
          }`}
        >
          <span className="text-xs font-medium text-[var(--fly-text-muted)]">
            {label}
          </span>
          <span className="flex h-10 min-w-0 items-center truncate rounded-[8px] border border-[var(--fly-border)] bg-[var(--fly-control)] px-3 text-sm text-[var(--fly-text-dim)]">
            {index === 0
              ? "Power 66"
              : index === 1
                ? "240"
                : "Entrada visual para validação"}
          </span>
        </label>
      ))}
      <div className="flex min-w-0 items-end justify-end md:col-span-2 2xl:col-span-1">
        <button
          type="button"
          disabled
          className="h-10 w-full whitespace-nowrap rounded-[8px] border border-[var(--fly-border)] bg-[var(--fly-control)] px-4 text-xs font-semibold text-[var(--fly-text-muted)] opacity-70 sm:w-auto"
        >
          Registrar
        </button>
      </div>
    </div>
  );
}

export default async function EstoquePage({
  searchParams,
}: {
  searchParams: Promise<{ dias?: string }>;
}) {
  const pageStartedAt = performance.now();
  const params = await searchParams;
  const data = await timedServerTask("estoque", "data.total", () =>
    getEstoquePageData(params.dias)
  );
  const postProcessStartedAt = performance.now();
  const automaticRestocks = data.movimentacoes.filter(isAutomaticRestock);
  const manualAdjustments = data.movimentacoes.filter(isManualAdjustment);
  const automaticRestockTotal = automaticRestocks.reduce(
    (sum, item) => sum + item.qtd_potes,
    0
  );
  const manualAdjustmentTotal = manualAdjustments.reduce(
    (sum, item) => sum + signedMovementQuantity(item),
    0
  );
  logServerTiming("estoque", "postProcess.kpis", postProcessStartedAt);
  logServerTiming("estoque", "total", pageStartedAt);

  return (
    <Shell>
      <DashboardHeader
        title="Estoque"
        description="Controle por grupo de produto"
        actions={<EstoquePeriodFilter active={data.periodo.preset} />}
      />

      <PageBody>
        <StatGrid>
          <StatCard
            label="Potes entrada"
            value={formatNumber(data.totalEntradaPeriodo)}
            detail={`${data.periodo.label} · ${data.grupos.length.toLocaleString("pt-BR")} produtos`}
            tone="blue"
          />
          <StatCard
            label="Potes vendidos"
            value={formatNumber(data.totalVendidoPeriodo)}
            detail={
              data.produtoMaiorGiro
                ? `Maior giro: ${data.produtoMaiorGiro}`
                : "Sem vendas no período"
            }
            tone="orange"
          />
          <StatCard
            label="Estornos automáticos"
            value={formatNumber(automaticRestockTotal)}
            detail={`${automaticRestocks.length.toLocaleString("pt-BR")} eventos no período`}
            tone="green"
          />
          <StatCard
            label="Ajustes manuais"
            value={formatSignedNumber(manualAdjustmentTotal)}
            detail={`${manualAdjustments.length.toLocaleString("pt-BR")} ajustes registrados`}
            tone="gold"
          />
        </StatGrid>

        <Panel
          title="Registrar entrada de estoque"
          description="Entrada manual de potes para grupos cadastrados"
        >
          {data.source === "real" ? (
            <FormEntrada grupos={data.grupos.map((grupo) => grupo.nome_grupo)} />
          ) : (
            <MockEntryForm />
          )}
        </Panel>

        <TabelaEstoque
          grupos={data.grupos}
          periodoLabel={data.periodo.label}
        />
      </PageBody>
    </Shell>
  );
}
