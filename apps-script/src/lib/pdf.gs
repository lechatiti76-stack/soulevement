/**
 * Génération du PDF de dossier.
 *
 * Construit un Google Doc à la volée plutôt qu'à partir d'un template statique avec
 * balises : le formulaire est dynamique par module, donc les champs à imprimer varient.
 * Cf. ARCHITECTURE.md §8. QR code non inclus en Phase 2 (encodeur dédié à écrire — décision
 * §2 : génération pure côté Apps Script, sans service tiers). Photos/annexes non embarquées
 * (Phase 5, quand la galerie photos existe) — seule la signature (champ de formulaire) l'est.
 */

function buildAndExportDossierPdf_(dossier, schema) {
  var moduleName = dossier.module || "nouvelle-demande";
  var folder = getDossierFolder_(moduleName, dossier.numero);
  var doc = DocumentApp.create(dossier.numero + " - " + moduleName);
  var body = doc.getBody();

  body.appendParagraph("Soulèvement").setHeading(DocumentApp.ParagraphHeading.TITLE);
  body.appendParagraph("Dossier " + dossier.numero).setHeading(DocumentApp.ParagraphHeading.HEADING1);

  var meta = body.appendParagraph(
    "Date : " + formatDate_(new Date()) + "\nUtilisateur : " + (dossier.userDisplay || dossier.user_id)
  );
  meta.editAsText().setItalic(true);

  body.appendParagraph("Informations du formulaire").setHeading(DocumentApp.ParagraphHeading.HEADING2);

  var formData = JSON.parse(dossier.form_data || "{}");
  var fields = schema || [];

  fields.forEach(function (field) {
    if (field.type === "signature") return; // insérée séparément ci-dessous
    body.appendParagraph(field.label + " : " + formatFieldValue_(formData[field.name]));
  });

  var signatureField = fields.filter(function (f) {
    return f.type === "signature";
  })[0];

  if (signatureField && formData[signatureField.name]) {
    appendSignatureImage_(body, formData[signatureField.name]);
  }

  doc.saveAndClose();

  var pdfBlob = DriveApp.getFileById(doc.getId()).getAs("application/pdf");
  pdfBlob.setName(dossier.numero + ".pdf");
  var pdfFile = folder.createFile(pdfBlob);

  DriveApp.getFileById(doc.getId()).setTrashed(true); // seul le PDF est conservé

  return pdfFile;
}

function appendSignatureImage_(body, dataUrl) {
  try {
    var base64 = dataUrl.split(",").pop();
    var bytes = Utilities.base64Decode(base64);
    var blob = Utilities.newBlob(bytes, "image/png", "signature.png");
    body.appendParagraph("Signature").setHeading(DocumentApp.ParagraphHeading.HEADING2);
    body.appendImage(blob).setWidth(200).setHeight(80);
  } catch (err) {
    // signature illisible — la génération du PDF continue sans bloquer
  }
}

function formatFieldValue_(value) {
  if (value === undefined || value === null || value === "") return "—";
  if (typeof value === "boolean") return value ? "Oui" : "Non";
  return String(value);
}

function formatDate_(date) {
  return Utilities.formatDate(date, "Europe/Paris", "dd/MM/yyyy HH:mm");
}
