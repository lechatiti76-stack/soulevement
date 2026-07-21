/**
 * Génération du PDF "Soulèvement" via un document Google Docs (DocumentApp) construit
 * intégralement par code à chaque génération (pas de template mis en cache/copié — cf.
 * ARCHITECTURE.md §13) : plus simple qu'un aller-retour "template maître + copie +
 * remplacement", et supprime définitivement le risque de PDF reflétant un ancien template
 * périmé après une évolution du schéma (bug suspecté sur la section "Conséquences").
 *
 * Remplace l'ancienne approche Google Slides (page fixe 720×405pt, contenu réparti sur
 * plusieurs diapositives) : Docs paginé nativement (aussi long que nécessaire) et un vrai
 * tableau ajuste son texte tout seul, ce qui règle à la racine le texte mal positionné/coupé
 * (ex. "Heure" scindé sur deux lignes) rencontré avec des zones de texte à largeur fixe.
 * Mécanique commune à tous les modules "formulaire structuré + PDF" factorisée dans
 * lib/pdf-doc-helpers.gs — ce fichier ne contient que ce qui est propre à Soulèvement (couleur,
 * grille conteneur/wagon, tableau de contacts à 3 colonnes).
 */

var SOU_GREEN = "#2f7d3c";

var SOULEVEMENT_SIGNATURE_FIELDS = [
  { name: "signature_st", label: "Service Technique" },
  { name: "signature_gm", label: "Gestionnaire matériels" },
  { name: "signature_ef", label: "Entreprise ferroviaire" },
];

function buildAndExportSoulevementPdf_(dossier) {
  var doc = docNewTemplate_("SOU-" + dossier.numero + "-tmp");
  var body = doc.getBody();
  var formData = JSON.parse(dossier.form_data || "{}");

  docAddHeaderBand_(body, "Soulèvement de wagons — Dossier " + dossier.numero, SOU_GREEN);
  docAddFieldRowN_(body, [
    { label: "Date", token: "date" },
    { label: "Heure", token: "heure" },
    { label: "Nom", token: "nom_controleur" },
  ]);
  docAddSectionTitle_(body, "Localisation (voies)", SOU_GREEN);
  docAddCheckboxGrid_(body, "localisation", VOIES_OPTIONS, 6);
  docAddFieldRow_(body, "Quoi ? (Matériels roulant)", "quoi");
  souAddContainerWagonGrid_(body);
  docAddCheckboxRowInline_(body, "Longueur wagon", "longueur_wagon", ["40'", "60'", "80'"]);
  docAddCheckboxRowInline_(body, "Relevage nécessaire ?", "relevage_necessaire", ["Oui", "Non"]);
  docAddCheckboxRowInline_(body, "Météo", "meteo", ["Ensoleillé", "Brumeux", "Pluvieux", "Vent"]);
  docAddCheckboxRowInline_(body, "Moment", "moment_journee", ["Nuit", "Jour"]);
  docAddCheckboxRowInline_(body, "Visibilité", "visibilite", ["Bonne", "Moyenne", "Mauvaise"]);
  docAddCheckboxList_(body, "Conséquence et mesures conservatoires prises", "consequences", CONSEQUENCES_OPTIONS);

  docAddSectionTitle_(body, "Appel aux personnes concernées", SOU_GREEN);
  souAddContactsTable_(body);

  docAddSectionTitle_(body, "Autorisation de manœuvre reçue", SOU_GREEN);
  docAddSignaturesRow_(body, SOULEVEMENT_SIGNATURE_FIELDS);
  docAddFieldRowN_(body, [
    { label: "Date/heure", token: "date_heure_st" },
    { label: "Date/heure", token: "date_heure_gm" },
    { label: "Date/heure", token: "date_heure_ef" },
  ]);
  docAddFieldRowN_(body, [
    { label: "Validation Aiguilleur le", token: "validation_aiguilleur_le" },
    { label: "Fiche clôturée le", token: "fiche_cloturee_le" },
  ]);

  docCleanupInitialParagraph_(body);

  var replacements = buildTemplateReplacements_(SOULEVEMENT_SCHEMA, formData);
  replacements["numero"] = dossier.numero;
  replacements["date_generation"] = formatDate_(new Date());
  docApplyReplacements_(body, replacements);

  docInsertSignatures_(body, formData, SOULEVEMENT_SIGNATURE_FIELDS);
  docAddPhotoAnnexPages_(body, dossier.id);

  doc.saveAndClose();

  var folder = getDossierFolder_("soulevement", dossier.numero);
  var pdfBlob = DriveApp.getFileById(doc.getId()).getAs("application/pdf");
  pdfBlob.setName(dossier.numero + ".pdf");
  var pdfFile = folder.createFile(pdfBlob);

  DriveApp.getFileById(doc.getId()).setTrashed(true); // seul le PDF est conservé

  return pdfFile;
}

