// -----------------------------------------------------------------------------
// Réponse IRM/KMI -> format météo pivot Gladys.
//
// L'IRM/KMI fournit les valeurs métriques : °C, km/h, mm et hPa. Le fournisseur
// météo Gladys doit, lui, répondre dans le système d'unités demandé.
// -----------------------------------------------------------------------------

import { buildAlerts } from './alerts.js';
import { conditionFromCode, isDaytime } from './conditions.js';

const MAX_DAYS = 8;
const MAX_HOURS = 24;
const BRUSSELS_TIME_ZONE = 'Europe/Brussels';
const WEEKDAY_INDEX = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

/**
 * @description Vérifie qu’une valeur peut représenter un nombre fini.
 * @param {unknown} value - Valeur brute de l’API.
 * @returns {boolean} Vrai si la valeur est un nombre fini.
 */
function isNumber(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

/**
 * @description Convertit un nombre encodé en chaîne par l’API en nombre fini.
 * @param {unknown} value - Valeur brute.
 * @returns {number|null} Nombre ou `null` si indisponible.
 */
function toNumber(value) {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

/**
 * @description Convertit une température Celsius selon les unités demandées.
 * @param {number} celsius - Température en degrés Celsius.
 * @param {string} units - `metric` ou `us`.
 * @returns {number} Température convertie.
 */
function convertTemperature(celsius, units) {
  return units === 'us' ? Math.round((celsius * (9 / 5) + 32) * 10) / 10 : celsius;
}

/**
 * @description Convertit une vitesse de km/h vers mph si nécessaire.
 * @param {number} kilometersPerHour - Vitesse en km/h.
 * @param {string} units - `metric` ou `us`.
 * @returns {number} Vitesse convertie.
 */
function convertWindSpeed(kilometersPerHour, units) {
  return units === 'us' ? Math.round(kilometersPerHour * 0.621371 * 10) / 10 : kilometersPerHour;
}

/**
 * @description Convertit un cumul de précipitations mm vers pouces si nécessaire.
 * @param {number} millimeters - Cumul en millimètres.
 * @param {string} units - `metric` ou `us`.
 * @returns {number} Précipitation convertie.
 */
function convertPrecipitation(millimeters, units) {
  return units === 'us' ? Math.round((millimeters / 25.4) * 100) / 100 : millimeters;
}

/**
 * @description Produit une clé YYYY-MM-DD dans le fuseau de Bruxelles.
 * @param {Date} date - Date à convertir.
 * @returns {string} Clé de jour locale.
 */
function dayKey(date) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: BRUSSELS_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

/**
 * @description Ajoute des jours à une clé YYYY-MM-DD sans subir le fuseau local.
 * @param {string} key - Jour de départ.
 * @param {number} days - Nombre de jours à ajouter.
 * @returns {string} Jour calculé.
 */
function addDays(key, days) {
  const date = new Date(`${key}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/**
 * @description Calcule le décalage UTC en millisecondes dans un fuseau donné.
 * @param {Date} date - Instant de référence.
 * @param {string} timeZone - Fuseau IANA.
 * @returns {number} Décalage UTC.
 */
function timeZoneOffset(date, timeZone) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const read = (type) => Number(parts.find((part) => part.type === type)?.value);
  return (
    Date.UTC(
      read('year'),
      read('month') - 1,
      read('day'),
      read('hour'),
      read('minute'),
      read('second'),
    ) - date.getTime()
  );
}

/**
 * @description Transforme une heure locale d’un jour bruxellois en ISO UTC.
 * @param {string} key - Jour YYYY-MM-DD.
 * @param {number} seconds - Secondes écoulées depuis minuit local.
 * @returns {string} Date ISO 8601 UTC.
 */
function localDaySecondsToIso(key, seconds) {
  const noonUtc = new Date(`${key}T12:00:00.000Z`);
  const offset = timeZoneOffset(noonUtc, BRUSSELS_TIME_ZONE);
  const date = new Date(new Date(`${key}T00:00:00.000Z`).getTime() - offset + seconds * 1000);
  return date.toISOString();
}

/**
 * @description Détermine le jour d’une prévision quotidienne IRM/KMI.
 * @param {object} entry - Entrée quotidienne du fournisseur.
 * @param {string} cursor - Jour précédent dans la séquence.
 * @param {Date} now - Horloge de référence.
 * @returns {string} Jour local associé à l’entrée.
 */
function resolveDailyDay(entry, cursor, now) {
  const timestamp = typeof entry?.timestamp === 'string' ? new Date(entry.timestamp) : null;
  if (timestamp !== null && !Number.isNaN(timestamp.getTime())) {
    return dayKey(timestamp);
  }
  const name = typeof entry?.dayName?.en === 'string' ? entry.dayName.en.toLowerCase() : '';
  const today = dayKey(now);
  if (name === 'today' || name === 'tonight') {
    return today;
  }
  if (name === 'tomorrow') {
    return addDays(today, 1);
  }
  const target = WEEKDAY_INDEX[name];
  if (target === undefined) {
    return cursor;
  }
  const weekday = new Date(`${cursor}T12:00:00.000Z`).getUTCDay();
  return addDays(cursor, (target - weekday + 7) % 7);
}

/**
 * @description Ajoute les champs optionnels de vent, pression et précipitations.
 * @param {object} target - Objet pivot à compléter.
 * @param {object} entry - Entrée IRM/KMI source.
 * @param {string} units - Système d’unités demandé.
 * @returns {void}
 */
function appendHourlyDetails(target, entry, units) {
  const precipitation = toNumber(entry?.precipQuantity);
  if (precipitation !== null) {
    target.precipitation = convertPrecipitation(precipitation, units);
  }
  const probability = toNumber(entry?.precipChance);
  if (probability !== null) {
    target.precipitation_probability = Math.max(0, Math.min(100, probability));
  }
  const pressure = toNumber(entry?.pressure);
  if (pressure !== null) {
    target.pressure = pressure;
  }
  const speed = toNumber(entry?.windSpeedKm);
  if (speed !== null) {
    target.wind_speed = convertWindSpeed(speed, units);
  }
  const gust = toNumber(entry?.windPeakSpeedKm);
  if (gust !== null && gust > 0) {
    target.wind_gust = convertWindSpeed(gust, units);
  }
  const variable = entry?.windDirectionText?.en === 'VAR';
  const direction = toNumber(entry?.windDirection);
  if (!variable && direction !== null) {
    target.wind_direction = (direction + 180) % 360;
  }
}

/**
 * @description Transforme les prévisions horaires du fournisseur.
 * @param {unknown} rawHourly - Tableau `for.hourly` de l’IRM/KMI.
 * @param {object} options - Options de conversion.
 * @param {string} options.units - Système d’unités Gladys.
 * @param {Date} options.now - Horloge de référence.
 * @returns {Array<object>} Prévisions horaires pivot, limitées à vingt-quatre.
 */
function buildHours(rawHourly, { units, now }) {
  if (!Array.isArray(rawHourly)) {
    return [];
  }
  let cursor = dayKey(now);
  const earliest = now.getTime() - 60 * 60 * 1000;

  return rawHourly
    .map((entry, index) => {
      const hour = toNumber(entry?.hour);
      if (hour === null || hour < 0 || hour > 23) {
        return null;
      }
      if (index > 0 && entry?.dateShow) {
        cursor = addDays(cursor, 1);
      }
      const datetime = localDaySecondsToIso(cursor, hour * 3600);
      const temperature = toNumber(entry?.temp);
      if (temperature === null) {
        return null;
      }
      const forecast = {
        datetime,
        temperature: convertTemperature(temperature, units),
        weather: conditionFromCode(entry?.ww),
      };
      const isDay = isDaytime(entry?.dayNight);
      if (isDay !== null) {
        forecast.is_day = isDay;
      }
      appendHourlyDetails(forecast, entry, units);
      return { forecast, time: new Date(datetime).getTime() };
    })
    .filter((entry) => entry !== null && entry.time >= earliest)
    .slice(0, MAX_HOURS)
    .map((entry) => entry.forecast);
}

/**
 * @description Transforme les prévisions quotidiennes du fournisseur.
 * @param {unknown} rawDaily - Tableau `for.daily` de l’IRM/KMI.
 * @param {object} options - Options de conversion.
 * @param {string} options.units - Système d’unités Gladys.
 * @param {Date} options.now - Horloge de référence.
 * @returns {Array<object>} Prévisions quotidiennes pivot, limitées à huit.
 */
function buildDays(rawDaily, { units, now }) {
  if (!Array.isArray(rawDaily)) {
    return [];
  }
  let cursor = dayKey(now);
  return rawDaily
    .map((entry) => {
      const key = resolveDailyDay(entry, cursor, now);
      cursor = key;
      const minimum = toNumber(entry?.tempMin);
      const maximum = toNumber(entry?.tempMax);
      // Les entrées « Cette nuit » n’ont pas toujours de maximum ; elles ne
      // correspondent pas à une journée complète du pivot.
      if (minimum === null || maximum === null) {
        return null;
      }
      const day = {
        datetime: localDaySecondsToIso(key, 12 * 3600),
        temperature_min: convertTemperature(Math.min(minimum, maximum), units),
        temperature_max: convertTemperature(Math.max(minimum, maximum), units),
        weather: conditionFromCode(entry?.ww1),
      };
      const chance = toNumber(entry?.precipChance);
      if (chance !== null) {
        day.precipitation_probability = Math.max(0, Math.min(100, chance));
      }
      const precipitation = toNumber(entry?.precipQuantity);
      if (precipitation !== null) {
        day.precipitation = convertPrecipitation(precipitation, units);
      }
      const wind = entry?.wind ?? {};
      const speed = toNumber(wind.speed);
      if (speed !== null) {
        day.wind_speed = convertWindSpeed(speed, units);
      }
      const gust = toNumber(wind.peakSpeed);
      if (gust !== null && gust > 0) {
        day.wind_gust = convertWindSpeed(gust, units);
      }
      const variable = wind.dirText?.en === 'VAR';
      const direction = toNumber(wind.dir);
      if (!variable && direction !== null) {
        day.wind_direction = (direction + 180) % 360;
      }
      const sunrise = toNumber(entry?.dawnRiseSeconds ?? entry?.sunRise);
      if (sunrise !== null) {
        day.sunrise = localDaySecondsToIso(key, sunrise);
      }
      const sunset = toNumber(entry?.dawnSetSeconds ?? entry?.sunSet);
      if (sunset !== null) {
        day.sunset = localDaySecondsToIso(key, sunset);
      }
      return day;
    })
    .filter((entry) => entry !== null)
    .slice(0, MAX_DAYS);
}

/**
 * @description Lit l’indice UV du module IRM/KMI lorsqu’il est disponible.
 * @param {unknown} modules - Tableau `module` de l’API.
 * @returns {number|null} Indice UV, ou `null`.
 */
function readUvIndex(modules) {
  if (!Array.isArray(modules)) {
    return null;
  }
  const module = modules.find((entry) => entry?.type === 'uv');
  return toNumber(module?.data?.levelValue);
}

/**
 * @description Construit les conditions courantes depuis l’observation IRM/KMI.
 * @param {object} observation - Bloc `obs` du fournisseur.
 * @param {Array<object>} hours - Prévisions horaires déjà converties.
 * @param {object} options - Options de conversion.
 * @param {string} options.units - Système d’unités Gladys.
 * @param {number|null} options.uvIndex - Indice UV éventuel.
 * @returns {object} Conditions actuelles pivot.
 */
function buildCurrent(observation, hours, { units, uvIndex }) {
  const temperature = toNumber(observation?.temp);
  const timestamp =
    typeof observation?.timestamp === 'string' ? new Date(observation.timestamp) : null;
  if (temperature === null || timestamp === null || Number.isNaN(timestamp.getTime())) {
    const firstHour = hours[0];
    if (firstHour === undefined) {
      throw new Error('IRM/KMI returned no usable current observation or hourly forecast');
    }
    const fallback = { ...firstHour };
    if (uvIndex !== null) {
      fallback.uv_index = uvIndex;
    }
    return fallback;
  }

  const current = {
    datetime: timestamp.toISOString(),
    temperature: convertTemperature(temperature, units),
    weather: conditionFromCode(observation.ww),
  };
  const isDay = isDaytime(observation.dayNight);
  if (isDay !== null) {
    current.is_day = isDay;
  }
  const sameHour = hours.find((hour) => {
    const date = new Date(hour.datetime);
    return date.getUTCHours() === timestamp.getUTCHours();
  });
  if (sameHour !== undefined) {
    ['pressure', 'wind_speed', 'wind_gust', 'wind_direction', 'precipitation_probability'].forEach(
      (field) => {
        if (sameHour[field] !== undefined) {
          current[field] = sameHour[field];
        }
      },
    );
  }
  if (uvIndex !== null) {
    current.uv_index = uvIndex;
  }
  return current;
}

/**
 * @description Convertit l’ensemble d’une réponse IRM/KMI vers le pivot Gladys.
 * @param {object} data - Charge utile complète de `getForecasts`.
 * @param {object} [options] - Options de conversion.
 * @param {string} [options.units] - `metric` ou `us`.
 * @param {string} [options.language] - Langue d’alerte demandée.
 * @param {Date} [options.now] - Horloge injectable pour les tests.
 * @returns {object} Réponse météo pivot Gladys.
 */
function buildWeather(data, { units = 'metric', language = 'fr', now = new Date() } = {}) {
  const hourly = data?.for?.hourly;
  const daily = data?.for?.daily;
  const hours = buildHours(hourly, { units, now });
  const days = buildDays(daily, { units, now });
  const current = buildCurrent(data?.obs, hours, { units, uvIndex: readUvIndex(data?.module) });
  const weather = { ...current, hours, days };
  const alerts = buildAlerts(data?.for?.warning, { language });
  if (alerts.length > 0) {
    weather.alerts = alerts;
  }
  return weather;
}

export {
  BRUSSELS_TIME_ZONE,
  MAX_DAYS,
  MAX_HOURS,
  addDays,
  buildCurrent,
  buildDays,
  buildHours,
  buildWeather,
  convertPrecipitation,
  convertTemperature,
  convertWindSpeed,
  dayKey,
  isNumber,
  localDaySecondsToIso,
  readUvIndex,
  resolveDailyDay,
  toNumber,
};
