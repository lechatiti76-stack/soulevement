/**
 * Génération du PDF "Soulèvement" à partir d'un template Google Slides construit par code
 * (contrairement à buildAndExportDossierPdf_ dans pdf.gs, qui construit un Google Doc à la
 * volée sans mise en forme imposée). Ici la mise en forme (couleurs, grille de cases à cocher,
 * tableau de contacts) est fixe. Mécanique commune à tous les modules "formulaire structuré +
 * PDF" factorisée dans lib/pdf-slides-helpers.gs — ce fichier ne contient que ce qui est propre
 * à Soulèvement (couleur, grille conteneur/wagon, tableau de contacts à 3 colonnes).
 *
 * Le fichier Word fourni comme référence n'utilise aucun vrai tableau (`<w:tbl>` = 0,
 * inspection XML) : sa mise en page repose sur 40 zones de texte flottantes, qu'un
 * DocumentApp Apps Script ne peut pas lire/éditer de façon fiable. SlidesApp gère nativement
 * les zones de texte positionnées, et Presentation.replaceAllText() est l'équivalent direct
 * du mécanisme "jetons {{...}} + remplacement" prévu initialement pour un Google Doc.
 *
 * Le template maître (un seul, réutilisé/copié à chaque génération) est construit une fois
 * par getOrBuildSoulevementTemplate_(), au même esprit que setupDatabase() : pas de fichier à
 * uploader manuellement. Reproduction fidèle de l'organisation/libellés/cases à cocher/code
 * couleur vert du document source, sans viser une réplique pixel-perfect du graphique
 * original (icônes de wagons non reproduites). Cf. ARCHITECTURE.md §8, §13.
 */

// Suffixe de version : change à chaque modification de la mise en page du template pour forcer
// sa reconstruction automatique (getOrBuildSoulevementTemplate_ ne réutilise que si la clé de
// propriété correspond exactement) — pas d'étape manuelle nécessaire après un déploiement.
var SOULEVEMENT_TEMPLATE_PROP = "SOULEVEMENT_TEMPLATE_ID_V9";
var SOU_GREEN = "#2f7d3c";

var SOULEVEMENT_SIGNATURE_FIELDS = [
  { name: "signature_st", label: "Service Technique" },
  { name: "signature_gm", label: "Gestionnaire matériels" },
  { name: "signature_ef", label: "Entreprise ferroviaire" },
];

function buildAndExportSoulevementPdf_(dossier) {
  var templateId = getOrBuildSoulevementTemplate_();
  var copyFile = DriveApp.getFileById(templateId).makeCopy("SOU-tmp-" + dossier.numero);
  var presentation = SlidesApp.openById(copyFile.getId());

  var formData = JSON.parse(dossier.form_data || "{}");
  var replacements = buildSlidesReplacements_(SOULEVEMENT_SCHEMA, formData);
  replacements["numero"] = dossier.numero;
  replacements["date_generation"] = formatDate_(new Date());

  Object.keys(replacements).forEach(function (token) {
    presentation.replaceAllText("{{" + token + "}}", replacements[token]);
  });

  slidesInsertSignatures_(presentation, formData, SOULEVEMENT_SIGNATURE_FIELDS);
  slidesAddPhotoAnnexSlides_(presentation, dossier.id);
  presentation.saveAndClose();

  var folder = getDossierFolder_("soulevement", dossier.numero);
  var pdfBlob = DriveApp.getFileById(copyFile.getId()).getAs("application/pdf");
  pdfBlob.setName(dossier.numero + ".pdf");
  var pdfFile = folder.createFile(pdfBlob);

  DriveApp.getFileById(copyFile.getId()).setTrashed(true); // seul le PDF est conservé

  return pdfFile;
}

