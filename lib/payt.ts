// Tipos e mapeamento do payload da Payt
import { inferirGrupo } from "@/lib/produtos";

export interface PaytTransaction {
  transaction_id: string;
  status: string;
  tangible?: boolean;
  integration_key?: string;
  body?: {
    customer?: PaytCustomer;
    product?: PaytProduct;
    transaction?: PaytTransactionDetail;
    shipping?: PaytShipping;
  };
  // Alguns exports da Payt enviam campos na raiz
  customer?: PaytCustomer;
  product?: PaytProduct;
  transaction?: PaytTransactionDetail;
  shipping?: PaytShipping;
}

export interface PaytCustomer {
  name?: string;
  email?: string;
  phone?: string;
  doc?: string;
}

export interface PaytProduct {
  name?: string;
  items?: PaytItem[];
}

export interface PaytItem {
  name?: string;
  type?: "physical" | "digital";
  quantity?: number;
}

export interface PaytTransactionDetail {
  total_price?: number;
  paid_at?: string;
  payment_method?: string;
}

export interface PaytShipping {
  address?: Record<string, unknown>;
}

export interface PedidoInsert {
  payt_transaction_id: string;
  cliente_nome: string;
  cliente_email: string | null;
  cliente_telefone: string | null;
  cliente_cpf: string | null;
  produto_nome: string | null;
  produto_grupo: string | null;
  qtd_potes: number | null;
  valor_total: number | null;
  forma_pagamento: string | null;
  data_pagamento: string | null;
  endereco_entrega: Record<string, unknown> | null;
  status: string;
  status_pagamento: string;
  chargeback: boolean;
}

/**
 * Converte um registro da Payt (webhook ou exportação manual) para a estrutura da tabela pedidos.
 * Suporta tanto o formato com body aninhado (webhook) quanto flat (alguns exports).
 */
export function mapPaytToRow(tx: PaytTransaction): PedidoInsert {
  // A Payt envia dados aninhados em body.body no webhook,
  // mas exports manuais podem ter os campos na raiz
  const inner = tx.body ?? tx;
  const customer = inner.customer;
  const product = inner.product;
  const transaction = inner.transaction;
  const shipping = inner.shipping;

  const items = product?.items ?? [];
  const fisicos = items.filter((i) => i.type === "physical");
  const qtdPotes = fisicos.reduce((acc, i) => acc + (i.quantity ?? 0), 0);
  const rawGrupo     = fisicos[0]?.name ?? product?.name ?? null;
  const produtoGrupo = inferirGrupo(rawGrupo) ?? rawGrupo;

  const isChargeback = tx.status === "chargeback" || tx.status === "charged_back";

  return {
    payt_transaction_id: tx.transaction_id,
    cliente_nome: customer?.name ?? "Desconhecido",
    cliente_email: customer?.email ?? null,
    cliente_telefone: customer?.phone ?? null,
    cliente_cpf: customer?.doc ?? null,
    produto_nome: product?.name ?? null,
    produto_grupo: produtoGrupo,
    qtd_potes: qtdPotes > 0 ? qtdPotes : null,
    valor_total: transaction?.total_price ? transaction.total_price / 100 : null,
    forma_pagamento: transaction?.payment_method ?? null,
    data_pagamento: transaction?.paid_at ?? null,
    endereco_entrega: (shipping?.address as Record<string, unknown>) ?? null,
    status: "aguardando_postagem",
    status_pagamento: tx.status,
    chargeback: isChargeback,
  };
}
