import Link from "next/link";

import { CfoWeeklyInputs } from "@/components/cfo/cfo-weekly-inputs";
import Shell from "@/components/layout/shell";
import { DashboardHeader } from "@/components/layout/dashboard-header";
import { MetasMonthFilter } from "@/components/metas/metas-month-filter";
import {
  PageBody,
  Panel,
  StatCard,
  StatGrid,
} from "@/components/workspace/operational-ui";
import { getTodayInAppTimezone } from "@/lib/app-dates";
import { getChannelAnalytics } from "@/lib/analytics";
import {
  getMetasPageData,
  normalizeMetasMonth,
  type MetaGoal,
  type MetaStatus,
  type MetaUnit,
} from "@/lib/metas";
import {
  getMetasPlanningPageData,
  type MetasPlanningBackendChannel,
  type MetasPlanningChannel,
} from "@/lib/metas-planning";
import { logServerTiming, timedServerTask } from "@/lib/server-timing";
import type { AnalyticsCanal } from "@/lib/supabase";
import { cn, formatCurrency, formatPercent } from "@/lib/utils";

export const dynamic = "force-dynamic";

type MetasPageParams = {
  endDate?: string;
  mes?: string;
  startDate?: string;
  view?: string;
  visao?: string;
};

type MonthPace = {
  elapsedDays: number;
  endDate: string;
  startDate: string;
  totalDays: number;
};

type GpdStatus = "good" | "ok" | "bad" | "empty";

type GpdRow = {
  depth?: 0 | 1;
  expected: number;
  id: string;
  kind?: "group" | "item" | "reconciliation" | "total";
  label: string;
  meta: number;
  note?: string;
  percent: number | null;
  projection: number;
  realized: number;
  roas?: number | null;
  status: GpdStatus;
};

type LossRow = {
  action: string;
  actual: number | null;
  id: string;
  inverse?: boolean;
  label: string;
  status: GpdStatus;
  target: number | null;
  unit: MetaUnit;
};

type GpdView = "geral" | "frontend" | "backend";

const TRAFFIC_DEFS = [
  {
    id: "facebook",
    label: "Facebook",
    planIds: ["facebook"],
    sources: ["FACEBOOK"],
  },
  {
    id: "tiktok",
    label: "TikTok",
    planIds: ["tiktok"],
    sources: ["TIKTOK"],
  },
  {
    id: "taboola-mgid",
    label: "Taboola + MGID",
    planIds: ["taboola", "mgid"],
    sources: ["TABOOLA", "MGID"],
  },
  {
    id: "google",
    label: "Google",
    planIds: ["google"],
    sources: ["GOOGLE"],
  },
] as const;

const BACKEND_DEFS = [
  {
    canals: ["IA_WHATSAPP"] satisfies AnalyticsCanal[],
    id: "whatsapp",
    label: "WhatsApp",
    planIds: ["whatsapp"],
  },
  {
    canals: ["CALLCENTER"] satisfies AnalyticsCanal[],
    id: "callcenter",
    label: "Call Center",
    planIds: ["callcenter"],
  },
  {
    canals: ["SMS", "EMAIL_MAUTIC"] satisfies AnalyticsCanal[],
    id: "sms-email",
    label: "SMS + Email",
    planIds: ["sms", "email"],
  },
  {
    canals: [] satisfies AnalyticsCanal[],
    id: "s2clube",
    label: "S2Clube (UP1)",
    planIds: ["s2clube"],
  },
] as const;

const STATUS_LABELS: Record<GpdStatus, string> = {
  bad: "Ruim",
  empty: "Sem dado",
  good: "Bom",
  ok: "OK",
};

const STATUS_STYLES: Record<GpdStatus, string> = {
  bad: "bg-[#F87171]",
  empty: "bg-[var(--fly-text-muted)]",
  good: "bg-[var(--fly-success)]",
  ok: "bg-[var(--fly-chart-revenue)]",
};

const GPD_VIEW_OPTIONS: Array<{
  description: string;
  label: string;
  value: GpdView;
}> = [
  {
    description: "Operação completa",
    label: "Geral",
    value: "geral",
  },
  {
    description: "Tráfego pago",
    label: "Front-end",
    value: "frontend",
  },
  {
    description: "Canais operacionais",
    label: "Back-end",
    value: "backend",
  },
];

function resolveMonth(params: MetasPageParams) {
  return normalizeMetasMonth(params.mes ?? params.startDate ?? params.endDate);
}

function resolveGpdView(params: MetasPageParams): GpdView {
  const view = params.visao ?? params.view;

  if (view === "frontend" || view === "backend") return view;

  return "geral";
}

function buildMetasViewHref(month: string, view: GpdView) {
  return `/metas?mes=${month}&visao=${view}`;
}

function monthRange(month: string): Pick<MonthPace, "endDate" | "startDate"> {
  const [year, monthIndex] = month.split("-").map(Number);
  const endDate = new Date(year, monthIndex, 0).toISOString().slice(0, 10);

  return {
    endDate,
    startDate: `${month}-01`,
  };
}

