import { NextRequest, NextResponse } from "next/server";
import { callAppsScript } from "@/lib/apps-script-client";
import { getServerSession } from "@/lib/auth-server";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await getServerSession();
  if (!auth) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body?.fileBase64 || !body?.fileName || !body?.mimeType) {
    return NextResponse.json({ error: "Fichier requis" }, { status: 400 });
  }

  try {
    const data = await callAppsScript("dossiers.addAnnexe", {
      id: params.id,
      type: body.type === "photo" ? "photo" : "piece_jointe",
      fileBase64: body.fileBase64,
      fileName: body.fileName,
      mimeType: body.mimeType,
      accessToken: auth.token,
    });
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Erreur" }, { status: 400 });
  }
}
