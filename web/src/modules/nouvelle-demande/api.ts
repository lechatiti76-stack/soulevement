import type { Dossier, DossierWithSources, ExtractionResult } from "./types";

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
  return request<{ dossiers: Dossier[] }>("/api/dossiers");
}

export function getDossier(id: string) {
  return request<DossierWithSources>(`/api/dossiers/${id}`);
}

export function createDossier(file: { fileBase64: string; fileName: string; mimeType: string }) {
  return request<DossierWithSources>("/api/dossiers", {
    method: "POST",
    body: JSON.stringify(file),
  });
}

export function extractDossierIA(id: string) {
  return request<ExtractionResult>(`/api/dossiers/${id}/extract`, {
    method: "POST",
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
