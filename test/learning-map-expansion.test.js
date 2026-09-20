import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

async function readJson(path) {
  return JSON.parse(await fs.readFile(new URL(path, import.meta.url), 'utf8'));
}

const EXPECTED_BY_CHAPTER = {
  'types-oop': [
    'required-members',
    'generic-constraints-design',
    'record-with-expression',
    'equality-comparer-design'
  ],
  'collections-linq': [
    'enumerable-distinctby',
    'linq-countby',
    'enumerable-chunk-batching',
    'multiple-enumeration-side-effects'
  ],
  'exceptions-debugging': [
    'exception-filters',
    'exception-dispatch-info-rethrow',
    'cs8602-possible-null'
  ],
  'io-network': [
    'httpclient-reuse',
    'file-stream-async',
    'readexactly-stream',
    'json-source-generation',
    'jsondocument-dispose',
    'json-case-sensitive-properties'
  ],
  'async-concurrency': [
    'task-whenall-results',
    'semaphore-slim-limit',
    'async-enumerable-streaming',
    'cancellation-timeout',
    'synchronization-context',
    'fire-and-forget-task',
    'task-result-sync-blocking'
  ],
  practical: [
    'span-slicing',
    'memory-buffer',
    'timeprovider-testable-time',
    'regex-source-generator',
    'rune-unicode-scalar'
  ]
};

const EXPECTED_SUPPORTS = new Map([
  ['multiple-enumeration-side-effects', 'linq-deferred'],
  ['cs8602-possible-null', 'nullable'],
  ['json-case-sensitive-properties', 'json-write'],
  ['fire-and-forget-task', 'async-await'],
  ['task-result-sync-blocking', 'async-await']
]);

test('learning map includes a curated cross-section of expansion articles', async () => {
  const config = await readJson('../public/content/learning-map.json');
  const chapters = new Map(config.chapters.map(chapter => [chapter.id, chapter]));

  for (const [chapterId, expectedIds] of Object.entries(EXPECTED_BY_CHAPTER)) {
    const chapter = chapters.get(chapterId);
    assert.ok(chapter, `missing chapter ${chapterId}`);
    const ids = new Set(chapter.nodes.map(node => node.id));
    for (const id of expectedIds) {
      assert.ok(ids.has(id), `${chapterId} is missing curated expansion article ${id}`);
    }
  }
});

test('newly curated failure articles are support branches on the relevant concept', async () => {
  const config = await readJson('../public/content/learning-map.json');
  const nodes = config.chapters.flatMap(chapter => chapter.nodes.map(node => ({ chapter: chapter.id, ...node })));

  for (const [id, attachedTo] of EXPECTED_SUPPORTS) {
    const node = nodes.find(candidate => candidate.id === id);
    assert.ok(node, `missing support node ${id}`);
    assert.equal(node.kind, 'support', `${id} must be a support node`);
    assert.equal(node.attachedTo, attachedTo, `${id} should attach to ${attachedTo}`);
    const chapter = config.chapters.find(candidate => candidate.id === node.chapter);
    assert.ok(chapter.nodes.some(candidate => candidate.id === attachedTo), `${attachedTo} must exist in the same chapter as ${id}`);
  }
});
