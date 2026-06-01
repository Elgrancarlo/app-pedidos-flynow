import Link from "next/link";
import {
  Archive,
  Boxes,
  PackageMinus,
  PackagePlus,
  TriangleAlert,
} from "lucide-react";

import FormEntrada from "@/components/estoque/form-entrada";
import Shell from "@/components/layout/shell";
import { DashboardHeader } from "@/components/layout/dashboard-header";
import {
  DataList,
  PageBody,
  Panel,
  SimpleTable,
  StatCard,
  StatGrid,
  StatusPill,
} from "@/components/workspace/operational-ui";
import {
  getEstoquePageData,
  type EstoquePeriodoPreset,
  type EstoqueProdutoStatus,
} from "@/lib/estoque";

export const dynamic = "force-dynamic";

const PERIOD_OPTIONS: Array<{ label: string; value: EstoquePeriodoPreset }> = [
  { label: "7D", value: "7" },
  { label: "15D", value: "15" },
  { label: "30D", value: "30" },
  { label: "90D", value: "90" },
  { label: "Tudo", value: "all" },
];

const STATUS_LABELS: Record<EstoqueProdutoStatus, string> = {
  critico: "Critico",
  baixo: "Baixo",
  ok: "Saudavel",
  excesso: "Excesso",
};

const STATUS_TONES: Record<EstoqueProdutoStatus, "red" | "gold" | "green" | "blue"> = {
  critico: "red",
  baixo: "gold",
  ok: "green",
  excesso: "blue",
};

function formatNumber(value: number, maximumFractionDigits = 0) {
  return new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits,
  }).format(value);
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  });
}

