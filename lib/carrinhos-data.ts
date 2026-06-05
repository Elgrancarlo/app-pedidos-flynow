import { shouldUseMockData } from "@/lib/data-mode";
import { createServiceClient } from "@/lib/supabase";
import { getUtcRangeForAppDates } from "@/lib/app-dates";
import {
  buildPaytEventStreamRow,
  type PaytPayload,
} from "@/lib/payt-events";
import {
  CARRINHO_RECOVERY_CHANNEL_LABELS,
  createMockCarrinhos,
  type Carrinho,
  type CarrinhoEtapa,
  type CarrinhoFunilEtapa,
  type CarrinhoNextStep,
  type CarrinhoOrigem,
  type CarrinhoRecoveryAttempt,
  type CarrinhoRecoveryChannel,
  type CarrinhoRecoveryStatus,
  type CarrinhoStatus,
  type CarrinhoTimelineEvent,
  type CarrinhosResumo,
} from "@/lib/carrinhos";

const CARRINHOS_SELECT =
  "event_key, transaction_id, cart_id, event_status, event_name, event_group, customer_name, customer_email, customer_phone, customer_doc, product_name, product_group, product_quantity, payment_method, total_price, paid_at, payload, event_at, created_at";

const PAGE_SIZE = 1000;
const DEFAULT_TABLE_CART_LIMIT = 1000;

type SupabaseServiceClient = ReturnType<typeof createServiceClient>;
type CarrinhosEventSource = "payt_event_stream" | "payt_webhooks_raw";

type PaytEventRow = {
  event_key: string;
  transaction_id: string | null;
  cart_id: string | null;
  event_status: string;
  event_name: string | null;
  event_group: string;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  customer_doc: string | null;
  product_name: string | null;
  product_group: string | null;
  product_quantity: number | null;
  payment_method: string | null;
  total_price: number | null;
  paid_at: string | null;
  payload: Record<string, unknown> | null;
  event_at: string;
  created_at: string;
};

type PaytRawWebhookRow = {
  payload: PaytPayload;
  received_at: string | null;
};

type CarrinhosDataRange = {
  startDate: string;
  endDate: string;
};

type CarrinhosFetchOptions = {
  maxTableCarts?: number;
};

type CarrinhosEventFetchResult = {
  rows: PaytEventRow[];
  reachedEventLimit: boolean;
  source: CarrinhosEventSource;
};

export type CarrinhosFrontendData = {
  carrinhos: Carrinho[];
  metrics?: {
    funil: Record<CarrinhoFunilEtapa, number>;
    resumo: CarrinhosResumo;
  };
  source: "mock" | "real";
  warning?: string;
};

function toISODate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number) {
  const nextDate = new Date(date);
  nextDate.setDate(date.getDate() + days);
  return nextDate;
}

function addMinutes(value: string, minutes: number) {
  const date = new Date(value);
  date.setMinutes(date.getMinutes() + minutes);
  return date.toISOString();
}

export function getCarrinhosDatasetRange(days = 30): CarrinhosDataRange {
  const today = new Date();

  return {
    startDate: toISODate(addDays(today, -days)),
    endDate: toISODate(today),
  };
}

function textValue(value: unknown) {
  if (value == null) return null;
  const text = String(value).trim();
  return text.length > 0 ? text : null;
}

function getPayloadField(payload: Record<string, unknown> | null, ...keys: string[]) {
  if (!payload) return null;

  for (const key of keys) {
    const value = textValue(payload[key]);
    if (value) return value;
  }

  return null;
}

function inferOrigin(payload: Record<string, unknown> | null): CarrinhoOrigem {
  const source = (
    getPayloadField(
      payload,
      "link.sources.utm_source",
      "utm_source",
      "tracking.utm_source",
      "source",
      "source_vendas"
    ) ?? ""
  ).toLowerCase();

  if (source.includes("google") || source.includes("gads")) return "google_ads";
  if (source.includes("tiktok") || source.includes("ttk")) return "tiktok_ads";
  if (source.includes("whatsapp") || source.includes("wpp")) return "whatsapp";
  if (source.includes("email") || source.includes("mautic")) return "email";
  if (source.includes("televendas") || source.includes("call")) return "televendas";
  if (
    source.includes("meta") ||
    source.includes("facebook") ||
    source.includes("instagram") ||
    source === "fb"
  ) {
    return "meta_ads";
  }

  return "organico";
}

