"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  DollarSign,
  Settings,
  Boxes,
  LogOut,
} from "lucide-react";

const NAV_SECTIONS = [
  {
    label: "Visão",
    items: [{ href: "/dashboard", label: "Dashboard", Icone: LayoutDashboard }],
  },
  {
    label: "Operação",
    items: [
      { href: "/pedidos", label: "Pedidos", Icone: ShoppingCart },
      { href: "/carrinhos", label: "Carrinhos", Icone: Boxes },
    ],
  },
  {
    label: "Gestão",
    items: [
      { href: "/financeiro", label: "Financeiro", Icone: DollarSign },
      { href: "/estoque", label: "Estoque", Icone: Package },
    ],
  },
  {
    label: "Sistema",
    items: [
      { href: "/configuracoes", label: "Configurações", Icone: Settings },
    ],
  },
];

function FlyNowMark() {
  return (
    <svg
      aria-hidden="true"
      width="22"
      height="22"
      viewBox="0 0 72 72"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="shrink-0"
    >
      <path
        d="M36 8 C36 8 48 18 48 34 L48 52 L36 46 L24 52 L24 34 C24 18 36 8 36 8 Z"
        fill="#D6A84F"
      />
      <ellipse cx="36" cy="30" rx="5" ry="5" fill="#0E1013" />
      <path
        d="M24 38 L16 44 L20 52 L24 46 Z"
        fill="#9C7430"
      />
      <path
        d="M48 38 L56 44 L52 52 L48 46 Z"
        fill="#9C7430"
      />
      <path
        d="M29 52 Q33 58 36 60 Q39 58 43 52"
        fill="#F0C76A"
        opacity="0.7"
      />
      <path
        d="M32 58 H35 V63 H32 Z"
        fill="#F0C76A"
        opacity="0.45"
      />
      <path
        d="M37 56 H40 V63 H37 Z"
        fill="#F0C76A"
        opacity="0.3"
      />
    </svg>
  );
}

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-30 flex w-[var(--sidebar-width)] shrink-0 flex-col overflow-hidden border-r border-[#242932] bg-[#0E1013]">
      <div className="border-b border-[#242932] px-4 py-4">
        <div className="flex items-center gap-3 rounded-lg border border-transparent px-2 py-1.5">
          <span className="flex size-8 items-center justify-center rounded-md border border-[#D6A84F]/25 bg-[#2A2112]/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
            <FlyNowMark />
          </span>
          <div className="min-w-0">
            <span
              className="block leading-none"
              style={{
                color: "#D6A84F",
                fontFamily: "var(--font-space-grotesk), sans-serif",
                fontSize: "16px",
                fontWeight: 700,
                letterSpacing: "-0.45px",
              }}
            >
              FLYNOW
            </span>
            <p className="mt-0.5 text-xs font-medium text-[#7D7A73]">
              Direct Response Ops
            </p>
          </div>
        </div>
      </div>

      <nav
        aria-label="Navegação principal"
        className="min-h-0 flex-1 overflow-y-auto px-3 py-3"
      >
        <div className="space-y-5">
          {NAV_SECTIONS.map((section) => (
            <div key={section.label}>
              <p className="mb-1.5 px-3 text-[10px] font-medium uppercase tracking-[0.14em] text-[#55524C]">
                {section.label}
              </p>

              <div className="space-y-0.5">
                {section.items.map(({ href, label, Icone }) => {
                  const ativo = pathname === href || pathname.startsWith(href + "/");

                  return (
                    <Link
                      key={href}
                      href={href}
                      aria-current={ativo ? "page" : undefined}
                      className={[
                        "group relative flex h-9 items-center gap-3 rounded-md border px-3 text-sm font-medium outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-[#D6A84F]/35",
                        ativo
                          ? "border-[#303640] bg-[#171B21] text-[#F5F2EA]"
                          : "border-transparent text-[#B8B3A7] hover:border-[#242932] hover:bg-[#171B21] hover:text-[#F5F2EA]",
                      ].join(" ")}
                    >
                      <span
                        aria-hidden="true"
                        className={[
                          "absolute left-0 top-1/2 h-4 -translate-y-1/2 rounded-r-full transition-opacity duration-150",
                          ativo ? "w-0.5 bg-[#D6A84F] opacity-100" : "w-0 opacity-0",
                        ].join(" ")}
                      />
                      <Icone
                        size={16}
                        strokeWidth={2}
                        className={[
                          "shrink-0 transition-colors duration-150",
                          ativo
                            ? "text-[#F0C76A]"
                            : "text-[#7D7A73] group-hover:text-[#B8B3A7]",
                        ].join(" ")}
                      />
                      <span className="truncate">{label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </nav>

      <div className="shrink-0 border-t border-[#242932] px-3 py-4">
        <div className="mb-2 flex items-center justify-between rounded-md border border-[#242932] bg-[#0A0A0B] px-3 py-2">
          <div>
            <p className="text-xs font-medium text-[#B8B3A7]">Sistema</p>
            <p className="mt-0.5 text-[11px] text-[#7D7A73]">Ambiente local</p>
          </div>
          <span className="flex items-center gap-1.5 text-[11px] font-medium text-[#86EFAC]">
            <span className="size-1.5 rounded-full bg-[#4ADE80]" />
            Online
          </span>
        </div>

        <div className="flex items-center gap-3 rounded-md px-3 py-2.5 transition-colors duration-150 hover:bg-[#171B21]">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#171B21] text-xs font-semibold text-[#F0C76A] ring-1 ring-[#D6A84F]/20">
            AF
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-[#F5F2EA]">Admin</p>
            <p className="text-xs text-[#7D7A73]">ADMIN</p>
          </div>
          <LogOut size={14} className="shrink-0 text-[#55524C]" />
        </div>
      </div>
    </aside>
  );
}
