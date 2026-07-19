// Archives transverses, alimentées par tous les modules à la validation (cf. ARCHITECTURE.md §4).

export type ArchiveEntry = {
  id: string;
  numero_dossier: string;
  module: string;
  dossier_id: string;
  user_id: string;
  user_display: string;
  statut: string;
  date_creation: string;
  date_validation: string;
  pdf_url: string;
};

export type ArchiveSearchParams = {
  query?: string;
  statut?: string;
  module?: string;
  sortBy?: "date_creation" | "date_validation" | "numero_dossier" | "statut";
  sortDir?: "asc" | "desc";
};

export async function searchArchives(params: ArchiveSearchParams = {}): Promise<{ archives: ArchiveEntry[] }> {
  const qs = new URLSearchParams();
  if (params.query) qs.set("query", params.query);
  if (params.statut) qs.set("statut", params.statut);
  if (params.module) qs.set("module", params.module);
  if (params.sortBy) qs.set("sortBy", params.sortBy);
  if (params.sortDir) qs.set("sortDir", params.sortDir);

  const res = await fetch(`/api/archives?${qs.toString()}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Erreur inattendue");
  return data;
}

export function archivesToCsv(archives: ArchiveEntry[]): string {
  const headers = ["Numéro", "Module", "Utilisateur", "Statut", "Date création", "Date validation", "PDF"];
  const rows = archives.map((a) => [
    a.numero_dossier,
    a.module,
    a.user_display,
    a.statut,
    a.date_creation,
    a.date_validation,
    a.pdf_url,
  ]);

  const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;
  return [headers, ...rows].map((row) => row.map((cell) => escape(String(cell ?? ""))).join(",")).join("\n");
}

export function downloadCsv(filename: string, csv: string) {
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

/** Suppression définitive (admin) — dossier + annexes/commentaires/historique liés. */
export async function deleteDossier(dossierId: string): Promise<{ deleted: boolean; id: string }> {
  const res = await fetch(`/api/dossiers/${dossierId}`, { method: "DELETE" });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Erreur inattendue");
  return data;
}