function inferStatus(events: PaytEventRow[]): CarrinhoStatus {
  const latest = events[events.length - 1];
  const latestIsSale = latest.event_status === "paid" || latest.event_group === "sale";
  const hasPreviousNonPaid = events.some(
    (event) => event.event_status !== "paid" && event.event_group !== "sale"
  );

  if (latestIsSale && hasPreviousNonPaid) {
    return "recuperado";
  }

  if (latest.event_group === "loss") return "perdido";
  if (latest.event_group === "abandonment") return "abandonado";
  if (latest.event_group === "checkout") return "checkout";

  return "ativo";
}

function getLatestPaytEvent(events: PaytEventRow[]) {
  return events.reduce((latest, event) => {
    return new Date(event.event_at).getTime() > new Date(latest.event_at).getTime()
      ? event
      : latest;
  }, events[0]);
}

function isSaleEvent(event: PaytEventRow) {
  return event.event_status === "paid" || event.event_group === "sale";
}

function isLegacyRecoveredGroup(events: PaytEventRow[]) {
  const latest = getLatestPaytEvent(events);
  return (
    isSaleEvent(latest) &&
    events.some((event) => !isSaleEvent(event))
  );
}

function isLegacyMonitorGroup(events: PaytEventRow[]) {
  const latest = getLatestPaytEvent(events);
  return (
    !isSaleEvent(latest) &&
    ["checkout", "loss", "abandonment"].includes(latest.event_group)
  );
}

function getStage(status: CarrinhoStatus): CarrinhoEtapa {
  if (status === "recuperado" || status === "perdido") return "fechado";
  if (status === "em_recuperacao") return "recuperacao";
  if (status === "abandonado") return "recuperacao";
  if (status === "checkout") return "pagamento";
  return "produto";
}

function getFunnelStage(status: CarrinhoStatus): CarrinhoFunilEtapa {
  if (status === "recuperado") return "recuperado";
  if (status === "perdido") return "perdido";
  if (status === "checkout") return "checkout";
  if (status === "abandonado" || status === "em_recuperacao") return "abandonado";
  return "iniciado";
}

function getRecoveryStatus(status: CarrinhoStatus): CarrinhoRecoveryStatus {
  if (status === "recuperado") return "converted";
  if (status === "perdido") return "expired";
  if (status === "abandonado") return "sent";
  if (status === "checkout") return "scheduled";
  return "none";
}

function getRecoveryChannel(origin: CarrinhoOrigem): CarrinhoRecoveryChannel | null {
  if (origin === "email") return "email";
  if (origin === "televendas") return "televendas";
  if (origin === "whatsapp") return "whatsapp";
  if (origin === "meta_ads" || origin === "google_ads" || origin === "tiktok_ads") {
    return "whatsapp";
  }
  return null;
}

function buildRecoveryAttempts({
  externalId,
  latestEventAt,
  status,
  channel,
}: {
  externalId: string;
  latestEventAt: string;
  status: CarrinhoStatus;
  channel: CarrinhoRecoveryChannel | null;
}): CarrinhoRecoveryAttempt[] {
  if (!channel || status === "ativo") return [];

  const baseAttempt: CarrinhoRecoveryAttempt = {
    id: `${externalId}_attempt_1`,
    channel,
    status: status === "checkout" ? "scheduled" : "sent",
    label:
      status === "checkout"
        ? "Disparo preventivo agendado"
        : "Mensagem de recuperacao enviada",
    occurredAt: addMinutes(latestEventAt, 18),
  };

  if (status !== "recuperado") return [baseAttempt];

  return [
    baseAttempt,
    {
      id: `${externalId}_attempt_2`,
      channel,
      status: "converted",
      label: "Carrinho recuperado no checkout",
      occurredAt: addMinutes(latestEventAt, 42),
    },
  ];
}

