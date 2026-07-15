import { NextRequest, NextResponse } from "next/server";
import { callAppsScript } from "@/lib/apps-script-client";
import { getServerSession } from "@/lib/auth-server";

export async function GET(req: NextRequest) {
  const auth = await getServerSession();
  if (!auth) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const params = req.nextUrl.searchParams;

  try {
    const data = await callAppsScript("archives.search", {
      query: params.get("query") || "",
      statut: params.get("statut") || "",
      module: params.get("module") || "",
      sortBy: params.get("sortBy") || "date_creation",
      sortDir: params.get("sortDir") || "desc",
      accessToken: auth.token,
    });
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Erreur" }, { status: 400 });
  }
}
