# Manual Visual V0 - FlyNow Dashboard

Este documento define a direcao visual inicial do dashboard FlyNow. Ele deve guiar a construcao da primeira versao do produto: um painel executivo de performance para CEO e gestores de uma operacao de marketing direct response.

O objetivo nao e criar um brandbook institucional completo. O foco e criar consistencia visual, clareza de leitura e padroes de interface para um sistema que comeca como dashboard e pode evoluir para gestao completa da operacao.

## 1. Principio do produto

O dashboard deve comunicar controle, performance e confianca. A interface precisa permitir que um CEO ou gestor entenda rapidamente:

- quanto entrou de faturamento;
- quanto foi investido em anuncios;
- qual e o ROAS;
- onde estao as melhores e piores conversoes;
- quais canais de recuperacao estao gerando receita;
- como a performance evoluiu no periodo.

O sentimento desejado e de sala de controle executiva: escura, precisa, sofisticada e orientada a decisao.

## 2. Direcao visual

### Personalidade

- Executiva
- Precisa
- Premium
- Direta
- Analitica
- Confiavel

### Evitar

- Visual de landing page promocional
- Excesso de brilho ou efeitos neon
- Gradientes decorativos sem funcao
- Cards grandes demais para pouco conteudo
- Interface infantil, gamificada ou colorida demais
- Paleta baseada apenas em dourado

## 3. Tema principal

O tema inicial deve ser dark mode.

O preto funciona como base de foco e sofisticacao. O dourado deve aparecer como cor de marca e enfase, mas nao deve competir com os indicadores de status do sistema.

O modo claro pode existir no futuro, mas nao deve ser prioridade na Fase 1. Quando existir, deve usar dourado com bastante sobriedade sobre fundos branco-quentes ou cinzas claros, nunca como amarelo saturado sobre branco puro.

## 4. Paleta sugerida

Como os HEX oficiais ainda nao foram definidos, esta paleta serve como ponto de partida.

### Base escura

| Uso | Cor | HEX |
|---|---:|---|
| Background principal | Preto profundo | `#050505` |
| Background secundario | Preto elevado | `#0B0D10` |
| Superficie principal | Grafite | `#111418` |
| Superficie elevada | Grafite claro | `#171B21` |
| Borda sutil | Cinza carbono | `#252B33` |
| Divisor | Cinza tecnico | `#303640` |

### Texto

| Uso | Cor | HEX |
|---|---:|---|
| Texto principal | Branco suave | `#F5F2EA` |
| Texto secundario | Cinza claro | `#B8B3A7` |
| Texto terciario | Cinza medio | `#7D7A73` |
| Texto desabilitado | Cinza baixo | `#55524C` |

### Marca e acentos

| Uso | Cor | HEX |
|---|---:|---|
| Dourado principal | Ouro FlyNow | `#D6A84F` |
| Dourado claro | Highlight | `#F0C76A` |
| Dourado escuro | Pressed/active | `#9C7430` |
| Fundo dourado sutil | Tint | `#2A2112` |

O dourado principal `#D6A84F` fica definido como a cor base inicial da FlyNow no sistema. Se no futuro surgir um material institucional com outro HEX oficial, atualizar os tokens mantendo a mesma logica de uso.

### Estados do sistema

| Estado | Cor | HEX | Uso |
|---|---:|---|---|
| Positivo | Verde performance | `#4ADE80` | crescimento, meta batida, ROAS bom |
| Negativo | Vermelho risco | `#F87171` | queda, erro, perda |
| Alerta | Ambar | `#F59E0B` | atencao, dado incompleto |
| Informacao | Azul tecnico | `#60A5FA` | informacao neutra, link, serie secundaria |

Regra importante: dourado e marca/enfase. Verde, vermelho, ambar e azul sao semanticos. Nao usar dourado para tudo que for positivo.

## 5. Tipografia

A tipografia deve ser limpa, moderna e legivel em dados.

### Recomendacao inicial

- Fonte principal: `Inter`
- Fonte alternativa: `Geist Sans`
- Numeros e metricas: usar tabular numbers quando disponivel

### Hierarquia

