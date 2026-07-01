import { createServiceClient } from "@/lib/supabase";
import {
  getTodayInAppTimezone,
  getUtcRangeForAppDates,
  shiftDateString,
} from "@/lib/app-dates";
import { shouldUseMockData } from "@/lib/data-mode";
import {
  createMockPedidos,
  type PedidoFormaPagamento,
  type PedidoStatusPagamento,
} from "@/lib/pedidos";
import { logServerTiming, timedServerTask } from "@/lib/server-timing";

const FINANCEIRO_PEDIDOS_SELECT =
  "valor_total, forma_pagamento, data_pagamento, status_pagamento, chargeback, payt_transaction_id";

/**
 * Campos do payt_event_stream usados para métricas financeiras.
 * Essa tabela é a fonte de verdade porque recebe TODOS os eventos da Payt
 * (tangíveis e não-tangíveis), ao contrário da tabela `pedidos` que ignora
 * produtos digitais/upsells (tangible=false).
 *
 * O campo `payload` contém `voce_recebe` (valor líquido que o produtor recebe
 * após taxas da Payt). Esse é o valor que a Payt chama de "Total das vendas".
 */
const EVENT_STREAM_SALE_SELECT =
  "transaction_id, event_status, total_price, paid_at, payment_method, event_at, payload";

const FINANCEIRO_PAGE_SIZE = 1000;

type FinancialMetrics = {
  chargebacks: number;
  valorChargebacks: number;
  reembolsos: number;
  valorReembolsos: number;
};

/** Métricas de reembolso/chargeback por data do evento (quando o evento aconteceu). */
type FinancialMetricsByEventDate = FinancialMetrics;

type FinanceiroPedidoSnapshot = {
  amount: number | null;
  /** Valor líquido que o produtor recebe (= "Total das vendas" na Payt). */
  voceRecebe: number | null;
  paidAt: string | null;
  paymentMethod: PedidoFormaPagamento | null;
  paymentStatus: PedidoStatusPagamento;
  transactionId: string | null;
};

type FinanceiroPedidoRow = {
  valor_total: number | null;
  forma_pagamento: string | null;
  data_pagamento: string | null;
  status_pagamento: string | null;
  chargeback: boolean | null;
  payt_transaction_id: string | null;
};

type FinancialEventRow = {
  transaction_id: string | null;
  event_status: string | null;
  total_price: number | string | null;
  event_at: string | null;
  paid_at: string | null;
};

type EventStreamSaleRow = {
  transaction_id: string | null;
  event_status: string | null;
  total_price: number | string | null;
  paid_at: string | null;
  payment_method: string | null;
  event_at: string | null;
  payload: Record<string, unknown> | null;
};

export type FinanceiroRange = {
  startDate: string;
  endDate: string;
};

export type FinanceiroPaymentMix = {
  method: PedidoFormaPagamento | "sem_metodo";
  label: string;
  orders: number;
  revenue: number;
};

export type FinanceiroDailyPoint = {
  day: string;
  receitaBruta: number;
  receitaLiquida: number;
  revertido: number;
};

export type FinanceiroRiskRow = {
  label: string;
  quantity: number;
  amount: number;
  tone: "red" | "gold" | "neutral";
};

export type FinanceiroPageData = {
  source: "mock" | "real";
  range: FinanceiroRange;
  receitaBruta: number;
  /** "Total das vendas" na Payt — valor líquido que o produtor recebe (soma de "Você Recebe"). */
  totalDasVendas: number;
  receitaLiquida: number;
  receitaRecebivel: number;
  taxaGateway: number;
  totalPedidos: number;
  ticketMedio: number;
  totalRevertido: number;
  taxaChargeback: number;
  chargebacks: number;
  valorChargebacks: number;
  reembolsos: number;
  valorReembolsos: number;
  /** Métricas de reembolso/chargeback por data do evento (quando efetivamente caiu). */
  eventDateChargebacks: number;
  eventDateValorChargebacks: number;
  eventDateReembolsos: number;
  eventDateValorReembolsos: number;
  eventDateTotalRevertido: number;
  cancelados: number;
  aguardandoPagamento: number;
  paymentMix: FinanceiroPaymentMix[];
  dailySeries: FinanceiroDailyPoint[];
  riskRows: FinanceiroRiskRow[];
};

