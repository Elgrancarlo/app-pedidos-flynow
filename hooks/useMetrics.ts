"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";

import { mockMetrics } from "@/lib/mock-data";
import type { MetricsData } from "@/lib/metrics";

type UseMetricsState = {
  data: MetricsData | null;
  loading: boolean;
  error: Error | null;
};

export function useMetrics(from: Date, to: Date): UseMetricsState {
  const [state, setState] = useState<UseMetricsState>({
    data: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    const fromParam = format(from, "yyyy-MM-dd");
    const toParam = format(to, "yyyy-MM-dd");

    setState({ data: null, loading: true, error: null });

    const timer = window.setTimeout(() => {
      setState({
        data: mockMetrics,
        loading: false,
        error: null,
      });
    }, 150);

    void fromParam;
    void toParam;

    return () => window.clearTimeout(timer);
  }, [from, to]);

  return state;
}
