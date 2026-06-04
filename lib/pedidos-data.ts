import {
  createServiceClient,
  type Pedido as PedidoRow,
} from "@/lib/supabase";
import {
  PEDIDO_LOGISTICS_PIPELINE,
  type Pedido,
  type PedidoCanal,
  type PedidoFinanceiroResumo,
  type PedidoFormaPagamento,
  type PedidoProblema,
  type PedidoStatusLogistico,
  type PedidoStatusPagamento,
} from "@/lib/pedidos";

const PEDIDOS_SELECT =
  "id, payt_transaction_id, payt_cart_id, ordem_pedido, cliente_nome, cliente_email, cliente_telefone, cliente_cpf, produto_nome, produto_grupo, qtd_potes, valor_total, forma_pagamento, parcelas, data_pagamento, status, status_pagamento, chargeback, codigo_rastreio, data_entrega, data_prometida_entrega, data_chegou_logistica, nfc_numero, nfc_valor, created_at, updated_at";

const PAGE_SIZE = 1000;
const DEFAULT_REAL_INITIAL_LIMIT = 1500;

// Frontend contract: the current real-data view is scoped by payment date.
// Pending-payment rows should be added through the adapter before enabling that UI slice.
export const PEDIDOS_REAL_DATE_FIELD = "data_pagamento";

type PedidosDataRange = {
  startDate: string;
  endDate: string;
};

type PedidosFetchOptions = {
  maxRows?: number;
};

export type PedidosRealInitialMetrics = {
  contagem: Record<PedidoStatusLogistico, number>;
  financeiro: PedidoFinanceiroResumo;
  valorPago: number;
};

function toISODate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number) {
  const nextDate = new Date(date);
  nextDate.setDate(date.getDate() + days);
  return nextDate;
}

export function getPedidosDatasetRange(days = 30): PedidosDataRange {
  const today = new Date();

  return {
    startDate: toISODate(addDays(today, -days)),
    endDate: toISODate(today),
  };
}

