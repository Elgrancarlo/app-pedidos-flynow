"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";

import {
  SystemDateRangeFilter,
  type RangeValue,
  type SystemDateRangePreset,
} from "@/components/workspace/system-date-range-filter";
import { getTodayInAppTimezone, shiftDateString } from "@/lib/app-dates";
import type { PerformanceRange } from "@/lib/performance-pages";

type AnalyticsPresetKey = "today" | "7d" | "30d" | "month" | "last-month";

type AnalyticsPreset = SystemDateRangePreset<AnalyticsPresetKey> & {
  range: PerformanceRange;
};

type AnalyticsPeriodFilterProps = {
  range: PerformanceRange;
};

function toCalendarDate(value: string) {
  return new Date(`${value}T12:00:00`);
}

function toAnalyticsDateString(value: Date) {
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
    ? ({ startDate, endDate } satisfies PerformanceRange)
    : ({ startDate: endDate, endDate: startDate } satisfies PerformanceRange);
}

function rangeHref(range: PerformanceRange) {
  return `/analytics?startDate=${range.startDate}&endDate=${range.endDate}`;
}

function previousMonthRange(today: string): PerformanceRange {
  const previousMonth = new Date(`${today}T12:00:00`);
  previousMonth.setMonth(previousMonth.getMonth() - 1);
  const year = previousMonth.getFullYear();
  const month = String(previousMonth.getMonth() + 1).padStart(2, "0");
  const lastDay = new Date(year, previousMonth.getMonth() + 1, 0)
    .getDate()
    .toString()
    .padStart(2, "0");

  return {
    startDate: `${year}-${month}-01`,
    endDate: `${year}-${month}-${lastDay}`,
  };
}

function getPresets(): AnalyticsPreset[] {
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
    {
      key: "last-month",
      label: "Mes anterior",
      displayLabel: "Anterior",
      range: previousMonthRange(today),
    },
  ];
}

function getActivePreset(range: PerformanceRange, presets: AnalyticsPreset[]) {
  return (
    presets.find(
      (preset) =>
        preset.range.startDate === range.startDate &&
        preset.range.endDate === range.endDate
    )?.key ?? "custom"
  );
}

export function AnalyticsPeriodFilter({ range }: AnalyticsPeriodFilterProps) {
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

  function selectPresetRange(preset: AnalyticsPreset) {
    router.push(rangeHref(preset.range));
  }

  function selectCalendarRange(value: RangeValue | null) {
    if (!value?.start || !value.end) return;

    const nextRange = normalizeRange(
      toAnalyticsDateString(value.start),
      toAnalyticsDateString(value.end)
    );

    router.push(rangeHref(nextRange));
  }

  return (
    <SystemDateRangeFilter
      activeRange={activeRange}
      appliedLabel={`Periodo aplicado: ${range.startDate} - ${range.endDate}`}
      ariaLabel="Periodo de analytics"
      calendarValue={calendarValue}
      maxDate={toCalendarDate(getTodayInAppTimezone())}
      onCalendarChange={selectCalendarRange}
      onPresetSelect={selectPresetRange}
      presets={presets}
    />
  );
}
