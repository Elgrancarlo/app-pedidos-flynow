import {
  type AnalyticsFunilDailyRow,
  type AnalyticsFunilSourceRow,
  type AnalyticsLogAlteracao,
  type AnalyticsOpsCallTranscript,
  type AnalyticsRedtrackDailyCampaign,
  ANALYTICS_CHANNEL_LABELS,
  createServiceClient,
} from "@/lib/supabase";
import { shouldUseMockData } from "@/lib/data-mode";
import { isOpenRouterConfigured, openRouterChat } from "@/lib/openrouter";
import { inferProductBase } from "@/lib/payt-analytics";
import { getTodayInAppTimezone } from "@/lib/app-dates";

const PAGE_SIZE = 1000;

function isMissingAnalyticsSchemaError(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const code = "code" in error ? String(error.code ?? "") : "";
  const message = "message" in error ? String(error.message ?? "") : "";
  const details = "details" in error ? String(error.details ?? "") : "";
  return (
    code === "PGRST106" ||
    message.includes("analytics") ||
    message.includes("relation") ||
    message.includes("schema must be one of the following") ||
    details.includes("analytics") ||
    details.includes("relation")
  );
}

function shouldIgnoreMissingAnalyticsSchema(error: unknown) {
  return shouldUseMockData() && isMissingAnalyticsSchemaError(error);
}

export function defaultAnalyticsDates(days?: number) {
  const endDate = getTodayInAppTimezone();
  const start = new Date(`${endDate}T12:00:00Z`);

  if (typeof days === "number") {
    const inclusiveDays = Math.max(Math.floor(days), 1);
    start.setUTCDate(start.getUTCDate() - (inclusiveDays - 1));
  } else {
    start.setUTCDate(1);
  }

  return {
    startDate: start.toISOString().slice(0, 10),
    endDate,
  };
}

function numberValue(value: unknown, fallback = 0) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function textValue(value: unknown) {
  if (value == null) return null;
  const text = String(value).trim();
  return text.length > 0 ? text : null;
}

function inferRedtrackProduct(campaign: string | null | undefined) {
  const text = textValue(campaign);
  if (!text) return "SEM PRODUTO";

  const canonicalize = (value: string) => {
    const upper = value.toUpperCase();
    const compact = upper.replace(/[^A-Z0-9]/g, "");
    if (compact.includes("POWER66")) return "POWER 66";
    if (compact.includes("GLICORESET")) return "GLICO RESET";
    if (compact.includes("COCOSLIM")) return "COCO SLIM";
    if (compact.includes("DERMABLOOM")) return "DERMA BLOOM";
    if (compact.includes("VISIONPURE")) return "VISION PURE";
    if (compact.includes("GELATINASLIM")) return "GELATINA SLIM";
    return upper;
  };

  const bracketMatches = Array.from(text.matchAll(/\[([^\]]+)\]/g));
  if (bracketMatches.length >= 2) {
    const product = canonicalize(bracketMatches[1][1].trim());
    const canonical = inferProductBase(product);
    return canonical !== "OUTRO" ? canonical : product;
  }

  if (bracketMatches.length === 1) {
    const single = canonicalize(bracketMatches[0][1].trim());
    const canonical = inferProductBase(single);
    return canonical !== "OUTRO" ? canonical : single;
  }

  const beforeDash = text.split("-")[0]?.trim();
  const normalized = beforeDash ? canonicalize(beforeDash) : "SEM PRODUTO";
  const canonical = inferProductBase(normalized);
  return canonical !== "OUTRO" ? canonical : normalized;
}

function normalizeRedtrackSource(row: AnalyticsRedtrackDailyCampaign) {
  const raw =
    textValue(row.rt_source) ??
    textValue(row.rt_medium) ??
    textValue(row.source) ??
    textValue(row.rt_campaign) ??
    "OUTROS";
  const source = raw.toUpperCase();
  const campaign = (textValue(row.campaign) ?? "").toUpperCase();

  if (source.includes("FACEBOOK") || source === "FB" || source.includes("INSTAGRAM") || source.includes("META")) {
    return "FACEBOOK";
  }
  if (campaign.startsWith("[FB]")) return "FACEBOOK";
  if (source.includes("TABOOLA") || source === "TB") return "TABOOLA";
  if (campaign.includes("TABOOLA")) return "TABOOLA";
  if (source.includes("GOOGLE") || source.includes("GADS") || source.includes("YOUTUBE")) return "GOOGLE";
  if (campaign.startsWith("[TTK]") || source.includes("TIKTOK")) return "TIKTOK";
  if (source.includes("EMAIL") || source.includes("MAUTIC")) return "EMAIL";
  if (source.includes("SMS")) return "SMS";
  if (campaign.includes("MGID") || source.includes("MGID")) return "MGID";
  if (campaign.startsWith("[RP]")) return "RP";
  if (source.includes("OUTBRAIN")) return "OUTBRAIN";
  if (source.includes("NATIVE")) return "NATIVE";
  return source;
}

export type RedtrackAnalyticsMetricRow = {
  attributedRevenue: number;
  campaign?: string;
  clicks: number;
  conversions: number;
  cpa: number;
  cpc: number;
  cvr: number;
  lpClickRate: number;
  lpClicks: number;
  lpViews: number;
  roas: number;
  source?: string;
  spend: number;
  uniqueClicks: number;
};

export type RedtrackAnalyticsSeriesPoint = RedtrackAnalyticsMetricRow & {
  day: string;
};

export type RedtrackAnalyticsData = {
  configured: boolean;
  summary: RedtrackAnalyticsMetricRow;
  series: RedtrackAnalyticsSeriesPoint[];
  sources: Array<RedtrackAnalyticsMetricRow & { source: string }>;
  campaigns: Array<RedtrackAnalyticsMetricRow & { campaign: string; source: string }>;
};

