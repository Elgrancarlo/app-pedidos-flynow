import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

function textValue(value: unknown) {
  const text = String(value ?? "").trim();
  return text.length > 0 ? text : null;
}

export async function GET() {
  const analytics = createServiceClient().schema("analytics");
  const { data, error } = await analytics
    .from("funil_log_alteracoes")
    .select("*")
    .order("day", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, items: data ?? [] });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const day = textValue(body.day);
  const componente = textValue(body.componente);
  const produtoAfetado = textValue(body.produto_afetado);
  const descricao = textValue(body.descricao);
  const responsavel = textValue(body.responsavel);
  const tipoAlteracao = textValue(body.tipo_alteracao);
  const hipotese = textValue(body.hipotese);

  if (!day || !componente || !descricao) {
    return NextResponse.json(
      { ok: false, error: "day, componente e descricao são obrigatórios" },
      { status: 400 },
    );
  }

  const analytics = createServiceClient().schema("analytics");
  const { data, error } = await analytics
    .from("funil_log_alteracoes")
    .insert({
      day,
      componente,
      produto_afetado: produtoAfetado,
      descricao,
      responsavel,
      tipo_alteracao: tipoAlteracao,
      hipotese,
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, item: data });
}
