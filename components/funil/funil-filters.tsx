"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Check, ChevronDown } from "lucide-react";
import { DropdownMenu as RadixDropdownMenu } from "radix-ui";

import {
  SystemDateRangeFilter,
  type RangeValue,
  type SystemDateRangePreset,
} from "@/components/workspace/system-date-range-filter";
import { getTodayInAppTimezone, shiftDateString } from "@/lib/app-dates";
import type { PerformanceRange } from "@/lib/performance-pages";
import { cn } from "@/lib/utils";

type FunilPresetKey = "today" | "7d" | "30d" | "month" | "last-month";

type FunilPreset = SystemDateRangePreset<FunilPresetKey> & {
  range: PerformanceRange;
};

type SelectOption = {
  value: string;
  label: string;
};

type FunilPeriodFilterProps = {
  calendarTriggerClassName?: string;
  range: PerformanceRange;
};

type FunilSelectControlProps = {
  className?: string;
  displayLabel: string;
  label: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  value: string;
};

type FunilQuerySelectProps = {
  className?: string;
  displayLabel: string;
  label: string;
  options: SelectOption[];
  param: string;
  value: string;
};

type FunilFilterStripProps = {
  channels: SelectOption[];
  products: SelectOption[];
  selectedChannel: string;
  selectedProduct: string;
};

function toCalendarDate(value: string) {
  return new Date(`${value}T12:00:00`);
}

