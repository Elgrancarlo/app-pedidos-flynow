import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

type Tone = "gold" | "blue" | "green" | "red" | "neutral";

const toneStyles: Record<
  Tone,
  {
    dot: string;
    icon: string;
    bar: string;
    text: string;
    surface: string;
  }
> = {
  gold: {
    dot: "bg-[#D6A84F]",
    icon: "text-[var(--fly-brand-strong)]",
    bar: "bg-[#D6A84F]",
    text: "text-[var(--fly-brand-strong)]",
    surface: "border-[var(--fly-brand-border)] bg-[var(--fly-brand-surface)]",
  },
  blue: {
    dot: "bg-[#60A5FA]",
    icon: "text-[#93C5FD]",
    bar: "bg-[#60A5FA]",
    text: "text-[#93C5FD]",
    surface: "border-[#60A5FA]/20 bg-[#0A1424]",
  },
  green: {
    dot: "bg-[#4ADE80]",
    icon: "text-[#86EFAC]",
    bar: "bg-[#4ADE80]",
    text: "text-[#86EFAC]",
    surface: "border-[#4ADE80]/18 bg-[#0D1F14]/80",
  },
  red: {
    dot: "bg-[#F87171]",
    icon: "text-[var(--fly-danger-strong)]",
    bar: "bg-[#F87171]",
    text: "text-[var(--fly-danger-strong)]",
    surface: "border-[var(--fly-danger-border)] bg-[var(--fly-danger-bg)]",
  },
  neutral: {
    dot: "bg-white/35",
    icon: "text-[var(--fly-text-muted)]",
    bar: "bg-white/35",
    text: "text-[var(--fly-text-soft)]",
    surface: "border-[var(--fly-border)] bg-[var(--fly-control)]",
  },
};

export function PageBody({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-w-0 overflow-x-clip px-3.5 pb-28 pt-4 sm:px-5 sm:pt-5 xl:px-6 xl:pb-10 xl:pt-6">
      <div className="flex flex-col gap-4 sm:gap-5">{children}</div>
    </div>
  );
}

export function StatGrid({
  children,
  columns = "xl:grid-cols-4",
}: {
  children: React.ReactNode;
  columns?: string;
}) {
  return <div className={cn("grid gap-3 md:grid-cols-2", columns)}>{children}</div>;
}

