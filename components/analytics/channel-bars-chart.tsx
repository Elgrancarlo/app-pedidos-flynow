"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface ChannelBarsChartProps {
  data: Array<{
    label: string;
    revenue: number;
    directSales?: number;
    spend?: number;
  }>;
  dataKey: "revenue" | "spend";
  title: string;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(value);
}

export default function ChannelBarsChart({ data, dataKey, title }: ChannelBarsChartProps) {
  return (
    <div className="h-80 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <p className="mb-4 text-sm font-semibold text-gray-800">{title}</p>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
          <XAxis dataKey="label" tick={{ fontSize: 12 }} interval={0} angle={-18} textAnchor="end" height={70} />
          <YAxis tickFormatter={(value) => `R$${Math.round(value / 1000)}k`} tick={{ fontSize: 12 }} />
          <Tooltip formatter={(value) => formatCurrency(Number(value ?? 0))} />
          <Bar dataKey={dataKey} fill={dataKey === "spend" ? "#84cc16" : "#111827"} radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
