"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";

import {
  SystemDateRangeFilter,
  type RangeValue,
  type SystemDateRangePreset,
} from "@/components/workspace/system-date-range-filter";
import { getTodayInAppTimezone, shiftDateString } from "@/lib/app-dates";
import type { FinanceiroRange } from "@/lib/financeiro";

type FinanceiroPresetKey = "today" | "7d" | "15d" | "30d" | "month";

type FinanceiroPreset = SystemDateRangePreset<FinanceiroPresetKey> & {
  range: FinanceiroRange;
};

type FinanceiroPeriodFilterProps = {
  range: FinanceiroRange;
};

function toCalendarDate(value: string) {
  return new Date(`${value}T12:00:00`);
}

function toFinanceiroDateString(value: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "America/Sao_Paulo",
    year: "numeric",
  }).formatToParts(value);
  const dateParts = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value])
  );

  return `${dateParts.year}-${dateParts.month}-${dateParts.day}`;
}

function normalizeRange(startDate: string, endDate: string) {
  return startDate <= endDate
    ? ({ startDate, endDate } satisfies FinanceiroRange)
    : ({ startDate: endDate, endDate: startDate } satisfies FinanceiroRange);
}

function rangeHref(range: FinanceiroRange) {
  return `/financeiro?startDate=${range.startDate}&endDate=${range.endDate}`;
}

function getPresets(): FinanceiroPreset[] {
  const today = getTodayInAppTimezone();

  return [
    {
      key: "today",
      label: "Hoje",
      displayLabel: "Hoje",
      range: { startDate: today, endDate: today },
    },
    {
      key: "7d",
      label: "Ultimos 7 dias",
      displayLabel: "7D",
      range: { startDate: shiftDateString(today, -6), endDate: today },
    },
    {
      key: "15d",
      label: "Ultimos 15 dias",
      displayLabel: "15D",
      range: { startDate: shiftDateString(today, -14), endDate: today },
    },
    {
      key: "30d",
      label: "Ultimos 30 dias",
      displayLabel: "30D",
      range: { startDate: shiftDateString(today, -29), endDate: today },
    },
    {
      key: "month",
      label: "Este mes",
      displayLabel: "Mes",
      range: { startDate: `${today.slice(0, 8)}01`, endDate: today },
    },
  ];
}

function getActivePreset(range: FinanceiroRange, presets: FinanceiroPreset[]) {
  return (
    presets.find(
      (preset) =>
        preset.range.startDate === range.startDate &&
        preset.range.endDate === range.endDate
    )?.key ?? "custom"
  );
}

export function FinanceiroPeriodFilter({ range }: FinanceiroPeriodFilterProps) {
  const router = useRouter();
  const presets = useMemo(() => getPresets(), []);
  const activeRange = getActivePreset(range, presets);
  const calendarValue = useMemo<RangeValue>(
    () => ({
      start: toCalendarDate(range.startDate),
      end: toCalendarDate(range.endDate),
    }),
    [range.endDate, range.startDate]
  );

  function selectPresetRange(preset: FinanceiroPreset) {
    router.push(rangeHref(preset.range));
  }

  function selectCalendarRange(value: RangeValue | null) {
    if (!value?.start || !value.end) return;

    const nextRange = normalizeRange(
      toFinanceiroDateString(value.start),
      toFinanceiroDateString(value.end)
    );

    router.push(rangeHref(nextRange));
  }

  return (
    <SystemDateRangeFilter
      activeRange={activeRange}
      appliedLabel={`Periodo aplicado: ${range.startDate} - ${range.endDate}`}
      ariaLabel="Periodo financeiro"
      calendarValue={calendarValue}
      maxDate={toCalendarDate(getTodayInAppTimezone())}
      onCalendarChange={selectCalendarRange}
      onPresetSelect={selectPresetRange}
      presets={presets}
    />
  );
}