function buildTimeline({
  externalId,
  events,
  attempts,
}: {
  externalId: string;
  events: PaytEventRow[];
  attempts: CarrinhoRecoveryAttempt[];
}): CarrinhoTimelineEvent[] {
  const eventItems = events.slice(0, 8).map<CarrinhoTimelineEvent>((event, index) => ({
    id: `${externalId}_event_${index}`,
    label: event.event_status.replace(/_/g, " "),
    description: event.event_name ?? event.event_group,
    occurredAt: event.event_at,
    tone:
      event.event_group === "sale"
        ? "success"
        : event.event_group === "loss"
          ? "danger"
          : event.event_group === "abandonment"
            ? "brand"
            : "neutral",
  }));

  const attemptItems = attempts.map<CarrinhoTimelineEvent>((attempt) => ({
    id: `${attempt.id}_timeline`,
    label: attempt.label,
    description: CARRINHO_RECOVERY_CHANNEL_LABELS[attempt.channel],
    occurredAt: attempt.occurredAt,
    tone: attempt.status === "converted" ? "success" : "brand",
  }));

  return [...eventItems, ...attemptItems].sort(
    (first, second) =>
      new Date(first.occurredAt).getTime() - new Date(second.occurredAt).getTime()
  );
}

function buildNextSteps(
  status: CarrinhoStatus,
  channel: CarrinhoRecoveryChannel | null
): CarrinhoNextStep[] {
  if (status === "recuperado") {
    return [
      {
        id: "post_purchase",
        title: "Validar pedido gerado",
        description: "Conferir pagamento e continuidade logistica do cliente.",
        priority: "normal",
      },
    ];
  }

  if (status === "perdido") {
    return [
      {
        id: "reactivation",
        title: "Enviar para reativacao",
        description: "Usar o evento como sinal para campanha de retorno.",
        priority: "low",
      },
    ];
  }

  if (status === "abandonado" || status === "checkout") {
    return [
      {
        id: "recover",
        title: channel
          ? `Recuperar por ${CARRINHO_RECOVERY_CHANNEL_LABELS[channel]}`
          : "Criar primeiro contato",
        description: "Atuar enquanto a intencao ainda esta quente.",
        priority: status === "abandonado" ? "high" : "normal",
      },
    ];
  }

  return [
    {
      id: "monitor",
      title: "Monitorar atividade",
      description: "Aguardar novo evento de checkout ou pagamento.",
      priority: "low",
    },
  ];
}

function mapEventsToCarrinho(events: PaytEventRow[]): Carrinho {
  const sortedEvents = [...events].sort(
    (first, second) =>
      new Date(first.event_at).getTime() - new Date(second.event_at).getTime()
  );
  const first = sortedEvents[0];
  const latest = sortedEvents[sortedEvents.length - 1];
  const sale = sortedEvents.findLast(
    (event) => event.event_status === "paid" || event.event_group === "sale"
  );
  const status = inferStatus(sortedEvents);
  const origin = inferOrigin(latest.payload);
  const recoveryChannel = getRecoveryChannel(origin);
  const externalId = latest.cart_id ?? latest.transaction_id ?? latest.event_key;
  const potentialValue =
    sortedEvents.findLast((event) => event.total_price != null)?.total_price ?? 0;
  const recoveredValue = status === "recuperado" ? sale?.total_price ?? potentialValue : null;
  const jars = latest.product_quantity ?? 1;
  const attempts = buildRecoveryAttempts({
    externalId,
    latestEventAt: latest.event_at,
    status,
    channel: recoveryChannel,
  });

  return {
    id: externalId,
    externalCartId: externalId,
    eventCount: sortedEvents.length,
    customerName: latest.customer_name ?? "Cliente sem nome",
    customerEmail: latest.customer_email,
    customerPhone: latest.customer_phone,
    customerDocument: latest.customer_doc,
    items: [
      {
        sku: latest.product_group ?? latest.product_name ?? "produto",
        productName: latest.product_name ?? latest.product_group ?? "Produto",
        variation: latest.payment_method ?? "Checkout Payt",
        jars,
        quantity: jars,
        unitPrice: jars > 0 ? potentialValue / jars : potentialValue,
      },
    ],
    productName: latest.product_name ?? latest.product_group ?? "Produto",
    productGroup: latest.product_group ?? latest.product_name ?? "Sem grupo",
    jars,
    variation: latest.payment_method ?? "Checkout Payt",
    potentialValue,
    recoveredValue,
    discountValue: null,
    stage: getStage(status),
    status,
    funnelStage: getFunnelStage(status),
    origin,
    campaign:
      getPayloadField(latest.payload, "link.sources.utm_campaign", "utm_campaign") ??
      "Sem campanha",
    recoveryStatus: getRecoveryStatus(status),
    recoveryChannel,
    recoveryAttempts: attempts,
    nextActionAt:
      status === "abandonado" || status === "checkout"
        ? addMinutes(latest.event_at, 30)
        : null,
    nextSteps: buildNextSteps(status, recoveryChannel),
    timeline: buildTimeline({ externalId, events: sortedEvents, attempts }),
    createdAt: first.event_at,
    lastActivityAt: latest.event_at,
  };
}

