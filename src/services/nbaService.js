const axios = require('axios');
require('dotenv').config();

const API_KEY = process.env.BALLDONTLIE_API_KEY;
const BASE_URL = 'https://api.balldontlie.io/v1/games';
const STATS_URL = 'https://api.balldontlie.io/v1/stats';

/**
 * Récupère les matchs d'une date donnée
 * @param {string} date - Format YYYY-MM-DD
 * @returns {Promise<Array>} Liste des matchs
 */
async function getGames(date) {
    try {
        const response = await axios.get(BASE_URL, {
            headers: { 'Authorization': `${API_KEY.trim()}` },
            params: { 'dates[]': date, per_page: 100 }
        });
        return response.data.data;
    } catch (error) {
        console.error('Erreur getGames:', error.message);
        throw error;
    }
}

/**
 * Récupère les stats (points) pour une liste de matchs
 * @param {Array<number>} gameIds - Liste des IDs de matchs
 * @returns {Promise<Array>} Liste brute des stats joueurs
 */
async function getStats(gameIds) {
    if (!gameIds || gameIds.length === 0) return [];

    let allStats = [];
    let cursor = null;

    // On boucle pour gérer la pagination si beaucoup de joueurs
    // Note: Balldontlie limite à 60req/min en free, on fera attention
    try {
        do {
            const response = await axios.get(STATS_URL, {
                headers: { 'Authorization': `${API_KEY}` },
                params: {
                    'game_ids[]': gameIds,
                    per_page: 100,
                    cursor: cursor // Utilisation du curseur pour la pagination (v2)
                }
            });

            allStats = [...allStats, ...response.data.data];

            // Check next page
            if (response.data.meta && response.data.meta.next_cursor) {
                cursor = response.data.meta.next_cursor;
            } else {
                cursor = null;
            }

        } while (cursor);

        return allStats;

    } catch (error) {
        console.error('Erreur getStats Warning: Impossible de récupérer les stats joueurs. On continue sans.', error.message);
        return []; // On ne bloque pas le bot si cette partie échoue
    }
}

module.exports = {
    getGames,
    getStats
};
