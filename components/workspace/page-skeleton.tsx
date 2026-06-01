import Shell from "@/components/layout/shell";
import { DashboardHeader } from "@/components/layout/dashboard-header";

function SkeletonLine({ className = "" }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`block rounded-full bg-white/[0.055] ${className}`}
    />
  );
}

function SkeletonPanel({ children }: { children?: React.ReactNode }) {
  return (
    <section className="flynow-dashboard-skeleton-panel rounded-[8px] border border-white/[0.06] bg-[#0D0F12] p-4">
      {children}
    </section>
  );
}

export function WorkspacePageSkeleton({
  title = "Carregando",
  description = "Preparando dados da operação",
}: {
  title?: string;
  description?: string;
}) {
  return (
    <Shell>
      <DashboardHeader title={title} description={description} />

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
                    className="rounded-[8px] border border-white/[0.045] bg-white/[0.012] p-3"
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
