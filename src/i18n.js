// -----------------------------------------------------------------------------
// Langues et textes propres à l’intégration.
//
// Gladys transmet la langue de l’utilisateur à chaque requête météo. L’IRM/KMI
// fournit ses textes en français, néerlandais, anglais et allemand ; pour une
// autre langue (espagnol…), ses textes retombent sur l’anglais, tandis que les
// textes de l’intégration elle-même existent dans les cinq langues.
// -----------------------------------------------------------------------------

const DEFAULT_LANGUAGE = 'en';
const SUPPORTED_LANGUAGES = ['en', 'fr', 'nl', 'de', 'es'];

// Ordre de repli des textes IRM/KMI quand la langue demandée est absente.
const PROVIDER_FALLBACK_LANGUAGES = ['en', 'fr', 'nl', 'de'];

const MESSAGES = {
  initializationFailed: {
    en: 'Initialization failed; check the integration logs.',
    fr: "L'initialisation a échoué ; consultez les journaux de l'intégration.",
    nl: 'Initialisatie mislukt; raadpleeg de logboeken van de integratie.',
    de: 'Initialisierung fehlgeschlagen; prüfen Sie die Protokolle der Integration.',
    es: 'La inicialización ha fallado; consulte los registros de la integración.',
  },
  warning: {
    en: 'Weather warning',
    fr: 'Avertissement météo',
    nl: 'Weerwaarschuwing',
    de: 'Wetterwarnung',
    es: 'Aviso meteorológico',
  },
};

/**
 * @description Ramène une langue Gladys (`nl-BE`, `ES`…) à une langue prise en charge.
 * @param {unknown} language - Langue reçue de Gladys.
 * @returns {string} Code de langue à deux lettres, anglais par défaut.
 */
function normalizeLanguage(language) {
  if (typeof language !== 'string') {
    return DEFAULT_LANGUAGE;
  }
  const primary = language.trim().toLowerCase().split(/[-_]/)[0];
  return SUPPORTED_LANGUAGES.includes(primary) ? primary : DEFAULT_LANGUAGE;
}

/**
 * @description Traduit un message de l’intégration, avec repli anglais.
 * @param {keyof typeof MESSAGES} key - Clé du message.
 * @param {string} language - Langue normalisée.
 * @returns {string} Texte localisé.
 */
function translate(key, language) {
  return MESSAGES[key][language] ?? MESSAGES[key][DEFAULT_LANGUAGE];
}

export {
  DEFAULT_LANGUAGE,
  MESSAGES,
  PROVIDER_FALLBACK_LANGUAGES,
  SUPPORTED_LANGUAGES,
  normalizeLanguage,
  translate,
};
