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

function SectionHeaderSkeleton({
  descriptionWidth = "w-64",
}: {
  descriptionWidth?: string;
}) {
  return (
    <div className="flex min-w-0 items-start gap-3">
      <span
        aria-hidden="true"
        className="mt-0.5 h-8 w-px shrink-0 rounded-full bg-gradient-to-b from-[var(--fly-border-strong)] via-[var(--fly-divider)] to-transparent"
      />
      <div className="min-w-0">
        <SkeletonLine className="h-3.5 w-28 rounded-md" />
        <SkeletonLine className={`mt-2 h-2.5 max-w-full ${descriptionWidth}`} />
      </div>
    </div>
  );
}

function ViewSwitchSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="flex w-full rounded-[12px] border border-[var(--fly-border)] bg-[var(--fly-surface-elevated)] p-1 sm:w-fit"
    >
      <SkeletonLine className="h-8 w-24 rounded-[9px]" />
      <SkeletonLine className="ml-1 h-8 w-20 rounded-[9px]" />
    </div>
  );
}

function MetricCardsSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-6 xl:grid-cols-12">
      {Array.from({ length: count }).map((_, index) => {
        const className =
          index < 4
            ? "p-3 sm:p-4 md:col-span-3 xl:col-span-3"
            : index === 6
              ? "p-3 sm:p-4 md:col-span-6 xl:col-span-4"
              : "p-3 sm:p-4 md:col-span-3 xl:col-span-4";

        return (
          <SkeletonPanel key={index} className={className}>
            <div className="flex items-center gap-2">
              <SkeletonLine className="size-1.5" />
              <SkeletonLine className="h-2.5 w-28" />
            </div>
            <SkeletonLine className="mt-4 h-7 w-36 rounded-md" />
            <SkeletonLine className="mt-3 h-2.5 w-40 max-w-full" />
          </SkeletonPanel>
        );
      })}
    </div>
  );
}

function ChartSkeleton({ compact = false }: { compact?: boolean }) {
  return (
    <SkeletonPanel className="overflow-hidden">
      <div className="border-b border-[var(--fly-divider)] px-4 py-3 sm:px-5 sm:py-4">
        <SkeletonLine className="h-4 w-52 rounded-md" />
        <SkeletonLine className="mt-3 h-2.5 w-64 max-w-full" />
      </div>
      <div className="p-3 sm:p-4">
        <div className="h-[320px] rounded-[8px] border border-[var(--fly-border-subtle)] bg-[var(--fly-row-bg)] p-4 sm:h-[360px]">
          <div className="flex h-full items-end gap-3">
            {Array.from({ length: compact ? 6 : 12 }).map((_, index) => (
              <span
                key={index}
                className="min-w-0 flex-1 rounded-t-[6px] bg-[var(--fly-skeleton-line)]"
                style={{
                  height: `${28 + ((index * 17) % 62)}%`,
                }}
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
      <div className="border-b border-[var(--fly-divider)] px-4 py-3 sm:px-5 sm:py-4">
        <SkeletonLine className="h-4 w-48 rounded-md" />
        <SkeletonLine className="mt-3 h-2.5 w-72 max-w-full" />
      </div>
      <div className="divide-y divide-[var(--fly-divider-subtle)]">
        {Array.from({ length: 7 }).map((_, index) => (
          <div
            key={index}
            className="grid grid-cols-[1.5fr_1fr_0.8fr_0.5fr] gap-3 px-3 py-3.5"
          >
            <SkeletonLine className="h-3 w-40 rounded-md" />
            <SkeletonLine className="ml-auto h-3 w-24 rounded-md" />
            <SkeletonLine className="ml-auto h-3 w-16 rounded-md" />
            <SkeletonLine className="ml-auto h-3 w-12 rounded-md" />
          </div>
        ))}
      </div>
    </SkeletonPanel>
  );
}

export default function AnalyticsLoading() {
  return (
    <Shell>
      <DashboardHeader
        title="Analytics"
        description="Performance de vendas, upsells e mídia no mesmo painel"
        actions={<DateFilterSkeleton />}
      />

      <div
        role="status"
        aria-label="Carregando analytics"
        className="flynow-dashboard-skeleton min-w-0 overflow-x-clip px-3.5 pb-28 pt-4 sm:px-5 sm:pt-5 xl:px-6 xl:pb-10 xl:pt-6"
      >
        <div className="flex flex-col gap-4 sm:gap-5">
          <ViewSwitchSkeleton />

          <section className="space-y-3">
            <SectionHeaderSkeleton descriptionWidth="w-72" />
            <MetricCardsSkeleton count={7} />
          </section>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(360px,0.9fr)]">
            <ChartSkeleton />
            <ChartSkeleton compact />
          </div>
          <TableSkeleton />
        </div>
        <span className="sr-only">Carregando dados de analytics.</span>
      </div>
    </Shell>
  );
}
