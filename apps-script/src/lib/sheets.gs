/**
 * Accès centralisé au classeur Google Sheets qui sert de base de données.
 * Cf. ARCHITECTURE.md §4 pour le détail des tables.
 */

function getDb_() {
  var id = PropertiesService.getScriptProperties().getProperty("DB_SPREADSHEET_ID");
  if (!id) throw new Error("DB_SPREADSHEET_ID absent des propriétés du script");
  return SpreadsheetApp.openById(id);
}

function getTable_(name) {
  var sheet = getDb_().getSheetByName(name);
  if (!sheet) throw new Error("Table introuvable: " + name);
  return sheet;
}

/** Lit une table entière et la retourne comme tableau d'objets (1re ligne = en-têtes). */
function readTable_(name) {
  var sheet = getTable_(name);
  var values = sheet.getDataRange().getValues();
  var headers = values.shift();
  return values.map(function (row) {
    var obj = {};
    headers.forEach(function (h, i) {
      obj[h] = row[i];
    });
    return obj;
  });
}

/** Ajoute une ligne à une table, verrouillée pour éviter les écritures concurrentes. */
function appendRow_(name, rowObject) {
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var sheet = getTable_(name);
    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    var row = headers.map(function (h) {
      return rowObject[h] !== undefined ? rowObject[h] : "";
    });
    sheet.appendRow(row);
  } finally {
    lock.releaseLock();
  }
}
