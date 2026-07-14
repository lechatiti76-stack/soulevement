/**
 * JWT (HS256) et hachage de mot de passe.
 * Secrets en ScriptProperties (JWT_SECRET, PASSWORD_PEPPER) — jamais en dur dans le code.
 * Cf. ARCHITECTURE.md §9.
 */

function getJwtSecret_() {
  var secret = PropertiesService.getScriptProperties().getProperty("JWT_SECRET");
  if (!secret) throw new Error("JWT_SECRET absent des propriétés du script");
  return secret;
}

function getPasswordPepper_() {
  var pepper = PropertiesService.getScriptProperties().getProperty("PASSWORD_PEPPER");
  if (!pepper) throw new Error("PASSWORD_PEPPER absent des propriétés du script");
  return pepper;
}

function hashPassword_(password, salt) {
  salt = salt || Utilities.getUuid();
  var digest = Utilities.computeHmacSha256Signature(password, salt + getPasswordPepper_());
  return {
    salt: salt,
    hash: Utilities.base64Encode(digest),
  };
}

function verifyPassword_(password, salt, expectedHash) {
  if (!salt || !expectedHash) return false;
  var computed = hashPassword_(password, salt);
  return computed.hash === expectedHash;
}

/** Émet un JWT HS256 signé, avec expiration en secondes depuis maintenant. */
function createJwt_(payload, expiresInSeconds) {
  var header = { alg: "HS256", typ: "JWT" };
  var now = Math.floor(Date.now() / 1000);
  var fullPayload = Object.assign({}, payload, {
    iat: now,
    exp: now + (expiresInSeconds || 900),
  });

  var headerB64 = base64UrlEncodeString_(JSON.stringify(header));
  var payloadB64 = base64UrlEncodeString_(JSON.stringify(fullPayload));
  var signature = signJwt_(headerB64 + "." + payloadB64);

  return headerB64 + "." + payloadB64 + "." + signature;
}

/** Vérifie la signature et l'expiration d'un JWT, retourne le payload décodé. */
function verifyJwt_(token) {
  var parts = (token || "").split(".");
  if (parts.length !== 3) throw new Error("JWT malformé");

  var headerB64 = parts[0], payloadB64 = parts[1], signature = parts[2];
  var expected = signJwt_(headerB64 + "." + payloadB64);
  if (expected !== signature) throw new Error("Signature JWT invalide");

  var payload = JSON.parse(base64UrlDecodeToString_(payloadB64));
  var now = Math.floor(Date.now() / 1000);
  if (payload.exp && now > payload.exp) throw new Error("JWT expiré");

  return payload;
}

function signJwt_(data) {
  var digest = Utilities.computeHmacSha256Signature(data, getJwtSecret_());
  return Utilities.base64EncodeWebSafe(digest).replace(/=+$/, "");
}

function base64UrlEncodeString_(str) {
  return Utilities.base64EncodeWebSafe(Utilities.newBlob(str).getBytes()).replace(/=+$/, "");
}

function base64UrlDecodeToString_(str) {
  return Utilities.newBlob(Utilities.base64DecodeWebSafe(str)).getDataAsString();
}

/**
 * Vérifie le JWT transmis par le proxy Next.js (body.accessToken) et retourne son payload.
 * Le Web App est déployé en accès anonyme (cf. appsscript.json) : c'est ce contrôle,
 * pas la configuration de déploiement, qui protège les actions authentifiées.
 */
function requireAuth_(body) {
  var token = body && body.accessToken;
  if (!token) throw new Error("Non authentifié");
  return verifyJwt_(token);
}
