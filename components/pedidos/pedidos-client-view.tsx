"use client";

import type { CSSProperties } from "react";
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
  Clock3,
  Columns3,
  Copy,
  Download,
  ExternalLink,
  Filter,
  Inbox,
  List,
  Loader2,
  PackageCheck,
  PackageOpen,
  RefreshCw,
  Search,
  Truck,
  X,
} from "lucide-react";
import { DropdownMenu as RadixDropdownMenu } from "radix-ui";

import { DashboardHeader } from "@/components/layout/dashboard-header";
import { Calendar, type RangeValue } from "@/components/ui/calendar";
import { cn, formatCurrency } from "@/lib/utils";
import {
  PEDIDO_CANAL_LABELS,
  PEDIDO_FORMA_PAGAMENTO_LABELS,
  PEDIDO_LOGISTICS_PIPELINE,
  PEDIDO_STATUS_LOGISTICO_LABELS,
  PEDIDO_STATUS_PAGAMENTO_LABELS,
  formatPedidosRange,
  getPedidosContagemPorStatus,
  getPedidosFinanceiroResumo,
  getPedidosValorPago,
  getPresetPedidosRange,
  type Pedido,
  type PedidoFinanceiroResumo,
  type PedidoPeriodoPreset,
  type PedidoStatusLogistico,
  type PedidoStatusPagamento,
} from "@/lib/pedidos";

type ViewMode = "tabela" | "kanban";
type LoadStatus = "initial-loading" | "success" | "error" | "refreshing";

type PedidosClientViewProps = {
  pedidos: Pedido[];
  periodoInicial: {
    startDate: string;
    endDate: string;
  };
  contagemInicial: Record<PedidoStatusLogistico, number>;
  financeiroInicial: PedidoFinanceiroResumo;
  valorPagoInicial: number;
};

type PresetOption = {
  key: PedidoPeriodoPreset;
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
const KANBAN_COLUMN_CARD_LIMIT = 12;

const PERIOD_PRESETS: PresetOption[] = [
  { key: "today", label: "Hoje", displayLabel: "Hoje" },
  { key: "7d", label: "Ultimos 7 dias", displayLabel: "7D" },
  { key: "15d", label: "Ultimos 15 dias", displayLabel: "15D" },
  { key: "30d", label: "Ultimos 30 dias", displayLabel: "30D" },
  { key: "month", label: "Este mes", displayLabel: "Mes" },
];

const LOGISTICS_FILTERS: Array<{
  value: "all" | PedidoStatusLogistico;
  label: string;
}> = [
  { value: "all", label: "Status logistico" },
  ...PEDIDO_LOGISTICS_PIPELINE.map((status) => ({
    value: status,
    label: PEDIDO_STATUS_LOGISTICO_LABELS[status],
  })),
];

const PAYMENT_FILTERS: Array<{
  value: "all" | PedidoStatusPagamento;
  label: string;
}> = [
  { value: "all", label: "Status pago" },
  { value: "paid", label: PEDIDO_STATUS_PAGAMENTO_LABELS.paid },
  {
    value: "waiting_payment",
    label: PEDIDO_STATUS_PAGAMENTO_LABELS.waiting_payment,
  },
  { value: "refunded", label: PEDIDO_STATUS_PAGAMENTO_LABELS.refunded },
  { value: "chargeback", label: PEDIDO_STATUS_PAGAMENTO_LABELS.chargeback },
  { value: "cancelled", label: PEDIDO_STATUS_PAGAMENTO_LABELS.cancelled },
];

const LOGISTICS_BADGE_STYLES: Record<PedidoStatusLogistico, string> = {
  pago: "flynow-status-badge--blue",
  nota_fiscal: "flynow-status-badge--cyan",
  separacao: "flynow-status-badge--violet",
  aguardando_postagem: "flynow-status-badge--warning",
  postado: "flynow-status-badge--blue",
  em_transporte: "flynow-status-badge--indigo",
  aguardando_retirada: "flynow-status-badge--orange",
  entregue: "flynow-status-badge--success",
  devolvido: "flynow-status-badge--danger",
};

const PAYMENT_BADGE_STYLES: Record<PedidoStatusPagamento, string> = {
  paid: "flynow-status-badge--success",
  waiting_payment: "flynow-status-badge--warning",
  refunded: "flynow-status-badge--orange",
  chargeback: "flynow-status-badge--danger",
  cancelled: "flynow-status-badge--neutral",
};

const PEDIDOS_TIMEZONE = "America/Sao_Paulo";

function toCalendarDate(value: string) {
  return new Date(`${value}T12:00:00`);
}

function toPedidoDateString(value: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: PEDIDOS_TIMEZONE,
    year: "numeric",
  }).formatToParts(value);
  const dateParts = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value])
  );

  return `${dateParts.year}-${dateParts.month}-${dateParts.day}`;
}

function normalizePedidoRange(startDate: string, endDate: string) {
  return startDate <= endDate
    ? { startDate, endDate }
    : { startDate: endDate, endDate: startDate };
}

function toDateInput(value: string | null) {
  if (!value) return "";
  return value.slice(0, 10);
}

function formatDate(value: string | null, options?: Intl.DateTimeFormatOptions) {
  if (!value) return "-";

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
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

function clampPage(page: number, totalPages: number) {
  return Math.min(Math.max(page, 1), Math.max(totalPages, 1));
}

function getPedidoSearchText(pedido: Pedido) {
  return [
    pedido.customerName,
    pedido.customerEmail,
    pedido.customerPhone,
    pedido.paytTransactionId,
    pedido.trackingCode,
    pedido.productGroup,
    pedido.productName,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function getPaymentDotClass(status: PedidoStatusPagamento) {
  if (status === "paid") return "flynow-status-dot--success";
  if (status === "chargeback") return "flynow-status-dot--danger";
  if (status === "refunded") return "flynow-status-dot--orange";
  if (status === "waiting_payment") return "flynow-status-dot--warning";
  return "flynow-status-dot--neutral";
}

function getIssueLabel(issue: Pedido["issue"]) {
  if (issue === "chargeback") return "Chargeback";
  if (issue === "reembolso") return "Reembolso";
  if (issue === "atrasado") return "Atrasado";
  return null;
}

function getCompactPaymentLabel(status: PedidoStatusPagamento) {
  if (status === "waiting_payment") return "Aguardando";
  if (status === "refunded") return "Reembolso";
  if (status === "cancelled") return "Cancelado";
  return PEDIDO_STATUS_PAGAMENTO_LABELS[status];
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

function PaymentStatusInline({
  status,
  paidAt,
  className,
}: {
  status: PedidoStatusPagamento;
  paidAt?: string | null;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex min-w-0 items-center gap-2 text-xs font-medium text-[var(--fly-text-muted)]",
        className
      )}
    >
      <span
        aria-hidden="true"
        className={cn("flynow-status-dot size-1.5 rounded-full", getPaymentDotClass(status))}
      />
      <span className="truncate text-[var(--fly-text-soft)]">
        {PEDIDO_STATUS_PAGAMENTO_LABELS[status]}
      </span>
      {paidAt ? (
        <span className="hidden shrink-0 text-[11px] text-[var(--fly-text-dim)] xl:inline">
          {formatDate(paidAt)}
        </span>
      ) : null}
    </span>
  );
}

function MobilePaymentSignal({ status }: { status: PedidoStatusPagamento }) {
  const toneClass =
    status === "paid"
      ? "text-[var(--fly-text-muted)]"
      : status === "chargeback" || status === "cancelled"
        ? "text-[var(--fly-danger-strong)]"
        : "text-[var(--fly-brand-strong)]";

  return (
    <span className="inline-flex max-w-full items-center justify-end gap-1.5 text-[10px] font-medium leading-none">
      <span
        aria-hidden="true"
        className={cn("flynow-status-dot size-1.5 rounded-full", getPaymentDotClass(status))}
      />
      <span className={cn("truncate", toneClass)}>
        {getCompactPaymentLabel(status)}
      </span>
    </span>
  );
}

function IssueIndicator({ issue }: { issue: Pedido["issue"] }) {
  const label = getIssueLabel(issue);

  if (!label) return null;

  return (
    <span className="inline-flex max-w-full items-center gap-1.5 rounded-[7px] border border-[var(--fly-danger-border)] bg-[var(--fly-danger-bg)] px-2 py-1 text-[11px] font-semibold leading-none text-[var(--fly-danger-strong)]">
      <AlertTriangle aria-hidden="true" className="size-3 shrink-0" />
      <span className="truncate">{label}</span>
    </span>
  );
}

function HeaderIconButton({
  children,
  ariaLabel,
  title,
  onClick,
  variant = "default",
  disabled,
}: {
  children: React.ReactNode;
  ariaLabel: string;
  title: string;
  onClick?: () => void;
  variant?: "default" | "brand";
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex size-10 shrink-0 items-center justify-center rounded-xl border outline-none transition-colors duration-150 focus-visible:ring-2 sm:size-8 sm:rounded-[10px]",
        variant === "brand"
          ? "border-[var(--fly-brand-border)] bg-[var(--fly-brand-surface)] text-[var(--fly-brand-strong)] hover:bg-[var(--fly-brand-surface-hover)] focus-visible:ring-[var(--fly-brand-ring)]"
          : "border-[var(--fly-border)] bg-[var(--fly-control)] text-[var(--fly-text-soft)] hover:border-[var(--fly-border-strong)] hover:bg-[var(--fly-control-hover)] hover:text-[var(--fly-text)] focus-visible:ring-[var(--fly-brand-ring)]",
        disabled && "opacity-60"
      )}
    >
      {children}
    </button>
  );
}

