# Contratos de Dados vs Sistema Legado

Nem toda diferenca entre o novo frontend e o sistema legado e um erro. Algumas paginas preservam o contrato antigo, enquanto outras foram ajustadas para evitar dados incompletos, lentidao ou leituras menos coerentes.

## Resumo

| Pagina | Contrato atual | Diverge do legado? | Motivo |
|---|---|---|---|
| Dashboard | Preserva janelas diferentes por tipo de dado | Nao no contrato principal | O dashboard mistura dados do dia, estados atuais, ultimas 24h, alertas recentes e tendencia de 30 dias. |
| Pedidos | Preserva pedidos pagos por `data_pagamento` e pendentes por `created_at` | Nao no contrato principal | Evita esconder pedidos pendentes que ja existem operacionalmente. |
| Carrinhos | KPIs usam o periodo completo; tabela carrega eventos recentes | Sim | Evita tela pesada sem distorcer os numeros principais. |
| Financeiro | Pagina todos os pedidos pagos do periodo e calcula reversoes por evento financeiro | Sim | Corrige limite pratico de 1.000 linhas que podia reduzir a receita no legado. |
| Estoque | Saldo e potes seguem estoque real; ofertas usam pedidos pagos reais | Sim na tabela | Substitui o extrato gigante por uma leitura de ofertas do produto. |

## Dashboard

O contrato principal foi preservado. Ele continua usando janelas diferentes conforme o tipo de dado: vendas do dia, estados operacionais atuais, carrinhos das ultimas 24h, alertas recentes e tendencia de 30 dias.

A mudanca foi mais visual e de clareza. Forcar todos os cards ao mesmo periodo deixaria alguns dados menos uteis, porque "em transito", "atrasados", "carrinhos" e "tendencia" respondem perguntas diferentes.

## Pedidos

Tambem preserva o contrato principal do legado. Pedidos pagos entram pelo campo `data_pagamento`, enquanto pedidos pendentes entram por `created_at`.

Essa separacao evita esconder pedidos que ainda nao foram pagos, mas ja existem operacionalmente. Reembolsos e chargebacks seguem eventos financeiros do periodo, em vez de depender apenas do status atual do pedido.

## Carrinhos

Diverge do legado de forma intencional. Os KPIs e o funil usam todos os eventos do periodo, mas a tabela inicial carrega apenas eventos recentes para manter a tela rapida.

O legado podia ficar lento ou mostrar numeros parecidos em 7, 15 e 30 dias por causa de limites praticos de eventos. No novo contrato, o limite fica na tabela, nao nos KPIs.

## Financeiro

Diverge do legado para corrigir uma distorcao. O legado podia bater no limite de 1.000 linhas do Supabase em periodos grandes, fazendo a receita parecer menor.

O novo frontend pagina todos os pedidos pagos do periodo e calcula receita, chargebacks e reembolsos com base no periodo completo. Assim, a leitura financeira fica mais fiel ao volume real.

## Estoque

A parte operacional de estoque segue os dados reais:

- `estoque_grupos` para saldo atual.
- `estoque_movimentacao` para entradas, vendas de potes, ajustes e estornos.
- normalizacao de grupo via `inferirGrupo`.
- separacao de ajustes manuais e estornos automaticos para nao contaminar os movimentos operacionais.

A tabela diverge do legado porque deixou de exibir o extrato de movimentacoes como foco principal. No lugar disso, o produto expande para mostrar ofertas/produtos vendidos ligados ao grupo.

Essa camada nova usa dados reais da tabela `pedidos`: `produto_nome`, `produto_grupo`, `qtd_potes`, `valor_total` e `data_pagamento`. A ressalva e que ainda nao existe uma tabela propria de ofertas no backend, entao a classificacao depende da qualidade dos nomes dos produtos no banco.

## Decisao Recomendada

Manter os contratos novos onde eles corrigem problemas do legado, especialmente em Carrinhos, Financeiro e na leitura analitica de Estoque. Preservar o legado onde ele ja representa bem a operacao, como em Dashboard e Pedidos.

O ponto principal e que a meta nao e simplesmente "bater numero com o legado" quando o legado esta limitado. A meta e exibir dados mais coerentes para analise e tomada de decisao.

## Pontos a Alinhar

- Criar endpoints agregados para paginas com alto volume de dados.
- Documentar qual campo de data rege cada dominio.
- Confirmar se `chargeback = null` em pedidos antigos deve ser tratado como falso ou desconhecido.
- Criar uma estrutura oficial de ofertas, se a leitura por oferta se tornar parte fixa do produto.
