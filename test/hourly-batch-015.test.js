import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const expectedIds = [
  'filestream-options-buffering', 'utf8jsonreader-token-loop',
  'cryptographicoperations-fixedtimeequals', 'volatile-read-write',
  'readerwriterlockslim-read-write', 'arraybufferwriter-growth',
  'pipewriter-flush-complete', 'enum-getvalues-generic',
  'comparer-create-custom-order', 'sha256-hashdata-span'
];
const readJson = async path => JSON.parse(await fs.readFile(new URL(path, import.meta.url), 'utf8'));

test('hourly batch 015 contains ten diverse localized articles', async () => {
  const base = await readJson('../public/content/articles/hourly-batch-015.json');
  const ja = await readJson('../public/content/locales/ja/hourly-batch-015.json');
  const en = await readJson('../public/content/locales/en/hourly-batch-015.json');
  assert.deepEqual(base.map(x => x.id), expectedIds);
  assert.deepEqual(new Set(Object.keys(ja)), new Set(expectedIds));
  assert.deepEqual(new Set(Object.keys(en)), new Set(expectedIds));
  for (const article of base) {
    assert.ok(article.topics.length >= 2, `${article.id}: topics`);
    assert.ok(article.related.length >= 2, `${article.id}: related`);
  }
});

test('batch 015 is loaded and learning-map references remain valid', async () => {
  const loader = await fs.readFile(new URL('../src/content-loader.js', import.meta.url), 'utf8');
  assert.match(loader, /hourly-batch-015\.json/);
  const map = await readJson('../public/content/learning-map.json');
  const nodes = map.chapters.flatMap(c => c.nodes);
  const ids = new Set(nodes.map(n => n.id));
  for (const node of nodes) {
    for (const prerequisite of node.prerequisites ?? []) assert.ok(ids.has(prerequisite), `${node.id}: missing prerequisite ${prerequisite}`);
    if (node.kind === 'support') assert.ok(ids.has(node.attachedTo), `${node.id}: missing attachedTo ${node.attachedTo}`);
  }
});

test('every learning-map main node has exactly one explicit short code sample', async () => {
  const map = await readJson('../public/content/learning-map.json');
  const code = await readJson('../public/content/learning-map-code.json');
  const mainIds = map.chapters.flatMap(c => c.nodes).filter(n => n.kind !== 'support').map(n => n.id);
  const mainSet = new Set(mainIds);
  const codeIds = Object.keys(code);
  const missing = mainIds.filter(id => !(id in code));
  const extra = codeIds.filter(id => !mainSet.has(id));
  assert.deepEqual(missing, [], `missing learning-map code keys: ${missing.join(', ')}`);
  assert.deepEqual(extra, [], `unused learning-map code keys: ${extra.join(', ')}`);
  for (const id of mainIds) {
    assert.equal(typeof code[id], 'string', `${id}: code must be a string`);
    assert.ok(code[id].trim(), `${id}: code must not be empty`);
    assert.ok(code[id].split('\n').length <= 4, `${id}: code must be at most four lines`);
  }
});
