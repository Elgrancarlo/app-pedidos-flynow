import { FinanceiroPeriodFilter } from "@/components/financeiro/financeiro-period-filter";
import Shell from "@/components/layout/shell";
import { DashboardHeader } from "@/components/layout/dashboard-header";
import {
  PageBody,
  Panel,
  StatCard,
  StatGrid,
} from "@/components/workspace/operational-ui";
import {
  getDefaultFinanceiroRange,
  getFinanceiroPageData,
  type FinanceiroPageData,
  type FinanceiroRange,
} from "@/lib/financeiro";
import { formatCurrency, formatPercent } from "@/lib/utils";

export const dynamic = "force-dynamic";

function resolveRange(params: { startDate?: string; endDate?: string }) {
  const defaults = getDefaultFinanceiroRange(1);
  const startDate = params.startDate ?? defaults.startDate;
  const endDate = params.endDate ?? defaults.endDate;

  return startDate <= endDate
    ? ({ startDate, endDate } satisfies FinanceiroRange)
    : ({ startDate: endDate, endDate: startDate } satisfies FinanceiroRange);
}

function formatDateLong(value: string) {
  return new Date(`${value}T12:00:00`).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    weekday: "short",
    year: "numeric",
  });
}

function FinanceEventCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "red" | "gold" | "neutral";
}) {
  const borderClass = {
    red: "border-l-[#F87171]",
    gold: "border-l-[#D6A84F]",
    neutral: "border-l-white/35",
  }[tone];
  const valueClass = {
    red: "text-[#FCA5A5]",
    gold: "text-[#F0C76A]",
    neutral: "text-[var(--fly-text)]",
  }[tone];

  return (
    <section
      className={`flynow-dashboard-enter-item min-w-0 rounded-[8px] border border-white/[0.07] border-l-4 ${borderClass} bg-[#0B0D10] p-4 shadow-[0_1px_0_rgba(255,255,255,0.03),inset_0_1px_0_rgba(255,255,255,0.035)]`}
    >
      <p className={`text-[22px] font-semibold leading-none tabular-nums ${valueClass}`}>
        {value}
      </p>
      <p className="mt-3 text-xs leading-5 text-[var(--fly-text-muted)]">
        {label}
      </p>
    </section>
  );
}

function clampRatio(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(Math.max(value, 0), 1);
}

function chartWidth(ratio: number) {
  const safeRatio = clampRatio(ratio);
  if (safeRatio === 0) return "2px";
  return `${Math.max(safeRatio * 100, 3)}%`;
}

function FinanceCompositionRow({
  label,
  value,
  detail,
  ratio,
  tone,
  prefix = "",
}: {
  label: string;
  value: number;
  detail: string;
  ratio: number;
  tone: "gold" | "green" | "red" | "amber" | "neutral";
  prefix?: string;
}) {
  const toneClass = {
    gold: "bg-[#D6A84F]/80",
    green: "bg-[#4ADE80]/80",
    red: "bg-[#F87171]/80",
    amber: "bg-[#F0C76A]/80",
    neutral: "bg-white/35",
  }[tone];
  const dotClass = {
    gold: "bg-[#D6A84F]",
    green: "bg-[#4ADE80]",
    red: "bg-[#F87171]",
    amber: "bg-[#F0C76A]",
    neutral: "bg-white/35",
  }[tone];
  const valueClass = {
    gold: "text-[var(--fly-text)]",
    green: "text-[var(--fly-text)]",
    red: "text-[#FCA5A5]",
    amber: "text-[#F0C76A]",
    neutral: "text-[var(--fly-text-soft)]",
  }[tone];
  const safeRatio = clampRatio(ratio);

  return (
    <div className="grid gap-2 border-t border-white/[0.055] py-3 sm:grid-cols-[minmax(150px,0.45fr)_minmax(0,1fr)_74px] sm:items-center sm:gap-4">
      <div className="min-w-0">
        <div className="flex min-w-0 items-center gap-2">
          <span className={`size-1.5 shrink-0 rounded-full ${dotClass}`} />
          <p className="truncate text-[11px] font-medium uppercase text-[var(--fly-text-muted)]">
            {label}
          </p>
        </div>
        <p className={`mt-2 text-[17px] font-semibold leading-none tabular-nums ${valueClass}`}>
          {prefix}
          {formatCurrency(value)}
        </p>
        <p className="mt-1.5 text-xs leading-5 text-[var(--fly-text-muted)]">
          {detail}
        </p>
      </div>

      <div
        aria-label={`${label}: ${formatPercent(safeRatio)} da receita bruta`}
        className="min-w-0 overflow-hidden rounded-full bg-white/[0.055]"
      >
        <span
          className={`block h-1.5 rounded-full ${toneClass}`}
          style={{ width: chartWidth(safeRatio) }}
        />
      </div>

      <p className="text-left text-[11px] font-semibold tabular-nums text-[var(--fly-text-muted)] sm:text-right">
        {formatPercent(safeRatio)}
      </p>
    </div>
  );
}

