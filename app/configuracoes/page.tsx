import type { ReactNode } from "react";

import BotaoRecalcular from "@/components/admin/botao-recalcular";
import { DashboardHeader } from "@/components/layout/dashboard-header";
import Shell from "@/components/layout/shell";
import {
  PageBody,
  Panel,
  StatCard,
  StatGrid,
  StatusPill,
} from "@/components/workspace/operational-ui";
import { getFlynowDataMode, type FlynowDataMode } from "@/lib/data-mode";

export const dynamic = "force-dynamic";

type Tone = "gold" | "blue" | "green" | "red" | "neutral";

type IntegrationRow = {
  label: string;
  env: string;
  description: string;
  configured: boolean;
};

type EndpointRow = {
  label: string;
  route: string;
  description: string;
  status: string;
  tone: Tone;
};

type SettingRow = {
  label: string;
  value: string;
  description?: string;
  tone?: Tone;
};

function hasEnv(name: string) {
  return Boolean(process.env[name]);
}

function getAppUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "https://sistemaflynow.com.br").replace(
    /\/$/,
    ""
  );
}

function statusTone(isReady: boolean): Tone {
  return isReady ? "green" : "gold";
}

function statusLabel(isReady: boolean) {
  return isReady ? "Configurada" : "Pendente";
}

function getIntegrationRows(): IntegrationRow[] {
  return [
    {
      label: "Supabase URL",
      env: "NEXT_PUBLIC_SUPABASE_URL",
      description: "Endpoint público do banco",
      configured: hasEnv("NEXT_PUBLIC_SUPABASE_URL"),
    },
    {
      label: "Supabase anon key",
      env: "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      description: "Leitura segura no cliente",
      configured: hasEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    },
    {
      label: "Supabase service role",
      env: "SUPABASE_SERVICE_ROLE_KEY",
      description: "Rotinas server-side",
      configured: hasEnv("SUPABASE_SERVICE_ROLE_KEY"),
    },
    {
      label: "Internal API secret",
      env: "INTERNAL_API_SECRET",
      description: "Proteção de syncs internos",
      configured: hasEnv("INTERNAL_API_SECRET"),
    },
    {
      label: "PayT integration key",
      env: "PAYT_INTEGRATION_KEY",
      description: "Validação do webhook PayT",
      configured: hasEnv("PAYT_INTEGRATION_KEY"),
    },
    {
      label: "H7 token",
      env: "H7_TOKEN",
      description: "Sincronização logística",
      configured: hasEnv("H7_TOKEN"),
    },
    {
      label: "H7 API URL",
      env: "H7_API_URL",
      description: "Origem dos pedidos H7",
      configured: hasEnv("H7_API_URL"),
    },
    {
      label: "RedTrack API key",
      env: "REDTRACK_API_KEY",
      description: "Mídia, campanhas e spend",
      configured: hasEnv("REDTRACK_API_KEY"),
    },
    {
      label: "OpenRouter API key",
      env: "OPENROUTER_API_KEY",
      description: "Insights e leitura operacional",
      configured: hasEnv("OPENROUTER_API_KEY"),
    },
  ];
}

function getEndpointRows(appUrl: string): EndpointRow[] {
  return [
    {
      label: "PayT webhook",
      route: `${appUrl}/api/webhooks/payt`,
      description: "Recebe eventos financeiros e pedidos pagos",
      status: "Publicado",
      tone: "green",
    },
    {
      label: "H7 webhook",
      route: `${appUrl}/api/webhooks/h7`,
      description: "Recebe atualizações logísticas",
      status: "Publicado",
      tone: "green",
    },
    {
      label: "Sync H7",
      route: `${appUrl}/api/sync-h7`,
      description: "Importa pedidos e status logísticos",
      status: hasEnv("INTERNAL_API_SECRET") ? "Protegido" : "Sem secret",
      tone: hasEnv("INTERNAL_API_SECRET") ? "green" : "gold",
    },
    {
      label: "Sync Analytics PayT",
      route: `${appUrl}/api/analytics/sync/payt`,
      description: "Atualiza receita e leitura comercial",
      status: hasEnv("INTERNAL_API_SECRET") ? "Protegido" : "Sem secret",
      tone: hasEnv("INTERNAL_API_SECRET") ? "green" : "gold",
    },
    {
      label: "Sync Analytics RedTrack",
      route: `${appUrl}/api/analytics/sync/redtrack`,
      description: "Atualiza mídia, campanhas e cliques",
      status: hasEnv("REDTRACK_API_KEY") ? "Pronto" : "Aguardando key",
      tone: hasEnv("REDTRACK_API_KEY") ? "green" : "gold",
    },
  ];
}