function toDate(value: string) {
  return new Date(`${value}T12:00:00`);
}

function inclusiveDays(startDate: string, endDate: string) {
  const diff = toDate(endDate).getTime() - toDate(startDate).getTime();

  return Math.max(Math.floor(diff / 86_400_000) + 1, 1);
}

function getMonthPace(month: string): MonthPace {
  const range = monthRange(month);
  const today = getTodayInAppTimezone();
  const totalDays = inclusiveDays(range.startDate, range.endDate);
  const elapsedDays =
    today < range.startDate
      ? 0
      : today > range.endDate
        ? totalDays
        : inclusiveDays(range.startDate, today);

  return {
    ...range,
    elapsedDays,
    totalDays,
  };
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: 0,
  }).format(value);
}

function formatRatio(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return "-";

  return new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(value);
}

function formatGoalValue(value: number | null, unit: MetaUnit) {
  if (value == null || !Number.isFinite(value)) return "Não informado";
  if (unit === "currency") return formatCurrency(value);
  if (unit === "percent") return formatPercent(value);
  if (unit === "ratio") return formatRatio(value);

  return formatNumber(value);
}

function clampNumber(value: number, min = 0, max = 100) {
  if (!Number.isFinite(value)) return min;
  return Math.min(Math.max(value, min), max);
}

function formatPercentagePoints(value: number) {
  const formatted = new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: 1,
    minimumFractionDigits: 1,
  }).format(Math.abs(value) * 100);

  return `${formatted} p.p.`;
}

function formatLossTarget(row: LossRow) {
  const value = formatGoalValue(row.target, row.unit);

  if (row.target == null) return value;
  if (row.inverse) return `<= ${value}`;

  return value;
}

function getLossMargin(row: LossRow) {
  if (row.target == null || row.actual == null) {
    return {
      className: "text-[var(--fly-text-muted)]",
      text: "-",
    };
  }

  const delta = row.inverse ? row.target - row.actual : row.actual - row.target;

  if (Math.abs(delta) < 0.0001) {
    return {
      className: "text-[var(--fly-text-soft)]",
      text: row.inverse ? "No limite" : "Na meta",
    };
  }

  const isGood = delta > 0;
  const className = isGood
    ? "text-[var(--fly-success-text)]"
    : "text-[var(--fly-danger-strong)]";

  if (row.unit === "percent") {
    const value = formatPercentagePoints(delta);

    return {
      className,
      text: row.inverse
        ? `${value} ${isGood ? "abaixo" : "acima"} do limite`
        : `${value} ${isGood ? "acima" : "abaixo"} da meta`,
    };
  }

  const value = formatGoalValue(Math.abs(delta), row.unit);

  return {
    className,
    text: row.inverse
      ? `${value} ${isGood ? "abaixo" : "acima"} do limite`
      : `${value} ${isGood ? "acima" : "abaixo"} da meta`,
  };
}

function LossRangeGauge({ row }: { row: LossRow }) {
  if (row.target == null || row.actual == null || row.target <= 0) {
    return <span className="text-xs text-[var(--fly-text-muted)]">Sem base</span>;
  }

  const scale = Math.max(row.target * 1.35, row.actual * 1.12, 0.01);
  const actualPosition = clampNumber((row.actual / scale) * 100);
  const targetPosition = clampNumber((row.target / scale) * 100);

  return (
    <div className="min-w-[180px] space-y-1.5">
      <div className="relative h-1.5 rounded-full bg-[var(--fly-row-bg)]">
        <span
          aria-hidden="true"
          className={cn(
            "absolute inset-y-0 left-0 rounded-full opacity-30",
            row.inverse ? "bg-[var(--fly-success)]" : "bg-[var(--fly-chart-revenue)]",
          )}
          style={{
            width: `${row.inverse ? targetPosition : actualPosition}%`,
          }}
        />
        {row.inverse ? (
          <span
            aria-hidden="true"
            className="absolute inset-y-0 right-0 rounded-r-full bg-[var(--fly-danger-bg)]"
            style={{ left: `${targetPosition}%` }}
          />
        ) : null}
        <span
          aria-hidden="true"
          className="absolute top-1/2 h-3 w-px -translate-y-1/2 bg-[var(--fly-text-muted)]"
          style={{ left: `${targetPosition}%` }}
        />
        <span
          aria-hidden="true"
          className={cn(
            "absolute top-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-[var(--fly-surface)]",
            STATUS_STYLES[row.status],
          )}
          style={{ left: `${actualPosition}%` }}
        />
      </div>
      <div className="flex items-center justify-between gap-2 text-[10px] font-medium uppercase text-[var(--fly-text-muted)]">
        <span>{row.inverse ? "0%" : "Atual"}</span>
        <span>{row.inverse ? "Limite" : "Meta"}</span>
      </div>
    </div>
  );
}

