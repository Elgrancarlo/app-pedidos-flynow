import { NextRequest, NextResponse } from "next/server";
import { CfoPanelError, getCfoPanelData } from "@/lib/cfo-panel";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const mesParam = req.nextUrl.searchParams.get("mes");
  if (!mesParam) {
    return NextResponse.json(
      { ok: false, erro: "Parametro mes obrigatorio. Exemplo: 2026-06" },
      { status: 400 },
    );
  }

  try {
    return NextResponse.json(await getCfoPanelData(mesParam));
  } catch (error) {
    if (error instanceof CfoPanelError) {
      return NextResponse.json(
        { ok: false, erro: error.message },
        { status: error.status },
      );
    }

    return NextResponse.json(
      { ok: false, erro: "Erro inesperado ao montar painel CFO" },
      { status: 500 },
    );
  }
}
