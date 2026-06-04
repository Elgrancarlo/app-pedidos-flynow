"use client";

import type { CSSProperties, ReactNode } from "react";
import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Columns3,
  Copy,
  Filter,
  Inbox,
  List,
  RefreshCw,
  Search,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { DropdownMenu as RadixDropdownMenu } from "radix-ui";

import { DashboardHeader } from "@/components/layout/dashboard-header";
import {
  SystemDateRangeFilter,
  type RangeValue,
} from "@/components/workspace/system-date-range-filter";
import { cn, formatCurrency, formatPercent } from "@/lib/utils";
import {
  CARRINHO_ETAPA_LABELS,
  CARRINHO_FUNIL_LABELS,
  CARRINHO_FUNIL_PIPELINE,
  CARRINHO_ORIGEM_LABELS,
  CARRINHO_RECOVERY_CHANNEL_LABELS,
  CARRINHO_RECOVERY_STATUS_LABELS,
  CARRINHO_STATUS_LABELS,
  formatCarrinhosRange,
  getCarrinhoSearchText,
  getCarrinhosFunil,
  getCarrinhosResumo,
  getPresetCarrinhosRange,
  type Carrinho,
  type CarrinhoEtapa,
  type CarrinhoFunilEtapa,
  type CarrinhoPeriodoPreset,
  type CarrinhoStatus,
  type CarrinhosResumo,
} from "@/lib/carrinhos";

type ViewMode = "tabela" | "kanban";
type LoadStatus = "initial-loading" | "success" | "error" | "refreshing";

type CarrinhosClientViewProps = {
  carrinhos: Carrinho[];
  dataSource: "mock" | "real";
  dataWarning?: string;
  periodoInicial: {
    startDate: string;
    endDate: string;
  };
  resumoInicial: CarrinhosResumo;
  funilInicial: Record<CarrinhoFunilEtapa, number>;
  referenceDate: string;
};

type PresetOption = {
  key: CarrinhoPeriodoPreset;
  label: string;
  displayLabel: string;
};

type PaginationModel = {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
};

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;
const DETAIL_DRAWER_ANIMATION_MS = 220;
const KANBAN_COLUMN_CARD_LIMIT = 10;
const CARRINHOS_TIMEZONE = "America/Sao_Paulo";

const PERIOD_PRESETS: PresetOption[] = [
  { key: "today", label: "Hoje", displayLabel: "Hoje" },
  { key: "7d", label: "Ultimos 7 dias", displayLabel: "7D" },
  { key: "15d", label: "Ultimos 15 dias", displayLabel: "15D" },
  { key: "30d", label: "Ultimos 30 dias", displayLabel: "30D" },
  { key: "month", label: "Este mes", displayLabel: "Mes" },
];

const STATUS_FILTERS: Array<{ value: "all" | CarrinhoStatus; label: string }> = [
  { value: "all", label: "Todos os status" },
  { value: "ativo", label: CARRINHO_STATUS_LABELS.ativo },
  { value: "checkout", label: CARRINHO_STATUS_LABELS.checkout },
  { value: "abandonado", label: CARRINHO_STATUS_LABELS.abandonado },
  {
    value: "em_recuperacao",
    label: CARRINHO_STATUS_LABELS.em_recuperacao,
  },
  { value: "recuperado", label: CARRINHO_STATUS_LABELS.recuperado },
  { value: "perdido", label: CARRINHO_STATUS_LABELS.perdido },
];

const STAGE_FILTERS: Array<{ value: "all" | CarrinhoEtapa; label: string }> = [
  { value: "all", label: "Todas as etapas" },
  { value: "produto", label: CARRINHO_ETAPA_LABELS.produto },
  { value: "checkout", label: CARRINHO_ETAPA_LABELS.checkout },
  { value: "pagamento", label: CARRINHO_ETAPA_LABELS.pagamento },
  { value: "recuperacao", label: CARRINHO_ETAPA_LABELS.recuperacao },
  { value: "fechado", label: CARRINHO_ETAPA_LABELS.fechado },
];

const STATUS_BADGE_STYLES: Record<CarrinhoStatus, string> = {
  ativo: "flynow-status-badge--neutral",
  checkout: "flynow-status-badge--neutral",
  abandonado: "flynow-status-badge--warning",
  em_recuperacao: "flynow-status-badge--warning",
  recuperado: "flynow-status-badge--success",
  perdido: "flynow-status-badge--danger",
};

const STAGE_BADGE_STYLES: Record<CarrinhoEtapa, string> = {
  produto: "flynow-status-badge--neutral",
  checkout: "flynow-status-badge--neutral",
  pagamento: "flynow-status-badge--neutral",
  recuperacao: "flynow-status-badge--neutral",
  fechado: "flynow-status-badge--neutral",
};

const FUNNEL_TONES: Record<
  CarrinhoFunilEtapa,
  { dot: string; bar: string; badge: string }
> = {
  iniciado: {
    dot: "bg-[#D6A84F]",
    bar: "bg-[#D6A84F]",
    badge: "flynow-status-badge--neutral",
  },
  checkout: {
    dot: "bg-[#60A5FA]",
    bar: "bg-[#60A5FA]",
    badge: "flynow-status-badge--neutral",
  },
  abandonado: {
    dot: "bg-[#D6A84F]",
    bar: "bg-[#D6A84F]",
    badge: "flynow-status-badge--warning",
  },
  recuperado: {
    dot: "bg-[#4ADE80]",
    bar: "bg-[#4ADE80]",
    badge: "flynow-status-badge--success",
  },
  perdido: {
    dot: "bg-[#F87171]",
    bar: "bg-[#F87171]",
    badge: "flynow-status-badge--danger",
  },
};

function toCalendarDate(value: string) {
  return new Date(`${value}T12:00:00`);
}

function toCarrinhoDateString(value: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: CARRINHOS_TIMEZONE,
    year: "numeric",
  }).formatToParts(value);
  const dateParts = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value])
  );

  return `${dateParts.year}-${dateParts.month}-${dateParts.day}`;
}

function normalizeCarrinhoRange(startDate: string, endDate: string) {
  return startDate <= endDate
    ? { startDate, endDate }
    : { startDate: endDate, endDate: startDate };
}

function getRangePresetKey(range: { startDate: string; endDate: string }) {
  const preset = PERIOD_PRESETS.find((option) => {
    const presetRange = getPresetCarrinhosRange(option.key);
    return (
      presetRange.startDate === range.startDate &&
      presetRange.endDate === range.endDate
    );
  });

  return preset?.key ?? "custom";
}

function toDateInput(value: string | null) {
  if (!value) return "";
  return value.slice(0, 10);
}

function formatDateTime(value: string | null, options?: Intl.DateTimeFormatOptions) {
  if (!value) return "-";

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit",
    ...options,
  }).format(new Date(value));
}

function formatCompactCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

