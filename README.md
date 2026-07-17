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
- Une clé API OpenAI (optionnelle — sans elle, l'extraction automatique échoue proprement et la saisie manuelle reste disponible)

## Installation — backend Apps Script

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
2. `seedAdminUser()` — une seule fois, crée le premier compte administrateur (`admin` / `ChangeMoi123!`, **à changer immédiatement**, cf. checklist ci-dessous)

Enfin :

```bash
clasp deploy
```

Récupérer l'URL du déploiement Web App (`/exec`) pour `APPS_SCRIPT_URL` côté frontend.

**Mises à jour ultérieures** : `clasp push` seul ne suffit pas — il met à jour le code "HEAD" mais pas ce que sert l'URL `/exec` déployée. Pour republier sur la **même** URL (sans changer `APPS_SCRIPT_URL` côté frontend), redéployer sur le même `deploymentId` : `clasp deploy --deploymentId <id> --description "..."` (`clasp deployments` liste les déploiements existants et leurs ID).

## Installation — frontend

```bash
cd web
cp .env.example .env.local   # renseigner APPS_SCRIPT_URL et JWT_SECRET (même valeur que côté Apps Script)
npm install
npm run dev
```

**Ne jamais lancer `npm run build` pendant que `npm run dev` tourne** sur le même dossier `web/` — les deux partagent `.next/` et se corrompent mutuellement (`Cannot find module './XXX.js'`, ou une page bloquée sur "Chargement..." après redémarrage). Si ça arrive : arrêter le serveur de dev, `rm -rf .next`, relancer `npm run dev`.

### Tests

```bash
cd web
npm test          # Vitest — logique pure (CSV export, bucketing calendrier par fuseau local, thème)
npm run typecheck  # tsc --noEmit
```

Pas de tests end-to-end automatisés (Playwright/Cypress) : l'essentiel de la logique métier vit côté Apps Script (Sheets/Drive/OpenAI), difficile à tester sans mocker des services externes. La couverture réelle vient de la vérification manuelle de chaque phase (voir « État d'avancement » ci-dessous) plutôt que d'une suite automatisée — un choix de scope, pas un oubli.

## Déploiement en production — frontend sur Vercel

1. Connecter le repo GitHub à Vercel (root directory : `web/`)
2. Variables d'environnement Vercel : `APPS_SCRIPT_URL`, `JWT_SECRET` (mêmes valeurs qu'en local/Apps Script)
3. Déploiement automatique sur push vers `main`, preview sur chaque PR

## Checklist sécurité avant mise en production

À faire avant d'ouvrir l'application à de vrais utilisateurs (aucun de ces points n'est fait automatiquement) :

- [ ] Changer le mot de passe du compte `admin` créé par `seedAdminUser()` (`ChangeMoi123!` est public, dans ce dépôt)
- [ ] Vérifier que `JWT_SECRET` et `PASSWORD_PEPPER` sont des secrets générés aléatoirement (pas des valeurs de test réutilisées) et **distincts** l'un de l'autre
- [ ] Vérifier que `.env.local` n'est jamais commité (`.gitignore` le couvre déjà — à revérifier si le `.gitignore` a été modifié)
- [ ] Revoir la liste des comptes utilisateurs (page Utilisateurs) — supprimer les comptes de test
- [ ] Planifier une mise à niveau de Next.js 14 → 15/16 : plusieurs CVE réelles ne sont corrigées qu'à partir de la v15 (cf. [ARCHITECTURE.md §9](./ARCHITECTURE.md#9-sécurité) pour le détail et l'estimation d'effort — changement contenu pour `cookies()`/`headers()`, mais React 18→19 en cascade, non testé dans ce dépôt)
- [ ] Décider si `web/.env.example`/README doivent rester publics si le dépôt GitHub passe en visibilité publique (aucun secret réel n'y figure, mais vérifier avant de changer la visibilité)

## État d'avancement

Phases 0 à 7 **vérifiées de bout en bout en conditions réelles** (2026-07-15 à 2026-07-17) : Node.js installé, backend déployé sur un vrai projet Apps Script, base Sheets initialisée, compte admin créé, et parcours complet testé (navigateur + appels directs) — login, création de dossier, upload Drive, formulaire, validation, **génération PDF réelle confirmée**, recherche/filtre/tri des archives, commentaires, historique, ajout/suppression de photos et pièces jointes, calendrier (mois/agenda), statistiques avec graphiques, CRUD utilisateurs avec garde-fous testés (dernier admin, auto-suppression), paramètres nom/logo reflétés en direct dans la sidebar, mode sombre, notifications toast, anti-bruteforce testé (verrouillage après 5 échecs), sanitisation anti-injection Sheets. Voir la roadmap dans [ARCHITECTURE.md](./ARCHITECTURE.md#12-roadmap-de-livraison-proposée).

Bugs trouvés et corrigés pendant cette vérification :
- Le token d'accès (15 min) ne se renouvelait jamais malgré un refresh token valide 30 jours — corrigé par un renouvellement silencieux dans `web/src/middleware.ts` (cf. [ARCHITECTURE.md §6](./ARCHITECTURE.md#6-api-apps-script-web-app)).
- `archives_index` ne référençait pas l'identifiant interne du dossier (`dossier_id`), rendant impossible le lien "voir le dossier" depuis la liste d'archives — colonne ajoutée, `setupDatabase()` rendu ré-exécutable pour ce genre de migration de schéma sans perte de données.
- Lancer `npm run build` (production) pendant que `npm run dev` tournait sur le même dossier `.next` a corrompu le serveur de dev — voir avertissement ci-dessus.
- Les liens `/utilisateurs` et `/parametres` existaient dans le menu depuis la Phase 0 sans aucune page ni backend derrière — construits en Phase 6.
- `npm audit` a révélé plusieurs CVE réelles sur Next.js 14.x sans correctif dans cette ligne majeure — cf. checklist sécurité ci-dessus.

**Encore incertain** : l'extraction IA a atteint l'API OpenAI et reçu une erreur propre (quota compte dépassé, 429) — le format de requête est donc valide, mais le parsing de la réponse réelle (JSON structuré) n'a pas encore été exercé faute de quota disponible au moment du test. La conversion Word→PDF (`convertWordToPdfBase64_`) n'a été testée qu'avec une image, pas un vrai `.docx`. Le chargement effectif des miniatures photo dans le navigateur n'a pas pu être confirmé visuellement (captures d'écran indisponibles dans l'environnement de dev) — dégradation gracieuse en place si l'image ne charge pas. L'installabilité PWA réelle ("Ajouter à l'écran d'accueil") n'a pas pu être testée (pas d'environnement mobile/Chrome installable disponible).

**Connu manquant** : logo et QR code dans le PDF, photos/annexes incrustées au PDF (voir [ARCHITECTURE.md §8](./ARCHITECTURE.md#8-génération-pdf)) ; export Excel/XLSX (CSV seulement) ; vues Jour/Semaine du calendrier (Mois/Agenda seulement) ; partage multi-utilisateur des miniatures Drive (cf. [ARCHITECTURE.md §5](./ARCHITECTURE.md#5-stockage-google-drive)) ; éditeur de formulaires et sauvegarde/import/export génériques (cf. ARCHITECTURE.md §12) ; mise à niveau Next.js 15/16 (cf. checklist sécurité) — différés, chacun documenté avec sa raison dans ARCHITECTURE.md.
