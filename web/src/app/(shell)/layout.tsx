import { Sidebar } from "@/components/ui/Sidebar";

export default function ShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1">
        <header className="flex h-14 items-center justify-between border-b border-[rgb(var(--border))] px-6">
          <span className="text-sm text-[rgb(var(--text-muted))]">Espace de travail</span>
          {/* Avatar / menu utilisateur branché en Phase 1 */}
        </header>
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
