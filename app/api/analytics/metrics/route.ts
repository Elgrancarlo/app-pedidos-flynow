import { NextRequest, NextResponse } from "next/server";
import {
  defaultAnalyticsDates,
  getAnalyticsOverview,
  getChannelAnalytics,
  getFunilAnalytics,
} from "@/lib/analytics";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const section = req.nextUrl.searchParams.get("section") ?? "overview";
  const defaults = defaultAnalyticsDates();
  const startDate = req.nextUrl.searchParams.get("startDate") ?? defaults.startDate;
  const endDate = req.nextUrl.searchParams.get("endDate") ?? defaults.endDate;
  const product = req.nextUrl.searchParams.get("product");
  const channel = req.nextUrl.searchParams.get("channel");

  if (section === "funil") {
    return NextResponse.json(
      await getFunilAnalytics(startDate, endDate, product, channel),
    );
  }

  if (section === "canais") {
    return NextResponse.json(
      await getChannelAnalytics(startDate, endDate, channel),
    );
  }

  return NextResponse.json(
    await getAnalyticsOverview(startDate, endDate),
  );
}
