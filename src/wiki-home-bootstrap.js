import { articleHash } from './article-ui.js';
import { loadLocalizedContent } from './content-loader.js';
import { resolveLocale, uiText } from './i18n.js';
import { parseDiscoveryState } from './list-discovery.js';
import { typeLabel } from './translation-ui.js';
import { buildWikiHomeSections, shouldShowWikiHome } from './wiki-home.js';

const LOCALE_STORAGE_KEY = 'csharp-atlas-locale';

function readStoredLocale() {
  try { return window.localStorage?.getItem(LOCALE_STORAGE_KEY) ?? ''; } catch { return ''; }
}

async function loadJson(path) {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`Failed to load ${path}`);
  return response.json();
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function isMonoArticle(article) {
  return article.type === 'compiler-error'
    || article.type === 'compiler-warning'
    || article.type === 'exception';
}

function renderFeatureArticle(article, locale) {
  return `
    <button type="button" class="wiki-article-card" data-wiki-home-id="${escapeHtml(article.id)}">
      <span class="badge ${escapeHtml(article.type)}">${escapeHtml(typeLabel(article.type, locale))}</span>
      <strong class="${isMonoArticle(article) ? 'mono' : ''}">${escapeHtml(article.title)}</strong>
      <span>${escapeHtml(article.short)}</span>
    </button>
  `;
}

function renderArticleRow(article, locale) {
  return `
    <button type="button" class="wiki-link-row" data-wiki-home-id="${escapeHtml(article.id)}">
      <span class="wiki-link-copy">
        <strong class="${isMonoArticle(article) ? 'mono' : ''}">${escapeHtml(article.title)}</strong>
        <small>${escapeHtml(article.short)}</small>
      </span>
      <span class="badge ${escapeHtml(article.type)}">${escapeHtml(typeLabel(article.type, locale))}</span>
    </button>
  `;
}

function cleanHomeUrl() {
  const params = new URLSearchParams(window.location.search);
  const lang = params.get('lang');
  const clean = new URLSearchParams();
  if (lang) clean.set('lang', lang);
  const query = clean.toString();
  return `${window.location.pathname}${query ? `?${query}` : ''}`;
}

async function initializeWikiHome() {
  const panel = document.getElementById('wikiHomePanel');
  const browseView = document.getElementById('browseView');
  if (!panel || !browseView) return;

  const locale = resolveLocale({
    search: window.location.search,
    storedLocale: readStoredLocale()
  });
  const discovery = parseDiscoveryState(window.location.search);
  const showLanding = shouldShowWikiHome({
    query: discovery.query,
    types: discovery.types,
    topics: discovery.topics,
    favoritesOnly: false,
    recentOnly: false
  }) && discovery.sort === 'recommended';

  if (!showLanding) {
    panel.classList.add('hidden');
    browseView.classList.remove('hidden');
    return;
  }

  const { articles } = await loadLocalizedContent({ fetchJson: loadJson, locale });
  const sections = buildWikiHomeSections(articles);

  document.getElementById('wikiHomeEyebrow').textContent = uiText(locale, 'wikiHomeEyebrow');
  document.getElementById('wikiHomeHeading').textContent = uiText(locale, 'wikiHomeTitle');
  document.getElementById('wikiArticleCount').textContent = uiText(locale, 'wikiArticleCount', articles.length);
  document.getElementById('wikiFeaturedTitle').textContent = uiText(locale, 'wikiFeatured');
  document.getElementById('wikiFeaturedDescription').textContent = uiText(locale, 'wikiFeaturedDescription');
  document.getElementById('wikiNewestTitle').textContent = uiText(locale, 'wikiNewest');
  document.getElementById('wikiNewestDescription').textContent = uiText(locale, 'wikiNewestDescription');
  document.getElementById('wikiBeginnerTitle').textContent = uiText(locale, 'wikiBeginner');
  document.getElementById('wikiBeginnerDescription').textContent = uiText(locale, 'wikiBeginnerDescription');
  document.getElementById('wikiCommonErrorsTitle').textContent = uiText(locale, 'wikiCommonErrors');
  document.getElementById('wikiCommonErrorsDescription').textContent = uiText(locale, 'wikiCommonErrorsDescription');
  document.getElementById('wikiCategoriesTitle').textContent = uiText(locale, 'wikiCategories');
  document.getElementById('wikiCategoriesDescription').textContent = uiText(locale, 'wikiCategoriesDescription');
  document.getElementById('wikiLearningMapTitle').textContent = uiText(locale, 'wikiLearningMap');
  document.getElementById('wikiLearningMapDescription').textContent = uiText(locale, 'wikiLearningMapDescription');
  document.getElementById('wikiLearningMapButton').textContent = uiText(locale, 'wikiOpenLearningMap');
  document.getElementById('wikiBrowseAllButton').textContent = uiText(locale, 'wikiBrowseAll');

  document.getElementById('wikiFeaturedArticles').innerHTML = sections.featured
    .map(article => renderFeatureArticle(article, locale)).join('');
  document.getElementById('wikiNewestArticles').innerHTML = sections.newest
    .map(article => renderArticleRow(article, locale)).join('');
  document.getElementById('wikiBeginnerArticles').innerHTML = sections.beginner
    .map(article => renderArticleRow(article, locale)).join('');
  document.getElementById('wikiCommonErrorArticles').innerHTML = sections.commonErrors
    .map(article => renderArticleRow(article, locale)).join('');
  document.getElementById('wikiCategoryButtons').innerHTML = sections.categories.map(category => `
    <button type="button" class="wiki-category-button" data-wiki-home-type="${escapeHtml(category.type)}">
      <span>${escapeHtml(typeLabel(category.type, locale))}</span>
      <strong>${category.count}</strong>
    </button>
  `).join('');

  function enterBrowseMode({ scroll = true } = {}) {
    panel.classList.add('hidden');
    browseView.classList.remove('hidden');
    if (scroll) browseView.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  panel.querySelectorAll('[data-wiki-home-id]').forEach(button => {
    button.addEventListener('click', () => {
      window.location.hash = articleHash(button.dataset.wikiHomeId);
    });
  });

  panel.querySelectorAll('[data-wiki-home-type]').forEach(button => {
    button.addEventListener('click', () => {
      enterBrowseMode({ scroll: false });
      const target = document.querySelector(`#browseView aside [data-type="${CSS.escape(button.dataset.wikiHomeType)}"]`);
      target?.click();
      browseView.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  document.getElementById('wikiBrowseAllButton').addEventListener('click', () => enterBrowseMode());
  document.getElementById('wikiLearningMapButton').addEventListener('click', () => {
    enterBrowseMode({ scroll: false });
    document.getElementById('questViewButton')?.click();
    browseView.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  document.getElementById('searchForm')?.addEventListener('submit', () => enterBrowseMode({ scroll: false }));
  document.querySelectorAll('[data-query], [data-nav-type]').forEach(button => {
    button.addEventListener('click', () => enterBrowseMode({ scroll: false }));
  });

  document.getElementById('homeButton')?.addEventListener('click', () => {
    const clean = cleanHomeUrl();
    const current = `${window.location.pathname}${window.location.search}`;
    if (current !== clean) {
      window.location.assign(clean);
      return;
    }
    panel.classList.remove('hidden');
    browseView.classList.add('hidden');
  });

  panel.classList.remove('hidden');
  browseView.classList.add('hidden');
}

initializeWikiHome().catch(error => {
  const panel = document.getElementById('wikiHomePanel');
  const browseView = document.getElementById('browseView');
  panel?.classList.add('hidden');
  browseView?.classList.remove('hidden');
  console.error(error);
});
