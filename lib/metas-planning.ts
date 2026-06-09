import { getTodayInAppTimezone } from "@/lib/app-dates";
import { shouldUseMockData } from "@/lib/data-mode";
import { createServiceClient } from "@/lib/supabase";

const CHANNELS = [
  { id: "facebook", label: "Facebook" },
  { id: "tiktok", label: "TikTok" },
  { id: "taboola", label: "Taboola" },
  { id: "mgid", label: "MGID" },
  { id: "google", label: "Google" },
] as const;

const BACKEND_CHANNELS = [
  { id: "callcenter", label: "Call Center" },
  { id: "whatsapp", label: "WhatsApp" },
  { id: "sms", label: "SMS" },
  { id: "email", label: "Email" },
] as const;

type MetaRow = Record<string, unknown>;

type WeekRow = {
  notas: string | null;
  override_investimento: number | null;
  override_receita: number | null;
  override_roas: number | null;
  semana: number;
  semana_fim: string;
  semana_inicio: string;
};

export type MetasPlanningChannel = {
  id: string;
  investment: number;
  label: string;
  revenue: number;
  roas: number;
  share: number;
};

export type MetasPlanningBackendChannel = {
  conversions: number;
  id: string;
  label: string;
  revenue: number;
  ticket: number;
};

export type MetasPlanningComposition = {
  id: string;
  label: string;
  tone: "gold" | "green" | "neutral" | "orange" | "red";
  unit: "currency" | "number" | "percent" | "ratio";
  value: number;
};

export type MetasPlanningWeek = {
  fim: string;
  inicio: string;
  investimentoPrevisto: number;
  label: string;
  notas: string | null;
  receitaPrevista: number;
  roasPrevisto: number;
  semana: number;
};

export type MetasPlanningPageData = {
  backend: MetasPlanningBackendChannel[];
  channels: MetasPlanningChannel[];
  composition: MetasPlanningComposition[];
  month: string;
  monthLabel: string;
  source: "empty" | "mock" | "real";
  summary: {
    backendRevenue: number;
    breakevenRoas: number;
    customers: number;
    frontRevenue: number;
    investment: number;
    requiredRoas: number;
    revenue: number;
    ticket: number;
  };
  weeks: MetasPlanningWeek[];
};

export function getDefaultMetasPlanningMonth() {
  return getTodayInAppTimezone().slice(0, 7);
}

export function normalizeMetasPlanningMonth(value: string | undefined) {
  if (value && /^\d{4}-\d{2}$/.test(value)) return value;
  if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value.slice(0, 7);

  return getDefaultMetasPlanningMonth();
}

function monthDate(month: string) {
  return `${month}-01`;
}

function monthLabel(month: string) {
  return new Date(`${month}-01T12:00:00`).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });
}

