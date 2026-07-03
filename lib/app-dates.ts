export const APP_UTC_OFFSET = "-03:00";

export function getTodayInAppTimezone() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function toAppDateString(value: Date | string | null | undefined) {
  if (!value) return "";

  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function shiftDateString(date: string, days: number) {
  const base = new Date(`${date}T12:00:00Z`);
  base.setUTCDate(base.getUTCDate() + days);
  return base.toISOString().slice(0, 10);
}

// Os timestamps da Payt chegam em hora BRT sem timezone e são gravados
// VERBATIM como UTC (event_stream.paid_at/event_at, pedidos.data_pagamento) —
// convenção herdada do n8n. Um dia BRT do app corresponde, portanto, ao
// próprio dia em UTC no banco, sem deslocamento de offset. Aplicar -03:00
// aqui cortaria as vendas da madrugada (00h–03h) do dia filtrado.
export function getUtcRangeForAppDate(date: string) {
  return {
    startTs: `${date}T00:00:00.000Z`,
    endTs: `${date}T23:59:59.999Z`,
  };
}

export function getUtcRangeForAppDates(startDate: string, endDate: string) {
  return {
    startTs: getUtcRangeForAppDate(startDate).startTs,
    endTs: getUtcRangeForAppDate(endDate).endTs,
  };
}
