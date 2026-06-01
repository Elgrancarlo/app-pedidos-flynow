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

export async function getPaytCheckoutMonitor(hours = 24) {
  const supabase = createServiceClient();
  const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
  const queryLimit = Math.min(hours * 200, 10000);
  const latestByKey = new Map<string, PaytCheckoutMonitorRow>();
  let openCount = 0;
  let lostCount = 0;
  let abandonedCount = 0;

  try {
    const PAGE = 1000;
    let allStreamRows: StreamEventRow[] = [];
    for (let offset = 0; offset < queryLimit; offset += PAGE) {
      const { data, error } = await supabase
        .from("payt_event_stream")
        .select("transaction_id, cart_id, customer_name, customer_email, customer_phone, product_name, product_group, payment_method, total_price, event_status, event_group, event_at")
        .gte("event_at", since)
        .order("event_at", { ascending: false })
        .range(offset, offset + PAGE - 1);

      if (error) throw error;
      if (!data || data.length === 0) break;
      allStreamRows.push(...(data as StreamEventRow[]));
      if (data.length < PAGE) break;
    }

    for (const row of allStreamRows) {
      const event = buildMonitorRowFromStream(row);
      const key = event.key;
      const current = latestByKey.get(key);

      if (!current) {
        latestByKey.set(key, { ...event, timeline: [event.status], rawCount: 1 });
      } else {
        current.timeline.push(event.status);
        current.rawCount += 1;
        if (eventSortValue(event.eventAt) > eventSortValue(current.eventAt)) {
          latestByKey.set(key, {
            ...event,
            timeline: current.timeline,
            rawCount: current.rawCount,
          });
        }
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
    if (!message.includes("payt_event_stream")) {
      throw error;
    }

    let data: RawWebhookRow[] | null = null;
    const primaryQuery = await supabase
      .from("payt_webhooks_raw")
      .select("payload, received_at")
      .gte("received_at", since)
      .order("received_at", { ascending: false })
      .limit(queryLimit);

    if (primaryQuery.error) {
      const fallbackQuery = await supabase
        .from("payt_webhooks_raw")
        .select("payload, created_at")
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(queryLimit);

      if (fallbackQuery.error) {
        throw new Error(fallbackQuery.error.message);
      }

      data = (fallbackQuery.data ?? []).map((row: { payload: PaytPayload; created_at?: string | null }) => ({
        payload: row.payload as PaytPayload,
        created_at: row.created_at ?? null,
      }));
    } else {
      data = ((primaryQuery.data ?? []) as Array<{ payload: PaytPayload; received_at?: string | null }>).map((row) => ({
        payload: row.payload,
        created_at: row.received_at ?? null,
        received_at: row.received_at ?? null,
      }));
    }

    for (const row of data ?? []) {
      const event = buildMonitorRow(row);
      if (event.eventAt < since) continue;
      const key = event.cartId ?? event.transactionId ?? event.key;
      const current = latestByKey.get(key);

      if (!current) {
        latestByKey.set(key, { ...event, key, timeline: [event.status], rawCount: 1 });
      } else {
        current.timeline.push(event.status);
        current.rawCount += 1;
        if (eventSortValue(event.eventAt) > eventSortValue(current.eventAt)) {
          latestByKey.set(key, {
            ...event,
            key,
            timeline: current.timeline,
            rawCount: current.rawCount,
          });
        }
      }
    }
  }

  // Fallback: if event_stream returned nothing, try payt_webhooks_raw
  if (latestByKey.size === 0) {
    try {
      let rawRows: any[] = [];
      const primaryQuery = await supabase
        .from("payt_webhooks_raw")
        .select("payload, received_at")
        .gte("received_at", since)
        .order("received_at", { ascending: false })
        .limit(queryLimit);

      if (primaryQuery.error) {
        const fallbackQuery = await supabase
          .from("payt_webhooks_raw")
          .select("payload, created_at")
          .gte("created_at", since)
          .order("created_at", { ascending: false })
          .limit(queryLimit);

        if (!fallbackQuery.error) {
          rawRows = (fallbackQuery.data ?? []);
        }
      } else {
        rawRows = (primaryQuery.data ?? []);
      }

      for (const row of rawRows) {
        const event = buildMonitorRow({ payload: row.payload, received_at: row.received_at ?? null, created_at: row.created_at ?? null });
        if (event.eventAt < since) continue;
        const key = event.cartId ?? event.transactionId ?? event.key;
        const current = latestByKey.get(key);
        if (!current) {
          latestByKey.set(key, { ...event, key, timeline: [event.status], rawCount: 1 });
        } else {
          current.timeline.push(event.status);
          current.rawCount += 1;
          if (eventSortValue(event.eventAt) > eventSortValue(current.eventAt)) {
            latestByKey.set(key, { ...event, key, timeline: current.timeline, rawCount: current.rawCount });
          }
        }
      }
    } catch (_) {
      // ignore fallback errors
    }
  }

  // Fallback: if event_stream returned nothing, try payt_webhooks_raw
  if (latestByKey.size === 0) {
    try {
      let rawRows: any[] = [];
      const primaryQuery = await supabase
        .from("payt_webhooks_raw")
        .select("payload, received_at")
        .gte("received_at", since)
        .order("received_at", { ascending: false })
        .limit(queryLimit);

      if (primaryQuery.error) {
        const fallbackQuery = await supabase
          .from("payt_webhooks_raw")
          .select("payload, created_at")
          .gte("created_at", since)
          .order("created_at", { ascending: false })
          .limit(queryLimit);

        if (!fallbackQuery.error) {
          rawRows = (fallbackQuery.data ?? []);
        }
      } else {
        rawRows = (primaryQuery.data ?? []);
      }

      for (const row of rawRows) {
        const event = buildMonitorRow({ payload: row.payload, received_at: row.received_at ?? null, created_at: row.created_at ?? null });
        if (event.eventAt < since) continue;
        const key = event.cartId ?? event.transactionId ?? event.key;
        const current = latestByKey.get(key);
        if (!current) {
          latestByKey.set(key, { ...event, key, timeline: [event.status], rawCount: 1 });
        } else {
          current.timeline.push(event.status);
          current.rawCount += 1;
          if (eventSortValue(event.eventAt) > eventSortValue(current.eventAt)) {
            latestByKey.set(key, { ...event, key, timeline: current.timeline, rawCount: current.rawCount });
          }
        }
      }
    } catch (_) {
      // ignore fallback errors
    }
  }

  const allRows = Array.from(latestByKey.values());
  const recoveredCount = allRows.filter(
    (row) => row.status === "paid" && row.timeline.some((item) => item !== "paid"),
  ).length;

  const rows = allRows
    .filter((row) => row.status !== "paid" && ["checkout", "loss", "abandonment"].includes(row.eventGroup))
    .sort((left, right) => eventSortValue(right.eventAt) - eventSortValue(left.eventAt));

  for (const row of rows) {
    if (row.eventGroup === "checkout") openCount += 1;
    if (row.eventGroup === "loss") lostCount += 1;
    if (row.eventGroup === "abandonment") abandonedCount += 1;
  }

  return {
    windowHours: hours,
    totalEvents: allRows.reduce((sum, row) => sum + row.rawCount, 0),
    rows,
    summary: {
      openCount,
      lostCount,
      abandonedCount,
      recoveredCount,
    },
  };
}
