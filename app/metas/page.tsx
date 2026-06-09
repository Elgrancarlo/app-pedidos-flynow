import { MetasMonthFilter } from "@/components/metas/metas-month-filter";
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
  getMetasPlanningPageData,
  normalizeMetasPlanningMonth,
  type MetasPlanningComposition,
} from "@/lib/metas-planning";
import { logServerTiming, timedServerTask } from "@/lib/server-timing";
import { formatCurrency, formatPercent } from "@/lib/utils";

export const dynamic = "force-dynamic";

type MetasPageParams = {
  endDate?: string;
  mes?: string;
  startDate?: string;
};

function resolveMonth(params: MetasPageParams) {
  return normalizeMetasPlanningMonth(
    params.mes ?? params.startDate ?? params.endDate,
  );
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: 0,
  }).format(value);
}

function formatRatio(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(value);
}

function formatShortDate(value: string) {
  return new Date(`${value}T12:00:00`).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  });
}

function formatCompositionValue(item: MetasPlanningComposition) {
  if (item.unit === "currency") return formatCurrency(item.value);
  if (item.unit === "percent") return formatPercent(item.value);
  if (item.unit === "ratio") return formatRatio(item.value);

  return formatNumber(item.value);
}

export default async function MetasPage({
  searchParams,
}: {
  searchParams: Promise<MetasPageParams>;
}) {
  const pageStartedAt = performance.now();
  const params = await searchParams;
  const month = resolveMonth(params);
  const data = await timedServerTask("metas", "data.total", () =>
    getMetasPlanningPageData(month),
  );
  const plannedRevenue = data.summary.frontRevenue + data.summary.backendRevenue;

  logServerTiming("metas", "total", pageStartedAt);

  return (
    <Shell>
      <DashboardHeader
        title="Metas"
        description={`Planejamento mensal de receita, mídia e operação · ${data.monthLabel}`}
        actions={<MetasMonthFilter month={data.month} />}
      />

      <PageBody>
        <StatGrid columns="xl:grid-cols-5">
          <StatCard
            detail="meta liquida configurada para o mês"
            label="Receita alvo"
            tone="gold"
            value={formatCurrency(data.summary.revenue)}
          />
          <StatCard
            detail="orçamento total de tráfego"
            label="Investimento"
            tone="blue"
            value={formatCurrency(data.summary.investment)}
          />
          <StatCard
            detail={`break-even ${formatRatio(data.summary.breakevenRoas)}`}
            label="ROAS exigido"
            tone="green"
            value={formatRatio(data.summary.requiredRoas)}
          />
          <StatCard
            detail={`ticket médio ${formatCurrency(data.summary.ticket)}`}
            label="Clientes"
            tone="neutral"
            value={formatNumber(data.summary.customers)}
          />
          <StatCard
            detail={`tráfego ${formatCurrency(data.summary.frontRevenue)} · backend ${formatCurrency(data.summary.backendRevenue)}`}
            label="Receita planejada"
            tone="gold"
            value={formatCurrency(plannedRevenue)}
          />
        </StatGrid>

        {data.source === "empty" ? (
          <Panel
            title="Nenhuma meta cadastrada"
            description="Quando o backend cadastrar as metas mensais, este painel passa a exibir o planejamento automaticamente."
          >
            <div className="rounded-[8px] border border-[var(--fly-border-subtle)] bg-[var(--fly-row-bg)] px-4 py-8 text-center">
              <p className="text-sm font-medium text-[var(--fly-text)]">
                Sem planejamento para {data.monthLabel}.
              </p>
              <p className="mt-1 text-xs text-[var(--fly-text-muted)]">
                As metas mensais e semanas configuradas aparecerão aqui assim que
                houver cadastro.
              </p>
            </div>
          </Panel>
        ) : null}

        <div className="grid gap-4 xl:grid-cols-2">
          <Panel
            title="Investimento por canal"
            description="Distribuição planejada do orçamento de mídia"
          >
            <DataList
              rows={data.channels.map((channel) => ({
                detail: `${formatPercent(channel.share)} do orçamento · ROAS ${formatRatio(channel.roas)}`,
                label: channel.label,
                meter: channel.share,
                tone: "blue" as const,
                value: formatCurrency(channel.investment),
              }))}
              valueLabel="Invest."
            />
          </Panel>

          <Panel
            title="Receita planejada"
            description="Como a meta se distribui entre mídia paga e operação"
          >
            <div className="grid gap-3 lg:grid-cols-2">
              <div className="min-w-0 rounded-[8px] border border-[var(--fly-border-subtle)] bg-[var(--fly-row-bg)] p-3">
                <div className="mb-3 flex min-w-0 items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[var(--fly-text)]">
                      Tráfego pago
                    </p>
                    <p className="mt-1 text-xs text-[var(--fly-text-muted)]">
                      Receita planejada por canal de mídia
                    </p>
                  </div>
                  <StatusPill tone="gold">
                    {formatCurrency(data.summary.frontRevenue)}
                  </StatusPill>
                </div>
                <DataList
                  rows={data.channels.map((channel) => ({
                    detail: `investimento ${formatCurrency(channel.investment)}`,
                    label: channel.label,
                    meter:
                      data.summary.frontRevenue > 0
                        ? channel.revenue / data.summary.frontRevenue
                        : 0,
                    tone: channel.revenue > 0 ? ("gold" as const) : ("neutral" as const),
                    value: formatCurrency(channel.revenue),
                  }))}
                  valueLabel="Receita"
                />
              </div>

              <div className="min-w-0 rounded-[8px] border border-[var(--fly-border-subtle)] bg-[var(--fly-row-bg)] p-3">
                <div className="mb-3 flex min-w-0 items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[var(--fly-text)]">
                      Backend
                    </p>
                    <p className="mt-1 text-xs text-[var(--fly-text-muted)]">
                      Receita planejada por canais operacionais
                    </p>
                  </div>
                  <StatusPill tone="gold">
                    {formatCurrency(data.summary.backendRevenue)}
                  </StatusPill>
                </div>
                <DataList
                  rows={data.backend.map((channel) => ({
                    detail: `${formatNumber(channel.conversions)} conversões · ticket ${formatCurrency(channel.ticket)}`,
                    label: channel.label,
                    meter:
                      data.summary.backendRevenue > 0
                        ? channel.revenue / data.summary.backendRevenue
                        : 0,
                    tone: channel.revenue > 0 ? ("gold" as const) : ("neutral" as const),
                    value: formatCurrency(channel.revenue),
                  }))}
                  valueLabel="Receita"
                />
              </div>
            </div>
          </Panel>
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <Panel
            title="Composição da meta"
            description="Premissas financeiras usadas no acompanhamento"
          >
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {data.composition.map((item) => (
                <div
                  key={item.id}
                  className="rounded-[8px] border border-[var(--fly-border-subtle)] bg-[var(--fly-row-bg)] px-3 py-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="truncate text-sm font-medium text-[var(--fly-text-soft)]">
                      {item.label}
                    </p>
                    <StatusPill tone={item.tone}>
                      {item.unit === "currency" ? "R$" : item.unit === "percent" ? "%" : "Meta"}
                    </StatusPill>
                  </div>
                  <p className="mt-3 text-xl font-semibold tabular-nums text-[var(--fly-text)]">
                    {formatCompositionValue(item)}
                  </p>
                </div>
              ))}
            </div>
          </Panel>

          <Panel
            title="Backend planejado"
            description="Conversões, receita e ticket esperados por canal"
          >
            <SimpleTable
              columns={["Canal", "Conversões", "Receita", "Ticket"]}
              rows={data.backend.map((item) => [
                item.label,
                formatNumber(item.conversions),
                formatCurrency(item.revenue),
                formatCurrency(item.ticket),
              ])}
            />
          </Panel>
        </div>

        <Panel
          title="Semanas configuradas"
          description="Janelas que alimentam o painel de CFO"
        >
          <SimpleTable
            columns={["Semana", "Período", "Receita prevista", "Investimento", "ROAS"]}
            rows={data.weeks.map((week) => [
              week.label,
              `${formatShortDate(week.inicio)} - ${formatShortDate(week.fim)}`,
              formatCurrency(week.receitaPrevista),
              formatCurrency(week.investimentoPrevisto),
              formatRatio(week.roasPrevisto),
            ])}
          />
        </Panel>
      </PageBody>
    </Shell>
  );
}
