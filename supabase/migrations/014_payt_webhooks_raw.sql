-- Migration 014: Tabela de auditoria de webhooks da Payt
-- Usada pela Edge Function webhook-payt para logar todos os payloads recebidos

CREATE TABLE IF NOT EXISTS payt_webhooks_raw (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payload    JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payt_webhooks_raw_created_at
  ON payt_webhooks_raw(created_at DESC);

-- Limpar logs antigos automaticamente após 90 dias (opcional)
-- Pode ser executado via cron no futuro
