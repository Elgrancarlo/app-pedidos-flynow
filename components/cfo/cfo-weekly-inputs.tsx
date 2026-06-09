"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import type { CfoWeeklyManualInput } from "@/lib/metas";

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

type ValueCellProps = {
  label: string;
  value: string;
  muted?: boolean;
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

function formatCurrencyValue(value: number | null) {
  if (value == null || !Number.isFinite(value)) return "Não informado";

  return new Intl.NumberFormat("pt-BR", {
    currency: "BRL",
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
    style: "currency",
  }).format(value);
}

function formatPercentValue(value: number | null) {
  if (value == null || !Number.isFinite(value)) return "Não informado";

  return `${formatInputValue(value)}%`;
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
  inputMode = "decimal",
  label,
  onChange,
  placeholder,
  prefix,
  suffix,
  value,
}: {
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
        <span className="text-[10px] font-semibold uppercase text-[var(--fly-text-dim)]">
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

function ValueCell({ label, muted = false, value }: ValueCellProps) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-semibold uppercase text-[var(--fly-text-dim)] xl:sr-only">
        {label}
      </p>
      <p
        className={
          muted
            ? "mt-0.5 truncate text-sm font-medium tabular-nums text-[var(--fly-text-muted)] xl:mt-0"
            : "mt-0.5 truncate text-sm font-semibold tabular-nums text-[var(--fly-text)] xl:mt-0"
        }
      >
        {value}
      </p>
    </div>
  );
}

function StatusText({ isComplete }: { isComplete: boolean }) {
  return (
    <span
      className={
        isComplete
          ? "inline-flex items-center gap-2 text-xs font-medium text-[var(--fly-success-text)]"
          : "inline-flex items-center gap-2 text-xs font-medium text-[var(--fly-brand-strong)]"
      }
    >
      <span
        aria-hidden="true"
        className={
          isComplete
            ? "size-1.5 rounded-full bg-[var(--fly-success)]"
            : "size-1.5 rounded-full bg-[var(--fly-chart-revenue)]"
        }
      />
      {isComplete ? "Completo" : "Pendente"}
    </span>
  );
}