function withRedtrackDerivedMetrics<T extends RedtrackAnalyticsMetricRow>(row: T): T {
  return {
    ...row,
    cpa: row.conversions > 0 ? row.spend / row.conversions : 0,
    cpc: row.clicks > 0 ? row.spend / row.clicks : 0,
    cvr: row.clicks > 0 ? row.conversions / row.clicks : 0,
    lpClickRate: row.lpViews > 0 ? row.lpClicks / row.lpViews : 0,
    roas: row.spend > 0 ? row.attributedRevenue / row.spend : 0,
  };
}

function createRedtrackMetricBase(): RedtrackAnalyticsMetricRow {
  return {
    attributedRevenue: 0,
    clicks: 0,
    conversions: 0,
    cpa: 0,
    cpc: 0,
    cvr: 0,
    lpClickRate: 0,
    lpClicks: 0,
    lpViews: 0,
    roas: 0,
    spend: 0,
    uniqueClicks: 0,
  };
}

function fmtDateKey(date: string) {
  return date.slice(0, 10);
}

function addDays(date: string, days: number) {
  const next = new Date(`${date}T00:00:00Z`);
  next.setUTCDate(next.getUTCDate() + days);
  return next.toISOString().slice(0, 10);
}

function estimateUpsellWins(row: AnalyticsFunilDailyRow, key: "take_rate_us1" | "take_rate_us2") {
  const directSales = numberValue(row.qtd_vendas_diretas);
  const takeRate = numberValue(row[key]);
  if (directSales <= 0 || takeRate <= 0) return 0;
  return Math.round(directSales * takeRate);
}

function buildWindowSummary(rows: AnalyticsFunilDailyRow[], startDate: string, endDate: string, product?: string | null) {
  const filtered = rows.filter((row) => {
    if (row.day < startDate || row.day > endDate) return false;
    if (product && row.product_base !== product) return false;
    return true;
  });

  const revenue = filtered.reduce((sum, row) => sum + numberValue(row.receita_total), 0);
  const directSales = filtered.reduce((sum, row) => sum + numberValue(row.qtd_vendas_diretas), 0);
  const upsellRevenue = filtered.reduce((sum, row) => sum + numberValue(row.receita_upsells), 0);
  const us1Wins = filtered.reduce((sum, row) => sum + estimateUpsellWins(row, "take_rate_us1"), 0);
  const avgAov = directSales > 0 ? revenue / directSales : 0;
  const avgTakeRateUs1 = directSales > 0 ? us1Wins / directSales : 0;

  return {
    days: filtered.length,
    revenue,
    directSales,
    upsellRevenue,
    avgAov,
    avgTakeRateUs1,
    revenuePerDay: filtered.length > 0 ? revenue / filtered.length : 0,
  };
}

function buildImpactInsight(
  before: ReturnType<typeof buildWindowSummary>,
  after: ReturnType<typeof buildWindowSummary>,
) {
  if (after.days < 2) {
    return {
      severity: "pendente",
      insight: "Janela pós-alteração ainda curta. Aguarde pelo menos 2 dias para leitura confiável.",
    };
  }

  const revenueDelta = after.revenuePerDay - before.revenuePerDay;
  const revenueRatio = before.revenuePerDay > 0 ? after.revenuePerDay / before.revenuePerDay : 0;
  const takeRateDelta = after.avgTakeRateUs1 - before.avgTakeRateUs1;

  if (before.days === 0) {
    return {
      severity: "informativo",
      insight: "Sem base anterior suficiente para comparar esta alteração.",
    };
  }

  if (revenueRatio >= 1.1 || takeRateDelta >= 0.03) {
    return {
      severity: "positivo",
      insight: "Sinal positivo após a alteração, com ganho de receita por dia e/ou take rate de US1.",
    };
  }

  if (revenueRatio <= 0.9 || takeRateDelta <= -0.03 || revenueDelta < 0) {
    return {
      severity: "alerta",
      insight: "Sinal de queda após a alteração. Vale revisar o componente e comparar com o período anterior.",
    };
  }

  return {
    severity: "neutro",
    insight: "Impacto estável até agora, sem mudança material no funil.",
  };
}

function transcriptsForLog(log: AnalyticsLogAlteracao, transcripts: AnalyticsOpsCallTranscript[]) {
  return transcripts
    .filter((item) => {
      if (!item.happened_at) return false;
      const happenedDay = item.happened_at.slice(0, 10);
      const withinWindow = happenedDay >= addDays(log.day, -3) && happenedDay <= addDays(log.day, 7);
      if (!withinWindow) return false;

      if (!log.produto_afetado) return true;
      return item.related_products.some((product) => product === log.produto_afetado);
    })
    .slice(0, 3)
    .map((item) => ({
      happened_at: item.happened_at,
      title: item.title,
      area: item.area,
      summary: item.summary,
      tags: item.tags,
      products: item.related_products,
    }));
}

