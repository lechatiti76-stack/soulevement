import type { FieldDef } from "@/modules/nouvelle-demande/schema";

// IMPORTANT : doit rester synchronisé manuellement avec
// apps-script/src/modules/bris-barrieres-schema.gs (mêmes name/type/options) — cf. ARCHITECTURE.md §10.

function opts(values: string[]) {
  return values.map((v) => ({ value: v, label: v }));
}

const LIEU = [
  "TR 124",
  "TR 128",
  "TR 192",
  "TR 132",
  "TR 39",
  "TR 35",
  "TR 143",
  "TR 140",
  "Portail EST",
  "Portail OUEST",
];
const EMETTEUR = ["PATON ROMUALD"];
const NATURE = ["Prise de barrière", "Bris de barrière", "Collision", "Heurt"];
const NATURE_DETAIL = [
  "1 demi-barrière droite",
  "1 demi-barrière Gauche",
  "2 barrières",
  "3 barrières",
  "4 barrières",
];
const TYPE_COLLISION = [
  "Collision piéton",
  "Collision véhicule",
  "Collision obstacle",
  "Collision avec un engin de manutention",
  "Collision/déraillement de wagon(s), rails, obstacle",
  "Autres",
];
const MESURES = [
  "Arrêt des circulations ferroviaire",
  "Arrêt des circulations ferroviaire partielle côté Le Havre",
  "Arrêt des circulations ferroviaire partielle côté Paris",
];
const CONSEQUENCES = [
  "Suspension de l'ensemble des transports ferroviaires et routiers",
  "Suspension de l'ensemble des transports ferroviaires",
];
const CAUSES = [
  "Défaillance des SAL (Système automatique lumineux)",
  "Défaillance des systèmes sonores",
  "Défaillance des barrières",
  "Non-respect des consignes ferroviaires",
  "PN à SAL est constaté ou signalé avec (un ou les) feux routiers allumés",
  "PN à SAL est constaté ou signalé avec le maintien en position de fermeture d'une ou plusieurs demi-barrières d'un PN à deux ou quatre demi-barrières",
  "PN à SAL est constaté ou signalé une extinction de plusieurs feux routiers",
  "PN à SAL est constaté ou signalé avec le maintien en position d'ouverture d'une ou des deux demi-barrières d'un PN à deux demi-barrières",
  "PN à SAL est constaté ou signalé avec le maintien en position d'ouverture d'une ou des deux demi-barrières d'entrée d'un PN à quatre demi-barrières",
  "Autres",
];
const TYPE_PN = [
  "Passage à niveau passif",
  "Passage à niveau actif manuel",
  "Passage à niveau actif automatique avec avertissement côté usagers",
  "Passage à niveau actif automatique avec protection côté usagers",
  "Passage à niveau actif avec avertissement côté rails",
  "Autres",
];
const SENS = ["Paris - Le Havre", "Le Havre - Paris"];
const CLASSE_MD = [
  "1 – Explosifs",
  "2 – Gaz (comprimés, liquéfiés ou dissous)",
  "2.1 – Gaz inflammables",
  "2.2 – Gaz non inflammables, non toxiques",
  "2.3 – Gaz toxiques",
  "3 – Liquides inflammables",
  "4.1 – Solides inflammables, matières autoréactives, explosifs désensibilisés solides",
  "4.2 – Matières sujettes à l'inflammation spontanée",
  "4.3 – Matières qui, au contact de l'eau, dégagent des gaz inflammables",
  "5.1 – Matières comburantes",
  "5.2 – Peroxydes organiques",
  "6.1 – Matières toxiques",
  "6.2 – Matières infectieuses",
  "7 – Matières radioactives",
  "8 – Matières corrosives",
  "9 – Matières et objets dangereux divers",
];
const CODE_MD = [
  "20 – Gaz non inflammable",
  "22 – Gaz liquéfié réfrigéré",
  "23 – Gaz inflammable",
  "25 – Gaz comburant",
  "26 – Gaz toxique",
  "263 – Gaz toxique et inflammable",
  "265 – Gaz toxique et comburant",
  "30 – Liquide inflammable",
  "33 – Liquide très inflammable",
  "336 – Liquide très inflammable et toxique",
  "338 – Liquide très inflammable et corrosif",
  "39 – Liquide inflammable pouvant réagir spontanément",
  "40 – Solide inflammable",
  "42 – Matière susceptible de s'enflammer spontanément",
  "43 – Matière qui dégage un gaz inflammable au contact de l'eau",
  "44 – Solide inflammable transporté à chaud",
  "50 – Matière comburante",
  "55 – Comburant puissant",
  "56 – Matière comburante toxique",
  "58 – Matière comburante corrosive",
  "60 – Matière toxique",
  "66 – Matière très toxique",
  "68 – Matière toxique corrosive",
  "80 – Matière corrosive",
  "83 – Matière corrosive inflammable",
  "85 – Matière corrosive comburante",
  "86 – Matière corrosive toxique",
  "88 – Matière très corrosive",
  "90 – Matière dangereuse diverse",
  "99 – Matière dangereuse transportée à température élevée",
];
const STATUT_AVIS = ["Reçu", "Non reçu"];
const DOCUMENTS = ["Constat", "Photos", "RCI", "Vidéo", "Bulletin C"];

