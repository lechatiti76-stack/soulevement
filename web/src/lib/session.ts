// Noms de cookies et types partagés entre les routes API, le middleware et les layouts serveur.
// Cf. ARCHITECTURE.md §2 (décision : proxy Next.js).

export const SESSION_COOKIE = "soulevement_session"; // JWT access token, httpOnly
export const REFRESH_COOKIE = "soulevement_refresh"; // refresh token, httpOnly
export const USER_COOKIE = "soulevement_user"; // profil public, lisible côté client (affichage seulement)

export type Role = "admin" | "utilisateur";

export type PublicUser = {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  role: Role;
  fonction: string;
  photo_url: string;
};
