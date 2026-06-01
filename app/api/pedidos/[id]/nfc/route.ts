import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { isTrustedAppRequest } from "@/lib/request-origin";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isTrustedAppRequest(req)) {
    return NextResponse.json({ ok: false, erro: "forbidden" }, { status: 403 });
  }
  const { id } = await params;
  let body: { nfc_numero?: string; nfc_valor?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, erro: "JSON inválido" }, { status: 400 });
  }

  if (!body.nfc_numero && body.nfc_valor == null) {
    return NextResponse.json({ ok: false, erro: "nfc_numero ou nfc_valor obrigatório" }, { status: 400 });
  }

  const supabase = createServiceClient();
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.nfc_numero) update.nfc_numero = body.nfc_numero.trim();
  if (body.nfc_valor != null) update.nfc_valor = body.nfc_valor;

  const { error } = await supabase
    .from("pedidos")
    .update(update)
    .eq("id", id);

  if (error) {
    console.error("[PATCH /api/pedidos/[id]/nfc]", error);
    return NextResponse.json({ ok: false, erro: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
