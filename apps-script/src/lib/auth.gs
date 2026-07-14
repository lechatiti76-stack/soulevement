/**
 * Émission/vérification de JWT (HS256) et hachage de mot de passe.
 * Secret en ScriptProperties (JWT_SECRET) — jamais en dur dans le code.
 * Implémentation complète prévue en Phase 1 — cf. ARCHITECTURE.md §9.
 */

function getJwtSecret_() {
  var secret = PropertiesService.getScriptProperties().getProperty("JWT_SECRET");
  if (!secret) throw new Error("JWT_SECRET absent des propriétés du script");
  return secret;
}

function hashPassword_(password, salt) {
  salt = salt || Utilities.getUuid();
  var digest = Utilities.computeHmacSha256Signature(password, salt + getJwtSecret_());
  return {
    salt: salt,
    hash: Utilities.base64Encode(digest),
  };
}

function verifyPassword_(password, salt, expectedHash) {
  var computed = hashPassword_(password, salt);
  return computed.hash === expectedHash;
}

// TODO Phase 1 : createJwt_(payload), verifyJwt_(token) — signature/validation HS256 complète.
