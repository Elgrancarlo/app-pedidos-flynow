import { createServiceClient, STATUS_LABELS } from "@/lib/supabase";
import PedidosClientView from "@/components/pedidos/pedidos-client-view";
import CardsStatus from "@/components/pedidos/cards-status";
import CardsFinanceiro from "@/components/pedidos/cards-financeiro";
import BotaoSincronizar from "@/components/pedidos/botao-sincronizar";
import FiltroPeriodo from "@/components/pedidos/filtro-periodo";
import PageHeader from "@/components/page-header";
import Shell from "@/components/layout/shell";
import type { Pedido, StatusPedido } from "@/lib/supabase";

export const dynamic = "force-dynamic";

const COLS =
  "id, payt_transaction_id, payt_cart_id, ordem_pedido, cliente_nome, cliente_email, cliente_telefone, cliente_cpf, produto_nome, produto_grupo, qtd_potes, valor_total, forma_pagamento, parcelas, data_pagamento, endereco_entrega, status, status_pagamento, chargeback, codigo_rastreio, loggi_key, data_entrega, data_prometida_entrega, data_chegou_logistica, nfc_numero, nfc_valor, created_at, updated_at";

async function getPedidos(startDate: string, endDate: string): Promise<Pedido[]> {
  const supabase = createServiceClient();
  const todos: Pedido[] = [];
  const PAGE = 1000;
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from("pedidos")
      .select(COLS)
      .gte("data_pagamento", startDate)
      .lte("data_pagamento", endDate + "T23:59:59Z")
      .order("ordem_pedido", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .range(from, from + PAGE - 1);

    if (error) { console.error("Erro ao buscar pedidos:", error); break; }
    if (!data || data.length === 0) break;
    todos.push(...(data as Pedido[]));
    if (data.length < PAGE) break;
    from += PAGE;
  }

  const vistos = new Set<string>();
  return todos.filter((p) => {
    if (vistos.has(p.id)) return false;
    vistos.add(p.id);
    return true;
  });
}

async function getContagemPorStatus(startDate: string, endDate: string): Promise<Record<string, number>> {
  const supabase = createServiceClient();
  const { data } = await supabase.rpc("contagem_por_status", {
    p_start: startDate + "T00:00:00Z",
    p_end: endDate + "T23:59:59Z",
  });
  if (!data) return {};
  return Object.fromEntries(
    (data as Array<{ status: string; total: number }>).map((r) => [r.status, Number(r.total)])
  );
}

async function getMetricasFinanceiras(startDate: string, endDate: string) {
  const supabase = createServiceClient();
  const { data } = await supabase.rpc("metricas_financeiras", {
    p_start: startDate + "T00:00:00Z",
    p_end: endDate + "T23:59:59Z",
  });
  if (!data) return { chargebacks: 0, valorChargebacks: 0, reembolsos: 0, valorReembolsos: 0 };
  const m = data as { chargebacks: number; valorChargebacks: number; reembolsos: number; valorReembolsos: number };
  return {
    chargebacks: Number(m.chargebacks),
    valorChargebacks: Number(m.valorChargebacks),
    reembolsos: Number(m.reembolsos),
    valorReembolsos: Number(m.valorReembolsos),
  };
}

function defaultDates() {
  const hoje = new Date();
  const inicio = new Date(hoje);
  inicio.setDate(hoje.getDate() - 7);
  return {
    startDate: inicio.toISOString().slice(0, 10),
    endDate: hoje.toISOString().slice(0, 10),
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
    getContagemPorStatus(startDate, endDate),
    getMetricasFinanceiras(startDate, endDate),
  ]);

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
    .filter((p) => p.status_pagamento === "paid")
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
