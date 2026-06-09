import { MetasMonthFilter } from "@/components/metas/metas-month-filter";
import { CfoWeeklyChart } from "@/components/cfo/cfo-weekly-chart";
import { CfoWeeklyInputs } from "@/components/cfo/cfo-weekly-inputs";
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
  type CfoManualFieldKey,
  type MetaGoal,
  type MetaStatus,
  type MetaUnit,
  type MetasPageData,
  type MetasRisk,
  type MetasWeekSummary,
} from "@/lib/metas";
import { getTodayInAppTimezone } from "@/lib/app-dates";
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

const EXECUTIVE_TONE_STYLES = {
  gold: {
    dot: "bg-[var(--fly-chart-revenue)]",
    text: "text-[var(--fly-brand-strong)]",
  },
  green: {
    dot: "bg-[var(--fly-success)]",
    text: "text-[var(--fly-success-text)]",
  },
  neutral: {
    dot: "bg-[var(--fly-text-muted)]",
    text: "text-[var(--fly-text)]",
  },
  orange: {
    dot: "bg-[var(--fly-warning-strong)]",
    text: "text-[var(--fly-warning-text)]",
  },
  red: {
    dot: "bg-[#F87171]",
    text: "text-[var(--fly-danger-strong)]",
  },
} satisfies Record<
  "gold" | "green" | "neutral" | "orange" | "red",
  { dot: string; text: string }
>;

