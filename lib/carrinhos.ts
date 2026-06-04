import { getTodayInAppTimezone, shiftDateString } from "@/lib/app-dates";

export type CarrinhoPeriodoPreset = "today" | "7d" | "15d" | "30d" | "month";

export type CarrinhoStatus =
  | "ativo"
  | "checkout"
  | "abandonado"
  | "em_recuperacao"
  | "recuperado"
  | "perdido";

export type CarrinhoEtapa =
  | "produto"
  | "checkout"
  | "pagamento"
  | "recuperacao"
  | "fechado";

export type CarrinhoFunilEtapa =
  | "iniciado"
  | "checkout"
  | "abandonado"
  | "recuperado"
  | "perdido";

export type CarrinhoOrigem =
  | "meta_ads"
  | "google_ads"
  | "tiktok_ads"
  | "whatsapp"
  | "email"
  | "organico"
  | "televendas";

export type CarrinhoRecoveryChannel =
  | "whatsapp"
  | "email"
  | "sms"
  | "televendas";

export type CarrinhoRecoveryStatus =
  | "none"
  | "scheduled"
  | "sent"
  | "responded"
  | "converted"
  | "expired";

export type CarrinhoApiPayload = {
  id: string;
  external_cart_id: string;
  customer: {
    name: string;
    email?: string | null;
    phone?: string | null;
    document?: string | null;
  };
  items: Array<{
    sku: string;
    product_name: string;
    variation?: string | null;
    quantity: number;
    unit_price: number;
  }>;
  totals: {
    potential_value: number;
    recovered_value?: number | null;
    discount_value?: number | null;
  };
  stage: CarrinhoEtapa;
  status: CarrinhoStatus;
  source: CarrinhoOrigem;
  campaign?: string | null;
  recovery?: {
    status: CarrinhoRecoveryStatus;
    channel?: CarrinhoRecoveryChannel | null;
    attempts?: number | null;
    next_action_at?: string | null;
  } | null;
  created_at: string;
  last_activity_at: string;
};

export type CarrinhoItem = {
  sku: string;
  productName: string;
  variation: string;
  jars: number;
  quantity: number;
  unitPrice: number;
};

export type CarrinhoTimelineEvent = {
  id: string;
  label: string;
  description: string;
  occurredAt: string;
  tone: "neutral" | "brand" | "success" | "danger";
};

export type CarrinhoRecoveryAttempt = {
  id: string;
  channel: CarrinhoRecoveryChannel;
  status: CarrinhoRecoveryStatus;
  label: string;
  occurredAt: string;
};

export type CarrinhoNextStep = {
  id: string;
  title: string;
  description: string;
  priority: "high" | "normal" | "low";
};

export type Carrinho = {
  id: string;
  externalCartId: string;
  eventCount?: number;
  customerName: string;
  customerEmail: string | null;
  customerPhone: string | null;
  customerDocument: string | null;
  items: CarrinhoItem[];
  productName: string;
  productGroup: string;
  jars: number;
  variation: string;
  potentialValue: number;
  recoveredValue: number | null;
  discountValue: number | null;
  stage: CarrinhoEtapa;
  status: CarrinhoStatus;
  funnelStage: CarrinhoFunilEtapa;
  origin: CarrinhoOrigem;
  campaign: string;
  recoveryStatus: CarrinhoRecoveryStatus;
  recoveryChannel: CarrinhoRecoveryChannel | null;
  recoveryAttempts: CarrinhoRecoveryAttempt[];
  nextActionAt: string | null;
  nextSteps: CarrinhoNextStep[];
  timeline: CarrinhoTimelineEvent[];
  createdAt: string;
  lastActivityAt: string;
};

export type CarrinhosResumo = {
  total: number;
  checkout: number;
  abandonados: number;
  emRecuperacao: number;
  recuperados: number;
  perdidos: number;
  receitaPotencial: number;
  receitaRecuperada: number;
  taxaRecuperacao: number;
  ticketMedio: number;
};

export const CARRINHOS_TOTAL_MOCK = 236;

export const CARRINHO_FUNIL_PIPELINE: CarrinhoFunilEtapa[] = [
  "iniciado",
  "checkout",
  "abandonado",
  "recuperado",
  "perdido",
];

