/**
 * Schéma du formulaire "Soulèvement" (fiche wagons), en 3 parties — pensé pour rester
 * court à l'écran sur mobile. Utilisé par lib/pdf-template.gs pour construire/remplir le
 * template Slides et pour les libellés.
 *
 * IMPORTANT : doit rester synchronisé manuellement avec
 * web/src/modules/soulevement/schema.ts (mêmes name/type/options) — cf. ARCHITECTURE.md §10.
 */

var VOIES_OPTIONS = [
  "VF8", "VF4", "VR12", "VR8", "VFL4", "VEXT1",
  "VF7", "VF3", "VR11", "VR7", "VFL3", "VEXT2",
  "VF6", "VF2", "VR10", "VR6", "VFL2",
  "VF5", "VF1", "VR9", "VR5", "VFL1",
];

// Personnes pouvant être désignées comme contrôleur (champ "Nom", partie 1) — liste manuelle,
// à étendre au besoin (pas reliée à la table users, cf. décision utilisateur).
var CONTROLEURS_OPTIONS = ["PATON ROMUALD"];

var SOULEVEMENT_SCHEMA = [
  // Partie 1 — Localisation et matériel
  { name: "date", label: "Date", type: "date", part: 1 },
  { name: "heure", label: "Heure", type: "time", part: 1 },
  { name: "nom_controleur", label: "Nom", type: "select", part: 1, options: CONTROLEURS_OPTIONS },
  { name: "localisation", label: "Localisation (voies)", type: "checkbox-group", part: 1, options: VOIES_OPTIONS },
  { name: "quoi", label: "Quoi ? (Matériels roulant)", type: "text", part: 1 },
  { name: "conteneur_encadrant_lh", label: "N° Conteneur — Encadrant LH", type: "text", part: 1, photoOcr: true },
  { name: "conteneur_souleve_lh", label: "N° Conteneur — Soulevé LH", type: "text", part: 1, photoOcr: true },
  { name: "conteneur_souleve_paris", label: "N° Conteneur — Soulevé PARIS", type: "text", part: 1, photoOcr: true },
  { name: "conteneur_encadrant_paris", label: "N° Conteneur — Encadrant PARIS", type: "text", part: 1, photoOcr: true },
  { name: "wagon_encadrant_lh", label: "N° Encadrant LH", type: "text", part: 1, photoOcr: true },
  { name: "wagon_souleve_lh", label: "N° Soulevé LH", type: "text", part: 1, photoOcr: true },
  { name: "wagon_souleve_paris", label: "N° Soulevé PARIS", type: "text", part: 1, photoOcr: true },
  { name: "wagon_encadrant_paris", label: "N° Encadrant PARIS", type: "text", part: 1, photoOcr: true },
  { name: "longueur_wagon", label: "Longueur wagon", type: "radio", part: 1, options: ["40'", "60'", "80'"] },
  { name: "relevage_necessaire", label: "Moyen de relevage nécessaire ?", type: "radio", part: 1, options: ["Oui", "Non"] },
  { name: "meteo", label: "Météo", type: "checkbox-group", part: 1, options: ["Ensoleillé", "Brumeux", "Pluvieux", "Vent"] },
  { name: "moment_journee", label: "Moment", type: "radio", part: 1, options: ["Nuit", "Jour"] },
  { name: "visibilite", label: "Visibilité", type: "radio", part: 1, options: ["Bonne", "Moyenne", "Mauvaise"] },
  { name: "consequences", label: "Conséquence et mesures conservatoires prises", type: "textarea", part: 1 },

  // Partie 2 — Appel aux personnes concernées
  { name: "st_personne_contactee", label: "Service Technique LHTE — Personne contactée", type: "text", part: 2 },
  { name: "st_heure", label: "Service Technique LHTE — Heure", type: "time", part: 2 },
  { name: "st_jointe", label: "Service Technique LHTE — Personne jointe", type: "checkbox", part: 2 },
  {
    name: "gm_entreprise",
    label: "Gestionnaire matériels — Entreprise",
    type: "select",
    part: 2,
    options: ["NRS", "TOUAX", "Inveho", "Wascosa", "SDH FER"],
  },
  { name: "gm_personne_contactee", label: "Gestionnaire matériels — Personne contactée", type: "text", part: 2 },
  { name: "gm_heure", label: "Gestionnaire matériels — Heure", type: "time", part: 2 },
  { name: "gm_jointe", label: "Gestionnaire matériels — Personne jointe", type: "checkbox", part: 2 },
  {
    name: "ef_entreprise",
    label: "Entreprise ferroviaire — Entreprise",
    type: "select",
    part: 2,
    options: ["NAVILAND CARGO", "FEROVERGNE"],
  },
  { name: "ef_personne_contactee", label: "Entreprise ferroviaire — Personne contactée", type: "text", part: 2 },
  { name: "ef_heure", label: "Entreprise ferroviaire — Heure", type: "time", part: 2 },
  { name: "ef_jointe", label: "Entreprise ferroviaire — Personne jointe", type: "checkbox", part: 2 },

  // Partie 3 — Autorisation et clôture
  { name: "signature_st", label: "Signature — Service Technique", type: "signature", part: 3 },
  { name: "signature_gm", label: "Signature — Gestionnaire matériels", type: "signature", part: 3 },
  { name: "signature_ef", label: "Signature — Entreprise ferroviaire", type: "signature", part: 3 },
  { name: "date_heure_st", label: "Date/heure — Service Technique", type: "text", part: 3 },
  { name: "date_heure_gm", label: "Date/heure — Gestionnaire matériels", type: "text", part: 3 },
  { name: "date_heure_ef", label: "Date/heure — Entreprise ferroviaire", type: "text", part: 3 },
  { name: "validation_aiguilleur_le", label: "Validation Aiguilleur le", type: "date", part: 3 },
  { name: "fiche_cloturee_le", label: "Fiche clôturée le", type: "date", part: 3 },
];

/** Jeton de remplacement pour une option de case à cocher (radio ou checkbox-group). */
function checkboxToken_(fieldName, optionValue) {
  return fieldName + "__" + String(optionValue).replace(/[^a-zA-Z0-9]/g, "");
}
