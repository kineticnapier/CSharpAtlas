import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { CONTENT_CATEGORIES } from '../src/content-loader.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FILE = 'hourly-batch-001.json';
const IDS = new Set([
  'frozen-dictionary-read-mostly',
  'configureawait-library-code',
  'iasyncdisposable-await-using',
  'regex-source-generator',
  'checked-overflow-context'
]);

async function json(...parts) {
  return JSON.parse(await readFile(path.join(root, ...parts), 'utf8'));
}

test('hourly batch 001 adds exactly five fully localized articles', async () => {
  assert.ok(CONTENT_CATEGORIES.includes(FILE), `${FILE} must be loaded`);
  const [base, ja, en] = await Promise.all([
    json('public', 'content', 'articles', FILE),
    json('public', 'content', 'locales', 'ja', FILE),
    json('public', 'content', 'locales', 'en', FILE)
  ]);
  assert.equal(base.length, 5);
  assert.deepEqual(new Set(base.map(x => x.id)), IDS);
  assert.deepEqual(new Set(Object.keys(ja)), IDS);
  assert.deepEqual(new Set(Object.keys(en)), IDS);
  for (const article of base) {
    assert.ok(Array.isArray(article.topics) && article.topics.length > 0, `${article.id}: topics required`);
    assert.ok(Array.isArray(article.related) && article.related.length > 0, `${article.id}: related required`);
  }
  for (const locale of [ja, en]) for (const id of IDS) {
    for (const field of ['title', 'short', 'summary', 'why', 'tips']) {
      assert.ok(locale[id]?.[field]?.trim(), `${id}: ${field} required`);
    }
    assert.ok(locale[id].tags?.length > 0, `${id}: tags required`);
  }
});
