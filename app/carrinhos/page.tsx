import Shell from "@/components/shell";
import PageHeader from "@/components/page-header";
import { PAYMENT_STATUS_COLORS, PAYMENT_STATUS_LABELS } from "@/lib/supabase";
import { getPaytCheckoutMonitor } from "@/lib/payt-checkout";

export const dynamic = "force-dynamic";

const PERIODOS = [
  { label: "Hoje", dias: 1 },
  { label: "7 dias", dias: 7 },
  { label: "15 dias", dias: 15 },
  { label: "30 dias", dias: 30 },
] as const;

function formatCurrency(value: number | null) {
  if (value == null) return "—";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function formatDate(value: string) {
  return new Date(value).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatPaymentStatus(status: string) {
  return PAYMENT_STATUS_LABELS[status] ?? status;
}

export default async function CarrinhosPage({
  searchParams,
}: {
  searchParams: Promise<{ dias?: string }>;
}) {
  const params = await searchParams;
  const dias = Math.max(1, Math.min(30, parseInt(params.dias ?? "1") || 1));
  const horas = dias * 24;
  const periodoAtivo = PERIODOS.find((p) => p.dias === dias) ?? PERIODOS[0];
  const monitor = await getPaytCheckoutMonitor(horas);

  return (
    <Shell>
      <PageHeader
        titulo="Carrinhos"
        subtitulo={`Eventos PayT de checkout e abandono — ${periodoAtivo.label.toLowerCase()}`}
      />
      <div className="space-y-6 px-6 pb-8">
        <div className="flex items-center gap-2">
          {PERIODOS.map((p) => {
            const ativo = p.dias === dias;
            const params = new URLSearchParams();
            if (p.dias !== 1) params.set("dias", String(p.dias));
            const href = `/carrinhos${params.size ? "?" + params.toString() : ""}`;
            return (
              <a
                key={p.dias}
                href={href}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  ativo
                    ? "bg-indigo-600 text-white"
                    : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
                }`}
              >
                {p.label}
              </a>
            );
          })}
        </div>

        <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-gray-400">Checkout abertos</p>
            <p className="mt-3 text-3xl font-semibold text-gray-900">{monitor.summary.openCount}</p>
            <p className="mt-1 text-sm text-gray-500">Aguardando pagamento, pendentes ou em análise</p>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-gray-400">Abandonos</p>
            <p className="mt-3 text-3xl font-semibold text-gray-900">{monitor.summary.abandonedCount}</p>
            <p className="mt-1 text-sm text-gray-500">Eventos que a PayT sinalizou como abandono</p>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-gray-400">Perdidos</p>
            <p className="mt-3 text-3xl font-semibold text-gray-900">{monitor.summary.lostCount}</p>
            <p className="mt-1 text-sm text-gray-500">Cancelados, expirados, recusados ou falhos</p>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-gray-400">Recuperados</p>
            <p className="mt-3 text-3xl font-semibold text-gray-900">{monitor.summary.recoveredCount}</p>
            <p className="mt-1 text-sm text-gray-500">Checkout que passaram por evento não pago antes do `paid`</p>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-gray-900">Fila de checkout monitorada</h2>
              <p className="mt-1 text-sm text-gray-500">
                A tabela mostra o último status não pago por transação/carrinho recebido no webhook.
              </p>
            </div>
            <span className="text-sm text-gray-500">{monitor.rows.length} carrinhos · {monitor.totalEvents ?? 0} eventos</span>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs uppercase tracking-wide text-gray-400">
                  <th className="py-3 pr-4">Último evento</th>
                  <th className="py-3 pr-4">Status</th>
                  <th className="py-3 pr-4">Cliente</th>
                  <th className="py-3 pr-4">Produto</th>
                  <th className="py-3 pr-4">Valor</th>
                  <th className="py-3 pr-4">Pagamento</th>
                  <th className="py-3 pr-4">IDs</th>
                </tr>
              </thead>
              <tbody>
                {monitor.rows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-gray-400">
                      Nenhum evento não pago recebido no período.
                    </td>
                  </tr>
                ) : (
                  monitor.rows.map((row) => (
                    <tr key={row.key} className="border-b border-gray-50 align-top">
                      <td className="py-3 pr-4 text-gray-700">{formatDate(row.eventAt)}</td>
                      <td className="py-3 pr-4">
                        <span
                          className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${PAYMENT_STATUS_COLORS[row.status] ?? "bg-gray-100 text-gray-700"}`}
                        >
                          {formatPaymentStatus(row.status)}
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-gray-700">
                        <div className="font-medium text-gray-900">{row.customerName ?? "Sem nome"}</div>
                        <div className="text-xs text-gray-500">{row.customerEmail ?? row.customerPhone ?? "—"}</div>
                      </td>
                      <td className="py-3 pr-4 text-gray-700">
                        <div>{row.productGroup ?? row.productName ?? "—"}</div>
                        <div className="text-xs text-gray-500">{row.rawCount} eventos no histórico</div>
                      </td>
                      <td className="py-3 pr-4 text-gray-700">{formatCurrency(row.totalPrice)}</td>
                      <td className="py-3 pr-4 text-gray-700">{row.paymentMethod ?? "—"}</td>
                      <td className="py-3 pr-4 text-xs text-gray-500">
                        <div>TX: {row.transactionId ?? "—"}</div>
                        <div>Cart: {row.cartId ?? "—"}</div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Shell>
  );
}
