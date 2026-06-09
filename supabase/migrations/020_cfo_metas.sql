-- ============================================================================
-- 020_cfo_metas.sql
-- Tables for CFO panel governance and monthly goal planning.
-- ============================================================================

CREATE TABLE IF NOT EXISTS analytics.metas_mensais (
  id                    BIGSERIAL PRIMARY KEY,
  mes                   DATE NOT NULL,

  invest_facebook       NUMERIC(12,2) NOT NULL DEFAULT 0,
  invest_tiktok         NUMERIC(12,2) NOT NULL DEFAULT 0,
  invest_taboola        NUMERIC(12,2) NOT NULL DEFAULT 0,
  invest_mgid           NUMERIC(12,2) NOT NULL DEFAULT 0,
  invest_google         NUMERIC(12,2) NOT NULL DEFAULT 0,
  invest_total          NUMERIC(12,2) GENERATED ALWAYS AS (
    invest_facebook + invest_tiktok + invest_taboola + invest_mgid + invest_google
  ) STORED,

  receita_facebook      NUMERIC(12,2) NOT NULL DEFAULT 0,
  receita_tiktok        NUMERIC(12,2) NOT NULL DEFAULT 0,
  receita_taboola       NUMERIC(12,2) NOT NULL DEFAULT 0,
  receita_mgid          NUMERIC(12,2) NOT NULL DEFAULT 0,
  receita_google        NUMERIC(12,2) NOT NULL DEFAULT 0,
  receita_trafego_total NUMERIC(12,2) GENERATED ALWAYS AS (
    receita_facebook + receita_tiktok + receita_taboola + receita_mgid + receita_google
  ) STORED,

  roas_exigido          NUMERIC(6,4) NOT NULL DEFAULT 1.40,
  roas_breakeven        NUMERIC(6,4) NOT NULL DEFAULT 1.31,

  backend_callcenter_conversoes  INTEGER NOT NULL DEFAULT 0,
  backend_callcenter_receita     NUMERIC(12,2) NOT NULL DEFAULT 0,
  backend_callcenter_ticket      NUMERIC(10,2) NOT NULL DEFAULT 0,

  backend_whatsapp_conversoes    INTEGER NOT NULL DEFAULT 0,
  backend_whatsapp_receita       NUMERIC(12,2) NOT NULL DEFAULT 0,
  backend_whatsapp_ticket        NUMERIC(10,2) NOT NULL DEFAULT 0,

  backend_sms_conversoes         INTEGER NOT NULL DEFAULT 0,
  backend_sms_receita            NUMERIC(12,2) NOT NULL DEFAULT 0,
  backend_sms_ticket             NUMERIC(10,2) NOT NULL DEFAULT 0,

  backend_email_conversoes       INTEGER NOT NULL DEFAULT 0,
  backend_email_receita          NUMERIC(12,2) NOT NULL DEFAULT 0,
  backend_email_ticket           NUMERIC(10,2) NOT NULL DEFAULT 0,

  meta_receita_liquida  NUMERIC(12,2) NOT NULL DEFAULT 0,
  meta_clientes         INTEGER NOT NULL DEFAULT 0,
  meta_ticket_medio     NUMERIC(10,2) NOT NULL DEFAULT 0,
  meta_pct_front        NUMERIC(6,2) NOT NULL DEFAULT 75.00,
  meta_pct_backend      NUMERIC(6,2) NOT NULL DEFAULT 15.00,
  meta_pct_recuperada   NUMERIC(6,2) NOT NULL DEFAULT 10.00,
  meta_pct_chargeback   NUMERIC(6,2) NOT NULL DEFAULT 6.00,
  meta_pct_reembolso    NUMERIC(6,2) NOT NULL DEFAULT 2.00,
  meta_pct_cmv          NUMERIC(6,2) NOT NULL DEFAULT 14.00,
  meta_pct_eficiencia   NUMERIC(6,2) NOT NULL DEFAULT 4.50,
  meta_lucro_liquido    NUMERIC(12,2) NOT NULL DEFAULT 0,
  meta_ebitda_pct       NUMERIC(6,2) NOT NULL DEFAULT 9.40,

  qtd_semanas           INTEGER NOT NULL DEFAULT 4,

  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(mes)
);

CREATE INDEX IF NOT EXISTS idx_metas_mensais_mes ON analytics.metas_mensais(mes);

CREATE TABLE IF NOT EXISTS analytics.cfo_inputs_semanais (
  id                    BIGSERIAL PRIMARY KEY,
  mes                   DATE NOT NULL,
  semana                INTEGER NOT NULL,
  semana_inicio         DATE NOT NULL,
  semana_fim            DATE NOT NULL,

  cmv_pct               NUMERIC(6,2),
  eficiencia_pct        NUMERIC(6,2),
  lucro_liquido         NUMERIC(12,2),
  ebitda_pct            NUMERIC(6,2),

  override_receita      NUMERIC(12,2),
  override_investimento NUMERIC(12,2),
  override_roas         NUMERIC(6,4),
  override_roi          NUMERIC(6,4),
  override_cpa          NUMERIC(10,2),

  notas                 TEXT,

  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(mes, semana)
);

CREATE INDEX IF NOT EXISTS idx_cfo_inputs_mes ON analytics.cfo_inputs_semanais(mes);

CREATE OR REPLACE FUNCTION analytics.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS metas_mensais_updated_at ON analytics.metas_mensais;
CREATE TRIGGER metas_mensais_updated_at
  BEFORE UPDATE ON analytics.metas_mensais
  FOR EACH ROW EXECUTE FUNCTION analytics.update_updated_at();

DROP TRIGGER IF EXISTS cfo_inputs_updated_at ON analytics.cfo_inputs_semanais;
CREATE TRIGGER cfo_inputs_updated_at
  BEFORE UPDATE ON analytics.cfo_inputs_semanais
  FOR EACH ROW EXECUTE FUNCTION analytics.update_updated_at();
