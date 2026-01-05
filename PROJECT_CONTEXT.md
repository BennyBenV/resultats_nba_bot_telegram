# PROJECT_CONTEXT.md - NBA Morning Digest Bot

## 1. Vue d'ensemble

*   **Nom du Projet** : `NBA-Morning-Digest-Bot`
*   **Objectif** : Fournir un résumé automatisé des matchs NBA de la nuit précédente via un bot Telegram. Le service doit être fiable, autonome et s'exécuter chaque matin à 08h00 (heure de Paris).
*   **Contrainte Principale** : **Coût 0€**. L'architecture repose entièrement sur les quotas gratuits (GitHub Actions, API Publique).

---

## 2. Stack Technique

### Runtime & Langage
*   **Node.js** : Version 20+ (LTS).
*   **Type de projet** : Script Node.js simple (pas de serveur Express/Koa longue durée).

### Dépendances Clés
*   **`telegraf`** : Framework moderne pour interagir avec l'API Bot Telegram.
*   **`axios`** : Client HTTP pour les appels à l'API de données sportives.
*   **`date-fns`** : Manipulation robuste des dates et des fuseaux horaires (critique pour la gestion "J-1").
*   **`dotenv`** : Gestion des variables d'environnement en local.

### Infrastructure
*   **Hébergement** : Aucun serveur dédié.
*   **Exécution** : **GitHub Actions** (Workflow Cron). Le runner Ubuntu de GitHub installe l'environnement, exécute le script, envoie le message, et s'éteint.

---

## 3. Architecture de Déploiement (GitHub Actions)

Le cœur du système est le workflow GitHub Actions. Il remplace le besoin d'un VPS ou d'un Heroku Dyno.

*   **Trigger** : `cron` schedule.
*   **Fréquence** : `0 7 * * *` (07:00 UTC).
    *   *Note* : 07:00 UTC correspond à 08:00 CET (Hiver) et 09:00 CEST (Été). Cela garantit que tous les matchs de la nuit US (West Coast inclus) sont terminés.
*   **Sécurité** :
    *   `TELEGRAM_BOT_TOKEN` : Stocké dans les Secrets du repo.
    *   `TELEGRAM_CHAT_ID` : ID du canal ou de l'utilisateur destinataire, stocké dans les Secrets.
    *   `BALLDONTLIE_API_KEY` : Clé API pour balldontlie.io (si requise par la version v2, sinon accès public v1). *Note: L'API est passée en v2 nécessitant une clé gratuite.*

---

## 4. Logique Métier & Données

### Source de Données : Balldontlie API
Nous utiliserons l'API Balldontlie (v2 recommandée).
*   Endpoint principal : `/v1/games` (avec filtres de dates).

### Algorithme Temporel
Le défi principal est le décalage horaire.
1.  **Date d'exécution (Europe)** : Jour J (ex: 15 Janvier à 08h00).
2.  **Date des matchs (US)** : Jour J-1 (ex: 14 Janvier).
3.  **Logique** :
    *   Le script calcule `Yesterday = CurrentDate - 1 Day`.
    *   Il formate cette date en `YYYY-MM-DD`.
    *   Il appelle l'API pour récupérer les matchs de cette date spécifique.

### Contenu du Message
Le message doit être lisible et concis (Emoji friendly 🏀).

**Structure du message :**
1.  **Header** : `🏀 NBA Morning Digest - [Date]`
2.  **Liste des matchs** :
    *   Format : `WINNER_TEAM (Score) - LOSER_TEAM (Score)`
    *   Exemple : `🟢 BOS (112) - 🔴 MIA (98)`
3.  **Highlight (Optionnel)** : "Top Scorer de la nuit" (Nécessite de parcourir les stats des joueurs, ce qui peut multiplier les appels API. À implémenter si les quotas le permettent).
4.  **Footer** : `Bonne journée !`

