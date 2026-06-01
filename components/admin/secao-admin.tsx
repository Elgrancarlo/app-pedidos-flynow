"use client";

import { ShieldAlert } from "lucide-react";
import BotaoRecalcular from "./botao-recalcular";

export default function SecaoAdmin() {
  return (
    <section className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center gap-2 mb-4">
        <ShieldAlert size={18} className="text-indigo-600" />
        <h2 className="text-base font-semibold text-gray-900">Administração</h2>
      </div>
      <BotaoRecalcular />
    </section>
  );
}
