export type OfferStageKey = "frontend" | "upsell" | "downsell";

export type RecoveryChannelKey =
  | "email"
  | "sms"
  | "call_center"
  | "ia_recuperacao";

export type MetricsStatus =
  | "initial-loading"
  | "refreshing"
  | "success"
  | "empty"
  | "error";

export type Offer = {
  id: string;
  nome: string;
};

export type StageConversion = {
  quantidade: number;
  receita: number;
  taxa: number | null;
};

export type ChannelConversion = {
  quantidade: number;
  receita: number;
  taxa?: number | null;
};

export type TimeSeriesMetric = {
  data: string;
  faturamento: number;
  investimento: number;
};

export type MetricsData = {
  faturamento_total: number;
  investimento_total: number;
  roas: number;
  ofertas: Offer[];
  conversoes_etapa: Record<OfferStageKey, StageConversion>;
  conversoes_etapa_por_oferta?: Record<
    string,
    Record<OfferStageKey, StageConversion>
  >;
  conversoes_canal: Record<RecoveryChannelKey, ChannelConversion>;
  conversoes_canal_por_oferta?: Record<
    string,
    Record<RecoveryChannelKey, ChannelConversion>
  >;
  serie_temporal: TimeSeriesMetric[];
};

type AnalyticsOverviewResponse = {
  configured?: boolean;
  summary?: {
    revenueTotal?: number;
    directRevenueTotal?: number;
    upsellRevenue?: number;
    upsellApproved?: number;
    spendTotal?: number;
    directSales?: number;
    clicksTotal?: number;
    roas?: number;
  };
  series?: Array<{
    day: string;
    revenue?: number;
    spend?: number;
  }>;
  products?: Array<{
    product: string;
    revenue?: number;
    directSales?: number;
  }>;
  channels?: Array<{
    channel: string;
    revenue?: number;
    directSales?: number;
  }>;
};

const EMPTY_STAGE_CONVERSIONS: Record<OfferStageKey, StageConversion> = {
  frontend: { quantidade: 0, receita: 0, taxa: null },
  upsell: { quantidade: 0, receita: 0, taxa: null },
  downsell: { quantidade: 0, receita: 0, taxa: null },
};

const EMPTY_CHANNEL_CONVERSIONS: Record<RecoveryChannelKey, ChannelConversion> = {
  email: { quantidade: 0, receita: 0, taxa: null },
  sms: { quantidade: 0, receita: 0, taxa: null },
  call_center: { quantidade: 0, receita: 0, taxa: null },
  ia_recuperacao: { quantidade: 0, receita: 0, taxa: null },
};

const CHANNEL_KEY_BY_ANALYTICS_CHANNEL: Record<string, RecoveryChannelKey | null> = {
  EMAIL_MAUTIC: "email",
  SMS: "sms",
  CALLCENTER: "call_center",
  IA_WHATSAPP: "ia_recuperacao",
  BACKEND_RECUPERACAO: "ia_recuperacao",
  IA_VENDAS: "ia_recuperacao",
  MDI: null,
  OUTROS: null,
  TABOOLA: null,
  VSL_FRONT: null,
};

function numberValue(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function cloneStageConversions() {
  return {
    frontend: { ...EMPTY_STAGE_CONVERSIONS.frontend },
    upsell: { ...EMPTY_STAGE_CONVERSIONS.upsell },
    downsell: { ...EMPTY_STAGE_CONVERSIONS.downsell },
  };
}

function cloneChannelConversions() {
  return {
    email: { ...EMPTY_CHANNEL_CONVERSIONS.email },
    sms: { ...EMPTY_CHANNEL_CONVERSIONS.sms },
    call_center: { ...EMPTY_CHANNEL_CONVERSIONS.call_center },
    ia_recuperacao: { ...EMPTY_CHANNEL_CONVERSIONS.ia_recuperacao },
  };
}

function normalizeOfferId(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function adaptAnalyticsOverviewToMetrics(
  payload: AnalyticsOverviewResponse
): MetricsData {
  const summary = payload.summary ?? {};
  const revenueTotal = numberValue(summary.revenueTotal);
  const directRevenueTotal =
    summary.directRevenueTotal == null
      ? Math.max(revenueTotal - numberValue(summary.upsellRevenue), 0)
      : numberValue(summary.directRevenueTotal);
  const upsellRevenue = numberValue(summary.upsellRevenue);
  const directSales = numberValue(summary.directSales);
  const upsellApproved = numberValue(summary.upsellApproved);
  const clicksTotal = numberValue(summary.clicksTotal);

  const conversoesEtapa = cloneStageConversions();
  conversoesEtapa.frontend = {
    quantidade: directSales,
    receita: directRevenueTotal,
    taxa: clicksTotal > 0 ? directSales / clicksTotal : null,
  };
  conversoesEtapa.upsell = {
    quantidade: upsellApproved,
    receita: upsellRevenue,
    taxa: directSales > 0 ? upsellApproved / directSales : null,
  };

  const offers = (payload.products ?? [])
    .filter((product) => product.product)
    .map((product) => ({
      id: normalizeOfferId(product.product),
      nome: product.product,
      revenue: numberValue(product.revenue),
      directSales: numberValue(product.directSales),
    }));

  const conversoesEtapaPorOferta = offers.reduce<
    NonNullable<MetricsData["conversoes_etapa_por_oferta"]>
  >((acc, offer) => {
    const offerStages = cloneStageConversions();
    offerStages.frontend = {
      quantidade: offer.directSales,
      receita: offer.revenue,
      taxa: null,
    };
    acc[offer.id] = offerStages;
    return acc;
  }, {});

  const conversoesCanal = cloneChannelConversions();
  for (const channel of payload.channels ?? []) {
    const key = CHANNEL_KEY_BY_ANALYTICS_CHANNEL[channel.channel];
    if (!key) continue;

    conversoesCanal[key].quantidade += numberValue(channel.directSales);
    conversoesCanal[key].receita += numberValue(channel.revenue);
  }

  for (const item of Object.values(conversoesCanal)) {
    item.taxa = directSales > 0 ? item.quantidade / directSales : null;
  }

  return {
    faturamento_total: revenueTotal,
    investimento_total: numberValue(summary.spendTotal),
    roas: numberValue(summary.roas),
    ofertas: offers.map((offer) => ({ id: offer.id, nome: offer.nome })),
    conversoes_etapa: conversoesEtapa,
    conversoes_etapa_por_oferta: conversoesEtapaPorOferta,
    conversoes_canal: conversoesCanal,
    conversoes_canal_por_oferta: {},
    serie_temporal: (payload.series ?? []).map((item) => ({
      data: item.day,
      faturamento: numberValue(item.revenue),
      investimento: numberValue(item.spend),
    })),
  };
}

function hasConversionValues(
  conversions: Record<string, StageConversion | ChannelConversion> | undefined
) {
  if (!conversions) {
    return false;
  }

  return Object.values(conversions).some(
    (item) => item.quantidade > 0 || item.receita > 0
  );
}

export function hasMetricsContent(data: MetricsData | null) {
  if (!data) {
    return false;
  }

  return (
    data.faturamento_total > 0 ||
    data.investimento_total > 0 ||
    data.roas > 0 ||
    data.serie_temporal.some(
      (item) => item.faturamento > 0 || item.investimento > 0
    ) ||
    hasConversionValues(data.conversoes_etapa) ||
    hasConversionValues(data.conversoes_canal)
  );
}
