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
  progress: number;
  receitaPrevista: number;
  receitaRealizada: number;
  roas: number;
  semana: number;
  status: MetaStatus;
};

export type MetasPageData = {
  goals: MetaGoal[];
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

function averageMetrics(weeks: CfoWeek[], getter: (week: CfoWeek) => CfoMetric) {
  const values = weeks
    .map((week) => getter(week).realizado)
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value));

  if (values.length === 0) return 0;
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
  target,
  unit,
}: Omit<MetaGoal, "status" | "updatedAt"> & { inverse?: boolean }): MetaGoal {
  return {
    area,
    description,
    id,
    name,
    owner,
    realized,
    status: statusFromRatio(target, realized, inverse),
    target,
    unit,
    updatedAt: getTodayInAppTimezone(),
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
  return goals
    .filter((goal) => goal.status === "attention" || goal.status === "critical")
    .sort((first, second) => {
      const firstRatio = first.target > 0 ? first.realized / first.target : 1;
      const secondRatio = second.target > 0 ? second.realized / second.target : 1;

      return firstRatio - secondRatio;
    })
    .slice(0, 4)
    .map((goal) => ({
      area: goal.area,
      detail: goal.description,
      gap:
        goal.unit === "percent" || goal.unit === "ratio"
          ? Math.max(goal.target - goal.realized, 0)
          : Math.max(goal.target - goal.realized, 0),
      id: goal.id,
      title: goal.name,
      unit: goal.unit,
    }));
}

function buildRealGoals(cfo: CfoPanelData): MetaGoal[] {
  const meta = cfo.meta;
  const weeks = cfo.semanas;
  const receita = sumMetrics(weeks, (week) => week.indicadores.receita.receita_liquida);
  const investimento = sumMetrics(weeks, (week) => week.indicadores.aquisicao.investimento);
  const clientes = sumMetrics(weeks, (week) => week.indicadores.receita.clientes);
  const roas = investimento > 0 ? receita / investimento : 0;
  const ticket = clientes > 0 ? receita / clientes : 0;

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
    createGoal({
      area: "custos",
      description: "CMV informado pelo CFO para acompanhamento semanal.",
      id: "cmv",
      inverse: true,
      name: "CMV",
      owner: "CFO",
      realized: averageMetrics(weeks, (week) => week.indicadores.custos.cmv) / 100,
      target: numberValue(meta.meta_pct_cmv, 14) / 100,
      unit: "percent",
    }),
    createGoal({
      area: "resultado",
      description: "Lucro liquido informado no acompanhamento semanal.",
      id: "lucro-liquido",
      name: "Lucro liquido",
      owner: "CFO",
      realized: sumMetrics(weeks, (week) => week.indicadores.resultado.lucro_liquido),
      target: numberValue(meta.meta_lucro_liquido),
      unit: "currency",
    }),
    createGoal({
      area: "resultado",
      description: "EBITDA percentual informado no acompanhamento semanal.",
      id: "ebitda",
      name: "EBITDA",
      owner: "CFO",
      realized: averageMetrics(weeks, (week) => week.indicadores.resultado.ebitda_pct) / 100,
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

  return {
    goals,
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

  return {
    goals: [],
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
  ];

  const weeks = Array.from({ length: 4 }, (_, index) => {
    const target = revenueTarget / 4;
    const realized = target * (0.82 + index * 0.04);

    return {
      clientes: Math.round((ordersTarget / 4) * (0.84 + index * 0.03)),
      fim: shiftDateString(normalizedRange.startDate, index * 7 + 6),
      inicio: shiftDateString(normalizedRange.startDate, index * 7),
      investimento: investmentTarget / 4,
      label: `Semana ${index + 1}`,
      progress: clamp(realized / target, 0, 1.2),
      receitaPrevista: target,
      receitaRealizada: realized,
      roas: realized / (investmentTarget / 4),
      semana: index + 1,
      status: statusFromRatio(target, realized),
    };
  });

  return {
    goals,
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
