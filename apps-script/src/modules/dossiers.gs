/**
 * Modules de dossiers : dépôt de document, formulaire, génération PDF, commentaires,
 * historique, annexes. Deux modules à ce jour :
 * - "nouvelle-demande" : générique, dépôt de document + extraction IA (Phase 2-3, inchangé)
 * - "soulevement" : fiche wagons, formulaire structuré en 3 parties, sans document source,
 *   PDF généré depuis un template Slides (cf. lib/pdf-template.gs)
 * Cf. ARCHITECTURE.md §4, §6, §7.
 */

var DOSSIER_MODULE = "nouvelle-demande"; // valeur par défaut / rétrocompatibilité des données existantes

var MODULE_CONFIG = {
  "nouvelle-demande": { prefix: "ND", requiresSource: true },
  "soulevement": { prefix: "SOU", requiresSource: false },
};

function moduleConfig_(module) {
  return MODULE_CONFIG[module] || MODULE_CONFIG[DOSSIER_MODULE];
}

/** Ramène toute valeur de module absente/inconnue (ex. lignes créées avant cette colonne) au module par défaut. */
function normalizeModule_(module) {
  return module && MODULE_CONFIG[module] ? module : DOSSIER_MODULE;
}

function dossiersHandlers_() {
  return {
    "dossiers.create": dossiersCreate_,
    "dossiers.extractIA": dossiersExtractIA_,
    "dossiers.updateForm": dossiersUpdateForm_,
    "dossiers.validate": dossiersValidate_,
    "dossiers.get": dossiersGet_,
    "dossiers.list": dossiersList_,
    "dossiers.addComment": dossiersAddComment_,
  };
}

function dossiersCreate_(body) {
  var session = requireAuth_(body);
  var module = normalizeModule_(body.module);
  var config = moduleConfig_(module);

  if (config.requiresSource && (!body.fileBase64 || !body.fileName || !body.mimeType)) {
    throw new Error("Document source requis (fileBase64, fileName, mimeType)");
  }

  var numero = nextDossierNumero_(module);
  var dossierId = Utilities.getUuid();
  var now = new Date().toISOString();

  appendRow_("docmod_dossiers", {
    id: dossierId,
    numero: numero,
    module: module,
    user_id: session.sub,
    statut: "brouillon",
    date_creation: now,
    date_validation: "",
    form_data: "{}",
    pdf_url: "",
    qr_code_url: "",
  });

  if (body.fileBase64 && body.fileName && body.mimeType) {
    var folder = getDossierFolder_(module, numero);
    var sourceFolder = getOrCreateFolder_(folder, "source");
    var file = saveBase64File_(sourceFolder, body.fileBase64, body.fileName, body.mimeType);

    appendRow_("docmod_documents_source", {
      id: Utilities.getUuid(),
      dossier_id: dossierId,
      type: guessDocType_(body.mimeType),
      drive_file_id: file.getId(),
      date_upload: now,
    });
  }

  logHistorique_(
    dossierId,
    "creation",
    session.sub,
    body.fileName ? "Dossier créé (" + body.fileName + ")" : "Dossier créé"
  );

  return dossierGetById_(dossierId, session);
}

/**
 * Extraction IA synchrone : appelle OpenAI pendant l'exécution de la requête (pas de
 * découpage async, cf. lib/openai.gs). Échoue proprement — l'utilisateur garde la main
 * pour remplir le formulaire manuellement si l'extraction échoue. Utilisée par le module
 * "nouvelle-demande" (document déposé) — sans objet pour "soulevement" (pas de document source).
 */
