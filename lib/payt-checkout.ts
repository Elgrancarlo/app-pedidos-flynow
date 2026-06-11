import { classifyPaytEventGroup, extractPaytItems, normalizePaytEventStatus, type PaytPayload } from "@/lib/payt-events";
import { inferirGrupo } from "@/lib/produtos";
import { logServerTiming, timedServerTask } from "@/lib/server-timing";
import { createServiceClient } from "@/lib/supabase";

interface RawWebhookRow {
  payload: PaytPayload;
  received_at?: string | null;
  created_at?: string | null;
}

interface StreamEventRow {
  transaction_id: string | null;
  cart_id: string | null;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  product_name: string | null;
  product_group: string | null;
  payment_method: string | null;
  total_price: number | null;
  event_status: string;
  event_group: string;
  event_at: string;
}

export interface PaytCheckoutMonitorRow {
  key: string;
  transactionId: string | null;
  cartId: string | null;
  customerName: string | null;
  customerEmail: string | null;
  customerPhone: string | null;
  productName: string | null;
  productGroup: string | null;
  paymentMethod: string | null;
  totalPrice: number | null;
  status: string;
  eventGroup: string;
  eventAt: string;
  timeline: string[];
  rawCount: number;
}

export interface PaytCheckoutSummary {
  abandonedCount: number;
  lostCount: number;
  openCount: number;
  recoveredCount: number;
  totalEvents: number;
}

type SupabaseServiceClient = ReturnType<typeof createServiceClient>;

type MonitorEvent = Omit<PaytCheckoutMonitorRow, "timeline" | "rawCount">;

type PaytCheckoutMonitorOptions = {
  includeRows?: boolean;
  maxEvents?: number | null;
};

const PAYT_CHECKOUT_PAGE_SIZE = 1000;

function textValue(value: unknown) {
  if (value == null) return null;
  const text = String(value).trim();
  return text.length > 0 ? text : null;
}

function numberValue(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const normalized = value.replace(/[^\d,-.]/g, "").replace(/\.(?=.*\.)/g, "").replace(",", ".");
    const parsed = Number.parseFloat(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function toIsoTimestamp(value: unknown, fallback: string) {
  const text = textValue(value);
  if (!text) return fallback;
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? fallback : date.toISOString();
}

function buildMonitorRow(raw: RawWebhookRow) {
  const payload = raw.payload ?? {};
  const items = extractPaytItems(payload);
  const physicalItems = items.filter((item) => item.type === "physical");
  const productName = textValue(payload["product.name"]);
  const rawGroup = physicalItems[0]?.name ?? productName;
  const totalPriceCents = numberValue(payload["transaction.total_price"]);
  const status = normalizePaytEventStatus(payload.status);
  const rawTimestamp = raw.created_at ?? raw.received_at ?? new Date().toISOString();
  const eventAt = toIsoTimestamp(
    payload["transaction.updated_at"] ??
      payload["transaction.paid_at"] ??
      payload.updated_at ??
      payload.created_at,
    rawTimestamp,
  );

  return {
    key: textValue(payload.transaction_id) ?? textValue(payload.cart_id) ?? `${status}:${rawTimestamp}`,
    transactionId: textValue(payload.transaction_id),
    cartId: textValue(payload.cart_id),
    customerName: textValue(payload["customer.name"]),
    customerEmail: textValue(payload["customer.email"]),
    customerPhone: textValue(payload["customer.phone"]),
    productName,
    productGroup: inferirGrupo(rawGroup) ?? rawGroup,
    paymentMethod: textValue(payload["transaction.payment_method"]),
    totalPrice: totalPriceCents != null ? totalPriceCents / 100 : null,
    status,
    eventGroup: classifyPaytEventGroup(status),
    eventAt,
  };
}

function normalizeTransactionId(value: string | null) {
  if (!value) return null;
  return value.startsWith("cart:") ? null : value;
}

function buildMonitorRowFromStream(row: StreamEventRow) {
  const entityKey = row.cart_id ?? normalizeTransactionId(row.transaction_id) ?? row.transaction_id ?? row.event_at;

  return {
    key: entityKey,
    transactionId: normalizeTransactionId(row.transaction_id),
    cartId: row.cart_id,
    customerName: textValue(row.customer_name),
    customerEmail: textValue(row.customer_email),
    customerPhone: textValue(row.customer_phone),
    productName: textValue(row.product_name),
    productGroup: inferirGrupo(row.product_group ?? row.product_name) ?? row.product_group ?? row.product_name,
    paymentMethod: textValue(row.payment_method),
    totalPrice: row.total_price,
    status: normalizePaytEventStatus(row.event_status),
    eventGroup: textValue(row.event_group) ?? classifyPaytEventGroup(row.event_status),
    eventAt: toIsoTimestamp(row.event_at, new Date().toISOString()),
  };
}

function eventSortValue(eventAt: string) {
  const time = new Date(eventAt).getTime();
  return Number.isNaN(time) ? 0 : time;
}

function parseRpcObject(value: unknown) {
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as Record<string, unknown>;
    } catch {
      return {};
    }
  }

  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};
}

