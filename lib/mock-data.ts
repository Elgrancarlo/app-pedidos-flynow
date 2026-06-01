import type { MetricsData, RecoveryChannelKey } from "@/lib/metrics";

type MockBuildOptions = {
  days?: number;
  revenueMultiplier?: number;
  spendMultiplier?: number;
  recoveryMultiplier?: number;
  includeChannels?: boolean;
};

const OFFERS = [
  { id: "power-66", nome: "Power 66", share: 0.34, ticket: 218 },
  { id: "derma-bloom", nome: "Derma Bloom", share: 0.24, ticket: 196 },
  { id: "glico-reset", nome: "Glico Reset", share: 0.18, ticket: 172 },
  { id: "gelatina-slim", nome: "Gelatina Slim", share: 0.14, ticket: 149 },
  { id: "coco-slim", nome: "Coco Slim", share: 0.1, ticket: 167 },
] as const;

const CHANNELS: Array<{
  key: RecoveryChannelKey;
  share: number;
  conversionRate: number;
}> = [
  { key: "ia_recuperacao", share: 0.38, conversionRate: 0.148 },
  { key: "email", share: 0.27, conversionRate: 0.091 },
  { key: "call_center", share: 0.22, conversionRate: 0.174 },
  { key: "sms", share: 0.13, conversionRate: 0.064 },
];

function roundCurrency(value: number) {
  return Math.round(value * 100) / 100;
}

function toDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(date.getDate() + days);
  return next;
}

function getSeries({
  days = 30,
  revenueMultiplier = 1,
  spendMultiplier = 1,
}: Required<Pick<MockBuildOptions, "days" | "revenueMultiplier" | "spendMultiplier">>) {
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  const start = addDays(today, -(days - 1));

  return Array.from({ length: days }, (_, index) => {
    const day = addDays(start, index);
    const weekday = day.getDay();
    const weekendFactor = weekday === 0 ? 0.78 : weekday === 6 ? 0.86 : 1;
    const campaignPulse = index % 9 === 5 ? 1.18 : index % 11 === 2 ? 0.9 : 1;
    const monthRamp = 1 + index * 0.012;
    const revenue = roundCurrency(
      (7200 + index * 180 + (index % 5) * 620) *
        weekendFactor *
        campaignPulse *
        monthRamp *
        revenueMultiplier
    );
    const investment = roundCurrency(
      (2050 + index * 42 + (index % 4) * 210) *
        (campaignPulse > 1 ? 1.1 : 1) *
        spendMultiplier
    );

    return {
      data: toDateKey(day),
      faturamento: revenue,
      investimento: investment,
    };
  });
}

