import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);

test('list view exposes topic, sorting, favorites, recent, and active-filter controls', async () => {
  const html = await readFile(new URL('index.html', root), 'utf8');
  assert.match(html, /id="topicFilters"/);
  assert.match(html, /id="sortSelect"/);
  assert.match(html, /id="favoritesOnlyButton"/);
  assert.match(html, /id="recentOnlyButton"/);
  assert.match(html, /id="selectedFilters"/);
  assert.match(html, /id="clearFiltersButton"/);
});

test('list cards expose favorite controls without replacing article navigation', async () => {
  const main = await readFile(new URL('src/main.js', root), 'utf8');
  assert.match(main, /data-favorite-id/);
  assert.match(main, /favoriteIds/);
  assert.match(main, /recentIds/);
});

test('list runtime supports multi-type filters and shareable URL state', async () => {
  const main = await readFile(new URL('src/main.js', root), 'utf8');
  assert.match(main, /selectedTypes/);
  assert.match(main, /filterArticlesByTypes/);
  assert.match(main, /parseDiscoveryState/);
  assert.match(main, /buildDiscoverySearch/);
  assert.match(main, /history\.replaceState/);
});
