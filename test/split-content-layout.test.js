import test from 'node:test';
import assert from 'node:assert/strict';
import { access } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const contentDir = path.join(root, 'public', 'content');
const categories = [
  'items.json',
  'exceptions.json',
  'compiler-errors.json',
  'compiler-warnings.json',
  'concepts.json',
  'code-recipes.json',
  'logic-errors.json'
];

async function exists(file) {
  try {
    await access(file);
    return true;
  } catch {
    return false;
  }
}

test('runtime content lives only in articles and locales directories', async () => {
  for (const category of categories) {
    assert.equal(await exists(path.join(contentDir, category)), false, `legacy file still exists: ${category}`);
    assert.equal(await exists(path.join(contentDir, 'articles', category)), true, `missing base file: ${category}`);
    assert.equal(await exists(path.join(contentDir, 'locales', 'ja', category)), true, `missing ja locale: ${category}`);
    assert.equal(await exists(path.join(contentDir, 'locales', 'en', category)), true, `missing en locale: ${category}`);
  }
  assert.equal(await exists(path.join(contentDir, 'code-annotations.json')), false, 'legacy code annotations still exist');
});
