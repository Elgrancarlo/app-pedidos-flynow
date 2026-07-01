const REDTRACK_BASE_URL = "https://api.redtrack.io";
const REDTRACK_REQUEST_DELAY_MS = 4000;

type RedtrackReportEnvelope =
  | Array<Record<string, unknown>>
  | {
      items?: Array<Record<string, unknown>>;
      total?: Record<string, unknown>;
    };

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

function getApiKey() {
  const apiKey = process.env.REDTRACK_API_KEY;
  if (!apiKey) {
    throw new Error("REDTRACK_API_KEY não configurada");
  }
  return apiKey;
}

function getSupabaseRestConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Supabase REST config ausente");
  }
  return { url, key };
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function redtrackGet<T>(path: string, params: Record<string, string | number | boolean | undefined>) {
  const searchParams = new URLSearchParams();
  searchParams.set("api_key", getApiKey());

  for (const [key, value] of Object.entries(params)) {
    if (value == null || value === "") continue;
    searchParams.set(key, String(value));
  }

  const response = await fetch(`${REDTRACK_BASE_URL}${path}?${searchParams.toString()}`, {
    method: "GET",
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`RedTrack ${path} respondeu com HTTP ${response.status}`);
  }

  await sleep(REDTRACK_REQUEST_DELAY_MS);
  return (await response.json()) as T;
}

async function redtrackGetWithRetry<T>(
  path: string,
  params: Record<string, string | number | boolean | undefined>,
  retries = 3,
) {
  let attempt = 0;
  while (true) {
    try {
      return await redtrackGet<T>(path, params);
    } catch (error) {
      attempt += 1;
      const message = error instanceof Error ? error.message : String(error);
      if (!message.includes("HTTP 429") || attempt > retries) {
        throw error;
      }
      await sleep(10000 * attempt);
    }
  }
}

function chunk<T>(values: T[], size = 500) {
  const items: T[][] = [];
  for (let index = 0; index < values.length; index += size) {
    items.push(values.slice(index, index + size));
  }
  return items;
}

function addDays(date: string, days: number) {
  const next = new Date(`${date}T00:00:00Z`);
  next.setUTCDate(next.getUTCDate() + days);
  return next.toISOString().slice(0, 10);
}

function listDates(startDate: string, endDate: string) {
  const dates: string[] = [];
  for (let current = startDate; current <= endDate; current = addDays(current, 1)) {
    dates.push(current);
  }
  return dates;
}

async function analyticsRestRequest(
  path: string,
  init: RequestInit,
) {
  const { url, key } = getSupabaseRestConfig();
  const response = await fetch(`${url}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      ...init.headers,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Supabase REST ${path} respondeu com HTTP ${response.status}: ${await response.text()}`);
  }

  if (response.status === 204) return null;
  return response.text();
}

async function fetchAllReportRows({
  startDate,
  endDate,
}: {
  startDate: string;
  endDate: string;
}) {
  const rows: Array<Record<string, unknown>> = [];
  const dates = listDates(startDate, endDate);

  for (const day of dates) {
    let page = 1;

    while (true) {
      const payload = await redtrackGetWithRetry<RedtrackReportEnvelope>("/report", {
        group: "date,campaign,rt_source",
        date_from: day,
        date_to: day,
        fields: "date,campaign_id,campaign,rt_source,clicks,conversions,cost,revenue,lp_views,lp_clicks,unique_clicks,total_revenue,roas,valorvendido2",
        page,
        per: 500,
      });

      const items = Array.isArray(payload) ? payload : (payload.items ?? []);
      if (items.length === 0) break;
      rows.push(...items);
      if (items.length < 500) break;
      page += 1;
    }
  }

  return rows;
}

