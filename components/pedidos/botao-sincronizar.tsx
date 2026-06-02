"use client";

import { useMemo, useState } from "react";

import {
  SystemDateRangeFilter,
  type RangeValue,
  type SystemDateRangePreset,
} from "@/components/workspace/system-date-range-filter";

interface SyncResult {
  ok: boolean;
  processados?: number;
  atualizados?: number;
  inseridos?: number;
  ignorados?: number;
  whatsappEnviados?: number;
  erros?: string[];
  erro?: string;
}

type Modo = "idle" | "loading" | "ok" | "erro";
type ImportPresetKey = "today" | "7d" | "15d" | "30d" | "month";
type ImportPreset = SystemDateRangePreset<ImportPresetKey> & {
  range: {
    startDate: string;
    endDate: string;
  };
};

function toCalendarDate(value: string) {
  return new Date(`${value}T12:00:00`);
}

function toDateString(value: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "America/Sao_Paulo",
    year: "numeric",
  }).formatToParts(value);
  const dateParts = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value])
  );

  return `${dateParts.year}-${dateParts.month}-${dateParts.day}`;
}

function shiftDate(value: Date, days: number) {
  const next = new Date(value);
  next.setDate(value.getDate() + days);
  return next;
}

function getImportPresets(): ImportPreset[] {
  const today = new Date();
  const endDate = toDateString(today);
  const rawPresets: Array<Omit<ImportPreset, "href">> = [
    {
      key: "today",
      label: "Hoje",
      displayLabel: "Hoje",
      range: { startDate: endDate, endDate },
    },
    {
      key: "7d",
      label: "7 dias",
      displayLabel: "7D",
      range: { startDate: toDateString(shiftDate(today, -6)), endDate },
    },
    {
      key: "15d",
      label: "15 dias",
      displayLabel: "15D",
      range: { startDate: toDateString(shiftDate(today, -14)), endDate },
    },
    {
      key: "30d",
      label: "30 dias",
      displayLabel: "30D",
      range: { startDate: toDateString(shiftDate(today, -29)), endDate },
    },
    {
      key: "month",
      label: "Este mês",
      displayLabel: "Mês",
      range: {
        startDate: toDateString(new Date(today.getFullYear(), today.getMonth(), 1)),
        endDate,
      },
    },
  ];

  return rawPresets;
}

function ResultadoMsg({ resultado, onDismiss }: { resultado: SyncResult; onDismiss: () => void }) {
  if (!resultado.ok) {
    return (
      <span className="text-sm text-red-600">
        {resultado.erro ?? resultado.erros?.[0] ?? "Erro desconhecido"}
        {" "}<button onClick={onDismiss} className="text-gray-400 hover:text-gray-600 ml-1">×</button>
      </span>
    );
  }
  const partes: string[] = [];
  if (resultado.inseridos != null) partes.push(`${resultado.inseridos} importado${resultado.inseridos !== 1 ? "s" : ""}`);
  if (resultado.atualizados != null) partes.push(`${resultado.atualizados} atualizado${resultado.atualizados !== 1 ? "s" : ""}`);
  if (resultado.whatsappEnviados) partes.push(`${resultado.whatsappEnviados} WhatsApp`);
  return (
    <span className="text-sm text-green-700">
      {partes.join(" · ")}
      {" "}<button onClick={onDismiss} className="text-gray-400 hover:text-gray-600 ml-1">×</button>
    </span>
  );
}

