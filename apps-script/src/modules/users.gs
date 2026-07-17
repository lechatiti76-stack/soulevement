/**
 * Gestion des utilisateurs — réservée aux administrateurs.
 * Garde-fous : impossible de se supprimer soi-même, impossible de supprimer/désactiver/
 * rétrograder le dernier administrateur actif (éviterait de verrouiller tout le monde dehors).
 * Cf. ARCHITECTURE.md §6, §9.
 */

function usersHandlers_() {
  return {
    "users.list": usersList_,
    "users.create": usersCreate_,
    "users.update": usersUpdate_,
    "users.delete": usersDelete_,
    "users.resetPassword": usersResetPassword_,
  };
}

function requireAdmin_(session) {
  if (session.role !== "admin") throw new Error("Accès réservé aux administrateurs");
}

function usersList_(body) {
  var session = requireAuth_(body);
  requireAdmin_(session);
  return { users: readTable_("users").map(publicUserFull_) };
}

function usersCreate_(body) {
  var session = requireAuth_(body);
  requireAdmin_(session);

  var identifiant = String(body.identifiant || "").trim();
  var password = String(body.password || "");
  if (!identifiant || !password) throw new Error("Identifiant et mot de passe requis");

  var existing = findRow_("users", function (u) {
    return u.identifiant === identifiant;
  });
  if (existing) throw new Error("Cet identifiant existe déjà");

  var creds = hashPassword_(password);

  appendRow_("users", {
    id: Utilities.getUuid(),
    nom: body.nom || "",
    prenom: body.prenom || "",
    email: body.email || "",
    identifiant: identifiant,
    password_hash: creds.hash,
    password_salt: creds.salt,
    photo_url: "",
    fonction: body.fonction || "",
    role: body.role === "admin" ? "admin" : "utilisateur",
    actif: true,
    date_creation: new Date().toISOString(),
  });

  return { users: readTable_("users").map(publicUserFull_) };
}

function usersUpdate_(body) {
  var session = requireAuth_(body);
  requireAdmin_(session);

  var found = findRow_("users", function (u) {
    return String(u.id) === String(body.id);
  });
  if (!found) throw new Error("Utilisateur introuvable");

  var patch = {};
  ["nom", "prenom", "email", "fonction"].forEach(function (field) {
    if (body[field] !== undefined) patch[field] = body[field];
  });

  if (body.role !== undefined) {
    if (found.data.role === "admin" && body.role !== "admin" && countActiveAdmins_() <= 1) {
      throw new Error("Impossible de rétrograder le dernier administrateur");
    }
    patch.role = body.role === "admin" ? "admin" : "utilisateur";
  }

  if (body.actif !== undefined) {
    if (found.data.role === "admin" && !body.actif && countActiveAdmins_() <= 1) {
      throw new Error("Impossible de désactiver le dernier administrateur");
    }
    patch.actif = body.actif;
  }

  updateRow_("users", found.sheetRow, patch);
  return { users: readTable_("users").map(publicUserFull_) };
}

function usersDelete_(body) {
  var session = requireAuth_(body);
  requireAdmin_(session);

  if (String(body.id) === String(session.sub)) {
    throw new Error("Vous ne pouvez pas supprimer votre propre compte");
  }

  var found = findRow_("users", function (u) {
    return String(u.id) === String(body.id);
  });
  if (!found) throw new Error("Utilisateur introuvable");

  if (found.data.role === "admin" && countActiveAdmins_() <= 1) {
    throw new Error("Impossible de supprimer le dernier administrateur");
  }

  deleteRow_("users", found.sheetRow);
  return { users: readTable_("users").map(publicUserFull_) };
}

/** Réinitialise le mot de passe d'un utilisateur ; en génère un temporaire si aucun n'est fourni. */
function usersResetPassword_(body) {
  var session = requireAuth_(body);
  requireAdmin_(session);

  var found = findRow_("users", function (u) {
    return String(u.id) === String(body.id);
  });
  if (!found) throw new Error("Utilisateur introuvable");

  var newPassword = body.newPassword || Utilities.getUuid().slice(0, 8);
  var creds = hashPassword_(newPassword);
  updateRow_("users", found.sheetRow, { password_hash: creds.hash, password_salt: creds.salt });

  return { temporaryPassword: newPassword };
}

function countActiveAdmins_() {
  return readTable_("users").filter(function (u) {
    return u.role === "admin" && String(u.actif).toLowerCase() !== "false";
  }).length;
}

/** Profil complet (sans hash/salt) pour l'écran d'administration des utilisateurs. */
function publicUserFull_(user) {
  return {
    id: user.id,
    nom: user.nom,
    prenom: user.prenom,
    email: user.email,
    identifiant: user.identifiant,
    photo_url: user.photo_url,
    fonction: user.fonction,
    role: user.role,
    actif: String(user.actif).toLowerCase() !== "false",
    date_creation: user.date_creation,
  };
}
