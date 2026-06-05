import { getTodayInAppTimezone, shiftDateString } from "@/lib/app-dates";

export type MetasRange = {
  startDate: string;
  endDate: string;
};

export type MetaArea =
  | "comercial"
  | "financeiro"
  | "carrinhos"
  | "analytics"
  | "operacao";

export type MetaUnit = "currency" | "number" | "percent";

export type MetaStatus = "ahead" | "on_track" | "attention";

export type MetaGoal = {
  id: string;
  name: string;
  area: MetaArea;
  owner: string;
  unit: MetaUnit;
  target: number;
  realized: number;
  status: MetaStatus;
  description: string;
  updatedAt: string;
};

export type MetasProgressPoint = {
  day: string;
  projection: number;
  realized: number;
  target: number;
};

export type MetasRisk = {
  id: string;
  area: MetaArea;
  title: string;
  detail: string;
  gap: number;
  unit: MetaUnit;
};

export type MetasPageData = {
  range: MetasRange;
  goals: MetaGoal[];
  risks: MetasRisk[];
  series: MetasProgressPoint[];
  summary: {
    aheadCount: number;
    atRiskCount: number;
    overallProgress: number;
    orders: Pick<MetaGoal, "realized" | "target" | "unit">;
    projectedRevenue: number;
    recovery: Pick<MetaGoal, "realized" | "target" | "unit">;
    revenue: Pick<MetaGoal, "realized" | "target" | "unit">;
    ticket: Pick<MetaGoal, "realized" | "target" | "unit">;
    upsell: Pick<MetaGoal, "realized" | "target" | "unit">;
  };
};

const AREA_LABELS: Record<MetaArea, string> = {
  analytics: "Analytics",
  carrinhos: "Carrinhos",
  comercial: "Comercial",
  financeiro: "Financeiro",
  operacao: "Operação",
};

export function getMetaAreaLabel(area: MetaArea) {
  return AREA_LABELS[area];
}

export function getDefaultMetasRange(): MetasRange {
  const today = getTodayInAppTimezone();

  return {
    startDate: `${today.slice(0, 8)}01`,
    endDate: today,
  };
}

function normalizeRange(range: MetasRange): MetasRange {
  return range.startDate <= range.endDate
    ? range
    : { startDate: range.endDate, endDate: range.startDate };
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
    shiftDateString(range.startDate, index)
  );
}

function clamp(value: number, min = 0, max = 1) {
  if (!Number.isFinite(value)) return min;
  return Math.min(Math.max(value, min), max);
}

function getGoalStatus(target: number, realized: number) {
  const ratio = target > 0 ? realized / target : 1;

  if (ratio >= 1) return "ahead";
  if (ratio >= 0.9) return "on_track";
  return "attention";
}

function createGoal(
  goal: Omit<MetaGoal, "status" | "updatedAt">
): MetaGoal {
  return {
    ...goal,
    status: getGoalStatus(goal.target, goal.realized),
    updatedAt: getTodayInAppTimezone(),
  };
}

function buildProgressSeries(
  range: MetasRange,
  targetRevenue: number,
  realizedRevenue: number
): MetasProgressPoint[] {
  const days = buildDateSeries(range);
  const projectedRevenue = targetRevenue * clamp((realizedRevenue / targetRevenue) * 1.04, 0.62, 1.08);

  return days.map((day, index) => {
    const progress = (index + 1) / days.length;
    const movement = 0.97 + Math.sin((index + 1) * 1.35) * 0.025;

    return {
      day,
      projection: projectedRevenue * progress,
      realized: Math.min(realizedRevenue, realizedRevenue * progress * movement),
      target: targetRevenue * progress,
    };
  });
}

