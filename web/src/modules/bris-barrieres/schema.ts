import type { FieldDef } from "@/modules/nouvelle-demande/schema";

// IMPORTANT : doit rester synchronisé manuellement avec
// apps-script/src/modules/bris-barrieres-schema.gs (mêmes name/type/options) — cf. ARCHITECTURE.md §10.

function opts(values: string[]) {
  return values.map((v) => ({ value: v, label: v }));
}

const LIEU = ["TR 124", "TR 128", "TR 192"];
const EMETTEUR = ["PATON ROMUALD"];
const NATURE = ["Prise de barrière", "Collision"];
const NATURE_DETAIL = ["1 demi barrière", "2 barrière"];
const TYPE_COLLISION = [
  "Collision piéton",
  "Collision véhicule",
  "Collision obstacle",
  "Collision véhicule de manœuvre",
  "Collision/déraillement de wagon(s), rails, obstacle",
  "Autres",
];
const MESURES = ["Arrêt des circulations ferroviaire", "Suspension d'ensemble de la fréquentation et régularisation"];
const CAUSES = [
  "Passage à niveau passif",
  "Passage à niveau manuel",
  "Passage à niveau actif automatique avec annonce sonore et occupé",
  "Passage à niveau actif automatique avec préavis actif",
  "Passage à niveau actif avec annonce sonore actif et gyrophare",
  "Autres",
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
  { name: "circonstance_1", label: "Circonstances", type: "text", part: 1 },
  { name: "circonstance_2", label: "Circonstances (suite)", type: "text", part: 1 },
  { name: "mesures_prises", label: "Mesures prises", type: "checkbox-group", part: 1, options: opts(MESURES) },
  { name: "consequences", label: "Conséquences", type: "textarea", part: 1 },
  { name: "causes", label: "Causes (à recueillir auprès du mainteneur si besoin)", type: "select", part: 1, options: opts(CAUSES) },

  // Partie 2 — Avis lancés, documents et clôture
  ...avisFields(),
  { name: "documents_archives", label: "Documents archivés", type: "checkbox-group", part: 2, options: opts(DOCUMENTS) },
  { name: "code_md", label: "Code MD", type: "text", part: 2 },
  { name: "classe_md", label: "Classe MD", type: "text", part: 2 },
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
