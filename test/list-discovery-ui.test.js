import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);

test('list view exposes topic, sorting, favorites, and recent controls', async () => {
  const html = await readFile(new URL('index.html', root), 'utf8');
  assert.match(html, /id="topicFilters"/);
  assert.match(html, /id="sortSelect"/);
  assert.match(html, /id="favoritesOnlyButton"/);
  assert.match(html, /id="recentOnlyButton"/);
});

test('list cards expose favorite controls without replacing article navigation', async () => {
  const main = await readFile(new URL('src/main.js', root), 'utf8');
  assert.match(main, /data-favorite-id/);
  assert.match(main, /favoriteIds/);
  assert.match(main, /recentIds/);
});
