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

function isSupportedLocale(locale) {
  return SUPPORTED_LOCALES.includes(String(locale ?? ''));
}

export function resolveLocale({ search = '', storedLocale = '' } = {}) {
  const queryLocale = new URLSearchParams(String(search ?? '')).get('lang');
  if (isSupportedLocale(queryLocale)) return queryLocale;
  if (isSupportedLocale(storedLocale)) return String(storedLocale);
  return DEFAULT_LOCALE;
}

export function withLangParam(url, locale) {
  const raw = String(url ?? '');
  const hashIndex = raw.indexOf('#');
  const hash = hashIndex >= 0 ? raw.slice(hashIndex) : '';
  const beforeHash = hashIndex >= 0 ? raw.slice(0, hashIndex) : raw;
  const queryIndex = beforeHash.indexOf('?');
  const path = queryIndex >= 0 ? beforeHash.slice(0, queryIndex) : beforeHash;
  const params = new URLSearchParams(queryIndex >= 0 ? beforeHash.slice(queryIndex + 1) : '');
  params.set('lang', isSupportedLocale(locale) ? String(locale) : DEFAULT_LOCALE);
  const query = params.toString();
  return `${path}${query ? `?${query}` : ''}${hash}`;
}

export function uiText(locale, key, ...args) {
  const dictionary = UI[isSupportedLocale(locale) ? locale : DEFAULT_LOCALE] ?? UI[DEFAULT_LOCALE];
  const fallback = UI[DEFAULT_LOCALE][key];
  const value = dictionary[key] ?? fallback ?? key;
  return typeof value === 'function' ? value(...args) : value;
}
