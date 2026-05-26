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
  Rocket,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", Icone: LayoutDashboard },
  { href: "/pedidos", label: "Pedidos", Icone: ShoppingCart },
  { href: "/carrinhos", label: "Carrinhos", Icone: Boxes },
  { href: "/financeiro", label: "Financeiro", Icone: DollarSign },
  { href: "/estoque", label: "Estoque", Icone: Package },
  { href: "/configuracoes", label: "Configurações", Icone: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex min-h-screen w-60 shrink-0 flex-col border-r border-[#242932] bg-[#0E1013]">
      <div className="border-b border-[#242932] px-5 py-5">
        <div className="flex items-center gap-3">
          <span className="flex size-8 items-center justify-center rounded-lg border border-[#D6A84F]/25 bg-[#2A2112]/70 text-[#F0C76A]">
            <Rocket size={18} strokeWidth={2.2} />
          </span>
          <div>
            <span className="block text-base font-semibold tracking-tight text-[#F5F2EA]">
              FlyNow
            </span>
            <p className="mt-0.5 text-xs font-medium text-[#7D7A73]">
              Performance System
            </p>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-0.5 px-3 py-4">
        <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-[#55524C]">
          Menu
        </p>
        {NAV_ITEMS.map(({ href, label, Icone }) => {
          const ativo = pathname === href || pathname.startsWith(href + "/");

          return (
            <Link
              key={href}
              href={href}
              className={[
                "flex items-center gap-3 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors duration-150",
                ativo
                  ? "border-[#D6A84F]/25 bg-[#2A2112]/70 text-[#F0C76A]"
                  : "border-transparent text-[#B8B3A7] hover:border-[#242932] hover:bg-[#171B21] hover:text-[#F5F2EA]",
              ].join(" ")}
            >
              <Icone size={16} strokeWidth={2} />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-[#242932] px-3 py-4">
        <div className="flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors duration-150 hover:bg-[#171B21]">
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
