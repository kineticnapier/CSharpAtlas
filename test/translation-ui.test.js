import test from 'node:test';
import assert from 'node:assert/strict';
import {
  renderTranslationBadge,
  renderTranslationBanner,
  typeLabel
} from '../src/translation-ui.js';

test('does not render fallback markers for translated articles', () => {
  const item = { isFallback: false };
  assert.equal(renderTranslationBadge(item, 'en'), '');
  assert.equal(renderTranslationBanner(item, 'en'), '');
});

test('renders an English fallback marker when Japanese content is shown', () => {
  const item = { isFallback: true };
  assert.match(renderTranslationBadge(item, 'en'), /Not translated/);
  assert.match(
    renderTranslationBanner(item, 'en'),
    /English translation is not available yet\. This article is being shown in Japanese\./
  );
});

test('renders localized type labels', () => {
  assert.equal(typeLabel('compiler-error', 'ja'), 'コンパイルエラー');
  assert.equal(typeLabel('compiler-error', 'en'), 'Compiler errors');
  assert.equal(typeLabel('concept', 'en'), 'Concepts');
});
