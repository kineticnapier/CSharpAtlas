import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

async function read(relativePath) {
  return readFile(path.join(root, relativePath), 'utf8');
}

test('runtime loads split localized content instead of legacy files', async () => {
  const source = await read('src/main.js');
  assert.match(source, /loadLocalizedContent/);
  assert.match(source, /resolveLocale/);
  assert.doesNotMatch(source, /const contentFiles/);
  assert.doesNotMatch(source, /codeAnnotations/);
});

test('runtime wires locale switching and visible fallback status', async () => {
  const source = await read('src/main.js');
  assert.match(source, /languageSelect\.addEventListener\(['"]change['"]/);
  assert.match(source, /withLangParam/);
  assert.match(source, /renderTranslationBadge/);
  assert.match(source, /renderTranslationBanner/);
});
