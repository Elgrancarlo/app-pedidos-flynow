import {
  buildFunilAlerts,
  defaultAnalyticsDates,
  getAnalyticsOverview,
  getChannelAnalytics,
  getFunilAnalytics,
  getUpsellAnalytics,
} from "@/lib/analytics";
import { shouldUseMockData } from "@/lib/data-mode";
import { mockMetrics } from "@/lib/mock-data";
import type { MetricsData } from "@/lib/metrics";
import { ANALYTICS_CHANNEL_LABELS, type AnalyticsCanal } from "@/lib/supabase";

export type PerformanceRange = {
  startDate: string;
  endDate: string;
};

export type PerformanceSeriesPoint = {
  day: string;
  revenue: number;
  spend: number;
  directSales: number;
};

export type PerformanceProduct = {
  product: string;
  revenue: number;
  directSales: number;
  upsellRevenue: number;
  takeRate: number;
  aov: number;
};

export type PerformanceChannel = {
  channel: string;
  label: string;
  revenue: number;
  directSales: number;
  spend: number;
  clicks: number;
  conversions: number;
  roas: number;
};

export type PerformanceCampaign = {
  campaign: string;
  product: string;
  source: string;
  spend: number;
  clicks: number;
  conversions: number;
  roas: number;
};

export type PerformanceFunnelDay = {
  day: string;
  product: string;
  channel: string;
  directSales: number;
  revenueTotal: number;
  totalApproved: number;
  upsellRevenue: number;
  aov: number;
  takeRateUs1: number;
  takeRateUs2: number;
};

export type PerformanceFunnelSourceRow = {
  campaign: string | null;
  channel: string;
  directSales: number;
  medium: string | null;
  revenueTotal: number;
  source: string | null;
  upsellCount: number;
  upsellRevenue: number;
};

export type PerformanceAlert = {
  level: "ok" | "info" | "warning" | "danger";
  title: string;
  detail: string;
};

export type PerformanceLog = {
  day: string;
  title: string;
  detail: string;
  owner: string;
  impact: string;
};

export type PerformanceUpsellProduct = {
  product: string;
  directSales: number;
  totalApproved: number;
  us1Wins: number;
  us2Wins: number;
  upsellRevenue: number;
  takeRateTotal: number;
  takeRateUs1: number;
  takeRateUs2: number;
};

export type PerformancePageData = {
  source: "mock" | "real";
  range: PerformanceRange;
  summary: {
    revenueTotal: number;
    directRevenueTotal: number;
    upsellRevenue: number;
    upsellApproved: number;
    spendTotal: number;
    directSales: number;
    clicksTotal: number;
    conversionsTotal: number;
    roas: number;
    aov: number;
    attributedRevenueTotal: number;
  };
  series: PerformanceSeriesPoint[];
  products: PerformanceProduct[];
  channels: PerformanceChannel[];
  campaigns: PerformanceCampaign[];
  funnelDays: PerformanceFunnelDay[];
  funnelSourceRows: PerformanceFunnelSourceRow[];
  alerts: PerformanceAlert[];
  logs: PerformanceLog[];
  upsells: PerformanceUpsellProduct[];
};

function numberValue(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
}

function roundCurrency(value: number) {
  return Math.round(value * 100) / 100;
}

function channelLabel(channel: string) {
  return (
    ANALYTICS_CHANNEL_LABELS[channel as AnalyticsCanal] ??
    channel.replace(/_/g, " ")
  );
}

function getDefaultRange(): PerformanceRange {
  return defaultAnalyticsDates(29);
}

function buildMockProducts(metrics: MetricsData): PerformanceProduct[] {
  return metrics.ofertas.map((offer) => {
    const conversions = metrics.conversoes_etapa_por_oferta?.[offer.id];
    const frontend = conversions?.frontend ?? {
      quantidade: 0,
      receita: 0,
      taxa: 0,
    };
    const upsell = conversions?.upsell ?? {
      quantidade: 0,
      receita: 0,
      taxa: 0,
    };
    const downsell = conversions?.downsell ?? {
      quantidade: 0,
      receita: 0,
      taxa: 0,
    };
    const revenue = frontend.receita + upsell.receita + downsell.receita;

    return {
      product: offer.nome,
      revenue,
      directSales: frontend.quantidade,
      upsellRevenue: upsell.receita + downsell.receita,
      takeRate:
        frontend.quantidade > 0
          ? (upsell.quantidade + downsell.quantidade) / frontend.quantidade
          : 0,
      aov: frontend.quantidade > 0 ? revenue / frontend.quantidade : 0,
    };
  });
}

