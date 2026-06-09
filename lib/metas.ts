import { getTodayInAppTimezone, shiftDateString } from "@/lib/app-dates";
import {
  CfoPanelError,
  type CfoMetric,
  type CfoPanelData,
  type CfoWeek,
  getCfoPanelData,
} from "@/lib/cfo-panel";
import { shouldUseMockData } from "@/lib/data-mode";

export type MetasRange = {
  endDate: string;
  startDate: string;
};

export type MetaArea =
  | "aquisicao"
  | "comercial"
  | "custos"
  | "financeiro"
  | "perdas"
  | "resultado";

export type MetaUnit = "currency" | "number" | "percent" | "ratio";

export type MetaStatus =
  | "ahead"
  | "attention"
  | "critical"
  | "empty"
  | "on_track";

export type MetaGoal = {
  area: MetaArea;
  description: string;
  id: string;
  inputMissing?: boolean;
  inputRequired?: boolean;
  name: string;
  owner: string;
  realized: number;
  status: MetaStatus;
  target: number;
  unit: MetaUnit;
  updatedAt: string;
};

export type MetasProgressPoint = {
  day: string;
  investment: number;
  projection: number;
  realized: number;
  target: number;
};

export type MetasRisk = {
  area: MetaArea;
  detail: string;
  direction: "above_limit" | "below_target";
  gap: number;
  id: string;
  title: string;
  unit: MetaUnit;
};

export type MetasWeekSummary = {
  clientes: number;
  fim: string;
  inicio: string;
  investimento: number;
  label: string;
  manualInputs?: CfoWeeklyManualInput;
  progress: number;
  receitaPrevista: number;
  receitaRealizada: number;
  roas: number;
  semana: number;
  status: MetaStatus;
};

export type CfoManualFieldKey =
  | "cmv_pct"
  | "ebitda_pct"
  | "eficiencia_pct"
  | "lucro_liquido";

export type CfoWeeklyManualInput = {
  cmvPct: number | null;
  ebitdaPct: number | null;
  eficienciaPct: number | null;
  fim: string;
  inicio: string;
  label: string;
  lucroLiquido: number | null;
  missingFields: CfoManualFieldKey[];
  notas: string | null;
  semana: number;
};

export type MetasPageData = {
  goals: MetaGoal[];
  manualInputs: {
    pendingFields: CfoManualFieldKey[];
    pendingWeeks: number;
    requiredFields: CfoManualFieldKey[];
    weeks: CfoWeeklyManualInput[];
  };
  month: string;
  monthLabel: string;
  range: MetasRange;
  risks: MetasRisk[];
  series: MetasProgressPoint[];
  source: "empty" | "mock" | "real";
  summary: {
    aheadCount: number;
    atRiskCount: number;
    customers: Pick<MetaGoal, "realized" | "target" | "unit">;
    investment: Pick<MetaGoal, "realized" | "target" | "unit">;
    overallProgress: number;
    projectedRevenue: number;
    recovery: Pick<MetaGoal, "realized" | "target" | "unit">;
    revenue: Pick<MetaGoal, "realized" | "target" | "unit">;
    roas: Pick<MetaGoal, "realized" | "target" | "unit">;
    ticket: Pick<MetaGoal, "realized" | "target" | "unit">;
  };
  weeks: MetasWeekSummary[];
};

const AREA_LABELS: Record<MetaArea, string> = {
  aquisicao: "Aquisição",
  comercial: "Comercial",
  custos: "Custos",
  financeiro: "Financeiro",
  perdas: "Perdas",
  resultado: "Resultado",
};

const MONEY_GOAL_IDS = new Set([
  "receita-liquida",
  "investimento",
  "lucro-liquido",
]);

const LIMIT_GOAL_IDS = new Set([
  "investimento",
  "pct-chargeback",
  "pct-reembolso",
  "cmv",
]);

const MANUAL_REQUIRED_FIELDS: CfoManualFieldKey[] = [
  "lucro_liquido",
  "ebitda_pct",
  "cmv_pct",
  "eficiencia_pct",
];

export function getMetaAreaLabel(area: MetaArea) {
  return AREA_LABELS[area];
}

