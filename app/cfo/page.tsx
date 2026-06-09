import { MetasMonthFilter } from "@/components/metas/metas-month-filter";
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
  getMetaAreaLabel,
  getMetasPageData,
  normalizeMetasMonth,
  type MetaGoal,
  type MetaStatus,
  type MetaUnit,
  type MetasRisk,
  type MetasWeekSummary,
} from "@/lib/metas";
import { logServerTiming, timedServerTask } from "@/lib/server-timing";
import { formatCurrency, formatPercent } from "@/lib/utils";

export const dynamic = "force-dynamic";

type CfoPageParams = {
  endDate?: string;
  mes?: string;
  startDate?: string;
};

const STATUS_LABELS: Record<MetaStatus, string> = {
  ahead: "Acima",
  attention: "Atenção",
  critical: "Crítico",
  empty: "Sem dado",
  on_track: "No ritmo",
};

const STATUS_TONES: Record<MetaStatus, "gold" | "green" | "neutral" | "orange" | "red"> = {
  ahead: "green",
  attention: "orange",
  critical: "red",
  empty: "neutral",
  on_track: "gold",
};

function resolveMonth(params: CfoPageParams) {
  return normalizeMetasMonth(params.mes ?? params.startDate ?? params.endDate);
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
  if (unit === "ratio") {
    return new Intl.NumberFormat("pt-BR", {
      maximumFractionDigits: 2,
      minimumFractionDigits: 2,
    }).format(value);
  }
  return formatNumber(value);
}

function getProgress(goal: Pick<MetaGoal, "realized" | "target">) {
  if (goal.target <= 0) return goal.realized > 0 ? 1 : 0;
  return Math.min(Math.max(goal.realized / goal.target, 0), 1.2);
}

