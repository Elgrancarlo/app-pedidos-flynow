# Contratos de Dados vs Sistema Legado

Documento de apoio para explicar, em reuniao, quais contratos de dados do novo frontend seguem o legado e quais divergem por decisao tecnica ou analitica.

## Resumo Executivo

| Pagina | Diverge do legado? | Decisao atual | Motivo principal |
|---|---|---|---|
| Dashboard | Nao no contrato principal | Preserva as mesmas janelas operacionais do legado, mas com rotulos e layout mais claros | Dashboard precisa responder perguntas diferentes: hoje, agora, ultimas 24h, ultimos 7 dias e tendencia de 30 dias. |
| Pedidos | Nao no contrato principal | Preserva pedidos pagos por `data_pagamento` e pendentes por `created_at` | Evita sumir com pedidos ainda sem pagamento e preserva leitura operacional da fila. |
| Carrinhos | Sim | KPIs usam o periodo completo; tabela carrega apenas eventos recentes | Volume de eventos e muito alto; limitar a tabela melhora performance sem distorcer KPIs. |
| Financeiro | Sim | Pagina todos os pedidos pagos do periodo e usa eventos financeiros por data do evento | Corrige limite acidental de 1.000 linhas do legado em periodos grandes. |

## Principios Usados

- Nao reproduzir limites acidentais do legado quando eles distorcem a leitura do negocio.
- Usar a data mais adequada para cada pergunta: pagamento para receita, criacao para pendencias, evento para reversoes financeiras e atividade para carrinhos.
- Separar metricas completas de tabelas operacionais quando o volume de dados torna a tela lenta.
- Manter o frontend preparado para dados reais sem depender de mock, mas sem expor chaves ou mover regra sensivel para o cliente.

## Dashboard

### Contrato atual

O dashboard usa uma composicao de janelas:

- Vendas e receita do dia: pedidos pagos com `data_pagamento` no dia atual da operacao.
- Reembolsos e chargebacks do dia: eventos financeiros no dia atual.
- Em transito e atrasados: leitura operacional atual via RPCs.
- Checkouts e recuperacao: ultimas 24 horas do monitor de checkout PayT.
- Alertas do funil: janela analitica recente, hoje em 7 dias.
- Tendencia: serie de 30 dias.

### Aderencia ao legado

Nao ha divergencia intencional no contrato principal do dashboard. O novo frontend preserva a mesma logica do legado: cada bloco usa a janela que melhor representa aquela informacao. O que mudou foi a organizacao visual, a clareza dos rotulos e a forma de deixar explicito que nem todo card responde ao mesmo periodo.

### Motivo

O dashboard e uma tela de decisao rapida. Forcar todos os cards ao mesmo periodo deixaria algumas informacoes menos uteis:

- "Em transito" e "atrasados" sao estados atuais, nao historicos.
- Carrinhos fazem mais sentido em janela curta de recuperacao.
- Tendencia precisa de janela maior para mostrar comportamento.
- Receita do dia precisa continuar comparavel com a operacao diaria.

## Pedidos

### Contrato atual

A pagina de pedidos combina duas bases dentro do periodo selecionado:

- Pedidos com pagamento: filtrados por `data_pagamento`.
- Pedidos sem pagamento: filtrados por `created_at`.

As metricas financeiras de reversao usam eventos financeiros do periodo, vindos do fluxo PayT, em vez de inferir tudo apenas pelo status atual do pedido.

### Aderencia ao legado

Nao ha divergencia intencional no contrato principal da pagina de pedidos. O novo frontend preserva a mesma decisao do legado: buscar pedidos pagos por `data_pagamento` e pedidos pendentes por `created_at`.

A mudanca feita aqui foi principalmente de organizacao, normalizacao de dados e reducao de redundancia visual. A pagina nova tambem mantem paginacao de consulta para nao depender do limite padrao do Supabase.

### Motivo

Para a pagina de pedidos, o usuario precisa enxergar a fila operacional completa do recorte:

- Um pedido pago pertence ao periodo de pagamento.
- Um pedido pendente pertence ao periodo em que entrou no sistema.
- Chargebacks e reembolsos pertencem ao periodo do evento financeiro.

Essa separacao reduz ruido entre status operacional e reconhecimento financeiro.

## Carrinhos

### Contrato atual