| Elemento | Peso | Tamanho sugerido |
|---|---:|---:|
| Titulo de pagina | 600 | 24-28px |
| Titulo de secao | 600 | 16-18px |
| Label de KPI | 500 | 12-13px |
| Valor principal | 650-700 | 28-40px |
| Texto de apoio | 400 | 12-14px |
| Tabela | 400-500 | 13-14px |

Evitar fontes decorativas ou com carater editorial. O produto precisa parecer uma ferramenta de decisao, nao uma campanha.

## 6. Layout

### Estrutura base

- Sidebar fixa a esquerda
- Header superior com titulo, periodo e filtros
- Area principal em grid responsivo
- Cards de KPI no topo
- Secoes de conversao no meio
- Grafico temporal em area ampla

### Densidade

O dashboard deve ser mais denso do que uma landing page e mais respirado do que uma planilha.

Para desktop, a prioridade e funcionar bem a partir de `1280px`. Em telas grandes, usar melhor distribuicao de grid em vez de apenas aumentar cards.

### Grid recomendado

- Desktop: 12 colunas
- Gap: 16px ou 20px
- Padding da pagina: 24px a 32px
- Sidebar: 240px a 280px
- Radius dos cards: 8px

## 7. Componentes

### Sidebar

A sidebar deve ser discreta e funcional.

- Fundo: `#0B0D10`
- Item ativo: fundo dourado sutil com texto dourado claro, ou fundo grafite com borda dourada lateral
- Icones: Lucide ou biblioteca equivalente
- Labels curtos e objetivos
- Evitar brilho forte no item ativo

### Header

O header deve responder a pergunta: "O que estou vendo e de qual periodo?"

Elementos esperados:

- nome da pagina;
- descricao curta opcional;
- seletor de periodo;
- filtros principais;
- status de atualizacao dos dados.

### KPI Card

Card usado para Faturamento Total, Investimento em Anuncios e ROAS.

Padrao:

- label pequeno no topo;
- valor principal com grande contraste;
- variacao opcional, apenas se a API passar comparacao;
- microtexto de contexto;
- icone discreto;
- cor semantica apenas quando houver tendencia.

O valor deve ser o protagonista. O card nao deve depender so de cor para comunicar bom ou ruim.

### Conversion Card

Usado para conversao por produto e por canal.

Padrao:

- nome do produto/canal;
- quantidade;
- receita;
- taxa quando aplicavel;
- comparacao simples, quando houver periodo anterior.

Para produto, mostrar `Frontend`, `Upsell` e `Downsell`.
Para recuperacao, mostrar `IA`, `Email`, `Call Center` e `SMS`.

Na Fase 1, conforme o `FRONTEND_GUIDE.md`, esses cards devem priorizar os dados retornados no periodo selecionado: quantidade, receita e taxa quando existir. Comparacoes contra meta ou periodo anterior ficam como evolucao futura, a menos que a API passe esses campos.

### Date Range Picker

Periodos rapidos:

- Hoje
- Ultimos 7 dias
- Ultimos 30 dias
- Este mes
- Mes anterior
- Personalizado

O periodo ativo deve ficar evidente. Alterar periodo deve gerar estado de loading claro.

### Tabelas futuras

Quando o produto evoluir para gestao, tabelas devem priorizar:

- colunas fixas de identificacao;
- ordenacao;
- busca;
- filtros;
- badges de status;
- acoes por linha;
- estados vazios claros.

## 8. Graficos

O grafico principal da Fase 1 e Faturamento vs Investimento.

### Grafico temporal

Recomendacao:

- linha ou area para faturamento;
- linha secundaria para investimento;
- eixo Y formatado em BRL;
- tooltip objetivo;
- legenda curta;
- grid sutil;
- sem excesso de cores.

### Cores de series

- Faturamento: dourado `#D6A84F`
- Investimento: azul tecnico `#60A5FA`
- Comparacao anterior: cinza `#7D7A73`

### Regras

- Nao usar grafico de pizza para dados que precisam de comparacao precisa.
- Usar barras horizontais para rankings futuros.
- Usar bullet chart ou barra de progresso quando houver meta clara.
- Sempre mostrar valores numericos proximos aos graficos mais importantes.