function StatusLabel({ status }: { status: MetaStatus }) {
  const dotClass = {
    gold: "bg-[var(--fly-chart-revenue)]",
    green: "bg-[var(--fly-success)]",
    neutral: "bg-[var(--fly-text-muted)]",
    orange: "bg-[var(--fly-warning-strong)]",
    red: "bg-[#F87171]",
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
        Nenhum desvio relevante nas metas monitoradas.
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
  if (goals.length === 0) {
    return (
      <div className="rounded-[8px] border border-[var(--fly-border-subtle)] bg-[var(--fly-row-bg)] px-3 py-8 text-center">
        <p className="text-sm font-medium text-[var(--fly-text)]">
          Nenhuma meta cadastrada para este mês.
        </p>
        <p className="mt-1 text-xs text-[var(--fly-text-muted)]">
          Cadastre uma meta mensal para liberar o acompanhamento real.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[820px] table-fixed text-left text-sm">
        <thead>
          <tr className="border-b border-[var(--fly-divider)] bg-[var(--fly-table-head)] text-[11px] font-semibold uppercase text-[var(--fly-text-muted)]">
            <th className="w-[28%] px-3 py-3">Meta</th>
            <th className="w-[14%] px-3 py-3">Grupo</th>
            <th className="w-[15%] px-3 py-3 text-right">Previsto</th>
            <th className="w-[15%] px-3 py-3 text-right">Realizado</th>
            <th className="w-[14%] px-3 py-3 text-right">Atingido</th>
            <th className="w-[14%] px-3 py-3">Status</th>
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

function WeeksTable({ weeks }: { weeks: MetasWeekSummary[] }) {
  if (weeks.length === 0) {
    return (
      <div className="rounded-[8px] border border-[var(--fly-border-subtle)] bg-[var(--fly-row-bg)] px-3 py-8 text-center">
        <p className="text-sm font-medium text-[var(--fly-text)]">
          Nenhuma semana configurada.
        </p>
        <p className="mt-1 text-xs text-[var(--fly-text-muted)]">
          Configure as semanas do mês para ver o ritmo contra a meta.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] table-fixed text-left text-sm">
        <thead>
          <tr className="border-b border-[var(--fly-divider)] bg-[var(--fly-table-head)] text-[11px] font-semibold uppercase text-[var(--fly-text-muted)]">
            <th className="w-[18%] px-3 py-3">Semana</th>
            <th className="w-[18%] px-3 py-3 text-right">Meta receita</th>
            <th className="w-[18%] px-3 py-3 text-right">Realizado</th>
            <th className="w-[16%] px-3 py-3 text-right">Investimento</th>
            <th className="w-[12%] px-3 py-3 text-right">ROAS</th>
            <th className="w-[10%] px-3 py-3 text-right">Clientes</th>
            <th className="w-[14%] px-3 py-3">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--fly-divider-subtle)]">
          {weeks.map((week) => (
            <tr
              key={week.semana}
              className="transition-colors duration-150 hover:bg-[var(--fly-row-hover)]"
            >
              <td className="px-3 py-3.5">
                <p className="font-medium text-[var(--fly-text)]">{week.label}</p>
                <p className="mt-1 text-xs text-[var(--fly-text-muted)]">
                  {formatDateLong(week.inicio).split(",")[1]?.trim()} -{" "}
                  {formatDateLong(week.fim).split(",")[1]?.trim()}
                </p>
              </td>
              <td className="px-3 py-3.5 text-right font-semibold tabular-nums text-[var(--fly-text-soft)]">
                {formatCurrency(week.receitaPrevista)}
              </td>
              <td className="px-3 py-3.5 text-right font-semibold tabular-nums text-[var(--fly-text)]">
                {formatCurrency(week.receitaRealizada)}
              </td>
              <td className="px-3 py-3.5 text-right tabular-nums text-[var(--fly-text-soft)]">
                {formatCurrency(week.investimento)}
              </td>
              <td className="px-3 py-3.5 text-right tabular-nums text-[var(--fly-text-soft)]">
                {formatGoalValue(week.roas, "ratio")}
              </td>
              <td className="px-3 py-3.5 text-right tabular-nums text-[var(--fly-text-soft)]">
                {formatNumber(week.clientes)}
              </td>
              <td className="px-3 py-3.5">
                <StatusLabel status={week.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default async function CfoPage({
  searchParams,
}: {
  searchParams: Promise<CfoPageParams>;
}) {
  const pageStartedAt = performance.now();
  const params = await searchParams;
  const month = resolveMonth(params);
  const data = await timedServerTask("cfo", "data.total", () =>
    getMetasPageData(month)
  );
  const revenueGap = Math.max(
    data.summary.revenue.target - data.summary.revenue.realized,
    0
  );
  logServerTiming("cfo", "total", pageStartedAt);

  return (
    <Shell>
      <DashboardHeader
        title="CFO"
        description={`Acompanhamento financeiro semanal · ${data.monthLabel}`}
        actions={<MetasMonthFilter basePath="/cfo" month={data.month} />}
      />

      <PageBody>
        <StatGrid columns="xl:grid-cols-5">
          <StatCard
            detail={`${formatCurrency(revenueGap)} faltantes na receita liquida`}
            label="Progresso geral"
            tone={data.summary.overallProgress >= 0.9 ? "gold" : "orange"}
            value={formatPercent(data.summary.overallProgress)}
          />
          <StatCard
            detail={`meta ${formatCurrency(data.summary.revenue.target)}`}
            label="Receita liquida"
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
            detail={`meta ${formatCurrency(data.summary.investment.target)}`}
            label="Investimento"
            tone="blue"
            value={formatCurrency(data.summary.investment.realized)}
            rows={[
              {
                label: "Usado",
                meter: getProgress(data.summary.investment),
                value: formatPercent(getProgress(data.summary.investment)),
              },
            ]}
          />
          <StatCard
            detail={`meta ${formatGoalValue(data.summary.roas.target, "ratio")}`}
            label="ROAS"
            tone="green"
            value={formatGoalValue(data.summary.roas.realized, "ratio")}
          />
          <StatCard
            detail={`meta ${formatNumber(data.summary.customers.target)} clientes`}
            label="Clientes"
            tone="blue"
            value={formatNumber(data.summary.customers.realized)}
            rows={[
              {
                label: "Atingido",
                meter: getProgress(data.summary.customers),
                value: formatPercent(getProgress(data.summary.customers)),
              },
            ]}
          />
        </StatGrid>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(330px,0.8fr)]">
          <Panel
            title="Ritmo semanal"
            description="Receita prevista, realizado e investimento por semana"
          >
            <MetasProgressChart series={data.series} />
          </Panel>

          <Panel
            title="Leitura do mês"
            description={`${data.summary.atRiskCount} indicadores pedem atenção agora`}
          >
            <RisksList risks={data.risks} />
          </Panel>
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <Panel
            title="Resumo semanal"
            description="Semanas do mês contra o planejamento configurado"
          >
            <WeeksTable weeks={data.weeks} />
          </Panel>

          <Panel
            title="Indicadores detalhados"
            description="Previsto, realizado e status por indicador"
          >
            <GoalsTable goals={data.goals} />
          </Panel>
        </div>
      </PageBody>
    </Shell>
  );
}