export function StatCard({
  label,
  value,
  detail,
  Icon,
  tone = "neutral",
  rows,
}: {
  label: string;
  value: string;
  detail: string;
  Icon: LucideIcon;
  tone?: Tone;
  rows?: Array<{
    label: string;
    value: string;
    meter?: number;
  }>;
}) {
  const styles = toneStyles[tone];

  return (
    <section className="min-w-0 rounded-[8px] border border-white/[0.07] bg-[#0B0D10] p-3 shadow-[0_1px_0_rgba(255,255,255,0.03),inset_0_1px_0_rgba(255,255,255,0.035)] sm:p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-2">
            <span className={cn("size-1.5 shrink-0 rounded-full", styles.dot)} />
            <p className="truncate text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--fly-text-muted)]">
              {label}
            </p>
          </div>
          <p className="mt-3 truncate text-[24px] font-semibold leading-none tabular-nums text-[var(--fly-text)] sm:text-[30px]">
            {value}
          </p>
          <p className="mt-2 text-xs leading-5 text-[var(--fly-text-muted)]">{detail}</p>
        </div>
        <span
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-[8px] border",
            styles.surface,
            styles.icon
          )}
        >
          <Icon aria-hidden="true" className="size-4" />
        </span>
      </div>

      {rows?.length ? (
        <div className="mt-4 space-y-2.5">
          {rows.map((row) => (
            <div key={row.label}>
              <div className="flex items-center justify-between gap-3">
                <span className="truncate text-xs text-[var(--fly-text-muted)]">
                  {row.label}
                </span>
                <span className="shrink-0 text-xs font-semibold tabular-nums text-[var(--fly-text-soft)]">
                  {row.value}
                </span>
              </div>
              {typeof row.meter === "number" ? (
                <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-white/[0.07]">
                  <span
                    aria-hidden="true"
                    className={cn("block h-full rounded-full", styles.bar)}
                    style={{
                      width: `${Math.min(Math.max(row.meter * 100, 3), 100)}%`,
                    }}
                  />
                </div>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}

export function Panel({
  title,
  description,
  children,
  action,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <section className="min-w-0 overflow-hidden rounded-[8px] border border-white/[0.07] bg-[#0B0D10] shadow-[0_1px_0_rgba(255,255,255,0.03),inset_0_1px_0_rgba(255,255,255,0.035)]">
      <div className="flex min-w-0 flex-col gap-3 border-b border-white/[0.06] px-4 py-3 sm:flex-row sm:items-start sm:justify-between sm:px-5 sm:py-4">
        <div className="flex min-w-0 items-start gap-3">
          <span
            aria-hidden="true"
            className="mt-0.5 h-8 w-px shrink-0 rounded-full bg-gradient-to-b from-white/[0.18] via-white/[0.08] to-transparent"
          />
          <div className="min-w-0">
            <h2 className="text-[15px] font-semibold leading-none text-[var(--fly-text)]">
              {title}
            </h2>
            {description ? (
              <p className="mt-1.5 text-[13px] leading-5 text-[var(--fly-text-muted)] sm:text-sm">
                {description}
              </p>
            ) : null}
          </div>
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      <div className="p-3 sm:p-4">{children}</div>
    </section>
  );
}

export function DataList({
  rows,
  valueLabel = "Valor",
}: {
  rows: Array<{
    label: string;
    value: string;
    detail?: string;
    meter?: number;
    tone?: Tone;
  }>;
  valueLabel?: string;
}) {
  return (
    <div className="space-y-2.5">
      {rows.map((row) => {
        const styles = toneStyles[row.tone ?? "neutral"];

        return (
          <div
            key={row.label}
            className="rounded-[8px] border border-white/[0.055] bg-white/[0.018] px-3 py-2.5 transition-colors duration-150 hover:border-white/[0.1] hover:bg-white/[0.035]"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex min-w-0 items-center gap-2">
                  <span className={cn("size-1.5 shrink-0 rounded-full", styles.dot)} />
                  <p className="truncate text-sm font-medium text-[var(--fly-text-soft)]">
                    {row.label}
                  </p>
                </div>
                {row.detail ? (
                  <p className="mt-1 truncate text-xs text-[var(--fly-text-muted)]">
                    {row.detail}
                  </p>
                ) : null}
              </div>
              <div className="shrink-0 text-right">
                <p className="text-sm font-semibold tabular-nums text-[var(--fly-text)]">
                  {row.value}
                </p>
                <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--fly-text-dim)]">
                  {valueLabel}
                </p>
              </div>
            </div>
            {typeof row.meter === "number" ? (
              <div className="mt-2.5 h-1 overflow-hidden rounded-full bg-white/[0.07]">
                <span
                  aria-hidden="true"
                  className={cn("block h-full rounded-full", styles.bar)}
                  style={{
                    width: `${Math.min(Math.max(row.meter * 100, 3), 100)}%`,
                  }}
                />
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

export function SimpleTable({
  columns,
  rows,
}: {
  columns: string[];
  rows: string[][];
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] table-fixed text-left text-sm">
        <thead>
          <tr className="border-b border-white/[0.06] bg-white/[0.018] text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--fly-text-muted)]">
            {columns.map((column, index) => (
              <th
                key={column}
                className={cn(
                  "px-3 py-3",
                  index === columns.length - 1 && "text-right"
                )}
              >
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-white/[0.055]">
          {rows.map((row, rowIndex) => (
            <tr key={`${row[0]}-${rowIndex}`} className="hover:bg-white/[0.018]">
              {row.map((cell, index) => (
                <td
                  key={`${cell}-${index}`}
                  className={cn(
                    "px-3 py-3 text-[var(--fly-text-soft)]",
                    index === 0 && "font-medium text-[var(--fly-text)]",
                    index === row.length - 1 &&
                      "text-right font-semibold tabular-nums text-[var(--fly-text)]"
                  )}
                >
                  <span className="block truncate">{cell}</span>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function StatusPill({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: Tone;
}) {
  const styles = toneStyles[tone];

  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center gap-1.5 rounded-[7px] border px-2 py-1 text-[11px] font-semibold leading-none",
        styles.surface,
        styles.text
      )}
    >
      <span className={cn("size-1.5 rounded-full", styles.dot)} />
      <span className="truncate">{children}</span>
    </span>
  );
}
