// -----------------------------------------------------------------------------
// Avertissements IRM/KMI -> alertes météo pivot Gladys.
// -----------------------------------------------------------------------------

const ALERT_TYPE_BY_WARNING_ID = {
  0: 'wind',
  1: 'rain',
  2: 'snow',
  3: 'thunderstorm',
  7: 'fog',
  9: 'cold',
  10: 'heat',
  12: 'thunderstorm',
  13: 'thunderstorm',
  14: 'thunderstorm',
  15: 'coastal',
  17: 'cold',
};

const SEVERITY_BY_LEVEL = {
  1: 'minor',
  2: 'moderate',
  3: 'severe',
};

const MAX_EVENT_LENGTH = 100;
const MAX_DESCRIPTION_LENGTH = 5000;

/**
 * @description Sélectionne une chaîne localisée avec repli anglais puis français.
 * @param {unknown} value - Objet de traductions retourné par l’IRM/KMI.
 * @param {string} language - Langue normalisée demandée par Gladys.
 * @returns {string} Texte exploitable, ou chaîne vide.
 */
function localizedText(value, language) {
  if (typeof value === 'string') {
    return value.trim();
  }
  if (!value || typeof value !== 'object') {
    return '';
  }
  const candidate = value[language] ?? value.en ?? value.fr ?? value.nl ?? value.de;
  return typeof candidate === 'string' ? candidate.trim() : '';
}

/**
 * @description Construit les alertes pivot à partir du tableau `for.warning`.
 * @param {unknown} warnings - Tableau d’avertissements IRM/KMI.
 * @param {object} [options] - Options de conversion.
 * @param {string} [options.language] - Langue demandée par Gladys.
 * @returns {Array<object>} Alertes validables par le contrat météo Gladys.
 */
function buildAlerts(warnings, { language = 'fr' } = {}) {
  if (!Array.isArray(warnings)) {
    return [];
  }

  return warnings.flatMap((warning) => {
    const id = Number(warning?.warningType?.id);
    const level = Number(warning?.warningLevel);
    const severity = SEVERITY_BY_LEVEL[level];
    if (!Number.isInteger(id) || severity === undefined) {
      return [];
    }

    const name = localizedText(warning.warningType?.name, language) || `Avertissement ${id}`;
    const alert = {
      severity,
      event: name.slice(0, MAX_EVENT_LENGTH),
    };
    const type = ALERT_TYPE_BY_WARNING_ID[id];
    if (type !== undefined) {
      alert.type = type;
    }

    const description = localizedText(warning.text, language);
    if (description) {
      alert.description = description.slice(0, MAX_DESCRIPTION_LENGTH);
    }
    const start = toIsoDate(warning.fromTimestamp);
    if (start !== null) {
      alert.start = start;
    }
    const end = toIsoDate(warning.toTimestamp);
    if (end !== null) {
      alert.end = end;
    }
    return [alert];
  });
}

/**
 * @description Valide et normalise une date ISO fournie par l’IRM/KMI.
 * @param {unknown} value - Valeur de date à normaliser.
 * @returns {string|null} Date ISO UTC, ou `null`.
 */
function toIsoDate(value) {
  if (typeof value !== 'string') {
    return null;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export {
  ALERT_TYPE_BY_WARNING_ID,
  MAX_DESCRIPTION_LENGTH,
  MAX_EVENT_LENGTH,
  SEVERITY_BY_LEVEL,
  buildAlerts,
  localizedText,
  toIsoDate,
};