function PeriodActions({ active }: { active: EstoquePeriodoPreset }) {
  return (
    <div className="contents lg:flex lg:w-auto lg:items-center lg:gap-1.5 lg:rounded-[14px] lg:border lg:border-[var(--fly-border)] lg:bg-[var(--fly-surface-elevated)] lg:p-1.5">
      <div className="flynow-period-presets relative col-span-2 row-start-2 -mx-4 flex max-w-[calc(100vw-1px)] gap-1 overflow-x-auto px-4 pb-1 pt-0.5 sm:-mx-5 sm:px-5 md:mx-0 md:grid md:w-full md:grid-cols-5 md:px-0 md:pb-0 lg:col-auto lg:row-auto lg:flex">
        {PERIOD_OPTIONS.map((option) => {
          const isActive = option.value === active;
          const href =
            option.value === "all" ? "/estoque?dias=all" : `/estoque?dias=${option.value}`;

          return (
            <Link
              key={option.value}
              href={href}
              aria-current={isActive ? "page" : undefined}
              className={[
                "inline-flex h-10 shrink-0 items-center justify-center rounded-xl px-3.5 text-xs font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--fly-brand-ring)] sm:h-8 sm:rounded-[10px] lg:min-w-10",
                isActive
                  ? "bg-[var(--fly-control-active)] text-[var(--fly-text)]"
                  : "text-[var(--fly-text-muted)] hover:bg-[var(--fly-control)] hover:text-[var(--fly-text-soft)]",
              ].join(" ")}
            >
              {option.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function MockEntryForm() {
  return (
    <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_120px_160px_auto]">
      {["Produto", "Qtd potes", "Observacao"].map((label, index) => (
        <label key={label} className="grid gap-1">
          <span className="text-xs font-medium text-[var(--fly-text-muted)]">
            {label}
          </span>
          <span className="flex h-10 items-center rounded-[8px] border border-[var(--fly-border)] bg-[var(--fly-control)] px-3 text-sm text-[var(--fly-text-dim)]">
            {index === 0
              ? "Power 66"
              : index === 1
                ? "240"
                : "Entrada visual em modo mock"}
          </span>
        </label>
      ))}
      <div className="flex items-end">
        <button
          type="button"
          disabled
          className="h-10 w-full rounded-[8px] border border-[var(--fly-border)] bg-[var(--fly-control)] px-3 text-xs font-semibold text-[var(--fly-text-muted)] opacity-70"
        >
          Registrar
        </button>
      </div>
    </div>
  );
}

export default async function EstoquePage({
  searchParams,
}: {
  searchParams: Promise<{ dias?: string }>;
}) {
  const params = await searchParams;
  const data = await getEstoquePageData(params.dias);
  const maxSaldo = Math.max(...data.grupos.map((item) => item.estoque_atual), 1);

  return (
    <Shell>
      <DashboardHeader
        title="Estoque"
        description="Saldo por produto, giro, cobertura e movimentações"
        actions={<PeriodActions active={data.periodo.preset} />}
      />

      <PageBody>
        <StatGrid>
          <StatCard
            label="Saldo atual"
            value={formatNumber(data.saldoAtualTotal)}
            detail={`${data.grupos.length.toLocaleString("pt-BR")} grupos monitorados`}
            Icon={Boxes}
            tone="gold"
          />
          <StatCard
            label="Entradas"
            value={formatNumber(data.totalEntradaPeriodo)}
            detail={data.periodo.label}
            Icon={PackagePlus}
            tone="blue"
          />
          <StatCard
            label="Vendas"
            value={formatNumber(data.totalVendidoPeriodo)}
            detail={data.produtoMaiorGiro ? `Maior giro: ${data.produtoMaiorGiro}` : "Sem giro no periodo"}
            Icon={PackageMinus}
            tone="green"
          />
          <StatCard
            label="Atenção"
            value={formatNumber(data.gruposCriticos + data.gruposBaixos)}
            detail={`${data.gruposCriticos} criticos · ${data.gruposBaixos} baixos`}
            Icon={TriangleAlert}
            tone={data.gruposCriticos > 0 ? "red" : "gold"}
          />
        </StatGrid>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(340px,0.65fr)]">
          <Panel
            title="Saldo por produto"
            description="Cobertura calculada pelo giro do período"
            action={
              <StatusPill tone={data.source === "real" ? "green" : "gold"}>
                {data.source === "real" ? "Dados reais" : "Mock ativo"}
              </StatusPill>
            }
          >
            <div className="space-y-2.5">
              {data.grupos.map((grupo) => (
                <div
                  key={grupo.id}
                  className="rounded-[8px] border border-white/[0.055] bg-white/[0.018] px-3 py-3"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex min-w-0 items-center gap-2">
                        <StatusPill tone={STATUS_TONES[grupo.statusOperacional]}>
                          {STATUS_LABELS[grupo.statusOperacional]}
                        </StatusPill>
                        <h2 className="truncate text-sm font-semibold text-[var(--fly-text)]">
                          {grupo.nome_grupo}
                        </h2>
                      </div>
                      <p className="mt-1.5 text-xs text-[var(--fly-text-muted)]">
                        {grupo.coberturaDias == null
                          ? "Sem venda no periodo"
                          : `${grupo.coberturaDias} dias de cobertura`}{" "}
                        · giro {formatNumber(grupo.giroPeriodo, 1)} potes/dia
                      </p>
                    </div>
                    <div className="grid grid-cols-3 gap-3 text-right sm:w-[300px]">
                      <div>
                        <p className="text-[10px] font-semibold uppercase text-[var(--fly-text-dim)]">
                          Entrada
                        </p>
                        <p className="mt-1 text-sm font-semibold tabular-nums text-[#93C5FD]">
                          +{formatNumber(grupo.entradasPeriodo)}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold uppercase text-[var(--fly-text-dim)]">
                          Venda
                        </p>
                        <p className="mt-1 text-sm font-semibold tabular-nums text-[#86EFAC]">
                          -{formatNumber(grupo.vendasPeriodo)}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold uppercase text-[var(--fly-text-dim)]">
                          Saldo
                        </p>
                        <p className="mt-1 text-sm font-semibold tabular-nums text-[var(--fly-text)]">
                          {formatNumber(grupo.estoque_atual)}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 h-1 overflow-hidden rounded-full bg-white/[0.07]">
                    <span
                      aria-hidden="true"
                      className="block h-full rounded-full bg-[#D6A84F]"
                      style={{
                        width: `${Math.max((grupo.estoque_atual / maxSaldo) * 100, 4)}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Panel>

          <Panel
            title="Registrar entrada"
            description={
              data.source === "real"
                ? "Atualiza estoque via API"
                : "Visual pronto para conectar no modo real"
            }
          >
            {data.source === "real" ? (
              <FormEntrada grupos={data.grupos.map((grupo) => grupo.nome_grupo)} />
            ) : (
              <MockEntryForm />
            )}
          </Panel>
        </div>

        <Panel
          title="Extrato de movimentações"
          description={`${data.periodo.label} · ultimos ${Math.min(data.movimentacoes.length, 120)} registros`}
          action={<Archive aria-hidden="true" className="size-4 text-[var(--fly-text-muted)]" />}
        >
          <SimpleTable
            columns={["Data", "Produto", "Tipo", "Observacao", "Potes"]}
            rows={data.movimentacoes.slice(0, 120).map((item) => [
              formatDate(item.created_at),
              item.produto_grupo,
              item.tipo === "entrada" ? "Entrada" : "Venda",
              item.observacao ?? "-",
              `${item.tipo === "entrada" ? "+" : "-"}${formatNumber(item.qtd_potes)}`,
            ])}
          />
        </Panel>

        <Panel
          title="Contrato da tela"
          description="A UI consome EstoquePageData no mock e no backend real"
        >
          <DataList
            valueLabel="status"
            rows={[
              {
                label: "Fonte atual",
                value: data.source === "real" ? "Real" : "Mock",
                detail: "Controlada por FLYNOW_DATA_MODE",
                tone: data.source === "real" ? "green" : "gold",
              },
              {
                label: "Movimentações",
                value: data.movimentacoes.length.toLocaleString("pt-BR"),
                detail: "Entradas e vendas normalizadas",
                tone: "blue",
              },
              {
                label: "Ações reais",
                value: data.source === "real" ? "Ativas" : "Bloqueadas",
                detail: "Evita POST acidental enquanto o backend não estiver conectado",
                tone: data.source === "real" ? "green" : "neutral",
              },
            ]}
          />
        </Panel>
      </PageBody>
    </Shell>
  );
}
