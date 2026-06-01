# Matriz de Auditoria FlyNow

## Supervisor

- Supervisor lógico da operação: matriz consolidada a partir da revisão central e dos agentes exploradores.
- Auditoria 2 consolidada em `2026-05-27` com 5 agentes especializados.

## Status atual

- Checklist 5 camadas criado.
- Auditoria estrutural concluída para todas as abas.
- Primeira rodada de correções já publicada e `sync/payt` reprocessado até `2026-05-27`.
- Segunda rodada de auditoria concluída com findings novos de modelagem, webhook, finanças e estoque.

## Abas críticas da Auditoria 2

### Financeiro
- Risco: `event_at` de reversão usa a data da venda em parte do fluxo; cards podem cair no dia errado.
- Risco: histórico importado não entra no `payt_event_stream`, então parte dos cards financeiros pode divergir das listas.
- Risco: receita bruta/ticket médio ainda precisam regra fechada para não contar estornados como “pagos”.

### Dashboard
- Risco: mistura temporal entre `data_pagamento`, `event_at` e “hoje” em UTC implícito.
- Risco: taxa de reembolso do dia compara universos diferentes.

### Analytics / Funil
- Risco: KPIs de upsell incluem `downsell`, `televendas`, `recorrencia` e `grupo_vip`.
- Risco: take rate ainda não é calculado por coorte de carrinho da venda principal.
- Risco: com filtro de produto, logs/transcrições/alertas ainda podem estar globais.

### Analytics / Canais
- Risco: grain RedTrack por `rt_source` é perdido no sync atual.
- Risco: overview e canais usam semânticas diferentes de ROAS.
- Risco: UI ainda parece comparar/joinar PayT com RedTrack sem um mapeamento canônico entre as duas fontes.

### Analytics / Upsells
- Risco: `offer_kind` é inferido só por `produto_nome`.
- Risco: `US1/US2` na UI ainda são parcialmente reconstruídos por taxa agregada.
- Risco: imports sem raw associado empurram receita/canal para `OUTROS`.

### Carrinhos
- Risco: eventos com só `cart_id` podem falhar no `payt_event_stream`.
- Risco: mesma jornada pode duplicar quando o checkout começa sem `transaction_id` e depois ganha transação.
- Risco: a fila lê o raw, não o stream normalizado.

### Pedidos
- Risco: cards, lista e kanban ainda podem divergir por coorte/semântica temporal.

### Estoque
- Risco: mutações não atômicas entre saldo e extrato.
- Risco: `paid` tardio após estorno pode deixar saldo inflado.
- Risco: H7 altera estado sem reconciliar estoque.

### Configuracoes
- Risco: tela ainda é estática, não health real.
- Risco: não evidencia qual webhook PayT está realmente em uso.

## Correções priorizadas

1. Corrigir `event_at` no `payt_event_stream` para refund/chargeback e estabilizar timezone operacional.
2. Reconciliar `cart_id` x `transaction_id` no fluxo de carrinhos e parar de depender só do raw.
3. Preservar grain RedTrack por `rt_source`.
4. Separar semanticamente `upsell`, `downsell`, `televendas`, `recorrencia` e `grupo_vip`.
5. Recalcular take rate por `payt_cart_id`/venda principal.
6. Fechar imports históricos para também preencher raw/event stream/UTM quando possível.
7. Tornar mutações de estoque atômicas.
8. Transformar Configurações em health/config real.

## Próxima execução

1. Corrigir modelo de evento financeiro e carrinhos.
2. Corrigir sync/modelagem analytics de RedTrack e upsells.
3. Corrigir atomicidade e transições de estoque.
4. Revisar visualmente as abas após backfill/reprocessamento.
