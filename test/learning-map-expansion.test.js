import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { buildQuestChapter } from '../src/quest-map.js';
import { CONTENT_CATEGORIES, normalizeContentGroup } from '../src/content-loader.js';

async function readJson(path) {
  return JSON.parse(await fs.readFile(new URL(path, import.meta.url), 'utf8'));
}

async function articleIds() {
  const ids = new Set();
  for (const file of CONTENT_CATEGORIES) {
    const raw = await readJson(`../public/content/articles/${file}`);
    for (const article of normalizeContentGroup(file, raw)) ids.add(article.id);
  }
  return ids;
}

test('learning map references valid articles with consistent local edges', async () => {
  const config = await readJson('../public/content/learning-map.json');
  const ids = await articleIds();

  assert.ok(Array.isArray(config.chapters) && config.chapters.length > 0, 'learning map must contain chapters');

  const mappedIds = [];
  for (const chapter of config.chapters) {
    const nodes = chapter.nodes ?? [];
    assert.ok(nodes.length > 0, `${chapter.id}: chapter must not be empty`);
    const chapterIds = new Set(nodes.map(node => node.id));

    for (const node of nodes) {
      mappedIds.push(node.id);
      assert.ok(ids.has(node.id), `${chapter.id}/${node.id}: missing article`);
      for (const prerequisite of node.prerequisites ?? []) {
        assert.ok(chapterIds.has(prerequisite), `${chapter.id}/${node.id}: missing prerequisite ${prerequisite}`);
      }
      if (node.kind === 'support') {
        assert.ok(node.attachedTo, `${chapter.id}/${node.id}: support node must declare attachedTo`);
        assert.ok(chapterIds.has(node.attachedTo), `${chapter.id}/${node.id}: support target must exist in the same chapter`);
      }
    }
  }

  assert.equal(new Set(mappedIds).size, mappedIds.length, 'learning map must not duplicate article nodes across chapters');
});

test('main learning nodes require explicit map code', () => {
  const article = { id: 'sample', type: 'code', title: 'Sample', short: 'Sample', code: 'Console.WriteLine(42);' };
  const withoutCode = buildQuestChapter([article], { id: 'chapter', nodes: [{ id: 'sample' }] });
  const withCode = buildQuestChapter([article], { id: 'chapter', nodes: [{ id: 'sample', code: 'Console.WriteLine("map");' }] });
  assert.equal(withoutCode.nodes[0].code, '');
  assert.equal(withCode.nodes[0].code, 'Console.WriteLine("map");');
});
