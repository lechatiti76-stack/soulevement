import { cookies } from "next/headers";
import { Sidebar } from "@/components/ui/Sidebar";
import { LogoutButton } from "@/components/ui/LogoutButton";
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
      <Sidebar role={user?.role} />
      <div className="flex-1">
        <header className="flex h-14 items-center justify-between border-b border-[rgb(var(--border))] px-6">
          <span className="text-sm text-[rgb(var(--text-muted))]">Espace de travail</span>
          <div className="flex items-center gap-3 text-sm">
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
