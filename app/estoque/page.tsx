import { createServiceClient } from "@/lib/supabase";
import TabelaEstoque from "@/components/estoque/tabela-estoque";
import FormEntrada from "@/components/estoque/form-entrada";
import Shell from "@/components/layout/shell";
import type { EstoqueGrupo, EstoqueMovimentacao } from "@/lib/supabase";

export const dynamic = "force-dynamic";

async function getGrupos(): Promise<EstoqueGrupo[]> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("estoque_grupos")
    .select("id, nome_grupo, estoque_atual, created_at, updated_at")
    .order("nome_grupo");
  if (error) { console.error("Erro ao buscar estoque:", error); return []; }
  return data ?? [];
}

async function getMovimentacoesPeriodo(desde: string | null): Promise<EstoqueMovimentacao[]> {
  const supabase = createServiceClient();
  const PAGE = 1000;
  const result: EstoqueMovimentacao[] = [];
  for (let offset = 0; ; offset += PAGE) {
    let q = supabase
      .from("estoque_movimentacao")
      .select("id, produto_grupo, tipo, qtd_potes, referencia_pedido_id, observacao, created_at")
      .order("created_at", { ascending: false })
      .range(offset, offset + PAGE - 1);
    if (desde) q = q.gte("created_at", desde);
    const { data, error } = await q;
    if (error) { console.error("Erro movimentacoes:", error); break; }
    if (!data || data.length === 0) break;
    result.push(...(data as EstoqueMovimentacao[]));
    if (data.length < PAGE) break;
  }
  return result;
}

function periodoParaData(dias: number | null): string | null {
  if (!dias) return null;
  const d = new Date();
  d.setDate(d.getDate() - dias);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

export default async function EstoquePage({
  searchParams,
}: {
  searchParams: Promise<{ dias?: string }>;
}) {
  const params = await searchParams;
  const dias = params.dias ? parseInt(params.dias) : null;
  const desde = periodoParaData(dias);

  const [grupos, movimentacoes] = await Promise.all([
    getGrupos(),
    getMovimentacoesPeriodo(desde),
  ]);

  // Totais do período selecionado
  const totalVendidoPeriodo = movimentacoes
    .filter((m) => m.tipo === "venda")
    .reduce((acc, m) => acc + m.qtd_potes, 0);

  const totalEntradaPeriodo = movimentacoes
    .filter((m) => m.tipo === "entrada")
    .reduce((acc, m) => acc + m.qtd_potes, 0);

  // Totais por grupo no período
  const totaisPorGrupo: Record<string, { entradas: number; vendas: number }> = {};
  for (const m of movimentacoes) {
    if (!totaisPorGrupo[m.produto_grupo]) totaisPorGrupo[m.produto_grupo] = { entradas: 0, vendas: 0 };
    if (m.tipo === "entrada") totaisPorGrupo[m.produto_grupo].entradas += m.qtd_potes;
    else totaisPorGrupo[m.produto_grupo].vendas += m.qtd_potes;
  }

  const periodoLabel = dias ? `Últimos ${dias} dias` : "Todo o período";

  return (
    <Shell>
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Estoque</h1>
            <p className="text-sm text-gray-500 mt-0.5">Controle por grupo de produto</p>
          </div>

          {/* Filtro período */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-gray-500">Período:</span>
            {[
              { label: "7 dias", value: "7" },
              { label: "15 dias", value: "15" },
              { label: "30 dias", value: "30" },
              { label: "90 dias", value: "90" },
              { label: "Tudo", value: "" },
            ].map(({ label, value }) => {
              const ativo = (dias?.toString() ?? "") === value;
              return (
                <a
                  key={label}
                  href={value ? `/estoque?dias=${value}` : "/estoque"}
                  className={`text-xs px-3 py-1.5 rounded-md border transition-colors ${
                    ativo
                      ? "bg-indigo-600 text-white border-indigo-600"
                      : "bg-white text-gray-700 border-gray-300 hover:border-indigo-400"
                  }`}
                >
                  {label}
                </a>
              );
            })}
          </div>
        </div>

        {/* Cards período */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
            <div className="text-2xl font-bold text-blue-700">{totalEntradaPeriodo.toLocaleString("pt-BR")}</div>
            <div className="text-sm text-gray-500 mt-1">Potes entrada — {periodoLabel}</div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
            <div className="text-2xl font-bold text-orange-700">{totalVendidoPeriodo.toLocaleString("pt-BR")}</div>
            <div className="text-sm text-gray-500 mt-1">Potes vendidos — {periodoLabel}</div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Registrar Entrada de Estoque</h2>
          <FormEntrada grupos={grupos.map((g) => g.nome_grupo)} />
        </div>

        <TabelaEstoque
          grupos={grupos}
          movimentacoes={movimentacoes.slice(0, 200)}
          totaisPorGrupo={totaisPorGrupo}
          periodoLabel={periodoLabel}
        />
      </div>
    </Shell>
  );
}
