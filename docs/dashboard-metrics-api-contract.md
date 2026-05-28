# Dashboard Metrics API Contract

Contrato esperado para integrar o dashboard de performance da FlyNow.

## Endpoint Sugerido

`GET /api/dashboard/metrics`

## Query Params

| Param | Tipo | Obrigatório | Exemplo | Observação |
|---|---|---:|---|---|
| `from` | `YYYY-MM-DD` | Sim | `2026-05-01` | Início do período na timezone da operação. |
| `to` | `YYYY-MM-DD` | Sim | `2026-05-28` | Fim do período na timezone da operação. |
| `offerId` | `string` | Não | `gelatina-slim` | Quando omitido, retorna consolidado de todas as ofertas. |

## Response 200

```ts
type OfferStageKey = "frontend" | "upsell" | "downsell";

type RecoveryChannelKey =
  | "email"
  | "sms"
  | "call_center"
  | "ia_recuperacao";

type Offer = {
  id: string;
  nome: string;
};

type StageConversion = {
  quantidade: number;
  receita: number;
  taxa: number | null;
};

type ChannelConversion = {
  quantidade: number;
  receita: number;
  taxa?: number | null;
};

type TimeSeriesMetric = {
  data: string;
  faturamento: number;
  investimento: number;
};

type MetricsData = {
  faturamento_total: number;
  investimento_total: number;
  roas: number;
  ofertas: Offer[];
  conversoes_etapa: Record<OfferStageKey, StageConversion>;
  conversoes_etapa_por_oferta?: Record<
    string,
    Record<OfferStageKey, StageConversion>
  >;
  conversoes_canal: Record<RecoveryChannelKey, ChannelConversion>;
  conversoes_canal_por_oferta?: Record<
    string,
    Record<RecoveryChannelKey, ChannelConversion>
  >;
  serie_temporal: TimeSeriesMetric[];
};
```

## Estado Vazio

Uma resposta vazia deve retornar `200` com arrays/records válidos e valores zerados, não `404`.

Exemplo:

```json
{
  "faturamento_total": 0,
  "investimento_total": 0,
  "roas": 0,
  "ofertas": [],
  "conversoes_etapa": {
    "frontend": { "quantidade": 0, "receita": 0, "taxa": null },
    "upsell": { "quantidade": 0, "receita": 0, "taxa": null },
    "downsell": { "quantidade": 0, "receita": 0, "taxa": null }
  },
  "conversoes_canal": {
    "email": { "quantidade": 0, "receita": 0, "taxa": null },
    "sms": { "quantidade": 0, "receita": 0, "taxa": null },
    "call_center": { "quantidade": 0, "receita": 0, "taxa": null },
    "ia_recuperacao": { "quantidade": 0, "receita": 0, "taxa": null }
  },
  "serie_temporal": []
}
```

## Response De Erro

Erros devem retornar mensagem curta e estável.

```json
{
  "message": "Não foi possível carregar as métricas."
}
```

## Regras De UI

- Primeiro carregamento: renderizar skeleton.
- Troca de período/oferta com dados anteriores: manter dados visíveis e marcar `refreshing`.
- Erro sem dados anteriores: mostrar estado de erro com botão de tentar novamente.
- Erro com dados anteriores: manter os dados antigos e mostrar aviso discreto.
- Resposta vazia: mostrar estado vazio, separado de erro e loading.

## Mocks Locais

Enquanto não houver API, o dashboard aceita cenários pela query string:

| Query | Uso |
|---|---|
| `?mockMetrics=default` | Dados padrão. |
| `?mockMetrics=empty` | Período sem resultado. |
| `?mockMetrics=low` | Performance baixa. |
| `?mockMetrics=noChannels` | Canais de recuperação zerados. |
| `?mockMetrics=error` | Erro de carregamento. |