function isMissingEventStream(error: unknown) {
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  return message.includes("payt_event_stream") || message.includes("relation") || message.includes("does not exist");
}

function numberValue(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
}

function normalizeFinanceiroPaymentStatus(
  status: string | null,
  chargeback: boolean | null
): PedidoStatusPagamento {
  const normalized = status?.toLowerCase() ?? "";

  if (chargeback || normalized === "chargeback" || normalized === "charged_back") {
    return "chargeback";
  }
  if (normalized === "paid") return "paid";
  if (normalized === "refunded" || normalized === "refund_requested") {
    return "refunded";
  }
  if (
    normalized === "cancelled" ||
    normalized === "canceled" ||
    normalized === "expired" ||
    normalized === "refused" ||
    normalized === "failed"
  ) {
    return "cancelled";
  }

  return "waiting_payment";
}

function normalizeFinanceiroPaymentMethod(value: string | null): PedidoFormaPagamento | null {
  const normalized = value?.toLowerCase() ?? "";

  if (!normalized) return null;
  if (normalized.includes("pix")) return "pix";
  if (normalized.includes("boleto") || normalized.includes("bank_slip")) return "boleto";
  if (normalized.includes("card") || normalized.includes("cartao") || normalized.includes("credit")) {
    return "credit_card";
  }

  return null;
}

function mapFinanceiroPedidoRow(row: FinanceiroPedidoRow): FinanceiroPedidoSnapshot {
  return {
    amount: row.valor_total,
    voceRecebe: null,
    paidAt: row.data_pagamento,
    paymentMethod: normalizeFinanceiroPaymentMethod(row.forma_pagamento),
    paymentStatus: normalizeFinanceiroPaymentStatus(
      row.status_pagamento,
      row.chargeback
    ),
    transactionId: row.payt_transaction_id,
  };
}

function mapMockPedidoToFinanceiroSnapshot(
  pedido: ReturnType<typeof createMockPedidos>[number]
): FinanceiroPedidoSnapshot {
  return {
    amount: pedido.amount,
    voceRecebe: pedido.amount ? pedido.amount * 0.72 : null,
    paidAt: pedido.paidAt,
    paymentMethod: pedido.paymentMethod,
    paymentStatus: pedido.paymentStatus,
    transactionId: null,
  };
}

/**
 * Busca vendas do payt_event_stream (fonte de verdade, inclui tangíveis + digitais).
 * Busca TODOS os eventos com event_group "sale" e "post_sale" cujo paid_at
 * está no período, para obter receita bruta + reversões pela data da compra.
 *
 * Fallback para tabela `pedidos` se event_stream não existir.
 */
