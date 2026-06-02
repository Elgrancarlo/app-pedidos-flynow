"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { flushSync } from "react-dom";

type DashboardTheme = "dark" | "light";

type DashboardThemeContextValue = {
  theme: DashboardTheme;
  toggleTheme: () => void;
};

const THEME_STORAGE_KEY = "flynow-dashboard-theme";
const THEME_TRANSITION_MS = 420;
const DashboardThemeContext =
  createContext<DashboardThemeContextValue | null>(null);

export function DashboardThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<DashboardTheme>("dark");
  const [hasLoadedTheme, setHasLoadedTheme] = useState(false);
  const [isThemeTransitioning, setIsThemeTransitioning] = useState(false);
  const themeTransitionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const themeTransitionFrameRef = useRef<number | null>(null);

  const finishThemeTransition = useCallback(() => {
    delete document.documentElement.dataset.flynowThemeTransitioning;
    setIsThemeTransitioning(false);

    if (themeTransitionTimeoutRef.current) {
      clearTimeout(themeTransitionTimeoutRef.current);
      themeTransitionTimeoutRef.current = null;
    }
  }, []);

  const toggleTheme = useCallback(() => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (themeTransitionTimeoutRef.current) {
      clearTimeout(themeTransitionTimeoutRef.current);
      themeTransitionTimeoutRef.current = null;
    }

    if (themeTransitionFrameRef.current !== null) {
      window.cancelAnimationFrame(themeTransitionFrameRef.current);
      themeTransitionFrameRef.current = null;
    }

    if (prefersReducedMotion) {
      delete document.documentElement.dataset.flynowThemeTransitioning;
      document.documentElement.dataset.flynowTheme = nextTheme;
      setIsThemeTransitioning(false);
      setTheme(nextTheme);
      return;
    }

    document.documentElement.dataset.flynowThemeTransitioning = "true";

    flushSync(() => {
      setIsThemeTransitioning(true);
    });

    themeTransitionFrameRef.current = window.requestAnimationFrame(() => {
      themeTransitionFrameRef.current = null;
      document.documentElement.dataset.flynowTheme = nextTheme;
      setTheme(nextTheme);

      themeTransitionTimeoutRef.current = setTimeout(
        finishThemeTransition,
        THEME_TRANSITION_MS
      );
    });
  }, [finishThemeTransition, theme]);

  useEffect(() => {
    const savedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);

    if (savedTheme === "dark" || savedTheme === "light") {
      setTheme(savedTheme);
    }

    setHasLoadedTheme(true);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.flynowTheme = theme;

    return () => {
      delete document.documentElement.dataset.flynowTheme;
    };
  }, [theme]);

  useEffect(() => {
    if (!hasLoadedTheme) {
      return;
    }

    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [hasLoadedTheme, theme]);

  useEffect(() => {
    return () => {
      delete document.documentElement.dataset.flynowThemeTransitioning;

      if (themeTransitionFrameRef.current !== null) {
        window.cancelAnimationFrame(themeTransitionFrameRef.current);
        themeTransitionFrameRef.current = null;
      }

      if (themeTransitionTimeoutRef.current) {
        clearTimeout(themeTransitionTimeoutRef.current);
        themeTransitionTimeoutRef.current = null;
      }
    };
  }, []);

  const value = useMemo<DashboardThemeContextValue>(
    () => ({
      theme,
      toggleTheme,
    }),
    [theme, toggleTheme]
  );

  return (
    <DashboardThemeContext.Provider value={value}>
      <div
        data-theme={theme}
        className={[
          "flynow-dashboard-shell min-h-dvh overflow-x-clip bg-[var(--fly-bg)] text-[var(--fly-text)] transition-colors duration-300 [--sidebar-width:0rem] xl:[--sidebar-width:16rem]",
          isThemeTransitioning ? "flynow-theme-transitioning" : "",
        ].join(" ")}
      >
        {children}
      </div>
    </DashboardThemeContext.Provider>
  );
}

export function useDashboardTheme() {
  const context = useContext(DashboardThemeContext);

  if (!context) {
    throw new Error(
      "useDashboardTheme must be used within DashboardThemeProvider"
    );
  }

  return context;
}
