/**
 * Schéma du formulaire "Nouvelle demande" — utilisé uniquement pour produire les libellés
 * dans le PDF généré (cf. lib/pdf.gs). Le rendu du formulaire lui-même est côté frontend.
 *
 * IMPORTANT : doit rester synchronisé manuellement avec
 * web/src/modules/nouvelle-demande/schema.ts (mêmes name/label/type). Phase 2 accepte cette
 * duplication (un seul module) ; à revoir si un schéma partagé devient nécessaire (Phase 3+).
 */
var DOSSIER_SCHEMA = [
  { name: "objet", label: "Objet de la demande", type: "text" },
  { name: "description", label: "Description détaillée", type: "textarea" },
  { name: "date_evenement", label: "Date de l'événement", type: "date" },
  { name: "heure_evenement", label: "Heure", type: "time" },
  { name: "montant", label: "Montant (€)", type: "number" },
  { name: "telephone", label: "Téléphone", type: "tel" },
  { name: "email", label: "Email", type: "email" },
  { name: "adresse", label: "Adresse", type: "textarea" },
  { name: "priorite", label: "Priorité", type: "radio" },
  { name: "type_demande", label: "Type de demande", type: "select" },
  { name: "confirmation", label: "Je certifie l'exactitude des informations", type: "checkbox" },
  { name: "signature", label: "Signature", type: "signature" },
];
