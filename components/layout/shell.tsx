import Sidebar from "./sidebar";

export default function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 min-h-screen bg-gray-50 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
