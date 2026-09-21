import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('wiki home article badges stay compact and single-line', async () => {
  const css = await readFile(path.join(root, 'src', 'wiki-home.css'), 'utf8');
  const rule = css.match(/\.wiki-home \.badge\s*\{([^}]*)\}/)?.[1] ?? '';

  assert.match(rule, /display\s*:\s*inline-flex/);
  assert.match(rule, /align-items\s*:\s*center/);
  assert.match(rule, /width\s*:\s*auto/);
  assert.match(rule, /min-height\s*:\s*0/);
  assert.match(rule, /white-space\s*:\s*nowrap/);
  assert.match(rule, /line-height\s*:\s*1(?:\.\d+)?/);
});

test('wiki home code badge uses slightly smaller type', async () => {
  const css = await readFile(path.join(root, 'src', 'wiki-home.css'), 'utf8');
  const rule = css.match(/\.wiki-home \.badge\.code\s*\{([^}]*)\}/)?.[1] ?? '';

  assert.match(rule, /font-size\s*:\s*10px/);
});
