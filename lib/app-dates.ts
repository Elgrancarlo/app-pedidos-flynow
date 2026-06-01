export const APP_UTC_OFFSET = "-03:00";

export function getTodayInAppTimezone() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function shiftDateString(date: string, days: number) {
  const base = new Date(`${date}T12:00:00Z`);
  base.setUTCDate(base.getUTCDate() + days);
  return base.toISOString().slice(0, 10);
}

export function getUtcRangeForAppDate(date: string) {
  return {
    startTs: new Date(`${date}T00:00:00${APP_UTC_OFFSET}`).toISOString(),
    endTs: new Date(`${date}T23:59:59.999${APP_UTC_OFFSET}`).toISOString(),
  };
}

export function getUtcRangeForAppDates(startDate: string, endDate: string) {
  return {
    startTs: getUtcRangeForAppDate(startDate).startTs,
    endTs: getUtcRangeForAppDate(endDate).endTs,
  };
}