function formatTimeAgo(value: string, referenceDate: string) {
  const diffMs = new Date(referenceDate).getTime() - new Date(value).getTime();
  const diffMinutes = Math.max(Math.floor(diffMs / 60000), 1);

  if (diffMinutes < 60) return `${diffMinutes} min`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d`;

  return formatDateTime(value, { hour: undefined, minute: undefined });
}

function formatPhone(phone: string | null) {
  if (!phone) return null;

  const digits = phone.replace(/\D/g, "");
  if (digits.length === 11) {
    return `+55 ${digits.slice(0, 2)} ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }

  if (digits.length === 10) {
    return `+55 ${digits.slice(0, 2)} ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }

  return phone;
}

function formatIdentifier(value: string | null | undefined) {
  if (!value) return "-";
  if (value.length <= 13) return value;
  return `${value.slice(0, 9)}...`;
}

function getCartEventCount(carrinho: Carrinho) {
  return Math.max(carrinho.timeline.length, carrinho.recoveryAttempts.length, 1);
}

function clampPage(page: number, totalPages: number) {
  return Math.min(Math.max(page, 1), Math.max(totalPages, 1));
}

function getStatusDotClass(status: CarrinhoStatus) {
  if (status === "recuperado") return "flynow-status-dot--success";
  if (status === "perdido") return "flynow-status-dot--danger";
  if (status === "abandonado" || status === "em_recuperacao") {
    return "flynow-status-dot--warning";
  }
  return "flynow-status-dot--neutral";
}

function getOriginOptions(carrinhos: Carrinho[]) {
  const origins = Array.from(new Set(carrinhos.map((carrinho) => carrinho.origin)));
  const campaigns = Array.from(
    new Set(carrinhos.map((carrinho) => carrinho.campaign))
  ).sort((first, second) => first.localeCompare(second));

  return [
    { value: "all", label: "Origem/Campanha" },
    ...origins.map((origin) => ({
      value: `origin:${origin}`,
      label: CARRINHO_ORIGEM_LABELS[origin],
    })),
    ...campaigns.map((campaign) => ({
      value: `campaign:${campaign}`,
      label: campaign,
    })),
  ];
}

function useMediaQuery(query: string) {
  const [matches, setMatches] = useState<boolean | null>(null);

  useEffect(() => {
    const mediaQuery = window.matchMedia(query);
    const updateMatch = () => setMatches(mediaQuery.matches);

    updateMatch();
    mediaQuery.addEventListener("change", updateMatch);

    return () => mediaQuery.removeEventListener("change", updateMatch);
  }, [query]);

  return matches;
}

function StatusBadge({
  label,
  className,
  dotClassName,
}: {
  label: string;
  className: string;
  dotClassName?: string;
}) {
  return (
    <span
      className={cn(
        "flynow-status-badge inline-flex max-w-full items-center gap-1.5 rounded-[7px] border px-2 py-1 text-[11px] font-semibold leading-none",
        className
      )}
    >
      {dotClassName ? (
        <span
          aria-hidden="true"
          className={cn("flynow-status-dot size-1.5 rounded-full", dotClassName)}
        />
      ) : null}
      <span className="truncate">{label}</span>
    </span>
  );
}

function HeaderActions({
  activeRange,
  calendarValue,
  maxDate,
  onCalendarChange,
  onPresetSelect,
}: {
  activeRange: CarrinhoPeriodoPreset | "custom";
  calendarValue: RangeValue | null;
  maxDate: Date;
  onCalendarChange: (value: RangeValue | null) => void;
  onPresetSelect: (preset: CarrinhoPeriodoPreset) => void;
}) {
  return (
    <SystemDateRangeFilter
      activeRange={activeRange}
      ariaLabel="Acoes e periodo dos carrinhos"
      calendarValue={calendarValue}
      maxDate={maxDate}
      onCalendarChange={onCalendarChange}
      onPresetSelect={(preset) => onPresetSelect(preset.key)}
      presetAriaLabel="Selecionar periodo"
      presets={PERIOD_PRESETS}
    />
  );
}

function MetricPanel({
  label,
  value,
  supportingText,
  tone,
}: {
  label: string;
  value: string;
  supportingText: string;
  tone: "gold" | "blue" | "green" | "red";
}) {
  const dotClass = {
    gold: "bg-[#D6A84F]",
    blue: "bg-[#60A5FA]",
    green: "bg-[#4ADE80]",
    red: "bg-[#F87171]",
  }[tone];

  return (
    <section className="min-w-0 rounded-[8px] border border-white/[0.07] bg-[#0B0D10] p-3.5 shadow-[0_1px_0_rgba(255,255,255,0.03),inset_0_1px_0_rgba(255,255,255,0.035)] sm:p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-2">
            <span aria-hidden="true" className={cn("size-1.5 rounded-full", dotClass)} />
            <p className="truncate text-[11px] font-semibold uppercase text-[var(--fly-text-muted)]">
              {label}
            </p>
          </div>
          <p className="mt-2.5 text-[21px] font-semibold leading-none tabular-nums text-[var(--fly-text)] sm:mt-3 sm:text-[28px]">
            {value}
          </p>
          <p className="mt-1.5 text-[11px] leading-4 text-[var(--fly-text-muted)] sm:mt-2 sm:text-[12px] sm:leading-5">
            {supportingText}
          </p>
        </div>
      </div>
    </section>
  );
}

function OverviewPanel({
  resumo,
}: {
  resumo: CarrinhosResumo;
}) {
  return (
    <div className="grid grid-cols-2 gap-2.5 md:gap-3 xl:grid-cols-4">
      <MetricPanel
        label="Checkout abertos"
        value={resumo.checkout.toLocaleString("pt-BR")}
        supportingText="Aguardando pagamento, pendentes ou em analise"
        tone="blue"
      />
      <MetricPanel
        label="Abandonos"
        value={resumo.abandonados.toLocaleString("pt-BR")}
        supportingText="Eventos que a PayT sinalizou como abandono"
        tone="gold"
      />
      <MetricPanel
        label="Perdidos"
        value={resumo.perdidos.toLocaleString("pt-BR")}
        supportingText="Cancelados, expirados, recusados ou falhos"
        tone="red"
      />
      <MetricPanel
        label="Recuperados"
        value={resumo.recuperados.toLocaleString("pt-BR")}
        supportingText="Checkouts que passaram por evento nao pago antes do paid"
        tone="green"
      />
    </div>
  );
}

function FunnelPanel({
  funil,
}: {
  funil: Record<CarrinhoFunilEtapa, number>;
}) {
  const total = Math.max(funil.iniciado, 1);

  return (
    <section className="rounded-[8px] border border-white/[0.07] bg-[#0B0D10] px-3 py-3 shadow-[0_1px_0_rgba(255,255,255,0.03),inset_0_1px_0_rgba(255,255,255,0.035)] sm:px-4">
      <div className="flex min-w-0 items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold leading-none text-[var(--fly-text)]">
            Funil de carrinho
          </h2>
          <p className="mt-1 hidden text-xs leading-5 text-[var(--fly-text-muted)] sm:block">
            Progressao do periodo ate recuperacao ou perda definitiva
          </p>
        </div>
        <span className="shrink-0 text-xs font-semibold tabular-nums text-[var(--fly-text-soft)]">
          {funil.iniciado.toLocaleString("pt-BR")} iniciados
        </span>
      </div>

      <div className="mt-3 overflow-x-auto">
        <div className="flex min-w-max overflow-hidden rounded-[8px] border border-white/[0.055] bg-white/[0.016] sm:min-w-0 sm:grid sm:grid-cols-5 sm:divide-x sm:divide-white/[0.055]">
          {CARRINHO_FUNIL_PIPELINE.map((stage, index) => {
            const count = funil[stage];
            const percentage = total > 0 ? count / total : 0;
            const tone = FUNNEL_TONES[stage];

            return (
              <div key={stage} className="w-[145px] px-3 py-2.5 sm:w-auto">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <span
                      aria-hidden="true"
                      className={cn("size-1.5 shrink-0 rounded-full", tone.dot)}
                    />
                    <span className="truncate text-xs font-semibold text-[var(--fly-text-soft)]">
                      {CARRINHO_FUNIL_LABELS[stage]}
                    </span>
                  </div>
                  <span className="shrink-0 text-xs font-semibold tabular-nums text-[var(--fly-text)]">
                    {count.toLocaleString("pt-BR")}
                  </span>
                </div>
                <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/[0.07]">
                  <span
                    aria-hidden="true"
                    className={cn("block h-full rounded-full", tone.bar)}
                    style={{
                      width: `${Math.max(percentage * 100, count > 0 ? 4 : 0)}%`,
                    }}
                  />
                </div>
                <p className="mt-1.5 text-[11px] font-medium text-[var(--fly-text-dim)]">
                  {index === 0
                    ? "Base"
                    : `${formatPercent(percentage)} da base`}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function ViewToggle({
  view,
  onChange,
}: {
  view: ViewMode;
  onChange: (view: ViewMode) => void;
}) {
  return (
    <div
      role="tablist"
      aria-label="Alternar visualizacao dos carrinhos"
      className="flynow-period-filter grid w-full grid-cols-2 gap-1.5 rounded-[14px] border border-[var(--fly-border)] bg-[var(--fly-surface-elevated)] p-1.5 shadow-[0_18px_42px_rgba(0,0,0,0.24),inset_0_1px_0_rgba(255,255,255,0.035)] sm:w-auto"
    >
      <button
        type="button"
        role="tab"
        aria-selected={view === "tabela"}
        aria-controls="carrinhos-view-tabela"
        onClick={() => onChange("tabela")}
        className={cn(
          "inline-flex h-10 min-w-0 items-center justify-center gap-2 rounded-xl px-3.5 text-xs font-medium outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-[var(--fly-brand-ring)] sm:h-8 sm:min-w-[96px] sm:rounded-[10px] sm:px-3",
          view === "tabela"
            ? "bg-[var(--fly-control-active)] text-[var(--fly-text)] shadow-[0_1px_0_rgba(255,255,255,0.05),0_10px_24px_rgba(0,0,0,0.24),inset_0_1px_0_rgba(255,255,255,0.035)]"
            : "text-[var(--fly-text-muted)] hover:bg-[var(--fly-control)] hover:text-[var(--fly-text-soft)]"
        )}
      >
        <List
          aria-hidden="true"
          className={cn(
            "size-3.5 shrink-0 transition-colors duration-150",
            view === "tabela" ? "text-[var(--fly-brand-strong)]" : "text-current"
          )}
        />
        <span className="truncate">Tabela</span>
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={view === "kanban"}
        aria-controls="carrinhos-view-kanban"
        onClick={() => onChange("kanban")}
        className={cn(
          "inline-flex h-10 min-w-0 items-center justify-center gap-2 rounded-xl px-3.5 text-xs font-medium outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-[var(--fly-brand-ring)] sm:h-8 sm:min-w-[96px] sm:rounded-[10px] sm:px-3",
          view === "kanban"
            ? "bg-[var(--fly-control-active)] text-[var(--fly-text)] shadow-[0_1px_0_rgba(255,255,255,0.05),0_10px_24px_rgba(0,0,0,0.24),inset_0_1px_0_rgba(255,255,255,0.035)]"
            : "text-[var(--fly-text-muted)] hover:bg-[var(--fly-control)] hover:text-[var(--fly-text-soft)]"
        )}
      >
        <Columns3
          aria-hidden="true"
          className={cn(
            "size-3.5 shrink-0 transition-colors duration-150",
            view === "kanban" ? "text-[var(--fly-brand-strong)]" : "text-current"
          )}
        />
        <span className="truncate">Kanban</span>
      </button>
    </div>
  );
}

function SelectControl({
  label,
  displayLabel,
  value,
  onChange,
  options,
}: {
  label: string;
  displayLabel: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedOption = options.find((option) => option.value === value);
  const selectedLabel =
    selectedOption?.value === "all" ? "Todos" : selectedOption?.label ?? "Todos";
  const isFiltered = value !== "all";

  return (
    <RadixDropdownMenu.Root
      modal={false}
      open={isOpen}
      onOpenChange={setIsOpen}
    >
      <RadixDropdownMenu.Trigger
        aria-label={`Selecionar ${label}`}
        className={cn(
          "group flex h-10 w-full min-w-0 items-center justify-between gap-2 rounded-xl border bg-[var(--fly-control)] px-3 text-left text-[11px] font-medium text-[var(--fly-text-soft)] shadow-[inset_0_1px_0_rgba(255,255,255,0.035)] outline-none transition-colors duration-150 hover:border-[var(--fly-border-strong)] hover:bg-[var(--fly-control-hover)] focus-visible:ring-2 focus-visible:ring-[var(--fly-brand-ring)] data-[state=open]:border-[var(--fly-brand-border)] data-[state=open]:bg-[var(--fly-control-hover)] lg:h-9 lg:w-[190px] lg:min-w-[190px] lg:rounded-[10px] lg:bg-[var(--fly-control-solid)] lg:text-xs lg:shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]",
          isFiltered
            ? "border-[var(--fly-brand-border)] text-[var(--fly-text)]"
            : "border-[var(--fly-border)]"
        )}
      >
        <span className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--fly-text-muted)]">
          {displayLabel}
        </span>
        <span
          aria-hidden="true"
          className="h-3.5 w-px shrink-0 bg-[var(--fly-border)]"
        />
        <span className="min-w-0 flex-1 truncate">{selectedLabel}</span>
        <ChevronDown
          aria-hidden="true"
          className="size-3.5 shrink-0 text-[var(--fly-text-muted)] transition-transform duration-200 group-data-[state=open]:rotate-180"
        />
      </RadixDropdownMenu.Trigger>

      <RadixDropdownMenu.Portal>
        <RadixDropdownMenu.Content
          align="end"
          side="bottom"
          sideOffset={8}
          className="flynow-calendar-popover flynow-offer-select-content z-[80] max-h-[300px] w-[var(--radix-dropdown-menu-trigger-width)] min-w-[190px] overflow-y-auto rounded-xl border border-[var(--fly-brand-border)] bg-[var(--fly-surface-elevated)] p-1 text-[var(--fly-text)] shadow-[0_28px_90px_rgba(0,0,0,0.6),0_0_0_1px_rgba(255,255,255,0.045),inset_0_1px_0_rgba(255,255,255,0.13),inset_0_0_36px_rgba(255,255,255,0.035)] backdrop-blur-[28px] data-[side=bottom]:origin-top-right"
        >
          <RadixDropdownMenu.RadioGroup
            value={value}
            onValueChange={onChange}
          >
            {options.map((option) => (
              <RadixDropdownMenu.RadioItem
                key={option.value}
                value={option.value}
                className="relative flex h-8 cursor-pointer select-none items-center rounded-[8px] py-1.5 pl-8 pr-3 text-xs font-medium text-[var(--fly-text-soft)] outline-none transition-colors duration-150 data-[highlighted]:bg-[var(--fly-control-hover)] data-[highlighted]:text-[var(--fly-text)] data-[state=checked]:text-[var(--fly-text)]"
              >
                <RadixDropdownMenu.ItemIndicator className="absolute left-2.5 inline-flex size-3.5 items-center justify-center text-[var(--fly-brand-strong)]">
                  <Check aria-hidden="true" className="size-3.5" />
                </RadixDropdownMenu.ItemIndicator>
                <span className="truncate">
                  {option.value === "all" ? `Todos - ${displayLabel}` : option.label}
                </span>
              </RadixDropdownMenu.RadioItem>
            ))}
          </RadixDropdownMenu.RadioGroup>
        </RadixDropdownMenu.Content>
      </RadixDropdownMenu.Portal>
    </RadixDropdownMenu.Root>
  );
}

function ActiveFilterChip({
  label,
  onRemove,
}: {
  label: string;
  onRemove: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onRemove}
      className="inline-flex h-7 min-w-0 max-w-full items-center gap-1.5 rounded-[8px] border border-[var(--fly-border)] bg-[var(--fly-control)] px-2.5 text-[11px] font-medium text-[var(--fly-text-soft)] outline-none transition-colors duration-150 hover:border-[var(--fly-border-strong)] hover:bg-[var(--fly-control-hover)] hover:text-[var(--fly-text)] focus-visible:ring-2 focus-visible:ring-[var(--fly-brand-ring)]"
    >
      <span className="truncate">{label}</span>
      <X aria-hidden="true" className="size-3 shrink-0 text-[var(--fly-text-dim)]" />
    </button>
  );
}

function FilterPanel({
  query,
  statusFilter,
  stageFilter,
  product,
  originCampaign,
  products,
  originOptions,
  filtersOpen,
  activeFilterCount,
  onQueryChange,
  onStatusFilterChange,
  onStageFilterChange,
  onProductChange,
  onOriginCampaignChange,
  onFiltersOpenChange,
  onClearFilters,
}: {
  query: string;
  statusFilter: string;
  stageFilter: string;
  product: string;
  originCampaign: string;
  products: string[];
  originOptions: Array<{ value: string; label: string }>;
  filtersOpen: boolean;
  activeFilterCount: number;
  onQueryChange: (value: string) => void;
  onStatusFilterChange: (value: string) => void;
  onStageFilterChange: (value: string) => void;
  onProductChange: (value: string) => void;
  onOriginCampaignChange: (value: string) => void;
  onFiltersOpenChange: (value: boolean) => void;
  onClearFilters: () => void;
}) {
  const statusLabel = STATUS_FILTERS.find((option) => option.value === statusFilter)?.label;
  const stageLabel = STAGE_FILTERS.find((option) => option.value === stageFilter)?.label;
  const originLabel = originOptions.find(
    (option) => option.value === originCampaign
  )?.label;

  return (
    <div className="border-b border-white/[0.06] p-3 sm:p-4">
      <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-center">
        <label className="relative min-w-0 flex-1">
          <span className="sr-only">Buscar carrinho</span>
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--fly-text-dim)]"
          />
          <input
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Buscar cliente, telefone, e-mail, codigo ou produto"
            className="h-10 w-full rounded-[8px] border border-[var(--fly-border)] bg-[var(--fly-control)] pl-9 pr-3 text-sm font-medium text-[var(--fly-text)] outline-none transition-colors duration-150 placeholder:text-[var(--fly-text-dim)] hover:border-[var(--fly-border-strong)] focus-visible:ring-2 focus-visible:ring-[var(--fly-brand-ring)]"
          />
        </label>

        <div className="flex min-w-0 items-center gap-2">
          {activeFilterCount > 0 ? (
            <button
              type="button"
              onClick={onClearFilters}
              className="hidden h-10 shrink-0 items-center justify-center rounded-[8px] px-3 text-xs font-semibold text-[var(--fly-text-muted)] outline-none transition-colors duration-150 hover:bg-[var(--fly-control)] hover:text-[var(--fly-text)] focus-visible:ring-2 focus-visible:ring-[var(--fly-brand-ring)] sm:inline-flex"
            >
              Limpar
            </button>
          ) : null}
          <button
            type="button"
            aria-expanded={filtersOpen}
            aria-controls="carrinhos-filter-controls"
            onClick={() => onFiltersOpenChange(!filtersOpen)}
            className={cn(
              "inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-[8px] border px-3 text-xs font-semibold outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-[var(--fly-brand-ring)] sm:flex-none",
              filtersOpen || activeFilterCount > 0
                ? "border-[var(--fly-brand-border)] bg-[var(--fly-brand-surface)] text-[var(--fly-brand-strong)] hover:bg-[var(--fly-brand-surface-hover)]"
                : "border-[var(--fly-border)] bg-[var(--fly-control)] text-[var(--fly-text-soft)] hover:border-[var(--fly-border-strong)] hover:bg-[var(--fly-control-hover)]"
            )}
          >
            <Filter aria-hidden="true" className="size-3.5" />
            Filtros
            {activeFilterCount > 0 ? (
              <span className="rounded-[7px] bg-[var(--fly-control-active)] px-1.5 py-0.5 text-[10px] text-[var(--fly-text)]">
                {activeFilterCount}
              </span>
            ) : null}
          </button>
        </div>
      </div>

      {activeFilterCount > 0 ? (
        <div className="mt-3 flex min-w-0 flex-wrap items-center gap-2">
          {query.trim() ? (
            <ActiveFilterChip
              label={`Busca: ${query.trim()}`}
              onRemove={() => onQueryChange("")}
            />
          ) : null}
          {statusFilter !== "all" && statusLabel ? (
            <ActiveFilterChip
              label={`Status: ${statusLabel}`}
              onRemove={() => onStatusFilterChange("all")}
            />
          ) : null}
          {stageFilter !== "all" && stageLabel ? (
            <ActiveFilterChip
              label={`Etapa: ${stageLabel}`}
              onRemove={() => onStageFilterChange("all")}
            />
          ) : null}
          {product !== "all" ? (
            <ActiveFilterChip
              label={`Produto: ${product}`}
              onRemove={() => onProductChange("all")}
            />
          ) : null}
          {originCampaign !== "all" && originLabel ? (
            <ActiveFilterChip
              label={`Origem: ${originLabel}`}
              onRemove={() => onOriginCampaignChange("all")}
            />
          ) : null}
          <button
            type="button"
            onClick={onClearFilters}
            className="inline-flex h-7 items-center justify-center rounded-[8px] px-2.5 text-[11px] font-semibold text-[var(--fly-text-muted)] outline-none transition-colors duration-150 hover:bg-[var(--fly-control)] hover:text-[var(--fly-text)] focus-visible:ring-2 focus-visible:ring-[var(--fly-brand-ring)] sm:hidden"
          >
            Limpar
          </button>
        </div>
      ) : null}

      <div
        id="carrinhos-filter-controls"
        className={cn(
          "mt-3 min-w-0 gap-2 sm:grid-cols-2 lg:items-center",
          filtersOpen ? "grid lg:flex" : "hidden"
        )}
      >
        <SelectControl
          label="Status"
          displayLabel="Status"
          value={statusFilter}
          onChange={onStatusFilterChange}
          options={STATUS_FILTERS}
        />
        <SelectControl
          label="Etapa"
          displayLabel="Etapa"
          value={stageFilter}
          onChange={onStageFilterChange}
          options={STAGE_FILTERS}
        />
        <SelectControl
          label="Produto"
          displayLabel="Produto"
          value={product}
          onChange={onProductChange}
          options={[
            { value: "all", label: "Produtos" },
            ...products.map((item) => ({ value: item, label: item })),
          ]}
        />
        <SelectControl
          label="Origem ou campanha"
          displayLabel="Origem"
          value={originCampaign}
          onChange={onOriginCampaignChange}
          options={originOptions}
        />
      </div>
    </div>
  );
}

function SummaryStrip({
  filteredCount,
  filteredEventCount,
  periodoLabel,
  view,
  onViewChange,
}: {
  filteredCount: number;
  filteredEventCount: number;
  periodoLabel: string;
  view: ViewMode;
  onViewChange: (view: ViewMode) => void;
}) {
  return (
    <div className="flex flex-col gap-3 px-1 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <h2 className="text-sm font-semibold leading-5 text-[var(--fly-text)]">
          Fila de checkout monitorada
        </h2>
        <div className="mt-1.5 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[var(--fly-text-muted)]">
          <span className="font-semibold tabular-nums text-[var(--fly-text)]">
            {filteredCount.toLocaleString("pt-BR")} carrinhos
          </span>
          <span className="text-[var(--fly-text-dim)]">·</span>
          <span className="font-semibold tabular-nums text-[var(--fly-text-soft)]">
            {filteredEventCount.toLocaleString("pt-BR")} eventos
          </span>
          <span className="text-[var(--fly-text-dim)]">·</span>
          <span>{periodoLabel}</span>
        </div>
      </div>
      <ViewToggle view={view} onChange={onViewChange} />
    </div>
  );
}

function PaginationControls({
  model,
  onPageChange,
  onPageSizeChange,
}: {
  model: PaginationModel;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}) {
  const start = model.totalItems === 0 ? 0 : (model.page - 1) * model.pageSize + 1;
  const end = Math.min(model.page * model.pageSize, model.totalItems);

  return (
    <div className="flex flex-col gap-3 border-t border-white/[0.06] bg-white/[0.012] px-3 py-3 text-xs text-[var(--fly-text-muted)] sm:flex-row sm:items-center sm:justify-between sm:px-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="tabular-nums">
          {start.toLocaleString("pt-BR")}-{end.toLocaleString("pt-BR")} de{" "}
          {model.totalItems.toLocaleString("pt-BR")}
        </span>
        <span className="hidden text-[var(--fly-text-dim)] sm:inline">/</span>
        <label className="flex items-center gap-2">
          <span>Por pagina</span>
          <select
            aria-label="Carrinhos por pagina"
            value={model.pageSize}
            onChange={(event) => onPageSizeChange(Number(event.target.value))}
            className="h-8 rounded-[7px] border border-[var(--fly-border)] bg-[var(--fly-control)] px-2 text-xs font-semibold text-[var(--fly-text-soft)] outline-none transition-colors duration-150 hover:border-[var(--fly-border-strong)] hover:bg-[var(--fly-control-hover)] focus-visible:ring-2 focus-visible:ring-[var(--fly-brand-ring)]"
          >
            {PAGE_SIZE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="flex items-center justify-between gap-2 sm:justify-end">
        <span className="font-medium tabular-nums text-[var(--fly-text-soft)]">
          Pagina {model.page} de {model.totalPages}
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Pagina anterior"
            onClick={() => onPageChange(model.page - 1)}
            disabled={model.page <= 1}
            className="inline-flex size-8 items-center justify-center rounded-[7px] border border-[var(--fly-border)] bg-[var(--fly-control)] text-[var(--fly-text-soft)] outline-none transition-colors duration-150 hover:border-[var(--fly-border-strong)] hover:bg-[var(--fly-control-hover)] disabled:opacity-45 focus-visible:ring-2 focus-visible:ring-[var(--fly-brand-ring)]"
          >
            <ChevronLeft aria-hidden="true" className="size-4" />
          </button>
          <button
            type="button"
            aria-label="Proxima pagina"
            onClick={() => onPageChange(model.page + 1)}
            disabled={model.page >= model.totalPages}
            className="inline-flex size-8 items-center justify-center rounded-[7px] border border-[var(--fly-border)] bg-[var(--fly-control)] text-[var(--fly-text-soft)] outline-none transition-colors duration-150 hover:border-[var(--fly-border-strong)] hover:bg-[var(--fly-control-hover)] disabled:opacity-45 focus-visible:ring-2 focus-visible:ring-[var(--fly-brand-ring)]"
          >
            <ChevronRight aria-hidden="true" className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

function CartsTable({
  carrinhos,
  onDetail,
}: {
  carrinhos: Carrinho[];
  onDetail: (carrinho: Carrinho) => void;
}) {
  return (
    <div className="hidden min-h-[520px] overflow-x-auto lg:block">
      <table className="w-full min-w-[1080px] table-fixed text-left text-sm">
        <colgroup>
          <col className="w-[14%]" />
          <col className="w-[13%]" />
          <col className="w-[27%]" />
          <col className="w-[22%]" />
          <col className="w-[11%]" />
          <col className="w-[13%]" />
        </colgroup>
        <thead>
          <tr className="border-b border-white/[0.06] bg-white/[0.018] text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--fly-text-muted)]">
            <th className="px-4 py-3.5">Ultimo evento</th>
            <th className="px-4 py-3.5">Status</th>
            <th className="px-4 py-3.5">Cliente</th>
            <th className="px-4 py-3.5">Produto</th>
            <th className="px-4 py-3.5">Valor</th>
            <th className="py-3.5 pl-4 pr-8">IDs</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/[0.055]">
          {carrinhos.map((carrinho) => {
            const phone = formatPhone(carrinho.customerPhone);
            const contato = phone ?? carrinho.customerEmail ?? "Sem contato";
            const eventCount = getCartEventCount(carrinho);

            return (
              <tr
                key={carrinho.id}
                className="group transition-colors duration-150 hover:bg-white/[0.018]"
              >
                <td className="px-4 py-3">
                  <p className="text-sm font-medium tabular-nums text-[var(--fly-text-soft)]">
                    {formatDateTime(carrinho.lastActivityAt)}
                  </p>
                </td>
                <td className="px-4 py-3">
                  <StatusBadge
                    label={CARRINHO_STATUS_LABELS[carrinho.status]}
                    className={STATUS_BADGE_STYLES[carrinho.status]}
                    dotClassName={getStatusDotClass(carrinho.status)}
                  />
                </td>
                <td className="px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[var(--fly-text)]">
                      {carrinho.customerName}
                    </p>
                    <p className="mt-1 truncate text-xs text-[var(--fly-text-muted)]">
                      {contato}
                    </p>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <p className="truncate text-sm font-medium text-[var(--fly-text-soft)]">
                    {carrinho.productGroup}
                  </p>
                  <p className="mt-1 truncate text-xs text-[var(--fly-text-muted)]">
                    {eventCount} evento{eventCount === 1 ? "" : "s"} no historico
                  </p>
                </td>
                <td className="px-4 py-3">
                  <p className="text-sm font-semibold tabular-nums text-[var(--fly-text)]">
                    {formatCurrency(carrinho.potentialValue)}
                  </p>
                  {carrinho.recoveredValue ? (
                    <p className="mt-1 text-xs font-medium text-[var(--fly-success)]">
                      recuperado
                    </p>
                  ) : null}
                </td>
                <td className="py-3 pl-4 pr-8">
                  <div className="flex min-w-0 items-center justify-between gap-3">
                    <p className="truncate font-mono text-[11px] text-[var(--fly-text-muted)]">
                      {formatIdentifier(carrinho.externalCartId)}
                    </p>
                    <button
                      type="button"
                      aria-label={`Ver detalhes de ${carrinho.customerName}`}
                      onClick={() => onDetail(carrinho)}
                      className="shrink-0 p-0 text-[11px] font-semibold leading-5 text-[var(--fly-brand-strong)] underline decoration-[var(--fly-brand-border)] decoration-1 underline-offset-4 outline-none transition-[color,text-decoration-color] duration-150 hover:text-[var(--fly-brand-strong)] hover:decoration-[var(--fly-brand-strong)] focus-visible:rounded-[4px] focus-visible:ring-2 focus-visible:ring-[var(--fly-brand-ring)]"
                    >
                      Detalhes
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function MobileCartsList({
  carrinhos,
  referenceDate,
  onDetail,
}: {
  carrinhos: Carrinho[];
  referenceDate: string;
  onDetail: (carrinho: Carrinho) => void;
}) {
  return (
    <div className="min-h-[520px] divide-y divide-white/[0.055] lg:hidden">
      {carrinhos.map((carrinho) => {
        const phone = formatPhone(carrinho.customerPhone);
        const contato = phone ?? carrinho.customerEmail ?? "Sem contato";
        const eventCount = getCartEventCount(carrinho);

        return (
          <article
            key={carrinho.id}
            className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-2 px-3 py-3"
          >
            <div className="min-w-0">
              <p className="truncate text-[13px] font-semibold leading-5 text-[var(--fly-text)]">
                {carrinho.customerName}
              </p>
              <p className="truncate text-[11px] leading-4 text-[var(--fly-text-muted)]">
                {contato}
              </p>
            </div>

            <div className="flex min-w-0 flex-col items-end gap-1 pt-0.5">
              <span className="shrink-0 text-[13px] font-semibold leading-4 tabular-nums text-[var(--fly-text)]">
                {formatCurrency(carrinho.potentialValue)}
              </span>
              <span className="text-[10px] font-medium leading-none text-[var(--fly-text-muted)]">
                {formatDateTime(carrinho.lastActivityAt)}
              </span>
            </div>

            <div className="col-span-2 flex min-w-0 items-start justify-between gap-3">
              <div className="min-w-0 space-y-1">
                <div className="flex min-w-0 items-center gap-2">
                  <StatusBadge
                    label={CARRINHO_STATUS_LABELS[carrinho.status]}
                    className={STATUS_BADGE_STYLES[carrinho.status]}
                    dotClassName={getStatusDotClass(carrinho.status)}
                  />
                </div>
                <p className="truncate text-[11px] leading-4 text-[var(--fly-text-muted)]">
                  {carrinho.productGroup} · {eventCount} evento
                  {eventCount === 1 ? "" : "s"} no historico
                </p>
                <p className="truncate font-mono text-[10px] text-[var(--fly-text-dim)]">
                  Cart: {formatIdentifier(carrinho.externalCartId)}
                </p>
              </div>
              <button
                type="button"
                aria-label={`Ver detalhes de ${carrinho.customerName}`}
                onClick={() => onDetail(carrinho)}
                className="shrink-0 pt-0.5 text-[10px] font-semibold leading-5 text-[var(--fly-brand-strong)] underline decoration-[var(--fly-brand-border)] underline-offset-4 outline-none transition-colors duration-150 hover:text-[var(--fly-brand-strong)] focus-visible:rounded-[4px] focus-visible:ring-2 focus-visible:ring-[var(--fly-brand-ring)]"
              >
                Ver
              </button>
            </div>
          </article>
        );
      })}
    </div>
  );
}

function EmptyState({
  title,
  description,
  compact = false,
}: {
  title: string;
  description: string;
  compact?: boolean;
}) {
  return (
    <div
      role="status"
      className={cn(
        "flynow-dashboard-empty-state flex min-h-[360px] items-center justify-center border-t border-dashed border-white/[0.08] bg-white/[0.018] px-4 text-center",
        compact && "min-h-[180px] rounded-[8px] border"
      )}
    >
      <div className="max-w-[280px]">
        <span className="flynow-dashboard-empty-icon mx-auto flex size-9 items-center justify-center rounded-[8px] border border-white/[0.07] bg-[#050607] text-[var(--fly-text-muted)] shadow-[inset_0_1px_0_rgba(255,255,255,0.035)]">
          <Inbox aria-hidden="true" className="size-4" />
        </span>
        <p className="flynow-dashboard-empty-title mt-3 text-sm font-semibold text-[var(--fly-text)]">
          {title}
        </p>
        <p className="flynow-dashboard-empty-description mt-1.5 text-[13px] leading-5 text-[var(--fly-text-muted)]">
          {description}
        </p>
      </div>
    </div>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div
      role="alert"
      className="flynow-dashboard-error-state flex flex-col gap-4 rounded-[8px] border border-[#F87171]/26 bg-[#2B1515]/80 p-4 text-sm text-[#FCA5A5] shadow-[inset_0_1px_0_rgba(255,255,255,0.035)] sm:flex-row sm:items-center sm:justify-between sm:p-5"
    >
      <div className="flex min-w-0 items-start gap-3">
        <span className="flynow-dashboard-error-icon flex size-9 shrink-0 items-center justify-center rounded-[8px] border border-[#F87171]/20 bg-[#3A1B1B] text-[#FCA5A5]">
          <AlertTriangle aria-hidden="true" className="size-4" />
        </span>
        <div className="min-w-0">
          <p className="flynow-dashboard-error-title font-semibold text-[#FECACA]">
            Carrinhos indisponiveis
          </p>
          <p className="flynow-dashboard-error-message mt-1 leading-5 text-[#FCA5A5]">
            Um cenário de erro esta ativo. Tente novamente para voltar a base local.
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={onRetry}
        className="flynow-dashboard-error-action inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-[8px] border border-[#F87171]/22 bg-[#3A1B1B] px-3 text-xs font-semibold text-[#FECACA] outline-none transition-colors duration-150 hover:border-[#F87171]/36 hover:bg-[#431F1F] focus-visible:ring-2 focus-visible:ring-[#F87171]/30"
      >
        <RefreshCw aria-hidden="true" className="size-3.5" />
        Tentar novamente
      </button>
    </div>
  );
}

function CarrinhosSkeleton() {
  return (
    <div
      role="status"
      aria-label="Carregando carrinhos"
      className="flynow-dashboard-skeleton space-y-5"
    >
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="flynow-dashboard-skeleton-panel h-[126px] rounded-[8px] border border-white/[0.06] bg-[#0D0F12] p-4"
          >
            <div className="space-y-3">
              <span className="block h-2.5 w-24 rounded-full bg-white/[0.055]" />
              <span className="block h-8 w-24 rounded-md bg-white/[0.07]" />
              <span className="block h-2.5 w-40 rounded-full bg-white/[0.05]" />
            </div>
          </div>
        ))}
      </div>
      <div className="flynow-dashboard-skeleton-panel h-[172px] rounded-[8px] border border-white/[0.06] bg-[#0D0F12] p-4">
        <div className="space-y-4">
          <span className="block h-3 w-44 rounded-full bg-white/[0.06]" />
          <div className="grid gap-2 lg:grid-cols-5">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="rounded-[8px] bg-white/[0.025] p-3">
                <span className="block h-3 w-24 rounded-full bg-white/[0.06]" />
                <span className="mt-4 block h-1.5 w-full rounded-full bg-white/[0.055]" />
                <span className="mt-3 block h-2.5 w-20 rounded-full bg-white/[0.045]" />
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="flynow-dashboard-skeleton-panel rounded-[8px] border border-white/[0.06] bg-[#0D0F12]">
        <div className="border-b border-white/[0.06] p-3 sm:p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <span className="h-10 flex-1 rounded-[8px] bg-white/[0.055]" />
            <span className="h-10 w-full rounded-[8px] bg-white/[0.05] sm:w-28" />
          </div>
        </div>
        <div className="hidden lg:block">
          <div className="grid grid-cols-[14%_13%_27%_22%_11%_13%] border-b border-white/[0.06] bg-white/[0.018] px-4 py-3.5">
            {Array.from({ length: 6 }).map((_, index) => (
              <span
                key={index}
                className="h-2.5 w-20 rounded-full bg-white/[0.055]"
              />
            ))}
          </div>
          <div className="divide-y divide-white/[0.055] px-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <div
                key={index}
                className="grid grid-cols-[14%_13%_27%_22%_11%_13%] items-center py-4"
              >
                {Array.from({ length: 6 }).map((__, itemIndex) => (
                  <span
                    key={itemIndex}
                    className={cn(
                      "block h-3 rounded-full bg-white/[0.055]",
                      itemIndex % 3 === 0 ? "w-28" : "w-20"
                    )}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
        <div className="divide-y divide-white/[0.055] lg:hidden">
          {Array.from({ length: 8 }).map((_, index) => (
            <div
              key={index}
              className="grid grid-cols-[minmax(0,1fr)_82px] gap-x-3 gap-y-2 px-3 py-3"
            >
              <div className="space-y-1.5">
                <span className="block h-3.5 w-36 rounded-full bg-white/[0.07]" />
                <span className="block h-2.5 w-44 rounded-full bg-white/[0.045]" />
              </div>
              <div className="flex flex-col items-end gap-1.5 pt-0.5">
                <span className="block h-3.5 w-20 rounded-full bg-white/[0.065]" />
                <span className="block h-2 w-12 rounded-full bg-white/[0.045]" />
              </div>
              <div className="col-span-2 flex items-center justify-between gap-3">
                <span className="block h-2.5 w-40 rounded-full bg-white/[0.045]" />
                <span className="block h-5 w-20 rounded-[7px] bg-white/[0.055]" />
              </div>
            </div>
          ))}
        </div>
      </div>
      <span className="sr-only">Carregando carrinhos.</span>
    </div>
  );
}

function ActionNotice({
  message,
  onDismiss,
}: {
  message: string;
  onDismiss: () => void;
}) {
  return (
    <div
      role="status"
      className="flex items-center justify-between gap-3 rounded-[8px] border border-[var(--fly-brand-border)] bg-[var(--fly-brand-surface)] px-3 py-2 text-xs font-medium text-[var(--fly-brand-strong)] shadow-[inset_0_1px_0_rgba(255,255,255,0.035)]"
    >
      <span>{message}</span>
      <button
        type="button"
        aria-label="Dispensar aviso"
        onClick={onDismiss}
        className="inline-flex size-6 shrink-0 items-center justify-center rounded-[7px] text-[var(--fly-brand-strong)] outline-none transition-colors duration-150 hover:bg-[var(--fly-brand-soft)] focus-visible:ring-2 focus-visible:ring-[var(--fly-brand-ring)]"
      >
        <X aria-hidden="true" className="size-3.5" />
      </button>
    </div>
  );
}

function KanbanColumn({
  stage,
  carrinhos,
  referenceDate,
  totalCarrinhos,
  onDetail,
}: {
  stage: CarrinhoFunilEtapa;
  carrinhos: Carrinho[];
  referenceDate: string;
  totalCarrinhos: number;
  onDetail: (carrinho: Carrinho) => void;
}) {
  const total = carrinhos.reduce((sum, carrinho) => sum + carrinho.potentialValue, 0);
  const visibleCarrinhos = carrinhos.slice(0, KANBAN_COLUMN_CARD_LIMIT);
  const hiddenCount = Math.max(carrinhos.length - visibleCarrinhos.length, 0);
  const percentage =
    totalCarrinhos > 0 ? Math.round((carrinhos.length / totalCarrinhos) * 100) : 0;
  const tone = FUNNEL_TONES[stage];

  return (
    <section className="relative flex h-[560px] w-[264px] shrink-0 snap-start flex-col overflow-hidden rounded-[8px] border border-white/[0.07] bg-[#0B0D10] shadow-[0_1px_0_rgba(255,255,255,0.03),inset_0_1px_0_rgba(255,255,255,0.035)]">
      <div className="border-b border-white/[0.06] p-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-2">
            <span
              aria-hidden="true"
              className="mt-1 h-7 w-px shrink-0 rounded-full bg-gradient-to-b from-white/[0.18] via-white/[0.08] to-transparent"
            />
            <div className="min-w-0">
              <h3 className="truncate text-[13px] font-semibold leading-5 text-[var(--fly-text)]">
                {CARRINHO_FUNIL_LABELS[stage]}
              </h3>
              <p className="text-[11px] leading-4 text-[var(--fly-text-muted)]">
                {formatCompactCurrency(total)} · {percentage}% do filtro
              </p>
            </div>
          </div>
          <span
            className={cn(
              "flynow-status-badge rounded-[7px] border px-2 py-1 text-xs font-semibold tabular-nums",
              tone.badge
            )}
          >
            {carrinhos.length}
          </span>
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto p-2">
        {carrinhos.length === 0 ? (
          <div className="flex h-20 items-center justify-center rounded-[8px] border border-dashed border-white/[0.08] bg-white/[0.012] text-[11px] text-[var(--fly-text-muted)]">
            Sem carrinhos
          </div>
        ) : (
          <>
            {visibleCarrinhos.map((carrinho) => (
              <button
                key={carrinho.id}
                type="button"
                onClick={() => onDetail(carrinho)}
                className="w-full rounded-[8px] border border-white/[0.055] bg-white/[0.018] p-2.5 text-left outline-none transition-colors duration-150 hover:border-white/[0.1] hover:bg-white/[0.035] focus-visible:ring-2 focus-visible:ring-[var(--fly-brand-ring)]"
              >
                <div className="flex min-w-0 items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-semibold leading-5 text-[var(--fly-text)]">
                      {carrinho.customerName}
                    </p>
                    <p className="truncate text-[11px] leading-4 text-[var(--fly-text-muted)]">
                      {carrinho.productGroup} · {carrinho.variation}
                    </p>
                  </div>
                  <span className="shrink-0 text-[11px] font-semibold leading-5 tabular-nums text-[var(--fly-text)]">
                    {formatCompactCurrency(carrinho.potentialValue)}
                  </span>
                </div>
                <div className="mt-2 flex min-w-0 items-center justify-between gap-2">
                  <span className="truncate font-mono text-[10px] font-semibold text-[var(--fly-brand-strong)]">
                    {carrinho.externalCartId}
                  </span>
                  <span className="shrink-0 text-[10px] font-medium text-[var(--fly-text-muted)]">
                    {formatTimeAgo(carrinho.lastActivityAt, referenceDate)}
                  </span>
                </div>
              </button>
            ))}
            {hiddenCount > 0 ? (
              <div className="rounded-[8px] border border-dashed border-white/[0.08] bg-white/[0.012] px-3 py-2 text-center text-[11px] font-medium text-[var(--fly-text-muted)]">
                +{hiddenCount.toLocaleString("pt-BR")} carrinhos nesta coluna
              </div>
            ) : null}
          </>
        )}
      </div>
    </section>
  );
}

function KanbanBoard({
  carrinhos,
  referenceDate,
  onDetail,
}: {
  carrinhos: Carrinho[];
  referenceDate: string;
  onDetail: (carrinho: Carrinho) => void;
}) {
  const carrinhosPorEtapa = useMemo(() => {
    return CARRINHO_FUNIL_PIPELINE.reduce<Record<CarrinhoFunilEtapa, Carrinho[]>>(
      (acc, stage) => {
        acc[stage] = carrinhos.filter((carrinho) => carrinho.funnelStage === stage);
        return acc;
      },
      {
        iniciado: [],
        checkout: [],
        abandonado: [],
        recuperado: [],
        perdido: [],
      }
    );
  }, [carrinhos]);

  return (
    <div className="overflow-x-auto border-t border-white/[0.06] p-3">
      <div className="flex min-w-max snap-x snap-mandatory gap-3">
        {CARRINHO_FUNIL_PIPELINE.map((stage) => (
          <KanbanColumn
            key={stage}
            stage={stage}
            carrinhos={carrinhosPorEtapa[stage]}
            referenceDate={referenceDate}
            totalCarrinhos={carrinhos.length}
            onDetail={onDetail}
          />
        ))}
      </div>
    </div>
  );
}

function DetailDrawer({
  carrinho,
  referenceDate,
  onClose,
}: {
  carrinho: Carrinho;
  referenceDate: string;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState<string | null>(null);
  const [drawerState, setDrawerState] = useState<"open" | "closing">("open");
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const closeTimerRef = useRef<number | null>(null);

  const requestClose = useCallback(() => {
    if (closeTimerRef.current !== null) {
      return;
    }

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduceMotion) {
      onClose();
      return;
    }

    setDrawerState("closing");
    closeTimerRef.current = window.setTimeout(() => {
      closeTimerRef.current = null;
      onClose();
    }, DETAIL_DRAWER_ANIMATION_MS);
  }, [onClose]);

  useEffect(() => {
    closeButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        requestClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [requestClose]);

  useEffect(() => {
    return () => {
      if (closeTimerRef.current !== null) {
        window.clearTimeout(closeTimerRef.current);
      }
    };
  }, []);

  function copyValue(key: string, value: string) {
    navigator.clipboard.writeText(value).catch(() => {});
    setCopied(key);
    window.setTimeout(() => setCopied(null), 1400);
  }

  const contactText = [
    carrinho.customerName,
    carrinho.customerPhone,
    carrinho.customerEmail,
    carrinho.externalCartId,
  ]
    .filter(Boolean)
    .join("\n");
  const itemSummary = carrinho.items
    .map((item) => `${item.productName} · ${item.variation}`)
    .join(", ");

  return (
    <div
      className="flynow-detail-drawer fixed inset-0 z-[70]"
      data-state={drawerState}
    >
      <button
        type="button"
        aria-label="Fechar detalhes"
        onClick={requestClose}
        className="flynow-detail-drawer__overlay absolute inset-0 cursor-default bg-black/58 backdrop-blur-[10px]"
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="carrinho-detail-drawer-title"
        className="flynow-detail-drawer__panel absolute inset-y-0 right-0 flex w-full max-w-[560px] flex-col border-l border-white/[0.09] bg-[#08090B]/96 shadow-[-28px_0_80px_rgba(0,0,0,0.62),inset_1px_0_0_rgba(255,255,255,0.045)] backdrop-blur-2xl"
      >
        <div className="border-b border-white/[0.07] p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--fly-brand-strong)]">
                Carrinho
              </p>
              <h2
                id="carrinho-detail-drawer-title"
                className="mt-2 truncate text-xl font-semibold leading-none text-[var(--fly-text)]"
              >
                {carrinho.customerName}
              </h2>
              <p className="mt-2 font-mono text-xs font-semibold text-[var(--fly-brand-strong)]">
                {carrinho.externalCartId}
              </p>
            </div>
            <button
              ref={closeButtonRef}
              type="button"
              aria-label="Fechar"
              onClick={requestClose}
              className="inline-flex size-9 shrink-0 items-center justify-center rounded-[8px] border border-white/[0.07] bg-white/[0.035] text-[var(--fly-text-muted)] outline-none transition-colors duration-150 hover:border-white/[0.12] hover:bg-white/[0.055] hover:text-[var(--fly-text)] focus-visible:ring-2 focus-visible:ring-[var(--fly-brand-ring)]"
            >
              <X aria-hidden="true" className="size-4" />
            </button>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <StatusBadge
              label={CARRINHO_STATUS_LABELS[carrinho.status]}
              className={STATUS_BADGE_STYLES[carrinho.status]}
              dotClassName={getStatusDotClass(carrinho.status)}
            />
            <StatusBadge
              label={CARRINHO_ETAPA_LABELS[carrinho.stage]}
              className={STAGE_BADGE_STYLES[carrinho.stage]}
            />
            <span className="ml-auto text-base font-semibold tabular-nums text-[var(--fly-text)]">
              {formatCurrency(carrinho.potentialValue)}
            </span>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
          <div className="grid gap-3">
            <DetailSection
              title="Cliente"
              rows={[
                ["Nome", carrinho.customerName],
                ["Telefone", carrinho.customerPhone],
                ["E-mail", carrinho.customerEmail],
                ["CPF", carrinho.customerDocument],
              ]}
              action={
                <button
                  type="button"
                  onClick={() => copyValue("contact", contactText)}
                  className="inline-flex h-8 items-center gap-2 rounded-[7px] border border-[var(--fly-border)] bg-[var(--fly-control)] px-2.5 text-xs font-semibold text-[var(--fly-text-soft)] outline-none transition-colors duration-150 hover:bg-[var(--fly-control-hover)] focus-visible:ring-2 focus-visible:ring-[var(--fly-brand-ring)]"
                >
                  {copied === "contact" ? (
                    <Check aria-hidden="true" className="size-3.5 text-[#86EFAC]" />
                  ) : (
                    <Copy aria-hidden="true" className="size-3.5" />
                  )}
                  Copiar
                </button>
              }
            />

            <DetailSection
              title="Carrinho"
              rows={[
                ["Produto", carrinho.productGroup],
                ["Itens", itemSummary],
                ["Potes", carrinho.variation],
                ["Valor", formatCurrency(carrinho.potentialValue)],
                ["Etapa", CARRINHO_ETAPA_LABELS[carrinho.stage]],
              ]}
            />

            <DetailSection
              title="Operacao"
              rows={[
                ["Origem", CARRINHO_ORIGEM_LABELS[carrinho.origin]],
                ["Campanha", carrinho.campaign],
                ["Criado em", formatDateTime(carrinho.createdAt)],
                ["Ultima atividade", formatDateTime(carrinho.lastActivityAt)],
                [
                  "Recuperacao",
                  CARRINHO_RECOVERY_STATUS_LABELS[carrinho.recoveryStatus],
                ],
                [
                  "Canal",
                  carrinho.recoveryChannel
                    ? CARRINHO_RECOVERY_CHANNEL_LABELS[carrinho.recoveryChannel]
                    : null,
                ],
                ["Proxima acao", formatDateTime(carrinho.nextActionAt)],
                [
                  "Recuperado",
                  carrinho.recoveredValue
                    ? formatCurrency(carrinho.recoveredValue)
                    : null,
                ],
              ]}
            />

            <TimelineSection carrinho={carrinho} referenceDate={referenceDate} />
            <NextStepsSection carrinho={carrinho} />
          </div>
        </div>
      </aside>
    </div>
  );
}

function DetailSection({
  title,
  rows,
  action,
}: {
  title: string;
  rows: Array<[string, string | number | null | undefined]>;
  action?: ReactNode;
}) {
  return (
    <section className="rounded-[8px] border border-white/[0.07] bg-[#0B0D10] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.035)]">
      <div className="mb-2 flex items-center justify-between gap-3">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--fly-text-muted)]">
          {title}
        </h3>
        {action}
      </div>
      <div className="divide-y divide-white/[0.055]">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between gap-4 py-2">
            <span className="shrink-0 text-xs text-[var(--fly-text-muted)]">
              {label}
            </span>
            <span className="min-w-0 truncate text-right text-sm font-medium text-[var(--fly-text-soft)]">
              {value ?? "-"}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

function TimelineSection({
  carrinho,
  referenceDate,
}: {
  carrinho: Carrinho;
  referenceDate: string;
}) {
  return (
    <section className="rounded-[8px] border border-white/[0.07] bg-[#0B0D10] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.035)]">
      <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--fly-text-muted)]">
        Timeline
      </h3>
      <div className="mt-3 space-y-3">
        {carrinho.timeline.map((event) => {
          const dotClass =
            event.tone === "brand" ? "bg-[#D6A84F]" : "bg-white/30";

          return (
            <div key={event.id} className="grid grid-cols-[14px_minmax(0,1fr)] gap-2">
              <span className="relative mt-1.5 flex justify-center">
                <span aria-hidden="true" className={cn("size-2 rounded-full", dotClass)} />
              </span>
              <div className="min-w-0">
                <div className="flex items-start justify-between gap-3">
                  <p className="truncate text-sm font-medium text-[var(--fly-text-soft)]">
                    {event.label}
                  </p>
                  <span className="shrink-0 text-[11px] text-[var(--fly-text-muted)]">
                    {formatTimeAgo(event.occurredAt, referenceDate)}
                  </span>
                </div>
                <p className="mt-0.5 text-xs leading-5 text-[var(--fly-text-muted)]">
                  {event.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function NextStepsSection({ carrinho }: { carrinho: Carrinho }) {
  return (
    <section className="rounded-[8px] border border-white/[0.07] bg-[#0B0D10] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.035)]">
      <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--fly-text-muted)]">
        Proximos passos
      </h3>
      <div className="mt-3 space-y-2">
        {carrinho.nextSteps.map((step) => (
          <div
            key={step.id}
            className="rounded-[8px] border border-white/[0.055] bg-white/[0.018] p-2.5"
          >
            <div className="flex items-start gap-2">
              <span
                aria-hidden="true"
                className={cn(
                  "mt-1 h-7 w-px shrink-0 rounded-full",
                  step.priority === "high"
                    ? "bg-gradient-to-b from-[#D6A84F]/70 via-[#D6A84F]/28 to-transparent"
                    : "bg-gradient-to-b from-white/[0.18] via-white/[0.08] to-transparent"
                )}
              />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[var(--fly-text-soft)]">
                  {step.title}
                </p>
                <p className="mt-1 text-xs leading-5 text-[var(--fly-text-muted)]">
                  {step.description}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default function CarrinhosClientView({
  carrinhos,
  dataSource,
  dataWarning,
  periodoInicial,
  resumoInicial,
  funilInicial,
  referenceDate,
}: CarrinhosClientViewProps) {
  const router = useRouter();
  const [status, setStatus] = useState<LoadStatus>("success");
  const refreshTimerRef = useRef<number | null>(null);
  const [view, setView] = useState<ViewMode>("tabela");
  const [activeRange, setActiveRange] = useState<CarrinhoPeriodoPreset | "custom">(
    () => getRangePresetKey(periodoInicial)
  );
  const [range, setRange] = useState(periodoInicial);
  const maxSelectableDate = useMemo(() => new Date(), []);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [stageFilter, setStageFilter] = useState("all");
  const [product, setProduct] = useState("all");
  const [originCampaign, setOriginCampaign] = useState("all");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [pageSize, setPageSize] = useState<number>(25);
  const [page, setPage] = useState(1);
  const [selectedCarrinho, setSelectedCarrinho] = useState<Carrinho | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(
    dataWarning ?? null
  );
  const [clearedInitialError, setClearedInitialError] = useState(false);
  const isCompactLayout = useMediaQuery("(max-width: 1023px)");
  const deferredQuery = useDeferredValue(query);

  useEffect(() => {
    setRange(periodoInicial);
    setActiveRange(getRangePresetKey(periodoInicial));
    setStatus("success");
    setActionNotice(dataWarning ?? null);
  }, [dataWarning, periodoInicial.endDate, periodoInicial.startDate]);

  useEffect(() => {
    const hasErrorScenario =
      new URLSearchParams(window.location.search).get("mockCarrinhos") ===
      "error";

    setStatus(hasErrorScenario && !clearedInitialError ? "error" : "success");
  }, [clearedInitialError]);

  useEffect(() => {
    return () => {
      if (refreshTimerRef.current !== null) {
        window.clearTimeout(refreshTimerRef.current);
      }
    };
  }, []);

  const periodCarrinhos = useMemo(() => {
    return carrinhos.filter((carrinho) => {
      const activityDate = toDateInput(carrinho.lastActivityAt);
      return activityDate >= range.startDate && activityDate <= range.endDate;
    });
  }, [carrinhos, range.endDate, range.startDate]);

  const periodMetrics = useMemo(() => {
    if (
      periodCarrinhos.length === carrinhos.length &&
      range.startDate === periodoInicial.startDate &&
      range.endDate === periodoInicial.endDate
    ) {
      return {
        resumo: resumoInicial,
        funil: funilInicial,
      };
    }

    return {
      resumo: getCarrinhosResumo(periodCarrinhos),
      funil: getCarrinhosFunil(periodCarrinhos),
    };
  }, [
    carrinhos.length,
    funilInicial,
    periodCarrinhos,
    periodoInicial.endDate,
    periodoInicial.startDate,
    range.endDate,
    range.startDate,
    resumoInicial,
  ]);

  const products = useMemo(() => {
    return Array.from(
      new Set(carrinhos.map((carrinho) => carrinho.productGroup).filter(Boolean))
    ).sort((first, second) => first.localeCompare(second));
  }, [carrinhos]);

  const originOptions = useMemo(() => getOriginOptions(carrinhos), [carrinhos]);

  const filteredCarrinhos = useMemo(() => {
    const normalizedQuery = deferredQuery.trim().toLowerCase();

    return periodCarrinhos.filter((carrinho) => {
      if (statusFilter !== "all" && carrinho.status !== statusFilter) {
        return false;
      }

      if (stageFilter !== "all" && carrinho.stage !== stageFilter) {
        return false;
      }

      if (product !== "all" && carrinho.productGroup !== product) {
        return false;
      }

      if (originCampaign !== "all") {
        const [filterType, filterValue] = originCampaign.split(":");

        if (filterType === "origin" && carrinho.origin !== filterValue) {
          return false;
        }

        if (filterType === "campaign" && carrinho.campaign !== filterValue) {
          return false;
        }
      }

      if (
        normalizedQuery &&
        !getCarrinhoSearchText(carrinho).includes(normalizedQuery)
      ) {
        return false;
      }

      return true;
    });
  }, [
    deferredQuery,
    originCampaign,
    periodCarrinhos,
    product,
    stageFilter,
    statusFilter,
  ]);

  const filteredEventCount = useMemo(
    () =>
      filteredCarrinhos.reduce(
        (total, carrinho) => total + getCartEventCount(carrinho),
        0
      ),
    [filteredCarrinhos]
  );

  const totalPages = Math.max(Math.ceil(filteredCarrinhos.length / pageSize), 1);
  const pagination = useMemo<PaginationModel>(
    () => ({
      page: clampPage(page, totalPages),
      pageSize,
      totalItems: filteredCarrinhos.length,
      totalPages,
    }),
    [filteredCarrinhos.length, page, pageSize, totalPages]
  );

  const visibleCarrinhos = useMemo(() => {
    const safePage = clampPage(page, totalPages);
    const start = (safePage - 1) * pageSize;
    return filteredCarrinhos.slice(start, start + pageSize);
  }, [filteredCarrinhos, page, pageSize, totalPages]);

  const activeFilterCount =
    (query.trim() ? 1 : 0) +
    (statusFilter !== "all" ? 1 : 0) +
    (stageFilter !== "all" ? 1 : 0) +
    (product !== "all" ? 1 : 0) +
    (originCampaign !== "all" ? 1 : 0);

  const periodoLabel = formatCarrinhosRange(range.startDate, range.endDate);
  const isRefreshing = status === "refreshing";
  const contentVersion = `${range.startDate}:${range.endDate}`;
  const calendarValue = useMemo<RangeValue>(
    () => ({
      start: toCalendarDate(range.startDate),
      end: toCalendarDate(range.endDate),
    }),
    [range.endDate, range.startDate]
  );

  useEffect(() => {
    setPage(1);
  }, [originCampaign, pageSize, product, query, range, stageFilter, statusFilter]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const startDateRefresh = useCallback(() => {
    setStatus("refreshing");

    if (refreshTimerRef.current !== null) {
      window.clearTimeout(refreshTimerRef.current);
    }

    refreshTimerRef.current = window.setTimeout(() => {
      setStatus("success");
      refreshTimerRef.current = null;
    }, 760);
  }, []);

  const navigateToRange = useCallback((nextRange: { startDate: string; endDate: string }) => {
    const params = new URLSearchParams({
      endDate: nextRange.endDate,
      startDate: nextRange.startDate,
    });

    router.push(`/carrinhos?${params.toString()}`);
  }, [router]);

  const applyPreset = useCallback((preset: CarrinhoPeriodoPreset) => {
    const nextRange = getPresetCarrinhosRange(preset);
    const didChange =
      nextRange.startDate !== range.startDate ||
      nextRange.endDate !== range.endDate;

    setActiveRange(preset);
    if (didChange) {
      startDateRefresh();
      navigateToRange(nextRange);
    }
    setRange(nextRange);
  }, [navigateToRange, range.endDate, range.startDate, startDateRefresh]);

  const selectCalendarRange = useCallback((value: RangeValue | null) => {
    if (!value?.start || !value.end) return;

    const normalizedRange = normalizeCarrinhoRange(
      toCarrinhoDateString(value.start),
      toCarrinhoDateString(value.end)
    );
    const didChange =
      normalizedRange.startDate !== range.startDate ||
      normalizedRange.endDate !== range.endDate;

    setActiveRange("custom");
    if (didChange) {
      startDateRefresh();
      navigateToRange(normalizedRange);
    }
    setRange(normalizedRange);
  }, [navigateToRange, range.endDate, range.startDate, startDateRefresh]);

  const retry = useCallback(() => {
    setClearedInitialError(true);
    setStatus("success");
  }, []);

  const clearFilters = useCallback(() => {
    setQuery("");
    setStatusFilter("all");
    setStageFilter("all");
    setProduct("all");
    setOriginCampaign("all");
    setFiltersOpen(false);
  }, []);

  return (
    <>
      <DashboardHeader
        title="Carrinhos"
        description={
          dataSource === "real"
            ? "Eventos PayT de checkout e abandono no periodo"
            : "Mock visual de checkout e abandono no periodo"
        }
        actions={
          <HeaderActions
            activeRange={activeRange}
            calendarValue={calendarValue}
            maxDate={maxSelectableDate}
            onCalendarChange={selectCalendarRange}
            onPresetSelect={applyPreset}
          />
        }
      />

      <div className="min-w-0 overflow-x-clip px-3.5 pb-28 pt-4 sm:px-5 sm:pt-5 xl:px-6 xl:pb-10 xl:pt-6">
        {status === "initial-loading" ? <CarrinhosSkeleton /> : null}

        {status === "error" ? <ErrorState onRetry={retry} /> : null}

        {status !== "initial-loading" && status !== "error" ? (
          <div
            key={contentVersion}
            aria-busy={isRefreshing}
            className={cn(
              "flynow-dashboard-content relative flex flex-col gap-4 sm:gap-5",
              isRefreshing && "flynow-dashboard-content--refreshing"
            )}
          >
            {actionNotice ? (
              <ActionNotice
                message={actionNotice}
                onDismiss={() => setActionNotice(null)}
              />
            ) : null}

            <div
              className="flynow-dashboard-enter-item"
              style={{ "--flynow-enter-delay": "0ms" } as CSSProperties}
            >
              <OverviewPanel
                resumo={periodMetrics.resumo}
              />
            </div>

            <div
              className="flynow-dashboard-enter-item"
              style={{ "--flynow-enter-delay": "70ms" } as CSSProperties}
            >
              <FunnelPanel funil={periodMetrics.funil} />
            </div>

            <div
              className="flynow-dashboard-enter-item"
              style={{ "--flynow-enter-delay": "110ms" } as CSSProperties}
            >
              <div className="space-y-4">
                <SummaryStrip
                  filteredCount={filteredCarrinhos.length}
                  filteredEventCount={filteredEventCount}
                  periodoLabel={periodoLabel}
                  view={view}
                  onViewChange={setView}
                />

                <section className="overflow-hidden rounded-[8px] border border-white/[0.07] bg-[#0B0D10] shadow-[0_1px_0_rgba(255,255,255,0.03),inset_0_1px_0_rgba(255,255,255,0.035)]">
                  <FilterPanel
                    query={query}
                    statusFilter={statusFilter}
                    stageFilter={stageFilter}
                    product={product}
                    originCampaign={originCampaign}
                    products={products}
                    originOptions={originOptions}
                    filtersOpen={filtersOpen}
                    activeFilterCount={activeFilterCount}
                    onQueryChange={setQuery}
                    onStatusFilterChange={setStatusFilter}
                    onStageFilterChange={setStageFilter}
                    onProductChange={setProduct}
                    onOriginCampaignChange={setOriginCampaign}
                    onFiltersOpenChange={setFiltersOpen}
                    onClearFilters={clearFilters}
                  />

                  {filteredCarrinhos.length === 0 ? (
                    <EmptyState
                      title="Nenhum carrinho encontrado"
                      description="Ajuste busca, filtros ou periodo para voltar a visualizar a fila."
                    />
                  ) : view === "tabela" ? (
                    <div id="carrinhos-view-tabela" role="tabpanel">
                      {isCompactLayout === true ? (
                        <MobileCartsList
                          carrinhos={visibleCarrinhos}
                          referenceDate={referenceDate}
                          onDetail={setSelectedCarrinho}
                        />
                      ) : null}
                      {isCompactLayout !== true ? (
                        <CartsTable
                          carrinhos={visibleCarrinhos}
                          onDetail={setSelectedCarrinho}
                        />
                      ) : null}
                    </div>
                  ) : (
                    <div id="carrinhos-view-kanban" role="tabpanel">
                      <KanbanBoard
                        carrinhos={visibleCarrinhos}
                        referenceDate={referenceDate}
                        onDetail={setSelectedCarrinho}
                      />
                    </div>
                  )}

                  <PaginationControls
                    model={pagination}
                    onPageChange={(nextPage) =>
                      setPage(clampPage(nextPage, totalPages))
                    }
                    onPageSizeChange={setPageSize}
                  />
                </section>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {selectedCarrinho ? (
        <DetailDrawer
          carrinho={selectedCarrinho}
          referenceDate={referenceDate}
          onClose={() => setSelectedCarrinho(null)}
        />
      ) : null}
    </>
  );
}
