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

test('quest map opens at a readable native zoom instead of fitting the whole chapter immediately', async () => {
  const bootstrap = await readFile(new URL('src/quest-bootstrap.js', root), 'utf8');
  const view = await readFile(new URL('src/quest-view.js', root), 'utf8');
  assert.match(view, /function resetReadableView\(/);
  assert.match(view, /requestAnimationFrame\(resetReadableView\)/);
  assert.doesNotMatch(bootstrap, /requestAnimationFrame\(\(\) => questView\.fit\(\)\)/);
});

test('quest map avoids persistent transform rasterization and browser text selection while panning', async () => {
  const css = await readFile(new URL('src/quest-view.css', root), 'utf8');
  const view = await readFile(new URL('src/quest-view.js', root), 'utf8');
  assert.doesNotMatch(css, /will-change:\s*transform/);
  assert.match(css, /\.quest-viewport\s*\{[\s\S]*?user-select:\s*none/);
  assert.match(css, /\.quest-viewport\s*\{[\s\S]*?touch-action:\s*none/);
  assert.match(view, /pointerdown[\s\S]*?event\.preventDefault\(\)/);
});

test('learning nodes show representative code and use their measured DOM size for layout', async () => {
  const css = await readFile(new URL('src/quest-view.css', root), 'utf8');
  const view = await readFile(new URL('src/quest-view.js', root), 'utf8');
  assert.match(css, /\.quest-node-code/);
  assert.match(css, /width:\s*max-content/);
  assert.match(css, /max-width:\s*360px/);
  assert.match(view, /quest-node-code/);
  assert.match(view, /offsetWidth/);
  assert.match(view, /offsetHeight/);
  assert.match(view, /reflowQuestLayout/);
});

test('support cards size to their title and minimal failing code without overlaying the support label', async () => {
  const css = await readFile(new URL('src/quest-view.css', root), 'utf8');
  const view = await readFile(new URL('src/quest-view.js', root), 'utf8');
  assert.match(css, /\.quest-node\.support\s*\{[\s\S]*?width:\s*max-content/);
  assert.match(css, /\.quest-node\.support\s*\{[\s\S]*?max-width:\s*340px/);
  assert.match(css, /\.quest-node-support\s*\{[\s\S]*?position:\s*static/);
  assert.match(view, /const code = node\.code/);
});

test('quest edges use obstacle-aware orthogonal routing instead of cubic curves', async () => {
  const view = await readFile(new URL('src/quest-view.js', root), 'utf8');
  assert.match(view, /routeQuestEdgePoints/);
  assert.match(view, /pointsToPath/);
  assert.doesNotMatch(view, /\bC \$\{/);
});
