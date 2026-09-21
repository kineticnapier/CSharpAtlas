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
    heroEyebrow: '逆引き C# リファレンス',
    heroTitle1: 'やりたいことも、',
    heroTitle2: '壊れた理由も。',
    heroDescription: 'C# のコード例、例外、コンパイルエラー・警告、仕組みをひとつの検索で。',
    searchPlaceholder: '例: JSON 読み込み / NullReferenceException / CS0103',
    categories: '種類',
    language: '言語',
    searchButton: '検索',
    recommended: 'おすすめ',
    wikiHomeEyebrow: 'C# Atlas ポータル',
    wikiHomeTitle: 'C# を探す・学ぶ',
    wikiArticleCount: count => `${count}件の記事`,
    wikiFeatured: '注目の記事',
    wikiFeaturedDescription: 'まず見ておきたい代表的な機能と実践パターン。',
    wikiNewest: '新着記事',
    wikiNewestDescription: '最近追加された記事。',
    wikiBeginner: 'はじめての C#',
    wikiBeginnerDescription: '学習を始めるならここから。',
    wikiCommonErrors: 'よくあるエラー',
    wikiCommonErrorsDescription: '最初につまずきやすい例外・コンパイルエラー・論理ミス。',
    wikiCategories: 'カテゴリから探す',
    wikiCategoriesDescription: '種類を決めて一覧を開きます。',
    wikiLearningMap: '学習マップ',
    wikiLearningMapDescription: '基礎から実践まで、前提関係に沿って進めます。',
    wikiOpenLearningMap: '学習マップを開く',
    wikiRandomArticle: 'おまかせ表示',
    wikiBrowseAll: 'すべての記事を見る',
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
    topics: 'トピック',
    sort: '並び順',
    sortRecommended: 'おすすめ順',
    sortTitle: '名前順',
    sortRecent: '最近見た順',
    sortFavorites: 'お気に入り優先',
    favoritesOnly: '☆ お気に入り',
    recentOnly: '最近見た',
    activeFilters: '選択中',
    clearFilters: 'すべて解除',
    favoriteAdd: 'お気に入りに追加',
    favoriteRemove: 'お気に入りから削除',
    untranslatedBadge: '未翻訳',
    fallbackBanner: '選択した言語の翻訳がまだありません。このページは日本語で表示しています。',
    contentLoadFailed: file => `記事の取得に失敗しました: ${file}`,
    duplicateId: id => `記事IDが重複しています: ${id}`
  },
  en: {
    all: 'All',
    code: 'Code recipes',
    exception: 'Exceptions',
    compilerError: 'Compiler errors',
    compilerWarning: 'Compiler warnings',
    logic: 'Logic pitfalls',
    concept: 'Concepts',
    heroEyebrow: 'Reverse lookup C# reference',
    heroTitle1: 'What you want to do,',
    heroTitle2: 'and why it broke.',
    heroDescription: 'Search C# recipes, exceptions, compiler errors and warnings, and core concepts in one place.',
    searchPlaceholder: 'e.g. Read JSON / NullReferenceException / CS0103',
    categories: 'Categories',
    language: 'Language',
    searchButton: 'Search',
    recommended: 'Recommended',
    wikiHomeEyebrow: 'C# Atlas portal',
    wikiHomeTitle: 'Explore and learn C#',
    wikiArticleCount: count => `${count} articles`,
    wikiFeatured: 'Featured articles',
    wikiFeaturedDescription: 'Representative features and practical patterns worth seeing first.',
    wikiNewest: 'New articles',
    wikiNewestDescription: 'Recently added to the Atlas.',
    wikiBeginner: 'Start with C#',
    wikiBeginnerDescription: 'A compact starting path for learning the language.',
    wikiCommonErrors: 'Common errors',
    wikiCommonErrorsDescription: 'Exceptions, compiler diagnostics, and logic mistakes that often cause trouble.',
    wikiCategories: 'Browse by category',
    wikiCategoriesDescription: 'Open the article list by type.',
    wikiLearningMap: 'Learning map',
    wikiLearningMapDescription: 'Follow prerequisites from the basics through practical topics.',
    wikiOpenLearningMap: 'Open learning map',
    wikiRandomArticle: 'Random article',
    wikiBrowseAll: 'Browse all articles',
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
    topics: 'Topics',
    sort: 'Sort',
    sortRecommended: 'Recommended',
    sortTitle: 'Title',
    sortRecent: 'Recently viewed',
    sortFavorites: 'Favorites first',
    favoritesOnly: '☆ Favorites',
    recentOnly: 'Recent',
    activeFilters: 'Active filters',
    clearFilters: 'Clear all',
    favoriteAdd: 'Add to favorites',
    favoriteRemove: 'Remove from favorites',
    untranslatedBadge: 'Not translated',
    fallbackBanner: 'English translation is not available yet. This article is being shown in Japanese.',
    contentLoadFailed: file => `Failed to load article content: ${file}`,
    duplicateId: id => `Duplicate article ID: ${id}`
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
