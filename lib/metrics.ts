export type ProductConversionKey = "frontend" | "upsell" | "downsell";

export type RecoveryChannelKey =
  | "email"
  | "sms"
  | "call_center"
  | "ia_recuperacao";

export type ProductConversion = {
  quantidade: number;
  receita: number;
  taxa: number;
};

export type ChannelConversion = {
  quantidade: number;
  receita: number;
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
  conversoes_produto: Record<ProductConversionKey, ProductConversion>;
  conversoes_canal: Record<RecoveryChannelKey, ChannelConversion>;
  conversoes_canal_por_produto?: Record<
    ProductConversionKey,
    Record<RecoveryChannelKey, ChannelConversion>
  >;
  serie_temporal: TimeSeriesMetric[];
};
