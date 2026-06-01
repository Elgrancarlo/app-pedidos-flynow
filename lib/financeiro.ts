import { createServiceClient } from "@/lib/supabase";
import { getUtcRangeForAppDates } from "@/lib/app-dates";

type FinancialMetrics = {
  chargebacks: number;
  valorChargebacks: number;
  reembolsos: number;
  valorReembolsos: number;
};

function isMissingEventStream(error: unknown) {
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  return message.includes("payt_event_stream") || message.includes("relation") || message.includes("does not exist");
}

function numberValue(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
}

export async function getFinancialEventMetrics(startDate: string, endDate: string): Promise<FinancialMetrics> {
  const supabase = createServiceClient();
  const { startTs, endTs } = getUtcRangeForAppDates(startDate, endDate);

  try {
    const { data, error } = await supabase
      .from("payt_event_stream")
      .select("transaction_id, event_status, total_price, event_at")
      .gte("event_at", startTs)
      .lte("event_at", endTs)
      .order("event_at", { ascending: false })
      .in("event_status", ["refunded", "chargeback", "charged_back"]);

    if (error) throw error;

    const latestRefundByTransaction = new Map<string, number>();
    const latestChargebackByTransaction = new Map<string, number>();

    for (const row of data ?? []) {
      const transactionId = String(row.transaction_id ?? "").trim();
      if (!transactionId) continue;

      const targetMap =
        row.event_status === "refunded" ? latestRefundByTransaction : latestChargebackByTransaction;
      if (!targetMap.has(transactionId)) {
        targetMap.set(transactionId, numberValue(row.total_price));
      }
    }

    return {
      chargebacks: latestChargebackByTransaction.size,
      valorChargebacks: Array.from(latestChargebackByTransaction.values()).reduce((sum, value) => sum + value, 0),
      reembolsos: latestRefundByTransaction.size,
      valorReembolsos: Array.from(latestRefundByTransaction.values()).reduce((sum, value) => sum + value, 0),
    };
  } catch (error) {
    if (!isMissingEventStream(error)) throw error;

    const { data } = await supabase.rpc("metricas_financeiras", {
      p_start: startTs,
      p_end: endTs,
    });

    return {
      chargebacks: Number((data as FinancialMetrics | null)?.chargebacks ?? 0),
      valorChargebacks: Number((data as FinancialMetrics | null)?.valorChargebacks ?? 0),
      reembolsos: Number((data as FinancialMetrics | null)?.reembolsos ?? 0),
      valorReembolsos: Number((data as FinancialMetrics | null)?.valorReembolsos ?? 0),
    };
  }
}