async function buildAiImpactBatch({
  logs,
  transcripts,
  baselineImpacts,
}: {
  logs: AnalyticsLogAlteracao[];
  transcripts: AnalyticsOpsCallTranscript[];
  baselineImpacts: Array<{
    logId: number;
    before: ReturnType<typeof buildWindowSummary>;
    after: ReturnType<typeof buildWindowSummary>;
    severity: string;
    insight: string;
  }>;
}) {
  if (!isOpenRouterConfigured() || baselineImpacts.length === 0) {
    return new Map<number, { severity: string; insight: string; context: string; source: string }>();
  }

  const payload = baselineImpacts.slice(0, 8).map((impact) => {
    const log = logs.find((item) => item.id === impact.logId);
    if (!log) return null;

    return {
      log_id: log.id,
      day: log.day,
      componente: log.componente,
      produto: log.produto_afetado,
      descricao: log.descricao,
      responsavel: log.responsavel,
      tipo_alteracao: log.tipo_alteracao,
      hipotese: log.hipotese,
      baseline: {
        severity: impact.severity,
        insight: impact.insight,
      },
      metricas_antes: {
        receita_por_dia: Number(impact.before.revenuePerDay.toFixed(2)),
        take_rate_us1: Number(impact.before.avgTakeRateUs1.toFixed(4)),
        aov: Number(impact.before.avgAov.toFixed(2)),
        upsell_revenue: Number(impact.before.upsellRevenue.toFixed(2)),
      },
      metricas_depois: {
        receita_por_dia: Number(impact.after.revenuePerDay.toFixed(2)),
        take_rate_us1: Number(impact.after.avgTakeRateUs1.toFixed(4)),
        aov: Number(impact.after.avgAov.toFixed(2)),
        upsell_revenue: Number(impact.after.upsellRevenue.toFixed(2)),
      },
      transcripts: transcriptsForLog(log, transcripts),
    };
  }).filter(Boolean);

  if (payload.length === 0) {
    return new Map<number, { severity: string; insight: string; context: string; source: string }>();
  }

  try {
    const result = await openRouterChat<{
      impacts: Array<{
        log_id: number;
        severity: string;
        insight: string;
        context: string;
      }>;
    }>({
      messages: [
        {
          role: "system",
          content:
            "Voce analisa alteracoes de funil da FlyNow. Para cada alteracao, compare antes e depois, use o baseline fornecido, considere as transcricoes relacionadas e devolva uma leitura curta, objetiva e acionavel. Nao invente causas sem evidencia; quando estiver fraco, diga que a evidencia ainda e parcial.",
        },
        {
          role: "user",
          content: JSON.stringify({
            instruction:
              "Para cada item, devolva severidade, insight e contexto operacional. Contexto deve citar se alguma transcricao relevante reforca a leitura.",
            items: payload,
          }),
        },
      ],
      responseFormat: {
        type: "json_schema",
        json_schema: {
          name: "flynow_log_impact_batch",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              impacts: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    log_id: { type: "number" },
                    severity: { type: "string" },
                    insight: { type: "string" },
                    context: { type: "string" },
                  },
                  required: ["log_id", "severity", "insight", "context"],
                },
              },
            },
            required: ["impacts"],
          },
        },
      },
    });

    return new Map(
      (result.impacts ?? []).map((item) => [
        item.log_id,
        {
          severity: item.severity,
          insight: item.insight,
          context: item.context,
          source: "ia",
        },
      ]),
    );
  } catch (error) {
    console.error("[analytics] Falha ao gerar impacto com IA:", error);
    return new Map<number, { severity: string; insight: string; context: string; source: string }>();
  }
}

async function fetchAnalyticsRows<T>(
  table: string,
  select: string,
  applyFilters: (query: any) => any,
) {
  const analytics = createServiceClient().schema("analytics");
  const rows: T[] = [];

  for (let from = 0; ; from += PAGE_SIZE) {
    let query = analytics.from(table).select(select).range(from, from + PAGE_SIZE - 1);
    query = applyFilters(query);
    const { data, error } = await query;
    if (error) throw error;
    if (!data || data.length === 0) break;
    rows.push(...(data as T[]));
    if (data.length < PAGE_SIZE) break;
  }

  return rows;
}

async function fetchAnalyticsRowsLimited<T>(
  table: string,
  select: string,
  limit: number,
  applyFilters: (query: any) => any,
) {
  const analytics = createServiceClient().schema("analytics");
  let query = analytics.from(table).select(select).range(0, Math.max(0, limit - 1));
  query = applyFilters(query);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as T[];
}

async function persistFunilLogImpacts(
  logs: AnalyticsLogAlteracao[],
  logImpacts: Array<{
    logId: number;
    before: ReturnType<typeof buildWindowSummary>;
    after: ReturnType<typeof buildWindowSummary>;
    severity: string;
    insight: string;
    context: string;
    source: string;
  }>,
) {
  if (logImpacts.length === 0) return;

  const analytics = createServiceClient().schema("analytics");

  await Promise.all(
    logImpacts.map(async (impact) => {
      const log = logs.find((item) => item.id === impact.logId);
      if (!log) return;

      const metricasAntes = {
        revenue_per_day: Number(impact.before.revenuePerDay.toFixed(2)),
        direct_sales: impact.before.directSales,
        upsell_revenue: Number(impact.before.upsellRevenue.toFixed(2)),
        aov: Number(impact.before.avgAov.toFixed(2)),
        take_rate_us1: Number(impact.before.avgTakeRateUs1.toFixed(4)),
      };
      const metricasDepois = {
        revenue_per_day: Number(impact.after.revenuePerDay.toFixed(2)),
        direct_sales: impact.after.directSales,
        upsell_revenue: Number(impact.after.upsellRevenue.toFixed(2)),
        aov: Number(impact.after.avgAov.toFixed(2)),
        take_rate_us1: Number(impact.after.avgTakeRateUs1.toFixed(4)),
      };
      const nextInsight = impact.context ? `${impact.insight}\n\nContexto: ${impact.context}` : impact.insight;

      const currentBefore = JSON.stringify(log.metricas_antes ?? {});
      const currentAfter = JSON.stringify(log.metricas_depois ?? {});
      const nextBefore = JSON.stringify(metricasAntes);
      const nextAfter = JSON.stringify(metricasDepois);
      const nextStatus = impact.source === "ia" ? "analisado" : "pendente";

      const unchanged =
        currentBefore === nextBefore &&
        currentAfter === nextAfter &&
        (log.insight_ia ?? "") === nextInsight &&
        (log.severidade_alerta ?? "") === impact.severity &&
        (log.status_analise ?? "") === nextStatus;

      if (unchanged) return;

      const { error } = await analytics
        .from("funil_log_alteracoes")
        .update({
          metricas_antes: metricasAntes,
          metricas_depois: metricasDepois,
          insight_ia: nextInsight,
          severidade_alerta: impact.severity,
          status_analise: nextStatus,
        })
        .eq("id", impact.logId);

      if (error) {
        console.error("[analytics] Falha ao persistir impacto do log:", impact.logId, error.message);
      }
    }),
  );
}

