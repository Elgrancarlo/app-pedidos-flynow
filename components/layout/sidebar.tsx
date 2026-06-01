"use client";

import type { CSSProperties } from "react";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  Box,
  ChevronDown,
  ChartNoAxesColumnIncreasing,
  ChartSpline,
  Funnel,
  Inbox,
  LogOut,
  Menu,
  MoreHorizontal,
  Moon,
  Plus,
  Radio,
  Search,
  ShoppingCart,
  SlidersHorizontal,
  Sun,
  TrendingUp,
  X,
} from "lucide-react";
import { useDashboardTheme } from "./theme-provider";

const PRIMARY_NAV = [
  { href: "/dashboard", label: "Dashboard", Icone: Activity },
  { href: "/pedidos", label: "Pedidos", Icone: Inbox },
  { href: "/carrinhos", label: "Carrinhos", Icone: ShoppingCart },
  { href: "/financeiro", label: "Financeiro", Icone: ChartSpline },
];

const WORKSPACE_NAV_SECTIONS = [
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

const WORKSPACE_NAV = WORKSPACE_NAV_SECTIONS.flatMap(({ items }) => items);

const MOBILE_NAV = [
  { href: "/pedidos", label: "Pedidos", Icone: Inbox },
  { href: "/carrinhos", label: "Carrinhos", Icone: ShoppingCart },
  { href: "/dashboard", label: "Dashboard", Icone: Activity, featured: true },
  { href: "/financeiro", label: "Financeiro", Icone: ChartSpline },
];

const MOBILE_MORE_SHEET_EXIT_MS = 240;

function FlyNowMark() {
  return (
    <svg
      aria-hidden="true"
      width="32"
      height="32"
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="shrink-0 text-[var(--fly-brand)]"
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
      <rect x="27" y="50" width="10" height="4" rx="1" fill="var(--fly-brand-shadow)" />
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

function MobileNavLink({
  href,
  label,
  Icone,
  ativo,
  featured = false,
}: {
  href: string;
  label: string;
  Icone: LucideIcon;
  ativo: boolean;
  featured?: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={ativo ? "page" : undefined}
      className={[
        "relative flex min-w-0 flex-col items-center justify-center gap-1 rounded-[8px] px-1 text-[10px] font-semibold outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-[#D6A84F]/25",
        featured ? "h-16 -translate-y-2" : "h-14",
        ativo || featured
          ? "text-[#F5F2EA]"
          : "text-[#858A94] hover:bg-[#14161A] hover:text-[#E8E9EC]",
        ativo && !featured ? "bg-[#17181B]" : "",
      ].join(" ")}
    >
      {ativo ? (
        <span
          aria-hidden="true"
          className="absolute left-1/2 top-1 h-0.5 w-5 -translate-x-1/2 rounded-full bg-[#D6A84F]"
        />
      ) : null}
      <span
        className={[
          "flex items-center justify-center transition-colors duration-150",
          featured
            ? [
                "size-10 rounded-[12px] border",
                ativo
                  ? "border-[#D6A84F]/38 bg-[#1A1710] shadow-[0_8px_22px_rgba(214,168,79,0.1),inset_0_1px_0_rgba(255,255,255,0.055)]"
                  : "border-white/[0.08] bg-[#111318] shadow-[0_8px_20px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.035)]",
              ].join(" ")
            : "",
        ].join(" ")}
      >
        <Icone
          size={featured ? 19 : 18}
          strokeWidth={2.1}
          className={[
            "shrink-0 transition-colors duration-150",
            ativo || featured ? "text-[#D6A84F]" : "text-[#747882]",
          ].join(" ")}
        />
      </span>
      <span
        className={[
          "block w-max max-w-[64px] truncate leading-none",
        ].join(" ")}
      >
        {label}
      </span>
    </Link>
  );
}

function MobileSheetLink({
  href,
  label,
  Icone,
  ativo,
  onClick,
}: {
  href: string;
  label: string;
  Icone: LucideIcon;
  ativo: boolean;
  onClick: () => void;
}) {
  return (
    <Link
      href={href}
      aria-current={ativo ? "page" : undefined}
      onClick={onClick}
      className={[
        "group flex h-11 items-center gap-3 rounded-[10px] px-2.5 text-sm font-semibold outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-[#D6A84F]/25",
        ativo
          ? "bg-[#17181B] text-[#F5F2EA] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
          : "text-[#A3A6AE] hover:bg-[#151619] hover:text-[#E8E9EC]",
      ].join(" ")}
    >
      <span
        className={[
          "flex size-8 shrink-0 items-center justify-center rounded-[8px] border transition-colors duration-150",
          ativo
            ? "border-[#D6A84F]/22 bg-[#151208] text-[#D6A84F]"
            : "border-white/[0.06] bg-white/[0.025] text-[#747882] group-hover:border-white/[0.1] group-hover:text-[#AEB2BB]",
        ].join(" ")}
      >
        <Icone size={17} strokeWidth={2.1} />
      </span>
      <span className="truncate">{label}</span>
    </Link>
  );
}

export default function Sidebar() {
  const pathname = usePathname();
  const { theme, toggleTheme } = useDashboardTheme();
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
  const moreSheetDialogId = useId();
  const moreSheetTitleId = useId();
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const previousPathnameRef = useRef(pathname);
  const mobileMoreCloseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const [isMobileMoreMounted, setIsMobileMoreMounted] = useState(false);
  const [isMobileMoreOpen, setIsMobileMoreOpen] = useState(false);
  const [isMobileMoreClosing, setIsMobileMoreClosing] = useState(false);
  const openMobileMore = useCallback(() => {
    if (mobileMoreCloseTimeoutRef.current) {
      clearTimeout(mobileMoreCloseTimeoutRef.current);
      mobileMoreCloseTimeoutRef.current = null;
    }

    setIsMobileMoreMounted(true);
    setIsMobileMoreClosing(false);
    setIsMobileMoreOpen(true);
  }, []);
  const closeMobileMore = useCallback(() => {
    setIsMobileMoreOpen(false);
    setIsMobileMoreClosing(true);
  }, []);
  const toggleThemeFromMobileMore = useCallback(() => {
    toggleTheme();
    closeMobileMore();
  }, [closeMobileMore, toggleTheme]);
  const isMoreActive = WORKSPACE_NAV.some(({ href }) => isActive(href));
  const isMoreButtonActive =
    isMoreActive || isMobileMoreOpen || isMobileMoreMounted;
  const isLightTheme = theme === "light";
  const ThemeIcon = isLightTheme ? Moon : Sun;
  const themeActionLabel = isLightTheme
    ? "Ativar tema escuro"
    : "Ativar tema claro";

  useEffect(() => {
    if (previousPathnameRef.current !== pathname) {
      previousPathnameRef.current = pathname;
      closeMobileMore();
    }
  }, [closeMobileMore, pathname]);

  useEffect(() => {
    if (!isMobileMoreMounted) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeMobileMore();
      }
    };
    const originalOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);
    closeButtonRef.current?.focus();

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [closeMobileMore, isMobileMoreMounted]);

  useEffect(() => {
    if (!isMobileMoreClosing) {
      return;
    }

    mobileMoreCloseTimeoutRef.current = setTimeout(() => {
      setIsMobileMoreMounted(false);
      setIsMobileMoreClosing(false);
      mobileMoreCloseTimeoutRef.current = null;
    }, MOBILE_MORE_SHEET_EXIT_MS);

    return () => {
      if (mobileMoreCloseTimeoutRef.current) {
        clearTimeout(mobileMoreCloseTimeoutRef.current);
        mobileMoreCloseTimeoutRef.current = null;
      }
    };
  }, [isMobileMoreClosing]);

  useEffect(() => {
    return () => {
      if (mobileMoreCloseTimeoutRef.current) {
        clearTimeout(mobileMoreCloseTimeoutRef.current);
      }
    };
  }, []);

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[var(--sidebar-width)] shrink-0 flex-col overflow-hidden rounded-r-2xl border-r border-[#1C2026] bg-[#0B0C0E] shadow-[10px_0_30px_rgba(0,0,0,0.18)] xl:flex">
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
                  color: "var(--fly-text)",
                  fontFamily: "var(--font-dm-sans), sans-serif",
                  fontSize: "20px",
                  fontWeight: 700,
                  letterSpacing: "-0.2px",
                }}
              >
                Flynow
              </span>
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
              <button
                type="button"
                aria-label={themeActionLabel}
                title={themeActionLabel}
                onClick={toggleTheme}
                className="flex size-7 cursor-pointer items-center justify-center rounded-md text-[var(--fly-text-muted)] outline-none transition-colors duration-150 hover:bg-[var(--fly-control-hover)] hover:text-[var(--fly-text-soft)] focus-visible:ring-2 focus-visible:ring-[var(--fly-brand-ring)]"
              >
                <ThemeIcon size={15} strokeWidth={2.2} />
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
          className="min-h-0 flex-1 overflow-y-auto px-2.5 py-1.5"
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

          <div className="mt-4">
            <button
              type="button"
              className="mb-1 flex h-7 w-full cursor-pointer items-center justify-between rounded-lg px-3 text-sm font-semibold text-[#666B75] outline-none transition-colors duration-150 hover:text-[#A3A6AE] focus-visible:ring-2 focus-visible:ring-[#D6A84F]/25"
            >
              <span>Workspace</span>
              <ChevronDown size={14} strokeWidth={2.2} />
            </button>

            <div className="space-y-0.5">
              {WORKSPACE_NAV_SECTIONS.map((section) => (
                <section key={section.label}>
                  <p className="px-3 pb-0.5 text-[9px] font-semibold uppercase leading-3 tracking-[0.14em] text-[#565B65]">
                    {section.label}
                  </p>
                  <div className="space-y-1">
                    {section.items.map(({ href, label, Icone }) => (
                      <SidebarLink
                        key={href}
                        href={href}
                        label={label}
                        Icone={Icone}
                        ativo={isActive(href)}
                      />
                    ))}
                  </div>
                </section>
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

      {isMobileMoreMounted ? (
        <div className="fixed inset-0 z-[60] xl:hidden">
          <button
            type="button"
            aria-label="Fechar navegação"
            className={[
              "flynow-mobile-more-backdrop absolute inset-0 cursor-default bg-black/58 backdrop-blur-[10px]",
              isMobileMoreClosing
                ? "flynow-mobile-more-backdrop--closing"
                : "",
            ].join(" ")}
            onClick={closeMobileMore}
          />

          <div
            role="dialog"
            id={moreSheetDialogId}
            aria-modal="true"
            aria-labelledby={moreSheetTitleId}
            className={[
              "flynow-mobile-more-sheet absolute inset-x-0 bottom-0 max-h-[82dvh] overflow-hidden rounded-t-[24px] border border-b-0 border-white/[0.09] bg-[#08090B]/96 shadow-[0_-28px_80px_rgba(0,0,0,0.62),inset_0_1px_0_rgba(255,255,255,0.055)] backdrop-blur-2xl",
              isMobileMoreClosing ? "flynow-mobile-more-sheet--closing" : "",
            ].join(" ")}
          >
            <div className="mx-auto mt-2.5 h-1 w-10 rounded-full bg-white/[0.16]" />

            <div
              className="flynow-mobile-more-reveal flex items-start justify-between gap-3 px-4 pb-3 pt-4"
              style={
                { "--flynow-mobile-more-delay": "20ms" } as CSSProperties
              }
            >
              <div className="min-w-0">
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#D6A84F]">
                  Workspace
                </p>
                <h2
                  id={moreSheetTitleId}
                  className="truncate text-[17px] font-semibold leading-none text-[#F5F2EA]"
                >
                  Menu Flynow
                </h2>
                <p className="mt-2 max-w-[28ch] text-[13px] leading-5 text-[#858A94]">
                  Atalhos da operação, preferências e sessão.
                </p>
              </div>

              <button
                ref={closeButtonRef}
                type="button"
                aria-label="Fechar"
                onClick={closeMobileMore}
                className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-[10px] border border-white/[0.07] bg-white/[0.035] text-[#A3A6AE] outline-none transition-colors duration-150 hover:border-white/[0.12] hover:bg-white/[0.055] hover:text-[#F5F2EA] focus-visible:ring-2 focus-visible:ring-[#D6A84F]/25"
              >
                <X size={17} strokeWidth={2.2} />
              </button>
            </div>

            <div className="max-h-[calc(82dvh-116px)] overflow-y-auto px-3 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
              <div
                className="flynow-mobile-more-reveal rounded-[16px] border border-white/[0.065] bg-white/[0.025] p-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.035)]"
                style={
                  { "--flynow-mobile-more-delay": "70ms" } as CSSProperties
                }
              >
                <p className="px-1 pb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#666B75]">
                  Ações rápidas
                </p>
                <Link
                  href="/pedidos"
                  onClick={closeMobileMore}
                  className="flex h-12 items-center justify-center gap-2 rounded-[12px] border border-[#D6A84F]/24 bg-[#151208] px-3 text-sm font-semibold text-[#F5F2EA] outline-none transition-colors duration-150 hover:border-[#D6A84F]/38 hover:bg-[#1A160C] focus-visible:ring-2 focus-visible:ring-[#D6A84F]/25"
                >
                  <Plus size={16} strokeWidth={2.3} />
                  <span>Criar pedido</span>
                </Link>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    className="flex h-11 cursor-pointer items-center justify-center gap-2 rounded-[11px] border border-white/[0.07] bg-[#0D0F12] px-3 text-sm font-semibold text-[#DADDE2] outline-none transition-colors duration-150 hover:border-white/[0.12] hover:bg-[#151619] focus-visible:ring-2 focus-visible:ring-[#D6A84F]/25"
                  >
                    <Search size={16} strokeWidth={2.2} />
                    <span>Buscar</span>
                  </button>
                  <button
                    type="button"
                    aria-label={themeActionLabel}
                    title={themeActionLabel}
                    onClick={toggleThemeFromMobileMore}
                    className="flex h-11 cursor-pointer items-center justify-center gap-2 rounded-[11px] border border-[var(--fly-border)] bg-[var(--fly-control)] px-3 text-sm font-semibold text-[var(--fly-text-soft)] outline-none transition-colors duration-150 hover:border-[var(--fly-border-strong)] hover:bg-[var(--fly-control-hover)] hover:text-[var(--fly-text)] focus-visible:ring-2 focus-visible:ring-[var(--fly-brand-ring)]"
                  >
                    <ThemeIcon size={16} strokeWidth={2.2} />
                    <span>Tema</span>
                  </button>
                </div>
              </div>

              <div
                className="flynow-mobile-more-reveal mt-3 rounded-[16px] border border-white/[0.065] bg-white/[0.018] p-2.5"
                style={
                  { "--flynow-mobile-more-delay": "120ms" } as CSSProperties
                }
              >
                <p className="px-1 pb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#666B75]">
                  Workspace
                </p>
                <div className="space-y-2">
                  {WORKSPACE_NAV_SECTIONS.map((section) => (
                    <section key={section.label}>
                      <p className="px-1 pb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#666B75]">
                        {section.label}
                      </p>
                      <div className="space-y-1">
                        {section.items.map(({ href, label, Icone }) => (
                          <MobileSheetLink
                            key={href}
                            href={href}
                            label={label}
                            Icone={Icone}
                            ativo={isActive(href)}
                            onClick={closeMobileMore}
                          />
                        ))}
                      </div>
                    </section>
                  ))}
                </div>
              </div>

              <div
                className="flynow-mobile-more-reveal mt-3 rounded-[16px] border border-white/[0.065] bg-white/[0.018] p-2.5"
                style={
                  { "--flynow-mobile-more-delay": "170ms" } as CSSProperties
                }
              >
                <p className="px-1 pb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#666B75]">
                  Sessão
                </p>
                <div className="flex h-14 items-center gap-3 rounded-[12px] bg-[#0D0F12] px-3 ring-1 ring-white/[0.055]">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#151619] text-xs font-semibold text-[#D6A84F] ring-1 ring-[#242932]">
                    AF
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-[#E8E9EC]">
                      Admin
                    </p>
                    <p className="text-xs font-medium text-[#6B707A]">Online</p>
                  </div>
                  <button
                    type="button"
                    aria-label="Sair"
                    className="flex size-9 cursor-pointer items-center justify-center rounded-[10px] text-[#6B707A] outline-none transition-colors duration-150 hover:bg-white/[0.045] hover:text-[#DADDE2] focus-visible:ring-2 focus-visible:ring-[#D6A84F]/25"
                  >
                    <LogOut size={16} strokeWidth={2.1} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <nav
        aria-label="Navegação mobile"
        className="fixed inset-x-0 bottom-0 z-50 border-t border-white/[0.07] bg-[#08090B]/92 px-2 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] pt-2 shadow-[0_-18px_44px_rgba(0,0,0,0.42),inset_0_1px_0_rgba(255,255,255,0.035)] backdrop-blur-2xl xl:hidden"
      >
        <div className="mx-auto grid max-w-[520px] grid-cols-5 items-end gap-1 px-8">
          {MOBILE_NAV.map(({ href, label, Icone, featured }) => (
            <MobileNavLink
              key={href}
              href={href}
              label={label}
              Icone={Icone}
              ativo={isActive(href)}
              featured={featured}
            />
          ))}

          <button
            type="button"
            aria-label="Abrir menu"
            aria-controls={moreSheetDialogId}
            aria-expanded={isMobileMoreOpen}
            data-active={isMoreButtonActive ? "true" : "false"}
            onClick={openMobileMore}
            className={[
              "flynow-mobile-more-trigger relative flex h-14 min-w-0 cursor-pointer flex-col items-center justify-center gap-1 rounded-[8px] px-1 text-[10px] font-semibold outline-none transition-[background-color,color,transform] duration-200 ease-out active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-[#D6A84F]/25",
              isMoreButtonActive
                ? "bg-[#17181B]/80 text-[#F5F2EA]"
                : "text-[#858A94] hover:bg-[#14161A] hover:text-[#E8E9EC]",
            ].join(" ")}
          >
            {isMoreButtonActive ? (
              <span
                aria-hidden="true"
                className="absolute left-1/2 top-1 h-0.5 w-5 -translate-x-1/2 rounded-full bg-[#D6A84F]"
              />
            ) : null}
            <Menu
              size={19}
              strokeWidth={2.1}
              className={[
                "shrink-0 transition-colors duration-150",
                isMoreButtonActive ? "text-[#D6A84F]" : "text-[#747882]",
              ].join(" ")}
            />
            <span className="block w-max max-w-[64px] truncate leading-none">
              Menu
            </span>
          </button>
        </div>
      </nav>
    </>
  );
}
