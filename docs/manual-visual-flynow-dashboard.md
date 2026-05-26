# Manual Visual V1 - FlyNow System

Este documento define a direcao visual do sistema FlyNow. Ele deve guiar a evolucao do dashboard atual e das proximas telas de gestao da operacao.

O sistema nao deve parecer uma landing page, um template de admin ou um painel generico de e-commerce. A referencia principal e um produto operacional premium: rapido, preciso, discreto e muito bem acabado.

## 1. Referencias de Design

As referencias escolhidas sao Linear, Vercel, Apple e Vite. A FlyNow nao deve copiar a identidade visual de nenhuma delas. O objetivo e absorver os principios em comum e adapta-los ao contexto da empresa.

### Linear

O que aproveitar:

- densidade controlada;
- navegacao lateral funcional;
- UI orientada a fluxo de trabalho;
- textos curtos;
- baixa decoracao;
- sensacao de velocidade;
- informacao organizada em listas, paineis e detalhes.

Aplicacao na FlyNow:

- o dashboard deve funcionar como uma central de decisao;
- cada card deve ter uma funcao clara;
- filtros devem afetar a pagina inteira com pouco ruido visual;
- futuras telas de pedidos, carrinhos e financeiro devem priorizar listas e detalhe lateral, nao cards decorativos demais.

### Vercel

O que aproveitar:

- base monocromatica;
- bordas finas;
- componentes compactos;
- navegacao clara;
- hierarquia objetiva;
- UI tecnica, limpa e confiavel;
- foco em estados, status e atividade recente.

Aplicacao na FlyNow:

- preto, grafite e cinza devem construir a maior parte da interface;
- dourado deve ser uma camada de identidade, nao a cor de todo componente;
- tabelas, filtros, tabs e controles devem ter aparencia sobria;
- a navegacao deve ser previsivel e facil de escanear.

### Apple

O que aproveitar:

- clareza acima de decoracao;
- legibilidade;
- espacamento consistente;
- alinhamento rigoroso;
- controles perto do conteudo que alteram;
- interfaces que deixam o conteudo ser protagonista.

Aplicacao na FlyNow:

- metricas devem ser mais importantes que os containers;
- nenhum texto deve brigar com outro;
- os cards devem respirar o suficiente para leitura rapida;
- estados de erro, loading e vazio devem ser simples, humanos e acessiveis.

### Vite

O que aproveitar:

- sensacao de velocidade;
- produto tecnico com energia;
- pequenos acentos vibrantes;
- linguagem visual leve e modular;
- foco em performance e construcao.

Aplicacao na FlyNow:

- o foguete e o dourado podem trazer energia, mas em doses pequenas;
- graficos e indicadores devem parecer vivos sem virar neon;
- microinteracoes devem passar rapidez e fluidez;
- o sistema deve parecer moderno, mas nao chamativo.

## 2. Sintese: O Que Essas Referencias Tem Em Comum

As quatro referencias compartilham um principio central: **a interface some o suficiente para a informacao aparecer**.

Padroes em comum:

- menos ornamentacao, mais estrutura;
- layouts modulares;
- hierarquia tipografica forte;
- bordas e divisores sutis;
- cor usada com intencao;
- textos curtos;
- icones simples;
- feedback rapido;
- componentes repetiveis;
- foco em clareza, nao em exibicionismo visual.

Para a FlyNow, isso vira a seguinte direcao:

**Sistema operacional executivo, dark, preciso, com acento dourado e energia controlada.**

## 3. Principios da FlyNow

### 1. Clareza Antes De Estilo

Toda decisao visual precisa melhorar leitura, comparacao ou acao. Se um efeito nao ajuda o gestor a decidir melhor, ele deve sair.

### 2. Premium Sem Luxo Excessivo

O dourado deve sugerir confianca, valor e identidade. Nao deve criar aparencia de cassino, ostentacao ou dashboard financeiro fake.

### 3. Velocidade Percebida

A interface deve parecer rapida mesmo quando dados estao carregando. Skeletons, transicoes curtas e layout estavel sao obrigatorios.

### 4. Densidade Com Respiro

CEO e gestores precisam ver bastante informacao, mas sem sentir uma planilha. Usar grids compactos, labels curtos e bons alinhamentos.

### 5. Conteudo Como Protagonista

