import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

function normalizeMonth(value: string | null) {
  if (!value) return null;
  return value.length === 7 ? `${value}-01` : value;
}

export async function GET(req: NextRequest) {
  const mes = normalizeMonth(req.nextUrl.searchParams.get("mes"));
  const analytics = createServiceClient().schema("analytics");

  let query = analytics
    .from("cfo_inputs_semanais")
    .select("*")
    .order("mes", { ascending: false })
    .order("semana", { ascending: true });

  if (mes) query = query.eq("mes", mes);

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ ok: false, erro: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, data: data ?? [] });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const mes = normalizeMonth(String(body.mes ?? "").trim() || null);
  const semana = Number(body.semana);

  if (!mes || !Number.isFinite(semana)) {
    return NextResponse.json(
      { ok: false, erro: "mes e semana obrigatorios" },
      { status: 400 },
    );
  }

  const { mes: _ignoredMes, semana: _ignoredSemana, ...fields } = body;
  const analytics = createServiceClient().schema("analytics");
  const { data, error } = await analytics
    .from("cfo_inputs_semanais")
    .upsert({ mes, semana, ...fields }, { onConflict: "mes,semana" })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ ok: false, erro: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, data });
}
