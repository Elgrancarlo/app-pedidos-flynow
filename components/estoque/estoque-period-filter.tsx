"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";

import {
  SystemDateRangeFilter,
  type SystemDateRangePreset,
} from "@/components/workspace/system-date-range-filter";
import { announceRouteRefreshStart } from "@/components/workspace/route-refresh-frame";
import type { EstoquePeriodoPreset } from "@/lib/estoque";

type EstoquePeriodPreset = SystemDateRangePreset<EstoquePeriodoPreset>;

type EstoquePeriodFilterProps = {
  active: EstoquePeriodoPreset;
};

const PERIOD_OPTIONS: EstoquePeriodPreset[] = [
  { key: "7", label: "Ultimos 7 dias", displayLabel: "7D" },
  { key: "15", label: "Ultimos 15 dias", displayLabel: "15D" },
  { key: "30", label: "Ultimos 30 dias", displayLabel: "30D" },
  { key: "90", label: "Ultimos 90 dias", displayLabel: "90D" },
  { key: "all", label: "Todo o periodo", displayLabel: "Tudo" },
];

function rangeHref(preset: EstoquePeriodoPreset) {
  return `/estoque?dias=${preset}`;
}

function appliedLabel(preset: EstoquePeriodoPreset) {
  return preset === "all"
    ? "Periodo aplicado: todo o periodo"
    : `Periodo aplicado: ultimos ${preset} dias`;
}

export function EstoquePeriodFilter({ active }: EstoquePeriodFilterProps) {
  const router = useRouter();
  const presets = useMemo(() => PERIOD_OPTIONS, []);

  function selectPreset(preset: EstoquePeriodPreset) {
    if (preset.key === active) return;

    announceRouteRefreshStart();
    router.push(rangeHref(preset.key));
  }

  return (
    <SystemDateRangeFilter
      activeRange={active}
      appliedLabel={appliedLabel(active)}
      ariaLabel="Periodo do estoque"
      onPresetSelect={selectPreset}
      presetAriaLabel="Selecionar periodo"
      presets={presets}
      showCalendar={false}
    />
  );
}
