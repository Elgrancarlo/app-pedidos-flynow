"use client";

import { Fragment, useEffect, useState, useCallback } from "react";
import Shell from "@/components/shell";
import PageHeader from "@/components/page-header";
import {
  ShieldCheck,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  Truck,
  AlertTriangle,
  Pencil,
  X,
  Check,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  TYPES                                                              */
/* ------------------------------------------------------------------ */

interface IndicadorCell {
  previsto: number | null;
  realizado: number | null;
  pct: number | null;
  status: "NO_RITMO" | "ATENCAO" | "CRITICO" | "—";
}

interface Semana {
  semana: number;
  inicio: string;
  fim: string;
  notas: string | null;
  indicadores: {
    receita: Record<string, IndicadorCell>;
    aquisicao: Record<string, IndicadorCell>;
    perdas: Record<string, IndicadorCell>;
    custos: Record<string, IndicadorCell>;
    resultado: Record<string, IndicadorCell>;
  };
}

interface Meta {
  meta_receita_liquida: number;
  meta_clientes: number;
  invest_total: number;
  roas_exigido: number;
  meta_pct_chargeback: number;
  meta_pct_reembolso: number;
  meta_pct_cmv: number;
  meta_pct_eficiencia: number;
  meta_lucro_liquido: number;
  meta_ebitda_pct: number;
  meta_ticket_medio: number;
  meta_pct_front: number;
  meta_pct_backend: number;
  meta_pct_recuperada: number;
  [k: string]: number;
}

interface PainelData {
  ok: boolean;
  mes: string;
  meta: Meta;
  semanas: Semana[];
  legenda: Record<string, string>;
}

interface InputSemana {
  semana: number;
  semana_inicio: string;
  semana_fim: string;
  cmv_pct: number | null;
  eficiencia_pct: number | null;
  lucro_liquido: number | null;
  ebitda_pct: number | null;
  notas: string | null;
}

/* ------------------------------------------------------------------ */
/*  CONSTANTS                                                          */
/* ------------------------------------------------------------------ */

type BlockKey = "receita" | "aquisicao" | "perdas" | "custos" | "resultado";

interface IndicadorConfig {
  key: string;
  label: string;
  unidade: "R$" | "%" | "Qtd" | "ROI";
}

const INDICADORES_CONFIG: Record<BlockKey, IndicadorConfig[]> = {
  receita: [
    { key: "receita_liquida", label: "Receita Liquida Total", unidade: "R$" },
    { key: "pct_front", label: "% Receita Front", unidade: "%" },
    { key: "pct_backend", label: "% Receita Backend/Upsell", unidade: "%" },
    { key: "pct_recuperada", label: "% Receita Recuperada", unidade: "%" },
    { key: "clientes", label: "Quantidade de Clientes", unidade: "Qtd" },
    { key: "ticket_medio", label: "Ticket Medio", unidade: "R$" },
  ],
  aquisicao: [
    { key: "investimento", label: "Investimento em Trafego", unidade: "R$" },
    { key: "roas", label: "ROAS", unidade: "ROI" },
    { key: "roi_consolidado", label: "ROI Consolidado", unidade: "ROI" },
    { key: "cpa", label: "CPA Medio", unidade: "R$" },
  ],
  perdas: [
    { key: "pct_chargeback", label: "% Chargeback", unidade: "%" },
    { key: "pct_reembolso", label: "% Reembolso", unidade: "%" },
  ],
  custos: [
    { key: "cmv", label: "CMV (% s/ faturamento)", unidade: "%" },
    { key: "eficiencia", label: "Eficiencia Operacional", unidade: "%" },
  ],
  resultado: [
    { key: "lucro_liquido", label: "LUCRO LIQUIDO", unidade: "R$" },
    { key: "ebitda_pct", label: "EBITDA Projetado %", unidade: "%" },
  ],
};

const BLOCK_STYLES: Record<
  BlockKey,
  { border: string; text: string; bg: string; icon: typeof DollarSign }
> = {
  receita: {
    border: "border-l-emerald-500",
    text: "text-emerald-700",
    bg: "bg-emerald-50",
    icon: TrendingUp,
  },
  aquisicao: {
    border: "border-l-blue-500",
    text: "text-blue-700",
    bg: "bg-blue-50",
    icon: Truck,
  },
  perdas: {
    border: "border-l-red-500",
    text: "text-red-700",
    bg: "bg-red-50",
    icon: AlertTriangle,
  },
  custos: {
    border: "border-l-amber-500",
    text: "text-amber-700",
    bg: "bg-amber-50",
    icon: DollarSign,
  },
  resultado: {
    border: "border-l-violet-500",
    text: "text-violet-700",
    bg: "bg-violet-50",
    icon: ShieldCheck,
  },
};

const BLOCK_LABELS: Record<BlockKey, string> = {
  receita: "RECEITA",
  aquisicao: "AQUISICAO",
  perdas: "PERDAS",
  custos: "CUSTOS",
  resultado: "RESULTADO",
};

const MESES_PT = [
  "Janeiro",
  "Fevereiro",
  "Marco",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

/* ------------------------------------------------------------------ */
/*  HELPERS                                                            */
/* ------------------------------------------------------------------ */

const fmtCurrency = (v: number | null, compact = false): string => {
  if (v == null) return "—";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    ...(compact
      ? { notation: "compact", compactDisplay: "short" }
      : { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
  }).format(v);
};

const fmtPct = (v: number | null): string => {
  if (v == null) return "—";
  return `${v.toFixed(1)}%`;
};

const fmtRoi = (v: number | null): string => {
  if (v == null) return "—";
  return `${v.toFixed(2)}x`;
};

const fmtQtd = (v: number | null): string => {
  if (v == null) return "—";
  return new Intl.NumberFormat("pt-BR").format(v);
};

function fmtValue(v: number | null, unidade: string, compact = false): string {
  switch (unidade) {
    case "R$":
      return fmtCurrency(v, compact);
    case "%":
      return fmtPct(v);
    case "ROI":
      return fmtRoi(v);
    case "Qtd":
      return fmtQtd(v);
    default:
      return v != null ? String(v) : "—";
  }
}

function mesKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function mesLabel(date: Date): string {
  return `${MESES_PT[date.getMonth()]} ${date.getFullYear()}`;
}

function semanaLabel(s: Semana): string {
  const d1 = parseInt(s.inicio.split("-")[2], 10);
  const d2 = parseInt(s.fim.split("-")[2], 10);
  return `S${s.semana} (${d1}-${d2})`;
}

/* ------------------------------------------------------------------ */
/*  SUB-COMPONENTS                                                     */
/* ------------------------------------------------------------------ */

function SemaforoBadge({ status }: { status: string }) {
  const map: Record<string, { wrap: string; dot: string; label: string }> = {
    NO_RITMO: {
      wrap: "bg-emerald-100 text-emerald-800 border border-emerald-200",
      dot: "bg-emerald-500",
      label: "NO RITMO",
    },
    ATENCAO: {
      wrap: "bg-amber-100 text-amber-800 border border-amber-200",
      dot: "bg-amber-500",
      label: "ATENCAO",
    },
    CRITICO: {
      wrap: "bg-red-100 text-red-800 border border-red-200",
      dot: "bg-red-500",
      label: "CRITICO",
    },
    "—": {
      wrap: "bg-gray-100 text-gray-400 border border-gray-200",
      dot: "bg-gray-300",
      label: "—",
    },
  };
  const s = map[status] ?? map["—"];
  return (
    <span
      className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full ${s.wrap}`}
    >
      <span className={`inline-block h-2 w-2 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
}

function ProgressBar({ pct }: { pct: number }) {
  const color =
    pct >= 95
      ? "bg-emerald-500"
      : pct >= 80
        ? "bg-amber-500"
        : "bg-red-500";
  return (
    <div className="w-full h-1.5 rounded-full bg-gray-100 mt-2">
      <div
        className={`h-1.5 rounded-full ${color} transition-all`}
        style={{ width: `${Math.min(pct, 100)}%` }}
      />
    </div>
  );
}

function WeekCell({
  cell,
  unidade,
}: {
  cell: IndicadorCell | undefined;
  unidade: string;
}) {
  if (!cell) {
    return (
      <td className="px-3 py-3 text-center">
        <span className="text-gray-300 text-xs">—</span>
      </td>
    );
  }
  return (
    <td className="px-3 py-3 text-center">
      <div className="flex flex-col items-center gap-0.5">
        <span className="font-semibold text-sm font-mono text-gray-900">
          {fmtValue(cell.realizado, unidade, true)}
        </span>
        <span className="text-xs text-gray-400 font-mono">
          de {fmtValue(cell.previsto, unidade, true)}
        </span>
        <span className="text-xs text-gray-500 font-mono">
          {cell.pct != null ? `${cell.pct.toFixed(1)}%` : "—"}
        </span>
        <SemaforoBadge status={cell.status} />
      </div>
    </td>
  );
}

function MetaCell({
  meta,
  blockKey,
  indKey,
  unidade,
}: {
  meta: Meta;
  blockKey: BlockKey;
  indKey: string;
  unidade: string;
}) {
  const metaKeyMap: Record<string, string> = {
    receita_liquida: "meta_receita_liquida",
    pct_front: "meta_pct_front",
    pct_backend: "meta_pct_backend",
    pct_recuperada: "meta_pct_recuperada",
    clientes: "meta_clientes",
    ticket_medio: "meta_ticket_medio",
    investimento: "invest_total",
    roas: "roas_exigido",
    roi_consolidado: "roas_exigido",
    cpa: "meta_cpa",
    pct_chargeback: "meta_pct_chargeback",
    pct_reembolso: "meta_pct_reembolso",
    cmv: "meta_pct_cmv",
    eficiencia: "meta_pct_eficiencia",
    lucro_liquido: "meta_lucro_liquido",
    ebitda_pct: "meta_ebitda_pct",
  };
  const k = metaKeyMap[indKey];
  const v = k ? meta[k] ?? null : null;
  return (
    <td className="px-3 py-3 text-center font-mono text-sm text-gray-600">
      {fmtValue(v as number | null, unidade, true)}
    </td>
  );
}

function BlockCard({
  blockKey,
  semanas,
  meta,
}: {
  blockKey: BlockKey;
  semanas: Semana[];
  meta: Meta;
}) {
  const style = BLOCK_STYLES[blockKey];
  const indicators = INDICADORES_CONFIG[blockKey];
  const Icon = style.icon;

  return (
    <div
      className={`bg-white rounded-xl border border-gray-200 shadow-sm border-l-4 ${style.border} overflow-hidden`}
    >
      <div className={`px-6 py-4 flex items-center gap-2 ${style.bg}`}>
        <Icon className={`h-5 w-5 ${style.text}`} />
        <h3 className={`text-sm font-bold uppercase tracking-wide ${style.text}`}>
          {BLOCK_LABELS[blockKey]}
        </h3>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-52">
                Indicador
              </th>
              <th className="text-center px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Meta Mes
              </th>
              {semanas.map((s) => (
                <th
                  key={s.semana}
                  className="text-center px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider"
                >
                  {semanaLabel(s)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {indicators.map((ind) => (
              <tr key={ind.key} className="hover:bg-gray-50/50">
                <td className="px-6 py-3 text-sm font-medium text-gray-700 whitespace-nowrap">
                  {ind.label}
                </td>
                <MetaCell
                  meta={meta}
                  blockKey={blockKey}
                  indKey={ind.key}
                  unidade={ind.unidade}
                />
                {semanas.map((s) => {
                  const group =
                    s.indicadores[blockKey] as Record<string, IndicadorCell>;
                  return (
                    <WeekCell
                      key={s.semana}
                      cell={group?.[ind.key]}
                      unidade={ind.unidade}
                    />
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  MAIN PAGE                                                          */
/* ------------------------------------------------------------------ */

export default function PainelCFOPage() {
  const [mesAtual, setMesAtual] = useState<Date>(() => new Date());
  const [data, setData] = useState<PainelData | null>(null);
  const [inputs, setInputs] = useState<InputSemana[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingWeek, setEditingWeek] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Partial<InputSemana>>({});
  const [savingInput, setSavingInput] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const mk = mesKey(mesAtual);
    try {
      const [painelRes, inputsRes] = await Promise.all([
        fetch(`/api/analytics/cfo-painel?mes=${mk}`),
        fetch(`/api/analytics/cfo-inputs?mes=${mk}-01`),
      ]);
      const painelJson = await painelRes.json();
      const inputsJson = await inputsRes.json();
      if (painelJson.ok) setData(painelJson);
      if (Array.isArray(inputsJson)) setInputs(inputsJson);
      else if (inputsJson.data && Array.isArray(inputsJson.data))
        setInputs(inputsJson.data);
      else setInputs([]);
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  }, [mesAtual]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const navMonth = (delta: number) => {
    setMesAtual((prev) => {
      const d = new Date(prev);
      d.setMonth(d.getMonth() + delta);
      return d;
    });
  };

  /* Executive summary computations */
  const receitaAcumulada =
    data?.semanas.reduce(
      (sum, s) => sum + (s.indicadores.receita?.receita_liquida?.realizado ?? 0),
      0
    ) ?? 0;

  const investAcumulado =
    data?.semanas.reduce(
      (sum, s) =>
        sum + (s.indicadores.aquisicao?.investimento?.realizado ?? 0),
      0
    ) ?? 0;

  const roasMedio =
    investAcumulado > 0 ? receitaAcumulada / investAcumulado : 0;

  const allStatuses: string[] = [];
  if (data) {
    for (const s of data.semanas) {
      for (const bk of Object.keys(INDICADORES_CONFIG) as BlockKey[]) {
        const group = s.indicadores[bk] as Record<string, IndicadorCell>;
        if (!group) continue;
        for (const ind of INDICADORES_CONFIG[bk]) {
          if (group[ind.key]) allStatuses.push(group[ind.key].status);
        }
      }
    }
  }
  const countCritico = allStatuses.filter((s) => s === "CRITICO").length;
  const countAtencao = allStatuses.filter((s) => s === "ATENCAO").length;
  const countOk = allStatuses.filter((s) => s === "NO_RITMO").length;

  const metaReceitaPct =
    data?.meta?.meta_receita_liquida && data.meta.meta_receita_liquida > 0
      ? (receitaAcumulada / data.meta.meta_receita_liquida) * 100
      : 0;

  const metaInvestPct =
    data?.meta?.invest_total && data.meta.invest_total > 0
      ? (investAcumulado / data.meta.invest_total) * 100
      : 0;

  /* Manual inputs helpers */
  const startEdit = (semana: number) => {
    const existing = inputs.find((i) => i.semana === semana);
    setEditForm(
      existing
        ? { ...existing }
        : {
            semana,
            cmv_pct: null,
            eficiencia_pct: null,
            lucro_liquido: null,
            ebitda_pct: null,
            notas: null,
          }
    );
    setEditingWeek(semana);
  };

  const cancelEdit = () => {
    setEditingWeek(null);
    setEditForm({});
  };

  const saveInput = async () => {
    if (editingWeek == null) return;
    setSavingInput(true);
    try {
      const mk = mesKey(mesAtual);
      await fetch("/api/analytics/cfo-inputs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...editForm, mes: `${mk}-01` }),
      });
      await fetchData();
      setEditingWeek(null);
      setEditForm({});
    } catch {
      /* silent */
    } finally {
      setSavingInput(false);
    }
  };

  return (
    <Shell>
      <PageHeader
        titulo="Painel CFO"
        subtitulo="Governanca financeira semanal"
      />

      <div className="space-y-6 pb-12">
        {/* ---- Month Nav ---- */}
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={() => navMonth(-1)}
            className="p-2 rounded-lg hover:bg-gray-100 transition text-gray-600"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
          <h2 className="text-xl font-bold text-gray-900 min-w-[200px] text-center">
            {mesLabel(mesAtual)}
          </h2>
          <button
            onClick={() => navMonth(1)}
            className="p-2 rounded-lg hover:bg-gray-100 transition text-gray-600"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 5l7 7-7 7"
              />
            </svg>
          </button>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 border-4 border-gray-200 border-t-emerald-500 rounded-full animate-spin" />
          </div>
        )}

        {!loading && data && (
          <Fragment>
            {/* ---- Executive Summary ---- */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Receita Acumulada */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                <div className="flex items-start justify-between">
                  <DollarSign className="h-5 w-5 text-emerald-500" />
                  <span className="text-xs text-gray-400 uppercase font-semibold">
                    Receita Acumulada
                  </span>
                </div>
                <p className="text-2xl font-bold text-gray-900 mt-3 font-mono">
                  {fmtCurrency(receitaAcumulada, true)}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {fmtPct(metaReceitaPct)} da meta mensal
                </p>
                <ProgressBar pct={metaReceitaPct} />
              </div>

              {/* Investimento Acumulado */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                <div className="flex items-start justify-between">
                  <Truck className="h-5 w-5 text-blue-500" />
                  <span className="text-xs text-gray-400 uppercase font-semibold">
                    Investimento Acumulado
                  </span>
                </div>
                <p className="text-2xl font-bold text-gray-900 mt-3 font-mono">
                  {fmtCurrency(investAcumulado, true)}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {fmtPct(metaInvestPct)} do orcamento
                </p>
                <ProgressBar pct={metaInvestPct} />
              </div>

              {/* ROAS Medio */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                <div className="flex items-start justify-between">
                  <TrendingUp className="h-5 w-5 text-violet-500" />
                  <span className="text-xs text-gray-400 uppercase font-semibold">
                    ROAS Medio
                  </span>
                </div>
                <p className="text-2xl font-bold text-gray-900 mt-3 font-mono">
                  {fmtRoi(roasMedio)}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Meta: {fmtRoi(data.meta?.roas_exigido ?? null)}
                </p>
                <ProgressBar
                  pct={
                    data.meta?.roas_exigido
                      ? (roasMedio / data.meta.roas_exigido) * 100
                      : 0
                  }
                />
              </div>

              {/* Status Geral */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                <div className="flex items-start justify-between">
                  <ShieldCheck className="h-5 w-5 text-gray-500" />
                  <span className="text-xs text-gray-400 uppercase font-semibold">
                    Status Geral
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-3">
                  <div className="flex items-center gap-1">
                    <span className="inline-block h-3 w-3 rounded-full bg-red-500" />
                    <span className="text-lg font-bold font-mono text-gray-900">
                      {countCritico}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="inline-block h-3 w-3 rounded-full bg-amber-500" />
                    <span className="text-lg font-bold font-mono text-gray-900">
                      {countAtencao}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="inline-block h-3 w-3 rounded-full bg-emerald-500" />
                    <span className="text-lg font-bold font-mono text-gray-900">
                      {countOk}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  {allStatuses.length} indicadores avaliados
                </p>
                <ProgressBar
                  pct={
                    allStatuses.length > 0
                      ? (countOk / allStatuses.length) * 100
                      : 0
                  }
                />
              </div>
            </div>

            {/* ---- Block Cards ---- */}
            <div className="space-y-6">
              {(Object.keys(INDICADORES_CONFIG) as BlockKey[]).map(
                (blockKey) => (
                  <BlockCard
                    key={blockKey}
                    blockKey={blockKey}
                    semanas={data.semanas}
                    meta={data.meta}
                  />
                )
              )}
            </div>

            {/* ---- Manual Inputs ---- */}
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-gray-900">
                Inputs Manuais
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {data.semanas.map((s) => {
                  const inp = inputs.find((i) => i.semana === s.semana);
                  const isEditing = editingWeek === s.semana;
                  const hasData =
                    inp &&
                    (inp.cmv_pct != null ||
                      inp.eficiencia_pct != null ||
                      inp.lucro_liquido != null ||
                      inp.ebitda_pct != null);

                  return (
                    <div
                      key={s.semana}
                      className={`bg-white rounded-xl border shadow-sm p-6 ${
                        hasData
                          ? "border-gray-200"
                          : "border-dashed border-gray-300"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-sm font-bold text-gray-700">
                          {semanaLabel(s)}
                        </h4>
                        {!isEditing && (
                          <button
                            onClick={() => startEdit(s.semana)}
                            className="p-1.5 rounded-lg hover:bg-gray-100 transition text-gray-400 hover:text-gray-700"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                        )}
                      </div>

                      {isEditing ? (
                        <div className="space-y-3">
                          <label className="block">
                            <span className="text-xs text-gray-500">
                              CMV %
                            </span>
                            <input
                              type="number"
                              step="0.1"
                              className="mt-1 block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                              value={editForm.cmv_pct ?? ""}
                              onChange={(e) =>
                                setEditForm((f) => ({
                                  ...f,
                                  cmv_pct: e.target.value
                                    ? Number(e.target.value)
                                    : null,
                                }))
                              }
                            />
                          </label>
                          <label className="block">
                            <span className="text-xs text-gray-500">
                              Eficiencia %
                            </span>
                            <input
                              type="number"
                              step="0.1"
                              className="mt-1 block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                              value={editForm.eficiencia_pct ?? ""}
                              onChange={(e) =>
                                setEditForm((f) => ({
                                  ...f,
                                  eficiencia_pct: e.target.value
                                    ? Number(e.target.value)
                                    : null,
                                }))
                              }
                            />
                          </label>
                          <label className="block">
                            <span className="text-xs text-gray-500">
                              Lucro Liquido (R$)
                            </span>
                            <input
                              type="number"
                              step="0.01"
                              className="mt-1 block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                              value={editForm.lucro_liquido ?? ""}
                              onChange={(e) =>
                                setEditForm((f) => ({
                                  ...f,
                                  lucro_liquido: e.target.value
                                    ? Number(e.target.value)
                                    : null,
                                }))
                              }
                            />
                          </label>
                          <label className="block">
                            <span className="text-xs text-gray-500">
                              EBITDA %
                            </span>
                            <input
                              type="number"
                              step="0.1"
                              className="mt-1 block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                              value={editForm.ebitda_pct ?? ""}
                              onChange={(e) =>
                                setEditForm((f) => ({
                                  ...f,
                                  ebitda_pct: e.target.value
                                    ? Number(e.target.value)
                                    : null,
                                }))
                              }
                            />
                          </label>
                          <label className="block">
                            <span className="text-xs text-gray-500">
                              Notas
                            </span>
                            <textarea
                              rows={2}
                              className="mt-1 block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 resize-none"
                              value={editForm.notas ?? ""}
                              onChange={(e) =>
                                setEditForm((f) => ({
                                  ...f,
                                  notas: e.target.value || null,
                                }))
                              }
                            />
                          </label>
                          <div className="flex items-center gap-2 pt-1">
                            <button
                              onClick={saveInput}
                              disabled={savingInput}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition disabled:opacity-50"
                            >
                              <Check className="h-3.5 w-3.5" />
                              Salvar
                            </button>
                            <button
                              onClick={cancelEdit}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600 text-xs font-semibold hover:bg-gray-200 transition"
                            >
                              <X className="h-3.5 w-3.5" />
                              Cancelar
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-500">CMV %</span>
                            <span className="font-mono font-medium text-gray-900">
                              {inp?.cmv_pct != null
                                ? fmtPct(inp.cmv_pct)
                                : "—"}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Eficiencia %</span>
                            <span className="font-mono font-medium text-gray-900">
                              {inp?.eficiencia_pct != null
                                ? fmtPct(inp.eficiencia_pct)
                                : "—"}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Lucro Liq.</span>
                            <span className="font-mono font-medium text-gray-900">
                              {inp?.lucro_liquido != null
                                ? fmtCurrency(inp.lucro_liquido, true)
                                : "—"}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">EBITDA %</span>
                            <span className="font-mono font-medium text-gray-900">
                              {inp?.ebitda_pct != null
                                ? fmtPct(inp.ebitda_pct)
                                : "—"}
                            </span>
                          </div>
                          {inp?.notas && (
                            <p className="text-xs text-gray-400 pt-1 border-t border-gray-100">
                              {inp.notas}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ---- Legend ---- */}
            {data.legenda && (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                <h3 className="text-sm font-bold text-gray-700 mb-3">
                  Legenda
                </h3>
                <div className="flex flex-wrap gap-6">
                  {Object.entries(data.legenda).map(([key, desc]) => (
                    <div key={key} className="flex items-center gap-2">
                      <SemaforoBadge status={key} />
                      <span className="text-xs text-gray-500">{desc}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Fragment>
        )}

        {!loading && !data && (
          <div className="text-center py-20 text-gray-400">
            <AlertTriangle className="h-8 w-8 mx-auto mb-3" />
            <p className="text-sm">
              Nao foi possivel carregar os dados para este mes.
            </p>
          </div>
        )}
      </div>
    </Shell>
  );
}
