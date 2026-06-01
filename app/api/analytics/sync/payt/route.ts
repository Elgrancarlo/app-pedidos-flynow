import { NextRequest, NextResponse } from "next/server";
import { syncPaytAnalytics } from "@/lib/payt-analytics";

export const dynamic = "force-dynamic";

function isAuthorized(req: NextRequest) {
  const expected = process.env.INTERNAL_API_SECRET;
  if (!expected) return true;
  const header = req.headers.get("x-internal-secret") ?? req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  return header === expected;
}

function getBrtToday() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function parseDates(req: NextRequest) {
  const startDate = req.nextUrl.searchParams.get("startDate");
  const endDate = req.nextUrl.searchParams.get("endDate");
  const hoje = getBrtToday();
  const start = new Date(hoje + "T12:00:00Z");
  start.setUTCDate(start.getUTCDate() - 90);
  return {
    startDate: startDate ?? start.toISOString().slice(0, 10),
    endDate: endDate ?? hoje,
  };
}

async function handle(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const { startDate, endDate } = parseDates(req);
  const result = await syncPaytAnalytics({ startDate, endDate });

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
