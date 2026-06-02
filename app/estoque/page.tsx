import { EstoquePeriodFilter } from "@/components/estoque/estoque-period-filter";
import FormEntrada from "@/components/estoque/form-entrada";
import TabelaEstoque from "@/components/estoque/tabela-estoque";
import Shell from "@/components/layout/shell";
import { DashboardHeader } from "@/components/layout/dashboard-header";
import {
  PageBody,
  Panel,
  StatGrid,
  StatusPill,
} from "@/components/workspace/operational-ui";
import { getEstoquePageData } from "@/lib/estoque";
import type { EstoqueMovimentacao } from "@/lib/supabase";

export const dynamic = "force-dynamic";

type MetricTone = "blue" | "orange" | "green" | "gold";

const metricToneStyles: Record<
  MetricTone,
  {
    dot: string;
    value: string;
  }
> = {
  blue: {
    dot: "bg-[var(--fly-chart-investment)]",
    value: "text-[var(--fly-chart-investment-active)]",
  },
  orange: {
    dot: "bg-[var(--fly-warning-strong)]",
    value: "text-[var(--fly-warning-strong)]",
  },
  green: {
    dot: "bg-[var(--fly-success)]",
    value: "text-[var(--fly-success)]",
  },
  gold: {
    dot: "bg-[var(--fly-chart-revenue)]",
    value: "text-[var(--fly-brand-strong)]",
  },
};

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

function InventoryMetricCard({
  label,
  value,
  detail,
  tone,
}: {
  label: string;
  value: string;
  detail: string;
  tone: MetricTone;
}) {
  const styles = metricToneStyles[tone];

  return (
    <section
      className="flynow-dashboard-enter-item min-w-0 rounded-[8px] border border-[var(--fly-border)] bg-[var(--fly-surface)] p-3 shadow-[var(--fly-panel-inset)] sm:p-4"
    >
      <div className="flex min-w-0 items-center gap-2">
        <span className={`size-1.5 shrink-0 rounded-full ${styles.dot}`} />
        <p className="truncate text-[11px] font-medium uppercase text-[var(--fly-text-muted)]">
          {label}
        </p>
      </div>
      <p
        className={`mt-3 whitespace-nowrap text-[24px] font-semibold leading-none tabular-nums sm:text-[26px] 2xl:text-[30px] ${styles.value}`}
      >
        {value}
      </p>
      <p className="mt-2 text-xs leading-5 text-[var(--fly-text-muted)]">
        {detail}
      </p>
    </section>
  );
}

function MockEntryForm() {
  return (
    <div className="grid gap-3 lg:grid-cols-[minmax(220px,1fr)_140px_minmax(220px,1fr)_auto]">
      {["Produto", "Qtd potes", "Observação"].map((label, index) => (
        <label key={label} className="grid gap-1">
          <span className="text-xs font-medium text-[var(--fly-text-muted)]">
            {label}
          </span>
          <span className="flex h-10 items-center rounded-[8px] border border-[var(--fly-border)] bg-[var(--fly-control)] px-3 text-sm text-[var(--fly-text-dim)]">
            {index === 0
              ? "Power 66"
              : index === 1
                ? "240"
                : "Entrada visual em modo mock"}
          </span>
        </label>
      ))}
      <div className="flex items-end">
        <button
          type="button"
          disabled
          className="h-10 w-full rounded-[8px] border border-[var(--fly-border)] bg-[var(--fly-control)] px-4 text-xs font-semibold text-[var(--fly-text-muted)] opacity-70 lg:w-auto"
        >
          Registrar Entrada
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
  const params = await searchParams;
  const data = await getEstoquePageData(params.dias);
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

  return (
    <Shell>
      <DashboardHeader
        title="Estoque"
        description="Controle por grupo de produto"
        actions={<EstoquePeriodFilter active={data.periodo.preset} />}
      />

      <PageBody>
        <StatGrid>
          <InventoryMetricCard
            label="Potes entrada"
            value={formatNumber(data.totalEntradaPeriodo)}
            detail={`${data.periodo.label} · ${data.grupos.length.toLocaleString("pt-BR")} produtos`}
            tone="blue"
          />
          <InventoryMetricCard
            label="Potes vendidos"
            value={formatNumber(data.totalVendidoPeriodo)}
            detail={
              data.produtoMaiorGiro
                ? `Maior giro: ${data.produtoMaiorGiro}`
                : "Sem vendas no período"
            }
            tone="orange"
          />
          <InventoryMetricCard
            label="Estornos automáticos"
            value={formatNumber(automaticRestockTotal)}
            detail={`${automaticRestocks.length.toLocaleString("pt-BR")} eventos no período`}
            tone="green"
          />
          <InventoryMetricCard
            label="Ajustes manuais"
            value={formatSignedNumber(manualAdjustmentTotal)}
            detail={`${manualAdjustments.length.toLocaleString("pt-BR")} ajustes registrados`}
            tone="gold"
          />
        </StatGrid>

        <Panel
          title="Registrar entrada de estoque"
          description="Entrada manual de potes para grupos cadastrados"
          action={
            <StatusPill tone={data.source === "real" ? "green" : "gold"}>
              {data.source === "real" ? "Dados reais" : "Mock ativo"}
            </StatusPill>
          }
        >
          {data.source === "real" ? (
            <FormEntrada grupos={data.grupos.map((grupo) => grupo.nome_grupo)} />
          ) : (
            <MockEntryForm />
          )}
        </Panel>

        <TabelaEstoque
          grupos={data.grupos}
          movimentacoes={data.movimentacoes}
          periodoLabel={data.periodo.label}
        />
      </PageBody>
    </Shell>
  );
}
