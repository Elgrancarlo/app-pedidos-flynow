import { createServiceClient, STATUS_LABELS } from "@/lib/supabase";
import PedidosClientView from "@/components/pedidos/pedidos-client-view";
import CardsStatus from "@/components/pedidos/cards-status";
import CardsFinanceiro from "@/components/pedidos/cards-financeiro";
import BotaoSincronizar from "@/components/pedidos/botao-sincronizar";
import FiltroPeriodo from "@/components/pedidos/filtro-periodo";
import PageHeader from "@/components/page-header";
import Shell from "@/components/shell";
import type { Pedido, StatusPedido } from "@/lib/supabase";
import { getFinancialEventMetrics } from "@/lib/financeiro";
import { getTodayInAppTimezone, getUtcRangeForAppDates, shiftDateString } from "@/lib/app-dates";

export const dynamic = "force-dynamic";

const COLS =
  "id, payt_transaction_id, payt_cart_id, ordem_pedido, cliente_nome, cliente_email, cliente_telefone, cliente_cpf, produto_nome, produto_grupo, qtd_potes, valor_total, forma_pagamento, parcelas, data_pagamento, endereco_entrega, status, status_pagamento, chargeback, codigo_rastreio, loggi_key, data_entrega, data_prometida_entrega, data_chegou_logistica, nfc_numero, nfc_valor, created_at, updated_at";

async function getPedidos(startDate: string, endDate: string): Promise<Pedido[]> {
  const supabase = createServiceClient();
  const todos: Pedido[] = [];
  const pendentes: Pedido[] = [];
  const PAGE = 1000;
  let from = 0;
  const { startTs, endTs } = getUtcRangeForAppDates(startDate, endDate);

  while (true) {
    const { data, error } = await supabase
      .from("pedidos")
      .select(COLS)
      .gte("data_pagamento", startTs)
      .lte("data_pagamento", endTs)
      .order("ordem_pedido", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .range(from, from + PAGE - 1);

    if (error) { console.error("Erro ao buscar pedidos:", error); break; }
    if (!data || data.length === 0) break;
    todos.push(...(data as Pedido[]));
    if (data.length < PAGE) break;
    from += PAGE;
  }

  from = 0;
  while (true) {
    const { data, error } = await supabase
      .from("pedidos")
      .select(COLS)
      .is("data_pagamento", null)
      .gte("created_at", startTs)
      .lte("created_at", endTs)
      .order("created_at", { ascending: false })
      .range(from, from + PAGE - 1);

    if (error) { console.error("Erro ao buscar pedidos sem pagamento:", error); break; }
    if (!data || data.length === 0) break;
    pendentes.push(...(data as Pedido[]));
    if (data.length < PAGE) break;
    from += PAGE;
  }

  const vistos = new Set<string>();
  return [...todos, ...pendentes]
    .sort((left, right) => {
      const leftTime = new Date(left.data_pagamento ?? left.created_at).getTime();
      const rightTime = new Date(right.data_pagamento ?? right.created_at).getTime();
      return rightTime - leftTime;
    })
    .filter((p) => {
    if (vistos.has(p.id)) return false;
    vistos.add(p.id);
    return true;
  });
}

async function getMetricasFinanceiras(startDate: string, endDate: string) {
  return getFinancialEventMetrics(startDate, endDate);
}

function defaultDates() {
  const endDate = getTodayInAppTimezone();
  return {
    startDate: shiftDateString(endDate, -7),
    endDate,
  };
}

export default async function PedidosPage({
  searchParams,
}: {
  searchParams: Promise<{ startDate?: string; endDate?: string }>;
}) {
  const params = await searchParams;
  const defaults = defaultDates();
  const startDate = params.startDate ?? defaults.startDate;
  const endDate = params.endDate ?? defaults.endDate;

  const [pedidos, contagem, metricas] = await Promise.all([
    getPedidos(startDate, endDate),
    getMetricasFinanceiras(startDate, endDate),
  ]).then(([pedidos, metricas]) => {
    const contagem = pedidos.reduce<Record<string, number>>((acc, pedido) => {
      acc[pedido.status] = (acc[pedido.status] ?? 0) + 1;
      return acc;
    }, {});
    return [pedidos, contagem, metricas] as const;
  });

  const pipeline: StatusPedido[] = [
    "pago",
    "nota_fiscal",
    "separacao",
    "aguardando_postagem",
    "postado",
    "em_transporte",
    "aguardando_retirada",
    "entregue",
    "devolvido",
  ];

  // Só soma pedidos pagos — exclui chargebacks e reembolsos do faturamento
  const valorTotal = pedidos
    .filter((p) => p.status_pagamento === "paid" && p.chargeback !== true)
    .reduce((acc, p) => acc + (p.valor_total ?? 0), 0);

  return (
    <Shell>
      <PageHeader
        titulo="Pedidos"
        subtitulo={`${pedidos.length} pedidos no período`}
        acoes={<BotaoSincronizar />}
      />
      <div className="px-6 pb-8 space-y-6">
        <CardsStatus contagem={contagem} pipeline={pipeline} labels={STATUS_LABELS} />
        <CardsFinanceiro metricas={metricas} />
        <FiltroPeriodo startDate={startDate} endDate={endDate} />
        <PedidosClientView
          pedidos={pedidos}
          totalPedidos={pedidos.length}
          valorTotal={valorTotal}
        />
      </div>
    </Shell>
  );
}
