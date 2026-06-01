"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface FunilTakeRateChartProps {
  data: Array<{
    day: string;
    take_rate_us1: number;
    take_rate_us2: number;
  }>;
}

function formatPercent(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}

export default function FunilTakeRateChart({ data }: FunilTakeRateChartProps) {
  return (
    <div className="h-80 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <p className="mb-4 text-sm font-semibold text-gray-800">Take rate de upsells</p>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
          <XAxis dataKey="day" tick={{ fontSize: 12 }} />
          <YAxis tickFormatter={formatPercent} tick={{ fontSize: 12 }} />
          <Tooltip formatter={(value) => formatPercent(Number(value ?? 0))} />
          <Legend />
          <Line type="monotone" dataKey="take_rate_us1" stroke="#2563eb" strokeWidth={2.5} dot={false} name="US1" />
          <Line type="monotone" dataKey="take_rate_us2" stroke="#7c3aed" strokeWidth={2.5} dot={false} name="US2" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
