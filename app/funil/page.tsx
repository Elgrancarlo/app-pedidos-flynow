import {
  Activity,
  Funnel,
  ListChecks,
  ReceiptText,
  TrendingUp,
} from "lucide-react";

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
import { getPerformancePageData } from "@/lib/performance-pages";
import { formatCurrency, formatPercent } from "@/lib/utils";

export const dynamic = "force-dynamic";

function formatNumber(value: number) {
  return new Intl.NumberFormat("pt-BR").format(value);
}

function formatDate(value: string) {
  return new Date(`${value}T12:00:00`).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  });
}

function SourceBadge({ source }: { source: "mock" | "real" }) {
  return (
    <StatusPill tone={source === "real" ? "green" : "gold"}>
      {source === "real" ? "Dados reais" : "Mock ativo"}
    </StatusPill>
  );
}

export default async function FunilPage() {
  const data = await getPerformancePageData();
  const maxRevenue = Math.max(
    1,
    ...data.funnelDays.map((item) => item.revenueTotal)
  );
  const recentDays = data.funnelDays.slice(-18);

  return (
    <Shell>
      <DashboardHeader
        title="Funil"
        description="Vendas diretas, upsells, AOV e impactos por alteração"
        actions={<SourceBadge source={data.source} />}
      />

      <PageBody>
        <StatGrid>
          <StatCard
            label="Vendas diretas"
            value={formatNumber(data.summary.directSales)}
            detail="Base de entrada no funil"
            Icon={Funnel}
            tone="gold"
          />
          <StatCard
            label="Receita total"
            value={formatCurrency(data.summary.revenueTotal)}
            detail="Direta + upsells"
            Icon={ReceiptText}
            tone="green"
            rows={[
              {
                label: "Direta",
                value: formatCurrency(data.summary.directRevenueTotal),
                meter:
                  data.summary.revenueTotal > 0
                    ? data.summary.directRevenueTotal / data.summary.revenueTotal
                    : 0,
              },
            ]}
          />
          <StatCard
            label="Receita upsell"
            value={formatCurrency(data.summary.upsellRevenue)}
            detail={`${formatNumber(data.summary.upsellApproved)} aprovações`}
            Icon={TrendingUp}
            tone="blue"
            rows={[
              {
                label: "Peso no total",
                value: formatPercent(
                  data.summary.revenueTotal > 0
                    ? data.summary.upsellRevenue / data.summary.revenueTotal
                    : 0
                ),
                meter:
                  data.summary.revenueTotal > 0
                    ? data.summary.upsellRevenue / data.summary.revenueTotal
                    : 0,
              },
            ]}
          />
          <StatCard
            label="AOV"
            value={formatCurrency(data.summary.aov)}
            detail="Receita direta por pedido"
            Icon={Activity}
            tone="neutral"
          />
        </StatGrid>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(340px,0.65fr)]">
          <Panel
            title="Produtos no funil"
            description="Take rate e receita por produto"
          >
            <DataList
              valueLabel="take"
              rows={data.products.map((item) => ({
                label: item.product,
                value: formatPercent(item.takeRate),
                detail: `${formatCurrency(item.revenue)} · ${formatCurrency(item.upsellRevenue)} em upsell`,
                meter: item.takeRate,
                tone: item.takeRate >= 0.35 ? "green" : "gold",
              }))}
            />
          </Panel>

          <Panel title="Logs de alteração" description="Eventos com leitura de impacto">
            <DataList
              valueLabel="dono"
              rows={data.logs.map((item) => ({
                label: item.title,
                value: item.owner,
                detail: `${formatDate(item.day)} · ${item.impact}`,
                tone:
                  item.impact.toLowerCase().includes("+") ||
                  item.impact.toLowerCase().includes("positivo")
                    ? "green"
                    : "neutral",
              }))}
            />
          </Panel>
        </div>

        <Panel
          title="Dias do funil"
          description="Visão diária por produto e canal"
          action={<ListChecks aria-hidden="true" className="size-4 text-[var(--fly-text-muted)]" />}
        >
          <SimpleTable
            columns={["Data", "Produto", "Canal", "Vendas", "Receita"]}
            rows={recentDays.map((item) => [
              formatDate(item.day),
              item.product,
              item.channel.replace(/_/g, " "),
              formatNumber(item.directSales),
              formatCurrency(item.revenueTotal),
            ])}
          />
        </Panel>

        <Panel title="AOV por recorte" description="Comparação dos últimos registros">
          <DataList
            valueLabel="AOV"
            rows={recentDays.slice(-8).map((item) => ({
              label: `${formatDate(item.day)} · ${item.product}`,
              value: formatCurrency(item.aov),
              detail: `${formatPercent(item.takeRateUs1)} US1 · ${formatPercent(item.takeRateUs2)} US2`,
              meter: item.revenueTotal / maxRevenue,
              tone:
                item.takeRateUs1 + item.takeRateUs2 >= 0.42 ? "green" : "gold",
            }))}
          />
        </Panel>
      </PageBody>
    </Shell>
  );
}
