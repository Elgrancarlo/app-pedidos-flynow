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

const FINANCEIRO_PEDIDOS_SELECT =
  "valor_total, forma_pagamento, data_pagamento, status_pagamento, chargeback";

const FINANCEIRO_PAGE_SIZE = 1000;

type FinancialMetrics = {
  chargebacks: number;
  valorChargebacks: number;
  reembolsos: number;
  valorReembolsos: number;
};

type FinanceiroPedidoSnapshot = {
  amount: number | null;
  paidAt: string | null;
  paymentMethod: PedidoFormaPagamento | null;
  paymentStatus: PedidoStatusPagamento;
};

type FinanceiroPedidoRow = {
  valor_total: number | null;
  forma_pagamento: string | null;
  data_pagamento: string | null;
  status_pagamento: string | null;
  chargeback: boolean | null;
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
    paidAt: row.data_pagamento,
    paymentMethod: normalizeFinanceiroPaymentMethod(row.forma_pagamento),
    paymentStatus: normalizeFinanceiroPaymentStatus(
      row.status_pagamento,
      row.chargeback
    ),
  };
}

function mapMockPedidoToFinanceiroSnapshot(
  pedido: ReturnType<typeof createMockPedidos>[number]
): FinanceiroPedidoSnapshot {
  return {
    amount: pedido.amount,
    paidAt: pedido.paidAt,
    paymentMethod: pedido.paymentMethod,
    paymentStatus: pedido.paymentStatus,
  };
}

async function getFinanceiroPedidosForFrontend(
  range: FinanceiroRange
): Promise<FinanceiroPedidoSnapshot[]> {
  const supabase = createServiceClient();
  const { startTs, endTs } = getUtcRangeForAppDates(
    range.startDate,
    range.endDate
  );
  const rows: FinanceiroPedidoRow[] = [];

  for (let offset = 0; ; offset += FINANCEIRO_PAGE_SIZE) {
    const { data, error } = await supabase
      .from("pedidos")
      .select(FINANCEIRO_PEDIDOS_SELECT)
      .gte("data_pagamento", startTs)
      .lte("data_pagamento", endTs)
      .order("data_pagamento", { ascending: false })
      .range(offset, offset + FINANCEIRO_PAGE_SIZE - 1);

    if (error) {
      throw error;
    }

    if (!data || data.length === 0) break;

    rows.push(...(data as FinanceiroPedidoRow[]));

    if (data.length < FINANCEIRO_PAGE_SIZE) break;
  }

  return rows.map(mapFinanceiroPedidoRow);
}

export async function getFinancialEventMetrics(startDate: string, endDate: string): Promise<FinancialMetrics> {
  const supabase = createServiceClient();
  const { startTs, endTs } = getUtcRangeForAppDates(startDate, endDate);

  try {
    const { data, error } = await supabase
      .from("payt_event_stream")
      .select("transaction_id, event_status, total_price, event_at")
      .gte("event_at", startTs)
      .lte("event_at", endTs)
      .order("event_at", { ascending: false })
      .in("event_status", ["refunded", "chargeback", "charged_back"]);

    if (error) throw error;

    const latestRefundByTransaction = new Map<string, number>();
    const latestChargebackByTransaction = new Map<string, number>();

    for (const row of data ?? []) {
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
  } catch (error) {
    if (!isMissingEventStream(error)) throw error;

    const { data } = await supabase.rpc("metricas_financeiras", {
      p_start: startTs,
      p_end: endTs,
    });

    return {
      chargebacks: Number((data as FinancialMetrics | null)?.chargebacks ?? 0),
      valorChargebacks: Number((data as FinancialMetrics | null)?.valorChargebacks ?? 0),
      reembolsos: Number((data as FinancialMetrics | null)?.reembolsos ?? 0),
      valorReembolsos: Number((data as FinancialMetrics | null)?.valorReembolsos ?? 0),
    };
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
    const receitaBruta = dayPedidos
      .filter((pedido) => pedido.paymentStatus === "paid")
      .reduce((total, pedido) => total + (pedido.amount ?? 0), 0);
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

function buildFinanceiroPageData({
  pedidos,
  range,
  source,
  financialMetrics,
}: {
  pedidos: FinanceiroPedidoSnapshot[];
  range: FinanceiroRange;
  source: "mock" | "real";
  financialMetrics?: FinancialMetrics;
}): FinanceiroPageData {
  const pedidosPagos = pedidos.filter((pedido) => pedido.paymentStatus === "paid");
  const receitaBruta = roundCurrency(
    pedidosPagos.reduce((total, pedido) => total + (pedido.amount ?? 0), 0)
  );
  const totalPedidos = pedidosPagos.length;
  const chargebacks = financialMetrics?.chargebacks ?? pedidos.filter((pedido) => pedido.paymentStatus === "chargeback").length;
  const valorChargebacks =
    financialMetrics?.valorChargebacks ?? statusAmount(pedidos, "chargeback");
  const reembolsos = financialMetrics?.reembolsos ?? pedidos.filter((pedido) => pedido.paymentStatus === "refunded").length;
  const valorReembolsos =
    financialMetrics?.valorReembolsos ?? statusAmount(pedidos, "refunded");
  const cancelados = pedidos.filter((pedido) => pedido.paymentStatus === "cancelled").length;
  const aguardandoPagamento = pedidos.filter(
    (pedido) => pedido.paymentStatus === "waiting_payment"
  ).length;
  const totalRevertido = roundCurrency(valorChargebacks + valorReembolsos);
  const receitaLiquida = roundCurrency(receitaBruta - totalRevertido);
  const taxaGateway = roundCurrency(receitaBruta * 0.047);
  const receitaRecebivel = roundCurrency(receitaLiquida - taxaGateway);

  const paymentMix = Array.from(
    pedidosPagos.reduce((map, pedido) => {
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

  const [pedidos, financialMetrics] = await Promise.all([
    getFinanceiroPedidosForFrontend(range),
    getFinancialEventMetrics(range.startDate, range.endDate),
  ]);

  return buildFinanceiroPageData({
    pedidos,
    range,
    source: "real",
    financialMetrics,
  });
}
