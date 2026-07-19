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

/**
 * Neutralise l'injection de formule Google Sheets : une valeur utilisateur écrite via
 * setValue()/setValues() est interprétée exactement comme une saisie manuelle — une chaîne
 * commençant par =, +, -, @ (ou tabulation/retour chariot) deviendrait une formule live à
 * l'ouverture du classeur. Un guillemet simple en préfixe force le texte littéral (convention
 * Sheets native, invisible côté lecture : getValue() ne renvoie jamais l'apostrophe).
 * Appliqué au point d'écriture (append/update) pour couvrir tous les champs sans devoir s'en
 * souvenir à chaque appelant.
 */
function sanitizeForSheets_(value) {
  if (typeof value !== "string") return value;
  if (/^[=+\-@\t\r]/.test(value)) return "'" + value;
  return value;
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
    appendRowUnlocked_(name, rowObject);
  } finally {
    lock.releaseLock();
  }
}

/** Variante sans verrou — à utiliser uniquement depuis un appelant qui tient déjà le lock. */
function appendRowUnlocked_(name, rowObject) {
  var sheet = getTable_(name);
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var row = headers.map(function (h) {
    return sanitizeForSheets_(rowObject[h] !== undefined ? rowObject[h] : "");
  });
  sheet.appendRow(row);
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
    updateRowUnlocked_(name, sheetRow, patch);
  } finally {
    lock.releaseLock();
  }
}

/** Variante sans verrou — à utiliser uniquement depuis un appelant qui tient déjà le lock. */
function updateRowUnlocked_(name, sheetRow, patch) {
  var sheet = getTable_(name);
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var current = rowToObject_(headers, sheet.getRange(sheetRow, 1, 1, headers.length).getValues()[0]);
  var merged = Object.assign({}, current, patch);
  var row = headers.map(function (h) {
    return sanitizeForSheets_(merged[h] !== undefined ? merged[h] : "");
  });
  sheet.getRange(sheetRow, 1, 1, row.length).setValues([row]);
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

/**
 * Supprime toutes les lignes satisfaisant matchFn (ex. nettoyage des lignes liées à un dossier
 * supprimé dans une table transverse). Les lignes sont retirées en ordre décroissant de numéro
 * pour ne pas décaler les indices des lignes restant à supprimer.
 */
function deleteRowsWhere_(name, matchFn) {
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var sheet = getTable_(name);
    var values = sheet.getDataRange().getValues();
    var headers = values[0];
    var rowsToDelete = [];

    for (var i = 1; i < values.length; i++) {
      if (matchFn(rowToObject_(headers, values[i]))) rowsToDelete.push(i + 1);
    }

    rowsToDelete
      .sort(function (a, b) {
        return b - a;
      })
      .forEach(function (rowNum) {
        sheet.deleteRow(rowNum);
      });

    return rowsToDelete.length;
  } finally {
    lock.releaseLock();
  }
}
