/**
 * Schéma du formulaire "Bris de barrières" (accidents : barrières, collisions, événements),
 * en 2 parties — pensé pour rester court à l'écran sur mobile. Utilisé par
 * lib/pdf-template-bris.gs pour construire/remplir le template Slides et pour les libellés.
 *
 * IMPORTANT : doit rester synchronisé manuellement avec
 * web/src/modules/bris-barrieres/schema.ts (mêmes name/type/options) — cf. ARCHITECTURE.md §10.
 */

var BAR_LIEU_OPTIONS = ["TR 124", "TR 128", "TR 192"];
var BAR_EMETTEUR_OPTIONS = ["PATON ROMUALD"];
var BAR_NATURE_OPTIONS = ["Prise de barrière", "Collision"];
var BAR_NATURE_DETAIL_OPTIONS = ["1 demi barrière", "2 barrière"];
var BAR_TYPE_COLLISION_OPTIONS = [
  "Collision piéton",
  "Collision véhicule",
  "Collision obstacle",
  "Collision avec un engin de manutention",
  "Collision/déraillement de wagon(s), rails, obstacle",
  "Autres",
];
var BAR_MESURES_OPTIONS = [
  "Arrêt des circulations ferroviaire",
  "Arrêt des circulations ferroviaire partielle côté Le Havre",
  "Arrêt des circulations ferroviaire partielle côté Paris",
];
var BAR_CONSEQUENCES_OPTIONS = [
  "Suspension de l'ensemble des transports ferroviaires et routiers",
  "Suspension de l'ensemble des transports ferroviaires",
];
var BAR_CAUSES_OPTIONS = [
  "Défaillance des SAL (Système automatique lumineux)",
  "Défaillance des systèmes sonores",
  "Défaillance des barrières",
  "Non-respect des consignes ferroviaires",
  "Autres",
];
var BAR_STATUT_AVIS_OPTIONS = ["Reçu", "Non reçu"];
var BAR_DOCUMENTS_OPTIONS = ["Constat", "Photos", "RCI", "Vidéo", "Bulletin C"];

// Les 9 organismes du tableau "Avis lancés" (case + heure pour chacun) — ordre calqué sur le
// document papier fourni.
var BAR_ORGANISMES = [
  { key: "service_technique_lhte", label: "Service Technique LHTE" },
  { key: "evenement_securite", label: "Événement lié à la sécurité" },
  { key: "pompiers", label: "Pompiers" },
  { key: "astreinte_socorail", label: "Astreinte SOCORAIL" },
  { key: "securite_portuaire", label: "Sécurité portuaire" },
  { key: "gendarmerie", label: "Gendarmerie" },
  { key: "astreinte_nrs", label: "Astreinte NRS" },
  { key: "ccl", label: "CCL" },
  { key: "autres_organisme", label: "Autres" },
];

function brisBarrieresAvisFields_() {
  var fields = [];
  BAR_ORGANISMES.forEach(function (org) {
    fields.push({
      name: org.key + "_statut",
      label: org.label + " — Avis lancé",
      type: "select",
      part: 2,
      options: BAR_STATUT_AVIS_OPTIONS,
    });
    fields.push({ name: org.key + "_heure", label: org.label + " — Heure", type: "time", part: 2 });
  });
  return fields;
}

var BRIS_BARRIERES_SCHEMA = [
  // Partie 1 — Informations générales
  { name: "date", label: "Date", type: "date", part: 1 },
  { name: "heure", label: "Heure", type: "time", part: 1 },
  { name: "lieu", label: "Lieu", type: "select", part: 1, options: BAR_LIEU_OPTIONS },
  { name: "nom_emetteur", label: "Nom émetteur", type: "select", part: 1, options: BAR_EMETTEUR_OPTIONS },
  { name: "nature", label: "Nature de l'évènement", type: "select", part: 1, options: BAR_NATURE_OPTIONS },
  { name: "nature_detail", label: "Détail", type: "select", part: 1, options: BAR_NATURE_DETAIL_OPTIONS },
  {
    name: "type_collision",
    label: "Type de collision",
    type: "select",
    part: 1,
    options: BAR_TYPE_COLLISION_OPTIONS,
  },
  { name: "circonstance_1", label: "Circonstances", type: "text", part: 1 },
  { name: "circonstance_2", label: "Circonstances (suite)", type: "text", part: 1 },
  {
    name: "mesures_prises",
    label: "Mesures prises",
    type: "checkbox-group",
    part: 1,
    options: BAR_MESURES_OPTIONS,
  },
  {
    name: "consequences",
    label: "Conséquences",
    type: "checkbox-group",
    part: 1,
    options: BAR_CONSEQUENCES_OPTIONS,
  },
  { name: "causes", label: "Causes (à recueillir auprès du mainteneur si besoin)", type: "select", part: 1, options: BAR_CAUSES_OPTIONS },

  // Partie 2 — Avis lancés, documents et clôture
].concat(brisBarrieresAvisFields_()).concat([
  {
    name: "documents_archives",
    label: "Documents archivés",
    type: "checkbox-group",
    part: 2,
    options: BAR_DOCUMENTS_OPTIONS,
  },
  { name: "code_md", label: "Code MD", type: "text", part: 2 },
  { name: "classe_md", label: "Classe MD", type: "text", part: 2 },
  { name: "numero_conteneur", label: "N° conteneur", type: "text", part: 2 },
  { name: "reprise_service_normal", label: "Reprise du service normal", type: "radio", part: 2, options: ["Oui", "Non"] },
  { name: "date_heure_reprise", label: "Date et heure de reprise", type: "text", part: 2 },
]);
