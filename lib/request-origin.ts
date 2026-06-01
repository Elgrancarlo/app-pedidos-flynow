import { NextRequest } from "next/server";

function normalizeOrigin(value: string) {
  return value.replace(/\/$/, "").toLowerCase();
}

export function isTrustedAppRequest(req: NextRequest) {
  const expectedOrigin = process.env.NEXT_PUBLIC_APP_URL;
  if (!expectedOrigin) return true;

  const normalizedExpected = normalizeOrigin(expectedOrigin);
  const origin = req.headers.get("origin");
  const referer = req.headers.get("referer");

  if (origin && normalizeOrigin(origin) === normalizedExpected) return true;
  if (referer) {
    try {
      const refererOrigin = new URL(referer).origin;
      if (normalizeOrigin(refererOrigin) === normalizedExpected) return true;
    } catch {
      return false;
    }
  }

  return false;
}

