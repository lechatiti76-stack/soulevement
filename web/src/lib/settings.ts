// Paramètres globaux (nom de l'app, logo) — cf. ARCHITECTURE.md §4, §6.

export type AppSettings = {
  nom_app: string;
  logo_url: string;
};

export async function getSettings(): Promise<AppSettings> {
  const res = await fetch("/api/settings");
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Erreur inattendue");
  return data;
}

export async function updateSettings(patch: Partial<AppSettings>): Promise<AppSettings> {
  const res = await fetch("/api/settings", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Erreur inattendue");
  return data;
}
