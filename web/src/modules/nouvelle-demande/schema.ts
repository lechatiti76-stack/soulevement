export type FieldType =
  | "text"
  | "textarea"
  | "date"
  | "time"
  | "number"
  | "tel"
  | "email"
  | "select"
  | "radio"
  | "checkbox"
  | "signature";

export type FieldOption = { value: string; label: string };

export type FieldDef = {
  name: string;
  label: string;
  type: FieldType;
  required?: boolean;
  options?: FieldOption[];
};

// IMPORTANT : doit rester synchronisé manuellement avec
// apps-script/src/modules/dossier-schema.gs (mêmes name/label/type) — cf. ARCHITECTURE.md §10.
export const dossierSchema: FieldDef[] = [
  { name: "objet", label: "Objet de la demande", type: "text", required: true },
  { name: "description", label: "Description détaillée", type: "textarea" },
  { name: "date_evenement", label: "Date de l'événement", type: "date" },
  { name: "heure_evenement", label: "Heure", type: "time" },
  { name: "montant", label: "Montant (€)", type: "number" },
  { name: "telephone", label: "Téléphone", type: "tel" },
  { name: "email", label: "Email", type: "email" },
  { name: "adresse", label: "Adresse", type: "textarea" },
  {
    name: "priorite",
    label: "Priorité",
    type: "radio",
    options: [
      { value: "normale", label: "Normale" },
      { value: "urgente", label: "Urgente" },
    ],
  },
  {
    name: "type_demande",
    label: "Type de demande",
    type: "select",
    options: [
      { value: "administratif", label: "Administratif" },
      { value: "technique", label: "Technique" },
      { value: "financier", label: "Financier" },
      { value: "autre", label: "Autre" },
    ],
  },
  { name: "confirmation", label: "Je certifie l'exactitude des informations", type: "checkbox" },
  { name: "signature", label: "Signature", type: "signature" },
];
