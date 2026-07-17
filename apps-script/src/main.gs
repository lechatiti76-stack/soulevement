/**
 * Point d'entrée du Web App Apps Script.
 * Le routage se fait par "action" dans le corps JSON — cf. ARCHITECTURE.md §6.
 * Appelé uniquement depuis les routes /api/* de Next.js (jamais directement du navigateur).
 */

function doPost(e) {
  var body;
  try {
    body = JSON.parse(e.postData.contents);
  } catch (err) {
    return jsonResponse({ error: "Corps JSON invalide" });
  }

  try {
    var result = routeAction(body.action, body);
    return jsonResponse(result);
  } catch (err) {
    return jsonResponse({ error: err.message || String(err) });
  }
}

function doGet(e) {
  return jsonResponse({ status: "ok", service: "soulevement-api" });
}

/**
 * Dispatch vers le module concerné selon le préfixe de l'action (ex. "auth.login", "dossiers.create").
 */
function routeAction(action, body) {
  if (!action) throw new Error("Paramètre 'action' manquant");

  var handlers = getModuleHandlers_();
  var handler = handlers[action];
  if (!handler) throw new Error("Action inconnue: " + action);

  return handler(body);
}

function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(
    ContentService.MimeType.JSON
  );
}

/**
 * Fusionne les handlers exposés par chaque module (src/modules/*.gs, fonction "<module>Handlers_()").
 * Ajouter un module = ajouter son appel ici, sans toucher aux autres.
 * Calculé à chaque appel plutôt qu'en variable globale pour ne pas dépendre de l'ordre
 * de chargement des fichiers .gs par Apps Script.
 */
function getModuleHandlers_() {
  return Object.assign(
    {},
    authHandlers_(),
    dossiersHandlers_(),
    archivesHandlers_(),
    annexesHandlers_(),
    statsHandlers_()
  );
}
