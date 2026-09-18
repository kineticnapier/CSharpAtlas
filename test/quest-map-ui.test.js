import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);

test('home shell exposes list and learning-map views', async () => {
  const html = await readFile(new URL('index.html', root), 'utf8');
  assert.match(html, /id="listViewButton"/);
  assert.match(html, /id="questViewButton"/);
  assert.match(html, /id="questViewPanel"/);
  assert.match(html, /id="questViewport"/);
  assert.match(html, /src="\/src\/quest-bootstrap\.js"/);
  assert.match(html, /href="\/src\/quest-view\.css"/);
});

test('learning map reuses the existing aside type buttons as chapter controls', async () => {
  const bootstrap = await readFile(new URL('src/quest-bootstrap.js', root), 'utf8');
  assert.match(bootstrap, /querySelectorAll\('aside \[data-type\]'\)/);
  assert.match(bootstrap, /button\.dataset\.chapter = chapter\.id/);
  assert.match(bootstrap, /delete button\.dataset\.chapter/);
});

test('quest view distinguishes prerequisite and support connections', async () => {
  const css = await readFile(new URL('src/quest-view.css', root), 'utf8');
  const view = await readFile(new URL('src/quest-view.js', root), 'utf8');
  assert.match(css, /\.quest-edge\.support/);
  assert.match(css, /stroke-dasharray/);
  assert.match(view, /edge\.kind === 'support'/);
});
