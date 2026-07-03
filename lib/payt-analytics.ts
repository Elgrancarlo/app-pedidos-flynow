import {
  ANALYTICS_CHANNEL_LABELS,
  type AnalyticsCanal,
  type AnalyticsOfferKind,
  type AnalyticsPaytSale,
  createServiceClient,
} from "@/lib/supabase";
import { inferirGrupo } from "@/lib/produtos";

type JsonMap = Record<string, unknown>;

const PAGE_SIZE = 1000;
const PRODUCT_BASE_RULES: Array<[RegExp, string]> = [
  [/derma\s*bloom/i, "DERMA BLOOM"],
  [/coco\s*slim/i, "COCO SLIM"],
  [/power\s*66/i, "POWER 66"],
  [/glico\s*reset/i, "GLICO RESET"],
  [/gelatina\s*slim/i, "GELATINA SLIM"],
  [/vision\s*pure/i, "VISION PURE"],
  [/laxantril/i, "LAXANTRIL"],
  [/prostapower/i, "PROSTAPOWER"],
  [/prosta\s*power/i, "PROSTAPOWER"],
  [/soulsynk/i, "SOULSYNK"],
  [/diva\s*slim/i, "DIVA SLIM"],
  [/duratril/i, "DURATRIL"],
  [/alpen\s*slim/i, "ALPEN SLIM"],
  [/vitalafil\s*caps/i, "VITALAFIL CAPS"],
  [/lipo\s*guumy/i, "LIPO GUUMY"],
  [/lipo\s*gummy/i, "LIPO GUUMY"],
];



function toIsoTimestamp(value: string | null | undefined) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function normalizeString(value: unknown) {
  if (value == null) return null;
  const text = String(value).trim();
  return text.length > 0 ? text : null;
}

function numberValue(value: unknown, fallback = 0) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const normalized = value.replace(/[^\d,-.]/g, "").replace(/\.(?=.*\.)/g, "").replace(",", ".");
    const parsed = Number.parseFloat(normalized);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function getField(payload: JsonMap | null | undefined, ...keys: string[]) {
  if (!payload) return null;
  for (const key of keys) {
    const raw = payload[key];
    const text = normalizeString(raw);
    if (text) return text;
  }
  return null;
}

function getNumericField(payload: JsonMap | null | undefined, ...keys: string[]) {
  if (!payload) return null;
  for (const key of keys) {
    const raw = payload[key];
    if (raw == null || raw === "") continue;
    return numberValue(raw, 0);
  }
  return null;
}

export function inferProductBase(productName: string | null | undefined) {
  const canonicalGroup = inferirGrupo(productName);
  if (canonicalGroup) return canonicalGroup.toUpperCase();

  const source = (productName ?? "").toUpperCase();
  for (const [pattern, productBase] of PRODUCT_BASE_RULES) {
    if (pattern.test(source)) return productBase;
  }
  if (source.includes("S2 CLUBE")) return "S2 CLUBE";
  return "OUTRO";
}

function inferKit(productName: string | null | undefined) {
  const source = (productName ?? "").toUpperCase();
  const match = source.match(/(\d+)\s*(POTE|POTES|FRASCO|FRASCOS)/);
  if (match) return match[1];
  if (source.includes("S2 CLUBE")) return "REC";
  return null;
}

export function inferOfferKind(productName: string | null | undefined): AnalyticsOfferKind {
  const source = (productName ?? "").toUpperCase();
  const isTelevendas = source.includes("TELEVENDAS");
  const isDownsell = /\bDOWN(SELL)?\b|\bDS\b|DOWN-?\d/.test(source);
  const isUs2 = /UP\s*2|UPSELL\s*2/.test(source);
  const isUs1 = /UP\s*1|UPSELL\s*1/.test(source);
  const isGenericUpsell = source.includes("UPSELL");

  if (source.includes("S2 CLUBE")) return "recorrencia";
  if (source.includes("GRUPO VIP")) return "grupo_vip";
  if (isTelevendas) return "televendas";
  if (source.includes("DOWN-1 (UP1)") || source.includes("DOWN-1(UP1)")) return "downsell_us1";
  if (source.includes("DOWN-1 (UP2)") || source.includes("DOWN-1(UP2)")) return "downsell_us2";
  if (isDownsell && isUs2) {
    return "downsell_us2";
  }
  if (isDownsell) return "downsell_us1";
  if (isUs2) return "us2";
  if (isUs1 || isGenericUpsell) return "us1";
  if (inferProductBase(source) !== "OUTRO") return "principal";
  return "outro";
}

