import Sidebar from "./sidebar";

export default function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-[#050505] text-[#F5F2EA] [--sidebar-width:15rem]">
      <Sidebar />
      <main className="min-h-dvh bg-[#050505] pl-[var(--sidebar-width)]">
        {children}
      </main>
    </div>
  );
}