export const CARRINHO_STATUS_LABELS: Record<CarrinhoStatus, string> = {
  ativo: "Ativo",
  checkout: "Checkout",
  abandonado: "Abandonado",
  em_recuperacao: "Em recuperacao",
  recuperado: "Recuperado",
  perdido: "Perdido",
};

export const CARRINHO_ETAPA_LABELS: Record<CarrinhoEtapa, string> = {
  produto: "Produto",
  checkout: "Checkout",
  pagamento: "Pagamento",
  recuperacao: "Recuperacao",
  fechado: "Fechado",
};

export const CARRINHO_FUNIL_LABELS: Record<CarrinhoFunilEtapa, string> = {
  iniciado: "Iniciado",
  checkout: "Checkout",
  abandonado: "Abandonado",
  recuperado: "Recuperado",
  perdido: "Perdido",
};

export const CARRINHO_ORIGEM_LABELS: Record<CarrinhoOrigem, string> = {
  meta_ads: "Meta Ads",
  google_ads: "Google Ads",
  tiktok_ads: "TikTok Ads",
  whatsapp: "WhatsApp",
  email: "E-mail",
  organico: "Organico",
  televendas: "Televendas",
};

export const CARRINHO_RECOVERY_CHANNEL_LABELS: Record<
  CarrinhoRecoveryChannel,
  string
> = {
  whatsapp: "WhatsApp",
  email: "E-mail",
  sms: "SMS",
  televendas: "Televendas",
};

export const CARRINHO_RECOVERY_STATUS_LABELS: Record<
  CarrinhoRecoveryStatus,
  string
> = {
  none: "Sem automacao",
  scheduled: "Agendado",
  sent: "Enviado",
  responded: "Respondido",
  converted: "Convertido",
  expired: "Expirado",
};

const FIRST_NAMES = [
  "Ana",
  "Anderson",
  "Bruna",
  "Carlos",
  "Claudia",
  "Daniela",
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
  "Silvio",
  "Vanessa",
  "Vitor",
];

const LAST_NAMES = [
  "Almeida",
  "Araujo",
  "Azevedo",
  "Barbosa",
  "Costa",
  "Faria",
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
  { group: "Power 66", name: "Power 66", sku: "PWR-66", base: 197 },
  { group: "Derma Bloom", name: "Derma Bloom", sku: "DRM-BLM", base: 189 },
  { group: "Glico Reset", name: "Glico Reset", sku: "GLC-RST", base: 167 },
  { group: "Lift Prime", name: "Lift Prime", sku: "LFT-PRM", base: 147 },
  {
    group: "Power 66 Televendas",
    name: "Power 66 - Televendas",
    sku: "PWR-66-TV",
    base: 197,
  },
  {
    group: "Derma Bloom Televendas",
    name: "Derma Bloom - Televendas",
    sku: "DRM-BLM-TV",
    base: 189,
  },
];

const CAMPAIGNS = [
  "frio-escala-cbo",
  "remarketing-24h",
  "direto-whatsapp",
  "black-friday-lead",
  "criativo-vsl-03",
  "lista-quente-email",
  "lookalike-compradores",
  "televendas-recuperacao",
];

const ORIGINS: CarrinhoOrigem[] = [
  "meta_ads",
  "google_ads",
  "tiktok_ads",
  "whatsapp",
  "email",
  "organico",
  "televendas",
];

const CHANNELS: CarrinhoRecoveryChannel[] = [
  "whatsapp",
  "email",
  "sms",
  "televendas",
];

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

function addMinutes(date: Date, minutes: number) {
  const nextDate = new Date(date);
  nextDate.setMinutes(date.getMinutes() + minutes);
  return nextDate;
}

function makeCartCode(index: number) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let seed = index * 2654435761 + 1013904223;

  return Array.from({ length: 8 }, () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return alphabet[seed % alphabet.length];
  }).join("");
}

function getStatusForIndex(index: number): CarrinhoStatus {
  if (index % 19 === 0) return "perdido";
  if (index % 11 === 0) return "recuperado";
  if (index % 7 === 0) return "em_recuperacao";
  if (index % 3 === 0) return "abandonado";
  if (index % 5 === 0) return "checkout";
  return "ativo";
}

