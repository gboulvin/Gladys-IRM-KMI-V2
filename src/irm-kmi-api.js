// -----------------------------------------------------------------------------
// Client HTTP de l'API mobile IRM/KMI.
//
// Le protocole est non documenté : l'application demande `getForecasts` avec
// une clé MD5 renouvelée chaque jour. Cette implémentation s'inspire du client
// open source irm-kmi-api sans importer ni exécuter de code Python tiers.
// -----------------------------------------------------------------------------

import { createHash } from 'node:crypto';

const API_URL = 'https://app.meteo.be/services/appv4/';
const DEFAULT_TIMEOUT_MS = 20_000;
const COORDINATE_DECIMALS = 6;
const USER_AGENT = 'gladys-meteo-benelux (+https://github.com/gboulvin/Gladys-IRM-KMI-V2)';

/**
 * @description Formate une date dans le fuseau de Bruxelles pour la signature.
 * @param {Date} [date] - Date à utiliser, utile aux tests.
 * @returns {string} Une date sous la forme DD/MM/YYYY.
 */
function formatBrusselsDate(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Brussels',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).formatToParts(date);
  const read = (type) => parts.find((part) => part.type === type)?.value;
  return `${read('day')}/${read('month')}/${read('year')}`;
}

/**
 * @description Calcule la clé éphémère attendue par l’API IRM/KMI.
 * @param {string} method - Nom du service demandé.
 * @param {Date} [date] - Date de signature, utile aux tests.
 * @returns {string} Empreinte MD5 hexadécimale.
 */
function buildApiKey(method, date = new Date()) {
  return createHash('md5')
    .update(`r9EnW374jkJ9acc;${method};${formatBrusselsDate(date)}`)
    .digest('hex');
}

/**
 * @description Valide puis normalise une coordonnée géographique.
 * @param {unknown} value - Valeur à traiter.
 * @param {number} minimum - Borne minimale admise.
 * @param {number} maximum - Borne maximale admise.
 * @param {string} label - Libellé exploitable dans le message d’erreur.
 * @returns {number} Coordonnée arrondie à six décimales.
 */
function normalizeCoordinate(value, minimum, maximum, label) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < minimum || number > maximum) {
    throw new Error(`${label} must be a number between ${minimum} and ${maximum}`);
  }
  return Number(number.toFixed(COORDINATE_DECIMALS));
}

/**
 * @description Télécharge les prévisions IRM/KMI pour des coordonnées données.
 * @param {number} latitude - Latitude WGS84.
 * @param {number} longitude - Longitude WGS84.
 * @param {object} [options] - Options de requête.
 * @param {Function} [options.fetchImpl] - Implémentation fetch injectable pour les tests.
 * @param {number} [options.timeoutMs] - Délai maximal de la requête.
 * @param {Date} [options.now] - Horloge injectable pour la signature.
 * @returns {Promise<object>} Charge utile JSON du fournisseur.
 */
async function getForecast(
  latitude,
  longitude,
  { fetchImpl = fetch, timeoutMs = DEFAULT_TIMEOUT_MS, now = new Date() } = {},
) {
  const lat = normalizeCoordinate(latitude, -90, 90, 'Latitude');
  const long = normalizeCoordinate(longitude, -180, 180, 'Longitude');
  const url = new URL(API_URL);
  url.search = new URLSearchParams({
    s: 'getForecasts',
    k: buildApiKey('getForecasts', now),
    lat: String(lat),
    long: String(long),
  }).toString();

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(url, {
      method: 'GET',
      headers: { 'user-agent': USER_AGENT, accept: 'application/json' },
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`IRM/KMI returned HTTP ${response.status}`);
    }
    const data = await response.json();
    if (!data || typeof data !== 'object') {
      throw new Error('IRM/KMI returned an invalid JSON payload');
    }
    return data;
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new Error('IRM/KMI forecast request timed out', { cause: error });
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export {
  API_URL,
  COORDINATE_DECIMALS,
  DEFAULT_TIMEOUT_MS,
  USER_AGENT,
  buildApiKey,
  formatBrusselsDate,
  getForecast,
  normalizeCoordinate,
};
