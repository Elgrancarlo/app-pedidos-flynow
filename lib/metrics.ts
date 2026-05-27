export type OfferStageKey = "frontend" | "upsell" | "downsell";

export type RecoveryChannelKey =
  | "email"
  | "sms"
  | "call_center"
  | "ia_recuperacao";

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