Cards, bordas e backgrounds sustentam a leitura. Eles nao devem competir com metricas, graficos e status.

## 4. Personalidade Visual

### Deve Parecer

- Preciso
- Executivo
- Tecnico
- Moderno
- Rapido
- Confiavel
- Sofisticado
- Operacional

### Nao Deve Parecer

- Gamer
- Neon
- Template de e-commerce
- Landing page promocional
- Painel bancario generico
- Sistema antigo de ERP
- Luxo exagerado
- Interface colorida demais

## 5. Tema Principal

O tema inicial deve continuar sendo dark mode.

O dark mode da FlyNow deve ser mais proximo de Linear/Vercel do que de um painel neon. A base e preta, mas as superficies precisam ter pequenas diferencas para criar profundidade.

### Regra De Profundidade

Usar camadas discretas:

1. Background principal: quase preto.
2. Sidebar/header: preto elevado.
3. Cards: grafite escuro.
4. Cards ou paineis ativos: grafite mais claro com borda sutil.
5. Destaques: dourado em borda, texto, icone ou linha de grafico.

Evitar grandes blocos dourados. O dourado deve aparecer como sinal de identidade e foco.

## 6. Paleta

### Base Escura

| Uso | Nome | HEX |
|---|---:|---|
| Background principal | Black | `#050505` |
| Background elevado | Ink | `#0A0A0B` |
| Sidebar/Header | Carbon | `#0E1013` |
| Card principal | Graphite | `#12151A` |
| Card hover | Graphite 2 | `#171B21` |
| Borda sutil | Line | `#242932` |
| Borda forte | Line strong | `#303640` |

### Texto

| Uso | Nome | HEX |
|---|---:|---|
| Texto principal | Snow | `#F5F2EA` |
| Texto secundario | Mist | `#B8B3A7` |
| Texto terciario | Smoke | `#7D7A73` |
| Texto desabilitado | Ash | `#55524C` |

### Marca

| Uso | Nome | HEX |
|---|---:|---|
| Dourado principal | FlyNow Gold | `#D6A84F` |
| Dourado claro | Gold highlight | `#F0C76A` |
| Dourado escuro | Gold pressed | `#9C7430` |
| Dourado tint | Gold tint | `#2A2112` |

### Semantica

| Estado | HEX | Uso |
|---|---:|---|
| Positivo | `#4ADE80` | crescimento, sucesso, ROAS bom |
| Negativo | `#F87171` | queda, erro, perda |
| Alerta | `#F59E0B` | atencao, dado incompleto |
| Informacao | `#60A5FA` | links, contexto tecnico, serie secundaria |

### Regras De Uso Da Cor

- Dourado e marca, navegacao ativa, foco e serie principal.
- Verde e apenas performance positiva.
- Vermelho e apenas risco, erro ou queda real.
- Azul e informacao tecnica ou serie secundaria.
- Cinzas carregam estrutura, bordas, labels e estados neutros.
- Nao usar gradientes decorativos como fundo de pagina.
- Nao criar uma UI dominada por dourado.

## 7. Tipografia

A tipografia deve ser neutra, precisa e legivel em telas densas.

### Recomendacao

- Fonte principal: `Geist Sans`, pela relacao direta com produtos tecnicos e ecossistema Vercel.
- Alternativa: `Inter`, caso Geist gere qualquer problema de build ou performance.
- Numeros: usar `font-variant-numeric: tabular-nums` em metricas, tabelas e graficos.

### Hierarquia

| Elemento | Peso | Tamanho |
|---|---:|---:|
| Titulo de pagina | 600 | 22-26px |
| Titulo de secao | 600 | 15-17px |
| Label de KPI | 500 | 11-12px |
| Valor principal | 650-700 | 28-40px |
| Valor secundario | 600 | 16-20px |
| Texto de apoio | 400 | 12-14px |
| Tabela/lista | 400-500 | 13-14px |

### Regras

- Evitar tracking exagerado.
- Usar uppercase apenas em labels pequenos.
- Nao usar fontes decorativas.
- Titulos devem ser informativos, nao promocionais.
- O numero principal deve ser facilmente reconhecido em 1 segundo.

## 8. Layout

### Estrutura Base

