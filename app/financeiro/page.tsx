import {
  BadgePercent,
  ReceiptText,
  ShieldAlert,
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
import {
  getDefaultFinanceiroRange,
  getFinanceiroPageData,
  type FinanceiroRange,
} from "@/lib/financeiro";
import { formatCurrency, formatPercent } from "@/lib/utils";

export const dynamic = "force-dynamic";

function resolveRange(params: { startDate?: string; endDate?: string }) {
  const defaults = getDefaultFinanceiroRange();

  return {
    startDate: params.startDate ?? defaults.startDate,
    endDate: params.endDate ?? defaults.endDate,
  } satisfies FinanceiroRange;
}

function formatDate(value: string) {
  return new Date(`${value}T12:00:00`).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  });
}

function ModeBadge({ source }: { source: "mock" | "real" }) {
  return (
    <StatusPill tone={source === "real" ? "green" : "gold"}>
      {source === "real" ? "Dados reais" : "Mock ativo"}
    </StatusPill>
  );
}

export default async function FinanceiroPage({
  searchParams,
}: {
  searchParams: Promise<{ startDate?: string; endDate?: string }>;
}) {
  const params = await searchParams;
  const data = await getFinanceiroPageData(resolveRange(params));
  const maxDailyRevenue = Math.max(
    ...data.dailySeries.map((item) => item.receitaBruta),
    1
  );
  const maxPaymentRevenue = Math.max(
    ...data.paymentMix.map((item) => item.revenue),
    1
  );

  return (
    <Shell>
      <DashboardHeader
        title="Financeiro"
        description="Receita, recebíveis, chargebacks e reembolsos"
        actions={<ModeBadge source={data.source} />}
      />

      <PageBody>
        <StatGrid>
          <StatCard
            label="Receita bruta"
            value={formatCurrency(data.receitaBruta)}
            detail={`${data.totalPedidos.toLocaleString("pt-BR")} pedidos pagos`}
            Icon={ReceiptText}
            tone="gold"
            rows={[
              {
                label: "Ticket medio",
                value: formatCurrency(data.ticketMedio),
                meter: data.receitaBruta > 0 ? data.ticketMedio / data.receitaBruta : 0,
              },
            ]}
          />
          <StatCard
            label="Receita liquida"
            value={formatCurrency(data.receitaLiquida)}
            detail="Bruta menos chargebacks e reembolsos"
            Icon={Wallet}
            tone="green"
            rows={[
              {
                label: "Recebivel estimado",
                value: formatCurrency(data.receitaRecebivel),
                meter:
                  data.receitaBruta > 0
                    ? data.receitaRecebivel / data.receitaBruta
                    : 0,
              },
            ]}
          />
          <StatCard
            label="Taxas"
            value={formatCurrency(data.taxaGateway)}
            detail="Estimativa operacional de gateway"
            Icon={BadgePercent}
            tone="blue"
            rows={[
              {
                label: "Peso na receita",
                value: formatPercent(
                  data.receitaBruta > 0 ? data.taxaGateway / data.receitaBruta : 0
                ),
                meter:
                  data.receitaBruta > 0 ? data.taxaGateway / data.receitaBruta : 0,
              },
            ]}
          />
          <StatCard
            label="Revertido"
            value={formatCurrency(data.totalRevertido)}
            detail={`Taxa CB ${formatPercent(data.taxaChargeback)}`}
            Icon={ShieldAlert}
            tone="red"
            rows={[
              {
                label: "Chargebacks",
                value: data.chargebacks.toLocaleString("pt-BR"),
                meter:
                  data.totalPedidos > 0 ? data.chargebacks / data.totalPedidos : 0,
              },
              {
                label: "Reembolsos",
                value: data.reembolsos.toLocaleString("pt-BR"),
                meter:
                  data.totalPedidos > 0 ? data.reembolsos / data.totalPedidos : 0,
              },
            ]}
          />
        </StatGrid>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(360px,0.6fr)]">
          <Panel
            title="Evolução financeira"
            description={`${formatDate(data.range.startDate)} - ${formatDate(data.range.endDate)}`}
          >
            <DataList
              valueLabel="receita"
              rows={data.dailySeries.slice(-10).map((item) => ({
                label: formatDate(item.day),
                value: formatCurrency(item.receitaBruta),
                detail: `${formatCurrency(item.receitaLiquida)} liquido · ${formatCurrency(item.revertido)} revertido`,
                meter: item.receitaBruta / maxDailyRevenue,
                tone: item.revertido > 0 ? "gold" : "green",
              }))}
            />
          </Panel>

          <Panel title="Mix de pagamento" description="Métodos com receita paga">
            <DataList
              rows={data.paymentMix.map((item) => ({
                label: item.label,
                value: formatCurrency(item.revenue),
                detail: `${item.orders.toLocaleString("pt-BR")} pedidos`,
                meter: item.revenue / maxPaymentRevenue,
                tone: item.method === "pix" ? "green" : item.method === "boleto" ? "gold" : "blue",
              }))}
            />
          </Panel>
        </div>

        <Panel
          title="Pontos financeiros de atenção"
          description="Eventos que reduzem receita ou pedem acompanhamento"
          action={
            <span className="text-xs font-semibold text-[var(--fly-text-muted)]">
              {data.riskRows
                .reduce((total, item) => total + item.quantity, 0)
                .toLocaleString("pt-BR")}{" "}
              eventos
            </span>
          }
        >
          <SimpleTable
            columns={["Tipo", "Quantidade", "Impacto"]}
            rows={data.riskRows.map((item) => [
              item.label,
              item.quantity.toLocaleString("pt-BR"),
              formatCurrency(item.amount),
            ])}
          />
        </Panel>

        <Panel
          title="Próxima conexão real"
          description="A página já usa o mesmo contrato para mock e backend real"
        >
          <div className="grid gap-3 md:grid-cols-3">
            {[
              ["Modo", data.source === "real" ? "Real" : "Mock"],
              ["Range", `${data.range.startDate} ate ${data.range.endDate}`],
              ["Adapter", "getFinanceiroPageData"],
            ].map(([label, value]) => (
              <div
                key={label}
                className="rounded-[8px] border border-white/[0.055] bg-white/[0.018] p-3"
              >
                <p className="text-[11px] font-semibold uppercase text-[var(--fly-text-muted)]">
                  {label}
                </p>
                <p className="mt-2 truncate text-sm font-semibold text-[var(--fly-text-soft)]">
                  {value}
                </p>
              </div>
            ))}
          </div>
        </Panel>
      </PageBody>
    </Shell>
  );
}
