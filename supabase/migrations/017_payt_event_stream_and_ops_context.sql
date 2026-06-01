ALTER TABLE payt_webhooks_raw
  ADD COLUMN IF NOT EXISTS transaction_id TEXT,
  ADD COLUMN IF NOT EXISTS cart_id TEXT,
  ADD COLUMN IF NOT EXISTS event_status TEXT,
  ADD COLUMN IF NOT EXISTS event_name TEXT,
  ADD COLUMN IF NOT EXISTS integration_key TEXT,
  ADD COLUMN IF NOT EXISTS tangible BOOLEAN,
  ADD COLUMN IF NOT EXISTS customer_email TEXT,
  ADD COLUMN IF NOT EXISTS product_name TEXT;

CREATE INDEX IF NOT EXISTS idx_payt_webhooks_raw_transaction_id
  ON payt_webhooks_raw(transaction_id);

CREATE INDEX IF NOT EXISTS idx_payt_webhooks_raw_event_status
  ON payt_webhooks_raw(event_status);

CREATE TABLE IF NOT EXISTS payt_event_stream (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_key TEXT NOT NULL UNIQUE,
  transaction_id TEXT NOT NULL,
  cart_id TEXT,
  event_status TEXT NOT NULL,
  event_name TEXT,
  event_group TEXT NOT NULL DEFAULT 'other',
  tangible BOOLEAN,
  customer_name TEXT,
  customer_email TEXT,
  customer_phone TEXT,
  customer_doc TEXT,
  product_name TEXT,
  product_group TEXT,
  product_quantity INTEGER,
  payment_method TEXT,
  total_price NUMERIC(12,2),
  paid_at TIMESTAMPTZ,
  payload JSONB NOT NULL,
  event_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payt_event_stream_transaction_id
  ON payt_event_stream(transaction_id);

CREATE INDEX IF NOT EXISTS idx_payt_event_stream_cart_id
  ON payt_event_stream(cart_id);

CREATE INDEX IF NOT EXISTS idx_payt_event_stream_event_status
  ON payt_event_stream(event_status);

CREATE INDEX IF NOT EXISTS idx_payt_event_stream_event_group
  ON payt_event_stream(event_group);

CREATE INDEX IF NOT EXISTS idx_payt_event_stream_event_at
  ON payt_event_stream(event_at DESC);

ALTER TABLE analytics.funil_log_alteracoes
  ADD COLUMN IF NOT EXISTS tipo_alteracao TEXT,
  ADD COLUMN IF NOT EXISTS hipotese TEXT,
  ADD COLUMN IF NOT EXISTS detalhes JSONB,
  ADD COLUMN IF NOT EXISTS janela_antes_inicio DATE,
  ADD COLUMN IF NOT EXISTS janela_antes_fim DATE,
  ADD COLUMN IF NOT EXISTS janela_depois_inicio DATE,
  ADD COLUMN IF NOT EXISTS janela_depois_fim DATE,
  ADD COLUMN IF NOT EXISTS metricas_antes JSONB,
  ADD COLUMN IF NOT EXISTS metricas_depois JSONB,
  ADD COLUMN IF NOT EXISTS insight_ia TEXT,
  ADD COLUMN IF NOT EXISTS severidade_alerta TEXT,
  ADD COLUMN IF NOT EXISTS status_analise TEXT NOT NULL DEFAULT 'pendente';

CREATE TABLE IF NOT EXISTS analytics.ops_call_transcripts (
  id BIGSERIAL PRIMARY KEY,
  happened_at TIMESTAMPTZ,
  title TEXT NOT NULL,
  area TEXT,
  participants TEXT[] NOT NULL DEFAULT '{}',
  related_products TEXT[] NOT NULL DEFAULT '{}',
  tags TEXT[] NOT NULL DEFAULT '{}',
  transcript TEXT NOT NULL,
  summary TEXT,
  uploaded_by TEXT,
  source_kind TEXT NOT NULL DEFAULT 'manual',
  source_ref TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_analytics_ops_call_transcripts_happened_at
  ON analytics.ops_call_transcripts(happened_at DESC);

CREATE INDEX IF NOT EXISTS idx_analytics_ops_call_transcripts_area
  ON analytics.ops_call_transcripts(area);
