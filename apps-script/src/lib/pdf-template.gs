/**
 * Génération du PDF "Soulèvement" à partir d'un template Google Slides construit par code
 * (contrairement à buildAndExportDossierPdf_ dans pdf.gs, qui construit un Google Doc à la
 * volée sans mise en forme imposée). Ici la mise en forme (couleurs, grille de cases à cocher,
 * tableau de contacts) est fixe.
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
 * original (icônes de wagons non reproduites). Cf. ARCHITECTURE.md §8.
 */

var SOULEVEMENT_TEMPLATE_PROP = "SOULEVEMENT_TEMPLATE_ID";
var CB_CHECKED = "☒"; // ☒
var CB_UNCHECKED = "☐"; // ☐
var SOU_GREEN = "#2f7d3c";
var SOU_PAGE_WIDTH = 612;
var SOU_MARGIN = 24;
var SOU_CONTENT_WIDTH = SOU_PAGE_WIDTH - SOU_MARGIN * 2;

function buildAndExportSoulevementPdf_(dossier) {
  var templateId = getOrBuildSoulevementTemplate_();
  var copyFile = DriveApp.getFileById(templateId).makeCopy("SOU-tmp-" + dossier.numero);
  var presentation = SlidesApp.openById(copyFile.getId());

  var formData = JSON.parse(dossier.form_data || "{}");
  var replacements = buildSoulevementReplacements_(dossier, formData);

  Object.keys(replacements).forEach(function (token) {
    presentation.replaceAllText("{{" + token + "}}", replacements[token]);
  });

  insertSoulevementSignatures_(presentation, formData);
  presentation.saveAndClose();

  var folder = getDossierFolder_("soulevement", dossier.numero);
  var pdfBlob = DriveApp.getFileById(copyFile.getId()).getAs("application/pdf");
  pdfBlob.setName(dossier.numero + ".pdf");
  var pdfFile = folder.createFile(pdfBlob);

  DriveApp.getFileById(copyFile.getId()).setTrashed(true); // seul le PDF est conservé

  return pdfFile;
}

function buildSoulevementReplacements_(dossier, formData) {
  var replacements = {};
  replacements["numero"] = dossier.numero;
  replacements["date_generation"] = formatDate_(new Date());

  SOULEVEMENT_SCHEMA.forEach(function (field) {
    var value = formData[field.name];

    if (field.type === "checkbox-group") {
      (field.options || []).forEach(function (opt) {
        var checked = Array.isArray(value) && value.indexOf(opt) !== -1;
        replacements[checkboxToken_(field.name, opt)] = checked ? CB_CHECKED : CB_UNCHECKED;
      });
    } else if (field.type === "radio") {
      (field.options || []).forEach(function (opt) {
        replacements[checkboxToken_(field.name, opt)] = value === opt ? CB_CHECKED : CB_UNCHECKED;
      });
    } else if (field.type === "checkbox") {
      replacements[field.name] = value ? CB_CHECKED : CB_UNCHECKED;
    } else if (field.type === "signature") {
      // gérée séparément (image), pas de remplacement texte
    } else {
      replacements[field.name] = formatFieldValue_(value);
    }
  });

  return replacements;
}

