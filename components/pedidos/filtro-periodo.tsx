"use client";

import { useRouter } from "next/navigation";
import { useMemo } from "react";

import {
  SystemDateRangeFilter,
  type RangeValue,
  type SystemDateRangePreset,
} from "@/components/workspace/system-date-range-filter";

interface FiltroPeriodoProps {
  startDate: string;
  endDate: string;
  basePath?: string;
}

type PresetKey = "today" | "7d" | "15d" | "30d" | "month";

type PeriodPreset = SystemDateRangePreset<PresetKey> & {
  range: {
    startDate: string;
    endDate: string;
  };
};

function toISO(d: Date) {
  return d.toISOString().slice(0, 10);
}

function toCalendarDate(value: string) {
  return new Date(`${value}T12:00:00`);
}

function toDateString(value: Date) {
  return toISO(value);
}

function rangeHref(basePath: string, start: string, end: string) {
  return `${basePath}?startDate=${start}&endDate=${end}`;
}

function getPresets(basePath: string): PeriodPreset[] {
  const today = new Date();
  const end = toISO(today);
  const sevenDaysAgo = new Date(today);
  const fifteenDaysAgo = new Date(today);
  const thirtyDaysAgo = new Date(today);

  sevenDaysAgo.setDate(today.getDate() - 6);
  fifteenDaysAgo.setDate(today.getDate() - 14);
  thirtyDaysAgo.setDate(today.getDate() - 29);

  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const rawPresets: Array<Omit<PeriodPreset, "href">> = [
    {
      key: "today",
      label: "Hoje",
      displayLabel: "Hoje",
      range: { startDate: end, endDate: end },
    },
    {
      key: "7d",
      label: "7 dias",
      displayLabel: "7D",
      range: { startDate: toISO(sevenDaysAgo), endDate: end },
    },
    {
      key: "15d",
      label: "15 dias",
      displayLabel: "15D",
      range: { startDate: toISO(fifteenDaysAgo), endDate: end },
    },
    {
      key: "30d",
      label: "30 dias",
      displayLabel: "30D",
      range: { startDate: toISO(thirtyDaysAgo), endDate: end },
    },
    {
      key: "month",
      label: "Este mês",
      displayLabel: "Mês",
      range: { startDate: toISO(monthStart), endDate: end },
    },
  ];

  return rawPresets.map((preset) => ({
    ...preset,
    href: rangeHref(basePath, preset.range.startDate, preset.range.endDate),
  }));
}

export default function FiltroPeriodo({
  startDate,
  endDate,
  basePath = "/pedidos",
}: FiltroPeriodoProps) {
  const router = useRouter();
  const presets = useMemo(() => getPresets(basePath), [basePath]);
  const activeRange =
    presets.find(
      (preset) =>
        preset.range.startDate === startDate && preset.range.endDate === endDate
    )?.key ?? "custom";
  const calendarValue = useMemo<RangeValue>(
    () => ({
      start: toCalendarDate(startDate),
      end: toCalendarDate(endDate),
    }),
    [endDate, startDate]
  );

  function selectCalendarRange(value: RangeValue | null) {
    if (!value?.start || !value.end) return;

    const start = toDateString(value.start);
    const end = toDateString(value.end);
    router.push(rangeHref(basePath, start <= end ? start : end, start <= end ? end : start));
  }

  return (
    <SystemDateRangeFilter
      activeRange={activeRange}
      appliedLabel={`Período aplicado: ${startDate} - ${endDate}`}
      ariaLabel="Filtro de período"
      calendarValue={calendarValue}
      onCalendarChange={selectCalendarRange}
      presets={presets}
    />
  );
}
