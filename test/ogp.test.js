import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');

test('page exposes site-wide Open Graph and Twitter Card metadata', () => {
  assert.match(html, /<meta\s+name="description"\s+content="C# Atlas is a searchable C# reference for errors, exceptions, code examples, and concepts\."\s*\/?>/);
  assert.match(html, /<meta\s+property="og:type"\s+content="website"\s*\/?>/);
  assert.match(html, /<meta\s+property="og:title"\s+content="C# Atlas"\s*\/?>/);
  assert.match(html, /<meta\s+property="og:description"\s+content="Search C# errors, exceptions, code examples, and concepts\."\s*\/?>/);
  assert.match(html, /<meta\s+property="og:url"\s+content="https:\/\/csharpatlas\.pages\.dev\/"\s*\/?>/);
  assert.match(html, /<meta\s+property="og:image"\s+content="https:\/\/csharpatlas\.pages\.dev\/csharp-atlas-og\.png"\s*\/?>/);
  assert.match(html, /<meta\s+property="og:image:width"\s+content="1200"\s*\/?>/);
  assert.match(html, /<meta\s+property="og:image:height"\s+content="630"\s*\/?>/);
  assert.match(html, /<meta\s+name="twitter:card"\s+content="summary_large_image"\s*\/?>/);
});
