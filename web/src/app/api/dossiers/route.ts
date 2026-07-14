import { NextRequest, NextResponse } from "next/server";
import { callAppsScript } from "@/lib/apps-script-client";
import { getServerSession } from "@/lib/auth-server";

export async function GET() {
  const auth = await getServerSession();
  if (!auth) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  try {
    const data = await callAppsScript("dossiers.list", { accessToken: auth.token });
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Erreur" }, { status: 400 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await getServerSession();
  if (!auth) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body?.fileBase64 || !body?.fileName || !body?.mimeType) {
    return NextResponse.json({ error: "Document source requis" }, { status: 400 });
  }

  try {
    const data = await callAppsScript("dossiers.create", { ...body, accessToken: auth.token });
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Erreur" }, { status: 400 });
  }
}
