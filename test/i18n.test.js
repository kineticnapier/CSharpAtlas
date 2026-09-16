import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveLocale, withLangParam, uiText } from '../src/i18n.js';

test('query locale overrides saved locale', () => {
  assert.equal(resolveLocale({ search: '?lang=en', storedLocale: 'ja' }), 'en');
});

test('invalid query locale falls back to valid saved locale', () => {
  assert.equal(resolveLocale({ search: '?lang=fr', storedLocale: 'en' }), 'en');
});

test('invalid locale values fall back to Japanese', () => {
  assert.equal(resolveLocale({ search: '', storedLocale: 'fr' }), 'ja');
});

test('withLangParam preserves other query parameters and hash', () => {
  assert.equal(
    withLangParam('/docs?x=1#/nullable', 'en'),
    '/docs?x=1&lang=en#/nullable'
  );
});

test('uiText returns localized labels', () => {
  assert.equal(uiText('ja', 'searchButton'), '検索');
  assert.equal(uiText('en', 'searchButton'), 'Search');
});
