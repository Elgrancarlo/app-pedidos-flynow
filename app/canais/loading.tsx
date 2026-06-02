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

function FilterSkeleton() {
  return (
    <SkeletonPanel className="p-3 sm:p-3.5">
      <div className="flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between">
        <SkeletonLine className="h-10 w-full max-w-[420px] rounded-xl sm:h-8" />
        <SkeletonLine className="h-10 w-full rounded-xl sm:h-8 xl:w-[244px]" />
      </div>
    </SkeletonPanel>
  );
}

function MetricCardsSkeleton() {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3 min-[1400px]:grid-cols-5">
      {Array.from({ length: 5 }).map((_, index) => (
        <SkeletonPanel key={index} className="p-3 sm:p-4">
          <div className="flex items-center gap-2">
            <SkeletonLine className="size-1.5" />
            <SkeletonLine className="h-2.5 w-28" />
          </div>
          <SkeletonLine className="mt-4 h-7 w-36 rounded-md" />
          <SkeletonLine className="mt-3 h-2.5 w-32 max-w-full" />
        </SkeletonPanel>
      ))}
    </div>
  );
}

function MobileInsightsSkeleton() {
  return (
    <SkeletonPanel className="overflow-hidden lg:hidden">
      <div className="border-b border-[var(--fly-divider)] px-4 py-3">
        <SkeletonLine className="h-4 w-48 rounded-md" />
        <SkeletonLine className="mt-3 h-2.5 w-56 max-w-full" />
      </div>
      <div className="px-4 py-2">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={index}
            className="border-b border-[var(--fly-divider-subtle)] py-3 last:border-b-0"
          >
            <div className="flex items-center justify-between gap-3">
              <SkeletonLine className="h-3 w-28 rounded-md" />
              <SkeletonLine className="h-3 w-24 rounded-md" />
            </div>
            <SkeletonLine className="mt-2 h-px w-full" />
          </div>
        ))}
      </div>
    </SkeletonPanel>
  );
}

function ChartSkeleton() {
  return (
    <SkeletonPanel className="overflow-hidden">
      <div className="border-b border-[var(--fly-divider)] px-4 py-3 sm:px-5 sm:py-4">
        <SkeletonLine className="h-4 w-52 rounded-md" />
        <SkeletonLine className="mt-3 h-2.5 w-64 max-w-full" />
      </div>
      <div className="p-3 sm:p-4">
        <div className="h-[300px] rounded-[8px] border border-[var(--fly-border-subtle)] bg-[var(--fly-row-bg)] p-4">
          <div className="flex h-full items-end gap-3">
            {Array.from({ length: 8 }).map((_, index) => (
              <span
                key={index}
                className="min-w-0 flex-1 rounded-t-[6px] bg-[var(--fly-skeleton-line)]"
                style={{ height: `${26 + ((index * 23) % 60)}%` }}
              />
            ))}
          </div>
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
          <SkeletonLine className="h-4 w-48 rounded-md" />
          <SkeletonLine className="mt-3 h-2.5 w-72 max-w-full" />
        </div>
        <SkeletonLine className="h-9 w-40 rounded-[10px]" />
      </div>
      <div className="divide-y divide-[var(--fly-divider-subtle)]">
        {Array.from({ length: 8 }).map((_, index) => (
          <div
            key={index}
            className="grid grid-cols-[1fr_1.4fr_0.8fr_0.7fr_0.8fr_0.6fr] gap-3 px-3 py-3.5"
          >
            <SkeletonLine className="h-3 w-32 rounded-md" />
            <SkeletonLine className="h-3 w-44 rounded-md" />
            <SkeletonLine className="h-3 w-24 rounded-md" />
            <SkeletonLine className="ml-auto h-3 w-14 rounded-md" />
            <SkeletonLine className="ml-auto h-3 w-24 rounded-md" />
            <SkeletonLine className="ml-auto h-3 w-12 rounded-md" />
          </div>
        ))}
      </div>
    </SkeletonPanel>
  );
}

export default function CanaisLoading() {
  return (
    <Shell>
      <DashboardHeader
        title="Analytics / Canais"
        description="Receita PayT por origem, mídia RedTrack e leitura por produto"
      />

      <div
        role="status"
        aria-label="Carregando canais"
        className="flynow-dashboard-skeleton min-w-0 overflow-x-clip px-3.5 pb-28 pt-4 sm:px-5 sm:pt-5 xl:px-6 xl:pb-10 xl:pt-6"
      >
        <div className="flex flex-col gap-4 sm:gap-5">
          <FilterSkeleton />
          <MetricCardsSkeleton />
          <MobileInsightsSkeleton />
          <div className="hidden gap-4 lg:grid xl:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
            <ChartSkeleton />
            <ChartSkeleton />
          </div>
          <TableSkeleton />
        </div>
        <span className="sr-only">Carregando dados de canais.</span>
      </div>
    </Shell>
  );
}
