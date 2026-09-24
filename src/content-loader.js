import { localizeArticles } from './article-localization.js';

export const CONTENT_CATEGORIES = [
  'items.json',
  'exceptions.json',
  'compiler-errors.json',
  'compiler-warnings.json',
  'concepts.json',
  'code-recipes.json',
  'logic-errors.json',
  'advanced-expansion.json',
  'hourly-batch-001.json',
  'hourly-batch-002.json',
  'hourly-batch-003.json',
  'hourly-batch-004.json',
  'hourly-batch-005.json',
  'hourly-batch-006.json',
  'hourly-batch-007.json',
  'hourly-batch-008.json',
  'hourly-batch-009.json',
  'hourly-batch-010.json',
  'hourly-batch-011.json',
  'hourly-batch-012.json',
  'hourly-batch-013.json',
  'hourly-batch-014.json',
  'hourly-batch-015.json',
  'hourly-batch-016.json',
  'hourly-batch-017.json',
  'hourly-batch-018.json',
  'hourly-batch-019.json',
  'hourly-batch-020.json',
  'hourly-batch-021.json',
  'hourly-batch-022.json',
  'hourly-batch-023.json',
  'hourly-batch-024.json',
  'hourly-batch-025.json',
  'hourly-batch-026.json',
  'hourly-batch-027.json',
  'hourly-batch-028.json',
  'hourly-batch-029.json',
  'hourly-batch-030.json',
  'hourly-batch-031.json',
  'hourly-batch-032.json'
];

const CONTENT_ID_ALIASES = {
  'advanced-expansion.json': {
    'collection-expressions': 'collection-expression-syntax'
  }
};

function normalizeExpansionLocaleEntry(id, entry) {
  if (id !== 'bounded-channel-producer-consumer' || !entry || typeof entry !== 'object') return entry;
  if (entry.title === 'Channel<T> で producer / consumer をつなぐ') return { ...entry, title: '容量制限付き Channel<T> で producer / consumer をつなぐ' };
  if (entry.title === 'Connect producers and consumers with Channel<T>') return { ...entry, title: 'Connect producers and consumers with a bounded Channel<T>' };
  return entry;
}

export function normalizeContentGroup(file, group) {
  const aliases = CONTENT_ID_ALIASES[file];
  if (!aliases) return group;
  if (Array.isArray(group)) return group.map(article => ({ ...article, id: aliases[article.id] ?? article.id, related: (article.related ?? []).map(id => aliases[id] ?? id) }));
  return Object.fromEntries(Object.entries(group ?? {}).map(([id, entry]) => { const normalizedId = aliases[id] ?? id; return [normalizedId, normalizeExpansionLocaleEntry(normalizedId, entry)]; }));
}

async function loadGroups(fetchJson, prefix) {
  return Promise.all(CONTENT_CATEGORIES.map(async file => normalizeContentGroup(file, await fetchJson(`${prefix}/${file}`))));
}

export async function loadLocalizedContent({ fetchJson, locale, fallbackLocale = 'ja' }) {
  if (typeof fetchJson !== 'function') throw new Error('fetchJson is required');
  const baseGroups = await loadGroups(fetchJson, './content/articles');
  const fallbackGroups = await loadGroups(fetchJson, `./content/locales/${fallbackLocale}`);
  const requestedGroups = locale === fallbackLocale ? fallbackGroups : await loadGroups(fetchJson, `./content/locales/${locale}`);
  const baseArticles = baseGroups.flat();
  const mergeLocaleGroups = groups => Object.assign({}, ...groups);
  const localeMaps = { [fallbackLocale]: mergeLocaleGroups(fallbackGroups), [locale]: mergeLocaleGroups(requestedGroups) };
  return { articles: localizeArticles(baseArticles, localeMaps, locale, fallbackLocale), requestedLocale: locale };
}
