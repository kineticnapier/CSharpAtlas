import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { CONTENT_CATEGORIES } from '../src/content-loader.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BATCHES = [
  { file: 'hourly-batch-001.json', ids: new Set(['frozen-dictionary-read-mostly','configureawait-library-code','iasyncdisposable-await-using','regex-source-generator','checked-overflow-context']) },
  { file: 'hourly-batch-002.json', ids: new Set(['priorityqueue-min-heap','immutablearray-snapshot','random-shared-concurrent','argumentnullexception-throwifnull','task-waitasync-timeout','string-create-formatting','record-with-expression','async-lock-semaphoreslim','linq-any-before-enumeration','stream-position-after-read']) },
  { file: 'hourly-batch-003.json', ids: new Set(['arraypool-rent-return','timeprovider-testable-time','caller-argument-expression','exception-dispatch-info-rethrow','utf8jsonwriter-streaming','lazy-thread-safe-initialization','lock-scope-minimize','arraypool-return-finally','stream-read-partial-buffer','task-run-async-io']) },
  { file: 'hourly-batch-004.json', ids: new Set(['activitysource-tracing','linked-cancellation-token','valuetask-single-consumption','interlocked-counter','collections-marshal-span','searchvalues-repeated-search','composite-format-reuse','guid-create-version7','task-wheneach-completion-order','cancellation-token-register-dispose']) },
  { file: 'hourly-batch-005.json', ids: new Set(['frozen-set-read-mostly','system-threading-lock','pipereader-consume-buffer','json-source-generation','memorycache-size-limit','enumerable-chunk-batching','parallel-foreachasync','objectpool-reuse','channel-trywrite-backpressure','stringbuilder-clear-reuse']) },
  { file: 'hourly-batch-006.json', ids: new Set(['trygetnonenumeratedcount','collections-marshal-value-ref','taskcompletionsource-runasync','async-enumerable-withcancellation','convert-tryfrombase64string','sequenceequal-span-comparison','dictionary-ensure-capacity','gc-allocate-uninitialized-array','stream-copytoasync','cancellationtokensource-cancelafter']) },
  { file: 'hourly-batch-007.json', ids: new Set(['randomaccess-offset-io','conditionalweaktable-metadata','array-binarysearch-sorted','file-options-sequentialscan','configureawait-suppress-throwing','jsondocument-dispose','memory-owner-dispose','stopwatch-getelapsedtime','collections-marshal-setcount','cancellation-token-throwifrequested']) }
];

async function json(...parts) { return JSON.parse(await readFile(path.join(root, ...parts), 'utf8')); }

for (const batch of BATCHES) {
  test(`${batch.file} adds exactly its approved fully localized articles`, async () => {
    assert.ok(CONTENT_CATEGORIES.includes(batch.file), `${batch.file} must be loaded`);
    const [base, ja, en] = await Promise.all([
      json('public', 'content', 'articles', batch.file),
      json('public', 'content', 'locales', 'ja', batch.file),
      json('public', 'content', 'locales', 'en', batch.file)
    ]);
    assert.equal(base.length, batch.ids.size);
    assert.deepEqual(new Set(base.map(x => x.id)), batch.ids);
    assert.deepEqual(new Set(Object.keys(ja)), batch.ids);
    assert.deepEqual(new Set(Object.keys(en)), batch.ids);
    for (const article of base) {
      assert.ok(Array.isArray(article.topics) && article.topics.length > 0, `${article.id}: topics required`);
      assert.ok(Array.isArray(article.related) && article.related.length > 0, `${article.id}: related required`);
    }
    for (const locale of [ja, en]) for (const id of batch.ids) {
      for (const field of ['title', 'short', 'summary', 'why', 'tips']) assert.ok(locale[id]?.[field]?.trim(), `${id}: ${field} required`);
      assert.ok(locale[id].tags?.length > 0, `${id}: tags required`);
    }
  });
}
