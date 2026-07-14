/**
 * À exécuter manuellement, une seule fois, depuis l'éditeur Apps Script pour
 * initialiser le classeur de base de données (crée les onglets/en-têtes s'ils
 * n'existent pas encore). N'est jamais exposé via l'API web.
 * Cf. ARCHITECTURE.md §4 pour le détail des tables.
 */
function setupDatabase() {
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty("DB_SPREADSHEET_ID");
  var ss = id ? SpreadsheetApp.openById(id) : SpreadsheetApp.create("Soulèvement - Base de données");

  if (!id) {
    props.setProperty("DB_SPREADSHEET_ID", ss.getId());
    Logger.log("Nouveau classeur créé : " + ss.getUrl());
  }

  var tables = {
    users: [
      "id", "nom", "prenom", "email", "identifiant",
      "password_hash", "password_salt", "photo_url", "fonction", "role",
      "actif", "date_creation",
    ],
    sessions: ["id", "user_id", "refresh_token_hash", "user_agent", "ip", "created_at", "expires_at"],
    login_log: ["id", "user_id", "identifiant", "date", "succes"],
    activity_log: ["id", "user_id", "module", "action", "cible_id", "date", "detail"],
    archives_index: [
      "id", "numero_dossier", "module", "user_id", "statut",
      "date_creation", "date_validation", "pdf_url",
    ],
    settings: ["cle", "valeur"],

    // Module "Nouvelle demande" — cf. ARCHITECTURE.md §4
    docmod_dossiers: [
      "id", "numero", "user_id", "statut",
      "date_creation", "date_validation", "form_data", "pdf_url", "qr_code_url",
    ],
    docmod_documents_source: ["id", "dossier_id", "type", "drive_file_id", "date_upload"],
    docmod_annexes: ["id", "dossier_id", "type", "drive_file_id", "nom", "date_ajout"],
    docmod_commentaires: ["id", "dossier_id", "user_id", "texte", "date"],
    docmod_historique: ["id", "dossier_id", "action", "user_id", "date", "detail"],
  };

  Object.keys(tables).forEach(function (name) {
    ensureSheet_(ss, name, tables[name]);
  });

  var defaultSheet = ss.getSheetByName("Feuille 1") || ss.getSheetByName("Sheet1");
  if (defaultSheet && ss.getSheets().length > 1) ss.deleteSheet(defaultSheet);

  Logger.log("Base de données prête : " + ss.getUrl());
}

function ensureSheet_(ss, name, headers) {
  var sheet = ss.getSheetByName(name);
  if (!sheet) sheet = ss.insertSheet(name);
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(1);
  }
}
