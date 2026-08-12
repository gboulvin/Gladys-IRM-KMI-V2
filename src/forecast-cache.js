// -----------------------------------------------------------------------------
// Cache mémoire à courte durée pour les réponses météo.
// -----------------------------------------------------------------------------

/**
 * @description Crée un cache de prévision en mémoire.
 * @returns {{get: Function, set: Function, clear: Function}} Une petite API de cache.
 */
function createForecastCache() {
  const entries = new Map();

  function keyOf({ latitude, longitude, language, units }) {
    return JSON.stringify({
      latitude: Number(latitude).toFixed(6),
      longitude: Number(longitude).toFixed(6),
      language,
      units,
    });
  }

  /**
   * @description Lit une entrée non expirée.
   * @param {object} key - Clé métier de la requête météo.
   * @returns {object|null} La prévision mémorisée, ou `null`.
   */
  function get(key) {
    const entry = entries.get(keyOf(key));
    if (entry === undefined || entry.expiresAt <= Date.now()) {
      if (entry !== undefined) {
        entries.delete(keyOf(key));
      }
      return null;
    }
    return entry.value;
  }

  /**
   * @description Enregistre une réponse pour une durée limitée.
   * @param {object} key - Clé métier de la requête météo.
   * @param {object} value - Réponse pivot Gladys.
   * @param {number} durationSeconds - Durée de conservation ; 0 désactive le cache.
   * @returns {void}
   */
  function set(key, value, durationSeconds) {
    if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
      return;
    }
    entries.set(keyOf(key), {
      value,
      expiresAt: Date.now() + durationSeconds * 1000,
    });
  }

  /**
   * @description Vide intégralement le cache.
   * @returns {void}
   */
  function clear() {
    entries.clear();
  }

  return { get, set, clear };
}

export { createForecastCache };
