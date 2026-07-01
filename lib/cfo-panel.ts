import { createServiceClient } from "@/lib/supabase";
import { getUtcRangeForAppDates, toAppDateString } from "@/lib/app-dates";

const PAGE_SIZE = 1000;
const FRONT_CHANNELS = new Set(["VSL_FRONT", "TABOOLA"]);
const BACKEND_CHANNELS = new Set([
  "CALLCENTER",
  "IA_WHATSAPP",
  "SMS",
  "EMAIL_MAUTIC",
  "IA_VENDAS",
  "MDI",
]);
const RECOVERY_CHANNELS = new Set(["BACKEND_RECUPERACAO"]);
const POST_SALE_EVENT_STATUSES = ["refunded", "chargeback", "charged_back"];

type MetaRow = Record<string, unknown>;

type MetricStatus = "NO_RITMO" | "ATENCAO" | "CRITICO" | "-";

export type CfoMetric = {
  pct: number | null;
  previsto: number | null;
  realizado: number | null;
  status: MetricStatus;
};

export type CfoWeek = {
  dados_brutos: {
    chargebacks: number;
    clicks: number;
    conversions: number;
    pedidos: number;
    redtrack_revenue: number;
    reembolsos: number;
  };
  fim: string;
  indicadores: {
    aquisicao: {
      cpa: CfoMetric;
      investimento: CfoMetric;
      roas: CfoMetric;
      roi_consolidado: CfoMetric;
    };
    custos: {
      cmv: CfoMetric;
      eficiencia: CfoMetric;
    };
    perdas: {
      pct_chargeback: CfoMetric;
      pct_reembolso: CfoMetric;
    };
    receita: {
      clientes: CfoMetric;
      pct_backend: CfoMetric;
      pct_front: CfoMetric;
      pct_recuperada: CfoMetric;
      receita_liquida: CfoMetric;
      ticket_medio: CfoMetric;
    };
    resultado: {
      ebitda_pct: CfoMetric;
      lucro_liquido: CfoMetric;
    };
  };
  inicio: string;
  notas: string | null;
  semana: number;
};

export type CfoPanelData = {
  legenda: Record<MetricStatus, string>;
  mes: string;
  meta: MetaRow;
  ok: true;
  semanas: CfoWeek[];
};

export class CfoPanelError extends Error {
  status: number;

  constructor(message: string, status = 500) {
    super(message);
    this.name = "CfoPanelError";
    this.status = status;
  }
}

interface CfoInputRow {
  cmv_pct: number | null;
  ebitda_pct: number | null;
  eficiencia_pct: number | null;
  lucro_liquido: number | null;
  notas: string | null;
  override_cpa: number | null;
  override_investimento: number | null;
  override_receita: number | null;
  override_roas: number | null;
  override_roi: number | null;
  semana: number;
  semana_fim: string;
  semana_inicio: string;
}

interface RedtrackRow {
  clicks: number | null;
  conversions: number | null;
  cost: number | null;
  day: string;
  total_revenue: number | null;
}

interface PaytSaleRow {
  canal: string | null;
  chargeback: boolean | null;
  day: string;
  offer_kind: string | null;
  payt_transaction_id: string | null;
  status_pagamento: string | null;
  valor_total: number | null;
}

interface PaytPostSaleEventRow {
  event_at: string | null;
  event_status: string | null;
  transaction_id: string | null;
}

export function normalizeCfoMonth(value: string | null) {
  if (!value) return null;
  return value.length === 7 ? `${value}-01` : value;
}