async function getFinanceiroPedidosForFrontend(
  range: FinanceiroRange
): Promise<FinanceiroPedidoSnapshot[]> {
  const supabase = createServiceClient();
  const { startTs, endTs } = getUtcRangeForAppDates(
    range.startDate,
    range.endDate
  );

  try {
    // Buscar TODAS as vendas (paid) no período pela data de pagamento.
    const saleRows: EventStreamSaleRow[] = [];
    for (let offset = 0; ; offset += FINANCEIRO_PAGE_SIZE) {
      const { data, error } = await supabase
        .from("payt_event_stream")
        .select(EVENT_STREAM_SALE_SELECT)
        .eq("event_status", "paid")
        .gte("paid_at", startTs)
        .lte("paid_at", endTs)
        .order("paid_at", { ascending: false })
        .range(offset, offset + FINANCEIRO_PAGE_SIZE - 1);

      if (error) throw error;
      if (!data || data.length === 0) break;
      saleRows.push(...(data as EventStreamSaleRow[]));
      if (data.length < FINANCEIRO_PAGE_SIZE) break;
    }

    // Deduplicar por transaction_id (pode ter múltiplos eventos "paid" pro mesmo txn).
    const seenTransactions = new Map<string, FinanceiroPedidoSnapshot>();
    for (const row of saleRows) {
      const txnId = String(row.transaction_id ?? "").trim();
      if (!txnId || txnId.startsWith("cart:") || seenTransactions.has(txnId)) continue;
      // Extrair voce_recebe do payload (valor líquido = "Total das vendas" na Payt).
      const payloadVoceRecebe = row.payload?.voce_recebe;
      const voceRecebe = typeof payloadVoceRecebe === "number"
        ? payloadVoceRecebe
        : numberValue(
            typeof payloadVoceRecebe === "string"
              ? payloadVoceRecebe.replace(/R\$\s*/g, "").replace(/\./g, "").replace(",", ".")
              : payloadVoceRecebe
          );
      seenTransactions.set(txnId, {
        amount: numberValue(row.total_price),
        voceRecebe,
        paidAt: row.paid_at,
        paymentMethod: normalizeFinanceiroPaymentMethod(row.payment_method),
        paymentStatus: "paid",
        transactionId: txnId,
      });
    }

    // Buscar eventos de reversão (refunded/chargeback) cujo paid_at está no período,
    // para atualizar o status dos pedidos que já estão no mapa.
    const reversalRows: EventStreamSaleRow[] = [];
    for (let offset = 0; ; offset += FINANCEIRO_PAGE_SIZE) {
      const { data, error } = await supabase
        .from("payt_event_stream")
        .select(EVENT_STREAM_SALE_SELECT)
        .in("event_status", ["refunded", "chargeback", "charged_back"])
        .gte("paid_at", startTs)
        .lte("paid_at", endTs)
        .order("paid_at", { ascending: false })
        .range(offset, offset + FINANCEIRO_PAGE_SIZE - 1);

      if (error) throw error;
      if (!data || data.length === 0) break;
      reversalRows.push(...(data as EventStreamSaleRow[]));
      if (data.length < FINANCEIRO_PAGE_SIZE) break;
    }

    // Marcar reversões nos pedidos existentes (por data da compra).
    const reversedTransactions = new Set<string>();
    for (const row of reversalRows) {
      const txnId = String(row.transaction_id ?? "").trim();
      if (!txnId || reversedTransactions.has(txnId)) continue;
      reversedTransactions.add(txnId);

      const status: PedidoStatusPagamento =
        row.event_status === "refunded" ? "refunded" : "chargeback";

      if (seenTransactions.has(txnId)) {
        // Já existe como venda — atualizar status para refunded/chargeback.
        const existing = seenTransactions.get(txnId)!;
        existing.paymentStatus = status;
      } else {
        // Não tinha evento "paid" no período, mas tem reversão com paid_at no período.
        // Incluir como ever-paid com status de reversão.
        const rvPayload = row.payload?.voce_recebe;
        const rvVoceRecebe = typeof rvPayload === "number"
          ? rvPayload
          : numberValue(
              typeof rvPayload === "string"
                ? rvPayload.replace(/R\$\s*/g, "").replace(/\./g, "").replace(",", ".")
                : rvPayload
            );
        seenTransactions.set(txnId, {
          amount: numberValue(row.total_price),
          voceRecebe: rvVoceRecebe,
          paidAt: row.paid_at,
          paymentMethod: normalizeFinanceiroPaymentMethod(row.payment_method),
          paymentStatus: status,
          transactionId: txnId,
        });
      }
    }

    return Array.from(seenTransactions.values());
  } catch (error) {
    if (!isMissingEventStream(error)) throw error;

    // Fallback: tabela pedidos (sem upsells digitais).
    console.warn("[financeiro] payt_event_stream indisponível, usando tabela pedidos como fallback");
    const rows: FinanceiroPedidoRow[] = [];
    for (let offset = 0; ; offset += FINANCEIRO_PAGE_SIZE) {
      const { data, error: queryError } = await supabase
        .from("pedidos")
        .select(FINANCEIRO_PEDIDOS_SELECT)
        .gte("data_pagamento", startTs)
        .lte("data_pagamento", endTs)
        .order("data_pagamento", { ascending: false })
        .range(offset, offset + FINANCEIRO_PAGE_SIZE - 1);

      if (queryError) throw queryError;
      if (!data || data.length === 0) break;
      rows.push(...(data as FinanceiroPedidoRow[]));
      if (data.length < FINANCEIRO_PAGE_SIZE) break;
    }

    return rows.map(mapFinanceiroPedidoRow);
  }
}

