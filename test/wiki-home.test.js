import test from 'node:test';
import assert from 'node:assert/strict';
import { buildWikiHomeSections, shouldShowWikiHome } from '../src/wiki-home.js';

function article(id, type, topics = []) {
  return { id, type, topics, title: id, short: `${id} short` };
}

const ARTICLES = [
  article('program-entry', 'concept', ['basics']),
  article('variables-assignment', 'concept', ['basics']),
  article('if-else', 'concept', ['basics']),
  article('methods-parameters-returns', 'concept', ['basics']),
  article('nullref', 'exception', ['nullability']),
  article('index-out-of-range', 'exception', ['collections']),
  article('cs0103-name-not-found', 'compiler-error', ['basics']),
  article('floating-equality', 'logic', ['basics']),
  article('httpclient-reuse', 'code', ['networking']),
  article('json-source-generation', 'code', ['json']),
  article('task-whenall-results', 'code', ['async']),
  article('frozen-dictionary-read-mostly', 'code', ['collections']),
  article('regex-source-generator', 'code', ['text']),
  article('guid-create-version7', 'code', ['practical']),
  article('latest-one', 'concept', ['practical']),
  article('latest-two', 'code', ['practical'])
];

test('wiki home builds curated and data-driven sections', () => {
  const home = buildWikiHomeSections(ARTICLES);

  assert.equal(home.featured.length, 4);
  assert.deepEqual(home.beginner.map(item => item.id), [
    'program-entry',
    'variables-assignment',
    'if-else',
    'methods-parameters-returns'
  ]);
  assert.deepEqual(home.newest.map(item => item.id), [
    'latest-two',
    'latest-one',
    'guid-create-version7',
    'regex-source-generator',
    'frozen-dictionary-read-mostly',
    'task-whenall-results'
  ]);
  assert.ok(home.commonErrors.every(item => ['exception', 'compiler-error', 'compiler-warning', 'logic'].includes(item.type)));
  assert.ok(home.categories.some(category => category.type === 'code' && category.count === 8));
  assert.ok(home.categories.some(category => category.type === 'concept' && category.count === 6));
});

test('wiki home only shows for an unfiltered landing state', () => {
  assert.equal(shouldShowWikiHome({ query: '', types: new Set(), topics: new Set(), favoritesOnly: false, recentOnly: false }), true);
  assert.equal(shouldShowWikiHome({ query: 'json', types: new Set(), topics: new Set(), favoritesOnly: false, recentOnly: false }), false);
  assert.equal(shouldShowWikiHome({ query: '', types: new Set(['code']), topics: new Set(), favoritesOnly: false, recentOnly: false }), false);
  assert.equal(shouldShowWikiHome({ query: '', types: new Set(), topics: new Set(['json']), favoritesOnly: false, recentOnly: false }), false);
  assert.equal(shouldShowWikiHome({ query: '', types: new Set(), topics: new Set(), favoritesOnly: true, recentOnly: false }), false);
});