## 9. Tom de voz

O sistema deve falar de forma direta, profissional e objetiva.

### Exemplos

- "Faturamento total"
- "Investimento em anuncios"
- "ROAS"
- "Conversao por produto"
- "Conversao por canal de recuperacao"
- "Dados atualizados agora"
- "Nao foi possivel carregar os dados"
- "Tente novamente em alguns instantes"

### Evitar

- Frases longas
- Humor em mensagens criticas
- Linguagem de marketing dentro da ferramenta
- Termos vagos como "incrivel", "turbinado" ou "super resultado"

## 10. Estados de interface

### Loading

Usar skeletons nos cards e no grafico. Evitar tela em branco.

### Erro

Mensagens devem explicar o problema e dar uma acao possivel.

Exemplo:

"Nao foi possivel carregar as metricas. Verifique sua conexao ou tente novamente."

### Vazio

Estados vazios devem ser objetivos.

Exemplo:

"Sem dados para o periodo selecionado."

### Foco e acessibilidade

- Contraste minimo de 4.5:1 para textos comuns
- Estados de foco visiveis
- Nao depender apenas de cor para comunicar status
- Respeitar `prefers-reduced-motion`
- Hover e active states em todos os elementos clicaveis

## 11. Referencia visual enviada

A referencia visual enviada funciona bem em alguns pontos:

- dark mode sofisticado;
- cards com boa separacao visual;
- hierarquia clara de metricas;
- dashboard com sensacao de controle;
- uso de cor forte apenas em pontos de atencao.

Adaptacao para FlyNow:

- substituir o verde principal da referencia por dourado FlyNow;
- manter verde apenas para indicadores positivos;
- reduzir elementos decorativos;
- priorizar dados de marketing e receita;
- evitar que o dashboard pareca um template generico de e-commerce.

## 12. Simbolo visual

A FlyNow ainda nao possui logo definitiva. Para o sistema, o foguete deve ser tratado como o simbolo principal da identidade visual.

Uso recomendado:

- usar um icone de foguete no topo da sidebar junto do nome `FlyNow`;
- manter o foguete simples, em estilo linear ou preenchido discreto;
- usar dourado no icone quando ele estiver no topo da navegacao;
- evitar versoes caricatas, infantis ou muito ilustrativas;
- nao transformar o foguete em decoracao repetida dentro dos cards.

## 13. Primeira tela recomendada

Ordem sugerida para o dashboard inicial:

1. Header com titulo "Dashboard" e seletor de periodo.
2. KPIs principais: Faturamento Total, Investimento em Anuncios, ROAS.
3. Conversao por Produto: Frontend, Upsell, Downsell.
4. Conversao por Canal de Recuperacao: IA, Email, Call Center, SMS.
5. Grafico Faturamento vs Investimento.
6. Estado de atualizacao ou alerta de dados no rodape da area principal.

## 14. Perguntas pendentes

Estas decisoes ainda precisam ser fechadas:

1. O dashboard deve exibir nome/foto do usuario no header?
2. Futuramente havera permissao por cargo?
3. O modo claro sera obrigatorio ou apenas opcional?

### Decisao da Fase 1

O `FRONTEND_GUIDE.md` define a primeira versao com dados por periodo: Faturamento Total, Investimento em Anuncios, ROAS, Conversao por Produto, Conversao por Canal de Recuperacao e serie temporal de Faturamento vs Investimento. Portanto, a Fase 1 nao depende de metas oficiais.

Se metas ou comparacao com periodo anterior entrarem depois, elas devem ser adicionadas como camada complementar, sem mudar a hierarquia principal dos cards.

## 15. Checklist para implementacao

- [ ] Aplicar dark mode como tema principal
- [ ] Definir tokens de cor no Tailwind
- [ ] Criar padrao de `KpiCard`
- [ ] Criar padrao de `ConversionCard`
- [ ] Criar padrao de `RevenueChart`
- [ ] Criar `DateRangePicker`
- [ ] Criar skeletons de loading
- [ ] Criar estado de erro
- [ ] Garantir contraste adequado
- [ ] Validar responsivo a partir de 1280px
