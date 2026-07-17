/**
 * Agrégats pour le dashboard et la page statistiques (basés sur docmod_dossiers,
 * filtré par rôle comme le reste de l'API). Cf. ARCHITECTURE.md §6.
 */

function statsHandlers_() {
  return {
    "stats.summary": statsSummary_,
  };
}

function statsSummary_(body) {
  var session = requireAuth_(body);
  var all = readTable_("docmod_dossiers");
  var rows =
    session.role === "admin"
      ? all
      : all.filter(function (d) {
          return String(d.user_id) === String(session.sub);
        });

  var parStatut = {};
  rows.forEach(function (d) {
    parStatut[d.statut] = (parStatut[d.statut] || 0) + 1;
  });

  var parUtilisateur = null;
  if (session.role === "admin") {
    var usersById = indexById_(readTable_("users"));
    var counts = {};
    rows.forEach(function (d) {
      counts[d.user_id] = (counts[d.user_id] || 0) + 1;
    });
    parUtilisateur = Object.keys(counts)
      .map(function (userId) {
        var user = usersById[userId];
        return {
          user_id: userId,
          user_display: user ? user.prenom + " " + user.nom : userId,
          count: counts[userId],
        };
      })
      .sort(function (a, b) {
        return b.count - a.count;
      });
  }

  var valides = rows.filter(function (d) {
    return d.statut === "valide" && d.date_validation;
  });

  var tempsTraitementMoyenHeures = null;
  if (valides.length) {
    var totalHeures = valides.reduce(function (sum, d) {
      var ms = new Date(d.date_validation).getTime() - new Date(d.date_creation).getTime();
      return sum + ms / 3600000;
    }, 0);
    tempsTraitementMoyenHeures = Math.round((totalHeures / valides.length) * 10) / 10;
  }

  return {
    total: rows.length,
    parStatut: parStatut,
    parMois: buildMonthlyBuckets_(rows),
    parUtilisateur: parUtilisateur,
    pdfGeneres: valides.length,
    tempsTraitementMoyenHeures: tempsTraitementMoyenHeures,
  };
}

/** 12 derniers mois glissants, comptage par date_creation. */
function buildMonthlyBuckets_(rows) {
  var buckets = [];
  var now = new Date();

  for (var i = 11; i >= 0; i--) {
    var d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    buckets.push({
      key: Utilities.formatDate(d, "Europe/Paris", "yyyy-MM"),
      label: Utilities.formatDate(d, "Europe/Paris", "MMM yyyy"),
      count: 0,
    });
  }

  var byKey = {};
  buckets.forEach(function (b) {
    byKey[b.key] = b;
  });

  rows.forEach(function (d) {
    if (!d.date_creation) return;
    var key = Utilities.formatDate(new Date(d.date_creation), "Europe/Paris", "yyyy-MM");
    if (byKey[key]) byKey[key].count++;
  });

  return buckets;
}
