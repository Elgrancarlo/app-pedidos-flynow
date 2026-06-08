import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const mes = req.nextUrl.searchParams.get("mes");
  const supabase = createServiceClient().schema("analytics");

  let query = supabase
    .from("cfo_inputs_semanais")
    .select("*")
    .order("mes", { ascending: false })
    .order("semana", { ascending: true });

  if (mes) query = query.eq("mes", mes);

  const { data, error } = await query;
  if (error) return NextResponse.json({ ok: false, erro: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, data });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { mes, semana, ...fields } = body;
  if (!mes || !semana) {
    return NextResponse.json({ ok: false, erro: "mes e semana obrigatórios" }, { status: 400 });
  }

  const supabase = createServiceClient().schema("analytics");
  const { data, error } = await supabase
    .from("cfo_inputs_semanais")
    .upsert({ mes, semana, ...fields }, { onConflict: "mes,semana" })
    .select()
    .single();

  if (error) return NextResponse.json({ ok: false, erro: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, data });
}
