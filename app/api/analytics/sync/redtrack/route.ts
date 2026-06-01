import { NextRequest, NextResponse } from "next/server";
import { syncRedtrackAnalytics } from "@/lib/redtrack";

export const dynamic = "force-dynamic";

function isAuthorized(req: NextRequest) {
  const expected = process.env.INTERNAL_API_SECRET;
  if (!expected) return true;
  const header = req.headers.get("x-internal-secret") ?? req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  return header === expected;
}

function parseDates(req: NextRequest) {
  const startDate = req.nextUrl.searchParams.get("startDate");
  const endDate = req.nextUrl.searchParams.get("endDate");
  const now = new Date();
  const fallbackEnd = now.toISOString().slice(0, 10);
  const fallbackStart = new Date(now.getTime() - 1000 * 60 * 60 * 24 * 30).toISOString().slice(0, 10);
  return {
    startDate: startDate ?? fallbackStart,
    endDate: endDate ?? fallbackEnd,
  };
}

async function handle(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const { startDate, endDate } = parseDates(req);
  const result = await syncRedtrackAnalytics({ startDate, endDate });

  return NextResponse.json({
    ok: true,
    startDate,
    endDate,
    ...result,
  });
}

export async function GET(req: NextRequest) {
  return handle(req);
}

export async function POST(req: NextRequest) {
  return handle(req);
}