const MANUAL_FIELD_LABELS: Record<CfoManualFieldKey, string> = {
  cmv_pct: "CMV",
  ebitda_pct: "EBITDA",
  eficiencia_pct: "eficiência",
  lucro_liquido: "lucro líquido",
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

function toDate(value: string) {
  return new Date(`${value}T12:00:00`);
}

function getInclusiveDays(startDate: string, endDate: string) {
  const diff = toDate(endDate).getTime() - toDate(startDate).getTime();

  return Math.max(Math.floor(diff / 86_400_000) + 1, 0);
}

function getElapsedDays(range: MetasPageData["range"]) {
  const today = getTodayInAppTimezone();

  if (today <= range.startDate) return 1;
  if (today >= range.endDate) return getInclusiveDays(range.startDate, range.endDate);

  return getInclusiveDays(range.startDate, today);
}

function getRemainingDays(range: MetasPageData["range"]) {
  const today = getTodayInAppTimezone();

  if (today < range.startDate) return getInclusiveDays(range.startDate, range.endDate);
  if (today > range.endDate) return 0;

  return getInclusiveDays(today, range.endDate);
}

function getPaceProjection(data: MetasPageData) {
  const elapsedDays = getElapsedDays(data.range);
  const totalDays = getInclusiveDays(data.range.startDate, data.range.endDate);

  if (elapsedDays <= 0 || totalDays <= 0) return data.summary.revenue.realized;

  return (data.summary.revenue.realized / elapsedDays) * totalDays;
}

function getProjectionTone(projection: number, target: number) {
  if (target <= 0) return "neutral";
  if (projection >= target) return "green";
  if (projection >= target * 0.95) return "gold";
  if (projection >= target * 0.8) return "orange";

  return "red";
}

function formatDays(value: number) {
  if (value === 1) return "1 dia";

  return `${value} dias`;
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

function formatManualFieldList(fields: CfoManualFieldKey[]) {
  if (fields.length === 0) return "nenhum campo pendente";

  return fields.map((field) => MANUAL_FIELD_LABELS[field]).join(", ");
}

function getProgress(goal: Pick<MetaGoal, "realized" | "target">) {
  if (goal.target <= 0) return goal.realized > 0 ? 1 : 0;
  return Math.min(Math.max(goal.realized / goal.target, 0), 1.2);
}

function getGoal(goals: MetaGoal[], id: string) {
  return goals.find((goal) => goal.id === id) ?? null;
}

function getGoalTone(goal: MetaGoal | null) {
  if (!goal) return "neutral";
  return STATUS_TONES[goal.status];
}

function formatCurrencyGap(realized: number, target: number) {
  const gap = target - realized;

  if (gap > 0) return `${formatCurrency(gap)} faltantes`;
  if (gap < 0) return `${formatCurrency(Math.abs(gap))} acima da meta`;
  return "meta atingida";
}

function formatBudgetGap(realized: number, target: number) {
  const gap = target - realized;

  if (gap > 0) return `${formatCurrency(gap)} disponível`;
  if (gap < 0) return `${formatCurrency(Math.abs(gap))} acima do planejado`;
  return "planejamento consumido";
}

function ExecutiveReadout({ data }: { data: MetasPageData }) {
  const projection = getPaceProjection(data);
  const projectionGap = projection - data.summary.revenue.target;
  const projectionTone = getProjectionTone(projection, data.summary.revenue.target);
  const projectionStyles = EXECUTIVE_TONE_STYLES[projectionTone];
  const remainingDays = getRemainingDays(data.range);
  const revenueGap = Math.max(
    data.summary.revenue.target - data.summary.revenue.realized,
    0,
  );
  const dailyNeed = remainingDays > 0 ? revenueGap / remainingDays : 0;
  const requiredPaceValue =
    revenueGap <= 0
      ? "Meta coberta"
      : remainingDays > 0
        ? formatCurrency(dailyNeed)
        : formatCurrency(revenueGap);
  const primaryRisk = data.risks[0] ?? null;
  const today = getTodayInAppTimezone();
  const currentWeek =
    data.weeks.find((week) => week.inicio <= today && today <= week.fim) ??
    data.weeks.find((week) => week.status === "critical" || week.status === "attention") ??
    data.weeks.at(-1) ??
    null;

  const headline =
    data.summary.revenue.target <= 0
      ? "Cadastre a meta mensal para liberar a leitura executiva."
      : projection >= data.summary.revenue.target
        ? "No ritmo atual, o mês tende a fechar acima da meta de receita."
        : "No ritmo atual, o mês precisa acelerar para alcançar a meta.";

  const projectionDetail =
    data.summary.revenue.target <= 0
      ? "Sem referência mensal cadastrada."
      : projectionGap >= 0
        ? `${formatCurrency(projectionGap)} acima da meta mensal.`
        : `${formatCurrency(Math.abs(projectionGap))} abaixo da meta mensal.`;

  const dailyNeedDetail =
    revenueGap <= 0
      ? "Meta de receita já coberta pelo realizado atual."
      : remainingDays > 0
        ? `${formatCurrency(revenueGap)} faltantes em ${formatDays(remainingDays)}.`
        : `${formatCurrency(revenueGap)} ficaram pendentes no fechamento.`;

  const riskDetail = primaryRisk
    ? primaryRisk.direction === "above_limit"
      ? `${getMetaAreaLabel(primaryRisk.area)} · ${formatGoalValue(
          primaryRisk.gap,
          primaryRisk.unit,
        )} acima do limite.`
      : `${getMetaAreaLabel(primaryRisk.area)} · ${formatGoalValue(
          primaryRisk.gap,
          primaryRisk.unit,
        )} faltantes.`
    : "Nenhum indicador crítico ou em atenção no momento.";

  return (
    <Panel
      title="Leitura executiva"
      description="Projeção, ritmo necessário e principal ponto de atenção"
    >
      <div className="space-y-4">
        <p className="text-sm font-medium leading-6 text-[var(--fly-text)]">
          {headline}
        </p>

        <div className="grid gap-4 lg:grid-cols-3 lg:gap-0 lg:divide-x lg:divide-[var(--fly-divider)]">
          <div className="min-w-0 border-b border-[var(--fly-divider-subtle)] pb-4 lg:border-b-0 lg:pb-0 lg:pr-5">
            <div className="flex min-w-0 items-center gap-2">
              <span
                aria-hidden="true"
                className={`size-1.5 shrink-0 rounded-full ${projectionStyles.dot}`}
              />
              <p className="truncate text-[11px] font-medium uppercase text-[var(--fly-text-muted)]">
                Projeção no ritmo atual
              </p>
            </div>
            <p
              className={`mt-2 text-[22px] font-semibold leading-none tabular-nums ${projectionStyles.text}`}
            >
              {formatCurrency(projection)}
            </p>
            <p className="mt-2 text-xs leading-5 text-[var(--fly-text-muted)]">
              {projectionDetail}
            </p>
          </div>

          <div className="min-w-0 border-b border-[var(--fly-divider-subtle)] pb-4 lg:border-b-0 lg:px-5 lg:pb-0">
            <div className="flex min-w-0 items-center gap-2">
              <span
                aria-hidden="true"
                className="size-1.5 shrink-0 rounded-full bg-[var(--fly-chart-revenue)]"
              />
              <p className="truncate text-[11px] font-medium uppercase text-[var(--fly-text-muted)]">
                Ritmo necessário
              </p>
            </div>
            <p className="mt-2 text-[22px] font-semibold leading-none tabular-nums text-[var(--fly-text)]">
              {requiredPaceValue}
            </p>
            <p className="mt-2 text-xs leading-5 text-[var(--fly-text-muted)]">
              {revenueGap <= 0 ? dailyNeedDetail : `${dailyNeedDetail} Média diária necessária.`}
            </p>
          </div>

          <div className="min-w-0 lg:pl-5">
            <div className="flex min-w-0 items-center gap-2">
              <span
                aria-hidden="true"
                className={`size-1.5 shrink-0 rounded-full ${
                  primaryRisk
                    ? EXECUTIVE_TONE_STYLES[STATUS_TONES[
                        data.goals.find((goal) => goal.id === primaryRisk.id)?.status ??
                          "attention"
                      ]].dot
                    : EXECUTIVE_TONE_STYLES.green.dot
                }`}
              />
              <p className="truncate text-[11px] font-medium uppercase text-[var(--fly-text-muted)]">
                Principal atenção
              </p>
            </div>
            <p className="mt-2 truncate text-[22px] font-semibold leading-none text-[var(--fly-text)]">
              {primaryRisk?.title ?? "Sem desvio"}
            </p>
            <p className="mt-2 text-xs leading-5 text-[var(--fly-text-muted)]">
              {riskDetail}
              {currentWeek ? (
                <>
                  {" "}
                  {currentWeek.label}: {formatPercent(Math.min(currentWeek.progress, 1))} da
                  meta semanal.
                </>
              ) : null}
            </p>
          </div>
        </div>
      </div>
    </Panel>
  );
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
            {risk.direction === "above_limit" ? (
              <>
                Acima do limite em{" "}
                <span className="font-semibold text-[var(--fly-text-soft)]">
                  {formatGoalValue(risk.gap, risk.unit)}
                </span>
                .
              </>
            ) : (
              <>
                Faltam{" "}
                <span className="font-semibold text-[var(--fly-text-soft)]">
                  {formatGoalValue(risk.gap, risk.unit)}
                </span>{" "}
                para bater a meta.
              </>
            )}
          </p>
        </article>
      ))}
    </div>
  );
}

