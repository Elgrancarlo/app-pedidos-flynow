"use client";


import { Fragment, useEffect, useState, useCallback } from "react";
import Shell from "@/components/shell";
import PageHeader from "@/components/page-header";

interface IndicadorCell {
  previsto: number | null;
  realizado: number | null;
  pct: number | null;
  status: string;
}

interface SemanaIndicadores {
  receita: Record<string, IndicadorCell>;
  aquisicao: Record<string, IndicadorCell>;
  perdas: Record<string, IndicadorCell>;
  custos: Record<string, IndicadorCell>;
  resultado: Record<string, IndicadorCell>;
}

interface SemanaData {
  semana: number;
  inicio: string;
  fim: string;
  notas: string | null;
  indicadores: SemanaIndicadores;
}

interface PainelData {
  ok: boolean;
  mes: string;
  meta: Record<string, unknown>;
  semanas: SemanaData[];
  legenda: Record<string, string>;
}

interface InputRow {
  id?: number;
  mes: string;
  semana: number;
  semana_inicio: string;
  semana_fim: string;
  cmv_pct: number | null;
  eficiencia_pct: number | null;
  lucro_liquido: number | null;
  ebitda_pct: number | null;
  notas: string | null;
}

const INDICADORES_CONFIG: Array<{
  bloco: string;
  blocoKey: keyof SemanaIndicadores;
  items: Array<{ key: string; label: string; unidade: string; inverso?: boolean }>;
}> = [
  {
    bloco: "RECEITA",
    blocoKey: "receita",
    items: [
      { key: "receita_liquida", label: "Receita Líquida Total", unidade: "R$" },
      { key: "pct_front", label: "% Receita Front", unidade: "%" },
      { key: "pct_backend", label: "% Receita Backend/Upsell", unidade: "%" },
      { key: "pct_recuperada", label: "% Receita Recuperada", unidade: "%" },
      { key: "clientes", label: "Quantidade de Clientes", unidade: "Qtd" },
      { key: "ticket_medio", label: "Ticket Médio", unidade: "R$" },
    ],
  },
  {
    bloco: "AQUISIÇÃO",
    blocoKey: "aquisicao",
    items: [
      { key: "investimento", label: "Investimento em Tráfego", unidade: "R$" },
      { key: "roas", label: "ROAS", unidade: "ROI" },
      { key: "roi_consolidado", label: "ROI Consolidado", unidade: "ROI" },
      { key: "cpa", label: "CPA Médio", unidade: "R$" },
    ],
  },
  {
    bloco: "PERDAS",
    blocoKey: "perdas",
    items: [
      { key: "pct_chargeback", label: "% Chargeback", unidade: "%", inverso: true },
      { key: "pct_reembolso", label: "% Reembolso", unidade: "%", inverso: true },
    ],
  },
  {
    bloco: "CUSTOS",
    blocoKey: "custos",
    items: [
      { key: "cmv", label: "CMV (% sobre faturamento)", unidade: "%", inverso: true },
      { key: "eficiencia", label: "Eficiência Operacional", unidade: "%", inverso: true },
    ],
  },
  {
    bloco: "RESULTADO",
    blocoKey: "resultado",
    items: [
      { key: "lucro_liquido", label: "LUCRO LÍQUIDO", unidade: "R$" },
      { key: "ebitda_pct", label: "EBITDA Projetado %", unidade: "%" },
    ],
  },
];

