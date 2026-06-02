import Shell from "@/components/layout/shell";
import { DashboardHeader } from "@/components/layout/dashboard-header";
import type { CSSProperties } from "react";

function SkeletonLine({
  className = "",
  style,
}: {
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <span
      aria-hidden="true"
      className={`block rounded-full bg-white/[0.055] ${className}`}
      style={style}
    />
  );
}

function FinanceiroDateFilterSkeleton() {
  return (
    <div className="contents lg:flex lg:w-auto lg:min-w-0 lg:flex-col lg:items-end lg:gap-2">
      <div className="contents lg:flex lg:w-auto lg:max-w-full lg:flex-row lg:items-center lg:gap-1.5 lg:rounded-[14px] lg:border lg:border-[var(--fly-border)] lg:bg-[var(--fly-surface-elevated)] lg:p-1.5 lg:shadow-[0_18px_42px_rgba(0,0,0,0.28),inset_0_1px_0_rgba(255,255,255,0.035)]">
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
          className="flynow-dashboard-skeleton-panel min-w-0 rounded-[8px] border border-white/[0.06] bg-[#0D0F12] p-3 sm:p-4"
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
          className="flynow-dashboard-skeleton-panel min-w-0 rounded-[8px] border border-white/[0.06] border-l-4 border-l-white/[0.12] bg-[#0D0F12] p-4"
        >
          <SkeletonLine className="h-6 w-20 rounded-md" />
          <SkeletonLine className="mt-4 h-2.5 w-32" />
        </section>
      ))}
    </div>
  );
}

function FinanceChartRowSkeleton({
  width,
  valueWidth,
  delay,
}: {
  width: string;
  valueWidth: string;
  delay: string;
}) {
  return (
    <div className="grid gap-2 border-t border-white/[0.055] py-3 sm:grid-cols-[minmax(150px,0.45fr)_minmax(0,1fr)_74px] sm:items-center sm:gap-4">
      <div className="min-w-0">
        <div className="flex min-w-0 items-center gap-2">
          <SkeletonLine className="size-1.5" />
          <SkeletonLine className="h-2.5 w-24" />
        </div>
        <SkeletonLine className="mt-2 h-5 w-32 rounded-md" />
        <SkeletonLine className="mt-2 h-2.5 w-40" />
      </div>

      <div className="min-w-0 overflow-hidden rounded-full bg-white/[0.055]">
        <SkeletonLine
          className={`flynow-finance-chart-loading-bar h-1.5 ${width}`}
          style={{ animationDelay: delay }}
        />
      </div>

      <SkeletonLine className={`h-2.5 ${valueWidth} sm:ml-auto`} />
    </div>
  );
}

function FinanceChartSkeleton() {
  return (
    <section className="flynow-dashboard-skeleton-panel min-w-0 overflow-hidden rounded-[8px] border border-white/[0.06] bg-[#0D0F12]">
      <div className="flex min-w-0 flex-col gap-3 border-b border-white/[0.06] px-4 py-3 sm:px-5 sm:py-4">
        <div className="flex min-w-0 items-start gap-3">
          <span
            aria-hidden="true"
            className="mt-0.5 h-8 w-px shrink-0 rounded-full bg-gradient-to-b from-white/[0.18] via-white/[0.08] to-transparent"
          />
          <div className="min-w-0">
            <SkeletonLine className="h-4 w-40 rounded-md" />
            <SkeletonLine className="mt-2 h-2.5 w-64 max-w-full" />
          </div>
        </div>
      </div>

      <div className="p-3 sm:p-4">
        <div className="flynow-chart-stage flynow-chart-stage--loading min-h-[430px] space-y-5 rounded-[8px] border border-white/[0.045] bg-white/[0.01] p-4">
          <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
            <div className="min-w-0">
              <SkeletonLine className="h-2.5 w-32" />
              <SkeletonLine className="mt-3 h-8 w-48 rounded-md sm:h-9 sm:w-56" />
              <SkeletonLine className="mt-3 h-2.5 w-64 max-w-full" />
            </div>
            <div className="min-w-[118px] border-t border-white/[0.07] pt-3 sm:border-l sm:border-t-0 sm:pl-4 sm:pt-0">
              <SkeletonLine className="h-2.5 w-16" />
              <SkeletonLine className="mt-2 h-6 w-20 rounded-md" />
            </div>
          </div>

          <div className="flynow-chart-plot">
            <div className="flex h-8 overflow-hidden rounded-[6px] bg-white/[0.045]">
              <span
                className="flynow-finance-chart-loading-segment h-full basis-[72%] bg-[#4ADE80]/28"
                style={{ animationDelay: "0ms" }}
              />
              <span
                className="flynow-finance-chart-loading-segment h-full basis-[17%] bg-[#F87171]/24"
                style={{ animationDelay: "140ms" }}
              />
              <span
                className="flynow-finance-chart-loading-segment h-full basis-[11%] bg-[#F0C76A]/24"
                style={{ animationDelay: "260ms" }}
              />
            </div>

            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={index}
                  className="flex min-w-0 items-center justify-between gap-2"
                >
                  <span className="inline-flex min-w-0 items-center gap-1.5">
                    <SkeletonLine className="size-1.5 shrink-0" />
                    <SkeletonLine className="h-2.5 w-24" />
                  </span>
                  <SkeletonLine className="h-2.5 w-10" />
                </div>
              ))}
            </div>
          </div>

          <div>
            {[
              ["w-full", "w-10", "0ms"],
              ["w-[18%]", "w-8", "120ms"],
              ["w-[12%]", "w-8", "240ms"],
              ["w-[24%]", "w-8", "360ms"],
              ["w-[82%]", "w-10", "480ms"],
            ].map(([width, valueWidth, delay], index) => (
              <FinanceChartRowSkeleton
                key={index}
                width={width}
                valueWidth={valueWidth}
                delay={delay}
              />
            ))}
          </div>

          <div className="border-t border-white/[0.055] pt-3">
            <SkeletonLine className="h-2.5 w-full max-w-[680px]" />
            <SkeletonLine className="mt-2 h-2.5 w-2/3 max-w-[460px]" />
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
