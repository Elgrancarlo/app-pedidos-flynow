# Contratos de Dados do Frontend

Este documento resume as regras escolhidas para exibir dados no novo frontend. A meta e mostrar numeros mais fieis para analise, mesmo quando isso nao bate exatamente com o sistema legado.

## Regras Gerais

| Regra | Decisao |
|---|---|
| Fonte padrao | O sistema roda em modo `real` por padrao. Mock so entra com `NEXT_PUBLIC_FLYNOW_DATA_MODE=mock` ou `FLYNOW_DATA_MODE=mock`. |
| Erros reais | Erros de dados reais nao devem virar zero silenciosamente. O erro deve subir para evitar leitura falsa. |
| Periodos | Presets usam janela inclusiva. Exemplo: `7 dias` = hoje + 6 dias anteriores. |
| Limites de tabela | Limite de linhas/eventos vale apenas para tabela inicial, nunca para KPI principal. |
| Legado vs novo | Preservamos o legado quando ele representa bem a operacao; divergimos quando havia limite, lentidao, duplicidade ou arredondamento ruim. |

## Regras por Pagina

| Pagina | Regra escolhida |
|---|---|
| Dashboard | Mantem a logica do legado: vendas do dia, estados operacionais atuais, carrinhos de 24h, alertas e tendencia de 30 dias. Vendas/receita do dia sao paginadas para nao cortar acima de 1.000 pedidos pagos. |
| Pedidos | Pedidos pagos entram por `data_pagamento`; pedidos pendentes entram por `created_at`. Isso evita esconder pedidos que ainda existem operacionalmente. |
| Carrinhos | KPIs e funil usam o periodo completo. A tabela inicial carrega os 1.000 carrinhos mais recentes por performance. |
| Financeiro | Receita usa todos os pedidos pagos do periodo, com paginacao completa. Chargebacks e reembolsos tambem sao paginados quando vêm de `payt_event_stream`. |
| Estoque | Usa estoque real de `estoque_grupos`, `estoque_movimentacao` e `pedidos`. A tela abre em `30D` por padrao; `Tudo` e uma escolha explicita. |
| Analytics | Usa agregacoes reais. Falha ou ausencia do schema `analytics` em modo real nao vira tela zerada. |
| Funil | Usa `analytics.fact_funil_diario` e `analytics.fact_funil_por_fonte`. Tabela limitada a 2.000 linhas; take rate usa media ponderada. |
| Upsells | Consolida produto/oferta para reduzir duplicidade visual e facilitar comparacao. |
| Canais | Prioriza agregacao por canal/source e produto para leitura mais coerente de receita, spend, clicks e ROAS. |
| Metas/CFO | KPIs usam a receita financeira total. A tabela GPD fecha a conta com Front + Back + `Outras receitas / nao classificadas`, evitando que receita real fique fora do total da operacao. CB e reembolso usam `payt_event_stream`, igual ao Financeiro, e as taxas sao ponderadas pelos pedidos pagos do periodo. |

## Decisao Final

O objetivo nao e copiar todos os numeros do legado quando o legado esta limitado. O objetivo e exibir dados coerentes, completos e rapidos o suficiente para apoiar tomada de decisao. Quando uma receita existe no financeiro mas ainda nao esta classificada operacionalmente, ela deve aparecer como conciliacao, nao sumir da conta.
