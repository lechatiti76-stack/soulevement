// Client serveur-à-serveur vers le Web App Apps Script.
// N'est jamais appelé depuis le navigateur — uniquement depuis les routes /api/* de Next.js.
// Cf. ARCHITECTURE.md §2 et §6.

type AppsScriptResponse<T> = T & { error?: string };

export async function callAppsScript<T>(
  action: string,
  payload: Record<string, unknown> = {}
): Promise<T> {
  const url = process.env.APPS_SCRIPT_URL;
  if (!url) throw new Error("APPS_SCRIPT_URL non configuré");

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, ...payload }),
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Apps Script a répondu ${res.status}`);
  }

  const data = (await res.json()) as AppsScriptResponse<T>;
  if (data.error) throw new Error(data.error);

  return data;
}
