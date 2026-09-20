import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { buildQuestChapter } from '../src/quest-map.js';

async function readJson(path) {
  return JSON.parse(await fs.readFile(new URL(path, import.meta.url), 'utf8'));
}

const EXPECTED_BY_CHAPTER = {
  basics: [
    'checked-overflow-context',
    'caller-argument-expression',
    'argumentnullexception-throwifnull'
  ],
  'types-oop': [
    'required-members',
    'generic-constraints-design',
    'record-with-expression',
    'equality-comparer-design',
    'ref-out-in-parameters',
    'variance-generic-interfaces',
    'span-vs-memory',
    'collections-marshal-value-ref',
    'iparsable-generic-parsing'
  ],
  'collections-linq': [
    'enumerable-distinctby',
    'linq-countby',
    'linq-aggregateby',
    'enumerable-chunk-batching',
    'priorityqueue-min-heap',
    'frozen-dictionary-read-mostly',
    'frozen-set-read-mostly',
    'immutablearray-snapshot',
    'alternate-lookup-span-key',
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
    'stream-copytoasync',
    'randomaccess-offset-io',
    'memorymappedfile-view',
    'json-source-generation',
    'jsondocument-dispose',
    'jsonnode-mutable-dom',
    'utf8jsonwriter-streaming',
    'http-completion-responseheadersread',
    'json-case-sensitive-properties'
  ],
  'async-concurrency': [
    'task-whenall-results',
    'task-wheneach-completion-order',
    'task-waitasync-timeout',
    'semaphore-slim-limit',
    'async-enumerable-streaming',
    'async-enumerable-withcancellation',
    'cancellation-timeout',
    'linked-cancellation-token',
    'taskcompletionsource-runasync',
    'parallel-foreachasync',
    'channel-trywrite-backpressure',
    'synchronization-context',
    'configureawait-library-code',
    'fire-and-forget-task',
    'task-result-sync-blocking'
  ],
  practical: [
    'span-slicing',
    'memory-buffer',
    'arraypool-rent-return',
    'timeprovider-testable-time',
    'regex-source-generator',
    'searchvalues-repeated-search',
    'rune-unicode-scalar',
    'convert-tohexstring',
    'bitoperations-popcount',
    'guid-create-version7'
  ]
};

const EXPECTED_SUPPORTS = new Map([
  ['multiple-enumeration-side-effects', 'linq-deferred'],
  ['cs8602-possible-null', 'nullable'],
  ['json-case-sensitive-properties', 'json-write'],
  ['fire-and-forget-task', 'async-await'],
  ['task-result-sync-blocking', 'async-await']
]);

test('learning map includes a broad curated cross-section of the expanded corpus', async () => {
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

test('learning map is substantial enough for the expanded corpus', async () => {
  const config = await readJson('../public/content/learning-map.json');
  const ids = new Set(config.chapters.flatMap(chapter => chapter.nodes.map(node => node.id)));
  assert.ok(ids.size >= 140, `expected at least 140 unique mapped articles, got ${ids.size}`);
  for (const chapter of config.chapters) {
    assert.ok(chapter.nodes.length >= 15, `${chapter.id} is still too sparse (${chapter.nodes.length} nodes)`);
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

test('main learning nodes require explicit map code', () => {
  const article = { id: 'sample', type: 'code', title: 'Sample', short: 'Sample', code: 'Console.WriteLine(42);' };
  const withoutCode = buildQuestChapter([article], { id: 'chapter', nodes: [{ id: 'sample' }] });
  const withCode = buildQuestChapter([article], { id: 'chapter', nodes: [{ id: 'sample', code: 'Console.WriteLine("map");' }] });
  assert.equal(withoutCode.nodes[0].code, '');
  assert.equal(withCode.nodes[0].code, 'Console.WriteLine("map");');
});
