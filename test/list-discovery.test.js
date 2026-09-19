import test from 'node:test';
import assert from 'node:assert/strict';
import {
  deriveArticleTopics,
  filterArticlesByTopics,
  filterArticlesByTypes,
  parseDiscoveryState,
  buildDiscoverySearch,
  sortArticles,
  toggleId,
  pushRecent
} from '../src/list-discovery.js';

test('topic classifier prefers explicit stable topics over inferred tags', () => {
  assert.deepEqual(
    deriveArticleTopics({ id: 'anything', type: 'code', tags: ['List', 'LINQ'], topics: ['async'] }),
    ['async']
  );
});

test('topic classifier keeps legacy inference as a fallback', () => {
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

test('type filtering uses OR semantics and an empty selection means all', () => {
  const articles = [
    { id: 'a', type: 'code' },
    { id: 'b', type: 'logic' },
    { id: 'c', type: 'concept' }
  ];

  assert.deepEqual(filterArticlesByTypes(articles, new Set()).map(x => x.id), ['a', 'b', 'c']);
  assert.deepEqual(
    filterArticlesByTypes(articles, new Set(['code', 'logic'])).map(x => x.id),
    ['a', 'b']
  );
});

test('discovery URL state parses shareable filters but ignores personal navigation state', () => {
  const state = parseDiscoveryState('?lang=en&q=async%20exception&type=logic&type=exception&topic=async&topic=exceptions&sort=title&favorites=1');

  assert.equal(state.query, 'async exception');
  assert.deepEqual([...state.types], ['logic', 'exception']);
  assert.deepEqual([...state.topics], ['async', 'exceptions']);
  assert.equal(state.sort, 'title');
  assert.equal('favoritesOnly' in state, false);
});

test('discovery URL serialization preserves language and omits default or personal state', () => {
  const search = buildDiscoverySearch({
    query: 'async exception',
    types: new Set(['logic', 'exception']),
    topics: new Set(['async', 'exceptions']),
    sort: 'title'
  }, '?lang=en&favorites=1');
  const params = new URLSearchParams(search);

  assert.equal(params.get('lang'), 'en');
  assert.equal(params.get('q'), 'async exception');
  assert.deepEqual(params.getAll('type'), ['logic', 'exception']);
  assert.deepEqual(params.getAll('topic'), ['async', 'exceptions']);
  assert.equal(params.get('sort'), 'title');
  assert.equal(params.has('favorites'), false);

  assert.equal(buildDiscoverySearch({ query: '', types: new Set(), topics: new Set(), sort: 'recommended' }), '');
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