function getWhatsAppRows(): SettingRow[] {
  const hasCredentials =
    hasEnv("WHATSAPP_PHONE_NUMBER_ID") && hasEnv("WHATSAPP_ACCESS_TOKEN");

  return [
    {
      label: "Phone number ID + access token",
      value: hasCredentials ? "Configurado" : "Pendente",
      description: "Credenciais Meta Graph API",
      tone: statusTone(hasCredentials),
    },
    {
      label: "Template ativo",
      value: process.env.WHATSAPP_TEMPLATE_NAME ?? "pedido_aguardando_retirada",
      description: "Mensagem operacional padrão",
      tone: "blue",
    },
    {
      label: "Idioma",
      value: process.env.WHATSAPP_TEMPLATE_LANGUAGE ?? "pt_BR",
      description: "Localização principal",
      tone: "neutral",
    },
    {
      label: "Soberania operacional",
      value: "PayT financeiro · H7 logística",
      description: "Estoque e reversão financeira seguem rotas distintas",
      tone: "neutral",
    },
  ];
}

function ConfigTile({
  description,
  label,
  status,
  value,
}: {
  description?: string;
  label: string;
  status?: ReactNode;
  value: string;
}) {
  return (
    <div className="min-w-0 rounded-[8px] border border-[var(--fly-border-subtle)] bg-[var(--fly-row-bg)] px-3 py-3 transition-colors duration-150 hover:border-[var(--fly-border-strong)] hover:bg-[var(--fly-row-hover)]">
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-[var(--fly-text)]">
            {label}
          </p>
          {description ? (
            <p className="mt-1 text-xs leading-5 text-[var(--fly-text-muted)]">
              {description}
            </p>
          ) : null}
        </div>
        {status ? <div className="shrink-0">{status}</div> : null}
      </div>
      <p className="mt-2 truncate font-mono text-[11px] font-medium text-[var(--fly-text-muted)]">
        {value}
      </p>
    </div>
  );
}

function IntegrationHealth({
  configuredCount,
  mode,
  rows,
}: {
  configuredCount: number;
  mode: FlynowDataMode;
  rows: IntegrationRow[];
}) {
  const readiness = rows.length ? configuredCount / rows.length : 0;

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_260px]">
      <div className="grid gap-2.5 md:grid-cols-2 2xl:grid-cols-3">
        {rows.map((row) => (
          <ConfigTile
            key={row.env}
            description={row.description}
            label={row.label}
            status={
              <StatusPill tone={statusTone(row.configured)}>
                {statusLabel(row.configured)}
              </StatusPill>
            }
            value={row.env}
          />
        ))}
      </div>

      <div className="space-y-3 self-start">
        <div className="rounded-[8px] border border-[var(--fly-border-subtle)] bg-[var(--fly-row-bg)] p-4">
          <p className="text-[11px] font-semibold uppercase text-[var(--fly-text-muted)]">
            Prontidão
          </p>
          <p className="mt-3 text-[30px] font-semibold leading-none tabular-nums text-[var(--fly-text)]">
            {Math.round(readiness * 100)}%
          </p>
          <p className="mt-2 text-xs leading-5 text-[var(--fly-text-muted)]">
            {configuredCount} de {rows.length} integrações com variáveis presentes.
          </p>
          <div className="mt-4 h-1 overflow-hidden rounded-full bg-[var(--fly-divider)]">
            <span
              aria-hidden="true"
              className="block h-full rounded-full bg-[var(--fly-brand)]"
              style={{ width: `${Math.max(readiness * 100, 6)}%` }}
            />
          </div>
        </div>

        <div className="rounded-[8px] border border-[var(--fly-border-subtle)] bg-[var(--fly-row-bg)] p-4">
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm font-semibold text-[var(--fly-text)]">
              Contrato mock-first
            </p>
            <StatusPill tone="green">Normalizado</StatusPill>
          </div>
          <p className="mt-2 text-xs leading-5 text-[var(--fly-text-muted)]">
            As telas seguem adapters e tipos de UI, então a troca para dados reais
            acontece pela camada de conexão.
          </p>
        </div>

        <div className="rounded-[8px] border border-[var(--fly-border-subtle)] bg-[var(--fly-row-bg)] p-4">
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm font-semibold text-[var(--fly-text)]">
              Ações sensíveis
            </p>
            <StatusPill tone={mode === "real" ? "green" : "neutral"}>
              {mode === "real" ? "Liberadas" : "Protegidas"}
            </StatusPill>
          </div>
          <p className="mt-2 text-xs leading-5 text-[var(--fly-text-muted)]">
            Em mock, rotinas com mutação ficam bloqueadas para evitar disparos ou
            recálculos acidentais.
          </p>
        </div>
      </div>
    </div>
  );
}

