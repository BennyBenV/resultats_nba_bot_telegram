const { getYesterdayDate, formatDisplayDate } = require('./utils/dateUtils');
const { getGames, getStandings } = require('./services/nbaService');
// removed getStatsForGame as MVP is temporarily disabled/empty
const { sendDailyDigest } = require('./services/telegramService');
require('dotenv').config();

async function main() {
    try {
        console.log('--- NBA Morning Digest Bot Started ---');

        const requiredVars = ['TELEGRAM_BOT_TOKEN', 'TELEGRAM_CHAT_ID', 'RAPIDAPI_KEY'];
        const missingVars = requiredVars.filter(key => !process.env[key]);

        if (missingVars.length > 0) {
            throw new Error(`Variables manquantes : ${missingVars.join(', ')}.`);
        }

        const gameDate = getYesterdayDate();
        const displayDate = formatDisplayDate(gameDate);
        console.log(`Date cible : ${gameDate}`);

        // 1. MATCHS
        const games = await getGames(gameDate);
        console.log(`${games.length} matchs trouvés.`);

        if (games.length === 0) {
            await sendDailyDigest(`🏀 *NBA Morning Digest* - ${displayDate}\n\n🛌 *Aucune affiche NBA cette nuit.*`);
        } else {
            let message = `🏀 *NBA Morning Digest* - ${displayDate}\n\n`;
            let topPerformers = [];

            for (const game of games) {
                // Compatible with new nbaService structure
                const vTeam = game.teams.visitors;
                const hTeam = game.teams.home;

                // Check if game is finished/started
                // If scheduled/pre, scores might be 0.
                if (game.status === 'pre') continue;

                const vScore = vTeam.score;
                const hScore = hTeam.score;
                const homeWon = hScore > vScore;

                // Format: HOME Score - Score VISITOR
                const hString = homeWon ? `*${hTeam.name}* ${hScore}` : `${hTeam.name} ${hScore}`;
                const vString = homeWon ? `${vScore} ${vTeam.name}` : `${vScore} *${vTeam.name}*`;

                let line = `▪️ ${hString} - ${vString}`;

                if (Math.abs(hScore - vScore) <= 5 && game.status === 'post') line += " 🔥";

                message += `${line}\n`;

                // Collect MVP candidates from this game
                if (game.topPerformers && game.topPerformers.length > 0) {
                    game.topPerformers.forEach(p => {
                        topPerformers.push({
                            name: p.name,
                            team: p.team,
                            pts: p.value
                            // We don't have Reb/Ast linked to this player reliably unless they led those cats too.
                            // Simplified MVP: Just Points.
                        });
                    });
                }
            }

            // Global MVP - Best Scorer
            topPerformers.sort((a, b) => b.pts - a.pts);
            if (topPerformers.length > 0) {
                const mvp = topPerformers[0];
                message += `\n👑 *MVP de la nuit* :\n${mvp.name} (${mvp.team}) : *${mvp.pts} pts*`;
            }

            message += `\n\nBonne journée !`;

            if (process.env.NODE_ENV !== 'test') {
                await sendDailyDigest(message);
            } else {
                console.log(message);
            }
        }

        // 2. CLASSEMENTS
        console.log('Récupération classements...');
        const currentYear = new Date().getFullYear();
        const currentMonth = new Date().getMonth();
        // API expects season ending year (e.g. 2026 for 2025-2026)
        const season = currentMonth >= 9 ? currentYear + 1 : currentYear;

        // Note: New API might behave differently for season year.
        const standings = await getStandings(season);

        if (standings.length > 0) {
            // Need to check filtering logic based on new API structure
            // Assuming mapped object has conference.name string
            const west = standings.filter(t => t.conference.name.includes('west')).sort((a, b) => a.conference.rank - b.conference.rank); // Sort by? Api might not return rank.
            const east = standings.filter(t => t.conference.name.includes('east')).sort((a, b) => a.conference.rank - b.conference.rank);

            let standingsMsg = `📈 **CLASSEMENTS NBA**\n\n`;
            standingsMsg += `🤠 *CONFÉRENCE OUEST*\n`;
            // Limiter top 8 ou afficher tout (1-15)
            west.forEach((t, index) => {
                // Fallback if rank is missing
                const rank = t.conference.rank || index + 1;
                standingsMsg += `${rank}. ${t.team.code} (${t.win.total}-${t.loss.total}) - ${t.win.percentage}\n`;
            });

            standingsMsg += `\n🗽 *CONFÉRENCE EST*\n`;
            east.forEach((t, index) => {
                const rank = t.conference.rank || index + 1;
                standingsMsg += `${rank}. ${t.team.code} (${t.win.total}-${t.loss.total}) - ${t.win.percentage}\n`;
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
