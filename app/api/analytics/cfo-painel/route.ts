import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

interface SemanaRange {
  semana: number;
  inicio: string;
  fim: string;
}

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
  cost: number;
  revenue: number;
  total_revenue: number;
  clicks: number;
  conversions: number;
}

interface PaytSaleRow {
  day: string;
  valor_total: number;
  canal: string;
  offer_kind: string;
  chargeback: boolean;
  status_pagamento: string | null;
  payt_transaction_id: string;
}

function statusSemaforo(pctAtingido: number | null): string {
  if (pctAtingido == null) return "—";
  if (pctAtingido >= 95) return "NO_RITMO";
  if (pctAtingido >= 80) return "ATENCAO";
  return "CRITICO";
}

function statusSemaforoInverso(pctAtingido: number | null): string {
  if (pctAtingido == null) return "—";
  if (pctAtingido >= 95) return "CRITICO";
  if (pctAtingido >= 80) return "ATENCAO";
  return "NO_RITMO";
}

function pctOf(realizado: number, previsto: number): number | null {
  if (!previsto) return null;
  return Math.round((realizado / previsto) * 1000) / 10;
}

function dayInRange(day: string, inicio: string, fim: string): boolean {
  return day >= inicio && day <= fim;
}

export async function GET(req: NextRequest) {
  const mesParam = req.nextUrl.searchParams.get("mes");
  if (!mesParam) {
    return NextResponse.json({ ok: false, erro: "Parâmetro mes obrigatório (ex: 2026-06)" }, { status: 400 });
  }

  const mesDate = mesParam.length === 7 ? mesParam + "-01" : mesParam;
  const supabase = createServiceClient();
  const analytics = supabase.schema("analytics");

  // 1. Buscar meta do mês
  const { data: metaRow } = await analytics
    .from("metas_mensais")
    .select("*")
    .eq("mes", mesDate)
    .single();

  if (!metaRow) {
    return NextResponse.json({ ok: false, erro: "Meta não encontrada para " + mesParam }, { status: 404 });
  }

  // 2. Buscar inputs semanais
  const { data: inputRows } = await analytics
    .from("cfo_inputs_semanais")
    .select("*")
    .eq("mes", mesDate)
    .order("semana", { ascending: true });

  const inputs: CfoInputRow[] = (inputRows ?? []) as CfoInputRow[];

  // Determinar ranges de semanas
  const semanas: SemanaRange[] = inputs.map((i) => ({
    semana: i.semana,
    inicio: i.semana_inicio,
    fim: i.semana_fim,
  }));

  if (semanas.length === 0) {
    return NextResponse.json({ ok: false, erro: "Semanas não configuradas para " + mesParam }, { status: 404 });
  }

  const periodoInicio = semanas[0].inicio;
  const periodoFim = semanas[semanas.length - 1].fim;

  // 3. Buscar RedTrack (investimento, clicks, conversões)
  const { data: redtrackRows } = await analytics
    .from("redtrack_daily_campaign")
    .select("day, cost, revenue, total_revenue, clicks, conversions")
    .gte("day", periodoInicio)
    .lte("day", periodoFim);

  const rt: RedtrackRow[] = (redtrackRows ?? []) as RedtrackRow[];

  // 4. Buscar Payt Sales (receita, canais, chargebacks, reembolsos)
  const { data: paytRows } = await analytics
    .from("payt_sales")
    .select("day, valor_total, canal, offer_kind, chargeback, status_pagamento, payt_transaction_id")
    .gte("day", periodoInicio)
    .lte("day", periodoFim);

  const ps: PaytSaleRow[] = (paytRows ?? []) as PaytSaleRow[];

  // 5. Montar dados por semana
  const qtdSemanas = semanas.length;
  const metaPorSemana = {
    receita: (metaRow.meta_receita_liquida ?? 0) / qtdSemanas,
    clientes: Math.round((metaRow.meta_clientes ?? 0) / qtdSemanas),
    ticketMedio: metaRow.meta_ticket_medio ?? 0,
    pctFront: metaRow.meta_pct_front ?? 75,
    pctBackend: metaRow.meta_pct_backend ?? 15,
    pctRecuperada: metaRow.meta_pct_recuperada ?? 10,
    investimento: (metaRow.invest_total ?? 0) / qtdSemanas,
    roas: metaRow.roas_exigido ?? 1.4,
    roi: 1.2,
    cpa: metaRow.meta_clientes > 0 ? (metaRow.invest_total ?? 0) / metaRow.meta_clientes : 200,
    pctChargeback: metaRow.meta_pct_chargeback ?? 6,
    pctReembolso: metaRow.meta_pct_reembolso ?? 2,
    pctCmv: metaRow.meta_pct_cmv ?? 14,
    pctEficiencia: metaRow.meta_pct_eficiencia ?? 4.5,
    lucroLiquido: (metaRow.meta_lucro_liquido ?? 0) / qtdSemanas,
    ebitdaPct: metaRow.meta_ebitda_pct ?? 9.4,
  };

  const FRONT_CHANNELS = ["VSL_FRONT", "TABOOLA"];
  const BACKEND_CHANNELS = ["CALLCENTER", "IA_WHATSAPP", "SMS", "EMAIL_MAUTIC", "IA_VENDAS", "MDI"];
  const RECUPERACAO_CHANNELS = ["BACKEND_RECUPERACAO"];

  const semanasResult = semanas.map((sem) => {
    const input = inputs.find((i) => i.semana === sem.semana);

    // RedTrack aggregation for this week
    const rtWeek = rt.filter((r) => dayInRange(r.day, sem.inicio, sem.fim));
    const investimento = input?.override_investimento ?? rtWeek.reduce((s, r) => s + (r.cost ?? 0), 0);
    const clicksTotal = rtWeek.reduce((s, r) => s + (r.clicks ?? 0), 0);
    const conversionsTotal = rtWeek.reduce((s, r) => s + (r.conversions ?? 0), 0);
    const rtRevenue = rtWeek.reduce((s, r) => s + (r.total_revenue ?? 0), 0);

    // Payt aggregation for this week
    const psWeek = ps.filter((p) => dayInRange(p.day, sem.inicio, sem.fim));
    const psPaid = psWeek.filter((p) => p.status_pagamento === "paid" && !p.chargeback);
    const receita = input?.override_receita ?? psPaid.reduce((s, p) => s + (p.valor_total ?? 0), 0);

    const uniqueClients = new Set(psPaid.map((p) => p.payt_transaction_id)).size;
    const ticketMedio = uniqueClients > 0 ? receita / uniqueClients : 0;

    // Channel breakdown
    const receitaFront = psPaid.filter((p) => FRONT_CHANNELS.includes(p.canal)).reduce((s, p) => s + p.valor_total, 0);
    const receitaBackend = psPaid.filter((p) => BACKEND_CHANNELS.includes(p.canal) || p.offer_kind !== "principal").reduce((s, p) => s + p.valor_total, 0);
    const receitaRecuperada = psPaid.filter((p) => RECUPERACAO_CHANNELS.includes(p.canal)).reduce((s, p) => s + p.valor_total, 0);

    const pctFrontReal = receita > 0 ? Math.round((receitaFront / receita) * 100) : 0;
    const pctBackendReal = receita > 0 ? Math.round((receitaBackend / receita) * 100) : 0;
    const pctRecuperadaReal = receita > 0 ? Math.round((receitaRecuperada / receita) * 100) : 0;

    // Losses
    const chargebacks = psWeek.filter((p) => p.chargeback).length;
    const totalPedidos = psWeek.length;
    const pctChargebackReal = totalPedidos > 0 ? Math.round((chargebacks / totalPedidos) * 100) : 0;

    const reembolsos = psWeek.filter((p) => p.status_pagamento === "refunded").length;
    const pctReembolsoReal = totalPedidos > 0 ? Math.round((reembolsos / totalPedidos) * 100) : 0;

    // Performance
    const roasReal = input?.override_roas ?? (investimento > 0 ? Math.round((receita / investimento) * 100) / 100 : 0);
    const roiReal = input?.override_roi ?? (investimento > 0 ? Math.round((receita / investimento) * 100) / 100 : 0);
    const cpaReal = input?.override_cpa ?? (uniqueClients > 0 ? Math.round(investimento / uniqueClients) : 0);

    // Manual inputs
    const cmvPct = input?.cmv_pct ?? null;
    const eficienciaPct = input?.eficiencia_pct ?? null;
    const lucroLiquido = input?.lucro_liquido ?? null;
    const ebitdaPct = input?.ebitda_pct ?? null;

    const temRealizado = receita > 0 || investimento > 0;

    return {
      semana: sem.semana,
      inicio: sem.inicio,
      fim: sem.fim,
      notas: input?.notas ?? null,
      indicadores: {
        receita: {
          receita_liquida: {
            previsto: metaPorSemana.receita,
            realizado: receita,
            pct: pctOf(receita, metaPorSemana.receita),
            status: temRealizado ? statusSemaforo(pctOf(receita, metaPorSemana.receita)) : "—",
          },
          pct_front: {
            previsto: metaPorSemana.pctFront,
            realizado: pctFrontReal,
            pct: pctOf(pctFrontReal, metaPorSemana.pctFront),
            status: temRealizado ? statusSemaforo(pctOf(pctFrontReal, metaPorSemana.pctFront)) : "—",
          },
          pct_backend: {
            previsto: metaPorSemana.pctBackend,
            realizado: pctBackendReal,
            pct: pctOf(pctBackendReal, metaPorSemana.pctBackend),
            status: temRealizado ? statusSemaforo(pctOf(pctBackendReal, metaPorSemana.pctBackend)) : "—",
          },
          pct_recuperada: {
            previsto: metaPorSemana.pctRecuperada,
            realizado: pctRecuperadaReal,
            pct: pctOf(pctRecuperadaReal, metaPorSemana.pctRecuperada),
            status: temRealizado ? statusSemaforo(pctOf(pctRecuperadaReal, metaPorSemana.pctRecuperada)) : "—",
          },
          clientes: {
            previsto: metaPorSemana.clientes,
            realizado: uniqueClients,
            pct: pctOf(uniqueClients, metaPorSemana.clientes),
            status: temRealizado ? statusSemaforo(pctOf(uniqueClients, metaPorSemana.clientes)) : "—",
          },
          ticket_medio: {
            previsto: metaPorSemana.ticketMedio,
            realizado: Math.round(ticketMedio),
            pct: pctOf(ticketMedio, metaPorSemana.ticketMedio),
            status: temRealizado ? statusSemaforo(pctOf(ticketMedio, metaPorSemana.ticketMedio)) : "—",
          },
        },
        aquisicao: {
          investimento: {
            previsto: metaPorSemana.investimento,
            realizado: investimento,
            pct: pctOf(investimento, metaPorSemana.investimento),
            status: temRealizado ? statusSemaforo(pctOf(investimento, metaPorSemana.investimento)) : "—",
          },
          roas: {
            previsto: metaPorSemana.roas,
            realizado: roasReal,
            pct: metaPorSemana.roas > 0 ? pctOf(roasReal, metaPorSemana.roas) : null,
            status: temRealizado ? statusSemaforo(metaPorSemana.roas > 0 ? pctOf(roasReal, metaPorSemana.roas) : null) : "—",
          },
          roi_consolidado: {
            previsto: metaPorSemana.roi,
            realizado: roiReal,
            pct: pctOf(roiReal, metaPorSemana.roi),
            status: temRealizado ? statusSemaforo(pctOf(roiReal, metaPorSemana.roi)) : "—",
          },
          cpa: {
            previsto: metaPorSemana.cpa,
            realizado: cpaReal,
            pct: metaPorSemana.cpa > 0 ? pctOf(metaPorSemana.cpa, cpaReal) : null,
            status: temRealizado ? statusSemaforo(metaPorSemana.cpa > 0 ? pctOf(metaPorSemana.cpa, cpaReal) : null) : "—",
          },
        },
        perdas: {
          pct_chargeback: {
            previsto: metaPorSemana.pctChargeback,
            realizado: pctChargebackReal,
            pct: metaPorSemana.pctChargeback > 0 ? pctOf(metaPorSemana.pctChargeback, pctChargebackReal) : null,
            status: temRealizado ? statusSemaforoInverso(pctOf(pctChargebackReal, metaPorSemana.pctChargeback)) : "—",
          },
          pct_reembolso: {
            previsto: metaPorSemana.pctReembolso,
            realizado: pctReembolsoReal,
            pct: metaPorSemana.pctReembolso > 0 ? pctOf(metaPorSemana.pctReembolso, pctReembolsoReal) : null,
            status: temRealizado ? statusSemaforoInverso(pctOf(pctReembolsoReal, metaPorSemana.pctReembolso)) : "—",
          },
        },
        custos: {
          cmv: {
            previsto: metaPorSemana.pctCmv,
            realizado: cmvPct,
            pct: cmvPct != null ? pctOf(metaPorSemana.pctCmv, cmvPct) : null,
            status: cmvPct != null ? statusSemaforoInverso(pctOf(cmvPct, metaPorSemana.pctCmv)) : "—",
          },
          eficiencia: {
            previsto: metaPorSemana.pctEficiencia,
            realizado: eficienciaPct,
            pct: eficienciaPct != null ? pctOf(metaPorSemana.pctEficiencia, eficienciaPct) : null,
            status: eficienciaPct != null ? statusSemaforoInverso(pctOf(eficienciaPct, metaPorSemana.pctEficiencia)) : "—",
          },
        },
        resultado: {
          lucro_liquido: {
            previsto: metaPorSemana.lucroLiquido,
            realizado: lucroLiquido,
            pct: lucroLiquido != null ? pctOf(lucroLiquido, metaPorSemana.lucroLiquido) : null,
            status: lucroLiquido != null ? statusSemaforo(pctOf(lucroLiquido, metaPorSemana.lucroLiquido)) : "—",
          },
          ebitda_pct: {
            previsto: metaPorSemana.ebitdaPct,
            realizado: ebitdaPct,
            pct: ebitdaPct != null ? pctOf(ebitdaPct, metaPorSemana.ebitdaPct) : null,
            status: ebitdaPct != null ? statusSemaforo(pctOf(ebitdaPct, metaPorSemana.ebitdaPct)) : "—",
          },
        },
      },
    };
  });

  return NextResponse.json({
    ok: true,
    mes: mesParam,
    meta: metaRow,
    semanas: semanasResult,
    legenda: {
      NO_RITMO: ">= 95% da meta semanal",
      ATENCAO: "Entre 80% e 95% da meta",
      CRITICO: "Abaixo de 80% da meta",
      "—": "Sem realizado preenchido",
    },
  });
}