/** Les 9 organismes du tableau "Avis lancés" (case + heure pour chacun). */
export const BAR_ORGANISMES = [
  { key: "service_technique_lhte", label: "Service Technique LHTE" },
  { key: "evenement_securite", label: "Événement lié à la sécurité" },
  { key: "pompiers", label: "Pompiers" },
  { key: "astreinte_socorail", label: "Astreinte SOCORAIL" },
  { key: "securite_portuaire", label: "Sécurité portuaire" },
  { key: "gendarmerie", label: "Gendarmerie" },
  { key: "astreinte_nrs", label: "Astreinte NRS" },
  { key: "ccl", label: "CCL" },
  { key: "autres_organisme", label: "Autres" },
] as const;

export type BrisBarrieresPart = 1 | 2;

export type BrisBarrieresFieldDef = FieldDef & { part: BrisBarrieresPart };

function avisFields(): BrisBarrieresFieldDef[] {
  const fields: BrisBarrieresFieldDef[] = [];
  BAR_ORGANISMES.forEach((org) => {
    fields.push({
      name: `${org.key}_statut`,
      label: `${org.label} — Avis lancé`,
      type: "select",
      part: 2,
      options: opts(STATUT_AVIS),
    });
    fields.push({ name: `${org.key}_heure`, label: `${org.label} — Heure`, type: "time", part: 2 });
  });
  return fields;
}

export const brisBarrieresSchema: BrisBarrieresFieldDef[] = [
  // Partie 1 — Informations générales
  { name: "date", label: "Date", type: "date", part: 1, required: true },
  { name: "heure", label: "Heure", type: "time", part: 1, required: true },
  { name: "lieu", label: "Lieu", type: "select", part: 1, options: opts(LIEU) },
  { name: "nom_emetteur", label: "Nom émetteur", type: "select", part: 1, options: opts(EMETTEUR) },
  { name: "nature", label: "Nature de l'évènement", type: "select", part: 1, options: opts(NATURE) },
  { name: "nature_detail", label: "Détail", type: "select", part: 1, options: opts(NATURE_DETAIL) },
  { name: "type_collision", label: "Type de collision", type: "select", part: 1, options: opts(TYPE_COLLISION) },
  { name: "sens", label: "Sens", type: "radio", part: 1, options: opts(SENS) },
  { name: "type_pn", label: "Type", type: "select", part: 1, options: opts(TYPE_PN) },
  { name: "mesures_prises", label: "Mesures prises", type: "checkbox-group", part: 1, options: opts(MESURES) },
  { name: "consequences", label: "Conséquences", type: "checkbox-group", part: 1, options: opts(CONSEQUENCES) },
  { name: "causes", label: "Causes (à recueillir auprès du mainteneur si besoin)", type: "select", part: 1, options: opts(CAUSES) },

  // Partie 2 — Avis lancés, documents et clôture
  ...avisFields(),
  { name: "documents_archives", label: "Documents archivés", type: "checkbox-group", part: 2, options: opts(DOCUMENTS) },
  { name: "code_md", label: "Code MD", type: "select", part: 2, options: opts(CODE_MD) },
  { name: "classe_md", label: "Classe MD", type: "select", part: 2, options: opts(CLASSE_MD) },
  { name: "numero_conteneur", label: "N° conteneur", type: "text", part: 2 },
  { name: "reprise_service_normal", label: "Reprise du service normal", type: "radio", part: 2, options: opts(["Oui", "Non"]) },
  { name: "date_heure_reprise", label: "Date et heure de reprise", type: "text", part: 2 },
];

export const BRIS_BARRIERES_PART_LABELS: Record<BrisBarrieresPart, string> = {
  1: "Informations générales",
  2: "Avis lancés, documents et clôture",
};

export function brisBarrieresFieldsForPart(part: BrisBarrieresPart) {
  return brisBarrieresSchema.filter((f) => f.part === part);
}

/** Découpe la partie 2 avant "Code MD", où s'insère AnnexePhotosField (miniatures dans le
 * formulaire ; photos en taille réelle sur des pages PDF supplémentaires). */
export function brisBarrieresPart2Sections(): { before: BrisBarrieresFieldDef[]; after: BrisBarrieresFieldDef[] } {
  const part2 = brisBarrieresFieldsForPart(2);
  const idx = part2.findIndex((f) => f.name === "code_md");
  return { before: part2.slice(0, idx), after: part2.slice(idx) };
}
