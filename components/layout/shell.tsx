import Sidebar from "./sidebar";
import { DashboardThemeProvider } from "./theme-provider";

export default function Shell({ children }: { children: React.ReactNode }) {
  return (
    <DashboardThemeProvider>
      <Sidebar />
      <main className="min-h-dvh min-w-0 overflow-x-clip bg-[var(--fly-bg)] pb-24 pl-0 xl:pb-0 xl:pl-[var(--sidebar-width)]">
        {children}
      </main>
    </DashboardThemeProvider>
  );
}
