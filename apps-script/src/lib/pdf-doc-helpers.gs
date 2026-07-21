/**
 * Helpers génériques pour les templates PDF construits via Google Docs (DocumentApp),
 * entièrement générés par code (pas en éditant un fichier existant). Remplace l'approche
 * Slides (lib/pdf-slides-helpers.gs, conservée pour référence) : Slides impose une page fixe
 * 720×405pt qui forçait un découpage en plusieurs diapositives et provoquait un texte mal
 * ajusté (ex. libellé "Heure" coupé en deux lignes faute de place). Docs gère nativement la
 * pagination (aussi long que nécessaire, saut de page automatique) et le retour à la ligne, et
 * son modèle "tableau" convient bien aux grilles de cases à cocher et tableaux de contacts.
 *
 * Le fichier Word source fourni comme référence n'utilise aucun vrai tableau — sa mise en page
 * repose sur des zones de texte flottantes, qu'un DocumentApp ne peut pas lire/éditer de façon
 * fiable EN ÉDITANT ce fichier existant. Cette limite ne s'applique pas ici : le contenu est
 * construit intégralement par code, DocumentApp est donc l'outil normal pour ce cas.
 */

var DOC_MARGIN = 36; // 0,5 pouce
var DOC_CB_CHECKED = "☒";
var DOC_CB_UNCHECKED = "☐";

/** Jeton de remplacement pour une option de case à cocher (radio ou checkbox-group). */
function checkboxToken_(fieldName, optionValue) {
  return fieldName + "__" + String(optionValue).replace(/[^a-zA-Z0-9]/g, "");
}

