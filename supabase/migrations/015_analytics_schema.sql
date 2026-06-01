CREATE SCHEMA IF NOT EXISTS analytics;

CREATE TABLE IF NOT EXISTS analytics.dim_channel_mapping (
  id BIGSERIAL PRIMARY KEY,
  source_pattern TEXT NOT NULL UNIQUE,
  matcher_type TEXT NOT NULL DEFAULT 'contains',
  channel TEXT NOT NULL,
  priority INTEGER NOT NULL DEFAULT 100,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS analytics.dim_product_mapping (
  id BIGSERIAL PRIMARY KEY,
  pattern TEXT NOT NULL UNIQUE,
  product_base TEXT NOT NULL,
  offer_kind TEXT NOT NULL DEFAULT 'principal',
  priority INTEGER NOT NULL DEFAULT 100,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS analytics.payt_sales_raw (
  payt_transaction_id TEXT PRIMARY KEY,
  pedido_id UUID,
  payt_cart_id TEXT,
  payload JSONB,
  payload_source TEXT NOT NULL DEFAULT 'payt_webhooks_raw',
  imported_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS analytics.payt_sales (
  payt_transaction_id TEXT PRIMARY KEY,
  pedido_id UUID,
  payt_cart_id TEXT,
  paid_at TIMESTAMPTZ,
  day DATE NOT NULL,
  cliente_nome TEXT,
  cliente_email TEXT,
  cliente_telefone TEXT,
  produto_nome TEXT,
  product_base TEXT NOT NULL,
  kit TEXT,
  offer_kind TEXT NOT NULL,
  sale_kind TEXT NOT NULL,
  source_vendas TEXT,
  source_url TEXT,
  utm_source TEXT,
  utm_campaign TEXT,
  utm_medium TEXT,
  utm_term TEXT,
  utm_content TEXT,
  canal TEXT NOT NULL,
  forma_pagamento TEXT,
  valor_total NUMERIC(12,2) NOT NULL DEFAULT 0,
  voce_recebe NUMERIC(12,2) NOT NULL DEFAULT 0,
  chargeback BOOLEAN NOT NULL DEFAULT FALSE,
  status_pagamento TEXT,
  endereco_entrega JSONB,
  imported_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_analytics_payt_sales_day ON analytics.payt_sales(day);
CREATE INDEX IF NOT EXISTS idx_analytics_payt_sales_canal ON analytics.payt_sales(canal);
CREATE INDEX IF NOT EXISTS idx_analytics_payt_sales_product_base ON analytics.payt_sales(product_base);
CREATE INDEX IF NOT EXISTS idx_analytics_payt_sales_utm_campaign ON analytics.payt_sales(utm_campaign);
CREATE INDEX IF NOT EXISTS idx_analytics_payt_sales_cart ON analytics.payt_sales(payt_cart_id);

CREATE TABLE IF NOT EXISTS analytics.redtrack_report_raw (
  id BIGSERIAL PRIMARY KEY,
  date_from DATE NOT NULL,
  date_to DATE NOT NULL,
  report_group TEXT NOT NULL,
  page INTEGER NOT NULL DEFAULT 1,
  payload JSONB NOT NULL,
  imported_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS analytics.redtrack_conversions_raw (
  id TEXT PRIMARY KEY,
  conv_time TIMESTAMPTZ,
  campaign_id TEXT,
  payload JSONB NOT NULL,
  imported_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_analytics_redtrack_conv_time ON analytics.redtrack_conversions_raw(conv_time);
CREATE INDEX IF NOT EXISTS idx_analytics_redtrack_campaign_id ON analytics.redtrack_conversions_raw(campaign_id);

CREATE TABLE IF NOT EXISTS analytics.redtrack_daily_campaign (
  day DATE NOT NULL,
  campaign_id TEXT NOT NULL,
  campaign TEXT NOT NULL,
  source TEXT,
  rt_source TEXT,
  rt_medium TEXT,
  rt_campaign TEXT,
  clicks INTEGER NOT NULL DEFAULT 0,
  conversions INTEGER NOT NULL DEFAULT 0,
  cost NUMERIC(12,2) NOT NULL DEFAULT 0,
  revenue NUMERIC(12,2) NOT NULL DEFAULT 0,
  lp_views INTEGER NOT NULL DEFAULT 0,
  lp_clicks INTEGER NOT NULL DEFAULT 0,
  unique_clicks INTEGER NOT NULL DEFAULT 0,
  total_revenue NUMERIC(12,2) NOT NULL DEFAULT 0,
  roas NUMERIC(12,4) NOT NULL DEFAULT 0,
  imported_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (day, campaign_id)
);

CREATE INDEX IF NOT EXISTS idx_analytics_redtrack_daily_campaign_day ON analytics.redtrack_daily_campaign(day);
CREATE INDEX IF NOT EXISTS idx_analytics_redtrack_daily_campaign_rt_source ON analytics.redtrack_daily_campaign(rt_source);

CREATE TABLE IF NOT EXISTS analytics.funil_log_alteracoes (
  id BIGSERIAL PRIMARY KEY,
  day DATE NOT NULL,
  componente TEXT NOT NULL,
  produto_afetado TEXT,
  descricao TEXT,
  responsavel TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_analytics_funil_log_day ON analytics.funil_log_alteracoes(day);

CREATE TABLE IF NOT EXISTS analytics.fact_funil_diario (
  id BIGSERIAL PRIMARY KEY,
  day DATE NOT NULL,
  product_base TEXT NOT NULL,
  canal TEXT NOT NULL,
  source_url TEXT,
  utm_source TEXT,
  qtd_vendas_diretas INTEGER NOT NULL DEFAULT 0,
  receita_vendas_diretas NUMERIC(12,2) NOT NULL DEFAULT 0,
  qtd_upsells_aprovados INTEGER NOT NULL DEFAULT 0,
  receita_upsells NUMERIC(12,2) NOT NULL DEFAULT 0,
  receita_total NUMERIC(12,2) NOT NULL DEFAULT 0,
  aov NUMERIC(12,2) NOT NULL DEFAULT 0,
  take_rate_us1 NUMERIC(12,4) NOT NULL DEFAULT 0,
  take_rate_us2 NUMERIC(12,4) NOT NULL DEFAULT 0,
  voce_recebe_total NUMERIC(12,2) NOT NULL DEFAULT 0,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS analytics.fact_funil_por_fonte (
  id BIGSERIAL PRIMARY KEY,
  day DATE NOT NULL,
  canal TEXT NOT NULL,
  source_url TEXT,
  utm_source TEXT,
  utm_campaign TEXT,
  utm_medium TEXT,
  utm_term TEXT,
  utm_content TEXT,
  qtd_vendas INTEGER NOT NULL DEFAULT 0,
  receita_total NUMERIC(12,2) NOT NULL DEFAULT 0,
  aov NUMERIC(12,2) NOT NULL DEFAULT 0,
  qtd_upsells INTEGER NOT NULL DEFAULT 0,
  receita_upsells NUMERIC(12,2) NOT NULL DEFAULT 0,
  upsell_ratio NUMERIC(12,4) NOT NULL DEFAULT 0,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_analytics_fact_funil_diario_unique
ON analytics.fact_funil_diario (
  day,
  product_base,
  canal,
  COALESCE(source_url, ''),
  COALESCE(utm_source, '')
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_analytics_fact_funil_por_fonte_unique
ON analytics.fact_funil_por_fonte (
  day,
  canal,
  COALESCE(source_url, ''),
  COALESCE(utm_source, ''),
  COALESCE(utm_campaign, ''),
  COALESCE(utm_medium, ''),
  COALESCE(utm_term, ''),
  COALESCE(utm_content, '')
);

CREATE OR REPLACE VIEW analytics.v_funil_resumo_diario AS
SELECT *
FROM analytics.fact_funil_diario
ORDER BY day DESC, receita_total DESC;

CREATE OR REPLACE VIEW analytics.v_funil_resumo_por_fonte AS
SELECT *
FROM analytics.fact_funil_por_fonte
ORDER BY day DESC, receita_total DESC;

CREATE OR REPLACE VIEW analytics.v_redtrack_resumo_diario AS
SELECT
  day,
  COALESCE(rt_source, source, 'OUTROS') AS source_bucket,
  SUM(clicks) AS clicks,
  SUM(conversions) AS conversions,
  SUM(cost) AS cost,
  SUM(revenue) AS revenue,
  SUM(total_revenue) AS total_revenue
FROM analytics.redtrack_daily_campaign
GROUP BY day, COALESCE(rt_source, source, 'OUTROS')
ORDER BY day DESC, SUM(cost) DESC;

INSERT INTO analytics.dim_channel_mapping (source_pattern, matcher_type, channel, priority)
VALUES
  ('vsl', 'equals', 'VSL_FRONT', 10),
  ('vsl-rp', 'equals', 'VSL_FRONT', 11),
  ('tb', 'equals', 'TABOOLA', 20),
  ('taboola', 'contains', 'TABOOLA', 21),
  ('el', 'equals', 'EMAIL_MAUTIC', 30),
  ('mautic', 'contains', 'EMAIL_MAUTIC', 31),
  ('smsfunnel', 'contains', 'SMS', 40),
  ('back', 'contains', 'BACKEND_RECUPERACAO', 50),
  ('rec-ia', 'contains', 'IA_WHATSAPP', 60),
  ('ia-wpp', 'contains', 'IA_WHATSAPP', 61),
  ('ia', 'contains', 'IA_WHATSAPP', 62),
  ('paytcall', 'contains', 'CALLCENTER', 70),
  ('mdi', 'equals', 'MDI', 80),
  ('vendasia', 'contains', 'IA_VENDAS', 90)
ON CONFLICT (source_pattern) DO NOTHING;

INSERT INTO analytics.dim_product_mapping (pattern, product_base, offer_kind, priority)
VALUES
  ('DERMA BLOOM', 'DERMA BLOOM', 'principal', 10),
  ('COCO SLIM', 'COCO SLIM', 'principal', 20),
  ('POWER 66', 'POWER 66', 'principal', 30),
  ('GLICO RESET', 'GLICO RESET', 'principal', 40),
  ('GELATINA SLIM', 'GELATINA SLIM', 'principal', 50),
  ('VISION PURE', 'VISION PURE', 'principal', 60),
  ('LAXANTRIL', 'LAXANTRIL', 'principal', 70),
  ('PROSTAPOWER', 'PROSTAPOWER', 'principal', 80),
  ('UP2', 'OUTRO', 'us2', 200),
  ('UP1', 'OUTRO', 'us1', 210),
  ('DOWN-1 (UP1)', 'OUTRO', 'downsell_us1', 220),
  ('DOWN-1(UP1)', 'OUTRO', 'downsell_us1', 221),
  ('DOWN-1 (UP2)', 'OUTRO', 'downsell_us2', 222),
  ('DOWN-1(UP2)', 'OUTRO', 'downsell_us2', 223),
  ('TELEVENDAS', 'OUTRO', 'televendas', 230),
  ('S2 CLUBE', 'S2 CLUBE', 'recorrencia', 240),
  ('GRUPO VIP', 'OUTRO', 'grupo_vip', 250)
ON CONFLICT (pattern) DO NOTHING;
