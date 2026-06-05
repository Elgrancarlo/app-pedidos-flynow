"use client";

import type { ReactNode } from "react";
import { Check, ChevronDown } from "lucide-react";
import { DropdownMenu as RadixDropdownMenu } from "radix-ui";

import { cn } from "@/lib/utils";

const EMPTY_VALUE = "__flynow_empty_select_value__";

export type SystemSelectOption = {
  disabled?: boolean;
  label: string;
  value: string;
};

type SystemSelectProps = {
  align?: "center" | "end" | "start";
  ariaLabel: string;
  className?: string;
  contentClassName?: string;
  disabled?: boolean;
  displayLabel?: string;
  onValueChange: (value: string) => void;
  options: SystemSelectOption[];
  placeholder?: string;
  prefix?: ReactNode;
  selectedLabel?: string;
  suffix?: ReactNode;
  triggerClassName?: string;
  value: string;
};

function toMenuValue(value: string) {
  return value === "" ? EMPTY_VALUE : value;
}

function fromMenuValue(value: string) {
  return value === EMPTY_VALUE ? "" : value;
}

export function SystemSelect({
  align = "end",
  ariaLabel,
  className,
  contentClassName,
  disabled = false,
  displayLabel,
  onValueChange,
  options,
  placeholder = "Selecionar",
  prefix,
  selectedLabel,
  suffix,
  triggerClassName,
  value,
}: SystemSelectProps) {
  const selectedOption = options.find((option) => option.value === value);
  const label = selectedLabel ?? selectedOption?.label ?? placeholder;
  const isPlaceholder = !selectedOption && !selectedLabel;

  return (
    <RadixDropdownMenu.Root modal={false}>
      <RadixDropdownMenu.Trigger asChild>
        <button
          type="button"
          aria-label={ariaLabel}
          disabled={disabled}
          className={cn(
            "group flex h-10 w-full min-w-0 items-center justify-between gap-2 rounded-[8px] border border-[var(--fly-border)] bg-[var(--fly-control)] px-3 text-left text-sm font-medium text-[var(--fly-text-soft)] shadow-[inset_0_1px_0_rgba(255,255,255,0.035)] outline-none transition-colors duration-150 hover:border-[var(--fly-border-strong)] hover:bg-[var(--fly-control-hover)] focus-visible:ring-2 focus-visible:ring-[var(--fly-brand-ring)] disabled:cursor-not-allowed disabled:opacity-50 data-[state=open]:border-[var(--fly-brand-border)] data-[state=open]:bg-[var(--fly-control-hover)]",
            className,
            triggerClassName
          )}
        >
          {prefix ? <span className="shrink-0 text-current">{prefix}</span> : null}
          {displayLabel ? (
            <>
              <span className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--fly-text-muted)]">
                {displayLabel}
              </span>
              <span
                aria-hidden="true"
                className="h-3.5 w-px shrink-0 bg-[var(--fly-border)]"
              />
            </>
          ) : null}
          <span
            className={cn(
              "min-w-0 flex-1 truncate",
              isPlaceholder && "text-[var(--fly-text-dim)]"
            )}
          >
            {label}
          </span>
          {suffix ?? (
            <ChevronDown
              aria-hidden="true"
              className="size-3.5 shrink-0 text-[var(--fly-text-muted)] transition-transform duration-200 group-data-[state=open]:rotate-180"
            />
          )}
        </button>
      </RadixDropdownMenu.Trigger>

      <RadixDropdownMenu.Portal>
        <RadixDropdownMenu.Content
          align={align}
          side="bottom"
          sideOffset={8}
          className={cn(
            "flynow-calendar-popover flynow-offer-select-content z-[80] max-h-[300px] w-[var(--radix-dropdown-menu-trigger-width)] min-w-[180px] overflow-y-auto rounded-xl border border-[var(--fly-brand-border)] bg-[var(--fly-surface-elevated)] p-1 text-[var(--fly-text)] shadow-[0_28px_90px_rgba(0,0,0,0.6),0_0_0_1px_rgba(255,255,255,0.045),inset_0_1px_0_rgba(255,255,255,0.13),inset_0_0_36px_rgba(255,255,255,0.035)] backdrop-blur-[28px] data-[side=bottom]:origin-top-right",
            contentClassName
          )}
        >
          <RadixDropdownMenu.RadioGroup
            value={toMenuValue(value)}
            onValueChange={(nextValue) => onValueChange(fromMenuValue(nextValue))}
          >
            {options.map((option) => (
              <RadixDropdownMenu.RadioItem
                key={`${option.value}:${option.label}`}
                value={toMenuValue(option.value)}
                disabled={option.disabled}
                className="relative flex h-8 cursor-pointer select-none items-center rounded-[8px] py-1.5 pl-8 pr-3 text-xs font-medium text-[var(--fly-text-soft)] outline-none transition-colors duration-150 data-[disabled]:cursor-not-allowed data-[disabled]:opacity-45 data-[highlighted]:bg-[var(--fly-control-hover)] data-[highlighted]:text-[var(--fly-text)] data-[state=checked]:text-[var(--fly-text)]"
              >
                <RadixDropdownMenu.ItemIndicator className="absolute left-2.5 inline-flex size-3.5 items-center justify-center text-[var(--fly-brand-strong)]">
                  <Check aria-hidden="true" className="size-3.5" />
                </RadixDropdownMenu.ItemIndicator>
                <span className="truncate">{option.label}</span>
              </RadixDropdownMenu.RadioItem>
            ))}
          </RadixDropdownMenu.RadioGroup>
        </RadixDropdownMenu.Content>
      </RadixDropdownMenu.Portal>
    </RadixDropdownMenu.Root>
  );
}
