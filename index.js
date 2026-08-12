// -----------------------------------------------------------------------------
// Point d'entrée de l'intégration externe Gladys « Météo Bénélux ».
//
// Gladys appelle `onWeatherGet` pour une position donnée. L'intégration récupère
// les données IRM/KMI, les convertit dans le format pivot et les renvoie au
// tableau de bord, à l’assistant et aux scènes d’alerte.
// -----------------------------------------------------------------------------

import { GladysIntegration, logger } from '@gladysassistant/integration-sdk';
import { normalizeConfig } from './src/config.js';
import { createForecastCache } from './src/forecast-cache.js';
import { buildWeather } from './src/forecast.js';
import { getForecast } from './src/irm-kmi-api.js';

const gladys = new GladysIntegration();
const forecastCache = createForecastCache();
let config = normalizeConfig();

/**
 * @description Rend une localisation demandée exploitable par l'API IRM/KMI.
 * @param {object} options - Requête météo adressée par Gladys.
 * @returns {{latitude: number, longitude: number, language: string, units: string}} Valeurs normalisées.
 */
function normalizeWeatherRequest({ latitude, longitude, language, units }) {
  const requestedLanguage = typeof language === 'string' ? language.toLowerCase() : 'fr';
  const normalizedLanguage = ['fr', 'nl', 'en', 'de'].includes(requestedLanguage)
    ? requestedLanguage
    : 'fr';
  return {
    latitude: Number(latitude),
    longitude: Number(longitude),
    language: normalizedLanguage,
    units: units === 'us' ? 'us' : 'metric',
  };
}

// Requête du widget, de l’assistant ou d’une scène Gladys.
gladys.onWeatherGet(async (options) => {
  const request = normalizeWeatherRequest(options);
  const cached = forecastCache.get(request);
  if (cached !== null) {
    logger.debug(`onWeatherGet -> cache (${request.latitude}, ${request.longitude})`);
    return cached;
  }

  logger.info(`onWeatherGet -> IRM/KMI (${request.latitude}, ${request.longitude})`);
  const data = await getForecast(request.latitude, request.longitude);
  const weather = buildWeather(data, request);
  forecastCache.set(request, weather, config.cacheDuration);
  return weather;
});

// La durée de cache peut être modifiée à chaud depuis Gladys.
gladys.onConfigUpdated((rawConfig) => {
  config = normalizeConfig(rawConfig);
  forecastCache.clear();
  logger.info(`Configuration actualisée : cache de ${config.cacheDuration} s`);
});

// L’intégration ne maintient aucune session persistante avec l’IRM/KMI : HTTPS
// est interrogé seulement lorsqu’une météo est demandée.
gladys.on('connected', async () => {
  try {
    config = normalizeConfig(await gladys.getConfig());
    forecastCache.clear();
    await gladys.setConnectionStatus(true);
    logger.info('Météo Bénélux est prête à fournir des prévisions IRM/KMI');
  } catch (error) {
    logger.error('Initialisation impossible', error);
    await gladys
      .setConnectionStatus(false, {
        fr: "L'initialisation a échoué ; consultez les journaux de l'intégration.",
        en: 'Initialization failed; check the integration logs.',
      })
      .catch(() => {});
  }
});

gladys.handleShutdown((signal) => {
  logger.info(`Arrêt propre demandé (${signal})`);
  forecastCache.clear();
});

logger.info("Démarrage de l'intégration Météo Bénélux...");
gladys.connect().catch((error) => {
  logger.error('Échec de la connexion à Gladys', error);
  process.exit(1);
});

export { normalizeWeatherRequest };
