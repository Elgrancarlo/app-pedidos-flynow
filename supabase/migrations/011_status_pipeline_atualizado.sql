-- Migration 011: Novos status do pipeline Kanban
-- Adiciona: pago, nota_fiscal, separacao
-- Compatibilidade: valores antigos aguardando_postagem → pago (migração dos pedidos existentes)

-- Migrar pedidos antigos com status aguardando_postagem para pago
-- (pedidos que ainda não foram postados ficam como "pago" no novo pipeline)
-- Apenas migrar pedidos que nunca tiveram código de rastreio
UPDATE pedidos
SET status = 'pago'
WHERE status = 'aguardando_postagem'
  AND codigo_rastreio IS NULL
  AND created_at > NOW() - INTERVAL '7 days'; -- Só recentes, os antigos mantêm aguardando_postagem

-- Nota: pedidos antigos (>7 dias) sem rastreio são mantidos como aguardando_postagem
-- para não perder histórico. O operador pode mover manualmente no Kanban.
