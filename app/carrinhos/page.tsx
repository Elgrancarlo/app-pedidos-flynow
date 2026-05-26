import Shell from "@/components/layout/shell";
import PageHeader from "@/components/page-header";
import { Boxes } from "lucide-react";

export default function CarrinhosPage() {
  return (
    <Shell>
      <PageHeader titulo="Carrinhos" subtitulo="Carrinhos abandonados (últimas 24h)" />
      <div className="px-6 py-6">
        <div className="bg-white rounded-xl border border-dashed border-gray-300 p-16 text-center">
          <Boxes size={32} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 text-sm font-medium">Integração em desenvolvimento</p>
          <p className="text-gray-400 text-xs mt-1">
            Requer webhook da Payt para eventos de carrinho abandonado.
          </p>
        </div>
      </div>
    </Shell>
  );
}
