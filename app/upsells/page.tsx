import {
  BadgePercent,
  Layers3,
  ReceiptText,
  ShoppingBag,
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

function SourceBadge({ source }: { source: "mock" | "real" }) {
  return (
    <StatusPill tone={source === "real" ? "green" : "gold"}>
      {source === "real" ? "Dados reais" : "Mock ativo"}
    </StatusPill>
  );
}

export default async function UpsellsPage() {
  const data = await getPerformancePageData();
  const us1Wins = data.upsells.reduce((total, item) => total + item.us1Wins, 0);
  const us2Wins = data.upsells.reduce((total, item) => total + item.us2Wins, 0);
  const maxUpsellRevenue = Math.max(
    1,
    ...data.upsells.map((item) => item.upsellRevenue)
  );
  const bestProduct = data.upsells.reduce(
    (best, item) =>
      item.takeRateTotal > best.takeRateTotal ? item : best,
    data.upsells[0] ?? {
      product: "-",
      directSales: 0,
      totalApproved: 0,
      us1Wins: 0,
      us2Wins: 0,
      upsellRevenue: 0,
      takeRateTotal: 0,
      takeRateUs1: 0,
      takeRateUs2: 0,
    }
  );

  return (
    <Shell>
      <DashboardHeader
        title="Upsells"
        description="Aprovações, take rate e receita incremental por produto"
        actions={<SourceBadge source={data.source} />}
      />

      <PageBody>
        <StatGrid>
          <StatCard
            label="Receita upsell"
            value={formatCurrency(data.summary.upsellRevenue)}
            detail="Receita incremental aprovada"
            Icon={TrendingUp}
            tone="gold"
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
            label="Aprovações"
            value={formatNumber(data.summary.upsellApproved)}
            detail="US1 + US2 aprovados"
            Icon={ShoppingBag}
            tone="green"
          />
          <StatCard
            label="US1"
            value={formatNumber(us1Wins)}
            detail="Primeira oferta complementar"
            Icon={Layers3}
            tone="blue"
            rows={[
              {
                label: "Take US1",
                value: formatPercent(
                  data.summary.directSales > 0
                    ? us1Wins / data.summary.directSales
                    : 0
                ),
                meter:
                  data.summary.directSales > 0
                    ? us1Wins / data.summary.directSales
                    : 0,
              },
            ]}
          />
          <StatCard
            label="US2"
            value={formatNumber(us2Wins)}
            detail="Segunda oferta complementar"
            Icon={BadgePercent}
            tone="neutral"
            rows={[
              {
                label: "Take US2",
                value: formatPercent(
                  data.summary.directSales > 0
                    ? us2Wins / data.summary.directSales
                    : 0
                ),
                meter:
                  data.summary.directSales > 0
                    ? us2Wins / data.summary.directSales
                    : 0,
              },
            ]}
          />
        </StatGrid>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(340px,0.65fr)]">
          <Panel
            title="Receita por produto"
            description="Ranking de incremento no checkout"
            action={
              <StatusPill tone="green">
                Melhor take: {bestProduct.product}
              </StatusPill>
            }
          >
            <DataList
              valueLabel="receita"
              rows={data.upsells.map((item) => ({
                label: item.product,
                value: formatCurrency(item.upsellRevenue),
                detail: `${formatNumber(item.totalApproved)} aprovações · ${formatPercent(item.takeRateTotal)} take`,
                meter: item.upsellRevenue / maxUpsellRevenue,
                tone: item.takeRateTotal >= 0.4 ? "green" : "gold",
              }))}
            />
          </Panel>

          <Panel title="Camadas de oferta" description="Distribuição entre US1 e US2">
            <DataList
              valueLabel="take"
              rows={[
                {
                  label: "US1",
                  value: formatPercent(
                    data.summary.directSales > 0
                      ? us1Wins / data.summary.directSales
                      : 0
                  ),
                  detail: `${formatNumber(us1Wins)} aprovações`,
                  meter:
                    data.summary.directSales > 0
                      ? us1Wins / data.summary.directSales
                      : 0,
                  tone: "blue",
                },
                {
                  label: "US2",
                  value: formatPercent(
                    data.summary.directSales > 0
                      ? us2Wins / data.summary.directSales
                      : 0
                  ),
                  detail: `${formatNumber(us2Wins)} aprovações`,
                  meter:
                    data.summary.directSales > 0
                      ? us2Wins / data.summary.directSales
                      : 0,
                  tone: "gold",
                },
                {
                  label: "Total",
                  value: formatPercent(
                    data.summary.directSales > 0
                      ? data.summary.upsellApproved / data.summary.directSales
                      : 0
                  ),
                  detail: `${formatNumber(data.summary.upsellApproved)} aprovações totais`,
                  meter:
                    data.summary.directSales > 0
                      ? data.summary.upsellApproved / data.summary.directSales
                      : 0,
                  tone: "green",
                },
              ]}
            />
          </Panel>
        </div>

        <Panel title="Produtos e take rates" description="Base para comparar ofertas">
          <SimpleTable
            columns={["Produto", "Vendas diretas", "US1", "US2", "Receita"]}
            rows={data.upsells.map((item) => [
              item.product,
              formatNumber(item.directSales),
              formatPercent(item.takeRateUs1),
              formatPercent(item.takeRateUs2),
              formatCurrency(item.upsellRevenue),
            ])}
          />
        </Panel>

        <Panel
          title="Sinais de otimização"
          description="Alertas e logs que impactam as ofertas"
        >
          <DataList
            valueLabel="impacto"
            rows={data.logs.slice(0, 5).map((item) => ({
              label: item.title,
              value: item.owner,
              detail: item.impact,
              tone:
                item.impact.toLowerCase().includes("+") ||
                item.impact.toLowerCase().includes("positivo")
                  ? "green"
                  : "neutral",
            }))}
          />
        </Panel>
      </PageBody>
    </Shell>
  );
}
