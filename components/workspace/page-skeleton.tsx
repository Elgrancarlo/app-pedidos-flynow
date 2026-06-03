import Shell from "@/components/layout/shell";
import { DashboardHeader } from "@/components/layout/dashboard-header";

export function SkeletonLine({ className = "" }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`block rounded-full bg-[var(--fly-skeleton-line)] ${className}`}
    />
  );
}

export function SkeletonPanel({
  children,
  className = "p-4",
}: {
  children?: React.ReactNode;
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
      {["w-14", "w-10", "w-10", "w-10", "w-10"].map((width, index) => (
        <SkeletonLine
          key={index}
          className={`h-7 rounded-[9px] ${width}`}
        />
      ))}
    </div>
  );
}

function HeaderActionsSkeleton({
  actionCount = 0,
}: {
  actionCount?: number;
}) {
  return (
    <div className="hidden items-center gap-2 lg:flex">
      <DateFilterSkeleton />
      {Array.from({ length: actionCount }).map((_, index) => (
        <SkeletonLine key={index} className="h-9 w-28 rounded-[8px]" />
      ))}
    </div>
  );
}

function MetricCardsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: count }).map((_, index) => (
        <SkeletonPanel key={index} className="p-3 sm:p-4">
          <div className="flex items-center gap-2">
            <SkeletonLine className="size-1.5" />
            <SkeletonLine className="h-2.5 w-24" />
          </div>
          <SkeletonLine className="mt-5 h-7 w-32 rounded-md sm:h-8" />
          <SkeletonLine className="mt-3 h-2.5 w-40 max-w-full" />
          <SkeletonLine className="mt-5 h-px w-full" />
        </SkeletonPanel>
      ))}
    </div>
  );
}

function SummaryBlocksSkeleton({ count = 0 }: { count?: number }) {
  if (count <= 0) return null;

  return (
    <SkeletonPanel className="p-3 sm:p-4">
      <SkeletonLine className="h-3 w-36 rounded-md" />
      <SkeletonLine className="mt-3 h-2.5 w-56 max-w-full" />
      <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
        {Array.from({ length: count }).map((_, index) => (
          <div
            key={index}
            className="rounded-[8px] border border-[var(--fly-border-subtle)] bg-[var(--fly-row-bg)] p-3"
          >
            <SkeletonLine className="h-2.5 w-20 rounded-md" />
            <SkeletonLine className="mt-4 h-5 w-16 rounded-md" />
            <SkeletonLine className="mt-3 h-2.5 w-24 rounded-md" />
          </div>
        ))}
      </div>
    </SkeletonPanel>
  );
}

function TableSkeleton({
  columns = 6,
  rows = 8,
}: {
  columns?: number;
  rows?: number;
}) {
  const gridTemplate = {
    gridTemplateColumns: `repeat(${columns}, minmax(120px, 1fr))`,
  };

  return (
    <SkeletonPanel className="overflow-hidden">
      <div className="border-b border-[var(--fly-divider)] px-4 py-3 sm:px-5 sm:py-4">
        <SkeletonLine className="h-4 w-44 rounded-md" />
        <SkeletonLine className="mt-3 h-2.5 w-64 max-w-full" />
      </div>

      <div className="border-b border-[var(--fly-divider)] p-3 sm:p-4">
        <div className="grid gap-2 lg:grid-cols-[minmax(240px,1fr)_160px_160px_120px]">
          <SkeletonLine className="h-10 rounded-[8px]" />
          <SkeletonLine className="h-10 rounded-[8px]" />
          <SkeletonLine className="h-10 rounded-[8px]" />
          <SkeletonLine className="h-10 rounded-[8px]" />
        </div>
      </div>

      <div className="overflow-hidden">
        <div
          className="grid gap-3 border-b border-[var(--fly-divider)] bg-[var(--fly-table-head)] px-3 py-3"
          style={gridTemplate}
        >
          {Array.from({ length: columns }).map((_, index) => (
            <SkeletonLine key={index} className="h-2.5 rounded-md" />
          ))}
        </div>

        <div className="divide-y divide-[var(--fly-divider-subtle)]">
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <div
              key={rowIndex}
              className="grid gap-3 px-3 py-3.5"
              style={gridTemplate}
            >
              {Array.from({ length: columns }).map((_, columnIndex) => (
                <div key={columnIndex} className="min-w-0">
                  <SkeletonLine
                    className={`h-3 rounded-md ${
                      columnIndex === 0 ? "w-32" : "w-20"
                    }`}
                  />
                  {columnIndex === 0 ? (
                    <SkeletonLine className="mt-2 h-2.5 w-44 max-w-full rounded-md" />
                  ) : null}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </SkeletonPanel>
  );
}

export function WorkspacePageSkeleton({
  title = "Carregando",
  description = "Preparando dados da operação",
  actions,
}: {
  title?: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <Shell>
      <DashboardHeader
        title={title}
        description={description}
        actions={actions}
      />

      <div
        role="status"
        aria-label="Carregando página"
        className="flynow-dashboard-skeleton min-w-0 overflow-x-clip px-3.5 pb-28 pt-4 sm:px-5 sm:pt-5 xl:px-6 xl:pb-10 xl:pt-6"
      >
        <div className="flex flex-col gap-4 sm:gap-5">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <SkeletonPanel key={index}>
                <div className="flex items-center gap-2">
                  <SkeletonLine className="size-1.5" />
                  <SkeletonLine className="h-2.5 w-24" />
                </div>
                <SkeletonLine className="mt-5 h-7 w-36 rounded-md" />
                <SkeletonLine className="mt-3 h-2.5 w-32" />
                <SkeletonLine className="mt-5 h-px w-full" />
              </SkeletonPanel>
            ))}
          </div>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(340px,0.65fr)]">
            <SkeletonPanel>
              <SkeletonLine className="h-3 w-40 rounded-md" />
              <SkeletonLine className="mt-3 h-2.5 w-48" />
              <div className="mt-6 space-y-3">
                {Array.from({ length: 5 }).map((_, index) => (
                  <div
                    key={index}
                    className="rounded-[8px] border border-[var(--fly-border-subtle)] bg-[var(--fly-row-bg)] p-3"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <SkeletonLine className="h-3 w-36 rounded-md" />
                      <SkeletonLine className="h-3 w-20 rounded-md" />
                    </div>
                    <SkeletonLine className="mt-3 h-px w-full" />
                  </div>
                ))}
              </div>
            </SkeletonPanel>

            <SkeletonPanel>
              <SkeletonLine className="h-3 w-28 rounded-md" />
              <SkeletonLine className="mt-3 h-2.5 w-44" />
              <div className="mt-6 space-y-3">
                {Array.from({ length: 4 }).map((_, index) => (
                  <SkeletonLine key={index} className="h-10 w-full rounded-[8px]" />
                ))}
              </div>
            </SkeletonPanel>
          </div>
        </div>
        <span className="sr-only">Carregando conteúdo.</span>
      </div>
    </Shell>
  );
}

