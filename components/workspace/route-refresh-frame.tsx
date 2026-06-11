"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

export const ROUTE_REFRESH_START_EVENT = "flynow:route-refresh-start";

const PENDING_REFRESH_TIMEOUT_MS = 15_000;
const SETTLED_REFRESH_TIMEOUT_MS = 760;

export function announceRouteRefreshStart() {
  window.dispatchEvent(new Event(ROUTE_REFRESH_START_EVENT));
}

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

  const startRefresh = useCallback((timeoutMs: number) => {
    setIsRefreshing(true);

    if (refreshTimeout.current !== null) {
      window.clearTimeout(refreshTimeout.current);
    }

    refreshTimeout.current = window.setTimeout(() => {
      setIsRefreshing(false);
      refreshTimeout.current = null;
    }, timeoutMs);
  }, []);

  useEffect(() => {
    const handleRouteRefreshStart = () => {
      startRefresh(PENDING_REFRESH_TIMEOUT_MS);
    };

    window.addEventListener(
      ROUTE_REFRESH_START_EVENT,
      handleRouteRefreshStart
    );

    return () => {
      window.removeEventListener(
        ROUTE_REFRESH_START_EVENT,
        handleRouteRefreshStart
      );
    };
  }, [startRefresh]);

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
    startRefresh(SETTLED_REFRESH_TIMEOUT_MS);
  }, [startRefresh]);

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