function normalizePaymentStatus(
  status: string | null,
  chargeback: boolean
): PedidoStatusPagamento {
  const normalized = status?.toLowerCase() ?? "";

  if (chargeback || normalized === "chargeback" || normalized === "charged_back") {
    return "chargeback";
  }

  if (normalized === "paid") {
    return "paid";
  }

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

function normalizePaymentMethod(value: string | null): PedidoFormaPagamento | null {
  const normalized = value?.toLowerCase() ?? "";

  if (!normalized) return null;
  if (normalized.includes("pix")) return "pix";
  if (normalized.includes("boleto") || normalized.includes("bank_slip")) return "boleto";
  if (normalized.includes("card") || normalized.includes("cartao") || normalized.includes("credit")) {
    return "credit_card";
  }

  return null;
}

function normalizeLogisticsStatus(value: string | null): PedidoStatusLogistico {
  return PEDIDO_LOGISTICS_PIPELINE.includes(value as PedidoStatusLogistico)
    ? (value as PedidoStatusLogistico)
    : "pago";
}

function emptyStatusCounts(): Record<PedidoStatusLogistico, number> {
  return PEDIDO_LOGISTICS_PIPELINE.reduce(
    (acc, status) => {
      acc[status] = 0;
      return acc;
    },
    {} as Record<PedidoStatusLogistico, number>
  );
}

function rangeStartTs(range: PedidosDataRange) {
  return `${range.startDate}T00:00:00Z`;
}

function rangeEndTs(range: PedidosDataRange) {
  return `${range.endDate}T23:59:59Z`;
}

function inferPedidoCanal(row: PedidoRow): PedidoCanal {
  const text = `${row.produto_nome ?? ""} ${row.produto_grupo ?? ""}`.toLowerCase();

  if (text.includes("televendas")) return "televendas";
  if (text.includes("downsell") || /\bdown\b/.test(text)) return "downsell";
  if (text.includes("upsell") || /\bup\s*1\b/.test(text) || /\bup\s*2\b/.test(text)) {
    return "upsell";
  }

  return "checkout";
}

function inferPedidoIssue(
  row: PedidoRow,
  paymentStatus: PedidoStatusPagamento
): PedidoProblema {
  if (paymentStatus === "chargeback") return "chargeback";
  if (paymentStatus === "refunded") return "reembolso";

  const logisticsStatus = normalizeLogisticsStatus(row.status);
  if (
    row.data_prometida_entrega &&
    new Date(row.data_prometida_entrega).getTime() < Date.now() &&
    !["entregue", "devolvido"].includes(logisticsStatus)
  ) {
    return "atrasado";
  }

  return null;
}

export function mapPedidoRowToPedido(row: PedidoRow): Pedido {
  const paymentStatus = normalizePaymentStatus(
    row.status_pagamento,
    row.chargeback
  );

  return {
    id: row.id,
    paytTransactionId: row.payt_transaction_id,
    paytCartId: row.payt_cart_id,
    orderNumber: row.ordem_pedido,
    customerName: row.cliente_nome,
    customerEmail: row.cliente_email,
    customerPhone: row.cliente_telefone,
    customerDocument: row.cliente_cpf,
    productName: row.produto_nome,
    productGroup: row.produto_grupo,
    jars: row.qtd_potes,
    amount: row.valor_total,
    paymentMethod: normalizePaymentMethod(row.forma_pagamento),
    installments: row.parcelas,
    paidAt: row.data_pagamento,
    paymentStatus,
    logisticsStatus: normalizeLogisticsStatus(row.status),
    trackingCode: row.codigo_rastreio,
    promisedAt: row.data_prometida_entrega,
    deliveredAt: row.data_entrega,
    logisticsReceivedAt: row.data_chegou_logistica,
    invoiceNumber: row.nfc_numero,
    invoiceAmount: row.nfc_valor,
    channel: inferPedidoCanal(row),
    issue: inferPedidoIssue(row, paymentStatus),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getPedidosForFrontend({
  startDate,
  endDate,
}: PedidosDataRange, options: PedidosFetchOptions = {}): Promise<Pedido[]> {
  const supabase = createServiceClient();
  const rows: PedidoRow[] = [];
  const maxRows = options.maxRows ?? null;

  for (let offset = 0; ; offset += PAGE_SIZE) {
    const to = maxRows == null
      ? offset + PAGE_SIZE - 1
      : Math.min(offset + PAGE_SIZE - 1, maxRows - 1);

    const { data, error } = await supabase
      .from("pedidos")
      .select(PEDIDOS_SELECT)
      .gte(PEDIDOS_REAL_DATE_FIELD, `${startDate}T00:00:00Z`)
      .lte(PEDIDOS_REAL_DATE_FIELD, `${endDate}T23:59:59Z`)
      .order("ordem_pedido", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .range(offset, to);

    if (error) {
      console.error("[pedidos] Erro ao buscar pedidos:", error.message);
      break;
    }

    if (!data || data.length === 0) break;

    rows.push(...(data as PedidoRow[]));

    if (maxRows != null && rows.length >= maxRows) break;
    if (data.length < PAGE_SIZE) break;
  }

  const seen = new Set<string>();
  return rows
    .filter((row) => {
      if (seen.has(row.id)) return false;
      seen.add(row.id);
      return true;
    })
    .map(mapPedidoRowToPedido);
}

async function getPedidosContagemReal(
  range: PedidosDataRange
): Promise<Record<PedidoStatusLogistico, number>> {
  const supabase = createServiceClient();
  const counts = emptyStatusCounts();
  const { data, error } = await supabase.rpc("contagem_por_status", {
    p_start: rangeStartTs(range),
    p_end: rangeEndTs(range),
  });

  if (error) {
    throw error;
  }

  for (const row of data ?? []) {
    const status = normalizeLogisticsStatus(row.status);
    counts[status] += Number(row.total ?? 0);
  }

  return counts;
}

async function getPedidosFinanceiroReal(
  range: PedidosDataRange
): Promise<PedidoFinanceiroResumo> {
  const supabase = createServiceClient();
  const { data, error } = await supabase.rpc("metricas_financeiras", {
    p_start: rangeStartTs(range),
    p_end: rangeEndTs(range),
  });

  if (error) {
    throw error;
  }

  return {
    chargebacks: Number(data?.chargebacks ?? 0),
    valorChargebacks: Number(data?.valorChargebacks ?? 0),
    reembolsos: Number(data?.reembolsos ?? 0),
    valorReembolsos: Number(data?.valorReembolsos ?? 0),
  };
}

async function getPedidosValorPagoReal(range: PedidosDataRange) {
  const supabase = createServiceClient();
  let valorPago = 0;

  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data, error } = await supabase
      .from("pedidos")
      .select("valor_total")
      .gte(PEDIDOS_REAL_DATE_FIELD, rangeStartTs(range))
      .lte(PEDIDOS_REAL_DATE_FIELD, rangeEndTs(range))
      .eq("status_pagamento", "paid")
      .order("created_at", { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) {
      throw error;
    }

    if (!data || data.length === 0) break;

    valorPago += data.reduce(
      (sum, row) => sum + Number(row.valor_total ?? 0),
      0
    );

    if (data.length < PAGE_SIZE) break;
  }

  return valorPago;
}

export async function getPedidosRealInitialMetrics(
  range: PedidosDataRange,
  fallbackPedidos: Pedido[]
): Promise<PedidosRealInitialMetrics> {
  try {
    const [contagem, financeiro, valorPago] = await Promise.all([
      getPedidosContagemReal(range),
      getPedidosFinanceiroReal(range),
      getPedidosValorPagoReal(range),
    ]);

    return { contagem, financeiro, valorPago };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[pedidos] Erro ao buscar métricas agregadas:", message);

    const contagem = emptyStatusCounts();
    let valorPago = 0;
    const financeiro: PedidoFinanceiroResumo = {
      chargebacks: 0,
      valorChargebacks: 0,
      reembolsos: 0,
      valorReembolsos: 0,
    };

    for (const pedido of fallbackPedidos) {
      contagem[pedido.logisticsStatus] += 1;
      if (pedido.paymentStatus === "paid") {
        valorPago += pedido.amount ?? 0;
      }
      if (pedido.paymentStatus === "chargeback") {
        financeiro.chargebacks += 1;
        financeiro.valorChargebacks += pedido.amount ?? 0;
      }
      if (pedido.paymentStatus === "refunded") {
        financeiro.reembolsos += 1;
        financeiro.valorReembolsos += pedido.amount ?? 0;
      }
    }

    return { contagem, financeiro, valorPago };
  }
}

export function getPedidosInitialRealLimit() {
  return DEFAULT_REAL_INITIAL_LIMIT;
}
