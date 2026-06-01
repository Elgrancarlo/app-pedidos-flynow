-- =============================================================================
-- 009_novos_campos.sql
-- Novos campos em pedidos, tabela user_roles, índices adicionais
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. NOVOS CAMPOS NA TABELA pedidos
-- -----------------------------------------------------------------------------

-- ordem_pedido: número sequencial do pedido (gerado automaticamente por trigger)
ALTER TABLE pedidos
  ADD COLUMN IF NOT EXISTS ordem_pedido       INTEGER;

-- payt_cart_id: ID do carrinho na Payt (ex: "JX9QMGQ", campo cart_id no webhook)
ALTER TABLE pedidos
  ADD COLUMN IF NOT EXISTS payt_cart_id       TEXT;

-- parcelas: número de parcelas do pagamento (transaction.installments na Payt)
ALTER TABLE pedidos
  ADD COLUMN IF NOT EXISTS parcelas           INTEGER;

-- nfc_numero: número da nota fiscal eletrônica (NF-e/NFC-e)
ALTER TABLE pedidos
  ADD COLUMN IF NOT EXISTS nfc_numero         TEXT;

-- nfc_valor: valor da nota fiscal (pode diferir do valor_total por frete, impostos)
ALTER TABLE pedidos
  ADD COLUMN IF NOT EXISTS nfc_valor          NUMERIC(10, 2);

-- data_prometida_entrega: prazo prometido pela H7 no payload (campo promisedDate)
ALTER TABLE pedidos
  ADD COLUMN IF NOT EXISTS data_prometida_entrega  DATE;

-- data_chegou_logistica: quando o objeto chegou fisicamente na base logística
-- (mapeado pelo status H7 code=17 "Chegou em uma base" — mais recente)
ALTER TABLE pedidos
  ADD COLUMN IF NOT EXISTS data_chegou_logistica   TIMESTAMPTZ;

-- Novo pipeline de status (mantém retrocompatibilidade com os valores antigos)
-- Valores antigos ainda válidos: aguardando_postagem, postado, em_transporte,
--   aguardando_retirada, entregue, devolvido
-- Novos valores adicionados ao pipeline:
--   pago | nota_fiscal | separacao | aguard_postagem | postado | em_transito |
--   saiu_entrega | entregue
-- NOTA: "aguardando_postagem" continua existindo — "pago" é o estágio anterior.
--       Não há CHECK CONSTRAINT no campo status original (TEXT livre), então
--       os novos valores são imediatamente suportados sem ALTER.
--       Ver migration 010 para a RPC que trata o pipeline completo.

-- -----------------------------------------------------------------------------
-- 2. SEQUENCE PARA ordem_pedido
-- -----------------------------------------------------------------------------

-- Cria a sequence se não existir
CREATE SEQUENCE IF NOT EXISTS pedidos_ordem_seq
  START WITH 1
  INCREMENT BY 1
  NO MAXVALUE
  NO CYCLE;

-- Preenche retroativamente os pedidos existentes em ordem cronológica
-- (executa apenas uma vez — registros novos usam o trigger abaixo)
DO $$
DECLARE
  r RECORD;
  seq_val INTEGER;
BEGIN
  -- Só executa se houver pedidos sem ordem_pedido
  IF EXISTS (SELECT 1 FROM pedidos WHERE ordem_pedido IS NULL LIMIT 1) THEN
    FOR r IN
      SELECT id FROM pedidos
      WHERE ordem_pedido IS NULL
      ORDER BY data_pagamento ASC NULLS LAST, created_at ASC
    LOOP
      seq_val := nextval('pedidos_ordem_seq');
      UPDATE pedidos SET ordem_pedido = seq_val WHERE id = r.id;
    END LOOP;
  END IF;
END;
$$;

-- Trigger: atribui ordem_pedido automaticamente em novos registros
CREATE OR REPLACE FUNCTION set_ordem_pedido()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.ordem_pedido IS NULL THEN
    NEW.ordem_pedido := nextval('pedidos_ordem_seq');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS pedidos_set_ordem ON pedidos;
CREATE TRIGGER pedidos_set_ordem
  BEFORE INSERT ON pedidos
  FOR EACH ROW EXECUTE FUNCTION set_ordem_pedido();

-- -----------------------------------------------------------------------------
-- 3. TABELA user_roles
-- -----------------------------------------------------------------------------
-- Usa o auth.users do Supabase como base (UUID = auth.users.id)
-- Roles disponíveis: admin | estoque | financeiro | atendimento

CREATE TABLE IF NOT EXISTS user_roles (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role        TEXT NOT NULL CHECK (role IN ('admin', 'estoque', 'financeiro', 'atendimento')),
  ativo       BOOLEAN NOT NULL DEFAULT TRUE,
  criado_por  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (user_id, role)  -- um usuário pode ter apenas uma entrada por role
);

-- Trigger updated_at (reutiliza a função criada em 001_pedidos.sql)
DROP TRIGGER IF EXISTS user_roles_updated_at ON user_roles;
CREATE TRIGGER user_roles_updated_at
  BEFORE UPDATE ON user_roles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS: apenas admins podem gerenciar roles
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Usuários autenticados veem apenas o próprio role
CREATE POLICY user_roles_select_own ON user_roles
  FOR SELECT
  USING (auth.uid() = user_id);

-- Apenas service role (API routes com SUPABASE_SERVICE_ROLE_KEY) faz INSERT/UPDATE/DELETE
-- As políticas abaixo bloqueiam escritas via anon/authenticated key
CREATE POLICY user_roles_no_insert ON user_roles
  FOR INSERT WITH CHECK (FALSE);

CREATE POLICY user_roles_no_update ON user_roles
  FOR UPDATE USING (FALSE);

CREATE POLICY user_roles_no_delete ON user_roles
  FOR DELETE USING (FALSE);

-- Habilitar Realtime (útil para atualizar permissões sem logout)
ALTER PUBLICATION supabase_realtime ADD TABLE user_roles;

-- -----------------------------------------------------------------------------
-- 4. NOVOS ÍNDICES
-- -----------------------------------------------------------------------------

-- ordem_pedido: buscas por número de pedido (ex: suporte ao cliente)
CREATE UNIQUE INDEX IF NOT EXISTS idx_pedidos_ordem_pedido
  ON pedidos (ordem_pedido);

-- nfc_numero: buscas de NF por número
CREATE INDEX IF NOT EXISTS idx_pedidos_nfc_numero
  ON pedidos (nfc_numero)
  WHERE nfc_numero IS NOT NULL;

-- data_prometida_entrega: alertas de pedidos atrasados
CREATE INDEX IF NOT EXISTS idx_pedidos_data_prometida
  ON pedidos (data_prometida_entrega)
  WHERE data_prometida_entrega IS NOT NULL;

-- data_chegou_logistica: funil logístico
CREATE INDEX IF NOT EXISTS idx_pedidos_chegada_logistica
  ON pedidos (data_chegou_logistica DESC)
  WHERE data_chegou_logistica IS NOT NULL;

-- user_roles: lookup rápido por user_id
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id
  ON user_roles (user_id);

-- user_roles: lookup por role (ex: listar todos os admins)
CREATE INDEX IF NOT EXISTS idx_user_roles_role
  ON user_roles (role)
  WHERE ativo = TRUE;

-- Índice composto para alertas de atraso: pedidos em trânsito com prazo vencido
CREATE INDEX IF NOT EXISTS idx_pedidos_atraso
  ON pedidos (data_prometida_entrega, status)
  WHERE status NOT IN ('entregue', 'devolvido')
    AND data_prometida_entrega IS NOT NULL;
