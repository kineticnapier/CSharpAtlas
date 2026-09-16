import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

async function read(relativePath) {
  return readFile(path.join(root, relativePath), 'utf8');
}

test('page shell exposes a Japanese and English language selector', async () => {
  const html = await read('index.html');
  assert.match(html, /id="languageSelect"/);
  assert.match(html, /<option value="ja">日本語<\/option>/);
  assert.match(html, /<option value="en">English<\/option>/);
});

test('static copy has stable hooks for locale updates', async () => {
  const html = await read('index.html');
  for (const id of [
    'heroEyebrow',
    'heroTitle1',
    'heroTitle2',
    'heroDescription',
    'searchButton',
    'asideTitle'
  ]) {
    assert.match(html, new RegExp(`id="${id}"`));
  }
});
