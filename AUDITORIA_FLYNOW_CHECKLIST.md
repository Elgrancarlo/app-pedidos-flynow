# Auditoria FlyNow

## Auditoria 2

### Supervisor
- Consolidação feita a partir de 5 agentes especializados e revisão central local.
- Frentes cobertas:
- `Dashboard + Pedidos + Financeiro`
- `Carrinhos + Webhook PayT + Event Stream`
- `Estoque + Configurações + Rotas operacionais`
- `Analytics Overview + Funil + Canais + RedTrack`
- `Upsells + UTM + Offer Kind + Produto base`

## Prioridade atual

1. Corrigir modelagem de evento e data financeira.
2. Corrigir reconciliação de carrinho `cart_id` x `transaction_id`.
3. Corrigir grain RedTrack por source.
4. Corrigir classificação de oferta/upsell/downsell/recorrência.
5. Corrigir integridade operacional de estoque e rotas admin.

## Camadas de verificacao

1. Fonte de dados
- Tabela, view, webhook, sync ou integracao que deveria alimentar a aba.

2. Backend
- Query, agregacao, filtros, joins, normalizacao e regras de negocio aplicadas.

3. API ou rota
- Endpoint, server component ou chamada direta ao Supabase usada pela tela.

4. Frontend
- Somatorias, cards, tabelas, graficos, filtros, labels e agrupamentos exibidos.

5. Consistencia operacional
- Compatibilidade com webhook real, rotina de sincronizacao, status esperados e comportamento em producao.

## Abas

### Dashboard
- Mapear cards e blocos.
- Confirmar origem de cada KPI.
- Confirmar coerencia com carrinhos, pedidos e analytics.
- Confirmar semântica temporal local, não UTC implícito.
- Confirmar que reversões usam a data do evento, não a data da venda.

### Pedidos
- Validar filtros, listagem, modal, status, NFC e atualizacao.
- Confirmar inclusao de pedidos nao pagos e refletir status_pagamento real.
- Confirmar se cards, lista e kanban usam a mesma coorte.
- Confirmar semântica única do período filtrado.

### Carrinhos
- Validar eventos PayT nao pagos.
- Confirmar classificacao entre aberto, abandono, perdido e recuperado.
- Confirmar reconciliação `cart_id` x `transaction_id`.
- Confirmar que a fila não mistura pós-venda com checkout.

### Financeiro
- Validar faturamento, periodizacao e status financeiros.
- Confirmar tratamento de chargeback, refund e refund_requested.
- Confirmar que `Receita Bruta`, `Total Pedidos` e `Ticket Médio` não contam estornados como pagos.
- Confirmar backfill/imports históricos no `payt_event_stream`.

### Estoque
- Validar agregacao por produto canonico.
- Confirmar entradas, vendas, ajustes manuais e recalculo.
- Confirmar atomicidade entre saldo e extrato.
- Confirmar transições `paid -> refund/chargeback -> paid`.

### Configuracoes
- Validar leitura de estado real do sistema.
- Confirmar se a tela expõe configuracao correta ou placeholders.
- Confirmar fonte real do webhook PayT ativo.
- Confirmar health real das integrações e segredos críticos.

### Analytics Overview
- Validar funil diario consolidado com spend RedTrack.
- Confirmar reconciliacao entre PayT e RedTrack.
- Confirmar definição única de ROAS por tela.
- Confirmar grain RedTrack preservado para source.

### Analytics Funil
- Validar KPIs, series, take rates, logs, transcricoes e alertas.
- Confirmar consolidacao por dia e ponderacao correta.
- Confirmar que filtro por produto não exibe contexto global como se fosse filtrado.
- Confirmar separação semântica entre upsell, downsell, recorrência, televendas e VIP.

### Analytics Upsells
- Validar classificacao de oferta e agregacao por produto e dia.
- Confirmar taxa de conversao coerente com dado bruto.
- Confirmar atribuição do win ao produto-base da venda principal.
- Confirmar que `US1/US2` não são reconstruídos de forma enganosa.

### Analytics Canais
- Validar canais PayT, sources RedTrack, consolidacao por produto e campanha.
- Confirmar reducao de OUTROS e normalizacao de source/campaign.
- Confirmar que a UI não promete join PayT x RedTrack quando ele não existe.
- Confirmar que imports históricos não empurram tudo para `OUTROS`.

## Findings críticos da Auditoria 2

### Financeiro / Dashboard / Pedidos
- `event_at` de refund/chargeback ainda pode usar `transaction.paid_at`, deslocando reversões para o dia errado.
- `Financeiro` ainda pode tratar pedidos hoje estornados como “pagos” se a consulta usar só `data_pagamento`.
- `Pedidos` mistura `data_pagamento`, `created_at` e `event_at` na mesma experiência.
- Há risco de timezone UTC implícito em filtros de “hoje”.

### Carrinhos / Webhooks
- Evento com só `cart_id` pode se perder no `payt_event_stream`.
- O mesmo checkout pode aparecer duas vezes quando nasce sem `transaction_id` e depois ganha uma transação.
- A aba carrinhos lê `raw`, não o stream normalizado.
- A fila pode reter pós-venda como se fosse checkout ativo.

### Analytics / RedTrack / Upsells
- O grain por `rt_source` se perde no sync atual do RedTrack.
- ROAS e receita comparada mudam de definição entre overview e canais.
- `upsell` hoje inclui `downsell`, `televendas`, `recorrencia` e `grupo_vip`.
- `offer_kind` depende demais do nome do produto.
- Imports sem raw associado derrubam UTM/source e inflam `OUTROS`.

### Estoque / Configurações / Rotas
- Mutação de estoque não é atômica com o extrato.
- `paid` tardio após estorno pode reabrir pedido sem consumir estoque de novo.
- H7 altera operação sem reconciliar estoque.
- Existem duas implementações divergentes de webhook PayT.
- Configurações ainda não é uma tela de health/config real.

## Evidencias minimas por aba

- Arquivos de pagina e componentes
- Funcao backend principal
- Tabelas e views consultadas
- Webhook ou sync relacionado
- Exemplo de output em producao
- Achados
- Correcao aplicada
- Validacao apos correcao
