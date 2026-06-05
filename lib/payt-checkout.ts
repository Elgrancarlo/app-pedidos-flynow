import { classifyPaytEventGroup, extractPaytItems, normalizePaytEventStatus, type PaytPayload } from "@/lib/payt-events";
import { inferirGrupo } from "@/lib/produtos";
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
  const eventAt = toIsoTimestamp(
    payload["transaction.updated_at"] ??
      payload["transaction.paid_at"] ??
      payload.updated_at ??
      payload.created_at,
    raw.created_at ?? new Date().toISOString(),
  );

  return {
    key: textValue(payload.transaction_id) ?? textValue(payload.cart_id) ?? `${status}:${raw.created_at}`,
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

function isMissingEventStream(error: unknown) {
  const message =
    error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  return message.includes("payt_event_stream");
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
    const streamRows = await fetchStreamEvents(supabase, since, maxEvents);

    for (const row of streamRows) {
      const event = buildMonitorRowFromStream(row);
      mergeMonitorEvent(latestByKey, event);
    }
  } catch (error) {
    if (!isMissingEventStream(error)) {
      throw error;
    }

    triedRawFallback = true;
    const rawRows = await fetchRawWebhookRows(supabase, since, maxEvents);
    mergeRawWebhookRows(latestByKey, rawRows, since);
  }

  if (latestByKey.size === 0 && !triedRawFallback) {
    const rawRows = await fetchRawWebhookRows(supabase, since, maxEvents);
    mergeRawWebhookRows(latestByKey, rawRows, since);
  }

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
