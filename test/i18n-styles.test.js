import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('language selector and translation status have explicit styles', async () => {
  const css = await readFile(path.join(root, 'src/styles.css'), 'utf8');
  assert.match(css, /\.language-picker/);
  assert.match(css, /\.translation-badge/);
  assert.match(css, /\.translation-banner/);
  assert.match(css, /\.sr-only/);
});

test('card metadata badges keep the compact badge override', async () => {
  const css = await readFile(path.join(root, 'src/styles.css'), 'utf8');
  assert.match(css, /\.card-meta\s*>\s*\.badge/);
});