/**
 * Busca eventos de reembolso/chargeback filtrados por `paid_at` (data da compra original).
 * Assim, um pedido comprado em janeiro e reembolsado em março aparece em janeiro.
 */
async function getFinancialEventRowsByPurchaseDate(
  supabase: ReturnType<typeof createServiceClient>,
  startTs: string,
  endTs: string
) {
  const rows: FinancialEventRow[] = [];

  for (let offset = 0; ; offset += FINANCEIRO_PAGE_SIZE) {
    const { data, error } = await supabase
      .from("payt_event_stream")
      .select("transaction_id, event_status, total_price, event_at, paid_at")
      .gte("paid_at", startTs)
      .lte("paid_at", endTs)
      .order("paid_at", { ascending: false })
      .in("event_status", ["refunded", "chargeback", "charged_back"])
      .range(offset, offset + FINANCEIRO_PAGE_SIZE - 1);

    if (error) throw error;
    if (!data || data.length === 0) break;

    rows.push(...(data as FinancialEventRow[]));

    if (data.length < FINANCEIRO_PAGE_SIZE) break;
  }

  return rows;
}

/**
 * Busca eventos de reembolso/chargeback filtrados por `event_at` (data do evento).
 * Visão secundária: "quanto foi descontado neste mês".
 */
async function getFinancialEventRowsByEventDate(
  supabase: ReturnType<typeof createServiceClient>,
  startTs: string,
  endTs: string
) {
  const rows: FinancialEventRow[] = [];

  for (let offset = 0; ; offset += FINANCEIRO_PAGE_SIZE) {
    const { data, error } = await supabase
      .from("payt_event_stream")
      .select("transaction_id, event_status, total_price, event_at, paid_at")
      .gte("event_at", startTs)
      .lte("event_at", endTs)
      .order("event_at", { ascending: false })
      .in("event_status", ["refunded", "chargeback", "charged_back"])
      .range(offset, offset + FINANCEIRO_PAGE_SIZE - 1);

    if (error) throw error;
    if (!data || data.length === 0) break;

    rows.push(...(data as FinancialEventRow[]));

    if (data.length < FINANCEIRO_PAGE_SIZE) break;
  }

  return rows;
}

function aggregateEventMetrics(rows: FinancialEventRow[]): FinancialMetrics {
  const latestRefundByTransaction = new Map<string, number>();
  const latestChargebackByTransaction = new Map<string, number>();

  for (const row of rows) {
    const transactionId = String(row.transaction_id ?? "").trim();
    if (!transactionId) continue;

    const targetMap =
      row.event_status === "refunded" ? latestRefundByTransaction : latestChargebackByTransaction;
    if (!targetMap.has(transactionId)) {
      targetMap.set(transactionId, numberValue(row.total_price));
    }
  }

  return {
    chargebacks: latestChargebackByTransaction.size,
    valorChargebacks: Array.from(latestChargebackByTransaction.values()).reduce((sum, value) => sum + value, 0),
    reembolsos: latestRefundByTransaction.size,
    valorReembolsos: Array.from(latestRefundByTransaction.values()).reduce((sum, value) => sum + value, 0),
  };
}