function HeaderActions({
  activeRange,
  calendarValue,
  isRefreshing,
  maxDate,
  onCalendarChange,
  onPresetSelect,
  onImport,
  onSync,
}: {
  activeRange: PedidoPeriodoPreset | "custom";
  calendarValue: RangeValue | null;
  isRefreshing: boolean;
  maxDate: Date;
  onCalendarChange: (value: RangeValue | null) => void;
  onPresetSelect: (preset: PedidoPeriodoPreset) => void;
  onImport: () => void;
  onSync: () => void;
}) {
  const presetGroupRef = useRef<HTMLDivElement | null>(null);
  const presetButtonRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const activePreset = PERIOD_PRESETS.find((preset) => preset.key === activeRange);
  const isCustomRange =
    activeRange === "custom" && Boolean(calendarValue?.start && calendarValue.end);
  const [presetUnderline, setPresetUnderline] = useState({
    x: 0,
    y: 0,
    width: 0,
    visible: false,
  });

  const updatePresetUnderline = useCallback(() => {
    const group = presetGroupRef.current;
    const activeButton = activePreset
      ? presetButtonRefs.current[activePreset.key]
      : null;

    if (!group || !activeButton) {
      setPresetUnderline((currentUnderline) =>
        currentUnderline.visible
          ? { ...currentUnderline, visible: false }
          : currentUnderline
      );
      return;
    }

    const nextUnderline = {
      x: activeButton.offsetLeft + 8,
      y: activeButton.offsetTop + activeButton.offsetHeight - 5,
      width: Math.max(activeButton.offsetWidth - 16, 12),
      visible: true,
    };

    setPresetUnderline((currentUnderline) => {
      if (
        currentUnderline.visible === nextUnderline.visible &&
        Math.abs(currentUnderline.x - nextUnderline.x) < 0.5 &&
        Math.abs(currentUnderline.y - nextUnderline.y) < 0.5 &&
        Math.abs(currentUnderline.width - nextUnderline.width) < 0.5
      ) {
        return currentUnderline;
      }

      return nextUnderline;
    });
  }, [activePreset]);

  useEffect(() => {
    const animationFrame = window.requestAnimationFrame(updatePresetUnderline);

    return () => window.cancelAnimationFrame(animationFrame);
  }, [updatePresetUnderline]);

  useEffect(() => {
    const group = presetGroupRef.current;

    if (!group) {
      return;
    }

    const handleResize = () => updatePresetUnderline();
    window.addEventListener("resize", handleResize);
    group.addEventListener("scroll", handleResize, { passive: true });

    const resizeObserver =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(updatePresetUnderline)
        : null;

    resizeObserver?.observe(group);

    if (activePreset) {
      const activeButton = presetButtonRefs.current[activePreset.key];

      if (activeButton) {
        resizeObserver?.observe(activeButton);
      }
    }

    return () => {
      window.removeEventListener("resize", handleResize);
      group.removeEventListener("scroll", handleResize);
      resizeObserver?.disconnect();
    };
  }, [activePreset, updatePresetUnderline]);

  const presetUnderlineStyle = {
    "--flynow-preset-underline-x": `${presetUnderline.x}px`,
    "--flynow-preset-underline-y": `${presetUnderline.y}px`,
    "--flynow-preset-underline-width": `${presetUnderline.width}px`,
  } as CSSProperties;

  return (
    <div className="contents lg:flex lg:w-auto lg:min-w-0 lg:flex-col lg:items-end lg:gap-2">
      <div
        role="group"
        aria-label="Ações e período dos pedidos"
        className="flynow-period-filter contents lg:flex lg:w-auto lg:max-w-full lg:flex-row lg:items-center lg:gap-1.5 lg:rounded-[14px] lg:border lg:border-[var(--fly-border)] lg:bg-[var(--fly-surface-elevated)] lg:p-1.5 lg:shadow-[0_18px_42px_rgba(0,0,0,0.28),inset_0_1px_0_rgba(255,255,255,0.035)]"
      >
        <div className="col-start-2 row-start-1 flex min-w-0 items-center justify-end gap-1.5 self-center lg:col-auto lg:row-auto">
          <HeaderIconButton
            ariaLabel="Importar histórico"
            title="Importar histórico"
            onClick={onImport}
          >
            <Download aria-hidden="true" className="size-3.5" />
          </HeaderIconButton>
          <HeaderIconButton
            ariaLabel={isRefreshing ? "Sincronizando H7" : "Sincronizar H7"}
            title={isRefreshing ? "Sincronizando H7" : "Sincronizar H7"}
            onClick={onSync}
            disabled={isRefreshing}
            variant="brand"
          >
            {isRefreshing ? (
              <Loader2 aria-hidden="true" className="size-3.5 animate-spin" />
            ) : (
              <RefreshCw aria-hidden="true" className="size-3.5" />
            )}
          </HeaderIconButton>

          <div className="flynow-date-picker dark min-w-0 lg:w-auto">
            <Calendar
              value={calendarValue}
              onChange={onCalendarChange}
              horizontalLayout
              showTimeInput={false}
              maxValue={maxDate}
              popoverAlignment="end"
              triggerActive={isCustomRange}
              compactMobileLabel
              className="w-auto lg:w-auto"
              triggerClassName={cn(
                "!h-10 !w-[132px] !rounded-xl !border-[var(--fly-border)] !bg-[var(--fly-control)] !px-3 !text-[11px] !font-medium !text-[var(--fly-text-soft)] !shadow-[inset_0_1px_0_rgba(255,255,255,0.035)] hover:!border-[var(--fly-border-strong)] hover:!bg-[var(--fly-control-hover)] min-[390px]:!w-[140px] sm:!h-8 sm:!w-[236px] sm:!rounded-full sm:!px-2.5 lg:!rounded-xl lg:!border-[var(--fly-border-strong)] lg:!bg-[var(--fly-control-solid)] lg:!text-xs lg:!shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] lg:hover:!bg-[var(--fly-control-hover)]",
                isCustomRange
                  ? "!border-[var(--fly-brand-border)] !text-[var(--fly-text)] !shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_8px_24px_rgba(214,168,79,0.08)]"
                  : "lg:!text-[var(--fly-text-soft)]"
              )}
              popoverClassName="!z-50 !border-[var(--fly-brand-border)] !bg-[var(--fly-surface-elevated)]"
            />
          </div>
        </div>

        <div
          aria-hidden="true"
          className="hidden h-5 w-px bg-[var(--fly-border)] lg:block"
        />

        <div
          ref={presetGroupRef}
          role="group"
          aria-label="Selecionar período"
          className="flynow-period-presets relative col-span-2 row-start-2 -mx-4 flex max-w-[calc(100vw-1px)] gap-1 overflow-x-auto overscroll-x-contain px-4 pb-1 pt-0.5 sm:-mx-5 sm:px-5 md:mx-0 md:grid md:w-full md:max-w-full md:grid-cols-5 md:overflow-visible md:px-0 md:pb-0 lg:col-auto lg:row-auto lg:flex lg:w-auto lg:items-center"
        >
          <span
            aria-hidden="true"
            className="flynow-preset-underline"
            data-visible={presetUnderline.visible ? "true" : "false"}
            style={presetUnderlineStyle}
          />
          {PERIOD_PRESETS.map((preset) => {
            const isActive = activeRange === preset.key;

            return (
              <button
                key={preset.key}
                ref={(element) => {
                  presetButtonRefs.current[preset.key] = element;
                }}
                type="button"
                title={preset.label}
                aria-label={preset.label}
                aria-pressed={isActive}
                onClick={() => onPresetSelect(preset.key)}
                className={cn(
                  "relative h-10 shrink-0 whitespace-nowrap rounded-xl px-3.5 text-xs font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D6A84F]/35 sm:h-8 sm:rounded-[10px] sm:px-3 md:shrink lg:min-w-10",
                  isActive
                    ? "bg-[var(--fly-control)] text-[var(--fly-text)] shadow-[inset_0_1px_0_rgba(255,255,255,0.025)] lg:bg-[var(--fly-control-active)] lg:shadow-[0_1px_0_rgba(255,255,255,0.05),0_10px_24px_rgba(0,0,0,0.28)]"
                    : "text-[var(--fly-text-muted)] hover:bg-[var(--fly-control)] hover:text-[var(--fly-text-soft)] lg:hover:bg-[var(--fly-control-solid)]"
                )}
              >
                {preset.displayLabel}
              </button>
            );
          })}
        </div>
      </div>
      <span className="sr-only">
        Período aplicado:{" "}
        {calendarValue?.start && calendarValue.end
          ? `${toPedidoDateString(calendarValue.start)} - ${toPedidoDateString(
              calendarValue.end
            )}`
          : "nenhum período selecionado"}
      </span>
    </div>
  );
}