function getStageForStatus(
  status: CarrinhoStatus,
  index: number
): CarrinhoEtapa {
  if (status === "recuperado" || status === "perdido") return "fechado";
  if (status === "em_recuperacao") return "recuperacao";
  if (status === "abandonado") return index % 2 === 0 ? "pagamento" : "checkout";
  if (status === "checkout") return index % 2 === 0 ? "pagamento" : "checkout";
  return index % 4 === 0 ? "checkout" : "produto";
}

function getFunnelStage(status: CarrinhoStatus): CarrinhoFunilEtapa {
  if (status === "recuperado") return "recuperado";
  if (status === "perdido") return "perdido";
  if (status === "abandonado" || status === "em_recuperacao") {
    return "abandonado";
  }
  if (status === "checkout") return "checkout";
  return "iniciado";
}

function getRecoveryStatus(status: CarrinhoStatus): CarrinhoRecoveryStatus {
  if (status === "recuperado") return "converted";
  if (status === "perdido") return "expired";
  if (status === "em_recuperacao") return "responded";
  if (status === "abandonado") return "sent";
  if (status === "checkout") return "scheduled";
  return "none";
}

function buildRecoveryAttempts({
  id,
  status,
  channel,
  lastActivityAt,
}: {
  id: string;
  status: CarrinhoStatus;
  channel: CarrinhoRecoveryChannel | null;
  lastActivityAt: Date;
}): CarrinhoRecoveryAttempt[] {
  if (!channel || status === "ativo") {
    return [];
  }

  const firstAttempt = addMinutes(lastActivityAt, 18);
  const attempts: CarrinhoRecoveryAttempt[] = [
    {
      id: `${id}_attempt_1`,
      channel,
      status: status === "checkout" ? "scheduled" : "sent",
      label:
        status === "checkout"
          ? "Disparo preventivo agendado"
          : "Mensagem de recuperacao enviada",
      occurredAt: firstAttempt.toISOString(),
    },
  ];

  if (status === "em_recuperacao" || status === "recuperado") {
    attempts.push({
      id: `${id}_attempt_2`,
      channel,
      status: "responded",
      label: "Cliente respondeu ao contato",
      occurredAt: addMinutes(firstAttempt, 42).toISOString(),
    });
  }

  if (status === "recuperado") {
    attempts.push({
      id: `${id}_attempt_3`,
      channel,
      status: "converted",
      label: "Carrinho recuperado no checkout",
      occurredAt: addMinutes(firstAttempt, 96).toISOString(),
    });
  }

  if (status === "perdido") {
    attempts.push({
      id: `${id}_attempt_2`,
      channel,
      status: "expired",
      label: "Janela de recuperacao expirada",
      occurredAt: addMinutes(firstAttempt, 210).toISOString(),
    });
  }

  return attempts;
}

function buildTimeline({
  id,
  status,
  createdAt,
  lastActivityAt,
  recoveryAttempts,
}: {
  id: string;
  status: CarrinhoStatus;
  createdAt: Date;
  lastActivityAt: Date;
  recoveryAttempts: CarrinhoRecoveryAttempt[];
}): CarrinhoTimelineEvent[] {
  const timeline: CarrinhoTimelineEvent[] = [
    {
      id: `${id}_created`,
      label: "Carrinho iniciado",
      description: "Cliente adicionou o primeiro item.",
      occurredAt: createdAt.toISOString(),
      tone: "brand",
    },
    {
      id: `${id}_activity`,
      label: "Ultima atividade",
      description:
        status === "checkout"
          ? "Cliente avancou para checkout."
          : "Sessao registrada pelo mock H7.",
      occurredAt: lastActivityAt.toISOString(),
      tone: "neutral",
    },
  ];

  recoveryAttempts.forEach((attempt) => {
    timeline.push({
      id: `${attempt.id}_timeline`,
      label: attempt.label,
      description: CARRINHO_RECOVERY_CHANNEL_LABELS[attempt.channel],
      occurredAt: attempt.occurredAt,
      tone:
        attempt.status === "converted"
          ? "success"
          : attempt.status === "expired"
            ? "danger"
            : "brand",
    });
  });

  return timeline.sort(
    (first, second) =>
      new Date(first.occurredAt).getTime() -
      new Date(second.occurredAt).getTime()
  );
}

