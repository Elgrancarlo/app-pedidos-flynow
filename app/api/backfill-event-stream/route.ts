import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { buildPaytEventStreamRow, type PaytPayload } from "@/lib/payt-events";

export const dynamic = "force-dynamic";

function isAuthorized(req: NextRequest) {
  const expected = process.env.INTERNAL_API_SECRET;
  if (!expected) return true;
  const header = req.headers.get("x-internal-secret") ?? req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  return header === expected;
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const PAGE = 1000;
  let totalProcessed = 0;
  let totalInserted = 0;
  let totalSkipped = 0;
  const errors: string[] = [];

  for (let offset = 0; ; offset += PAGE) {
    const { data: rawRows, error } = await supabase
      .from("payt_webhooks_raw")
      .select("payload")
      .range(offset, offset + PAGE - 1);

    if (error) {
      errors.push("Fetch error at offset " + offset + ": " + error.message);
      break;
    }

    if (!rawRows || rawRows.length === 0) break;
    totalProcessed += rawRows.length;

    const eventRows: Record<string, unknown>[] = [];
    for (const row of rawRows) {
      try {
        const payload = row.payload as PaytPayload;
        if (!payload || typeof payload !== "object") {
          totalSkipped++;
          continue;
        }
        const eventRow = buildPaytEventStreamRow(payload);
        if (!eventRow.transaction_id) {
          totalSkipped++;
          continue;
        }
        eventRows.push(eventRow as unknown as Record<string, unknown>);
      } catch {
        totalSkipped++;
      }
    }

    if (eventRows.length > 0) {
      const { error: upsertError } = await supabase
        .from("payt_event_stream")
        .upsert(eventRows, { onConflict: "event_key", ignoreDuplicates: true });

      if (upsertError) {
        errors.push("Upsert error at offset " + offset + ": " + upsertError.message);
      } else {
        totalInserted += eventRows.length;
      }
    }

    if (rawRows.length < PAGE) break;
  }

  return NextResponse.json({
    ok: errors.length === 0,
    processed: totalProcessed,
    inserted: totalInserted,
    skipped: totalSkipped,
    errors: errors.length > 0 ? errors.slice(0, 10) : undefined,
  });
}