function createMockPerformanceData(range = getDefaultRange()): PerformancePageData {
  const products = buildMockProducts(mockMetrics);
  const directSales = mockMetrics.conversoes_etapa.frontend.quantidade;
  const upsellApproved =
    mockMetrics.conversoes_etapa.upsell.quantidade +
    mockMetrics.conversoes_etapa.downsell.quantidade;
  const directRevenueTotal = mockMetrics.conversoes_etapa.frontend.receita;
  const upsellRevenue =
    mockMetrics.conversoes_etapa.upsell.receita +
    mockMetrics.conversoes_etapa.downsell.receita;
  const attributedRevenueTotal = mockMetrics.faturamento_total * 0.93;
  const clicksTotal = Math.round(directSales / 0.031);
  const conversionsTotal = Math.round(directSales * 1.08);
  const series = mockMetrics.serie_temporal.map((item) => ({
    day: item.data,
    revenue: item.faturamento,
    spend: item.investimento,
    directSales: Math.round(item.faturamento / 194),
  }));
  const channels: PerformanceChannel[] = [
    {
      channel: "IA_WHATSAPP",
      label: "IA / WhatsApp",
      revenue: mockMetrics.conversoes_canal.ia_recuperacao.receita,
      directSales: mockMetrics.conversoes_canal.ia_recuperacao.quantidade,
      spend: 11280,
      clicks: 48200,
      conversions: 418,
      roas: 4.6,
    },
    {
      channel: "EMAIL_MAUTIC",
      label: "Email / Mautic",
      revenue: mockMetrics.conversoes_canal.email.receita,
      directSales: mockMetrics.conversoes_canal.email.quantidade,
      spend: 2680,
      clicks: 19300,
      conversions: 186,
      roas: 6.1,
    },
    {
      channel: "CALLCENTER",
      label: "Call Center",
      revenue: mockMetrics.conversoes_canal.call_center.receita,
      directSales: mockMetrics.conversoes_canal.call_center.quantidade,
      spend: 7840,
      clicks: 0,
      conversions: 154,
      roas: 3.8,
    },
    {
      channel: "SMS",
      label: "SMS",
      revenue: mockMetrics.conversoes_canal.sms.receita,
      directSales: mockMetrics.conversoes_canal.sms.quantidade,
      spend: 1240,
      clicks: 7200,
      conversions: 74,
      roas: 2.9,
    },
  ];
  const campaigns: PerformanceCampaign[] = [
    {
      campaign: "frio-escala-cbo",
      product: "Power 66",
      source: "Meta Ads",
      spend: 18420,
      clicks: 73400,
      conversions: 642,
      roas: 4.2,
    },
    {
      campaign: "remarketing-24h",
      product: "Derma Bloom",
      source: "Meta Ads",
      spend: 5920,
      clicks: 20800,
      conversions: 261,
      roas: 5.7,
    },
    {
      campaign: "taboola-vsl-03",
      product: "Glico Reset",
      source: "Taboola",
      spend: 8420,
      clicks: 51200,
      conversions: 284,
      roas: 2.8,
    },
    {
      campaign: "lista-quente-email",
      product: "Lift Prime",
      source: "Mautic",
      spend: 860,
      clicks: 9300,
      conversions: 122,
      roas: 8.4,
    },
  ];
  const funnelDays = series.slice(-12).flatMap((point, index) =>
    products.slice(0, 3).map((product, productIndex) => {
      const direct = Math.round(
        point.directSales * (0.42 - productIndex * 0.09)
      );
      const takeRateUs1 = 0.27 + ((index + productIndex) % 4) * 0.012;
      const takeRateUs2 = 0.12 + ((index + productIndex) % 3) * 0.009;

      return {
        day: point.day,
        product: product.product,
        channel: channels[(index + productIndex) % channels.length].channel,
        directSales: direct,
        revenueTotal: roundCurrency(direct * product.aov),
        totalApproved: Math.round(direct * (takeRateUs1 + takeRateUs2)),
        upsellRevenue: roundCurrency(direct * product.aov * 0.24),
        aov: roundCurrency(product.aov),
        takeRateUs1,
        takeRateUs2,
      };
    })
  );
  const funnelSourceRows = funnelDays.map((row, index) => {
    const matchingCampaign =
      campaigns.find((campaign) => campaign.product === row.product) ??
      campaigns[index % Math.max(campaigns.length, 1)];

    return {
      campaign: matchingCampaign?.campaign ?? null,
      channel: row.channel,
      directSales: row.directSales,
      medium: null,
      revenueTotal: row.revenueTotal,
      source: matchingCampaign?.source ?? row.channel,
      upsellCount: Math.round(
        row.directSales * (row.takeRateUs1 + row.takeRateUs2)
      ),
      upsellRevenue: row.upsellRevenue,
    };
  });
  const upsells = products.map((product) => {
    const us1Wins = Math.round(product.directSales * 0.29);
    const us2Wins = Math.round(product.directSales * 0.13);
    const totalApproved = us1Wins + us2Wins;

    return {
      product: product.product,
      directSales: product.directSales,
      totalApproved,
      us1Wins,
      us2Wins,
      upsellRevenue: product.upsellRevenue,
      takeRateTotal:
        product.directSales > 0 ? totalApproved / product.directSales : 0,
      takeRateUs1:
        product.directSales > 0 ? us1Wins / product.directSales : 0,
      takeRateUs2:
        product.directSales > 0 ? us2Wins / product.directSales : 0,
    };
  });

  return {
    source: "mock",
    range,
    summary: {
      revenueTotal: mockMetrics.faturamento_total,
      directRevenueTotal,
      upsellRevenue,
      upsellApproved,
      spendTotal: mockMetrics.investimento_total,
      directSales,
      clicksTotal,
      conversionsTotal,
      roas: mockMetrics.roas,
      aov: directSales > 0 ? directRevenueTotal / directSales : 0,
      attributedRevenueTotal,
    },
    series,
    products,
    channels,
    campaigns,
    funnelDays,
    funnelSourceRows,
    alerts: [
      {
        level: "ok",
        title: "Funil estável",
        detail: "Receita e take rate mantiveram variacao saudavel na janela recente.",
      },
      {
        level: "warning",
        title: "Atenção em Taboola",
        detail: "Campanhas de topo geram volume, mas ROAS segue abaixo dos canais proprietarios.",
      },
      {
        level: "info",
        title: "Email com melhor eficiência",
        detail: "Lista quente tem menor custo e maior retorno relativo no período.",
      },
    ],
    logs: [
      {
        day: series.at(-6)?.day ?? range.startDate,
        title: "Novo criativo VSL",
        detail: "Alteracao de headline e prova social no front principal.",
        owner: "Performance",
        impact: "+8,4% receita/dia apos alteracao",
      },
      {
        day: series.at(-4)?.day ?? range.startDate,
        title: "Ajuste de oferta US1",
        detail: "Teste de ancoragem de preco e garantia visual.",
        owner: "Produto",
        impact: "+2,1 pp take rate US1",
      },
      {
        day: series.at(-2)?.day ?? range.startDate,
        title: "Roteiro call center",
        detail: "Nova objeção sobre prazo de entrega adicionada no script.",
        owner: "Operacao",
        impact: "Sinal neutro, amostra ainda curta",
      },
    ],
    upsells,
  };
}

