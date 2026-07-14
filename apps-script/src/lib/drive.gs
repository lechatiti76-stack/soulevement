/**
 * Accès Google Drive : arborescence de stockage des dossiers et de leurs documents.
 * Cf. ARCHITECTURE.md §5.
 */

function getRootFolder_() {
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty("DRIVE_ROOT_FOLDER_ID");
  if (id) return DriveApp.getFolderById(id);

  var folder = DriveApp.createFolder("Soulèvement");
  props.setProperty("DRIVE_ROOT_FOLDER_ID", folder.getId());
  return folder;
}

function getOrCreateFolder_(parent, name) {
  var it = parent.getFoldersByName(name);
  if (it.hasNext()) return it.next();
  return parent.createFolder(name);
}

/** Dossier de stockage d'un dossier métier donné : /Soulèvement/dossiers/{module}/{numero}/ */
function getDossierFolder_(module, numero) {
  var root = getRootFolder_();
  var dossiers = getOrCreateFolder_(root, "dossiers");
  var moduleFolder = getOrCreateFolder_(dossiers, module);
  return getOrCreateFolder_(moduleFolder, numero);
}

/** Décode un fichier base64 (sans préfixe data:...;base64,) et l'enregistre dans le dossier donné. */
function saveBase64File_(folder, base64Data, fileName, mimeType) {
  var bytes = Utilities.base64Decode(base64Data);
  var blob = Utilities.newBlob(bytes, mimeType, fileName);
  return folder.createFile(blob);
}
