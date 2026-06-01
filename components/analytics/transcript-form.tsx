"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface TranscriptFormProps {
  defaultDay: string;
  products: string[];
}

const AREA_OPTIONS = [
  "WHATSAPP",
  "RECUPERACAO",
  "REEMBOLSO",
  "SAC",
  "FUNIL",
  "TRAFEGO",
  "OPERACAO",
  "FINANCEIRO",
  "OUTRO",
];

export default function TranscriptForm({ defaultDay, products }: TranscriptFormProps) {
  const router = useRouter();
  const [happenedAt, setHappenedAt] = useState(`${defaultDay}T09:00`);
  const [title, setTitle] = useState("");
  const [area, setArea] = useState("OPERACAO");
  const [participants, setParticipants] = useState("");
  const [relatedProducts, setRelatedProducts] = useState("");
  const [tags, setTags] = useState("");
  const [summary, setSummary] = useState("");
  const [transcript, setTranscript] = useState("");
  const [uploadedBy, setUploadedBy] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");

    if (!title.trim() || !transcript.trim()) {
      setError("Preencha o título e a transcrição.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/analytics/transcripts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          happened_at: happenedAt ? new Date(happenedAt).toISOString() : null,
          title,
          area,
          participants,
          related_products: relatedProducts,
          tags,
          summary: summary || null,
          transcript,
          uploaded_by: uploadedBy || null,
        }),
      });

      const data = await response.json();
      if (!data.ok) throw new Error(data.error ?? "Erro ao salvar transcrição");

      setTitle("");
      setParticipants("");
      setRelatedProducts("");
      setTags("");
      setSummary("");
      setTranscript("");
      setUploadedBy("");
      router.refresh();
    } catch (submitError: unknown) {
      setError(submitError instanceof Error ? submitError.message : "Erro ao salvar transcrição");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-base font-semibold text-gray-900">Registrar transcrição operacional</h2>
        <span className="text-xs text-gray-400">Contexto para IA e alertas</span>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-600">Data e hora</label>
          <input
            type="datetime-local"
            value={happenedAt}
            onChange={(event) => setHappenedAt(event.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-600">Área</label>
          <select
            value={area}
            onChange={(event) => setArea(event.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {AREA_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-600">Participantes</label>
          <input
            type="text"
            value={participants}
            onChange={(event) => setParticipants(event.target.value)}
            placeholder="Carlos, Herberth, Lucas"
            className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-600">Enviado por</label>
          <input
            type="text"
            value={uploadedBy}
            onChange={(event) => setUploadedBy(event.target.value)}
            placeholder="Ex: COO"
            className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="flex flex-col gap-1 md:col-span-2">
          <label className="text-xs font-medium text-gray-600">Título</label>
          <input
            type="text"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Ex: Call sobre queda de recuperação no WhatsApp"
            className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-600">Produtos relacionados</label>
          <input
            list="transcript-products"
            type="text"
            value={relatedProducts}
            onChange={(event) => setRelatedProducts(event.target.value)}
            placeholder="Derma Bloom, Power 66"
            className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <datalist id="transcript-products">
            {products.map((product) => (
              <option key={product} value={product} />
            ))}
          </datalist>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-600">Resumo curto</label>
          <textarea
            value={summary}
            onChange={(event) => setSummary(event.target.value)}
            rows={3}
            placeholder="Resumo executivo da call."
            className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-600">Tags</label>
          <textarea
            value={tags}
            onChange={(event) => setTags(event.target.value)}
            rows={3}
            placeholder="whatsapp, saque, reembolso"
            className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-gray-600">Transcrição</label>
        <textarea
          value={transcript}
          onChange={(event) => setTranscript(event.target.value)}
          rows={8}
          placeholder="Cole aqui a transcrição completa da reunião."
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      <div className="flex items-center justify-between gap-4">
        {error ? <p className="text-sm text-red-600">{error}</p> : <div />}
        <button
          type="submit"
          disabled={loading}
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Salvando..." : "Salvar transcrição"}
        </button>
      </div>
    </form>
  );
}
