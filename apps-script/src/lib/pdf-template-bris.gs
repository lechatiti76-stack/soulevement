/**
 * Génération du PDF "Bris de barrières" (accidents : barrières, collisions, événements) via un
 * document Google Docs (DocumentApp), même mécanique que Soulèvement — cf. pdf-template.gs,
 * pdf-doc-helpers.gs : document construit intégralement par code à chaque génération (pas de
 * template mis en cache), pagination native, vrais tableaux Docs (règle à la racine le texte mal
 * ajusté rencontré avec les zones de texte à largeur fixe de l'ancienne approche Slides, ex.
 * libellé "Heure" coupé en deux lignes dans la grille "Avis lancés"). Cf. ARCHITECTURE.md §13.
 */

var BAR_ORANGE = "#e07b00";

function buildAndExportBrisBarrieresPdf_(dossier) {
  var doc = docNewTemplate_("BAR-" + dossier.numero + "-tmp");
  var body = doc.getBody();
  var formData = JSON.parse(dossier.form_data || "{}");

  docAddHeaderBand_(body, "Accidents (barrières, collisions, événements) — Dossier " + dossier.numero, BAR_ORANGE);
  docAddFieldRowN_(body, [
    { label: "Date", token: "date" },
    { label: "Heure", token: "heure" },
    { label: "Lieu", token: "lieu" },
  ]);
  docAddFieldRowN_(body, [
    { label: "Nom émetteur", token: "nom_emetteur" },
    { label: "Nature", token: "nature" },
    { label: "Détail", token: "nature_detail" },
  ]);
  docAddFieldRow_(body, "Type de collision", "type_collision");
  docAddFieldRowN_(body, [
    { label: "Circonstances", token: "circonstance_1" },
    { label: "Circonstances (suite)", token: "circonstance_2" },
  ]);
  docAddCheckboxList_(body, "Mesures prises", "mesures_prises", BAR_MESURES_OPTIONS);
  docAddCheckboxList_(body, "Conséquences", "consequences", BAR_CONSEQUENCES_OPTIONS);
  docAddFieldRow_(body, "Causes", "causes");

  docAddSectionTitle_(body, "Avis lancés", BAR_ORANGE);
  barAddAvisGrid_(body);
  docAddCheckboxRowInline_(body, "Documents archivés", "documents_archives", BAR_DOCUMENTS_OPTIONS);
  docAddFieldRowN_(body, [
    { label: "Code MD", token: "code_md" },
    { label: "Classe MD", token: "classe_md" },
    { label: "N° conteneur", token: "numero_conteneur" },
  ]);
  docAddCheckboxRowInline_(body, "Reprise du service normal ?", "reprise_service_normal", ["Oui", "Non"]);
  docAddFieldRow_(body, "Date et heure de reprise", "date_heure_reprise");

  docCleanupInitialParagraph_(body);

  var replacements = buildTemplateReplacements_(BRIS_BARRIERES_SCHEMA, formData);
  replacements["numero"] = dossier.numero;
  replacements["date_generation"] = formatDate_(new Date());
  docApplyReplacements_(body, replacements);

  docAddPhotoAnnexPages_(body, dossier.id);

  doc.saveAndClose();

  var folder = getDossierFolder_("bris-barrieres", dossier.numero);
  var pdfBlob = DriveApp.getFileById(doc.getId()).getAs("application/pdf");
  pdfBlob.setName(dossier.numero + ".pdf");
  var pdfFile = folder.createFile(pdfBlob);

  DriveApp.getFileById(doc.getId()).setTrashed(true); // seul le PDF est conservé

  return pdfFile;
}

/**
 * Grille 3×3 des 9 organismes à alerter — vrai tableau Docs : chaque cellule reçoit 3
 * paragraphes (nom en gras, puis "Avis :" et "Heure :" chacun sur sa propre ligne, via
 * TableCell.appendParagraph plutôt qu'un "\n" dans la chaîne source, dont le comportement au
 * sein d'un appendTable() n'est pas fiable). Le texte s'ajuste tout seul à la largeur de
 * cellule — élimine le bug de coupure ("Heur" / "e :") des zones de texte à largeur fixe de
 * l'ancienne approche Slides. Structure propre à Bris de barrières, donc pas dans les helpers
 * partagés.
 */
function barAddAvisGrid_(body) {
  var perRow = 3;
  var rows = [];
  for (var i = 0; i < BAR_ORGANISMES.length; i += perRow) {
    var chunk = BAR_ORGANISMES.slice(i, i + perRow).map(function (org) {
      return org.label;
    });
    while (chunk.length < perRow) chunk.push("");
    rows.push(chunk);
  }

  var table = body.appendTable(rows);
  table.setBorderWidth(0.5);

  BAR_ORGANISMES.forEach(function (org, i) {
    var r = Math.floor(i / perRow);
    var c = i % perRow;
    var cell = table.getCell(r, c);
    cell.editAsText().setBold(true).setFontSize(8);

    var pAvis = cell.appendParagraph("Avis : {{" + org.key + "_statut}}");
    pAvis.editAsText().setBold(false).setFontSize(8);

    var pHeure = cell.appendParagraph("Heure : {{" + org.key + "_heure}}");
    pHeure.editAsText().setBold(false).setFontSize(8);
  });

  return table;
}
