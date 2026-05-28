import type { MetricsData } from "@/lib/metrics";

export const mockMetrics: MetricsData = {
  faturamento_total: 48320,
  investimento_total: 12400,
  roas: 3.9,
  ofertas: [
    { id: "gelatina-slim", nome: "Gelatina Slim" },
    { id: "glico-reset", nome: "Glico Reset" },
    { id: "power-66", nome: "Power 66" },
  ],
  conversoes_etapa: {
    frontend: { quantidade: 320, receita: 28800, taxa: 0.032 },
    upsell: { quantidade: 140, receita: 12600, taxa: 0.437 },
    downsell: { quantidade: 60, receita: 6920, taxa: 0.187 },
  },
  conversoes_etapa_por_oferta: {
    "gelatina-slim": {
      frontend: { quantidade: 128, receita: 11520, taxa: 0.036 },
      upsell: { quantidade: 54, receita: 4860, taxa: 0.422 },
      downsell: { quantidade: 22, receita: 2540, taxa: 0.172 },
    },
    "glico-reset": {
      frontend: { quantidade: 104, receita: 9360, taxa: 0.029 },
      upsell: { quantidade: 49, receita: 4410, taxa: 0.471 },
      downsell: { quantidade: 21, receita: 2420, taxa: 0.202 },
    },
    "power-66": {
      frontend: { quantidade: 88, receita: 7920, taxa: 0.031 },
      upsell: { quantidade: 37, receita: 3330, taxa: 0.421 },
      downsell: { quantidade: 17, receita: 1960, taxa: 0.193 },
    },
  },
  conversoes_canal: {
    email: { quantidade: 45, receita: 4050, taxa: 0.126 },
    sms: { quantidade: 30, receita: 2700, taxa: 0.094 },
    call_center: { quantidade: 22, receita: 3960, taxa: 0.183 },
    ia_recuperacao: { quantidade: 18, receita: 1620, taxa: 0.112 },
  },
  conversoes_canal_por_oferta: {
    "gelatina-slim": {
      email: { quantidade: 18, receita: 1620, taxa: 0.132 },
      sms: { quantidade: 11, receita: 990, taxa: 0.091 },
      call_center: { quantidade: 9, receita: 1620, taxa: 0.18 },
      ia_recuperacao: { quantidade: 8, receita: 720, taxa: 0.118 },
    },
    "glico-reset": {
      email: { quantidade: 15, receita: 1350, taxa: 0.119 },
      sms: { quantidade: 10, receita: 900, taxa: 0.097 },
      call_center: { quantidade: 7, receita: 1260, taxa: 0.175 },
      ia_recuperacao: { quantidade: 6, receita: 540, taxa: 0.111 },
    },
    "power-66": {
      email: { quantidade: 12, receita: 1080, taxa: 0.127 },
      sms: { quantidade: 9, receita: 810, taxa: 0.094 },
      call_center: { quantidade: 6, receita: 1080, taxa: 0.197 },
      ia_recuperacao: { quantidade: 4, receita: 360, taxa: 0.103 },
    },
  },
  serie_temporal: Array.from({ length: 30 }, (_, index) => {
    const day = index + 1;

    return {
      data: new Date(2026, 4, day).toISOString().split("T")[0],
      faturamento: 1200 + day * 85 + (day % 5) * 180,
      investimento: 280 + day * 12 + (day % 4) * 45,
    };
  }),
};

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

const zeroStageConversionsByOffer = {
  "gelatina-slim": zeroStageConversions,
  "glico-reset": zeroStageConversions,
  "power-66": zeroStageConversions,
} satisfies NonNullable<MetricsData["conversoes_etapa_por_oferta"]>;

const zeroChannelConversionsByOffer = {
  "gelatina-slim": zeroChannelConversions,
  "glico-reset": zeroChannelConversions,
  "power-66": zeroChannelConversions,
} satisfies NonNullable<MetricsData["conversoes_canal_por_oferta"]>;

export const mockEmptyMetrics: MetricsData = {
  faturamento_total: 0,
  investimento_total: 0,
  roas: 0,
  ofertas: mockMetrics.ofertas,
  conversoes_etapa: zeroStageConversions,
  conversoes_etapa_por_oferta: zeroStageConversionsByOffer,
  conversoes_canal: zeroChannelConversions,
  conversoes_canal_por_oferta: zeroChannelConversionsByOffer,
  serie_temporal: [],
};

export const mockLowPerformanceMetrics: MetricsData = {
  faturamento_total: 9800,
  investimento_total: 12600,
  roas: 0.8,
  ofertas: mockMetrics.ofertas,
  conversoes_etapa: {
    frontend: { quantidade: 96, receita: 5400, taxa: 0.014 },
    upsell: { quantidade: 18, receita: 2500, taxa: 0.188 },
    downsell: { quantidade: 9, receita: 1900, taxa: 0.094 },
  },
  conversoes_etapa_por_oferta: {
    "gelatina-slim": {
      frontend: { quantidade: 52, receita: 2920, taxa: 0.017 },
      upsell: { quantidade: 9, receita: 1260, taxa: 0.173 },
      downsell: { quantidade: 5, receita: 1060, taxa: 0.096 },
    },
    "glico-reset": {
      frontend: { quantidade: 44, receita: 2480, taxa: 0.012 },
      upsell: { quantidade: 9, receita: 1240, taxa: 0.205 },
      downsell: { quantidade: 4, receita: 840, taxa: 0.091 },
    },
    "power-66": zeroStageConversions,
  },
  conversoes_canal: {
    email: { quantidade: 18, receita: 1620, taxa: 0.071 },
    sms: { quantidade: 11, receita: 990, taxa: 0.046 },
    call_center: { quantidade: 6, receita: 1080, taxa: 0.082 },
    ia_recuperacao: { quantidade: 4, receita: 360, taxa: 0.037 },
  },
  conversoes_canal_por_oferta: {
    "gelatina-slim": {
      email: { quantidade: 10, receita: 900, taxa: 0.08 },
      sms: { quantidade: 6, receita: 540, taxa: 0.052 },
      call_center: { quantidade: 3, receita: 540, taxa: 0.079 },
      ia_recuperacao: { quantidade: 2, receita: 180, taxa: 0.034 },
    },
    "glico-reset": {
      email: { quantidade: 8, receita: 720, taxa: 0.064 },
      sms: { quantidade: 5, receita: 450, taxa: 0.041 },
      call_center: { quantidade: 3, receita: 540, taxa: 0.086 },
      ia_recuperacao: { quantidade: 2, receita: 180, taxa: 0.039 },
    },
    "power-66": zeroChannelConversions,
  },
  serie_temporal: Array.from({ length: 14 }, (_, index) => {
    const day = index + 15;

    return {
      data: new Date(2026, 4, day).toISOString().split("T")[0],
      faturamento: 420 + day * 18 + (day % 3) * 60,
      investimento: 740 + day * 15 + (day % 4) * 80,
    };
  }),
};

export const mockNoChannelMetrics: MetricsData = {
  ...mockMetrics,
  conversoes_canal: zeroChannelConversions,
  conversoes_canal_por_oferta: zeroChannelConversionsByOffer,
};

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
