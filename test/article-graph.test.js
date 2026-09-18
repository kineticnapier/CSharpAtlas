import test from 'node:test';
import assert from 'node:assert/strict';
import { buildArticleGraph, extractWikiLinkIds } from '../src/article-graph.js';

test('extractWikiLinkIds finds wiki targets across localized article text', () => {
  const article = {
    short: 'See [[nullable]].',
    summary: 'Compare [[task|Task]] and [[nullable]].',
    why: 'Also [[operation-canceled]].',
    tips: null
  };

  assert.deepEqual(
    extractWikiLinkIds(article),
    ['nullable', 'task', 'operation-canceled']
  );
});

test('buildArticleGraph combines related and wiki edges without duplicating a pair', () => {
  const articles = [
    {
      id: 'a', type: 'concept', title: 'A', related: ['b'],
      summary: 'See [[b]] and [[c|C]].', short: '', why: '', tips: ''
    },
    { id: 'b', type: 'code', title: 'B', related: [], summary: '', short: '', why: '', tips: '' },
    { id: 'c', type: 'exception', title: 'C', related: [], summary: '', short: '', why: '', tips: '' }
  ];

  const graph = buildArticleGraph(articles, { type: 'all', edgeMode: 'both' });
  assert.equal(graph.nodes.length, 3);
  assert.deepEqual(graph.edges, [
    { source: 'a', target: 'b', kinds: ['related', 'wiki'] },
    { source: 'a', target: 'c', kinds: ['wiki'] }
  ]);
});

test('category graph keeps matching articles active and direct outside neighbors as ghosts', () => {
  const articles = [
    { id: 'a', type: 'concept', title: 'A', related: ['b'], summary: '', short: '', why: '', tips: '' },
    { id: 'b', type: 'code', title: 'B', related: ['c'], summary: '', short: '', why: '', tips: '' },
    { id: 'c', type: 'code', title: 'C', related: [], summary: '', short: '', why: '', tips: '' }
  ];

  const graph = buildArticleGraph(articles, { type: 'concept', edgeMode: 'related' });
  assert.deepEqual(graph.nodes, [
    { id: 'a', type: 'concept', title: 'A', ghost: false },
    { id: 'b', type: 'code', title: 'B', ghost: true }
  ]);
  assert.deepEqual(graph.edges, [
    { source: 'a', target: 'b', kinds: ['related'] }
  ]);
});

test('edge mode filters related and wiki links independently', () => {
  const articles = [
    {
      id: 'a', type: 'concept', title: 'A', related: ['b'],
      summary: 'See [[c]].', short: '', why: '', tips: ''
    },
    { id: 'b', type: 'code', title: 'B', related: [], summary: '', short: '', why: '', tips: '' },
    { id: 'c', type: 'code', title: 'C', related: [], summary: '', short: '', why: '', tips: '' }
  ];

  assert.deepEqual(
    buildArticleGraph(articles, { type: 'all', edgeMode: 'related' }).edges,
    [{ source: 'a', target: 'b', kinds: ['related'] }]
  );
  assert.deepEqual(
    buildArticleGraph(articles, { type: 'all', edgeMode: 'wiki' }).edges,
    [{ source: 'a', target: 'c', kinds: ['wiki'] }]
  );
});
