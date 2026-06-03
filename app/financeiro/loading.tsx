import Shell from "@/components/layout/shell";
import { DashboardHeader } from "@/components/layout/dashboard-header";
import { SkeletonLine } from "@/components/workspace/page-skeleton";

function FinanceiroDateFilterSkeleton() {
  return (
    <div className="contents lg:flex lg:w-auto lg:min-w-0 lg:flex-col lg:items-end lg:gap-2">
      <div className="contents lg:flex lg:w-auto lg:max-w-full lg:flex-row lg:items-center lg:gap-1.5 lg:rounded-[14px] lg:border lg:border-[var(--fly-border)] lg:bg-[var(--fly-surface-elevated)] lg:p-1.5 lg:shadow-[var(--fly-panel-shadow)]">
        <div className="col-start-2 row-start-1 flex min-w-0 items-center justify-end self-center lg:col-auto lg:row-auto">
          <div className="flynow-dashboard-skeleton-panel h-10 w-[132px] rounded-xl border border-[var(--fly-border)] bg-[var(--fly-control)] min-[390px]:w-[140px] sm:h-8 sm:w-[236px] sm:rounded-full lg:rounded-xl" />
        </div>

        <div className="hidden h-5 w-px bg-[var(--fly-border)] lg:block" />

        <div className="col-span-2 row-start-2 -mx-4 flex max-w-[calc(100vw-1px)] gap-1 overflow-hidden px-4 pb-1 pt-0.5 sm:-mx-5 sm:px-5 md:mx-0 md:grid md:w-full md:max-w-full md:grid-cols-5 md:px-0 md:pb-0 lg:col-auto lg:row-auto lg:flex lg:w-auto lg:items-center">
          {["w-14", "w-10", "w-10", "w-10", "w-10"].map((width, index) => (
            <SkeletonLine
              key={index}
              className={`h-10 shrink-0 rounded-xl sm:h-8 sm:rounded-[10px] ${width}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function MetricCardsSkeleton() {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <section
          key={index}
          className="flynow-dashboard-skeleton-panel min-w-0 rounded-[8px] border border-[var(--fly-border)] bg-[var(--fly-surface)] p-3 sm:p-4"
        >
          <div className="flex items-center gap-2">
            <SkeletonLine className="size-1.5" />
            <SkeletonLine className="h-2.5 w-24" />
          </div>
          <SkeletonLine className="mt-5 h-7 w-36 rounded-md sm:h-8" />
          <SkeletonLine className="mt-3 h-2.5 w-40" />
          <SkeletonLine className="mt-5 h-px w-full" />
        </section>
      ))}
    </div>
  );
}

function EventCardsSkeleton() {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <section
          key={index}
          className="flynow-dashboard-skeleton-panel min-w-0 rounded-[8px] border border-[var(--fly-border)] border-l-4 border-l-[var(--fly-border-strong)] bg-[var(--fly-surface)] p-4"
        >
          <SkeletonLine className="h-6 w-20 rounded-md" />
          <SkeletonLine className="mt-4 h-2.5 w-32" />
        </section>
      ))}
    </div>
  );
}

function FinanceChartSkeleton() {
  return (
    <section className="flynow-dashboard-skeleton-panel min-w-0 overflow-hidden rounded-[8px] border border-[var(--fly-border)] bg-[var(--fly-surface)]">
      <div className="flex min-w-0 flex-col gap-3 border-b border-[var(--fly-divider)] px-4 py-3 sm:px-5 sm:py-4">
        <div className="flex min-w-0 items-start gap-3">
          <span
            aria-hidden="true"
            className="mt-0.5 h-8 w-px shrink-0 rounded-full bg-gradient-to-b from-[var(--fly-border-strong)] via-[var(--fly-border)] to-transparent"
          />
          <div className="min-w-0">
            <SkeletonLine className="h-4 w-40 rounded-md" />
            <SkeletonLine className="mt-2 h-2.5 w-64 max-w-full" />
          </div>
        </div>
      </div>

      <div className="p-3 sm:p-4">
        <div className="flynow-chart-stage min-h-[430px] space-y-5 rounded-[8px] border border-[var(--fly-border-subtle)] bg-[var(--fly-row-bg)] p-4">
          <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
            <div className="min-w-0">
              <SkeletonLine className="h-2.5 w-32" />
              <SkeletonLine className="mt-3 h-8 w-48 rounded-md sm:h-9 sm:w-56" />
              <SkeletonLine className="mt-3 h-2.5 w-64 max-w-full" />
            </div>
            <div className="min-w-[118px] border-t border-[var(--fly-divider)] pt-3 sm:border-l sm:border-t-0 sm:pl-4 sm:pt-0">
              <SkeletonLine className="h-2.5 w-16" />
              <SkeletonLine className="mt-2 h-6 w-20 rounded-md" />
            </div>
          </div>

          <div className="flynow-chart-plot h-[330px] min-w-0 rounded-[8px] border border-[var(--fly-border-subtle)] bg-[var(--fly-row-bg)] px-4 pb-8 pt-6">
            <div className="grid h-full grid-cols-4 items-end gap-4 border-b border-[var(--fly-divider-subtle)]">
              {["h-[92%]", "h-[8%]", "h-[5%]", "h-[90%]"].map((height, index) => (
                <div key={index} className="flex h-full min-w-0 flex-col justify-end gap-3">
                  <SkeletonLine className="mx-auto h-2.5 w-14 rounded-md" />
                  <span
                    aria-hidden="true"
                    className={`block w-full rounded-t-[6px] bg-[var(--fly-skeleton-line)] ${height}`}
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[8px] border border-[var(--fly-border-subtle)] bg-[var(--fly-row-bg)] px-3 py-3">
            <SkeletonLine className="h-2.5 w-full max-w-[520px]" />
          </div>
        </div>
      </div>
    </section>
  );
}

export default function FinanceiroLoading() {
  return (
    <Shell>
      <DashboardHeader
        title="Financeiro"
        description="Receita, reembolsos e chargebacks"
        actions={<FinanceiroDateFilterSkeleton />}
      />

      <div
        role="status"
        aria-label="Carregando financeiro"
        className="flynow-dashboard-skeleton min-w-0 overflow-x-clip px-3.5 pb-28 pt-4 sm:px-5 sm:pt-5 xl:px-6 xl:pb-10 xl:pt-6"
      >
        <div className="flex flex-col gap-4 sm:gap-5">
          <MetricCardsSkeleton />
          <EventCardsSkeleton />
          <FinanceChartSkeleton />
        </div>
        <span className="sr-only">Carregando dados financeiros.</span>
      </div>
    </Shell>
  );
}
