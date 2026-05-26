"use client";

import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

type DashboardHeaderProps = {
  title: string;
  description?: string;
  actions?: React.ReactNode;
};

export function DashboardHeader({
  title,
  description,
  actions,
}: DashboardHeaderProps) {
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const [isElevated, setIsElevated] = useState(false);

  useEffect(() => {
    const sentinel = sentinelRef.current;

    if (!sentinel) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsElevated(!entry.isIntersecting);
      },
      { threshold: 0 }
    );

    observer.observe(sentinel);

    return () => observer.disconnect();
  }, []);

  return (
    <>
      <div ref={sentinelRef} aria-hidden="true" className="h-px" />
      <header
        className={cn(
          "sticky top-0 z-40 flex min-h-[92px] flex-col justify-end gap-4 border-b px-6 pb-4 pt-5 transition-[background-color,border-color,box-shadow,backdrop-filter] duration-200 xl:flex-row xl:items-end xl:justify-between",
          isElevated
            ? "border-white/[0.06] bg-[#050505]/72 shadow-[0_16px_50px_rgba(0,0,0,0.36)] backdrop-blur-2xl"
            : "border-transparent bg-[#050505] shadow-none backdrop-blur-0"
        )}
      >
        <div className="min-w-0">
          <div className="flex min-w-0 items-start gap-3">
            <span
              aria-hidden="true"
              className="mt-0.5 h-10 w-px shrink-0 rounded-full bg-gradient-to-b from-[#D6A84F]/85 via-[#D6A84F]/28 to-transparent"
            />
            <div className="min-w-0">
              <h1 className="text-[26px] font-semibold leading-none text-[#F5F2EA]">
                {title}
              </h1>

              {description ? (
                <p className="mt-2 max-w-[520px] text-sm leading-5 text-[#9B968C]">
                  {description}
                </p>
              ) : null}
            </div>
          </div>
        </div>

        {actions ? (
          <div className="flex w-full items-end gap-2 xl:w-auto xl:shrink-0 xl:-translate-y-1">
            {actions}
          </div>
        ) : null}
      </header>
    </>
  );
}
