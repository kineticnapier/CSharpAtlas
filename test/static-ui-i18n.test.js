import test from 'node:test';
import assert from 'node:assert/strict';
import { uiText } from '../src/i18n.js';

test('provides Japanese and English hero and navigation copy', () => {
  assert.equal(uiText('ja', 'heroEyebrow'), '逆引き C# リファレンス');
  assert.equal(uiText('en', 'heroEyebrow'), 'Reverse lookup C# reference');
  assert.equal(uiText('ja', 'heroTitle1'), 'やりたいことも、');
  assert.equal(uiText('en', 'heroTitle2'), 'and why it broke.');
  assert.equal(uiText('ja', 'categories'), '種類');
  assert.equal(uiText('en', 'categories'), 'Categories');
});

test('provides localized search copy', () => {
  assert.equal(uiText('ja', 'searchPlaceholder'), '例: JSON 読み込み / NullReferenceException / CS0103');
  assert.equal(uiText('en', 'searchPlaceholder'), 'e.g. Read JSON / NullReferenceException / CS0103');
});
