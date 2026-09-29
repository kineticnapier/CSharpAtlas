import test from 'node:test';
import assert from 'node:assert/strict';
import { readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { CONTENT_CATEGORIES } from '../src/content-loader.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const contentDir = path.join(root, 'public', 'content');
const hourlyBatchPattern = /^hourly-batch-\d{3}\.json$/;

async function hourlyBatchFiles(directory) {
  return (await readdir(directory))
    .filter(file => hourlyBatchPattern.test(file))
    .sort();
}

test('every hourly batch on disk is registered by the runtime loader with both locales', async () => {
  const base = await hourlyBatchFiles(path.join(contentDir, 'articles'));
  const ja = await hourlyBatchFiles(path.join(contentDir, 'locales', 'ja'));
  const en = await hourlyBatchFiles(path.join(contentDir, 'locales', 'en'));
  const loaded = CONTENT_CATEGORIES.filter(file => hourlyBatchPattern.test(file)).sort();

  assert.deepEqual(ja, base, 'Japanese hourly batch files must match base batch files');
  assert.deepEqual(en, base, 'English hourly batch files must match base batch files');
  assert.deepEqual(loaded, base, 'runtime loader must register every hourly batch file');
});
