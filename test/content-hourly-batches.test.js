import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { CONTENT_CATEGORIES } from '../src/content-loader.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BATCHES = CONTENT_CATEGORIES.filter(file => file.startsWith('hourly-batch-'));

async function json(...parts) { return JSON.parse(await readFile(path.join(root, ...parts), 'utf8')); }

for (const file of BATCHES) {
  test(`${file} contains a complete localized batch`, async () => {
    const [base, ja, en] = await Promise.all([
      json('public', 'content', 'articles', file),
      json('public', 'content', 'locales', 'ja', file),
      json('public', 'content', 'locales', 'en', file)
    ]);
    const ids = base.map(article => article.id);
    assert.ok(ids.length > 0, `${file}: articles required`);
    assert.equal(new Set(ids).size, ids.length, `${file}: duplicate ids`);
    assert.deepEqual(new Set(Object.keys(ja)), new Set(ids));
    assert.deepEqual(new Set(Object.keys(en)), new Set(ids));
    for (const article of base) {
      assert.ok(Array.isArray(article.topics) && article.topics.length > 0, `${article.id}: topics required`);
      assert.ok(Array.isArray(article.related) && article.related.length > 0, `${article.id}: related required`);
    }
    for (const locale of [ja, en]) for (const id of ids) {
      for (const field of ['title', 'short', 'summary', 'why', 'tips']) assert.ok(locale[id]?.[field]?.trim(), `${id}: ${field} required`);
      assert.ok(locale[id].tags?.length > 0, `${id}: tags required`);
    }
  });
}
