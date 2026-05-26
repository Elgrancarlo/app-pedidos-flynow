"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  Box,
  ChevronDown,
  ChartSpline,
  Inbox,
  LogOut,
  MoreHorizontal,
  Plus,
  Search,
  ShoppingCart,
  SlidersHorizontal,
} from "lucide-react";

const PRIMARY_NAV = [
  { href: "/dashboard", label: "Dashboard", Icone: Activity },
  { href: "/pedidos", label: "Pedidos", Icone: Inbox },
  { href: "/carrinhos", label: "Carrinhos", Icone: ShoppingCart },
  { href: "/financeiro", label: "Financeiro", Icone: ChartSpline },
];

const WORKSPACE_NAV = [
  { href: "/estoque", label: "Estoque", Icone: Box },
  { href: "/configuracoes", label: "Configurações", Icone: SlidersHorizontal },
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

function SidebarLink({
  href,
  label,
  Icone,
  ativo,
}: {
  href: string;
  label: string;
  Icone: LucideIcon;
  ativo: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={ativo ? "page" : undefined}
      className={[
        "group flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-semibold outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-[#D6A84F]/25",
        ativo
          ? "bg-[#17181B] text-[#F5F2EA]"
          : "text-[#A3A6AE] hover:bg-[#151619] hover:text-[#E8E9EC]",
      ].join(" ")}
    >
      <Icone
        size={18}
        strokeWidth={2}
        className={[
          "shrink-0 transition-colors duration-150",
          ativo ? "text-[#D6A84F]" : "text-[#747882] group-hover:text-[#AEB2BB]",
        ].join(" ")}
      />
      <span className="truncate">{label}</span>
    </Link>
  );
}

export default function Sidebar() {
  const pathname = usePathname();
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <aside className="fixed inset-y-0 left-0 z-30 flex w-[var(--sidebar-width)] shrink-0 flex-col overflow-hidden rounded-r-2xl border-r border-[#1C2026] bg-[#0B0C0E] shadow-[10px_0_30px_rgba(0,0,0,0.18)]">
      <div className="px-3 pb-3 pt-4">
        <div className="flex h-11 items-center justify-between gap-2">
          <button
            type="button"
            title="Workspace Flynow"
            className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 rounded-xl px-1.5 py-1.5 text-left outline-none transition-colors duration-150 hover:bg-[#151619] focus-visible:ring-2 focus-visible:ring-[#D6A84F]/25"
          >
            <span className="flex size-8 items-center justify-center">
              <FlyNowMark />
            </span>
            <span
              className="block shrink-0 whitespace-nowrap leading-none"
              style={{
                color: "#F5F2EA",
                fontFamily: "var(--font-dm-sans), sans-serif",
                fontSize: "20px",
                fontWeight: 700,
                letterSpacing: "-0.2px",
              }}
            >
              Flynow
            </span>
            <ChevronDown size={16} strokeWidth={2.2} className="shrink-0 text-[#5E636D]" />
          </button>

          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              aria-label="Buscar"
              title="Buscar"
              className="flex size-7 cursor-pointer items-center justify-center rounded-md text-[#858A94] outline-none transition-colors duration-150 hover:bg-[#151619] hover:text-[#DADDE2] focus-visible:ring-2 focus-visible:ring-[#D6A84F]/25"
            >
              <Search size={15} strokeWidth={2.2} />
            </button>
            <Link
              href="/pedidos"
              aria-label="Criar pedido"
              title="Criar pedido"
              className="flex size-7 items-center justify-center rounded-md border border-[#242932] bg-[#121418] text-[#DADDE2] outline-none transition-colors duration-150 hover:border-[#343A44] hover:bg-[#171A20] focus-visible:ring-2 focus-visible:ring-[#D6A84F]/25"
            >
              <Plus size={16} strokeWidth={2.3} />
            </Link>
          </div>
        </div>
      </div>

      <nav
        aria-label="Navegação principal"
        className="min-h-0 flex-1 overflow-y-auto px-2.5 py-2"
      >
        <div className="space-y-1">
          {PRIMARY_NAV.map(({ href, label, Icone }) => (
            <SidebarLink
              key={href}
              href={href}
              label={label}
              Icone={Icone}
              ativo={isActive(href)}
            />
          ))}
        </div>

        <div className="mt-7">
          <button
            type="button"
            className="mb-1 flex h-7 w-full cursor-pointer items-center justify-between rounded-lg px-3 text-sm font-semibold text-[#666B75] outline-none transition-colors duration-150 hover:text-[#A3A6AE] focus-visible:ring-2 focus-visible:ring-[#D6A84F]/25"
          >
            <span>Workspace</span>
            <ChevronDown size={14} strokeWidth={2.2} />
          </button>

          <div className="space-y-1">
            {WORKSPACE_NAV.map(({ href, label, Icone }) => (
              <SidebarLink
                key={href}
                href={href}
                label={label}
                Icone={Icone}
                ativo={isActive(href)}
              />
            ))}

            <button
              type="button"
              className="group flex h-10 w-full cursor-pointer items-center gap-3 rounded-lg px-3 text-left text-sm font-semibold text-[#A3A6AE] outline-none transition-colors duration-150 hover:bg-[#151619] hover:text-[#E8E9EC] focus-visible:ring-2 focus-visible:ring-[#D6A84F]/25"
            >
              <MoreHorizontal
                size={18}
                strokeWidth={2}
                className="shrink-0 text-[#747882] transition-colors duration-150 group-hover:text-[#AEB2BB]"
              />
              <span className="truncate">Mais</span>
            </button>
          </div>
        </div>
      </nav>

      <div className="shrink-0 px-3 pb-4 pt-2">
        <div className="flex h-12 items-center gap-3 rounded-xl px-3 transition-colors duration-150 hover:bg-[#151619]">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#151619] text-xs font-semibold text-[#D6A84F] ring-1 ring-[#242932]">
            AF
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-[#E8E9EC]">Admin</p>
            <p className="text-xs font-medium text-[#6B707A]">Online</p>
          </div>
          <LogOut size={15} className="shrink-0 text-[#5E636D]" />
        </div>
      </div>
    </aside>
  );
}