function getExpectedDelta(row: GpdRow) {
  return row.realized - row.expected;
}

function formatExpectedDelta(value: number) {
  if (!Number.isFinite(value) || Math.abs(value) < 1) return "No ritmo";

  return `${value > 0 ? "+" : "-"} ${formatCurrency(Math.abs(value))}`;
}

function getExpectedDeltaClass(value: number) {
  if (!Number.isFinite(value) || Math.abs(value) < 1) {
    return "text-[var(--fly-text-soft)]";
  }

  if (value > 0) return "text-[var(--fly-success-text)]";

  return "text-[var(--fly-danger-strong)]";
}

function statusFromRatio(ratio: number | null, inverse = false): GpdStatus {
  if (ratio == null || !Number.isFinite(ratio)) return "empty";

  if (inverse) {
    if (ratio <= 1) return "good";
    if (ratio <= 1.05) return "ok";
    return "bad";
  }

  if (ratio >= 0.95) return "good";
  if (ratio >= 0.8) return "ok";
  return "bad";
}

function statusFromMetaStatus(status: MetaStatus): GpdStatus {
  if (status === "ahead" || status === "on_track") return "good";
  if (status === "attention") return "ok";
  if (status === "critical") return "bad";

  return "empty";
}

function createRow({
  depth = 0,
  id,
  kind = "item",
  label,
  meta,
  note,
  pace,
  realized,
  roas = null,
}: {
  depth?: 0 | 1;
  id: string;
  kind?: GpdRow["kind"];
  label: string;
  meta: number;
  note?: string;
  pace: MonthPace;
  realized: number;
  roas?: number | null;
}): GpdRow {
  const expected = pace.totalDays > 0 ? (meta / pace.totalDays) * pace.elapsedDays : 0;
  const projection =
    pace.elapsedDays > 0 && pace.elapsedDays < pace.totalDays
      ? (realized / pace.elapsedDays) * pace.totalDays
      : realized;
  const percent = meta > 0 ? realized / meta : realized > 0 ? 1 : null;

  return {
    depth,
    expected,
    id,
    kind,
    label,
    meta,
    note,
    percent,
    projection,
    realized,
    roas,
    status: statusFromRatio(percent),
  };
}

function sumPlanningChannels(
  channels: MetasPlanningChannel[],
  ids: readonly string[],
  field: "investment" | "revenue",
) {
  return ids.reduce((total, id) => {
    const channel = channels.find((item) => item.id === id);

    return total + (channel?.[field] ?? 0);
  }, 0);
}

function sumBackendTargets(
  backend: MetasPlanningBackendChannel[],
  ids: readonly string[],
) {
  return ids.reduce((total, id) => {
    const channel = backend.find((item) => item.id === id);

    return total + (channel?.revenue ?? 0);
  }, 0);
}

function sumMedia(
  mediaBySource: Awaited<ReturnType<typeof getChannelAnalytics>>["mediaBySource"],
  sources: readonly string[],
) {
  return mediaBySource
    .filter((item) => sources.includes(item.source))
    .reduce(
      (total, item) => ({
        clicks: total.clicks + item.clicks,
        conversions: total.conversions + item.conversions,
        revenue: total.revenue + item.revenue,
        spend: total.spend + item.spend,
      }),
      { clicks: 0, conversions: 0, revenue: 0, spend: 0 },
    );
}

function sumCanalRevenue(
  sourceRows: Awaited<ReturnType<typeof getChannelAnalytics>>["sourceRows"],
  canals: readonly AnalyticsCanal[],
) {
  return sourceRows
    .filter((item) => canals.includes(item.canal))
    .reduce((total, item) => total + item.receita_total, 0);
}

function buildTrafficRows({
  mediaBySource,
  pace,
  planningChannels,
  target,
}: {
  mediaBySource: Awaited<ReturnType<typeof getChannelAnalytics>>["mediaBySource"];
  pace: MonthPace;
  planningChannels: MetasPlanningChannel[];
  target: number;
}) {
  const itemRows = TRAFFIC_DEFS.map((definition) => {
    const media = sumMedia(mediaBySource, definition.sources);
    const meta = sumPlanningChannels(planningChannels, definition.planIds, "revenue");
    const roas = media.spend > 0 ? media.revenue / media.spend : null;

    return createRow({
      depth: 1,
      id: definition.id,
      label: definition.label,
      meta,
      pace,
      realized: media.revenue,
      roas,
    });
  });
  const plannedChildrenTotal = itemRows.reduce((total, row) => total + row.meta, 0);
  const realizedChildrenTotal = itemRows.reduce((total, row) => total + row.realized, 0);
  const reserveTarget = Math.max(target - plannedChildrenTotal, 0);
  const reserveRow =
    reserveTarget > 0
      ? createRow({
          depth: 1,
          id: "traffic-reserve",
          label: "Reserva / ajuste tráfego",
          meta: reserveTarget,
          note: "Fecha a meta de tráfego sem depender de uma fonte específica.",
          pace,
          realized: 0,
        })
      : null;

  const rows = reserveRow ? [...itemRows, reserveRow] : itemRows;
  const groupRow = createRow({
    id: "traffic-total",
    kind: "group",
    label: "F1 · Tráfego front",
    meta: target,
    pace,
    realized: realizedChildrenTotal,
  });

  return [groupRow, ...rows];
}