export default function BotaoSincronizar() {
  const [syncModo, setSyncModo] = useState<Modo>("idle");
  const [syncResultado, setSyncResultado] = useState<SyncResult | null>(null);

  const [importModo, setImportModo] = useState<Modo>("idle");
  const [importResultado, setImportResultado] = useState<SyncResult | null>(null);
  const [mostrarImport, setMostrarImport] = useState(false);
  const [importStart, setImportStart] = useState("");
  const [importEnd, setImportEnd] = useState("");
  const importPresets = useMemo(() => getImportPresets(), []);
  const importCalendarValue = useMemo<RangeValue | null>(() => {
    if (!importStart || !importEnd) {
      return null;
    }

    return {
      start: toCalendarDate(importStart),
      end: toCalendarDate(importEnd),
    };
  }, [importEnd, importStart]);
  const activeImportRange =
    importPresets.find(
      (preset) =>
        preset.range.startDate === importStart &&
        preset.range.endDate === importEnd
    )?.key ?? "custom";

  function applyImportRange(startDate: string, endDate: string) {
    if (startDate <= endDate) {
      setImportStart(startDate);
      setImportEnd(endDate);
      return;
    }

    setImportStart(endDate);
    setImportEnd(startDate);
  }

  function selectImportCalendarRange(value: RangeValue | null) {
    if (!value?.start || !value.end) return;

    applyImportRange(toDateString(value.start), toDateString(value.end));
  }

  async function sincronizar() {
    setSyncModo("loading");
    setSyncResultado(null);
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 60_000);
      const res = await fetch("/api/sync-h7", { method: "POST", signal: controller.signal });
      clearTimeout(timeout);
      const data = await res.json() as SyncResult;
      setSyncResultado(data);
      setSyncModo(data.ok ? "ok" : "erro");
    } catch (e) {
      const msg = e instanceof Error && e.name === "AbortError"
        ? "Tempo esgotado — tente novamente"
        : "Falha na requisição";
      setSyncModo("erro");
      setSyncResultado({ ok: false, erro: msg });
    }
  }

  async function importar() {
    if (!importStart || !importEnd) return;
    setImportModo("loading");
    setImportResultado(null);
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 300_000); // 5 min para histórico grande
      const res = await fetch("/api/import-h7", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startDate: importStart, endDate: importEnd }),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      const data = await res.json() as SyncResult;
      setImportResultado(data);
      setImportModo(data.ok ? "ok" : "erro");
      if (data.ok) setMostrarImport(false);
    } catch (e) {
      const msg = e instanceof Error && e.name === "AbortError"
        ? "Tempo esgotado — tente um período menor"
        : "Falha na requisição";
      setImportModo("erro");
      setImportResultado({ ok: false, erro: msg });
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex items-center gap-3">
        <button
          onClick={() => { setMostrarImport(!mostrarImport); setImportModo("idle"); }}
          className="text-sm text-gray-600 border border-gray-300 px-3 py-1.5 rounded-md hover:bg-gray-50 transition-colors"
        >
          Importar histórico
        </button>
        <button
          onClick={sincronizar}
          disabled={syncModo === "loading"}
          className="text-sm bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
        >
          {syncModo === "loading" ? "Sincronizando..." : "Sincronizar H7"}
        </button>
        {syncModo === "ok" && syncResultado && (
          <ResultadoMsg resultado={syncResultado} onDismiss={() => setSyncModo("idle")} />
        )}
        {syncModo === "erro" && syncResultado && (
          <ResultadoMsg resultado={syncResultado} onDismiss={() => setSyncModo("idle")} />
        )}
      </div>

      {mostrarImport && (
        <div className="flex flex-col gap-2 rounded-[14px] border border-[var(--fly-border)] bg-[var(--fly-surface-elevated)] p-2 sm:flex-row sm:items-center">
          <SystemDateRangeFilter
            activeRange={activeImportRange}
            appliedLabel={
              importStart && importEnd
                ? `Período aplicado: ${importStart} - ${importEnd}`
                : "Nenhum período selecionado"
            }
            ariaLabel="Período da importação"
            calendarValue={importCalendarValue}
            onCalendarChange={selectImportCalendarRange}
            onPresetSelect={(preset) =>
              applyImportRange(preset.range.startDate, preset.range.endDate)
            }
            presets={importPresets}
          />
          <button
            onClick={importar}
            disabled={importModo === "loading" || !importStart || !importEnd}
            className="text-sm bg-gray-700 text-white px-3 py-1.5 rounded hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {importModo === "loading" ? "Importando..." : "Importar"}
          </button>
          {importModo !== "idle" && importModo !== "loading" && importResultado && (
            <ResultadoMsg resultado={importResultado} onDismiss={() => setImportModo("idle")} />
          )}
        </div>
      )}
    </div>
  );
}
