# CSharpAtlas i18n Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert CSharpAtlas to a locale-aware article model with Japanese/English switching, article-level Japanese fallback, visible fallback indicators, localized UI copy, and stable article IDs/wiki links.

**Architecture:** Separate language-independent article structure from localized article text. `src/i18n.js` owns locale selection and UI strings, `src/article-localization.js` merges structure with locale entries and performs article-level fallback, and `src/content-loader.js` loads the category files. `src/main.js` consumes already-localized article objects and remains responsible for rendering/navigation.

**Tech Stack:** Vite 7, browser ES modules, Node `node:test`, JSON content files, PrismJS.

**Spec:** `docs/superpowers/specs/2026-09-16-expand-content-to-500-design.md`

## Global Constraints

- Supported first-class locales are exactly `ja` and `en` for this work.
- Japanese is the required fallback locale.
- Article IDs, `type`, code examples, and `related` relationships are language-independent.
- Article text must fall back as a whole article; do not mix Japanese and English fields inside one rendered article.
- Fallback must be visibly indicated on detail pages and search-result cards.
- Locale selection priority is valid `?lang=` query parameter, then saved `localStorage` value, then `ja`.
- Existing `#/article-id` hashes must remain valid.
- Explicit wiki-link syntax remains `[[id]]` / `[[id|label]]`.
- Do not reintroduce automatic substring wiki linking.
- No framework-specific content changes are part of this plan.

---

### Task 1: Locale resolution and UI string dictionary

**Files:**
- Create: `src/i18n.js`
- Create: `test/i18n.test.js`

**Interfaces:**
- Produces: `SUPPORTED_LOCALES`, `DEFAULT_LOCALE`, `resolveLocale({ search, storedLocale })`, `withLangParam(url, locale)`, `uiText(locale, key)`.
- Consumes: no project modules.

- [ ] **Step 1: Write failing locale-resolution tests**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveLocale, withLangParam, uiText } from '../src/i18n.js';

test('query locale overrides saved locale', () => {
  assert.equal(resolveLocale({ search: '?lang=en', storedLocale: 'ja' }), 'en');
});

test('invalid query locale falls back to valid saved locale', () => {
  assert.equal(resolveLocale({ search: '?lang=fr', storedLocale: 'en' }), 'en');
});

test('invalid locale values fall back to Japanese', () => {
  assert.equal(resolveLocale({ search: '', storedLocale: 'fr' }), 'ja');
});

test('withLangParam preserves other query parameters and hash', () => {
  assert.equal(
    withLangParam('/docs?x=1#/nullable', 'en'),
    '/docs?x=1&lang=en#/nullable'
  );
});

test('uiText returns localized labels', () => {
  assert.equal(uiText('ja', 'searchButton'), '検索');
  assert.equal(uiText('en', 'searchButton'), 'Search');
});
```

- [ ] **Step 2: Run the tests and verify RED**

Run: `npm test -- test/i18n.test.js`

Expected: FAIL because `src/i18n.js` does not exist.

- [ ] **Step 3: Implement `src/i18n.js`**

Use these exact locale constants and keys:

```js
export const SUPPORTED_LOCALES = ['ja', 'en'];
export const DEFAULT_LOCALE = 'ja';

