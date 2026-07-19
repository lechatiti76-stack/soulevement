import { NextRequest, NextResponse } from "next/server";
import { callAppsScript } from "@/lib/apps-script-client";
import { getServerSession } from "@/lib/auth-server";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await getServerSession();
  if (!auth) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  try {
    const data = await callAppsScript("dossiers.get", { id: params.id, accessToken: auth.token });
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Erreur" }, { status: 400 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await getServerSession();
  if (!auth) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  try {
    const data = await callAppsScript("dossiers.delete", { id: params.id, accessToken: auth.token });
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Erreur" }, { status: 400 });
  }
}
