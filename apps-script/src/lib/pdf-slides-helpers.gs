/**
 * Helpers de mise en page génériques pour les templates PDF construits via Google Slides
 * (un slide = une page PDF à l'export) — réutilisés par tous les modules "formulaire structuré
 * + PDF" (Soulèvement, Bris de barrières, futurs modules).
 *
 * Format de page fixe 720×405pt (16:9 standard) : Slides.Presentations.create() ignore
 * silencieusement un pageSize personnalisé (testé en PT, en EMU, et via un appel REST direct
 * contournant le binding Apps Script — toujours retombé sur 720×405) — découverte faite en
 * construisant le module Soulèvement, cf. ARCHITECTURE.md §13. Le contenu de chaque module est
 * donc réparti sur plusieurs diapositives plutôt que sur une page unique surdimensionnée.
 */

var CB_CHECKED = "☒";
var CB_UNCHECKED = "☐";
var SLIDES_PAGE_WIDTH = 720;
var SLIDES_MARGIN = 24;
var SLIDES_CONTENT_WIDTH = SLIDES_PAGE_WIDTH - SLIDES_MARGIN * 2;

/** Jeton de remplacement pour une option de case à cocher (radio ou checkbox-group). */
function checkboxToken_(fieldName, optionValue) {
  return fieldName + "__" + String(optionValue).replace(/[^a-zA-Z0-9]/g, "");
}

function slidesAddHeaderBand_(slide, y, text, color) {
  var band = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, SLIDES_MARGIN, y, SLIDES_CONTENT_WIDTH, 40);
  band.getFill().setSolidFill(color);
  band.getBorder().setTransparent();
  var t = band.getText();
  t.setText(text);
  t.getTextStyle().setForegroundColor("#ffffff").setBold(true).setFontSize(16);
  t.getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
  return y + 50;
}

function slidesAddSectionTitle_(slide, y, label, color) {
  var band = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, SLIDES_MARGIN, y, SLIDES_CONTENT_WIDTH, 22);
  band.getFill().setSolidFill(color);
  band.getBorder().setTransparent();
  var t = band.getText();
  t.setText(label);
  t.getTextStyle().setForegroundColor("#ffffff").setBold(true).setFontSize(11);
  return y + 30;
}

function slidesAddFieldRow_(slide, y, label, token) {
  var labelBox = slide.insertTextBox(label + " :", SLIDES_MARGIN, y, 220, 18);
  labelBox.getText().getTextStyle().setFontSize(10).setBold(true);
  var valueBox = slide.insertTextBox("{{" + token + "}}", SLIDES_MARGIN + 220, y, SLIDES_CONTENT_WIDTH - 220, 18);
  valueBox.getText().getTextStyle().setFontSize(10);
  return y + 24;
}

function slidesAddFieldPair_(slide, y, label1, token1, label2, token2) {
  var half = SLIDES_CONTENT_WIDTH / 2;

  var l1 = slide.insertTextBox(label1 + " :", SLIDES_MARGIN, y, half - 10, 18);
  l1.getText().getTextStyle().setFontSize(10).setBold(true);
  var v1 = slide.insertTextBox("{{" + token1 + "}}", SLIDES_MARGIN, y + 18, half - 10, 18);
  v1.getText().getTextStyle().setFontSize(10);

  var l2 = slide.insertTextBox(label2 + " :", SLIDES_MARGIN + half, y, half - 10, 18);
  l2.getText().getTextStyle().setFontSize(10).setBold(true);
  var v2 = slide.insertTextBox("{{" + token2 + "}}", SLIDES_MARGIN + half, y + 18, half - 10, 18);
  v2.getText().getTextStyle().setFontSize(10);

  return y + 44;
}

/** Rangée à N colonnes égales, chacune avec son propre libellé (contrairement à
 * slidesAddFieldTriplet_, qui répète le même libellé pour N jetons). */