export async function getAnalyticsOverview(startDate: string, endDate: string) {
  let funilRows: AnalyticsFunilDailyRow[] = [];
  let redtrackRows: AnalyticsRedtrackDailyCampaign[] = [];

  try {
    [funilRows, redtrackRows] = await Promise.all([
      fetchAnalyticsRows<AnalyticsFunilDailyRow>(
        "fact_funil_diario",
        "*",
        (query) =>
          query
            .gte("day", startDate)
            .lte("day", endDate)
            .order("day", { ascending: true }),
      ),
      fetchAnalyticsRows<AnalyticsRedtrackDailyCampaign>(
        "redtrack_daily_campaign",
        "*",
        (query) =>
          query
            .gte("day", startDate)
            .lte("day", endDate)
            .order("day", { ascending: true }),
      ),
    ]);
  } catch (error) {
    if (!shouldIgnoreMissingAnalyticsSchema(error)) throw error;
  }

  const revenueTotal = funilRows.reduce((sum, row) => sum + numberValue(row.receita_total), 0);
  const directRevenueTotal = funilRows.reduce((sum, row) => sum + numberValue(row.receita_vendas_diretas), 0);
  const upsellRevenue = funilRows.reduce((sum, row) => sum + numberValue(row.receita_upsells), 0);
  const upsellApproved = funilRows.reduce((sum, row) => sum + numberValue(row.qtd_upsells_aprovados), 0);
  const directSales = funilRows.reduce((sum, row) => sum + numberValue(row.qtd_vendas_diretas), 0);
  const spendTotal = redtrackRows.reduce((sum, row) => sum + numberValue(row.cost), 0);
  const clicksTotal = redtrackRows.reduce((sum, row) => sum + numberValue(row.clicks), 0);
  const conversionsTotal = redtrackRows.reduce((sum, row) => sum + numberValue(row.conversions), 0);
  const attributedRevenueTotal = redtrackRows.reduce((sum, row) => sum + numberValue(row.total_revenue), 0);
  const roas = spendTotal > 0 ? attributedRevenueTotal / spendTotal : 0;
  const aov = directSales > 0 ? directRevenueTotal / directSales : 0;

  const seriesMap = new Map<string, { day: string; revenue: number; spend: number; directSales: number }>();
  for (const row of funilRows) {
    const key = fmtDateKey(row.day);
    const current = seriesMap.get(key) ?? { day: key, revenue: 0, spend: 0, directSales: 0 };
    current.revenue += numberValue(row.receita_total);
    current.directSales += numberValue(row.qtd_vendas_diretas);
    seriesMap.set(key, current);
  }
  for (const row of redtrackRows) {
    const key = fmtDateKey(row.day);
    const current = seriesMap.get(key) ?? { day: key, revenue: 0, spend: 0, directSales: 0 };
    current.spend += numberValue(row.cost);
    seriesMap.set(key, current);
  }

  const productRows = Array.from(
    funilRows.reduce((map, row) => {
      const current = map.get(row.product_base) ?? { product: row.product_base, revenue: 0, directSales: 0 };
      current.revenue += numberValue(row.receita_total);
      current.directSales += numberValue(row.qtd_vendas_diretas);
      map.set(row.product_base, current);
      return map;
    }, new Map<string, { product: string; revenue: number; directSales: number }>()),
  )
    .map(([, value]) => value)
    .sort((left, right) => right.revenue - left.revenue)
    .slice(0, 6);

  const channelRows = Array.from(
    funilRows.reduce((map, row) => {
      const channel = row.canal;
      const current = map.get(channel) ?? { channel, label: ANALYTICS_CHANNEL_LABELS[channel], revenue: 0, directSales: 0 };
      current.revenue += numberValue(row.receita_total);
      current.directSales += numberValue(row.qtd_vendas_diretas);
      map.set(channel, current);
      return map;
    }, new Map<string, { channel: string; label: string; revenue: number; directSales: number }>()),
  )
    .map(([, value]) => value)
    .sort((left, right) => right.revenue - left.revenue);

  return {
    configured: funilRows.length > 0 || redtrackRows.length > 0,
    summary: {
      revenueTotal,
      directRevenueTotal,
      upsellRevenue,
      upsellApproved,
      spendTotal,
      directSales,
      clicksTotal,
      conversionsTotal,
      roas,
      aov,
      attributedRevenueTotal,
    },
    series: Array.from(seriesMap.values()).sort((left, right) => left.day.localeCompare(right.day)),
    products: productRows,
    channels: channelRows,
  };
}

