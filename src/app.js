// -----------------------------------------------------------------------------
// Câblage du SDK Gladys pour « Météo Bénélux ».
//
// Gladys appelle `onWeatherGet` pour une position donnée. L'intégration récupère
// les données IRM/KMI, les convertit dans le format pivot et les renvoie au
// tableau de bord, à l’assistant et aux scènes d’alerte.
//
// Les handlers reçoivent le client Gladys en paramètre : `index.js` passe le vrai
// client, les tests passent le faux Gladys du SDK
// (`@gladysassistant/integration-sdk/testing`).
// -----------------------------------------------------------------------------

import { logger as defaultLogger } from '@gladysassistant/integration-sdk';
import { normalizeConfig } from './config.js';
import { createForecastCache } from './forecast-cache.js';
import { buildWeather } from './forecast.js';
import { MESSAGES, normalizeLanguage } from './i18n.js';
import { getForecast as defaultGetForecast } from './irm-kmi-api.js';

/**
 * @description Rend une localisation demandée exploitable par l'API IRM/KMI.
 * @param {object} options - Requête météo adressée par Gladys.
 * @returns {{latitude: number, longitude: number, language: string, units: string}} Valeurs normalisées.
 */
function normalizeWeatherRequest({ latitude, longitude, language, units }) {
  return {
    latitude: Number(latitude),
    longitude: Number(longitude),
    language: normalizeLanguage(language),
    units: units === 'us' ? 'us' : 'metric',
  };
}

/**
 * @description Enregistre les handlers de l’intégration sur un client Gladys.
 * @param {object} gladys - Client `GladysIntegration` (ou faux Gladys de test).
 * @param {object} [options] - Dépendances injectables pour les tests.
 * @param {Function} [options.getForecast] - Client IRM/KMI.
 * @param {object} [options.logger] - Logger du SDK.
 * @returns {{getConfig: Function}} Accès en lecture à la configuration courante.
 */
function registerHandlers(
  gladys,
  { getForecast = defaultGetForecast, logger = defaultLogger } = {},
) {
  const forecastCache = createForecastCache();
  let config = normalizeConfig();

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
      await gladys.setConnectionStatus(false, { ...MESSAGES.initializationFailed }).catch(() => {});
    }
  });

  gladys.handleShutdown((signal) => {
    logger.info(`Arrêt propre demandé (${signal})`);
    forecastCache.clear();
  });

  return { getConfig: () => config };
}

export { normalizeWeatherRequest, registerHandlers };