function slidesAddFieldRowN_(slide, y, fields) {
  var colWidth = SLIDES_CONTENT_WIDTH / fields.length;

  fields.forEach(function (f, i) {
    var x = SLIDES_MARGIN + i * colWidth;
    var lbl = slide.insertTextBox(f.label + " :", x, y, colWidth - 10, 18);
    lbl.getText().getTextStyle().setFontSize(10).setBold(true);
    var val = slide.insertTextBox("{{" + f.token + "}}", x, y + 18, colWidth - 10, 18);
    val.getText().getTextStyle().setFontSize(10);
  });

  return y + 44;
}

function slidesAddFieldTriplet_(slide, y, label, tokens) {
  var third = SLIDES_CONTENT_WIDTH / 3;

  tokens.forEach(function (token, i) {
    var x = SLIDES_MARGIN + i * third;
    var lbl = slide.insertTextBox(label + " :", x, y, third - 10, 16);
    lbl.getText().getTextStyle().setFontSize(9).setBold(true);
    var val = slide.insertTextBox("{{" + token + "}}", x, y + 16, third - 10, 18);
    val.getText().getTextStyle().setFontSize(9);
  });

  return y + 40;
}

function slidesAddCheckboxGrid_(slide, y, fieldName, options, perRow) {
  var cellWidth = SLIDES_CONTENT_WIDTH / perRow;

  options.forEach(function (opt, i) {
    var col = i % perRow;
    var row = Math.floor(i / perRow);
    var x = SLIDES_MARGIN + col * cellWidth;
    var rowY = y + row * 18;

    var cb = slide.insertTextBox("{{" + checkboxToken_(fieldName, opt) + "}}", x, rowY, 16, 16);
    cb.getText().getTextStyle().setFontSize(10);
    var lbl = slide.insertTextBox(opt, x + 16, rowY, cellWidth - 16, 16);
    lbl.getText().getTextStyle().setFontSize(9);
  });

  var rows = Math.ceil(options.length / perRow);
  return y + rows * 18 + 8;
}

function slidesAddCheckboxRowInline_(slide, y, label, fieldName, options) {
  var lbl = slide.insertTextBox(label + " :", SLIDES_MARGIN, y, 140, 18);
  lbl.getText().getTextStyle().setFontSize(10).setBold(true);

  var x = SLIDES_MARGIN + 140;
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

/** Liste verticale de phrases à cocher, une par ligne (options trop longues pour un alignement
 * horizontal comme slidesAddCheckboxRowInline_) — ex. "Conséquences et mesures". */
function slidesAddCheckboxList_(slide, y, label, fieldName, options) {
  var lbl = slide.insertTextBox(label + " :", SLIDES_MARGIN, y, SLIDES_CONTENT_WIDTH, 14);
  lbl.getText().getTextStyle().setFontSize(9).setBold(true);
  y += 15;

  options.forEach(function (opt) {
    var cb = slide.insertTextBox("{{" + checkboxToken_(fieldName, opt) + "}}", SLIDES_MARGIN, y, 14, 12);
    cb.getText().getTextStyle().setFontSize(8);
    var optLbl = slide.insertTextBox(opt, SLIDES_MARGIN + 16, y, SLIDES_CONTENT_WIDTH - 16, 12);
    optLbl.getText().getTextStyle().setFontSize(7);
    y += 13;
  });

  return y + 4;
}

/** Zone de texte libre encadrée (ex. "Conséquences") — noteText optionnel : ligne d'exemple/
 * instruction imprimée en permanence sous le libellé (texte fixe, pas un jeton). */
function slidesAddTextArea_(slide, y, label, token, noteText) {
  var lbl = slide.insertTextBox(label + " :", SLIDES_MARGIN, y, SLIDES_CONTENT_WIDTH, 14);
  lbl.getText().getTextStyle().setFontSize(9).setBold(true);
  y += 15;

  if (noteText) {
    var note = slide.insertTextBox(noteText, SLIDES_MARGIN, y, SLIDES_CONTENT_WIDTH, 22);
    note.getText().getTextStyle().setFontSize(6).setItalic(true).setForegroundColor("#666666");
    y += 24;
  }

  var box = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, SLIDES_MARGIN, y, SLIDES_CONTENT_WIDTH, 36);
  box.getBorder().getLineFill().setSolidFill("#cccccc");
  box.getFill().setTransparent();
  var text = box.getText();
  text.setText("{{" + token + "}}");
  text.getTextStyle().setFontSize(8);

  return y + 44;
}

