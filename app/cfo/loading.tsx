import Shell from "@/components/layout/shell";
import { DashboardHeader } from "@/components/layout/dashboard-header";
import {
  SkeletonLine,
  SkeletonPanel,
} from "@/components/workspace/page-skeleton";

function DateFilterSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="hidden h-9 w-[220px] rounded-[12px] border border-[var(--fly-border)] bg-[var(--fly-surface-elevated)] px-3 lg:flex lg:items-center lg:gap-2"
    >
      <SkeletonLine className="h-2.5 w-8" />
      <SkeletonLine className="h-4 w-px rounded-none" />
      <SkeletonLine className="h-3 w-28" />
    </div>
  );
}

function MetricCardsSkeleton() {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <SkeletonPanel key={index} className="p-3 sm:p-4">
          <div className="flex items-center gap-2">
            <SkeletonLine className="size-1.5" />
            <SkeletonLine className="h-2.5 w-28" />
          </div>
          <SkeletonLine className="mt-4 h-7 w-36 rounded-md" />
          <SkeletonLine className="mt-3 h-2.5 w-40 max-w-full" />
          <SkeletonLine className="mt-5 h-px w-full" />
        </SkeletonPanel>
      ))}
    </div>
  );
}

function ChartSkeleton() {
  return (
    <SkeletonPanel className="overflow-hidden p-0">
      <div className="border-b border-[var(--fly-divider)] px-4 py-3 sm:px-5 sm:py-4">
        <SkeletonLine className="h-4 w-40 rounded-md" />
        <SkeletonLine className="mt-3 h-2.5 w-64 max-w-full" />
      </div>
      <div className="p-3 sm:p-4">
        <div className="h-[320px] rounded-[8px] border border-[var(--fly-border-subtle)] bg-[var(--fly-row-bg)] p-4 sm:h-[360px]">
          <div className="flex h-full items-end gap-3">
            {Array.from({ length: 12 }).map((_, index) => (
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

function SidePanelSkeleton() {
  return (
    <SkeletonPanel className="overflow-hidden p-0">
      <div className="border-b border-[var(--fly-divider)] px-4 py-3 sm:px-5 sm:py-4">
        <SkeletonLine className="h-4 w-36 rounded-md" />
        <SkeletonLine className="mt-3 h-2.5 w-48 max-w-full" />
      </div>
      <div className="space-y-2.5 p-3 sm:p-4">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className="rounded-[8px] border border-[var(--fly-border-subtle)] bg-[var(--fly-row-bg)] px-3 py-3"
          >
            <SkeletonLine className="h-3.5 w-32 rounded-md" />
            <SkeletonLine className="mt-3 h-2.5 w-full" />
            <SkeletonLine className="mt-2 h-2.5 w-4/5" />
          </div>
        ))}
      </div>
    </SkeletonPanel>
  );
}

function TableSkeleton() {
  return (
    <SkeletonPanel className="overflow-hidden p-0">
      <div className="border-b border-[var(--fly-divider)] px-4 py-3 sm:px-5 sm:py-4">
        <SkeletonLine className="h-4 w-44 rounded-md" />
        <SkeletonLine className="mt-3 h-2.5 w-64 max-w-full" />
      </div>
      <div className="divide-y divide-[var(--fly-divider-subtle)]">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={index}
            className="grid grid-cols-[1.5fr_0.8fr_0.8fr_0.8fr] gap-3 px-3 py-3.5"
          >
            <SkeletonLine className="h-3 w-40 rounded-md" />
            <SkeletonLine className="h-3 w-24 rounded-md" />
            <SkeletonLine className="ml-auto h-3 w-20 rounded-md" />
            <SkeletonLine className="ml-auto h-3 w-16 rounded-md" />
          </div>
        ))}
      </div>
    </SkeletonPanel>
  );
}

export default function CfoLoading() {
  return (
    <Shell>
      <DashboardHeader
        title="CFO"
        description="Acompanhamento financeiro semanal"
        actions={<DateFilterSkeleton />}
      />

      <div
        role="status"
        aria-label="Carregando CFO"
        className="flynow-dashboard-skeleton min-w-0 overflow-x-clip px-3.5 pb-28 pt-4 sm:px-5 sm:pt-5 xl:px-6 xl:pb-10 xl:pt-6"
      >
        <div className="flex flex-col gap-4 sm:gap-5">
          <MetricCardsSkeleton />
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(330px,0.8fr)]">
            <ChartSkeleton />
            <SidePanelSkeleton />
          </div>
          <TableSkeleton />
        </div>
        <span className="sr-only">Carregando dados de CFO.</span>
      </div>
    </Shell>
  );
}
