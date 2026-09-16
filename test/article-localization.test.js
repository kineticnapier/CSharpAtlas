import test from 'node:test';
import assert from 'node:assert/strict';
import { localizeArticle, localizeArticles } from '../src/article-localization.js';

const base = {
  id: 'nullable',
  type: 'concept',
  code: 'string? value = null;',
  bad: null,
  good: null,
  related: ['nullref']
};

const locales = {
  ja: {
    nullable: {
      title: 'null と nullable 参照型',
      short: 'string と string? の違い。',
      summary: 'null の可能性を型で表します。',
      why: 'コンパイラが null の可能性を追跡します。',
      tips: '[[nullref]] も参照。',
      tags: ['null', 'nullable']
    }
  },
  en: {}
};

test('uses complete requested locale when present', () => {
  const enLocales = {
    ...locales,
    en: {
      nullable: {
        title: 'Null and nullable reference types',
        short: 'The difference between string and string?.',
        summary: 'Nullable annotations express possible null values.',
        why: 'The compiler tracks nullability.',
        tips: 'See [[nullref]].',
        tags: ['null', 'nullable']
      }
    }
  };
  const result = localizeArticle(base, enLocales, 'en');
  assert.equal(result.article.title, 'Null and nullable reference types');
  assert.equal(result.isFallback, false);
  assert.equal(result.locale, 'en');
});

test('falls back to the whole Japanese article when English is absent', () => {
  const result = localizeArticle(base, locales, 'en');
  assert.equal(result.article.title, 'null と nullable 参照型');
  assert.equal(result.article.code, 'string? value = null;');
  assert.equal(result.isFallback, true);
  assert.equal(result.locale, 'ja');
  assert.equal(result.requestedLocale, 'en');
});

test('incomplete requested locale falls back as a whole article', () => {
  const partial = {
    ...locales,
    en: {
      nullable: {
        title: 'English title that must not leak',
        short: '',
        summary: 'Partial',
        why: 'Partial',
        tips: 'Partial',
        tags: ['nullable']
      }
    }
  };
  const result = localizeArticle(base, partial, 'en');
  assert.equal(result.article.title, 'null と nullable 参照型');
  assert.equal(result.isFallback, true);
});

test('localizeArticles exposes fallback metadata on article objects', () => {
  const [article] = localizeArticles([base], locales, 'en');
  assert.equal(article.id, 'nullable');
  assert.equal(article.isFallback, true);
  assert.equal(article.locale, 'ja');
  assert.equal(article.requestedLocale, 'en');
});
