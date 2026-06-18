# FlyNow Order System

Sistema interno da FlyNow para operacao de pedidos, carrinhos, financeiro,
estoque, analytics, funil, upsells, canais e metas.

## Stack

- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS 4
- Supabase
- Recharts

## Ambiente

Crie um `.env.local` a partir do `.env.example` e preencha as chaves reais no
ambiente da VPS. O arquivo `.env.local` nao deve ser versionado.

```bash
cp .env.example .env.local
```

### Variaveis principais

- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `INTERNAL_API_SECRET`
- `PAYT_INTEGRATION_KEY`
- `H7_TOKEN`
- `H7_API_URL`
- `REDTRACK_API_KEY`
- `OPENROUTER_API_KEY`
- `WHATSAPP_PHONE_NUMBER_ID`
- `WHATSAPP_ACCESS_TOKEN`

Veja `.env.example` para a lista completa.

## Desenvolvimento

```bash
npm install
npm run dev
```

Por padrao, o sistema usa dados reais. Dados mockados so podem ser ativados em
ambiente local/desenvolvimento com:

```env
FLYNOW_DATA_MODE=mock
```

Em `NODE_ENV=production`, o modo mock e bloqueado automaticamente.

## Build e deploy

Antes de subir para a VPS:

```bash
npm run build
```

Para iniciar a build gerada:

```bash
npm run start
```

## Observacoes de producao

- Configure as keys reais diretamente no ambiente da VPS.
- Nao envie `.env.local` para o repositorio.
- `APP_TIMING_LOGS`, `PAGE_TIMING_LOGS` e flags similares devem ficar
  desativadas em producao, exceto em investigacoes pontuais.
- Rotas de debug usadas durante desenvolvimento nao fazem parte da branch de
  release.
