import { NextRequest, NextResponse } from "next/server";
import { verifyAccessToken } from "@/lib/jwt";
import { SESSION_COOKIE } from "@/lib/session";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Les routes d'auth gèrent elles-mêmes leur logique (login, refresh...), jamais bloquées ici.
  if (pathname.startsWith("/api/auth")) {
    return NextResponse.next();
  }

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifyAccessToken(token) : null;

  // Les routes /api/* renvoient un 401 JSON — jamais une redirection HTML,
  // qui casserait le parsing JSON côté client (cf. lib/apps-script-client usage).
  if (pathname.startsWith("/api/")) {
    if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    return NextResponse.next();
  }

  const isPublicPage = pathname.startsWith("/login");

  if (!isPublicPage && !session) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (isPublicPage && session) {
    const url = req.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