function buildBackendRows({
  backendTargets,
  pace,
  sourceRows,
  target,
}: {
  backendTargets: MetasPlanningBackendChannel[];
  pace: MonthPace;
  sourceRows: Awaited<ReturnType<typeof getChannelAnalytics>>["sourceRows"];
  target: number;
}) {
  const itemRows = BACKEND_DEFS.map((definition) =>
    createRow({
      depth: 1,
      id: definition.id,
      label: definition.label,
      meta: sumBackendTargets(backendTargets, definition.planIds),
      pace,
      realized: sumCanalRevenue(sourceRows, definition.canals),
    }),
  ).filter((row) => row.meta > 0 || row.realized > 0 || row.id !== "s2clube");
  const realizedChildrenTotal = itemRows.reduce((total, row) => total + row.realized, 0);
  const plannedChildrenTotal = itemRows.reduce((total, row) => total + row.meta, 0);
  const groupRow = createRow({
    id: "backend-total",
    kind: "group",
    label: "F3 · Back-end",
    meta: Math.max(target, plannedChildrenTotal),
    pace,
    realized: realizedChildrenTotal,
  });

  return [groupRow, ...itemRows];
}

function buildGpdRows({
  channelData,
  cfoData,
  pace,
  planningData,
}: {
  channelData: Awaited<ReturnType<typeof getChannelAnalytics>>;
  cfoData: Awaited<ReturnType<typeof getMetasPageData>>;
  pace: MonthPace;
  planningData: Awaited<ReturnType<typeof getMetasPlanningPageData>>;
}) {
  const trafficRows = buildTrafficRows({
    mediaBySource: channelData.mediaBySource,
    pace,
    planningChannels: planningData.channels,
    target: planningData.summary.frontRevenue,
  });
  const backendRows = buildBackendRows({
    backendTargets: planningData.backend,
    pace,
    sourceRows: channelData.sourceRows,
    target: planningData.summary.backendRevenue,
  });
  const operationRows = [...trafficRows, ...backendRows];
  const classifiedMeta = operationRows
    .filter((row) => row.kind === "group")
    .reduce((total, row) => total + row.meta, 0);
  const classifiedRealized = operationRows
    .filter((row) => row.kind === "group")
    .reduce((total, row) => total + row.realized, 0);
  const target = cfoData.summary.revenue.target || classifiedMeta;
  const realized = cfoData.summary.revenue.realized;
  const otherTarget = Math.max(target - classifiedMeta, 0);
  const otherRealized = realized - classifiedRealized;
  const shouldShowReconciliation = otherTarget > 0 || Math.abs(otherRealized) >= 1;
  const reconciliationStatus: GpdStatus = otherRealized < 0 ? "bad" : "ok";
  const reconciliationRow = shouldShowReconciliation
    ? {
        ...createRow({
          id: "other-revenue",
          kind: "reconciliation",
          label: "Outras receitas / não classificadas",
          meta: otherTarget,
          note:
            otherRealized >= 0
              ? "Fecha a diferença entre a receita financeira e Front/Back."
              : "Front/Back supera a receita financeira; revisar classificação ou duplicidade.",
          pace,
          realized: otherRealized,
        }),
        percent: otherTarget > 0 ? otherRealized / otherTarget : null,
        projection:
          otherTarget > 0 && pace.elapsedDays > 0 && pace.elapsedDays < pace.totalDays
            ? (otherRealized / pace.elapsedDays) * pace.totalDays
            : otherRealized,
        status: reconciliationStatus,
      }
    : null;
  const reconciledRows = reconciliationRow ? [...operationRows, reconciliationRow] : operationRows;
  const totalRow = createRow({
    id: "operation-total",
    kind: "total",
    label: "Total operação",
    meta: target,
    pace,
    realized,
  });

  return {
    backendRows,
    operationRows: [...reconciledRows, totalRow],
    totalRow,
    trafficRows,
  };
}

function findGoal(goals: MetaGoal[], id: string) {
  return goals.find((goal) => goal.id === id) ?? null;
}

