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
├── Module: Nouvelle demande (app "traitement de documents" — celle du CDC initial)
├── Module: Soulèvement (fiche wagons — formulaire structuré en 3 parties, cf. §13)
├── Module: Bris de barrières (future — même mécanisme que Soulèvement)
├── Module: RCI (future — même mécanisme)
├── Module: Autres (future — même mécanisme)
├── Archives (transverse, alimenté par tous les modules)
├── Utilisateurs (transverse)
└── Paramètres (transverse)
```

Principe : chaque module métier est un dossier autonome sous `src/modules/<nom>/` avec ses propres pages, composants, formulaires et endpoints Apps Script. Contrairement à l'intention initiale (registre `src/modules/registry.ts` piloté par une entrée déclarative unique), l'implémentation réelle (Phase 8, module Soulèvement) est un peu plus pragmatique : le **registre existe côté frontend** (`web/src/lib/modules.ts`, alimente les vignettes du dashboard "Applications"), mais chaque module ajoute encore ses propres routes sous `app/(shell)/modules/<nom>/` et son propre `api.ts`/`schema.ts`/`types.ts` — pas de routing générique unique par `[module]`. Accepté comme dette mineure : avec 4 modules prévus dont 3 partageant la même mécanique (formulaire + PDF dédié), une généralisation plus poussée du routing frontend sera reconsidérée quand le 2e module réel (au-delà de Soulèvement) sera construit.

Côté Apps Script, un routeur central (`main.gs`) fusionne les handlers exposés par chaque fichier `modules/*.gs` (`"<nom>Handlers_()"`, cf. §6). Les dossiers métier de tous les modules "formulaire" (`nouvelle-demande`, `soulevement`, et les futurs) partagent les **mêmes tables** `docmod_dossiers`/`docmod_annexes`/`docmod_commentaires`/`docmod_historique` (plutôt qu'un jeu de tables par module) : une colonne `module` sur `docmod_dossiers` distingue les dossiers, et un objet `MODULE_CONFIG` (`modules/dossiers.gs`) paramètre par module le préfixe de numérotation, l'obligation ou non d'un document source à l'upload, et (via `dossiersValidate_`) le générateur de PDF à appeler. Ce partage évite de dupliquer tout le CRUD (annexes, commentaires, historique, ownership) pour chaque nouveau module — le coût est que `docmod_dossiers.form_data` a une forme différente selon le module (non typée au niveau base, seulement au niveau schéma frontend/Apps Script de chaque module).

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

**Tables partagées par tous les modules "formulaire"** (`nouvelle-demande`, `soulevement`, futurs — cf. §3)

| Table | Colonnes clés |
|---|---|
| `docmod_dossiers` | id, numero, **module**, user_id, statut (brouillon/en_attente/valide/archive), date_creation, date_validation, form_data (JSON, forme dépendante du module), pdf_url, qr_code_url |
| `docmod_documents_source` | id, dossier_id, type (pdf/word/image), drive_file_id, date_upload — non utilisé par `soulevement` (pas de document source, `MODULE_CONFIG.requiresSource = false`) |
| `docmod_extraction_ia` | id, dossier_id, champs_extraits (JSON), confiance, statut (a_verifier/valide) — non utilisé par `soulevement` (pas d'extraction IA de document ; l'OCR par champ de `soulevement`, cf. §13, est stateless et n'écrit pas dans cette table) |
| `docmod_annexes` | id, dossier_id, type (photo/piece_jointe), drive_file_id, nom, date_ajout |
| `docmod_commentaires` | id, dossier_id, user_id, texte, date |
| `docmod_historique` | id, dossier_id, action, user_id, date, detail |

**Colonne `module` ajoutée en Phase 8** : migration additive (`setupDatabase()`, ré-exécutable, ajoute la colonne en fin de ligne sans toucher aux données existantes) — **doit être ré-exécutée manuellement une fois dans l'éditeur Apps Script** après ce déploiement pour que les nouveaux dossiers `soulevement` soient correctement filtrés/dispatchés (sinon `normalizeModule_` les traite comme `nouvelle-demande` par défaut, cf. `modules/dossiers.gs`). Les lignes déjà existantes sans valeur de `module` restent interprétées comme `nouvelle-demande` — rétrocompatibilité voulue, pas un bug.

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
| `users.list/create/update/delete` | POST | admin | CRUD utilisateurs — garde-fous : impossible de se supprimer soi-même ou de supprimer/rétrograder/désactiver le dernier admin actif |
| `users.resetPassword` | POST | admin | Réinitialise le mot de passe d'un utilisateur (génère un mot de passe temporaire si non fourni) |
| `dossiers.create` | POST | utilisateur | Crée un dossier + upload document source |
| `dossiers.extractIA` | POST | utilisateur | Lance l'extraction IA (synchrone, cf §7) |
| `dossiers.updateForm` | POST | utilisateur | Sauvegarde le formulaire modifié |
| `dossiers.validate` | POST | utilisateur | Valide → déclenche génération PDF + archivage |
| `dossiers.get/list` | POST | utilisateur/admin | Consultation (filtrée par rôle) — inclut sources, extraction, commentaires, historique, annexes |
| `dossiers.addComment` | POST | utilisateur/admin | Ajoute un commentaire sur un dossier (propriétaire ou admin) |
| `dossiers.addAnnexe` | POST | utilisateur/admin | Ajoute une photo ou pièce jointe à un dossier |
| `dossiers.deleteAnnexe` | POST | utilisateur/admin | Supprime une annexe (Drive + ligne Sheets) |
| `annexes.list` | POST | utilisateur/admin | Vue transverse de toutes les annexes d'un type, tous dossiers confondus, filtrée par rôle |
| `fields.extractSingle` | POST | utilisateur | OCR ponctuel d'un seul champ (photo → numéro), module `soulevement` — stateless, cf. §13 |
| `archives.search` | POST | utilisateur/admin | Recherche/filtre/tri sur `archives_index` (filtré par rôle) |
| `stats.summary` | POST | utilisateur/admin | Agrégats pour le dashboard et la page statistiques |
| `settings.get` | POST | utilisateur/admin | Lecture des paramètres globaux (nom app, logo — affichés dans la sidebar pour tous) |
| `settings.update` | POST | admin | Modification des paramètres globaux |

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

**Module `soulevement` (Phase 8) : approche différente, cf. §13.** Le générateur ci-dessus (`buildAndExportDossierPdf_`, `DocumentApp`) reste inchangé et continue de servir le module `nouvelle-demande`. Le module `soulevement` utilise un second générateur (`buildAndExportSoulevementPdf_`, `apps-script/src/lib/pdf-template.gs`) basé sur `SlidesApp`, dispatché depuis `dossiersValidate_` selon le `module` du dossier.

---

## 9. Sécurité

État réel (Phase 7, vérifié — pas la liste aspirationnelle de la Phase 0) :

- **Mots de passe** : HMAC-SHA256 salé + poivré (`hashPassword_`/`verifyPassword_`, `lib/auth.gs`) — pas de mot de passe en clair dans Sheets. Salt par utilisateur + pepper global (`PASSWORD_PEPPER`, `ScriptProperties`).
- **JWT** : HS256, secret en `ScriptProperties` (`JWT_SECRET`), access token 15 min + refresh token 30 jours (renouvellement silencieux, cf. §6).
- **Anti-bruteforce** : après 5 échecs de connexion sur un identifiant dans les 15 dernières minutes, les tentatives suivantes sont bloquées (`assertNotLockedOut_`, `modules/auth.gs`), en s'appuyant sur `login_log` déjà tenu à jour — pas de table dédiée.
- **CSRF** : les cookies de session sont `SameSite=Lax` (bloque déjà la quasi-totalité des requêtes mutantes cross-site) ; en complément, le middleware vérifie que l'en-tête `Origin` (quand présent) correspond à l'hôte de la requête pour toute méthode non-GET sur `/api/*` (`isTrustedOrigin`, `web/src/middleware.ts`). Pas de jeton double-submit dédié — jugé redondant avec ces deux couches.
- **Injection de formule Google Sheets** : toute valeur écrite dans Sheets via `setValue()`/`setValues()` est interprétée comme une saisie manuelle — une chaîne commençant par `=`, `+`, `-`, `@` deviendrait une formule vivante à l'ouverture du classeur (et casserait au passage des données légitimes comme un numéro de téléphone `+33...`). Neutralisé au point d'écriture (`sanitizeForSheets_`, `lib/sheets.gs`), appliqué à toutes les tables sans exception au niveau d'`appendRowUnlocked_`/`updateRowUnlocked_`. **Non vérifié visuellement** : le comportement du guillemet simple en préfixe (force le texte littéral côté Sheets, invisible via `getValue()`) est un mécanisme natif documenté de Google Sheets, mais son effet réel n'a pas pu être confirmé en ouvrant le classeur dans l'interface Sheets depuis cet environnement (pas d'accès navigateur authentifié Google) — le roundtrip API (écriture puis lecture) a été vérifié, pas le rendu dans l'UI Sheets elle-même.
- **XSS** : React échappe par défaut. Un seul usage de `dangerouslySetInnerHTML` dans tout le code (`THEME_INIT_SCRIPT` en tête de `layout.tsx`) — contenu 100% statique, sans interpolation d'entrée utilisateur.
- **En-têtes HTTP** : `X-Content-Type-Options`, `X-Frame-Options: DENY` (anti-clickjacking), `Referrer-Policy`, `Permissions-Policy` (`next.config.js`). Pas de `Content-Security-Policy` — différé (nécessiterait d'auditer chaque source de script/image/fetch, risque de casser des choses sans pouvoir tout revérifier visuellement dans cet environnement).
- **Autorisation défense-en-profondeur** : le Web App Apps Script est déployé en accès anonyme (`ANYONE_ANONYMOUS`) ; chaque action sensible revérifie elle-même le JWT (`requireAuth_`) plutôt que de faire confiance au seul proxy Next.js — cf. §6.
- **Journal des connexions** (`login_log`) et **historique des modifications** par dossier (`docmod_historique`).

**Vulnérabilité connue et non corrigée — dépendance Next.js** : `npm audit` (2026-07-17) signale plusieurs CVE réelles sur `next@14.2.35` (la dernière version 14.x — déjà à jour dans cette ligne), notamment DoS et empoisonnement de cache touchant Middleware et React Server Components, deux mécanismes utilisés par cette app. Le correctif nécessite Next.js 15 ou 16, ce qui implique : passage des API `cookies()`/`headers()` en asynchrone (2 points d'appel identifiés : `web/src/app/(shell)/layout.tsx`, `web/src/lib/auth-server.ts` — changement contenu) **et** une mise à niveau probable de React 18→19 avec ses propres changements de compatibilité (Framer Motion, TanStack Query...) — non contenu. Décision : ne pas migrer à l'aveugle en fin de session sans pouvoir revérifier l'intégralité des 6 phases déjà validées manuellement ; documenté ici comme actions prioritaires du prochain cycle plutôt que traité superficiellement.

**Non implémenté** (aspirationnel dans une version antérieure de ce document, retiré ici pour rester honnête sur l'état réel) : sauvegarde automatique planifiée du classeur Sheets. Les versions Drive natives (historique de révisions, illimité par défaut) offrent déjà un filet de sécurité basique sans configuration ; une sauvegarde datée périodique reste à construire si le besoin se confirme.

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
- Thème clair/sombre : Tailwind `dark:` + variables CSS (`globals.css`), toggle dans le header (`ThemeToggle`), persisté en `localStorage`, script inline dans `<head>` pour appliquer la classe avant hydration (évite le flash du mauvais thème)
- Notifications : toasts éphémères (`ToastProvider`/`useToast`, Framer Motion pour l'entrée/sortie), déclenchés sur validation, erreurs, ajout de commentaire/annexe, export — pas de centre de notifications persisté (hors scope Phase 6)
- PWA : **pas de `next-pwa`** — manifest et service worker écrits à la main (`public/manifest.json`, `public/sw.js`, cache réseau-d'abord de l'app shell, jamais de `/api/*`). Icônes PNG générées par un script Node maison (`web/scripts/generate-icons.js`, zlib uniquement, aucun outil d'image externe sur la machine de dev) plutôt qu'une dépendance de génération d'images. Service worker enregistré uniquement en production (`NODE_ENV`) pour ne pas perturber le hot-reload en dev — **non testé en conditions réelles d'installation** (impossible de vérifier "Ajouter à l'écran d'accueil" dans cet environnement).

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
| 6 | Notifications, gestion des utilisateurs, paramètres admin (nom/logo), PWA, mode sombre | Vérifié (formulaires dynamiques admin et sauvegarde/import/export différés, cf. ci-dessous ; PWA non testée à l'installation) |
| 7 | Durcissement sécurité, tests, documentation d'installation/déploiement | Vérifié (mise à jour Next.js majeure différée, cf. §9) |
| 8 | Dashboard multi-modules (4 vignettes) + module "Soulèvement" (formulaire 3 parties, OCR par champ, PDF via template Slides) | Partiellement vérifié — cf. §13 |

« Vérifié » signifie testé de bout en bout sur un vrai déploiement (Node.js installé, projet Apps Script réel, classeur Sheets réel, navigateur) les 2026-07-15 à 2026-07-17 — cf. [README](./README.md#état-davancement).

**Gaps Phase 6 assumés** (pages `/utilisateurs` et `/parametres` existaient dans le menu depuis la Phase 0 sans aucune page ni backend derrière — corrigé cette phase ; `/formulaires` reste un lien mort, volontairement) :
- Éditeur de formulaires (« Gestion des formulaires » du CDC) — nécessiterait de rendre le schéma de formulaire dynamique/piloté par base de données au lieu du fichier statique `schema.ts` actuel ; pas justifié tant qu'un seul module existe.
- Sauvegarde/Import/Export génériques au niveau paramètres — l'export CSV des archives couvre déjà le besoin d'export le plus concret ; sauvegarde/restauration complète du classeur différée.

---

## 13. Module "Soulèvement" (Phase 8)

Premier module métier construit au-dessus du dashboard multi-modules (`web/src/lib/modules.ts`, 4 vignettes : Soulèvement actif, Bris de barrières/RCI/Autres "Bientôt disponible"). Les 3 modules futurs suivront la même mécanique décrite ici — seuls le schéma de formulaire et le template PDF changeront.

**Formulaire en 3 parties** (`apps-script/src/modules/soulevement-schema.gs`, mirroir `web/src/modules/soulevement/schema.ts`) — découpage pensé pour rester court à l'écran sur mobile, calqué sur le regroupement naturel du document papier fourni :
1. **Localisation et matériel** : date/heure, 22 cases à cocher (voies VF/VR/VFL/VEXT), 4× numéros de conteneur + 4× numéros de wagon (avec OCR photo, cf. ci-dessous), longueur wagon, relevage nécessaire, météo, moment, visibilité, conséquences.
2. **Appel aux personnes concernées** : 3 colonnes (Service Technique LHTE / Gestionnaire matériels / Entreprise ferroviaire), chacune avec personne contactée + heure + case "Personne jointe" ; les 2 dernières colonnes ajoutent un menu déroulant d'entreprise (NRS/TOUAX/Inveho/Wascosa/SDH FER, ou NAVILAND CARGO/FEROVERGNE — listes reprises du document papier).
3. **Autorisation et clôture** : 3 signatures nommées (réutilise `SignaturePad` tel quel — le moteur de formulaire supportait déjà plusieurs champs `signature` distincts sans modification), dates/heures, validation aiguilleur, fiche clôturée.

**OCR par champ** (`fields.extractSingle`, `apps-script/src/modules/ocr.gs`) : bouton "📷" à côté de chaque champ numéro de conteneur/wagon (`PhotoOcrField.tsx`, `<input capture="environment">` déclenche l'appareil photo sur mobile). Réutilise `lib/openai.gs` avec un schéma JSON minimal `{numero}` au lieu du schéma complet `DOSSIER_SCHEMA` — stateless, ne persiste rien. Le champ reste toujours corrigible manuellement si la reconnaissance échoue ou se trompe. Photos "dossier" classiques (annexes) restent gérées par le système existant (Phase 5) — pas de nouveau mécanisme, déjà conforme à "photos après le PDF en pièce jointe".

**Génération PDF — pivot Docs → Slides.** Le fichier Word fourni comme référence pour la mise en forme (`soulévement.docx`) a été inspecté (unzip + XML `document.xml`) : **0 vrai tableau Word** (`<w:tbl>` = 0), la mise en page (bandeau vert, grille de cases à cocher, tableau de contacts) repose entièrement sur 40 zones de texte flottantes (`txbxContent` dans des `<w:drawing>`). `DocumentApp` (service Apps Script utilisé par `pdf.gs` pour le module `nouvelle-demande`) ne lit/n'édite pas de façon fiable ce type de contenu — l'approche initialement prévue (jetons `{{...}}` dans un template Word uploadé + `body.replaceText()`) n'était donc pas applicable telle quelle à ce fichier.

**Solution retenue** : le template est reconstruit par **code** via `SlidesApp` (`apps-script/src/lib/pdf-template.gs`, `getOrBuildSoulevementTemplate_()`) plutôt qu'un fichier à uploader manuellement — Slides gère nativement les zones de texte positionnées, et `Presentation.replaceAllText()` est l'équivalent direct du mécanisme "jetons + remplacement" prévu. Le template (bandeau vert, grille de 22 cases à cocher, 4×2 champs conteneur/wagon, tableau de contacts 3 colonnes, 3 zones de signature) est construit une seule fois (mémorisé dans `PropertiesService` sous `SOULEVEMENT_TEMPLATE_ID`, reconstruit automatiquement si le fichier Drive a été supprimé), puis copié et rempli à chaque validation de dossier — même schéma que `getRootFolder_()` (auto-création paresseuse). Reproduction fidèle de l'organisation/libellés/cases à cocher/couleur verte du document source, **sans viser une réplique pixel-perfect** du graphique original (icônes de wagons non reproduites) — positionnement des ~60 zones de texte calculé par un curseur Y et des helpers de mise en page (`souAddFieldRow_`, `souAddCheckboxGrid_`, etc.), pas par coordonnées codées en dur une à une.

Les cases à cocher (y compris chaque option d'un champ `radio` ou `checkbox-group`) sont rendues comme des caractères Unicode `☒`/`☐` (`CB_CHECKED`/`CB_UNCHECKED`), un jeton par option (`checkboxToken_(fieldName, option)` — même helper côté schéma et côté génération). Les signatures (images base64) sont insérées après `replaceAllText()` (qui n'agit que sur du texte) : la zone jeton `{{signature_x}}` est repérée par son texte, sa position/taille relevée, puis remplacée par `slide.insertImage()`.

**Vérifié en conditions réelles (2026-07-18)** : poussé et déployé sur le vrai projet Apps Script (@8). Testé de bout en bout via navigateur réel (login → dashboard → vignette Soulèvement → assistant 3 parties → cases à cocher/menus déroulants/signatures → validation → PDF généré, dossier `SOU-2026-0002`) et via appels API directs (`SOU-2026-0001`) : création, remplissage des 3 parties, validation, dispatch de numérotation (`SOU-` correct) tous confirmés fonctionnels. Non-régression du module `nouvelle-demande` confirmée (listing, filtrage par module).

**Non vérifié visuellement à ce stade** : le rendu réel du PDF généré par le nouveau générateur Slides. Deux causes distinctes, toutes deux hors de mon contrôle depuis cet environnement :
1. La colonne `module` ajoutée à `docmod_dossiers` (cf. §4) nécessite que **`setupDatabase()` soit ré-exécuté manuellement dans l'éditeur Apps Script** — sans cela, `dossiersValidate_` route (à tort) tous les dossiers vers l'ancien générateur `nouvelle-demande` (`DocumentApp`), pas vers `buildAndExportSoulevementPdf_`. Les deux dossiers de test créés le 2026-07-18 ont donc généré un PDF avec l'ancien générateur générique, pas le nouveau template Slides.
2. Les PDF sont stockés sous le compte Google qui exécute le script (`executeAs: USER_DEPLOYING`, limitation déjà documentée §5) — je n'ai pas d'accès Drive authentifié depuis cet environnement pour ouvrir et inspecter visuellement le fichier moi-même.

**Action attendue avant de considérer le PDF Soulèvement pleinement vérifié** : (a) ré-exécuter `setupDatabase()` une fois, (b) créer/valider une fiche Soulèvement (ou revalider un brouillon existant), (c) ouvrir le PDF généré et vérifier visuellement la mise en page — le positionnement des ~60 zones de texte calculé par les helpers de `pdf-template.gs` est la partie la plus à risque de ce module (jamais rendu ni ajusté visuellement avant ce déploiement).

---

## Décisions retenues

1. **Auth : option B (proxy Next.js)**. Les routes `/api/*` de Next.js portent le cookie httpOnly et relaient vers Apps Script avec le JWT en `Authorization`. Plus sûr, masque l'URL du Web App Apps Script, mutualise le CSRF.
2. **IA : OpenAI (Vision + JSON mode)** pour l'OCR et l'extraction structurée.
3. **QR code : génération pure côté Apps Script** (encodeur JS embarqué, type algorithme `qrcode-generator`, porté en `.gs`), sans appel à un service tiers — évite de faire fuiter les numéros de dossier/URLs vers un tiers et retire une dépendance réseau externe.
4. **Nom de l'application : "Soulèvement"** (nom de travail, repris du fichier fourni). Modifiable à tout moment via `settings.update` sans impact sur l'architecture (déjà prévu en Phase 6 / paramètres admin).
5. **Confirmé** : Phase 2 = formulaire manuel + PDF (sans IA) comme premier jalon fonctionnel, IA ajoutée en Phase 3 par-dessus le même formulaire.

Ces décisions sont réversibles (rien n'est verrouillé côté code au-delà du scaffold) — à signaler si l'un de ces choix doit changer avant la Phase 1.
