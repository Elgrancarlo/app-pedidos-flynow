import { createServiceClient } from "@/lib/supabase";

type StockMovementParams = {
  produtoGrupo: string;
  tipo: "entrada" | "venda";
  qtdPotes: number;
  referenciaPedidoId?: string | null;
  observacao?: string | null;
};

function isMissingRpc(error: unknown) {
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  return message.includes("registrar_movimentacao_estoque") || message.includes("function") || message.includes("rpc");
}

export async function applyStockMovement({
  produtoGrupo,
  tipo,
  qtdPotes,
  referenciaPedidoId = null,
  observacao = null,
}: StockMovementParams) {
  const supabase = createServiceClient();

  try {
    const { error } = await supabase.rpc("registrar_movimentacao_estoque", {
      p_grupo: produtoGrupo,
      p_tipo: tipo,
      p_qtd: qtdPotes,
      p_referencia_pedido_id: referenciaPedidoId,
      p_observacao: observacao,
    });

    if (error) throw error;
    return { ok: true as const, mode: "rpc" as const };
  } catch (error) {
    if (!isMissingRpc(error)) {
      throw error;
    }
  }

  await supabase
    .from("estoque_grupos")
    .upsert({ nome_grupo: produtoGrupo }, { onConflict: "nome_grupo", ignoreDuplicates: true });

  const rpcName = tipo === "entrada" ? "incrementar_estoque" : "decrementar_estoque";
  const { error: rpcError } = await supabase.rpc(rpcName, {
    p_grupo: produtoGrupo,
    p_qtd: qtdPotes,
  });

  if (rpcError) {
    throw rpcError;
  }

  const { error: movementError } = await supabase.from("estoque_movimentacao").insert({
    produto_grupo: produtoGrupo,
    tipo,
    qtd_potes: qtdPotes,
    referencia_pedido_id: referenciaPedidoId,
    observacao,
  });

  if (movementError) {
    const rollbackRpc = tipo === "entrada" ? "decrementar_estoque" : "incrementar_estoque";
    const { error: rollbackError } = await supabase.rpc(rollbackRpc, {
      p_grupo: produtoGrupo,
      p_qtd: qtdPotes,
    });

    if (rollbackError) {
      console.error("[estoque] Falha ao reverter saldo após erro de movimentação:", rollbackError.message);
    }

    throw movementError;
  }

  return { ok: true as const, mode: "fallback" as const };
}