A pagina de carrinhos usa eventos PayT do periodo selecionado. Os KPIs e o funil sao calculados com o periodo completo, enquanto a tabela inicial carrega apenas os eventos mais recentes.

Atualmente, a tabela inicial e limitada para preservar performance. Quando o limite e aplicado, a propria interface informa que a tabela esta limitada, mas que os KPIs consideram o periodo completo.

### Divergencia

Diverge do legado porque o legado tentava exibir mais eventos diretamente na pagina, o que ficava pesado em recortes maiores. O novo contrato separa:

- Analise: KPIs e funil com todos os eventos do periodo.
- Operacao: tabela inicial com amostra recente e navegavel.

Tambem existe fallback para `payt_webhooks_raw` quando `payt_event_stream` esta ausente ou desatualizado.

No legado, a consulta do monitor de checkout tinha limite pratico de ate 10.000 eventos. Em recortes maiores, isso podia fazer 7, 15, 30 dias e mes exibirem numeros muito parecidos ou incompletos. No novo contrato, os KPIs consideram o periodo completo; o limite fica apenas na tabela inicial.

### Motivo

Carrinhos geram muito mais eventos que pedidos. Em periodos grandes, carregar todos os eventos na tabela causa lentidao perceptivel e piora a experiencia sem necessariamente melhorar a tomada de decisao.

A decisao atual preserva a leitura correta dos numeros principais e deixa a tabela rapida para uso diario.

## Financeiro

### Contrato atual

A pagina financeira usa:

- Receita bruta: soma de pedidos pagos por `data_pagamento` dentro do periodo.
- Receita liquida: receita bruta menos chargebacks e reembolsos do periodo.
- Chargebacks e reembolsos: eventos financeiros por `event_at`, deduplicados por transacao.
- Default da pagina: mes atual ate hoje.

### Divergencia

Diverge do legado em periodos com mais de 1.000 pedidos pagos. O legado ficava sujeito ao limite padrao de 1.000 linhas da consulta, enquanto o novo frontend pagina os resultados e considera todos os pedidos do periodo.

Exemplo observado na comparacao:

| Periodo | Legado | Novo frontend | Motivo |
|---|---:|---:|---|
| 04/06/2026 | Bateu | Bateu | Volume abaixo do limite. |
| 01/06/2026 a 04/06/2026 | Menor | Maior | Legado retornava apenas parte dos pedidos pagos. |
| 06/05/2026 a 04/06/2026 | Muito menor | Maior | Legado atingia o limite de 1.000 linhas e distorcia a receita. |

### Motivo

Para financeiro, a leitura mais correta e considerar o periodo completo. Copiar o comportamento do legado faria a receita parecer menor em periodos maiores, prejudicando analise e tomada de decisao.

Existe uma nuance tecnica: historicamente alguns registros podem ter `chargeback` nulo. O legado filtrava `chargeback = false`, o que pode deixar esses registros fora. O novo contrato trata o pedido como receita quando o status de pagamento e `paid`; reversoes reais entram pela fonte financeira de eventos. Essa escolha evita que dados historicos incompletos removam receita indevidamente.

## Decisao Recomendada

Manter os contratos novos nas paginas em que eles corrigem distorcoes do legado e preservar os contratos do legado nas paginas em que eles ja representam bem a operacao.

O objetivo nao e bater numero com o legado quando o legado esta limitado ou mistura conceitos diferentes. O objetivo e exibir dados coerentes para decisao:

- Dashboard: contrato preservado, com visao executiva e janelas adequadas por tipo de metrica.
- Pedidos: contrato preservado, com fila operacional completa do periodo.
- Carrinhos: contrato ajustado para KPIs completos e tabela performatica.
- Financeiro: contrato ajustado para receita e reversoes calculadas sobre o periodo completo.

## Pontos Para Alinhar Com Backend

- Criar endpoints agregados para carrinhos, financeiro e pedidos, evitando que o frontend precise buscar muitos registros para calcular KPIs.
- Documentar oficialmente qual campo de data deve reger cada dominio.
- Confirmar se `chargeback = null` em pedidos antigos deve ser tratado como falso ou como estado desconhecido.
- Garantir que eventos financeiros tenham deduplicacao estavel por transacao no backend.
- Expor contadores agregados para tabelas, mantendo paginacao leve no frontend.
