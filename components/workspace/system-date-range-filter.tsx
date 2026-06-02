"use client";

import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { useCallback, useEffect, useRef, useState } from "react";

import { Calendar, type RangeValue } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

export type { RangeValue };

export type SystemDateRangePreset<Key extends string = string> = {
  key: Key;
  label: string;
  displayLabel: string;
  href?: string;
};

type SystemDateRangeFilterProps<
  Preset extends SystemDateRangePreset = SystemDateRangePreset,
> = {
  activeRange: Preset["key"] | "custom" | string;
  appliedLabel?: string;
  ariaLabel: string;
  calendarCloseSignal?: number;
  calendarTriggerClassName?: string;
  calendarValue?: RangeValue | null;
  className?: string;
  leadingActions?: ReactNode;
  maxDate?: Date;
  onCalendarBeforeOpen?: () => void;
  onCalendarChange?: (value: RangeValue | null) => void;
  onPresetSelect?: (preset: Preset) => void;
  presetAriaLabel?: string;
  presets: readonly Preset[];
  showCalendar?: boolean;
};

export function SystemDateRangeFilter<
  Preset extends SystemDateRangePreset = SystemDateRangePreset,
>({
  activeRange,
  appliedLabel,
  ariaLabel,
  calendarCloseSignal,
  calendarTriggerClassName,
  calendarValue = null,
  className,
  leadingActions,
  maxDate,
  onCalendarBeforeOpen,
  onCalendarChange,
  onPresetSelect,
  presetAriaLabel = "Selecionar período",
  presets,
  showCalendar = true,
}: SystemDateRangeFilterProps<Preset>) {
  const presetGroupRef = useRef<HTMLDivElement | null>(null);
  const presetButtonRefs = useRef<Record<string, HTMLElement | null>>({});
  const activePreset = presets.find((preset) => preset.key === activeRange);
  const isCustomRange =
    activeRange === "custom" && Boolean(calendarValue?.start && calendarValue.end);
  const canRenderCalendar = showCalendar && Boolean(onCalendarChange);
  const [presetUnderline, setPresetUnderline] = useState({
    x: 0,
    y: 0,
    width: 0,
    visible: false,
  });

  const updatePresetUnderline = useCallback(() => {
    const group = presetGroupRef.current;
    const activeButton = activePreset
      ? presetButtonRefs.current[activePreset.key]
      : null;

    if (!group || !activeButton) {
      setPresetUnderline((currentUnderline) =>
        currentUnderline.visible
          ? { ...currentUnderline, visible: false }
          : currentUnderline
      );
      return;
    }

    const nextUnderline = {
      x: activeButton.offsetLeft + 8,
      y: activeButton.offsetTop + activeButton.offsetHeight - 5,
      width: Math.max(activeButton.offsetWidth - 16, 12),
      visible: true,
    };

    setPresetUnderline((currentUnderline) => {
      if (
        currentUnderline.visible === nextUnderline.visible &&
        Math.abs(currentUnderline.x - nextUnderline.x) < 0.5 &&
        Math.abs(currentUnderline.y - nextUnderline.y) < 0.5 &&
        Math.abs(currentUnderline.width - nextUnderline.width) < 0.5
      ) {
        return currentUnderline;
      }

      return nextUnderline;
    });
  }, [activePreset]);

  useEffect(() => {
    const animationFrame = window.requestAnimationFrame(updatePresetUnderline);

    return () => window.cancelAnimationFrame(animationFrame);
  }, [updatePresetUnderline]);

  useEffect(() => {
    const group = presetGroupRef.current;

    if (!group) {
      return;
    }

    const handleResize = () => updatePresetUnderline();
    window.addEventListener("resize", handleResize);
    group.addEventListener("scroll", handleResize, { passive: true });

    const resizeObserver =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(updatePresetUnderline)
        : null;

    resizeObserver?.observe(group);

    if (activePreset) {
      const activeButton = presetButtonRefs.current[activePreset.key];

      if (activeButton) {
        resizeObserver?.observe(activeButton);
      }
    }

    return () => {
      window.removeEventListener("resize", handleResize);
      group.removeEventListener("scroll", handleResize);
      resizeObserver?.disconnect();
    };
  }, [activePreset, updatePresetUnderline]);

  const presetUnderlineStyle = {
    "--flynow-preset-underline-x": `${presetUnderline.x}px`,
    "--flynow-preset-underline-y": `${presetUnderline.y}px`,
    "--flynow-preset-underline-width": `${presetUnderline.width}px`,
  } as CSSProperties;

  return (
    <div
      className={cn(
        "contents lg:flex lg:w-auto lg:min-w-0 lg:flex-col lg:items-end lg:gap-2",
        className
      )}
    >
      <div
        role="group"
        aria-label={ariaLabel}
        className="flynow-period-filter contents lg:flex lg:w-auto lg:max-w-full lg:flex-row lg:items-center lg:gap-1 lg:rounded-[12px] lg:border lg:border-[var(--fly-border)] lg:bg-[var(--fly-surface-elevated)] lg:p-1 lg:shadow-[var(--fly-panel-shadow)]"
      >
        {canRenderCalendar || leadingActions ? (
          <div className="col-start-2 row-start-1 flex min-w-0 items-center justify-end gap-1.5 self-center lg:col-auto lg:row-auto">
            {leadingActions}

            {canRenderCalendar ? (
              <div className="flynow-date-picker dark min-w-0 lg:w-auto">
                <Calendar
                  value={calendarValue}
                  onChange={onCalendarChange ?? (() => undefined)}
                  horizontalLayout
                  showTimeInput={false}
                  maxValue={maxDate}
                  popoverAlignment="end"
                  triggerActive={isCustomRange}
                  closeSignal={calendarCloseSignal}
                  onBeforeOpen={onCalendarBeforeOpen}
                  compactMobileLabel
                  className="w-auto lg:w-auto"
                  triggerClassName={cn(
                    "!h-10 !w-[132px] !rounded-xl !border-[var(--fly-border)] !bg-[var(--fly-control)] !px-3 !text-[11px] !font-medium !text-[var(--fly-text-soft)] !shadow-[var(--fly-panel-inset)] hover:!border-[var(--fly-border-strong)] hover:!bg-[var(--fly-control-hover)] min-[390px]:!w-[140px] sm:!h-7 sm:!w-[228px] sm:!rounded-[10px] sm:!px-2.5 lg:!border-[var(--fly-border-strong)] lg:!bg-[var(--fly-control-solid)] lg:!text-xs lg:!shadow-[var(--fly-panel-inset)] lg:hover:!bg-[var(--fly-control-hover)]",
                    isCustomRange
                      ? "!border-[var(--fly-brand-border)] !text-[var(--fly-text)] !shadow-[var(--fly-panel-shadow)]"
                      : "lg:!text-[var(--fly-text-soft)]",
                    calendarTriggerClassName
                  )}
                  popoverClassName="!z-[120] !border-[var(--fly-brand-border)] !bg-[var(--fly-surface-elevated)]"
                />
              </div>
            ) : null}
          </div>
        ) : null}

        {canRenderCalendar || leadingActions ? (
          <div
            aria-hidden="true"
            className="hidden h-5 w-px bg-[var(--fly-border)] lg:block"
          />
        ) : null}

        <div
          ref={presetGroupRef}
          role="group"
          aria-label={presetAriaLabel}
          className="flynow-period-presets relative col-span-2 row-start-2 -mx-4 flex max-w-[calc(100vw-1px)] gap-1 overflow-x-auto overscroll-x-contain px-4 pb-1 pt-0.5 sm:-mx-5 sm:px-5 md:mx-0 md:grid md:w-full md:max-w-full md:grid-cols-5 md:overflow-visible md:px-0 md:pb-0 lg:col-auto lg:row-auto lg:flex lg:w-auto lg:items-center"
        >
          <span
            aria-hidden="true"
            className="flynow-preset-underline"
            data-visible={presetUnderline.visible ? "true" : "false"}
            style={presetUnderlineStyle}
          />
          {presets.map((preset) => {
            const isActive = activeRange === preset.key;
            const controlClassName = cn(
              "relative h-10 shrink-0 whitespace-nowrap rounded-xl px-3.5 text-xs font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--fly-brand-ring)] sm:h-7 sm:rounded-[9px] sm:px-2.5 md:shrink lg:min-w-10",
              isActive
                ? "bg-[var(--fly-control)] text-[var(--fly-text)] shadow-[var(--fly-panel-inset)] lg:bg-[var(--fly-control-active)] lg:shadow-[var(--fly-panel-shadow)]"
                : "text-[var(--fly-text-muted)] hover:bg-[var(--fly-control)] hover:text-[var(--fly-text-soft)] lg:hover:bg-[var(--fly-control-solid)]"
            );

            if (preset.href) {
              return (
                <Link
                  key={preset.key}
                  ref={(element) => {
                    presetButtonRefs.current[preset.key] = element;
                  }}
                  href={preset.href}
                  title={preset.label}
                  aria-label={preset.label}
                  aria-current={isActive ? "page" : undefined}
                  className={controlClassName}
                >
                  {preset.displayLabel}
                </Link>
              );
            }

            return (
              <button
                key={preset.key}
                ref={(element) => {
                  presetButtonRefs.current[preset.key] = element;
                }}
                type="button"
                title={preset.label}
                aria-label={preset.label}
                aria-pressed={isActive}
                onClick={() => onPresetSelect?.(preset)}
                className={controlClassName}
              >
                {preset.displayLabel}
              </button>
            );
          })}
        </div>
      </div>

      {appliedLabel ? <span className="sr-only">{appliedLabel}</span> : null}
    </div>
  );
}