### Gestion des Cas Limites
*   **Aucun match** : Si l'API retourne une liste vide (ex: All-Star Break, Offseason), envoyer un message spécifique : "🛌 Aucune affiche NBA cette nuit."
*   **API Down** : Catch l'erreur, logger dans la console GitHub Actions pour debug, et (optionnel) envoyer un message d'erreur "Service indisponible" sur Telegram pour prévenir l'admin.

---

## 5. Développement & Tests (DX)

### Scripts NPM
*   `npm run start` : Lancement standard (utilisé par GitHub Actions).
*   `npm run start:dev` : Lancement local avec chargement des variables `.env`.

### Gestion des Erreurs
Le script ne doit jamais faire "panic" silencieusement.
*   `try/catch` global autour de la fonction principale.
*   `process.exit(1)` en cas d'erreur fatale pour que GitHub Actions marque le job comme "Failed".

---

## 6. Livrables Techniques

### A. Arborescence des Fichiers

```text
nba-morning-digest/
├── .github/
│   └── workflows/
│       └── nba_bot.yml      # Configuration du Cron Job
├── src/
│   ├── index.js             # Point d'entrée principal
│   ├── services/
│   │   ├── nbaService.js    # Logique appel API Balldontlie
│   │   └── telegramService.js # Logique envoi message
│   └── utils/
│       └── dateUtils.js     # Helpers pour les dates
├── .env.example             # Template des variables d'env
├── .gitignore
├── package.json
└── README.md
```

### B. Configuration GitHub Actions (`.github/workflows/nba_bot.yml`)

```yaml
name: NBA Morning Digest

on:
  schedule:
    # 07:00 UTC daily (08:00 or 09:00 Paris time)
    - cron: '0 7 * * *'
  workflow_dispatch: # Permet de lancer manuellement depuis l'interface GitHub pour tester

jobs:
  run-bot:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run NBA Bot
        run: npm start
        env:
          # Les secrets doivent être configurés dans Settings > Secrets and variables > Actions
          TELEGRAM_BOT_TOKEN: ${{ secrets.TELEGRAM_BOT_TOKEN }}
          TELEGRAM_CHAT_ID: ${{ secrets.TELEGRAM_CHAT_ID }}
          BALLDONTLIE_API_KEY: ${{ secrets.BALLDONTLIE_API_KEY }}
```

### C. Guide de Configuration des Secrets

Dans votre repository GitHub, allez dans :
1.  **Settings** (Onglet du haut)
2.  **Secrets and variables** (Menu latéral gauche) -> **Actions**
3.  Cliquer sur **New repository secret** pour chaque variable :

| Nom du Secret | Valeur Exemple | Description |
| :--- | :--- | :--- |
| `TELEGRAM_BOT_TOKEN` | `123456789:ABCdefGHIjklMNOpqrsTUVwxyz` | Token donné par @BotFather |
| `TELEGRAM_CHAT_ID` | `987654321` | Votre ID utilisateur (récupérable via @userinfobot) |
| `BALLDONTLIE_API_KEY` | `v1_public_key_...` | Clé API gratuite balldontlie (si v2) |

### D. Exemple de Réponse API (Balldontlie Games)

*Endpoint : `GET https://api.balldontlie.io/v1/games?dates[]=2023-10-24`*

```json
{
  "data": [
    {
      "id": 1,
      "date": "2023-10-24",
      "season": 2023,
      "status": "Final",
      "period": 4,
      "time": "Final",
      "postseason": false,
      "home_team_score": 119,
      "visitor_team_score": 107,
      "home_team": {
        "id": 8,
        "abbreviation": "DEN",
        "city": "Denver",
        "conference": "West",
        "division": "Northwest",
        "full_name": "Denver Nuggets",
        "name": "Nuggets"
      },
      "visitor_team": {
        "id": 14,
        "abbreviation": "LAL",
        "city": "Los Angeles",
        "conference": "West",
        "division": "Pacific",
        "full_name": "Los Angeles Lakers",
        "name": "Lakers"
      }
    }
  ],
  "meta": {
    "total_pages": 1,
    "current_page": 1,
    "next_page": null,
    "per_page": 25,
    "total_count": 1
  }
}
```
