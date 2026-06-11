import { NextRequest, NextResponse } from "next/server";

import {
  getPaytCheckoutMonitor,
  getPaytCheckoutMonitorOptimized,
  getPaytCheckoutSummary,
} from "@/lib/payt-checkout";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const dias = Math.max(
    1,
    Math.min(30, Number.parseInt(req.nextUrl.searchParams.get("dias") ?? "1", 10) || 1),
  );
  const horas = dias * 24;

  const legacyStartedAt = Date.now();
  const legacy = await getPaytCheckoutMonitor(horas);
  const legacyMs = Date.now() - legacyStartedAt;

  const optimizedStartedAt = Date.now();
  const optimized = await getPaytCheckoutMonitorOptimized(horas);
  const optimizedMs = Date.now() - optimizedStartedAt;

  const summaryStartedAt = Date.now();
  const summary = await getPaytCheckoutSummary(horas);
  const summaryMs = Date.now() - summaryStartedAt;

  const match = {
    abandonedCount:
      legacy.summary.abandonedCount === optimized.summary.abandonedCount,
    lostCount: legacy.summary.lostCount === optimized.summary.lostCount,
    openCount: legacy.summary.openCount === optimized.summary.openCount,
    recoveredCount:
      legacy.summary.recoveredCount === optimized.summary.recoveredCount,
    rowCount: legacy.rows.length === optimized.totalRows,
    summaryAbandonedCount:
      legacy.summary.abandonedCount === summary.summary.abandonedCount,
    summaryLostCount: legacy.summary.lostCount === summary.summary.lostCount,
    summaryOpenCount: legacy.summary.openCount === summary.summary.openCount,
    summaryRecoveredCount:
      legacy.summary.recoveredCount === summary.summary.recoveredCount,
    totalEvents: legacy.totalEvents === optimized.totalEvents,
  };

  return NextResponse.json({
    allMatch: Object.values(match).every(Boolean),
    legacy: {
      rowCount: legacy.rows.length,
      summary: legacy.summary,
      totalEvents: legacy.totalEvents,
    },
    match,
    optimized: {
      rowCount: optimized.totalRows,
      summary: optimized.summary,
      totalEvents: optimized.totalEvents,
    },
    periodo: `${dias} dia(s)`,
    summaryRpc: {
      summary: summary.summary,
    },
    timing: {
      legacyMs,
      optimizedMs,
      speedup:
        legacyMs > 0 && optimizedMs > 0
          ? `${(legacyMs / optimizedMs).toFixed(1)}x`
          : "N/A",
      summaryMs,
    },
  });
}
