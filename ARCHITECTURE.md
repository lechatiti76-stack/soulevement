# Architecture technique — Plateforme "Soulèvement"

Document de conception avant implémentation. Basé sur le cahier des charges fourni (`soulévement.docx`). Objectif : poser les choix structurants (données, API, sécurité, pipeline IA, génération PDF, évolutivité) pour validation avant d'écrire du code.

---

## 1. Vue d'ensemble

Plateforme web permettant de :
1. Déposer un document (PDF / Word / image)
2. Extraire automatiquement les informations via IA (OCR + LLM)
3. Pré-remplir un formulaire dynamique, modifiable avant validation
4. Générer un PDF professionnel (logo, QR code, signature, annexes)
5. Archiver automatiquement le dossier complet (PDF + annexes + historique)

Le tout dans un shell applicatif multi-modules (dashboard commun, auth commune, archives communes), pensé pour accueillir plusieurs "applications métier" indépendantes à l'avenir.

---

## 2. Stack technique retenue

| Couche | Choix | Justification |
|---|---|---|
| Frontend | Next.js 14+ (App Router) + TypeScript + Tailwind CSS + Framer Motion | Imposé par le CDC ; App Router pour le routing par module, PWA native via `next-pwa` |
| Backend / API | Google Apps Script (Web App, `doGet`/`doPost`) exposé en REST-like JSON | Imposé par le CDC ; gratuit, pas de serveur à maintenir |
| Base de données | Google Sheets (1 classeur = 1 base, 1 onglet = 1 table) | Imposé par le CDC |
| Stockage fichiers | Google Drive (arborescence par dossier/utilisateur) | Imposé par le CDC |
| IA | API OpenAI (Vision pour OCR + extraction structurée via function calling / JSON mode) | Le plus mature pour extraction structurée à partir d'image/PDF |
| Génération PDF | Google Docs (template) rempli via `DocumentApp`, converti en PDF via `Utilities` | Natif Apps Script, gratuit, gère logo/QR/pagination sans lib externe |
| Hébergement code | GitHub (mono-repo) | Imposé par le CDC |
| Hébergement frontend | Vercel (déploiement auto depuis GitHub) | Compatible Next.js/PWA, gratuit en usage modéré |
| Auth | JWT (access + refresh court), mots de passe hashés (bcrypt côté Apps Script via lib ou hachage salé), cookies httpOnly | Sessions sécurisées sans serveur d'état |

**Décision à valider avec vous :** Apps Script ne peut pas héberger nativement des cookies httpOnly cross-domain propres — le frontend (Vercel) et l'API (script.google.com) sont sur des domaines différents. Deux options :
- **A. JWT en `Authorization: Bearer`** stocké en mémoire + refresh token en `localStorage` chiffré (plus simple, légèrement moins sûr contre XSS).
- **B. Proxy** : les routes API Next.js (`/api/*`) reçoivent les requêtes du navigateur avec cookie httpOnly, et relaient vers Apps Script côté serveur (plus sûr, un peu plus de latence).

→ Recommandation : **option B**, car elle permet aussi de masquer l'URL Apps Script et de mutualiser la protection CSRF. À confirmer avant implémentation de l'auth.

---

## 3. Architecture modulaire (évolutivité)

```
Shell applicatif (auth, dashboard, archives, utilisateurs, paramètres)
├── Module: Nouvelle demande (app "traitement de documents" — celle du CDC actuel)
├── Module: Application 2 (future)
├── Module: Application 3 (future)
├── Archives (transverse, alimenté par tous les modules)
├── Utilisateurs (transverse)
└── Paramètres (transverse)
```

Principe : chaque module métier est un dossier autonome sous `src/modules/<nom>/` avec ses propres pages, composants, formulaires et endpoints Apps Script — déclaré dans un **registre de modules** (`src/modules/registry.ts`) qui alimente le menu latéral, le routing et les permissions. Ajouter un module = ajouter une entrée au registre + son dossier, sans toucher aux autres modules ni au shell.

Côté Apps Script, même logique : un fichier `.gs` "router" central dispatche vers `modules/<nom>/api.gs` selon un paramètre `module` dans la requête. Toutes les feuilles Google Sheets d'un module sont préfixées (`docmod_dossiers`, `docmod_annexes`, etc.) pour cohabiter dans le même classeur que les tables transverses (`users`, `roles`, `archives_index`, `activity_log`).