/**
 * Retorna métricas de reembolso/chargeback em DUAS visões:
 * - `byPurchaseDate`: filtrado pela data da compra original (paid_at)
 * - `byEventDate`: filtrado pela data do evento de reembolso/chargeback (event_at)
 */
export async function getFinancialEventMetrics(
  startDate: string,
  endDate: string
): Promise<{ byPurchaseDate: FinancialMetrics; byEventDate: FinancialMetricsByEventDate }> {
  const supabase = createServiceClient();
  const { startTs, endTs } = getUtcRangeForAppDates(startDate, endDate);

  try {
    const [purchaseDateRows, eventDateRows] = await Promise.all([
      getFinancialEventRowsByPurchaseDate(supabase, startTs, endTs),
      getFinancialEventRowsByEventDate(supabase, startTs, endTs),
    ]);

    return {
      byPurchaseDate: aggregateEventMetrics(purchaseDateRows),
      byEventDate: aggregateEventMetrics(eventDateRows),
    };
  } catch (error) {
    if (!isMissingEventStream(error)) throw error;

    const { data, error: rpcError } = await supabase.rpc("metricas_financeiras", {
      p_start: startTs,
      p_end: endTs,
    });

    if (rpcError) throw rpcError;

    const fallback: FinancialMetrics = {
      chargebacks: Number((data as FinancialMetrics | null)?.chargebacks ?? 0),
      valorChargebacks: Number((data as FinancialMetrics | null)?.valorChargebacks ?? 0),
      reembolsos: Number((data as FinancialMetrics | null)?.reembolsos ?? 0),
      valorReembolsos: Number((data as FinancialMetrics | null)?.valorReembolsos ?? 0),
    };

    return { byPurchaseDate: fallback, byEventDate: fallback };
  }
}

function toDateInput(value: string | null) {
  return value ? value.slice(0, 10) : "";
}

function roundCurrency(value: number) {
  return Math.round(value * 100) / 100;
}

function methodLabel(method: FinanceiroPaymentMix["method"]) {
  if (method === "credit_card") return "Cartão";
  if (method === "pix") return "Pix";
  if (method === "boleto") return "Boleto";
  return "Sem método";
}

function statusAmount(
  pedidos: FinanceiroPedidoSnapshot[],
  status: PedidoStatusPagamento
) {
  return pedidos
    .filter((pedido) => pedido.paymentStatus === status)
    .reduce((total, pedido) => total + (pedido.amount ?? 0), 0);
}

function buildDailySeries(
  pedidos: FinanceiroPedidoSnapshot[],
  range: FinanceiroRange
) {
  const series: FinanceiroDailyPoint[] = [];
  for (let day = range.startDate; day <= range.endDate; day = shiftDateString(day, 1)) {
    const dayPedidos = pedidos.filter((pedido) => toDateInput(pedido.paidAt) === day);
    // Receita bruta = tudo que foi pago (paid + refunded + chargeback)
    const receitaBruta = dayPedidos
      .filter((pedido) => EVER_PAID_STATUSES.includes(pedido.paymentStatus))
      .reduce((total, pedido) => total + (pedido.amount ?? 0), 0);
    // Revertido = valor dos pedidos que viraram reembolso ou chargeback (pela data da compra)
    const revertido = dayPedidos
      .filter(
        (pedido) =>
          pedido.paymentStatus === "chargeback" ||
          pedido.paymentStatus === "refunded"
      )
      .reduce((total, pedido) => total + (pedido.amount ?? 0), 0);

    series.push({
      day,
      receitaBruta: roundCurrency(receitaBruta),
      receitaLiquida: roundCurrency(receitaBruta - revertido),
      revertido: roundCurrency(revertido),
    });
  }

  return series;
}