export function WorkspaceDashboardSkeleton() {
  return (
    <WorkspacePageSkeleton
      title="Dashboard"
      description="Métricas do dia atual e sinais operacionais"
      actions={<DateFilterSkeleton />}
    />
  );
}

export function WorkspaceTablePageSkeleton({
  title,
  description,
  ariaLabel,
  actionCount = 2,
  metricCount = 4,
  summaryCount = 0,
  tableColumns = 6,
  tableRows = 8,
}: {
  title: string;
  description: string;
  ariaLabel: string;
  actionCount?: number;
  metricCount?: number;
  summaryCount?: number;
  tableColumns?: number;
  tableRows?: number;
}) {
  return (
    <Shell>
      <DashboardHeader
        title={title}
        description={description}
        actions={<HeaderActionsSkeleton actionCount={actionCount} />}
      />

      <div
        role="status"
        aria-label={ariaLabel}
        className="flynow-dashboard-skeleton min-w-0 overflow-x-clip px-3.5 pb-28 pt-4 sm:px-5 sm:pt-5 xl:px-6 xl:pb-10 xl:pt-6"
      >
        <div className="flex flex-col gap-4 sm:gap-5">
          <MetricCardsSkeleton count={metricCount} />
          <SummaryBlocksSkeleton count={summaryCount} />
          <TableSkeleton columns={tableColumns} rows={tableRows} />
        </div>
        <span className="sr-only">{ariaLabel}.</span>
      </div>
    </Shell>
  );
}

export function WorkspaceSettingsSkeleton() {
  return (
    <Shell>
      <DashboardHeader
        title="Configurações"
        description="Ambiente, integrações e rotinas administrativas"
      />

      <div
        role="status"
        aria-label="Carregando configurações"
        className="flynow-dashboard-skeleton min-w-0 overflow-x-clip px-3.5 pb-28 pt-4 sm:px-5 sm:pt-5 xl:px-6 xl:pb-10 xl:pt-6"
      >
        <div className="flex flex-col gap-4 sm:gap-5">
          <MetricCardsSkeleton count={4} />

          <SkeletonPanel className="p-3 sm:p-4">
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_260px]">
              <div className="grid gap-2.5 md:grid-cols-2 2xl:grid-cols-3">
                {Array.from({ length: 9 }).map((_, index) => (
                  <div
                    key={index}
                    className="rounded-[8px] border border-[var(--fly-border-subtle)] bg-[var(--fly-row-bg)] px-3 py-3"
                  >
                    <SkeletonLine className="h-3 w-32 rounded-md" />
                    <SkeletonLine className="mt-3 h-2.5 w-44 max-w-full rounded-md" />
                    <SkeletonLine className="mt-4 h-2.5 w-24 rounded-md" />
                  </div>
                ))}
              </div>

              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div
                    key={index}
                    className="rounded-[8px] border border-[var(--fly-border-subtle)] bg-[var(--fly-row-bg)] p-4"
                  >
                    <SkeletonLine className="h-3 w-28 rounded-md" />
                    <SkeletonLine className="mt-4 h-7 w-20 rounded-md" />
                    <SkeletonLine className="mt-3 h-2.5 w-full rounded-md" />
                  </div>
                ))}
              </div>
            </div>
          </SkeletonPanel>

          <div className="grid gap-4 xl:grid-cols-2">
            {Array.from({ length: 2 }).map((_, index) => (
              <SkeletonPanel key={index} className="p-3 sm:p-4">
                <SkeletonLine className="h-4 w-40 rounded-md" />
                <SkeletonLine className="mt-3 h-2.5 w-64 max-w-full rounded-md" />
                <div className="mt-5 space-y-2.5">
                  {Array.from({ length: 4 }).map((__, itemIndex) => (
                    <SkeletonLine
                      key={itemIndex}
                      className="h-14 w-full rounded-[8px]"
                    />
                  ))}
                </div>
              </SkeletonPanel>
            ))}
          </div>
        </div>
        <span className="sr-only">Carregando configurações.</span>
      </div>
    </Shell>
  );
}
