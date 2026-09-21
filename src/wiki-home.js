const FEATURED_IDS = [
  'async-await',
  'json-source-generation',
  'span-vs-memory',
  'httpclient-reuse'
];

const BEGINNER_IDS = [
  'program-entry',
  'variables-assignment',
  'if-else',
  'methods-parameters-returns'
];

const COMMON_ERROR_IDS = [
  'nullref',
  'index-out-of-range',
  'cs0103',
  'floating-equality'
];

const CATEGORY_TYPES = [
  'code',
  'concept',
  'exception',
  'compiler-error',
  'compiler-warning',
  'logic'
];

const ERROR_TYPES = new Set(['exception', 'compiler-error', 'compiler-warning', 'logic']);

function pickArticles(articles, ids, limit, predicate = () => true) {
  const byId = new Map(articles.map(article => [article.id, article]));
  const picked = [];
  const used = new Set();

  for (const id of ids) {
    const article = byId.get(id);
    if (!article || !predicate(article) || used.has(article.id)) continue;
    picked.push(article);
    used.add(article.id);
    if (picked.length >= limit) return picked;
  }

  for (const article of articles) {
    if (!predicate(article) || used.has(article.id)) continue;
    picked.push(article);
    used.add(article.id);
    if (picked.length >= limit) break;
  }

  return picked;
}

export function pickRandomArticle(articles = [], random = Math.random) {
  const items = Array.isArray(articles)
    ? articles.filter(article => article?.id)
    : [];
  if (!items.length) return null;

  const value = Number(random());
  const normalized = Number.isFinite(value)
    ? Math.max(0, Math.min(value, 0.9999999999999999))
    : 0;
  return items[Math.floor(normalized * items.length)] ?? items[0];
}

export function buildWikiHomeSections(articles = []) {
  const items = Array.isArray(articles) ? articles.filter(Boolean) : [];
  return {
    featured: pickArticles(items, FEATURED_IDS, 4),
    newest: items.slice(-6).reverse(),
    beginner: pickArticles(items, BEGINNER_IDS, 4),
    commonErrors: pickArticles(items, COMMON_ERROR_IDS, 4, article => ERROR_TYPES.has(article.type)),
    categories: CATEGORY_TYPES.map(type => ({
      type,
      count: items.filter(article => article.type === type).length
    }))
  };
}

export function shouldShowWikiHome({
  query = '',
  types = new Set(),
  topics = new Set(),
  favoritesOnly = false,
  recentOnly = false
} = {}) {
  return !String(query ?? '').trim()
    && (types?.size ?? 0) === 0
    && (topics?.size ?? 0) === 0
    && !favoritesOnly
    && !recentOnly;
}
