import test from 'node:test';
import assert from 'node:assert/strict';
import {
  deriveArticleTopics,
  filterArticlesByTopics,
  sortArticles,
  toggleId,
  pushRecent
} from '../src/list-discovery.js';

test('topic classifier normalizes raw tags into stable topic ids', () => {
  assert.deepEqual(
    deriveArticleTopics({ id: 'nullable', type: 'concept', tags: ['null', 'nullable', '?'] }),
    ['null']
  );

  assert.deepEqual(
    deriveArticleTopics({ id: 'list-filter', type: 'code', tags: ['List', 'Where', 'LINQ'] }),
    ['collections', 'linq']
  );

  assert.deepEqual(
    deriveArticleTopics({ id: 'http-get', type: 'code', tags: ['HttpClient', 'HTTP', 'GET'] }),
    ['network']
  );
});

test('topic filtering uses OR semantics within selected topics', () => {
  const articles = [
    { id: 'a', topics: ['linq'] },
    { id: 'b', topics: ['async'] },
    { id: 'c', topics: ['io'] }
  ];
  assert.deepEqual(
    filterArticlesByTopics(articles, new Set(['linq', 'async'])).map(x => x.id),
    ['a', 'b']
  );
});

test('sorting supports title, recent, and favorite-first modes', () => {
  const articles = [
    { id: 'b', title: 'Beta' },
    { id: 'a', title: 'Alpha' },
    { id: 'c', title: 'Gamma' }
  ];
  assert.deepEqual(sortArticles(articles, 'title').map(x => x.id), ['a', 'b', 'c']);
  assert.deepEqual(sortArticles(articles, 'recent', { recentIds: ['c', 'a'] }).map(x => x.id), ['c', 'a', 'b']);
  assert.deepEqual(sortArticles(articles, 'favorites', { favoriteIds: new Set(['b']) }).map(x => x.id), ['b', 'a', 'c']);
});

test('favorite toggles and recent history stays unique and bounded', () => {
  assert.deepEqual([...toggleId(new Set(['a']), 'a')], []);
  assert.deepEqual([...toggleId(new Set(['a']), 'b')], ['a', 'b']);
  assert.deepEqual(pushRecent(['b', 'a', 'c'], 'a', 3), ['a', 'b', 'c']);
  assert.deepEqual(pushRecent(['b', 'c', 'd'], 'a', 3), ['a', 'b', 'c']);
});