function buildLossRows(goals: MetaGoal[]): LossRow[] {
  const chargeback = findGoal(goals, "pct-chargeback");
  const refund = findGoal(goals, "pct-reembolso");
  const recovery = findGoal(goals, "pct-recuperada");
  const blendedTarget =
    chargeback?.target != null && refund?.target != null
      ? chargeback.target + refund.target
      : null;
  const blendedActual =
    chargeback?.realized != null && refund?.realized != null
      ? chargeback.realized + refund.realized
      : null;

  return [
    {
      action: "Manter abaixo da meta blended.",
      actual: blendedActual,
      id: "blended",
      inverse: true,
      label: "Taxa CB + reembolso",
      status:
        blendedTarget != null && blendedActual != null
          ? statusFromRatio(blendedActual / blendedTarget, true)
          : "empty",
      target: blendedTarget,
      unit: "percent",
    },
    {
      action: "Acompanhar disputas e chargebacks recebidos.",
      actual: chargeback?.realized ?? null,
      id: "chargeback",
      inverse: true,
      label: "Chargeback",
      status: chargeback ? statusFromMetaStatus(chargeback.status) : "empty",
      target: chargeback?.target ?? null,
      unit: "percent",
    },
    {
      action: "Monitorar reversões e reembolsos do período.",
      actual: refund?.realized ?? null,
      id: "refund",
      inverse: true,
      label: "Reembolso",
      status: refund ? statusFromMetaStatus(refund.status) : "empty",
      target: refund?.target ?? null,
      unit: "percent",
    },
    {
      action: "Validar se a recuperação está sustentando a operação.",
      actual: recovery?.realized ?? null,
      id: "recovery",
      label: "Receita recuperada",
      status: recovery ? statusFromMetaStatus(recovery.status) : "empty",
      target: recovery?.target ?? null,
      unit: "percent",
    },
  ];
}

function StatusLabel({ status }: { status: GpdStatus }) {
  return (
    <span className="inline-flex items-center justify-end gap-2 text-xs font-medium text-[var(--fly-text-soft)]">
      <span
        aria-hidden="true"
        className={cn("size-2 rounded-full", STATUS_STYLES[status])}
      />
      {STATUS_LABELS[status]}
    </span>
  );
}

function SourceBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-[7px] bg-[var(--fly-row-bg)] px-2 py-1 text-[11px] font-medium text-[var(--fly-text-muted)]">
      {children}
    </span>
  );
}

