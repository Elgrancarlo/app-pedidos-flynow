export type PedidoPeriodoPreset = "today" | "7d" | "15d" | "30d" | "month";

export type PedidoStatusPagamento =
  | "paid"
  | "waiting_payment"
  | "refunded"
  | "chargeback"
  | "cancelled";

export type PedidoStatusLogistico =
  | "pago"
  | "nota_fiscal"
  | "separacao"
  | "aguardando_postagem"
  | "postado"
  | "em_transporte"
  | "aguardando_retirada"
  | "entregue"
  | "devolvido";

export type PedidoFormaPagamento = "credit_card" | "pix" | "boleto";

export type PedidoCanal = "checkout" | "upsell" | "downsell" | "televendas";

export type PedidoProblema = "chargeback" | "reembolso" | "atrasado" | null;

export type PedidoApiPayload = {
  id: string;
  payt_transaction_id: string;
  payt_cart_id?: string | null;
  order_number?: number | null;
  customer: {
    name: string;
    email?: string | null;
    phone?: string | null;
    document?: string | null;
  };
  product: {
    name?: string | null;
    group?: string | null;
    jars?: number | null;
  };
  payment: {
    status: PedidoStatusPagamento;
    method?: PedidoFormaPagamento | null;
    installments?: number | null;
    paid_at?: string | null;
    amount?: number | null;
  };
  logistics: {
    status: PedidoStatusLogistico;
    tracking_code?: string | null;
    promised_at?: string | null;
    delivered_at?: string | null;
    logistics_received_at?: string | null;
  };
  invoice?: {
    number?: string | null;
    amount?: number | null;
  } | null;
  issue?: PedidoProblema;
  created_at: string;
  updated_at: string;
};

export type Pedido = {
  id: string;
  paytTransactionId: string;
  paytCartId: string | null;
  orderNumber: number | null;
  customerName: string;
  customerEmail: string | null;
  customerPhone: string | null;
  customerDocument: string | null;
  productName: string | null;
  productGroup: string | null;
  jars: number | null;
  amount: number | null;
  paymentMethod: PedidoFormaPagamento | null;
  installments: number | null;
  paidAt: string | null;
  paymentStatus: PedidoStatusPagamento;
  logisticsStatus: PedidoStatusLogistico;
  trackingCode: string | null;
  promisedAt: string | null;
  deliveredAt: string | null;
  logisticsReceivedAt: string | null;
  invoiceNumber: string | null;
  invoiceAmount: number | null;
  channel: PedidoCanal;
  issue: PedidoProblema;
  createdAt: string;
  updatedAt: string;
};

export type PedidoFinanceiroResumo = {
  chargebacks: number;
  valorChargebacks: number;
  reembolsos: number;
  valorReembolsos: number;
};

export const PEDIDOS_TOTAL_MOCK = 3803;

export const PEDIDO_STATUS_LOGISTICO_LABELS: Record<
  PedidoStatusLogistico,
  string
> = {
  pago: "Pago",
  nota_fiscal: "Nota fiscal",
  separacao: "Separacao",
  aguardando_postagem: "Aguard. postagem",
  postado: "Postado",
  em_transporte: "Em transito",
  aguardando_retirada: "Saiu p/ entrega",
  entregue: "Entregue",
  devolvido: "Devolvido",
};

export const PEDIDO_STATUS_PAGAMENTO_LABELS: Record<
  PedidoStatusPagamento,
  string
> = {
  paid: "Pago",
  waiting_payment: "Aguardando pagamento",
  refunded: "Reembolsado",
  chargeback: "Chargeback",
  cancelled: "Cancelado",
};

export const PEDIDO_FORMA_PAGAMENTO_LABELS: Record<
  PedidoFormaPagamento,
  string
> = {
  credit_card: "Cartao",
  pix: "Pix",
  boleto: "Boleto",
};

export const PEDIDO_CANAL_LABELS: Record<PedidoCanal, string> = {
  checkout: "Checkout",
  upsell: "Upsell",
  downsell: "Downsell",
  televendas: "Televendas",
};

export const PEDIDO_LOGISTICS_PIPELINE: PedidoStatusLogistico[] = [
  "pago",
  "nota_fiscal",
  "separacao",
  "aguardando_postagem",
  "postado",
  "em_transporte",
  "aguardando_retirada",
  "entregue",
  "devolvido",
];

