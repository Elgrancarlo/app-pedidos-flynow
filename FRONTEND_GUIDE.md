# Dashboard FLYNOW — Guia para o Dev Frontend

Olá! Este documento explica tudo que você precisa saber para desenvolver o frontend do dashboard. O backend (integrações, API, banco de dados) está sendo desenvolvido em paralelo.

---

## O que estamos construindo

Um dashboard de performance com os seguintes indicadores:

- **Faturamento total**
- **Investimento em anúncios**
- **ROAS** (retorno sobre investimento em anúncios)
- **Conversão por produto:** frontend, upsell e downsell
- **Conversão por canal de recuperação:** IA, Email, Call Center e SMS

---

## Stack

| Tecnologia | Uso |
|---|---|
| Next.js 15 (App Router) | Framework principal |
| TypeScript (strict) | Linguagem |
| Tailwind CSS 4.x | Estilo |
| Shadcn/ui | Componentes de UI |
| Recharts | Gráficos |
| Vercel | Deploy |

---

## Setup inicial

### 1. Clonar o repositório

```bash
git clone <url-do-repo>
cd app-mestre-flynow
npm install
```

### 2. Configurar variáveis de ambiente

Crie um arquivo `.env.local` na raiz com o seguinte conteúdo (os valores serão fornecidos pelo backend):

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

### 3. Instalar dependências de UI

```bash
npx shadcn@latest init
npx shadcn@latest add card button badge skeleton tabs
npm install recharts
npm install date-fns
```

### 4. Rodar localmente

```bash
npm run dev
```

---

## Como consumir a API

Existe um único endpoint que retorna todos os dados do dashboard:

```
GET /api/metrics?from=YYYY-MM-DD&to=YYYY-MM-DD
```

### Exemplo de resposta

```json
{
  "faturamento_total": 48320.00,
  "investimento_total": 12400.00,
  "roas": 3.9,
  "conversoes_produto": {
    "frontend":  { "quantidade": 320, "receita": 28800.00, "taxa": 0.032 },
    "upsell":    { "quantidade": 140, "receita": 12600.00, "taxa": 0.437 },
    "downsell":  { "quantidade": 60,  "receita": 6920.00,  "taxa": 0.187 }
  },
  "conversoes_canal": {
    "email":         { "quantidade": 45, "receita": 4050.00 },
    "sms":           { "quantidade": 30, "receita": 2700.00 },
    "call_center":   { "quantidade": 22, "receita": 3960.00 },
    "ia_recuperacao":{ "quantidade": 18, "receita": 1620.00 }
  },
  "serie_temporal": [
    { "data": "2026-05-01", "faturamento": 1600.00, "investimento": 420.00 },
    { "data": "2026-05-02", "faturamento": 2100.00, "investimento": 390.00 }
  ]
}
```

### Hook recomendado

Crie `hooks/useMetrics.ts`:

```typescript
import { useState, useEffect } from 'react'
import { format } from 'date-fns'

export function useMetrics(from: Date, to: Date) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/metrics?from=${format(from, 'yyyy-MM-dd')}&to=${format(to, 'yyyy-MM-dd')}`)
      .then(r => r.json())
      .then(setData)
      .catch(setError)
      .finally(() => setLoading(false))
  }, [from, to])

  return { data, loading, error }
}
```

---

## Estrutura de pastas sugerida

```
app/
  dashboard/
    page.tsx              ← página principal
components/
  metrics/
    kpi-card.tsx          ← card de KPI (faturamento, investimento, ROAS)
    conversion-card.tsx   ← card de conversão (produto ou canal)
  charts/
    revenue-chart.tsx     ← gráfico faturamento vs investimento
  ui/                     ← componentes shadcn (gerados automaticamente)
hooks/
  useMetrics.ts           ← hook de dados
lib/
  utils.ts                ← helpers (formatação de moeda, etc.)
```

---

## Layout do dashboard

```
┌─────────────────────────────────────────────────┐
│  SIDEBAR   │         HEADER + DATE RANGE         │
│            │─────────────────────────────────────│
│  Dashboard │  [Faturamento] [Investimento] [ROAS] │
│  (ativo)   │─────────────────────────────────────│
│            │  Conversão por Produto               │
│            │  [Frontend] [Upsell] [Downsell]      │
│            │─────────────────────────────────────│
│            │  Conversão por Canal de Recuperação  │
│            │  [IA] [Email] [Call Center] [SMS]    │
│            │─────────────────────────────────────│
│            │  Gráfico: Faturamento vs Investimento│
└─────────────────────────────────────────────────┘
```

---

## Componentes a desenvolver

### 1. `KpiCard`

Exibe um número principal com label e variação opcional.

```typescript
// Uso
<KpiCard
  label="Faturamento Total"
  value={48320}
  format="currency"   // "currency" | "number" | "percent"
  trend={+12.4}       // opcional: % de variação vs período anterior
/>
```

### 2. `ConversionCard`

Para métricas de conversão (produto ou canal).

```typescript
// Uso
<ConversionCard
  label="Upsell"
  quantidade={140}
  receita={12600}
  taxa={0.437}      // opcional: só para produtos
/>
```

### 3. `RevenueChart`

Gráfico de linha com duas séries: faturamento e investimento.

```typescript
// Uso
<RevenueChart data={serie_temporal} />
// serie_temporal: Array<{ data: string, faturamento: number, investimento: number }>
```

### 4. `DateRangePicker`

Seletor de período no header. Usar o componente do shadcn/ui com `date-fns`.

Períodos rápidos a implementar:
- Hoje
- Últimos 7 dias
- Últimos 30 dias
- Este mês
- Mês anterior
- Personalizado

---

## Dados mockados para desenvolvimento

Enquanto a API não estiver pronta, use este mock em `lib/mock-data.ts`:

```typescript
export const mockMetrics = {
  faturamento_total: 48320.00,
  investimento_total: 12400.00,
  roas: 3.9,
  conversoes_produto: {
    frontend:  { quantidade: 320, receita: 28800.00, taxa: 0.032 },
    upsell:    { quantidade: 140, receita: 12600.00, taxa: 0.437 },
    downsell:  { quantidade: 60,  receita: 6920.00,  taxa: 0.187 },
  },
  conversoes_canal: {
    email:          { quantidade: 45, receita: 4050.00 },
    sms:            { quantidade: 30, receita: 2700.00 },
    call_center:    { quantidade: 22, receita: 3960.00 },
    ia_recuperacao: { quantidade: 18, receita: 1620.00 },
  },
  serie_temporal: Array.from({ length: 30 }, (_, i) => ({
    data: new Date(2026, 4, i + 1).toISOString().split('T')[0],
    faturamento: Math.random() * 2000 + 800,
    investimento: Math.random() * 600 + 200,
  })),
}
```

---

## Formatação de valores

Use estas funções em `lib/utils.ts`:

```typescript
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

export function formatPercent(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value)
}
```

---

## Entregáveis da Fase 1

- [ ] Layout base com sidebar e header funcionando
- [ ] Date range picker com períodos rápidos
- [ ] 3 KPI cards: faturamento, investimento, ROAS
- [ ] 3 cards de conversão por produto
- [ ] 4 cards de conversão por canal de recuperação
- [ ] Gráfico faturamento vs investimento (30 dias)
- [ ] Hook `useMetrics` conectado à API real
- [ ] Estados de loading (skeleton) e erro
- [ ] Responsivo para telas a partir de 1280px

---

## Dúvidas?

Fale com o Carlos para qualquer dúvida sobre dados, regras de negócio ou acesso ao ambiente.