function compactCarrinhoForTable(carrinho: Carrinho): Carrinho {
  const latestTimelineEvent = carrinho.timeline.at(-1);
  const relevantNextStep = carrinho.nextSteps.at(0);

  return {
    ...carrinho,
    recoveryAttempts: [],
    nextSteps: relevantNextStep ? [relevantNextStep] : [],
    timeline: latestTimelineEvent ? [latestTimelineEvent] : [],
  };
}

function buildMetricsFromGroups(groupedEvents: PaytEventRow[][]) {
  const resumo = groupedEvents.reduce<CarrinhosResumo>(
    (acc, events) => {
      const sortedEvents = [...events].sort(
        (first, second) =>
          new Date(first.event_at).getTime() - new Date(second.event_at).getTime()
      );
      const status = inferStatus(sortedEvents);
      const potentialValue =
        sortedEvents.findLast((event) => event.total_price != null)?.total_price ?? 0;
      const sale = sortedEvents.findLast(isSaleEvent);
      const recoveredValue =
        status === "recuperado" ? sale?.total_price ?? potentialValue : 0;

      acc.total += 1;
      acc.receitaPotencial += potentialValue;
      acc.receitaRecuperada += recoveredValue;

      if (status === "checkout") acc.checkout += 1;
      if (status === "em_recuperacao") acc.emRecuperacao += 1;
      if (status === "abandonado" || status === "em_recuperacao") {
        acc.abandonados += 1;
      }
      if (status === "recuperado") acc.recuperados += 1;
      if (status === "perdido") acc.perdidos += 1;

      return acc;
    },
    {
      total: 0,
      checkout: 0,
      abandonados: 0,
      emRecuperacao: 0,
      recuperados: 0,
      perdidos: 0,
      receitaPotencial: 0,
      receitaRecuperada: 0,
      taxaRecuperacao: 0,
      ticketMedio: 0,
    }
  );
  const recoveryBase = resumo.abandonados + resumo.recuperados + resumo.perdidos;

  resumo.taxaRecuperacao = recoveryBase > 0 ? resumo.recuperados / recoveryBase : 0;
  resumo.ticketMedio = resumo.total > 0 ? resumo.receitaPotencial / resumo.total : 0;

  return {
    resumo,
    funil: {
      iniciado: resumo.total,
      checkout:
        resumo.checkout +
        resumo.abandonados +
        resumo.recuperados +
        resumo.perdidos,
      abandonado: resumo.abandonados + resumo.recuperados + resumo.perdidos,
      recuperado: resumo.recuperados,
      perdido: resumo.perdidos,
    } satisfies Record<CarrinhoFunilEtapa, number>,
  };
}

function isMissingEventStream(error: unknown) {
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  return (
    message.includes("payt_event_stream") ||
    message.includes("relation") ||
    message.includes("supabaseurl")
  );
}

function mapRawWebhookToPaytEventRow(raw: PaytRawWebhookRow): PaytEventRow {
  const row = buildPaytEventStreamRow(raw.payload);
  const createdAt = raw.received_at ?? row.event_at;

  return {
    ...row,
    created_at: createdAt,
  };
}

function safeMapRawWebhookToPaytEventRow(raw: PaytRawWebhookRow) {
  if (!raw.payload || typeof raw.payload !== "object") return null;

  try {
    return mapRawWebhookToPaytEventRow(raw);
  } catch {
    return null;
  }
}

function timestampValue(value: string | null | undefined) {
  if (!value) return null;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? null : time;
}

