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

test('graph bootstrap is loaded as a module', async () => {
  const html = await readFile(new URL('index.html', root), 'utf8');
  assert.match(html, /src="\/src\/graph-bootstrap\.js"/);
});

test('graph styles include ghost and canvas affordances', async () => {
  const css = await readFile(new URL('src/styles.css', root), 'utf8');
  assert.match(css, /\.view-switch/);
  assert.match(css, /\.graph-shell/);
  assert.match(css, /#articleGraph/);
});