export function getDefaultMetasMonth() {
  return getTodayInAppTimezone().slice(0, 7);
}

export function getDefaultMetasRange(): MetasRange {
  const today = getTodayInAppTimezone();

  return {
    endDate: today,
    startDate: `${today.slice(0, 8)}01`,
  };
}

export function normalizeMetasMonth(value: string | undefined) {
  if (value && /^\d{4}-\d{2}$/.test(value)) return value;
  if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value.slice(0, 7);

  return getDefaultMetasMonth();
}

function monthStart(month: string) {
  return `${month}-01`;
}

function monthEnd(month: string) {
  const [year, monthIndex] = month.split("-").map(Number);
  return new Date(year, monthIndex, 0).toISOString().slice(0, 10);
}

function monthLabel(month: string) {
  return new Date(`${month}-01T12:00:00`).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });
}

function normalizeRange(range: MetasRange): MetasRange {
  return range.startDate <= range.endDate
    ? range
    : { endDate: range.startDate, startDate: range.endDate };
}

function toDate(value: string) {
  return new Date(`${value}T12:00:00`);
}

function getRangeDays(range: MetasRange) {
  const start = toDate(range.startDate);
  const end = toDate(range.endDate);
  const diff = end.getTime() - start.getTime();

  return Math.max(Math.floor(diff / 86_400_000) + 1, 1);
}

function buildDateSeries(range: MetasRange) {
  const days = getRangeDays(range);

  return Array.from({ length: days }, (_, index) =>
    shiftDateString(range.startDate, index),
  );
}

function clamp(value: number, min = 0, max = 1) {
  if (!Number.isFinite(value)) return min;
  return Math.min(Math.max(value, min), max);
}

function numberValue(value: unknown, fallback = 0) {
  const parsed = Number(value ?? fallback);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function sumMetrics(weeks: CfoWeek[], getter: (week: CfoWeek) => CfoMetric) {
  return weeks.reduce((total, week) => total + numberValue(getter(week).realizado), 0);
}

function metricValues(weeks: CfoWeek[], getter: (week: CfoWeek) => CfoMetric) {
  return weeks
    .map((week) => getter(week).realizado)
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value));
}

function sumOptionalMetrics(weeks: CfoWeek[], getter: (week: CfoWeek) => CfoMetric) {
  const values = metricValues(weeks, getter);

  if (values.length === 0) return null;
  return values.reduce((total, value) => total + value, 0);
}

function averageMetrics(weeks: CfoWeek[], getter: (week: CfoWeek) => CfoMetric) {
  const values = metricValues(weeks, getter);

  if (values.length === 0) return 0;
  return values.reduce((total, value) => total + value, 0) / values.length;
}

function averageOptionalMetrics(weeks: CfoWeek[], getter: (week: CfoWeek) => CfoMetric) {
  const values = metricValues(weeks, getter);

  if (values.length === 0) return null;
  return values.reduce((total, value) => total + value, 0) / values.length;
}

function statusFromRatio(target: number, realized: number, inverse = false): MetaStatus {
  if (target <= 0 && realized <= 0) return "empty";
  if (target <= 0) return realized > 0 ? "ahead" : "empty";

  if (inverse) {
    if (realized <= target) return "ahead";
    if (realized <= target * 1.05) return "on_track";
    if (realized <= target * 1.2) return "attention";
    return "critical";
  }

  const ratio = realized / target;
  if (ratio >= 1) return "ahead";
  if (ratio >= 0.95) return "on_track";
  if (ratio >= 0.8) return "attention";
  return "critical";
}

function statusFromCfo(status: string): MetaStatus {
  if (status === "NO_RITMO") return "on_track";
  if (status === "ATENCAO") return "attention";
  if (status === "CRITICO") return "critical";
  return "empty";
}

function createGoal({
  area,
  description,
  id,
  inverse = false,
  name,
  owner,
  realized,
  status,
  target,
  unit,
}: Omit<MetaGoal, "status" | "updatedAt"> & {
  inverse?: boolean;
  status?: MetaStatus;
}): MetaGoal {
  return {
    area,
    description,
    id,
    name,
    owner,
    realized,
    status: status ?? statusFromRatio(target, realized, inverse),
    target,
    unit,
    updatedAt: getTodayInAppTimezone(),
  };
}

