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

function rowToObject_(headers, row) {
  var obj = {};
  headers.forEach(function (h, i) {
    obj[h] = row[i];
  });
  return obj;
}

/** Lit une table entière et la retourne comme tableau d'objets (1re ligne = en-têtes). */
function readTable_(name) {
  var sheet = getTable_(name);
  var values = sheet.getDataRange().getValues();
  var headers = values.shift();
  return values.map(function (row) {
    return rowToObject_(headers, row);
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

/**
 * Trouve la première ligne d'une table satisfaisant matchFn(rowObject).
 * Retourne { sheetRow, data } (sheetRow = numéro de ligne réel dans la feuille, 1-indexé) ou null.
 */
function findRow_(name, matchFn) {
  var sheet = getTable_(name);
  var values = sheet.getDataRange().getValues();
  var headers = values[0];
  for (var i = 1; i < values.length; i++) {
    var obj = rowToObject_(headers, values[i]);
    if (matchFn(obj)) {
      return { sheetRow: i + 1, data: obj };
    }
  }
  return null;
}

/** Met à jour une ligne existante (fusion partielle) à partir de son numéro de ligne réel. */
function updateRow_(name, sheetRow, patch) {
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var sheet = getTable_(name);
    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    var current = rowToObject_(headers, sheet.getRange(sheetRow, 1, 1, headers.length).getValues()[0]);
    var merged = Object.assign({}, current, patch);
    var row = headers.map(function (h) {
      return merged[h] !== undefined ? merged[h] : "";
    });
    sheet.getRange(sheetRow, 1, 1, row.length).setValues([row]);
  } finally {
    lock.releaseLock();
  }
}

function deleteRow_(name, sheetRow) {
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    getTable_(name).deleteRow(sheetRow);
  } finally {
    lock.releaseLock();
  }
}
