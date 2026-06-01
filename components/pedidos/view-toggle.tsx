"use client";

import { List, Columns } from "lucide-react";

type View = "tabela" | "kanban";

interface ViewToggleProps {
  view: View;
  onChange: (v: View) => void;
}

export default function ViewToggle({ view, onChange }: ViewToggleProps) {
  return (
    <div className="flex items-center bg-gray-100 rounded-lg p-1 gap-1">
      <button
        onClick={() => onChange("tabela")}
        className={[
          "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
          view === "tabela"
            ? "bg-white text-gray-900 shadow-sm"
            : "text-gray-500 hover:text-gray-700",
        ].join(" ")}
      >
        <List size={14} />
        Tabela
      </button>
      <button
        onClick={() => onChange("kanban")}
        className={[
          "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
          view === "kanban"
            ? "bg-white text-gray-900 shadow-sm"
            : "text-gray-500 hover:text-gray-700",
        ].join(" ")}
      >
        <Columns size={14} />
        Kanban
      </button>
    </div>
  );
}
