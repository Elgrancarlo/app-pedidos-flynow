import { NextResponse } from "next/server";

import {
  buildFunilAiAlerts,
  defaultAnalyticsDates,
  getFunilAnalytics,
} from "@/lib/analytics";
import { getTodayInAppTimezone, getUtcRangeForAppDate } from "@/lib/app-dates";
import { getFinancialEventMetrics } from "@/lib/financeiro";
import { getPaytCheckoutSummary } from "@/lib/payt-checkout";
import { createServiceClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = createServiceClient();
  const today = getTodayInAppTimezone();
  const { startTs, endTs } = getUtcRangeForAppDate(today);
  const timings: Record<string, number> = {};

  async function measure<T>(name: string, fn: () => Promise<T>): Promise<T> {
    const startedAt = Date.now();
    const result = await fn();
    timings[name] = Date.now() - startedAt;
    return result;
  }

  const analyticsDates = defaultAnalyticsDates(7);
  const funilAnalyticsResult = await measure("funilAnalytics", () =>
    getFunilAnalytics(
      analyticsDates.startDate,
      analyticsDates.endDate,
      null,
      null,
      { skipImpactAnalysis: true },
    ),
  );

  await Promise.all([
    measure("atrasados", async () => supabase.rpc("pedidos_atrasados")),
    measure("carrinhos", () => getPaytCheckoutSummary(24)),
    measure("emTransito", async () => supabase.rpc("pedidos_em_transito")),
    measure("funil", async () =>
      supabase.rpc("funil_pedidos", { p_end: endTs, p_start: startTs }),
    ),
    measure("metricasEvento", () => getFinancialEventMetrics(today, today)),
    measure("tendencia", async () => supabase.rpc("tendencia_30_dias")),
    measure("vendasHoje", async () =>
      supabase
        .from("pedidos")
        .select("valor_total")
        .eq("status_pagamento", "paid")
        .not("data_pagamento", "is", null)
        .gte("data_pagamento", startTs)
        .lte("data_pagamento", endTs),
    ),
  ]);

  await measure("funilAlerts", () =>
    buildFunilAiAlerts({
      dailyRows: funilAnalyticsResult.dailyRows,
      logs: funilAnalyticsResult.logs,
      transcripts: funilAnalyticsResult.transcripts,
    }),
  );

  return NextResponse.json({
    timings: Object.fromEntries(
      Object.entries(timings).sort((left, right) => right[1] - left[1]),
    ),
  });
}
