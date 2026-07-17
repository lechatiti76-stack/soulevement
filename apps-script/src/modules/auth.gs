/**
 * Authentification : login, refresh, logout.
 * Cf. ARCHITECTURE.md §2 (proxy Next.js) et §9 (sécurité).
 */

var ACCESS_TOKEN_TTL_SECONDS = 15 * 60; // 15 min
var REFRESH_TOKEN_TTL_SECONDS = 30 * 24 * 3600; // 30 jours
var LOGIN_MAX_ATTEMPTS = 5;
var LOGIN_LOCKOUT_MINUTES = 15;

function authHandlers_() {
  return {
    "auth.login": authLogin_,
    "auth.refresh": authRefresh_,
    "auth.logout": authLogout_,
  };
}

function authLogin_(body) {
  var identifiant = body.identifiant;
  var password = body.password;
  if (!identifiant || !password) throw new Error("Identifiant et mot de passe requis");

  assertNotLockedOut_(identifiant);

  var found = findRow_("users", function (u) {
    return u.identifiant === identifiant;
  });
  var user = found ? found.data : null;
  var actif = user ? String(user.actif).toLowerCase() !== "false" : false;
  var ok = !!(user && actif && verifyPassword_(password, user.password_salt, user.password_hash));

  logLogin_(user ? user.id : "", identifiant, ok);

  if (!ok) throw new Error("Identifiants invalides");

  var accessToken = createJwt_({ sub: user.id, role: user.role }, ACCESS_TOKEN_TTL_SECONDS);
  var refreshToken = Utilities.getUuid();

  appendRow_("sessions", {
    id: Utilities.getUuid(),
    user_id: user.id,
    refresh_token_hash: hashToken_(refreshToken),
    user_agent: body.userAgent || "",
    ip: body.ip || "",
    created_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + REFRESH_TOKEN_TTL_SECONDS * 1000).toISOString(),
  });

  return {
    accessToken: accessToken,
    refreshToken: refreshToken,
    expiresIn: ACCESS_TOKEN_TTL_SECONDS,
    user: publicUser_(user),
  };
}

function authRefresh_(body) {
  var refreshToken = body.refreshToken;
  if (!refreshToken) throw new Error("refreshToken requis");

  var tokenHash = hashToken_(refreshToken);
  var found = findRow_("sessions", function (s) {
    return s.refresh_token_hash === tokenHash;
  });
  if (!found) throw new Error("Session invalide");

  var session = found.data;
  if (new Date(session.expires_at).getTime() < Date.now()) {
    deleteRow_("sessions", found.sheetRow);
    throw new Error("Session expirée");
  }

  var userFound = findRow_("users", function (u) {
    return String(u.id) === String(session.user_id);
  });
  if (!userFound || String(userFound.data.actif).toLowerCase() === "false") {
    throw new Error("Utilisateur introuvable ou inactif");
  }

  var accessToken = createJwt_(
    { sub: userFound.data.id, role: userFound.data.role },
    ACCESS_TOKEN_TTL_SECONDS
  );

  return {
    accessToken: accessToken,
    expiresIn: ACCESS_TOKEN_TTL_SECONDS,
    user: publicUser_(userFound.data),
  };
}

function authLogout_(body) {
  var refreshToken = body.refreshToken;
  if (!refreshToken) return { ok: true };

  var tokenHash = hashToken_(refreshToken);
  var found = findRow_("sessions", function (s) {
    return s.refresh_token_hash === tokenHash;
  });
  if (found) deleteRow_("sessions", found.sheetRow);

  return { ok: true };
}

/**
 * Anti-bruteforce : bloque temporairement un identifiant après N échecs récents.
 * S'appuie sur login_log (déjà tenu à jour par logLogin_) plutôt que sur une table dédiée —
 * la fenêtre glissante se réinitialise naturellement quand les échecs sortent de la période.
 */
function assertNotLockedOut_(identifiant) {
  var cutoff = new Date(Date.now() - LOGIN_LOCKOUT_MINUTES * 60000);
  var recentFailures = readTable_("login_log").filter(function (entry) {
    return (
      entry.identifiant === identifiant &&
      String(entry.succes).toLowerCase() !== "true" &&
      new Date(entry.date) >= cutoff
    );
  });

  if (recentFailures.length >= LOGIN_MAX_ATTEMPTS) {
    throw new Error(
      "Trop de tentatives échouées pour cet identifiant. Réessayez dans " +
        LOGIN_LOCKOUT_MINUTES +
        " minutes."
    );
  }
}

function hashToken_(token) {
  var digest = Utilities.computeHmacSha256Signature(token, getJwtSecret_());
  return Utilities.base64EncodeWebSafe(digest);
}

function logLogin_(userId, identifiant, success) {
  appendRow_("login_log", {
    id: Utilities.getUuid(),
    user_id: userId || "",
    identifiant: identifiant,
    date: new Date().toISOString(),
    succes: success,
  });
}

function publicUser_(user) {
  return {
    id: user.id,
    nom: user.nom,
    prenom: user.prenom,
    email: user.email,
    role: user.role,
    fonction: user.fonction,
    photo_url: user.photo_url,
  };
}
