"use client";

import { useEffect, useState, useCallback } from "react";
import Shell from "@/components/shell";
import PageHeader from "@/components/page-header";

interface MetaData {
  id?: number;
  mes: string;
  invest_facebook: number;
  invest_tiktok: number;
  invest_taboola: number;
  invest_mgid: number;
  invest_google: number;
  invest_total: number;
  receita_facebook: number;
  receita_tiktok: number;
  receita_taboola: number;
  receita_mgid: number;
  receita_google: number;
  receita_trafego_total: number;
  roas_exigido: number;
  roas_breakeven: number;
  backend_callcenter_conversoes: number;
  backend_callcenter_receita: number;
  backend_callcenter_ticket: number;
  backend_whatsapp_conversoes: number;
  backend_whatsapp_receita: number;
  backend_whatsapp_ticket: number;
  backend_sms_conversoes: number;
  backend_sms_receita: number;
  backend_sms_ticket: number;
  backend_email_conversoes: number;
  backend_email_receita: number;
  backend_email_ticket: number;
  meta_receita_liquida: number;
  meta_clientes: number;
  meta_ticket_medio: number;
  meta_pct_front: number;
  meta_pct_backend: number;
  meta_pct_recuperada: number;
  meta_pct_chargeback: number;
  meta_pct_reembolso: number;
  meta_pct_cmv: number;
  meta_pct_eficiencia: number;
  meta_lucro_liquido: number;
  meta_ebitda_pct: number;
  qtd_semanas: number;
}

const CANAIS_TRAFEGO = [
  { key: "facebook", label: "Facebook" },
  { key: "tiktok", label: "TikTok" },
  { key: "taboola", label: "Taboola" },
  { key: "mgid", label: "MGID" },
  { key: "google", label: "Google RP" },
] as const;

const CANAIS_BACKEND = [
  { key: "callcenter", label: "Call Center (PayT)" },
  { key: "whatsapp", label: "WhatsApp" },
  { key: "sms", label: "SMS" },
  { key: "email", label: "Email" },
] as const;

const SENSIBILIDADE_ROAS = [1.20, 1.25, 1.30, 1.31, 1.35, 1.40, 1.45, 1.50, 1.55, 1.60];

function fmt(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}

function fmtCompact(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", notation: "compact", maximumFractionDigits: 1 }).format(v);
}

function getCurrentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function mesLabel(mes: string) {
  const [y, m] = mes.split("-");
  const meses = ["", "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
  return `${meses[parseInt(m)]}/${y}`;
}

const EMPTY_META: MetaData = {
  mes: "", invest_facebook: 0, invest_tiktok: 0, invest_taboola: 0, invest_mgid: 0, invest_google: 0, invest_total: 0,
  receita_facebook: 0, receita_tiktok: 0, receita_taboola: 0, receita_mgid: 0, receita_google: 0, receita_trafego_total: 0,
  roas_exigido: 1.40, roas_breakeven: 1.31,
  backend_callcenter_conversoes: 0, backend_callcenter_receita: 0, backend_callcenter_ticket: 0,
  backend_whatsapp_conversoes: 0, backend_whatsapp_receita: 0, backend_whatsapp_ticket: 0,
  backend_sms_conversoes: 0, backend_sms_receita: 0, backend_sms_ticket: 0,
  backend_email_conversoes: 0, backend_email_receita: 0, backend_email_ticket: 0,
  meta_receita_liquida: 0, meta_clientes: 0, meta_ticket_medio: 0,
  meta_pct_front: 75, meta_pct_backend: 15, meta_pct_recuperada: 10,
  meta_pct_chargeback: 6, meta_pct_reembolso: 2, meta_pct_cmv: 14, meta_pct_eficiencia: 4.5,
  meta_lucro_liquido: 0, meta_ebitda_pct: 9.40, qtd_semanas: 4,
};

function InputField({ label, value, onChange, prefix, suffix, small }: {
  label: string; value: number | string; onChange: (v: string) => void; prefix?: string; suffix?: string; small?: boolean;
}) {
  return (
    <div className={small ? "" : ""}>
      <label className="block text-xs text-gray-500 mb-1">{label}</label>
      <div className="flex items-center gap-1">
        {prefix && <span className="text-xs text-gray-400">{prefix}</span>}
        <input
          type="number"
          step="any"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
        />
        {suffix && <span className="text-xs text-gray-400">{suffix}</span>}
      </div>
    </div>
  );
}

export default function MetaPage() {
  const [mes, setMes] = useState(getCurrentMonth());
  const [meta, setMeta] = useState<MetaData>({ ...EMPTY_META });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const fetchMeta = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/analytics/metas?mes=${mes}-01`);
    const json = await res.json();
    if (json.ok && json.data?.length > 0) {
      setMeta(json.data[0]);
    } else {
      setMeta({ ...EMPTY_META, mes: mes + "-01" });
    }
    setLoading(false);
  }, [mes]);

  useEffect(() => { fetchMeta(); }, [fetchMeta]);

  function updateField(field: string, value: string) {
    const num = parseFloat(value) || 0;
    setMeta((prev) => ({ ...prev, [field]: num }));
    setSaved(false);
  }

  async function handleSave() {
    setSaving(true);
    const payload = { ...meta, mes: mes + "-01" };
    await fetch("/api/analytics/metas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  // Computed values
  const investTotal = CANAIS_TRAFEGO.reduce((s, c) => s + (meta[`invest_${c.key}` as keyof MetaData] as number ?? 0), 0);
  const receitaTotal = CANAIS_TRAFEGO.reduce((s, c) => s + (meta[`receita_${c.key}` as keyof MetaData] as number ?? 0), 0);
  const lucroTrafego = receitaTotal - investTotal;
  const margemTrafego = receitaTotal > 0 ? (lucroTrafego / receitaTotal) * 100 : 0;

  const backendTotal = CANAIS_BACKEND.reduce((s, c) => s + (meta[`backend_${c.key}_receita` as keyof MetaData] as number ?? 0), 0);
  const backendConversoes = CANAIS_BACKEND.reduce((s, c) => s + (meta[`backend_${c.key}_conversoes` as keyof MetaData] as number ?? 0), 0);

  const receitaTotalOperacao = receitaTotal + backendTotal;
  const lucroObjetivo = lucroTrafego + backendTotal;
  const lucroMinimo = 1000000 + backendTotal;

  // Sensibilidade Facebook
  const investFb = meta.invest_facebook ?? 0;
  const lucroOutros = CANAIS_TRAFEGO.filter((c) => c.key !== "facebook").reduce((s, c) => {
    const rec = meta[`receita_${c.key}` as keyof MetaData] as number ?? 0;
    const inv = meta[`invest_${c.key}` as keyof MetaData] as number ?? 0;
    return s + (rec - inv);
  }, 0);

  return (
    <Shell>
      <PageHeader titulo="Meta Mensal" subtitulo="Planejamento de tráfego, backend e resultado" />
      <div className="px-6 pb-8 space-y-6">

        {/* Seletor de mês + Salvar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <input
              type="month"
              value={mes}
              onChange={(e) => setMes(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <span className="text-lg font-semibold text-gray-900">{mesLabel(mes)}</span>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-indigo-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {saving ? "Salvando..." : saved ? "Salvo!" : "Salvar Meta"}
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-400">Carregando...</div>
        ) : (
          <>
            {/* HEADER */}
            <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
              <p className="text-sm font-semibold text-indigo-900">
                Tráfego {fmtCompact(receitaTotal)} | Back End {fmtCompact(backendTotal)} | Total {fmtCompact(receitaTotalOperacao)} | ROAS exigido: {meta.roas_exigido}x | Break-even lucro R$1M: ROAS {meta.roas_breakeven}x
              </p>
            </div>

            {/* INVESTIMENTO + RECEITA POR CANAL */}
            <section className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-base font-semibold text-gray-900 mb-4">Tráfego por Canal</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-left text-xs uppercase tracking-wide text-gray-400">
                      <th className="py-2 pr-4">Canal</th>
                      <th className="py-2 pr-4">Investimento (R$)</th>
                      <th className="py-2 pr-4">Receita Meta (R$)</th>
                      <th className="py-2 pr-4">ROAS</th>
                      <th className="py-2 pr-4">Lucro Tráfego</th>
                      <th className="py-2">Margem</th>
                    </tr>
                  </thead>
                  <tbody>
                    {CANAIS_TRAFEGO.map((c) => {
                      const inv = meta[`invest_${c.key}` as keyof MetaData] as number ?? 0;
                      const rec = meta[`receita_${c.key}` as keyof MetaData] as number ?? 0;
                      const roas = inv > 0 ? rec / inv : 0;
                      const lucro = rec - inv;
                      const margem = rec > 0 ? (lucro / rec) * 100 : 0;
                      return (
                        <tr key={c.key} className="border-b border-gray-50">
                          <td className="py-2 pr-4 font-medium text-gray-800">{c.label}</td>
                          <td className="py-2 pr-4">
                            <input type="number" step="any" value={meta[`invest_${c.key}` as keyof MetaData] as number} onChange={(e) => updateField(`invest_${c.key}`, e.target.value)}
                              className="w-36 border border-gray-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500" />
                          </td>
                          <td className="py-2 pr-4">
                            <input type="number" step="any" value={meta[`receita_${c.key}` as keyof MetaData] as number} onChange={(e) => updateField(`receita_${c.key}`, e.target.value)}
                              className="w-36 border border-gray-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500" />
                          </td>
                          <td className="py-2 pr-4 font-mono text-gray-700">{roas.toFixed(2)}x</td>
                          <td className="py-2 pr-4 text-gray-700">{fmt(lucro)}</td>
                          <td className="py-2 text-gray-500">{margem.toFixed(1)}%</td>
                        </tr>
                      );
                    })}
                    <tr className="border-t-2 border-gray-200 font-semibold">
                      <td className="py-2 pr-4 text-gray-900">TOTAL</td>
                      <td className="py-2 pr-4 text-gray-900">{fmt(investTotal)}</td>
                      <td className="py-2 pr-4 text-gray-900">{fmt(receitaTotal)}</td>
                      <td className="py-2 pr-4 font-mono text-gray-900">{investTotal > 0 ? (receitaTotal / investTotal).toFixed(2) : "0.00"}x</td>
                      <td className="py-2 pr-4 text-emerald-600">{fmt(lucroTrafego)}</td>
                      <td className="py-2 text-gray-600">{margemTrafego.toFixed(1)}%</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            {/* PISOS DE CONTROLE */}
            <section className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-base font-semibold text-gray-900 mb-4">Pisos de Controle</h2>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <InputField label="ROAS exigido dos gestores" value={meta.roas_exigido} onChange={(v) => updateField("roas_exigido", v)} suffix="x" />
                <InputField label="ROAS break-even (R$1M lucro)" value={meta.roas_breakeven} onChange={(v) => updateField("roas_breakeven", v)} suffix="x" />
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Margem de segurança</label>
                  <p className="text-lg font-bold text-gray-900">{(meta.roas_exigido - meta.roas_breakeven).toFixed(2)} pts</p>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Lucro se bater {meta.roas_exigido}x</label>
                  <p className="text-lg font-bold text-emerald-600">{fmt(lucroTrafego)}</p>
                </div>
              </div>
            </section>

            {/* SENSIBILIDADE FACEBOOK */}
            <section className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-base font-semibold text-gray-900 mb-4">Sensibilidade Facebook (investimento fixo {fmtCompact(investFb)})</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-left text-xs uppercase tracking-wide text-gray-400">
                      <th className="py-2 pr-4">ROAS FB</th>
                      <th className="py-2 pr-4">Receita FB</th>
                      <th className="py-2 pr-4">Lucro FB</th>
                      <th className="py-2 pr-4">Lucro Total Tráfego</th>
                      <th className="py-2 pr-4">vs R$1M mínimo</th>
                      <th className="py-2">vs Obj {meta.roas_exigido}x</th>
                    </tr>
                  </thead>
                  <tbody>
                    {SENSIBILIDADE_ROAS.map((roas) => {
                      const recFb = investFb * roas;
                      const lucroFb = recFb - investFb;
                      const lucroTotalTrafego = lucroFb + lucroOutros;
                      const vs1m = lucroTotalTrafego - 1000000;
                      const lucroObj = investFb * meta.roas_exigido - investFb + lucroOutros;
                      const vsObj = lucroTotalTrafego - lucroObj;
                      const isBreakeven = roas === meta.roas_breakeven;
                      const isMeta = roas === meta.roas_exigido;
                      return (
                        <tr key={roas} className={`border-b border-gray-50 ${isBreakeven ? "bg-amber-50" : isMeta ? "bg-emerald-50" : ""}`}>
                          <td className="py-2 pr-4 font-mono font-medium text-gray-800">
                            {roas.toFixed(2)}x{isBreakeven ? " ← break-even" : isMeta ? " ← meta" : ""}
                          </td>
                          <td className="py-2 pr-4 text-gray-700">{fmt(recFb)}</td>
                          <td className="py-2 pr-4 text-gray-700">{fmt(lucroFb)}</td>
                          <td className="py-2 pr-4 font-semibold text-gray-900">{fmt(lucroTotalTrafego)}</td>
                          <td className={`py-2 pr-4 font-semibold ${vs1m >= 0 ? "text-emerald-600" : "text-red-600"}`}>{fmt(vs1m)}</td>
                          <td className={`py-2 font-semibold ${vsObj >= 0 ? "text-emerald-600" : "text-red-600"}`}>{fmt(vsObj)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>

            {/* BACKEND */}
            <section className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-base font-semibold text-gray-900 mb-4">Back End — Meta {mesLabel(mes)}</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-left text-xs uppercase tracking-wide text-gray-400">
                      <th className="py-2 pr-4">Canal</th>
                      <th className="py-2 pr-4">Conversões</th>
                      <th className="py-2 pr-4">Receita Meta</th>
                      <th className="py-2">Ticket</th>
                    </tr>
                  </thead>
                  <tbody>
                    {CANAIS_BACKEND.map((c) => (
                      <tr key={c.key} className="border-b border-gray-50">
                        <td className="py-2 pr-4 font-medium text-gray-800">{c.label}</td>
                        <td className="py-2 pr-4">
                          <input type="number" value={meta[`backend_${c.key}_conversoes` as keyof MetaData] as number} onChange={(e) => updateField(`backend_${c.key}_conversoes`, e.target.value)}
                            className="w-24 border border-gray-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500" />
                        </td>
                        <td className="py-2 pr-4">
                          <input type="number" step="any" value={meta[`backend_${c.key}_receita` as keyof MetaData] as number} onChange={(e) => updateField(`backend_${c.key}_receita`, e.target.value)}
                            className="w-36 border border-gray-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500" />
                        </td>
                        <td className="py-2">
                          <input type="number" step="any" value={meta[`backend_${c.key}_ticket` as keyof MetaData] as number} onChange={(e) => updateField(`backend_${c.key}_ticket`, e.target.value)}
                            className="w-28 border border-gray-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500" />
                        </td>
                      </tr>
                    ))}
                    <tr className="border-t-2 border-gray-200 font-semibold">
                      <td className="py-2 pr-4 text-gray-900">TOTAL BACKEND</td>
                      <td className="py-2 pr-4 text-gray-900">{backendConversoes.toLocaleString("pt-BR")}</td>
                      <td className="py-2 pr-4 text-gray-900">{fmt(backendTotal)}</td>
                      <td className="py-2 text-gray-500">—</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            {/* METAS GERAIS */}
            <section className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-base font-semibold text-gray-900 mb-4">Metas Gerais</h2>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <InputField label="Clientes" value={meta.meta_clientes} onChange={(v) => updateField("meta_clientes", v)} />
                <InputField label="Ticket Médio" value={meta.meta_ticket_medio} onChange={(v) => updateField("meta_ticket_medio", v)} prefix="R$" />
                <InputField label="% Front" value={meta.meta_pct_front} onChange={(v) => updateField("meta_pct_front", v)} suffix="%" />
                <InputField label="% Backend" value={meta.meta_pct_backend} onChange={(v) => updateField("meta_pct_backend", v)} suffix="%" />
                <InputField label="% Recuperada" value={meta.meta_pct_recuperada} onChange={(v) => updateField("meta_pct_recuperada", v)} suffix="%" />
                <InputField label="% Chargeback" value={meta.meta_pct_chargeback} onChange={(v) => updateField("meta_pct_chargeback", v)} suffix="%" />
                <InputField label="% Reembolso" value={meta.meta_pct_reembolso} onChange={(v) => updateField("meta_pct_reembolso", v)} suffix="%" />
                <InputField label="% CMV" value={meta.meta_pct_cmv} onChange={(v) => updateField("meta_pct_cmv", v)} suffix="%" />
                <InputField label="% Eficiência Op." value={meta.meta_pct_eficiencia} onChange={(v) => updateField("meta_pct_eficiencia", v)} suffix="%" />
                <InputField label="EBITDA %" value={meta.meta_ebitda_pct} onChange={(v) => updateField("meta_ebitda_pct", v)} suffix="%" />
                <InputField label="Semanas no mês" value={meta.qtd_semanas} onChange={(v) => updateField("qtd_semanas", v)} />
              </div>
            </section>

            {/* RESULTADO FINAL */}
            <section className="bg-gradient-to-r from-indigo-50 to-emerald-50 rounded-xl border border-indigo-200 p-6">
              <h2 className="text-base font-semibold text-gray-900 mb-4">Resultado Final — Meta {mesLabel(mes)}</h2>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white rounded-lg p-4 border border-gray-200">
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Receita Tráfego</p>
                  <p className="text-xl font-bold text-gray-900 mt-1">{fmt(receitaTotal)}</p>
                </div>
                <div className="bg-white rounded-lg p-4 border border-gray-200">
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Receita Backend</p>
                  <p className="text-xl font-bold text-gray-900 mt-1">{fmt(backendTotal)}</p>
                </div>
                <div className="bg-white rounded-lg p-4 border border-emerald-200">
                  <p className="text-xs text-emerald-600 uppercase tracking-wide">Receita Total Operação</p>
                  <p className="text-xl font-bold text-emerald-700 mt-1">{fmt(receitaTotalOperacao)}</p>
                </div>
                <div className="bg-white rounded-lg p-4 border border-indigo-200">
                  <p className="text-xs text-indigo-600 uppercase tracking-wide">Lucro Objetivo</p>
                  <p className="text-xl font-bold text-indigo-700 mt-1">{fmt(lucroObjetivo)}</p>
                </div>
                <div className="bg-white rounded-lg p-4 border border-gray-200">
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Lucro Tráfego</p>
                  <p className="text-xl font-bold text-gray-900 mt-1">{fmt(lucroTrafego)}</p>
                </div>
                <div className="bg-white rounded-lg p-4 border border-amber-200">
                  <p className="text-xs text-amber-600 uppercase tracking-wide">Lucro Mínimo</p>
                  <p className="text-xl font-bold text-amber-700 mt-1">{fmt(lucroMinimo)}</p>
                </div>
              </div>
            </section>
          </>
        )}
      </div>
    </Shell>
  );
}
