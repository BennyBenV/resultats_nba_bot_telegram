const { subDays, format } = require('date-fns');

/**
 * Retourne la date de la "nuit dernière" (J-1) au format YYYY-MM-DD
 * @returns {string} Date formatted as YYYY-MM-DD
 */
function getYesterdayDate() {
  const today = new Date();
  const yesterday = subDays(today, 1);
  return format(yesterday, 'yyyy-MM-dd');
}

/**
 * Formate une date ISO pour l'affichage (ex: 2023-10-24 -> 24 Octobre 2023)
 * @param {string} dateString 
 * @returns {string}
 */
function formatDisplayDate(dateString) {
    const date = new Date(dateString);
    return format(date, 'dd/MM/yyyy');
}

module.exports = {
  getYesterdayDate,
  formatDisplayDate
};
