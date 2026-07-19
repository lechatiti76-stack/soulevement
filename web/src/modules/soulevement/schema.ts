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

// Personnes pouvant être désignées comme contrôleur (champ "Nom") — liste manuelle, à étendre
// au besoin (pas reliée à la page Utilisateurs, cf. décision utilisateur).
const CONTROLEURS = ["PATON ROMUALD"];

export type SoulevementPart = 1 | 2 | 3;

export type SoulevementFieldDef = FieldDef & { part: SoulevementPart };

/** Les 4 positions possibles pour un conteneur/wagon — de 1 à 4 selon les cas, cf. WagonSlotsField. */
export const WAGON_SLOTS = [
  { key: "encadrant_lh", label: "Encadrant LH", conteneurField: "conteneur_encadrant_lh", wagonField: "wagon_encadrant_lh" },
  { key: "souleve_lh", label: "Soulevé LH", conteneurField: "conteneur_souleve_lh", wagonField: "wagon_souleve_lh" },
  { key: "souleve_paris", label: "Soulevé PARIS", conteneurField: "conteneur_souleve_paris", wagonField: "wagon_souleve_paris" },
  { key: "encadrant_paris", label: "Encadrant PARIS", conteneurField: "conteneur_encadrant_paris", wagonField: "wagon_encadrant_paris" },
] as const;

const WAGON_SLOT_FIELD_NAMES = new Set<string>(WAGON_SLOTS.flatMap((s) => [s.conteneurField, s.wagonField]));

export const soulevementSchema: SoulevementFieldDef[] = [
  // Partie 1 — Localisation et matériel
  { name: "date", label: "Date", type: "date", part: 1, required: true },
  { name: "heure", label: "Heure", type: "time", part: 1, required: true },
  { name: "nom_controleur", label: "Nom", type: "select", part: 1, options: opts(CONTROLEURS) },
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
  { name: "st_telephone", label: "Téléphone", type: "tel", part: 2 },
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
  { name: "gm_telephone", label: "Téléphone", type: "tel", part: 2 },
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
  { name: "ef_telephone", label: "Téléphone", type: "tel", part: 2 },

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

/** Découpe la partie 1 autour des 8 champs conteneur/wagon, rendus séparément par
 * WagonSlotsField (ajout dynamique de 1 à 4 wagons) plutôt que par FormEngine. */
export function soulevementPart1Sections(): { before: SoulevementFieldDef[]; after: SoulevementFieldDef[] } {
  const part1 = soulevementFieldsForPart(1);
  const isWagonField = (f: SoulevementFieldDef) => WAGON_SLOT_FIELD_NAMES.has(f.name);
  const firstIdx = part1.findIndex(isWagonField);
  const lastIdx = part1.reduce((acc, f, i) => (isWagonField(f) ? i : acc), -1);
  return { before: part1.slice(0, firstIdx), after: part1.slice(lastIdx + 1) };
}

/** Découpe la partie 3 avant "Validation Aiguilleur le", où s'insère AnnexePhotosField
 * (miniatures dans le formulaire ; photos en taille réelle sur des pages PDF supplémentaires). */
export function soulevementPart3Sections(): { before: SoulevementFieldDef[]; after: SoulevementFieldDef[] } {
  const part3 = soulevementFieldsForPart(3);
  const idx = part3.findIndex((f) => f.name === "validation_aiguilleur_le");
  return { before: part3.slice(0, idx), after: part3.slice(idx) };
}
