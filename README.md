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

```bash
cd apps-script
clasp login
clasp create --type webapp --title "Soulèvement API"   # génère .clasp.json avec le scriptId
clasp push
```

Puis, dans l'éditeur Apps Script (Paramètres du projet → Propriétés du script), définir :
- `JWT_SECRET` — secret aléatoire (ex. `openssl rand -hex 32`)
- `PASSWORD_PEPPER` — autre secret aléatoire, distinct de `JWT_SECRET`
- `OPENAI_API_KEY` — clé API OpenAI, utilisée par l'extraction automatique (cf. ARCHITECTURE.md §7)

Activer aussi le service avancé **Drive API** (v2) dans l'éditeur Apps Script (Services → `+` → Drive API) — nécessaire à la conversion Word→PDF pour l'extraction IA ; la déclaration dans `appsscript.json` seule ne suffit pas toujours après un `clasp push`, à vérifier dans l'éditeur si `Drive` n'est pas reconnu.

Exécuter ensuite, une fois, depuis l'éditeur Apps Script :
1. `setupDatabase()` — crée le classeur Google Sheets et tous les onglets/en-têtes, et enregistre `DB_SPREADSHEET_ID`
2. `seedAdminUser()` — crée le premier compte administrateur (`admin` / `ChangeMoi123!`, à changer immédiatement)

Enfin :

```bash
clasp deploy
```

Récupérer l'URL du déploiement Web App (`/exec`) pour `APPS_SCRIPT_URL` côté frontend.

## Démarrage — frontend

```bash
cd web
cp .env.example .env.local   # renseigner APPS_SCRIPT_URL et JWT_SECRET (même valeur que côté Apps Script)
npm install
npm run dev
```

## État d'avancement

Phase 3 — extraction IA automatique (OpenAI, API Responses) à l'upload d'un document, pré-remplissage du formulaire, correction manuelle toujours possible. Voir la roadmap dans [ARCHITECTURE.md](./ARCHITECTURE.md#12-roadmap-de-livraison-proposée).

**Non vérifié en conditions réelles** : cette machine ne dispose pas de Node.js/npm ni d'accès à un compte Google/OpenAI, donc rien n'a pu être exécuté. Le code suit les conventions Next.js 14 (App Router) et Apps Script, et la forme de la requête OpenAI est écrite d'après la documentation connue — à confirmer et corriger si besoin au premier appel réel (cf. [ARCHITECTURE.md §7](./ARCHITECTURE.md#7-pipeline-ia-documentaire)).

**Connu manquant** (voir [ARCHITECTURE.md §8](./ARCHITECTURE.md#8-génération-pdf)) : logo et QR code dans le PDF, photos/annexes incrustées — différés aux phases suivantes.
