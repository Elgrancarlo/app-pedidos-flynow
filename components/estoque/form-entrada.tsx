"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { SystemSelect } from "@/components/workspace/system-select";

interface FormEntradaProps {
  grupos: string[];
}

const fieldShell =
  "group min-w-0 border-b border-[var(--fly-divider)] pb-1 transition-[border-color,box-shadow] duration-150 hover:border-[var(--fly-border-strong)] focus-within:border-[var(--fly-brand-border)] focus-within:shadow-[0_1px_0_var(--fly-brand-border)]";
const fieldLabel =
  "text-[10px] font-semibold uppercase leading-4 text-[var(--fly-text-dim)]";
const inputClass =
  "h-7 w-full min-w-0 bg-transparent text-[13px] font-semibold text-[var(--fly-text)] outline-none placeholder:text-[var(--fly-text-dim)]";
const selectTriggerClass =
  "h-7 rounded-none border-0 bg-transparent px-0 text-[13px] font-semibold text-[var(--fly-text)] shadow-none hover:border-transparent hover:bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 data-[state=open]:border-transparent data-[state=open]:bg-transparent";

export default function FormEntrada({ grupos }: FormEntradaProps) {
  const router = useRouter();
  const [grupo, setGrupo] = useState("");
  const [novoGrupo, setNovoGrupo] = useState("");
  const [qtd, setQtd] = useState("");
  const [obs, setObs] = useState("");
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");

  const grupoFinal = grupo === "__novo__" ? novoGrupo.trim() : grupo;
  const grupoOptions = [
    { value: "", label: "Selecionar produto..." },
    ...grupos.map((g) => ({ value: g, label: g })),
    { value: "__novo__", label: "+ Novo produto" },
  ];

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
      className="grid gap-x-4 gap-y-3 md:grid-cols-[minmax(0,1fr)_92px] 2xl:grid-cols-[minmax(220px,1fr)_92px_minmax(220px,1fr)_auto] 2xl:items-end"
    >
      <div className={fieldShell}>
        <label className={fieldLabel}>Produto</label>
        <SystemSelect
          ariaLabel="Selecionar produto"
          value={grupo}
          onValueChange={setGrupo}
          options={grupoOptions}
          placeholder="Selecionar produto..."
          triggerClassName={selectTriggerClass}
        />
      </div>

      <div className={fieldShell}>
        <label className={fieldLabel}>Qtd potes</label>
        <input
          type="number"
          value={qtd}
          onChange={(e) => setQtd(e.target.value)}
          min="1"
          placeholder="0"
          className={inputClass}
          required
        />
      </div>

      <div className="group min-w-0 border-b border-[var(--fly-divider)] pb-1 transition-[border-color,box-shadow] duration-150 hover:border-[var(--fly-border-strong)] focus-within:border-[var(--fly-brand-border)] focus-within:shadow-[0_1px_0_var(--fly-brand-border)] md:col-span-2 2xl:col-span-1">
        <label className={fieldLabel}>Observação</label>
        <input
          type="text"
          value={obs}
          onChange={(e) => setObs(e.target.value)}
          placeholder="Ex: NF 12345"
          className={inputClass}
        />
      </div>

      <div className="flex min-w-0 items-end justify-end md:col-span-2 2xl:col-span-1">
        <button
          type="submit"
          aria-label="Registrar entrada de estoque"
          disabled={loading}
          className="inline-flex h-7 w-full cursor-pointer items-center justify-center p-0 text-xs font-semibold leading-5 text-[var(--fly-brand-strong)] underline-offset-4 outline-none transition-[color,text-decoration-color,opacity] duration-150 hover:underline hover:decoration-[var(--fly-brand-strong)] focus-visible:rounded-[4px] focus-visible:ring-2 focus-visible:ring-[var(--fly-brand-ring)] disabled:cursor-not-allowed disabled:text-[var(--fly-text-muted)] disabled:no-underline disabled:opacity-60 sm:w-auto"
        >
          {loading ? "Salvando..." : "Registrar entrada"}
        </button>
      </div>

      {grupo === "__novo__" && (
        <div className={`${fieldShell} md:col-span-2 2xl:col-span-4`}>
          <label className={fieldLabel}>Novo produto</label>
          <input
            type="text"
            value={novoGrupo}
            onChange={(e) => setNovoGrupo(e.target.value)}
            placeholder="Ex: Glico Reset"
            className={inputClass}
            required
          />
        </div>
      )}

      {erro ? (
        <p className="text-xs font-medium text-[var(--fly-danger-strong)] md:col-span-2 2xl:col-span-4">
          {erro}
        </p>
      ) : null}
    </form>
  );
}
