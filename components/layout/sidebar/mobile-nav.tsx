import { Menu } from "lucide-react";

import { MOBILE_NAV } from "./nav-config";
import { MobileNavLink } from "./nav-links";

type MobileNavProps = {
  isActive: (href: string) => boolean;
  isMoreButtonActive: boolean;
  isMobileMoreOpen: boolean;
  moreSheetDialogId: string;
  onOpenMobileMore: () => void;
};

export function MobileNav({
  isActive,
  isMoreButtonActive,
  isMobileMoreOpen,
  moreSheetDialogId,
  onOpenMobileMore,
}: MobileNavProps) {
  return (
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
          onClick={onOpenMobileMore}
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
  );
}
