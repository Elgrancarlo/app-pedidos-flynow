interface AnalyticsKpiCardProps {
  label: string;
  value: string;
  hint?: string;
}

export default function AnalyticsKpiCard({
  label,
  value,
  hint,
}: AnalyticsKpiCardProps) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-400">
        {label}
      </p>
      <p className="mt-3 text-3xl font-semibold tracking-tight text-gray-900">
        {value}
      </p>
      {hint ? <p className="mt-2 text-xs text-gray-500">{hint}</p> : null}
    </div>
  );
}
