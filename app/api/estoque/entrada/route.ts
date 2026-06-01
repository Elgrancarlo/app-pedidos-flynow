import { NextRequest, NextResponse } from "next/server";
import { inferirGrupo } from "@/lib/produtos";
import { isTrustedAppRequest } from "@/lib/request-origin";
import { applyStockMovement } from "@/lib/estoque";

export async function POST(req: NextRequest) {
  if (!isTrustedAppRequest(req)) {
    return NextResponse.json({ ok: false, erro: "forbidden" }, { status: 403 });
  }
  const body = await req.json();
  const { produto_grupo, qtd_potes, observacao } = body;
  const grupoCanon = inferirGrupo(produto_grupo) ?? String(produto_grupo ?? "").trim();

  if (!grupoCanon || !qtd_potes || qtd_potes <= 0) {
    return NextResponse.json({ ok: false, erro: "produto_grupo e qtd_potes são obrigatórios" }, { status: 400 });
  }
  try {
    await applyStockMovement({
      produtoGrupo: grupoCanon,
      tipo: "entrada",
      qtdPotes: qtd_potes,
      observacao: observacao ?? null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao registrar entrada de estoque";
    console.error("Erro ao registrar entrada de estoque:", error);
    return NextResponse.json({ ok: false, erro: message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