export async function syncRedtrackAnalytics({
  startDate,
  endDate,
}: {
  startDate: string;
  endDate: string;
}) {
  const reportRows = await fetchAllReportRows({ startDate, endDate });

  const reportRawRows = reportRows.map((payload, index) => ({
    date_from: startDate,
    date_to: endDate,
    report_group: "date,campaign,rt_source",
    page: Math.floor(index / 500) + 1,
    payload,
    imported_at: new Date().toISOString(),
  }));

  for (const items of chunk(reportRawRows)) {
    await analyticsRestRequest("redtrack_report_raw", {
      method: "POST",
      headers: {
        "Content-Profile": "analytics",
        Prefer: "return=minimal",
      },
      body: JSON.stringify(items),
    });
  }

  const aggregatedDailyRows = Array.from(
    reportRows.reduce((map, row) => {
      const day = textValue(row.date) ?? startDate;
      const baseCampaignId = textValue(row.campaign_id) ?? textValue(row.campaign) ?? `unknown-${Math.random()}`;
      const rtSource = textValue(row.rt_source) ?? "OUTROS";
      const campaignId = `${baseCampaignId}::${rtSource}`;
      const key = `${day}|${campaignId}`;
      const current = map.get(key) ?? {
        day,
        campaign_id: campaignId,
        campaign: textValue(row.campaign) ?? "Sem nome",
        source: textValue(row.source),
        rt_source: rtSource,
        rt_medium: null,
        rt_campaign: textValue(row.campaign),
        clicks: 0,
        conversions: 0,
        cost: 0,
        revenue: 0,
        lp_views: 0,
        lp_clicks: 0,
        unique_clicks: 0,
        total_revenue: 0,
        valor_vendido_2: 0,
        roas: 0,
      };

      current.clicks += Math.round(numberValue(row.clicks));
      current.conversions += Math.round(numberValue(row.conversions));
      current.cost += numberValue(row.cost);
      current.revenue += numberValue(row.revenue);
      current.lp_views += Math.round(numberValue(row.lp_views));
      current.lp_clicks += Math.round(numberValue(row.lp_clicks));
      current.unique_clicks += Math.round(numberValue(row.unique_clicks));
      current.total_revenue += numberValue(row.total_revenue, numberValue(row.revenue));
      current.valor_vendido_2 += numberValue(row.valorvendido2);
      map.set(key, current);
      return map;
    }, new Map<string, {
      day: string;
      campaign_id: string;
      campaign: string;
      source: string | null;
      rt_source: string | null;
      rt_medium: string | null;
      rt_campaign: string | null;
      clicks: number;
      conversions: number;
      cost: number;
      revenue: number;
      lp_views: number;
      lp_clicks: number;
      unique_clicks: number;
      total_revenue: number;
      valor_vendido_2: number;
      roas: number;
    }>()),
  ).map(([, row]) => ({
    ...row,
    roas: row.cost > 0 ? row.total_revenue / row.cost : 0,
    imported_at: new Date().toISOString(),
  }));

  const dailyRows = aggregatedDailyRows.map((row) => {
    return {
      day: row.day,
      campaign_id: row.campaign_id,
      campaign: row.campaign,
      source: row.source,
      rt_source: row.rt_source,
      rt_medium: row.rt_medium,
      rt_campaign: row.rt_campaign,
      clicks: Math.round(numberValue(row.clicks)),
      conversions: Math.round(numberValue(row.conversions)),
      cost: numberValue(row.cost),
      revenue: numberValue(row.revenue),
      lp_views: Math.round(numberValue(row.lp_views)),
      lp_clicks: Math.round(numberValue(row.lp_clicks)),
      unique_clicks: Math.round(numberValue(row.unique_clicks)),
      total_revenue: numberValue(row.total_revenue, numberValue(row.revenue)),
      valor_vendido_2: numberValue(row.valor_vendido_2),
      roas: numberValue(row.roas),
      imported_at: row.imported_at,
    };
  });

  await analyticsRestRequest(
    `redtrack_daily_campaign?day=gte.${startDate}&day=lte.${endDate}`,
    {
      method: "DELETE",
      headers: {
        "Content-Profile": "analytics",
      },
    },
  );

  for (const items of chunk(dailyRows)) {
    await analyticsRestRequest("redtrack_daily_campaign", {
      method: "POST",
      headers: {
        "Content-Profile": "analytics",
        Prefer: "return=minimal",
      },
      body: JSON.stringify(items),
    });
  }

  return {
    reportRows: reportRows.length,
    conversionRows: 0,
    dailyCampaignRows: dailyRows.length,
  };
}
