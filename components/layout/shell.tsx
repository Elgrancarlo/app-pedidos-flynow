import Sidebar from "./sidebar";

export default function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-[#050505] text-[#F5F2EA]">
      <Sidebar />
      <main className="min-h-screen flex-1 overflow-y-auto bg-[#050505]">
        {children}
      </main>
    </div>
  );
}
