"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { format } from "date-fns";

import { getMockMetricsScenario } from "@/lib/mock-data";
import {
  adaptAnalyticsOverviewToMetrics,
  hasMetricsContent,
  type MetricsData,
  type MetricsStatus,
} from "@/lib/metrics";

type UseMetricsState = {
  data: MetricsData | null;
  status: MetricsStatus;
  error: Error | null;
  requestKey: string | null;
  updatedAt: Date | null;
};

type UseMetricsResult = UseMetricsState & {
  loading: boolean;
  isInitialLoading: boolean;
  isRefreshing: boolean;
  isEmpty: boolean;
  retry: () => void;
};

function normalizeMetricsError(error: unknown) {
  if (error instanceof Error) {
    return error;
  }

  return new Error("Não foi possível carregar as métricas.");
}

export function useMetrics(from: Date, to: Date): UseMetricsResult {
  const [retryCount, setRetryCount] = useState(0);
  const [state, setState] = useState<UseMetricsState>({
    data: null,
    status: "initial-loading",
    error: null,
    requestKey: null,
    updatedAt: null,
  });
  const retry = useCallback(() => {
    setRetryCount((currentCount) => currentCount + 1);
  }, []);

  useEffect(() => {
    const fromParam = format(from, "yyyy-MM-dd");
    const toParam = format(to, "yyyy-MM-dd");
    const requestKey = `${fromParam}:${toParam}:${retryCount}`;
    let didCancel = false;

    setState((currentState) => ({
      data: currentState.data,
      status: hasMetricsContent(currentState.data)
        ? "refreshing"
        : "initial-loading",
      error: null,
      requestKey,
      updatedAt: currentState.updatedAt,
    }));

    const controller = new AbortController();
    const mockScenario = new URLSearchParams(window.location.search).get(
      "mockMetrics"
    );

    async function loadMetrics() {
      try {
        if (mockScenario === "error") {
          throw new Error("Mock de erro ativado.");
        }

        const nextData = mockScenario
          ? getMockMetricsScenario(mockScenario)
          : adaptAnalyticsOverviewToMetrics(
              await fetchAnalyticsOverview(fromParam, toParam, controller.signal)
            );

        if (didCancel) {
          return;
        }

        setState({
          data: nextData,
          status: hasMetricsContent(nextData) ? "success" : "empty",
          error: null,
          requestKey,
          updatedAt: new Date(),
        });
      } catch (error) {
        if (didCancel || controller.signal.aborted) {
          return;
        }

        setState((currentState) => ({
          data: currentState.data,
          status: "error",
          error: normalizeMetricsError(error),
          requestKey,
          updatedAt: currentState.updatedAt,
        }));
      }
    }

    void loadMetrics();

    return () => {
      didCancel = true;
      controller.abort();
    };
  }, [from, retryCount, to]);

  return useMemo(
    () => ({
      ...state,
      loading:
        state.status === "initial-loading" || state.status === "refreshing",
      isInitialLoading: state.status === "initial-loading",
      isRefreshing: state.status === "refreshing",
      isEmpty: state.status === "empty",
      retry,
    }),
    [retry, state]
  );
}

async function fetchAnalyticsOverview(
  fromParam: string,
  toParam: string,
  signal: AbortSignal
) {
  const searchParams = new URLSearchParams({
    section: "overview",
    startDate: fromParam,
    endDate: toParam,
  });
  const response = await fetch(`/api/analytics/metrics?${searchParams}`, {
    cache: "no-store",
    signal,
  });

  if (!response.ok) {
    throw new Error("Não foi possível carregar as métricas.");
  }

  return response.json();
}
