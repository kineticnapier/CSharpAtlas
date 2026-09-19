import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { CONTENT_CATEGORIES, normalizeContentGroup } from '../src/content-loader.js';

const EXPANSION_FILE = 'advanced-expansion.json';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const basePath = path.join(root, 'public', 'content', 'articles', EXPANSION_FILE);
const jaPath = path.join(root, 'public', 'content', 'locales', 'ja', EXPANSION_FILE);
const enPath = path.join(root, 'public', 'content', 'locales', 'en', EXPANSION_FILE);

const EXPECTED_IDS = new Set([
  'span-slicing', 'memory-buffer', 'ref-out-in-parameters', 'yield-return-streaming', 'async-enumerable-streaming',
  'semaphore-slim-limit', 'datetimeoffset-conversion', 'httpclient-reuse', 'json-options-web', 'file-stream-async',
  'bounded-channel-producer-consumer', 'concurrent-dictionary-update', 'periodic-timer-loop', 'task-whenall-results', 'cancellation-timeout',
  'span-vs-memory', 'ref-struct-lifetime', 'generic-constraints-design', 'required-members', 'collection-expression-syntax',
  'valuetask-guidance', 'cancellation-cooperation', 'synchronization-context', 'exception-filters', 'datetime-kind-model',
  'equality-comparer-design', 'variance-generic-interfaces',
  'async-select-not-awaited', 'modify-list-during-foreach', 'fire-and-forget-task', 'task-result-sync-blocking', 'ignored-cancellation-token',
  'semaphore-release-finally', 'multiple-enumeration-side-effects', 'disposable-ownership', 'datetime-unspecified-kind', 'culture-sensitive-string-comparison',
  'json-case-sensitive-properties', 'concurrent-dictionary-factory-repeat', 'whenall-failure-observation',
  'http-request-failure', 'json-deserialize-invalid', 'channel-closed-read', 'aggregate-task-failure',
  'cs0120-instance-member', 'cs0165-unassigned-local', 'cs0266-explicit-conversion', 'cs1503-argument-type',
  'cs8602-possible-null', 'cs8618-nonnullable-init'
]);

async function json(file) {
  return JSON.parse(await readFile(file, 'utf8'));
}

test('50-article expansion shard is part of the content corpus', () => {
  assert.ok(CONTENT_CATEGORIES.includes(EXPANSION_FILE));
});

test('expansion shard contains exactly the approved 50 localized articles', async () => {
  assert.equal(existsSync(basePath), true, 'base expansion shard must exist');
  assert.equal(existsSync(jaPath), true, 'Japanese expansion locale must exist');
  assert.equal(existsSync(enPath), true, 'English expansion locale must exist');

  const [rawBase, rawJa, rawEn] = await Promise.all([json(basePath), json(jaPath), json(enPath)]);
  const base = normalizeContentGroup(EXPANSION_FILE, rawBase);
  const ja = normalizeContentGroup(EXPANSION_FILE, rawJa);
  const en = normalizeContentGroup(EXPANSION_FILE, rawEn);
  const ids = new Set(base.map(article => article.id));

  assert.equal(base.length, 50);
  assert.equal(EXPECTED_IDS.size, 50);
  assert.deepEqual(ids, EXPECTED_IDS);
  assert.deepEqual(new Set(Object.keys(ja)), EXPECTED_IDS);
  assert.deepEqual(new Set(Object.keys(en)), EXPECTED_IDS);

  const typeCounts = {};
  for (const article of base) {
    typeCounts[article.type] = (typeCounts[article.type] ?? 0) + 1;
    assert.ok(Array.isArray(article.related), `${article.id}: related must be an array`);
    assert.ok(Array.isArray(article.topics) && article.topics.length > 0, `${article.id}: topics required`);
    for (const target of article.related) assert.ok(EXPECTED_IDS.has(target), `${article.id}: unknown related ${target}`);
  }
  assert.deepEqual(typeCounts, {
    code: 15,
    concept: 12,
    logic: 13,
    exception: 4,
    'compiler-error': 4,
    'compiler-warning': 2
  });

  for (const locale of [ja, en]) {
    for (const id of EXPECTED_IDS) {
      const entry = locale[id];
      for (const field of ['title', 'short', 'summary', 'why', 'tips']) {
        assert.equal(typeof entry[field], 'string', `${id}: ${field} must be a string`);
        assert.ok(entry[field].trim(), `${id}: ${field} must not be empty`);
      }
      assert.ok(Array.isArray(entry.tags) && entry.tags.length > 0, `${id}: tags required`);
    }
  }
});
