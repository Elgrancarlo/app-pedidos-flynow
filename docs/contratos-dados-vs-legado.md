# Contratos de Dados vs Sistema Legado

Nem toda diferenca entre o novo frontend e o legado e erro. Algumas diferencas foram mantidas para evitar dados incompletos, lentidao ou leituras menos coerentes.

## Resumo Direto

| Pagina | Diverge do legado? | Decisao atual |
|---|---:|---|
| Dashboard | Pouco | Preserva o contrato principal; filtra alertas vencidos no frontend; usa janelas inclusivas. |
| Pedidos | Nao no contrato principal | Mantem `data_pagamento` para pagos e `created_at` para pendentes. |
| Carrinhos | Sim | KPIs usam o periodo completo; tabela limita eventos para performance. |
| Financeiro | Sim | Pagina todos os pedidos pagos para evitar limite de 1.000 linhas. |
| Estoque | Sim | Usa estoque real; abre em 30D por padrao; `Tudo` fica explicito. |
| Analytics | Sim, pontual | Usa dados agregados reais e leitura ponderada quando melhora coerencia. |
| Funil | Sim, pontual | Mantem facts principais; limita tabela a 2.000 linhas; take rate ponderado. |
| Upsells | Sim, pontual | Consolida produto e canal para reduzir duplicidade e ruido. |
| Canais | Sim, pontual | Prioriza agregacao coerente por canal/source e produto. |
| Modo de dados | Sim | `real` e o padrao; mock so entra quando explicitamente configurado. |

## Dashboard

Mantem a logica do legado: vendas do dia, estados operacionais atuais, carrinhos de 24h, alertas e tendencia de 30 dias.

Ajustes aplicados:

- janelas numericas de analytics agora sao inclusivas. Exemplo: `7 dias` = hoje + 6 dias anteriores, nao 8 dias.
- alertas ativos sao revalidados no frontend: data prometida precisa estar vencida e o pedido nao pode estar entregue/devolvido.
- checkout de 24h usado nos KPIs nao aplica limite de tabela.
- vendas e receita do dia sao paginadas para nao cortar acima de 1.000 pedidos pagos.

## Pedidos

Contrato preservado. Pedidos pagos entram por `data_pagamento`; pedidos pendentes entram por `created_at`.

Motivo: pedido pendente ainda existe operacionalmente mesmo sem pagamento.

Ajustes de confiabilidade:

- presets usam janelas inclusivas. Exemplo: `7 dias` = hoje + 6 dias anteriores.
- no modo real, erro de paginação ou métrica financeira interrompe o carregamento em vez de exibir dado parcial.

## Carrinhos

Diverge de forma intencional. KPIs e funil consideram o periodo completo, mas a tabela carrega uma amostra limitada de eventos recentes.

Motivo: manter a tela rapida sem distorcer os numeros principais.

O limite de eventos vale apenas para a tabela inicial, nao para os KPIs.

## Financeiro

Diverge para corrigir distorcao do legado. O novo frontend pagina todos os pedidos pagos do periodo antes de calcular receita.

Motivo: evitar que o limite de 1.000 linhas reduza artificialmente a receita.

Chargebacks e reembolsos tambem sao paginados quando vêm de `payt_event_stream`. Erros na fonte financeira real nao sao convertidos em zero silenciosamente.

## Estoque

Usa dados reais de `estoque_grupos`, `estoque_movimentacao` e `pedidos`.

Divergencias mantidas:

- A tela abre em `30D` por padrao para evitar carregar todo o historico.
- `Tudo` continua disponivel, mas como escolha explicita.
- O foco saiu do extrato gigante de movimentacoes e foi para ofertas/produtos relacionados ao grupo.

Motivo: a leitura por produto fica mais util e a pagina inicial fica menos pesada.

## Analytics

Usa dados agregados reais de performance. Quando o legado tinha leitura menos estavel por arredondamento ou duplicidade, o novo frontend prioriza agregacao consolidada.

Motivo: melhorar leitura de receita, investimento, ROAS e produtos sem depender de linhas fragmentadas.

Padrao atual: janelas de 30 dias usam 30 dias inclusivos.

Em modo real, falha ou ausencia do schema `analytics` nao vira tela zerada. O erro sobe para evitar leitura falsa.

## Funil

Mantem as facts principais do legado:

- `analytics.fact_funil_diario`
- `analytics.fact_funil_por_fonte`
- alertas por regras sobre dados diarios

Divergencias mantidas:

- tabela limitada a 2.000 linhas.
- take rates por media ponderada, nao por soma de arredondamentos por linha.

Motivo: reduzir lentidao e pequenos erros de arredondamento.

## Upsells

Consolida leituras por produto/oferta para evitar duplicidade visual.

Motivo: facilitar comparacao entre produtos e reduzir poluicao da tela.

## Canais

Prioriza leitura por canal/source e produto com agregacao mais coerente.

Motivo: o legado mistura granularidades em algumas partes; a nova tela tenta deixar a tomada de decisao mais clara.

## Modo de Dados

O sistema agora assume `real` por padrao. Mock so e usado quando `NEXT_PUBLIC_FLYNOW_DATA_MODE=mock` ou `FLYNOW_DATA_MODE=mock`.

Motivo: evitar que falta de env ou valor invalido esconda erro real exibindo dados simulados.

## Decisao Geral

Preservar o legado quando ele ja representa bem a operacao. Divergir quando o legado sofre com limite de linhas, lentidao, duplicidade ou arredondamento ruim.

Meta: exibir dados mais fieis para analise, nao apenas copiar numeros quando o contrato antigo e limitado.
