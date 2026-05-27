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
  conversoes_canal_por_produto: {
    frontend: {
      email: { quantidade: 26, receita: 2340 },
      sms: { quantidade: 18, receita: 1620 },
      call_center: { quantidade: 10, receita: 1800 },
      ia_recuperacao: { quantidade: 11, receita: 990 },
    },
    upsell: {
      email: { quantidade: 13, receita: 1170 },
      sms: { quantidade: 8, receita: 720 },
      call_center: { quantidade: 8, receita: 1440 },
      ia_recuperacao: { quantidade: 5, receita: 450 },
    },
    downsell: {
      email: { quantidade: 6, receita: 540 },
      sms: { quantidade: 4, receita: 360 },
      call_center: { quantidade: 4, receita: 720 },
      ia_recuperacao: { quantidade: 2, receita: 180 },
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
