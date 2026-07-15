import { NextRequest, NextResponse } from "next/server";
import { callAppsScript } from "@/lib/apps-script-client";
import { getServerSession } from "@/lib/auth-server";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await getServerSession();
  if (!auth) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const texte = String(body?.texte || "").trim();
  if (!texte) return NextResponse.json({ error: "Commentaire vide" }, { status: 400 });

  try {
    const data = await callAppsScript("dossiers.addComment", { id: params.id, texte, accessToken: auth.token });
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Erreur" }, { status: 400 });
  }
}
