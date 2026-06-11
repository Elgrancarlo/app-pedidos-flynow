import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { buildFunilAiAlerts, defaultAnalyticsDates, getFunilAnalytics } from '@/lib/analytics';
import { getPaytCheckoutSummary } from '@/lib/payt-checkout';
import { getFinancialEventMetrics } from '@/lib/financeiro';
import { getTodayInAppTimezone, getUtcRangeForAppDate } from '@/lib/app-dates';

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = createServiceClient();
  const hoje = getTodayInAppTimezone();
  const { startTs, endTs } = getUtcRangeForAppDate(hoje);
  const timings: Record<string, number> = {};

  async function measure<T>(name: string, fn: () => Promise<T>): Promise<T> {
    const start = Date.now();
    const result = await fn();
    timings[name] = Date.now() - start;
    return result;
  }

  const funilAnalyticsResult = await measure('funilAnalytics', () => getFunilAnalytics(
    defaultAnalyticsDates(7).startDate,
    defaultAnalyticsDates(7).endDate,
    null, null, { skipImpactAnalysis: true }
  ));

  await Promise.all([
    measure('emTransito', async () => supabase.rpc('pedidos_em_transito')),
    measure('tendencia', async () => supabase.rpc('tendencia_30_dias')),
    measure('funil', async () => supabase.rpc('funil_pedidos', { p_start: startTs, p_end: endTs })),
    measure('atrasados', async () => supabase.rpc('pedidos_atrasados')),
    measure('carrinhos', () => getPaytCheckoutSummary(24)),
    measure('vendasHoje', async () => supabase
      .from('pedidos')
      .select('valor_total')
      .eq('status_pagamento', 'paid')
      .not('data_pagamento', 'is', null)
      .gte('data_pagamento', startTs)
      .lte('data_pagamento', endTs)),
    measure('metricasEvento', () => getFinancialEventMetrics(hoje, hoje)),
  ]);

  await measure('funilAlerts', () => buildFunilAiAlerts({
    dailyRows: funilAnalyticsResult.dailyRows,
    logs: funilAnalyticsResult.logs,
    transcripts: funilAnalyticsResult.transcripts,
  }));

  const sorted = Object.entries(timings).sort((a, b) => b[1] - a[1]);

  return NextResponse.json({
    timings: Object.fromEntries(sorted),
  });
}
