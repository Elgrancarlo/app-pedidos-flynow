"use client";

import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

export function RouteRefreshFrame({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const [contentKey, setContentKey] = useState("initial");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const previousHref = useRef<string | null>(null);
  const refreshTimeout = useRef<number | null>(null);

  useEffect(() => {
    const href = `${window.location.pathname}${window.location.search}`;

    if (previousHref.current === null) {
      previousHref.current = href;
      return;
    }

    if (previousHref.current === href) {
      return;
    }

    previousHref.current = href;
    setContentKey(href);
    setIsRefreshing(true);

    if (refreshTimeout.current !== null) {
      window.clearTimeout(refreshTimeout.current);
    }

    refreshTimeout.current = window.setTimeout(() => {
      setIsRefreshing(false);
      refreshTimeout.current = null;
    }, 760);
  });

  useEffect(() => {
    return () => {
      if (refreshTimeout.current !== null) {
        window.clearTimeout(refreshTimeout.current);
      }
    };
  }, []);

  return (
    <div
      key={contentKey}
      aria-busy={isRefreshing}
      className={cn(
        "flynow-dashboard-content relative flex flex-col gap-4 sm:gap-5",
        isRefreshing && "flynow-dashboard-content--refreshing",
        className
      )}
    >
      {children}
    </div>
  );
}
