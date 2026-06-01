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

interface RevenueSpendChartProps {
  data: Array<{
    day: string;
    revenue: number;
    secondaryValue: number;
    directSales?: number;
  }>;
  title?: string;
  secondaryLabel?: string;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(value);
}

export default function RevenueSpendChart({
  data,
  title = "Faturamento vs investimento",
  secondaryLabel = "Investimento",
}: RevenueSpendChartProps) {
  return (
    <div className="h-80 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <p className="mb-4 text-sm font-semibold text-gray-800">{title}</p>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
          <XAxis dataKey="day" tick={{ fontSize: 12 }} />
          <YAxis tickFormatter={(value) => `R$${Math.round(value / 1000)}k`} tick={{ fontSize: 12 }} />
          <Tooltip formatter={(value) => formatCurrency(Number(value ?? 0))} />
          <Legend />
          <Line type="monotone" dataKey="revenue" stroke="#111827" strokeWidth={2.5} dot={false} name="Faturamento" />
          <Line type="monotone" dataKey="secondaryValue" stroke="#84cc16" strokeWidth={2.5} dot={false} name={secondaryLabel} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