---

## 4. Modèle de données (Google Sheets)

Un classeur unique, un onglet par table.

**Tables transverses**

| Table | Colonnes clés |
|---|---|
| `users` | id, nom, prenom, email, identifiant, password_hash, password_salt, photo_url, fonction, role, actif, date_creation |
| `roles` | id, nom (admin/utilisateur), permissions (JSON) — non exploité en Phase 1, rôle stocké directement sur `users.role` |
| `sessions` | id, user_id, refresh_token_hash, user_agent, ip, created_at, expires_at |
| `login_log` | id, user_id, identifiant, date, succes (bool) |
| `activity_log` | id, user_id, module, action, cible_id, date, detail |
| `archives_index` | id, numero_dossier, module, dossier_id, user_id, statut, date_creation, date_validation, pdf_url |
| `settings` | clé, valeur (logo_url, nom_app, couleurs, etc.) |

**Tables du module "Nouvelle demande"**

| Table | Colonnes clés |
|---|---|
| `docmod_dossiers` | id, numero, user_id, statut (brouillon/en_attente/valide/archive), date_creation, date_validation, form_data (JSON), pdf_url, qr_code_url |
| `docmod_documents_source` | id, dossier_id, type (pdf/word/image), drive_file_id, date_upload |
| `docmod_extraction_ia` | id, dossier_id, champs_extraits (JSON), confiance, statut (a_verifier/valide) |
| `docmod_annexes` | id, dossier_id, type (photo/piece_jointe), drive_file_id, nom, date_ajout |
| `docmod_commentaires` | id, dossier_id, user_id, texte, date |
| `docmod_historique` | id, dossier_id, action, user_id, date, detail |

**Limites Sheets à anticiper :** ~10M cellules par classeur, écritures concurrentes à protéger avec `LockService.getScriptLock()`, lecture/écriture lente au-delà de quelques dizaines de milliers de lignes → prévoir un archivage périodique vers des classeurs "froids" par année si le volume grossit.

---

## 5. Stockage Google Drive

```
/App Racine (Drive)
├── /users/{user_id}/avatar.jpg
├── /dossiers/{module}/{numero_dossier}/
│   ├── source/          (documents déposés)
│   ├── photos/
│   ├── pieces_jointes/
│   └── pdf/              (PDF généré, versionné)
└── /templates/
    ├── docmod_template.docx (Google Docs template pour génération PDF)
    └── logo.png
```

Chaque fichier Drive est référencé dans Sheets par son `drive_file_id`, jamais par chemin (les IDs Drive sont stables, les chemins non).

**Galerie photos / pièces jointes (Phase 5)** : chaque annexe expose trois URLs calculées à la volée (`driveUrls_()` dans `annexes.gs`) — `thumbnail_url` (`drive.google.com/thumbnail?id=...`), `view_url`, `download_url`. **Limite connue** : les fichiers sont créés sous le compte qui exécute le script (`executeAs: USER_DEPLOYING`) ; ces URLs fonctionnent pour ce compte et pour qui le fichier a été explicitement partagé côté Drive, mais rien ne garantit qu'un autre utilisateur de l'app puisse voir la miniature sans partage. Non résolu — nécessiterait soit un partage automatique du dossier racine (compromis vie privée à valider avec vous), soit un proxy d'images côté backend. Le frontend masque l'image si elle ne charge pas (`onError`) plutôt que de casser la mise en page.

---

## 6. API (Apps Script Web App)

Un seul déploiement Web App, routage par `action` dans le corps JSON (Apps Script ne supporte pas de vrais verbes REST/paths dynamiques nativement).

