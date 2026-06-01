-- Limpar movimentações de estoque criadas pelo import-h7 (dados falsos)
-- O estoque é gerenciado exclusivamente pelo webhook Payt daqui pra frente

DELETE FROM estoque_movimentacao
WHERE observacao = 'Importado via H7';

-- Zerar estoque_atual de todos os grupos
-- O webhook Payt decrementa automaticamente a cada venda aprovada
UPDATE estoque_grupos SET estoque_atual = 0, updated_at = NOW();
