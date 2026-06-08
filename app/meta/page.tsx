"use client";

import { Fragment, useEffect, useState, useCallback } from "react";
import Shell from "@/components/shell";
import PageHeader from "@/components/page-header";
import {
  Target,
  TrendingUp,
  DollarSign,
  BarChart3,
  ChevronDown,
  Save,
  Check,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface MetaData {
  mes: string;
  invest_facebook: number;
  invest_tiktok: number;
  invest_taboola: number;
  invest_mgid: number;
  invest_google: number;
  receita_facebook: number;
  receita_tiktok: number;
  receita_taboola: number;
  receita_mgid: number;
  receita_google: number;
  invest_total: number;
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

type Tab = "trafego" | "backend" | "sensibilidade" | "controles";

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const brl = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const brl2 = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const pct = (v: number) => `${v.toFixed(1)}%`;

const roasFmt = (v: number) => `${v.toFixed(2)}x`;

const numFmt = new Intl.NumberFormat("pt-BR");

function safeDiv(a: number, b: number) {
  return b === 0 ? 0 : a / b;
}

function defaultMeta(mes: string): MetaData {
  return {
    mes,
    invest_facebook: 0,
    invest_tiktok: 0,
    invest_taboola: 0,
    invest_mgid: 0,
    invest_google: 0,
    receita_facebook: 0,
    receita_tiktok: 0,
    receita_taboola: 0,
    receita_mgid: 0,
    receita_google: 0,
    invest_total: 0,
    receita_trafego_total: 0,
    roas_exigido: 1.35,
    roas_breakeven: 1.25,
    backend_callcenter_conversoes: 0,
    backend_callcenter_receita: 0,
    backend_callcenter_ticket: 0,
    backend_whatsapp_conversoes: 0,
    backend_whatsapp_receita: 0,
    backend_whatsapp_ticket: 0,
    backend_sms_conversoes: 0,
    backend_sms_receita: 0,
    backend_sms_ticket: 0,
    backend_email_conversoes: 0,
    backend_email_receita: 0,
    backend_email_ticket: 0,
    meta_receita_liquida: 0,
    meta_clientes: 0,
    meta_ticket_medio: 0,
    meta_pct_front: 0,
    meta_pct_backend: 0,
    meta_pct_recuperada: 0,
    meta_pct_chargeback: 0,
    meta_pct_reembolso: 0,
    meta_pct_cmv: 0,
    meta_pct_eficiencia: 0,
    meta_lucro_liquido: 0,
    meta_ebitda_pct: 0,
    qtd_semanas: 4,
  };
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function InputField({
  value,
  onChange,
  prefix,
  suffix,
  className = "",
}: {
  value: number;
  onChange: (v: number) => void;
  prefix?: string;
  suffix?: string;
  className?: string;
}) {
  return (
    <div className={`relative flex items-center ${className}`}>
      {prefix && (
        <span className="absolute left-3 text-xs text-gray-400 pointer-events-none">
          {prefix}
        </span>
      )}
      <input
        type="number"
        value={value || ""}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
        className={`w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono text-right focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition ${
          prefix ? "pl-8" : ""
        } ${suffix ? "pr-6" : ""}`}
      />
      {suffix && (
        <span className="absolute right-3 text-xs text-gray-400 pointer-events-none">
          {suffix}
        </span>
      )}
    </div>
  );
}

function KpiCard({
  label,
  value,
  icon,
  accent = "indigo",
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  accent?: string;
}) {
  const colors: Record<string, string> = {
    indigo: "bg-indigo-50 text-indigo-600",
    emerald: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-600",
    rose: "bg-rose-50 text-rose-600",
  };
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex items-center gap-4">
      <div
        className={`w-10 h-10 rounded-lg flex items-center justify-center ${colors[accent]}`}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide truncate">
          {label}
        </p>
        <p className="text-lg font-bold font-mono text-gray-900 truncate">
          {value}
        </p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

export default function MetaMensalPage() {
  const today = new Date();
  const initialMonth = `${today.getFullYear()}-${String(
    today.getMonth() + 1
  ).padStart(2, "0")}`;

  const [month, setMonth] = useState(initialMonth);
  const [meta, setMeta] = useState<MetaData>(
    defaultMeta(`${initialMonth}-01`)
  );
  const [tab, setTab] = useState<Tab>("trafego");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  /* ---------- fetch ---------- */
  const fetchMeta = useCallback(async (m: string) => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/analytics/metas?mes=${m}-01`
      );
      const json = await res.json();
      if (json.ok && json.data && json.data.length > 0) {
        setMeta(json.data[0]);
      } else {
        setMeta(defaultMeta(`${m}-01`));
      }
    } catch {
      setMeta(defaultMeta(`${m}-01`));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMeta(month);
  }, [month, fetchMeta]);

  /* ---------- save ---------- */
  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      await fetch("/api/analytics/metas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(meta),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {
      /* silent */
    } finally {
      setSaving(false);
    }
  };

  /* ---------- updater ---------- */
  const u = (field: keyof MetaData) => (v: number) =>
    setMeta((prev) => ({ ...prev, [field]: v }));

  /* ---------- computed ---------- */
  const channels = [
    {
      name: "Facebook",
      inv: meta.invest_facebook,
      rec: meta.receita_facebook,
      invKey: "invest_facebook" as keyof MetaData,
      recKey: "receita_facebook" as keyof MetaData,
    },
    {
      name: "TikTok",
      inv: meta.invest_tiktok,
      rec: meta.receita_tiktok,
      invKey: "invest_tiktok" as keyof MetaData,
      recKey: "receita_tiktok" as keyof MetaData,
    },
    {
      name: "Taboola",
      inv: meta.invest_taboola,
      rec: meta.receita_taboola,
      invKey: "invest_taboola" as keyof MetaData,
      recKey: "receita_taboola" as keyof MetaData,
    },
    {
      name: "MGID",
      inv: meta.invest_mgid,
      rec: meta.receita_mgid,
      invKey: "invest_mgid" as keyof MetaData,
      recKey: "receita_mgid" as keyof MetaData,
    },
    {
      name: "Google RP",
      inv: meta.invest_google,
      rec: meta.receita_google,
      invKey: "invest_google" as keyof MetaData,
      recKey: "receita_google" as keyof MetaData,
    },
  ];

  const investTotal = channels.reduce((s, c) => s + c.inv, 0);
  const receitaTrafegoTotal = channels.reduce((s, c) => s + c.rec, 0);
  const lucroTrafego = receitaTrafegoTotal - investTotal;

  const backendChannels = [
    {
      name: "Call Center (PayT)",
      convKey: "backend_callcenter_conversoes" as keyof MetaData,
      recKey: "backend_callcenter_receita" as keyof MetaData,
      ticketKey: "backend_callcenter_ticket" as keyof MetaData,
      conv: meta.backend_callcenter_conversoes,
      rec: meta.backend_callcenter_receita,
      ticket: meta.backend_callcenter_ticket,
    },
    {
      name: "WhatsApp",
      convKey: "backend_whatsapp_conversoes" as keyof MetaData,
      recKey: "backend_whatsapp_receita" as keyof MetaData,
      ticketKey: "backend_whatsapp_ticket" as keyof MetaData,
      conv: meta.backend_whatsapp_conversoes,
      rec: meta.backend_whatsapp_receita,
      ticket: meta.backend_whatsapp_ticket,
    },
    {
      name: "SMS",
      convKey: "backend_sms_conversoes" as keyof MetaData,
      recKey: "backend_sms_receita" as keyof MetaData,
      ticketKey: "backend_sms_ticket" as keyof MetaData,
      conv: meta.backend_sms_conversoes,
      rec: meta.backend_sms_receita,
      ticket: meta.backend_sms_ticket,
    },
    {
      name: "Email",
      convKey: "backend_email_conversoes" as keyof MetaData,
      recKey: "backend_email_receita" as keyof MetaData,
      ticketKey: "backend_email_ticket" as keyof MetaData,
      conv: meta.backend_email_conversoes,
      rec: meta.backend_email_receita,
      ticket: meta.backend_email_ticket,
    },
  ];

  const backendReceitaTotal = backendChannels.reduce((s, c) => s + c.rec, 0);
  const backendConvTotal = backendChannels.reduce((s, c) => s + c.conv, 0);

  const receitaTotalOp = receitaTrafegoTotal + backendReceitaTotal;
  const lucroObjetivo = meta.meta_lucro_liquido;
  const lucroMinimo = receitaTotalOp * (meta.meta_ebitda_pct / 100);
  const roasTarget = safeDiv(receitaTrafegoTotal, investTotal);

  /* ---- sensibilidade ---- */
  const roasScenarios = [1.2, 1.25, 1.3, 1.31, 1.35, 1.4, 1.45, 1.5, 1.55, 1.6];
  const fbInvest = meta.invest_facebook;
  const otherLucro = channels
    .filter((c) => c.name !== "Facebook")
    .reduce((s, c) => s + (c.rec - c.inv), 0);

  const metaLucroSeBaterMeta =
    meta.invest_facebook * meta.roas_exigido -
    meta.invest_facebook +
    otherLucro;

  const margemSeguranca = (
    (meta.roas_exigido - meta.roas_breakeven) * 100
  ).toFixed(0);

  /* ---- tabs config ---- */
  const tabs: { key: Tab; label: string }[] = [
    { key: "trafego", label: "Trafego" },
    { key: "backend", label: "Backend" },
    { key: "sensibilidade", label: "Sensibilidade" },
    { key: "controles", label: "Controles" },
  ];

  /* ---- controles fields ---- */
  const controleFields: {
    label: string;
    key: keyof MetaData;
    suffix?: string;
    prefix?: string;
  }[] = [
    { label: "Clientes", key: "meta_clientes" },
    { label: "Ticket Medio", key: "meta_ticket_medio", prefix: "R$" },
    { label: "% Front", key: "meta_pct_front", suffix: "%" },
    { label: "% Backend", key: "meta_pct_backend", suffix: "%" },
    { label: "% Recuperada", key: "meta_pct_recuperada", suffix: "%" },
    { label: "% Chargeback", key: "meta_pct_chargeback", suffix: "%" },
    { label: "% Reembolso", key: "meta_pct_reembolso", suffix: "%" },
    { label: "% CMV", key: "meta_pct_cmv", suffix: "%" },
    { label: "% Eficiencia Op.", key: "meta_pct_eficiencia", suffix: "%" },
    { label: "EBITDA %", key: "meta_ebitda_pct", suffix: "%" },
    { label: "Semanas no mes", key: "qtd_semanas" },
  ];

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */

  return (
    <Shell>
      <div className="space-y-6">
        {/* Page Header */}
        <PageHeader
          titulo="Meta Mensal"
          subtitulo="Planejamento financeiro e metas de receita por canal"
        />

        {/* Top Bar */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Mes:</label>
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            />
          </div>
          <div className="flex items-center gap-3 ml-auto">
            {saved && (
              <span className="flex items-center gap-1 text-sm text-emerald-600 font-medium animate-pulse">
                <Check size={16} />
                Salvo!
              </span>
            )}
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg px-5 py-2.5 text-sm font-medium transition shadow-sm"
            >
              <Save size={16} />
              {saving ? "Salvando..." : "Salvar Meta"}
            </button>
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="text-center py-4 text-sm text-gray-400">
            Carregando...
          </div>
        )}

        {/* KPI Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            label="Receita Total Operacao"
            value={brl.format(receitaTotalOp)}
            icon={<DollarSign size={20} />}
            accent="indigo"
          />
          <KpiCard
            label="Investimento Total"
            value={brl.format(investTotal)}
            icon={<BarChart3 size={20} />}
            accent="rose"
          />
          <KpiCard
            label="ROAS Target"
            value={roasFmt(roasTarget)}
            icon={<Target size={20} />}
            accent="amber"
          />
          <KpiCard
            label="Lucro Objetivo"
            value={brl.format(lucroObjetivo)}
            icon={<TrendingUp size={20} />}
            accent="emerald"
          />
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                tab === t.key
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ============ TAB: TRAFEGO ============ */}
        {tab === "trafego" && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-900">
                Investimento e Receita por Canal de Trafego
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <th className="px-6 py-3">Canal</th>
                    <th className="px-6 py-3">Investimento (R$)</th>
                    <th className="px-6 py-3">Receita Meta (R$)</th>
                    <th className="px-6 py-3 text-right">ROAS</th>
                    <th className="px-6 py-3 text-right">Lucro</th>
                    <th className="px-6 py-3 text-right">Margem</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {channels.map((ch) => {
                    const roas = safeDiv(ch.rec, ch.inv);
                    const lucro = ch.rec - ch.inv;
                    const margem = safeDiv(lucro, ch.rec) * 100;
                    return (
                      <tr key={ch.name} className="hover:bg-gray-50/50">
                        <td className="px-6 py-3 font-medium text-gray-900">
                          {ch.name}
                        </td>
                        <td className="px-6 py-3">
                          <InputField
                            value={ch.inv}
                            onChange={u(ch.invKey)}
                            prefix="R$"
                          />
                        </td>
                        <td className="px-6 py-3">
                          <InputField
                            value={ch.rec}
                            onChange={u(ch.recKey)}
                            prefix="R$"
                          />
                        </td>
                        <td className="px-6 py-3 text-right font-mono text-gray-700">
                          {roasFmt(roas)}
                        </td>
                        <td
                          className={`px-6 py-3 text-right font-mono font-semibold ${
                            lucro >= 0 ? "text-emerald-600" : "text-red-600"
                          }`}
                        >
                          {brl.format(lucro)}
                        </td>
                        <td
                          className={`px-6 py-3 text-right font-mono ${
                            margem >= 0 ? "text-emerald-600" : "text-red-600"
                          }`}
                        >
                          {pct(margem)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50 font-bold text-sm">
                    <td className="px-6 py-3 text-gray-900">Total</td>
                    <td className="px-6 py-3 font-mono text-gray-900">
                      {brl.format(investTotal)}
                    </td>
                    <td className="px-6 py-3 font-mono text-gray-900">
                      {brl.format(receitaTrafegoTotal)}
                    </td>
                    <td className="px-6 py-3 text-right font-mono text-gray-900">
                      {roasFmt(roasTarget)}
                    </td>
                    <td
                      className={`px-6 py-3 text-right font-mono ${
                        lucroTrafego >= 0
                          ? "text-emerald-600"
                          : "text-red-600"
                      }`}
                    >
                      {brl.format(lucroTrafego)}
                    </td>
                    <td
                      className={`px-6 py-3 text-right font-mono ${
                        safeDiv(lucroTrafego, receitaTrafegoTotal) >= 0
                          ? "text-emerald-600"
                          : "text-red-600"
                      }`}
                    >
                      {pct(safeDiv(lucroTrafego, receitaTrafegoTotal) * 100)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {/* ============ TAB: BACKEND ============ */}
        {tab === "backend" && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-900">
                Receita Backend por Canal
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <th className="px-6 py-3">Canal</th>
                    <th className="px-6 py-3">Conversoes</th>
                    <th className="px-6 py-3">Receita Meta (R$)</th>
                    <th className="px-6 py-3">Ticket</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {backendChannels.map((ch) => (
                    <tr key={ch.name} className="hover:bg-gray-50/50">
                      <td className="px-6 py-3 font-medium text-gray-900">
                        {ch.name}
                      </td>
                      <td className="px-6 py-3">
                        <InputField
                          value={ch.conv}
                          onChange={u(ch.convKey)}
                        />
                      </td>
                      <td className="px-6 py-3">
                        <InputField
                          value={ch.rec}
                          onChange={u(ch.recKey)}
                          prefix="R$"
                        />
                      </td>
                      <td className="px-6 py-3">
                        <InputField
                          value={ch.ticket}
                          onChange={u(ch.ticketKey)}
                          prefix="R$"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50 font-bold text-sm">
                    <td className="px-6 py-3 text-gray-900">Total</td>
                    <td className="px-6 py-3 font-mono text-gray-900">
                      {numFmt.format(backendConvTotal)}
                    </td>
                    <td className="px-6 py-3 font-mono text-gray-900">
                      {brl.format(backendReceitaTotal)}
                    </td>
                    <td className="px-6 py-3 font-mono text-gray-900">
                      {brl2.format(safeDiv(backendReceitaTotal, backendConvTotal))}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {/* ============ TAB: SENSIBILIDADE ============ */}
        {tab === "sensibilidade" && (
          <div className="space-y-4">
            {/* Info cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  ROAS Exigido
                </p>
                <p className="text-xl font-bold font-mono text-indigo-600 mt-1">
                  {roasFmt(meta.roas_exigido)}
                </p>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  ROAS Break-even
                </p>
                <p className="text-xl font-bold font-mono text-amber-600 mt-1">
                  {roasFmt(meta.roas_breakeven)}
                </p>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Margem de Seguranca
                </p>
                <p className="text-xl font-bold font-mono text-gray-900 mt-1">
                  {margemSeguranca} pts
                </p>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Lucro se bater meta
                </p>
                <p className="text-xl font-bold font-mono text-emerald-600 mt-1">
                  {brl.format(metaLucroSeBaterMeta)}
                </p>
              </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100">
                <h3 className="text-sm font-semibold text-gray-900">
                  Sensibilidade Facebook (investimento fixo{" "}
                  {brl.format(fbInvest)})
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <th className="px-6 py-3">ROAS FB</th>
                      <th className="px-6 py-3 text-right">Receita FB</th>
                      <th className="px-6 py-3 text-right">Lucro FB</th>
                      <th className="px-6 py-3 text-right">
                        Lucro Total Trafego
                      </th>
                      <th className="px-6 py-3 text-right">vs R$1M minimo</th>
                      <th className="px-6 py-3 text-right">vs Objetivo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {roasScenarios.map((roas) => {
                      const recFb = fbInvest * roas;
                      const lucroFb = recFb - fbInvest;
                      const lucroTotalTraf = lucroFb + otherLucro;
                      const vs1m = lucroTotalTraf - 1_000_000;
                      const vsObj = lucroTotalTraf - lucroObjetivo;

                      const isBreakeven =
                        Math.abs(roas - meta.roas_breakeven) < 0.005;
                      const isExigido =
                        Math.abs(roas - meta.roas_exigido) < 0.005;

                      let rowBg = "";
                      if (isExigido) rowBg = "bg-emerald-50";
                      else if (isBreakeven) rowBg = "bg-amber-50";

                      return (
                        <tr
                          key={roas}
                          className={`${rowBg} hover:bg-gray-50/50`}
                        >
                          <td className="px-6 py-3 font-mono font-semibold text-gray-900">
                            {roasFmt(roas)}
                          </td>
                          <td className="px-6 py-3 text-right font-mono text-gray-700">
                            {brl.format(recFb)}
                          </td>
                          <td
                            className={`px-6 py-3 text-right font-mono font-semibold ${
                              lucroFb >= 0
                                ? "text-emerald-600"
                                : "text-red-600"
                            }`}
                          >
                            {brl.format(lucroFb)}
                          </td>
                          <td
                            className={`px-6 py-3 text-right font-mono font-semibold ${
                              lucroTotalTraf >= 0
                                ? "text-emerald-600"
                                : "text-red-600"
                            }`}
                          >
                            {brl.format(lucroTotalTraf)}
                          </td>
                          <td
                            className={`px-6 py-3 text-right font-mono ${
                              vs1m >= 0 ? "text-emerald-600" : "text-red-600"
                            }`}
                          >
                            {brl.format(vs1m)}
                          </td>
                          <td
                            className={`px-6 py-3 text-right font-mono ${
                              vsObj >= 0 ? "text-emerald-600" : "text-red-600"
                            }`}
                          >
                            {brl.format(vsObj)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ============ TAB: CONTROLES ============ */}
        {tab === "controles" && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <h3 className="text-sm font-semibold text-gray-900 border-b border-gray-100 pb-3 mb-6">
              Parametros e Controles
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {controleFields.map((f) => (
                <div
                  key={f.key}
                  className="bg-gray-50 rounded-lg p-4 border border-gray-100"
                >
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                    {f.label}
                  </label>
                  <InputField
                    value={meta[f.key] as number}
                    onChange={u(f.key)}
                    prefix={f.prefix}
                    suffix={f.suffix}
                    className="bg-white"
                  />
                </div>
              ))}
              {/* ROAS fields */}
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                  ROAS Exigido
                </label>
                <InputField
                  value={meta.roas_exigido}
                  onChange={u("roas_exigido")}
                  suffix="x"
                  className="bg-white"
                />
              </div>
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                  ROAS Break-even
                </label>
                <InputField
                  value={meta.roas_breakeven}
                  onChange={u("roas_breakeven")}
                  suffix="x"
                  className="bg-white"
                />
              </div>
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                  Lucro Liquido Objetivo
                </label>
                <InputField
                  value={meta.meta_lucro_liquido}
                  onChange={u("meta_lucro_liquido")}
                  prefix="R$"
                  className="bg-white"
                />
              </div>
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                  Receita Liquida Meta
                </label>
                <InputField
                  value={meta.meta_receita_liquida}
                  onChange={u("meta_receita_liquida")}
                  prefix="R$"
                  className="bg-white"
                />
              </div>
            </div>
          </div>
        )}

        {/* ============ RESULTADO FINAL ============ */}
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-xl shadow-lg p-6">
          <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-6">
            Resultado Final
          </h3>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="bg-white/10 backdrop-blur rounded-lg p-5">
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">
                Receita Trafego
              </p>
              <p className="text-2xl font-bold font-mono text-white mt-1">
                {brl.format(receitaTrafegoTotal)}
              </p>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-lg p-5">
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">
                Receita Backend
              </p>
              <p className="text-2xl font-bold font-mono text-white mt-1">
                {brl.format(backendReceitaTotal)}
              </p>
            </div>
            <div className="bg-indigo-500/20 border border-indigo-400/30 backdrop-blur rounded-lg p-5">
              <p className="text-xs font-medium text-indigo-300 uppercase tracking-wide">
                Receita Total Operacao
              </p>
              <p className="text-2xl font-bold font-mono text-white mt-1">
                {brl.format(receitaTotalOp)}
              </p>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-lg p-5">
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">
                Lucro Trafego
              </p>
              <p
                className={`text-2xl font-bold font-mono mt-1 ${
                  lucroTrafego >= 0 ? "text-emerald-400" : "text-red-400"
                }`}
              >
                {brl.format(lucroTrafego)}
              </p>
            </div>
            <div className="bg-emerald-500/20 border border-emerald-400/30 backdrop-blur rounded-lg p-5">
              <p className="text-xs font-medium text-emerald-300 uppercase tracking-wide">
                Lucro Objetivo
              </p>
              <p className="text-2xl font-bold font-mono text-white mt-1">
                {brl.format(lucroObjetivo)}
              </p>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-lg p-5">
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">
                Lucro Minimo
              </p>
              <p className="text-2xl font-bold font-mono text-amber-400 mt-1">
                {brl.format(lucroMinimo)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </Shell>
  );
}