function EndpointList({ rows }: { rows: EndpointRow[] }) {
  return (
    <div className="divide-y divide-[var(--fly-divider-subtle)] overflow-hidden rounded-[8px] border border-[var(--fly-border-subtle)]">
      {rows.map((row) => (
        <div
          key={row.label}
          className="grid gap-3 bg-[var(--fly-row-bg)] px-3 py-3 transition-colors duration-150 hover:bg-[var(--fly-row-hover)] lg:grid-cols-[220px_minmax(0,1fr)_auto] lg:items-center"
        >
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-[var(--fly-text)]">
              {row.label}
            </p>
            <p className="mt-1 text-xs leading-5 text-[var(--fly-text-muted)]">
              {row.description}
            </p>
          </div>
          <code className="block min-w-0 truncate rounded-[7px] border border-[var(--fly-border-subtle)] bg-[var(--fly-control)] px-2.5 py-2 font-mono text-[11px] text-[var(--fly-text-soft)]">
            {row.route}
          </code>
          <div className="lg:justify-self-end">
            <StatusPill tone={row.tone}>{row.status}</StatusPill>
          </div>
        </div>
      ))}
    </div>
  );
}

function SettingsGrid({ rows }: { rows: SettingRow[] }) {
  return (
    <div className="grid gap-2.5 md:grid-cols-2">
      {rows.map((row) => (
        <ConfigTile
          key={row.label}
          description={row.description}
          label={row.label}
          status={row.tone ? <StatusPill tone={row.tone}>{row.value}</StatusPill> : null}
          value={row.value}
        />
      ))}
    </div>
  );
}

function WarningNote({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-[8px] border border-[var(--fly-warning-border)] bg-[var(--fly-warning-surface)] px-3 py-3 text-[13px] leading-5 text-[var(--fly-warning-text)]">
      {children}
    </div>
  );
}

