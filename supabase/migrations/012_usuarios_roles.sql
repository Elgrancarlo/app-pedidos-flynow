-- Migration 012: Sistema de roles de usuários

CREATE TABLE IF NOT EXISTS usuarios_roles (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID UNIQUE NOT NULL,
  role        TEXT NOT NULL DEFAULT 'atendimento'
                CHECK (role IN ('admin', 'estoque', 'financeiro', 'atendimento')),
  nome        TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_usuarios_roles_user_id ON usuarios_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_usuarios_roles_role    ON usuarios_roles(role);

CREATE TRIGGER usuarios_roles_updated_at
  BEFORE UPDATE ON usuarios_roles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