- Sidebar fixa a esquerda.
- Header superior compacto.
- Area principal em grid de 12 colunas.
- Filtros proximos ao contexto que alteram.
- Cards de KPI no topo.
- Graficos em blocos largos.
- Tabelas/listas para detalhes operacionais futuros.

### Densidade Recomendada

- Padding da pagina: 24px.
- Gap entre blocos: 20px ou 24px.
- Gap entre cards compactos: 12px ou 16px.
- Sidebar: 240px.
- Header: 72px maximo.
- Radius: 8px.
- Border: 1px.

### Regra Apple De Organizacao

Controles devem ficar perto do conteudo que modificam. Se o filtro altera todo o dashboard, ele fica no topo. Se altera apenas um grafico, fica dentro do card do grafico.

## 9. Componentes

### Sidebar

Inspiracao: Linear e Vercel.

Regras:

- fundo `#0E1013`;
- borda direita sutil;
- item ativo com fundo `#2A2112`, borda dourada sutil e texto `#F0C76A`;
- itens inativos em cinza claro;
- icones Lucide 16px;
- labels curtos;
- sem sombras pesadas;
- sem blocos coloridos grandes.

### Identidade No Topo

A FlyNow ainda nao possui logo definitiva. O foguete e o simbolo principal.

Uso:

- icone de foguete simples ao lado de `FlyNow`;
- dourado no icone ou no container;
- manter proporcao pequena;
- nao repetir foguete nos cards;
- nao usar foguete cartunesco.

### Header

O header deve responder:

- onde estou?
- qual periodo estou olhando?
- existe algo que exige acao?

Regras:

- titulo simples;
- descricao curta opcional;
- area de acoes discreta;
- sem hero, sem slogan, sem texto explicativo longo;
- altura compacta.

### KPI Card

Inspiracao: Vercel para estrutura, Apple para clareza, Linear para densidade.

Padrao:

- label pequeno;
- valor dominante;
- contexto em uma linha;
- icone discreto;
- borda fina;
- sem sombra forte;
- hover apenas quando clicavel;
- usar dourado no KPI principal, azul/verde apenas quando semanticamente correto.

### Conversion Card

Padrao:

- nome do produto/canal;
- quantidade;
- receita;
- taxa quando existir;
- barra horizontal sutil;
- percentual sempre acompanhado por label ou contexto.

Evitar:

- barras muito grossas;
- muitas cores por card;
- icones grandes;
- textos explicativos longos.

### Date Range Picker

Periodos:

- Hoje
- 7 dias
- 30 dias
- Este mes
- Mes anterior
- Personalizado

Padrao:

- controle compacto;
- estado ativo em dourado;
- controles com altura minima de 32px no desktop;
- alvo de toque adequado em mobile;
- loading apos troca de periodo.

### Tabelas E Listas Futuras

Inspiracao: Linear.

Regras:

- linhas compactas;
- hover sutil;
- status com badge pequeno;
- acoes por linha escondidas ate hover quando apropriado;
- detalhe lateral ou drawer para edicao;
- evitar modais grandes para tarefas frequentes;
- busca e filtros persistentes.

## 10. Graficos

O grafico principal da Fase 1 e Faturamento vs Investimento.

### Estilo

- grid sutil;
- eixos discretos;
- tooltips escuros;
- linhas com boa espessura;
- sem sombras/glow fortes;
- sem excesso de legenda;
- valores formatados em BRL.

### Series

- Faturamento: `#D6A84F`
- Investimento: `#60A5FA`
- Comparacao futura: `#7D7A73`

### Regras

- Sempre mostrar valores numericos importantes perto do grafico.
- Nao usar pizza para comparacoes precisas.
- Usar barras horizontais para rankings.
- Usar bullet chart ou barra de progresso quando houver meta.
- Nao depender apenas da cor para explicar bom/ruim.

## 11. Movimento E Interacao

O sistema deve parecer rapido, nao teatral.

### Transicoes

- Duracao: 120ms a 200ms.
- Propriedades: background, border, color, opacity, transform leve.
- Hover: discreto.
- Active: resposta imediata.
- Loading: skeleton estavel.

### Evitar

- bounce;
- hover com escala grande;
- glow piscando;
- animacoes de entrada em excesso;
- layout shift ao carregar dados.

## 12. Tom De Voz

