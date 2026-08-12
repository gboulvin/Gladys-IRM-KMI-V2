// -----------------------------------------------------------------------------
// Codes de condition IRM/KMI -> conditions météo pivot Gladys.
//
// L'IRM/KMI expose le phénomène dans `ww` et la période dans `dayNight` (`d`
// ou `n`). Le pivot conserve le phénomène et transporte jour/nuit via `is_day`;
// une nuit pluvieuse reste donc `rain` au lieu de devenir une condition générique
// de nuit.
// -----------------------------------------------------------------------------

const CONDITION_BY_CODE = {
  0: 'clear',
  1: 'clear',
  2: 'thunderstorm',
  3: 'partly-cloudy',
  4: 'pouring',
  5: 'thunderstorm',
  6: 'pouring',
  7: 'thunderstorm',
  8: 'sleet',
  9: 'sleet',
  10: 'thunderstorm',
  11: 'snow',
  12: 'snow',
  13: 'thunderstorm',
  14: 'cloud',
  15: 'cloud',
  16: 'pouring',
  17: 'thunderstorm',
  18: 'rain',
  19: 'pouring',
  20: 'sleet',
  21: 'rain',
  22: 'snow',
  23: 'snow',
  24: 'fog',
  25: 'fog',
  26: 'fog',
  27: 'fog',
};

/**
 * @description Convertit une icône IRM/KMI en condition pivot Gladys.
 * @param {unknown} code - Le code `ww` reçu du fournisseur.
 * @returns {string} Une condition pivot, ou `unknown` si le code est absent.
 */
function conditionFromCode(code) {
  const number = Number(code);
  return Number.isInteger(number) && CONDITION_BY_CODE[number] !== undefined
    ? CONDITION_BY_CODE[number]
    : 'unknown';
}

/**
 * @description Convertit le marqueur de période IRM/KMI en booléen `is_day`.
 * @param {unknown} dayNight - Valeur `d` ou `n` reçue du fournisseur.
 * @returns {boolean|null} `true` de jour, `false` de nuit, sinon `null`.
 */
function isDaytime(dayNight) {
  if (dayNight === 'd') {
    return true;
  }
  if (dayNight === 'n') {
    return false;
  }
  return null;
}

export { CONDITION_BY_CODE, conditionFromCode, isDaytime };