function createManualGoal({
  realized,
  ...goal
}: Omit<MetaGoal, "inputMissing" | "inputRequired" | "realized" | "status" | "updatedAt"> & {
  inverse?: boolean;
  realized: number | null;
}) {
  const inputMissing = realized == null;

  return {
    ...createGoal({
      ...goal,
      realized: realized ?? 0,
      status: inputMissing ? "empty" : undefined,
    }),
    inputMissing,
    inputRequired: true,
  };
}

function buildProgressSeries(
  range: MetasRange,
  targetRevenue: number,
  realizedRevenue: number,
): MetasProgressPoint[] {
  const days = buildDateSeries(range);
  const projectedRevenue = targetRevenue * clamp((realizedRevenue / targetRevenue) * 1.04, 0.62, 1.08);

  return days.map((day, index) => {
    const progress = (index + 1) / days.length;
    const movement = 0.97 + Math.sin((index + 1) * 1.35) * 0.025;

    return {
      day,
      investment: 0,
      projection: projectedRevenue * progress,
      realized: Math.min(realizedRevenue, realizedRevenue * progress * movement),
      target: targetRevenue * progress,
    };
  });
}

function buildRisks(goals: MetaGoal[]): MetasRisk[] {
  const riskRank: Record<MetaStatus, number> = {
    ahead: 3,
    attention: 1,
    critical: 0,
    empty: 4,
    on_track: 2,
  };

  const getSeverity = (goal: MetaGoal) => {
    if (goal.target <= 0) return 0;
    const ratio = goal.realized / goal.target;

    return LIMIT_GOAL_IDS.has(goal.id)
      ? Math.max(ratio - 1, 0)
      : Math.max(1 - ratio, 0);
  };

  return goals
    .filter((goal) => goal.status === "attention" || goal.status === "critical")
    .sort((first, second) => {
      const rankDiff = riskRank[first.status] - riskRank[second.status];
      if (rankDiff !== 0) return rankDiff;

      return getSeverity(second) - getSeverity(first);
    })
    .slice(0, 4)
    .map((goal) => {
      const isLimitGoal = LIMIT_GOAL_IDS.has(goal.id);

      return {
        area: goal.area,
        detail: goal.description,
        direction: isLimitGoal ? "above_limit" : "below_target",
        gap: isLimitGoal
          ? Math.max(goal.realized - goal.target, 0)
          : Math.max(goal.target - goal.realized, 0),
        id: goal.id,
        title: goal.name,
        unit: goal.unit,
      };
    });
}

function getMissingManualFields(week: CfoWeek): CfoManualFieldKey[] {
  const fields: Array<[CfoManualFieldKey, number | null]> = [
    ["lucro_liquido", week.indicadores.resultado.lucro_liquido.realizado],
    ["ebitda_pct", week.indicadores.resultado.ebitda_pct.realizado],
    ["cmv_pct", week.indicadores.custos.cmv.realizado],
    ["eficiencia_pct", week.indicadores.custos.eficiencia.realizado],
  ];

  return fields
    .filter(([, value]) => value == null || !Number.isFinite(value))
    .map(([key]) => key);
}

function buildManualInputs(weeks: CfoWeek[]): CfoWeeklyManualInput[] {
  return weeks.map((week) => ({
    cmvPct: week.indicadores.custos.cmv.realizado,
    ebitdaPct: week.indicadores.resultado.ebitda_pct.realizado,
    eficienciaPct: week.indicadores.custos.eficiencia.realizado,
    fim: week.fim,
    inicio: week.inicio,
    label: `Semana ${week.semana}`,
    lucroLiquido: week.indicadores.resultado.lucro_liquido.realizado,
    missingFields: getMissingManualFields(week),
    notas: week.notas,
    semana: week.semana,
  }));
}

function buildManualInputSummary(weeks: CfoWeeklyManualInput[]): MetasPageData["manualInputs"] {
  const pendingFields = Array.from(
    new Set(weeks.flatMap((week) => week.missingFields)),
  );

  return {
    pendingFields,
    pendingWeeks: weeks.filter((week) => week.missingFields.length > 0).length,
    requiredFields: MANUAL_REQUIRED_FIELDS,
    weeks,
  };
}

