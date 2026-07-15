import { NextRequest, NextResponse } from "next/server";
import { verifyAccessToken } from "@/lib/jwt";
import { callAppsScript } from "@/lib/apps-script-client";
import { REFRESH_COOKIE, SESSION_COOKIE, USER_COOKIE, type PublicUser } from "@/lib/session";

type RefreshResult = { accessToken: string; expiresIn: number; user: PublicUser };

async function tryRefresh(refreshToken: string): Promise<RefreshResult | null> {
  try {
    return await callAppsScript<RefreshResult>("auth.refresh", { refreshToken });
  } catch {
    return null;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Les routes d'auth gèrent elles-mêmes leur logique (login, logout...), jamais bloquées ici.
  if (pathname.startsWith("/api/auth")) {
    return NextResponse.next();
  }

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  let authenticated = token ? !!(await verifyAccessToken(token)) : false;
  let refreshed: RefreshResult | null = null;

  // Token d'accès absent/expiré (15 min, cf. ARCHITECTURE.md §6) : tente un renouvellement
  // silencieux via le refresh token (30 jours) avant de considérer l'utilisateur déconnecté.
  // Couvre à la fois les navigations de page et les appels /api/* puisque le middleware
  // s'exécute avant les deux.
  if (!authenticated) {
    const refreshToken = req.cookies.get(REFRESH_COOKIE)?.value;
    if (refreshToken) {
      refreshed = await tryRefresh(refreshToken);
      if (refreshed) {
        authenticated = true;
        req.cookies.set(SESSION_COOKIE, refreshed.accessToken);
        req.cookies.set(USER_COOKIE, JSON.stringify(refreshed.user));
      }
    }
  }

  // Les routes /api/* renvoient un 401 JSON — jamais une redirection HTML,
  // qui casserait le parsing JSON côté client (cf. lib/apps-script-client usage).
  if (pathname.startsWith("/api/")) {
    if (!authenticated) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    return finish(req, refreshed);
  }

  const isPublicPage = pathname.startsWith("/login");

  if (!isPublicPage && !authenticated) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (isPublicPage && authenticated) {
    const url = req.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return finish(req, refreshed);
}

/** Propage les cookies renouvelés à la fois vers la requête en cours (SSR/route handlers) et le navigateur. */
function finish(req: NextRequest, refreshed: RefreshResult | null) {
  const response = NextResponse.next({ request: req });

  if (refreshed) {
    const isProd = process.env.NODE_ENV === "production";
    response.cookies.set(SESSION_COOKIE, refreshed.accessToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: "lax",
      path: "/",
      maxAge: refreshed.expiresIn,
    });
    response.cookies.set(USER_COOKIE, JSON.stringify(refreshed.user), {
      httpOnly: false,
      secure: isProd,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
