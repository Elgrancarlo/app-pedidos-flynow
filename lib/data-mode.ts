export type FlynowDataMode = "mock" | "real";

export function getFlynowDataMode(): FlynowDataMode {
  if (process.env.NODE_ENV === "production") {
    return "real";
  }

  const value =
    process.env.NEXT_PUBLIC_FLYNOW_DATA_MODE ?? process.env.FLYNOW_DATA_MODE;

  return value?.trim().toLowerCase() === "mock" ? "mock" : "real";
}

export function shouldUseMockData() {
  return getFlynowDataMode() === "mock";
}
