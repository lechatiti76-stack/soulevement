/**
 * Photos et pièces jointes rattachées à un dossier (table docmod_annexes).
 * Cf. ARCHITECTURE.md §4, §6.
 *
 * Limite connue : les fichiers sont créés sous le compte qui exécute le script
 * (`executeAs: USER_DEPLOYING`, cf. appsscript.json). Les URLs de miniature/téléchargement
 * générées ci-dessous fonctionnent pour ce compte et pour tout utilisateur à qui le fichier
 * a été partagé côté Drive — pas garanties pour un autre utilisateur sans partage explicite
 * du dossier Drive. Non résolu en Phase 5 (nécessiterait un partage automatique du dossier
 * racine ou un proxy d'images côté backend) — dégradation gracieuse côté frontend si l'image
 * ne charge pas.
 */

function annexesHandlers_() {
  return {
    "dossiers.addAnnexe": dossiersAddAnnexe_,
    "dossiers.deleteAnnexe": dossiersDeleteAnnexe_,
    "annexes.list": annexesList_,
  };
}

function dossiersAddAnnexe_(body) {
  var session = requireAuth_(body);
  var found = getOwnedDossierRow_(body.id, session);
  var dossier = found.data;

  if (!body.fileBase64 || !body.fileName || !body.mimeType) {
    throw new Error("Fichier requis (fileBase64, fileName, mimeType)");
  }

  var type = body.type === "photo" ? "photo" : "piece_jointe";
  var folder = getDossierFolder_(normalizeModule_(dossier.module), dossier.numero);
  var subFolder = getOrCreateFolder_(folder, type === "photo" ? "photos" : "pieces_jointes");
  var file = saveBase64File_(subFolder, body.fileBase64, body.fileName, body.mimeType);

  appendRow_("docmod_annexes", {
    id: Utilities.getUuid(),
    dossier_id: body.id,
    type: type,
    drive_file_id: file.getId(),
    nom: body.fileName,
    date_ajout: new Date().toISOString(),
  });

  logHistorique_(
    dossier.id,
    type === "photo" ? "ajout_photo" : "ajout_piece_jointe",
    session.sub,
    body.fileName
  );

  return dossierGetById_(body.id, session);
}

function dossiersDeleteAnnexe_(body) {
  var session = requireAuth_(body);
  getOwnedDossierRow_(body.dossierId, session);

  var annexeRow = findRow_("docmod_annexes", function (a) {
    return a.id === body.annexeId && String(a.dossier_id) === String(body.dossierId);
  });
  if (!annexeRow) throw new Error("Annexe introuvable");

  try {
    DriveApp.getFileById(annexeRow.data.drive_file_id).setTrashed(true);
  } catch (err) {
    // fichier déjà supprimé côté Drive — on nettoie quand même la ligne
  }

  deleteRow_("docmod_annexes", annexeRow.sheetRow);
  logHistorique_(body.dossierId, "suppression_annexe", session.sub, annexeRow.data.nom);

  return dossierGetById_(body.dossierId, session);
}

/** Vue transverse : toutes les annexes d'un type donné, tous dossiers confondus, filtrée par rôle. */
function annexesList_(body) {
  var session = requireAuth_(body);
  var typeFilter = body.type;

  var dossiersById = indexById_(readTable_("docmod_dossiers"));

  var all = readTable_("docmod_annexes");
  if (typeFilter) {
    all = all.filter(function (a) {
      return a.type === typeFilter;
    });
  }

  var visible = all
    .filter(function (a) {
      var dossier = dossiersById[a.dossier_id];
      if (!dossier) return false;
      return session.role === "admin" || String(dossier.user_id) === String(session.sub);
    })
    .map(function (a) {
      var dossier = dossiersById[a.dossier_id];
      return Object.assign({}, a, driveUrls_(a.drive_file_id), {
        dossier_numero: dossier ? dossier.numero : "",
      });
    })
    .sort(function (a, b) {
      return String(b.date_ajout).localeCompare(String(a.date_ajout));
    });

  return { annexes: visible };
}

function driveUrls_(fileId) {
  return {
    thumbnail_url: "https://drive.google.com/thumbnail?id=" + fileId + "&sz=w600",
    view_url: "https://drive.google.com/file/d/" + fileId + "/view",
    download_url: "https://drive.google.com/uc?export=download&id=" + fileId,
  };
}
