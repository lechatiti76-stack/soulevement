/**
 * Archives transverses (table archives_index, alimentée par tous les modules à la validation).
 * Recherche / filtre / tri — l'export (CSV) se fait côté client à partir de ce résultat.
 * Cf. ARCHITECTURE.md §4, §6.
 */

function archivesHandlers_() {
  return {
    "archives.search": archivesSearch_,
  };
}

function archivesSearch_(body) {
  var session = requireAuth_(body);

  var all = readTable_("archives_index");
  var usersById = indexById_(readTable_("users"));

  var rows = (session.role === "admin"
    ? all
    : all.filter(function (a) {
        return String(a.user_id) === String(session.sub);
      })
  ).map(function (a) {
    var user = usersById[a.user_id];
    return Object.assign({}, a, {
      user_display: user ? user.prenom + " " + user.nom : a.user_id,
    });
  });

  var query = String(body.query || "").toLowerCase().trim();
  if (query) {
    rows = rows.filter(function (a) {
      return (
        String(a.numero_dossier).toLowerCase().indexOf(query) !== -1 ||
        String(a.user_display).toLowerCase().indexOf(query) !== -1
      );
    });
  }

  if (body.statut) {
    rows = rows.filter(function (a) {
      return a.statut === body.statut;
    });
  }

  if (body.module) {
    rows = rows.filter(function (a) {
      return a.module === body.module;
    });
  }

  var sortBy = body.sortBy || "date_creation";
  var dir = body.sortDir === "asc" ? 1 : -1;
  rows.sort(function (a, b) {
    var av = String(a[sortBy] || "");
    var bv = String(b[sortBy] || "");
    if (av < bv) return -1 * dir;
    if (av > bv) return 1 * dir;
    return 0;
  });

  return { archives: rows };
}

function indexById_(rows) {
  var map = {};
  rows.forEach(function (r) {
    map[r.id] = r;
  });
  return map;
}
