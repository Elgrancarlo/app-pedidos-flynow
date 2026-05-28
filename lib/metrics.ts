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
