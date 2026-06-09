"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import type { CfoManualFieldKey, CfoWeeklyManualInput } from "@/lib/metas";

const FIELD_LABELS: Record<CfoManualFieldKey, string> = {
  cmv_pct: "CMV",
  ebitda_pct: "EBITDA",
  eficiencia_pct: "Eficiência",
  lucro_liquido: "Lucro líquido",
};

type Feedback = {
  message: string;
  type: "error" | "success";
};

type WeekFormState = {
  cmvPct: string;
  ebitdaPct: string;
  eficienciaPct: string;
  lucroLiquido: string;
  notas: string;
};

type CfoWeeklyInputsProps = {
  month: string;
  weeks: CfoWeeklyManualInput[];
};

function formatDate(value: string) {
  return new Date(`${value}T12:00:00`).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
  });
}

function formatInputValue(value: number | null) {
  if (value == null || !Number.isFinite(value)) return "";

  return new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: 2,
  }).format(value);
}

function parseNumberInput(value: string) {
  const trimmed = value.replace(/[%R$\s]/g, "").trim();
  if (!trimmed) return null;

  const normalized = trimmed.includes(",")
    ? trimmed.replace(/\./g, "").replace(",", ".")
    : trimmed;
  const parsed = Number(normalized);

  return Number.isFinite(parsed) ? parsed : null;
}

function buildInitialState(weeks: CfoWeeklyManualInput[]) {
  return weeks.reduce<Record<number, WeekFormState>>((acc, week) => {
    acc[week.semana] = {
      cmvPct: formatInputValue(week.cmvPct),
      ebitdaPct: formatInputValue(week.ebitdaPct),
      eficienciaPct: formatInputValue(week.eficienciaPct),
      lucroLiquido: formatInputValue(week.lucroLiquido),
      notas: week.notas ?? "",
    };

    return acc;
  }, {});
}

function TextInput({
  hideLabelOnDesktop = false,
  inputMode = "decimal",
  label,
  onChange,
  placeholder,
  prefix,
  suffix,
  value,
}: {
  hideLabelOnDesktop?: boolean;
  inputMode?: "decimal" | "text";
  label: string;
  onChange: (value: string) => void;
  placeholder?: string;
  prefix?: string;
  suffix?: string;
  value: string;
}) {
  return (
    <label className="min-w-0 rounded-[8px] border border-[var(--fly-border-subtle)] bg-[var(--fly-control)] px-2.5 py-1.5 transition-colors duration-150 hover:border-[var(--fly-border)] hover:bg-[var(--fly-control-hover)] focus-within:border-[var(--fly-brand-border)] focus-within:ring-2 focus-within:ring-[var(--fly-brand-ring)]">
      <span className="flex items-center justify-between gap-2">
        <span
          className={
            hideLabelOnDesktop
              ? "text-[10px] font-semibold uppercase text-[var(--fly-text-dim)] xl:sr-only"
              : "text-[10px] font-semibold uppercase text-[var(--fly-text-dim)]"
          }
        >
          {label}
        </span>
        {suffix ? (
          <span className="text-[10px] font-semibold text-[var(--fly-text-dim)]">
            {suffix}
          </span>
        ) : null}
      </span>
      <span className="mt-0.5 flex min-w-0 items-center gap-1.5">
        {prefix ? (
          <span className="shrink-0 text-xs font-semibold text-[var(--fly-text-muted)]">
            {prefix}
          </span>
        ) : null}
        <input
          inputMode={inputMode}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          value={value}
          className="h-6 min-w-0 flex-1 bg-transparent text-[13px] font-semibold tabular-nums text-[var(--fly-text)] outline-none placeholder:text-[var(--fly-text-dim)]"
        />
      </span>
    </label>
  );
}

function formatMissingFields(fields: CfoManualFieldKey[]) {
  if (fields.length === 0) return "Completo";

  return fields.map((field) => FIELD_LABELS[field]).join(", ");
}