export async function getRedtrackAnalytics(startDate: string, endDate: string): Promise<RedtrackAnalyticsData> {
  let redtrackRows: AnalyticsRedtrackDailyCampaign[] = [];

  try {
    redtrackRows = await fetchAnalyticsRows<AnalyticsRedtrackDailyCampaign>(
      "redtrack_daily_campaign",
      "*",
      (query) =>
        query
          .gte("day", startDate)
          .lte("day", endDate)
          .order("day", { ascending: true }),
    );
  } catch (error) {
    if (!shouldIgnoreMissingAnalyticsSchema(error)) throw error;
  }

  const summary = createRedtrackMetricBase();
  const seriesMap = new Map<string, RedtrackAnalyticsSeriesPoint>();
  const sourceMap = new Map<string, RedtrackAnalyticsMetricRow & { source: string }>();
  const campaignMap = new Map<string, RedtrackAnalyticsMetricRow & { campaign: string; source: string }>();

  for (const row of redtrackRows) {
    const day = fmtDateKey(row.day);
    const source = normalizeRedtrackSource(row);
    const campaign = textValue(row.campaign) ?? "Sem nome";
    const spend = numberValue(row.cost);
    const attributedRevenue = numberValue(row.total_revenue, numberValue(row.revenue));
    const clicks = Math.round(numberValue(row.clicks));
    const uniqueClicks = Math.round(numberValue(row.unique_clicks));
    const conversions = Math.round(numberValue(row.conversions));
    const lpViews = Math.round(numberValue(row.lp_views));
    const lpClicks = Math.round(numberValue(row.lp_clicks));

    summary.spend += spend;
    summary.attributedRevenue += attributedRevenue;
    summary.clicks += clicks;
    summary.uniqueClicks += uniqueClicks;
    summary.conversions += conversions;
    summary.lpViews += lpViews;
    summary.lpClicks += lpClicks;

    const series = seriesMap.get(day) ?? {
      ...createRedtrackMetricBase(),
      day,
    };
    series.spend += spend;
    series.attributedRevenue += attributedRevenue;
    series.clicks += clicks;
    series.uniqueClicks += uniqueClicks;
    series.conversions += conversions;
    series.lpViews += lpViews;
    series.lpClicks += lpClicks;
    seriesMap.set(day, series);

    const sourceRow = sourceMap.get(source) ?? {
      ...createRedtrackMetricBase(),
      source,
    };
    sourceRow.spend += spend;
    sourceRow.attributedRevenue += attributedRevenue;
    sourceRow.clicks += clicks;
    sourceRow.uniqueClicks += uniqueClicks;
    sourceRow.conversions += conversions;
    sourceRow.lpViews += lpViews;
    sourceRow.lpClicks += lpClicks;
    sourceMap.set(source, sourceRow);

    const campaignKey = `${campaign}|${source}`;
    const campaignRow = campaignMap.get(campaignKey) ?? {
      ...createRedtrackMetricBase(),
      campaign,
      source,
    };
    campaignRow.spend += spend;
    campaignRow.attributedRevenue += attributedRevenue;
    campaignRow.clicks += clicks;
    campaignRow.uniqueClicks += uniqueClicks;
    campaignRow.conversions += conversions;
    campaignRow.lpViews += lpViews;
    campaignRow.lpClicks += lpClicks;
    campaignMap.set(campaignKey, campaignRow);
  }

  return {
    configured: redtrackRows.length > 0,
    summary: withRedtrackDerivedMetrics(summary),
    series: Array.from(seriesMap.values())
      .map((row) => withRedtrackDerivedMetrics(row))
      .sort((left, right) => left.day.localeCompare(right.day)),
    sources: Array.from(sourceMap.values())
      .map((row) => withRedtrackDerivedMetrics(row))
      .sort((left, right) => right.spend - left.spend),
    campaigns: Array.from(campaignMap.values())
      .map((row) => withRedtrackDerivedMetrics(row))
      .sort((left, right) => right.spend - left.spend),
  };
}

export async function getFunilAnalytics(
  startDate: string,
  endDate: string,
  product?: string | null,
  channel?: string | null,
  options?: {
    skipImpactAnalysis?: boolean;
  },
) {
  let dailyRows: AnalyticsFunilDailyRow[] = [];
  let sourceRows: AnalyticsFunilSourceRow[] = [];
  let logs: AnalyticsLogAlteracao[] = [];
  let transcripts: AnalyticsOpsCallTranscript[] = [];

  try {
    [dailyRows, sourceRows, logs, transcripts] = await Promise.all([
      fetchAnalyticsRows<AnalyticsFunilDailyRow>(
        "fact_funil_diario",
        "*",
        (query) => {
          let next = query.gte("day", startDate).lte("day", endDate).order("day", { ascending: true });
          if (product) next = next.eq("product_base", product);
          if (channel) next = next.eq("canal", channel);
          return next;
        },
      ),
      options?.skipImpactAnalysis
        ? fetchAnalyticsRowsLimited<AnalyticsFunilSourceRow>(
            "fact_funil_por_fonte",
            "*",
            2000,
            (query) => {
              let next = query.gte("day", startDate).lte("day", endDate).order("receita_total", { ascending: false });
              if (channel) next = next.eq("canal", channel);
              return next;
            },
          )
        : fetchAnalyticsRows<AnalyticsFunilSourceRow>(
            "fact_funil_por_fonte",
            "*",
            (query) => {
              let next = query.gte("day", startDate).lte("day", endDate).order("day", { ascending: false });
              if (channel) next = next.eq("canal", channel);
              return next;
            },
          ),
      options?.skipImpactAnalysis
        ? fetchAnalyticsRowsLimited<AnalyticsLogAlteracao>(
            "funil_log_alteracoes",
            "*",
            100,
            (query) => query.gte("day", startDate).lte("day", endDate).order("day", { ascending: false }),
          )
        : fetchAnalyticsRows<AnalyticsLogAlteracao>(
            "funil_log_alteracoes",
            "*",
            (query) => query.gte("day", startDate).lte("day", endDate).order("day", { ascending: false }),
          ),
      options?.skipImpactAnalysis
        ? fetchAnalyticsRowsLimited<AnalyticsOpsCallTranscript>(
            "ops_call_transcripts",
            "*",
            50,
            (query) => query.gte("happened_at", `${startDate}T00:00:00Z`).lte("happened_at", `${endDate}T23:59:59Z`).order("happened_at", { ascending: false }),
          )
        : fetchAnalyticsRows<AnalyticsOpsCallTranscript>(
            "ops_call_transcripts",
            "*",
            (query) => query.gte("happened_at", `${startDate}T00:00:00Z`).lte("happened_at", `${endDate}T23:59:59Z`).order("happened_at", { ascending: false }),
          ),
    ]);
  } catch (error) {
    if (!shouldIgnoreMissingAnalyticsSchema(error)) throw error;
  }

  const summary = {
    directSales: dailyRows.reduce((sum, row) => sum + numberValue(row.qtd_vendas_diretas), 0),
    revenueTotal: dailyRows.reduce((sum, row) => sum + numberValue(row.receita_total), 0),
    upsellRevenue: dailyRows.reduce((sum, row) => sum + numberValue(row.receita_upsells), 0),
    averageAov: 0,
    averageTakeRateUs1: 0,
    averageTakeRateUs2: 0,
  };

  const totalUs1Wins = dailyRows.reduce((sum, row) => sum + estimateUpsellWins(row, "take_rate_us1"), 0);
  const totalUs2Wins = dailyRows.reduce((sum, row) => sum + estimateUpsellWins(row, "take_rate_us2"), 0);
  summary.averageAov = summary.directSales > 0 ? summary.revenueTotal / summary.directSales : 0;
  summary.averageTakeRateUs1 = summary.directSales > 0 ? totalUs1Wins / summary.directSales : 0;
  summary.averageTakeRateUs2 = summary.directSales > 0 ? totalUs2Wins / summary.directSales : 0;

  const baselineLogImpacts = logs.map((log) => {
    const impactBefore = buildWindowSummary(dailyRows, addDays(log.day, -7), addDays(log.day, -1), log.produto_afetado);
    const impactAfter = buildWindowSummary(dailyRows, log.day, addDays(log.day, 6), log.produto_afetado);
    const diagnosis = buildImpactInsight(impactBefore, impactAfter);

    return {
      logId: log.id,
      before: impactBefore,
      after: impactAfter,
      severity: diagnosis.severity,
      insight: diagnosis.insight,
      context: "Sem contexto operacional adicional relacionado a esta alteração.",
      source: "regras",
    };
  });

  let logImpacts = baselineLogImpacts;

  if (!options?.skipImpactAnalysis) {
    const aiImpactByLog = await buildAiImpactBatch({
      logs,
      transcripts,
      baselineImpacts: baselineLogImpacts,
    });

    logImpacts = baselineLogImpacts.map((impact) => {
      const ai = aiImpactByLog.get(impact.logId);
      if (!ai) return impact;
      return {
        ...impact,
        severity: ai.severity,
        insight: ai.insight,
        context: ai.context,
        source: ai.source,
      };
    });

    await persistFunilLogImpacts(logs, logImpacts);
  }

  return {
    configured: dailyRows.length > 0 || sourceRows.length > 0 || logs.length > 0,
    summary,
    dailyRows,
    sourceRows,
    logs,
    transcripts,
    logImpacts,
  };
}

