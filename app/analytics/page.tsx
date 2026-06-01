import {
  BarChart3,
  Megaphone,
  MousePointerClick,
  Target,
  Wallet,
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

export default async function AnalyticsPage() {
  const data = await getPerformancePageData();
  const maxProductRevenue = Math.max(
    1,
    ...data.products.map((item) => item.revenue)
  );
  const maxChannelRevenue = Math.max(
    1,
    ...data.channels.map((item) => item.revenue)
  );

  return (
    <Shell>
      <DashboardHeader
        title="Analytics"
        description="Receita, mídia, campanhas e sinais de performance"
        actions={<SourceBadge source={data.source} />}
      />

      <PageBody>
        <StatGrid>
          <StatCard
            label="Receita total"
            value={formatCurrency(data.summary.revenueTotal)}
            detail={`${formatNumber(data.summary.directSales)} vendas diretas`}
            Icon={Wallet}
            tone="gold"
            rows={[
              {
                label: "Receita atribuída",
                value: formatCurrency(data.summary.attributedRevenueTotal),
                meter:
                  data.summary.revenueTotal > 0
                    ? data.summary.attributedRevenueTotal /
                      data.summary.revenueTotal
                    : 0,
              },
            ]}
          />
          <StatCard
            label="Investimento"
            value={formatCurrency(data.summary.spendTotal)}
            detail="Mídia e canais pagos"
            Icon={Megaphone}
            tone="blue"
            rows={[
              {
                label: "ROAS consolidado",
                value: data.summary.roas.toLocaleString("pt-BR", {
                  maximumFractionDigits: 2,
                }),
                meter: data.summary.roas / 10,
              },
            ]}
          />
          <StatCard
            label="Cliques"
            value={formatNumber(data.summary.clicksTotal)}
            detail={`${formatNumber(data.summary.conversionsTotal)} conversões`}
            Icon={MousePointerClick}
            tone="green"
            rows={[
              {
                label: "CVR mídia",
                value: formatPercent(
                  data.summary.clicksTotal > 0
                    ? data.summary.conversionsTotal / data.summary.clicksTotal
                    : 0
                ),
                meter:
                  data.summary.clicksTotal > 0
                    ? data.summary.conversionsTotal / data.summary.clicksTotal
                    : 0,
              },
            ]}
          />
          <StatCard
            label="Ticket médio"
            value={formatCurrency(data.summary.aov)}
            detail="Receita direta por venda"
            Icon={Target}
            tone="neutral"
            rows={[
              {
                label: "Upsell no total",
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
        </StatGrid>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(340px,0.65fr)]">
          <Panel
            title="Produtos por receita"
            description={`${formatDate(data.range.startDate)} - ${formatDate(data.range.endDate)}`}
            action={<BarChart3 aria-hidden="true" className="size-4 text-[var(--fly-text-muted)]" />}
          >
            <DataList
              valueLabel="receita"
              rows={data.products.map((item) => ({
                label: item.product,
                value: formatCurrency(item.revenue),
                detail: `${formatNumber(item.directSales)} vendas · AOV ${formatCurrency(item.aov)}`,
                meter: item.revenue / maxProductRevenue,
                tone: item.takeRate >= 0.35 ? "green" : "gold",
              }))}
            />
          </Panel>

          <Panel title="Canais" description="Ranking por receita operacional">
            <DataList
              valueLabel="ROAS"
              rows={data.channels.map((item) => ({
                label: item.label,
                value: item.roas.toLocaleString("pt-BR", {
                  maximumFractionDigits: 2,
                }),
                detail: `${formatCurrency(item.revenue)} · ${formatNumber(item.directSales)} vendas`,
                meter: item.revenue / maxChannelRevenue,
                tone: item.roas >= 4 ? "green" : item.roas >= 3 ? "gold" : "red",
              }))}
            />
          </Panel>
        </div>

        <Panel
          title="Campanhas"
          description="Campanhas com gasto, tráfego e retorno"
        >
          <SimpleTable
            columns={["Campanha", "Origem", "Produto", "Cliques", "ROAS"]}
            rows={data.campaigns.map((item) => [
              item.campaign,
              item.source,
              item.product,
              formatNumber(item.clicks),
              item.roas.toLocaleString("pt-BR", { maximumFractionDigits: 2 }),
            ])}
          />
        </Panel>

        <Panel title="Sinais recentes" description="Leituras para priorização do dia">
          <DataList
            valueLabel="nível"
            rows={data.alerts.map((item) => ({
              label: item.title,
              value:
                item.level === "danger"
                  ? "Crítico"
                  : item.level === "warning"
                    ? "Atenção"
                    : item.level === "ok"
                      ? "OK"
                      : "Info",
              detail: item.detail,
              tone:
                item.level === "danger"
                  ? "red"
                  : item.level === "warning"
                    ? "gold"
                    : item.level === "ok"
                      ? "green"
                      : "blue",
            }))}
          />
        </Panel>
      </PageBody>
    </Shell>
  );
}
