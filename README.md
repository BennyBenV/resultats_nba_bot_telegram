# NBA Morning Digest Bot

Ce projet est un bot Telegram autonome qui envoie chaque matin le résumé des matchs NBA de la nuit précédente.

## Configuration

1.  Cloner le repo.
2.  `npm install`
3.  Copier `.env.example` vers `.env` et remplir les variables.
4.  `npm run start:dev` pour tester en local.

## Déploiement

Le projet utilise GitHub Actions pour s'exécuter tous les matins à 7h00 UTC.
Configurer les secrets dans le repo GitHub :
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_CHAT_ID`
- `BALLDONTLIE_API_KEY`
