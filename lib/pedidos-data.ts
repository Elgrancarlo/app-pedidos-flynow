import {
  createServiceClient,
  type Pedido as PedidoRow,
} from "@/lib/supabase";
import {
  PEDIDO_LOGISTICS_PIPELINE,
  type Pedido,
  type PedidoCanal,
  type PedidoFormaPagamento,
  type PedidoProblema,
  type PedidoStatusLogistico,
  type PedidoStatusPagamento,
} from "@/lib/pedidos";

const PEDIDOS_SELECT =
  "id, payt_transaction_id, payt_cart_id, ordem_pedido, cliente_nome, cliente_email, cliente_telefone, cliente_cpf, produto_nome, produto_grupo, qtd_potes, valor_total, forma_pagamento, parcelas, data_pagamento, status, status_pagamento, chargeback, codigo_rastreio, data_entrega, data_prometida_entrega, data_chegou_logistica, nfc_numero, nfc_valor, created_at, updated_at";

const PAGE_SIZE = 1000;

type PedidosDataRange = {
  startDate: string;
  endDate: string;
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
}: PedidosDataRange): Promise<Pedido[]> {
  const supabase = createServiceClient();
  const rows: PedidoRow[] = [];

  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data, error } = await supabase
      .from("pedidos")
      .select(PEDIDOS_SELECT)
      .gte("data_pagamento", `${startDate}T00:00:00Z`)
      .lte("data_pagamento", `${endDate}T23:59:59Z`)
      .order("ordem_pedido", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) {
      console.error("[pedidos] Erro ao buscar pedidos:", error.message);
      break;
    }

    if (!data || data.length === 0) break;

    rows.push(...(data as PedidoRow[]));

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
