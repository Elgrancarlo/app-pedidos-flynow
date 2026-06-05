import type { ReactNode } from "react";

function SkeletonLine({ className = "" }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`block rounded-full bg-[var(--fly-skeleton-line)] ${className}`}
    />
  );
}

function SkeletonPanel({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`flynow-dashboard-skeleton-panel rounded-[8px] border border-[var(--fly-border)] bg-[var(--fly-surface)] shadow-[var(--fly-panel-inset)] ${className}`}
    >
      {children}
    </section>
  );
}

function MetricCardSkeleton() {
  return (
    <SkeletonPanel className="min-h-[176px] p-4">
      <div className="flex h-full flex-col justify-between">
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-2">
            <SkeletonLine className="size-1.5" />
            <SkeletonLine className="h-2.5 w-28" />
          </div>
          <SkeletonLine className="mt-4 h-8 w-36 rounded-md sm:h-9" />
          <SkeletonLine className="mt-3 h-2.5 w-44 max-w-full" />
        </div>

        <div className="space-y-3">
          {Array.from({ length: 2 }).map((_, index) => (
            <div key={index} className="min-w-0">
              <div className="mb-2 flex items-center justify-between gap-3">
                <SkeletonLine className="h-2.5 w-28 max-w-[70%]" />
                <SkeletonLine className="h-2.5 w-10 shrink-0" />
              </div>
              <SkeletonLine className="h-px w-full" />
            </div>
          ))}
        </div>
      </div>
    </SkeletonPanel>
  );
}

function PipelineSkeleton() {
  return (
    <SkeletonPanel className="p-3">
      <div className="mb-3 flex min-w-0 items-center justify-between gap-3">
        <div className="min-w-0">
          <SkeletonLine className="h-3.5 w-32 rounded-md" />
          <SkeletonLine className="mt-2 h-2.5 w-48 max-w-full" />
        </div>
        <SkeletonLine className="hidden h-2.5 w-20 shrink-0 sm:block" />
      </div>

      <div className="grid gap-2 sm:grid-cols-3 xl:grid-cols-9">
        {Array.from({ length: 9 }).map((_, index) => (
          <div
            key={index}
            className="min-h-[64px] rounded-[8px] border border-[var(--fly-border-subtle)] bg-[var(--fly-row-bg)] p-3"
          >
            <div className="flex items-center gap-2">
              <SkeletonLine className="size-1.5" />
              <SkeletonLine className="h-2.5 w-20 max-w-full" />
            </div>
            <SkeletonLine className="mt-4 h-4 w-10 rounded-md" />
            <SkeletonLine className="mt-3 h-px w-full" />
          </div>
        ))}
      </div>
    </SkeletonPanel>
  );
}

function SummarySkeleton() {
  return (
    <div className="flex flex-col gap-3 px-1 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="flex min-w-0 items-center gap-2">
          <SkeletonLine className="h-3.5 w-24 rounded-md" />
          <SkeletonLine className="h-3.5 w-20 rounded-md" />
          <SkeletonLine className="h-2.5 w-16" />
        </div>
        <SkeletonLine className="mt-2 h-2.5 w-64 max-w-full" />
      </div>
      <div className="flex items-center gap-1 rounded-[8px] border border-[var(--fly-border)] bg-[var(--fly-control)] p-1">
        <SkeletonLine className="h-7 w-20 rounded-[7px]" />
        <SkeletonLine className="h-7 w-20 rounded-[7px]" />
      </div>
    </div>
  );
}

function FilterSkeleton() {
  return (
    <div className="border-b border-[var(--fly-divider)] bg-[var(--fly-surface)] p-3 sm:p-4">
      <div className="grid gap-2 lg:grid-cols-[minmax(240px,1fr)_150px_150px_180px_auto]">
        <SkeletonLine className="h-10 rounded-[8px]" />
        <SkeletonLine className="h-10 rounded-[8px]" />
        <SkeletonLine className="h-10 rounded-[8px]" />
        <SkeletonLine className="h-10 rounded-[8px]" />
        <div className="flex gap-2">
          <SkeletonLine className="h-10 flex-1 rounded-[8px] lg:w-24 lg:flex-none" />
          <SkeletonLine className="h-10 flex-1 rounded-[8px] lg:w-24 lg:flex-none" />
        </div>
      </div>
    </div>
  );
}

