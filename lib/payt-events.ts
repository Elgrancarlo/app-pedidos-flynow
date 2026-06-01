import { inferirGrupo } from "@/lib/produtos";
import type { PaytTransaction } from "@/lib/payt";

export type PaytPayload = Record<string, unknown>;

export function getPaytField<T>(body: PaytPayload, key: string): T | null {
  return (body[key] as T) ?? null;
}

export function extractPaytItems(body: PaytPayload): Array<{ name: string | null; type: string | null; quantity: number }> {
  const items = [];
  for (let i = 0; ; i++) {
    const type = getPaytField<string>(body, `product.items.${i}.type`);
    const name = getPaytField<string>(body, `product.items.${i}.name`);
    if (type === null && name === null) break;
    items.push({
      name,
      type,
      quantity: getPaytField<number>(body, `product.items.${i}.quantity`) ?? 0,
    });
  }
  return items;
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

function toIsoTimestamp(value: unknown) {
  const text = textValue(value);
  if (!text) return null;
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function resolvePaytEventAt(status: string, body: PaytPayload) {
  const timelineTimestamp =
    toIsoTimestamp(body["transaction.updated_at"]) ??
    toIsoTimestamp(body["updated_at"]) ??
    toIsoTimestamp(body["event_at"]) ??
    toIsoTimestamp(body["created_at"]);

  const paidAt = toIsoTimestamp(body["transaction.paid_at"]);

  if (status === "paid") {
    return paidAt ?? timelineTimestamp ?? new Date().toISOString();
  }

  return timelineTimestamp ?? paidAt ?? new Date().toISOString();
}

export function normalizePaytEventStatus(value: unknown) {
  return textValue(value)?.toLowerCase() ?? "unknown";
}

export function classifyPaytEventGroup(status: string) {
  if (status === "paid") return "sale";
  if (["refunded", "refund_requested", "refund_request", "chargeback", "charged_back"].includes(status)) return "post_sale";
  if (["waiting_payment", "awaiting_payment", "pending", "processing", "in_analysis"].includes(status)) return "checkout";
  if (["canceled", "cancelled", "expired", "refused", "failed"].includes(status)) return "loss";
  if (status === "lost_cart") return "loss";
  if (["abandoned_cart", "abandoned_checkout"].includes(status)) return "abandonment";
  if (status.includes("abandon")) return "abandonment";
  return "other";
}

export function buildPaytRawWebhookRow(body: PaytPayload) {
  return {
    payload: body,
    transaction_id: textValue(body.transaction_id),
    cart_id: textValue(body.cart_id),
    event_status: normalizePaytEventStatus(body.status),
    event_name: textValue(body.event) ?? textValue(body.event_name),
    integration_key: textValue(body.integration_key),
    tangible: typeof body.tangible === "boolean" ? body.tangible : null,
    customer_email: textValue(body["customer.email"]),
    product_name: textValue(body["product.name"]),
  };
}

export function buildPaytEventStreamRow(body: PaytPayload) {
  const transactionId = textValue(body.transaction_id);
  const status = normalizePaytEventStatus(body.status);
  const cartId = textValue(body.cart_id);
  const productName = textValue(body["product.name"]);
  const items = extractPaytItems(body);
  const physicalItems = items.filter((item) => item.type === "physical");
  const quantity = physicalItems.reduce((sum, item) => sum + item.quantity, 0);
  const rawGroup = physicalItems[0]?.name ?? productName;
  const paidAt = toIsoTimestamp(body["transaction.paid_at"]);
  const eventAt = resolvePaytEventAt(status, body);
  const totalPriceCents = numberValue(body["transaction.total_price"]);
  const streamTransactionId = transactionId ?? (cartId ? `cart:${cartId}` : null);

  return {
    event_key: [
      cartId ?? streamTransactionId ?? "unknown",
      status,
      eventAt,
      textValue(body.event) ?? textValue(body.event_name) ?? "webhook",
    ].join(":"),
    transaction_id: streamTransactionId,
    cart_id: cartId,
    event_status: status,
    event_name: textValue(body.event) ?? textValue(body.event_name),
    event_group: classifyPaytEventGroup(status),
    tangible: typeof body.tangible === "boolean" ? body.tangible : null,
    customer_name: textValue(body["customer.name"]),
    customer_email: textValue(body["customer.email"]),
    customer_phone: textValue(body["customer.phone"]),
    customer_doc: textValue(body["customer.doc"]),
    product_name: productName,
    product_group: inferirGrupo(rawGroup) ?? rawGroup,
    product_quantity: quantity > 0 ? quantity : null,
    payment_method: textValue(body["transaction.payment_method"]),
    total_price: totalPriceCents != null ? totalPriceCents / 100 : null,
    paid_at: paidAt,
    payload: body,
    event_at: eventAt,
  };
}

export function buildPaytImportedEventStreamRow(tx: PaytTransaction) {
  const customer = tx.body?.customer ?? tx.customer ?? {};
  const product = tx.body?.product ?? tx.product ?? {};
  const transaction = tx.body?.transaction ?? tx.transaction ?? {};
  const items = product.items ?? [];
  const physicalItems = items.filter((item) => item.type === "physical");
  const quantity = physicalItems.reduce((sum, item) => sum + (item.quantity ?? 0), 0);
  const productName = textValue(product.name);
  const rawGroup = physicalItems[0]?.name ?? productName;
  const status = normalizePaytEventStatus(tx.status);
  const totalPrice = typeof transaction.total_price === "number" ? transaction.total_price / 100 : numberValue(transaction.total_price);
  const paidAt = toIsoTimestamp(transaction.paid_at);
  const eventAt = paidAt ?? new Date().toISOString();

  return {
    event_key: [
      tx.transaction_id,
      status,
      eventAt,
      "import-payt",
    ].join(":"),
    transaction_id: tx.transaction_id,
    cart_id: null,
    event_status: status,
    event_name: "import-payt",
    event_group: classifyPaytEventGroup(status),
    tangible: tx.tangible ?? null,
    customer_name: textValue(customer.name),
    customer_email: textValue(customer.email),
    customer_phone: textValue(customer.phone),
    customer_doc: textValue(customer.doc),
    product_name: productName,
    product_group: inferirGrupo(rawGroup) ?? rawGroup,
    product_quantity: quantity > 0 ? quantity : null,
    payment_method: textValue(transaction.payment_method),
    total_price: totalPrice,
    paid_at: paidAt,
    payload: tx as unknown as Record<string, unknown>,
    event_at: eventAt,
  };
}