const UI = {
  ja: {
    all: 'すべて',
    code: 'コード集',
    exception: '例外',
    compilerError: 'コンパイルエラー',
    compilerWarning: 'コンパイル警告',
    logic: '論理エラー',
    concept: '仕組み',
    searchButton: '検索',
    recommended: 'おすすめ',
    searchResults: query => `「${query}」の検索結果`,
    resultCount: count => `${count}件`,
    noResults: '一致する項目がありません。',
    back: '← 一覧に戻る',
    summary: '一言でいうと',
    cause: '原因',
    fix: '直し方',
    codeHeading: 'コード',
    why: 'なぜ？',
    tips: '補足',
    related: '関連',
    copy: 'コピー',
    copied: 'コピーしました',
    copyFailed: 'コピー失敗',
    untranslatedBadge: '未翻訳',
    fallbackBanner: '選択した言語の翻訳がまだありません。このページは日本語で表示しています。'
  },
  en: {
    all: 'All',
    code: 'Code recipes',
    exception: 'Exceptions',
    compilerError: 'Compiler errors',
    compilerWarning: 'Compiler warnings',
    logic: 'Logic pitfalls',
    concept: 'Concepts',
    searchButton: 'Search',
    recommended: 'Recommended',
    searchResults: query => `Search results for “${query}”`,
    resultCount: count => `${count} results`,
    noResults: 'No matching articles.',
    back: '← Back to list',
    summary: 'In short',
    cause: 'Cause',
    fix: 'Fix',
    codeHeading: 'Code',
    why: 'Why?',
    tips: 'Notes',
    related: 'Related',
    copy: 'Copy',
    copied: 'Copied',
    copyFailed: 'Copy failed',
    untranslatedBadge: 'Not translated',
    fallbackBanner: 'English translation is not available yet. This article is being shown in Japanese.'
  }
};
```

`resolveLocale` must accept only `ja`/`en`. `withLangParam` must update `lang` without losing the hash. `uiText` must call function-valued entries when extra arguments are supplied.

- [ ] **Step 4: Run locale tests and verify GREEN**

Run: `npm test -- test/i18n.test.js`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/i18n.js test/i18n.test.js
git commit -m "feat: add locale resolution and UI strings"
```

---

### Task 2: Article localization and whole-article fallback

**Files:**
- Create: `src/article-localization.js`
- Create: `test/article-localization.test.js`

**Interfaces:**
- Consumes: language-independent article objects and locale maps keyed by article ID.
- Produces: `localizeArticle(baseArticle, localeMaps, requestedLocale, fallbackLocale = 'ja')` returning `{ article, locale, requestedLocale, isFallback }`.
- Produces: `localizeArticles(baseArticles, localeMaps, requestedLocale, fallbackLocale = 'ja')`.

- [ ] **Step 1: Write failing fallback tests**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { localizeArticle } from '../src/article-localization.js';

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
```

- [ ] **Step 2: Run and verify RED**

Run: `npm test -- test/article-localization.test.js`

Expected: FAIL because the module does not exist.

- [ ] **Step 3: Implement article-level merge rules**

A localized entry is complete only when it contains non-empty strings for `title`, `short`, `summary`, `why`, `tips` and an array for `tags`. If the requested entry is missing or incomplete, ignore the entire requested entry and use the fallback entry. After choosing one locale entry, merge it over the base article once. Optional locale overrides `bad`, `good`, `code`, `badNotes`, `goodNotes`, and `codeNotes` may replace base values only when present in the selected locale entry.

- [ ] **Step 4: Run tests and verify GREEN**

Run: `npm test -- test/article-localization.test.js`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/article-localization.js test/article-localization.test.js
git commit -m "feat: add article locale fallback"
```

---

### Task 3: Content loader for split article/locale files

**Files:**
- Create: `src/content-loader.js`
- Create: `test/content-loader.test.js`

**Interfaces:**
- Produces: `CONTENT_CATEGORIES` with the seven existing category file names.
- Produces: `loadLocalizedContent({ fetchJson, locale, fallbackLocale })` returning `{ articles, requestedLocale }`.
- Consumes: `localizeArticles` from `src/article-localization.js`.

- [ ] **Step 1: Write failing loader test with a fake fetcher**

The fake must expose these paths:

```text
./content/articles/items.json
./content/articles/exceptions.json
...
./content/locales/ja/items.json
...
./content/locales/en/items.json
...
```

Use a single `nullable` base article and Japanese/English locale entries. Assert that `loadLocalizedContent` returns the English title for locale `en`, and returns `isFallback: true` when the English entry is removed.

