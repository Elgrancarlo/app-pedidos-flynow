import { FinanceiroPeriodFilter } from "@/components/financeiro/financeiro-period-filter";
import Shell from "@/components/layout/shell";
import { DashboardHeader } from "@/components/layout/dashboard-header";
import {
  DataList,
  PageBody,
  Panel,
  SimpleTable,
  StatCard,
  StatGrid,
  StatusPill,
} from "@/components/workspace/operational-ui";
import {
  getDefaultFinanceiroRange,
  getFinanceiroPageData,
  type FinanceiroDailyPoint,
  type FinanceiroPageData,
  type FinanceiroRange,
} from "@/lib/financeiro";
import { cn, formatCurrency, formatPercent } from "@/lib/utils";

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

function formatDateShort(value: string) {
  return new Date(`${value}T12:00:00`).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  });
}

function formatRange(range: FinanceiroRange) {
  if (range.startDate === range.endDate) {
    return formatDateShort(range.endDate);
  }

  return `${formatDateShort(range.startDate)} - ${formatDateShort(range.endDate)}`;
}

function formatQuantity(value: number) {
  return value.toLocaleString("pt-BR");
}

function ratio(value: number, total: number) {
  if (total <= 0) return 0;
  return Math.min(Math.max(value / total, 0), 1);
}