/** Les signatures sont des images, donc insérées après replaceAllText (qui n'agit que sur le texte). */
function insertSoulevementSignatures_(presentation, formData) {
  var slide = presentation.getSlides()[0];

  SOULEVEMENT_SCHEMA.filter(function (f) {
    return f.type === "signature";
  }).forEach(function (field) {
    var dataUrl = formData[field.name];
    if (!dataUrl) return;

    var token = "{{" + field.name + "}}";
    var target = slide.getShapes().filter(function (shape) {
      try {
        return shape.getText().asString().indexOf(token) !== -1;
      } catch (e) {
        return false;
      }
    })[0];
    if (!target) return;

    try {
      var left = target.getLeft();
      var top = target.getTop();
      var width = target.getWidth();
      var height = target.getHeight();
      var base64 = dataUrl.split(",").pop();
      var bytes = Utilities.base64Decode(base64);
      var blob = Utilities.newBlob(bytes, "image/png", field.name + ".png");

      target.getText().setText("");
      slide.insertImage(blob, left, top, width, height);
    } catch (err) {
      // signature illisible — la génération du PDF continue sans bloquer
    }
  });
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
  presentation.setPageSize(SOU_PAGE_WIDTH, 1700);
  var slide = presentation.getSlides()[0];
  slide.getShapes().forEach(function (shape) {
    try {
      shape.remove();
    } catch (e) {
      // placeholder déjà retiré
    }
  });

  var y = 20;
  y = souAddHeaderBand_(slide, y);
  y = souAddFieldPair_(slide, y, "Date", "date", "Heure", "heure");
  y = souAddSectionTitle_(slide, y, "Localisation (voies)");
  y = souAddCheckboxGrid_(slide, y, "localisation", VOIES_OPTIONS, 6);
  y = souAddFieldRow_(slide, y, "Quoi ? (Matériels roulant)", "quoi");
  y = souAddContainerWagonGrid_(slide, y);
  y = souAddCheckboxRowInline_(slide, y, "Longueur wagon", "longueur_wagon", ["40'", "60'", "80'"]);
  y = souAddCheckboxRowInline_(slide, y, "Relevage nécessaire ?", "relevage_necessaire", ["Oui", "Non"]);
  y = souAddCheckboxRowInline_(slide, y, "Météo", "meteo", ["Ensoleillé", "Brumeux", "Pluvieux", "Vent"]);
  y = souAddCheckboxRowInline_(slide, y, "Moment", "moment_journee", ["Nuit", "Jour"]);
  y = souAddCheckboxRowInline_(slide, y, "Visibilité", "visibilite", ["Bonne", "Moyenne", "Mauvaise"]);
  y = souAddTextAreaField_(slide, y, "Conséquence et mesures conservatoires prises", "consequences");

  y = souAddSectionTitle_(slide, y, "Appel aux personnes concernées");
  y = souAddContactsTable_(slide, y);

  y = souAddSectionTitle_(slide, y, "Autorisation de manœuvre reçue");
  y = souAddSignaturesRow_(slide, y);
  y = souAddFieldTriplet_(slide, y, "Date/heure", ["date_heure_st", "date_heure_gm", "date_heure_ef"]);
  y = souAddFieldPair_(slide, y, "Validation Aiguilleur le", "validation_aiguilleur_le", "Fiche clôturée le", "fiche_cloturee_le");

  presentation.saveAndClose();

  var file = DriveApp.getFileById(presentation.getId());
  var templatesFolder = getOrCreateFolder_(getRootFolder_(), "templates");
  file.moveTo(templatesFolder);

  props.setProperty(SOULEVEMENT_TEMPLATE_PROP, presentation.getId());
  return presentation.getId();
}

// --- Helpers de mise en page (curseur Y, unités en points) ---

function souAddHeaderBand_(slide, y) {
  var band = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, SOU_MARGIN, y, SOU_CONTENT_WIDTH, 40);
  band.getFill().setSolidFill(SOU_GREEN);
  band.getBorder().setTransparent();
  var text = band.getText();
  text.setText("Soulèvement de wagons — Dossier {{numero}}");
  text.getTextStyle().setForegroundColor("#ffffff").setBold(true).setFontSize(16);
  text.getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
  return y + 50;
}

function souAddSectionTitle_(slide, y, label) {
  var band = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, SOU_MARGIN, y, SOU_CONTENT_WIDTH, 22);
  band.getFill().setSolidFill(SOU_GREEN);
  band.getBorder().setTransparent();
  var text = band.getText();
  text.setText(label);
  text.getTextStyle().setForegroundColor("#ffffff").setBold(true).setFontSize(11);
  return y + 30;
}

function souAddFieldRow_(slide, y, label, token) {
  var labelBox = slide.insertTextBox(label + " :", SOU_MARGIN, y, 220, 18);
  labelBox.getText().getTextStyle().setFontSize(10).setBold(true);
  var valueBox = slide.insertTextBox("{{" + token + "}}", SOU_MARGIN + 220, y, SOU_CONTENT_WIDTH - 220, 18);
  valueBox.getText().getTextStyle().setFontSize(10);
  return y + 24;
}

function souAddFieldPair_(slide, y, label1, token1, label2, token2) {
  var half = SOU_CONTENT_WIDTH / 2;

  var l1 = slide.insertTextBox(label1 + " :", SOU_MARGIN, y, half - 10, 18);
  l1.getText().getTextStyle().setFontSize(10).setBold(true);
  var v1 = slide.insertTextBox("{{" + token1 + "}}", SOU_MARGIN, y + 18, half - 10, 18);
  v1.getText().getTextStyle().setFontSize(10);

  var l2 = slide.insertTextBox(label2 + " :", SOU_MARGIN + half, y, half - 10, 18);
  l2.getText().getTextStyle().setFontSize(10).setBold(true);
  var v2 = slide.insertTextBox("{{" + token2 + "}}", SOU_MARGIN + half, y + 18, half - 10, 18);
  v2.getText().getTextStyle().setFontSize(10);

  return y + 44;
}

function souAddFieldTriplet_(slide, y, label, tokens) {
  var third = SOU_CONTENT_WIDTH / 3;

  tokens.forEach(function (token, i) {
    var x = SOU_MARGIN + i * third;
    var lbl = slide.insertTextBox(label + " :", x, y, third - 10, 16);
    lbl.getText().getTextStyle().setFontSize(9).setBold(true);
    var val = slide.insertTextBox("{{" + token + "}}", x, y + 16, third - 10, 18);
    val.getText().getTextStyle().setFontSize(9);
  });

  return y + 40;
}

