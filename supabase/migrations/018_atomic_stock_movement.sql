CREATE OR REPLACE FUNCTION registrar_movimentacao_estoque(
  p_grupo TEXT,
  p_tipo TEXT,
  p_qtd INTEGER,
  p_referencia_pedido_id UUID DEFAULT NULL,
  p_observacao TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  IF p_grupo IS NULL OR btrim(p_grupo) = '' THEN
    RAISE EXCEPTION 'p_grupo obrigatorio';
  END IF;

  IF p_tipo NOT IN ('entrada', 'venda') THEN
    RAISE EXCEPTION 'p_tipo invalido: %', p_tipo;
  END IF;

  IF p_qtd IS NULL OR p_qtd <= 0 THEN
    RAISE EXCEPTION 'p_qtd deve ser maior que zero';
  END IF;

  INSERT INTO estoque_grupos (nome_grupo)
  VALUES (p_grupo)
  ON CONFLICT (nome_grupo) DO NOTHING;

  IF p_tipo = 'entrada' THEN
    UPDATE estoque_grupos
    SET estoque_atual = estoque_atual + p_qtd,
        updated_at = NOW()
    WHERE nome_grupo = p_grupo;
  ELSE
    UPDATE estoque_grupos
    SET estoque_atual = estoque_atual - p_qtd,
        updated_at = NOW()
    WHERE nome_grupo = p_grupo;
  END IF;

  INSERT INTO estoque_movimentacao (
    produto_grupo,
    tipo,
    qtd_potes,
    referencia_pedido_id,
    observacao
  ) VALUES (
    p_grupo,
    p_tipo,
    p_qtd,
    p_referencia_pedido_id,
    p_observacao
  );
END;
$$ LANGUAGE plpgsql;
