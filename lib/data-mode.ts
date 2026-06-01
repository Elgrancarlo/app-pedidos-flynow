export type FlynowDataMode = "mock" | "real";

export function getFlynowDataMode(): FlynowDataMode {
  const value =
    process.env.NEXT_PUBLIC_FLYNOW_DATA_MODE ?? process.env.FLYNOW_DATA_MODE;

  return value === "real" ? "real" : "mock";
}

export function shouldUseMockData() {
  return getFlynowDataMode() === "mock";
}