export function classifyAnalyticsChannel({
  sourceUrl,
  utmSource,
  sourceVendas,
  productName,
}: {
  sourceUrl?: string | null;
  utmSource?: string | null;
  sourceVendas?: string | null;
  productName?: string | null;
}): AnalyticsCanal {
  const s = (sourceUrl ?? "").trim().toLowerCase();
  const u = (utmSource ?? "").trim().toLowerCase();
  const v = (sourceVendas ?? "").trim().toLowerCase();
  const p = (productName ?? "").trim().toLowerCase();

  if (s === "vsl" || s === "vsl-rp") return "VSL_FRONT";
  if (s === "tb" || u.includes("taboola")) return "TABOOLA";
  if (s === "el" || u.includes("mautic")) return "EMAIL_MAUTIC";
  if (u.includes("smsfunnel")) return "SMS";
  if (s.startsWith("back") || s.includes("backend")) return "BACKEND_RECUPERACAO";
  if (s.includes("rec-ia") || s === "ia" || s.includes("ia-wpp") || v.includes("ia-wpp")) return "IA_WHATSAPP";
  if (p.includes("televendas") || v.includes("venda manual")) return "CALLCENTER";
  if (s.includes("paytcall") || v.includes("paytcall")) return "CALLCENTER";
  if (s === "mdi" || v.includes("mdi")) return "MDI";
  if (v.includes("vendasia")) return "IA_VENDAS";
  return "OUTROS";
}

function extractAttribution(payload: JsonMap | null | undefined) {
  const sourceVendas =
    getField(
      payload,
      "source_vendas",
      "source_manual",
      "manual_source",
      "transaction.source",
      "metadata.source",
      "customer.source",
      "link.title",
    ) ??
    (getField(payload, "commission.1.type")?.toLowerCase() === "callcenter" ? "paytcall" : null);

  return {
    sourceVendas,
    sourceUrl: getField(
      payload,
      "link.sources.src",
      "source_url",
      "utm_source_url",
      "tracking.source_url",
      "tracking.source",
      "source",
      "checkout.source",
    ),
    utmSource: getField(
      payload,
      "link.sources.utm_source",
      "utm_source",
      "tracking.utm_source",
      "trackingParameters.utm_source",
      "params.utm_source",
      "transaction.utm_source",
      "metadata.utm_source",
    ),
    utmCampaign: getField(
      payload,
      "link.sources.utm_campaign",
      "utm_campaign",
      "tracking.utm_campaign",
      "trackingParameters.utm_campaign",
      "params.utm_campaign",
      "transaction.utm_campaign",
      "metadata.utm_campaign",
    ),
    utmMedium: getField(
      payload,
      "link.sources.utm_medium",
      "utm_medium",
      "tracking.utm_medium",
      "trackingParameters.utm_medium",
      "params.utm_medium",
      "transaction.utm_medium",
      "metadata.utm_medium",
    ),
    utmTerm: getField(
      payload,
      "link.sources.utm_term",
      "utm_term",
      "tracking.utm_term",
      "trackingParameters.utm_term",
      "params.utm_term",
      "transaction.utm_term",
      "metadata.utm_term",
    ),
    utmContent: getField(
      payload,
      "link.sources.utm_content",
      "utm_content",
      "tracking.utm_content",
      "trackingParameters.utm_content",
      "params.utm_content",
      "transaction.utm_content",
      "metadata.utm_content",
    ),
  };
}

// "Você recebe" = comissão do tipo 'producer' (o que a Payt repassa ao produtor).
// A Payt NÃO envia um campo pronto — só o array `commission[]` (nested) ou as chaves
// achatadas `commission.N.*` (flat). Também aceita `voce_recebe` já calculado no payload
// (injetado pelo n8n / edge function). Retorna em REAIS, ou null se não houver comissão.
function extractVoceRecebe(payload: JsonMap | null | undefined): number | null {
  if (!payload) return null;

  const direct = getNumericField(payload, "voce_recebe");
  if (direct != null) return direct;

  const commission = payload.commission;
  let producerCents = 0;
  let found = false;

  if (Array.isArray(commission)) {
    for (const item of commission) {
      const c = item as JsonMap;
      if (c && String(c.type).toLowerCase() === "producer") {
        producerCents += numberValue(c.amount, 0);
      }
      found = true;
    }
  } else {
    for (let i = 0; ; i++) {
      const type = payload[`commission.${i}.type`];
      const amount = payload[`commission.${i}.amount`];
      if (type == null && amount == null) break;
      if (String(type).toLowerCase() === "producer") {
        producerCents += numberValue(amount, 0);
      }
      found = true;
    }
  }

  return found ? producerCents / 100 : null;
}

