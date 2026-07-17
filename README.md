# Soulèvement

Plateforme de traitement automatique de documents : dépôt (PDF/Word/image) → extraction IA → formulaire dynamique → génération PDF → archivage automatique.

Voir [ARCHITECTURE.md](./ARCHITECTURE.md) pour la conception complète (stack, modèle de données, API, sécurité, roadmap).

## Structure du repo

```
soulevement/
├── ARCHITECTURE.md      Conception technique détaillée
├── web/                 Frontend Next.js + TypeScript + Tailwind (déployé sur Vercel)
└── apps-script/         Backend Google Apps Script (Sheets + Drive + API), géré via clasp
```

## Prérequis

- Node.js 20+ et npm
- Un compte Google avec accès à Google Sheets/Drive/Apps Script
- `clasp` (`npm install -g @google/clasp`) pour déployer le backend
- Une clé API OpenAI

## Démarrage — backend Apps Script

Avant `clasp create` : activer l'API Google Apps Script sur le compte Google utilisé, sur https://script.google.com/home/usersettings (sinon `clasp create`/`clasp login` échoue avec "Insufficient Permission" ou "User has not enabled the Apps Script API" — le changement peut prendre quelques minutes à se propager).

```bash
cd apps-script
clasp login
clasp create --type standalone --title "Soulèvement API" --rootDir ./src   # génère .clasp.json avec le scriptId
```

`--type webapp` échoue ("Invalid container file type") avec les versions récentes de clasp — utiliser `standalone` : le comportement Web App vient du bloc `webapp` dans `appsscript.json` et du déploiement (`clasp deploy`), pas du type choisi à la création.

**`clasp create` écrase `src/appsscript.json`** avec un manifeste par défaut (fuseau horaire, pas de config `webapp`) : restaurer notre version avant de pousser, ex. `git checkout -- apps-script/src/appsscript.json`.

```bash
clasp push
```

Puis, dans l'éditeur Apps Script (Paramètres du projet → Propriétés du script), définir :
- `JWT_SECRET` — secret aléatoire (ex. `openssl rand -hex 32`)
- `PASSWORD_PEPPER` — autre secret aléatoire, distinct de `JWT_SECRET`
- `OPENAI_API_KEY` — clé API OpenAI, utilisée par l'extraction automatique (cf. ARCHITECTURE.md §7)

Activer aussi le service avancé **Drive API** (v2) dans l'éditeur Apps Script (Services → `+` → Drive API) — nécessaire à la conversion Word→PDF pour l'extraction IA ; la déclaration dans `appsscript.json` seule ne suffit pas toujours après un `clasp push`, à vérifier dans l'éditeur si `Drive` n'est pas reconnu.

Exécuter ensuite depuis l'éditeur Apps Script :
1. `setupDatabase()` — crée le classeur Google Sheets et tous les onglets/en-têtes, et enregistre `DB_SPREADSHEET_ID`. Ré-exécutable sans risque après un `git pull` : ajoute les colonnes manquantes en fin de ligne sur les onglets déjà peuplés, sans toucher aux données existantes (utile quand le schéma évolue d'une phase à l'autre).
2. `seedAdminUser()` — une seule fois, crée le premier compte administrateur (`admin` / `ChangeMoi123!`, à changer immédiatement)

Enfin :

```bash
clasp deploy
```

Récupérer l'URL du déploiement Web App (`/exec`) pour `APPS_SCRIPT_URL` côté frontend.

**Mises à jour ultérieures** : `clasp push` seul ne suffit pas — il met à jour le code "HEAD" mais pas ce que sert l'URL `/exec` déployée. Pour republier sur la **même** URL (sans changer `APPS_SCRIPT_URL` côté frontend), redéployer sur le même `deploymentId` : `clasp deploy --deploymentId <id> --description "..."` (`clasp deployments` liste les déploiements existants et leurs ID).

## Démarrage — frontend

```bash
cd web
cp .env.example .env.local   # renseigner APPS_SCRIPT_URL et JWT_SECRET (même valeur que côté Apps Script)
npm install
npm run dev
```

## État d'avancement

Phases 0 à 5 **vérifiées de bout en bout en conditions réelles** (2026-07-15 et 2026-07-16) : Node.js installé, backend déployé sur un vrai projet Apps Script, base Sheets initialisée, compte admin créé, et parcours complet testé (navigateur + appels directs) — login, création de dossier, upload Drive, formulaire, validation, **génération PDF réelle confirmée**, recherche/filtre/tri des archives, commentaires, historique, ajout/suppression de photos et pièces jointes, calendrier (mois/agenda), statistiques avec graphiques. Voir la roadmap dans [ARCHITECTURE.md](./ARCHITECTURE.md#12-roadmap-de-livraison-proposée).

Trois vrais bugs trouvés et corrigés pendant cette vérification :
- Le token d'accès (15 min) ne se renouvelait jamais malgré un refresh token valide 30 jours — corrigé par un renouvellement silencieux dans `web/src/middleware.ts` (cf. [ARCHITECTURE.md §6](./ARCHITECTURE.md#6-api-apps-script-web-app)).
- `archives_index` ne référençait pas l'identifiant interne du dossier (`dossier_id`), rendant impossible le lien "voir le dossier" depuis la liste d'archives — colonne ajoutée, `setupDatabase()` rendu ré-exécutable pour ce genre de migration de schéma sans perte de données.
- Lancer `npm run build` (production) pendant que `npm run dev` tournait sur le même dossier `.next` a corrompu le serveur de dev (`Cannot find module './276.js'`) — ne pas faire tourner build et dev en parallèle sur le même dossier ; supprimer `.next` et relancer `npm run dev` si ça arrive.

**Encore incertain** : l'extraction IA a atteint l'API OpenAI et reçu une erreur propre (quota compte dépassé, 429) — le format de requête est donc valide, mais le parsing de la réponse réelle (JSON structuré) n'a pas encore été exercé faute de quota disponible au moment du test. La conversion Word→PDF (`convertWordToPdfBase64_`) n'a été testée qu'avec une image, pas un vrai `.docx`. Le chargement effectif des miniatures photo dans le navigateur n'a pas pu être confirmé visuellement (captures d'écran indisponibles dans l'environnement de dev) — dégradation gracieuse en place si l'image ne charge pas.

**Connu manquant** : logo et QR code dans le PDF, photos/annexes incrustées au PDF (voir [ARCHITECTURE.md §8](./ARCHITECTURE.md#8-génération-pdf)) ; export Excel/XLSX (CSV seulement) ; vues Jour/Semaine du calendrier (Mois/Agenda seulement) ; partage multi-utilisateur des miniatures Drive (cf. [ARCHITECTURE.md §5](./ARCHITECTURE.md#5-stockage-google-drive)) — différés aux phases suivantes.
