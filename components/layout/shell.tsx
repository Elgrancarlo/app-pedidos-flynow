import Sidebar from "./sidebar";

export default function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flynow-dashboard-shell min-h-dvh overflow-x-clip bg-[#050505] text-[#F5F2EA] [--sidebar-width:0rem] xl:[--sidebar-width:16rem]">
      <Sidebar />
      <main className="min-h-dvh min-w-0 overflow-x-clip bg-[#050505] pb-24 pl-0 xl:pb-0 xl:pl-[var(--sidebar-width)]">
        {children}
      </main>
    </div>
  );
}