function normalizeSummary(value: unknown): PaytCheckoutSummary {
  const summary = parseRpcObject(value);

  return {
    abandonedCount: numberValue(summary.abandonedCount) ?? 0,
    lostCount: numberValue(summary.lostCount) ?? 0,
    openCount: numberValue(summary.openCount) ?? 0,
    recoveredCount: numberValue(summary.recoveredCount) ?? 0,
    totalEvents: numberValue(summary.totalEvents) ?? 0,
  };
}

function normalizeRpcTimeline(value: unknown) {
  return Array.isArray(value)
    ? value.map((item) => normalizePaytEventStatus(item))
    : [];
}

function normalizeRpcMonitorRow(value: unknown): PaytCheckoutMonitorRow {
  const row = parseRpcObject(value);
  const status = normalizePaytEventStatus(row.status);
  const eventGroup = textValue(row.eventGroup) ?? classifyPaytEventGroup(status);
  const eventAt = toIsoTimestamp(row.eventAt, new Date().toISOString());
  const key =
    textValue(row.key) ??
    textValue(row.cartId) ??
    textValue(row.transactionId) ??
    `${status}:${eventAt}`;

  return {
    key,
    transactionId: textValue(row.transactionId),
    cartId: textValue(row.cartId),
    customerName: textValue(row.customerName),
    customerEmail: textValue(row.customerEmail),
    customerPhone: textValue(row.customerPhone),
    productName: textValue(row.productName),
    productGroup:
      inferirGrupo(textValue(row.productGroup) ?? textValue(row.productName)) ??
      textValue(row.productGroup) ??
      textValue(row.productName),
    paymentMethod: textValue(row.paymentMethod),
    totalPrice: numberValue(row.totalPrice),
    status,
    eventGroup,
    eventAt,
    timeline: normalizeRpcTimeline(row.timeline),
    rawCount: numberValue(row.rawCount) ?? 0,
  };
}

function isMissingEventStream(error: unknown) {
  const message =
    error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  return message.includes("payt_event_stream");
}

export async function getPaytCheckoutSummary(hours = 24) {
  const supabase = createServiceClient();
  const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase.rpc("checkout_summary_counts", {
    p_since: since,
  });

  if (error) {
    const legacy = await getPaytCheckoutMonitor(hours, { includeRows: false });

    return {
      windowHours: hours,
      summary: {
        ...legacy.summary,
        totalEvents: legacy.totalEvents,
      },
    };
  }

  return {
    windowHours: hours,
    summary: normalizeSummary(data),
  };
}