function buildDefaultManualInputWeeks(month: string): CfoWeeklyManualInput[] {
  const start = monthStart(month);
  const end = monthEnd(month);
  const weeks: CfoWeeklyManualInput[] = [];

  for (
    let inicio = start, semana = 1;
    inicio <= end;
    inicio = shiftDateString(inicio, 7), semana += 1
  ) {
    const fim = shiftDateString(inicio, 6) <= end ? shiftDateString(inicio, 6) : end;

    weeks.push({
      cmvPct: null,
      ebitdaPct: null,
      eficienciaPct: null,
      fim,
      inicio,
      label: `Semana ${semana}`,
      lucroLiquido: null,
      missingFields: MANUAL_REQUIRED_FIELDS,
      notas: null,
      semana,
    });
  }

  return weeks;
}

function buildRealGoals(cfo: CfoPanelData): MetaGoal[] {
  const meta = cfo.meta;
  const weeks = cfo.semanas;
  const receita = sumMetrics(weeks, (week) => week.indicadores.receita.receita_liquida);
  const investimento = sumMetrics(weeks, (week) => week.indicadores.aquisicao.investimento);
  const clientes = sumMetrics(weeks, (week) => week.indicadores.receita.clientes);
  const roas = investimento > 0 ? receita / investimento : 0;
  const ticket = clientes > 0 ? receita / clientes : 0;
  const cmv = averageOptionalMetrics(weeks, (week) => week.indicadores.custos.cmv);
  const lucroLiquido = sumOptionalMetrics(
    weeks,
    (week) => week.indicadores.resultado.lucro_liquido,
  );
  const ebitda = averageOptionalMetrics(
    weeks,
    (week) => week.indicadores.resultado.ebitda_pct,
  );

  return [
    createGoal({
      area: "financeiro",
      description: "Receita liquida acumulada contra a meta mensal.",
      id: "receita-liquida",
      name: "Receita liquida",
      owner: "Financeiro",
      realized: receita,
      target: numberValue(meta.meta_receita_liquida),
      unit: "currency",
    }),
    createGoal({
      area: "aquisicao",
      description: "Investimento de midia realizado contra o planejamento mensal.",
      id: "investimento",
      inverse: true,
      name: "Investimento",
      owner: "Performance",
      realized: investimento,
      target: numberValue(meta.invest_total),
      unit: "currency",
    }),
    createGoal({
      area: "aquisicao",
      description: "ROAS consolidado do mes contra o piso exigido.",
      id: "roas",
      name: "ROAS",
      owner: "Performance",
      realized: roas,
      target: numberValue(meta.roas_exigido, 1.4),
      unit: "ratio",
    }),
    createGoal({
      area: "comercial",
      description: "Clientes/pedidos pagos capturados no periodo de governanca.",
      id: "clientes",
      name: "Clientes",
      owner: "Comercial",
      realized: clientes,
      target: numberValue(meta.meta_clientes),
      unit: "number",
    }),
    createGoal({
      area: "comercial",
      description: "Ticket medio realizado no mes.",
      id: "ticket-medio",
      name: "Ticket medio",
      owner: "Comercial",
      realized: ticket,
      target: numberValue(meta.meta_ticket_medio),
      unit: "currency",
    }),
    createGoal({
      area: "financeiro",
      description: "Participacao da receita front na composicao mensal.",
      id: "pct-front",
      name: "Receita front",
      owner: "Financeiro",
      realized: averageMetrics(weeks, (week) => week.indicadores.receita.pct_front) / 100,
      target: numberValue(meta.meta_pct_front, 75) / 100,
      unit: "percent",
    }),
    createGoal({
      area: "financeiro",
      description: "Participacao da receita backend na composicao mensal.",
      id: "pct-backend",
      name: "Receita backend",
      owner: "Financeiro",
      realized: averageMetrics(weeks, (week) => week.indicadores.receita.pct_backend) / 100,
      target: numberValue(meta.meta_pct_backend, 15) / 100,
      unit: "percent",
    }),
    createGoal({
      area: "financeiro",
      description: "Participacao da receita recuperada na composicao mensal.",
      id: "pct-recuperada",
      name: "Receita recuperada",
      owner: "Retencao",
      realized: averageMetrics(weeks, (week) => week.indicadores.receita.pct_recuperada) / 100,
      target: numberValue(meta.meta_pct_recuperada, 10) / 100,
      unit: "percent",
    }),
    createGoal({
      area: "perdas",
      description: "Percentual de pedidos com chargeback contra o limite planejado.",
      id: "pct-chargeback",
      inverse: true,
      name: "Chargeback",
      owner: "Financeiro",
      realized: averageMetrics(weeks, (week) => week.indicadores.perdas.pct_chargeback) / 100,
      target: numberValue(meta.meta_pct_chargeback, 6) / 100,
      unit: "percent",
    }),
    createGoal({
      area: "perdas",
      description: "Percentual de pedidos reembolsados contra o limite planejado.",
      id: "pct-reembolso",
      inverse: true,
      name: "Reembolso",
      owner: "Financeiro",
      realized: averageMetrics(weeks, (week) => week.indicadores.perdas.pct_reembolso) / 100,
      target: numberValue(meta.meta_pct_reembolso, 2) / 100,
      unit: "percent",
    }),
    createManualGoal({
      area: "custos",
      description: "CMV informado pelo CFO para acompanhamento semanal.",
      id: "cmv",
      inverse: true,
      name: "CMV",
      owner: "CFO",
      realized: cmv == null ? null : cmv / 100,
      target: numberValue(meta.meta_pct_cmv, 14) / 100,
      unit: "percent",
    }),
    createManualGoal({
      area: "resultado",
      description: "Lucro liquido informado no acompanhamento semanal.",
      id: "lucro-liquido",
      name: "Lucro liquido",
      owner: "CFO",
      realized: lucroLiquido,
      target: numberValue(meta.meta_lucro_liquido),
      unit: "currency",
    }),
    createManualGoal({
      area: "resultado",
      description: "EBITDA percentual informado no acompanhamento semanal.",
      id: "ebitda",
      name: "EBITDA",
      owner: "CFO",
      realized: ebitda == null ? null : ebitda / 100,
      target: numberValue(meta.meta_ebitda_pct, 9.4) / 100,
      unit: "percent",
    }),
  ];
}

