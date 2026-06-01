interface PageHeaderProps {
  titulo: string;
  subtitulo?: string;
  acoes?: React.ReactNode;
}

export default function PageHeader({ titulo, subtitulo, acoes }: PageHeaderProps) {
  const agora = new Date().toLocaleDateString("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="flex items-start justify-between px-6 pt-6 pb-2">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">{titulo}</h1>
        {subtitulo && (
          <p className="text-sm text-gray-500 mt-0.5">{subtitulo}</p>
        )}
        <p className="text-xs text-gray-400 mt-1 capitalize">{agora}</p>
      </div>
      {acoes && (
        <div className="flex items-center gap-3 mt-1">{acoes}</div>
      )}
    </div>
  );
}
