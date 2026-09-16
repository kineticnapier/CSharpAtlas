import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
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
const visibleFields = [
  'id', 'type', 'title', 'short', 'summary', 'bad', 'good', 'code',
  'why', 'tips', 'tags', 'related'
];
const highlightFields = ['badHighlight', 'goodHighlight', 'codeHighlight'];
const noteFields = ['badNotes', 'goodNotes', 'codeNotes'];

async function json(file) {
  return JSON.parse(await readFile(file, 'utf8'));
}

function pick(object, keys) {
  return Object.fromEntries(keys.filter(key => key in object).map(key => [key, object[key]]));
}

test('split Japanese content reconstructs all legacy articles and annotations', async () => {
  const annotations = await json(path.join(contentDir, 'code-annotations.json'));
  let count = 0;

  for (const category of categories) {
    const legacy = await json(path.join(contentDir, category));
    const base = await json(path.join(contentDir, 'articles', category));
    const ja = await json(path.join(contentDir, 'locales', 'ja', category));
    const baseById = new Map(base.map(article => [article.id, article]));

    assert.equal(base.length, legacy.length, `${category}: article count changed`);

    for (const oldArticle of legacy) {
      const baseArticle = baseById.get(oldArticle.id);
      assert.ok(baseArticle, `${category}: missing base article ${oldArticle.id}`);
      const localeArticle = ja[oldArticle.id];
      assert.ok(localeArticle, `${category}: missing Japanese locale ${oldArticle.id}`);

      const reconstructed = { ...baseArticle, ...localeArticle };
      assert.deepEqual(
        pick(reconstructed, visibleFields),
        pick(oldArticle, visibleFields),
        `${oldArticle.id}: visible article content changed`
      );

      const annotation = annotations[oldArticle.id] ?? {};
      assert.deepEqual(
        pick(baseArticle, highlightFields),
        pick(annotation, highlightFields),
        `${oldArticle.id}: highlight metadata changed`
      );
      assert.deepEqual(
        pick(localeArticle, noteFields),
        pick(annotation, noteFields),
        `${oldArticle.id}: code note text changed`
      );
      count += 1;
    }
  }

  assert.equal(count, 100);
});
