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
| `users` | id, nom, prenom, email, identifiant, password_hash, photo_url, fonction, role, actif, date_creation |
| `roles` | id, nom (admin/utilisateur), permissions (JSON) |
| `sessions` | id, user_id, refresh_token_hash, user_agent, ip, created_at, expires_at |
| `login_log` | id, user_id, date, ip, succes (bool) |
| `activity_log` | id, user_id, module, action, cible_id, date, detail |
| `archives_index` | id, numero_dossier, module, user_id, statut, date_creation, date_validation, pdf_url |
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
| `dossiers.extractIA` | POST | utilisateur | Lance l'extraction IA (asynchrone, cf §7) |
| `dossiers.updateForm` | POST | utilisateur | Sauvegarde le formulaire modifié |
| `dossiers.validate` | POST | utilisateur | Valide → déclenche génération PDF + archivage |
| `dossiers.get/list` | POST | utilisateur/admin | Consultation (filtrée par rôle) |
| `archives.search` | POST | utilisateur/admin | Recherche/filtre/tri sur `archives_index` |
| `stats.summary` | POST | utilisateur/admin | Agrégats pour le dashboard et la page statistiques |
| `settings.get/update` | POST | admin | Paramètres globaux |

Le frontend n'appelle jamais Apps Script directement (cf. décision §2 option B) : il passe par des routes `/api/*` Next.js qui ajoutent le JWT, gèrent le CSRF et relaient la requête.

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

---

## 8. Génération PDF

Approche retenue : **template Google Docs** avec balises (`{{numero_dossier}}`, `{{nom_utilisateur}}`, `{{date}}`, `{{champ_x}}`…), dupliqué et rempli via `DocumentApp` par Apps Script, images (signature, photos, QR code) insérées par position, puis exporté en PDF via `DriveApp`/`Utilities`. Le QR code est généré via une lib légère côté Apps Script (ou un service externe type `api.qrserver.com` appelé en `UrlFetchApp`, à confirmer) encodant l'URL de consultation du dossier archivé.

Contenu obligatoire (repris du CDC) : logo, nom app, date, utilisateur, données du formulaire, signature, photos, annexes (liste + liens), numéro de dossier, QR code, pagination automatique (native à Google Docs).

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
- **Secrets** : clé OpenAI et secret JWT en `ScriptProperties` (jamais commités) ; variables Vercel pour les URLs d'API

---

## 12. Roadmap de livraison proposée

| Phase | Contenu |
|---|---|
| 0 | Setup repo, CI, squelette Next.js + Apps Script, connexion Sheets/Drive de base |
| 1 | Authentification (login, JWT, rôles), shell + dashboard vide, menu latéral |
| 2 | Module "Nouvelle demande" : upload document + formulaire dynamique **manuel** (sans IA) + génération PDF basique |
| 3 | Intégration IA (extraction automatique, pré-remplissage, statut asynchrone) |
| 4 | Archivage complet (recherche/filtres/tri/export), historique, commentaires |
| 5 | Calendrier, galerie photos, pièces jointes, statistiques/graphiques |
| 6 | Notifications, paramètres admin, PWA, mode sombre, polish animations |
| 7 | Durcissement sécurité, tests, documentation d'installation/déploiement |

---

## Décisions retenues

1. **Auth : option B (proxy Next.js)**. Les routes `/api/*` de Next.js portent le cookie httpOnly et relaient vers Apps Script avec le JWT en `Authorization`. Plus sûr, masque l'URL du Web App Apps Script, mutualise le CSRF.
2. **IA : OpenAI (Vision + JSON mode)** pour l'OCR et l'extraction structurée.
3. **QR code : génération pure côté Apps Script** (encodeur JS embarqué, type algorithme `qrcode-generator`, porté en `.gs`), sans appel à un service tiers — évite de faire fuiter les numéros de dossier/URLs vers un tiers et retire une dépendance réseau externe.
4. **Nom de l'application : "Soulèvement"** (nom de travail, repris du fichier fourni). Modifiable à tout moment via `settings.update` sans impact sur l'architecture (déjà prévu en Phase 6 / paramètres admin).
5. **Confirmé** : Phase 2 = formulaire manuel + PDF (sans IA) comme premier jalon fonctionnel, IA ajoutée en Phase 3 par-dessus le même formulaire.

Ces décisions sont réversibles (rien n'est verrouillé côté code au-delà du scaffold) — à signaler si l'un de ces choix doit changer avant la Phase 1.
