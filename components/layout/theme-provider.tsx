"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type DashboardTheme = "dark" | "light";

type DashboardThemeContextValue = {
  theme: DashboardTheme;
  toggleTheme: () => void;
};

const THEME_STORAGE_KEY = "flynow-dashboard-theme";
const DashboardThemeContext =
  createContext<DashboardThemeContextValue | null>(null);

export function DashboardThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<DashboardTheme>("dark");
  const [hasLoadedTheme, setHasLoadedTheme] = useState(false);

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

  const value = useMemo<DashboardThemeContextValue>(
    () => ({
      theme,
      toggleTheme: () =>
        setTheme((currentTheme) =>
          currentTheme === "dark" ? "light" : "dark"
        ),
    }),
    [theme]
  );

  return (
    <DashboardThemeContext.Provider value={value}>
      <div
        data-theme={theme}
        className="flynow-dashboard-shell min-h-dvh overflow-x-clip bg-[#050505] text-[#F5F2EA] transition-colors duration-300 [--sidebar-width:0rem] xl:[--sidebar-width:16rem]"
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
