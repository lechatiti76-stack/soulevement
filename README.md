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
- `OPENAI_API_KEY` — pas encore utilisé avant la Phase 3

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

Phase 1 — authentification (login/JWT/rôles), shell protégé par middleware, sidebar filtrée par rôle. Voir la roadmap dans [ARCHITECTURE.md](./ARCHITECTURE.md#12-roadmap-de-livraison-proposée).

**Non vérifié en conditions réelles** : cette machine ne dispose pas de Node.js/npm, donc `npm install`/`npm run dev` n'ont pas pu être exécutés, et aucun classeur Apps Script réel n'a encore été déployé. Le code suit les conventions Next.js 14 (App Router) et Apps Script mais n'a pas tourné.
