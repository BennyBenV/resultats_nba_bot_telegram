const axios = require('axios');
const dotenv = require('dotenv');
dotenv.config();

const API_KEY = process.env.RAPIDAPI_KEY;
const API_HOST = 'nba-api-free-data.p.rapidapi.com';
const BASE_URL = `https://${API_HOST}`;

const headers = {
    'x-rapidapi-key': API_KEY,
    'x-rapidapi-host': API_HOST
};

function formatDateForApi(dateStr) {
    return dateStr.replace(/-/g, '');
}

async function getGames(date) {
    try {
        const apiDate = formatDateForApi(date);
        console.log(`[DEBUG] Fetching games for ${apiDate}...`);

        const response = await axios.get(`${BASE_URL}/nba-scoreboard-by-date`, {
            headers: headers,
            params: { date: apiDate }
        });

        const events = response.data.response.Events || [];

        const games = events.map(event => {
            try {
                let competition = null;
                const comps = event.competitions;

                if (!comps) {
                    return null;
                }

                // Case A: Array (Standard)
                if (Array.isArray(comps)) {
                    if (comps.length > 0) competition = comps[0];
                }
                // Case B: Object containing competitors (Observed Structure)
                else if (typeof comps === 'object' && comps.competitors) {
                    competition = comps;
                }
                // Case C: Nested Wrapper
                else if (typeof comps === 'object' && comps.competitions) {
                    const inner = comps.competitions;
                    if (Array.isArray(inner) && inner.length > 0) competition = inner[0];
                    else if (typeof inner === 'object' && inner.competitors) competition = inner;
                }

                if (!competition) {
                    return null;
                }

                const competitors = competition.competitors || [];
                if (competitors.length < 2) return null;

                const home = competitors.find(c => c.homeAway === 'home');
                const visitor = competitors.find(c => c.homeAway === 'away');

                if (!home || !visitor) return null;

                // MVP Extraction
                const getLeader = (teamComp, statName) => {
                    if (!teamComp.leaders) return null;
                    const section = teamComp.leaders.find(l => l.name === statName);
                    if (!section || !section.leaders || section.leaders.length === 0) return null;
                    const p = section.leaders[0];
                    return {
                        name: p.athlete.displayName,
                        team: teamComp.team.abbreviation,
                        value: parseFloat(p.value),
                        displayValue: p.displayValue
                    };
                };

                const homePtsLeader = getLeader(home, 'points');
                const visitorPtsLeader = getLeader(visitor, 'points');

                const gameLeaders = [];
                if (homePtsLeader) gameLeaders.push({ ...homePtsLeader, type: 'points' });
                if (visitorPtsLeader) gameLeaders.push({ ...visitorPtsLeader, type: 'points' });

                return {
                    id: event.id,
                    date: event.date,
                    status: event.status.type ? event.status.type.state.toLowerCase() : 'scheduled',
                    teams: {
                        home: {
                            name: home.team.displayName,
                            code: home.team.abbreviation,
                            score: parseInt(home.score) || 0
                        },
                        visitors: {
                            name: visitor.team.displayName,
                            code: visitor.team.abbreviation,
                            score: parseInt(visitor.score) || 0
                        }
                    },
                    period: event.status ? event.status.period : 0,
                    topPerformers: gameLeaders
                };
            } catch (err) {
                console.log(`[DEBUG] Error parsing event ${event.id}: ${err.message}`);
                return null;
            }
        }).filter(g => g !== null);

        return games;

    } catch (error) {
        console.error('Erreur getGames:', error.message);
        return [];
    }
}

async function getStandings(season) {
    try {
        const response = await axios.get(`${BASE_URL}/nba-conference-standings`, {
            headers: headers,
            params: { year: season }
        });

        if (!response.data.response || !response.data.response.standings) return [];

        const rawStandings = response.data.response.standings;

        return rawStandings.map(t => {
            if (!t.team) return null;
            return {
                team: {
                    name: t.team.displayName || t.team.name,
                    code: t.team.abbreviation
                },
                conference: {
                    name: (t.conferenceName || '').toLowerCase(),
                    rank: parseInt(t.divisionRank) || 0
                },
                win: {
                    total: parseInt(t.stats.find(s => s.name === 'wins')?.value) || 0,
                    percentage: t.stats.find(s => s.name === 'winPercent')?.displayValue || '0.000'
                },
                loss: {
                    total: parseInt(t.stats.find(s => s.name === 'losses')?.value) || 0
                }
            };
        }).filter(t => t !== null);

    } catch (error) {
        console.error('Erreur getStandings:', error.message);
        return [];
    }
}

module.exports = {
    getGames,
    getStandings
};
