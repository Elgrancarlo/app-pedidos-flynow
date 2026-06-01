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
  ChartNoAxesCombined,
  Funnel,
  Goal,
  TrendingUp,
  LogOut,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/dashboard",     label: "Dashboard",     Icone: LayoutDashboard },
  { href: "/pedidos",       label: "Pedidos",        Icone: ShoppingCart },
  { href: "/carrinhos",     label: "Carrinhos",      Icone: Boxes },
  { href: "/financeiro",    label: "Financeiro",     Icone: DollarSign },
  { href: "/estoque",       label: "Estoque",        Icone: Package },
  { href: "/analytics",     label: "Analytics",      Icone: ChartNoAxesCombined },
  { href: "/analytics/funil", label: "Funil",        Icone: Funnel },
  { href: "/analytics/upsells", label: "Upsells",    Icone: TrendingUp },
  { href: "/analytics/canais", label: "Canais",      Icone: Goal },
  { href: "/configuracoes", label: "Configurações",  Icone: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-60 shrink-0 flex flex-col min-h-screen bg-gray-900 border-r border-gray-800">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-gray-800">
        <span className="text-white font-bold text-lg tracking-tight">Flynow</span>
        <p className="text-gray-500 text-xs mt-0.5 font-medium">Order System</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        <p className="px-3 text-[10px] font-semibold text-gray-600 uppercase tracking-widest mb-2">
          Menu
        </p>
        {NAV_ITEMS.map(({ href, label, Icone }) => {
          const ativo =
            pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={[
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                ativo
                  ? "bg-indigo-600 text-white"
                  : "text-gray-400 hover:bg-gray-800 hover:text-white",
              ].join(" ")}
            >
              <Icone size={16} strokeWidth={2} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Footer / Usuário */}
      <div className="px-3 py-4 border-t border-gray-800">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-800 transition-colors">
          <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
            AF
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-white text-sm font-medium truncate">Admin</p>
            <p className="text-gray-500 text-xs">ADMIN</p>
          </div>
          <LogOut size={14} className="text-gray-600 shrink-0" />
        </div>
      </div>
    </aside>
  );
}
