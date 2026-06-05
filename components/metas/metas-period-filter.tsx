"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";

import {
  SystemDateRangeFilter,
  type RangeValue,
  type SystemDateRangePreset,
} from "@/components/workspace/system-date-range-filter";
import { getTodayInAppTimezone, shiftDateString } from "@/lib/app-dates";
import type { MetasRange } from "@/lib/metas";

type MetasPresetKey = "today" | "7d" | "15d" | "30d" | "month";

type MetasPreset = SystemDateRangePreset<MetasPresetKey> & {
  range: MetasRange;
};

function toCalendarDate(value: string) {
  return new Date(`${value}T12:00:00`);
}

function toMetasDateString(value: Date) {
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

function normalizeRange(startDate: string, endDate: string): MetasRange {
  return startDate <= endDate
    ? { startDate, endDate }
    : { startDate: endDate, endDate: startDate };
}

function rangeHref(range: MetasRange) {
  return `/metas?startDate=${range.startDate}&endDate=${range.endDate}`;
}

function getPresets(): MetasPreset[] {
  const today = getTodayInAppTimezone();

  return [
    {
      displayLabel: "Hoje",
      key: "today",
      label: "Hoje",
      range: { startDate: today, endDate: today },
    },
    {
      displayLabel: "7D",
      key: "7d",
      label: "Últimos 7 dias",
      range: { startDate: shiftDateString(today, -6), endDate: today },
    },
    {
      displayLabel: "15D",
      key: "15d",
      label: "Últimos 15 dias",
      range: { startDate: shiftDateString(today, -14), endDate: today },
    },
    {
      displayLabel: "30D",
      key: "30d",
      label: "Últimos 30 dias",
      range: { startDate: shiftDateString(today, -29), endDate: today },
    },
    {
      displayLabel: "Mês",
      key: "month",
      label: "Este mês",
      range: { startDate: `${today.slice(0, 8)}01`, endDate: today },
    },
  ];
}

function getActivePreset(range: MetasRange, presets: MetasPreset[]) {
  return (
    presets.find(
      (preset) =>
        preset.range.startDate === range.startDate &&
        preset.range.endDate === range.endDate
    )?.key ?? "custom"
  );
}

export function MetasPeriodFilter({ range }: { range: MetasRange }) {
  const router = useRouter();
  const presets = useMemo(() => getPresets(), []);
  const activeRange = getActivePreset(range, presets);
  const calendarValue = useMemo<RangeValue>(
    () => ({
      end: toCalendarDate(range.endDate),
      start: toCalendarDate(range.startDate),
    }),
    [range.endDate, range.startDate]
  );

  function selectPresetRange(preset: MetasPreset) {
    router.push(rangeHref(preset.range));
  }

  function selectCalendarRange(value: RangeValue | null) {
    if (!value?.start || !value.end) return;

    router.push(
      rangeHref(
        normalizeRange(
          toMetasDateString(value.start),
          toMetasDateString(value.end)
        )
      )
    );
  }

  return (
    <SystemDateRangeFilter
      activeRange={activeRange}
      appliedLabel={`Período aplicado: ${range.startDate} - ${range.endDate}`}
      ariaLabel="Período de metas"
      calendarValue={calendarValue}
      maxDate={toCalendarDate(getTodayInAppTimezone())}
      onCalendarChange={selectCalendarRange}
      onPresetSelect={selectPresetRange}
      presets={presets}
    />
  );
}