function souAddCheckboxGrid_(slide, y, fieldName, options, perRow) {
  var cellWidth = SOU_CONTENT_WIDTH / perRow;

  options.forEach(function (opt, i) {
    var col = i % perRow;
    var row = Math.floor(i / perRow);
    var x = SOU_MARGIN + col * cellWidth;
    var rowY = y + row * 18;

    var cb = slide.insertTextBox("{{" + checkboxToken_(fieldName, opt) + "}}", x, rowY, 16, 16);
    cb.getText().getTextStyle().setFontSize(10);
    var lbl = slide.insertTextBox(opt, x + 16, rowY, cellWidth - 16, 16);
    lbl.getText().getTextStyle().setFontSize(9);
  });

  var rows = Math.ceil(options.length / perRow);
  return y + rows * 18 + 8;
}

function souAddCheckboxRowInline_(slide, y, label, fieldName, options) {
  var lbl = slide.insertTextBox(label + " :", SOU_MARGIN, y, 140, 18);
  lbl.getText().getTextStyle().setFontSize(10).setBold(true);

  var x = SOU_MARGIN + 140;
  options.forEach(function (opt) {
    var cb = slide.insertTextBox("{{" + checkboxToken_(fieldName, opt) + "}}", x, y, 14, 16);
    cb.getText().getTextStyle().setFontSize(10);
    var optWidth = 20 + opt.length * 6;
    var optLbl = slide.insertTextBox(opt, x + 14, y, optWidth, 16);
    optLbl.getText().getTextStyle().setFontSize(9);
    x += 14 + optWidth + 6;
  });

  return y + 24;
}

function souAddTextAreaField_(slide, y, label, token) {
  var lbl = slide.insertTextBox(label + " :", SOU_MARGIN, y, SOU_CONTENT_WIDTH, 16);
  lbl.getText().getTextStyle().setFontSize(10).setBold(true);

  var box = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, SOU_MARGIN, y + 18, SOU_CONTENT_WIDTH, 50);
  box.getBorder().getLineFill().setSolidFill("#cccccc");
  box.getFill().setTransparent();
  var text = box.getText();
  text.setText("{{" + token + "}}");
  text.getTextStyle().setFontSize(9);

  return y + 76;
}

function souAddContainerWagonGrid_(slide, y) {
  var positions = [
    { label: "Encadrant LH", conteneur: "conteneur_encadrant_lh", wagon: "wagon_encadrant_lh" },
    { label: "Soulevé LH", conteneur: "conteneur_souleve_lh", wagon: "wagon_souleve_lh" },
    { label: "Soulevé PARIS", conteneur: "conteneur_souleve_paris", wagon: "wagon_souleve_paris" },
    { label: "Encadrant PARIS", conteneur: "conteneur_encadrant_paris", wagon: "wagon_encadrant_paris" },
  ];
  var colWidth = SOU_CONTENT_WIDTH / 4;

  positions.forEach(function (pos, i) {
    var x = SOU_MARGIN + i * colWidth;

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
    { title: "Service Technique LHTE", contactee: "st_personne_contactee", heure: "st_heure", jointe: "st_jointe" },
    {
      title: "Gestionnaire matériels",
      entreprise: "gm_entreprise",
      contactee: "gm_personne_contactee",
      heure: "gm_heure",
      jointe: "gm_jointe",
    },
    {
      title: "Entreprise ferroviaire",
      entreprise: "ef_entreprise",
      contactee: "ef_personne_contactee",
      heure: "ef_heure",
      jointe: "ef_jointe",
    },
  ];
  var colWidth = SOU_CONTENT_WIDTH / 3;

  columns.forEach(function (col, i) {
    var x = SOU_MARGIN + i * colWidth;
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
    var jLbl = slide.insertTextBox("Personne jointe", x + 16, cy, colWidth - 22, 16);
    jLbl.getText().getTextStyle().setFontSize(8);
  });

  return y + 140;
}

function souAddSignaturesRow_(slide, y) {
  var fields = [
    { label: "Service Technique", token: "signature_st" },
    { label: "Gestionnaire matériels", token: "signature_gm" },
    { label: "Entreprise ferroviaire", token: "signature_ef" },
  ];
  var colWidth = SOU_CONTENT_WIDTH / 3;
  var boxHeight = 70;

  fields.forEach(function (f, i) {
    var x = SOU_MARGIN + i * colWidth;

    var lbl = slide.insertTextBox(f.label, x, y, colWidth - 10, 16);
    lbl.getText().getTextStyle().setFontSize(9).setBold(true);

    var box = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, x, y + 18, colWidth - 10, boxHeight);
    box.getBorder().getLineFill().setSolidFill("#999999");
    box.getFill().setTransparent();
    box.getText().setText("{{" + f.token + "}}");
    box.getText().getTextStyle().setFontSize(7).setForegroundColor("#cccccc");
  });

  return y + 18 + boxHeight + 12;
}
