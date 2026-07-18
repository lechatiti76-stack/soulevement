import { NextRequest, NextResponse } from "next/server";
import { callAppsScript } from "@/lib/apps-script-client";
import { getServerSession } from "@/lib/auth-server";

export async function POST(req: NextRequest) {
  const auth = await getServerSession();
  if (!auth) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body?.imageBase64 || !body?.mimeType) {
    return NextResponse.json({ error: "Image requise" }, { status: 400 });
  }

  try {
    const data = await callAppsScript("fields.extractSingle", {
      imageBase64: body.imageBase64,
      mimeType: body.mimeType,
      accessToken: auth.token,
    });
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Erreur" }, { status: 400 });
  }
}
