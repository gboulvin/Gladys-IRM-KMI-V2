import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { buildAlerts } from '../src/alerts.js';
import { conditionFromCode, isDaytime } from '../src/conditions.js';
import { normalizeConfig } from '../src/config.js';
import { createForecastCache } from '../src/forecast-cache.js';
import {
  buildWeather,
  convertPrecipitation,
  convertTemperature,
  convertWindSpeed,
} from '../src/forecast.js';
import { buildApiKey, formatBrusselsDate, getForecast } from '../src/irm-kmi-api.js';

const FIXTURE_URL = new URL('./fixtures/irm-kmi-forecast.json', import.meta.url);
const MANIFEST_URL = new URL('../gladys-assistant-integration.json', import.meta.url);

async function readFixture() {
  return JSON.parse(await readFile(FIXTURE_URL, 'utf8'));
}

async function readManifest() {
  return JSON.parse(await readFile(MANIFEST_URL, 'utf8'));
}

test('le manifeste déclare une catégorie de catalogue compatible Gladys 4.86', async () => {
  const manifest = await readManifest();
  const allowedCategories = new Set([
    'climate',
    'lighting',
    'energy',
    'security',
    'multimedia',
    'appliances',
    'environment',
    'protocols',
    'network',
    'notifications',
    'assistants',
    'services',
  ]);

  assert.ok(Array.isArray(manifest.categories));
  assert.ok(manifest.categories.length >= 1 && manifest.categories.length <= 3);
  assert.ok(manifest.categories.every((category) => allowedCategories.has(category)));
  const minimum = manifest.gladys_version.match(/>=\s*(\d+)\.(\d+)\.\d+/);
  assert.ok(minimum, 'gladys_version must declare a minimum version');
  const [, major, minor] = minimum.map(Number);
  assert.ok(
    major > 4 || (major === 4 && minor >= 86),
    `categories requires Gladys >= 4.86.0, got "${manifest.gladys_version}"`,
  );
});

test('les codes de condition IRM/KMI sont normalisés pour le pivot Gladys', () => {
  assert.equal(conditionFromCode(0), 'clear');
  assert.equal(conditionFromCode('18'), 'rain');
  assert.equal(conditionFromCode(24), 'fog');
  assert.equal(conditionFromCode(999), 'unknown');
  assert.equal(isDaytime('d'), true);
  assert.equal(isDaytime('n'), false);
  assert.equal(isDaytime('invalid'), null);
});

test('les avertissements IRM/KMI utilisent la gravité, la langue et les dates du pivot', () => {
  const alerts = buildAlerts(
    [
      {
        warningType: { id: '10', name: { fr: 'Chaleur', en: 'Heat' } },
        warningLevel: '2',
        text: { fr: 'Hydratez-vous.', en: 'Stay hydrated.' },
        fromTimestamp: '2026-07-01T00:00:00+02:00',
        toTimestamp: '2026-07-02T00:00:00+02:00',
      },
    ],
    { language: 'fr' },
  );
  assert.deepEqual(alerts, [
    {
      severity: 'moderate',
      event: 'Chaleur',
      type: 'heat',
      description: 'Hydratez-vous.',
      start: '2026-06-30T22:00:00.000Z',
      end: '2026-07-01T22:00:00.000Z',
    },
  ]);
});

test('les conversions d’unités préservent les valeurs métriques et convertissent le système US', () => {
  assert.equal(convertTemperature(20, 'metric'), 20);
  assert.equal(convertTemperature(20, 'us'), 68);
  assert.equal(convertWindSpeed(10, 'metric'), 10);
  assert.equal(convertWindSpeed(10, 'us'), 6.2);
  assert.equal(convertPrecipitation(25.4, 'metric'), 25.4);
  assert.equal(convertPrecipitation(25.4, 'us'), 1);
});

test('une réponse IRM/KMI complète est convertie en météo pivot', async () => {
  const fixture = await readFixture();
  const weather = buildWeather(fixture, {
    units: 'metric',
    language: 'fr',
    now: new Date('2023-12-26T18:30:00+01:00'),
  });

  assert.equal(weather.temperature, 7);
  assert.equal(weather.weather, 'cloud');
  assert.equal(weather.is_day, false);
  assert.equal(weather.pressure, 1020);
  assert.equal(weather.wind_speed, 5);
  assert.equal(weather.uv_index, 0.7);
  assert.equal(weather.hours.length, 24);
  assert.equal(weather.hours[0].weather, 'partly-cloudy');
  assert.equal(weather.hours[0].datetime, '2023-12-26T17:00:00.000Z');
  assert.equal(weather.days.length, 7);
  assert.equal(weather.days[0].temperature_min, 4);
  assert.equal(weather.days[0].temperature_max, 9);
  assert.equal(weather.days[0].weather, 'partly-cloudy');
  assert.equal(weather.days[0].sunrise, '2023-12-27T07:44:00.000Z');
  assert.equal(weather.days[0].sunset, '2023-12-27T15:43:00.000Z');
  assert.equal(weather.alerts, undefined);
});

test('le système américain est appliqué à l’observation et aux prévisions', async () => {
  const fixture = await readFixture();
  const weather = buildWeather(fixture, {
    units: 'us',
    now: new Date('2023-12-26T18:30:00+01:00'),
  });

  assert.equal(weather.temperature, 44.6);
  assert.equal(weather.wind_speed, 3.1);
  assert.equal(weather.hours[0].temperature, 44.6);
  assert.equal(weather.days[0].temperature_max, 48.2);
});

test('le client IRM/KMI signe et envoie une requête de prévision normalisée', async () => {
  const instant = new Date('2026-01-02T12:00:00.000Z');
  let requestedUrl;
  let requestedOptions;
  const result = await getForecast(50.8466, 4.3528, {
    now: instant,
    fetchImpl: async (url, options) => {
      requestedUrl = new URL(url);
      requestedOptions = options;
      return { ok: true, json: async () => ({ obs: {}, for: {} }) };
    },
  });

  assert.deepEqual(result, { obs: {}, for: {} });
  assert.equal(formatBrusselsDate(instant), '02/01/2026');
  assert.equal(requestedUrl.origin, 'https://app.meteo.be');
  assert.equal(requestedUrl.searchParams.get('s'), 'getForecasts');
  assert.equal(requestedUrl.searchParams.get('lat'), '50.8466');
  assert.equal(requestedUrl.searchParams.get('long'), '4.3528');
  assert.equal(requestedUrl.searchParams.get('k'), buildApiKey('getForecasts', instant));
  assert.equal(requestedOptions.headers.accept, 'application/json');
});

test('le cache expire, peut être désactivé et est vidé sur demande', async () => {
  const cache = createForecastCache();
  const key = { latitude: 50.8466, longitude: 4.3528, language: 'fr', units: 'metric' };
  cache.set(key, { weather: 'clear' }, 1);
  assert.deepEqual(cache.get(key), { weather: 'clear' });
  cache.clear();
  assert.equal(cache.get(key), null);
  cache.set(key, { weather: 'rain' }, 0);
  assert.equal(cache.get(key), null);
});

test('la configuration borne la durée de cache et accepte sa désactivation', () => {
  assert.deepEqual(normalizeConfig(), { cacheDuration: 600 });
  assert.deepEqual(normalizeConfig({ cache_duration: '0' }), { cacheDuration: 0 });
  assert.deepEqual(normalizeConfig({ cache_duration: 9999 }), { cacheDuration: 3600 });
  assert.deepEqual(normalizeConfig({ cache_duration: -12 }), { cacheDuration: 0 });
});
