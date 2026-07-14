import { cookies } from "next/headers";
import { verifyAccessToken, type SessionPayload } from "./jwt";
import { SESSION_COOKIE } from "./session";

// Lit et vérifie la session côté serveur (Route Handlers et Server Components).
// Retourne aussi le token brut : les routes /api/* en ont besoin pour le relayer à Apps Script.
export async function getServerSession(): Promise<{ token: string; session: SessionPayload } | null> {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await verifyAccessToken(token);
  if (!session) return null;

  return { token, session };
}