function sortPaytEventsByNewest(rows: PaytEventRow[]) {
  return [...rows].sort(
    (first, second) =>
      new Date(second.event_at).getTime() - new Date(first.event_at).getTime()
  );
}

function groupPaytEvents(rows: PaytEventRow[]) {
  return rows.reduce((map, row) => {
    const key = row.cart_id ?? row.transaction_id ?? row.event_key;
    const current = map.get(key) ?? [];
    current.push(row);
    map.set(key, current);
    return map;
  }, new Map<string, PaytEventRow[]>());
}

async function getLatestStreamEventAt(
  supabase: SupabaseServiceClient,
  startTs: string,
  endTs: string
) {
  const { data, error } = await supabase
    .from("payt_event_stream")
    .select("event_at")
    .gte("event_at", startTs)
    .lte("event_at", endTs)
    .order("event_at", { ascending: false })
    .limit(1);

  if (error) throw error;

  const latest = (data as Array<{ event_at?: string | null }> | null)?.[0];
  return timestampValue(latest?.event_at);
}

async function getLatestRawReceivedAt(
  supabase: SupabaseServiceClient,
  startTs: string,
  endTs: string
) {
  const { data, error } = await supabase
    .from("payt_webhooks_raw")
    .select("received_at")
    .gte("received_at", startTs)
    .lte("received_at", endTs)
    .order("received_at", { ascending: false })
    .limit(1);

  if (error) throw error;

  const latest = (data as Array<{ received_at?: string | null }> | null)?.[0];
  return timestampValue(latest?.received_at);
}

async function fetchStreamEventRows(
  supabase: SupabaseServiceClient,
  startTs: string,
  endTs: string,
  maxEvents: number | null
): Promise<CarrinhosEventFetchResult> {
  const rows: PaytEventRow[] = [];
  let reachedEventLimit = false;

  for (let offset = 0; ; offset += PAGE_SIZE) {
    if (maxEvents != null && offset >= maxEvents) break;

    const to = maxEvents == null
      ? offset + PAGE_SIZE - 1
      : Math.min(offset + PAGE_SIZE - 1, maxEvents - 1);

    const { data, error } = await supabase
      .from("payt_event_stream")
      .select(CARRINHOS_SELECT)
      .gte("event_at", startTs)
      .lte("event_at", endTs)
      .order("event_at", { ascending: false })
      .range(offset, to);

    if (error) throw error;
    if (!data || data.length === 0) break;

    rows.push(...(data as PaytEventRow[]));

    if (maxEvents != null && offset + data.length >= maxEvents) {
      reachedEventLimit = data.length === PAGE_SIZE;
      break;
    }
    if (data.length < PAGE_SIZE) break;
  }

  return {
    rows,
    reachedEventLimit,
    source: "payt_event_stream",
  };
}

async function fetchRawWebhookEventRows(
  supabase: SupabaseServiceClient,
  startTs: string,
  endTs: string,
  maxEvents: number | null
): Promise<CarrinhosEventFetchResult> {
  const rows: PaytEventRow[] = [];
  let reachedEventLimit = false;

  for (let offset = 0; ; offset += PAGE_SIZE) {
    if (maxEvents != null && offset >= maxEvents) break;

    const to = maxEvents == null
      ? offset + PAGE_SIZE - 1
      : Math.min(offset + PAGE_SIZE - 1, maxEvents - 1);

    const { data, error } = await supabase
      .from("payt_webhooks_raw")
      .select("payload, received_at")
      .gte("received_at", startTs)
      .lte("received_at", endTs)
      .order("received_at", { ascending: false })
      .range(offset, to);

    if (error) throw error;
    if (!data || data.length === 0) break;

    const mappedRows = (data as PaytRawWebhookRow[])
      .map(safeMapRawWebhookToPaytEventRow)
      .filter((event): event is PaytEventRow => event !== null)
      .filter((event) => event.event_at >= startTs && event.event_at <= endTs);

    rows.push(...mappedRows);

    if (maxEvents != null && offset + data.length >= maxEvents) {
      reachedEventLimit = data.length === PAGE_SIZE;
      break;
    }
    if (data.length < PAGE_SIZE) break;
  }

  return {
    rows,
    reachedEventLimit,
    source: "payt_webhooks_raw",
  };
}

