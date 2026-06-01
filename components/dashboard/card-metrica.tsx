interface CardMetricaProps {
  titulo: string;
  valor: string;
  subtitulo?: string;
  icone?: React.ReactNode;
  cor?: "default" | "verde" | "vermelho" | "laranja" | "azul";
}

const COR_VALOR: Record<string, string> = {
  default:  "text-gray-900",
  verde:    "text-emerald-600",
  vermelho: "text-red-600",
  laranja:  "text-orange-600",
  azul:     "text-blue-600",
};

const COR_BORDA: Record<string, string> = {
  default:  "border-gray-200",
  verde:    "border-emerald-200",
  vermelho: "border-red-200",
  laranja:  "border-orange-200",
  azul:     "border-blue-200",
};

export default function CardMetrica({
  titulo,
  valor,
  subtitulo,
  icone,
  cor = "default",
}: CardMetricaProps) {
  return (
    <div className={`bg-white rounded-xl border p-5 ${COR_BORDA[cor]}`}>
      <div className="flex items-start justify-between">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{titulo}</p>
        {icone && <div className="text-gray-400">{icone}</div>}
      </div>
      <p className={`text-2xl font-bold mt-2 ${COR_VALOR[cor]}`}>{valor}</p>
      {subtitulo && (
        <p className="text-xs text-gray-400 mt-1">{subtitulo}</p>
      )}
    </div>
  );
}