/** N zones de signature (image insérée séparément, cf. slidesInsertSignatures_) réparties en
 * colonnes égales. fields = [{ label, token }]. */
function slidesAddSignaturesRow_(slide, y, fields) {
  var colWidth = SLIDES_CONTENT_WIDTH / fields.length;
  var boxHeight = 70;

  fields.forEach(function (f, i) {
    var x = SLIDES_MARGIN + i * colWidth;

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

/**
 * Insère les images de signature (formData[field.name] = data URL base64 PNG) en cherchant le
 * jeton {{field.name}} sur toutes les diapositives — le contenu d'un dossier peut être réparti
 * sur plusieurs pages. signatureFields = [{ name, label }] (label non utilisé ici, juste pour
 * la cohérence avec le schéma appelant).
 */
function slidesInsertSignatures_(presentation, formData, signatureFields) {
  var slides = presentation.getSlides();

  signatureFields.forEach(function (field) {
    var dataUrl = formData[field.name];
    if (!dataUrl) return;

    var token = "{{" + field.name + "}}";
    var target = null;
    var targetSlide = null;
    slides.forEach(function (s) {
      if (target) return;
      var found = s.getShapes().filter(function (shape) {
        try {
          return shape.getText().asString().indexOf(token) !== -1;
        } catch (e) {
          return false;
        }
      })[0];
      if (found) {
        target = found;
        targetSlide = s;
      }
    });
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
      targetSlide.insertImage(blob, left, top, width, height);
    } catch (err) {
      // signature illisible — la génération du PDF continue sans bloquer
    }
  });
}

/** Une page supplémentaire par photo annexe du dossier (docmod_annexes, type "photo"), en
 * taille réelle (mise à l'échelle pour tenir sur la page sans dépasser, sans agrandir au-delà
 * de la résolution native). Miniatures affichées dans le formulaire (AnnexePhotosField) ; ici
 * la photo pleine page, après le contenu principal. */
function slidesAddPhotoAnnexSlides_(presentation, dossierId) {
  var photos = readTable_("docmod_annexes").filter(function (a) {
    return String(a.dossier_id) === String(dossierId) && a.type === "photo";
  });
  if (!photos.length) return;

  var pageW = presentation.getPageWidth();
  var pageH = presentation.getPageHeight();

  photos.forEach(function (photo) {
    try {
      var blob = DriveApp.getFileById(photo.drive_file_id).getBlob();
      var slide = presentation.appendSlide(SlidesApp.PredefinedLayout.BLANK);
      var image = slide.insertImage(blob);

      var scale = Math.min(pageW / image.getWidth(), pageH / image.getHeight(), 1);
      var w = image.getWidth() * scale;
      var h = image.getHeight() * scale;
      image.setWidth(w).setHeight(h);
      image.setLeft((pageW - w) / 2).setTop((pageH - h) / 2);
    } catch (err) {
      // photo illisible — la génération du PDF continue sans bloquer
    }
  });
}

/**
 * Construit l'objet de remplacements texte->texte à partir d'un schéma de champs générique
 * (mêmes conventions que SOULEVEMENT_SCHEMA / BRIS_BARRIERES_SCHEMA : type, options,
 * checkbox-group/radio/checkbox/signature/autre). Les signatures sont gérées séparément
 * (image), pas de remplacement texte pour ces champs.
 */
function buildSlidesReplacements_(schema, formData) {
  var replacements = {};

  schema.forEach(function (field) {
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
