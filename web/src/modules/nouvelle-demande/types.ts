import type { Annexe } from "@/lib/annexes";

export type DossierStatut = "brouillon" | "en_attente" | "valide" | "archive";

export type Dossier = {
  id: string;
  numero: string;
  user_id: string;
  statut: DossierStatut;
  date_creation: string;
  date_validation: string;
  form_data: string; // JSON stringifié côté Sheets
  pdf_url: string;
  qr_code_url: string;
};

export type DocumentSource = {
  id: string;
  dossier_id: string;
  type: "pdf" | "word" | "image" | "autre";
  drive_file_id: string;
  date_upload: string;
};

export type ExtractionStatut = "en_cours" | "a_verifier" | "valide" | "erreur";

export type Extraction = {
  id: string;
  dossier_id: string;
  champs_extraits: string; // JSON stringifié côté Sheets
  confiance: string;
  statut: ExtractionStatut;
};

export type Commentaire = {
  id: string;
  dossier_id: string;
  user_id: string;
  user_display: string;
  texte: string;
  date: string;
};

export type HistoriqueEntry = {
  id: string;
  dossier_id: string;
  action: string;
  user_id: string;
  user_display: string;
  date: string;
  detail: string;
};

export type DossierWithSources = {
  dossier: Dossier;
  sources: DocumentSource[];
  extraction: Extraction | null;
  commentaires: Commentaire[];
  historique: HistoriqueEntry[];
  annexes: Annexe[];
};

export type ExtractionResult = {
  champsExtraits: Record<string, unknown>;
  statut: ExtractionStatut;
};
