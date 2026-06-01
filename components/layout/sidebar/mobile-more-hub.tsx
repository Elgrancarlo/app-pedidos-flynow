import type { CSSProperties, RefObject } from "react";
import { LogOut, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { FlyNowMark } from "./flynow-mark";
import { WORKSPACE_NAV_SECTIONS } from "./nav-config";
import { MobileSheetLink } from "./nav-links";

type MobileMoreHubProps = {
  closeButtonRef: RefObject<HTMLButtonElement | null>;
  dialogId: string;
  isClosing: boolean;
  isLightTheme: boolean;
  isActive: (href: string) => boolean;
  onClose: () => void;
  onToggleTheme: () => void;
  themeActionLabel: string;
  ThemeIcon: LucideIcon;
  titleId: string;
};

function revealStyle(delay: string) {
  return { "--flynow-mobile-more-delay": delay } as CSSProperties;
}

export function MobileMoreHub({
  closeButtonRef,
  dialogId,
  isClosing,
  isLightTheme,
  isActive,
  onClose,
  onToggleTheme,
  themeActionLabel,
  ThemeIcon,
  titleId,
}: MobileMoreHubProps) {
  return (
    <div className="fixed inset-0 z-[60] xl:hidden">
      <button
        type="button"
        aria-label="Fechar navegação"
        className={[
          "flynow-mobile-more-backdrop absolute inset-0 cursor-default bg-black/58 backdrop-blur-[10px]",
          isClosing ? "flynow-mobile-more-backdrop--closing" : "",
        ].join(" ")}
        onClick={onClose}
      />

      <div
        role="dialog"
        id={dialogId}
        aria-modal="true"
        aria-labelledby={titleId}
        className={[
          "flynow-mobile-more-sheet absolute inset-x-0 bottom-0 max-h-[82dvh] overflow-hidden rounded-t-[24px] border border-b-0 border-white/[0.09] bg-[#08090B]/96 shadow-[0_-28px_80px_rgba(0,0,0,0.62),inset_0_1px_0_rgba(255,255,255,0.055)] backdrop-blur-2xl",
          isClosing ? "flynow-mobile-more-sheet--closing" : "",
        ].join(" ")}
      >
        <div className="mx-auto mt-2.5 h-1 w-10 rounded-full bg-white/[0.16]" />

        <div
          className="flynow-mobile-more-reveal flex items-center justify-between gap-3 px-4 pb-3 pt-4"
          style={revealStyle("20ms")}
        >
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-[12px] border border-[var(--fly-brand-border)] bg-[var(--fly-brand-surface)]">
              <FlyNowMark size={28} />
            </span>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase leading-3 tracking-[0.14em] text-[var(--fly-brand-strong)]">
                Workspace
              </p>
              <h2
                id={titleId}
                className="mt-1 truncate text-[17px] font-semibold leading-none text-[var(--fly-text)]"
              >
                Flynow
              </h2>
            </div>
          </div>

          <button
            ref={closeButtonRef}
            type="button"
            aria-label="Fechar"
            onClick={onClose}
            className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-[10px] border border-[var(--fly-border)] bg-[var(--fly-control)] text-[var(--fly-text-muted)] outline-none transition-colors duration-150 hover:border-[var(--fly-border-strong)] hover:bg-[var(--fly-control-hover)] hover:text-[var(--fly-text)] focus-visible:ring-2 focus-visible:ring-[var(--fly-brand-ring)]"
          >
            <X size={17} strokeWidth={2.2} />
          </button>
        </div>

        <div className="max-h-[calc(82dvh-76px)] overflow-y-auto px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
          <div
            className="flynow-mobile-more-reveal border-t border-[var(--fly-border)] py-3"
            style={revealStyle("70ms")}
          >
            <button
              type="button"
              aria-label={themeActionLabel}
              title={themeActionLabel}
              onClick={onToggleTheme}
              className="flex h-10 w-full cursor-pointer items-center gap-3 rounded-[10px] px-2 text-left text-sm font-semibold text-[var(--fly-text-soft)] outline-none transition-colors duration-150 hover:bg-[var(--fly-control)] hover:text-[var(--fly-text)] focus-visible:ring-2 focus-visible:ring-[var(--fly-brand-ring)]"
            >
              <ThemeIcon
                size={17}
                strokeWidth={2.05}
                className="shrink-0 text-[var(--fly-text-muted)]"
              />
              <span className="min-w-0 flex-1 truncate">Tema</span>
              <span className="rounded-full border border-[var(--fly-border)] px-2 py-0.5 text-[11px] font-semibold text-[var(--fly-text-muted)]">
                {isLightTheme ? "Claro" : "Escuro"}
              </span>
            </button>
          </div>

          <div
            className="flynow-mobile-more-reveal border-t border-[var(--fly-border)] py-3"
            style={revealStyle("115ms")}
          >
            <div className="space-y-3">
              {WORKSPACE_NAV_SECTIONS.map((section) => (
                <section key={section.label}>
                  <p className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--fly-text-dim)]">
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
                        onClick={onClose}
                      />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </div>

          <div
            className="flynow-mobile-more-reveal border-t border-[var(--fly-border)] py-3"
            style={revealStyle("160ms")}
          >
            <div className="flex h-12 items-center gap-3 rounded-[12px] px-2 transition-colors duration-150 hover:bg-[var(--fly-control)]">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[var(--fly-control-solid)] text-xs font-semibold text-[var(--fly-brand-strong)] ring-1 ring-[var(--fly-border)]">
                AF
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-[var(--fly-text)]">
                  Admin
                </p>
                <p className="text-xs font-medium text-[var(--fly-text-muted)]">
                  Online
                </p>
              </div>
              <button
                type="button"
                aria-label="Sair"
                className="flex size-9 cursor-pointer items-center justify-center rounded-[10px] text-[var(--fly-text-muted)] outline-none transition-colors duration-150 hover:bg-[var(--fly-control)] hover:text-[var(--fly-text)] focus-visible:ring-2 focus-visible:ring-[var(--fly-brand-ring)]"
              >
                <LogOut size={16} strokeWidth={2.1} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
