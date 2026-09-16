import test from 'node:test';
import assert from 'node:assert/strict';
import { matchesArticle } from '../src/article-search.js';

test('matches article id as well as visible metadata', () => {
  const item = {
    id: 'reference-equality',
    title: '参照の同一性と値の等価性を混同する',
    short: '中身が同じオブジェクトを同じものと判定できないことがある。',
    summary: 'class の既定の等価性について。',
    tags: ['class', '参照', '==']
  };

  assert.equal(matchesArticle(item, 'ref'), true);
  assert.equal(matchesArticle(item, '参照'), true);
  assert.equal(matchesArticle(item, 'zzzz'), false);
});
