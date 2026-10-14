// -----------------------------------------------------------------------------
// Cohérence entre `gladys-assistant-integration.json` et le code. L’indexeur du
// store valide le manifeste, mais ne peut pas savoir ce que le code implémente :
// ces tests gardent les deux côtés synchronisés (repris du template officiel).
// -----------------------------------------------------------------------------

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { DEFAULT_CACHE_DURATION_SECONDS, MAX_CACHE_DURATION_SECONDS } from '../src/config.js';

const manifest = JSON.parse(
  await readFile(new URL('../gladys-assistant-integration.json', import.meta.url), 'utf8'),
);
const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));

const CATEGORIES_MIN_GLADYS_VERSION = [4, 86, 0];

function minGladysVersion() {
  const match = manifest.gladys_version.match(/>=\s*(\d+)\.(\d+)\.(\d+)/);
  assert.ok(match, 'gladys_version must declare a minimum version');
  return match.slice(1).map(Number);
}

function isAtLeast(version, required) {
  for (let i = 0; i < required.length; i += 1) {
    if (version[i] !== required[i]) {
      return version[i] > required[i];
    }
  }
  return true;
}

test('le manifeste déclare une intégration météo', () => {
  assert.equal(manifest.type, 'weather');
});

test('déclarer des catégories de catalogue exige Gladys >= 4.86.0', () => {
  assert.ok(manifest.categories.length >= 1 && manifest.categories.length <= 3);
  assert.ok(
    isAtLeast(minGladysVersion(), CATEGORIES_MIN_GLADYS_VERSION),
    `categories requires gladys_version >= 4.86.0, got "${manifest.gladys_version}"`,
  );
});

test('la durée de cache du manifeste correspond à la configuration du code', () => {
  const field = manifest.config_schema.find((entry) => entry.key === 'cache_duration');
  assert.ok(field, 'cache_duration must be declared in config_schema');
  assert.equal(field.default, DEFAULT_CACHE_DURATION_SECONDS);
  assert.equal(field.max, MAX_CACHE_DURATION_SECONDS);
  assert.equal(field.min, 0);
});

test('les sections sont purement présentationnelles', () => {
  const sections = manifest.config_schema.filter((field) => field.type === 'section');
  for (const section of sections) {
    assert.equal(section.required, undefined, `section "${section.key}" must not be required`);
    assert.equal(section.default, undefined, `section "${section.key}" must not have a default`);
    assert.equal(section.placeholder, undefined, `section "${section.key}" has a placeholder`);
    assert.ok(section.label?.en, `section "${section.key}" needs an English label`);
    for (const link of section.links ?? []) {
      assert.match(link.url, /^https:\/\//, 'section links must be https');
    }
  }
});

test('les textes du manifeste sont des objets multilingues en et fr', () => {
  for (const field of manifest.config_schema) {
    for (const key of ['label', 'description', 'placeholder']) {
      if (field[key] !== undefined) {
        assert.equal(typeof field[key], 'object', `field "${field.key}": ${key}`);
        assert.ok(field[key].en && field[key].fr, `field "${field.key}": ${key} needs en + fr`);
      }
    }
  }
});

test('la version du manifeste est celle du package et étiquette l’image', () => {
  // Le workflow Release écrit les trois : un écart signifie une édition à la main.
  assert.equal(manifest.version, pkg.version, 'manifest version must match package.json');
  assert.ok(
    manifest.docker_image.endsWith(`:${manifest.version}`),
    `docker_image must be tagged :${manifest.version}, got "${manifest.docker_image}"`,
  );
});

test('la description du catalogue compte 10 à 100 caractères par langue', () => {
  assert.ok(manifest.description.en, 'the description needs an English text');
  for (const [lang, text] of Object.entries(manifest.description)) {
    assert.ok(
      text.length >= 10 && text.length <= 100,
      `description.${lang} has ${text.length} characters (10 to 100 allowed)`,
    );
  }
});