| Action | Méthode logique | Rôle requis | Description |
|---|---|---|---|
| `auth.login` | POST | public | Vérifie identifiant/mdp, retourne JWT |
| `auth.refresh` | POST | authentifié | Renouvelle le token |
| `auth.logout` | POST | authentifié | Invalide la session |
| `users.list/create/update/delete` | POST | admin | CRUD utilisateurs |
| `dossiers.create` | POST | utilisateur | Crée un dossier + upload document source |
| `dossiers.extractIA` | POST | utilisateur | Lance l'extraction IA (synchrone, cf §7) |
| `dossiers.updateForm` | POST | utilisateur | Sauvegarde le formulaire modifié |
| `dossiers.validate` | POST | utilisateur | Valide → déclenche génération PDF + archivage |
| `dossiers.get/list` | POST | utilisateur/admin | Consultation (filtrée par rôle) — inclut sources, extraction, commentaires, historique, annexes |
| `dossiers.addComment` | POST | utilisateur/admin | Ajoute un commentaire sur un dossier (propriétaire ou admin) |
| `dossiers.addAnnexe` | POST | utilisateur/admin | Ajoute une photo ou pièce jointe à un dossier |
| `dossiers.deleteAnnexe` | POST | utilisateur/admin | Supprime une annexe (Drive + ligne Sheets) |
| `annexes.list` | POST | utilisateur/admin | Vue transverse de toutes les annexes d'un type, tous dossiers confondus, filtrée par rôle |
| `archives.search` | POST | utilisateur/admin | Recherche/filtre/tri sur `archives_index` (filtré par rôle) |
| `stats.summary` | POST | utilisateur/admin | Agrégats pour le dashboard et la page statistiques |
| `settings.get/update` | POST | admin | Paramètres globaux |

Le frontend n'appelle jamais Apps Script directement (cf. décision §2 option B) : il passe par des routes `/api/*` Next.js qui ajoutent le JWT, gèrent le CSRF et relaient la requête. Le Web App Apps Script étant déployé en accès anonyme (`ANYONE_ANONYMOUS`, cf. `appsscript.json`), chaque action authentifiée reçoit aussi le JWT dans le corps (`accessToken`) et le revérifie elle-même via `requireAuth_()` — la protection ne repose donc pas uniquement sur le fait que l'URL Apps Script n'est pas censée être connue.

**Renouvellement de session** : le token d'accès expire au bout de 15 min. Plutôt qu'une route `/api/auth/refresh` dédiée appelée depuis le client, le renouvellement se fait **dans `web/src/middleware.ts` lui-même** : si le token d'accès est absent/expiré, le middleware tente silencieusement `auth.refresh` avec le refresh token (cookie httpOnly, 30 jours) avant de rediriger vers `/login` ou de renvoyer 401 — et comme le middleware s'exécute avant toute page ET toute route `/api/*`, ce mécanisme unique couvre les deux cas sans dupliquer la logique côté client. Vérifié en conditions réelles (TTL réduit temporairement à 5s pour le test) : fonctionne pour la navigation de page comme pour les appels `fetch` du client.

**Contrainte importante :** Apps Script Web App a un timeout d'exécution de 6 minutes et ne supporte pas le vrai async côté serveur. Toute opération longue (appel IA sur un gros PDF, OCR multi-pages) doit être **découpée** : une action lance le traitement et écrit un statut `en_cours` dans `docmod_extraction_ia`, un déclencheur (`ScriptApp.newTrigger`, exécution différée) ou un polling léger du frontend interroge le statut jusqu'à `termine`.

---

## 7. Pipeline IA documentaire

```
1. Upload (PDF/Word/Image) → stocké sur Drive, entrée dossiers + documents_source créée (statut: en_attente_ia)
2. dossiers.extractIA déclenché :
   a. Si Word → conversion en PDF (Drive API, natif)
   b. Si PDF/Image → envoi à l'API OpenAI (vision) avec prompt structuré
      demandant un JSON typé (dates, noms, adresses, montants, références)
   c. Résultat stocké dans docmod_extraction_ia (statut: a_verifier)
3. Frontend affiche le formulaire pré-rempli à partir de champs_extraits
4. Utilisateur corrige/complète manuellement (tous les champs restent éditables)
5. dossiers.updateForm sauvegarde à chaque étape (brouillon auto-sauvegardé)
6. dossiers.validate :
   a. Génère le PDF (§8)
   b. Crée l'entrée archives_index
   c. Log dans docmod_historique + activity_log
   d. Notifie l'utilisateur (in-app, cf §12)
```

Clé API OpenAI stockée en `PropertiesService.getScriptProperties()` côté Apps Script — jamais exposée au frontend.

