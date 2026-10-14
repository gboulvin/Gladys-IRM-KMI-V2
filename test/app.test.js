// -----------------------------------------------------------------------------
// Câblage SDK (src/app.js), testé contre le faux Gladys du SDK : mêmes méthodes,
// mêmes contrôles d’arguments et même forme d’acquittement que le vrai client,
// sans serveur ni réseau.
// -----------------------------------------------------------------------------

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { createFakeGladys } from '@gladysassistant/integration-sdk/testing';

import { normalizeWeatherRequest, registerHandlers } from '../src/app.js';

const FIXTURE_URL = new URL('./fixtures/irm-kmi-forecast.json', import.meta.url);
const REQUEST = { latitude: 50.8466, longitude: 4.3528, language: 'fr', units: 'metric' };
const silentLogger = { debug() {}, info() {}, warn() {}, error() {} };

async function setup({ config = {}, getForecast } = {}) {
  const fixture = JSON.parse(await readFile(FIXTURE_URL, 'utf8'));
  const calls = [];
  const gladys = createFakeGladys({ config });
  const app = registerHandlers(gladys, {
    logger: silentLogger,
    getForecast:
      getForecast ??
      (async (latitude, longitude) => {
        calls.push({ latitude, longitude });
        return fixture;
      }),
  });
  await gladys.connect();
  return { gladys, app, calls };
}

test('la requête Gladys est normalisée (langue et unités)', () => {
  assert.deepEqual(
    normalizeWeatherRequest({ latitude: '50.5', longitude: '4.1', language: 'NL', units: 'us' }),
    { latitude: 50.5, longitude: 4.1, language: 'nl', units: 'us' },
  );
  assert.deepEqual(normalizeWeatherRequest({ latitude: 1, longitude: 2, language: 'it' }), {
    latitude: 1,
    longitude: 2,
    language: 'en',
    units: 'metric',
  });
});

test('la connexion lit la configuration et publie un statut connecté', async () => {
  const { gladys, app } = await setup({ config: { cache_duration: 120 } });
  assert.deepEqual(gladys.fake.connectionStatus, { connected: true });
  assert.deepEqual(app.getConfig(), { cacheDuration: 120 });
});

test('onWeatherGet renvoie le pivot et réutilise le cache pour la même position', async () => {
  const { gladys, calls } = await setup();

  const first = await gladys.fake.weatherGet(REQUEST);
  assert.equal(first.success, true);
  assert.equal(typeof first.data.weather.temperature, 'number');
  assert.ok(Array.isArray(first.data.weather.hours));

  const second = await gladys.fake.weatherGet(REQUEST);
  assert.deepEqual(second.data.weather, first.data.weather);
  assert.equal(calls.length, 1, 'la seconde requête est servie par le cache');

  await gladys.fake.weatherGet({ ...REQUEST, units: 'us' });
  assert.equal(calls.length, 2, 'un autre système d’unités est une autre entrée de cache');
});

test('une mise à jour de configuration vide le cache et applique la nouvelle durée', async () => {
  const { gladys, app, calls } = await setup();
  await gladys.fake.weatherGet(REQUEST);

  await gladys.fake.configUpdated({ cache_duration: 0 });
  assert.deepEqual(app.getConfig(), { cacheDuration: 0 });

  await gladys.fake.weatherGet(REQUEST);
  await gladys.fake.weatherGet(REQUEST);
  assert.equal(calls.length, 3, 'cache désactivé : chaque requête interroge l’IRM/KMI');
});

test('un échec IRM/KMI acquitte la commande en échec', async () => {
  const { gladys } = await setup({
    getForecast: async () => {
      throw new Error('IRM/KMI returned HTTP 503');
    },
  });
  const ack = await gladys.fake.weatherGet(REQUEST);
  assert.equal(ack.success, false);
});

test('une configuration illisible publie un statut déconnecté multilingue', async () => {
  const gladys = createFakeGladys();
  // connect() resynchronise d’abord la configuration lui-même : seul l’appel
  // fait par le listener 'connected' (client déjà connecté) échoue.
  const readConfig = gladys.getConfig.bind(gladys);
  gladys.getConfig = async () => {
    if (gladys.connected) {
      throw new Error('boom');
    }
    return readConfig();
  };
  registerHandlers(gladys, { logger: silentLogger, getForecast: async () => ({}) });
  await gladys.connect();
  assert.equal(gladys.fake.connectionStatus.connected, false);
  assert.deepEqual(Object.keys(gladys.fake.connectionStatus.message).sort(), [
    'de',
    'en',
    'es',
    'fr',
    'nl',
  ]);
});

test('l’arrêt propre se termine sans erreur', async () => {
  const { gladys } = await setup();
  await gladys.fake.shutdown();
});
