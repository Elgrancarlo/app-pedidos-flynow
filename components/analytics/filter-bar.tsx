"use client";

import { useState } from "react";

interface AnalyticsFilterBarProps {
  basePath: string;
  startDate: string;
  endDate: string;
  products?: string[];
  channels?: Array<{ value: string; label: string }>;
  selectedProduct?: string | null;
  selectedChannel?: string | null;
}

export default function AnalyticsFilterBar({
  basePath,
  startDate,
  endDate,
  products = [],
  channels = [],
  selectedProduct,
  selectedChannel,
}: AnalyticsFilterBarProps) {
  const [start, setStart] = useState(startDate);
  const [end, setEnd] = useState(endDate);
  const [product, setProduct] = useState(selectedProduct ?? "");
  const [channel, setChannel] = useState(selectedChannel ?? "");

  function apply() {
    const params = new URLSearchParams({
      startDate: start,
      endDate: end,
    });
    if (product) params.set("product", product);
    if (channel) params.set("channel", channel);
    window.location.href = `${basePath}?${params.toString()}`;
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-3">
      <span className="text-sm text-gray-500">Período:</span>
      <input
        type="date"
        value={start}
        onChange={(event) => setStart(event.target.value)}
        className="rounded-md border border-gray-300 px-2 py-1 text-sm"
      />
      <span className="text-gray-400">→</span>
      <input
        type="date"
        value={end}
        onChange={(event) => setEnd(event.target.value)}
        className="rounded-md border border-gray-300 px-2 py-1 text-sm"
      />

      {products.length > 0 ? (
        <select
          value={product}
          onChange={(event) => setProduct(event.target.value)}
          className="ml-2 rounded-md border border-gray-300 px-2 py-1 text-sm"
        >
          <option value="">Todos os produtos</option>
          {products.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      ) : null}

      {channels.length > 0 ? (
        <select
          value={channel}
          onChange={(event) => setChannel(event.target.value)}
          className="rounded-md border border-gray-300 px-2 py-1 text-sm"
        >
          <option value="">Todos os canais</option>
          {channels.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
      ) : null}

      <button
        onClick={apply}
        className="ml-auto rounded-md bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-800"
      >
        Aplicar
      </button>
    </div>
  );
}
