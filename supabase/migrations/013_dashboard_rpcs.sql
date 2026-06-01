-- Migration 013: RPCs para o Dashboard em tempo real

-- Vendas de hoje (contagem + valor)
CREATE OR REPLACE FUNCTION vendas_hoje()
RETURNS JSON LANGUAGE SQL STABLE AS $$
  SELECT json_build_object(
    'count', COUNT(*),
    'valor', COALESCE(SUM(valor_total), 0)
  )
  FROM pedidos
  WHERE data_pagamento >= CURRENT_DATE::TIMESTAMPTZ
    AND data_pagamento <  (CURRENT_DATE + 1)::TIMESTAMPTZ
    AND status_pagamento = 'paid';
$$;

-- Pedidos em trânsito agora (snapshot — sem filtro de data)
CREATE OR REPLACE FUNCTION pedidos_em_transito()
RETURNS JSON LANGUAGE SQL STABLE AS $$
  SELECT json_build_object(
    'count', COUNT(*),
    'valor', COALESCE(SUM(valor_total), 0)
  )
  FROM pedidos
  WHERE status IN ('postado', 'em_transporte', 'aguardando_retirada');
$$;

-- Pedidos atrasados (prometida < hoje e ainda não entregue)
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
  WHERE data_prometida_entrega < CURRENT_DATE
    AND status NOT IN ('entregue', 'devolvido')
    AND data_prometida_entrega IS NOT NULL
  ORDER BY data_prometida_entrega ASC
  LIMIT 50;
$$;

-- Tendência 30 dias: receita e reembolsos por dia
CREATE OR REPLACE FUNCTION tendencia_30_dias()
RETURNS TABLE(dia DATE, receita NUMERIC, reembolsos NUMERIC)
LANGUAGE SQL STABLE AS $$
  SELECT
    DATE(data_pagamento) AS dia,
    COALESCE(SUM(valor_total) FILTER (WHERE status_pagamento = 'paid'), 0)                       AS receita,
    COALESCE(SUM(valor_total) FILTER (WHERE status_pagamento IN ('refunded','chargeback')), 0)   AS reembolsos
  FROM pedidos
  WHERE data_pagamento >= (CURRENT_DATE - 29)::TIMESTAMPTZ
    AND data_pagamento <  (CURRENT_DATE + 1)::TIMESTAMPTZ
  GROUP BY DATE(data_pagamento)
  ORDER BY dia ASC;
$$;

-- Funil de pedidos (count + valor por status — estado atual)
CREATE OR REPLACE FUNCTION funil_pedidos()
RETURNS TABLE(status TEXT, total BIGINT, valor NUMERIC)
LANGUAGE SQL STABLE AS $$
  SELECT
    status,
    COUNT(*)                        AS total,
    COALESCE(SUM(valor_total), 0)  AS valor
  FROM pedidos
  GROUP BY status
  ORDER BY total DESC;
$$;

-- Receita líquida no período
CREATE OR REPLACE FUNCTION receita_liquida(p_start TIMESTAMPTZ, p_end TIMESTAMPTZ)
RETURNS NUMERIC LANGUAGE SQL STABLE AS $$
  SELECT
    COALESCE(SUM(valor_total) FILTER (WHERE status_pagamento = 'paid'), 0)
    - COALESCE(SUM(valor_total) FILTER (WHERE chargeback = TRUE), 0)
    - COALESCE(SUM(valor_total) FILTER (WHERE status_pagamento = 'refunded'), 0)
  FROM pedidos
  WHERE data_pagamento >= p_start AND data_pagamento <= p_end;
$$;
