import { MetasPeriodFilter } from "@/components/metas/metas-period-filter";
import { MetasProgressChart } from "@/components/metas/metas-progress-chart";
import Shell from "@/components/layout/shell";
import { DashboardHeader } from "@/components/layout/dashboard-header";
import {
  PageBody,
  Panel,
  StatCard,
  StatGrid,
} from "@/components/workspace/operational-ui";
import {
  getDefaultMetasRange,
  getMetaAreaLabel,
  getMetasPageData,
  type MetaGoal,
  type MetaStatus,
  type MetaUnit,
  type MetasRange,
  type MetasRisk,
} from "@/lib/metas";
import { formatCurrency, formatPercent } from "@/lib/utils";

export const dynamic = "force-dynamic";

type MetasPageParams = {
  endDate?: string;
  startDate?: string;
};

const STATUS_LABELS: Record<MetaStatus, string> = {
  ahead: "Acima",
  attention: "Atenção",
  on_track: "No ritmo",
};

const STATUS_TONES: Record<MetaStatus, "gold" | "green" | "orange"> = {
  ahead: "green",
  attention: "orange",
  on_track: "gold",
};

function isDateString(value: string | undefined) {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value));
}

function resolveRange(params: MetasPageParams): MetasRange {
  const defaults = getDefaultMetasRange();
  const startDate = isDateString(params.startDate)
    ? params.startDate!
    : defaults.startDate;
  const endDate = isDateString(params.endDate) ? params.endDate! : defaults.endDate;

  return startDate <= endDate
    ? { startDate, endDate }
    : { startDate: endDate, endDate: startDate };
}

function formatDateLong(value: string) {
  return new Date(`${value}T12:00:00`).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    weekday: "short",
    year: "numeric",
  });
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: 0,
  }).format(value);
}

function formatGoalValue(value: number, unit: MetaUnit) {
  if (unit === "currency") return formatCurrency(value);
  if (unit === "percent") return formatPercent(value);
  return formatNumber(value);
}

function getProgress(goal: Pick<MetaGoal, "realized" | "target">) {
  if (goal.target <= 0) return 1;
  return Math.min(Math.max(goal.realized / goal.target, 0), 1.2);
}

function StatusLabel({ status }: { status: MetaStatus }) {
  const dotClass = {
    gold: "bg-[var(--fly-chart-revenue)]",
    green: "bg-[var(--fly-success)]",
    orange: "bg-[var(--fly-warning-strong)]",
  }[STATUS_TONES[status]];

  return (
    <span className="inline-flex items-center gap-2 text-xs font-medium text-[var(--fly-text-soft)]">
      <span aria-hidden="true" className={`size-1.5 rounded-full ${dotClass}`} />
      {STATUS_LABELS[status]}
    </span>
  );
}