const FIRST_NAMES = [
  "Ana",
  "Anderson",
  "Carlos",
  "Claudia",
  "Daniela",
  "Donei",
  "Elaine",
  "Fabiana",
  "Fernanda",
  "Joao",
  "Juliana",
  "Leandro",
  "Luiz",
  "Marcia",
  "Neusa",
  "Patricia",
  "Renata",
  "Roselea",
  "Silvio",
  "Vanessa",
];

const LAST_NAMES = [
  "Almeida",
  "Araujo",
  "Azevedo",
  "Barbosa",
  "Costa",
  "da Silva",
  "Faria Goncalves",
  "Lima",
  "Mendes",
  "Oliveira",
  "Pereira",
  "Rocha",
  "Santos",
  "Soares",
  "Souza",
];

const PRODUCTS = [
  { group: "Power 66", name: "Power 66", base: 197 },
  {
    group: "Power 66 (Televendas)",
    name: "Power 66 - Televendas",
    base: 197,
  },
  {
    group: "DERMA BLOOM (TELEVENDAS)",
    name: "Derma Bloom - Televendas",
    base: 197,
  },
  { group: "Derma Bloom", name: "Derma Bloom", base: 189 },
  { group: "Glico Reset", name: "Glico Reset", base: 167 },
  { group: "Lift Prime", name: "Lift Prime", base: 147 },
];

const PAYMENT_METHODS: PedidoFormaPagamento[] = ["credit_card", "pix", "boleto"];
const CHANNELS: PedidoCanal[] = ["checkout", "upsell", "downsell", "televendas"];

function pad(value: number, size: number) {
  return String(value).padStart(size, "0");
}

function toISODate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number) {
  const nextDate = new Date(date);
  nextDate.setDate(date.getDate() + days);
  return nextDate;
}

function makeTransactionCode(index: number) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let seed = index * 1103515245 + 12345;

  return Array.from({ length: 7 }, () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return alphabet[seed % alphabet.length];
  }).join("");
}

function logisticsStatusForIndex(index: number): PedidoStatusLogistico {
  if (index <= 1392) return "aguardando_postagem";
  if (index <= 3463) return "postado";
  if (index <= 3722) return "em_transporte";
  if (index <= 3764) return "entregue";
  if (index <= 3803) return "devolvido";
  return "separacao";
}

function paymentStatusForIndex(index: number): PedidoStatusPagamento {
  if (index % 97 === 0) return "chargeback";
  if (index % 143 === 0) return "refunded";
  if (index % 41 === 0) return "cancelled";
  if (index % 11 === 0) return "waiting_payment";
  return "paid";
}

function issueForPedido(
  index: number,
  paymentStatus: PedidoStatusPagamento,
  logisticsStatus: PedidoStatusLogistico
): PedidoProblema {
  if (paymentStatus === "chargeback") return "chargeback";
  if (paymentStatus === "refunded") return "reembolso";
  if (
    index % 29 === 0 &&
    !["entregue", "devolvido"].includes(logisticsStatus)
  ) {
    return "atrasado";
  }

  return null;
}

export function getDefaultPedidosRange() {
  const today = new Date();
  const start = addDays(today, -7);

  return {
    startDate: toISODate(start),
    endDate: toISODate(today),
  };
}

export function getPresetPedidosRange(preset: PedidoPeriodoPreset) {
  const today = new Date();

  if (preset === "today") {
    return { startDate: toISODate(today), endDate: toISODate(today) };
  }

  if (preset === "month") {
    return {
      startDate: toISODate(new Date(today.getFullYear(), today.getMonth(), 1)),
      endDate: toISODate(today),
    };
  }

  const days = Number(preset.replace("d", ""));
  return {
    startDate: toISODate(addDays(today, -days)),
    endDate: toISODate(today),
  };
}

export function formatPedidosRange(startDate: string, endDate: string) {
  const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
  });
  const start = new Date(`${startDate}T12:00:00`);
  const end = new Date(`${endDate}T12:00:00`);

  return `${dateFormatter.format(start)} - ${dateFormatter.format(end)}`;
}

