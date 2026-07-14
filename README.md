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

## Démarrage — frontend

```bash
cd web
npm install
npm run dev
```

## Démarrage — backend Apps Script

```bash
cd apps-script
clasp login
clasp create --type webapp --title "Soulèvement API"   # génère .clasp.json avec le scriptId
clasp push
clasp deploy
```

Configurer ensuite les clés (`OPENAI_API_KEY`, `JWT_SECRET`) dans les Propriétés du script (Apps Script → Paramètres du projet → Propriétés du script), jamais en dur dans le code.

## État d'avancement

Phase 0 — squelette du repo. Voir la roadmap dans [ARCHITECTURE.md](./ARCHITECTURE.md#12-roadmap-de-livraison-proposée).
