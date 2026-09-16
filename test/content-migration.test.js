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
const validTypes = new Set([
  'code',
  'exception',
  'compiler-error',
  'compiler-warning',
  'logic',
  'concept'
]);
const requiredLocaleText = ['title', 'short', 'summary', 'why', 'tips'];
const wikiPattern = /\[\[([^\]|]+)(?:\|[^\]]*)?\]\]/g;

async function json(file) {
  return JSON.parse(await readFile(file, 'utf8'));
}

async function loadCorpus() {
  const baseGroups = await Promise.all(categories.map(file => json(path.join(contentDir, 'articles', file))));
  const localeGroups = {};
  for (const locale of ['ja', 'en']) {
    const groups = await Promise.all(categories.map(file => json(path.join(contentDir, 'locales', locale, file))));
    localeGroups[locale] = Object.assign({}, ...groups);
  }
  return { base: baseGroups.flat(), locales: localeGroups };
}

function wikiTargets(entry) {
  const targets = [];
  for (const field of ['short', 'summary', 'why', 'tips']) {
    const text = String(entry[field] ?? '');
    for (const match of text.matchAll(wikiPattern)) targets.push(match[1].trim());
  }
  return targets;
}

test('localized article corpus has valid IDs, types, fields, and links', async () => {
  const { base, locales } = await loadCorpus();
  const ids = new Set();
  const missingTargets = [];

  for (const article of base) {
    assert.equal(typeof article.id, 'string');
    assert.ok(article.id.trim(), 'article id must not be empty');
    assert.equal(ids.has(article.id), false, `duplicate article id: ${article.id}`);
    ids.add(article.id);
    assert.ok(validTypes.has(article.type), `${article.id}: unknown type ${article.type}`);
    assert.ok(Array.isArray(article.related), `${article.id}: related must be an array`);
    for (const field of ['bad', 'good', 'code']) {
      assert.ok(article[field] === null || typeof article[field] === 'string', `${article.id}: ${field} must be string or null`);
    }
  }

  for (const article of base) {
    for (const target of article.related) {
      assert.notEqual(target, article.id, `${article.id}: self-related link`);
      if (!ids.has(target)) missingTargets.push(`${article.id}: missing related target ${target}`);
    }
  }

  for (const locale of ['ja', 'en']) {
    const entries = locales[locale];
    assert.deepEqual(new Set(Object.keys(entries)), ids, `${locale}: locale IDs differ from base IDs`);
    const titles = new Map();

    for (const article of base) {
      const entry = entries[article.id];
      for (const field of requiredLocaleText) {
        assert.equal(typeof entry[field], 'string', `${locale}/${article.id}: ${field} must be a string`);
        assert.ok(entry[field].trim(), `${locale}/${article.id}: ${field} must not be empty`);
      }
      assert.ok(Array.isArray(entry.tags), `${locale}/${article.id}: tags must be an array`);
      assert.ok(entry.tags.every(tag => typeof tag === 'string'), `${locale}/${article.id}: tags must contain strings`);

      const normalizedTitle = entry.title.trim().toLocaleLowerCase(locale === 'en' ? 'en' : 'ja');
      assert.equal(titles.has(normalizedTitle), false, `${locale}: duplicate title ${entry.title}`);
      titles.set(normalizedTitle, article.id);

      for (const target of wikiTargets(entry)) {
        assert.notEqual(target, article.id, `${locale}/${article.id}: self wiki link`);
        if (!ids.has(target)) missingTargets.push(`${locale}/${article.id}: missing wiki target ${target}`);
      }
    }
  }

  assert.deepEqual(missingTargets, [], `broken article links:\n${missingTargets.join('\n')}`);
  assert.ok(base.length >= 100, 'i18n foundation must preserve at least the original 100 articles');
});