export function createMockPedidos(total = PEDIDOS_TOTAL_MOCK): Pedido[] {
  const baseDate = new Date("2026-05-28T12:00:00");

  return Array.from({ length: total }, (_, rawIndex) => {
    const index = rawIndex + 1;
    const paidAt = addDays(baseDate, -(rawIndex % 8));
    const logisticsStatus = logisticsStatusForIndex(index);
    const paymentStatus = paymentStatusForIndex(index);
    const product = PRODUCTS[rawIndex % PRODUCTS.length];
    const jars = [1, 3, 6, 2, 4][rawIndex % 5];
    const customerName = `${FIRST_NAMES[rawIndex % FIRST_NAMES.length]} ${
      LAST_NAMES[(rawIndex * 3) % LAST_NAMES.length]
    }`;
    const normalizedName = customerName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ".");
    const amount =
      product.base * jars -
      (rawIndex % 4 === 0 ? 9 : 0) +
      (rawIndex % 7 === 0 ? 18 : 0);
    const transactionId = makeTransactionCode(index);
    const hasTracking = !["pago", "nota_fiscal", "separacao"].includes(
      logisticsStatus
    );
    const createdAt = `${toISODate(addDays(paidAt, -1))}T${pad(
      8 + (rawIndex % 10),
      2
    )}:14:00.000Z`;
    const issue = issueForPedido(index, paymentStatus, logisticsStatus);

    return {
      id: `pedido_mock_${pad(index, 5)}`,
      paytTransactionId: transactionId,
      paytCartId: `cart_${pad(index, 6)}`,
      orderNumber: 120000 + index,
      customerName,
      customerEmail: `${normalizedName}${pad(index % 997, 3)}@gmail.com`,
      customerPhone: `11${pad(900000000 + ((index * 7919) % 99999999), 9)}`,
      customerDocument: `${pad(10000000000 + index * 37, 11)}`,
      productName: product.name,
      productGroup: product.group,
      jars,
      amount,
      paymentMethod: PAYMENT_METHODS[rawIndex % PAYMENT_METHODS.length],
      installments: rawIndex % 3 === 0 ? 6 : rawIndex % 5 === 0 ? 3 : 1,
      paidAt: `${toISODate(paidAt)}T${pad(9 + (rawIndex % 9), 2)}:32:00.000Z`,
      paymentStatus,
      logisticsStatus,
      trackingCode: hasTracking ? `FN${pad(820000000 + index * 17, 9)}BR` : null,
      promisedAt: `${toISODate(addDays(paidAt, 7 + (rawIndex % 4)))}T21:00:00.000Z`,
      deliveredAt:
        logisticsStatus === "entregue"
          ? `${toISODate(addDays(paidAt, 5 + (rawIndex % 2)))}T18:00:00.000Z`
          : null,
      logisticsReceivedAt:
        logisticsStatus === "pago"
          ? null
          : `${toISODate(addDays(paidAt, 1))}T15:30:00.000Z`,
      invoiceNumber:
        logisticsStatus === "pago" ? null : `NF-${pad(56000 + index, 6)}`,
      invoiceAmount: logisticsStatus === "pago" ? null : amount,
      channel: CHANNELS[rawIndex % CHANNELS.length],
      issue,
      createdAt,
      updatedAt: `${toISODate(addDays(paidAt, rawIndex % 3))}T18:42:00.000Z`,
    };
  });
}

export function getPedidosContagemPorStatus(pedidos: Pedido[]) {
  return pedidos.reduce<Record<PedidoStatusLogistico, number>>(
    (acc, pedido) => {
      acc[pedido.logisticsStatus] += 1;
      return acc;
    },
    {
      pago: 0,
      nota_fiscal: 0,
      separacao: 0,
      aguardando_postagem: 0,
      postado: 0,
      em_transporte: 0,
      aguardando_retirada: 0,
      entregue: 0,
      devolvido: 0,
    }
  );
}

export function getPedidosFinanceiroResumo(
  pedidos: Pedido[]
): PedidoFinanceiroResumo {
  return pedidos.reduce<PedidoFinanceiroResumo>(
    (acc, pedido) => {
      if (pedido.paymentStatus === "chargeback") {
        acc.chargebacks += 1;
        acc.valorChargebacks += pedido.amount ?? 0;
      }

      if (pedido.paymentStatus === "refunded") {
        acc.reembolsos += 1;
        acc.valorReembolsos += pedido.amount ?? 0;
      }

      return acc;
    },
    {
      chargebacks: 0,
      valorChargebacks: 0,
      reembolsos: 0,
      valorReembolsos: 0,
    }
  );
}

export function getPedidosValorPago(pedidos: Pedido[]) {
  return pedidos
    .filter((pedido) => pedido.paymentStatus === "paid")
    .reduce((total, pedido) => total + (pedido.amount ?? 0), 0);
}
