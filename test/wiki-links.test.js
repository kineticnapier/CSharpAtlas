import test from 'node:test';
import assert from 'node:assert/strict';
import { renderWikiText } from '../src/wiki-links.js';

const articles = new Map([
  ['equality', { id: 'equality', title: '等価性' }],
  ['nullable', { id: 'nullable', title: 'null と nullable 参照型' }]
]);

const resolveArticle = id => articles.get(id) ?? null;

test('renderWikiText leaves ordinary text alone', () => {
  assert.equal(renderWikiText('GetHashCode を実装する', resolveArticle), 'GetHashCode を実装する');
});

test('renderWikiText renders [[id]] with the target article title', () => {
  assert.equal(
    renderWikiText('詳しくは [[equality]] を参照。', resolveArticle),
    '詳しくは <button class="wiki-link" data-wiki-id="equality">等価性</button> を参照。'
  );
});

test('renderWikiText renders [[id|label]] with the explicit label', () => {
  assert.equal(
    renderWikiText('[[nullable|null]] を確認する', resolveArticle),
    '<button class="wiki-link" data-wiki-id="nullable">null</button> を確認する'
  );
});

test('renderWikiText escapes surrounding text and labels', () => {
  assert.equal(
    renderWikiText('<b> [[equality|A&B]]', resolveArticle),
    '&lt;b&gt; <button class="wiki-link" data-wiki-id="equality">A&amp;B</button>'
  );
});

test('renderWikiText keeps unknown or malformed wiki syntax readable and unlinked', () => {
  assert.equal(renderWikiText('[[missing|不明]]', resolveArticle), '不明');
  assert.equal(renderWikiText('[[missing]]', resolveArticle), 'missing');
  assert.equal(renderWikiText('[[|empty]]', resolveArticle), 'empty');
  assert.equal(renderWikiText('[[broken', resolveArticle), '[[broken');
});