export function CfoWeeklyInputs({ month, weeks }: CfoWeeklyInputsProps) {
  const router = useRouter();
  const initialState = useMemo(() => buildInitialState(weeks), [weeks]);
  const [editingWeek, setEditingWeek] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<Record<number, Feedback>>({});
  const [forms, setForms] = useState(initialState);
  const [savingWeek, setSavingWeek] = useState<number | null>(null);

  useEffect(() => {
    setEditingWeek(null);
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
      setEditingWeek(null);
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
      <div className="hidden border-b border-[var(--fly-divider)] bg-[var(--fly-table-head)] px-3 py-2 text-[10px] font-semibold uppercase text-[var(--fly-text-muted)] xl:grid xl:grid-cols-[132px_104px_repeat(4,minmax(0,1fr))_minmax(150px,1.1fr)_84px] xl:items-center xl:gap-3">
        <span>Semana</span>
        <span>Status</span>
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
        const isEditing = editingWeek === week.semana;
        const hasNote = Boolean(week.notas?.trim());

        return (
          <div key={week.semana} className="border-b border-[var(--fly-divider-subtle)] last:border-b-0">
            <div className="grid gap-3 px-3 py-3 xl:grid-cols-[132px_104px_repeat(4,minmax(0,1fr))_minmax(150px,1.1fr)_84px] xl:items-center">
              <div className="flex min-w-0 items-start justify-between gap-3 xl:block">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[var(--fly-text)]">
                    {week.label}
                  </p>
                  <p className="mt-0.5 text-xs text-[var(--fly-text-muted)]">
                    {formatDate(week.inicio)} - {formatDate(week.fim)}
                  </p>
                </div>
                <div className="xl:hidden">
                  <StatusText isComplete={isComplete} />
                </div>
              </div>

              <div className="hidden xl:block">
                <StatusText isComplete={isComplete} />
              </div>

              <ValueCell
                label="Lucro líquido"
                muted={week.lucroLiquido == null}
                value={formatCurrencyValue(week.lucroLiquido)}
              />
              <ValueCell
                label="EBITDA"
                muted={week.ebitdaPct == null}
                value={formatPercentValue(week.ebitdaPct)}
              />
              <ValueCell
                label="CMV"
                muted={week.cmvPct == null}
                value={formatPercentValue(week.cmvPct)}
              />
              <ValueCell
                label="Eficiência"
                muted={week.eficienciaPct == null}
                value={formatPercentValue(week.eficienciaPct)}
              />
              <ValueCell
                label="Notas"
                muted={!hasNote}
                value={hasNote ? week.notas ?? "" : "Sem nota"}
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
                  className="inline-flex p-0 text-xs font-semibold leading-5 text-[var(--fly-brand-strong)] underline decoration-[var(--fly-brand-border)] decoration-1 underline-offset-4 outline-none transition-[color,text-decoration-color] duration-150 hover:decoration-[var(--fly-brand-strong)] focus-visible:rounded-[4px] focus-visible:ring-2 focus-visible:ring-[var(--fly-brand-ring)]"
                  onClick={() => setEditingWeek(isEditing ? null : week.semana)}
                  type="button"
                >
                  {isEditing ? "Fechar" : "Editar"}
                </button>
              </div>
            </div>

            {isEditing ? (
              <form
                className="border-t border-[var(--fly-divider-subtle)] bg-[var(--fly-row-bg)] px-3 py-3"
                onSubmit={(event) => {
                  event.preventDefault();
                  void saveWeek(week);
                }}
              >
                <div className="grid gap-2.5 md:grid-cols-2 xl:grid-cols-[repeat(4,minmax(0,1fr))_minmax(180px,1.2fr)_auto] xl:items-end">
                  <TextInput
                    label="Lucro líquido"
                    onChange={(value) =>
                      updateWeek(week.semana, { lucroLiquido: value })
                    }
                    placeholder="12500,00"
                    prefix="R$"
                    value={form.lucroLiquido}
                  />
                  <TextInput
                    label="EBITDA"
                    onChange={(value) => updateWeek(week.semana, { ebitdaPct: value })}
                    placeholder="9,4"
                    suffix="%"
                    value={form.ebitdaPct}
                  />
                  <TextInput
                    label="CMV"
                    onChange={(value) => updateWeek(week.semana, { cmvPct: value })}
                    placeholder="14"
                    suffix="%"
                    value={form.cmvPct}
                  />
                  <TextInput
                    label="Eficiência"
                    onChange={(value) =>
                      updateWeek(week.semana, { eficienciaPct: value })
                    }
                    placeholder="4,5"
                    suffix="%"
                    value={form.eficienciaPct}
                  />
                  <TextInput
                    inputMode="text"
                    label="Notas"
                    onChange={(value) => updateWeek(week.semana, { notas: value })}
                    placeholder="Observação"
                    value={form.notas}
                  />
                  <div className="flex items-center justify-end gap-3">
                    <button
                      className="inline-flex p-0 text-xs font-semibold leading-5 text-[var(--fly-text-muted)] underline decoration-[var(--fly-divider)] decoration-1 underline-offset-4 outline-none transition-colors duration-150 hover:text-[var(--fly-text-soft)] focus-visible:rounded-[4px] focus-visible:ring-2 focus-visible:ring-[var(--fly-brand-ring)]"
                      onClick={() => setEditingWeek(null)}
                      type="button"
                    >
                      Cancelar
                    </button>
                    <button
                      className="inline-flex h-8 cursor-pointer items-center justify-center rounded-[8px] border border-[var(--fly-brand-border)] bg-[var(--fly-brand-surface)] px-3 text-xs font-semibold text-[var(--fly-brand-strong)] outline-none transition-colors duration-150 hover:bg-[var(--fly-brand-surface-hover)] focus-visible:ring-2 focus-visible:ring-[var(--fly-brand-ring)] disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={isSaving}
                      type="submit"
                    >
                      {isSaving ? "Salvando..." : "Salvar"}
                    </button>
                  </div>
                </div>
              </form>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