export async function getPaytCheckoutMonitorOptimized(
  hours = 24,
  limit = 100,
  offset = 0,
) {
  const supabase = createServiceClient();
  const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase.rpc("checkout_monitor_summary", {
    p_limit: limit,
    p_offset: offset,
    p_since: since,
  });

  if (error) {
    const legacy = await getPaytCheckoutMonitor(hours, {
      maxEvents: null,
    });

    return {
      ...legacy,
      totalRows: legacy.rows.length,
      summary: {
        ...legacy.summary,
        totalEvents: legacy.totalEvents,
      },
    };
  }

  const payload = parseRpcObject(data);
  const rowsData = Array.isArray(payload.rows) ? payload.rows : [];
  const summary = normalizeSummary(payload.summary);
  const totalEvents = numberValue(payload.totalEvents) ?? summary.totalEvents;
  const totalRows = numberValue(payload.totalRows) ?? rowsData.length;

  return {
    windowHours: numberValue(payload.windowHours) ?? hours,
    totalEvents,
    totalRows,
    rows: rowsData.map(normalizeRpcMonitorRow),
    summary: {
      ...summary,
      totalEvents,
    },
  };
}

function mergeMonitorEvent(
  latestByKey: Map<string, PaytCheckoutMonitorRow>,
  event: MonitorEvent,
  normalizedKey = event.key
) {
  const current = latestByKey.get(normalizedKey);

  if (!current) {
    latestByKey.set(normalizedKey, {
      ...event,
      key: normalizedKey,
      timeline: [event.status],
      rawCount: 1,
    });
    return;
  }

  current.timeline.push(event.status);
  current.rawCount += 1;
  if (eventSortValue(event.eventAt) > eventSortValue(current.eventAt)) {
    latestByKey.set(normalizedKey, {
      ...event,
      key: normalizedKey,
      timeline: current.timeline,
      rawCount: current.rawCount,
    });
  }
}

async function fetchStreamEvents(
  supabase: SupabaseServiceClient,
  since: string,
  maxEvents: number | null
) {
  const rows: StreamEventRow[] = [];

  for (let offset = 0; ; offset += PAYT_CHECKOUT_PAGE_SIZE) {
    if (maxEvents != null && offset >= maxEvents) break;

    const to =
      maxEvents == null
        ? offset + PAYT_CHECKOUT_PAGE_SIZE - 1
        : Math.min(offset + PAYT_CHECKOUT_PAGE_SIZE - 1, maxEvents - 1);
    const { data, error } = await supabase
      .from("payt_event_stream")
      .select("transaction_id, cart_id, customer_name, customer_email, customer_phone, product_name, product_group, payment_method, total_price, event_status, event_group, event_at")
      .gte("event_at", since)
      .order("event_at", { ascending: false })
      .range(offset, to);

    if (error) throw error;
    if (!data || data.length === 0) break;

    rows.push(...(data as StreamEventRow[]));

    if (maxEvents != null && offset + data.length >= maxEvents) break;
    if (data.length < PAYT_CHECKOUT_PAGE_SIZE) break;
  }

  return rows;
}

async function fetchRawWebhookRowsByDate(
  supabase: SupabaseServiceClient,
  dateColumn: "created_at" | "received_at",
  since: string,
  maxEvents: number | null
) {
  const rows: RawWebhookRow[] = [];

  for (let offset = 0; ; offset += PAYT_CHECKOUT_PAGE_SIZE) {
    if (maxEvents != null && offset >= maxEvents) break;

    const to =
      maxEvents == null
        ? offset + PAYT_CHECKOUT_PAGE_SIZE - 1
        : Math.min(offset + PAYT_CHECKOUT_PAGE_SIZE - 1, maxEvents - 1);
    const { data, error } = await supabase
      .from("payt_webhooks_raw")
      .select(`payload, ${dateColumn}`)
      .gte(dateColumn, since)
      .order(dateColumn, { ascending: false })
      .range(offset, to);

    if (error) throw error;
    if (!data || data.length === 0) break;

    rows.push(
      ...(data as Array<{
        created_at?: string | null;
        payload: PaytPayload;
        received_at?: string | null;
      }>).map((row) => ({
        payload: row.payload,
        created_at: row.created_at ?? null,
        received_at: row.received_at ?? null,
      }))
    );

    if (maxEvents != null && offset + data.length >= maxEvents) break;
    if (data.length < PAYT_CHECKOUT_PAGE_SIZE) break;
  }

  return rows;
}

