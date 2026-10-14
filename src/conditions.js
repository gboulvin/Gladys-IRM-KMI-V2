// -----------------------------------------------------------------------------
// Codes de condition IRM/KMI -> conditions météo pivot Gladys.
//
// L'IRM/KMI expose le phénomène dans `ww` et la période dans `dayNight` (`d`
// ou `n`). Le pivot conserve le phénomène et transporte jour/nuit via `is_day`;
// une nuit pluvieuse reste donc `rain` au lieu de devenir une condition générique
// de nuit (`night` est dépréciée pour les fournisseurs).
//
// Les codes IRM/KMI ne distinguent pas les extensions du pivot (pluie
// verglaçante, orage de neige…) : la condition plus large reste valide.
// -----------------------------------------------------------------------------

import { WEATHER_CONDITIONS } from '@gladysassistant/integration-sdk';

const { CLEAR, PARTLY_CLOUDY, CLOUD, FOG, RAIN, POURING, SLEET, SNOW, THUNDERSTORM, UNKNOWN } =
  WEATHER_CONDITIONS;

const CONDITION_BY_CODE = {
  0: CLEAR,
  1: CLEAR,
  2: THUNDERSTORM,
  3: PARTLY_CLOUDY,
  4: POURING,
  5: THUNDERSTORM,
  6: POURING,
  7: THUNDERSTORM,
  8: SLEET,
  9: SLEET,
  10: THUNDERSTORM,
  11: SNOW,
  12: SNOW,
  13: THUNDERSTORM,
  14: CLOUD,
  15: CLOUD,
  16: POURING,
  17: THUNDERSTORM,
  18: RAIN,
  19: POURING,
  20: SLEET,
  21: RAIN,
  22: SNOW,
  23: SNOW,
  24: FOG,
  25: FOG,
  26: FOG,
  27: FOG,
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
    : UNKNOWN;
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