/**
 * Status que indicam que o pedido FOI pago em algum momento (inclui reembolsados e chargebacks).
 * Receita bruta = tudo que foi pago na PayT (purchase + upsell), sem descontar reversões.
 */
const EVER_PAID_STATUSES: PedidoStatusPagamento[] = ["paid", "refunded", "chargeback"];

function buildFinanceiroPageData({
  pedidos,
  range,
  source,
  financialMetricsByPurchaseDate,
  financialMetricsByEventDate,
}: {
  pedidos: FinanceiroPedidoSnapshot[];
  range: FinanceiroRange;
  source: "mock" | "real";
  financialMetricsByPurchaseDate?: FinancialMetrics;
  financialMetricsByEventDate?: FinancialMetricsByEventDate;
}): FinanceiroPageData {
  // Receita bruta: TODOS os pedidos que foram pagos, incluindo os que depois viraram
  // refunded ou chargeback. Isso reflete o valor total vendido na PayT.
  const pedidosEverPaid = pedidos.filter((pedido) =>
    EVER_PAID_STATUSES.includes(pedido.paymentStatus)
  );
  const receitaBruta = roundCurrency(
    pedidosEverPaid.reduce((total, pedido) => total + (pedido.amount ?? 0), 0)
  );
  const totalPedidos = pedidosEverPaid.length;

  // Reembolsos e chargebacks por DATA DA COMPRA (visão principal).
  const chargebacks = financialMetricsByPurchaseDate?.chargebacks ??
    pedidos.filter((pedido) => pedido.paymentStatus === "chargeback").length;
  const valorChargebacks =
    financialMetricsByPurchaseDate?.valorChargebacks ?? statusAmount(pedidos, "chargeback");
  const reembolsos = financialMetricsByPurchaseDate?.reembolsos ??
    pedidos.filter((pedido) => pedido.paymentStatus === "refunded").length;
  const valorReembolsos =
    financialMetricsByPurchaseDate?.valorReembolsos ?? statusAmount(pedidos, "refunded");

  // Reembolsos e chargebacks por DATA DO EVENTO (visão secundária).
  const eventDateChargebacks = financialMetricsByEventDate?.chargebacks ?? chargebacks;
  const eventDateValorChargebacks = financialMetricsByEventDate?.valorChargebacks ?? valorChargebacks;
  const eventDateReembolsos = financialMetricsByEventDate?.reembolsos ?? reembolsos;
  const eventDateValorReembolsos = financialMetricsByEventDate?.valorReembolsos ?? valorReembolsos;
  const eventDateTotalRevertido = roundCurrency(eventDateValorChargebacks + eventDateValorReembolsos);

  const cancelados = pedidos.filter((pedido) => pedido.paymentStatus === "cancelled").length;
  const aguardandoPagamento = pedidos.filter(
    (pedido) => pedido.paymentStatus === "waiting_payment"
  ).length;

  // "Total das vendas" na Payt = soma de "Você Recebe" (líquido após taxas da plataforma).
  const totalDasVendas = roundCurrency(
    pedidosEverPaid.reduce((total, pedido) => total + (pedido.voceRecebe ?? 0), 0)
  );

  // Receita líquida = bruta - reversões (por data da compra).
  const totalRevertido = roundCurrency(valorChargebacks + valorReembolsos);
  const receitaLiquida = roundCurrency(receitaBruta - totalRevertido);
  const taxaGateway = roundCurrency(receitaBruta * 0.047);
  const receitaRecebivel = roundCurrency(receitaLiquida - taxaGateway);

  // Mix de pagamento: pedidos que estão efetivamente "paid" agora (sem reembolsados).
  const pedidosCurrentlyPaid = pedidos.filter((p) => p.paymentStatus === "paid");
  const paymentMix = Array.from(
    pedidosCurrentlyPaid.reduce((map, pedido) => {
      const method = pedido.paymentMethod ?? "sem_metodo";
      const current =
        map.get(method) ??
        ({
          method,
          label: methodLabel(method),
          orders: 0,
          revenue: 0,
        } satisfies FinanceiroPaymentMix);

      current.orders += 1;
      current.revenue += pedido.amount ?? 0;
      map.set(method, current);
      return map;
    }, new Map<FinanceiroPaymentMix["method"], FinanceiroPaymentMix>())
  )
    .map(([, value]) => ({ ...value, revenue: roundCurrency(value.revenue) }))
    .sort((first, second) => second.revenue - first.revenue);

  return {
    source,
    range,
    receitaBruta,
    totalDasVendas,
    receitaLiquida,
    receitaRecebivel,
    taxaGateway,
    totalPedidos,
    ticketMedio: totalPedidos > 0 ? receitaBruta / totalPedidos : 0,
    totalRevertido,
    taxaChargeback: totalPedidos > 0 ? chargebacks / totalPedidos : 0,
    chargebacks,
    valorChargebacks: roundCurrency(valorChargebacks),
    reembolsos,
    valorReembolsos: roundCurrency(valorReembolsos),
    eventDateChargebacks,
    eventDateValorChargebacks: roundCurrency(eventDateValorChargebacks),
    eventDateReembolsos,
    eventDateValorReembolsos: roundCurrency(eventDateValorReembolsos),
    eventDateTotalRevertido,
    cancelados,
    aguardandoPagamento,
    paymentMix,
    dailySeries: buildDailySeries(pedidos, range),
    riskRows: [
      {
        label: "Chargebacks",
        quantity: chargebacks,
        amount: roundCurrency(valorChargebacks),
        tone: "red",
      },
      {
        label: "Reembolsos",
        quantity: reembolsos,
        amount: roundCurrency(valorReembolsos),
        tone: "gold",
      },
      {
        label: "Cancelados",
        quantity: cancelados,
        amount: statusAmount(pedidos, "cancelled"),
        tone: "neutral",
      },
      {
        label: "Aguardando pagamento",
        quantity: aguardandoPagamento,
        amount: statusAmount(pedidos, "waiting_payment"),
        tone: "neutral",
      },
    ],
  };
}

