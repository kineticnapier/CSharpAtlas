import test from 'node:test';
import assert from 'node:assert/strict';
import { buildArticleGraph, extractWikiLinkIds } from '../src/article-graph.js';
import {
  cardDetailLevel,
  cardWorldSize,
  resolveCardCollisions,
  worldToScreen
} from '../src/graph-view.js';

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
      id: 'a', type: 'concept', title: 'A', related: ['b'], tags: ['alpha', 'beta'],
      summary: 'See [[b]] and [[c|C]].', short: 'Article A summary', why: '', tips: ''
    },
    { id: 'b', type: 'code', title: 'B', related: [], tags: [], summary: '', short: 'B summary', why: '', tips: '' },
    { id: 'c', type: 'exception', title: 'C', related: [], summary: '', short: '', why: '', tips: '' }
  ];

  const graph = buildArticleGraph(articles, { type: 'all', edgeMode: 'both' });
  assert.equal(graph.nodes.length, 3);
  assert.deepEqual(graph.nodes[0], {
    id: 'a', type: 'concept', title: 'A', short: 'Article A summary', tags: ['alpha', 'beta'], ghost: false
  });
  assert.deepEqual(graph.edges, [
    { source: 'a', target: 'b', kinds: ['related', 'wiki'] },
    { source: 'a', target: 'c', kinds: ['wiki'] }
  ]);
});

test('category graph keeps matching articles active and direct outside neighbors as ghosts', () => {
  const articles = [
    { id: 'a', type: 'concept', title: 'A', related: ['b'], tags: ['core'], summary: '', short: 'A short', why: '', tips: '' },
    { id: 'b', type: 'code', title: 'B', related: ['c'], tags: [], summary: '', short: 'B short', why: '', tips: '' },
    { id: 'c', type: 'code', title: 'C', related: [], summary: '', short: '', why: '', tips: '' }
  ];

  const graph = buildArticleGraph(articles, { type: 'concept', edgeMode: 'related' });
  assert.deepEqual(graph.nodes, [
    { id: 'a', type: 'concept', title: 'A', short: 'A short', tags: ['core'], ghost: false },
    { id: 'b', type: 'code', title: 'B', short: 'B short', tags: [], ghost: true }
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

test('article cards progressively reveal detail as the user zooms in', () => {
  assert.equal(cardDetailLevel(0.3, false), 'title');
  assert.equal(cardDetailLevel(0.8, false), 'summary');
  assert.equal(cardDetailLevel(1.4, false), 'full');
  assert.equal(cardDetailLevel(0.2, true), 'full');
});

test('selected cards are larger than ordinary floating cards', () => {
  const normal = cardWorldSize(false);
  const selected = cardWorldSize(true);
  assert.ok(normal.width > 100);
  assert.ok(normal.height > 50);
  assert.ok(selected.width > normal.width);
  assert.ok(selected.height > normal.height);
});

test('worldToScreen transforms plain coordinates without node animation metadata', () => {
  assert.deepEqual(
    worldToScreen(
      { x: 10, y: 20 },
      { width: 800, height: 600, panX: 5, panY: -4, scale: 2 }
    ),
    { x: 425, y: 336 }
  );
});

test('resolveCardCollisions separates overlapping article cards with padding', () => {
  const nodes = [
    { id: 'a', x: 0, y: 0 },
    { id: 'b', x: 60, y: 20 }
  ];
  resolveCardCollisions(nodes, { width: 188, height: 92, padding: 18, iterations: 8 });

  const dx = Math.abs(nodes[1].x - nodes[0].x);
  const dy = Math.abs(nodes[1].y - nodes[0].y);
  assert.ok(dx >= 206 || dy >= 110, `cards still overlap: dx=${dx}, dy=${dy}`);
});
