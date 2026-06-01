import { LogOut } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { FlyNowMark } from "./flynow-mark";
import { PRIMARY_NAV, WORKSPACE_NAV_SECTIONS } from "./nav-config";
import { SidebarLink } from "./nav-links";

type DesktopSidebarProps = {
  isActive: (href: string) => boolean;
  onToggleTheme: () => void;
  themeActionLabel: string;
  ThemeIcon: LucideIcon;
};

export function DesktopSidebar({
  isActive,
  onToggleTheme,
  themeActionLabel,
  ThemeIcon,
}: DesktopSidebarProps) {
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-[var(--sidebar-width)] shrink-0 flex-col overflow-hidden rounded-r-2xl border-r border-[#1C2026] bg-[#0B0C0E] shadow-[10px_0_30px_rgba(0,0,0,0.18)] xl:flex">
      <div className="px-3 pb-3 pt-4">
        <div className="flex h-11 items-center justify-between gap-2">
          <div className="flex min-w-0 flex-1 items-center gap-2 px-1.5 py-1.5 text-left">
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
          </div>

          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              aria-label={themeActionLabel}
              title={themeActionLabel}
              onClick={onToggleTheme}
              className="flex size-7 cursor-pointer items-center justify-center rounded-md text-[var(--fly-text-muted)] outline-none transition-colors duration-150 hover:bg-[var(--fly-control-hover)] hover:text-[var(--fly-text-soft)] focus-visible:ring-2 focus-visible:ring-[var(--fly-brand-ring)]"
            >
              <ThemeIcon size={15} strokeWidth={2.2} />
            </button>
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

        <div className="mt-5">
          <div className="space-y-3">
            {WORKSPACE_NAV_SECTIONS.map((section) => (
              <section key={section.label}>
                <p className="px-3 pb-1 text-[9px] font-semibold uppercase leading-3 tracking-[0.14em] text-[#565B65]">
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
          </div>
        </div>
      </nav>

      <div className="shrink-0 px-3 pb-4 pt-2">
        <div className="flex h-12 items-center gap-3 rounded-xl px-3 transition-colors duration-150 hover:bg-[#151619]">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#151619] text-xs font-semibold text-[#D6A84F] ring-1 ring-[#242932]">
            AF
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-[#E8E9EC]">
              Admin
            </p>
            <p className="text-xs font-medium text-[#6B707A]">Online</p>
          </div>
          <LogOut size={15} className="shrink-0 text-[#5E636D]" />
        </div>
      </div>
    </aside>
  );
}