function MetricPanel({
  label,
  value,
  supportingText,
  tone,
  rows,
}: {
  label: string;
  value: string;
  supportingText: string;
  tone: "gold" | "blue" | "green" | "red";
  rows: Array<{
    label: string;
    value: number;
    displayValue?: string;
    total?: number;
  }>;
}) {
  const dotClass = {
    gold: "bg-[#D6A84F]",
    blue: "bg-[#60A5FA]",
    green: "bg-[#4ADE80]",
    red: "bg-[#F87171]",
  }[tone];

  return (
    <section className="min-w-0 rounded-[8px] border border-white/[0.07] bg-[#0B0D10] p-4 shadow-[0_1px_0_rgba(255,255,255,0.03),inset_0_1px_0_rgba(255,255,255,0.035)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-2">
            <span aria-hidden="true" className={cn("size-1.5 rounded-full", dotClass)} />
            <p className="truncate text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--fly-text-muted)]">
              {label}
            </p>
          </div>
          <p className="mt-3 text-[24px] font-semibold leading-none tabular-nums text-[var(--fly-text)] sm:text-[28px]">
            {value}
          </p>
          <p className="mt-2 text-[12px] leading-5 text-[var(--fly-text-muted)]">
            {supportingText}
          </p>
        </div>
      </div>

      <div className="mt-4 space-y-2.5">
        {rows.map((row) => {
          const total = row.total ?? Math.max(...rows.map((item) => item.value), 1);
          const width = total > 0 ? Math.max((row.value / total) * 100, row.value > 0 ? 5 : 0) : 0;

          return (
            <div key={row.label} className="min-w-0">
              <div className="mb-1.5 flex items-center justify-between gap-3">
                <span className="truncate text-xs font-medium text-[var(--fly-text-soft)]">
                  {row.label}
                </span>
                <span className="shrink-0 text-xs font-semibold tabular-nums text-[var(--fly-text)]">
                  {row.displayValue ?? row.value.toLocaleString("pt-BR")}
                </span>
              </div>
              <div className="h-1 overflow-hidden rounded-full bg-white/[0.07]">
                <span
                  aria-hidden="true"
                  className={cn("block h-full rounded-full", dotClass)}
                  style={{ width: `${width}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function OverviewPanel({
  totalPedidos,
  valorPago,
  financeiro,
  contagem,
  pedidos,
}: {
  totalPedidos: number;
  valorPago: number;
  financeiro: PedidoFinanceiroResumo;
  contagem: Record<PedidoStatusLogistico, number>;
  pedidos: Pedido[];
}) {
  const ticketMedio = totalPedidos > 0 ? valorPago / totalPedidos : 0;
  const emExpedicao =
    contagem.nota_fiscal + contagem.separacao + contagem.aguardando_postagem;
  const emRota =
    contagem.postado + contagem.em_transporte + contagem.aguardando_retirada;
  const atrasados = pedidos.filter((pedido) => pedido.issue === "atrasado").length;
  const problemas =
    contagem.devolvido + financeiro.chargebacks + financeiro.reembolsos + atrasados;

  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      <MetricPanel
        label="Receita paga"
        value={formatCurrency(valorPago)}
        supportingText={`${totalPedidos.toLocaleString("pt-BR")} pedidos no periodo`}
        tone="gold"
        rows={[
          {
            label: "Ticket medio",
            value: Math.round(ticketMedio),
            displayValue: formatCurrency(ticketMedio),
            total: Math.max(ticketMedio, 1),
          },
          { label: "Pagos", value: pedidos.filter((pedido) => pedido.paymentStatus === "paid").length, total: totalPedidos },
        ]}
      />
      <MetricPanel
        label="Fila logistica"
        value={emExpedicao.toLocaleString("pt-BR")}
        supportingText="Pedidos antes da postagem"
        tone="blue"
        rows={[
          { label: "Nota fiscal", value: contagem.nota_fiscal, total: emExpedicao },
          { label: "Separacao", value: contagem.separacao, total: emExpedicao },
          { label: "Aguard. postagem", value: contagem.aguardando_postagem, total: emExpedicao },
        ]}
      />
      <MetricPanel
        label="Distribuicao"
        value={emRota.toLocaleString("pt-BR")}
        supportingText="Postados e em transito"
        tone="green"
        rows={[
          { label: "Postado", value: contagem.postado, total: emRota },
          { label: "Em transito", value: contagem.em_transporte, total: emRota },
          { label: "Saiu p/ entrega", value: contagem.aguardando_retirada, total: emRota },
        ]}
      />
      <MetricPanel
        label="Pontos de atencao"
        value={problemas.toLocaleString("pt-BR")}
        supportingText={`${formatCurrency(financeiro.valorChargebacks + financeiro.valorReembolsos)} revertidos`}
        tone="red"
        rows={[
          { label: "Chargebacks", value: financeiro.chargebacks, total: problemas },
          { label: "Reembolsos", value: financeiro.reembolsos, total: problemas },
          { label: "Devolvidos", value: contagem.devolvido, total: problemas },
          { label: "Atrasados", value: atrasados, total: problemas },
        ]}
      />
    </div>
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
      aria-label="Alternar visualização dos pedidos"
      className="flynow-period-filter grid w-full grid-cols-2 gap-1.5 rounded-[14px] border border-[var(--fly-border)] bg-[var(--fly-surface-elevated)] p-1.5 shadow-[0_18px_42px_rgba(0,0,0,0.24),inset_0_1px_0_rgba(255,255,255,0.035)] sm:w-auto"
    >
      <button
        type="button"
        role="tab"
        aria-selected={view === "tabela"}
        aria-controls="pedidos-view-tabela"
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
        aria-controls="pedidos-view-kanban"
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
          "group flex h-10 w-full min-w-0 items-center justify-between gap-2 rounded-xl border bg-[var(--fly-control)] px-3 text-left text-[11px] font-medium text-[var(--fly-text-soft)] shadow-[inset_0_1px_0_rgba(255,255,255,0.035)] outline-none transition-colors duration-150 hover:border-[var(--fly-border-strong)] hover:bg-[var(--fly-control-hover)] focus-visible:ring-2 focus-visible:ring-[var(--fly-brand-ring)] data-[state=open]:border-[var(--fly-brand-border)] data-[state=open]:bg-[var(--fly-control-hover)] lg:h-9 lg:w-[180px] lg:min-w-[180px] lg:rounded-[10px] lg:bg-[var(--fly-control-solid)] lg:text-xs lg:shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]",
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
          className="flynow-calendar-popover flynow-offer-select-content z-[80] max-h-[280px] w-[var(--radix-dropdown-menu-trigger-width)] min-w-[180px] overflow-y-auto rounded-xl border border-[var(--fly-brand-border)] bg-[var(--fly-surface-elevated)] p-1 text-[var(--fly-text)] shadow-[0_28px_90px_rgba(0,0,0,0.6),0_0_0_1px_rgba(255,255,255,0.045),inset_0_1px_0_rgba(255,255,255,0.13),inset_0_0_36px_rgba(255,255,255,0.035)] backdrop-blur-[28px] data-[side=bottom]:origin-top-right"
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
  logisticsStatus,
  paymentStatus,
  product,
  products,
  onlyIssues,
  filtersOpen,
  activeFilterCount,
  onQueryChange,
  onLogisticsStatusChange,
  onPaymentStatusChange,
  onProductChange,
  onOnlyIssuesChange,
  onFiltersOpenChange,
  onClearFilters,
}: {
  query: string;
  logisticsStatus: string;
  paymentStatus: string;
  product: string;
  products: string[];
  onlyIssues: boolean;
  filtersOpen: boolean;
  activeFilterCount: number;
  onQueryChange: (value: string) => void;
  onLogisticsStatusChange: (value: string) => void;
  onPaymentStatusChange: (value: string) => void;
  onProductChange: (value: string) => void;
  onOnlyIssuesChange: (value: boolean) => void;
  onFiltersOpenChange: (value: boolean) => void;
  onClearFilters: () => void;
}) {
  const logisticsLabel = LOGISTICS_FILTERS.find(
    (option) => option.value === logisticsStatus
  )?.label;
  const paymentLabel = PAYMENT_FILTERS.find(
    (option) => option.value === paymentStatus
  )?.label;

  return (
    <div className="border-b border-white/[0.06] p-3 sm:p-4">
      <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-center">
        <label className="relative min-w-0 flex-1">
          <span className="sr-only">Buscar pedido</span>
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--fly-text-dim)]"
          />
          <input
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Buscar cliente, e-mail, Payt ou rastreio"
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
            aria-controls="pedidos-filter-controls"
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
          {logisticsStatus !== "all" && logisticsLabel ? (
            <ActiveFilterChip
              label={`Logistica: ${logisticsLabel}`}
              onRemove={() => onLogisticsStatusChange("all")}
            />
          ) : null}
          {paymentStatus !== "all" && paymentLabel ? (
            <ActiveFilterChip
              label={`Pagamento: ${paymentLabel}`}
              onRemove={() => onPaymentStatusChange("all")}
            />
          ) : null}
          {product !== "all" ? (
            <ActiveFilterChip
              label={`Produto: ${product}`}
              onRemove={() => onProductChange("all")}
            />
          ) : null}
          {onlyIssues ? (
            <ActiveFilterChip
              label="Somente problemas"
              onRemove={() => onOnlyIssuesChange(false)}
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
        id="pedidos-filter-controls"
        className={cn(
          "mt-3 min-w-0 gap-2 sm:grid-cols-2 lg:items-center",
          filtersOpen ? "grid lg:flex" : "hidden"
        )}
      >
          <SelectControl
            label="Status logistico"
            displayLabel="Logistica"
            value={logisticsStatus}
            onChange={onLogisticsStatusChange}
            options={LOGISTICS_FILTERS}
          />
          <SelectControl
            label="Status de pagamento"
            displayLabel="Pagamento"
            value={paymentStatus}
            onChange={onPaymentStatusChange}
            options={PAYMENT_FILTERS}
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
          <button
            type="button"
            aria-pressed={onlyIssues}
            onClick={() => onOnlyIssuesChange(!onlyIssues)}
            className={cn(
              "inline-flex h-9 items-center justify-center gap-2 rounded-[8px] border px-3 text-xs font-semibold outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-[var(--fly-brand-ring)]",
              onlyIssues
                ? "border-[var(--fly-danger-border)] bg-[var(--fly-danger-bg)] text-[var(--fly-danger-strong)]"
                : "border-[var(--fly-border)] bg-[var(--fly-control)] text-[var(--fly-text-soft)] hover:border-[var(--fly-border-strong)] hover:bg-[var(--fly-control-hover)]"
            )}
          >
            <AlertTriangle aria-hidden="true" className="size-3.5" />
            Problemas
          </button>
      </div>
    </div>
  );
}

function SummaryStrip({
  filteredCount,
  totalPeriodCount,
  filteredValue,
  periodoLabel,
  view,
  onViewChange,
}: {
  filteredCount: number;
  totalPeriodCount: number;
  filteredValue: number;
  periodoLabel: string;
  view: ViewMode;
  onViewChange: (view: ViewMode) => void;
}) {
  return (
    <div className="flex flex-col gap-3 px-1 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-sm">
          <span className="font-semibold tabular-nums text-[var(--fly-text)]">
            {filteredCount.toLocaleString("pt-BR")} pedidos
          </span>
          <span className="text-[var(--fly-text-dim)]">·</span>
          <span className="font-semibold tabular-nums text-[var(--fly-brand-strong)]">
            {formatCurrency(filteredValue)}
          </span>
          <span className="text-xs font-medium text-[var(--fly-text-muted)]">
            receita paga
          </span>
        </div>
        <p className="mt-1 text-xs text-[var(--fly-text-dim)]">
          {periodoLabel} · base do periodo:{" "}
          {totalPeriodCount.toLocaleString("pt-BR")}
        </p>
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
            aria-label="Pedidos por pagina"
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

function OrdersTable({
  pedidos,
  onDetail,
}: {
  pedidos: Pedido[];
  onDetail: (pedido: Pedido) => void;
}) {
  return (
    <div className="hidden min-h-[520px] overflow-x-auto lg:block">
      <table className="w-full min-w-[980px] table-fixed text-left text-sm">
        <colgroup>
          <col className="w-[29%]" />
          <col className="w-[23%]" />
          <col className="w-[17%]" />
          <col className="w-[20%]" />
          <col className="w-[11%]" />
        </colgroup>
        <thead>
          <tr className="border-b border-white/[0.06] bg-white/[0.018] text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--fly-text-muted)]">
            <th className="px-4 py-3.5">Cliente</th>
            <th className="px-4 py-3.5">Produto</th>
            <th className="px-4 py-3.5">Financeiro</th>
            <th className="px-4 py-3.5">Entrega</th>
            <th className="py-3.5 pl-3 pr-8 text-right">
              <span className="sr-only">Detalhes</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/[0.055]">
          {pedidos.map((pedido) => (
            <tr
              key={pedido.id}
              className="group transition-colors duration-150 hover:bg-white/[0.018]"
            >
              <td className="px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-[var(--fly-text)]">
                    {pedido.customerName}
                  </p>
                  <div className="mt-1 flex min-w-0 items-center gap-2">
                    <span className="truncate text-xs text-[var(--fly-text-muted)]">
                      {pedido.customerEmail}
                    </span>
                    <span className="size-1 rounded-full bg-[var(--fly-border-strong)]" />
                    <span className="shrink-0 font-mono text-[11px] font-semibold text-[var(--fly-brand-strong)]">
                      {pedido.paytTransactionId}
                    </span>
                  </div>
                </div>
              </td>
              <td className="px-4 py-3">
                <p className="truncate text-sm font-medium text-[var(--fly-text-soft)]">
                  {pedido.productGroup ?? pedido.productName ?? "-"}
                </p>
                <div className="mt-1 flex min-w-0 items-center gap-2 text-xs text-[var(--fly-text-muted)]">
                  <span className="truncate">{PEDIDO_CANAL_LABELS[pedido.channel]}</span>
                  <span className="size-1 rounded-full bg-[var(--fly-border-strong)]" />
                  <span className="shrink-0 font-semibold tabular-nums text-[var(--fly-text-soft)]">
                    {pedido.jars ?? "-"} potes
                  </span>
                </div>
              </td>
              <td className="px-4 py-3">
                <p className="text-sm font-semibold tabular-nums text-[var(--fly-text)]">
                  {pedido.amount == null ? "-" : formatCurrency(pedido.amount)}
                </p>
                <PaymentStatusInline
                  status={pedido.paymentStatus}
                  paidAt={pedido.paidAt}
                  className="mt-1"
                />
              </td>
              <td className="px-4 py-3">
                <div className="flex min-w-0 flex-col items-start gap-1.5">
                  <div className="flex min-w-0 max-w-full items-center gap-2">
                    <StatusBadge
                      label={PEDIDO_STATUS_LOGISTICO_LABELS[pedido.logisticsStatus]}
                      className={LOGISTICS_BADGE_STYLES[pedido.logisticsStatus]}
                    />
                    <IssueIndicator issue={pedido.issue} />
                  </div>
                  {pedido.trackingCode ? (
                    <span className="block max-w-full truncate font-mono text-xs font-semibold text-[var(--fly-text-muted)]">
                      {pedido.trackingCode}
                    </span>
                  ) : (
                    <span className="text-xs text-[var(--fly-text-dim)]">
                      Sem rastreio
                    </span>
                  )}
                </div>
              </td>
              <td className="py-3 pl-3 pr-8">
                <div className="flex items-center justify-end gap-1">
                  <button
                    type="button"
                    aria-label={`Ver detalhes de ${pedido.customerName}`}
                    onClick={() => onDetail(pedido)}
                    className="inline-flex p-0 text-[11px] font-semibold leading-5 text-[var(--fly-text-muted)] underline decoration-[var(--fly-border-strong)] decoration-1 underline-offset-4 outline-none transition-[color,text-decoration-color] duration-150 hover:text-[var(--fly-brand-strong)] hover:decoration-[var(--fly-brand-strong)] focus-visible:rounded-[4px] focus-visible:text-[var(--fly-brand-strong)] focus-visible:ring-2 focus-visible:ring-[var(--fly-brand-ring)]"
                  >
                    <span>Ver detalhes</span>
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MobileOrdersList({
  pedidos,
  onDetail,
}: {
  pedidos: Pedido[];
  onDetail: (pedido: Pedido) => void;
}) {
  return (
    <div className="min-h-[520px] divide-y divide-white/[0.055] lg:hidden">
      {pedidos.map((pedido) => (
        <button
          key={pedido.id}
          type="button"
          onClick={() => onDetail(pedido)}
          className="grid w-full min-w-0 grid-cols-[minmax(0,1fr)_minmax(82px,auto)] gap-x-3 gap-y-1.5 px-3 py-2.5 text-left outline-none transition-colors duration-150 hover:bg-white/[0.02] active:bg-white/[0.03] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--fly-brand-ring)]"
        >
          <div className="min-w-0">
            <p className="truncate text-[13px] font-semibold leading-5 text-[var(--fly-text)]">
              {pedido.customerName}
            </p>
            <p className="truncate text-[11px] leading-4 text-[var(--fly-text-muted)]">
              {pedido.productGroup ?? pedido.productName ?? "-"}
              {pedido.jars ? ` · ${pedido.jars} potes` : ""}
            </p>
          </div>

          <div className="flex min-w-0 flex-col items-end gap-1 pt-0.5">
            <span className="shrink-0 text-[13px] font-semibold leading-4 tabular-nums text-[var(--fly-text)]">
              {pedido.amount == null ? "-" : formatCurrency(pedido.amount)}
            </span>
            <MobilePaymentSignal status={pedido.paymentStatus} />
          </div>

          <div className="col-span-2 flex min-w-0 items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2 text-[11px] leading-4 text-[var(--fly-text-muted)]">
              <span className="shrink-0 font-mono font-semibold text-[var(--fly-brand-strong)]">
                {pedido.paytTransactionId}
              </span>
              <span aria-hidden="true" className="size-1 shrink-0 rounded-full bg-[var(--fly-border-strong)]" />
              <span className="truncate font-mono">
                {pedido.trackingCode ?? formatDate(pedido.paidAt, { year: undefined })}
              </span>
            </div>
            <div className="flex max-w-[46%] shrink-0 items-center justify-end gap-1.5">
              <StatusBadge
                label={PEDIDO_STATUS_LOGISTICO_LABELS[pedido.logisticsStatus]}
                className={cn(
                  LOGISTICS_BADGE_STYLES[pedido.logisticsStatus],
                  "px-1.5 py-0.5 text-[10px]"
                )}
              />
              <IssueIndicator issue={pedido.issue} />
            </div>
          </div>
        </button>
      ))}
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
            Pedidos indisponiveis
          </p>
          <p className="flynow-dashboard-error-message mt-1 leading-5 text-[#FCA5A5]">
            O mock de erro esta ativo. Tente novamente para voltar a base local.
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

function PedidosSkeleton() {
  return (
    <div
      role="status"
      aria-label="Carregando pedidos"
      className="flynow-dashboard-skeleton space-y-5"
    >
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="flynow-dashboard-skeleton-panel h-[176px] rounded-[8px] border border-white/[0.06] bg-[#0D0F12] p-4"
          >
            <div className="flex h-full flex-col justify-between">
              <div className="space-y-3">
                <span className="block h-2.5 w-24 rounded-full bg-white/[0.055]" />
                <span className="block h-8 w-32 rounded-md bg-white/[0.07]" />
                <span className="block h-2.5 w-40 rounded-full bg-white/[0.05]" />
              </div>
              <div className="space-y-2">
                <span className="block h-1.5 w-full rounded-full bg-white/[0.055]" />
                <span className="block h-1.5 w-3/4 rounded-full bg-white/[0.05]" />
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="flynow-dashboard-skeleton-panel rounded-[8px] border border-white/[0.06] bg-[#0D0F12]">
        <div className="border-b border-white/[0.06] p-3 sm:p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <span className="h-10 flex-1 rounded-[8px] bg-white/[0.055]" />
            <span className="h-10 w-full rounded-[8px] bg-white/[0.05] sm:w-28" />
          </div>
        </div>
        <div className="hidden lg:block">
          <div className="grid grid-cols-[31%_24%_18%_23%_4%] border-b border-white/[0.06] bg-white/[0.018] px-4 py-3.5">
            {Array.from({ length: 5 }).map((_, index) => (
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
                className="grid grid-cols-[31%_24%_18%_23%_4%] items-center gap-0 py-4"
              >
                <div className="space-y-2">
                  <span className="block h-3.5 w-36 rounded-full bg-white/[0.07]" />
                  <span className="block h-2.5 w-52 rounded-full bg-white/[0.045]" />
                </div>
                <div className="space-y-2">
                  <span className="block h-3.5 w-44 rounded-full bg-white/[0.06]" />
                  <span className="block h-2.5 w-24 rounded-full bg-white/[0.045]" />
                </div>
                <div className="space-y-2">
                  <span className="block h-3.5 w-24 rounded-full bg-white/[0.07]" />
                  <span className="block h-2.5 w-28 rounded-full bg-white/[0.045]" />
                </div>
                <div className="space-y-2">
                  <span className="block h-6 w-28 rounded-[7px] bg-white/[0.06]" />
                  <span className="block h-2.5 w-32 rounded-full bg-white/[0.045]" />
                </div>
                <span className="block size-8 rounded-[7px] bg-white/[0.05]" />
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
      <span className="sr-only">Carregando pedidos.</span>
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
  status,
  pedidos,
  totalPedidos,
  onDetail,
}: {
  status: PedidoStatusLogistico;
  pedidos: Pedido[];
  totalPedidos: number;
  onDetail: (pedido: Pedido) => void;
}) {
  const total = pedidos.reduce((sum, pedido) => sum + (pedido.amount ?? 0), 0);
  const visiblePedidos = pedidos.slice(0, KANBAN_COLUMN_CARD_LIMIT);
  const hiddenCount = Math.max(pedidos.length - visiblePedidos.length, 0);
  const percentage =
    totalPedidos > 0 ? Math.round((pedidos.length / totalPedidos) * 100) : 0;
  const Icon =
    status === "entregue"
      ? PackageCheck
      : status === "devolvido"
        ? PackageOpen
        : ["postado", "em_transporte", "aguardando_retirada"].includes(status)
          ? Truck
          : Clock3;

  return (
    <section className="relative flex h-[560px] w-[264px] shrink-0 snap-start flex-col overflow-hidden rounded-[8px] border border-white/[0.07] bg-[#0B0D10] shadow-[0_1px_0_rgba(255,255,255,0.03),inset_0_1px_0_rgba(255,255,255,0.035)]">
      <div className="border-b border-white/[0.06] p-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-2">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-[8px] border border-white/[0.07] bg-white/[0.025] text-[var(--fly-text-muted)]">
              <Icon aria-hidden="true" className="size-4" />
            </span>
            <div className="min-w-0">
              <h3 className="truncate text-[13px] font-semibold leading-5 text-[var(--fly-text)]">
                {PEDIDO_STATUS_LOGISTICO_LABELS[status]}
              </h3>
              <p className="text-[11px] leading-4 text-[var(--fly-text-muted)]">
                {formatCompactCurrency(total)} · {percentage}% do filtro
              </p>
            </div>
          </div>
          <span className="rounded-[7px] border border-white/[0.07] bg-white/[0.035] px-2 py-1 text-xs font-semibold tabular-nums text-[var(--fly-text-soft)]">
            {pedidos.length}
          </span>
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto p-2">
        {pedidos.length === 0 ? (
          <div className="flex h-20 items-center justify-center rounded-[8px] border border-dashed border-white/[0.08] bg-white/[0.012] text-[11px] text-[var(--fly-text-muted)]">
            Sem pedidos
          </div>
        ) : (
          <>
            {visiblePedidos.map((pedido) => (
              <button
                key={pedido.id}
                type="button"
                onClick={() => onDetail(pedido)}
                className="w-full rounded-[8px] border border-white/[0.055] bg-white/[0.018] p-2.5 text-left outline-none transition-colors duration-150 hover:border-white/[0.1] hover:bg-white/[0.035] focus-visible:ring-2 focus-visible:ring-[var(--fly-brand-ring)]"
              >
                <div className="flex min-w-0 items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-semibold leading-5 text-[var(--fly-text)]">
                      {pedido.customerName}
                    </p>
                    <p className="truncate text-[11px] leading-4 text-[var(--fly-text-muted)]">
                      {pedido.productGroup ?? pedido.productName ?? "-"}
                      {pedido.jars ? ` · ${pedido.jars}p` : ""}
                    </p>
                  </div>
                  <span className="shrink-0 text-[11px] font-semibold leading-5 tabular-nums text-[var(--fly-text)]">
                    {pedido.amount == null ? "-" : formatCompactCurrency(pedido.amount)}
                  </span>
                </div>
                <div className="mt-2 flex min-w-0 items-center justify-between gap-2">
                  <span className="truncate font-mono text-[10px] font-semibold text-[var(--fly-brand-strong)]">
                    {pedido.paytTransactionId}
                  </span>
                  {pedido.issue ? (
                    <span className="shrink-0 text-[10px] font-semibold text-[var(--fly-danger-strong)]">
                      {getIssueLabel(pedido.issue)}
                    </span>
                  ) : null}
                </div>
              </button>
            ))}
            {hiddenCount > 0 ? (
              <div className="rounded-[8px] border border-dashed border-white/[0.08] bg-white/[0.012] px-3 py-2 text-center text-[11px] font-medium text-[var(--fly-text-muted)]">
                +{hiddenCount.toLocaleString("pt-BR")} pedidos nesta coluna
              </div>
            ) : null}
          </>
        )}
      </div>
    </section>
  );
}

function KanbanBoard({
  pedidos,
  onDetail,
}: {
  pedidos: Pedido[];
  onDetail: (pedido: Pedido) => void;
}) {
  const pedidosPorStatus = useMemo(() => {
    return PEDIDO_LOGISTICS_PIPELINE.reduce<Record<PedidoStatusLogistico, Pedido[]>>(
      (acc, status) => {
        acc[status] = pedidos.filter(
          (pedido) => pedido.logisticsStatus === status
        );
        return acc;
      },
      {
        pago: [],
        nota_fiscal: [],
        separacao: [],
        aguardando_postagem: [],
        postado: [],
        em_transporte: [],
        aguardando_retirada: [],
        entregue: [],
        devolvido: [],
      }
    );
  }, [pedidos]);

  return (
    <div className="overflow-x-auto border-t border-white/[0.06] p-3">
      <div className="flex min-w-max snap-x snap-mandatory gap-3">
        {PEDIDO_LOGISTICS_PIPELINE.map((status) => (
          <KanbanColumn
            key={status}
            status={status}
            pedidos={pedidosPorStatus[status]}
            totalPedidos={pedidos.length}
            onDetail={onDetail}
          />
        ))}
      </div>
    </div>
  );
}

function DetailDrawer({
  pedido,
  onClose,
}: {
  pedido: Pedido;
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
    pedido.customerName,
    pedido.customerPhone,
    pedido.customerEmail,
  ]
    .filter(Boolean)
    .join("\n");

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
        aria-labelledby="pedido-detail-drawer-title"
        className="flynow-detail-drawer__panel absolute inset-y-0 right-0 flex w-full max-w-[520px] flex-col border-l border-white/[0.09] bg-[#08090B]/96 shadow-[-28px_0_80px_rgba(0,0,0,0.62),inset_1px_0_0_rgba(255,255,255,0.045)] backdrop-blur-2xl"
      >
        <div className="border-b border-white/[0.07] p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--fly-brand-strong)]">
                Pedido
              </p>
              <h2
                id="pedido-detail-drawer-title"
                className="mt-2 truncate text-xl font-semibold leading-none text-[var(--fly-text)]"
              >
                {pedido.customerName}
              </h2>
              <a
                href={`https://app.payt.com.br/admin/vendas/${pedido.paytTransactionId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-1.5 font-mono text-xs font-semibold text-[var(--fly-brand-strong)] outline-none hover:text-[var(--fly-text)] focus-visible:ring-2 focus-visible:ring-[var(--fly-brand-ring)]"
              >
                {pedido.paytTransactionId}
                <ExternalLink aria-hidden="true" className="size-3" />
              </a>
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
              label={PEDIDO_STATUS_PAGAMENTO_LABELS[pedido.paymentStatus]}
              className={PAYMENT_BADGE_STYLES[pedido.paymentStatus]}
              dotClassName={getPaymentDotClass(pedido.paymentStatus)}
            />
            <StatusBadge
              label={PEDIDO_STATUS_LOGISTICO_LABELS[pedido.logisticsStatus]}
              className={LOGISTICS_BADGE_STYLES[pedido.logisticsStatus]}
            />
            <span className="ml-auto text-base font-semibold tabular-nums text-[var(--fly-text)]">
              {pedido.amount == null ? "-" : formatCurrency(pedido.amount)}
            </span>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
          <div className="grid gap-3">
            <DetailSection
              title="Cliente"
              rows={[
                ["Nome", pedido.customerName],
                ["Telefone", pedido.customerPhone],
                ["E-mail", pedido.customerEmail],
                ["CPF", pedido.customerDocument],
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
              title="Pedido"
              rows={[
                ["Produto", pedido.productGroup ?? pedido.productName],
                ["Potes", pedido.jars],
                ["Canal", PEDIDO_CANAL_LABELS[pedido.channel]],
                [
                  "Pagamento",
                  pedido.paymentMethod
                    ? PEDIDO_FORMA_PAGAMENTO_LABELS[pedido.paymentMethod]
                    : null,
                ],
                [
                  "Parcelas",
                  pedido.installments && pedido.installments > 1
                    ? `${pedido.installments}x`
                    : "A vista",
                ],
                ["Data pagamento", formatDate(pedido.paidAt)],
              ]}
            />
            <DetailSection
              title="Logistica"
              rows={[
                ["Rastreio", pedido.trackingCode],
                ["Prometida", formatDate(pedido.promisedAt)],
                ["Chegou na base", formatDate(pedido.logisticsReceivedAt)],
                ["Entrega", formatDate(pedido.deliveredAt)],
                ["NF-e", pedido.invoiceNumber],
              ]}
            />
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
  action?: React.ReactNode;
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

export default function PedidosClientView({
  pedidos,
  periodoInicial,
  contagemInicial,
  financeiroInicial,
  valorPagoInicial,
}: PedidosClientViewProps) {
  const [status, setStatus] = useState<LoadStatus>("initial-loading");
  const [view, setView] = useState<ViewMode>("tabela");
  const [activeRange, setActiveRange] = useState<PedidoPeriodoPreset | "custom">(
    "7d"
  );
  const [range, setRange] = useState(periodoInicial);
  const maxSelectableDate = useMemo(() => new Date(), []);
  const [query, setQuery] = useState("");
  const [logisticsStatus, setLogisticsStatus] = useState("all");
  const [paymentStatus, setPaymentStatus] = useState("all");
  const [product, setProduct] = useState("all");
  const [onlyIssues, setOnlyIssues] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [pageSize, setPageSize] = useState<number>(25);
  const [page, setPage] = useState(1);
  const [selectedPedido, setSelectedPedido] = useState<Pedido | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [clearedInitialError, setClearedInitialError] = useState(false);
  const isCompactLayout = useMediaQuery("(max-width: 1023px)");
  const deferredQuery = useDeferredValue(query);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const hasErrorScenario =
        new URLSearchParams(window.location.search).get("mockPedidos") ===
        "error";

      setStatus(hasErrorScenario && !clearedInitialError ? "error" : "success");
    }, 320);

    return () => window.clearTimeout(timer);
  }, [clearedInitialError]);

  const periodPedidos = useMemo(() => {
    return pedidos.filter((pedido) => {
      const paidDate = toDateInput(pedido.paidAt);
      return paidDate >= range.startDate && paidDate <= range.endDate;
    });
  }, [pedidos, range.endDate, range.startDate]);

  const periodMetrics = useMemo(() => {
    if (
      periodPedidos.length === pedidos.length &&
      range.startDate === periodoInicial.startDate &&
      range.endDate === periodoInicial.endDate
    ) {
      return {
        contagem: contagemInicial,
        financeiro: financeiroInicial,
        valorPago: valorPagoInicial,
      };
    }

    return {
      contagem: getPedidosContagemPorStatus(periodPedidos),
      financeiro: getPedidosFinanceiroResumo(periodPedidos),
      valorPago: getPedidosValorPago(periodPedidos),
    };
  }, [
    contagemInicial,
    financeiroInicial,
    pedidos.length,
    periodPedidos,
    periodoInicial.endDate,
    periodoInicial.startDate,
    range.endDate,
    range.startDate,
    valorPagoInicial,
  ]);

  const products = useMemo(() => {
    return Array.from(
      new Set(
        pedidos
          .map((pedido) => pedido.productGroup ?? pedido.productName)
          .filter((item): item is string => Boolean(item))
      )
    ).sort((first, second) => first.localeCompare(second));
  }, [pedidos]);

  const filteredPedidos = useMemo(() => {
    const normalizedQuery = deferredQuery.trim().toLowerCase();

    return periodPedidos.filter((pedido) => {
      if (
        logisticsStatus !== "all" &&
        pedido.logisticsStatus !== logisticsStatus
      ) {
        return false;
      }

      if (paymentStatus !== "all" && pedido.paymentStatus !== paymentStatus) {
        return false;
      }

      if (
        product !== "all" &&
        (pedido.productGroup ?? pedido.productName) !== product
      ) {
        return false;
      }

      if (onlyIssues && !pedido.issue) {
        return false;
      }

      if (normalizedQuery && !getPedidoSearchText(pedido).includes(normalizedQuery)) {
        return false;
      }

      return true;
    });
  }, [
    logisticsStatus,
    onlyIssues,
    paymentStatus,
    periodPedidos,
    product,
    deferredQuery,
  ]);

  const filteredValue = useMemo(
    () =>
      filteredPedidos
        .filter((pedido) => pedido.paymentStatus === "paid")
        .reduce((total, pedido) => total + (pedido.amount ?? 0), 0),
    [filteredPedidos]
  );

  const totalPages = Math.max(Math.ceil(filteredPedidos.length / pageSize), 1);
  const pagination = useMemo<PaginationModel>(
    () => ({
      page: clampPage(page, totalPages),
      pageSize,
      totalItems: filteredPedidos.length,
      totalPages,
    }),
    [filteredPedidos.length, page, pageSize, totalPages]
  );

  const visiblePedidos = useMemo(() => {
    const safePage = clampPage(page, totalPages);
    const start = (safePage - 1) * pageSize;
    return filteredPedidos.slice(start, start + pageSize);
  }, [filteredPedidos, page, pageSize, totalPages]);

  const activeFilterCount =
    (query.trim() ? 1 : 0) +
    (logisticsStatus !== "all" ? 1 : 0) +
    (paymentStatus !== "all" ? 1 : 0) +
    (product !== "all" ? 1 : 0) +
    (onlyIssues ? 1 : 0);

  const periodoLabel = formatPedidosRange(range.startDate, range.endDate);
  const isRefreshing = status === "refreshing";
  const calendarValue = useMemo<RangeValue>(
    () => ({
      start: toCalendarDate(range.startDate),
      end: toCalendarDate(range.endDate),
    }),
    [range.endDate, range.startDate]
  );

  useEffect(() => {
    setPage(1);
  }, [logisticsStatus, onlyIssues, paymentStatus, product, query, range, pageSize]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const applyPreset = useCallback((preset: PedidoPeriodoPreset) => {
    const nextRange = getPresetPedidosRange(preset);
    setActiveRange(preset);
    setRange(nextRange);
  }, []);

  const selectCalendarRange = useCallback((value: RangeValue | null) => {
    if (!value?.start || !value.end) return;

    const normalizedRange = normalizePedidoRange(
      toPedidoDateString(value.start),
      toPedidoDateString(value.end)
    );
    setActiveRange("custom");
    setRange(normalizedRange);
  }, []);

  const simulateSync = useCallback(() => {
    setStatus("refreshing");
    setActionNotice(null);

    window.setTimeout(() => {
      setStatus("success");
      setActionNotice(
        "Mock sincronizado: dados locais preservados para futura integracao H7."
      );
    }, 720);
  }, []);

  const simulateImport = useCallback(() => {
    setActionNotice(
      "Importacao em modo visual: historico pronto para conectar ao endpoint real."
    );
  }, []);

  const retry = useCallback(() => {
    setClearedInitialError(true);
    setStatus("initial-loading");
  }, []);

  const clearFilters = useCallback(() => {
    setQuery("");
    setLogisticsStatus("all");
    setPaymentStatus("all");
    setProduct("all");
    setOnlyIssues(false);
    setFiltersOpen(false);
  }, []);

  return (
    <>
      <DashboardHeader
        title="Pedidos"
        description="Pagamentos, rastreios e entregas em uma visao operacional"
        actions={
          <HeaderActions
            activeRange={activeRange}
            calendarValue={calendarValue}
            isRefreshing={isRefreshing}
            maxDate={maxSelectableDate}
            onCalendarChange={selectCalendarRange}
            onPresetSelect={applyPreset}
            onImport={simulateImport}
            onSync={simulateSync}
          />
        }
      />

      <div className="min-w-0 overflow-x-clip px-3.5 pb-28 pt-4 sm:px-5 sm:pt-5 xl:px-6 xl:pb-10 xl:pt-6">
        {status === "initial-loading" ? <PedidosSkeleton /> : null}

        {status === "error" ? <ErrorState onRetry={retry} /> : null}

        {status !== "initial-loading" && status !== "error" ? (
          <div
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
                totalPedidos={periodPedidos.length}
                valorPago={periodMetrics.valorPago}
                financeiro={periodMetrics.financeiro}
                contagem={periodMetrics.contagem}
                pedidos={periodPedidos}
              />
            </div>

            <div
              className="flynow-dashboard-enter-item"
              style={{ "--flynow-enter-delay": "80ms" } as CSSProperties}
            >
              <div className="space-y-4">
                <SummaryStrip
                  filteredCount={filteredPedidos.length}
                  totalPeriodCount={periodPedidos.length}
                  filteredValue={filteredValue}
                  periodoLabel={periodoLabel}
                  view={view}
                  onViewChange={setView}
                />

                <section className="overflow-hidden rounded-[8px] border border-white/[0.07] bg-[#0B0D10] shadow-[0_1px_0_rgba(255,255,255,0.03),inset_0_1px_0_rgba(255,255,255,0.035)]">
                  <FilterPanel
                    query={query}
                    logisticsStatus={logisticsStatus}
                    paymentStatus={paymentStatus}
                    product={product}
                    products={products}
                    onlyIssues={onlyIssues}
                    filtersOpen={filtersOpen}
                    activeFilterCount={activeFilterCount}
                    onQueryChange={setQuery}
                    onLogisticsStatusChange={setLogisticsStatus}
                    onPaymentStatusChange={setPaymentStatus}
                    onProductChange={setProduct}
                    onOnlyIssuesChange={setOnlyIssues}
                    onFiltersOpenChange={setFiltersOpen}
                    onClearFilters={clearFilters}
                  />

                  {filteredPedidos.length === 0 ? (
                    <EmptyState
                      title="Nenhum pedido encontrado"
                      description="Ajuste busca, filtros ou periodo para voltar a visualizar a operacao."
                    />
                  ) : view === "tabela" ? (
                    <div id="pedidos-view-tabela" role="tabpanel">
                      {isCompactLayout === true ? (
                        <MobileOrdersList
                          pedidos={visiblePedidos}
                          onDetail={setSelectedPedido}
                        />
                      ) : null}
                      {isCompactLayout !== true ? (
                        <OrdersTable
                          pedidos={visiblePedidos}
                          onDetail={setSelectedPedido}
                        />
                      ) : null}
                    </div>
                  ) : (
                    <div id="pedidos-view-kanban" role="tabpanel">
                      <KanbanBoard
                        pedidos={visiblePedidos}
                        onDetail={setSelectedPedido}
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

      {selectedPedido ? (
        <DetailDrawer
          pedido={selectedPedido}
          onClose={() => setSelectedPedido(null)}
        />
      ) : null}
    </>
  );
}
