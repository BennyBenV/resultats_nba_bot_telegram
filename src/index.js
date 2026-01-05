const { getYesterdayDate, formatDisplayDate } = require('./utils/dateUtils');
const { getGames, getStats } = require('./services/nbaService');
const { sendDailyDigest } = require('./services/telegramService');
require('dotenv').config();

async function main() {
    try {
        console.log('--- NBA Morning Digest Bot Started ---');

        // 0. Vérification des variables d'environnement
        const requiredVars = ['TELEGRAM_BOT_TOKEN', 'TELEGRAM_CHAT_ID', 'BALLDONTLIE_API_KEY'];
        const missingVars = requiredVars.filter(key => !process.env[key]);

        if (missingVars.length > 0) {
            throw new Error(`Variables d'environnement manquantes : ${missingVars.join(', ')}. Vérifiez vos Secrets GitHub.`);
        }

        // Debug Logs (Masqués)
        console.log('Environment setup:');
        console.log(`- TARGET_CHAT_ID: ${process.env.TELEGRAM_CHAT_ID ? 'Set ✅' : 'Missing ❌'}`);
        console.log(`- API_KEY: ${process.env.BALLDONTLIE_API_KEY ? 'Set (Length: ' + process.env.BALLDONTLIE_API_KEY.length + ') ✅' : 'Missing ❌'}`);

        const gameDate = getYesterdayDate();
        const displayDate = formatDisplayDate(gameDate);
        console.log(`Date cible : ${gameDate}`);

        // 1. Récupérer les matchs
        const games = await getGames(gameDate);
        console.log(`${games.length} matchs trouvés.`);

        if (games.length === 0) {
            await sendDailyDigest(`🏀 *NBA Morning Digest* - ${displayDate}\n\n🛌 *Aucune affiche NBA cette nuit.*`);
            process.exit(0);
        }

        // 2. Récupérer les stats pour trouver le MVP de la nuit
        const gameIds = games.map(g => g.id);
        console.log('Récupération des stats joueurs...');
        const stats = await getStats(gameIds);

        // Trouver le meilleur marqueur
        let topScorer = null;
        if (stats.length > 0) {
            // Trier par points décroissant
            stats.sort((a, b) => (b.pts || 0) - (a.pts || 0));
            const bestStat = stats[0];
            if (bestStat && bestStat.pts > 0) {
                topScorer = {
                    name: `${bestStat.player.first_name} ${bestStat.player.last_name}`,
                    team: bestStat.team.abbreviation,
                    pts: bestStat.pts,
                    reb: bestStat.reb,
                    ast: bestStat.ast
                };
            }
        }

        // 3. Construire le message
        let message = `🏀 *NBA Morning Digest* - ${displayDate}\n\n`;

        // Section : Matchs
        games.forEach(game => {
            const hScore = game.home_team_score;
            const vScore = game.visitor_team_score;
            const hTeam = game.home_team.abbreviation; // Ex: BOS
            const vTeam = game.visitor_team.abbreviation; // Ex: LAL

            const homeWon = hScore > vScore;
            const diff = Math.abs(hScore - vScore);
            const isClose = diff <= 5;
            const isOT = game.period > 4;

            // Format: 🟢 *WINNER* Score - Score LOSER
            // Ex: 🟢 *BOS* 115 - 105 LAL
            let line = "";

            if (homeWon) {
                line = `▪️ *${hTeam}* ${hScore} - ${vScore} ${vTeam}`;
            } else {
                line = `▪️ *${vTeam}* ${vScore} - ${hScore} ${hTeam}`;
            }

            if (isClose) line += " 🔥"; // Match serré
            if (isOT) line += " (OT)";

            message += `${line}\n`;
        });

        // Section : MVP
        if (topScorer) {
            message += `\n👑 *MVP de la nuit* :\n`;
            message += `${topScorer.name} (${topScorer.team}) : *${topScorer.pts} pts* / ${topScorer.reb} reb / ${topScorer.ast} ast`;
        }

        message += `\n\nBonne journée !`;

        if (process.env.NODE_ENV !== 'test') {
            await sendDailyDigest(message);
        } else {
            console.log(message);
        }

        console.log('--- Terminé ---');
        process.exit(0);

    } catch (error) {
        console.error('ERREUR :', error);
        process.exit(1);
    }
}

main();
