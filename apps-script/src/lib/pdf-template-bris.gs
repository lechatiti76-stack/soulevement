/**
 * Génération du PDF "Bris de barrières" (accidents : barrières, collisions, événements) —
 * même mécanique que Soulèvement (cf. pdf-template.gs, pdf-slides-helpers.gs) : template
 * Google Slides construit par code, un slide = une page PDF à l'export, contenu réparti sur
 * plusieurs diapositives (page fixe 720×405pt). Cf. ARCHITECTURE.md §13.
 */

var BRIS_TEMPLATE_PROP = "BRIS_BARRIERES_TEMPLATE_ID_V1";
var BAR_BLUE = "#1d5a8c";

var BRIS_CONSEQUENCES_NOTE =
  "Ex. accident à un passage à niveau, y compris impliquant des piétons, toutes ventilations de passage à niveau";

function buildAndExportBrisBarrieresPdf_(dossier) {
  var templateId = getOrBuildBrisBarrieresTemplate_();
  var copyFile = DriveApp.getFileById(templateId).makeCopy("BAR-tmp-" + dossier.numero);
  var presentation = SlidesApp.openById(copyFile.getId());

  var formData = JSON.parse(dossier.form_data || "{}");
  var replacements = buildSlidesReplacements_(BRIS_BARRIERES_SCHEMA, formData);
  replacements["numero"] = dossier.numero;
  replacements["date_generation"] = formatDate_(new Date());

  Object.keys(replacements).forEach(function (token) {
    presentation.replaceAllText("{{" + token + "}}", replacements[token]);
  });

  slidesAddPhotoAnnexSlides_(presentation, dossier.id);
  presentation.saveAndClose();

  var folder = getDossierFolder_("bris-barrieres", dossier.numero);
  var pdfBlob = DriveApp.getFileById(copyFile.getId()).getAs("application/pdf");
  pdfBlob.setName(dossier.numero + ".pdf");
  var pdfFile = folder.createFile(pdfBlob);

  DriveApp.getFileById(copyFile.getId()).setTrashed(true); // seul le PDF est conservé

  return pdfFile;
}

function getOrBuildBrisBarrieresTemplate_() {
  var props = PropertiesService.getScriptProperties();
  var existingId = props.getProperty(BRIS_TEMPLATE_PROP);

  if (existingId) {
    try {
      DriveApp.getFileById(existingId).getName();
      return existingId;
    } catch (e) {
      // fichier supprimé côté Drive — reconstruit ci-dessous
    }
  }

  var presentation = SlidesApp.create("Bris de barrières - Template");
  var slide = presentation.getSlides()[0];
  slide.getShapes().forEach(function (shape) {
    try {
      shape.remove();
    } catch (e) {
      // placeholder déjà retiré
    }
  });

  // Diapositive 1 — Informations générales
  var y = 20;
  y = slidesAddHeaderBand_(slide, y, "Accidents (barrières, collisions, événements) — Dossier {{numero}}", BAR_BLUE);
  y = slidesAddFieldRowN_(slide, y, [
    { label: "Date", token: "date" },
    { label: "Heure", token: "heure" },
    { label: "Lieu", token: "lieu" },
  ]);
  y = slidesAddFieldRowN_(slide, y, [
    { label: "Nom émetteur", token: "nom_emetteur" },
    { label: "Nature", token: "nature" },
    { label: "Détail", token: "nature_detail" },
  ]);
  y = slidesAddFieldRow_(slide, y, "Type de collision", "type_collision");
  y = slidesAddFieldPair_(slide, y, "Circonstances", "circonstance_1", "Circonstances (suite)", "circonstance_2");
  y = slidesAddCheckboxList_(slide, y, "Mesures prises", "mesures_prises", BAR_MESURES_OPTIONS);
  y = slidesAddTextArea_(slide, y, "Conséquences", "consequences", BRIS_CONSEQUENCES_NOTE);
  slidesAddFieldRow_(slide, y, "Causes", "causes");

  // Diapositive 2 — Avis lancés, documents et clôture
  slide = presentation.appendSlide(SlidesApp.PredefinedLayout.BLANK);
  y = 20;
  y = slidesAddSectionTitle_(slide, y, "Avis lancés", BAR_BLUE);
  y = barAddAvisGrid_(slide, y);
  y = slidesAddCheckboxRowInline_(slide, y, "Documents archivés", "documents_archives", BAR_DOCUMENTS_OPTIONS);
  y = slidesAddFieldRowN_(slide, y, [
    { label: "Code MD", token: "code_md" },
    { label: "Classe MD", token: "classe_md" },
    { label: "N° conteneur", token: "numero_conteneur" },
  ]);
  y = slidesAddCheckboxRowInline_(slide, y, "Reprise du service normal ?", "reprise_service_normal", ["Oui", "Non"]);
  slidesAddFieldRow_(slide, y, "Date et heure de reprise", "date_heure_reprise");

  presentation.saveAndClose();

  var file = DriveApp.getFileById(presentation.getId());
  var templatesFolder = getOrCreateFolder_(getRootFolder_(), "templates");
  file.moveTo(templatesFolder);

  props.setProperty(BRIS_TEMPLATE_PROP, presentation.getId());
  return presentation.getId();
}

/** Grille 3×3 des 9 organismes à alerter — chaque cellule affiche le nom, le statut de l'avis
 * (Reçu/Non reçu) et l'heure. Structure propre à Bris de barrières (différente du tableau de
 * contacts à 3 colonnes de Soulèvement), donc pas dans les helpers partagés. */
function barAddAvisGrid_(slide, y) {
  var perRow = 3;
  var colWidth = SLIDES_CONTENT_WIDTH / perRow;
  var rowHeight = 42;

  BAR_ORGANISMES.forEach(function (org, i) {
    var col = i % perRow;
    var row = Math.floor(i / perRow);
    var x = SLIDES_MARGIN + col * colWidth;
    var cy = y + row * rowHeight;

    var lbl = slide.insertTextBox(org.label, x, cy, colWidth - 6, 12);
    lbl.getText().getTextStyle().setFontSize(8).setBold(true);

    var sLbl = slide.insertTextBox("Avis :", x, cy + 13, 32, 12);
    sLbl.getText().getTextStyle().setFontSize(7);
    var sVal = slide.insertTextBox("{{" + org.key + "_statut}}", x + 32, cy + 13, colWidth - 38, 12);
    sVal.getText().getTextStyle().setFontSize(7);

    var hLbl = slide.insertTextBox("Heure :", x, cy + 26, 32, 12);
    hLbl.getText().getTextStyle().setFontSize(7);
    var hVal = slide.insertTextBox("{{" + org.key + "_heure" + "}}", x + 32, cy + 26, colWidth - 38, 12);
    hVal.getText().getTextStyle().setFontSize(7);
  });

  var rows = Math.ceil(BAR_ORGANISMES.length / perRow);
  return y + rows * rowHeight + 6;
}