function buildNextSteps({
  status,
  channel,
  nextActionAt,
}: {
  status: CarrinhoStatus;
  channel: CarrinhoRecoveryChannel | null;
  nextActionAt: string | null;
}): CarrinhoNextStep[] {
  if (status === "recuperado") {
    return [
      {
        id: "post_purchase",
        title: "Acompanhar pagamento",
        description: "Validar evento de pedido e envio para este cliente.",
        priority: "normal",
      },
    ];
  }

  if (status === "perdido") {
    return [
      {
        id: "audience",
        title: "Enviar para publico de reativacao",
        description: "Usar como sinal para campanha fria de 7 dias.",
        priority: "low",
      },
    ];
  }

  if (status === "em_recuperacao") {
    return [
      {
        id: "reply",
        title: "Priorizar resposta",
        description: "Cliente ja interagiu. O tempo de resposta muda a conversao.",
        priority: "high",
      },
      {
        id: "coupon",
        title: "Oferecer incentivo leve",
        description: "Cupom controlado para preservar margem.",
        priority: "normal",
      },
    ];
  }

  if (status === "abandonado" || status === "checkout") {
    return [
      {
        id: "message",
        title: channel
          ? `Proximo contato por ${CARRINHO_RECOVERY_CHANNEL_LABELS[channel]}`
          : "Agendar primeiro contato",
        description: nextActionAt
          ? "Manter janela curta antes do esfriamento."
          : "Criar automacao de recuperacao para esta origem.",
        priority: status === "abandonado" ? "high" : "normal",
      },
    ];
  }

  return [
    {
      id: "watch",
      title: "Monitorar intencao",
      description: "Aguardar avancos sem pressionar a jornada.",
      priority: "low",
    },
  ];
}

export function getDefaultCarrinhosRange() {
  const today = getTodayInAppTimezone();

  return {
    startDate: today,
    endDate: today,
  };
}

export function getPresetCarrinhosRange(preset: CarrinhoPeriodoPreset) {
  const today = getTodayInAppTimezone();

  if (preset === "today") {
    return { startDate: today, endDate: today };
  }

  if (preset === "month") {
    return {
      startDate: `${today.slice(0, 8)}01`,
      endDate: today,
    };
  }

  const days = Number(preset.replace("d", ""));
  return {
    startDate: shiftDateString(today, -(days - 1)),
    endDate: today,
  };
}

export function formatCarrinhosRange(startDate: string, endDate: string) {
  const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
  });
  const start = new Date(`${startDate}T12:00:00`);
  const end = new Date(`${endDate}T12:00:00`);

  return `${dateFormatter.format(start)} - ${dateFormatter.format(end)}`;
}