export function buildFunilAlerts(dailyRows: AnalyticsFunilDailyRow[]) {
  if (dailyRows.length === 0) return [];

  const byDay = Array.from(
    dailyRows.reduce((map, row) => {
      const current = map.get(row.day) ?? {
        day: row.day,
        revenue: 0,
        directSales: 0,
        us1Wins: 0,
      };
      current.revenue += numberValue(row.receita_total);
      current.directSales += numberValue(row.qtd_vendas_diretas);
      current.us1Wins += estimateUpsellWins(row, "take_rate_us1");
      map.set(row.day, current);
      return map;
    }, new Map<string, { day: string; revenue: number; directSales: number; us1Wins: number }>()),
  )
    .map(([, value]) => ({
      ...value,
      takeRateUs1Avg: value.directSales > 0 ? value.us1Wins / value.directSales : 0,
    }))
    .sort((left, right) => left.day.localeCompare(right.day));

  if (byDay.length < 2) return [];

  const latest = byDay[byDay.length - 1];
  const previous = byDay.slice(Math.max(0, byDay.length - 4), byDay.length - 1);
  const previousRevenueAvg =
    previous.length > 0 ? previous.reduce((sum, row) => sum + row.revenue, 0) / previous.length : latest.revenue;
  const previousTakeRateAvg =
    previous.length > 0 ? previous.reduce((sum, row) => sum + row.takeRateUs1Avg, 0) / previous.length : latest.takeRateUs1Avg;

  const alerts: Array<{ level: string; title: string; detail: string }> = [];

  if (previousRevenueAvg > 0 && latest.revenue <= previousRevenueAvg * 0.8) {
    alerts.push({
      level: "alerta",
      title: "Queda de receita no funil",
      detail: `${latest.day}: receita ficou ${(100 - (latest.revenue / previousRevenueAvg) * 100).toFixed(1)}% abaixo da média dos 3 dias anteriores.`,
    });
  }

  if (previousTakeRateAvg > 0 && latest.takeRateUs1Avg <= previousTakeRateAvg - 0.03) {
    alerts.push({
      level: "alerta",
      title: "Queda de take rate US1",
      detail: `${latest.day}: take rate US1 caiu de ${(previousTakeRateAvg * 100).toFixed(1)}% para ${(latest.takeRateUs1Avg * 100).toFixed(1)}%.`,
    });
  }

  if (alerts.length === 0) {
    alerts.push({
      level: "ok",
      title: "Funil sem alertas críticos",
      detail: "Receita e take rate US1 estão estáveis na janela recente.",
    });
  }

  return alerts;
}

