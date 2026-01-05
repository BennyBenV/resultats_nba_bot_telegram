const { getYesterdayDate, formatDisplayDate } = require('./utils/dateUtils');
const { getGames } = require('./services/nbaService');
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

        const gameDate = getYesterdayDate();
        const displayDate = formatDisplayDate(gameDate);
        console.log(`Date cible : ${gameDate}`);

        // 1. Récupérer les matchs
        const games = await getGames(gameDate);
        console.log(`${games.length} matchs trouvés.`);

        if (games.length === 0) {
            await sendDailyDigest(`🏀 *NBA Morning Digest* - ${displayDate}\n\n🛌 *Aucune affiche NBA cette nuit.*`);
        } else {
            // Message Matchs
            let message = `🏀 *NBA Morning Digest* - ${displayDate}\n\n`;
            games.forEach(game => {
                const hScore = game.home_team_score;
                const vScore = game.visitor_team_score;
                const hTeam = game.home_team.full_name;
                const vTeam = game.visitor_team.full_name;
                const homeWon = hScore > vScore;

                // American Format: Visitor @ Home
                // Mark winner in bold
                const vString = homeWon ? `${vTeam} (${vScore})` : `*${vTeam} (${vScore})*`;
                const hString = homeWon ? `*${hTeam} (${hScore})*` : `${hTeam} (${hScore})`;

                let line = `▪️ ${vString} @ ${hString}`;

                if (Math.abs(hScore - vScore) <= 5) line += " 🔥";
                if (game.period > 4) line += " (OT)";
                message += `${line}\n`;
            });

            message += `\n\nBonne journée !`;

            if (process.env.NODE_ENV !== 'test') {
                await sendDailyDigest(message);
            } else {
                console.log(message);
            }
        }

        console.log('--- Terminé ---');
        process.exit(0);

    } catch (error) {
        console.error('ERREUR FATALE :', error);
        process.exit(1);
    }
}

main();