const STATUS_STYLES: Record<string, { bg: string; text: string; dot: string; label: string }> = {
  NO_RITMO: { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500", label: "NO RITMO" },
  ATENCAO:  { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-500", label: "ATENÇÃO" },
  CRITICO:  { bg: "bg-red-50", text: "text-red-700", dot: "bg-red-500", label: "CRÍTICO" },
  "—":      { bg: "bg-gray-50", text: "text-gray-400", dot: "bg-gray-300", label: "—" },
};

function getCurrentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function mesLabel(mes: string) {
  const [y, m] = mes.split("-");
  const meses = ["", "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
  return `${meses[parseInt(m)]}/${y}`;
}

function fmtValor(valor: number | null, unidade: string): string {
  if (valor == null) return "—";
  if (unidade === "R$") {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", notation: "compact", maximumFractionDigits: 1 }).format(valor);
  }
  if (unidade === "ROI") return `${valor.toFixed(2)}x`;
  if (unidade === "%") return `${valor.toFixed(1)}%`;
  if (unidade === "Qtd") return new Intl.NumberFormat("pt-BR").format(valor);
  return String(valor);
}

function fmtSemanaRange(inicio: string, fim: string) {
  const [, , di] = inicio.split("-");
  const [, , df] = fim.split("-");
  return `De ${parseInt(di)} a ${parseInt(df)}`;
}

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_STYLES[status] ?? STATUS_STYLES["—"];
  return (
    <span className={`inline-flex items-center gap-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-full ${s.bg} ${s.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
}

// Manual input fields for custos/resultado
const MANUAL_FIELDS: Record<string, { dbField: string; label: string }> = {
  "custos.cmv": { dbField: "cmv_pct", label: "CMV %" },
  "custos.eficiencia": { dbField: "eficiencia_pct", label: "Eficiência %" },
  "resultado.lucro_liquido": { dbField: "lucro_liquido", label: "Lucro R$" },
  "resultado.ebitda_pct": { dbField: "ebitda_pct", label: "EBITDA %" },
};

export default function CfoPage() {
  const [mes, setMes] = useState(getCurrentMonth());
  const [painel, setPainel] = useState<PainelData | null>(null);
  const [inputs, setInputs] = useState<InputRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingSemana, setEditingSemana] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Record<string, string>>({});
  const [savingInput, setSavingInput] = useState(false);

  const fetchPainel = useCallback(async () => {
    setLoading(true);
    const [painelRes, inputsRes] = await Promise.all([
      fetch(`/api/analytics/cfo-painel?mes=${mes}`),
      fetch(`/api/analytics/cfo-inputs?mes=${mes}-01`),
    ]);
    const painelJson = await painelRes.json();
    const inputsJson = await inputsRes.json();
    if (painelJson.ok) setPainel(painelJson);
    else setPainel(null);
    setInputs(inputsJson.ok ? inputsJson.data : []);
    setLoading(false);
  }, [mes]);

  useEffect(() => { fetchPainel(); }, [fetchPainel]);

  function openEdit(semana: number) {
    const input = inputs.find((i) => i.semana === semana);
    setEditForm({
      cmv_pct: input?.cmv_pct != null ? String(input.cmv_pct) : "",
      eficiencia_pct: input?.eficiencia_pct != null ? String(input.eficiencia_pct) : "",
      lucro_liquido: input?.lucro_liquido != null ? String(input.lucro_liquido) : "",
      ebitda_pct: input?.ebitda_pct != null ? String(input.ebitda_pct) : "",
      notas: input?.notas ?? "",
    });
    setEditingSemana(semana);
  }

  async function saveInput() {
    if (editingSemana == null) return;
    setSavingInput(true);
    const input = inputs.find((i) => i.semana === editingSemana);
    await fetch("/api/analytics/cfo-inputs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mes: mes + "-01",
        semana: editingSemana,
        semana_inicio: input?.semana_inicio ?? "",
        semana_fim: input?.semana_fim ?? "",
        cmv_pct: editForm.cmv_pct ? parseFloat(editForm.cmv_pct) : null,
        eficiencia_pct: editForm.eficiencia_pct ? parseFloat(editForm.eficiencia_pct) : null,
        lucro_liquido: editForm.lucro_liquido ? parseFloat(editForm.lucro_liquido) : null,
        ebitda_pct: editForm.ebitda_pct ? parseFloat(editForm.ebitda_pct) : null,
        notas: editForm.notas || null,
      }),
    });
    setSavingInput(false);
    setEditingSemana(null);
    fetchPainel();
  }

  const semanas = painel?.semanas ?? [];

  return (
    <Shell>
      <PageHeader
        titulo="Painel CFO"
        subtitulo="Previsto vs Realizado — Visão Semanal Contínua"
      />
      <div className="px-6 pb-8 space-y-6">

        {/* Seletor de mês */}
        <div className="flex items-center gap-4">
          <input
            type="month"
            value={mes}
            onChange={(e) => setMes(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <span className="text-lg font-semibold text-gray-900">{mesLabel(mes)}</span>
          <span className="text-sm text-gray-500">Semanas no mês: {semanas.length}</span>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-400">Carregando painel...</div>
        ) : !painel ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-center">
            <p className="text-amber-900 font-medium">Meta não encontrada para {mesLabel(mes)}</p>
            <p className="text-amber-700 text-sm mt-1">Configure a meta na aba Meta antes.</p>
          </div>
        ) : (
          <>
            {/* Legenda */}
            <div className="flex items-center gap-4 text-xs">
              {Object.entries(STATUS_STYLES).map(([key, s]) => (
                <span key={key} className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${s.dot}`} />
                  <span className="text-gray-600">{s.label}</span>
                  <span className="text-gray-400">
                    {key === "NO_RITMO" && "≥ 95%"}
                    {key === "ATENCAO" && "80–95%"}
                    {key === "CRITICO" && "< 80%"}
                    {key === "—" && "sem dados"}
                  </span>
                </span>
              ))}
            </div>

            {/* GRID PRINCIPAL */}
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="sticky left-0 z-10 bg-gray-100 text-left px-3 py-2.5 font-semibold text-gray-700 min-w-[200px] border-b border-gray-200">
                      Indicador
                    </th>
                    <th className="text-left px-2 py-2.5 font-medium text-gray-500 border-b border-gray-200 min-w-[50px]">Unid.</th>
                    <th className="text-left px-2 py-2.5 font-medium text-gray-500 border-b border-gray-200 min-w-[80px]">Meta Mês</th>
                    {semanas.map((sem) => (
                      <th key={sem.semana} colSpan={4} className="text-center px-1 py-2.5 font-semibold text-gray-700 border-b border-gray-200 border-l border-gray-300 min-w-[320px]">
                        <div>SEMANA {sem.semana}</div>
                        <div className="text-[10px] font-normal text-gray-400">{fmtSemanaRange(sem.inicio, sem.fim)}</div>
                      </th>
                    ))}
                  </tr>
                  <tr className="bg-gray-50">
                    <th className="sticky left-0 z-10 bg-gray-50 border-b border-gray-200" />
                    <th className="border-b border-gray-200" />
                    <th className="border-b border-gray-200" />
                    {semanas.map((sem) => (
                      <Fragment key={`sub-${sem.semana}`}>
                        <th className="text-center px-1 py-1.5 font-medium text-gray-400 border-b border-gray-200 border-l border-gray-300">Previsto</th>
                        <th className="text-center px-1 py-1.5 font-medium text-gray-400 border-b border-gray-200">Realizado</th>
                        <th className="text-center px-1 py-1.5 font-medium text-gray-400 border-b border-gray-200">% Ating.</th>
                        <th className="text-center px-1 py-1.5 font-medium text-gray-400 border-b border-gray-200">Status</th>
                      </Fragment>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {INDICADORES_CONFIG.map((bloco) => (
                    <Fragment key={bloco.bloco}>
                      {/* Bloco header */}
                      <tr>
                        <td colSpan={3 + semanas.length * 4} className="bg-gray-800 text-white text-[11px] font-bold uppercase tracking-wider px-3 py-2">
                          {bloco.bloco}
                        </td>
                      </tr>
                      {bloco.items.map((item) => {
                        const metaVal = painel.meta as Record<string, unknown>;
                        let metaMes: string = "—";
                        if (item.key === "receita_liquida") metaMes = fmtValor(metaVal.meta_receita_liquida as number, "R$");
                        else if (item.key === "clientes") metaMes = fmtValor(metaVal.meta_clientes as number, "Qtd");
                        else if (item.key === "ticket_medio") metaMes = fmtValor(metaVal.meta_ticket_medio as number, "R$");
                        else if (item.key === "pct_front") metaMes = `${metaVal.meta_pct_front}%`;
                        else if (item.key === "pct_backend") metaMes = `${metaVal.meta_pct_backend}%`;
                        else if (item.key === "pct_recuperada") metaMes = `${metaVal.meta_pct_recuperada}%`;
                        else if (item.key === "investimento") metaMes = fmtValor(metaVal.invest_total as number, "R$");
                        else if (item.key === "roas") metaMes = `${metaVal.roas_exigido}x`;
                        else if (item.key === "roi_consolidado") metaMes = "1,20x";
                        else if (item.key === "cpa") metaMes = fmtValor(metaVal.meta_clientes ? (metaVal.invest_total as number) / (metaVal.meta_clientes as number) : 0, "R$");
                        else if (item.key === "pct_chargeback") metaMes = `${metaVal.meta_pct_chargeback}%`;
                        else if (item.key === "pct_reembolso") metaMes = `${metaVal.meta_pct_reembolso}%`;
                        else if (item.key === "cmv") metaMes = `${metaVal.meta_pct_cmv}%`;
                        else if (item.key === "eficiencia") metaMes = `${metaVal.meta_pct_eficiencia}%`;
                        else if (item.key === "lucro_liquido") metaMes = fmtValor(metaVal.meta_lucro_liquido as number, "R$");
                        else if (item.key === "ebitda_pct") metaMes = `${metaVal.meta_ebitda_pct}%`;

                        return (
                          <tr key={item.key} className="border-b border-gray-100 hover:bg-gray-50/50">
                            <td className="sticky left-0 z-10 bg-white px-3 py-2 font-medium text-gray-800 whitespace-nowrap">
                              {item.label}
                            </td>
                            <td className="px-2 py-2 text-gray-400">{item.unidade}</td>
                            <td className="px-2 py-2 font-semibold text-gray-700">{metaMes}</td>
                            {semanas.map((sem) => {
                              const blocoData = sem.indicadores[bloco.blocoKey] as Record<string, IndicadorCell>;
                              const cell = blocoData?.[item.key];
                              if (!cell) {
                                return (
                                  <Fragment key={`${sem.semana}-${item.key}`}>
                                    <td className="text-center px-1 py-2 text-gray-300 border-l border-gray-200">—</td>
                                    <td className="text-center px-1 py-2 text-gray-300">—</td>
                                    <td className="text-center px-1 py-2 text-gray-300">—</td>
                                    <td className="text-center px-1 py-2"><StatusBadge status="—" /></td>
                                  </Fragment>
                                );
                              }
                              return (
                                <Fragment key={`${sem.semana}-${item.key}`}>
                                  <td className="text-center px-1 py-2 text-gray-500 border-l border-gray-200 whitespace-nowrap">
                                    {fmtValor(cell.previsto, item.unidade)}
                                  </td>
                                  <td className="text-center px-1 py-2 font-semibold text-gray-900 whitespace-nowrap">
                                    {fmtValor(cell.realizado, item.unidade)}
                                  </td>
                                  <td className="text-center px-1 py-2 text-gray-600 whitespace-nowrap">
                                    {cell.pct != null ? `${cell.pct}%` : "—"}
                                  </td>
                                  <td className="text-center px-1 py-2">
                                    <StatusBadge status={cell.status} />
                                  </td>
                                </Fragment>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>

            {/* INPUTS MANUAIS POR SEMANA */}
            <section className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-base font-semibold text-gray-900 mb-4">Inputs Manuais (CMV, Eficiência, Lucro, EBITDA)</h2>
              <p className="text-xs text-gray-500 mb-4">Esses indicadores não vêm de APIs — preencha manualmente para cada semana.</p>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {semanas.map((sem) => {
                  const input = inputs.find((i) => i.semana === sem.semana);
                  const isEditing = editingSemana === sem.semana;
                  return (
                    <div key={sem.semana} className={`rounded-lg border p-4 ${isEditing ? "border-indigo-400 bg-indigo-50/50" : "border-gray-200"}`}>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-semibold text-gray-900">S{sem.semana}</span>
                        <span className="text-[10px] text-gray-400">{fmtSemanaRange(sem.inicio, sem.fim)}</span>
                      </div>
                      {isEditing ? (
                        <div className="space-y-2">
                          {Object.entries(MANUAL_FIELDS).map(([, { dbField, label }]) => (
                            <div key={dbField}>
                              <label className="block text-[10px] text-gray-500 mb-0.5">{label}</label>
                              <input
                                type="number"
                                step="any"
                                value={editForm[dbField] ?? ""}
                                onChange={(e) => setEditForm((f) => ({ ...f, [dbField]: e.target.value }))}
                                className="w-full border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                              />
                            </div>
                          ))}
                          <div>
                            <label className="block text-[10px] text-gray-500 mb-0.5">Notas</label>
                            <input
                              type="text"
                              value={editForm.notas ?? ""}
                              onChange={(e) => setEditForm((f) => ({ ...f, notas: e.target.value }))}
                              className="w-full border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            />
                          </div>
                          <div className="flex gap-2 mt-2">
                            <button onClick={saveInput} disabled={savingInput}
                              className="text-xs bg-indigo-600 text-white px-3 py-1 rounded hover:bg-indigo-700 disabled:opacity-50">
                              {savingInput ? "..." : "Salvar"}
                            </button>
                            <button onClick={() => setEditingSemana(null)}
                              className="text-xs text-gray-500 px-3 py-1 rounded hover:bg-gray-100">
                              Cancelar
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-1.5">
                          <div className="flex justify-between text-xs">
                            <span className="text-gray-500">CMV</span>
                            <span className="font-medium text-gray-800">{input?.cmv_pct != null ? `${input.cmv_pct}%` : "—"}</span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-gray-500">Eficiência</span>
                            <span className="font-medium text-gray-800">{input?.eficiencia_pct != null ? `${input.eficiencia_pct}%` : "—"}</span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-gray-500">Lucro</span>
                            <span className="font-medium text-gray-800">{input?.lucro_liquido != null ? `R$ ${input.lucro_liquido.toLocaleString("pt-BR")}` : "—"}</span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-gray-500">EBITDA</span>
                            <span className="font-medium text-gray-800">{input?.ebitda_pct != null ? `${input.ebitda_pct}%` : "—"}</span>
                          </div>
                          {input?.notas && <p className="text-[10px] text-gray-400 italic mt-1">{input.notas}</p>}
                          <button onClick={() => openEdit(sem.semana)}
                            className="mt-2 text-xs text-indigo-600 hover:text-indigo-800 font-medium">
                            Editar
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>

            {/* COMO LER */}
            <section className="bg-gray-50 rounded-xl border border-gray-200 p-5 text-xs text-gray-500 space-y-1">
              <p className="font-semibold text-gray-700 text-sm mb-2">Como ler este painel</p>
              <p>• Para cada indicador, você vê as semanas lado a lado — bate o olho e acompanha a evolução do mês inteiro.</p>
              <p>• Em cada semana: Previsto (vem da aba Meta) | Realizado (puxa automático do RedTrack + Payt) | % Atingido | Status.</p>
              <p>• CMV, Eficiência, Lucro e EBITDA são inputs manuais — preencha nos cards acima.</p>
              <p>• O bloco RESULTADO é consequência dos demais — sempre interpretado pela ótica dos blocos anteriores.</p>
            </section>
          </>
        )}
      </div>
    </Shell>
  );
}

