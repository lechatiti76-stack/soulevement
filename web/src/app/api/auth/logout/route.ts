import { NextRequest, NextResponse } from "next/server";
import { callAppsScript } from "@/lib/apps-script-client";
import { REFRESH_COOKIE, SESSION_COOKIE, USER_COOKIE } from "@/lib/session";

export async function POST(req: NextRequest) {
  const refreshToken = req.cookies.get(REFRESH_COOKIE)?.value;

  if (refreshToken) {
    try {
      await callAppsScript("auth.logout", { refreshToken });
    } catch {
      // best-effort — les cookies sont effacés même si l'appel échoue
    }
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.delete(SESSION_COOKIE);
  res.cookies.delete(REFRESH_COOKIE);
  res.cookies.delete(USER_COOKIE);
  return res;
}