function docEscapeRegExp_(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Échappe les caractères ayant un sens spécial côté remplacement (Body.replaceText traite le
 * remplacement comme une chaîne de style regex — $ notamment). */
function docEscapeReplacement_(s) {
  return String(s).replace(/\\/g, "\\\\").replace(/\$/g, "\\$$");
}

function docNewTemplate_(title) {
  var doc = DocumentApp.create(title);
  var body = doc.getBody();
  body.setMarginLeft(DOC_MARGIN).setMarginRight(DOC_MARGIN).setMarginTop(DOC_MARGIN).setMarginBottom(DOC_MARGIN);
  // appendTable() exige un tableau non vide au départ ; on part d'un corps vide et on nettoie
  // le paragraphe vide initial une fois le contenu ajouté.
  return doc;
}

function docCleanupInitialParagraph_(body) {
  if (body.getNumChildren() > 1) {
    var first = body.getChild(0);
    if (first.getType() === DocumentApp.ElementType.PARAGRAPH && first.asParagraph().getText() === "") {
      body.removeChild(first);
    }
  }
}

function docAddHeaderBand_(body, text, color) {
  var table = body.appendTable([[text]]);
  table.setBorderWidth(0);
  var cell = table.getCell(0, 0);
  cell.setBackgroundColor(color);
  cell.setPaddingTop(8).setPaddingBottom(8);
  cell.editAsText().setBold(true).setForegroundColor("#ffffff").setFontSize(14);
  cell.getChild(0).asParagraph().setAlignment(DocumentApp.HorizontalAlignment.CENTER);
  return table;
}

function docAddSectionTitle_(body, text, color) {
  var spacer = body.appendParagraph("");
  spacer.setSpacingBefore(6);
  var table = body.appendTable([[text]]);
  table.setBorderWidth(0);
  var cell = table.getCell(0, 0);
  cell.setBackgroundColor(color);
  cell.setPaddingTop(4).setPaddingBottom(4);
  cell.editAsText().setBold(true).setForegroundColor("#ffffff").setFontSize(11);
  return table;
}

/** Une ligne "Libellé : valeur" (tableau à 2 colonnes sans bordure — le libellé est en gras). */
function docAddFieldRow_(body, label, token) {
  var table = body.appendTable([[label + " :", "{{" + token + "}}"]]);
  table.setBorderWidth(0);
  table.getCell(0, 0).editAsText().setBold(true).setFontSize(9);
  table.getCell(0, 0).setWidth(160);
  table.getCell(0, 1).editAsText().setFontSize(9);
  return table;
}

/** N champs { label, token } côte à côte (libellés en gras sur la 1re ligne, valeurs sur la 2e). */
function docAddFieldRowN_(body, fields) {
  var labels = fields.map(function (f) {
    return f.label + " :";
  });
  var values = fields.map(function (f) {
    return "{{" + f.token + "}}";
  });
  var table = body.appendTable([labels, values]);
  table.setBorderWidth(0);
  for (var i = 0; i < fields.length; i++) {
    table.getCell(0, i).editAsText().setBold(true).setFontSize(9);
    table.getCell(1, i).editAsText().setFontSize(9);
  }
  return table;
}

/** Grille de cases à cocher (options courtes), perRow colonnes. */
function docAddCheckboxGrid_(body, fieldName, options, perRow) {
  var rows = [];
  for (var i = 0; i < options.length; i += perRow) {
    var chunk = options.slice(i, i + perRow).map(function (opt) {
      return "{{" + checkboxToken_(fieldName, opt) + "}} " + opt;
    });
    while (chunk.length < perRow) chunk.push("");
    rows.push(chunk);
  }
  var table = body.appendTable(rows);
  table.setBorderWidth(0);
  for (var r = 0; r < rows.length; r++) {
    for (var c = 0; c < perRow; c++) {
      table.getCell(r, c).editAsText().setFontSize(9);
    }
  }
  return table;
}

/** Une ligne "Libellé :" suivie des options d'un même champ (radio/checkbox-group courtes),
 * chacune sur sa propre colonne. */
function docAddCheckboxRowInline_(body, label, fieldName, options) {
  var row = [label + " :"].concat(
    options.map(function (opt) {
      return "{{" + checkboxToken_(fieldName, opt) + "}} " + opt;
    })
  );
  var table = body.appendTable([row]);
  table.setBorderWidth(0);
  table.getCell(0, 0).editAsText().setBold(true).setFontSize(9);
  for (var i = 1; i < row.length; i++) {
    table.getCell(0, i).editAsText().setFontSize(9);
  }
  return table;
}

/** Liste verticale de phrases à cocher, une par ligne (options trop longues pour un alignement
 * horizontal comme docAddCheckboxRowInline_) — ex. "Conséquences et mesures". */
function docAddCheckboxList_(body, label, fieldName, options) {
  var lbl = body.appendParagraph(label + " :");
  lbl.editAsText().setBold(true).setFontSize(9);
  options.forEach(function (opt) {
    var p = body.appendParagraph("{{" + checkboxToken_(fieldName, opt) + "}} " + opt);
    p.editAsText().setFontSize(9);
    p.setSpacingAfter(2);
  });
}

/** Zone de texte libre — noteText optionnel : ligne d'exemple/instruction imprimée en
 * permanence sous le libellé (texte fixe, pas un jeton). */
function docAddTextArea_(body, label, token, noteText) {
  var lbl = body.appendParagraph(label + " :");
  lbl.editAsText().setBold(true).setFontSize(9);
  if (noteText) {
    var note = body.appendParagraph(noteText);
    note.editAsText().setItalic(true).setFontSize(8).setForegroundColor("#666666");
  }
  var val = body.appendParagraph("{{" + token + "}}");
  val.editAsText().setFontSize(9);
}

/** N zones de signature (image insérée séparément, cf. docInsertSignatures_) côte à côte —
 * fields = [{ label, token }]. */
function docAddSignaturesRow_(body, fields) {
  var labels = fields.map(function (f) {
    return f.label;
  });
  var tokens = fields.map(function (f) {
    return "{{" + f.token + "}}";
  });
  var table = body.appendTable([labels, tokens]);
  for (var i = 0; i < fields.length; i++) {
    table.getCell(0, i).editAsText().setBold(true).setFontSize(8);
  }
  table.getRow(1).setMinimumHeight(50); // la hauteur se règle par ligne, pas par cellule
  return table;
}

/**
 * Insère les images de signature (formData[field.name] = data URL base64 PNG) à la place du
 * jeton {{field.name}}, repéré via Body.findText() (chaque jeton vit seul dans son paragraphe,
 * cf. docAddSignaturesRow_, donc le remplacer intégralement est sûr).
 */
function docInsertSignatures_(body, formData, signatureFields) {
  signatureFields.forEach(function (field) {
    var dataUrl = formData[field.name];
    if (!dataUrl) return;

    var token = "{{" + field.name + "}}";
    var found = body.findText(docEscapeRegExp_(token));
    if (!found) return;

    try {
      var paragraph = found.getElement().getParent().asParagraph();
      var base64 = dataUrl.split(",").pop();
      var bytes = Utilities.base64Decode(base64);
      var blob = Utilities.newBlob(bytes, "image/png", field.name + ".png");

      paragraph.clear();
      var img = paragraph.appendInlineImage(blob);
      var maxWidth = 120;
      if (img.getWidth() > maxWidth) {
        var ratio = maxWidth / img.getWidth();
        img.setWidth(maxWidth).setHeight(img.getHeight() * ratio);
      }
    } catch (err) {
      // signature illisible — la génération du PDF continue sans bloquer
    }
  });
}

/** Une page supplémentaire par photo annexe du dossier (docmod_annexes, type "photo"), en
 * taille réelle (mise à l'échelle pour tenir sur la largeur de page sans dépasser, sans
 * agrandir au-delà de la résolution native). */
function docAddPhotoAnnexPages_(body, dossierId) {
  var photos = readTable_("docmod_annexes").filter(function (a) {
    return String(a.dossier_id) === String(dossierId) && a.type === "photo";
  });
  if (!photos.length) return;

  var maxWidth = 612 - DOC_MARGIN * 2 - 72; // marge de sécurité en plus des marges de page

  photos.forEach(function (photo) {
    try {
      var blob = DriveApp.getFileById(photo.drive_file_id).getBlob();
      body.appendPageBreak();
      var img = body.appendImage(blob);
      if (img.getWidth() > maxWidth) {
        var ratio = maxWidth / img.getWidth();
        img.setWidth(maxWidth).setHeight(img.getHeight() * ratio);
      }
    } catch (err) {
      // photo illisible — la génération continue sans bloquer
    }
  });
}

/**
 * Construit l'objet de remplacements texte->texte à partir d'un schéma de champs générique
 * (mêmes conventions que SOULEVEMENT_SCHEMA / BRIS_BARRIERES_SCHEMA : type, options,
 * checkbox-group/radio/checkbox/signature/autre). Partagé avec l'ancienne approche Slides
 * (lib/pdf-slides-helpers.gs) — cette fonction ne dépend d'aucun des deux services.
 */
function buildTemplateReplacements_(schema, formData) {
  var replacements = {};

  schema.forEach(function (field) {
    var value = formData[field.name];

    if (field.type === "checkbox-group") {
      (field.options || []).forEach(function (opt) {
        var checked = Array.isArray(value) && value.indexOf(opt) !== -1;
        replacements[checkboxToken_(field.name, opt)] = checked ? DOC_CB_CHECKED : DOC_CB_UNCHECKED;
      });
    } else if (field.type === "radio") {
      (field.options || []).forEach(function (opt) {
        replacements[checkboxToken_(field.name, opt)] = value === opt ? DOC_CB_CHECKED : DOC_CB_UNCHECKED;
      });
    } else if (field.type === "checkbox") {
      replacements[field.name] = value ? DOC_CB_CHECKED : DOC_CB_UNCHECKED;
    } else if (field.type === "signature") {
      // gérée séparément (image), pas de remplacement texte
    } else {
      replacements[field.name] = formatFieldValue_(value);
    }
  });

  return replacements;
}

/** Applique un objet de remplacements { token: valeur } (sans les accolades) sur tout le corps
 * du document, en échappant correctement motif de recherche et texte de remplacement. */
function docApplyReplacements_(body, replacements) {
  Object.keys(replacements).forEach(function (token) {
    var pattern = docEscapeRegExp_("{{" + token + "}}");
    var replacement = docEscapeReplacement_(replacements[token]);
    body.replaceText(pattern, replacement);
  });
}
