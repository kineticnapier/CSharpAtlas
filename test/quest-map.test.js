import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { buildQuestChapter, computeQuestLayout } from '../src/quest-map.js';

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
    }
  }
});

test('buildQuestChapter separates learning prerequisites from support branches', () => {
  const articles = [
    { id: 'a', type: 'concept', title: 'A', short: 'A' },
    { id: 'b', type: 'concept', title: 'B', short: 'B' },
    { id: 'err', type: 'exception', title: 'Err', short: 'Err' }
  ];
  const chapter = {
    id: 'demo',
    nodes: [
      { id: 'a' },
      { id: 'b', prerequisites: ['a'] },
      { id: 'err', kind: 'support', attachedTo: 'b' }
    ]
  };

  const graph = buildQuestChapter(articles, chapter);
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
