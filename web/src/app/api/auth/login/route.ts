import { NextRequest, NextResponse } from "next/server";
import { callAppsScript } from "@/lib/apps-script-client";
import { REFRESH_COOKIE, SESSION_COOKIE, USER_COOKIE, type PublicUser } from "@/lib/session";

type LoginResult = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: PublicUser;
};

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const identifiant = body?.identifiant;
  const password = body?.password;

  if (!identifiant || !password) {
    return NextResponse.json({ error: "Identifiant et mot de passe requis" }, { status: 400 });
  }

  try {
    const data = await callAppsScript<LoginResult>("auth.login", {
      identifiant,
      password,
      userAgent: req.headers.get("user-agent") || "",
    });

    const res = NextResponse.json({ user: data.user });
    const isProd = process.env.NODE_ENV === "production";

    res.cookies.set(SESSION_COOKIE, data.accessToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: "lax",
      path: "/",
      maxAge: data.expiresIn,
    });
    res.cookies.set(REFRESH_COOKIE, data.refreshToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
    res.cookies.set(USER_COOKIE, JSON.stringify(data.user), {
      httpOnly: false,
      secure: isProd,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });

    return res;
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erreur de connexion" },
      { status: 401 }
    );
  }
}