- [ ] **Step 2: Run and verify RED**

Run: `npm test -- test/content-loader.test.js`

Expected: FAIL because `src/content-loader.js` does not exist.

- [ ] **Step 3: Implement the loader**

`CONTENT_CATEGORIES` must be:

```js
[
  'items.json',
  'exceptions.json',
  'compiler-errors.json',
  'compiler-warnings.json',
  'concepts.json',
  'code-recipes.json',
  'logic-errors.json'
]
```

For each category, load the base array and both `ja` and requested locale maps. When requested locale is `ja`, do not fetch Japanese twice. Return the flattened localized articles.

- [ ] **Step 4: Run and verify GREEN**

Run: `npm test -- test/content-loader.test.js`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/content-loader.js test/content-loader.test.js
git commit -m "feat: load split localized article content"
```

---

### Task 4: Migrate the existing 100 articles into split data

**Files:**
- Create: `public/content/articles/items.json`
- Create: `public/content/articles/exceptions.json`
- Create: `public/content/articles/compiler-errors.json`
- Create: `public/content/articles/compiler-warnings.json`
- Create: `public/content/articles/concepts.json`
- Create: `public/content/articles/code-recipes.json`
- Create: `public/content/articles/logic-errors.json`
- Create: `public/content/locales/ja/items.json`
- Create: `public/content/locales/ja/exceptions.json`
- Create: `public/content/locales/ja/compiler-errors.json`
- Create: `public/content/locales/ja/compiler-warnings.json`
- Create: `public/content/locales/ja/concepts.json`
- Create: `public/content/locales/ja/code-recipes.json`
- Create: `public/content/locales/ja/logic-errors.json`
- Modify later after verification, then delete: old top-level category JSON files.

**Interfaces:**
- Base category files are arrays of language-independent article objects.
- Locale category files are objects keyed by article ID.

- [ ] **Step 1: Add a migration-integrity test before moving data**

Create `test/content-migration.test.js` that reads the current old JSON files and the new split files when present. For every existing article ID, reconstruct `{ ...base, ...jaLocaleEntry }` and assert deep equality for these user-visible fields: `id`, `type`, `title`, `short`, `summary`, `bad`, `good`, `code`, `why`, `tips`, `tags`, `related`. Permit code-note fields to come from the existing `code-annotations.json` path until Task 5.

- [ ] **Step 2: Run and verify RED**

Run: `npm test -- test/content-migration.test.js`

Expected: FAIL because the new split files do not exist.

- [ ] **Step 3: Split each existing category deterministically**

Move exactly these fields to the base article object when present:

```text
id, type, bad, good, code, related, badHighlight, goodHighlight, codeHighlight
```

Move exactly these fields to the Japanese locale entry when present:

```text
title, short, summary, why, tips, tags, badNotes, goodNotes, codeNotes
```

Do not rename article IDs. Keep every existing explicit `[[...]]` link text unchanged in Japanese.

- [ ] **Step 4: Run migration integrity and all tests**

Run: `npm test`

Expected: migration test PASS and no regression in existing tests.

- [ ] **Step 5: Commit the split migration**

```bash
git add public/content/articles public/content/locales/ja test/content-migration.test.js
git commit -m "refactor: split article structure from Japanese content"
```

---

### Task 5: Move code-note text into Japanese locale data

**Files:**
- Modify: `public/content/locales/ja/*.json`
- Delete after migration: `public/content/code-annotations.json`
- Modify: `test/content-migration.test.js`

**Interfaces:**
- All textual `badNotes`, `goodNotes`, `codeNotes` live in locale entries.
- Numeric highlight arrays remain in base article data.

- [ ] **Step 1: Extend migration test to require code-note parity**

For every old `code-annotations.json` entry, assert that each textual note exists under the matching Japanese locale article ID. Assert that old highlight arrays still match the base article.

- [ ] **Step 2: Run and verify RED**

Run: `npm test -- test/content-migration.test.js`

Expected: FAIL for note entries not yet migrated.

- [ ] **Step 3: Move annotation text and remove the old annotation source**

Copy note text by article ID into the matching Japanese locale entry. Keep line-number keys unchanged. Remove `code-annotations.json` only after every annotation is represented in locale/base data.

- [ ] **Step 4: Run and verify GREEN**

Run: `npm test -- test/content-migration.test.js`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add public/content/locales/ja public/content/articles public/content/code-annotations.json test/content-migration.test.js
git commit -m "refactor: localize code annotations"
```

---

### Task 6: Add complete English localization for the existing 100 articles

**Files:**
- Create: `public/content/locales/en/items.json`
- Create: `public/content/locales/en/exceptions.json`
- Create: `public/content/locales/en/compiler-errors.json`
- Create: `public/content/locales/en/compiler-warnings.json`
- Create: `public/content/locales/en/concepts.json`
- Create: `public/content/locales/en/code-recipes.json`
- Create: `public/content/locales/en/logic-errors.json`
- Create: `test/locale-coverage.test.js`

**Interfaces:**
- English locale entries use the same article IDs as Japanese.
- Every English entry must provide `title`, `short`, `summary`, `why`, `tips`, `tags`; translated code-note maps when the Japanese entry has code notes.

- [ ] **Step 1: Write failing locale-coverage test**

The test must load all base IDs and assert:

```js
assert.deepEqual(new Set(Object.keys(jaEntries)), new Set(baseIds));
assert.deepEqual(new Set(Object.keys(enEntries)), new Set(baseIds));
```

For every `ja` and `en` entry assert complete required text fields and string-array `tags`. When Japanese contains `badNotes`, `goodNotes`, or `codeNotes`, require the same note keys in English.

- [ ] **Step 2: Run and verify RED**

Run: `npm test -- test/locale-coverage.test.js`

Expected: FAIL because English locale files are missing.

- [ ] **Step 3: Translate the current 100 articles**

Translate technical prose naturally rather than word-for-word. Keep C# identifiers and official exception/compiler diagnostic names unchanged. Preserve explicit wiki target IDs; translate only labels, e.g. Japanese `[[records|record]]` may remain `[[records|record]]`, while prose around it becomes English. Translate code comments and string literals only when they are explanatory/user-facing; otherwise reuse base code.

- [ ] **Step 4: Run locale coverage and all tests**

Run: `npm test`

Expected: all locale coverage checks PASS.

- [ ] **Step 5: Commit**

```bash
git add public/content/locales/en test/locale-coverage.test.js
git commit -m "content: add English translations for existing articles"
```

---

### Task 7: Integrate locale-aware loading into the application

**Files:**
- Modify: `src/main.js`
- Modify: `src/article-search.js`
- Create: `test/article-search-localized.test.js`

**Interfaces:**
- `main.js` calls `resolveLocale`, then `loadLocalizedContent`.
- `article` objects consumed by rendering include `isFallback` metadata from localization.
- `matchesArticle` receives the effective localized article and continues matching `id`, title, short, summary, tags.

- [ ] **Step 1: Add search tests for localized/fallback articles**

Assert English search finds English `title`/`tags`, article IDs remain searchable, and a fallback article is searchable by its Japanese fallback text.

- [ ] **Step 2: Run and verify RED if adaptation is needed**

Run: `npm test -- test/article-search-localized.test.js`

Expected: FAIL until the search helper accepts the localized shape without depending on removed old fields.

- [ ] **Step 3: Replace old content loading in `main.js`**

Remove direct fetches of `./content/<category>.json` and `code-annotations.json`. Resolve locale once at startup, load localized articles through `loadLocalizedContent`, and keep duplicate-ID validation. Rendering must consume locale-specific title/text/note fields from each localized article.

- [ ] **Step 4: Run tests and build**

Run: `npm test && npm run build`

Expected: PASS and successful Vite build.

- [ ] **Step 5: Commit**

```bash
git add src/main.js src/article-search.js test/article-search-localized.test.js
git commit -m "feat: render localized article data"
```

---

### Task 8: Add language selector, localized fixed UI, and fallback indicators

**Files:**
- Modify: `index.html`
- Modify: `src/main.js`
- Modify: `src/styles.css`
- Create: `test/fallback-display.test.js`

**Interfaces:**
- `index.html` exposes `#languageSelect` with values `ja` and `en`.
- `main.js` saves language to `localStorage` key `csharp-atlas-locale` and updates the URL using `withLangParam`.
- Fallback cards render `.translation-badge`; fallback detail pages render `.translation-banner`.

- [ ] **Step 1: Add pure rendering tests for fallback markers**

Extract small helpers from `main.js` if needed:

```js
renderTranslationBadge(item, locale)
renderTranslationBanner(item, locale)
```

Tests must assert no marker for `isFallback === false`, Japanese fallback marker for Japanese UI, and the exact English fallback sentence for English UI.

- [ ] **Step 2: Run and verify RED**

Run: `npm test -- test/fallback-display.test.js`

Expected: FAIL before helpers/UI exist.

- [ ] **Step 3: Add selector and localized static labels**

Add a compact language selector to the header. Give all fixed text nodes addressable IDs/data attributes. On initial render and locale change, use `uiText` to update header navigation, hero copy/search controls as applicable, category labels, result count, detail headings, copy-state text, and back button. Set `<html lang>` to the effective UI locale.

- [ ] **Step 4: Add visible fallback UI**

Cards with `isFallback` render the localized untranslated badge. Detail pages with `isFallback` render the localized banner above the detail header. Style both to be visible but secondary to the article title.

- [ ] **Step 5: Preserve route while changing locale**

Changing the selector writes `csharp-atlas-locale`, updates `?lang=`, preserves `#/article-id`, and reloads/re-renders content in the new locale.

- [ ] **Step 6: Run tests and build**

Run: `npm test && npm run build`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add index.html src/main.js src/styles.css test/fallback-display.test.js
git commit -m "feat: add language switcher and fallback notices"
```

---

### Task 9: Remove old content paths and validate the i18n baseline

**Files:**
- Delete: old `public/content/items.json`
- Delete: old `public/content/exceptions.json`
- Delete: old `public/content/compiler-errors.json`
- Delete: old `public/content/compiler-warnings.json`
- Delete: old `public/content/concepts.json`
- Delete: old `public/content/code-recipes.json`
- Delete: old `public/content/logic-errors.json`
- Modify: `README.md`

**Interfaces:**
- Only `public/content/articles/**` and `public/content/locales/**` are runtime article sources.

- [ ] **Step 1: Search runtime code/tests for old content paths**

Run:

```bash
git grep "content/items.json\|content/exceptions.json\|content/compiler-errors.json\|content/compiler-warnings.json\|content/concepts.json\|content/code-recipes.json\|content/logic-errors.json\|code-annotations.json"
```

Expected: only migration-test references remain before deletion.

- [ ] **Step 2: Remove migration compatibility and old files**

Once Tasks 4–8 are green, remove old files and update `test/content-migration.test.js` into a permanent structure test that reads only split data.

- [ ] **Step 3: Document content/i18n authoring**

README must explain base vs locale fields, explicit wiki syntax, Japanese fallback, English completeness requirement for this repository, and how to add a future locale.

- [ ] **Step 4: Run full verification**

Run:

```bash
npm test
npm run build
```

Expected: all tests PASS; Vite build succeeds.

- [ ] **Step 5: Commit**

```bash
git add README.md public/content test src index.html
git commit -m "docs: finalize localized content layout"
```