// --- Helpers propres à Soulèvement (pas génériques : structure conteneur/wagon et tableau de
// contacts à 3 colonnes spécifiques à ce module) ---

/** Grille conteneur/wagon (4 positions) — vrai tableau Docs à 3 lignes (libellé de position /
 * N° conteneur / N° wagon), le texte s'ajuste tout seul à la largeur de colonne. */
function souAddContainerWagonGrid_(body) {
  var positions = [
    { label: "Encadrant LH", conteneur: "conteneur_encadrant_lh", wagon: "wagon_encadrant_lh" },
    { label: "Soulevé LH", conteneur: "conteneur_souleve_lh", wagon: "wagon_souleve_lh" },
    { label: "Soulevé PARIS", conteneur: "conteneur_souleve_paris", wagon: "wagon_souleve_paris" },
    { label: "Encadrant PARIS", conteneur: "conteneur_encadrant_paris", wagon: "wagon_encadrant_paris" },
  ];

  var labels = positions.map(function (p) {
    return p.label;
  });
  var conteneurs = positions.map(function (p) {
    return "N° Conteneur : {{" + p.conteneur + "}}";
  });
  var wagons = positions.map(function (p) {
    return "N° Wagon : {{" + p.wagon + "}}";
  });

  var table = body.appendTable([labels, conteneurs, wagons]);
  table.setBorderWidth(0.5);
  for (var c = 0; c < positions.length; c++) {
    table.getCell(0, c).editAsText().setBold(true).setFontSize(9);
    table.getCell(1, c).editAsText().setFontSize(8);
    table.getCell(2, c).editAsText().setFontSize(8);
  }
  return table;
}

/** Tableau de contacts à 3 colonnes (Service Technique LHTE / Gestionnaire matériels /
 * Entreprise ferroviaire) — vrai tableau Docs, une ligne par information. */
function souAddContactsTable_(body) {
  var columns = [
    {
      title: "Service Technique LHTE",
      entreprise: null,
      contactee: "st_personne_contactee",
      heure: "st_heure",
      jointe: "st_jointe",
      telephone: "st_telephone",
    },
    {
      title: "Gestionnaire matériels",
      entreprise: "gm_entreprise",
      contactee: "gm_personne_contactee",
      heure: "gm_heure",
      jointe: "gm_jointe",
      telephone: "gm_telephone",
    },
    {
      title: "Entreprise ferroviaire",
      entreprise: "ef_entreprise",
      contactee: "ef_personne_contactee",
      heure: "ef_heure",
      jointe: "ef_jointe",
      telephone: "ef_telephone",
    },
  ];

  var titles = columns.map(function (c) {
    return c.title;
  });
  var entreprises = columns.map(function (c) {
    return c.entreprise ? "Entreprise : {{" + c.entreprise + "}}" : "";
  });
  var contactees = columns.map(function (c) {
    return "Personne contactée : {{" + c.contactee + "}}";
  });
  var heures = columns.map(function (c) {
    return "Heure : {{" + c.heure + "}}";
  });
  var jointes = columns.map(function (c) {
    return "{{" + c.jointe + "}} Personne jointe    Tél : {{" + c.telephone + "}}";
  });

  var table = body.appendTable([titles, entreprises, contactees, heures, jointes]);
  table.setBorderWidth(0.5);
  for (var c = 0; c < columns.length; c++) {
    table.getCell(0, c).editAsText().setBold(true).setFontSize(9);
    for (var r = 1; r <= 4; r++) {
      table.getCell(r, c).editAsText().setFontSize(8);
    }
  }
  return table;
}
