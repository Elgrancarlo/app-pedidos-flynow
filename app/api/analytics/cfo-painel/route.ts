import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

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
const REFUND_STATUSES = new Set(["refunded", "refund_requested"]);

type MetaRow = Record<string, unknown>;

interface CfoInputRow {
  semana: number;
  semana_inicio: string;
  semana_fim: string;
  cmv_pct: number | null;
  eficiencia_pct: number | null;
  lucro_liquido: number | null;
  ebitda_pct: number | null;
  override_receita: number | null;
  override_investimento: number | null;
  override_roas: number | null;
  override_roi: number | null;
  override_cpa: number | null;
  notas: string | null;
}

interface RedtrackRow {
  day: string;
  cost: number | null;
  total_revenue: number | null;
  clicks: number | null;
  conversions: number | null;
}

interface PaytSaleRow {
  day: string;
  valor_total: number | null;
  canal: string | null;
  offer_kind: string | null;
  chargeback: boolean | null;
  status_pagamento: string | null;
  payt_transaction_id: string | null;
}

function normalizeMonth(value: string | null) {
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

function statusSemaforo(pctAtingido: number | null) {
  if (pctAtingido == null) return "-";
  if (pctAtingido >= 95) return "NO_RITMO";
  if (pctAtingido >= 80) return "ATENCAO";
  return "CRITICO";
}

function statusSemaforoInverso(pctAtingido: number | null) {
  if (pctAtingido == null) return "-";
  if (pctAtingido >= 95) return "CRITICO";
  if (pctAtingido >= 80) return "ATENCAO";
  return "NO_RITMO";
}

function dayInRange(day: string, inicio: string, fim: string) {
  return day >= inicio && day <= fim;
}

function metric({
  previsto,
  realizado,
  inverse = false,
  active = true,
}: {
  previsto: number | null;
  realizado: number | null;
  inverse?: boolean;
  active?: boolean;
}) {
  const pct = pctOf(realizado, previsto);
  return {
    previsto,
    realizado,
    pct,
    status: active ? (inverse ? statusSemaforoInverso(pct) : statusSemaforo(pct)) : "-",
  };
}

function sum<T>(rows: T[], getter: (row: T) => number | null | undefined) {
  return rows.reduce((total, row) => total + numberValue(getter(row)), 0);
}

export async function GET(req: NextRequest) {
  const mesParam = req.nextUrl.searchParams.get("mes");
  const mes = normalizeMonth(mesParam);

  if (!mes) {
    return NextResponse.json(
      { ok: false, erro: "Parametro mes obrigatorio. Exemplo: 2026-06" },
      { status: 400 },
    );
  }

  const analytics = createServiceClient().schema("analytics");

  const { data: metaRow, error: metaError } = await analytics
    .from("metas_mensais")
    .select("*")
    .eq("mes", mes)
    .single();

  if (metaError || !metaRow) {
    return NextResponse.json(
      { ok: false, erro: metaError?.message ?? `Meta nao encontrada para ${mesParam}` },
      { status: metaError ? 500 : 404 },
    );
  }

  const { data: inputRows, error: inputError } = await analytics
    .from("cfo_inputs_semanais")
    .select("*")
    .eq("mes", mes)
    .order("semana", { ascending: true });

  if (inputError) {
    return NextResponse.json({ ok: false, erro: inputError.message }, { status: 500 });
  }

  const inputs = (inputRows ?? []) as CfoInputRow[];
  const semanas = inputs.map((input) => ({
    semana: input.semana,
    inicio: input.semana_inicio,
    fim: input.semana_fim,
  }));

  if (semanas.length === 0) {
    return NextResponse.json(
      { ok: false, erro: `Semanas nao configuradas para ${mesParam}` },
      { status: 404 },
    );
  }

  const periodoInicio = semanas[0]?.inicio;
  const periodoFim = semanas[semanas.length - 1]?.fim;

  const redtrackRows: RedtrackRow[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await analytics
      .from("redtrack_daily_campaign")
      .select("day, cost, total_revenue, clicks, conversions")
      .gte("day", periodoInicio)
      .lte("day", periodoFim)
      .range(from, from + PAGE_SIZE - 1);

    if (error) {
      return NextResponse.json({ ok: false, erro: error.message }, { status: 500 });
    }
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

    if (error) {
      return NextResponse.json({ ok: false, erro: error.message }, { status: 500 });
    }
    if (!data || data.length === 0) break;
    paytRows.push(...(data as PaytSaleRow[]));
    if (data.length < PAGE_SIZE) break;
  }

  const meta = metaRow as MetaRow;
  const qtdSemanas = semanas.length;
  const metaClientes = numberValue(meta.meta_clientes);
  const metaInvestTotal = numberValue(meta.invest_total);
  const metaPorSemana = {
    receita: numberValue(meta.meta_receita_liquida) / qtdSemanas,
    clientes: Math.round(metaClientes / qtdSemanas),
    ticketMedio: numberValue(meta.meta_ticket_medio),
    pctFront: numberValue(meta.meta_pct_front, 75),
    pctBackend: numberValue(meta.meta_pct_backend, 15),
    pctRecuperada: numberValue(meta.meta_pct_recuperada, 10),
    investimento: metaInvestTotal / qtdSemanas,
    roas: numberValue(meta.roas_exigido, 1.4),
    roi: 1.2,
    cpa: metaClientes > 0 ? metaInvestTotal / metaClientes : 200,
    pctChargeback: numberValue(meta.meta_pct_chargeback, 6),
    pctReembolso: numberValue(meta.meta_pct_reembolso, 2),
    pctCmv: numberValue(meta.meta_pct_cmv, 14),
    pctEficiencia: numberValue(meta.meta_pct_eficiencia, 4.5),
    lucroLiquido: numberValue(meta.meta_lucro_liquido) / qtdSemanas,
    ebitdaPct: numberValue(meta.meta_ebitda_pct, 9.4),
  };

  const semanasResult = semanas.map((semana) => {
    const input = inputs.find((item) => item.semana === semana.semana);
    const redtrackWeek = redtrackRows.filter((row) =>
      dayInRange(row.day, semana.inicio, semana.fim),
    );
    const paytWeek = paytRows.filter((row) => dayInRange(row.day, semana.inicio, semana.fim));
    const paytPaid = paytWeek.filter(
      (row) => row.status_pagamento === "paid" && row.chargeback !== true,
    );

    const investimento =
      input?.override_investimento ?? sum(redtrackWeek, (row) => row.cost);
    const receita = input?.override_receita ?? sum(paytPaid, (row) => row.valor_total);
    const clicksTotal = sum(redtrackWeek, (row) => row.clicks);
    const conversionsTotal = sum(redtrackWeek, (row) => row.conversions);
    const redtrackRevenue = sum(redtrackWeek, (row) => row.total_revenue);
    const uniqueClients = new Set(paytPaid.map((row) => row.payt_transaction_id).filter(Boolean));
    const clientes = uniqueClients.size;
    const ticketMedio = clientes > 0 ? receita / clientes : 0;

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

    const pctFrontReal = receita > 0 ? round1((receitaFront / receita) * 100) : 0;
    const pctBackendReal = receita > 0 ? round1((receitaBackend / receita) * 100) : 0;
    const pctRecuperadaReal = receita > 0 ? round1((receitaRecuperada / receita) * 100) : 0;
    const chargebacks = paytWeek.filter((row) => row.chargeback === true).length;
    const reembolsos = paytWeek.filter((row) =>
      REFUND_STATUSES.has(row.status_pagamento ?? ""),
    ).length;
    const totalPedidos = paytWeek.length;
    const pctChargebackReal = totalPedidos > 0 ? round1((chargebacks / totalPedidos) * 100) : 0;
    const pctReembolsoReal = totalPedidos > 0 ? round1((reembolsos / totalPedidos) * 100) : 0;
    const roasReal = input?.override_roas ?? (investimento > 0 ? round2(receita / investimento) : 0);
    const roiReal = input?.override_roi ?? (investimento > 0 ? round2(receita / investimento) : 0);
    const cpaReal = input?.override_cpa ?? (clientes > 0 ? round2(investimento / clientes) : 0);
    const temRealizado = receita > 0 || investimento > 0;

    return {
      semana: semana.semana,
      inicio: semana.inicio,
      fim: semana.fim,
      notas: input?.notas ?? null,
      dados_brutos: {
        clicks: clicksTotal,
        conversions: conversionsTotal,
        redtrack_revenue: redtrackRevenue,
        pedidos: totalPedidos,
        chargebacks,
        reembolsos,
      },
      indicadores: {
        receita: {
          receita_liquida: metric({
            previsto: metaPorSemana.receita,
            realizado: receita,
            active: temRealizado,
          }),
          pct_front: metric({
            previsto: metaPorSemana.pctFront,
            realizado: pctFrontReal,
            active: temRealizado,
          }),
          pct_backend: metric({
            previsto: metaPorSemana.pctBackend,
            realizado: pctBackendReal,
            active: temRealizado,
          }),
          pct_recuperada: metric({
            previsto: metaPorSemana.pctRecuperada,
            realizado: pctRecuperadaReal,
            active: temRealizado,
          }),
          clientes: metric({
            previsto: metaPorSemana.clientes,
            realizado: clientes,
            active: temRealizado,
          }),
          ticket_medio: metric({
            previsto: metaPorSemana.ticketMedio,
            realizado: Math.round(ticketMedio),
            active: temRealizado,
          }),
        },
        aquisicao: {
          investimento: metric({
            previsto: metaPorSemana.investimento,
            realizado: investimento,
            active: temRealizado,
          }),
          roas: metric({
            previsto: metaPorSemana.roas,
            realizado: roasReal,
            active: temRealizado,
          }),
          roi_consolidado: metric({
            previsto: metaPorSemana.roi,
            realizado: roiReal,
            active: temRealizado,
          }),
          cpa: metric({
            previsto: metaPorSemana.cpa,
            realizado: cpaReal,
            inverse: true,
            active: temRealizado,
          }),
        },
        perdas: {
          pct_chargeback: metric({
            previsto: metaPorSemana.pctChargeback,
            realizado: pctChargebackReal,
            inverse: true,
            active: temRealizado,
          }),
          pct_reembolso: metric({
            previsto: metaPorSemana.pctReembolso,
            realizado: pctReembolsoReal,
            inverse: true,
            active: temRealizado,
          }),
        },
        custos: {
          cmv: metric({
            previsto: metaPorSemana.pctCmv,
            realizado: input?.cmv_pct ?? null,
            inverse: true,
            active: input?.cmv_pct != null,
          }),
          eficiencia: metric({
            previsto: metaPorSemana.pctEficiencia,
            realizado: input?.eficiencia_pct ?? null,
            inverse: true,
            active: input?.eficiencia_pct != null,
          }),
        },
        resultado: {
          lucro_liquido: metric({
            previsto: metaPorSemana.lucroLiquido,
            realizado: input?.lucro_liquido ?? null,
            active: input?.lucro_liquido != null,
          }),
          ebitda_pct: metric({
            previsto: metaPorSemana.ebitdaPct,
            realizado: input?.ebitda_pct ?? null,
            active: input?.ebitda_pct != null,
          }),
        },
      },
    };
  });

  return NextResponse.json({
    ok: true,
    mes,
    meta: metaRow,
    semanas: semanasResult,
    legenda: {
      NO_RITMO: ">= 95% da meta semanal",
      ATENCAO: "Entre 80% e 95% da meta",
      CRITICO: "Abaixo de 80% da meta",
      "-": "Sem realizado preenchido",
    },
  });
}