function buildRealWeeks(cfo: CfoPanelData): MetasWeekSummary[] {
  return cfo.semanas.map((week) => {
    const receita = week.indicadores.receita.receita_liquida;
    const realized = numberValue(receita.realizado);
    const target = numberValue(receita.previsto);

    return {
      clientes: numberValue(week.indicadores.receita.clientes.realizado),
      fim: week.fim,
      inicio: week.inicio,
      investimento: numberValue(week.indicadores.aquisicao.investimento.realizado),
      label: `Semana ${week.semana}`,
      manualInputs: {
        cmvPct: week.indicadores.custos.cmv.realizado,
        ebitdaPct: week.indicadores.resultado.ebitda_pct.realizado,
        eficienciaPct: week.indicadores.custos.eficiencia.realizado,
        fim: week.fim,
        inicio: week.inicio,
        label: `Semana ${week.semana}`,
        lucroLiquido: week.indicadores.resultado.lucro_liquido.realizado,
        missingFields: getMissingManualFields(week),
        notas: week.notas,
        semana: week.semana,
      },
      progress: target > 0 ? clamp(realized / target, 0, 1.2) : 0,
      receitaPrevista: target,
      receitaRealizada: realized,
      roas: numberValue(week.indicadores.aquisicao.roas.realizado),
      semana: week.semana,
      status: statusFromCfo(receita.status),
    };
  });
}

function buildRealSeries(weeks: MetasWeekSummary[]): MetasProgressPoint[] {
  return weeks.map((week) => ({
    day: `S${week.semana}`,
    investment: week.investimento,
    projection: week.receitaPrevista,
    realized: week.receitaRealizada,
    target: week.receitaPrevista,
  }));
}