async function fetchCurrentPeriodEvents(
  supabase: SupabaseServiceClient,
  startTs: string,
  endTs: string,
  maxEvents: number | null
) {
  try {
    const [streamLatest, rawLatest] = await Promise.all([
      getLatestStreamEventAt(supabase, startTs, endTs),
      getLatestRawReceivedAt(supabase, startTs, endTs),
    ]);
    const shouldPreferRaw =
      rawLatest !== null && (streamLatest === null || rawLatest > streamLatest);

    if (shouldPreferRaw) {
      const rawResult = await fetchRawWebhookEventRows(
        supabase,
        startTs,
        endTs,
        maxEvents
      );

      if (rawResult.rows.length > 0 || streamLatest === null) {
        return rawResult;
      }
    }

    const streamResult = await fetchStreamEventRows(
      supabase,
      startTs,
      endTs,
      maxEvents
    );

    if (streamResult.rows.length > 0 || rawLatest === null) {
      return streamResult;
    }

    return fetchRawWebhookEventRows(supabase, startTs, endTs, maxEvents);
  } catch (error) {
    if (!isMissingEventStream(error)) throw error;
    return fetchRawWebhookEventRows(supabase, startTs, endTs, maxEvents);
  }
}

async function fetchCarrinhosFromPaytEvents({
  startDate,
  endDate,
}: CarrinhosDataRange, options: CarrinhosFetchOptions = {}) {
  const supabase = createServiceClient();
  const maxTableCarts = options.maxTableCarts ?? null;
  const { startTs, endTs } = getUtcRangeForAppDates(startDate, endDate);
  const eventResult = await fetchCurrentPeriodEvents(
    supabase,
    startTs,
    endTs,
    null
  );
  const rows = sortPaytEventsByNewest(eventResult.rows);

  const groupedEvents = Array.from(groupPaytEvents(rows).values());
  const monitorGroups = groupedEvents.filter(isLegacyMonitorGroup);
  const metricGroups = [
    ...monitorGroups,
    ...groupedEvents.filter(isLegacyRecoveredGroup),
  ];
  const metrics = buildMetricsFromGroups(metricGroups);
  const tableGroups =
    maxTableCarts == null ? monitorGroups : monitorGroups.slice(0, maxTableCarts);
  const reachedTableLimit =
    maxTableCarts != null && monitorGroups.length > maxTableCarts;
  const carrinhos = tableGroups
    .map(mapEventsToCarrinho)
    .map(compactCarrinhoForTable)
    .sort(
      (first, second) =>
        new Date(second.lastActivityAt).getTime() -
        new Date(first.lastActivityAt).getTime()
    );

  return {
    carrinhos,
    reachedTableLimit,
    metrics,
  };
}

export async function getCarrinhosForFrontendData(
  range: CarrinhosDataRange,
  options: CarrinhosFetchOptions = {}
): Promise<CarrinhosFrontendData> {
  try {
    const maxTableCarts = options.maxTableCarts ?? null;
    const result = await fetchCarrinhosFromPaytEvents(range, options);

    return {
      carrinhos: result.carrinhos,
      metrics: result.metrics,
      source: "real",
      warning:
        maxTableCarts != null && result.reachedTableLimit
          ? `A tabela exibe os ${maxTableCarts.toLocaleString("pt-BR")} carrinhos mais recentes do recorte. Os KPIs consideram o período completo.`
          : undefined,
    };
  } catch (error) {
    if (!isMissingEventStream(error)) {
      console.error("[carrinhos] Erro ao buscar eventos Payt:", error);
    }

    if (!shouldUseMockData()) {
      throw error;
    }

    return {
      carrinhos: createMockCarrinhos(),
      source: "mock",
      warning:
        "Carrinhos reais indisponíveis; exibindo mock de fallback para revisão visual.",
    };
  }
}

export async function getCarrinhosForFrontend(
  range: CarrinhosDataRange
): Promise<Carrinho[]> {
  const data = await getCarrinhosForFrontendData(range);

  return data.carrinhos;
}

export function getCarrinhosInitialCartLimit() {
  return DEFAULT_TABLE_CART_LIMIT;
}
