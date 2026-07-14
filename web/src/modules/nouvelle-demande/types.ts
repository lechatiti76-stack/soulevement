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

export type DossierWithSources = {
  dossier: Dossier;
  sources: DocumentSource[];
};