export async function buildFunilAiAlerts({
  dailyRows,
  logs,
  transcripts,
}: {
  dailyRows: AnalyticsFunilDailyRow[];
  logs: AnalyticsLogAlteracao[];
  transcripts: AnalyticsOpsCallTranscript[];
}) {
  const fallbackAlerts = buildFunilAlerts(dailyRows).map((alert) => ({
    ...alert,
    source: "regras",
  }));

  if (!isOpenRouterConfigured() || dailyRows.length === 0) {
    return fallbackAlerts;
  }

  const byDay = Array.from(
    dailyRows.reduce((map, row) => {
      const current = map.get(row.day) ?? {
        day: row.day,
        revenue: 0,
        upsellRevenue: 0,
        directSales: 0,
        us1Wins: 0,
      };
      current.revenue += numberValue(row.receita_total);
      current.upsellRevenue += numberValue(row.receita_upsells);
      current.directSales += numberValue(row.qtd_vendas_diretas);
      current.us1Wins += estimateUpsellWins(row, "take_rate_us1");
      map.set(row.day, current);
      return map;
    }, new Map<string, { day: string; revenue: number; upsellRevenue: number; directSales: number; us1Wins: number }>()),
  )
    .map(([, value]) => ({
      day: value.day,
      revenue: Number(value.revenue.toFixed(2)),
      takeRateUs1: Number((value.directSales > 0 ? value.us1Wins / value.directSales : 0).toFixed(4)),
      upsellRevenue: Number(value.upsellRevenue.toFixed(2)),
      directSales: value.directSales,
    }))
    .sort((left, right) => left.day.localeCompare(right.day))
    .slice(-10);

  const recentLogs = logs.slice(0, 6).map((log) => ({
    day: log.day,
    componente: log.componente,
    produto: log.produto_afetado,
    descricao: log.descricao,
    responsavel: log.responsavel,
  }));

  const recentTranscripts = transcripts.slice(0, 4).map((item) => ({
    happened_at: item.happened_at,
    title: item.title,
    area: item.area,
    participants: item.participants,
    products: item.related_products,
    summary: item.summary,
    tags: item.tags,
  }));

  try {
    const aiResult = await openRouterChat<{
      alerts: Array<{
        level: string;
        title: string;
        detail: string;
      }>;
    }>({
      messages: [
        {
          role: "system",
          content:
            "Voce e um analista senior de operacoes e conversao da FlyNow. Gere alertas curtos, objetivos e acionaveis. Baseie-se apenas nos dados fornecidos. Se nao houver risco claro, devolva um alerta neutro.",
        },
        {
          role: "user",
          content: JSON.stringify({
            instruction:
              "Analise o funil recente, os logs de alteracao e as transcricoes. Devolva no maximo 3 alertas priorizados. Cite data, metrica e possivel causa quando houver evidencia.",
            daily_rows: byDay,
            recent_logs: recentLogs,
            recent_transcripts: recentTranscripts,
            fallback_alerts: fallbackAlerts,
          }),
        },
      ],
      responseFormat: {
        type: "json_schema",
        json_schema: {
          name: "flynow_funil_alerts",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              alerts: {
                type: "array",
                maxItems: 3,
                items: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    level: { type: "string" },
                    title: { type: "string" },
                    detail: { type: "string" },
                  },
                  required: ["level", "title", "detail"],
                },
              },
            },
            required: ["alerts"],
          },
        },
      },
    });

    if (!aiResult.alerts || aiResult.alerts.length === 0) {
      return fallbackAlerts;
    }

    return aiResult.alerts.map((alert) => ({
      level: alert.level,
      title: alert.title,
      detail: alert.detail,
      source: "ia",
    }));
  } catch (error) {
    console.error("[analytics] Falha ao gerar alertas com IA:", error);
    return fallbackAlerts;
  }
}

export async function getChannelAnalytics(startDate: string, endDate: string, channel?: string | null) {
  let sourceRows: AnalyticsFunilSourceRow[] = [];
  let redtrackRows: AnalyticsRedtrackDailyCampaign[] = [];

  try {
    [sourceRows, redtrackRows] = await Promise.all([
      fetchAnalyticsRows<AnalyticsFunilSourceRow>(
        "fact_funil_por_fonte",
        "*",
        (query) => {
          let next = query.gte("day", startDate).lte("day", endDate).order("receita_total", { ascending: false });
          if (channel) next = next.eq("canal", channel);
          return next;
        },
      ),
      fetchAnalyticsRows<AnalyticsRedtrackDailyCampaign>(
        "redtrack_daily_campaign",
        "*",
        (query) => query.gte("day", startDate).lte("day", endDate).order("day", { ascending: true }),
      ),
    ]);
  } catch (error) {
    if (!shouldIgnoreMissingAnalyticsSchema(error)) throw error;
  }

  const mediaBySource = Array.from(
    redtrackRows.reduce((map, row) => {
      const bucket = normalizeRedtrackSource(row);
      const current = map.get(bucket) ?? { source: bucket, spend: 0, clicks: 0, conversions: 0, revenue: 0 };
      current.spend += numberValue(row.cost);
      current.clicks += numberValue(row.clicks);
      current.conversions += numberValue(row.conversions);
      current.revenue += numberValue(row.total_revenue);
      map.set(bucket, current);
      return map;
    }, new Map<string, { source: string; spend: number; clicks: number; conversions: number; revenue: number }>()),
  )
    .map(([, value]) => value)
    .sort((left, right) => right.spend - left.spend);

  const topProducts = Array.from(
    redtrackRows.reduce((map, row) => {
      const campaign = textValue(row.campaign) ?? "Sem nome";
      const source = normalizeRedtrackSource(row);
      const product = inferRedtrackProduct(campaign);
      const key = product;
      const current = map.get(key) ?? {
        product,
        topCampaign: campaign,
        topSource: source,
        campaignCount: 0,
        topCampaignSpend: 0,
        spend: 0,
        clicks: 0,
        conversions: 0,
        revenue: 0,
      };

      const rowCost = numberValue(row.cost);
      current.spend += numberValue(row.cost);
      current.clicks += numberValue(row.clicks);
      current.conversions += numberValue(row.conversions);
      current.revenue += numberValue(row.total_revenue);
      current.campaignCount += 1;
      if (rowCost >= current.topCampaignSpend) {
        current.topCampaignSpend = rowCost;
        current.topCampaign = campaign;
        current.topSource = source;
      }
      map.set(key, current);
      return map;
    }, new Map<string, {
      product: string;
      topCampaign: string;
      topSource: string;
      campaignCount: number;
      topCampaignSpend: number;
      spend: number;
      clicks: number;
      conversions: number;
      revenue: number;
    }>()),
  )
    .map(([, row]) => ({
      product: row.product,
      campaign: row.topCampaign,
      source: row.topSource,
      campaignCount: row.campaignCount,
      spend: row.spend,
      clicks: row.clicks,
      conversions: row.conversions,
      roas: row.spend > 0 ? row.revenue / row.spend : 0,
    }))
    .sort((left, right) => right.spend - left.spend)
    .slice(0, 20);

  const summary = {
    revenueTotal: sourceRows.reduce((sum, row) => sum + numberValue(row.receita_total), 0),
    upsellRevenue: sourceRows.reduce((sum, row) => sum + numberValue(row.receita_upsells), 0),
    spendTotal: channel ? 0 : mediaBySource.reduce((sum, row) => sum + row.spend, 0),
    clicksTotal: channel ? 0 : mediaBySource.reduce((sum, row) => sum + row.clicks, 0),
    conversionsTotal: channel ? 0 : mediaBySource.reduce((sum, row) => sum + row.conversions, 0),
  };

  return {
    configured: sourceRows.length > 0 || redtrackRows.length > 0,
    redtrackComparable: !channel,
    summary: {
      ...summary,
      roas: summary.spendTotal > 0 ? mediaBySource.reduce((sum, row) => sum + row.revenue, 0) / summary.spendTotal : 0,
    },
    sourceRows,
    mediaBySource: channel ? [] : mediaBySource,
    topCampaigns: channel ? [] : topProducts,
  };
}

