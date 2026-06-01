import { existsSync } from "node:fs";
import { join } from "node:path";
import Shell from "@/components/shell";
import PageHeader from "@/components/page-header";
import BotaoRecalcular from "@/components/admin/botao-recalcular";
import { Users, Webhook, MessageSquare, ShieldAlert, Activity } from "lucide-react";

function statusPill(configured: boolean, okLabel = "Configurado", badLabel = "Pendente") {
  return (
    <span
      className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
        configured ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
      }`}
    >
      {configured ? okLabel : badLabel}
    </span>
  );
}

function envHealth() {
  return {
    appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "https://sistemaflynow.com.br",
    supabaseUrl: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
    supabaseAnon: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    supabaseServiceRole: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    internalSecret: Boolean(process.env.INTERNAL_API_SECRET),
    paytIntegrationKey: Boolean(process.env.PAYT_INTEGRATION_KEY),
    h7Token: Boolean(process.env.H7_TOKEN),
    h7ApiUrl: Boolean(process.env.H7_API_URL),
    redtrackApiKey: Boolean(process.env.REDTRACK_API_KEY),
    openRouterApiKey: Boolean(process.env.OPENROUTER_API_KEY),
    whatsappPhoneNumberId: Boolean(process.env.WHATSAPP_PHONE_NUMBER_ID),
    whatsappAccessToken: Boolean(process.env.WHATSAPP_ACCESS_TOKEN),
    whatsappTemplateName: process.env.WHATSAPP_TEMPLATE_NAME ?? "pedido_aguardando_retirada",
    whatsappTemplateLanguage: process.env.WHATSAPP_TEMPLATE_LANGUAGE ?? "pt_BR",
  };
}

export default function ConfiguracoesPage() {
  const health = envHealth();
  const appUrl = health.appUrl.replace(/\/$/, "");
  const edgeWebhookExists = existsSync(join(process.cwd(), "supabase/functions/webhook-payt/index.ts"));

  const webhookItems = [
    { label: "Payt Webhook URL", valor: `${appUrl}/api/webhooks/payt`, ok: health.paytIntegrationKey },
    { label: "H7 Webhook URL", valor: `${appUrl}/api/webhooks/h7`, ok: true },
    { label: "Sync H7", valor: `${appUrl}/api/sync-h7 (GET com secret interno)`, ok: health.internalSecret && health.h7Token },
    { label: "Sync Analytics Payt", valor: `${appUrl}/api/analytics/sync/payt (secret interno)`, ok: health.internalSecret },
    { label: "Sync Analytics RedTrack", valor: `${appUrl}/api/analytics/sync/redtrack (secret interno)`, ok: health.internalSecret && health.redtrackApiKey },
  ];

  const integrationItems = [
    { label: "Supabase URL", ok: health.supabaseUrl },
    { label: "Supabase Anon Key", ok: health.supabaseAnon },
    { label: "Supabase Service Role", ok: health.supabaseServiceRole },
    { label: "Internal API Secret", ok: health.internalSecret },
    { label: "PayT Integration Key", ok: health.paytIntegrationKey },
    { label: "H7 Token", ok: health.h7Token },
    { label: "H7 API URL", ok: health.h7ApiUrl },
    { label: "RedTrack API Key", ok: health.redtrackApiKey },
    { label: "OpenRouter API Key", ok: health.openRouterApiKey },
  ];

  return (
    <Shell>
      <PageHeader titulo="Configurações" subtitulo="Saúde operacional e integrações ativas" />
      <div className="px-6 py-6 space-y-6 pb-12">
        <section className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Activity size={18} className="text-indigo-600" />
            <h2 className="text-base font-semibold text-gray-900">Health das Integrações</h2>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {integrationItems.map((item) => (
              <div key={item.label} className="rounded-lg border border-gray-100 bg-gray-50 px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm text-gray-700">{item.label}</span>
                  {statusPill(item.ok)}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Webhook size={18} className="text-indigo-600" />
            <h2 className="text-base font-semibold text-gray-900">Webhooks e Syncs</h2>
          </div>
          <div className="space-y-3">
            {webhookItems.map(({ label, valor, ok }) => (
              <div key={label} className="flex items-center justify-between gap-4 py-2 border-b border-gray-100 last:border-0">
                <div className="min-w-0">
                  <div className="text-sm text-gray-700">{label}</div>
                  <code className="mt-1 block text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded font-mono break-all">{valor}</code>
                </div>
                {statusPill(ok)}
              </div>
            ))}
          </div>
        </section>

        <section className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <MessageSquare size={18} className="text-indigo-600" />
            <h2 className="text-base font-semibold text-gray-900">WhatsApp Business</h2>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-lg border border-gray-100 bg-gray-50 px-4 py-3 flex items-center justify-between gap-3">
              <span className="text-sm text-gray-700">Phone Number ID + Access Token</span>
              {statusPill(health.whatsappPhoneNumberId && health.whatsappAccessToken)}
            </div>
            <div className="rounded-lg border border-gray-100 bg-gray-50 px-4 py-3">
              <div className="text-sm text-gray-700">Template ativo</div>
              <div className="mt-1 text-xs text-gray-500">{health.whatsappTemplateName}</div>
            </div>
            <div className="rounded-lg border border-gray-100 bg-gray-50 px-4 py-3">
              <div className="text-sm text-gray-700">Idioma</div>
              <div className="mt-1 text-xs text-gray-500">{health.whatsappTemplateLanguage}</div>
            </div>
            <div className="rounded-lg border border-gray-100 bg-gray-50 px-4 py-3">
              <div className="text-sm text-gray-700">Soberania operacional</div>
              <div className="mt-1 text-xs text-gray-500">Estoque e reversão financeira são tratados prioritariamente pela PayT; H7 é fonte logística.</div>
            </div>
          </div>
        </section>

        <section className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <ShieldAlert size={18} className="text-indigo-600" />
            <h2 className="text-base font-semibold text-gray-900">Operação e Risco</h2>
          </div>
          <div className="space-y-3">
            <div className="rounded-lg border border-gray-100 bg-gray-50 px-4 py-3 flex items-center justify-between gap-3">
              <span className="text-sm text-gray-700">Webhook PayT ativo no app Next</span>
              {statusPill(true, "Ativo", "Inativo")}
            </div>
            <div className="rounded-lg border border-gray-100 bg-gray-50 px-4 py-3 flex items-center justify-between gap-3">
              <span className="text-sm text-gray-700">Edge Function PayT legada no repositório</span>
              {statusPill(edgeWebhookExists, "Detectada", "Ausente")}
            </div>
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              Se a integração real da PayT ainda apontar para a Edge Function legada do Supabase, o comportamento de estoque pode divergir da rota Next publicada.
            </div>
          </div>
        </section>

        <section className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Users size={18} className="text-indigo-600" />
            <h2 className="text-base font-semibold text-gray-900">Usuários</h2>
          </div>
          <div className="text-sm text-gray-500 bg-gray-50 rounded-lg p-4">
            Autorização forte ainda não está fechada ponta a ponta. As rotas sensíveis usam `service role` e validações de origem/segredo interno, mas ainda não há trilha completa de roles aplicadas por sessão.
          </div>
        </section>

        <section className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <ShieldAlert size={18} className="text-indigo-600" />
            <h2 className="text-base font-semibold text-gray-900">Administração</h2>
          </div>
          <BotaoRecalcular />
        </section>
      </div>
    </Shell>
  );
}
