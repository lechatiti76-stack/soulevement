import { cookies } from "next/headers";
import { Sidebar } from "@/components/ui/Sidebar";
import { LogoutButton } from "@/components/ui/LogoutButton";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { USER_COOKIE, type PublicUser } from "@/lib/session";

function getUser(): PublicUser | null {
  const raw = cookies().get(USER_COOKIE)?.value;
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PublicUser;
  } catch {
    return null;
  }
}

export default function ShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = getUser();

  return (
    <div className="flex min-h-screen">
      <div className="print:hidden">
        <Sidebar role={user?.role} />
      </div>
      <div className="flex-1">
        <header className="flex h-14 items-center justify-between border-b border-[rgb(var(--border))] px-6 print:hidden">
          <span className="text-sm text-[rgb(var(--text-muted))]">Espace de travail</span>
          <div className="flex items-center gap-3 text-sm">
            <ThemeToggle />
            {user && (
              <span>
                {user.prenom} {user.nom}
              </span>
            )}
            <LogoutButton />
          </div>
        </header>
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