export function createMockCarrinhos(total = CARRINHOS_TOTAL_MOCK): Carrinho[] {
  const baseDate = new Date();
  baseDate.setHours(15, 30, 0, 0);

  return Array.from({ length: total }, (_, rawIndex) => {
    const index = rawIndex + 1;
    const status = getStatusForIndex(index);
    const stage = getStageForStatus(status, index);
    const product = PRODUCTS[rawIndex % PRODUCTS.length];
    const jars = [1, 3, 6, 2, 4][rawIndex % 5];
    const potentialValue =
      product.base * jars -
      (rawIndex % 4 === 0 ? 10 : 0) +
      (rawIndex % 8 === 0 ? 24 : 0);
    const recoveredValue =
      status === "recuperado" ? Math.round(potentialValue * 0.94) : null;
    const discountValue =
      status === "recuperado" || status === "em_recuperacao"
        ? Math.max(potentialValue - (recoveredValue ?? potentialValue - 18), 0)
        : null;
    const lastActivityAt = addMinutes(
      addDays(baseDate, -(rawIndex % 18)),
      -((rawIndex * 37) % 920)
    );
    const createdAt = addMinutes(lastActivityAt, -(18 + (rawIndex % 7) * 16));
    const origin = ORIGINS[rawIndex % ORIGINS.length];
    const campaign = CAMPAIGNS[(rawIndex * 3) % CAMPAIGNS.length];
    const recoveryStatus = getRecoveryStatus(status);
    const recoveryChannel =
      recoveryStatus === "none" ? null : CHANNELS[(rawIndex * 2) % CHANNELS.length];
    const nextActionAt =
      status === "abandonado" || status === "checkout" || status === "em_recuperacao"
        ? addMinutes(lastActivityAt, 45 + (rawIndex % 6) * 30).toISOString()
        : null;
    const customerName = `${FIRST_NAMES[rawIndex % FIRST_NAMES.length]} ${
      LAST_NAMES[(rawIndex * 5) % LAST_NAMES.length]
    }`;
    const normalizedName = customerName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ".");
    const cartCode = makeCartCode(index);
    const id = `cart_mock_${pad(index, 5)}`;
    const recoveryAttempts = buildRecoveryAttempts({
      id,
      status,
      channel: recoveryChannel,
      lastActivityAt,
    });

    return {
      id,
      externalCartId: `H7-${pad(index, 5)}-${cartCode.slice(0, 4)}`,
      customerName,
      customerEmail:
        index % 12 === 0
          ? null
          : `${normalizedName}${pad(index % 997, 3)}@gmail.com`,
      customerPhone:
        index % 9 === 0
          ? null
          : `11${pad(900000000 + ((index * 7919) % 99999999), 9)}`,
      customerDocument: index % 5 === 0 ? null : `${pad(10000000000 + index * 43, 11)}`,
      items: [
        {
          sku: `${product.sku}-${jars}P`,
          productName: product.name,
          variation: `${jars} potes`,
          jars,
          quantity: 1,
          unitPrice: potentialValue,
        },
      ],
      productName: product.name,
      productGroup: product.group,
      jars,
      variation: `${jars} potes`,
      potentialValue,
      recoveredValue,
      discountValue,
      stage,
      status,
      funnelStage: getFunnelStage(status),
      origin,
      campaign,
      recoveryStatus,
      recoveryChannel,
      recoveryAttempts,
      nextActionAt,
      nextSteps: buildNextSteps({ status, channel: recoveryChannel, nextActionAt }),
      timeline: buildTimeline({
        id,
        status,
        createdAt,
        lastActivityAt,
        recoveryAttempts,
      }),
      createdAt: createdAt.toISOString(),
      lastActivityAt: lastActivityAt.toISOString(),
    };
  });
}

export function getCarrinhosResumo(carrinhos: Carrinho[]): CarrinhosResumo {
  const receitaPotencial = carrinhos.reduce(
    (total, carrinho) => total + carrinho.potentialValue,
    0
  );
  const receitaRecuperada = carrinhos.reduce(
    (total, carrinho) => total + (carrinho.recoveredValue ?? 0),
    0
  );
  const abandonados = carrinhos.filter(
    (carrinho) =>
      carrinho.status === "abandonado" || carrinho.status === "em_recuperacao"
  ).length;
  const recuperados = carrinhos.filter(
    (carrinho) => carrinho.status === "recuperado"
  ).length;
  const perdidos = carrinhos.filter(
    (carrinho) => carrinho.status === "perdido"
  ).length;
  const recoveryBase = abandonados + recuperados + perdidos;

  return {
    total: carrinhos.length,
    checkout: carrinhos.filter((carrinho) => carrinho.status === "checkout").length,
    abandonados,
    emRecuperacao: carrinhos.filter(
      (carrinho) => carrinho.status === "em_recuperacao"
    ).length,
    recuperados,
    perdidos,
    receitaPotencial,
    receitaRecuperada,
    taxaRecuperacao: recoveryBase > 0 ? recuperados / recoveryBase : 0,
    ticketMedio: carrinhos.length > 0 ? receitaPotencial / carrinhos.length : 0,
  };
}

export function getCarrinhosFunil(carrinhos: Carrinho[]) {
  const resumo = getCarrinhosResumo(carrinhos);

  return {
    iniciado: carrinhos.length,
    checkout:
      resumo.checkout +
      resumo.abandonados +
      resumo.recuperados +
      resumo.perdidos,
    abandonado: resumo.abandonados + resumo.recuperados + resumo.perdidos,
    recuperado: resumo.recuperados,
    perdido: resumo.perdidos,
  } satisfies Record<CarrinhoFunilEtapa, number>;
}

export function getCarrinhoSearchText(carrinho: Carrinho) {
  return [
    carrinho.customerName,
    carrinho.customerEmail,
    carrinho.customerPhone,
    carrinho.customerDocument,
    carrinho.externalCartId,
    carrinho.productName,
    carrinho.productGroup,
    carrinho.variation,
    carrinho.campaign,
    CARRINHO_ORIGEM_LABELS[carrinho.origin],
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}
