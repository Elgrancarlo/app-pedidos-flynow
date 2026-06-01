import {
  Bot,
  Database,
  KeyRound,
  RefreshCw,
  ShieldCheck,
  SlidersHorizontal,
  Webhook,
} from "lucide-react";

import BotaoRecalcular from "@/components/admin/botao-recalcular";
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
import { getFlynowDataMode } from "@/lib/data-mode";

export const dynamic = "force-dynamic";

function hasEnv(name: string) {
  return Boolean(process.env[name]);
}

function connectionRows() {
  return [
    {
      label: "Supabase URL",
      value: hasEnv("NEXT_PUBLIC_SUPABASE_URL") ? "Configurada" : "Pendente",
      detail: "NEXT_PUBLIC_SUPABASE_URL",
      tone: hasEnv("NEXT_PUBLIC_SUPABASE_URL") ? "green" : "gold",
    },
    {
      label: "Supabase anon key",
      value: hasEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY") ? "Configurada" : "Pendente",
      detail: "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      tone: hasEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY") ? "green" : "gold",
    },
    {
      label: "Service role",
      value: hasEnv("SUPABASE_SERVICE_ROLE_KEY") ? "Configurada" : "Pendente",
      detail: "SUPABASE_SERVICE_ROLE_KEY",
      tone: hasEnv("SUPABASE_SERVICE_ROLE_KEY") ? "green" : "gold",
    },
    {
      label: "Internal API",
      value: hasEnv("INTERNAL_API_SECRET") ? "Configurada" : "Pendente",
      detail: "INTERNAL_API_SECRET",
      tone: hasEnv("INTERNAL_API_SECRET") ? "green" : "gold",
    },
  ] as const;
}

