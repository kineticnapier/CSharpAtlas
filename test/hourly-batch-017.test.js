import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const expectedIds = [
  'stringbuilder-getchunks', 'array-constrainedcopy', 'executioncontext-suppressflow',
  'memorymarshal-read-write', 'runtimehelpers-reference-contains', 'gc-memory-info',
  'json-serialize-utf8bytes', 'tarfile-create-directory', 'brotlistream-compress',
  'randomnumbergenerator-getint32'
];
const readJson = async path => JSON.parse(await fs.readFile(new URL(path, import.meta.url), 'utf8'));

test('hourly batch 017 contains ten diverse localized articles', async () => {
  const base = await readJson('../public/content/articles/hourly-batch-017.json');
  const ja = await readJson('../public/content/locales/ja/hourly-batch-017.json');
  const en = await readJson('../public/content/locales/en/hourly-batch-017.json');
  assert.deepEqual(base.map(x => x.id), expectedIds);
  assert.deepEqual(new Set(Object.keys(ja)), new Set(expectedIds));
  assert.deepEqual(new Set(Object.keys(en)), new Set(expectedIds));
  for (const a of base) { assert.ok(a.topics.length >= 2); assert.ok(a.related.length >= 2); }
});

test('batch 017 loader and learning map references stay valid', async () => {
  const loader = await fs.readFile(new URL('../src/content-loader.js', import.meta.url), 'utf8');
  assert.match(loader, /hourly-batch-017\.json/);
  const map = await readJson('../public/content/learning-map.json');
  const nodes = map.chapters.flatMap(c => c.nodes); const ids = new Set(nodes.map(n => n.id));
  assert.ok(expectedIds.filter(id => ids.has(id)).length <= 3);
  for (const n of nodes) { for (const p of n.prerequisites ?? []) assert.ok(ids.has(p)); if (n.kind === 'support') assert.ok(ids.has(n.attachedTo)); }
  const code = await readJson('../public/content/learning-map-code.json');
  const mains = nodes.filter(n => n.kind !== 'support').map(n => n.id);
  assert.deepEqual(new Set(Object.keys(code)), new Set(mains));
  for (const id of mains) { assert.ok(code[id].trim()); assert.ok(code[id].split('\n').length <= 4); }
});