function ManualInputReadiness({ data }: { data: MetasPageData }) {
  const totalWeeks = data.manualInputs.weeks.length;
  const pendingWeeks = data.manualInputs.pendingWeeks;
  const completedWeeks = Math.max(totalWeeks - pendingWeeks, 0);
  const hasPending = pendingWeeks > 0;

  return (
    <div className="rounded-[8px] border border-[var(--fly-border-subtle)] bg-[var(--fly-row-bg)] px-3 py-3 sm:px-4">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.25fr)_minmax(0,1fr)] lg:divide-x lg:divide-[var(--fly-divider)]">
        <div className="min-w-0 border-b border-[var(--fly-divider-subtle)] pb-3 lg:border-b-0 lg:pb-0 lg:pr-4">
          <p className="text-[11px] font-medium uppercase text-[var(--fly-text-muted)]">
            Fechamento do mês
          </p>
          <p className="mt-2 text-xl font-semibold tabular-nums text-[var(--fly-text)]">
            {completedWeeks}/{totalWeeks || 0}
          </p>
          <p className="mt-1 text-xs leading-5 text-[var(--fly-text-muted)]">
            semanas com os campos obrigatórios preenchidos.
          </p>
        </div>

        <div className="min-w-0 border-b border-[var(--fly-divider-subtle)] pb-3 lg:border-b-0 lg:px-4 lg:pb-0">
          <div className="flex min-w-0 items-center gap-2">
            <span
              aria-hidden="true"
              className={
                hasPending
                  ? "size-1.5 shrink-0 rounded-full bg-[var(--fly-warning-strong)]"
                  : "size-1.5 shrink-0 rounded-full bg-[var(--fly-success)]"
              }
            />
            <p className="text-[11px] font-medium uppercase text-[var(--fly-text-muted)]">
              Campos necessários
            </p>
          </div>
          <p className="mt-2 text-sm font-medium leading-5 text-[var(--fly-text)]">
            {hasPending
              ? formatManualFieldList(data.manualInputs.pendingFields)
              : "todos os inputs foram preenchidos"}
          </p>
          <p className="mt-1 text-xs leading-5 text-[var(--fly-text-muted)]">
            Sem esses dados, lucro líquido, EBITDA, CMV e eficiência ficam como não
            informados.
          </p>
        </div>

        <div className="min-w-0 lg:pl-4">
          <p className="text-[11px] font-medium uppercase text-[var(--fly-text-muted)]">
            Impacto na leitura
          </p>
          <p className="mt-2 text-sm font-medium leading-5 text-[var(--fly-text)]">
            {hasPending
              ? `${pendingWeeks} semana${pendingWeeks === 1 ? "" : "s"} aguardando o CFO.`
              : "resultado financeiro liberado para análise."}
          </p>
          <p className="mt-1 text-xs leading-5 text-[var(--fly-text-muted)]">
            Os dados automáticos continuam visíveis; apenas indicadores manuais dependem
            desse fechamento.
          </p>
        </div>
      </div>
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
            <th className="w-[28%] px-3 py-3">Indicador</th>
            <th className="w-[14%] px-3 py-3">Área</th>
            <th className="w-[15%] px-3 py-3 text-right">Referência</th>
            <th className="w-[15%] px-3 py-3 text-right">Realizado</th>
            <th className="w-[14%] px-3 py-3 text-right">Leitura</th>
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
                {goal.inputMissing ? "Não informado" : formatGoalValue(goal.realized, goal.unit)}
              </td>
              <td className="px-3 py-3.5 text-right tabular-nums text-[var(--fly-text-soft)]">
                {goal.inputMissing ? "Preencher" : formatPercent(Math.min(getProgress(goal), 1))}
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
      <table className="w-full min-w-[900px] table-fixed text-left text-sm">
        <thead>
          <tr className="border-b border-[var(--fly-divider)] bg-[var(--fly-table-head)] text-[11px] font-semibold uppercase text-[var(--fly-text-muted)]">
            <th className="w-[16%] px-3 py-3">Semana</th>
            <th className="w-[16%] px-3 py-3 text-right">Meta receita</th>
            <th className="w-[16%] px-3 py-3 text-right">Realizado</th>
            <th className="w-[14%] px-3 py-3 text-right">Investimento</th>
            <th className="w-[10%] px-3 py-3 text-right">ROAS</th>
            <th className="w-[10%] px-3 py-3 text-right">Clientes</th>
            <th className="w-[12%] px-3 py-3">Status</th>
            <th className="w-[16%] px-3 py-3">Fechamento</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--fly-divider-subtle)]">
          {weeks.map((week) => {
            const missingFields = week.manualInputs?.missingFields ?? [];

            return (
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
                <td className="px-3 py-3.5">
                  <p
                    className={
                      missingFields.length > 0
                        ? "text-xs font-medium text-[var(--fly-warning-text)]"
                        : "text-xs font-medium text-[var(--fly-success-text)]"
                    }
                  >
                    {missingFields.length > 0 ? "Pendente" : "Completo"}
                  </p>
                  <p className="mt-1 line-clamp-1 text-[11px] text-[var(--fly-text-muted)]">
                    {missingFields.length > 0
                      ? formatManualFieldList(missingFields)
                      : "inputs do CFO preenchidos"}
                  </p>
                </td>
              </tr>
            );
          })}
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
  const profitGoal = getGoal(data.goals, "lucro-liquido");
  const ebitdaGoal = getGoal(data.goals, "ebitda");
  const roasDelta = data.summary.roas.realized - data.summary.roas.target;
  const hasPendingManualInputs = data.manualInputs.pendingWeeks > 0;
  const ebitdaValue =
    ebitdaGoal && !ebitdaGoal.inputMissing
      ? formatGoalValue(ebitdaGoal.realized, "percent")
      : "não informado";
  logServerTiming("cfo", "total", pageStartedAt);

  return (
    <Shell>
      <DashboardHeader
        title="CFO"
        description={`Controle financeiro mensal · ${data.monthLabel}`}
        actions={<MetasMonthFilter basePath="/cfo" month={data.month} />}
      />

      <PageBody>
        <StatGrid columns="xl:grid-cols-4">
          <StatCard
            detail={`meta ${formatCurrency(data.summary.revenue.target)} · ${formatCurrencyGap(
              data.summary.revenue.realized,
              data.summary.revenue.target
            )}`}
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
            detail={`planejado ${formatCurrency(
              data.summary.investment.target
            )} · ${formatBudgetGap(
              data.summary.investment.realized,
              data.summary.investment.target
            )}`}
            label="Investimento"
            tone="blue"
            value={formatCurrency(data.summary.investment.realized)}
            rows={[
              {
                label: "Consumido",
                meter: getProgress(data.summary.investment),
                value: formatPercent(getProgress(data.summary.investment)),
              },
            ]}
          />
          <StatCard
            detail={`${formatGoalValue(
              Math.abs(roasDelta),
              "ratio"
            )} ${roasDelta >= 0 ? "acima do piso" : "abaixo do piso"} · piso ${formatGoalValue(
              data.summary.roas.target,
              "ratio"
            )}`}
            label="ROAS"
            tone={roasDelta >= 0 ? "green" : "orange"}
            value={formatGoalValue(data.summary.roas.realized, "ratio")}
          />
          <StatCard
            detail={
              profitGoal?.inputMissing
                ? `${data.manualInputs.pendingWeeks} semana${
                    data.manualInputs.pendingWeeks === 1 ? "" : "s"
                  } com fechamento pendente · EBITDA ${ebitdaValue}`
                : profitGoal
                  ? `meta ${formatCurrency(profitGoal.target)} · EBITDA ${ebitdaValue}`
                : "sem meta financeira cadastrada"
            }
            label="Resultado líquido"
            tone={profitGoal?.inputMissing ? "orange" : getGoalTone(profitGoal)}
            value={
              profitGoal?.inputMissing
                ? "Não informado"
                : profitGoal
                  ? formatCurrency(profitGoal.realized)
                  : "-"
            }
            rows={
              profitGoal && !profitGoal.inputMissing
                ? [
                    {
                      label: "Atingido",
                      meter: getProgress(profitGoal),
                      value: formatPercent(getProgress(profitGoal)),
                    },
                  ]
                : undefined
            }
          />
        </StatGrid>

        <ExecutiveReadout data={data} />

        <Panel
          title="Fechamento semanal do CFO"
          description={
            hasPendingManualInputs
              ? "Preencha os campos manuais para liberar lucro, EBITDA, CMV e eficiência"
              : "Campos manuais do mês preenchidos"
          }
        >
          <div className="space-y-4">
            <ManualInputReadiness data={data} />
            <CfoWeeklyInputs month={data.month} weeks={data.manualInputs.weeks} />
          </div>
        </Panel>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(330px,0.8fr)]">
          <Panel
            title="Ritmo financeiro semanal"
            description="Comparativo semanal entre meta de receita e receita realizada"
          >
            <CfoWeeklyChart series={data.series} />
          </Panel>

          <Panel
            title="Alertas financeiros"
            description={`${data.summary.atRiskCount} indicadores fora do ritmo planejado`}
          >
            <RisksList risks={data.risks} />
          </Panel>
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <Panel
            title="Resumo semanal"
            description="Semanas do mês contra o planejamento financeiro"
          >
            <WeeksTable weeks={data.weeks} />
          </Panel>

          <Panel
            title="Indicadores por área"
            description="Realizado, referência e status dos indicadores do CFO"
          >
            <GoalsTable goals={data.goals} />
          </Panel>
        </div>
      </PageBody>
    </Shell>
  );
}