function DesktopTableSkeleton() {
  return (
    <div className="hidden min-h-[520px] overflow-x-auto lg:block">
      <div className="min-w-[1240px]">
        <div className="grid grid-cols-[23%_12%_18%_17%_22%_8%] border-b border-[var(--fly-divider)] bg-[var(--fly-table-head)] px-4 py-3.5">
          {Array.from({ length: 6 }).map((_, index) => (
            <SkeletonLine
              key={index}
              className="h-2.5 w-20 rounded-md"
            />
          ))}
        </div>

        <div className="divide-y divide-[var(--fly-divider-subtle)] px-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <div
              key={index}
              className="grid grid-cols-[23%_12%_18%_17%_22%_8%] items-center py-4"
            >
              <div className="min-w-0 space-y-2">
                <SkeletonLine className="h-3.5 w-36 max-w-full rounded-md" />
                <SkeletonLine className="h-2.5 w-44 max-w-full" />
                <SkeletonLine className="h-2.5 w-28 max-w-full" />
              </div>
              <SkeletonLine className="h-3 w-24 max-w-[80%] rounded-md" />
              <div className="min-w-0 space-y-2">
                <SkeletonLine className="h-3.5 w-44 max-w-full rounded-md" />
                <SkeletonLine className="h-2.5 w-24 max-w-full" />
              </div>
              <div className="min-w-0 space-y-2">
                <SkeletonLine className="h-3.5 w-24 max-w-full rounded-md" />
                <SkeletonLine className="h-2.5 w-28 max-w-full" />
              </div>
              <div className="min-w-0 space-y-2">
                <SkeletonLine className="h-6 w-32 max-w-full rounded-[7px]" />
                <SkeletonLine className="h-2.5 w-32 max-w-full" />
              </div>
              <div className="ml-auto space-y-2">
                <SkeletonLine className="h-2.5 w-16" />
                <SkeletonLine className="h-2.5 w-20" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MobileListSkeleton() {
  return (
    <div className="min-h-[520px] divide-y divide-[var(--fly-divider-subtle)] lg:hidden">
      {Array.from({ length: 8 }).map((_, index) => (
        <div key={index} className="px-3 py-3">
          <div className="grid grid-cols-[minmax(0,1fr)_92px] gap-x-3 gap-y-2">
            <div className="min-w-0 space-y-1.5">
              <SkeletonLine className="h-3.5 w-36 max-w-full rounded-md" />
              <SkeletonLine className="h-2.5 w-44 max-w-full" />
              <SkeletonLine className="h-2.5 w-28 max-w-full" />
            </div>
            <div className="flex flex-col items-end gap-1.5 pt-0.5">
              <SkeletonLine className="h-3.5 w-20 rounded-md" />
              <SkeletonLine className="h-2.5 w-14" />
            </div>
            <div className="col-span-2 flex min-w-0 items-center justify-between gap-3">
              <SkeletonLine className="h-2.5 w-44 max-w-[58%]" />
              <SkeletonLine className="h-5 w-24 shrink-0 rounded-[7px]" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function OrdersSurfaceSkeleton() {
  return (
    <section className="overflow-hidden rounded-[8px] border border-[var(--fly-border)] bg-[var(--fly-surface)] shadow-[var(--fly-panel-inset)]">
      <FilterSkeleton />
      <DesktopTableSkeleton />
      <MobileListSkeleton />
      <div className="flex flex-col gap-3 border-t border-[var(--fly-divider)] bg-[var(--fly-row-bg)] px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4">
        <div className="flex items-center gap-2">
          <SkeletonLine className="h-2.5 w-24" />
          <SkeletonLine className="h-8 w-24 rounded-[7px]" />
        </div>
        <div className="flex items-center justify-between gap-2 sm:justify-end">
          <SkeletonLine className="h-2.5 w-24" />
          <SkeletonLine className="size-8 rounded-[7px]" />
          <SkeletonLine className="size-8 rounded-[7px]" />
        </div>
      </div>
    </section>
  );
}

export function PedidosHeaderActionsSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="hidden items-center gap-2 lg:flex"
    >
      <div className="rounded-[12px] border border-[var(--fly-border)] bg-[var(--fly-surface-elevated)] p-1">
        <div className="flex items-center gap-1">
          {["w-14", "w-10", "w-10", "w-10", "w-10"].map((width, index) => (
            <SkeletonLine key={index} className={`h-7 rounded-[9px] ${width}`} />
          ))}
        </div>
      </div>
      <SkeletonLine className="h-9 w-28 rounded-[8px]" />
      <SkeletonLine className="h-9 w-28 rounded-[8px]" />
    </div>
  );
}

export function PedidosContentSkeleton() {
  return (
    <div className="flynow-dashboard-skeleton flex flex-col gap-4 sm:gap-5">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <MetricCardSkeleton key={index} />
        ))}
      </div>

      <PipelineSkeleton />

      <div className="space-y-4">
        <SummarySkeleton />
        <OrdersSurfaceSkeleton />
      </div>
    </div>
  );
}
