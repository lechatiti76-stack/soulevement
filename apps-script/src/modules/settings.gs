/**
 * Paramètres globaux (table settings, clé/valeur — cf. ARCHITECTURE.md §4).
 * Lecture ouverte à tout utilisateur authentifié (nom/logo affichés dans le shell),
 * écriture réservée aux administrateurs.
 */

var SETTINGS_KEYS = ["nom_app", "logo_url"];

function settingsHandlers_() {
  return {
    "settings.get": settingsGet_,
    "settings.update": settingsUpdate_,
  };
}

function settingsGet_(body) {
  requireAuth_(body);

  var map = {};
  readTable_("settings").forEach(function (r) {
    map[r.cle] = r.valeur;
  });

  var result = {};
  SETTINGS_KEYS.forEach(function (key) {
    result[key] = map[key] || "";
  });
  return result;
}

function settingsUpdate_(body) {
  var session = requireAuth_(body);
  requireAdmin_(session);

  SETTINGS_KEYS.forEach(function (key) {
    if (body[key] === undefined) return;
    var found = findRow_("settings", function (s) {
      return s.cle === key;
    });
    if (found) {
      updateRow_("settings", found.sheetRow, { valeur: body[key] });
    } else {
      appendRow_("settings", { cle: key, valeur: body[key] });
    }
  });

  return settingsGet_(body);
}