**Décision d'implémentation** : l'extraction est appelée **synchrone**, dans le même appel `dossiers.extractIA` (pas de découpage `en_cours` + trigger + polling comme envisagé plus haut). Un appel OpenAI sur un document unique reste largement sous la limite de 6 min d'Apps Script ; le découpage asynchrone n'est ajouté que si un cas réel (document volumineux, multi-pages) le nécessite — pas construit par anticipation. Le statut (`en_cours`/`a_verifier`/`erreur`) est quand même écrit dans `docmod_extraction_ia` à chaque étape, pour ne pas avoir à changer le contrat de données si l'async devient nécessaire plus tard.

**Vérifié en conditions réelles** (2026-07-15) : `apps-script/src/lib/openai.gs` a été testé contre un vrai compte OpenAI — la requête est acceptée par l'API (`/v1/responses`, sortie contrainte par `json_schema`), donc le format est correct. Le test s'est arrêté sur un 429 "quota exceeded" côté compte OpenAI (facturation), pas sur une erreur de format — l'extraction elle-même (parsing de la réponse, pré-remplissage du formulaire) reste donc à confirmer une fois un compte avec quota disponible. Word → PDF (`convertWordToPdfBase64_`, service avancé Drive v2) n'a pas encore été exercé (testé uniquement avec une image).

---

## 8. Génération PDF

**Décision révisée en Phase 2** (implémentée dans `apps-script/src/lib/pdf.gs`) : plutôt qu'un template Google Docs statique à balises, le document est **construit programmatiquement** via `DocumentApp` à chaque validation (titre, numéro de dossier, date, utilisateur, puis une ligne par champ du schéma du formulaire). Raison : le formulaire est dynamique par module (§10), donc l'ensemble des champs à imprimer varie — un template à balises fixes aurait dû être resynchronisé à chaque évolution de schéma, alors que la génération programmatique lit directement le schéma. Le document est ensuite exporté en PDF (`DriveApp...getAs("application/pdf")`) puis le Google Doc intermédiaire est supprimé — seul le PDF est conservé dans Drive.

Implémenté en Phase 2 : numéro de dossier, date, utilisateur, champs du formulaire, signature (image insérée depuis le champ de type `signature`), pagination (native à Google Docs).

**Vérifié en conditions réelles** (2026-07-15) : dossier créé → formulaire rempli → validé → PDF généré et archivé sur Drive, via un test de bout en bout sur le vrai déploiement. C'était le point le plus risqué du code écrit sans pouvoir tester (`DocumentApp`, export PDF, nettoyage du document intermédiaire) — fonctionne tel qu'écrit.

**Différé** (à ajouter avant la Phase 4 "archivage complet") :
- **Logo** — dépend de `settings.logo_url` (paramètres admin, pas encore implémentés)
- **QR code** — décision §2 : encodeur JS pur embarqué en Apps Script, pas encore écrit (~300+ lignes, tâche dédiée)
- **Photos / annexes intégrées au PDF** — actuellement seule la signature est embarquée ; les photos/pièces jointes (Phase 5) seront listées en lien plutôt qu'incrustées dans un premier temps

---

## 9. Sécurité

- Mots de passe : hash + salt (PBKDF2/bcrypt via lib Apps Script, pas de mdp en clair dans Sheets)
- JWT signé (HS256, secret en `ScriptProperties`), courte durée de vie + refresh token
- CSRF : double-submit token sur les routes `/api/*` Next.js (le proxy §2-B le permet)
- XSS : sanitization systématique des champs texte long avant rendu (React échappe par défaut, vigilance sur `dangerouslySetInnerHTML` — à ne jamais utiliser sur du contenu utilisateur)
- Journal des connexions (`login_log`) et historique des modifications (`docmod_historique`, `activity_log`)
- Sauvegarde automatique : export périodique du classeur Sheets (versions Drive natives) + copie datée hebdomadaire dans `/backups/`

---

## 10. Frontend — structure

```
src/
├── app/                        (Next.js App Router)
│   ├── (auth)/login/
│   ├── (shell)/
│   │   ├── dashboard/
│   │   ├── archives/
│   │   ├── utilisateurs/
│   │   ├── parametres/
│   │   ├── calendrier/
│   │   ├── statistiques/
│   │   └── modules/[module]/...  (routing générique par module)
│   └── api/                    (proxy vers Apps Script)
├── modules/
│   └── nouvelle-demande/
│       ├── components/ (UploadZone, FormulaireDynamique, PdfPreview...)
│       ├── hooks/
│       └── api.ts
├── components/ui/              (design system partagé : Card, Sidebar, Modal...)
├── lib/                        (client API, auth, utils)
└── styles/
```