function dossiersExtractIA_(body) {
  var session = requireAuth_(body);
  var found = getOwnedDossierRow_(body.id, session);
  var dossier = found.data;

  var source = readTable_("docmod_documents_source").filter(function (s) {
    return String(s.dossier_id) === String(dossier.id);
  })[0];
  if (!source) throw new Error("Aucun document source pour ce dossier");

  var extractionId = Utilities.getUuid();
  appendRow_("docmod_extraction_ia", {
    id: extractionId,
    dossier_id: dossier.id,
    champs_extraits: "{}",
    confiance: "",
    statut: "en_cours",
  });

  try {
    var file = DriveApp.getFileById(source.drive_file_id);
    var mimeType = file.getBlob().getContentType();
    var base64;

    if (source.type === "word") {
      base64 = convertWordToPdfBase64_(file.getBlob());
      mimeType = "application/pdf";
    } else {
      base64 = Utilities.base64Encode(file.getBlob().getBytes());
    }

    var fields = extractFieldsFromDocument_(base64, mimeType, file.getName(), DOSSIER_SCHEMA);

    var extractionRow = findRow_("docmod_extraction_ia", function (e) {
      return e.id === extractionId;
    });
    updateRow_("docmod_extraction_ia", extractionRow.sheetRow, {
      champs_extraits: JSON.stringify(fields),
      statut: "a_verifier",
    });

    logHistorique_(dossier.id, "extraction_ia", session.sub, "Champs extraits automatiquement");

    return { champsExtraits: fields, statut: "a_verifier" };
  } catch (err) {
    var failedRow = findRow_("docmod_extraction_ia", function (e) {
      return e.id === extractionId;
    });
    if (failedRow) updateRow_("docmod_extraction_ia", failedRow.sheetRow, { statut: "erreur" });

    throw new Error("Extraction IA impossible : " + (err.message || err));
  }
}

function dossiersUpdateForm_(body) {
  var session = requireAuth_(body);
  var found = getOwnedDossierRow_(body.id, session);

  updateRow_("docmod_dossiers", found.sheetRow, { form_data: JSON.stringify(body.formData || {}) });
  logHistorique_(body.id, "modification_formulaire", session.sub, "");

  return dossierGetById_(body.id, session);
}

function dossiersValidate_(body) {
  var session = requireAuth_(body);
  var found = getOwnedDossierRow_(body.id, session);
  var dossier = found.data;
  var module = normalizeModule_(dossier.module);

  if (dossier.statut === "valide" || dossier.statut === "archive") {
    throw new Error("Ce dossier est déjà validé");
  }

  var userRow = findRow_("users", function (u) {
    return String(u.id) === String(dossier.user_id);
  });
  dossier.userDisplay = userRow ? userRow.data.prenom + " " + userRow.data.nom : dossier.user_id;
  dossier.module = module;

  var pdfFile =
    module === "soulevement"
      ? buildAndExportSoulevementPdf_(dossier)
      : buildAndExportDossierPdf_(dossier, DOSSIER_SCHEMA);

  var now = new Date().toISOString();

  updateRow_("docmod_dossiers", found.sheetRow, {
    statut: "valide",
    date_validation: now,
    pdf_url: pdfFile.getUrl(),
  });

  appendRow_("archives_index", {
    id: Utilities.getUuid(),
    numero_dossier: dossier.numero,
    module: module,
    dossier_id: dossier.id,
    user_id: dossier.user_id,
    statut: "valide",
    date_creation: dossier.date_creation,
    date_validation: now,
    pdf_url: pdfFile.getUrl(),
  });

  logHistorique_(body.id, "validation", session.sub, "PDF généré : " + pdfFile.getUrl());

  return dossierGetById_(body.id, session);
}

function dossiersGet_(body) {
  var session = requireAuth_(body);
  return dossierGetById_(body.id, session);
}

function dossiersList_(body) {
  var session = requireAuth_(body);
  var all = readTable_("docmod_dossiers");

  var mine =
    session.role === "admin"
      ? all
      : all.filter(function (d) {
          return String(d.user_id) === String(session.sub);
        });

  if (body.module) {
    mine = mine.filter(function (d) {
      return normalizeModule_(d.module) === body.module;
    });
  }

  mine.sort(function (a, b) {
    return String(b.date_creation).localeCompare(String(a.date_creation));
  });

  return { dossiers: mine };
}

function dossiersAddComment_(body) {
  var session = requireAuth_(body);
  getOwnedDossierRow_(body.id, session);

  var texte = String(body.texte || "").trim();
  if (!texte) throw new Error("Commentaire vide");

  appendRow_("docmod_commentaires", {
    id: Utilities.getUuid(),
    dossier_id: body.id,
    user_id: session.sub,
    texte: texte,
    date: new Date().toISOString(),
  });

  logHistorique_(body.id, "commentaire", session.sub, "");

  return dossierGetById_(body.id, session);
}

