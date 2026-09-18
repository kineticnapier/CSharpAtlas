import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);

test('home shell exposes list and graph view controls', async () => {
  const html = await readFile(new URL('index.html', root), 'utf8');
  assert.match(html, /id="listViewButton"/);
  assert.match(html, /id="graphViewButton"/);
  assert.match(html, /id="listViewPanel"/);
  assert.match(html, /id="graphViewPanel"/);
  assert.match(html, /id="articleGraph"/);
});

test('graph bootstrap and stylesheet are loaded', async () => {
  const html = await readFile(new URL('index.html', root), 'utf8');
  assert.match(html, /href="\/src\/graph-view\.css"/);
  assert.match(html, /src="\/src\/graph-bootstrap\.js"/);
});

test('graph styles include view switching and canvas affordances', async () => {
  const css = await readFile(new URL('src/graph-view.css', root), 'utf8');
  assert.match(css, /\.view-switch/);
  assert.match(css, /\.graph-shell/);
  assert.match(css, /#articleGraph/);
});

test('graph renderer sleeps while list view is active', async () => {
  const bootstrap = await readFile(new URL('src/graph-bootstrap.js', root), 'utf8');
  const view = await readFile(new URL('src/graph-view.js', root), 'utf8');
  assert.match(bootstrap, /graphCanvas\.setActive\(showingGraph\)/);
  assert.match(view, /setActive\(active\)/);
  assert.match(view, /FRAME_INTERVAL/);
});
