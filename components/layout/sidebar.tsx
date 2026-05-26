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
      width="32"
      height="32"
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="shrink-0 text-[#D6A84F]"
    >
      <path
        d="M32 6 C32 6 42 16 42 34 L42 50 L32 46 L22 50 L22 34 C22 16 32 6 32 6 Z"
        fill="currentColor"
      />
      <path
        d="M22 36 L14 42 L22 46 Z"
        fill="currentColor"
      />
      <path
        d="M42 36 L50 42 L42 46 Z"
        fill="currentColor"
      />
      <rect x="27" y="50" width="10" height="4" rx="1" fill="#9C7430" />
    </svg>
  );
}

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-30 flex w-[var(--sidebar-width)] shrink-0 flex-col overflow-hidden border-r border-[#242932] bg-[#0E1013]">
      <div className="border-b border-[#242932] px-4 py-4">
        <div className="flex h-10 items-center gap-3 px-2">
          <span className="flex size-8 items-center justify-center">
            <FlyNowMark />
          </span>
          <span
            className="block leading-none"
            style={{
              color: "#F5F2EA",
              fontFamily: "var(--font-space-grotesk), sans-serif",
              fontSize: "20px",
              fontWeight: 700,
              letterSpacing: "0.5px",
            }}
          >
            FLYNOW
          </span>
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
