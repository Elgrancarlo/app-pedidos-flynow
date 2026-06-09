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

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="text-[11px] font-medium uppercase text-[var(--fly-text-muted)]">
      {children}
    </label>
  );
}

function TextInput({
  inputMode = "decimal",
  label,
  onChange,
  placeholder,
  value,
}: {
  inputMode?: "decimal" | "text";
  label: string;
  onChange: (value: string) => void;
  placeholder?: string;
  value: string;
}) {
  return (
    <div className="min-w-0 space-y-1.5">
      <FieldLabel>{label}</FieldLabel>
      <input
        inputMode={inputMode}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        value={value}
        className="h-10 w-full rounded-[10px] border border-[var(--fly-border)] bg-[var(--fly-control)] px-3 text-sm text-[var(--fly-text-soft)] outline-none transition-colors duration-150 placeholder:text-[var(--fly-text-dim)] hover:border-[var(--fly-border-strong)] hover:bg-[var(--fly-control-hover)] focus:border-[var(--fly-brand-border)] focus:ring-2 focus:ring-[var(--fly-brand-ring)]"
      />
    </div>
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
    <div className="space-y-3">
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
            className="rounded-[8px] border border-[var(--fly-border-subtle)] bg-[var(--fly-row-bg)] p-3 sm:p-4"
            onSubmit={(event) => {
              event.preventDefault();
              void saveWeek(week);
            }}
          >
            <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-[var(--fly-text)]">
                    {week.label}
                  </p>
                  <span className="text-xs text-[var(--fly-text-muted)]">
                    {formatDate(week.inicio)} - {formatDate(week.fim)}
                  </span>
                </div>
                <p className="mt-1 text-xs leading-5 text-[var(--fly-text-muted)]">
                  {isComplete
                    ? "Inputs necessários preenchidos."
                    : `Pendências: ${formatMissingFields(week.missingFields)}.`}
                </p>
              </div>

              <span
                className={
                  isComplete
                    ? "inline-flex w-fit rounded-[7px] border border-[var(--fly-success-border)] bg-[var(--fly-success-surface)] px-2 py-1 text-[11px] font-medium text-[var(--fly-success-text)]"
                    : "inline-flex w-fit rounded-[7px] border border-[var(--fly-warning-border)] bg-[var(--fly-warning-bg)] px-2 py-1 text-[11px] font-medium text-[var(--fly-warning-text)]"
                }
              >
                {isComplete ? "Completo" : "Pendente"}
              </span>
            </div>

            <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <TextInput
                label="Lucro líquido"
                onChange={(value) => updateWeek(week.semana, { lucroLiquido: value })}
                placeholder="Ex: 12500,00"
                value={form.lucroLiquido}
              />
              <TextInput
                label="EBITDA %"
                onChange={(value) => updateWeek(week.semana, { ebitdaPct: value })}
                placeholder="Ex: 9,4"
                value={form.ebitdaPct}
              />
              <TextInput
                label="CMV %"
                onChange={(value) => updateWeek(week.semana, { cmvPct: value })}
                placeholder="Ex: 14"
                value={form.cmvPct}
              />
              <TextInput
                label="Eficiência %"
                onChange={(value) => updateWeek(week.semana, { eficienciaPct: value })}
                placeholder="Ex: 4,5"
                value={form.eficienciaPct}
              />
            </div>

            <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
              <div className="min-w-0 space-y-1.5">
                <FieldLabel>Notas</FieldLabel>
                <textarea
                  onChange={(event) =>
                    updateWeek(week.semana, { notas: event.target.value })
                  }
                  placeholder="Contexto do fechamento, exceções ou observações."
                  value={form.notas}
                  className="min-h-[74px] w-full resize-y rounded-[10px] border border-[var(--fly-border)] bg-[var(--fly-control)] px-3 py-2.5 text-sm text-[var(--fly-text-soft)] outline-none transition-colors duration-150 placeholder:text-[var(--fly-text-dim)] hover:border-[var(--fly-border-strong)] hover:bg-[var(--fly-control-hover)] focus:border-[var(--fly-brand-border)] focus:ring-2 focus:ring-[var(--fly-brand-ring)]"
                />
              </div>

              <div className="flex flex-col items-stretch gap-2 sm:items-end">
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
                  className="inline-flex h-10 w-full cursor-pointer items-center justify-center rounded-[8px] border border-[var(--fly-brand-border)] bg-[var(--fly-brand)] px-4 text-xs font-semibold text-[var(--fly-on-brand)] shadow-[0_10px_24px_rgba(214,168,79,0.12)] outline-none transition-colors duration-150 hover:bg-[var(--fly-brand-strong)] focus-visible:ring-2 focus-visible:ring-[var(--fly-brand-ring)] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                  disabled={isSaving}
                  type="submit"
                >
                  {isSaving ? "Salvando..." : "Salvar semana"}
                </button>
              </div>
            </div>
          </form>
        );
      })}
    </div>
  );
}