- Data fetching : TanStack Query (cache, revalidation, état de chargement uniforme)
- Formulaire dynamique : schéma JSON déclaratif (type de champ, validation, valeur extraite IA) → un moteur de rendu générique interprète ce schéma (permet d'ajouter des types de champs sans redéployer un formulaire codé en dur)
- Thème clair/sombre : Tailwind `dark:` + variable CSS, persistée en `localStorage`
- PWA : `next-pwa`, manifest avec icônes, cache offline des pages shell (pas des données sensibles)

---

## 11. Déploiement

- **Frontend** : GitHub → Vercel (déploiement auto sur push `main`, preview sur PR)
- **Backend** : Apps Script géré en local via `clasp` (versionné dans le même repo GitHub, dossier `apps-script/`), déployé manuellement ou via GitHub Action `clasp push && clasp deploy`
- **Secrets** :
  - Apps Script (`ScriptProperties`, jamais commités) : `JWT_SECRET`, `PASSWORD_PEPPER`, `DB_SPREADSHEET_ID` (auto-rempli par `setupDatabase()`), `OPENAI_API_KEY` (extraction IA, cf. §7)
  - Next.js (`.env.local` / variables Vercel, jamais commis) : `APPS_SCRIPT_URL` (URL du déploiement Web App), `JWT_SECRET` (même valeur que côté Apps Script — nécessaire pour que le middleware vérifie les JWT sans round-trip réseau à chaque requête)

---

## 12. Roadmap de livraison proposée

| Phase | Contenu | Statut |
|---|---|---|
| 0 | Setup repo, CI, squelette Next.js + Apps Script, connexion Sheets/Drive de base | Vérifié |
| 1 | Authentification (login, JWT, rôles), shell + dashboard vide, menu latéral | Vérifié |
| 2 | Module "Nouvelle demande" : upload document + formulaire dynamique **manuel** (sans IA) + génération PDF basique | Vérifié |
| 3 | Intégration IA (extraction automatique, pré-remplissage) | Partiellement vérifié (requête OpenAI valide, parsing réponse non exercé — quota compte) |
| 4 | Archivage complet (recherche/filtres/tri/export), historique, commentaires | Vérifié (export CSV seulement, pas XLSX) |
| 5 | Calendrier, galerie photos, pièces jointes, statistiques/graphiques | Vérifié (calendrier : vues Mois/Agenda seulement, Jour/Semaine différées ; miniatures photo non garanties multi-utilisateur, cf. §5) |
| 6 | Notifications, paramètres admin, PWA, mode sombre, polish animations | À faire |
| 7 | Durcissement sécurité, tests, documentation d'installation/déploiement | À faire |

« Vérifié » signifie testé de bout en bout sur un vrai déploiement (Node.js installé, projet Apps Script réel, classeur Sheets réel, navigateur) les 2026-07-15 et 2026-07-16 — cf. [README](./README.md#état-davancement).

---

## Décisions retenues

1. **Auth : option B (proxy Next.js)**. Les routes `/api/*` de Next.js portent le cookie httpOnly et relaient vers Apps Script avec le JWT en `Authorization`. Plus sûr, masque l'URL du Web App Apps Script, mutualise le CSRF.
2. **IA : OpenAI (Vision + JSON mode)** pour l'OCR et l'extraction structurée.
3. **QR code : génération pure côté Apps Script** (encodeur JS embarqué, type algorithme `qrcode-generator`, porté en `.gs`), sans appel à un service tiers — évite de faire fuiter les numéros de dossier/URLs vers un tiers et retire une dépendance réseau externe.
4. **Nom de l'application : "Soulèvement"** (nom de travail, repris du fichier fourni). Modifiable à tout moment via `settings.update` sans impact sur l'architecture (déjà prévu en Phase 6 / paramètres admin).
5. **Confirmé** : Phase 2 = formulaire manuel + PDF (sans IA) comme premier jalon fonctionnel, IA ajoutée en Phase 3 par-dessus le même formulaire.

Ces décisions sont réversibles (rien n'est verrouillé côté code au-delà du scaffold) — à signaler si l'un de ces choix doit changer avant la Phase 1.
