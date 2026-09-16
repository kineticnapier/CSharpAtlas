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
const requiredText = ['title', 'short', 'summary', 'why', 'tips'];
const noteFields = ['badNotes', 'goodNotes', 'codeNotes'];

async function json(file) {
  return JSON.parse(await readFile(file, 'utf8'));
}

function assertCompleteLocale(entry, locale, id) {
  assert.ok(entry && typeof entry === 'object' && !Array.isArray(entry), `${locale}/${id}: missing entry`);
  for (const field of requiredText) {
    assert.equal(typeof entry[field], 'string', `${locale}/${id}: ${field} must be a string`);
    assert.ok(entry[field].trim(), `${locale}/${id}: ${field} must not be empty`);
  }
  assert.ok(Array.isArray(entry.tags), `${locale}/${id}: tags must be an array`);
  assert.ok(entry.tags.every(tag => typeof tag === 'string' && tag.trim()), `${locale}/${id}: tags must contain strings`);
}

test('Japanese and English locales completely cover every base article', async () => {
  let total = 0;

  for (const category of categories) {
    const base = await json(path.join(contentDir, 'articles', category));
    const ja = await json(path.join(contentDir, 'locales', 'ja', category));
    const en = await json(path.join(contentDir, 'locales', 'en', category));
    const ids = base.map(article => article.id).sort();

    assert.deepEqual(Object.keys(ja).sort(), ids, `${category}: Japanese IDs must match base IDs`);
    assert.deepEqual(Object.keys(en).sort(), ids, `${category}: English IDs must match base IDs`);

    for (const id of ids) {
      assertCompleteLocale(ja[id], 'ja', id);
      assertCompleteLocale(en[id], 'en', id);

      for (const noteField of noteFields) {
        if (!ja[id][noteField]) continue;
        assert.ok(en[id][noteField], `en/${id}: missing ${noteField}`);
        assert.deepEqual(
          Object.keys(en[id][noteField]).sort(),
          Object.keys(ja[id][noteField]).sort(),
          `en/${id}: ${noteField} line keys must match Japanese`
        );
        assert.ok(
          Object.values(en[id][noteField]).every(note => typeof note === 'string' && note.trim()),
          `en/${id}: ${noteField} must contain translated strings`
        );
      }
    }

    total += ids.length;
  }

  assert.equal(total, 100);
});
