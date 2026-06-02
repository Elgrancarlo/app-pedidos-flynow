"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";

import { cn } from "@/lib/utils";

const MOBILE_HEADER_SCROLL_RANGE = 118;
const MOBILE_ELEVATION_PROGRESS = 0.04;

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
  const animationFrameRef = useRef<number | null>(null);
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    const mobileQuery = window.matchMedia("(max-width: 639px)");

    const updateProgress = () => {
      const scrollY = Math.max(window.scrollY, 0);
      const nextProgress = mobileQuery.matches
        ? Math.min(scrollY / MOBILE_HEADER_SCROLL_RANGE, 1)
        : scrollY > 0
          ? 1
          : 0;

      setScrollProgress((currentProgress) => {
        if (
          Math.abs(currentProgress - nextProgress) < 0.018 &&
          nextProgress !== 0 &&
          nextProgress !== 1
        ) {
          return currentProgress;
        }

        return nextProgress;
      });
    };

    const scheduleUpdate = () => {
      if (animationFrameRef.current !== null) {
        return;
      }

      animationFrameRef.current = window.requestAnimationFrame(() => {
        animationFrameRef.current = null;
        updateProgress();
      });
    };

    updateProgress();
    window.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.addEventListener("resize", scheduleUpdate);
    mobileQuery.addEventListener("change", scheduleUpdate);

    return () => {
      window.removeEventListener("scroll", scheduleUpdate);
      window.removeEventListener("resize", scheduleUpdate);
      mobileQuery.removeEventListener("change", scheduleUpdate);

      if (animationFrameRef.current !== null) {
        window.cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  const isElevated = scrollProgress > MOBILE_ELEVATION_PROGRESS;
  const visibleProgress = 1 - scrollProgress;
  const headerStyle = {
    "--flynow-header-progress": scrollProgress.toFixed(3),
    "--flynow-mobile-header-min-height": `${104 - 40 * scrollProgress}px`,
    "--flynow-mobile-header-row-gap": `${8 * visibleProgress}px`,
    "--flynow-presets-max-height": `${48 * visibleProgress}px`,
    "--flynow-presets-padding-top": `${2 * visibleProgress}px`,
    "--flynow-presets-padding-bottom": `${4 * visibleProgress}px`,
    "--flynow-presets-opacity": visibleProgress.toFixed(3),
    "--flynow-presets-translate-y": `${-8 * scrollProgress}px`,
    "--flynow-presets-clip-top": `${-4 * visibleProgress}px`,
    "--flynow-presets-clip-bottom": `calc(${(
      100 * scrollProgress
    ).toFixed(2)}% - ${8 * visibleProgress}px)`,
  } as CSSProperties;
  const arePresetsCollapsed = scrollProgress >= 0.985;

  return (
    <>
      <header
        data-elevated={isElevated ? "true" : "false"}
        data-presets-collapsed={arePresetsCollapsed ? "true" : "false"}
        style={headerStyle}
        className={cn(
          "sticky top-0 z-40 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 border-b px-4 pb-3 pt-4 transition-[background-color,border-color,box-shadow,backdrop-filter,min-height,row-gap] duration-200 sm:px-5 sm:pb-4 sm:pt-5 lg:flex lg:min-h-[92px] lg:items-end lg:justify-between lg:gap-4 lg:px-6",
          isElevated
            ? "min-h-[86px] border-[var(--fly-divider)] bg-[var(--fly-surface-elevated)] shadow-[0_10px_28px_rgba(0,0,0,0.18)] backdrop-blur-md sm:min-h-[112px] lg:min-h-[92px]"
            : "min-h-[104px] border-transparent bg-[var(--fly-bg)] shadow-none backdrop-blur-0 sm:min-h-[116px] lg:min-h-[92px]"
        )}
      >
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <span
              aria-hidden="true"
              className="h-7 w-px shrink-0 rounded-full bg-gradient-to-b from-[var(--fly-brand-strong)] via-[var(--fly-brand-line)] to-transparent sm:h-10"
            />
            <div className="min-w-0">
              <h1 className="truncate text-[17px] font-semibold leading-none text-[var(--fly-text)] min-[390px]:text-[18px] sm:text-[26px]">
                {title}
              </h1>

              {description ? (
                <p
                  className={cn(
                    "mt-1.5 hidden max-w-[520px] text-[12px] leading-5 text-[var(--fly-text-muted)] transition-[opacity,transform] duration-200 sm:mt-2 sm:block sm:text-sm lg:block",
                    isElevated &&
                      "hidden -translate-y-1 opacity-0 sm:block sm:translate-y-0 sm:opacity-100"
                  )}
                >
                  {description}
                </p>
              ) : null}
            </div>
          </div>
        </div>

        {actions ? (
          <div className="contents lg:flex lg:w-auto lg:shrink-0 lg:-translate-y-1 lg:items-end lg:gap-2">
            {actions}
          </div>
        ) : null}
      </header>
    </>
  );
}
