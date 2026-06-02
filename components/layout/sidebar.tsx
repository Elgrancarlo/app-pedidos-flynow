"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Moon, Sun } from "lucide-react";

import { useDashboardTheme } from "./theme-provider";
import { DesktopSidebar } from "./sidebar/desktop-sidebar";
import { MobileMoreHub } from "./sidebar/mobile-more-hub";
import { MobileNav } from "./sidebar/mobile-nav";
import {
  MOBILE_MORE_SHEET_EXIT_MS,
  WORKSPACE_NAV,
} from "./sidebar/nav-config";

export default function Sidebar() {
  const pathname = usePathname();
  const { theme, toggleTheme } = useDashboardTheme();
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

  const isActive = useCallback(
    (href: string) => pathname === href || pathname.startsWith(`${href}/`),
    [pathname]
  );

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
      <DesktopSidebar
        isActive={isActive}
        onToggleTheme={toggleTheme}
        themeActionLabel={themeActionLabel}
        ThemeIcon={ThemeIcon}
      />

      {isMobileMoreMounted ? (
        <MobileMoreHub
          closeButtonRef={closeButtonRef}
          dialogId={moreSheetDialogId}
          isClosing={isMobileMoreClosing}
          isLightTheme={isLightTheme}
          isActive={isActive}
          onClose={closeMobileMore}
          onToggleTheme={toggleThemeFromMobileMore}
          themeActionLabel={themeActionLabel}
          titleId={moreSheetTitleId}
        />
      ) : null}

      <MobileNav
        isActive={isActive}
        isMoreButtonActive={isMoreButtonActive}
        isMobileMoreOpen={isMobileMoreOpen}
        moreSheetDialogId={moreSheetDialogId}
        onOpenMobileMore={openMobileMore}
      />
    </>
  );
}