function buildRisks(goals: MetaGoal[]): MetasRisk[] {
  return goals
    .filter((goal) => goal.status === "attention")
    .sort((first, second) => {
      const firstRatio = first.target > 0 ? first.realized / first.target : 1;
      const secondRatio = second.target > 0 ? second.realized / second.target : 1;

      return firstRatio - secondRatio;
    })
    .slice(0, 3)
    .map((goal) => ({
      area: goal.area,
      detail: goal.description,
      gap: Math.max(goal.target - goal.realized, 0),
      id: goal.id,
      title: goal.name,
      unit: goal.unit,
    }));
}

export function createMockMetasPageData(
  range = getDefaultMetasRange()
): MetasPageData {
  const normalizedRange = normalizeRange(range);
  const days = getRangeDays(normalizedRange);
  const revenueTarget = 62_000 * days;
  const ordersTarget = 116 * days;
  const upsellTarget = 6_900 * days;

  const goals = [
    createGoal({
      area: "financeiro",
      description: "Receita líquida acumulada do período contra o plano comercial.",
      id: "receita-liquida",
      name: "Receita líquida",
      owner: "Financeiro",
      realized: revenueTarget * 0.88,
      target: revenueTarget,
      unit: "currency",
    }),
    createGoal({
      area: "comercial",
      description: "Pedidos pagos no período, considerando vendas principais aprovadas.",
      id: "pedidos-pagos",
      name: "Pedidos pagos",
      owner: "Comercial",
      realized: Math.round(ordersTarget * 0.93),
      target: ordersTarget,
      unit: "number",
    }),
    createGoal({
      area: "comercial",
      description: "Ticket médio esperado para manter margem e eficiência do período.",
      id: "ticket-medio",
      name: "Ticket médio",
      owner: "Comercial",
      realized: 552,
      target: 565,
      unit: "currency",
    }),
    createGoal({
      area: "carrinhos",
      description: "Recuperação de checkouts que tiveram evento não pago antes do paid.",
      id: "recuperacao-carrinhos",
      name: "Recuperação de carrinhos",
      owner: "Retenção",
      realized: 0.171,
      target: 0.18,
      unit: "percent",
    }),
    createGoal({
      area: "analytics",
      description: "Receita de upsells aprovados no período selecionado.",
      id: "receita-upsell",
      name: "Receita de upsells",
      owner: "Performance",
      realized: upsellTarget * 1.04,
      target: upsellTarget,
      unit: "currency",
    }),
    createGoal({
      area: "operacao",
      description: "Pedidos postados dentro da janela operacional combinada.",
      id: "sla-postagem",
      name: "SLA de postagem",
      owner: "Operação",
      realized: 0.884,
      target: 0.92,
      unit: "percent",
    }),
  ];

  const revenue = goals.find((goal) => goal.id === "receita-liquida")!;
  const orders = goals.find((goal) => goal.id === "pedidos-pagos")!;
  const ticket = goals.find((goal) => goal.id === "ticket-medio")!;
  const recovery = goals.find((goal) => goal.id === "recuperacao-carrinhos")!;
  const upsell = goals.find((goal) => goal.id === "receita-upsell")!;
  const ratios = goals.map((goal) =>
    clamp(goal.target > 0 ? goal.realized / goal.target : 1)
  );
  const overallProgress =
    ratios.reduce((total, ratio) => total + ratio, 0) / Math.max(ratios.length, 1);

  return {
    goals,
    range: normalizedRange,
    risks: buildRisks(goals),
    series: buildProgressSeries(normalizedRange, revenue.target, revenue.realized),
    summary: {
      aheadCount: goals.filter((goal) => goal.status === "ahead").length,
      atRiskCount: goals.filter((goal) => goal.status === "attention").length,
      orders,
      overallProgress,
      projectedRevenue: revenue.target * clamp((revenue.realized / revenue.target) * 1.04, 0.62, 1.08),
      recovery,
      revenue,
      ticket,
      upsell,
    },
  };
}

export async function getMetasPageData(
  range = getDefaultMetasRange()
): Promise<MetasPageData> {
  return createMockMetasPageData(range);
}
