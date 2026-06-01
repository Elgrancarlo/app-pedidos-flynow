import { NextRequest, NextResponse } from "next/server";
import { inferirGrupo } from "@/lib/produtos";
import { createServiceClient } from "@/lib/supabase";
import { isTrustedAppRequest } from "@/lib/request-origin";
import { applyStockMovement } from "@/lib/estoque";

function normalizarGrupo(value: unknown) {
  const text = String(value ?? "").trim();
  if (!text) return null;
  return inferirGrupo(text) ?? text;
}

export async function POST(req: NextRequest) {
  if (!isTrustedAppRequest(req)) {
    return NextResponse.json({ ok: false, erro: "forbidden" }, { status: 403 });
  }
  const body = await req.json();
  const grupoCanon = normalizarGrupo(body.produto_grupo);
  const saldoFinal = Number(body.saldo_final);
  const observacao = typeof body.observacao === "string" ? body.observacao.trim() : "";

  if (!grupoCanon || !Number.isFinite(saldoFinal)) {
    return NextResponse.json({ ok: false, erro: "produto_grupo e saldo_final são obrigatórios" }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { data: grupos, error: gruposError } = await supabase
    .from("estoque_grupos")
    .select("nome_grupo, estoque_atual");

  if (gruposError) {
    return NextResponse.json({ ok: false, erro: gruposError.message }, { status: 500 });
  }

  const saldoAtual = (grupos ?? []).reduce((sum, grupo) => {
    return normalizarGrupo(grupo.nome_grupo) === grupoCanon ? sum + Number(grupo.estoque_atual ?? 0) : sum;
  }, 0);

  const delta = saldoFinal - saldoAtual;
  if (delta === 0) {
    return NextResponse.json({ ok: true, ajustado: 0, saldo_atual: saldoAtual, saldo_final: saldoFinal });
  }

  try {
    await applyStockMovement({
      produtoGrupo: grupoCanon,
      tipo: delta > 0 ? "entrada" : "venda",
      qtdPotes: Math.abs(delta),
      observacao: observacao
        ? `Ajuste manual de saldo: ${observacao}`
        : "Ajuste manual de saldo",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao ajustar saldo";
    return NextResponse.json({ ok: false, erro: message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    ajustado: delta,
    saldo_atual: saldoAtual,
    saldo_final: saldoFinal,
  });
}