function dossierGetById_(id, session) {
  var found = findRow_("docmod_dossiers", function (d) {
    return String(d.id) === String(id);
  });
  if (!found) throw new Error("Dossier introuvable");
  assertOwnership_(found.data, session);
  found.data.module = normalizeModule_(found.data.module);

  var sources = readTable_("docmod_documents_source").filter(function (s) {
    return String(s.dossier_id) === String(id);
  });

  var extractions = readTable_("docmod_extraction_ia").filter(function (e) {
    return String(e.dossier_id) === String(id);
  });
  var extraction = extractions.length ? extractions[extractions.length - 1] : null;

  var usersById = indexById_(readTable_("users"));

  var commentaires = readTable_("docmod_commentaires")
    .filter(function (c) {
      return String(c.dossier_id) === String(id);
    })
    .map(function (c) {
      var user = usersById[c.user_id];
      return Object.assign({}, c, { user_display: user ? user.prenom + " " + user.nom : c.user_id });
    })
    .sort(function (a, b) {
      return String(a.date).localeCompare(String(b.date));
    });

  var historique = readTable_("docmod_historique")
    .filter(function (h) {
      return String(h.dossier_id) === String(id);
    })
    .map(function (h) {
      var user = usersById[h.user_id];
      return Object.assign({}, h, { user_display: user ? user.prenom + " " + user.nom : h.user_id });
    })
    .sort(function (a, b) {
      return String(b.date).localeCompare(String(a.date));
    });

  var annexes = readTable_("docmod_annexes")
    .filter(function (a) {
      return String(a.dossier_id) === String(id);
    })
    .map(function (a) {
      return Object.assign({}, a, driveUrls_(a.drive_file_id));
    })
    .sort(function (a, b) {
      return String(b.date_ajout).localeCompare(String(a.date_ajout));
    });

  return {
    dossier: found.data,
    sources: sources,
    extraction: extraction,
    commentaires: commentaires,
    historique: historique,
    annexes: annexes,
  };
}

function getOwnedDossierRow_(id, session) {
  var found = findRow_("docmod_dossiers", function (d) {
    return String(d.id) === String(id);
  });
  if (!found) throw new Error("Dossier introuvable");
  assertOwnership_(found.data, session);
  return found;
}

function assertOwnership_(dossier, session) {
  if (session.role !== "admin" && String(dossier.user_id) !== String(session.sub)) {
    throw new Error("Accès refusé");
  }
}

/**
 * Compteur atomique en table settings, une clé par module — un seul lock, pas d'imbrication.
 * "nouvelle-demande" garde la clé historique "docmod_counter" (données déjà en production) ;
 * les nouveaux modules obtiennent leur propre séquence.
 */
function nextDossierNumero_(module) {
  var config = moduleConfig_(module);
  var counterKey = module === "nouvelle-demande" ? "docmod_counter" : "docmod_counter_" + module;

  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var found = findRow_("settings", function (s) {
      return s.cle === counterKey;
    });
    var next = found ? parseInt(found.data.valeur, 10) + 1 : 1;

    if (found) {
      updateRowUnlocked_("settings", found.sheetRow, { valeur: String(next) });
    } else {
      appendRowUnlocked_("settings", { cle: counterKey, valeur: String(next) });
    }
    // Sans flush, l'écriture peut ne pas être visible à l'exécution concurrente suivante dès
    // qu'elle obtient le lock (constaté : deux dossiers créés à ~1s d'intervalle ont reçu le
    // même numéro) — le lock à lui seul sérialise l'exécution mais pas la durabilité de l'écriture.
    SpreadsheetApp.flush();

    return config.prefix + "-" + new Date().getFullYear() + "-" + ("0000" + next).slice(-4);
  } finally {
    lock.releaseLock();
  }
}

function logHistorique_(dossierId, action, userId, detail) {
  appendRow_("docmod_historique", {
    id: Utilities.getUuid(),
    dossier_id: dossierId,
    action: action,
    user_id: userId,
    date: new Date().toISOString(),
    detail: detail || "",
  });
}

function guessDocType_(mimeType) {
  if (mimeType === "application/pdf") return "pdf";
  if (mimeType.indexOf("word") !== -1 || mimeType.indexOf("officedocument.wordprocessingml") !== -1) return "word";
  if (mimeType.indexOf("image/") === 0) return "image";
  return "autre";
}