function buildMetrics({
  days = 30,
  revenueMultiplier = 1,
  spendMultiplier = 1,
  recoveryMultiplier = 1,
  includeChannels = true,
}: MockBuildOptions = {}): MetricsData {
  const serie_temporal = getSeries({
    days,
    revenueMultiplier,
    spendMultiplier,
  });
  const faturamento_total = roundCurrency(
    serie_temporal.reduce((total, item) => total + item.faturamento, 0)
  );
  const investimento_total = roundCurrency(
    serie_temporal.reduce((total, item) => total + item.investimento, 0)
  );
  const receitaFrontend = roundCurrency(faturamento_total * 0.67);
  const receitaUpsell = roundCurrency(faturamento_total * 0.24);
  const receitaDownsell = roundCurrency(faturamento_total - receitaFrontend - receitaUpsell);
  const frontendQuantidade = Math.round(receitaFrontend / 192);
  const upsellQuantidade = Math.round(frontendQuantidade * 0.36 * recoveryMultiplier);
  const downsellQuantidade = Math.round(frontendQuantidade * 0.14 * recoveryMultiplier);

  const conversoes_etapa = {
    frontend: {
      quantidade: frontendQuantidade,
      receita: receitaFrontend,
      taxa: 0.031,
    },
    upsell: {
      quantidade: upsellQuantidade,
      receita: receitaUpsell,
      taxa: frontendQuantidade > 0 ? upsellQuantidade / frontendQuantidade : null,
    },
    downsell: {
      quantidade: downsellQuantidade,
      receita: receitaDownsell,
      taxa: frontendQuantidade > 0 ? downsellQuantidade / frontendQuantidade : null,
    },
  } satisfies MetricsData["conversoes_etapa"];

  const conversoes_etapa_por_oferta = OFFERS.reduce<
    NonNullable<MetricsData["conversoes_etapa_por_oferta"]>
  >((acc, offer, index) => {
    const offerFrontendQuantity = Math.round(frontendQuantidade * offer.share);
    const offerUpsellQuantity = Math.round(upsellQuantidade * offer.share * (1 + index * 0.018));
    const offerDownsellQuantity = Math.round(downsellQuantidade * offer.share * (1 - index * 0.012));

    acc[offer.id] = {
      frontend: {
        quantidade: offerFrontendQuantity,
        receita: roundCurrency(receitaFrontend * offer.share),
        taxa: 0.027 + index * 0.003,
      },
      upsell: {
        quantidade: offerUpsellQuantity,
        receita: roundCurrency(receitaUpsell * offer.share),
        taxa:
          offerFrontendQuantity > 0
            ? offerUpsellQuantity / offerFrontendQuantity
            : null,
      },
      downsell: {
        quantidade: offerDownsellQuantity,
        receita: roundCurrency(receitaDownsell * offer.share),
        taxa:
          offerFrontendQuantity > 0
            ? offerDownsellQuantity / offerFrontendQuantity
            : null,
      },
    };

    return acc;
  }, {});

  const recoveryRevenue = roundCurrency(faturamento_total * 0.18 * recoveryMultiplier);
  const recoveryQuantity = Math.round(frontendQuantidade * 0.22 * recoveryMultiplier);
  const conversoes_canal = CHANNELS.reduce<MetricsData["conversoes_canal"]>(
    (acc, channel) => {
      acc[channel.key] = includeChannels
        ? {
            quantidade: Math.round(recoveryQuantity * channel.share),
            receita: roundCurrency(recoveryRevenue * channel.share),
            taxa: channel.conversionRate,
          }
        : { quantidade: 0, receita: 0, taxa: null };

      return acc;
    },
    {
      email: { quantidade: 0, receita: 0, taxa: null },
      sms: { quantidade: 0, receita: 0, taxa: null },
      call_center: { quantidade: 0, receita: 0, taxa: null },
      ia_recuperacao: { quantidade: 0, receita: 0, taxa: null },
    }
  );

  const conversoes_canal_por_oferta = OFFERS.reduce<
    NonNullable<MetricsData["conversoes_canal_por_oferta"]>
  >((acc, offer) => {
    acc[offer.id] = CHANNELS.reduce<MetricsData["conversoes_canal"]>(
      (channelAcc, channel) => {
        channelAcc[channel.key] = includeChannels
          ? {
              quantidade: Math.round(recoveryQuantity * offer.share * channel.share),
              receita: roundCurrency(recoveryRevenue * offer.share * channel.share),
              taxa: channel.conversionRate,
            }
          : { quantidade: 0, receita: 0, taxa: null };

        return channelAcc;
      },
      {
        email: { quantidade: 0, receita: 0, taxa: null },
        sms: { quantidade: 0, receita: 0, taxa: null },
        call_center: { quantidade: 0, receita: 0, taxa: null },
        ia_recuperacao: { quantidade: 0, receita: 0, taxa: null },
      }
    );

    return acc;
  }, {});

  return {
    faturamento_total,
    investimento_total,
    roas: investimento_total > 0 ? faturamento_total / investimento_total : 0,
    ofertas: OFFERS.map(({ id, nome }) => ({ id, nome })),
    conversoes_etapa,
    conversoes_etapa_por_oferta,
    conversoes_canal,
    conversoes_canal_por_oferta,
    serie_temporal,
  };
}

const zeroStageConversions = {
  frontend: { quantidade: 0, receita: 0, taxa: null },
  upsell: { quantidade: 0, receita: 0, taxa: null },
  downsell: { quantidade: 0, receita: 0, taxa: null },
} satisfies MetricsData["conversoes_etapa"];

const zeroChannelConversions = {
  email: { quantidade: 0, receita: 0, taxa: null },
  sms: { quantidade: 0, receita: 0, taxa: null },
  call_center: { quantidade: 0, receita: 0, taxa: null },
  ia_recuperacao: { quantidade: 0, receita: 0, taxa: null },
} satisfies MetricsData["conversoes_canal"];

const zeroStageConversionsByOffer = Object.fromEntries(
  OFFERS.map((offer) => [offer.id, zeroStageConversions])
) as NonNullable<MetricsData["conversoes_etapa_por_oferta"]>;

const zeroChannelConversionsByOffer = Object.fromEntries(
  OFFERS.map((offer) => [offer.id, zeroChannelConversions])
) as NonNullable<MetricsData["conversoes_canal_por_oferta"]>;

export const mockMetrics: MetricsData = buildMetrics();

export const mockEmptyMetrics: MetricsData = {
  faturamento_total: 0,
  investimento_total: 0,
  roas: 0,
  ofertas: OFFERS.map(({ id, nome }) => ({ id, nome })),
  conversoes_etapa: zeroStageConversions,
  conversoes_etapa_por_oferta: zeroStageConversionsByOffer,
  conversoes_canal: zeroChannelConversions,
  conversoes_canal_por_oferta: zeroChannelConversionsByOffer,
  serie_temporal: [],
};

export const mockLowPerformanceMetrics: MetricsData = buildMetrics({
  days: 14,
  revenueMultiplier: 0.42,
  spendMultiplier: 1.18,
  recoveryMultiplier: 0.52,
});

export const mockNoChannelMetrics: MetricsData = buildMetrics({
  includeChannels: false,
});

export const mockMetricsScenarios = {
  default: mockMetrics,
  empty: mockEmptyMetrics,
  low: mockLowPerformanceMetrics,
  noChannels: mockNoChannelMetrics,
} as const;

export type MockMetricsScenario = keyof typeof mockMetricsScenarios;

export function getMockMetricsScenario(value: string | null) {
  if (value && value in mockMetricsScenarios) {
    return mockMetricsScenarios[value as MockMetricsScenario];
  }

  return mockMetrics;
}
