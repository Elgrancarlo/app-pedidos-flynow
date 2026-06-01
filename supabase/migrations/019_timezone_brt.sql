-- =============================================================================
-- 019_timezone_brt.sql
-- Corrige todas as RPCs do dashboard para usar timezone America/Sao_Paulo (BRT)
-- em vez de CURRENT_DATE (UTC), alinhando com o frontend que ja opera em BRT.
-- Tambem adiciona filtro de data ao funil_pedidos().
-- =============================================================================

-- Vendas de hoje (BRT) — contagem + valor
CREATE OR REPLACE FUNCTION vendas_hoje()
RETURNS JSON LANGUAGE SQL STABLE AS $$
  SELECT json_build_object(
    'count', COUNT(*),
    'valor', COALESCE(SUM(valor_total), 0)
  )
  FROM pedidos
  WHERE data_pagamento >= (CURRENT_TIMESTAMP AT TIME ZONE 'America/Sao_Paulo')::DATE
    AND data_pagamento <  ((CURRENT_TIMESTAMP AT TIME ZONE 'America/Sao_Paulo')::DATE + 1)
    AND status_pagamento = 'paid';
$$;

-- Tendencia 30 dias (BRT): receita e reembolsos por dia
CREATE OR REPLACE FUNCTION tendencia_30_dias()
RETURNS TABLE(dia DATE, receita NUMERIC, reembolsos NUMERIC)
LANGUAGE SQL STABLE AS $$
  SELECT
    (data_pagamento AT TIME ZONE 'America/Sao_Paulo')::DATE AS dia,
    COALESCE(SUM(valor_total) FILTER (WHERE status_pagamento = 'paid'), 0)                       AS receita,
    COALESCE(SUM(valor_total) FILTER (WHERE status_pagamento IN ('refunded','chargeback')), 0)   AS reembolsos
  FROM pedidos
  WHERE data_pagamento >= ((CURRENT_TIMESTAMP AT TIME ZONE 'America/Sao_Paulo')::DATE - 29)
    AND data_pagamento <  ((CURRENT_TIMESTAMP AT TIME ZONE 'America/Sao_Paulo')::DATE + 1)
  GROUP BY (data_pagamento AT TIME ZONE 'America/Sao_Paulo')::DATE
  ORDER BY dia ASC;
$$;

-- Pedidos atrasados (BRT): prometida < hoje e ainda nao entregue
CREATE OR REPLACE FUNCTION pedidos_atrasados()
RETURNS TABLE(
  id UUID,
  ordem_pedido INTEGER,
  cliente_nome TEXT,
  produto_grupo TEXT,
  codigo_rastreio TEXT,
  data_prometida_entrega DATE,
  status TEXT
) LANGUAGE SQL STABLE AS $$
  SELECT
    id, ordem_pedido, cliente_nome, produto_grupo,
    codigo_rastreio, data_prometida_entrega, status
  FROM pedidos
  WHERE data_prometida_entrega < (CURRENT_TIMESTAMP AT TIME ZONE 'America/Sao_Paulo')::DATE
    AND status NOT IN ('entregue', 'devolvido')
    AND data_prometida_entrega IS NOT NULL
  ORDER BY data_prometida_entrega ASC
  LIMIT 50;
$$;

-- Funil de pedidos COM filtro de data (BRT)
-- Aceita data_pagamento_start e data_pagamento_end como parametros opcionais
CREATE OR REPLACE FUNCTION funil_pedidos(
  p_start TIMESTAMPTZ DEFAULT NULL,
  p_end   TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE(status TEXT, total BIGINT, valor NUMERIC)
LANGUAGE SQL STABLE AS $$
  SELECT
    status,
    COUNT(*)                        AS total,
    COALESCE(SUM(valor_total), 0)  AS valor
  FROM pedidos
  WHERE (p_start IS NULL OR data_pagamento >= p_start)
    AND (p_end   IS NULL OR data_pagamento <= p_end)
  GROUP BY status
  ORDER BY total DESC;
$$;

-- Receita liquida no periodo (BRT) — mantem compatibilidade com versao anterior
CREATE OR REPLACE FUNCTION receita_liquida(p_start TIMESTAMPTZ, p_end TIMESTAMPTZ)
RETURNS NUMERIC LANGUAGE SQL STABLE AS $$
  SELECT
    COALESCE(SUM(valor_total) FILTER (WHERE status_pagamento = 'paid'), 0)
    - COALESCE(SUM(valor_total) FILTER (WHERE chargeback = TRUE), 0)
    - COALESCE(SUM(valor_total) FILTER (WHERE status_pagamento = 'refunded'), 0)
  FROM pedidos
  WHERE data_pagamento >= p_start AND data_pagamento <= p_end;
$$;

-- Versoes com filtro de data (BRT) para os cards — usados na pagina /pedidos
CREATE OR REPLACE FUNCTION contagem_por_status(
  p_start TIMESTAMPTZ,
  p_end   TIMESTAMPTZ
)
RETURNS TABLE(status TEXT, total BIGINT)
LANGUAGE SQL STABLE AS $$
  SELECT status, COUNT(*) AS total
  FROM pedidos
  WHERE data_pagamento >= p_start
    AND data_pagamento <= p_end
  GROUP BY status;
$$;

CREATE OR REPLACE FUNCTION metricas_financeiras(
  p_start TIMESTAMPTZ,
  p_end   TIMESTAMPTZ
)
RETURNS JSON
LANGUAGE SQL STABLE AS $$
  SELECT json_build_object(
    'chargebacks',      COUNT(*) FILTER (WHERE chargeback = TRUE AND status_pagamento = 'chargeback'),
    'valorChargebacks', COALESCE(SUM(valor_total) FILTER (WHERE chargeback = TRUE AND status_pagamento = 'chargeback'), 0),
    'reembolsos',       COUNT(*) FILTER (WHERE status_pagamento = 'refunded'),
    'valorReembolsos',  COALESCE(SUM(valor_total) FILTER (WHERE status_pagamento = 'refunded'), 0)
  )
  FROM pedidos
  WHERE data_pagamento >= p_start
    AND data_pagamento <= p_end;
$$;
