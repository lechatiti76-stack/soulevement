import type { Annexe } from "@/lib/annexes";

export type DossierStatut = "brouillon" | "en_attente" | "valide" | "archive";

export type Dossier = {
  id: string;
  numero: string;
  module: string;
  user_id: string;
  statut: DossierStatut;
  date_creation: string;
  date_validation: string;
  form_data: string; // JSON stringifié côté Sheets
  pdf_url: string;
  qr_code_url: string;
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
  commentaires: Commentaire[];
  historique: HistoriqueEntry[];
  annexes: Annexe[];
};
