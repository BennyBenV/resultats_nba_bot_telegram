const axios = require('axios');
require('dotenv').config();

const rawKey = process.env.BALLDONTLIE_API_KEY || '';
// Aggressive sanitize: remove anything that is not a letter, number, or dash
const API_KEY = rawKey.replace(/[^a-zA-Z0-9-]/g, '');

const BASE_URL = 'https://api.balldontlie.io/v1/games';

/**
 * Récupère les matchs d'une date donnée
 * @param {string} date - Format YYYY-MM-DD
 * @returns {Promise<Array>} Liste des matchs
 */
async function getGames(date) {
    try {
        const response = await axios.get(BASE_URL, {
            headers: { 'Authorization': `${API_KEY}` },
            params: { 'dates[]': date, per_page: 100 }
        });
        return response.data.data;
    } catch (error) {
        console.error('Erreur getGames:', error.message);
        throw error;
    }
}

module.exports = {
    getGames
};
