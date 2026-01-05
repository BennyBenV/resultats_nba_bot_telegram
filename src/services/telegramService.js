const { Telegraf } = require('telegraf');
require('dotenv').config();

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

/**
 * Envoie un message au canal/chat configuré
 * @param {string} message - Le texte à envoyer
 */
async function sendDailyDigest(message) {
    try {
        await bot.telegram.sendMessage(CHAT_ID, message, { parse_mode: 'Markdown' });
        console.log('Message envoyé avec succès !');
    } catch (error) {
        console.error('Erreur lors de l\'envoi du message Telegram:', error.message);
        throw error;
    }
}

module.exports = {
    sendDailyDigest
};