function FinanceCompositionChart({ data }: { data: FinanceiroPageData }) {
  const grossBase = Math.max(data.receitaBruta, 1);
  const chargebackRatio = clampRatio(data.valorChargebacks / grossBase);
  const refundRatio = clampRatio(data.valorReembolsos / grossBase);
  const revertedRatio = clampRatio(data.totalRevertido / grossBase);
  const retainedRatio = clampRatio(data.receitaLiquida / grossBase);

  const stackedSegments = [
    {
      label: "Receita líquida",
      value: data.receitaLiquida,
      ratio: retainedRatio,
      className: "bg-[#4ADE80]/80",
    },
    {
      label: "Chargebacks",
      value: data.valorChargebacks,
      ratio: chargebackRatio,
      className: "bg-[#F87171]/80",
    },
    {
      label: "Reembolsos",
      value: data.valorReembolsos,
      ratio: refundRatio,
      className: "bg-[#F0C76A]/80",
    },
  ];

  return (
    <div className="min-h-[430px] space-y-5">
      <div className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
          <div className="min-w-0">
            <p className="text-[11px] font-medium uppercase text-[var(--fly-text-muted)]">
              Receita do período
            </p>
            <p className="mt-2 text-[26px] font-semibold leading-none tabular-nums text-[var(--fly-text)] sm:text-[32px]">
              {formatCurrency(data.receitaBruta)}
            </p>
            <p className="mt-2 text-xs leading-5 text-[var(--fly-text-muted)]">
              {data.totalPedidos.toLocaleString("pt-BR")} pedidos pagos · ticket médio{" "}
              {formatCurrency(data.ticketMedio)}
            </p>
          </div>
          <div className="min-w-[118px] border-t border-white/[0.07] pt-3 sm:border-l sm:border-t-0 sm:pl-4 sm:pt-0">
            <p className="text-[10px] font-medium uppercase text-[var(--fly-text-muted)]">
              Retenção
            </p>
            <p className="mt-1 text-xl font-semibold tabular-nums text-[#86EFAC]">
              {formatPercent(retainedRatio)}
            </p>
          </div>
        </div>

        <div>
          <div className="flex h-8 overflow-hidden rounded-[6px] bg-white/[0.045]">
            {stackedSegments.map((segment) => (
              <span
                key={segment.label}
                title={`${segment.label}: ${formatCurrency(segment.value)}`}
                className={`h-full shrink-0 ${segment.className}`}
                style={{
                  flexBasis: `${clampRatio(segment.ratio) * 100}%`,
                  minWidth: segment.value > 0 ? "4px" : "0",
                }}
              />
            ))}
          </div>

          <div className="mt-3 grid gap-2 text-[11px] text-[var(--fly-text-muted)] sm:grid-cols-3">
            {stackedSegments.map((segment) => (
              <div key={segment.label} className="flex min-w-0 items-center justify-between gap-2">
                <span className="inline-flex min-w-0 items-center gap-1.5">
                  <span className={`size-1.5 shrink-0 rounded-full ${segment.className}`} />
                  <span className="truncate">{segment.label}</span>
                </span>
                <span className="shrink-0 font-semibold tabular-nums text-[var(--fly-text-soft)]">
                  {formatPercent(segment.ratio)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div>
        <FinanceCompositionRow
          label="Receita bruta"
          value={data.receitaBruta}
          detail={`${data.totalPedidos.toLocaleString("pt-BR")} pedidos pagos`}
          ratio={1}
          tone="gold"
        />
        <FinanceCompositionRow
          label="Chargebacks"
          value={data.valorChargebacks}
          detail={`${data.chargebacks.toLocaleString("pt-BR")} eventos · taxa CB ${formatPercent(data.taxaChargeback)}`}
          ratio={chargebackRatio}
          tone="red"
          prefix="-"
        />
        <FinanceCompositionRow
          label="Reembolsos"
          value={data.valorReembolsos}
          detail={`${data.reembolsos.toLocaleString("pt-BR")} eventos`}
          ratio={refundRatio}
          tone="amber"
          prefix="-"
        />
        <FinanceCompositionRow
          label="Total revertido"
          value={data.totalRevertido}
          detail={`${formatPercent(revertedRatio)} da receita bruta do período`}
          ratio={revertedRatio}
          tone="neutral"
          prefix="-"
        />
        <FinanceCompositionRow
          label="Receita líquida"
          value={data.receitaLiquida}
          detail={`${formatPercent(retainedRatio)} da receita bruta preservada`}
          ratio={retainedRatio}
          tone="green"
        />
      </div>

      <div className="border-t border-white/[0.055] pt-3">
        <p className="text-xs leading-5 text-[var(--fly-text-muted)]">
          <span className="font-medium text-[var(--fly-text-soft)]">
            Leitura:
          </span>{" "}
          {formatCurrency(data.receitaBruta)} brutos menos{" "}
          {formatCurrency(data.valorChargebacks)} em chargebacks e{" "}
          {formatCurrency(data.valorReembolsos)} em reembolsos resultam em{" "}
          <span className="font-semibold text-[var(--fly-text)]">
            {formatCurrency(data.receitaLiquida)}
          </span>
          {" "}líquidos.
        </p>
      </div>
    </div>
  );
}

export default async function FinanceiroPage({
  searchParams,
}: {
  searchParams: Promise<{ startDate?: string; endDate?: string }>;
}) {
  const params = await searchParams;
  const range = resolveRange(params);
  const data = await getFinanceiroPageData(range);

  return (
    <Shell>
      <DashboardHeader
        title="Financeiro"
        description={`Receita, reembolsos e chargebacks · ${formatDateLong(data.range.endDate)}`}
        actions={<FinanceiroPeriodFilter range={data.range} source={data.source} />}
      />

      <PageBody>
        <StatGrid>
          <StatCard
            label="Receita bruta"
            value={formatCurrency(data.receitaBruta)}
            detail={`${data.totalPedidos.toLocaleString("pt-BR")} pedidos pagos`}
            tone="gold"
          />
          <StatCard
            label="Receita líquida"
            value={formatCurrency(data.receitaLiquida)}
            detail="bruta do período - reversões por evento no período"
            tone="green"
          />
          <StatCard
            label="Ticket médio"
            value={formatCurrency(data.ticketMedio)}
            detail="por pedido pago"
            tone="blue"
          />
          <StatCard
            label="Total revertido"
            value={formatCurrency(data.totalRevertido)}
            detail={`eventos financeiros no período · taxa CB ${formatPercent(data.taxaChargeback)}`}
            tone="red"
          />
        </StatGrid>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <FinanceEventCard
            label="Chargebacks"
            value={data.chargebacks.toLocaleString("pt-BR")}
            tone="red"
          />
          <FinanceEventCard
            label="Valor em chargeback"
            value={formatCurrency(data.valorChargebacks)}
            tone="red"
          />
          <FinanceEventCard
            label="Reembolsos"
            value={data.reembolsos.toLocaleString("pt-BR")}
            tone="gold"
          />
          <FinanceEventCard
            label="Valor reembolsado"
            value={formatCurrency(data.valorReembolsos)}
            tone="neutral"
          />
        </div>

        <Panel
          title="Composição financeira"
          description="Como a receita bruta vira receita líquida no período"
        >
          <FinanceCompositionChart data={data} />
        </Panel>
      </PageBody>
    </Shell>
  );
}
