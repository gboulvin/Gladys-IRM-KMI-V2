// -----------------------------------------------------------------------------
// Configuration de l'intégration.
// -----------------------------------------------------------------------------

const DEFAULT_CACHE_DURATION_SECONDS = 600;
const MAX_CACHE_DURATION_SECONDS = 3600;

/**
 * @description Convertit la configuration brute Gladys en configuration interne.
 * @param {object} [rawConfig] - Valeurs du manifeste, éventuellement absentes.
 * @returns {{cacheDuration: number}} La configuration normalisée.
 */
function normalizeConfig(rawConfig = {}) {
  const provided = Number(rawConfig.cache_duration);
  const cacheDuration = Number.isFinite(provided)
    ? Math.max(0, Math.min(MAX_CACHE_DURATION_SECONDS, Math.round(provided)))
    : DEFAULT_CACHE_DURATION_SECONDS;

  return { cacheDuration };
}

export { DEFAULT_CACHE_DURATION_SECONDS, MAX_CACHE_DURATION_SECONDS, normalizeConfig };