function buildSummary(goals: MetaGoal[], weeks: MetasWeekSummary[]): MetasPageData["summary"] {
  const revenue = goals.find((goal) => goal.id === "receita-liquida")!;
  const investment = goals.find((goal) => goal.id === "investimento")!;
  const roas = goals.find((goal) => goal.id === "roas")!;
  const customers = goals.find((goal) => goal.id === "clientes")!;
  const ticket = goals.find((goal) => goal.id === "ticket-medio")!;
  const recovery = goals.find((goal) => goal.id === "pct-recuperada")!;
  const ratioGoals = goals.filter((goal) => goal.status !== "empty" && !MONEY_GOAL_IDS.has(goal.id));
  const ratios = ratioGoals.map((goal) =>
    clamp(goal.target > 0 ? goal.realized / goal.target : 1),
  );
  const overallProgress =
    ratios.length > 0
      ? ratios.reduce((total, ratio) => total + ratio, 0) / ratios.length
      : clamp(revenue.target > 0 ? revenue.realized / revenue.target : 0);

  return {
    aheadCount: goals.filter((goal) => goal.status === "ahead").length,
    atRiskCount: goals.filter(
      (goal) => goal.status === "attention" || goal.status === "critical",
    ).length,
    customers,
    investment,
    overallProgress,
    projectedRevenue: weeks.reduce((total, week) => total + week.receitaPrevista, 0),
    recovery,
    revenue,
    roas,
    ticket,
  };
}

function createRealMetasPageData(cfo: CfoPanelData): MetasPageData {
  const month = cfo.mes.slice(0, 7);
  const range = {
    endDate: monthEnd(month),
    startDate: monthStart(month),
  };
  const goals = buildRealGoals(cfo);
  const weeks = buildRealWeeks(cfo);
  const manualInputs = buildManualInputSummary(buildManualInputs(cfo.semanas));

  return {
    goals,
    manualInputs,
    month,
    monthLabel: monthLabel(month),
    range,
    risks: buildRisks(goals),
    series: buildRealSeries(weeks),
    source: "real",
    summary: buildSummary(goals, weeks),
    weeks,
  };
}

function createEmptyMetasPageData(month: string): MetasPageData {
  const range = {
    endDate: monthEnd(month),
    startDate: monthStart(month),
  };
  const manualInputWeeks = buildDefaultManualInputWeeks(month);

  return {
    goals: [],
    manualInputs: buildManualInputSummary(manualInputWeeks),
    month,
    monthLabel: monthLabel(month),
    range,
    risks: [],
    series: [],
    source: "empty",
    summary: {
      aheadCount: 0,
      atRiskCount: 0,
      customers: { realized: 0, target: 0, unit: "number" },
      investment: { realized: 0, target: 0, unit: "currency" },
      overallProgress: 0,
      projectedRevenue: 0,
      recovery: { realized: 0, target: 0, unit: "percent" },
      revenue: { realized: 0, target: 0, unit: "currency" },
      roas: { realized: 0, target: 0, unit: "ratio" },
      ticket: { realized: 0, target: 0, unit: "currency" },
    },
    weeks: [],
  };
}