function GpdViewSelector({
  activeView,
  month,
}: {
  activeView: GpdView;
  month: string;
}) {
  return (
    <div className="mb-3 flex flex-col gap-2 rounded-[8px] border border-[var(--fly-border-subtle)] bg-[var(--fly-row-bg)] px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="text-xs font-semibold text-[var(--fly-text)]">Visão da tabela</p>
      </div>

      <div className="grid grid-cols-3 gap-1 rounded-[12px] border border-[var(--fly-border)] bg-[var(--fly-surface-elevated)] p-1 shadow-[var(--fly-panel-inset)] sm:inline-grid sm:w-auto">
        {GPD_VIEW_OPTIONS.map((option) => {
          const isActive = option.value === activeView;

          return (
            <Link
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "inline-flex h-7 min-w-0 items-center justify-center rounded-[8px] px-3 text-xs font-semibold outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-[var(--fly-brand-ring)]",
                isActive
                  ? "bg-[var(--fly-control-active)] text-[var(--fly-text)] shadow-[var(--fly-panel-shadow)]"
                  : "text-[var(--fly-text-muted)] hover:bg-[var(--fly-control)] hover:text-[var(--fly-text-soft)]",
              )}
              href={buildMetasViewHref(month, option.value)}
              key={option.value}
              prefetch={false}
              title={option.description}
            >
              {option.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function GpdTable({
  rows,
  showRoas = false,
}: {
  rows: GpdRow[];
  showRoas?: boolean;
}) {
  return (
    <>
      <div className="space-y-2 lg:hidden">
        {rows.map((row) => {
          const delta = getExpectedDelta(row);

          return (
            <article
              className={cn(
                "rounded-[8px] border border-[var(--fly-border-subtle)] bg-[var(--fly-row-bg)] px-3 py-3",
                row.kind === "group" &&
                  "border-[var(--fly-border)] bg-[var(--fly-surface)]",
                row.kind === "reconciliation" &&
                  "border-[var(--fly-info-border)] bg-[var(--fly-info-bg)]",
                row.kind === "total" &&
                  "border-[var(--fly-brand-border)] bg-[var(--fly-surface-elevated)]",
              )}
              key={row.id}
            >
              <div className="flex min-w-0 items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex min-w-0 items-center gap-2">
                    <span
                      aria-hidden="true"
                      className={cn(
                        "size-1.5 shrink-0 rounded-full",
                        row.kind === "total"
                          ? "bg-[var(--fly-chart-revenue)]"
                          : row.kind === "reconciliation"
                            ? "bg-[var(--fly-chart-investment)]"
                            : row.kind === "group"
                              ? "bg-[var(--fly-text-soft)]"
                              : "bg-[var(--fly-border-strong)]",
                      )}
                    />
                    <p
                      className={cn(
                        "truncate text-sm text-[var(--fly-text)]",
                        row.kind !== "item" && "font-semibold",
                      )}
                    >
                      {row.label}
                    </p>
                  </div>
                  {row.note ? (
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-[var(--fly-text-muted)]">
                      {row.note}
                    </p>
                  ) : null}
                </div>
                <StatusLabel status={row.status} />
              </div>

              <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2">
                <div className="min-w-0">
                  <dt className="text-[10px] font-medium uppercase text-[var(--fly-text-muted)]">
                    Realizado
                  </dt>
                  <dd className="mt-1 truncate text-lg font-semibold tabular-nums text-[var(--fly-info-text)]">
                    {formatCurrency(row.realized)}
                  </dd>
                </div>
                <div className="min-w-0 text-right">
                  <dt className="text-[10px] font-medium uppercase text-[var(--fly-text-muted)]">
                    % meta
                  </dt>
                  <dd className="mt-1 text-lg font-semibold tabular-nums text-[var(--fly-text)]">
                    {row.percent == null ? "-" : formatPercent(row.percent)}
                  </dd>
                </div>
                <div className="min-w-0">
                  <dt className="text-[10px] font-medium uppercase text-[var(--fly-text-muted)]">
                    vs esperado
                  </dt>
                  <dd
                    className={cn(
                      "mt-1 truncate text-sm font-semibold tabular-nums",
                      getExpectedDeltaClass(delta),
                    )}
                  >
                    {formatExpectedDelta(delta)}
                  </dd>
                </div>
                <div className="min-w-0 text-right">
                  <dt className="text-[10px] font-medium uppercase text-[var(--fly-text-muted)]">
                    Projeção
                  </dt>
                  <dd className="mt-1 truncate text-sm font-semibold tabular-nums text-[var(--fly-text-soft)]">
                    {formatCurrency(row.projection)}
                  </dd>
                </div>
                {showRoas ? (
                  <div className="min-w-0">
                    <dt className="text-[10px] font-medium uppercase text-[var(--fly-text-muted)]">
                      ROAS
                    </dt>
                    <dd className="mt-1 text-sm font-semibold tabular-nums text-[var(--fly-text-soft)]">
                      {formatRatio(row.roas)}
                    </dd>
                  </div>
                ) : null}
              </dl>
            </article>
          );
        })}
      </div>

      <div className="hidden overflow-x-auto lg:block">
        <table className="w-full min-w-[1120px] text-left text-sm">
        <thead>
          <tr className="border-b border-[var(--fly-divider)] bg-[var(--fly-table-head)] text-[11px] font-semibold uppercase text-[var(--fly-text-muted)]">
            <th className="w-[24%] px-3 py-3">Canal / fator</th>
            <th className="w-[12%] px-3 py-3 text-right">Meta mês</th>
            <th className="w-[13%] px-3 py-3 text-right">Esperado até hoje</th>
            <th className="w-[13%] px-3 py-3 text-right">Realizado</th>
            <th className="w-[13%] px-3 py-3 text-right">Desvio vs esperado</th>
            <th className="w-[9%] px-3 py-3 text-right">% meta</th>
            <th className="w-[12%] px-3 py-3 text-right">Projeção mês</th>
            {showRoas ? <th className="w-[10%] px-3 py-3 text-right">ROAS atual</th> : null}
            <th className="w-[8%] px-3 py-3 text-right">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--fly-divider-subtle)]">
          {rows.map((row) => {
            const delta = getExpectedDelta(row);

            return (
              <tr
                key={row.id}
                className={cn(
                  "border-l-2 border-l-transparent transition-colors duration-150 hover:bg-[var(--fly-row-hover)]",
                  row.kind === "group" &&
                    "border-l-[var(--fly-border-strong)] bg-[var(--fly-row-bg)]",
                  row.kind === "reconciliation" &&
                    "border-l-[var(--fly-chart-investment)] bg-[var(--fly-info-bg)]",
                  row.kind === "total" &&
                    "border-l-[var(--fly-chart-revenue)] bg-[var(--fly-surface-elevated)] text-[var(--fly-text)]",
                )}
              >
                <td className="px-3 py-3.5">
                  <div
                    className={cn(
                      "min-w-0",
                      row.depth === 1 && "pl-4",
                      row.kind !== "item" && "font-semibold",
                    )}
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <span
                        aria-hidden="true"
                        className={cn(
                          "size-1.5 shrink-0 rounded-full",
                          row.kind === "total"
                            ? "bg-[var(--fly-chart-revenue)]"
                            : row.kind === "reconciliation"
                              ? "bg-[var(--fly-chart-investment)]"
                              : row.kind === "group"
                                ? "bg-[var(--fly-text-soft)]"
                                : "bg-[var(--fly-border-strong)]",
                        )}
                      />
                      <span
                        className={cn(
                          "truncate",
                          row.kind === "item"
                            ? "text-[var(--fly-text-soft)]"
                            : "text-[var(--fly-text)]",
                        )}
                      >
                        {row.label}
                      </span>
                    </div>
                    {row.note ? (
                      <p className="mt-1 truncate text-xs font-normal text-[var(--fly-text-muted)]">
                        {row.note}
                      </p>
                    ) : null}
                  </div>
                </td>
                <td className="px-3 py-3.5 text-right tabular-nums text-[var(--fly-text-muted)]">
                  {formatCurrency(row.meta)}
                </td>
                <td className="px-3 py-3.5 text-right tabular-nums text-[var(--fly-text-muted)]">
                  {formatCurrency(row.expected)}
                </td>
                <td className="px-3 py-3.5 text-right font-semibold tabular-nums text-[var(--fly-info-text)]">
                  {formatCurrency(row.realized)}
                </td>
                <td
                  className={cn(
                    "px-3 py-3.5 text-right font-semibold tabular-nums",
                    getExpectedDeltaClass(delta),
                  )}
                >
                  {formatExpectedDelta(delta)}
                </td>
                <td className="px-3 py-3.5 text-right font-semibold tabular-nums text-[var(--fly-text)]">
                  {row.percent == null ? "-" : formatPercent(row.percent)}
                </td>
                <td className="px-3 py-3.5 text-right tabular-nums text-[var(--fly-text-soft)]">
                  {formatCurrency(row.projection)}
                </td>
                {showRoas ? (
                  <td className="px-3 py-3.5 text-right tabular-nums text-[var(--fly-text-soft)]">
                    {formatRatio(row.roas)}
                  </td>
                ) : null}
                <td className="px-3 py-3.5 text-right">
                  <StatusLabel status={row.status} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      </div>
    </>
  );
}

function LossTable({ rows }: { rows: LossRow[] }) {
  return (
    <>
      <div className="space-y-2 lg:hidden">
        {rows.map((row) => {
          const margin = getLossMargin(row);

          return (
            <article
              className="rounded-[8px] border border-[var(--fly-border-subtle)] bg-[var(--fly-row-bg)] px-3 py-3"
              key={row.id}
            >
              <div className="flex min-w-0 items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-[var(--fly-text)]">
                    {row.label}
                  </p>
                  <p className="mt-1 line-clamp-2 text-xs leading-5 text-[var(--fly-text-muted)]">
                    {row.action}
                  </p>
                </div>
                <StatusLabel status={row.status} />
              </div>

              <dl className="mt-3 grid grid-cols-2 gap-3">
                <div className="min-w-0">
                  <dt className="text-[10px] font-medium uppercase text-[var(--fly-text-muted)]">
                    {row.inverse ? "Limite" : "Meta"}
                  </dt>
                  <dd className="mt-1 truncate text-sm font-semibold tabular-nums text-[var(--fly-text-soft)]">
                    {formatLossTarget(row)}
                  </dd>
                </div>
                <div className="min-w-0">
                  <dt className="text-[10px] font-medium uppercase text-[var(--fly-text-muted)]">
                    Atual
                  </dt>
                  <dd className="mt-1 truncate text-sm font-semibold tabular-nums text-[var(--fly-info-text)]">
                    {formatGoalValue(row.actual, row.unit)}
                  </dd>
                </div>
                <div className="col-span-2 min-w-0">
                  <dt className="text-[10px] font-medium uppercase text-[var(--fly-text-muted)]">
                    Margem
                  </dt>
                  <dd className={cn("mt-1 text-sm font-semibold tabular-nums", margin.className)}>
                    {margin.text}
                  </dd>
                </div>
              </dl>

              <div className="mt-3">
                <LossRangeGauge row={row} />
              </div>
            </article>
          );
        })}
      </div>

      <div className="hidden overflow-x-auto lg:block">
        <table className="w-full min-w-[880px] text-left text-sm">
        <thead>
          <tr className="border-b border-[var(--fly-divider)] bg-[var(--fly-table-head)] text-[11px] font-semibold uppercase text-[var(--fly-text-muted)]">
            <th className="w-[24%] px-3 py-3">Indicador</th>
            <th className="w-[13%] px-3 py-3 text-right">Atual</th>
            <th className="w-[13%] px-3 py-3 text-right">Limite/meta</th>
            <th className="w-[17%] px-3 py-3 text-right">Margem</th>
            <th className="w-[23%] px-3 py-3">Leitura</th>
            <th className="w-[10%] px-3 py-3 text-right">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--fly-divider-subtle)]">
          {rows.map((row) => {
            const margin = getLossMargin(row);

            return (
              <tr
                key={row.id}
                className="transition-colors duration-150 hover:bg-[var(--fly-row-hover)]"
              >
                <td className="px-3 py-3.5 font-semibold text-[var(--fly-text)]">
                  <div className="min-w-0">
                    <p>{row.label}</p>
                    <p className="mt-1 text-xs font-normal text-[var(--fly-text-muted)]">
                      {row.action}
                    </p>
                  </div>
                </td>
                <td className="px-3 py-3.5 text-right font-semibold tabular-nums text-[var(--fly-info-text)]">
                  {formatGoalValue(row.actual, row.unit)}
                </td>
                <td className="px-3 py-3.5 text-right font-semibold tabular-nums text-[var(--fly-text-soft)]">
                  {formatLossTarget(row)}
                </td>
                <td className={cn("px-3 py-3.5 text-right font-semibold tabular-nums", margin.className)}>
                  {margin.text}
                </td>
                <td className="px-3 py-3.5">
                  <LossRangeGauge row={row} />
                </td>
                <td className="px-3 py-3.5 text-right">
                  <StatusLabel status={row.status} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      </div>
    </>
  );
}

export default async function MetasPage({
  searchParams,
}: {
  searchParams: Promise<MetasPageParams>;
}) {
  const pageStartedAt = performance.now();
  const params = await searchParams;
  const month = resolveMonth(params);
  const activeGpdView = resolveGpdView(params);
  const pace = getMonthPace(month);
  const [planningData, cfoData, channelData] = await timedServerTask(
    "metas",
    "data.total",
    () =>
      Promise.all([
        getMetasPlanningPageData(month),
        getMetasPageData(month),
        getChannelAnalytics(pace.startDate, pace.endDate),
      ]),
  );
  const { backendRows, operationRows, totalRow, trafficRows } = buildGpdRows({
    channelData,
    cfoData,
    pace,
    planningData,
  });
  const lossRows = buildLossRows(cfoData.goals);
  const visibleOperationRows =
    activeGpdView === "frontend"
      ? trafficRows
      : activeGpdView === "backend"
        ? backendRows
        : operationRows;
  const showOperationRoas = activeGpdView === "frontend";

  logServerTiming("metas", "total", pageStartedAt);

  return (
    <Shell>
      <DashboardHeader
        title="Metas"
        description={`Realizado vs meta mensal · ${planningData.monthLabel}`}
        actions={<MetasMonthFilter month={planningData.month} />}
      />

      <PageBody>
        <StatGrid columns="xl:grid-cols-5">
          <StatCard
            detail="meta financeira mensal"
            label="Meta do mês"
            tone="gold"
            value={formatCurrency(totalRow.meta)}
          />
          <StatCard
            detail={`esperado até hoje ${formatCurrency(totalRow.expected)}`}
            label="Realizado"
            tone="blue"
            value={formatCurrency(totalRow.realized)}
          />
          <StatCard
            detail={`${pace.elapsedDays}/${pace.totalDays} dias considerados`}
            label="% da meta"
            tone={totalRow.status === "bad" ? "orange" : "green"}
            value={totalRow.percent == null ? "-" : formatPercent(totalRow.percent)}
          />
          <StatCard
            detail="ritmo atual projetado para o fechamento"
            label="Projeção mês"
            tone="neutral"
            value={formatCurrency(totalRow.projection)}
          />
          <StatCard
            detail={`investimento realizado ${formatCurrency(cfoData.summary.investment.realized)}`}
            label="ROAS consolidado"
            tone="gold"
            value={formatRatio(cfoData.summary.roas.realized)}
          />
        </StatGrid>

        {planningData.source === "empty" ? (
          <Panel
            title="Nenhuma meta cadastrada"
            description="Cadastre as metas mensais para liberar o acompanhamento real."
          >
            <div className="rounded-[8px] bg-[var(--fly-row-bg)] px-4 py-8 text-center">
              <p className="text-sm font-medium text-[var(--fly-text)]">
                Sem planejamento para {planningData.monthLabel}.
              </p>
              <p className="mt-1 text-xs text-[var(--fly-text-muted)]">
                A tela já está pronta para exibir o contrato assim que houver dados.
              </p>
            </div>
          </Panel>
        ) : null}

        <Panel
          title="GPD · Realizado vs meta"
          description="Leitura principal no eixo da planilha, fechando Front + Back + outras receitas com o financeiro"
          action={
            <div className="flex flex-wrap items-center justify-end gap-2">
              <SourceBadge>{pace.startDate} - {pace.endDate}</SourceBadge>
              <SourceBadge>{pace.elapsedDays} dias decorridos</SourceBadge>
            </div>
          }
        >
          <GpdViewSelector activeView={activeGpdView} month={planningData.month} />
          <GpdTable rows={visibleOperationRows} showRoas={showOperationRoas} />
        </Panel>

        <Panel
          title="CB + reembolso"
          description="Taxas inversas lidas por limite: quanto menor, melhor. A margem mostra a distância em pontos percentuais."
        >
          <LossTable rows={lossRows} />
        </Panel>

        <Panel
          title="Fechamento semanal do CFO"
          description="Inputs manuais que completam lucro líquido, EBITDA, CMV e eficiência"
        >
          <CfoWeeklyInputs month={cfoData.month} weeks={cfoData.manualInputs.weeks} />
        </Panel>
      </PageBody>
    </Shell>
  );
}