function getOrBuildSoulevementTemplate_() {
  var props = PropertiesService.getScriptProperties();
  var existingId = props.getProperty(SOULEVEMENT_TEMPLATE_PROP);

  if (existingId) {
    try {
      DriveApp.getFileById(existingId).getName(); // vérifie que le fichier existe toujours
      return existingId;
    } catch (e) {
      // fichier supprimé côté Drive — reconstruit ci-dessous
    }
  }

  var presentation = SlidesApp.create("Soulèvement - Template");
  var slide = presentation.getSlides()[0];
  slide.getShapes().forEach(function (shape) {
    try {
      shape.remove();
    } catch (e) {
      // placeholder déjà retiré
    }
  });

  // Contenu réparti sur 3 diapositives (chacune ≤ ~380pt de contenu réel, marge sous les 405pt
  // disponibles — cf. lib/pdf-slides-helpers.gs) en gardant l'ordre de lecture logique
  // (localisation/matériel → contacts → autorisation).
  var y = 20;
  y = slidesAddHeaderBand_(slide, y, "Soulèvement de wagons — Dossier {{numero}}", SOU_GREEN);
  y = slidesAddFieldRowN_(slide, y, [
    { label: "Date", token: "date" },
    { label: "Heure", token: "heure" },
    { label: "Nom", token: "nom_controleur" },
  ]);
  y = slidesAddSectionTitle_(slide, y, "Localisation (voies)", SOU_GREEN);
  y = slidesAddCheckboxGrid_(slide, y, "localisation", VOIES_OPTIONS, 6);
  y = slidesAddFieldRow_(slide, y, "Quoi ? (Matériels roulant)", "quoi");
  souAddContainerWagonGrid_(slide, y);

  slide = presentation.appendSlide(SlidesApp.PredefinedLayout.BLANK);
  y = 20;
  y = slidesAddCheckboxRowInline_(slide, y, "Longueur wagon", "longueur_wagon", ["40'", "60'", "80'"]);
  y = slidesAddCheckboxRowInline_(slide, y, "Relevage nécessaire ?", "relevage_necessaire", ["Oui", "Non"]);
  y = slidesAddCheckboxRowInline_(slide, y, "Météo", "meteo", ["Ensoleillé", "Brumeux", "Pluvieux", "Vent"]);
  y = slidesAddCheckboxRowInline_(slide, y, "Moment", "moment_journee", ["Nuit", "Jour"]);
  y = slidesAddCheckboxRowInline_(slide, y, "Visibilité", "visibilite", ["Bonne", "Moyenne", "Mauvaise"]);
  y = slidesAddCheckboxList_(slide, y, "Conséquence et mesures conservatoires prises", "consequences", CONSEQUENCES_OPTIONS);
  y = slidesAddSectionTitle_(slide, y, "Appel aux personnes concernées", SOU_GREEN);
  souAddContactsTable_(slide, y);

  slide = presentation.appendSlide(SlidesApp.PredefinedLayout.BLANK);
  y = 20;
  y = slidesAddSectionTitle_(slide, y, "Autorisation de manœuvre reçue", SOU_GREEN);
  y = slidesAddSignaturesRow_(slide, y, SOULEVEMENT_SIGNATURE_FIELDS);
  y = slidesAddFieldTriplet_(slide, y, "Date/heure", ["date_heure_st", "date_heure_gm", "date_heure_ef"]);
  slidesAddFieldPair_(slide, y, "Validation Aiguilleur le", "validation_aiguilleur_le", "Fiche clôturée le", "fiche_cloturee_le");

  presentation.saveAndClose();

  var file = DriveApp.getFileById(presentation.getId());
  var templatesFolder = getOrCreateFolder_(getRootFolder_(), "templates");
  file.moveTo(templatesFolder);

  props.setProperty(SOULEVEMENT_TEMPLATE_PROP, presentation.getId());
  return presentation.getId();
}

// --- Helpers propres à Soulèvement (pas génériques : structure conteneur/wagon et tableau de
// contacts à 3 colonnes spécifiques à ce module) ---

