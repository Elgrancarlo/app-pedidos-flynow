"use client";

import Shell from "@/components/layout/shell";
import PageHeader from "@/components/page-header";
import BotaoRecalcular from "@/components/admin/botao-recalcular";
import { Users, Webhook, MessageSquare, ShieldAlert } from "lucide-react";

export default function ConfiguracoesPage() {
  return (
    <Shell>
      <PageHeader titulo="Configurações" subtitulo="Administração do sistema" />
      <div className="px-6 py-6 space-y-6 pb-12">

        {/* Usuários */}
        <section className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Users size={18} className="text-indigo-600" />
            <h2 className="text-base font-semibold text-gray-900">Usuários</h2>
          </div>
          <div className="text-sm text-gray-500 bg-gray-50 rounded-lg p-4 text-center">
            Gerenciamento de usuários em desenvolvimento.
            <br />
            <span className="text-xs text-gray-400">Configure usuários diretamente no painel do Supabase por enquanto.</span>
          </div>
        </section>

        {/* Webhooks */}
        <section className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Webhook size={18} className="text-indigo-600" />
            <h2 className="text-base font-semibold text-gray-900">Webhooks</h2>
          </div>
          <div className="space-y-3">
            {[
              { label: "Payt Webhook URL", valor: "/api/webhooks/payt" },
              { label: "H7 Webhook URL",   valor: "/api/webhooks/h7" },
            ].map(({ label, valor }) => (
              <div key={label} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                <span className="text-sm text-gray-600">{label}</span>
                <code className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded font-mono">{valor}</code>
              </div>
            ))}
          </div>
        </section>

        {/* WhatsApp */}
        <section className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <MessageSquare size={18} className="text-indigo-600" />
            <h2 className="text-base font-semibold text-gray-900">WhatsApp Business</h2>
          </div>
          <div className="space-y-3">
            {[
              { label: "Template", valor: "pedido_aguardando_retirada" },
              { label: "Idioma",   valor: "pt_BR" },
            ].map(({ label, valor }) => (
              <div key={label} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                <span className="text-sm text-gray-600">{label}</span>
                <span className="text-xs text-gray-700 font-medium">{valor}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Admin */}
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
