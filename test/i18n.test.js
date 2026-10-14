// -----------------------------------------------------------------------------
// Internationalisation : langues prises en charge, messages et documentation.
// -----------------------------------------------------------------------------

import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import test from 'node:test';

import { MESSAGES, SUPPORTED_LANGUAGES, normalizeLanguage, translate } from '../src/i18n.js';

const manifest = JSON.parse(
  await readFile(new URL('../gladys-assistant-integration.json', import.meta.url), 'utf8'),
);

// Every multi-language object of the manifest, with a readable path.
function localizedTexts(value, path = 'manifest') {
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => localizedTexts(item, `${path}[${index}]`));
  }
  if (value === null || typeof value !== 'object') {
    return [];
  }
  return Object.entries(value).flatMap(([key, child]) =>
    ['label', 'description', 'placeholder'].includes(key) && typeof child === 'object'
      ? [{ path: `${path}.${key}`, text: child }]
      : localizedTexts(child, `${path}.${key}`),
  );
}

test('les langues Gladys sont normalisées, avec repli anglais', () => {
  assert.deepEqual(SUPPORTED_LANGUAGES, ['en', 'fr', 'nl', 'de', 'es']);
  assert.equal(normalizeLanguage('nl-BE'), 'nl');
  assert.equal(normalizeLanguage('fr_BE'), 'fr');
  assert.equal(normalizeLanguage('ES'), 'es');
  assert.equal(normalizeLanguage('de'), 'de');
  assert.equal(normalizeLanguage('it'), 'en');
  assert.equal(normalizeLanguage(undefined), 'en');
});

test('chaque message de l’intégration existe dans les cinq langues', () => {
  for (const [key, texts] of Object.entries(MESSAGES)) {
    assert.deepEqual(Object.keys(texts).sort(), [...SUPPORTED_LANGUAGES].sort(), key);
    for (const language of SUPPORTED_LANGUAGES) {
      assert.ok(translate(key, language).length > 0, `${key}.${language}`);
    }
  }
});

test('chaque texte du manifeste existe dans les cinq langues', () => {
  const texts = localizedTexts(manifest);
  assert.ok(texts.length > 0);
  for (const { path, text } of texts) {
    for (const language of SUPPORTED_LANGUAGES) {
      assert.ok(text[language]?.trim(), `${path}.${language} is missing`);
    }
  }
});

test('la documentation utilisateur existe dans les cinq langues', async () => {
  for (const language of SUPPORTED_LANGUAGES) {
    await access(new URL(`../docs/${language}.md`, import.meta.url));
  }
});
