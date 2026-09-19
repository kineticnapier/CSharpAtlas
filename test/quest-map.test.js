import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {
  buildQuestChapter,
  computeQuestLayout,
  extractSupportSnippet,
  reflowQuestLayout,
  routeQuestEdgePoints
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
    { id: 'err', type: 'exception', title: 'Err', short: 'Err', bad: 'object value = "123";\nint number = (int)value;', badHighlight: [2] }
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
  assert.equal(graph.nodes.find(node => node.id === 'err').code, 'object value = "123";\nint number = (int)value;');
  assert.deepEqual(graph.edges, [
    { source: 'a', target: 'b', kind: 'prerequisite' },
    { source: 'b', target: 'err', kind: 'support' }
  ]);
});

test('support snippets keep just enough code around the failing line', () => {
  assert.equal(extractSupportSnippet({
    bad: 'var stream = new MemoryStream();\nstream.Dispose();\nstream.WriteByte(1);',
    badHighlight: [3]
  }), 'var stream = new MemoryStream();\nstream.Dispose();\nstream.WriteByte(1);');

  assert.equal(extractSupportSnippet({
    bad: 'File.WriteAllText("logs/today.txt", "hello");',
    badHighlight: [1]
  }), 'File.WriteAllText("logs/today.txt", "hello");');

  assert.equal(extractSupportSnippet({
    code: 'line1\nline2\nline3\nline4\nline5'
  }), 'line1\nline2\nline3\nline4');
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

test('connected nodes are reordered within a depth to reduce avoidable edge crossings', () => {
  const nodes = [
    { id: 'a', depth: 0, lane: 0, kind: 'main', prerequisites: [] },
    { id: 'b', depth: 0, lane: 1, kind: 'main', prerequisites: [] },
    { id: 'c', depth: 1, lane: 0, kind: 'main', prerequisites: ['b'] },
    { id: 'd', depth: 1, lane: 1, kind: 'main', prerequisites: ['a'] }
  ];

  const layout = reflowQuestLayout(nodes);
  const byId = new Map(layout.map(node => [node.id, node]));
  assert.ok(byId.get('d').y < byId.get('c').y);
});

test('orthogonal edge routing goes around boxes in skipped depths', () => {
  const source = { id: 'source', depth: 0, x: 120, y: 220, width: 220, height: 100 };
  const blocker = { id: 'blocker', depth: 1, x: 450, y: 160, width: 260, height: 180 };
  const target = { id: 'target', depth: 2, x: 820, y: 240, width: 220, height: 100 };
  const points = routeQuestEdgePoints(source, target, [source, blocker, target]);

  assert.ok(points.length >= 4);
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    assert.ok(a.x === b.x || a.y === b.y, 'edge segment must be orthogonal');
    const crossesBlocker = a.y === b.y
      ? a.y > blocker.y && a.y < blocker.y + blocker.height && Math.max(a.x, b.x) > blocker.x && Math.min(a.x, b.x) < blocker.x + blocker.width
      : a.x > blocker.x && a.x < blocker.x + blocker.width && Math.max(a.y, b.y) > blocker.y && Math.min(a.y, b.y) < blocker.y + blocker.height;
    assert.equal(crossesBlocker, false, 'edge must not cross another node box');
  }
});