async function fetchRawWebhookRows(
  supabase: SupabaseServiceClient,
  since: string,
  maxEvents: number | null
) {
  try {
    return await fetchRawWebhookRowsByDate(
      supabase,
      "received_at",
      since,
      maxEvents
    );
  } catch {
    return fetchRawWebhookRowsByDate(
      supabase,
      "created_at",
      since,
      maxEvents
    );
  }
}

function mergeRawWebhookRows(
  latestByKey: Map<string, PaytCheckoutMonitorRow>,
  rows: RawWebhookRow[],
  since: string
) {
  for (const row of rows) {
    const event = buildMonitorRow(row);
    if (event.eventAt < since) continue;
    const key = event.cartId ?? event.transactionId ?? event.key;
    mergeMonitorEvent(latestByKey, event, key);
  }
}

export async function getPaytCheckoutMonitor(
  hours = 24,
  options: PaytCheckoutMonitorOptions = {}
) {
  const supabase = createServiceClient();
  const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
  const includeRows = options.includeRows ?? true;
  const maxEvents = options.maxEvents ?? null;
  const latestByKey = new Map<string, PaytCheckoutMonitorRow>();
  let triedRawFallback = false;
  let openCount = 0;
  let lostCount = 0;
  let abandonedCount = 0;

  try {
    const streamRows = await timedServerTask("checkout", "data.streamEvents", () =>
      fetchStreamEvents(supabase, since, maxEvents)
    );

    for (const row of streamRows) {
      const event = buildMonitorRowFromStream(row);
      mergeMonitorEvent(latestByKey, event);
    }
  } catch (error) {
    if (!isMissingEventStream(error)) {
      throw error;
    }

    triedRawFallback = true;
    const rawRows = await timedServerTask("checkout", "data.rawWebhookFallback", () =>
      fetchRawWebhookRows(supabase, since, maxEvents)
    );
    mergeRawWebhookRows(latestByKey, rawRows, since);
  }

  if (latestByKey.size === 0 && !triedRawFallback) {
    const rawRows = await timedServerTask("checkout", "data.rawWebhookEmptyStream", () =>
      fetchRawWebhookRows(supabase, since, maxEvents)
    );
    mergeRawWebhookRows(latestByKey, rawRows, since);
  }

  const postProcessStartedAt = performance.now();
  const allRows = Array.from(latestByKey.values());
  const recoveredCount = allRows.filter(
    (row) => row.status === "paid" && row.timeline.some((item) => item !== "paid"),
  ).length;

  const monitorRows = allRows
    .filter((row) => row.status !== "paid" && ["checkout", "loss", "abandonment"].includes(row.eventGroup))
    .sort((left, right) => eventSortValue(right.eventAt) - eventSortValue(left.eventAt));

  for (const row of monitorRows) {
    if (row.eventGroup === "checkout") openCount += 1;
    if (row.eventGroup === "loss") lostCount += 1;
    if (row.eventGroup === "abandonment") abandonedCount += 1;
  }
  logServerTiming("checkout", "postProcess.summary", postProcessStartedAt);

  return {
    windowHours: hours,
    totalEvents: allRows.reduce((sum, row) => sum + row.rawCount, 0),
    rows: includeRows ? monitorRows : [],
    summary: {
      openCount,
      lostCount,
      abandonedCount,
      recoveredCount,
    },
  };
}
