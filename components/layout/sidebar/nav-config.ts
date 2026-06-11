import type { LucideIcon } from "lucide-react";
import {
  Activity,
  Box,
  ChartNoAxesColumnIncreasing,
  ChartSpline,
  Funnel,
  Inbox,
  Radio,
  ShoppingCart,
  SlidersHorizontal,
  Target,
  TrendingUp,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  Icone: LucideIcon;
  featured?: boolean;
};

export type NavSection = {
  label: string;
  items: NavItem[];
};

export const PRIMARY_NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", Icone: Activity },
  { href: "/pedidos", label: "Pedidos", Icone: Inbox },
  { href: "/carrinhos", label: "Carrinhos", Icone: ShoppingCart },
  { href: "/financeiro", label: "Financeiro", Icone: ChartSpline },
];

export const WORKSPACE_NAV_SECTIONS: NavSection[] = [
  {
    label: "Operação",
    items: [{ href: "/estoque", label: "Estoque", Icone: Box }],
  },
  {
    label: "Performance",
    items: [
      {
        href: "/analytics",
        label: "Analytics",
        Icone: ChartNoAxesColumnIncreasing,
      },
      { href: "/metas", label: "Metas", Icone: Target },
      { href: "/funil", label: "Funil", Icone: Funnel },
      { href: "/upsells", label: "Upsells", Icone: TrendingUp },
      { href: "/canais", label: "Canais", Icone: Radio },
    ],
  },
  {
    label: "Sistema",
    items: [
      {
        href: "/configuracoes",
        label: "Configurações",
        Icone: SlidersHorizontal,
      },
    ],
  },
];

export const WORKSPACE_NAV = WORKSPACE_NAV_SECTIONS.flatMap(
  ({ items }) => items
);

export const MOBILE_NAV: NavItem[] = [
  { href: "/pedidos", label: "Pedidos", Icone: Inbox },
  { href: "/carrinhos", label: "Carrinhos", Icone: ShoppingCart },
  { href: "/dashboard", label: "Dashboard", Icone: Activity, featured: true },
  { href: "/financeiro", label: "Financeiro", Icone: ChartSpline },
];

export const MOBILE_MORE_SHEET_EXIT_MS = 240;