export function getDefaultFinanceiroRange(days = 30): FinanceiroRange {
  const today = getTodayInAppTimezone();
  return {
    startDate: shiftDateString(today, -(days - 1)),
    endDate: today,
  };
}

export function createMockFinanceiroData(
  range = getDefaultFinanceiroRange()
): FinanceiroPageData {
  const pedidos = createMockPedidos().filter((pedido) => {
    const paidDate = toDateInput(pedido.paidAt);
    return paidDate >= range.startDate && paidDate <= range.endDate;
  }).map(mapMockPedidoToFinanceiroSnapshot);

  return buildFinanceiroPageData({
    pedidos,
    range,
    source: "mock",
  });
}

export async function getFinanceiroPageData(
  range = getDefaultFinanceiroRange()
): Promise<FinanceiroPageData> {
  if (shouldUseMockData()) {
    return createMockFinanceiroData(range);
  }

  const queriesStartedAt = performance.now();
  const [pedidos, eventMetrics] = await Promise.all([
    timedServerTask("financeiro", "data.pedidosPagos", () =>
      getFinanceiroPedidosForFrontend(range)
    ),
    timedServerTask("financeiro", "data.eventosFinanceiros", () =>
      getFinancialEventMetrics(range.startDate, range.endDate)
    ),
  ]);
  logServerTiming("financeiro", "data.queriesTotal", queriesStartedAt);

  return buildFinanceiroPageData({
    pedidos,
    range,
    source: "real",
    financialMetricsByPurchaseDate: eventMetrics.byPurchaseDate,
    financialMetricsByEventDate: eventMetrics.byEventDate,
  });
}
