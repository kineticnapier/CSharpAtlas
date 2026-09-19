import test from 'node:test';
import assert from 'node:assert/strict';
import { matchesArticle } from '../src/article-search.js';

test('matches article id and visible discovery metadata', () => {
  const item = {
    id: 'reference-equality',
    title: '参照の同一性と値の等価性を混同する',
    short: '中身が同じオブジェクトを同じものと判定できないことがある。',
    summary: 'class の既定の等価性について。',
    tags: ['class', '参照', '=='],
    topics: ['oop']
  };

  assert.equal(matchesArticle(item, 'ref'), true);
  assert.equal(matchesArticle(item, '参照'), true);
  assert.equal(matchesArticle(item, 'oop'), true);
  assert.equal(matchesArticle(item, 'zzzz'), false);
});

test('does not search article body summary from the list view', () => {
  const item = {
    id: 'sample',
    title: 'Sample',
    short: 'Short text',
    summary: 'body-only-secret',
    tags: [],
    topics: []
  };

  assert.equal(matchesArticle(item, 'body-only-secret'), false);
});