function getExecutiveReadout(data: FinanceiroPageData) {
  const reversalRate = data.receitaBruta > 0 ? data.totalRevertido / data.receitaBruta : 0;
  const gatewayRate = data.receitaBruta > 0 ? data.taxaGateway / data.receitaBruta : 0;
  const netStrength =
    data.receitaBruta > 0 ? data.receitaLiquida / data.receitaBruta : 0;

  return {
    title:
      data.totalRevertido > 0
        ? "Receita saudável, com reversões visíveis no período."
        : "Receita limpa no período, sem reversões financeiras registradas.",
    body: `${formatCurrency(data.receitaLiquida)} líquidos sobre ${formatCurrency(
      data.receitaBruta
    )} brutos. ${formatQuantity(data.totalPedidos)} pedidos pagos, ${formatQuantity(
      data.chargebacks
    )} chargebacks e ${formatQuantity(data.reembolsos)} reembolsos.`,
    metrics: [
      {
        label: "Retenção da receita",
        value: formatPercent(netStrength),
        meter: netStrength,
        tone: "green" as const,
      },
      {
        label: "Reversões / bruta",
        value: formatPercent(reversalRate),
        meter: reversalRate,
        tone: data.totalRevertido > 0 ? ("red" as const) : ("neutral" as const),
      },
      {
        label: "Gateway estimado",
        value: formatPercent(gatewayRate),
        meter: gatewayRate,
        tone: "gold" as const,
      },
    ],
  };
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

function ExecutiveReadout({ data }: { data: FinanceiroPageData }) {
  const readout = getExecutiveReadout(data);

  return (
    <section className="flynow-dashboard-enter-item rounded-[8px] border border-white/[0.07] bg-[#0B0D10] p-4 shadow-[0_1px_0_rgba(255,255,255,0.03),inset_0_1px_0_rgba(255,255,255,0.035)] sm:p-5">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(420px,0.72fr)] xl:items-center">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill tone={data.source === "real" ? "green" : "gold"}>
              {data.source === "real" ? "Dados reais" : "Mock ativo"}
            </StatusPill>
            <span className="text-xs text-[var(--fly-text-muted)]">
              Fechamento de {formatRange(data.range)}
            </span>
          </div>
          <h2 className="mt-3 max-w-3xl text-[18px] font-semibold leading-7 text-[var(--fly-text)] sm:text-[20px]">
            {readout.title}
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--fly-text-muted)]">
            {readout.body}
          </p>
        </div>

        <div className="grid gap-2 sm:grid-cols-3 xl:grid-cols-1">
          {readout.metrics.map((metric) => {
            const toneClass = {
              gold: "bg-[#D6A84F]",
              green: "bg-[#4ADE80]",
              red: "bg-[#F87171]",
              neutral: "bg-white/35",
            }[metric.tone];

            return (
              <div
                key={metric.label}
                className="rounded-[8px] border border-white/[0.055] bg-white/[0.012] px-3 py-2.5"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="truncate text-xs text-[var(--fly-text-muted)]">
                    {metric.label}
                  </span>
                  <span className="shrink-0 text-xs font-semibold tabular-nums text-[var(--fly-text)]">
                    {metric.value}
                  </span>
                </div>
                <div className="mt-2 h-px overflow-hidden rounded-full bg-white/[0.08]">
                  <span
                    aria-hidden="true"
                    className={cn("block h-full rounded-full", toneClass)}
                    style={{ width: `${Math.min(Math.max(metric.meter * 100, 3), 100)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function FinanceTrend({ series }: { series: FinanceiroDailyPoint[] }) {
  const maxValue = Math.max(
    ...series.flatMap((point) => [
      point.receitaBruta,
      point.receitaLiquida,
      point.revertido,
    ]),
    1
  );
  const visibleSeries = series.slice(-14);

  return (
    <div className="space-y-3">
      <div className="grid min-h-[190px] grid-cols-[auto_minmax(0,1fr)] gap-3">
        <div className="flex flex-col justify-between py-1 text-right text-[10px] text-[var(--fly-text-dim)]">
          <span>{formatCurrency(maxValue)}</span>
          <span>{formatCurrency(maxValue / 2)}</span>
          <span>R$ 0</span>
        </div>

        <div className="relative min-w-0 overflow-hidden rounded-[8px] border border-white/[0.055] bg-white/[0.012] px-2 pb-3 pt-4">
          <div className="absolute inset-x-2 top-1/2 border-t border-dashed border-white/[0.06]" />
          <div className="absolute inset-x-2 top-4 border-t border-dashed border-white/[0.04]" />
          <div className="absolute inset-x-2 bottom-9 border-t border-white/[0.06]" />
          <div className="relative grid gap-1" style={{ gridTemplateColumns: `repeat(${visibleSeries.length}, minmax(18px, 1fr))` }}>
            {visibleSeries.map((point) => {
              const netHeight = Math.max((point.receitaLiquida / maxValue) * 100, 3);
              const reversalHeight = point.revertido > 0
                ? Math.max((point.revertido / maxValue) * 100, 3)
                : 0;

              return (
                <div key={point.day} className="group flex min-w-0 flex-col gap-2">
                  <div className="flex h-[136px] items-end justify-center gap-1">
                    <span
                      title={`Receita líquida ${formatCurrency(point.receitaLiquida)}`}
                      className="block w-full max-w-[18px] rounded-t-sm bg-[#4ADE80]/70 transition-colors group-hover:bg-[#4ADE80]"
                      style={{ height: `${netHeight}%` }}
                    />
                    {reversalHeight > 0 ? (
                      <span
                        title={`Reversões ${formatCurrency(point.revertido)}`}
                        className="block w-full max-w-[8px] rounded-t-sm bg-[#F87171]/70 transition-colors group-hover:bg-[#F87171]"
                        style={{ height: `${reversalHeight}%` }}
                      />
                    ) : null}
                  </div>
                  <span className="truncate text-center text-[10px] text-[var(--fly-text-dim)]">
                    {formatDateShort(point.day)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 text-[11px] text-[var(--fly-text-muted)]">
        <span className="inline-flex items-center gap-1.5">
          <span className="size-1.5 rounded-full bg-[#4ADE80]" />
          Receita líquida
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-1.5 rounded-full bg-[#F87171]" />
          Reversões
        </span>
      </div>
    </div>
  );
}

function PaymentMixPanel({ data }: { data: FinanceiroPageData }) {
  const rows = data.paymentMix.length
    ? data.paymentMix.map((item) => ({
        label: item.label,
        detail: `${formatQuantity(item.orders)} pedidos`,
        value: formatCurrency(item.revenue),
        meter: ratio(item.revenue, data.receitaBruta),
        tone: item.method === "pix" ? ("green" as const) : item.method === "credit_card" ? ("blue" as const) : ("gold" as const),
      }))
    : [
        {
          label: "Sem pagamentos no período",
          detail: "Ajuste o filtro para ver a composição",
          value: formatCurrency(0),
          meter: 0,
          tone: "neutral" as const,
        },
      ];

  return (
    <Panel
      title="Composição da receita"
      description="De onde a receita paga veio no período"
    >
      <DataList rows={rows} valueLabel="Receita" />
    </Panel>
  );
}

function ReversalPanel({ data }: { data: FinanceiroPageData }) {
  const rows = data.riskRows.map((row) => ({
    label: row.label,
    detail: `${formatQuantity(row.quantity)} ocorrências`,
    value: formatCurrency(row.amount),
    meter: ratio(row.amount, Math.max(data.totalRevertido, data.receitaBruta)),
    tone: row.tone,
  }));

  return (
    <Panel
      title="Reversões e pendências"
      description="Eventos que reduzem ou atrasam o recebível"
    >
      <DataList rows={rows} valueLabel="Valor" />
    </Panel>
  );
}

function ReconciliationPanel({ data }: { data: FinanceiroPageData }) {
  const rows = [
    {
      label: "Receita líquida",
      value: formatCurrency(data.receitaLiquida),
      detail: "Base pós-reversões",
    },
    {
      label: "Taxa gateway estimada",
      value: formatCurrency(data.taxaGateway),
      detail: "Estimativa mockada",
    },
    {
      label: "Receita recebível",
      value: formatCurrency(data.receitaRecebivel),
      detail: "Líquida - gateway",
    },
    {
      label: "Aguardando pagamento",
      value: formatQuantity(data.aguardandoPagamento),
      detail: "Pedidos ainda fora da receita paga",
    },
  ];

  return (
    <Panel
      title="Conciliação"
      description="Leitura prática do que deve virar recebível"
      action={
        <StatusPill tone={data.totalRevertido > 0 ? "gold" : "green"}>
          {data.totalRevertido > 0 ? "Revisar reversões" : "Sem alerta"}
        </StatusPill>
      }
    >
      <div className="space-y-2.5">
        {rows.map((row) => (
          <div
            key={row.label}
            className="rounded-[8px] border border-white/[0.055] bg-white/[0.012] px-3 py-2.5"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-[var(--fly-text-soft)]">
                  {row.label}
                </p>
                <p className="mt-1 text-xs leading-5 text-[var(--fly-text-muted)]">
                  {row.detail}
                </p>
              </div>
              <p className="shrink-0 text-sm font-semibold tabular-nums text-[var(--fly-text)]">
                {row.value}
              </p>
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function RecentEventsPanel({ data }: { data: FinanceiroPageData }) {
  const events: string[][] = [
    data.chargebacks > 0
      ? [
          "Chargeback",
          `${formatQuantity(data.chargebacks)} pedidos`,
          formatCurrency(data.valorChargebacks),
          "Prioridade alta",
        ]
      : null,
    data.reembolsos > 0
      ? [
          "Reembolso",
          `${formatQuantity(data.reembolsos)} pedidos`,
          formatCurrency(data.valorReembolsos),
          "Acompanhar motivo",
        ]
      : null,
    data.cancelados > 0
      ? [
          "Cancelamento",
          `${formatQuantity(data.cancelados)} pedidos`,
          formatCurrency(data.riskRows.find((row) => row.label === "Cancelados")?.amount ?? 0),
          "Fora da receita paga",
        ]
      : null,
  ].filter(Boolean) as string[][];

  const rows = events.length
    ? events
    : [["Sem eventos críticos", "0 pedidos", formatCurrency(0), "Nenhuma ação"]];

  return (
    <Panel
      title="Eventos financeiros"
      description="Resumo operacional para investigar depois"
    >
      <SimpleTable columns={["Tipo", "Volume", "Valor", "Ação"]} rows={rows} />
    </Panel>
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
        <ExecutiveReadout data={data} />

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

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(340px,0.65fr)]">
          <Panel
            title="Evolução financeira"
            description="Receita líquida e reversões por dia"
          >
            <FinanceTrend series={data.dailySeries} />
          </Panel>
          <PaymentMixPanel data={data} />
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <ReversalPanel data={data} />
          <ReconciliationPanel data={data} />
        </div>

        <RecentEventsPanel data={data} />
      </PageBody>
    </Shell>
  );
}