function souAddContainerWagonGrid_(slide, y) {
  var positions = [
    { label: "Encadrant LH", conteneur: "conteneur_encadrant_lh", wagon: "wagon_encadrant_lh" },
    { label: "Soulevé LH", conteneur: "conteneur_souleve_lh", wagon: "wagon_souleve_lh" },
    { label: "Soulevé PARIS", conteneur: "conteneur_souleve_paris", wagon: "wagon_souleve_paris" },
    { label: "Encadrant PARIS", conteneur: "conteneur_encadrant_paris", wagon: "wagon_encadrant_paris" },
  ];
  var colWidth = SLIDES_CONTENT_WIDTH / 4;

  positions.forEach(function (pos, i) {
    var x = SLIDES_MARGIN + i * colWidth;

    var lbl = slide.insertTextBox(pos.label, x, y, colWidth - 6, 16);
    lbl.getText().getTextStyle().setFontSize(9).setBold(true);

    var cLbl = slide.insertTextBox("N° Conteneur :", x, y + 16, colWidth - 6, 14);
    cLbl.getText().getTextStyle().setFontSize(8);
    var cVal = slide.insertTextBox("{{" + pos.conteneur + "}}", x, y + 30, colWidth - 6, 16);
    cVal.getText().getTextStyle().setFontSize(9);

    var wLbl = slide.insertTextBox("N° Wagon :", x, y + 48, colWidth - 6, 14);
    wLbl.getText().getTextStyle().setFontSize(8);
    var wVal = slide.insertTextBox("{{" + pos.wagon + "}}", x, y + 62, colWidth - 6, 16);
    wVal.getText().getTextStyle().setFontSize(9);
  });

  return y + 86;
}

function souAddContactsTable_(slide, y) {
  var columns = [
    {
      title: "Service Technique LHTE",
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
  var colWidth = SLIDES_CONTENT_WIDTH / 3;

  columns.forEach(function (col, i) {
    var x = SLIDES_MARGIN + i * colWidth;
    var cy = y;

    var title = slide.insertTextBox(col.title, x, cy, colWidth - 6, 16);
    title.getText().getTextStyle().setFontSize(9).setBold(true);
    cy += 18;

    if (col.entreprise) {
      var eLbl = slide.insertTextBox("Entreprise :", x, cy, colWidth - 6, 14);
      eLbl.getText().getTextStyle().setFontSize(8);
      var eVal = slide.insertTextBox("{{" + col.entreprise + "}}", x, cy + 14, colWidth - 6, 16);
      eVal.getText().getTextStyle().setFontSize(9);
      cy += 32;
    }

    var pLbl = slide.insertTextBox("Personne contactée :", x, cy, colWidth - 6, 14);
    pLbl.getText().getTextStyle().setFontSize(8);
    var pVal = slide.insertTextBox("{{" + col.contactee + "}}", x, cy + 14, colWidth - 6, 16);
    pVal.getText().getTextStyle().setFontSize(9);
    cy += 32;

    var hLbl = slide.insertTextBox("Heure :", x, cy, colWidth - 6, 14);
    hLbl.getText().getTextStyle().setFontSize(8);
    var hVal = slide.insertTextBox("{{" + col.heure + "}}", x, cy + 14, colWidth - 6, 16);
    hVal.getText().getTextStyle().setFontSize(9);
    cy += 32;

    var jCb = slide.insertTextBox("{{" + col.jointe + "}}", x, cy, 14, 16);
    jCb.getText().getTextStyle().setFontSize(10);
    var jLbl = slide.insertTextBox("Jointe", x + 16, cy, 50, 16);
    jLbl.getText().getTextStyle().setFontSize(8);

    var tLbl = slide.insertTextBox("Tél :", x + 70, cy, 30, 16);
    tLbl.getText().getTextStyle().setFontSize(8);
    var tVal = slide.insertTextBox("{{" + col.telephone + "}}", x + 100, cy, colWidth - 106, 16);
    tVal.getText().getTextStyle().setFontSize(8);
  });

  return y + 140;
}
