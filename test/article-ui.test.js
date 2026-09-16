import test from 'node:test';
import assert from 'node:assert/strict';
import {
  articleHash,
  articleIdFromHash,
  copyCode,
  highlightCSharp
} from '../src/article-ui.js';

test('articleHash encodes an article id as a hash route', () => {
  assert.equal(articleHash('Null Ref/例'), '#/Null%20Ref%2F%E4%BE%8B');
});

test('articleIdFromHash decodes valid article routes and rejects others', () => {
  assert.equal(articleIdFromHash('#/cs0165'), 'cs0165');
  assert.equal(articleIdFromHash('#/Null%20Ref'), 'Null Ref');
  assert.equal(articleIdFromHash('#'), null);
  assert.equal(articleIdFromHash('#search'), null);
  assert.equal(articleIdFromHash('#/%E0%A4%A'), null);
});

test('copyCode writes the raw code string only', async () => {
  let copied = null;
  const clipboard = {
    async writeText(value) {
      copied = value;
    }
  };

  const code = 'int x = 1;\nConsole.WriteLine(x);';
  await copyCode(code, clipboard);

  assert.equal(copied, code);
});

test('copyCode rejects when the clipboard API is unavailable', async () => {
  await assert.rejects(() => copyCode('x', null), /clipboard/i);
});

test('highlightCSharp emits Prism token markup for C#', () => {
  const html = highlightCSharp('string name = "Alice";');
  assert.match(html, /token keyword/);
  assert.match(html, /token string/);
  assert.ok(!html.includes('<script>'));
});
