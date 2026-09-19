import test from 'node:test';
import assert from 'node:assert/strict';
import { CONTENT_CATEGORIES } from '../src/content-loader.js';

const EXPANSION_FILE = 'advanced-expansion.json';

test('50-article expansion shard is part of the content corpus', () => {
  assert.ok(CONTENT_CATEGORIES.includes(EXPANSION_FILE));
});