export async function getPerformancePageData(
  range = getDefaultRange()
): Promise<PerformancePageData> {
  if (shouldUseMockData()) {
    return createMockPerformanceData(range);
  }

  const [overview, funil, canais, upsells] = await Promise.all([
    getAnalyticsOverview(range.startDate, range.endDate),
    getFunilAnalytics(range.startDate, range.endDate, null, null, {
      skipImpactAnalysis: true,
    }),
    getChannelAnalytics(range.startDate, range.endDate),
    getUpsellAnalytics(range.startDate, range.endDate),
  ]);
  const summary = overview.summary ?? {};
  const channelsFromOverview = overview.channels ?? [];
  const mediaBySource = canais.mediaBySource ?? [];

  return {
    source: "real",
    range,
    summary: {
      revenueTotal: numberValue(summary.revenueTotal),
      directRevenueTotal: numberValue(summary.directRevenueTotal),
      upsellRevenue: numberValue(summary.upsellRevenue),
      upsellApproved: numberValue(summary.upsellApproved),
      spendTotal: numberValue(summary.spendTotal),
      directSales: numberValue(summary.directSales),
      clicksTotal: numberValue(summary.clicksTotal),
      conversionsTotal: numberValue(summary.conversionsTotal),
      roas: numberValue(summary.roas),
      aov: numberValue(summary.aov),
      attributedRevenueTotal: numberValue(summary.attributedRevenueTotal),
    },
    series: (overview.series ?? []).map((item) => ({
      day: item.day,
      revenue: numberValue(item.revenue),
      spend: numberValue(item.spend),
      directSales: numberValue(item.directSales),
    })),
    products: (overview.products ?? []).map((item) => {
      const directSales = numberValue(item.directSales);
      const revenue = numberValue(item.revenue);

      return {
        product: item.product,
        revenue,
        directSales,
        upsellRevenue: 0,
        takeRate: 0,
        aov: directSales > 0 ? revenue / directSales : 0,
      };
    }),
    channels: channelsFromOverview.map((item) => {
      const matchingMedia = mediaBySource.find(
        (source) =>
          source.source.toLowerCase() === item.channel.toLowerCase() ||
          source.source.toLowerCase() === item.label.toLowerCase()
      );
      const spend = numberValue(matchingMedia?.spend);
      const revenue = numberValue(item.revenue);

      return {
        channel: item.channel,
        label: item.label ?? channelLabel(item.channel),
        revenue,
        directSales: numberValue(item.directSales),
        spend,
        clicks: numberValue(matchingMedia?.clicks),
        conversions: numberValue(matchingMedia?.conversions),
        roas: spend > 0 ? revenue / spend : 0,
      };
    }),
    campaigns: (canais.topCampaigns ?? []).map((item) => ({
      campaign: item.campaign,
      product: item.product,
      source: item.source,
      spend: numberValue(item.spend),
      clicks: numberValue(item.clicks),
      conversions: numberValue(item.conversions),
      roas: numberValue(item.roas),
    })),
    funnelDays: (funil.dailyRows ?? []).map((item) => ({
      day: item.day,
      product: item.product_base,
      channel: item.canal,
      directSales: numberValue(item.qtd_vendas_diretas),
      revenueTotal: numberValue(item.receita_total),
      totalApproved: numberValue(item.qtd_upsells_aprovados),
      upsellRevenue: numberValue(item.receita_upsells),
      aov: numberValue(item.aov),
      takeRateUs1: numberValue(item.take_rate_us1),
      takeRateUs2: numberValue(item.take_rate_us2),
    })),
    funnelSourceRows: (funil.sourceRows ?? []).map((item) => ({
      campaign: item.utm_campaign,
      channel: item.canal,
      directSales: numberValue(item.qtd_vendas),
      medium: item.utm_medium,
      revenueTotal: numberValue(item.receita_total),
      source: item.utm_source,
      upsellCount: numberValue(item.qtd_upsells),
      upsellRevenue: numberValue(item.receita_upsells),
    })),
    alerts: buildFunilAlerts(funil.dailyRows ?? []).slice(0, 3).map((item) => ({
      level: item.level === "alerta" ? "danger" : "ok",
      title: item.title,
      detail: item.detail,
    })),
    logs: (funil.logs ?? []).slice(0, 8).map((item) => ({
      day: item.day,
      title: item.componente,
      detail: item.descricao ?? "Sem descricao",
      owner: item.responsavel ?? "Sem responsavel",
      impact: item.insight_ia ?? item.status_analise ?? "Aguardando leitura",
    })),
    upsells: (upsells.products ?? []).map((item) => ({
      product: item.product,
      directSales: numberValue(item.directSales),
      totalApproved: numberValue(item.totalApproved),
      us1Wins: numberValue(item.us1Wins),
      us2Wins: numberValue(item.us2Wins),
      upsellRevenue: numberValue(item.upsellRevenue),
      takeRateTotal: numberValue(item.takeRateTotal),
      takeRateUs1: numberValue(item.takeRateUs1),
      takeRateUs2: numberValue(item.takeRateUs2),
    })),
  };
}