function RisksList({ risks }: { risks: MetasRisk[] }) {
  if (risks.length === 0) {
    return (
      <div className="rounded-[8px] border border-[var(--fly-success-border)] bg-[var(--fly-success-surface)] px-3 py-3 text-sm text-[var(--fly-success-text)]">
        Todas as metas monitoradas estão dentro do ritmo esperado.
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      {risks.map((risk) => (
        <article
          key={risk.id}
          className="rounded-[8px] border border-[var(--fly-border-subtle)] bg-[var(--fly-row-bg)] px-3 py-3"
        >
          <div className="flex min-w-0 items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[var(--fly-text)]">
                {risk.title}
              </p>
              <p className="mt-1 text-xs leading-5 text-[var(--fly-text-muted)]">
                {risk.detail}
              </p>
            </div>
            <span className="shrink-0 rounded-[7px] border border-[var(--fly-warning-border)] bg-[var(--fly-warning-bg)] px-2 py-1 text-[11px] font-medium text-[var(--fly-warning-text)]">
              {getMetaAreaLabel(risk.area)}
            </span>
          </div>
          <p className="mt-3 text-xs text-[var(--fly-text-muted)]">
            Faltam{" "}
            <span className="font-semibold text-[var(--fly-text-soft)]">
              {formatGoalValue(risk.gap, risk.unit)}
            </span>{" "}
            para bater a meta.
          </p>
        </article>
      ))}
    </div>
  );
}

function GoalsTable({ goals }: { goals: MetaGoal[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[860px] table-fixed text-left text-sm">
        <thead>
          <tr className="border-b border-[var(--fly-divider)] bg-[var(--fly-table-head)] text-[11px] font-semibold uppercase text-[var(--fly-text-muted)]">
            <th className="w-[25%] px-3 py-3">Meta</th>
            <th className="w-[14%] px-3 py-3">Area</th>
            <th className="w-[16%] px-3 py-3">Responsavel</th>
            <th className="w-[15%] px-3 py-3 text-right">Alvo</th>
            <th className="w-[15%] px-3 py-3 text-right">Realizado</th>
            <th className="w-[9%] px-3 py-3 text-right">Progresso</th>
            <th className="w-[12%] px-3 py-3">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--fly-divider-subtle)]">
          {goals.map((goal) => (
            <tr
              key={goal.id}
              className="transition-colors duration-150 hover:bg-[var(--fly-row-hover)]"
            >
              <td className="px-3 py-3.5">
                <p className="font-medium text-[var(--fly-text)]">{goal.name}</p>
                <p className="mt-1 line-clamp-1 text-xs text-[var(--fly-text-muted)]">
                  {goal.description}
                </p>
              </td>
              <td className="px-3 py-3.5 text-[var(--fly-text-soft)]">
                {getMetaAreaLabel(goal.area)}
              </td>
              <td className="px-3 py-3.5 text-[var(--fly-text-soft)]">
                {goal.owner}
              </td>
              <td className="px-3 py-3.5 text-right font-semibold tabular-nums text-[var(--fly-text-soft)]">
                {formatGoalValue(goal.target, goal.unit)}
              </td>
              <td className="px-3 py-3.5 text-right font-semibold tabular-nums text-[var(--fly-text)]">
                {formatGoalValue(goal.realized, goal.unit)}
              </td>
              <td className="px-3 py-3.5 text-right tabular-nums text-[var(--fly-text-soft)]">
                {formatPercent(Math.min(getProgress(goal), 1))}
              </td>
              <td className="px-3 py-3.5">
                <StatusLabel status={goal.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default async function MetasPage({
  searchParams,
}: {
  searchParams: Promise<MetasPageParams>;
}) {
  const params = await searchParams;
  const range = resolveRange(params);
  const data = await getMetasPageData(range);
  const revenueGap = Math.max(
    data.summary.revenue.target - data.summary.revenue.realized,
    0
  );

  return (
    <Shell>
      <DashboardHeader
        title="Metas"
        description={`Planejamento, ritmo e risco do período · ${formatDateLong(data.range.endDate)}`}
        actions={<MetasPeriodFilter range={data.range} />}
      />

      <PageBody>
        <StatGrid>
          <StatCard
            detail={`${formatCurrency(revenueGap)} faltantes na receita líquida`}
            label="Progresso geral"
            tone={data.summary.overallProgress >= 0.9 ? "gold" : "orange"}
            value={formatPercent(data.summary.overallProgress)}
          />
          <StatCard
            detail={`meta ${formatCurrency(data.summary.revenue.target)}`}
            label="Receita líquida"
            tone="gold"
            value={formatCurrency(data.summary.revenue.realized)}
            rows={[
              {
                label: "Atingido",
                meter: getProgress(data.summary.revenue),
                value: formatPercent(getProgress(data.summary.revenue)),
              },
            ]}
          />
          <StatCard
            detail={`meta ${formatNumber(data.summary.orders.target)} pedidos`}
            label="Pedidos pagos"
            tone="blue"
            value={formatNumber(data.summary.orders.realized)}
            rows={[
              {
                label: "Atingido",
                meter: getProgress(data.summary.orders),
                value: formatPercent(getProgress(data.summary.orders)),
              },
            ]}
          />
          <StatCard
            detail={`meta ${formatGoalValue(data.summary.recovery.target, "percent")}`}
            label="Recuperação"
            tone="green"
            value={formatGoalValue(data.summary.recovery.realized, "percent")}
          />
        </StatGrid>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(330px,0.8fr)]">
          <Panel
            title="Ritmo da receita"
            description="Meta acumulada, realizado e projeção do período"
          >
            <MetasProgressChart series={data.series} />
          </Panel>

          <Panel
            title="Metas em risco"
            description={`${data.summary.atRiskCount} metas pedem atenção agora`}
          >
            <RisksList risks={data.risks} />
          </Panel>
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,0.78fr)_minmax(0,1.22fr)]">
          <Panel
            title="Sinais rápidos"
            description="Resumo de metas que ajudam na priorização"
          >
            <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-1">
              <div className="rounded-[8px] border border-[var(--fly-border-subtle)] bg-[var(--fly-row-bg)] px-3 py-3">
                <p className="text-[11px] font-medium uppercase text-[var(--fly-text-muted)]">
                  Projeção de receita
                </p>
                <p className="mt-2 text-xl font-semibold tabular-nums text-[var(--fly-text)]">
                  {formatCurrency(data.summary.projectedRevenue)}
                </p>
                <p className="mt-1 text-xs text-[var(--fly-text-muted)]">
                  estimativa com o ritmo atual do período
                </p>
              </div>
              <div className="rounded-[8px] border border-[var(--fly-border-subtle)] bg-[var(--fly-row-bg)] px-3 py-3">
                <p className="text-[11px] font-medium uppercase text-[var(--fly-text-muted)]">
                  Upsells
                </p>
                <p className="mt-2 text-xl font-semibold tabular-nums text-[var(--fly-text)]">
                  {formatCurrency(data.summary.upsell.realized)}
                </p>
                <p className="mt-1 text-xs text-[var(--fly-text-muted)]">
                  {formatPercent(getProgress(data.summary.upsell))} da meta do período
                </p>
              </div>
              <div className="rounded-[8px] border border-[var(--fly-border-subtle)] bg-[var(--fly-row-bg)] px-3 py-3">
                <p className="text-[11px] font-medium uppercase text-[var(--fly-text-muted)]">
                  Ticket médio
                </p>
                <p className="mt-2 text-xl font-semibold tabular-nums text-[var(--fly-text)]">
                  {formatCurrency(data.summary.ticket.realized)}
                </p>
                <p className="mt-1 text-xs text-[var(--fly-text-muted)]">
                  meta {formatCurrency(data.summary.ticket.target)}
                </p>
              </div>
            </div>
          </Panel>

          <Panel
            title="Metas do período"
            description="Acompanhamento por área, responsável e status"
          >
            <GoalsTable goals={data.goals} />
          </Panel>
        </div>
      </PageBody>
    </Shell>
  );
}
