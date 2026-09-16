import test from 'node:test';
import assert from 'node:assert/strict';
import { CONTENT_CATEGORIES, loadLocalizedContent } from '../src/content-loader.js';

function completeLocale(title) {
  return {
    title,
    short: `${title} short`,
    summary: `${title} summary`,
    why: `${title} why`,
    tips: `${title} tips`,
    tags: ['nullable']
  };
}

function makeFetch({ includeEnglish = true } = {}) {
  const calls = [];
  const data = new Map();
  for (const file of CONTENT_CATEGORIES) {
    data.set(`./content/articles/${file}`, []);
    data.set(`./content/locales/ja/${file}`, {});
    data.set(`./content/locales/en/${file}`, {});
  }
  data.set('./content/articles/items.json', [{
    id: 'nullable', type: 'concept', bad: null, good: null,
    code: 'string? value = null;', related: []
  }]);
  data.set('./content/locales/ja/items.json', {
    nullable: completeLocale('null と nullable 参照型')
  });
  if (includeEnglish) {
    data.set('./content/locales/en/items.json', {
      nullable: completeLocale('Null and nullable reference types')
    });
  }
  const fetchJson = async path => {
    calls.push(path);
    if (!data.has(path)) throw new Error(`Unexpected path: ${path}`);
    return data.get(path);
  };
  return { fetchJson, calls };
}

test('loads localized content from split category files', async () => {
  const { fetchJson } = makeFetch();
  const result = await loadLocalizedContent({ fetchJson, locale: 'en' });
  assert.equal(result.requestedLocale, 'en');
  assert.equal(result.articles.length, 1);
  assert.equal(result.articles[0].title, 'Null and nullable reference types');
  assert.equal(result.articles[0].isFallback, false);
});

test('falls back to Japanese when requested article translation is absent', async () => {
  const { fetchJson } = makeFetch({ includeEnglish: false });
  const result = await loadLocalizedContent({ fetchJson, locale: 'en' });
  assert.equal(result.articles[0].title, 'null と nullable 参照型');
  assert.equal(result.articles[0].isFallback, true);
});

test('does not fetch Japanese locale twice when Japanese is requested', async () => {
  const { fetchJson, calls } = makeFetch();
  await loadLocalizedContent({ fetchJson, locale: 'ja' });
  const jaCalls = calls.filter(path => path.includes('/locales/ja/'));
  assert.equal(jaCalls.length, CONTENT_CATEGORIES.length);
});
