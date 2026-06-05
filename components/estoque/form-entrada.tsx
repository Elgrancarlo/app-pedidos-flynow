"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface FormEntradaProps {
  grupos: string[];
}

export default function FormEntrada({ grupos }: FormEntradaProps) {
  const router = useRouter();
  const [grupo, setGrupo] = useState("");
  const [novoGrupo, setNovoGrupo] = useState("");
  const [qtd, setQtd] = useState("");
  const [obs, setObs] = useState("");
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");

  const grupoFinal = grupo === "__novo__" ? novoGrupo.trim() : grupo;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro("");

    if (!grupoFinal || !qtd || Number(qtd) <= 0) {
      setErro("Informe o produto e a quantidade.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/estoque/entrada", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          produto_grupo: grupoFinal,
          qtd_potes: Number(qtd),
          observacao: obs || null,
        }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.erro ?? "Erro desconhecido");

      setGrupo("");
      setNovoGrupo("");
      setQtd("");
      setObs("");
      router.refresh();
    } catch (err: unknown) {
      setErro(err instanceof Error ? err.message : "Erro ao registrar entrada");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="grid gap-3 md:grid-cols-[minmax(0,1fr)_112px] 2xl:grid-cols-[minmax(0,1fr)_112px_minmax(0,1.1fr)_max-content]"
    >
      <div className="grid min-w-0 gap-1">
        <label className="text-xs font-medium text-[var(--fly-text-muted)]">
          Produto
        </label>
        <select
          value={grupo}
          onChange={(e) => setGrupo(e.target.value)}
          className="h-10 w-full min-w-0 rounded-[8px] border border-[var(--fly-border)] bg-[var(--fly-control)] px-3 text-sm text-[var(--fly-text-soft)] outline-none transition-colors duration-150 hover:border-[var(--fly-border-strong)] focus:border-[var(--fly-brand-border)] focus:ring-2 focus:ring-[var(--fly-brand-ring)]"
          required
        >
          <option value="">Selecionar produto...</option>
          {grupos.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
          <option value="__novo__">+ Novo produto</option>
        </select>
      </div>

      {grupo === "__novo__" && (
        <div className="grid min-w-0 gap-1 md:col-span-2 2xl:col-span-2">
          <label className="text-xs font-medium text-[var(--fly-text-muted)]">
            Nome do produto
          </label>
          <input
            type="text"
            value={novoGrupo}
            onChange={(e) => setNovoGrupo(e.target.value)}
            placeholder="Ex: GlicoRESET"
            className="h-10 w-full min-w-0 rounded-[8px] border border-[var(--fly-border)] bg-[var(--fly-control)] px-3 text-sm text-[var(--fly-text-soft)] outline-none transition-colors duration-150 placeholder:text-[var(--fly-text-dim)] hover:border-[var(--fly-border-strong)] focus:border-[var(--fly-brand-border)] focus:ring-2 focus:ring-[var(--fly-brand-ring)]"
            required
          />
        </div>
      )}

      <div className="grid min-w-0 gap-1">
        <label className="text-xs font-medium text-[var(--fly-text-muted)]">
          Qtd potes
        </label>
        <input
          type="number"
          value={qtd}
          onChange={(e) => setQtd(e.target.value)}
          min="1"
          placeholder="0"
          className="h-10 w-full min-w-0 rounded-[8px] border border-[var(--fly-border)] bg-[var(--fly-control)] px-3 text-sm text-[var(--fly-text-soft)] outline-none transition-colors duration-150 placeholder:text-[var(--fly-text-dim)] hover:border-[var(--fly-border-strong)] focus:border-[var(--fly-brand-border)] focus:ring-2 focus:ring-[var(--fly-brand-ring)]"
          required
        />
      </div>

      <div className="grid min-w-0 gap-1 md:col-span-2 2xl:col-span-1">
        <label className="text-xs font-medium text-[var(--fly-text-muted)]">
          Observação (opcional)
        </label>
        <input
          type="text"
          value={obs}
          onChange={(e) => setObs(e.target.value)}
          placeholder="Ex: NF 12345"
          className="h-10 w-full min-w-0 rounded-[8px] border border-[var(--fly-border)] bg-[var(--fly-control)] px-3 text-sm text-[var(--fly-text-soft)] outline-none transition-colors duration-150 placeholder:text-[var(--fly-text-dim)] hover:border-[var(--fly-border-strong)] focus:border-[var(--fly-brand-border)] focus:ring-2 focus:ring-[var(--fly-brand-ring)]"
        />
      </div>

      <div className="flex min-w-0 items-end md:col-span-2 2xl:col-span-1">
        <button
          type="submit"
          disabled={loading}
          className="h-10 w-full whitespace-nowrap rounded-[8px] border border-[var(--fly-brand-border)] bg-[var(--fly-brand)] px-4 text-xs font-semibold text-[#050607] shadow-[0_10px_24px_rgba(214,168,79,0.12)] transition-colors duration-150 hover:bg-[var(--fly-chart-revenue-active)] disabled:cursor-not-allowed disabled:opacity-50 2xl:w-auto"
        >
          {loading ? "Salvando..." : "Registrar Entrada"}
        </button>
      </div>

      {erro ? (
        <p className="text-sm text-[var(--fly-danger-strong)] lg:col-span-4">
          {erro}
        </p>
      ) : null}
    </form>
  );
}