export async function getUpsellAnalytics(startDate: string, endDate: string, product?: string | null, channel?: string | null) {
  let dailyRows: AnalyticsFunilDailyRow[] = [];

  try {
    dailyRows = await fetchAnalyticsRows<AnalyticsFunilDailyRow>(
      "fact_funil_diario",
      "*",
      (query) => {
        let next = query.gte("day", startDate).lte("day", endDate).order("day", { ascending: true });
        if (product) next = next.eq("product_base", product);
        if (channel) next = next.eq("canal", channel);
        return next;
      },
    );
  } catch (error) {
    if (!shouldIgnoreMissingAnalyticsSchema(error)) throw error;
  }

  const byProduct = Array.from(
    dailyRows.reduce((map, row) => {
      const key = row.product_base;
      const current = map.get(key) ?? {
        product: row.product_base,
        directSales: 0,
        totalApproved: 0,
        us1Wins: 0,
        us2Wins: 0,
        upsellRevenue: 0,
        days: new Map<string, {
          day: string;
          directSales: number;
          totalApproved: number;
          us1Wins: number;
          us2Wins: number;
          takeRateUs1: number;
          takeRateUs2: number;
          takeRateTotal: number;
          upsellRevenue: number;
        }>(),
      };

      const directSales = numberValue(row.qtd_vendas_diretas);
      const totalApproved = numberValue(row.qtd_upsells_aprovados);
      const us1Wins = Math.round(numberValue(row.take_rate_us1) * directSales);
      const us2Wins = Math.round(numberValue(row.take_rate_us2) * directSales);

      current.directSales += directSales;
      current.totalApproved += totalApproved;
      current.us1Wins += us1Wins;
      current.us2Wins += us2Wins;
      current.upsellRevenue += numberValue(row.receita_upsells);
      const dayEntry = current.days.get(row.day) ?? {
        day: row.day,
        directSales: 0,
        totalApproved: 0,
        us1Wins: 0,
        us2Wins: 0,
        takeRateUs1: 0,
        takeRateUs2: 0,
        takeRateTotal: 0,
        upsellRevenue: 0,
      };
      dayEntry.directSales += directSales;
      dayEntry.totalApproved += totalApproved;
      dayEntry.us1Wins += us1Wins;
      dayEntry.us2Wins += us2Wins;
      dayEntry.upsellRevenue += numberValue(row.receita_upsells);
      dayEntry.takeRateTotal = dayEntry.directSales > 0 ? dayEntry.totalApproved / dayEntry.directSales : 0;
      dayEntry.takeRateUs1 = dayEntry.directSales > 0 ? dayEntry.us1Wins / dayEntry.directSales : 0;
      dayEntry.takeRateUs2 = dayEntry.directSales > 0 ? dayEntry.us2Wins / dayEntry.directSales : 0;
      current.days.set(row.day, dayEntry);
      map.set(key, current);
      return map;
    }, new Map<string, {
      product: string;
      directSales: number;
      totalApproved: number;
      us1Wins: number;
      us2Wins: number;
      upsellRevenue: number;
      days: Map<string, {
        day: string;
        directSales: number;
        totalApproved: number;
        us1Wins: number;
        us2Wins: number;
        takeRateUs1: number;
        takeRateUs2: number;
        takeRateTotal: number;
        upsellRevenue: number;
      }>;
    }>()),
  )
    .map(([, row]) => ({
      ...row,
      takeRateTotal: row.directSales > 0 ? row.totalApproved / row.directSales : 0,
      takeRateUs1: row.directSales > 0 ? row.us1Wins / row.directSales : 0,
      takeRateUs2: row.directSales > 0 ? row.us2Wins / row.directSales : 0,
      days: Array.from(row.days.values()).sort((left, right) => left.day.localeCompare(right.day)),
    }))
    .sort((left, right) => right.directSales - left.directSales);

  return {
    configured: dailyRows.length > 0,
    summary: {
      directSales: byProduct.reduce((sum, row) => sum + row.directSales, 0),
      totalApproved: byProduct.reduce((sum, row) => sum + row.totalApproved, 0),
      us1Wins: byProduct.reduce((sum, row) => sum + row.us1Wins, 0),
      us2Wins: byProduct.reduce((sum, row) => sum + row.us2Wins, 0),
      upsellRevenue: byProduct.reduce((sum, row) => sum + row.upsellRevenue, 0),
    },
    products: byProduct,
  };
}
