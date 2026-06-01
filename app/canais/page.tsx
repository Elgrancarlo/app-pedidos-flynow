import {
  BadgeDollarSign,
  MousePointerClick,
  Radio,
  ReceiptText,
  Target,
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

export default async function CanaisPage() {
  const data = await getPerformancePageData();
  const maxRevenue = Math.max(1, ...data.channels.map((item) => item.revenue));
  const maxSpend = Math.max(1, ...data.channels.map((item) => item.spend));
  const ownedRevenue = data.channels
    .filter((item) => ["IA_WHATSAPP", "EMAIL_MAUTIC", "SMS"].includes(item.channel))
    .reduce((total, item) => total + item.revenue, 0);

  return (
    <Shell>
      <DashboardHeader
        title="Canais"
        description="Performance de tráfego, recuperação e canais proprietários"
        actions={<SourceBadge source={data.source} />}
      />

      <PageBody>
        <StatGrid>
          <StatCard
            label="Receita por canal"
            value={formatCurrency(
              data.channels.reduce((total, item) => total + item.revenue, 0)
            )}
            detail={`${formatCurrency(ownedRevenue)} em canais proprietários`}
            Icon={ReceiptText}
            tone="gold"
          />
          <StatCard
            label="Investimento"
            value={formatCurrency(data.summary.spendTotal)}
            detail="Custo associado aos canais"
            Icon={BadgeDollarSign}
            tone="blue"
          />
          <StatCard
            label="Cliques"
            value={formatNumber(data.summary.clicksTotal)}
            detail={`${formatNumber(data.summary.conversionsTotal)} conversões atribuídas`}
            Icon={MousePointerClick}
            tone="green"
            rows={[
              {
                label: "Taxa de conversão",
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
            label="ROAS"
            value={data.summary.roas.toLocaleString("pt-BR", {
              maximumFractionDigits: 2,
            })}
            detail="Retorno consolidado"
            Icon={Target}
            tone={data.summary.roas >= 4 ? "green" : "gold"}
          />
        </StatGrid>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(340px,0.65fr)]">
          <Panel
            title="Ranking de canais"
            description="Receita, vendas e eficiência por origem"
            action={<Radio aria-hidden="true" className="size-4 text-[var(--fly-text-muted)]" />}
          >
            <DataList
              valueLabel="receita"
              rows={data.channels.map((item) => ({
                label: item.label,
                value: formatCurrency(item.revenue),
                detail: `${formatNumber(item.directSales)} vendas · ROAS ${item.roas.toLocaleString("pt-BR", {
                  maximumFractionDigits: 2,
                })}`,
                meter: item.revenue / maxRevenue,
                tone: item.roas >= 4 ? "green" : item.roas >= 3 ? "gold" : "red",
              }))}
            />
          </Panel>

          <Panel title="Custo por canal" description="Leitura rápida de pressão de gasto">
            <DataList
              valueLabel="gasto"
              rows={data.channels.map((item) => ({
                label: item.label,
                value: formatCurrency(item.spend),
                detail:
                  item.clicks > 0
                    ? `${formatNumber(item.clicks)} cliques · ${formatNumber(item.conversions)} conversões`
                    : `${formatNumber(item.conversions)} conversões registradas`,
                meter: item.spend / maxSpend,
                tone: item.spend > 0 ? "blue" : "neutral",
              }))}
            />
          </Panel>
        </div>

        <Panel title="Campanhas por canal" description="Origem, produto e retorno">
          <SimpleTable
            columns={["Campanha", "Origem", "Produto", "Investimento", "ROAS"]}
            rows={data.campaigns.map((item) => [
              item.campaign,
              item.source,
              item.product,
              formatCurrency(item.spend),
              item.roas.toLocaleString("pt-BR", { maximumFractionDigits: 2 }),
            ])}
          />
        </Panel>

        <Panel title="Saúde operacional" description="Sinais para priorizar aquisição e recuperação">
          <DataList
            valueLabel="status"
            rows={data.channels.map((item) => ({
              label: item.label,
              value:
                item.roas >= 4
                  ? "Escalar"
                  : item.roas >= 3
                    ? "Manter"
                    : "Revisar",
              detail:
                item.revenue > 0
                  ? `${formatCurrency(item.revenue - item.spend)} margem antes de custos fixos`
                  : "Sem receita atribuída",
              tone: item.roas >= 4 ? "green" : item.roas >= 3 ? "gold" : "red",
            }))}
          />
        </Panel>
      </PageBody>
    </Shell>
  );
}