function numberValue(value: unknown, fallback = 0) {
  const parsed = Number(value ?? fallback);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function channelValue(meta: MetaRow, prefix: "invest" | "receita", id: string) {
  return numberValue(meta[`${prefix}_${id}`]);
}

function backendValue(meta: MetaRow, id: string, field: "conversoes" | "receita" | "ticket") {
  return numberValue(meta[`backend_${id}_${field}`]);
}

function buildChannels(meta: MetaRow): MetasPlanningChannel[] {
  const totalInvestment = numberValue(meta.invest_total);

  return CHANNELS.map((channel) => {
    const investment = channelValue(meta, "invest", channel.id);
    const revenue = channelValue(meta, "receita", channel.id);

    return {
      id: channel.id,
      investment,
      label: channel.label,
      revenue,
      roas: investment > 0 ? revenue / investment : 0,
      share: totalInvestment > 0 ? investment / totalInvestment : 0,
    };
  });
}

function buildBackend(meta: MetaRow): MetasPlanningBackendChannel[] {
  return BACKEND_CHANNELS.map((channel) => ({
    conversions: backendValue(meta, channel.id, "conversoes"),
    id: channel.id,
    label: channel.label,
    revenue: backendValue(meta, channel.id, "receita"),
    ticket: backendValue(meta, channel.id, "ticket"),
  }));
}

function buildComposition(meta: MetaRow): MetasPlanningComposition[] {
  return [
    {
      id: "pct-front",
      label: "Receita front",
      tone: "gold",
      unit: "percent",
      value: numberValue(meta.meta_pct_front) / 100,
    },
    {
      id: "pct-backend",
      label: "Receita backend",
      tone: "green",
      unit: "percent",
      value: numberValue(meta.meta_pct_backend) / 100,
    },
    {
      id: "pct-recuperada",
      label: "Receita recuperada",
      tone: "green",
      unit: "percent",
      value: numberValue(meta.meta_pct_recuperada) / 100,
    },
    {
      id: "chargeback",
      label: "Limite chargeback",
      tone: "red",
      unit: "percent",
      value: numberValue(meta.meta_pct_chargeback) / 100,
    },
    {
      id: "reembolso",
      label: "Limite reembolso",
      tone: "orange",
      unit: "percent",
      value: numberValue(meta.meta_pct_reembolso) / 100,
    },
    {
      id: "cmv",
      label: "CMV planejado",
      tone: "neutral",
      unit: "percent",
      value: numberValue(meta.meta_pct_cmv) / 100,
    },
    {
      id: "eficiencia",
      label: "Eficiência",
      tone: "neutral",
      unit: "percent",
      value: numberValue(meta.meta_pct_eficiencia) / 100,
    },
    {
      id: "lucro",
      label: "Lucro líquido",
      tone: "gold",
      unit: "currency",
      value: numberValue(meta.meta_lucro_liquido),
    },
    {
      id: "ebitda",
      label: "EBITDA",
      tone: "green",
      unit: "percent",
      value: numberValue(meta.meta_ebitda_pct) / 100,
    },
  ];
}

function buildWeeks(meta: MetaRow, rows: WeekRow[]): MetasPlanningWeek[] {
  const weekCount = Math.max(numberValue(meta.qtd_semanas, rows.length || 4), 1);
  const fallbackRevenue = numberValue(meta.meta_receita_liquida) / weekCount;
  const fallbackInvestment = numberValue(meta.invest_total) / weekCount;
  const fallbackRoas = numberValue(meta.roas_exigido);

  return rows.map((row) => ({
    fim: row.semana_fim,
    inicio: row.semana_inicio,
    investimentoPrevisto: numberValue(row.override_investimento, fallbackInvestment),
    label: `Semana ${row.semana}`,
    notas: row.notas,
    receitaPrevista: numberValue(row.override_receita, fallbackRevenue),
    roasPrevisto: numberValue(row.override_roas, fallbackRoas),
    semana: row.semana,
  }));
}

function createPageData(
  month: string,
  meta: MetaRow,
  weeks: WeekRow[],
  source: MetasPlanningPageData["source"],
): MetasPlanningPageData {
  const backend = buildBackend(meta);

  return {
    backend,
    channels: buildChannels(meta),
    composition: buildComposition(meta),
    month,
    monthLabel: monthLabel(month),
    source,
    summary: {
      backendRevenue: backend.reduce((total, item) => total + item.revenue, 0),
      breakevenRoas: numberValue(meta.roas_breakeven),
      customers: numberValue(meta.meta_clientes),
      frontRevenue: numberValue(meta.receita_trafego_total),
      investment: numberValue(meta.invest_total),
      requiredRoas: numberValue(meta.roas_exigido),
      revenue: numberValue(meta.meta_receita_liquida),
      ticket: numberValue(meta.meta_ticket_medio),
    },
    weeks: buildWeeks(meta, weeks),
  };
}

function createEmptyMetasPlanningPageData(month: string): MetasPlanningPageData {
  return createPageData(month, {}, [], "empty");
}

function createMockMetasPlanningPageData(month: string): MetasPlanningPageData {
  return createPageData(
    month,
    {
      backend_callcenter_conversoes: 140,
      backend_callcenter_receita: 68400,
      backend_callcenter_ticket: 488,
      backend_email_conversoes: 36,
      backend_email_receita: 17100,
      backend_email_ticket: 475,
      backend_sms_conversoes: 42,
      backend_sms_receita: 19800,
      backend_sms_ticket: 471,
      backend_whatsapp_conversoes: 88,
      backend_whatsapp_receita: 42240,
      backend_whatsapp_ticket: 480,
      invest_facebook: 96000,
      invest_google: 8000,
      invest_mgid: 22000,
      invest_taboola: 28000,
      invest_tiktok: 16000,
      invest_total: 170000,
      meta_clientes: 1050,
      meta_ebitda_pct: 9.4,
      meta_lucro_liquido: 62000,
      meta_pct_backend: 16,
      meta_pct_chargeback: 5.5,
      meta_pct_cmv: 14,
      meta_pct_eficiencia: 4.5,
      meta_pct_front: 74,
      meta_pct_recuperada: 10,
      meta_pct_reembolso: 2,
      meta_receita_liquida: 620000,
      meta_ticket_medio: 590,
      qtd_semanas: 4,
      receita_facebook: 352000,
      receita_google: 18000,
      receita_mgid: 68000,
      receita_taboola: 108000,
      receita_tiktok: 52000,
      receita_trafego_total: 598000,
      roas_breakeven: 1.31,
      roas_exigido: 1.4,
    },
    [
      {
        notas: "Abertura com maior peso em Facebook.",
        override_investimento: 44000,
        override_receita: 155000,
        override_roas: 1.4,
        semana: 1,
        semana_fim: `${month}-07`,
        semana_inicio: `${month}-01`,
      },
      {
        notas: null,
        override_investimento: 42000,
        override_receita: 154000,
        override_roas: 1.4,
        semana: 2,
        semana_fim: `${month}-14`,
        semana_inicio: `${month}-08`,
      },
      {
        notas: "Semana de ajuste fino por canal.",
        override_investimento: 42000,
        override_receita: 155000,
        override_roas: 1.4,
        semana: 3,
        semana_fim: `${month}-21`,
        semana_inicio: `${month}-15`,
      },
      {
        notas: null,
        override_investimento: 42000,
        override_receita: 156000,
        override_roas: 1.4,
        semana: 4,
        semana_fim: `${month}-30`,
        semana_inicio: `${month}-22`,
      },
    ],
    "mock",
  );
}

export async function getMetasPlanningPageData(
  month = getDefaultMetasPlanningMonth(),
): Promise<MetasPlanningPageData> {
  const normalizedMonth = normalizeMetasPlanningMonth(month);

  if (shouldUseMockData()) {
    return createMockMetasPlanningPageData(normalizedMonth);
  }

  const analytics = createServiceClient().schema("analytics");
  const monthAsDate = monthDate(normalizedMonth);
  const [metaResult, weeksResult] = await Promise.all([
    analytics.from("metas_mensais").select("*").eq("mes", monthAsDate).maybeSingle(),
    analytics
      .from("cfo_inputs_semanais")
      .select("*")
      .eq("mes", monthAsDate)
      .order("semana", { ascending: true }),
  ]);

  if (metaResult.error) throw metaResult.error;
  if (weeksResult.error) throw weeksResult.error;
  if (!metaResult.data) return createEmptyMetasPlanningPageData(normalizedMonth);

  return createPageData(
    normalizedMonth,
    metaResult.data as MetaRow,
    (weeksResult.data ?? []) as WeekRow[],
    "real",
  );
}
