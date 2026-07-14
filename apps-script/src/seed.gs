/**
 * À exécuter manuellement, une seule fois, depuis l'éditeur Apps Script pour créer
 * le premier compte administrateur (nécessite setupDatabase() déjà exécuté, et
 * JWT_SECRET/PASSWORD_PEPPER déjà définis dans les propriétés du script).
 * N'est jamais exposé via l'API web — changez le mot de passe dès la première connexion.
 */
function seedAdminUser() {
  var identifiant = "admin";
  var password = "ChangeMoi123!";
  var creds = hashPassword_(password);

  appendRow_("users", {
    id: Utilities.getUuid(),
    nom: "Admin",
    prenom: "Principal",
    email: "admin@example.com",
    identifiant: identifiant,
    password_hash: creds.hash,
    password_salt: creds.salt,
    photo_url: "",
    fonction: "Administrateur",
    role: "admin",
    actif: true,
    date_creation: new Date().toISOString(),
  });

  Logger.log("Compte admin créé — identifiant: " + identifiant + " / mot de passe: " + password);
}
