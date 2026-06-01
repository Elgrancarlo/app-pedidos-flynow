"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

interface Ponto {
  dia: string;
  receita: number;
  reembolsos: number;
}

interface GraficoTendenciaProps {
  dados: Ponto[];
}

function fmtBRL(v: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(v);
}

function fmtDia(d: string) {
  return new Date(d + "T12:00:00").toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  });
}

export default function GraficoTendencia({ dados }: GraficoTendenciaProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-gray-900">Tendência</h3>
        <p className="text-xs text-gray-500 mt-0.5">Receita e reembolsos — últimos 30 dias</p>
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={dados} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
          <XAxis
            dataKey="dia"
            tick={{ fontSize: 10, fill: "#9ca3af" }}
            tickFormatter={fmtDia}
            interval="preserveStartEnd"
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 10, fill: "#9ca3af" }}
            tickFormatter={fmtBRL}
            axisLine={false}
            tickLine={false}
            width={60}
          />
          <Tooltip
            formatter={(value, name) => [
              fmtBRL(value as number),
              name === "receita" ? "Receita" : "Reembolsos",
            ]}
            labelFormatter={(d) => fmtDia(d as string)}
            contentStyle={{
              fontSize: 12,
              borderRadius: 8,
              border: "1px solid #e5e7eb",
              boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
            }}
          />
          <Legend
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
            formatter={(value) => (value === "receita" ? "Receita" : "Reembolsos")}
          />
          <Line
            type="monotone"
            dataKey="receita"
            stroke="#10b981"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
          <Line
            type="monotone"
            dataKey="reembolsos"
            stroke="#ef4444"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
