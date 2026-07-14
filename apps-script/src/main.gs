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
 * Chaque module enregistre ses handlers dans MODULE_HANDLERS (cf. src/modules/*).
 */
function routeAction(action, body) {
  if (!action) throw new Error("Paramètre 'action' manquant");

  var handler = MODULE_HANDLERS[action];
  if (!handler) throw new Error("Action inconnue: " + action);

  return handler(body);
}

function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(
    ContentService.MimeType.JSON
  );
}

// Registre central des handlers, alimenté par chaque module (auth.gs, users.gs, dossiers.gs...).
// Placeholder Phase 0 — les modules réels seront ajoutés en Phase 1.
var MODULE_HANDLERS = {};