O sistema deve falar como uma ferramenta executiva.

### Direcao

- direto;
- profissional;
- curto;
- sem humor em estados criticos;
- sem frases de marketing.

### Exemplos

- "Faturamento total"
- "Investimento em anuncios"
- "ROAS"
- "Conversao por produto"
- "Conversao por canal"
- "Sem dados para o periodo selecionado."
- "Nao foi possivel carregar as metricas."
- "Tente novamente em alguns instantes."

### Evitar

- "Resultado incrivel"
- "Performance turbinada"
- "Seu dashboard poderoso"
- "Uau"
- textos longos explicando o obvio.

## 13. Estados De Interface

### Loading

Usar skeletons com dimensoes estaveis. Nao deixar a pagina em branco.

### Erro

Erro deve explicar o problema e sugerir uma acao.

Exemplo:

"Nao foi possivel carregar as metricas. Verifique sua conexao ou tente novamente."

### Vazio

Estado vazio deve ser curto e util.

Exemplo:

"Sem dados para o periodo selecionado."

### Foco E Acessibilidade

- Contraste minimo de 4.5:1 para texto comum.
- Estados de foco visiveis.
- Nao comunicar status apenas por cor.
- Controles clicaveis com area adequada.
- Respeitar `prefers-reduced-motion`.
- Textos nao podem sobrepor conteudo.

## 14. Aplicacao Na FlyNow

### Dashboard Atual

Prioridades para aprimorar o visual:

1. Reduzir peso visual dos cards.
2. Tornar bordas e superficies mais sutis.
3. Diminuir uso de dourado em barras e icones repetidos.
4. Melhorar hierarquia entre KPIs e cards secundarios.
5. Dar mais presenca ao grafico principal.
6. Compactar sidebar e header sem perder legibilidade.
7. Adicionar estados de hover/focus mais refinados.

### Futuro Sistema De Gestao

As proximas telas devem seguir o mesmo principio:

- listas para operacao recorrente;
- paineis laterais para detalhe;
- filtros no topo;
- cards apenas para resumo;
- tabelas para dados extensos;
- dashboards para decisao, nao para cadastro.

## 15. Primeira Tela Recomendada

Ordem da primeira tela:

1. Header compacto com titulo e periodo.
2. Linha de KPIs: Faturamento, Investimento, ROAS.
3. Grafico principal maior: Faturamento vs Investimento.
4. Conversao por produto.
5. Conversao por canal.
6. Rodape discreto com status dos dados.

Observacao: o grafico principal deve subir visualmente em importancia. Ele e a narrativa do periodo.

## 16. Perguntas Pendentes

1. O dashboard deve exibir nome/foto do usuario no header?
2. Futuramente havera permissao por cargo?
3. O modo claro sera obrigatorio ou apenas opcional?

### Decisao Da Fase 1

O `FRONTEND_GUIDE.md` define a primeira versao com dados por periodo: Faturamento Total, Investimento em Anuncios, ROAS, Conversao por Produto, Conversao por Canal de Recuperacao e serie temporal de Faturamento vs Investimento. Portanto, a Fase 1 nao depende de metas oficiais.

Se metas ou comparacao com periodo anterior entrarem depois, elas devem ser adicionadas como camada complementar, sem mudar a hierarquia principal dos cards.

## 17. Checklist De Implementacao

- [ ] Aplicar tokens refinados no Tailwind/CSS
- [ ] Reduzir peso visual dos cards
- [ ] Reorganizar dashboard para dar mais destaque ao grafico principal
- [ ] Revisar uso do dourado para virar acento, nao preenchimento dominante
- [ ] Padronizar hover, active e focus
- [ ] Usar tabular numbers em metricas
- [ ] Melhorar estado mobile dos filtros
- [ ] Garantir contraste adequado
- [ ] Validar layout em 1280px, 1440px e mobile
- [ ] Verificar que textos nao quebram de forma estranha

## 18. Fontes De Referencia

- Linear: produto e dashboards como referencia de densidade, fluxo e insights.
- Vercel: dashboard, navegacao, monocromia tecnica e estrutura de produto.
- Apple Human Interface Guidelines: clareza, legibilidade, contraste, espacamento e organizacao.
- Vite: linguagem tecnica, leveza, modularidade e sensacao de velocidade.
