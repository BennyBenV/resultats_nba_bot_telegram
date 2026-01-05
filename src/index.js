const { getYesterdayDate, formatDisplayDate } = require('./utils/dateUtils');
const { getGames, getStats, getStandings } = require('./services/nbaService');
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

        // --- PARTIE 1 : MATCHS & MVP ---
        const games = await getGames(gameDate);
        console.log(`${games.length} matchs trouvés.`);

        if (games.length === 0) {
            await sendDailyDigest(`🏀 *NBA Morning Digest* - ${displayDate}\n\n🛌 *Aucune affiche NBA cette nuit.*`);
        } else {
            // Stats MVP
            const gameIds = games.map(g => g.id);
            const stats = await getStats(gameIds);

            let topScorer = null;
            if (stats.length > 0) {
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

            // Message Matchs
            let message = `🏀 *NBA Morning Digest* - ${displayDate}\n\n`;
            games.forEach(game => {
                const hScore = game.home_team_score;
                const vScore = game.visitor_team_score;
                const hTeam = game.home_team.abbreviation;
                const vTeam = game.visitor_team.abbreviation;
                const homeWon = hScore > vScore;

                let line = homeWon
                    ? `▪️ *${hTeam}* ${hScore} - ${vScore} ${vTeam}`
                    : `▪️ *${vTeam}* ${vScore} - ${hScore} ${hTeam}`;

                if (Math.abs(hScore - vScore) <= 5) line += " 🔥";
                if (game.period > 4) line += " (OT)";
                message += `${line}\n`;
            });

            if (topScorer) {
                message += `\n👑 *MVP de la nuit* :\n${topScorer.name} (${topScorer.team}) : *${topScorer.pts} pts* / ${topScorer.reb} reb / ${topScorer.ast} ast`;
            }

            message += `\n\nBonne journée !`;

            if (process.env.NODE_ENV !== 'test') {
                await sendDailyDigest(message);
            } else {
                console.log(message);
            }
        }

        // --- PARTIE 2 : CLASSEMENTS (STANDINGS) ---
        console.log('Récupération et envoi des classements...');

        // Calculer la saison en cours (ex: Janvier 2026 -> Saison 2025)
        const currentYear = new Date().getFullYear();
        const currentMonth = new Date().getMonth(); // 0-11
        // Si on est en Octobre (9) ou après, c'est la saison de l'année en cours. Sinon c'est l'année d'avant.
        const season = currentMonth >= 9 ? currentYear : currentYear - 1;

        const standings = await getStandings(season);

        if (standings.length > 0) {
            // Trier les équipes par conférence et rang
            const west = standings.filter(t => t.conference === 'West').sort((a, b) => a.conference_rank - b.conference_rank);
            const east = standings.filter(t => t.conference === 'East').sort((a, b) => a.conference_rank - b.conference_rank);

            let standingsMsg = `📈 **CLASSEMENTS NBA** (Saison ${season}-${season + 1})\n\n`;

            standingsMsg += `🤠 *CONFÉRENCE OUEST*\n`;
            west.forEach(t => {
                standingsMsg += `${t.conference_rank}. ${t.team.abbreviation} (${t.wins}-${t.losses})\n`;
            });

            standingsMsg += `\n🗽 *CONFÉRENCE EST*\n`;
            east.forEach(t => {
                standingsMsg += `${t.conference_rank}. ${t.team.abbreviation} (${t.wins}-${t.losses})\n`;
            });

            if (process.env.NODE_ENV !== 'test') {
                await sendDailyDigest(standingsMsg);
            } else {
                console.log(standingsMsg);
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
