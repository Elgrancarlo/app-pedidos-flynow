import Shell from "@/components/layout/shell";
import { DashboardHeader } from "@/components/layout/dashboard-header";

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
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`flynow-dashboard-skeleton-panel rounded-[8px] border border-[var(--fly-border)] bg-[var(--fly-surface)] ${className}`}
    >
      {children}
    </section>
  );
}

function DateFilterSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="hidden rounded-[12px] border border-[var(--fly-border)] bg-[var(--fly-surface-elevated)] p-1 lg:flex lg:items-center lg:gap-1"
    >
      <span className="h-7 w-[228px] rounded-[10px] bg-[var(--fly-skeleton-line)]" />
      <span className="h-5 w-px bg-[var(--fly-border)]" />
      {["Hoje", "7D", "30D", "Mes", "Anterior"].map((item, index) => (
        <span
          key={item}
          className={`h-7 rounded-[9px] bg-[var(--fly-skeleton-line)] ${
            index === 0 || index === 4 ? "w-16" : "w-10"
          }`}
        />
      ))}
    </div>
  );
}

function FilterSkeleton() {
  return (
    <SkeletonPanel className="p-3 sm:p-4">
      <SkeletonLine className="h-4 w-36 rounded-md" />
      <SkeletonLine className="mt-3 h-3 w-64 max-w-full rounded-md" />
      <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:ml-auto lg:w-[448px]">
        <SkeletonLine className="h-10 rounded-xl sm:h-9" />
        <SkeletonLine className="h-10 rounded-xl sm:h-9" />
      </div>
    </SkeletonPanel>
  );
}

function MetricCardsSkeleton() {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <SkeletonPanel key={index} className="p-3 sm:p-4">
          <div className="flex items-center gap-2">
            <SkeletonLine className="size-1.5" />
            <SkeletonLine className="h-2.5 w-28" />
          </div>
          <SkeletonLine className="mt-4 h-7 w-36 rounded-md" />
          <SkeletonLine className="mt-3 h-2.5 w-40 max-w-full" />
        </SkeletonPanel>
      ))}
    </div>
  );
}

function ChartSkeleton({ compact = false }: { compact?: boolean }) {
  return (
    <SkeletonPanel className="overflow-hidden">
      <div className="border-b border-[var(--fly-divider)] px-4 py-3 sm:px-5 sm:py-4">
        <SkeletonLine className="h-4 w-56 rounded-md" />
        <SkeletonLine className="mt-3 h-2.5 w-64 max-w-full" />
      </div>
      <div className="p-3 sm:p-4">
        <div className="h-[300px] rounded-[8px] border border-[var(--fly-border-subtle)] bg-[var(--fly-row-bg)] p-4 sm:h-[340px]">
          <div className="flex h-full items-end gap-3">
            {Array.from({ length: compact ? 7 : 12 }).map((_, index) => (
              <span
                key={index}
                className="min-w-0 flex-1 rounded-t-[6px] bg-[var(--fly-skeleton-line)]"
                style={{
                  height: `${24 + ((index * 19) % 64)}%`,
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </SkeletonPanel>
  );
}

function FormSkeleton() {
  return (
    <SkeletonPanel className="overflow-hidden">
      <div className="border-b border-[var(--fly-divider)] px-4 py-3 sm:px-5 sm:py-4">
        <SkeletonLine className="h-4 w-52 rounded-md" />
      </div>
      <div className="grid gap-3 p-3 sm:p-4">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          {Array.from({ length: 5 }).map((_, index) => (
            <SkeletonLine key={index} className="h-10 rounded-[10px]" />
          ))}
        </div>
        <div className="grid gap-3 lg:grid-cols-2">
          <SkeletonLine className="h-24 rounded-[10px]" />
          <SkeletonLine className="h-24 rounded-[10px]" />
        </div>
      </div>
    </SkeletonPanel>
  );
}

function TableSkeleton() {
  return (
    <SkeletonPanel className="overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-[var(--fly-divider)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5 sm:py-4">
        <div>
          <SkeletonLine className="h-4 w-56 rounded-md" />
          <SkeletonLine className="mt-3 h-2.5 w-64 max-w-full" />
        </div>
        <SkeletonLine className="h-9 w-40 rounded-[10px]" />
      </div>
      <div className="divide-y divide-[var(--fly-divider-subtle)]">
        {Array.from({ length: 8 }).map((_, index) => (
          <div
            key={index}
            className="grid grid-cols-[1.1fr_1.2fr_0.6fr_0.8fr_0.8fr_0.5fr] gap-3 px-3 py-3.5"
          >
            <SkeletonLine className="h-3 w-32 rounded-md" />
            <SkeletonLine className="h-3 w-36 rounded-md" />
            <SkeletonLine className="ml-auto h-3 w-12 rounded-md" />
            <SkeletonLine className="ml-auto h-3 w-24 rounded-md" />
            <SkeletonLine className="ml-auto h-3 w-24 rounded-md" />
            <SkeletonLine className="ml-auto h-3 w-10 rounded-md" />
          </div>
        ))}
      </div>
    </SkeletonPanel>
  );
}

export default function FunilLoading() {
  return (
    <Shell>
      <DashboardHeader
        title="Funil"
        description="Funil diario por produto, canal e take rate de upsells"
        actions={<DateFilterSkeleton />}
      />

      <div
        role="status"
        aria-label="Carregando funil"
        className="flynow-dashboard-skeleton min-w-0 overflow-x-clip px-3.5 pb-28 pt-4 sm:px-5 sm:pt-5 xl:px-6 xl:pb-10 xl:pt-6"
      >
        <div className="flex flex-col gap-4 sm:gap-5">
          <FilterSkeleton />
          <MetricCardsSkeleton />
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(360px,0.85fr)]">
            <ChartSkeleton />
            <ChartSkeleton compact />
          </div>
          <FormSkeleton />
          <TableSkeleton />
        </div>
        <span className="sr-only">Carregando dados do funil.</span>
      </div>
    </Shell>
  );
}