function toFunilDateString(value: Date) {
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

function normalizeRange(startDate: string, endDate: string): PerformanceRange {
  return startDate <= endDate
    ? { startDate, endDate }
    : { startDate: endDate, endDate: startDate };
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

function getPresets(): FunilPreset[] {
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

function getActivePreset(range: PerformanceRange, presets: FunilPreset[]) {
  return (
    presets.find(
      (preset) =>
        preset.range.startDate === range.startDate &&
        preset.range.endDate === range.endDate
    )?.key ?? "custom"
  );
}

function buildNextHref(pathname: string, params: URLSearchParams) {
  const query = params.toString();

  return query ? `${pathname}?${query}` : pathname;
}

export function FunilPeriodFilter({
  calendarTriggerClassName,
  range,
}: FunilPeriodFilterProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const presets = useMemo(() => getPresets(), []);
  const activeRange = getActivePreset(range, presets);
  const calendarValue = useMemo<RangeValue>(
    () => ({
      start: toCalendarDate(range.startDate),
      end: toCalendarDate(range.endDate),
    }),
    [range.endDate, range.startDate]
  );

  function applyRange(nextRange: PerformanceRange) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("startDate", nextRange.startDate);
    params.set("endDate", nextRange.endDate);
    params.delete("page");
    router.push(buildNextHref(pathname, params));
  }

  function selectCalendarRange(value: RangeValue | null) {
    if (!value?.start || !value.end) return;

    applyRange(
      normalizeRange(
        toFunilDateString(value.start),
        toFunilDateString(value.end)
      )
    );
  }

  return (
    <SystemDateRangeFilter
      activeRange={activeRange}
      appliedLabel={`Periodo aplicado: ${range.startDate} - ${range.endDate}`}
      ariaLabel="Periodo do funil"
      calendarTriggerClassName={calendarTriggerClassName}
      calendarValue={calendarValue}
      maxDate={toCalendarDate(getTodayInAppTimezone())}
      onCalendarChange={selectCalendarRange}
      onPresetSelect={(preset) => applyRange(preset.range)}
      presets={presets}
    />
  );
}

export function FunilSelectControl({
  className,
  displayLabel,
  label,
  onChange,
  options,
  value,
}: FunilSelectControlProps) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedOption = options.find((option) => option.value === value);
  const selectedLabel =
    selectedOption?.value === "all" ? "Todos" : selectedOption?.label ?? "Todos";
  const isFiltered = value !== "all";

  return (
    <RadixDropdownMenu.Root
      modal={false}
      open={isOpen}
      onOpenChange={setIsOpen}
    >
      <RadixDropdownMenu.Trigger
        aria-label={`Selecionar ${label}`}
        className={cn(
          "group flex h-10 w-full min-w-0 items-center justify-between gap-2 rounded-xl border bg-[var(--fly-control)] px-3 text-left text-[11px] font-medium text-[var(--fly-text-soft)] shadow-[inset_0_1px_0_rgba(255,255,255,0.035)] outline-none transition-colors duration-150 hover:border-[var(--fly-border-strong)] hover:bg-[var(--fly-control-hover)] focus-visible:ring-2 focus-visible:ring-[var(--fly-border-strong)] data-[state=open]:border-[var(--fly-border-strong)] data-[state=open]:bg-[var(--fly-control-hover)] sm:h-9 sm:rounded-[10px] sm:text-xs lg:bg-[var(--fly-control-solid)] lg:shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]",
          isFiltered
            ? "border-[var(--fly-border-strong)] text-[var(--fly-text)]"
            : "border-[var(--fly-border)]",
          className
        )}
      >
        <span className="shrink-0 text-[10px] font-semibold uppercase text-[var(--fly-text-muted)]">
          {displayLabel}
        </span>
        <span
          aria-hidden="true"
          className="h-3.5 w-px shrink-0 bg-[var(--fly-border)]"
        />
        <span className="min-w-0 flex-1 truncate">{selectedLabel}</span>
        <ChevronDown
          aria-hidden="true"
          className="size-3.5 shrink-0 text-[var(--fly-text-muted)] transition-transform duration-200 group-data-[state=open]:rotate-180"
        />
      </RadixDropdownMenu.Trigger>

      <RadixDropdownMenu.Portal>
        <RadixDropdownMenu.Content
          align="end"
          side="bottom"
          sideOffset={8}
          className="flynow-calendar-popover flynow-offer-select-content z-[90] max-h-[280px] w-[var(--radix-dropdown-menu-trigger-width)] min-w-[180px] overflow-y-auto rounded-xl border border-[var(--fly-border)] bg-[var(--fly-surface-elevated)] p-1 text-[var(--fly-text)] shadow-[var(--fly-tooltip-shadow)] backdrop-blur-[28px] data-[side=bottom]:origin-top-right"
        >
          <RadixDropdownMenu.RadioGroup value={value} onValueChange={onChange}>
            {options.map((option) => (
              <RadixDropdownMenu.RadioItem
                key={option.value}
                value={option.value}
                className="relative flex h-8 cursor-pointer select-none items-center rounded-[8px] py-1.5 pl-8 pr-3 text-xs font-medium text-[var(--fly-text-soft)] outline-none transition-colors duration-150 data-[highlighted]:bg-[var(--fly-control-hover)] data-[highlighted]:text-[var(--fly-text)] data-[state=checked]:text-[var(--fly-text)]"
              >
                <RadixDropdownMenu.ItemIndicator className="absolute left-2.5 inline-flex size-3.5 items-center justify-center text-[var(--fly-brand-strong)]">
                  <Check aria-hidden="true" className="size-3.5" />
                </RadixDropdownMenu.ItemIndicator>
                <span className="truncate">
                  {option.value === "all"
                    ? `Todos - ${displayLabel}`
                    : option.label}
                </span>
              </RadixDropdownMenu.RadioItem>
            ))}
          </RadixDropdownMenu.RadioGroup>
        </RadixDropdownMenu.Content>
      </RadixDropdownMenu.Portal>
    </RadixDropdownMenu.Root>
  );
}

export function FunilQuerySelect({
  className,
  displayLabel,
  label,
  options,
  param,
  value,
}: FunilQuerySelectProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  function selectValue(nextValue: string) {
    const params = new URLSearchParams(searchParams.toString());

    if (nextValue === "all") {
      params.delete(param);
    } else {
      params.set(param, nextValue);
    }

    params.delete("page");
    router.push(buildNextHref(pathname, params));
  }

  return (
    <FunilSelectControl
      className={className}
      displayLabel={displayLabel}
      label={label}
      onChange={selectValue}
      options={options}
      value={value}
    />
  );
}

export function FunilFilterStrip({
  channels,
  products,
  selectedChannel,
  selectedProduct,
}: FunilFilterStripProps) {
  return (
    <div className="flynow-dashboard-enter-item rounded-[8px] border border-[var(--fly-border)] bg-[var(--fly-surface)] px-3 py-2.5 shadow-[var(--fly-panel-inset)] sm:px-3.5">
      <div className="flex min-w-0 flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-center gap-2">
          <span
            aria-hidden="true"
            className="size-1.5 shrink-0 rounded-full bg-[var(--fly-brand-strong)]"
          />
          <p className="truncate text-xs font-semibold uppercase text-[var(--fly-text-muted)]">
            Recortes do funil
          </p>
        </div>

        <div className="grid min-w-0 gap-2 sm:grid-cols-2 lg:flex lg:w-auto lg:shrink-0 lg:items-center">
          <FunilQuerySelect
            className="lg:h-8 lg:w-[210px]"
            displayLabel="Produto"
            label="produto"
            options={products}
            param="product"
            value={selectedProduct}
          />
          <FunilQuerySelect
            className="lg:h-8 lg:w-[210px]"
            displayLabel="Canal"
            label="canal"
            options={channels}
            param="channel"
            value={selectedChannel}
          />
        </div>
      </div>
    </div>
  );
}
