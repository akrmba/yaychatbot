import { Sidebar } from "@/components/layout/sidebar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <div className="container max-w-6xl py-8 px-6">{children}</div>
      </main>
    </div>
  );
}
