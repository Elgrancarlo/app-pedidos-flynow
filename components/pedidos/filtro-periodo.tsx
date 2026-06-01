"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface FiltroPeriodoProps {
  startDate: string;
  endDate: string;
  basePath?: string;
}

const ATALHOS: Array<{ label: string; dias: number; mesAtual?: boolean }> = [
  { label: "Hoje", dias: 0 },
  { label: "7 dias", dias: 7 },
  { label: "15 dias", dias: 15 },
  { label: "30 dias", dias: 30 },
  { label: "Este mês", dias: 0, mesAtual: true },
];

function toISO(d: Date) {
  return d.toISOString().slice(0, 10);
}

export default function FiltroPeriodo({ startDate, endDate, basePath = "/pedidos" }: FiltroPeriodoProps) {
  const router = useRouter();
  const [start, setStart] = useState(startDate);
  const [end, setEnd] = useState(endDate);

  function aplicar(s: string, e: string) {
    setStart(s);
    setEnd(e);
    window.location.href = `${basePath}?startDate=${s}&endDate=${e}`;
  }

  function aplicarAtalho(dias: number, mesAtual?: boolean) {
    const hoje = new Date();
    const fim = toISO(hoje);
    if (mesAtual) {
      const inicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
      aplicar(toISO(inicio), fim);
    } else if (dias === 0) {
      aplicar(fim, fim);
    } else {
      const inicio = new Date(hoje);
      inicio.setDate(hoje.getDate() - dias);
      aplicar(toISO(inicio), fim);
    }
  }

  const atalhoAtivo = (() => {
    const hoje = new Date();
    const fimHoje = toISO(hoje);
    if (start === fimHoje && end === fimHoje) return "Hoje";
    const mesInicio = toISO(new Date(hoje.getFullYear(), hoje.getMonth(), 1));
    if (start === mesInicio && end === fimHoje) return "Este mês";
    for (const { label, dias } of ATALHOS.filter((a) => a.dias > 0)) {
      const inicio = new Date(hoje);
      inicio.setDate(hoje.getDate() - dias);
      if (start === toISO(inicio) && end === fimHoje) return label;
    }
    return null;
  })();

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm text-gray-500">Período:</span>

      {ATALHOS.map((a) => (
        <button
          key={a.label}
          onClick={() => aplicarAtalho(a.dias, a.mesAtual)}
          className={`text-xs px-3 py-1.5 rounded-md border transition-colors ${
            atalhoAtivo === a.label
              ? "bg-indigo-600 text-white border-indigo-600"
              : "bg-white text-gray-700 border-gray-300 hover:border-indigo-400"
          }`}
        >
          {a.label}
        </button>
      ))}

      <div className="flex items-center gap-1.5 ml-2">
        <input
          type="date"
          value={start}
          onChange={(e) => setStart(e.target.value)}
          className="border border-gray-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <span className="text-gray-400 text-sm">→</span>
        <input
          type="date"
          value={end}
          onChange={(e) => setEnd(e.target.value)}
          className="border border-gray-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <button
          onClick={() => aplicar(start, end)}
          className="text-sm bg-indigo-600 text-white px-3 py-1.5 rounded-md hover:bg-indigo-700 transition-colors"
        >
          Filtrar
        </button>
      </div>
    </div>
  );
}
