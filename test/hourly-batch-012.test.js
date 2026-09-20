import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const expectedIds = [
  'frozenset-readmostly',
  'priorityqueue-minheap',
  'task-completionsource-async-continuations',
  'parallel-foreachasync-bounded',
  'searchvalues-span',
  'xmlreader-streaming',
  'incrementalhash-stream',
  'aesgcm-authenticated-encryption',
  'random-shared',
  'conditionalweaktable-metadata'
];

async function readJson(path) {
  return JSON.parse(await fs.readFile(new URL(path, import.meta.url), 'utf8'));
}

test('hourly batch 012 contains ten diverse localized articles', async () => {
  const base = await readJson('../public/content/articles/hourly-batch-012.json');
  const ja = await readJson('../public/content/locales/ja/hourly-batch-012.json');
  const en = await readJson('../public/content/locales/en/hourly-batch-012.json');
  assert.deepEqual(base.map(x => x.id), expectedIds);
  assert.deepEqual(new Set(Object.keys(ja)), new Set(expectedIds));
  assert.deepEqual(new Set(Object.keys(en)), new Set(expectedIds));
  for (const article of base) {
    assert.ok(article.topics.length >= 2, `${article.id}: topics`);
    assert.ok(article.related.length >= 2, `${article.id}: related`);
  }
});

test('batch 012 is loaded while the learning map remains curated', async () => {
  const loader = await fs.readFile(new URL('../src/content-loader.js', import.meta.url), 'utf8');
  assert.match(loader, /hourly-batch-012\.json/);
  const map = await readJson('../public/content/learning-map.json');
  const mappedIds = map.chapters.flatMap(chapter => chapter.nodes.map(node => node.id));
  const mappedFromBatch = expectedIds.filter(id => mappedIds.includes(id));
  assert.ok(mappedFromBatch.length <= 3, 'a content batch must not be copied wholesale into the curated learning map');
});