export default function ConfiguracoesPage() {
  const mode = getFlynowDataMode();
  const appUrl = getAppUrl();
  const integrationRows = getIntegrationRows();
  const configuredCount = integrationRows.filter((row) => row.configured).length;
  const endpointRows = getEndpointRows(appUrl);
  const activeEndpointCount = endpointRows.filter((row) => row.tone === "green").length;
  const hasWhatsAppCredentials =
    hasEnv("WHATSAPP_PHONE_NUMBER_ID") && hasEnv("WHATSAPP_ACCESS_TOKEN");

  return (
    <Shell>
      <DashboardHeader
        title="Configurações"
        description="Ambiente, integrações e rotinas administrativas"
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
            detail="Define se o frontend consome dados reais ou mockados"
            tone={mode === "real" ? "green" : "gold"}
          />
          <StatCard
            label="Integrações"
            value={`${configuredCount}/${integrationRows.length}`}
            detail="Variáveis essenciais encontradas no ambiente"
            tone={configuredCount === integrationRows.length ? "green" : "gold"}
          />
          <StatCard
            label="Webhooks e syncs"
            value={`${activeEndpointCount}/${endpointRows.length}`}
            detail="Rotas publicadas e protegidas quando necessário"
            tone={activeEndpointCount === endpointRows.length ? "green" : "blue"}
          />
          <StatCard
            label="WhatsApp"
            value={hasWhatsAppCredentials ? "Pronto" : "Pendente"}
            detail="Credenciais Meta para envios operacionais"
            tone={hasWhatsAppCredentials ? "green" : "gold"}
          />
        </StatGrid>

        <Panel
          title="Health das integrações"
          description="Chaves e endpoints que habilitam a troca de mock por dados reais"
          action={
            <StatusPill
              tone={configuredCount === integrationRows.length ? "green" : "gold"}
            >
              {configuredCount} de {integrationRows.length}
            </StatusPill>
          }
        >
          <IntegrationHealth
            configuredCount={configuredCount}
            mode={mode}
            rows={integrationRows}
          />
        </Panel>

        <Panel
          title="Webhooks e syncs"
          description="Rotas expostas pelo app para eventos, importações e analytics"
          action={<StatusPill tone="blue">{appUrl.replace("https://", "")}</StatusPill>}
        >
          <EndpointList rows={endpointRows} />
        </Panel>

        <div className="grid gap-4 xl:grid-cols-2">
          <Panel
            title="WhatsApp Business"
            description="Credenciais e template usados nos disparos operacionais"
          >
            <SettingsGrid rows={getWhatsAppRows()} />
          </Panel>

          <Panel
            title="Operação e risco"
            description="Pontos de atenção antes de ativar integrações reais"
          >
            <div className="space-y-3">
              <SettingsGrid
                rows={[
                  {
                    label: "Webhook PayT no app Next",
                    value: "Ativo",
                    description: "/api/webhooks/payt",
                    tone: "green",
                  },
                  {
                    label: "Edge Function PayT legada",
                    value: "Detectada",
                    description: "Validar se o provedor ainda aponta para Supabase",
                    tone: "gold",
                  },
                  {
                    label: "Secret interno",
                    value: hasEnv("INTERNAL_API_SECRET") ? "Protegido" : "Pendente",
                    description: "Syncs internos e backfills",
                    tone: hasEnv("INTERNAL_API_SECRET") ? "green" : "gold",
                  },
                  {
                    label: "Soberania de dados",
                    value: "Definida",
                    description: "PayT financeiro, H7 logística e RedTrack mídia",
                    tone: "blue",
                  },
                ]}
              />
              <WarningNote>
                Se a integração real da PayT ainda apontar para a Edge Function legada
                do Supabase, estoque e reversões podem divergir da rota Next publicada.
              </WarningNote>
            </div>
          </Panel>
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
          <Panel
            title="Usuários"
            description="Política atual de acesso e rotas sensíveis"
          >
            <div className="rounded-[8px] border border-[var(--fly-border-subtle)] bg-[var(--fly-row-bg)] px-3 py-3">
              <p className="text-sm font-semibold text-[var(--fly-text)]">
                Autorização em amadurecimento
              </p>
              <p className="mt-1.5 text-sm leading-6 text-[var(--fly-text-muted)]">
                Rotas sensíveis usam service role e validação de origem ou segredo
                interno. A trilha completa de papéis por sessão ainda deve ser fechada
                antes de liberar operação real para múltiplos perfis.
              </p>
            </div>
          </Panel>

          <Panel
            title="Administração"
            description="Rotinas manuais com impacto no banco e no estoque"
            action={
              <StatusPill tone={mode === "real" ? "green" : "neutral"}>
                {mode === "real" ? "Liberado" : "Bloqueado em mock"}
              </StatusPill>
            }
          >
            {mode === "real" ? (
              <BotaoRecalcular />
            ) : (
              <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[var(--fly-text)]">
                    Normalizar produtos e recalcular estoque
                  </p>
                  <p className="mt-1 text-xs leading-5 text-[var(--fly-text-muted)]">
                    Consolida variações de produto, reconstrói movimentações históricas
                    e recalcula saldos por grupo.
                  </p>
                </div>
                <button
                  type="button"
                  disabled
                  className="inline-flex h-10 items-center justify-center rounded-[8px] border border-[var(--fly-border)] bg-[var(--fly-control)] px-4 text-xs font-semibold text-[var(--fly-text-muted)] opacity-70"
                >
                  Bloqueado em mock
                </button>
              </div>
            )}
          </Panel>
        </div>
      </PageBody>
    </Shell>
  );
}
