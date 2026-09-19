import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {
  buildQuestChapter,
  computeQuestLayout,
  reflowQuestLayout
} from '../src/quest-map.js';

async function readJson(path) {
  return JSON.parse(await fs.readFile(new URL(path, import.meta.url), 'utf8'));
}

async function allArticleIds() {
  const names = ['items', 'exceptions', 'compiler-errors', 'compiler-warnings', 'concepts', 'code-recipes', 'logic-errors'];
  const groups = await Promise.all(names.map(name => readJson(`../public/content/articles/${name}.json`)));
  return new Set(groups.flat().map(article => article.id));
}

test('learning map is curated into reusable chapters and only references real articles', async () => {
  const config = await readJson('../public/content/learning-map.json');
  const ids = await allArticleIds();

  assert.ok(config.chapters.length >= 6);
  for (const chapter of config.chapters) {
    assert.ok(chapter.id);
    assert.ok(chapter.title?.ja && chapter.title?.en);
    assert.ok(chapter.nodes.length >= 3, `${chapter.id} is too small`);
    for (const node of chapter.nodes) {
      assert.ok(ids.has(node.id), `unknown article in learning map: ${node.id}`);
      assert.ok(['main', 'support'].includes(node.kind ?? 'main'));
      if ((node.kind ?? 'main') === 'main') {
        assert.ok(String(node.code ?? '').trim(), `learning node has no representative code: ${node.id}`);
      }
    }
  }
});

test('buildQuestChapter separates learning prerequisites from support branches and carries representative code', () => {
  const articles = [
    { id: 'a', type: 'concept', title: 'A', short: 'A' },
    { id: 'b', type: 'concept', title: 'B', short: 'B' },
    { id: 'err', type: 'exception', title: 'Err', short: 'Err' }
  ];
  const chapter = {
    id: 'demo',
    nodes: [
      { id: 'a', code: 'int a = 10;' },
      { id: 'b', code: 'Console.WriteLine(a);', prerequisites: ['a'] },
      { id: 'err', kind: 'support', attachedTo: 'b' }
    ]
  };

  const graph = buildQuestChapter(articles, chapter);
  assert.equal(graph.nodes.find(node => node.id === 'a').code, 'int a = 10;');
  assert.deepEqual(graph.edges, [
    { source: 'a', target: 'b', kind: 'prerequisite' },
    { source: 'b', target: 'err', kind: 'support' }
  ]);
});

test('quest layout places later prerequisite depth further to the right', () => {
  const nodes = [
    { id: 'start', prerequisites: [] },
    { id: 'middle', prerequisites: ['start'] },
    { id: 'end', prerequisites: ['middle'] },
    { id: 'side', prerequisites: ['start'], lane: 2 }
  ];
  const layout = computeQuestLayout(nodes);
  const byId = new Map(layout.map(node => [node.id, node]));
  assert.ok(byId.get('middle').x > byId.get('start').x);
  assert.ok(byId.get('end').x > byId.get('middle').x);
  assert.notEqual(byId.get('middle').y, byId.get('side').y);
});

test('measured node sizes automatically push later depths and lanes out of the way', () => {
  const nodes = [
    { id: 'start', depth: 0, lane: 0, offsetY: 0 },
    { id: 'wide', depth: 1, lane: 0, offsetY: 0 },
    { id: 'next', depth: 2, lane: 0, offsetY: 0 },
    { id: 'below', depth: 1, lane: 1, offsetY: 0 }
  ];
  const measurements = new Map([
    ['start', { width: 220, height: 90 }],
    ['wide', { width: 360, height: 150 }],
    ['next', { width: 220, height: 90 }],
    ['below', { width: 220, height: 90 }]
  ]);

  const layout = reflowQuestLayout(nodes, measurements);
  const byId = new Map(layout.map(node => [node.id, node]));
  assert.equal(byId.get('wide').width, 360);
  assert.ok(byId.get('next').x >= byId.get('wide').x + byId.get('wide').width + 100);
  assert.ok(byId.get('below').y >= byId.get('wide').y + byId.get('wide').height + 40);
});

test('sparse lane numbers are packed within each depth instead of creating giant vertical gaps', () => {
  const nodes = [
    { id: 'root', depth: 0, lane: 0, kind: 'main', offsetY: 0 },
    { id: 'middle', depth: 1, lane: 0, kind: 'main', offsetY: 0 },
    { id: 'support-a', depth: 2, lane: 4, kind: 'support', offsetY: 0 },
    { id: 'support-b', depth: 2, lane: 7, kind: 'support', offsetY: 0 }
  ];
  const measurements = new Map([
    ['root', { width: 220, height: 150 }],
    ['middle', { width: 220, height: 150 }],
    ['support-a', { width: 180, height: 68 }],
    ['support-b', { width: 180, height: 68 }]
  ]);

  const layout = reflowQuestLayout(nodes, measurements);
  const byId = new Map(layout.map(node => [node.id, node]));
  assert.equal(byId.get('support-a').y, 110);
  assert.ok(byId.get('support-b').y >= byId.get('support-a').y + byId.get('support-a').height + 40);
  assert.ok(byId.get('support-b').y <= byId.get('support-a').y + byId.get('support-a').height + 48);
});
