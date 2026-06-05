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
      {["7D", "15D", "30D", "90D", "Tudo"].map((item, index) => (
        <span
          key={item}
          className={`h-7 rounded-[9px] bg-[var(--fly-skeleton-line)] ${
            index === 4 ? "w-12" : "w-10"
          }`}
        />
      ))}
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
          <SkeletonLine className="mt-4 h-7 w-32 rounded-md" />
          <SkeletonLine className="mt-3 h-2.5 w-40 max-w-full" />
        </SkeletonPanel>
      ))}
    </div>
  );
}

function EntryFormSkeleton() {
  return (
    <SkeletonPanel className="overflow-hidden">
      <div className="border-b border-[var(--fly-divider)] px-4 py-3 sm:px-5 sm:py-4">
        <SkeletonLine className="h-4 w-52 rounded-md" />
        <SkeletonLine className="mt-3 h-2.5 w-64 max-w-full" />
      </div>
      <div className="grid gap-3 p-3 sm:p-4 md:grid-cols-[minmax(0,1fr)_112px] 2xl:grid-cols-[minmax(0,1fr)_112px_minmax(0,1.1fr)_max-content]">
        <SkeletonLine className="h-10 rounded-[8px]" />
        <SkeletonLine className="h-10 rounded-[8px]" />
        <SkeletonLine className="h-10 rounded-[8px] md:col-span-2 2xl:col-span-1" />
        <SkeletonLine className="h-10 rounded-[8px] md:col-span-2 2xl:col-span-1 2xl:w-36" />
      </div>
    </SkeletonPanel>
  );
}

function TableSkeleton({
  titleWidth,
  rows,
}: {
  titleWidth: string;
  rows: number;
}) {
  return (
    <SkeletonPanel className="overflow-hidden">
      <div className="border-b border-[var(--fly-divider)] px-4 py-3 sm:px-5 sm:py-4">
        <SkeletonLine className={`h-4 rounded-md ${titleWidth}`} />
        <SkeletonLine className="mt-3 h-2.5 w-56 max-w-full" />
      </div>
      <div className="overflow-hidden">
        <div className="grid grid-cols-[1.4fr_0.8fr_0.8fr_0.8fr_1fr] gap-3 border-b border-[var(--fly-divider)] bg-[var(--fly-table-head)] px-3 py-3">
          {Array.from({ length: 5 }).map((_, index) => (
            <SkeletonLine key={index} className="h-2.5 rounded-md" />
          ))}
        </div>
        <div className="divide-y divide-[var(--fly-divider-subtle)]">
          {Array.from({ length: rows }).map((_, index) => (
            <div
              key={index}
              className="grid grid-cols-[1.4fr_0.8fr_0.8fr_0.8fr_1fr] gap-3 px-3 py-3.5"
            >
              <div>
                <SkeletonLine className="h-3 w-36 rounded-md" />
                <SkeletonLine className="mt-2 h-2.5 w-48 max-w-full" />
              </div>
              <SkeletonLine className="ml-auto h-3 w-16 rounded-md" />
              <SkeletonLine className="ml-auto h-3 w-16 rounded-md" />
              <SkeletonLine className="ml-auto h-3 w-14 rounded-md" />
              <SkeletonLine className="ml-auto h-7 w-36 rounded-[8px]" />
            </div>
          ))}
        </div>
      </div>
    </SkeletonPanel>
  );
}

export default function EstoqueLoading() {
  return (
    <Shell>
      <DashboardHeader
        title="Estoque"
        description="Controle por grupo de produto"
        actions={<DateFilterSkeleton />}
      />

      <div
        role="status"
        aria-label="Carregando estoque"
        className="flynow-dashboard-skeleton min-w-0 overflow-x-clip px-3.5 pb-28 pt-4 sm:px-5 sm:pt-5 xl:px-6 xl:pb-10 xl:pt-6"
      >
        <div className="flex flex-col gap-4 sm:gap-5">
          <MetricCardsSkeleton />
          <EntryFormSkeleton />
          <TableSkeleton titleWidth="w-40" rows={6} />
        </div>
        <span className="sr-only">Carregando conteúdo de estoque.</span>
      </div>
    </Shell>
  );
}