export function createMockMetasPageData(
  range = getDefaultMetasRange(),
): MetasPageData {
  const normalizedRange = normalizeRange(range);
  const days = getRangeDays(normalizedRange);
  const revenueTarget = 62_000 * days;
  const ordersTarget = 116 * days;
  const investmentTarget = 40_000 * days;
  const revenueRealized = revenueTarget * 0.88;
  const investmentRealized = investmentTarget * 0.92;

  const goals = [
    createGoal({
      area: "financeiro",
      description: "Receita liquida acumulada do periodo contra o plano comercial.",
      id: "receita-liquida",
      name: "Receita liquida",
      owner: "Financeiro",
      realized: revenueRealized,
      target: revenueTarget,
      unit: "currency",
    }),
    createGoal({
      area: "aquisicao",
      description: "Investimento planejado para sustentar a meta comercial.",
      id: "investimento",
      inverse: true,
      name: "Investimento",
      owner: "Performance",
      realized: investmentRealized,
      target: investmentTarget,
      unit: "currency",
    }),
    createGoal({
      area: "aquisicao",
      description: "ROAS consolidado do periodo.",
      id: "roas",
      name: "ROAS",
      owner: "Performance",
      realized: revenueRealized / investmentRealized,
      target: 1.4,
      unit: "ratio",
    }),
    createGoal({
      area: "comercial",
      description: "Pedidos pagos no periodo.",
      id: "clientes",
      name: "Clientes",
      owner: "Comercial",
      realized: Math.round(ordersTarget * 0.93),
      target: ordersTarget,
      unit: "number",
    }),
    createGoal({
      area: "comercial",
      description: "Ticket medio esperado para manter margem e eficiencia do periodo.",
      id: "ticket-medio",
      name: "Ticket medio",
      owner: "Comercial",
      realized: 552,
      target: 565,
      unit: "currency",
    }),
    createGoal({
      area: "financeiro",
      description: "Participacao de receita recuperada no periodo.",
      id: "pct-recuperada",
      name: "Receita recuperada",
      owner: "Retencao",
      realized: 0.171,
      target: 0.18,
      unit: "percent",
    }),
    createManualGoal({
      area: "custos",
      description: "CMV informado pelo CFO para acompanhamento semanal.",
      id: "cmv",
      inverse: true,
      name: "CMV",
      owner: "CFO",
      realized: 0.14,
      target: 0.14,
      unit: "percent",
    }),
    createManualGoal({
      area: "resultado",
      description: "Lucro liquido informado no acompanhamento semanal.",
      id: "lucro-liquido",
      name: "Lucro liquido",
      owner: "CFO",
      realized: revenueRealized * 0.08,
      target: revenueTarget * 0.09,
      unit: "currency",
    }),
    createManualGoal({
      area: "resultado",
      description: "EBITDA percentual informado no acompanhamento semanal.",
      id: "ebitda",
      name: "EBITDA",
      owner: "CFO",
      realized: 0.094,
      target: 0.094,
      unit: "percent",
    }),
  ];

  const weeks = Array.from({ length: 4 }, (_, index) => {
    const target = revenueTarget / 4;
    const realized = target * (0.82 + index * 0.04);
    const manualInputs: CfoWeeklyManualInput = {
      cmvPct: 14,
      ebitdaPct: 9.4,
      eficienciaPct: 4.5,
      fim: shiftDateString(normalizedRange.startDate, index * 7 + 6),
      inicio: shiftDateString(normalizedRange.startDate, index * 7),
      label: `Semana ${index + 1}`,
      lucroLiquido: realized * 0.08,
      missingFields: [],
      notas: null,
      semana: index + 1,
    };

    return {
      clientes: Math.round((ordersTarget / 4) * (0.84 + index * 0.03)),
      fim: manualInputs.fim,
      inicio: manualInputs.inicio,
      investimento: investmentTarget / 4,
      label: `Semana ${index + 1}`,
      manualInputs,
      progress: clamp(realized / target, 0, 1.2),
      receitaPrevista: target,
      receitaRealizada: realized,
      roas: realized / (investmentTarget / 4),
      semana: index + 1,
      status: statusFromRatio(target, realized),
    };
  });

  const manualInputWeeks = weeks.map((week) => week.manualInputs);

  return {
    goals,
    manualInputs: buildManualInputSummary(manualInputWeeks),
    month: normalizedRange.startDate.slice(0, 7),
    monthLabel: monthLabel(normalizedRange.startDate.slice(0, 7)),
    range: normalizedRange,
    risks: buildRisks(goals),
    series: buildRealSeries(weeks),
    source: "mock",
    summary: buildSummary(goals, weeks),
    weeks,
  };
}

export async function getMetasPageData(
  month = getDefaultMetasMonth(),
): Promise<MetasPageData> {
  const normalizedMonth = normalizeMetasMonth(month);

  if (shouldUseMockData()) {
    return createMockMetasPageData({
      endDate: monthEnd(normalizedMonth),
      startDate: monthStart(normalizedMonth),
    });
  }

  try {
    const cfoData = await getCfoPanelData(normalizedMonth);
    return createRealMetasPageData(cfoData);
  } catch (error) {
    if (error instanceof CfoPanelError && error.status === 404) {
      return createEmptyMetasPageData(normalizedMonth);
    }

    throw error;
  }
}
