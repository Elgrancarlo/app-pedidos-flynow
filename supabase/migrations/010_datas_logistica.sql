-- Migration 010: Datas de logística (prometida vs. real)
-- Os campos foram adicionados na 009. Esta migration garante idempotência
-- caso seja aplicada em DBs que não passaram pela 009 completa.

ALTER TABLE pedidos
  ADD COLUMN IF NOT EXISTS data_prometida_entrega  DATE,
  ADD COLUMN IF NOT EXISTS data_chegou_logistica   TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_pedidos_data_prometida
  ON pedidos(data_prometida_entrega)
  WHERE data_prometida_entrega IS NOT NULL;