/**
 * Linha de venda vinda do payt_event_stream (fonte de verdade da ingestão).
 * paid_at chega em hora BRT gravada verbatim como UTC — o dia BRT é o próprio
 * date-part do valor, sem shift de timezone.
 */
type StreamSaleRow = {
  transaction_id: string | null;
  cart_id: string | null;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  product_name: string | null;
  payment_method: string | null;
  total_price: number | string | null;
  paid_at: string | null;
  payload: JsonMap | null;
};

function buildPaytSaleFromStream(row: StreamSaleRow): AnalyticsPaytSale {
  const payload = row.payload ?? null;
  const attribution = extractAttribution(payload);
  const produtoNome = row.product_name ?? getField(payload, "product.name", "product_name", "offer_name");
  const valorPayload = getNumericField(payload, "transaction.total_price", "transaction_total_price", "amount");
  const valorTotal =
    row.total_price != null ? numberValue(row.total_price, 0) : valorPayload != null ? valorPayload / 100 : 0;
  // Sem fallback pro bruto: voce_recebe ausente vira 0 e é contado no resultado
  // do sync — cair no valor_total mascarava o líquido como bruto (bug antigo).
  const voceRecebe = extractVoceRecebe(payload);
  const paidAt =
    toIsoTimestamp(row.paid_at) ??
    toIsoTimestamp(getField(payload, "transaction.paid_at", "paid_at", "approved_at")) ??
    new Date().toISOString();
  const productBase = inferProductBase(produtoNome);
  const offerKind = inferOfferKind(produtoNome);

  return {
    payt_transaction_id: row.transaction_id!,
    pedido_id: null,
    payt_cart_id: row.cart_id,
    paid_at: paidAt,
    day: paidAt.slice(0, 10),
    cliente_nome: row.customer_name,
    cliente_email: row.customer_email,
    cliente_telefone: row.customer_phone,
    produto_nome: produtoNome,
    product_base: productBase,
    kit: inferKit(produtoNome),
    offer_kind: offerKind,
    sale_kind: offerKind === "principal" ? "venda_direta" : "upsell",
    source_vendas: attribution.sourceVendas,
    source_url: attribution.sourceUrl,
    utm_source: attribution.utmSource,
    utm_campaign: attribution.utmCampaign,
    utm_medium: attribution.utmMedium,
    utm_term: attribution.utmTerm,
    utm_content: attribution.utmContent,
    canal: classifyAnalyticsChannel({
      sourceUrl: attribution.sourceUrl,
      utmSource: attribution.utmSource,
      sourceVendas: attribution.sourceVendas,
      productName: produtoNome,
    }),
    forma_pagamento: row.payment_method,
    valor_total: valorTotal,
    voce_recebe: Math.max(voceRecebe ?? 0, 0),
    chargeback: false,
    status_pagamento: "paid",
    endereco_entrega: null,
    imported_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

type FunilDailyAccumulator = {
  day: string;
  product_base: string;
  canal: AnalyticsCanal;
  source_url: string | null;
  utm_source: string | null;
  qtd_vendas_diretas: number;
  receita_vendas_diretas: number;
  qtd_upsells_aprovados: number;
  receita_upsells: number;
  receita_total: number;
  voce_recebe_total: number;
  mainSales: number;
  us1Wins: number;
  us2Wins: number;
};

type FunilSourceAccumulator = {
  day: string;
  canal: AnalyticsCanal;
  source_url: string | null;
  utm_source: string | null;
  utm_campaign: string | null;
  utm_medium: string | null;
  utm_term: string | null;
  utm_content: string | null;
  qtd_vendas: number;
  receita_total: number;
  qtd_upsells: number;
  receita_upsells: number;
};

type CartSummary = {
  anchorSale: AnalyticsPaytSale;
  allSales: AnalyticsPaytSale[];
  principalSales: AnalyticsPaytSale[];
  us1Sales: AnalyticsPaytSale[];
  us2Sales: AnalyticsPaytSale[];
  coreUpsellSales: AnalyticsPaytSale[];
  otherPostSaleSales: AnalyticsPaytSale[];
};

function groupCartKey(sale: AnalyticsPaytSale) {
  return sale.payt_cart_id || sale.payt_transaction_id;
}

function isCoreUpsell(kind: AnalyticsOfferKind) {
  return kind === "us1" || kind === "us2";
}

function isPostSaleOffer(kind: AnalyticsOfferKind) {
  return (
    kind === "us1" ||
    kind === "us2" ||
    kind === "downsell_us1" ||
    kind === "downsell_us2" ||
    kind === "televendas" ||
    kind === "recorrencia" ||
    kind === "grupo_vip"
  );
}

function chunk<T>(values: T[], size = 500) {
  const items: T[][] = [];
  for (let index = 0; index < values.length; index += size) {
    items.push(values.slice(index, index + size));
  }
  return items;
}

async function fetchAllPaginated<T>(
  table: string,
  select: string,
  applyFilters?: (query: any) => any,
) {
  const supabase = createServiceClient();
  const rows: T[] = [];

  for (let from = 0; ; from += PAGE_SIZE) {
    let query = supabase.from(table).select(select).range(from, from + PAGE_SIZE - 1);
    if (applyFilters) query = applyFilters(query);
    const { data, error } = await query;
    if (error) throw error;
    if (!data || data.length === 0) break;
    rows.push(...(data as T[]));
    if (data.length < PAGE_SIZE) break;
  }

  return rows;
}



function buildFunilFacts(sales: AnalyticsPaytSale[]) {
  const daily = new Map<string, FunilDailyAccumulator>();
  const source = new Map<string, FunilSourceAccumulator>();
  const carts = sales.reduce((map, sale) => {
    const key = groupCartKey(sale);
    const current = map.get(key) ?? [];
    current.push(sale);
    map.set(key, current);
    return map;
  }, new Map<string, AnalyticsPaytSale[]>());

  const cartSummaries: CartSummary[] = Array.from(carts.values()).map((cartSales) => {
    const sorted = [...cartSales].sort((left, right) => {
      const leftTime = new Date(left.paid_at ?? `${left.day}T00:00:00Z`).getTime();
      const rightTime = new Date(right.paid_at ?? `${right.day}T00:00:00Z`).getTime();
      return leftTime - rightTime;
    });
    const principalSales = sorted.filter((sale) => sale.offer_kind === "principal");
    const anchorSale = principalSales[0] ?? sorted[0];
    const us1Sales = sorted.filter((sale) => sale.offer_kind === "us1");
    const us2Sales = sorted.filter((sale) => sale.offer_kind === "us2");
    const coreUpsellSales = sorted.filter((sale) => isCoreUpsell(sale.offer_kind));
    const otherPostSaleSales = sorted.filter(
      (sale) => isPostSaleOffer(sale.offer_kind) && !isCoreUpsell(sale.offer_kind),
    );

    return {
      anchorSale,
      allSales: sorted,
      principalSales,
      us1Sales,
      us2Sales,
      coreUpsellSales,
      otherPostSaleSales,
    };
  });

  for (const cart of cartSummaries) {
    const anchor = cart.anchorSale;
    const directSales = cart.principalSales.length;
    const us1Wins = cart.us1Sales.length > 0 ? directSales : 0;
    const us2Wins = cart.us2Sales.length > 0 ? directSales : 0;
    // Receitas do funil em "Você recebe" (líquido producer) — regra do app:
    // toda métrica de receita exibida reflete o que a Payt chama de "Total das
    // vendas", não o bruto pago pelo cliente.
    const coreUpsellRevenue = cart.coreUpsellSales.reduce((sum, sale) => sum + sale.voce_recebe, 0);
    const totalRevenue = cart.allSales.reduce((sum, sale) => sum + sale.voce_recebe, 0);
    const totalNet = totalRevenue;

    const dailyKey = [
      anchor.day,
      anchor.product_base,
      anchor.canal,
      anchor.source_url ?? "",
      anchor.utm_source ?? "",
    ].join("|");

    const dailyEntry = daily.get(dailyKey) ?? {
      day: anchor.day,
      product_base: anchor.product_base,
      canal: anchor.canal,
      source_url: anchor.source_url,
      utm_source: anchor.utm_source,
      qtd_vendas_diretas: 0,
      receita_vendas_diretas: 0,
      qtd_upsells_aprovados: 0,
      receita_upsells: 0,
      receita_total: 0,
      voce_recebe_total: 0,
      mainSales: 0,
      us1Wins: 0,
      us2Wins: 0,
    };

    dailyEntry.qtd_vendas_diretas += directSales;
    dailyEntry.receita_vendas_diretas += cart.principalSales.reduce((sum, sale) => sum + sale.voce_recebe, 0);
    dailyEntry.qtd_upsells_aprovados += cart.coreUpsellSales.length;
    dailyEntry.receita_upsells += coreUpsellRevenue;
    dailyEntry.receita_total += totalRevenue;
    dailyEntry.voce_recebe_total += totalNet;
    dailyEntry.mainSales += directSales;
    dailyEntry.us1Wins += us1Wins;
    dailyEntry.us2Wins += us2Wins;
    daily.set(dailyKey, dailyEntry);

    const sourceKey = [
      anchor.day,
      anchor.canal,
      anchor.source_url ?? "",
      anchor.utm_source ?? "",
      anchor.utm_campaign ?? "",
      anchor.utm_medium ?? "",
      anchor.utm_term ?? "",
      anchor.utm_content ?? "",
    ].join("|");

    const sourceEntry = source.get(sourceKey) ?? {
      day: anchor.day,
      canal: anchor.canal,
      source_url: anchor.source_url,
      utm_source: anchor.utm_source,
      utm_campaign: anchor.utm_campaign,
      utm_medium: anchor.utm_medium,
      utm_term: anchor.utm_term,
      utm_content: anchor.utm_content,
      qtd_vendas: 0,
      receita_total: 0,
      qtd_upsells: 0,
      receita_upsells: 0,
    };

    sourceEntry.qtd_vendas += directSales;
    sourceEntry.qtd_upsells += cart.coreUpsellSales.length;
    sourceEntry.receita_upsells += coreUpsellRevenue;
    sourceEntry.receita_total += totalRevenue;
    source.set(sourceKey, sourceEntry);
  }

  const dailyRows = Array.from(daily.values()).map((entry) => ({
    day: entry.day,
    product_base: entry.product_base,
    canal: entry.canal,
    source_url: entry.source_url,
    utm_source: entry.utm_source,
    qtd_vendas_diretas: entry.qtd_vendas_diretas,
    receita_vendas_diretas: entry.receita_vendas_diretas,
    qtd_upsells_aprovados: entry.qtd_upsells_aprovados,
    receita_upsells: entry.receita_upsells,
    receita_total: entry.receita_total,
    aov: entry.mainSales > 0 ? entry.receita_total / entry.mainSales : 0,
    take_rate_us1: entry.mainSales > 0 ? entry.us1Wins / entry.mainSales : 0,
    take_rate_us2: entry.mainSales > 0 ? entry.us2Wins / entry.mainSales : 0,
    voce_recebe_total: entry.voce_recebe_total,
    synced_at: new Date().toISOString(),
  }));

  const sourceRows = Array.from(source.values()).map((entry) => ({
    day: entry.day,
    canal: entry.canal,
    source_url: entry.source_url,
    utm_source: entry.utm_source,
    utm_campaign: entry.utm_campaign,
    utm_medium: entry.utm_medium,
    utm_term: entry.utm_term,
    utm_content: entry.utm_content,
    qtd_vendas: entry.qtd_vendas,
    receita_total: entry.receita_total,
    aov: entry.qtd_vendas > 0 ? entry.receita_total / entry.qtd_vendas : 0,
    qtd_upsells: entry.qtd_upsells,
    receita_upsells: entry.receita_upsells,
    upsell_ratio: entry.receita_total > 0 ? entry.receita_upsells / entry.receita_total : 0,
    synced_at: new Date().toISOString(),
  }));

  return { dailyRows, sourceRows };
}

/** Payload flat (n8n) tem as chaves pontilhadas que extractAttribution entende melhor. */
function isFlatPayload(payload: JsonMap | null) {
  return !!payload && ("transaction.total_price" in payload || "link.sources.src" in payload || "product.name" in payload);
}

export async function syncPaytAnalytics({
  startDate,
  endDate,
}: {
  startDate: string;
  endDate: string;
}) {
  // Fonte de verdade: payt_event_stream (derivado do raw pelo trigger da migration
  // 023). A tabela pedidos NÃO é usada — ela depende do caminho de webhook que
  // historicamente perdia eventos, o que deixava o funil com vendas faltando.
  // paid_at é hora BRT verbatim → janela do dia BRT = o próprio dia em UTC.
  const streamRows = await fetchAllPaginated<StreamSaleRow>(
    "payt_event_stream",
    "transaction_id, cart_id, customer_name, customer_email, customer_phone, product_name, payment_method, total_price, paid_at, payload",
    (query) =>
      query
        .eq("event_status", "paid")
        .not("transaction_id", "like", "cart:%")
        .gte("paid_at", `${startDate}T00:00:00.000Z`)
        .lte("paid_at", `${endDate}T23:59:59.999Z`)
        .order("paid_at", { ascending: true }),
  );

  // Transações revertidas (qualquer momento) saem do funil — paridade com o
  // comportamento antigo, que excluía pedidos refunded/chargeback.
  const reversalRows = await fetchAllPaginated<{ transaction_id: string | null }>(
    "payt_event_stream",
    "transaction_id",
    (query) =>
      query
        .in("event_status", ["refunded", "chargeback", "charged_back"])
        .not("transaction_id", "like", "cart:%"),
  );
  const reversedTransactions = new Set(
    reversalRows.map((row) => normalizeString(row.transaction_id)).filter(Boolean) as string[],
  );

  const byTransaction = new Map<string, StreamSaleRow>();
  for (const row of streamRows) {
    const transactionId = normalizeString(row.transaction_id);
    if (!transactionId) continue;
    const current = byTransaction.get(transactionId);
    if (!current) {
      byTransaction.set(transactionId, row);
      continue;
    }
    if (isFlatPayload(row.payload) && !isFlatPayload(current.payload)) {
      byTransaction.set(transactionId, row);
    }
  }

  let transacoesRevertidasExcluidas = 0;
  const dedupedRows: StreamSaleRow[] = [];
  for (const [transactionId, row] of byTransaction) {
    if (reversedTransactions.has(transactionId)) {
      transacoesRevertidasExcluidas += 1;
      continue;
    }
    dedupedRows.push(row);
  }

  const sales = dedupedRows.map((row) => buildPaytSaleFromStream(row));
  const vendasSemVoceRecebe = dedupedRows.filter((row) => extractVoceRecebe(row.payload) == null).length;

  const { dailyRows, sourceRows } = buildFunilFacts(sales);
  const analytics = createServiceClient().schema("analytics");

  const payloadByTransaction = new Map(dedupedRows.map((row) => [normalizeString(row.transaction_id)!, row.payload]));
  for (const items of chunk(sales.map((sale) => ({
    payt_transaction_id: sale.payt_transaction_id,
    pedido_id: sale.pedido_id,
    payt_cart_id: sale.payt_cart_id,
    payload: payloadByTransaction.get(sale.payt_transaction_id) ?? null,
    payload_source: "payt_event_stream",
    imported_at: sale.imported_at,
    updated_at: sale.updated_at,
  })))) {
    await analytics.from("payt_sales_raw").upsert(items, { onConflict: "payt_transaction_id" });
  }

  for (const items of chunk(sales)) {
    await analytics.from("payt_sales").upsert(items, { onConflict: "payt_transaction_id" });
  }

  // Linhas de transações que ficaram revertidas depois de já sincronizadas
  // continuariam como "paid" no payt_sales — marca como excluídas do funil.
  if (reversedTransactions.size > 0) {
    for (const ids of chunk(Array.from(reversedTransactions))) {
      await analytics
        .from("payt_sales")
        .update({ chargeback: true, updated_at: new Date().toISOString() })
        .in("payt_transaction_id", ids);
    }
  }

  await analytics
    .from("fact_funil_diario")
    .delete()
    .gte("day", startDate)
    .lte("day", endDate);

  await analytics
    .from("fact_funil_por_fonte")
    .delete()
    .gte("day", startDate)
    .lte("day", endDate);

  for (const items of chunk(dailyRows)) {
    await analytics.from("fact_funil_diario").insert(items);
  }

  for (const items of chunk(sourceRows)) {
    await analytics.from("fact_funil_por_fonte").insert(items);
  }

  return {
    fonte: "payt_event_stream",
    linhasStream: streamRows.length,
    vendasNormalizadas: sales.length,
    transacoesRevertidasExcluidas,
    vendasSemVoceRecebe,
    linhasFunilDiario: dailyRows.length,
    linhasFunilFonte: sourceRows.length,
    canaisMapeados: Object.keys(ANALYTICS_CHANNEL_LABELS).length,
  };
}
