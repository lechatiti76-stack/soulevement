import type { FieldDef } from "@/modules/nouvelle-demande/schema";

// IMPORTANT : doit rester synchronisé manuellement avec
// apps-script/src/modules/soulevement-schema.gs (mêmes name/type/options) — cf. ARCHITECTURE.md §10.

const VOIES = [
  "VF8", "VF4", "VR12", "VR8", "VFL4", "VEXT1",
  "VF7", "VF3", "VR11", "VR7", "VFL3", "VEXT2",
  "VF6", "VF2", "VR10", "VR6", "VFL2",
  "VF5", "VF1", "VR9", "VR5", "VFL1",
];

function opts(values: string[]) {
  return values.map((v) => ({ value: v, label: v }));
}

export type SoulevementPart = 1 | 2 | 3;

export type SoulevementFieldDef = FieldDef & { part: SoulevementPart };

export const soulevementSchema: SoulevementFieldDef[] = [
  // Partie 1 — Localisation et matériel
  { name: "date", label: "Date", type: "date", part: 1, required: true },
  { name: "heure", label: "Heure", type: "time", part: 1, required: true },
  { name: "localisation", label: "Localisation (voies)", type: "checkbox-group", part: 1, options: opts(VOIES) },
  { name: "quoi", label: "Quoi ? (Matériels roulant)", type: "text", part: 1 },
  { name: "conteneur_encadrant_lh", label: "N° Conteneur — Encadrant LH", type: "text", part: 1, photoOcr: true },
  { name: "conteneur_souleve_lh", label: "N° Conteneur — Soulevé LH", type: "text", part: 1, photoOcr: true },
  { name: "conteneur_souleve_paris", label: "N° Conteneur — Soulevé PARIS", type: "text", part: 1, photoOcr: true },
  { name: "conteneur_encadrant_paris", label: "N° Conteneur — Encadrant PARIS", type: "text", part: 1, photoOcr: true },
  { name: "wagon_encadrant_lh", label: "N° Wagon — Encadrant LH", type: "text", part: 1, photoOcr: true },
  { name: "wagon_souleve_lh", label: "N° Wagon — Soulevé LH", type: "text", part: 1, photoOcr: true },
  { name: "wagon_souleve_paris", label: "N° Wagon — Soulevé PARIS", type: "text", part: 1, photoOcr: true },
  { name: "wagon_encadrant_paris", label: "N° Wagon — Encadrant PARIS", type: "text", part: 1, photoOcr: true },
  { name: "longueur_wagon", label: "Longueur wagon", type: "radio", part: 1, options: opts(["40'", "60'", "80'"]) },
  { name: "relevage_necessaire", label: "Moyen de relevage nécessaire ?", type: "radio", part: 1, options: opts(["Oui", "Non"]) },
  { name: "meteo", label: "Météo", type: "checkbox-group", part: 1, options: opts(["Ensoleillé", "Brumeux", "Pluvieux", "Vent"]) },
  { name: "moment_journee", label: "Moment", type: "radio", part: 1, options: opts(["Nuit", "Jour"]) },
  { name: "visibilite", label: "Visibilité", type: "radio", part: 1, options: opts(["Bonne", "Moyenne", "Mauvaise"]) },
  { name: "consequences", label: "Conséquence et mesures conservatoires prises", type: "textarea", part: 1 },

  // Partie 2 — Appel aux personnes concernées
  { name: "st_personne_contactee", label: "Service Technique LHTE — Personne contactée", type: "text", part: 2 },
  { name: "st_heure", label: "Service Technique LHTE — Heure", type: "time", part: 2 },
  { name: "st_jointe", label: "Personne jointe", type: "checkbox", part: 2 },
  {
    name: "gm_entreprise",
    label: "Gestionnaire matériels — Entreprise",
    type: "select",
    part: 2,
    options: opts(["NRS", "TOUAX", "Inveho", "Wascosa", "SDH FER"]),
  },
  { name: "gm_personne_contactee", label: "Gestionnaire matériels — Personne contactée", type: "text", part: 2 },
  { name: "gm_heure", label: "Gestionnaire matériels — Heure", type: "time", part: 2 },
  { name: "gm_jointe", label: "Personne jointe", type: "checkbox", part: 2 },
  {
    name: "ef_entreprise",
    label: "Entreprise ferroviaire — Entreprise",
    type: "select",
    part: 2,
    options: opts(["NAVILAND CARGO", "FEROVERGNE"]),
  },
  { name: "ef_personne_contactee", label: "Entreprise ferroviaire — Personne contactée", type: "text", part: 2 },
  { name: "ef_heure", label: "Entreprise ferroviaire — Heure", type: "time", part: 2 },
  { name: "ef_jointe", label: "Personne jointe", type: "checkbox", part: 2 },

  // Partie 3 — Autorisation et clôture
  { name: "signature_st", label: "Signature — Service Technique", type: "signature", part: 3 },
  { name: "date_heure_st", label: "Date/heure — Service Technique", type: "text", part: 3 },
  { name: "signature_gm", label: "Signature — Gestionnaire matériels", type: "signature", part: 3 },
  { name: "date_heure_gm", label: "Date/heure — Gestionnaire matériels", type: "text", part: 3 },
  { name: "signature_ef", label: "Signature — Entreprise ferroviaire", type: "signature", part: 3 },
  { name: "date_heure_ef", label: "Date/heure — Entreprise ferroviaire", type: "text", part: 3 },
  { name: "validation_aiguilleur_le", label: "Validation Aiguilleur le", type: "date", part: 3 },
  { name: "fiche_cloturee_le", label: "Fiche clôturée le", type: "date", part: 3 },
];

export const SOULEVEMENT_PART_LABELS: Record<SoulevementPart, string> = {
  1: "Localisation et matériel",
  2: "Appel aux personnes concernées",
  3: "Autorisation et clôture",
};

export function soulevementFieldsForPart(part: SoulevementPart) {
  return soulevementSchema.filter((f) => f.part === part);
}
