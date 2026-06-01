import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Client-side: usa anon key
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Server-side: usa service role (bypass RLS)
export function createServiceClient() {
  return createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// ── Status do pipeline de pedidos ─────────────────────────────────────────────
export type StatusPedido =
  | "pago"
  | "nota_fiscal"
  | "separacao"
  | "aguardando_postagem"
  | "postado"
  | "em_transporte"
  | "aguardando_retirada"
  | "entregue"
  | "devolvido";

export type StatusPagamento =
  | "awaiting_payment"
  | "waiting_payment"
  | "pending"
  | "processing"
  | "in_analysis"
  | "paid"
  | "refunded"
  | "refund_requested"
  | "chargeback"
  | "charged_back"
  | "canceled"
  | "cancelled"
  | "expired"
  | "refused"
  | "failed";

export type Role = "admin" | "estoque" | "financeiro" | "atendimento";

// ── Interfaces ────────────────────────────────────────────────────────────────
export interface Pedido {
  id: string;
  payt_transaction_id: string;
  payt_cart_id: string | null;
  ordem_pedido: number | null;
  cliente_nome: string;
  cliente_email: string | null;
  cliente_telefone: string | null;
  cliente_cpf: string | null;
  produto_nome: string | null;
  produto_grupo: string | null;
  qtd_potes: number | null;
  valor_total: number | null;
  forma_pagamento: string | null;
  parcelas: number | null;
  data_pagamento: string | null;
  endereco_entrega: Record<string, unknown> | null;
  status: StatusPedido;
  status_pagamento: StatusPagamento | null;
  chargeback: boolean;
  codigo_rastreio: string | null;
  loggi_key: string | null;
  data_entrega: string | null;
  data_prometida_entrega: string | null;
  data_chegou_logistica: string | null;
  nfc_numero: string | null;
  nfc_valor: number | null;
  created_at: string;
  updated_at: string;
}

export interface EstoqueGrupo {
  id: string;
  nome_grupo: string;
  estoque_atual: number;
  created_at: string;
  updated_at: string;
}

export interface EstoqueMovimentacao {
  id: string;
  produto_grupo: string;
  tipo: "entrada" | "venda";
  qtd_potes: number;
  referencia_pedido_id: string | null;
  observacao: string | null;
  created_at: string;
}

export interface WhatsappDisparo {
  id: string;
  pedido_id: string;
  tipo_mensagem: string;
  status: "pendente" | "enviado" | "falhou" | "entregue" | "lido";
  meta_message_id: string | null;
  erro_detalhes: string | null;
  data_envio: string | null;
  created_at: string;
}

export interface UsuarioRole {
  id: string;
  user_id: string;
  role: Role;
  nome: string | null;
  created_at: string;
  updated_at: string;
}

export type AnalyticsCanal =
  | "VSL_FRONT"
  | "EMAIL_MAUTIC"
  | "CALLCENTER"
  | "BACKEND_RECUPERACAO"
  | "IA_WHATSAPP"
  | "TABOOLA"
  | "SMS"
  | "MDI"
  | "IA_VENDAS"
  | "OUTROS";

export type AnalyticsOfferKind =
  | "principal"
  | "us1"
  | "us2"
  | "downsell_us1"
  | "downsell_us2"
  | "televendas"
  | "recorrencia"
  | "grupo_vip"
  | "outro";

export interface AnalyticsPaytSale {
  payt_transaction_id: string;
  pedido_id: string | null;
  payt_cart_id: string | null;
  paid_at: string | null;
  day: string;
  cliente_nome: string | null;
  cliente_email: string | null;
  cliente_telefone: string | null;
  produto_nome: string | null;
  product_base: string;
  kit: string | null;
  offer_kind: AnalyticsOfferKind;
  sale_kind: "venda_direta" | "upsell";
  source_vendas: string | null;
  source_url: string | null;
  utm_source: string | null;
  utm_campaign: string | null;
  utm_medium: string | null;
  utm_term: string | null;
  utm_content: string | null;
  canal: AnalyticsCanal;
  forma_pagamento: string | null;
  valor_total: number;
  voce_recebe: number;
  chargeback: boolean;
  status_pagamento: string | null;
  endereco_entrega: Record<string, unknown> | null;
  imported_at: string;
  updated_at: string;
}

export interface AnalyticsFunilDailyRow {
  day: string;
  product_base: string;
  canal: AnalyticsCanal;
  source_url: string | null;
  utm_source: string | null;
  qtd_vendas_diretas: number;
  receita_vendas_diretas: number;
  qtd_upsells_aprovados: number;
  receita_upsells: number;
  receita_total: number;
  aov: number;
  take_rate_us1: number;
  take_rate_us2: number;
  voce_recebe_total: number;
  synced_at: string;
}

export interface AnalyticsFunilSourceRow {
  day: string;
  canal: AnalyticsCanal;
  source_url: string | null;
  utm_source: string | null;
  utm_campaign: string | null;
  utm_medium: string | null;
  utm_term: string | null;
  utm_content: string | null;
  qtd_vendas: number;
  receita_total: number;
  aov: number;
  qtd_upsells: number;
  receita_upsells: number;
  upsell_ratio: number;
  synced_at: string;
}

export interface AnalyticsRedtrackDailyCampaign {
  day: string;
  campaign_id: string;
  campaign: string;
  source: string | null;
  rt_source: string | null;
  rt_medium: string | null;
  rt_campaign: string | null;
  clicks: number;
  conversions: number;
  cost: number;
  revenue: number;
  lp_views: number;
  lp_clicks: number;
  unique_clicks: number;
  total_revenue: number;
  roas: number;
  imported_at: string;
}

export interface AnalyticsLogAlteracao {
  id: number;
  day: string;
  componente: string;
  produto_afetado: string | null;
  descricao: string | null;
  responsavel: string | null;
  tipo_alteracao?: string | null;
  hipotese?: string | null;
  detalhes?: Record<string, unknown> | null;
  metricas_antes?: Record<string, unknown> | null;
  metricas_depois?: Record<string, unknown> | null;
  insight_ia?: string | null;
  severidade_alerta?: string | null;
  status_analise?: string | null;
  created_at: string;
}

export interface AnalyticsOpsCallTranscript {
  id: number;
  happened_at: string | null;
  title: string;
  area: string | null;
  participants: string[];
  related_products: string[];
  tags: string[];
  transcript: string;
  summary: string | null;
  uploaded_by: string | null;
  source_kind: string;
  source_ref: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  awaiting_payment: "Aguardando pagamento",
  waiting_payment: "Aguardando pagamento",
  pending: "Pendente",
  processing: "Processando",
  in_analysis: "Em análise",
  paid: "Pago",
  refunded: "Reembolsado",
  refund_requested: "Reembolso solicitado",
  refund_request: "Reembolso solicitado",
  chargeback: "Chargeback",
  charged_back: "Chargeback",
  canceled: "Cancelado",
  cancelled: "Cancelado",
  expired: "Pagamento expirado",
  refused: "Recusado",
  failed: "Falhou",
  abandoned: "Carrinho abandonado",
  abandoned_cart: "Carrinho abandonado",
  abandoned_checkout: "Checkout abandonado",
  lost_cart: "Carrinho perdido",
};

export const PAYMENT_STATUS_COLORS: Record<string, string> = {
  awaiting_payment: "bg-amber-100 text-amber-800",
  waiting_payment: "bg-amber-100 text-amber-800",
  pending: "bg-amber-100 text-amber-800",
  processing: "bg-sky-100 text-sky-800",
  in_analysis: "bg-sky-100 text-sky-800",
  paid: "bg-emerald-100 text-emerald-800",
  refunded: "bg-rose-100 text-rose-800",
  refund_requested: "bg-orange-100 text-orange-800",
  refund_request: "bg-orange-100 text-orange-800",
  chargeback: "bg-red-100 text-red-800",
  charged_back: "bg-red-100 text-red-800",
  canceled: "bg-slate-100 text-slate-700",
  cancelled: "bg-slate-100 text-slate-700",
  expired: "bg-slate-100 text-slate-700",
  refused: "bg-slate-100 text-slate-700",
  failed: "bg-slate-100 text-slate-700",
  abandoned: "bg-fuchsia-100 text-fuchsia-800",
  abandoned_cart: "bg-fuchsia-100 text-fuchsia-800",
  abandoned_checkout: "bg-fuchsia-100 text-fuchsia-800",
  lost_cart: "bg-rose-100 text-rose-800",
};

export const ANALYTICS_CHANNEL_LABELS: Record<AnalyticsCanal, string> = {
  VSL_FRONT: "VSL / Front",
  EMAIL_MAUTIC: "Email / Mautic",
  CALLCENTER: "Call Center",
  BACKEND_RECUPERACAO: "Back-end / Recuperação",
  IA_WHATSAPP: "IA / WhatsApp",
  TABOOLA: "Taboola",
  SMS: "SMS",
  MDI: "MDI",
  IA_VENDAS: "IA Vendas",
  OUTROS: "Outros",
};

// ── Labels e cores ────────────────────────────────────────────────────────────
export const STATUS_LABELS: Record<StatusPedido, string> = {
  pago:                "Pago",
  nota_fiscal:         "Nota Fiscal",
  separacao:           "Separação",
  aguardando_postagem: "Aguard. Postagem",
  postado:             "Postado",
  em_transporte:       "Em Trânsito",
  aguardando_retirada: "Saiu p/ Entrega",
  entregue:            "Entregue",
  devolvido:           "Devolvido",
};

export const STATUS_COLORS: Record<StatusPedido, string> = {
  pago:                "bg-emerald-100 text-emerald-800",
  nota_fiscal:         "bg-sky-100 text-sky-800",
  separacao:           "bg-violet-100 text-violet-800",
  aguardando_postagem: "bg-yellow-100 text-yellow-800",
  postado:             "bg-blue-100 text-blue-800",
  em_transporte:       "bg-purple-100 text-purple-800",
  aguardando_retirada: "bg-orange-100 text-orange-800",
  entregue:            "bg-green-100 text-green-800",
  devolvido:           "bg-red-100 text-red-800",
};

// Colunas do Kanban (em ordem do pipeline)
export const KANBAN_COLUNAS: Array<{
  status: StatusPedido;
  label: string;
  corHeader: string;
  corBadge: string;
  icone: string;
}> = [
  { status: "pago",                label: "Pago",             corHeader: "bg-emerald-500", corBadge: "bg-emerald-100 text-emerald-800", icone: "💳" },
  { status: "nota_fiscal",         label: "Nota Fiscal",      corHeader: "bg-sky-500",     corBadge: "bg-sky-100 text-sky-800",         icone: "📄" },
  { status: "separacao",           label: "Separação",        corHeader: "bg-violet-500",  corBadge: "bg-violet-100 text-violet-800",   icone: "📦" },
  { status: "aguardando_postagem", label: "Aguard. Postagem", corHeader: "bg-yellow-500",  corBadge: "bg-yellow-100 text-yellow-800",   icone: "⏳" },
  { status: "postado",             label: "Postado",          corHeader: "bg-blue-500",    corBadge: "bg-blue-100 text-blue-800",       icone: "✉️" },
  { status: "em_transporte",       label: "Em Trânsito",      corHeader: "bg-purple-500",  corBadge: "bg-purple-100 text-purple-800",   icone: "🚚" },
  { status: "aguardando_retirada", label: "Saiu p/ Entrega",  corHeader: "bg-orange-500",  corBadge: "bg-orange-100 text-orange-800",   icone: "🛵" },
];
