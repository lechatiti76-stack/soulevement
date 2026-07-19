import type { Dossier, DossierWithSources } from "./types";
import type { AnnexeType } from "@/lib/annexes";

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Erreur inattendue");
  return data as T;
}

export function listDossiers() {
  return request<{ dossiers: Dossier[] }>("/api/dossiers?module=soulevement");
}

export function getDossier(id: string) {
  return request<DossierWithSources>(`/api/dossiers/${id}`);
}

export function createDossier() {
  return request<DossierWithSources>("/api/dossiers", {
    method: "POST",
    body: JSON.stringify({ module: "soulevement" }),
  });
}

export function saveDossierForm(id: string, formData: Record<string, unknown>) {
  return request<DossierWithSources>(`/api/dossiers/${id}/form`, {
    method: "POST",
    body: JSON.stringify({ formData }),
  });
}

export function validateDossier(id: string) {
  return request<DossierWithSources>(`/api/dossiers/${id}/validate`, {
    method: "POST",
  });
}

export function addComment(id: string, texte: string) {
  return request<DossierWithSources>(`/api/dossiers/${id}/comments`, {
    method: "POST",
    body: JSON.stringify({ texte }),
  });
}

export function addAnnexe(
  id: string,
  type: AnnexeType,
  file: { fileBase64: string; fileName: string; mimeType: string }
) {
  return request<DossierWithSources>(`/api/dossiers/${id}/annexes`, {
    method: "POST",
    body: JSON.stringify({ type, ...file }),
  });
}

export function deleteAnnexe(dossierId: string, annexeId: string) {
  return request<DossierWithSources>(`/api/dossiers/${dossierId}/annexes/${annexeId}`, {
    method: "DELETE",
  });
}

/** Suppression définitive (admin) — dossier + annexes/commentaires/historique liés. */
export function deleteDossier(id: string) {
  return request<{ deleted: boolean; id: string }>(`/api/dossiers/${id}`, {
    method: "DELETE",
  });
}
