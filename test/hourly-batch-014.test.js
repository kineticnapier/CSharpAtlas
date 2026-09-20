import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const expectedIds = [
  'memorymarshal-cast', 'sequencereader-delimited', 'dateonly-daynumber',
  'timeonly-between', 'uri-trycreate', 'httpclient-json',
  'json-naming-policy', 'filesystemwatcher-events', 'process-waitforexitasync',
  'regex-nonbacktracking'
];
const readJson = async path => JSON.parse(await fs.readFile(new URL(path, import.meta.url), 'utf8'));

test('hourly batch 014 contains ten diverse localized articles', async () => {
  const base = await readJson('../public/content/articles/hourly-batch-014.json');
  const ja = await readJson('../public/content/locales/ja/hourly-batch-014.json');
  const en = await readJson('../public/content/locales/en/hourly-batch-014.json');
  assert.deepEqual(base.map(x => x.id), expectedIds);
  assert.deepEqual(new Set(Object.keys(ja)), new Set(expectedIds));
  assert.deepEqual(new Set(Object.keys(en)), new Set(expectedIds));
  for (const a of base) {
    assert.ok(a.topics.length >= 2, `${a.id}: topics`);
    assert.ok(a.related.length >= 2, `${a.id}: related`);
  }
});

test('batch 014 is loaded while the learning map remains curated', async () => {
  const loader = await fs.readFile(new URL('../src/content-loader.js', import.meta.url), 'utf8');
  assert.match(loader, /hourly-batch-014\.json/);
  const map = await readJson('../public/content/learning-map.json');
  const mapped = map.chapters.flatMap(c => c.nodes.map(n => n.id));
  assert.ok(expectedIds.filter(id => mapped.includes(id)).length <= 3);
  const ids = new Set(mapped);
  for (const chapter of map.chapters) for (const node of chapter.nodes) {
    for (const p of node.prerequisites ?? []) assert.ok(ids.has(p), `${node.id}: missing prerequisite ${p}`);
    if (node.kind === 'support') assert.ok(ids.has(node.attachedTo), `${node.id}: missing attachedTo ${node.attachedTo}`);
  }
});

test('every learning-map main node has an explicit short code sample', async () => {
  const map = await readJson('../public/content/learning-map.json');
  const code = await readJson('../public/content/learning-map-code.json');
  const mainIds = map.chapters.flatMap(c => c.nodes).filter(n => n.kind !== 'support').map(n => n.id);
  assert.deepEqual(new Set(Object.keys(code)), new Set(mainIds));
  for (const id of mainIds) {
    assert.equal(typeof code[id], 'string', `${id}: code must be a string`);
    assert.ok(code[id].trim(), `${id}: code must not be empty`);
    assert.ok(code[id].split('\n').length <= 4, `${id}: code must be at most four lines`);
  }
});