function numberValue(value: unknown, fallback = 0) {
  const parsed = Number(value ?? fallback);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function round1(value: number) {
  return Math.round(value * 10) / 10;
}

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

function pctOf(realizado: number | null, previsto: number | null) {
  if (realizado == null || previsto == null || previsto === 0) return null;
  return round1((realizado / previsto) * 100);
}

function statusSemaforo(pctAtingido: number | null): MetricStatus {
  if (pctAtingido == null) return "-";
  if (pctAtingido >= 95) return "NO_RITMO";
  if (pctAtingido >= 80) return "ATENCAO";
  return "CRITICO";
}

function statusSemaforoInverso(pctAtingido: number | null): MetricStatus {
  if (pctAtingido == null) return "-";
  if (pctAtingido >= 95) return "CRITICO";
  if (pctAtingido >= 80) return "ATENCAO";
  return "NO_RITMO";
}

function dayInRange(day: string, inicio: string, fim: string) {
  return day >= inicio && day <= fim;
}

function metric({
  active = true,
  inverse = false,
  previsto,
  realizado,
}: {
  active?: boolean;
  inverse?: boolean;
  previsto: number | null;
  realizado: number | null;
}): CfoMetric {
  const pct = pctOf(realizado, previsto);
  return {
    pct,
    previsto,
    realizado,
    status: active ? (inverse ? statusSemaforoInverso(pct) : statusSemaforo(pct)) : "-",
  };
}

function sum<T>(rows: T[], getter: (row: T) => number | null | undefined) {
  return rows.reduce((total, row) => total + numberValue(getter(row)), 0);
}

function countPostSaleEventsForWeek(
  rows: PaytPostSaleEventRow[],
  inicio: string,
  fim: string,
) {
  const chargebacks = new Set<string>();
  const reembolsos = new Set<string>();

  for (const row of rows) {
    const transactionId = String(row.transaction_id ?? "").trim();
    const eventDay = toAppDateString(row.event_at);
    const eventStatus = row.event_status?.toLowerCase() ?? "";

    if (!transactionId || !eventDay || !dayInRange(eventDay, inicio, fim)) continue;

    if (eventStatus === "refunded") {
      reembolsos.add(transactionId);
      continue;
    }

    if (eventStatus === "chargeback" || eventStatus === "charged_back") {
      chargebacks.add(transactionId);
    }
  }

  return {
    chargebacks: chargebacks.size,
    reembolsos: reembolsos.size,
  };
}

export async function getCfoPanelData(mesParam: string): Promise<CfoPanelData> {
  const mes = normalizeCfoMonth(mesParam);

  if (!mes) {
    throw new CfoPanelError("Parametro mes obrigatorio. Exemplo: 2026-06", 400);
  }

  const serviceClient = createServiceClient();
  const analytics = serviceClient.schema("analytics");

  const { data: metaRow, error: metaError } = await analytics
    .from("metas_mensais")
    .select("*")
    .eq("mes", mes)
    .single();

  if (metaError || !metaRow) {
    throw new CfoPanelError(
      metaError?.message ?? `Meta nao encontrada para ${mesParam}`,
      metaError ? 500 : 404,
    );
  }

  const { data: inputRows, error: inputError } = await analytics
    .from("cfo_inputs_semanais")
    .select("*")
    .eq("mes", mes)
    .order("semana", { ascending: true });

  if (inputError) {
    throw new CfoPanelError(inputError.message);
  }

  const inputs = (inputRows ?? []) as CfoInputRow[];
  const semanas = inputs.map((input) => ({
    fim: input.semana_fim,
    inicio: input.semana_inicio,
    semana: input.semana,
  }));

  if (semanas.length === 0) {
    throw new CfoPanelError(`Semanas nao configuradas para ${mesParam}`, 404);
  }

  const periodoInicio = semanas[0].inicio;
  const periodoFim = semanas[semanas.length - 1].fim;
  const { startTs, endTs } = getUtcRangeForAppDates(periodoInicio, periodoFim);
  const redtrackRows: RedtrackRow[] = [];

  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await analytics
      .from("redtrack_daily_campaign")
      .select("day, cost, total_revenue, clicks, conversions")
      .gte("day", periodoInicio)
      .lte("day", periodoFim)
      .range(from, from + PAGE_SIZE - 1);

    if (error) throw new CfoPanelError(error.message);
    if (!data || data.length === 0) break;

    redtrackRows.push(...(data as RedtrackRow[]));
    if (data.length < PAGE_SIZE) break;
  }

  const paytRows: PaytSaleRow[] = [];

  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await analytics
      .from("payt_sales")
      .select("day, valor_total, canal, offer_kind, chargeback, status_pagamento, payt_transaction_id")
      .gte("day", periodoInicio)
      .lte("day", periodoFim)
      .range(from, from + PAGE_SIZE - 1);

    if (error) throw new CfoPanelError(error.message);
    if (!data || data.length === 0) break;

    paytRows.push(...(data as PaytSaleRow[]));
    if (data.length < PAGE_SIZE) break;
  }

  const postSaleEventRows: PaytPostSaleEventRow[] = [];

  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await serviceClient
      .from("payt_event_stream")
      .select("transaction_id, event_status, event_at")
      .gte("event_at", startTs)
      .lte("event_at", endTs)
      .in("event_status", POST_SALE_EVENT_STATUSES)
      .range(from, from + PAGE_SIZE - 1);

    if (error) throw new CfoPanelError(error.message);
    if (!data || data.length === 0) break;

    postSaleEventRows.push(...(data as PaytPostSaleEventRow[]));
    if (data.length < PAGE_SIZE) break;
  }

  const meta = metaRow as MetaRow;
  const qtdSemanas = semanas.length;
  const metaClientes = numberValue(meta.meta_clientes);
  const metaInvestTotal = numberValue(meta.invest_total);
  const metaPorSemana = {
    clientes: Math.round(metaClientes / qtdSemanas),
    cpa: metaClientes > 0 ? metaInvestTotal / metaClientes : 200,
    ebitdaPct: numberValue(meta.meta_ebitda_pct, 9.4),
    investimento: metaInvestTotal / qtdSemanas,
    lucroLiquido: numberValue(meta.meta_lucro_liquido) / qtdSemanas,
    pctBackend: numberValue(meta.meta_pct_backend, 15),
    pctChargeback: numberValue(meta.meta_pct_chargeback, 6),
    pctCmv: numberValue(meta.meta_pct_cmv, 14),
    pctEficiencia: numberValue(meta.meta_pct_eficiencia, 4.5),
    pctFront: numberValue(meta.meta_pct_front, 75),
    pctRecuperada: numberValue(meta.meta_pct_recuperada, 10),
    pctReembolso: numberValue(meta.meta_pct_reembolso, 2),
    receita: numberValue(meta.meta_receita_liquida) / qtdSemanas,
    roas: numberValue(meta.roas_exigido, 1.4),
    roi: 1.2,
    ticketMedio: numberValue(meta.meta_ticket_medio),
  };

  const semanasResult = semanas.map((semana): CfoWeek => {
    const input = inputs.find((item) => item.semana === semana.semana);
    const redtrackWeek = redtrackRows.filter((row) =>
      dayInRange(row.day, semana.inicio, semana.fim),
    );
    const paytWeek = paytRows.filter((row) => dayInRange(row.day, semana.inicio, semana.fim));
    // Ever-paid: todos os pedidos que foram pagos, incluindo reembolsados/chargebacks.
    const EVER_PAID = new Set(["paid", "refunded", "chargeback", "charged_back"]);
    const paytEverPaid = paytWeek.filter(
      (row) => EVER_PAID.has(row.status_pagamento ?? ""),
    );
    // Pedidos atualmente pagos (sem reversão) — para mix de canais.
    const paytPaid = paytWeek.filter(
      (row) => row.status_pagamento === "paid" && row.chargeback !== true,
    );
    const postSaleEvents = countPostSaleEventsForWeek(
      postSaleEventRows,
      semana.inicio,
      semana.fim,
    );

    const investimento =
      input?.override_investimento ?? sum(redtrackWeek, (row) => row.cost);
    // Receita bruta = tudo que foi pago na PayT (purchase + upsell).
    const receitaBruta = sum(paytEverPaid, (row) => row.valor_total);
    // Valor das reversões por data da compra (pedidos reembolsados/chargebacks no período).
    const valorReversoes = sum(
      paytEverPaid.filter((row) =>
        row.status_pagamento === "refunded" ||
        row.status_pagamento === "chargeback" ||
        row.status_pagamento === "charged_back" ||
        row.chargeback === true,
      ),
      (row) => row.valor_total,
    );
    // Receita líquida = bruta - reversões.
    const receita = input?.override_receita ?? round2(receitaBruta - valorReversoes);
    const clicksTotal = sum(redtrackWeek, (row) => row.clicks);
    const conversionsTotal = sum(redtrackWeek, (row) => row.conversions);
    const redtrackRevenue = sum(redtrackWeek, (row) => row.total_revenue);
    const totalEverPaid = paytEverPaid.length;
    const clientes = new Set(paytEverPaid.map((row) => row.payt_transaction_id).filter(Boolean)).size;
    const ticketMedio = clientes > 0 ? receitaBruta / clientes : 0;
    const receitaFront = sum(
      paytPaid.filter((row) => FRONT_CHANNELS.has(row.canal ?? "")),
      (row) => row.valor_total,
    );
    const receitaBackend = sum(
      paytPaid.filter(
        (row) => BACKEND_CHANNELS.has(row.canal ?? "") || row.offer_kind !== "principal",
      ),
      (row) => row.valor_total,
    );
    const receitaRecuperada = sum(
      paytPaid.filter((row) => RECOVERY_CHANNELS.has(row.canal ?? "")),
      (row) => row.valor_total,
    );

    const pctFrontReal = receitaBruta > 0 ? round1((receitaFront / receitaBruta) * 100) : 0;
    const pctBackendReal = receitaBruta > 0 ? round1((receitaBackend / receitaBruta) * 100) : 0;
    const pctRecuperadaReal = receitaBruta > 0 ? round1((receitaRecuperada / receitaBruta) * 100) : 0;
    const chargebacks = postSaleEvents.chargebacks;
    const reembolsos = postSaleEvents.reembolsos;
    const totalPedidos = clientes || totalEverPaid;
    const pctChargebackReal = totalPedidos > 0 ? round1((chargebacks / totalPedidos) * 100) : 0;
    const pctReembolsoReal = totalPedidos > 0 ? round1((reembolsos / totalPedidos) * 100) : 0;
    // ROAS = receita líquida / investimento.
    const roasReal = input?.override_roas ?? (investimento > 0 ? round2(receita / investimento) : 0);
    const roiReal = input?.override_roi ?? (investimento > 0 ? round2(receita / investimento) : 0);
    const cpaReal = input?.override_cpa ?? (clientes > 0 ? round2(investimento / clientes) : 0);
    const temRealizado = receita > 0 || investimento > 0;

    return {
      dados_brutos: {
        chargebacks,
        clicks: clicksTotal,
        conversions: conversionsTotal,
        pedidos: totalPedidos,
        redtrack_revenue: redtrackRevenue,
        reembolsos,
      },
      fim: semana.fim,
      indicadores: {
        aquisicao: {
          cpa: metric({
            active: temRealizado,
            inverse: true,
            previsto: metaPorSemana.cpa,
            realizado: cpaReal,
          }),
          investimento: metric({
            active: temRealizado,
            previsto: metaPorSemana.investimento,
            realizado: investimento,
          }),
          roas: metric({
            active: temRealizado,
            previsto: metaPorSemana.roas,
            realizado: roasReal,
          }),
          roi_consolidado: metric({
            active: temRealizado,
            previsto: metaPorSemana.roi,
            realizado: roiReal,
          }),
        },
        custos: {
          cmv: metric({
            active: input?.cmv_pct != null,
            inverse: true,
            previsto: metaPorSemana.pctCmv,
            realizado: input?.cmv_pct ?? null,
          }),
          eficiencia: metric({
            active: input?.eficiencia_pct != null,
            inverse: true,
            previsto: metaPorSemana.pctEficiencia,
            realizado: input?.eficiencia_pct ?? null,
          }),
        },
        perdas: {
          pct_chargeback: metric({
            active: temRealizado,
            inverse: true,
            previsto: metaPorSemana.pctChargeback,
            realizado: pctChargebackReal,
          }),
          pct_reembolso: metric({
            active: temRealizado,
            inverse: true,
            previsto: metaPorSemana.pctReembolso,
            realizado: pctReembolsoReal,
          }),
        },
        receita: {
          clientes: metric({
            active: temRealizado,
            previsto: metaPorSemana.clientes,
            realizado: clientes,
          }),
          pct_backend: metric({
            active: temRealizado,
            previsto: metaPorSemana.pctBackend,
            realizado: pctBackendReal,
          }),
          pct_front: metric({
            active: temRealizado,
            previsto: metaPorSemana.pctFront,
            realizado: pctFrontReal,
          }),
          pct_recuperada: metric({
            active: temRealizado,
            previsto: metaPorSemana.pctRecuperada,
            realizado: pctRecuperadaReal,
          }),
          receita_liquida: metric({
            active: temRealizado,
            previsto: metaPorSemana.receita,
            realizado: receita,
          }),
          ticket_medio: metric({
            active: temRealizado,
            previsto: metaPorSemana.ticketMedio,
            realizado: Math.round(ticketMedio),
          }),
        },
        resultado: {
          ebitda_pct: metric({
            active: input?.ebitda_pct != null,
            previsto: metaPorSemana.ebitdaPct,
            realizado: input?.ebitda_pct ?? null,
          }),
          lucro_liquido: metric({
            active: input?.lucro_liquido != null,
            previsto: metaPorSemana.lucroLiquido,
            realizado: input?.lucro_liquido ?? null,
          }),
        },
      },
      inicio: semana.inicio,
      notas: input?.notas ?? null,
      semana: semana.semana,
    };
  });

  return {
    legenda: {
      "-": "Sem realizado preenchido",
      ATENCAO: "Entre 80% e 95% da meta",
      CRITICO: "Abaixo de 80% da meta",
      NO_RITMO: ">= 95% da meta semanal",
    },
    mes,
    meta: metaRow,
    ok: true,
    semanas: semanasResult,
  };
}