export function CfoWeeklyInputs({ month, weeks }: CfoWeeklyInputsProps) {
  const router = useRouter();
  const initialState = useMemo(() => buildInitialState(weeks), [weeks]);
  const [feedback, setFeedback] = useState<Record<number, Feedback>>({});
  const [forms, setForms] = useState(initialState);
  const [savingWeek, setSavingWeek] = useState<number | null>(null);

  useEffect(() => {
    setForms(initialState);
    setFeedback({});
    setSavingWeek(null);
  }, [initialState]);

  function updateWeek(weekNumber: number, patch: Partial<WeekFormState>) {
    setForms((current) => ({
      ...current,
      [weekNumber]: {
        ...current[weekNumber],
        ...patch,
      },
    }));
  }

  async function saveWeek(week: CfoWeeklyManualInput) {
    const form = forms[week.semana];
    if (!form) return;

    setSavingWeek(week.semana);
    setFeedback((current) => {
      const next = { ...current };
      delete next[week.semana];
      return next;
    });

    try {
      const response = await fetch("/api/analytics/cfo-inputs", {
        body: JSON.stringify({
          cmv_pct: parseNumberInput(form.cmvPct),
          ebitda_pct: parseNumberInput(form.ebitdaPct),
          eficiencia_pct: parseNumberInput(form.eficienciaPct),
          lucro_liquido: parseNumberInput(form.lucroLiquido),
          mes: month,
          notas: form.notas.trim() || null,
          semana: week.semana,
          semana_fim: week.fim,
          semana_inicio: week.inicio,
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const payload = (await response.json().catch(() => null)) as
        | { erro?: string; ok?: boolean }
        | null;

      if (!response.ok || payload?.ok === false) {
        throw new Error(payload?.erro ?? "Não foi possível salvar a semana.");
      }

      setFeedback((current) => ({
        ...current,
        [week.semana]: {
          message: "Semana salva.",
          type: "success",
        },
      }));
      router.refresh();
    } catch (error) {
      setFeedback((current) => ({
        ...current,
        [week.semana]: {
          message:
            error instanceof Error
              ? error.message
              : "Não foi possível salvar a semana.",
          type: "error",
        },
      }));
    } finally {
      setSavingWeek(null);
    }
  }

  if (weeks.length === 0) {
    return (
      <div className="rounded-[8px] border border-[var(--fly-border-subtle)] bg-[var(--fly-row-bg)] px-3 py-8 text-center">
        <p className="text-sm font-medium text-[var(--fly-text)]">
          Nenhuma semana disponível para preenchimento.
        </p>
        <p className="mt-1 text-xs text-[var(--fly-text-muted)]">
          Cadastre a meta mensal para liberar os inputs semanais do CFO.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-[8px] border border-[var(--fly-border)] bg-[var(--fly-surface)]">
      <div className="hidden border-b border-[var(--fly-divider)] bg-[var(--fly-table-head)] px-3 py-2 text-[10px] font-semibold uppercase text-[var(--fly-text-muted)] xl:grid xl:grid-cols-[132px_repeat(4,minmax(0,1fr))_minmax(150px,1.1fr)_84px] xl:items-center xl:gap-2">
        <span>Semana</span>
        <span>Lucro</span>
        <span>EBITDA</span>
        <span>CMV</span>
        <span>Eficiência</span>
        <span>Notas</span>
        <span className="text-right">Ação</span>
      </div>
      {weeks.map((week) => {
        const form = forms[week.semana] ?? {
          cmvPct: "",
          ebitdaPct: "",
          eficienciaPct: "",
          lucroLiquido: "",
          notas: "",
        };
        const weekFeedback = feedback[week.semana];
        const isSaving = savingWeek === week.semana;
        const isComplete = week.missingFields.length === 0;

        return (
          <form
            key={week.semana}
            className="border-b border-[var(--fly-divider-subtle)] px-3 py-2.5 last:border-b-0"
            onSubmit={(event) => {
              event.preventDefault();
              void saveWeek(week);
            }}
          >
            <div className="grid gap-2 xl:grid-cols-[132px_repeat(4,minmax(0,1fr))_minmax(150px,1.1fr)_84px] xl:items-center">
              <div className="flex min-w-0 items-start justify-between gap-3 xl:block">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[var(--fly-text)]">
                    {week.label}
                  </p>
                  <p className="mt-0.5 text-xs text-[var(--fly-text-muted)]">
                    {formatDate(week.inicio)} - {formatDate(week.fim)}
                  </p>
                </div>
                <p
                  className={
                    isComplete
                      ? "shrink-0 text-xs font-medium text-[var(--fly-success-text)] xl:mt-1 xl:truncate"
                      : "shrink-0 text-xs font-medium text-[var(--fly-warning-text)] xl:mt-1 xl:truncate"
                  }
                >
                  {isComplete ? "Completo" : formatMissingFields(week.missingFields)}
                </p>
              </div>
              <TextInput
                hideLabelOnDesktop
                label="Lucro líquido"
                onChange={(value) => updateWeek(week.semana, { lucroLiquido: value })}
                placeholder="12500,00"
                prefix="R$"
                value={form.lucroLiquido}
              />
              <TextInput
                hideLabelOnDesktop
                label="EBITDA %"
                onChange={(value) => updateWeek(week.semana, { ebitdaPct: value })}
                placeholder="9,4"
                suffix="%"
                value={form.ebitdaPct}
              />
              <TextInput
                hideLabelOnDesktop
                label="CMV %"
                onChange={(value) => updateWeek(week.semana, { cmvPct: value })}
                placeholder="14"
                suffix="%"
                value={form.cmvPct}
              />
              <TextInput
                hideLabelOnDesktop
                label="Eficiência %"
                onChange={(value) => updateWeek(week.semana, { eficienciaPct: value })}
                placeholder="4,5"
                suffix="%"
                value={form.eficienciaPct}
              />
              <TextInput
                hideLabelOnDesktop
                inputMode="text"
                label="Notas"
                onChange={(value) => updateWeek(week.semana, { notas: value })}
                placeholder="Observação"
                value={form.notas}
              />
              <div className="flex items-center justify-between gap-2 xl:justify-end">
                {weekFeedback ? (
                  <p
                    className={
                      weekFeedback.type === "success"
                        ? "text-xs font-medium text-[var(--fly-success-text)]"
                        : "text-xs font-medium text-[var(--fly-danger-strong)]"
                    }
                  >
                    {weekFeedback.message}
                  </p>
                ) : null}
                <button
                  className="inline-flex h-8 w-full cursor-pointer items-center justify-center rounded-[8px] border border-[var(--fly-brand-border)] bg-[var(--fly-brand-surface)] px-3 text-xs font-semibold text-[var(--fly-brand-strong)] outline-none transition-colors duration-150 hover:bg-[var(--fly-brand-surface-hover)] focus-visible:ring-2 focus-visible:ring-[var(--fly-brand-ring)] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto xl:w-[76px]"
                  disabled={isSaving}
                  type="submit"
                >
                  {isSaving ? "Salvando..." : "Salvar"}
                </button>
              </div>
            </div>
          </form>
        );
      })}
    </div>
  );
}
