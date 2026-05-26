import type { MetricsData } from "@/lib/metrics";

export const mockMetrics: MetricsData = {
  faturamento_total: 48320,
  investimento_total: 12400,
  roas: 3.9,
  conversoes_produto: {
    frontend: { quantidade: 320, receita: 28800, taxa: 0.032 },
    upsell: { quantidade: 140, receita: 12600, taxa: 0.437 },
    downsell: { quantidade: 60, receita: 6920, taxa: 0.187 },
  },
  conversoes_canal: {
    email: { quantidade: 45, receita: 4050 },
    sms: { quantidade: 30, receita: 2700 },
    call_center: { quantidade: 22, receita: 3960 },
    ia_recuperacao: { quantidade: 18, receita: 1620 },
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