export default function ConfiguracoesPage() {
  const mode = getFlynowDataMode();
  const rows = connectionRows();
  const configuredCount = rows.filter((row) => row.value === "Configurada").length;

  return (
    <Shell>
      <DashboardHeader
        title="Configurações"
        description="Ambiente, webhooks, integrações e rotinas administrativas"
        actions={
          <StatusPill tone={mode === "real" ? "green" : "gold"}>
            {mode === "real" ? "Modo real" : "Modo mock"}
          </StatusPill>
        }
      />

      <PageBody>
        <StatGrid>
          <StatCard
            label="Modo de dados"
            value={mode === "real" ? "Real" : "Mock"}
            detail="Controla todas as telas mock-first"
            Icon={SlidersHorizontal}
            tone={mode === "real" ? "green" : "gold"}
          />
          <StatCard
            label="Conexões"
            value={`${configuredCount}/${rows.length}`}
            detail="Variáveis essenciais configuradas"
            Icon={KeyRound}
            tone={configuredCount === rows.length ? "green" : "blue"}
          />
          <StatCard
            label="Webhooks"
            value="2"
            detail="PayT e H7 prontos para receber eventos"
            Icon={Webhook}
            tone="blue"
          />
          <StatCard
            label="Rotinas"
            value="4"
            detail="Sync, backfill, estoque e recálculo"
            Icon={RefreshCw}
            tone="neutral"
          />
        </StatGrid>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.7fr)]">
          <Panel
            title="Ambiente"
            description="Status das chaves necessárias para trocar mock por dados reais"
            action={<Database aria-hidden="true" className="size-4 text-[var(--fly-text-muted)]" />}
          >
            <DataList
              valueLabel="env"
              rows={rows.map((row) => ({
                label: row.label,
                value: row.value,
                detail: row.detail,
                tone: row.tone,
              }))}
            />
          </Panel>

          <Panel title="Contrato mock-first" description="Como conectar sem refazer telas">
            <DataList
              valueLabel="estado"
              rows={[
                {
                  label: "Frontend",
                  value: "Normalizado",
                  detail: "Telas consomem adapters e tipos de UI",
                  tone: "green",
                },
                {
                  label: "Backend",
                  value: mode === "real" ? "Ativo" : "Aguardando keys",
                  detail: "Supabase e rotas server-side",
                  tone: mode === "real" ? "green" : "gold",
                },
                {
                  label: "Ações sensíveis",
                  value: mode === "real" ? "Liberadas" : "Protegidas",
                  detail: "Evita disparos e mutações acidentais em mock",
                  tone: mode === "real" ? "green" : "neutral",
                },
              ]}
            />
          </Panel>
        </div>

        <Panel
          title="Endpoints e integrações"
          description="URLs internas que o backend já expõe"
        >
          <SimpleTable
            columns={["Integração", "Rota", "Uso"]}
            rows={[
              ["PayT webhook", "/api/webhooks/payt", "Receber eventos de compra"],
              ["H7 webhook", "/api/webhooks/h7", "Receber eventos de checkout"],
              ["Sync PayT", "/api/analytics/sync/payt", "Popular analytics"],
              ["Sync Redtrack", "/api/analytics/sync/redtrack", "Mídia e campanhas"],
              ["Backfill eventos", "/api/backfill-event-stream", "Reprocessar histórico"],
            ]}
          />
        </Panel>

        <div className="grid gap-4 xl:grid-cols-3">
          <Panel title="WhatsApp Business" description="Notificações operacionais">
            <DataList
              valueLabel="config"
              rows={[
                {
                  label: "Template",
                  value: "pedido_aguardando_retirada",
                  detail: "Mensagem de rastreio",
                  tone: "green",
                },
                {
                  label: "Idioma",
                  value: "pt_BR",
                  detail: "Localização principal",
                  tone: "neutral",
                },
                {
                  label: "Status",
                  value: mode === "real" ? "Pronto" : "Mock visual",
                  detail: "Envio real fica no backend",
                  tone: mode === "real" ? "green" : "gold",
                },
              ]}
            />
          </Panel>

          <Panel title="IA operacional" description="Alertas e leitura de contexto">
            <DataList
              valueLabel="status"
              rows={[
                {
                  label: "OpenRouter",
                  value: hasEnv("OPENROUTER_API_KEY") ? "Configurado" : "Opcional",
                  detail: "Gera insights de funil",
                  tone: hasEnv("OPENROUTER_API_KEY") ? "green" : "neutral",
                },
                {
                  label: "Transcrições",
                  value: "Preparado",
                  detail: "/api/analytics/transcripts",
                  tone: "blue",
                },
                {
                  label: "Logs de alteração",
                  value: "Preparado",
                  detail: "/api/analytics/change_logs",
                  tone: "blue",
                },
              ]}
            />
          </Panel>

          <Panel title="Administração" description="Rotinas com impacto no banco">
            <div className="space-y-3">
              <div className="rounded-[8px] border border-white/[0.055] bg-white/[0.018] p-3">
                <div className="flex items-start gap-3">
                  <ShieldCheck
                    aria-hidden="true"
                    className="mt-0.5 size-4 shrink-0 text-[var(--fly-brand-strong)]"
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[var(--fly-text)]">
                      Recálculo de estoque
                    </p>
                    <p className="mt-1 text-xs leading-5 text-[var(--fly-text-muted)]">
                      Use quando sincronizações reais estiverem ativas.
                    </p>
                  </div>
                </div>
              </div>
              {mode === "real" ? (
                <BotaoRecalcular />
              ) : (
                <button
                  type="button"
                  disabled
                  className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-[8px] border border-[var(--fly-border)] bg-[var(--fly-control)] px-3 text-xs font-semibold text-[var(--fly-text-muted)] opacity-70"
                >
                  <Bot aria-hidden="true" className="size-3.5" />
                  Recálculo bloqueado em mock
                </button>
              )}
            </div>
          </Panel>
        </div>

        <Panel title="Checklist para ativar dados reais">
          <SimpleTable
            columns={["Etapa", "Responsável", "Resultado"]}
            rows={[
              ["Aplicar migrations", "Backend", "Tabelas e RPCs criadas"],
              ["Configurar envs", "DevOps", "Modo real habilitado"],
              ["Rodar syncs", "Operação", "PayT e Redtrack populados"],
              ["Validar telas", "Frontend", "Sem mudança de contrato visual"],
            ]}
          />
        </Panel>
      </PageBody>
    </Shell>
  );
}
