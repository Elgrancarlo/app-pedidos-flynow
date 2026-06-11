import { NextRequest, NextResponse } from "next/server";
import { getPaytCheckoutMonitor, getPaytCheckoutMonitorOptimized, getPaytCheckoutSummary } from "@/lib/payt-checkout";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const dias = Math.max(1, Math.min(30, parseInt(req.nextUrl.searchParams.get("dias") ?? "1") || 1));
  const horas = dias * 24;

  const startLegacy = Date.now();
  const legacy = await getPaytCheckoutMonitor(horas);
  const legacyMs = Date.now() - startLegacy;

  const startOptimized = Date.now();
  const optimized = await getPaytCheckoutMonitorOptimized(horas);
  const optimizedMs = Date.now() - startOptimized;

  const startSummary = Date.now();
  const summary = await getPaytCheckoutSummary(horas);
  const summaryMs = Date.now() - startSummary;

  const match = {
    openCount: legacy.summary.openCount === optimized.summary.openCount,
    lostCount: legacy.summary.lostCount === optimized.summary.lostCount,
    abandonedCount: legacy.summary.abandonedCount === optimized.summary.abandonedCount,
    recoveredCount: legacy.summary.recoveredCount === optimized.summary.recoveredCount,
    totalEvents: legacy.totalEvents === optimized.totalEvents,
    rowCount: legacy.rows.length === optimized.totalRows,
    summaryOpenCount: legacy.summary.openCount === summary.summary.openCount,
    summaryLostCount: legacy.summary.lostCount === summary.summary.lostCount,
    summaryAbandonedCount: legacy.summary.abandonedCount === summary.summary.abandonedCount,
    summaryRecoveredCount: legacy.summary.recoveredCount === summary.summary.recoveredCount,
  };

  const allMatch = Object.values(match).every(Boolean);

  return NextResponse.json({
    periodo: `${dias} dia(s)`,
    allMatch,
    match,
    timing: {
      legacyMs,
      optimizedMs,
      summaryMs,
      speedup: legacyMs > 0 ? `${(legacyMs / optimizedMs).toFixed(1)}x` : "N/A",
    },
    legacy: {
      summary: legacy.summary,
      totalEvents: legacy.totalEvents,
      rowCount: legacy.rows.length,
    },
    optimized: {
      summary: optimized.summary,
      totalEvents: optimized.totalEvents,
      rowCount: optimized.totalRows,
    },
    summaryRpc: {
      summary: summary.summary,
    },
  });
}
