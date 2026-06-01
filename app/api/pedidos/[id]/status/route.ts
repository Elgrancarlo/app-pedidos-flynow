import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import type { StatusPedido } from "@/lib/supabase";
import { isTrustedAppRequest } from "@/lib/request-origin";

const STATUS_VALIDOS: StatusPedido[] = [
  "pago", "nota_fiscal", "separacao", "aguardando_postagem",
  "postado", "em_transporte", "aguardando_retirada", "entregue", "devolvido",
];

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isTrustedAppRequest(req)) {
    return NextResponse.json({ ok: false, erro: "forbidden" }, { status: 403 });
  }
  const { id } = await params;
  let body: { status?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, erro: "JSON inválido" }, { status: 400 });
  }

  const novoStatus = body.status as StatusPedido;
  if (!novoStatus || !STATUS_VALIDOS.includes(novoStatus)) {
    return NextResponse.json({ ok: false, erro: "Status inválido" }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { error } = await supabase
    .from("pedidos")
    .update({ status: novoStatus, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    console.error("[PATCH /api/pedidos/[id]/status]", error);
    return NextResponse.json({ ok: false, erro: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, status: novoStatus });
}
