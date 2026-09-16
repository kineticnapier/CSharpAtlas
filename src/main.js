import {
  articleHash,
  articleIdFromHash,
  copyCode,
  highlightCSharp
} from './article-ui.js';
import { renderWikiText } from './wiki-links.js';

const labels = {
  code: 'コード',
  exception: '例外',
  'compiler-error': 'コンパイルエラー',
  'compiler-warning': 'コンパイル警告',
  logic: '論理エラー',
  concept: '仕組み'
};

const contentFiles = [
  'items.json',
  'exceptions.json',
  'compiler-errors.json',
  'compiler-warnings.json',
  'concepts.json',
  'code-recipes.json',
  'logic-errors.json'
];
const annotationFile = 'code-annotations.json';

let currentType = 'all';
let currentQuery = '';
let currentItems = [];
let allItems = [];
let codeAnnotations = {};

const homeView = document.getElementById('homeView');
const detailView = document.getElementById('detailView');
const cards = document.getElementById('cards');
const empty = document.getElementById('empty');
const listTitle = document.getElementById('listTitle');
const resultCount = document.getElementById('resultCount');
const searchInput = document.getElementById('searchInput');
const detailContent = document.getElementById('detailContent');

async function initialize() {
  const [groups, annotations] = await Promise.all([
    Promise.all(contentFiles.map(loadContentFile)),
    loadContentFile(annotationFile)
  ]);
  allItems = groups.flat();
  codeAnnotations = annotations && typeof annotations === 'object' && !Array.isArray(annotations)
    ? annotations
    : {};

  const ids = new Set();
  for (const item of allItems) {
    const id = item.id.toLowerCase();
    if (ids.has(id)) throw new Error(`記事IDが重複しています: ${item.id}`);
    ids.add(id);
  }

  loadItems();
  syncRouteFromHash();
}

async function loadContentFile(file) {
  const response = await fetch(`./content/${file}`);
  if (!response.ok) throw new Error(`記事の取得に失敗しました: ${file}`);
  return response.json();
}

function loadItems() {
  const words = currentQuery.toLowerCase().split(/\s+/).filter(Boolean);
  currentItems = allItems.filter(item => {
    if (currentType !== 'all' && item.type !== currentType) return false;
    if (!words.length) return true;
    return words.every(word => matches(item, word));
  });
  renderCards();
}

function matches(item, word) {
  return [item.title, item.short, item.summary, ...(item.tags ?? [])]
    .some(value => String(value ?? '').toLowerCase().includes(word));
}

function renderCards() {
  cards.innerHTML = currentItems.map(item => `
    <button class="card" data-id="${escapeHtml(item.id)}">
      <span class="badge ${escapeHtml(item.type)}">${labels[item.type] ?? item.type}</span>
      <h3 class="${isCompilerType(item.type) || item.type === 'exception' ? 'mono' : ''}">${escapeHtml(item.title)}</h3>
      <p>${escapeHtml(item.short)}</p>
      <div class="tags">${(item.tags ?? []).slice(0, 3).map(tag => `<span class="tag">${escapeHtml(tag)}</span>`).join('')}</div>
    </button>
  `).join('');

  cards.querySelectorAll('.card').forEach(card => {
    card.addEventListener('click', () => navigateToItem(card.dataset.id));
  });

  empty.style.display = currentItems.length ? 'none' : 'block';
  resultCount.textContent = `${currentItems.length}件`;
  listTitle.textContent = currentQuery
    ? `「${currentQuery}」の検索結果`
    : currentType === 'all' ? 'おすすめ' : labels[currentType];
}

function navigateToItem(id) {
  const hash = articleHash(id);
  if (window.location.hash === hash) {
    openItem(id);
    return;
  }
  window.location.hash = hash;
}

function navigateHome() {
  const baseUrl = `${window.location.pathname}${window.location.search}`;
  window.history.replaceState(null, '', baseUrl);
  showHome();
}

function syncRouteFromHash() {
  const id = articleIdFromHash(window.location.hash);
  if (!id) {
    showHome();
    return;
  }

  if (!fetchItem(id)) {
    const baseUrl = `${window.location.pathname}${window.location.search}`;
    window.history.replaceState(null, '', baseUrl);
    showHome();
    return;
  }

  openItem(id);
}

function openItem(id) {
  const item = fetchItem(id);
  if (!item) return;
  const annotation = codeAnnotations[item.id] ?? {};

  const sections = [];
  sections.push(`<div class="block"><h2>一言でいうと</h2><div class="note">${renderArticleText(item.summary)}</div></div>`);

  if (item.bad && item.good) {
    sections.push(`<div class="code-compare">
      ${codeSection(
        '原因',
        item.bad,
        'bad',
        explicitLineSet(item.badHighlight ?? annotation.badHighlight),
        lineNoteMap(item.badNotes ?? annotation.badNotes)
      )}
      ${codeSection(
        '直し方',
        item.good,
        'good',
        explicitLineSet(item.goodHighlight ?? annotation.goodHighlight),
        lineNoteMap(item.goodNotes ?? annotation.goodNotes)
      )}
    </div>`);
  } else {
    if (item.bad) {
      sections.push(codeSection(
        '原因',
        item.bad,
        'bad',
        explicitLineSet(item.badHighlight ?? annotation.badHighlight),
        lineNoteMap(item.badNotes ?? annotation.badNotes)
      ));
    }
    if (item.good) {
      sections.push(codeSection(
        '直し方',
        item.good,
        'good',
        explicitLineSet(item.goodHighlight ?? annotation.goodHighlight),
        lineNoteMap(item.goodNotes ?? annotation.goodNotes)
      ));
    }
  }

  if (item.code) {
    sections.push(codeSection(
      'コード',
      item.code,
      '',
      explicitLineSet(item.codeHighlight ?? annotation.codeHighlight),
      lineNoteMap(item.codeNotes ?? annotation.codeNotes)
    ));
  }
  if (item.why) sections.push(`<div class="block"><h2>なぜ？</h2><p>${renderArticleText(item.why)}</p></div>`);
  if (item.tips) sections.push(`<div class="block"><h2>補足</h2><p>${renderArticleText(item.tips)}</p></div>`);

  if (item.related?.length) {
    const relatedItems = item.related.map(fetchItem).filter(Boolean);
    const links = relatedItems.map(related => `
      <button data-related-id="${escapeHtml(related.id)}">
        <strong>${escapeHtml(related.title)}</strong>
        <small>${labels[related.type] ?? related.type} — ${escapeHtml(related.short)}</small>
      </button>
    `).join('');
    if (links) sections.push(`<div class="block"><h2>関連</h2><div class="related">${links}</div></div>`);
  }

  detailContent.innerHTML = `
    <div class="detail-head">
      <span class="badge ${escapeHtml(item.type)}">${labels[item.type] ?? item.type}</span>
      <h1 class="${isCompilerType(item.type) || item.type === 'exception' ? 'mono' : ''}">${escapeHtml(item.title)}</h1>
      <p>${renderArticleText(item.short)}</p>
    </div>
    ${sections.join('')}
  `;

  detailContent.querySelectorAll('[data-related-id]').forEach(button => {
    button.addEventListener('click', () => navigateToItem(button.dataset.relatedId));
  });

  detailContent.querySelectorAll('[data-wiki-id]').forEach(button => {
    button.addEventListener('click', () => navigateToItem(button.dataset.wikiId));
  });

  detailContent.querySelectorAll('[data-copy-code]').forEach(button => {
    button.addEventListener('click', async () => {
      const originalLabel = button.textContent;
      try {
        await copyCode(decodeURIComponent(button.dataset.copyCode ?? ''));
        button.textContent = 'コピーしました';
        button.classList.add('copied');
      } catch {
        button.textContent = 'コピー失敗';
        button.classList.add('copy-failed');
      }
      window.setTimeout(() => {
        button.textContent = originalLabel;
        button.classList.remove('copied', 'copy-failed');
      }, 1400);
    });
  });

  homeView.classList.add('hidden');
  detailView.classList.remove('hidden');
  document.title = `${item.title} - C# Atlas`;
  window.scrollTo({ top: 0, behavior: 'instant' });
}

function fetchItem(id) {
  return allItems.find(x => x.id.toLowerCase() === String(id ?? '').toLowerCase()) ?? null;
}

function renderArticleText(value) {
  return renderWikiText(value, fetchItem);
}

function explicitLineSet(lines) {
  if (!Array.isArray(lines)) return new Set();
  return new Set(lines
    .map(Number)
    .filter(Number.isInteger)
    .filter(line => line > 0)
    .map(line => line - 1));
}

function lineNoteMap(notes) {
  const result = new Map();
  if (!notes || typeof notes !== 'object' || Array.isArray(notes)) return result;
  for (const [rawLine, rawNote] of Object.entries(notes)) {
    const line = Number(rawLine);
    const note = String(rawNote ?? '').trim();
    if (Number.isInteger(line) && line > 0 && note) result.set(line - 1, note);
  }
  return result;
}

function isCompilerType(type) { return type === 'compiler-error' || type === 'compiler-warning'; }
function codeSection(title, value, className, highlightLines = new Set(), notes = new Map()) {
  const lines = String(value ?? '').split('\n');
  const body = lines.map((line, index) => {
    const note = notes.get(index) ?? '';
    const isHighlighted = highlightLines.has(index) || Boolean(note);
    const fallback = className === 'bad' ? 'ここが原因' : className === 'good' ? 'ここを修正' : '';
    const callout = note || fallback;
    const noteHtml = isHighlighted && callout
      ? `<div class="code-note" aria-hidden="true"><span class="code-note-mark">// ↑</span> ${escapeHtml(callout)}</div>`
      : '';
    return `<div class="code-line${isHighlighted ? ' highlighted' : ''}" data-line="${index + 1}"><span class="code-text">${highlightCSharp(line) || ' '}</span></div>${noteHtml}`;
  }).join('');
  const encodedCode = encodeURIComponent(String(value ?? ''));
  return `<div class="block code-block"><div class="code-block-head"><h2>${title}</h2><button type="button" class="copy-code" data-copy-code="${encodedCode}">コピー</button></div><div class="code ${className}">${body}</div></div>`;
}
function escapeHtml(value) {
  return String(value ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');
}
function showHome() {
  detailView.classList.add('hidden');
  homeView.classList.remove('hidden');
  document.title = 'C# Atlas';
  window.scrollTo({ top: 0, behavior: 'instant' });
}
function setType(type) {
  currentType = type;
  document.querySelectorAll('[data-type]').forEach(button => button.classList.toggle('active', button.dataset.type === type));
  loadItems();
}

document.getElementById('searchForm').addEventListener('submit', event => { event.preventDefault(); currentQuery = searchInput.value.trim(); loadItems(); });
document.querySelectorAll('[data-query]').forEach(button => button.addEventListener('click', () => {
  currentQuery = button.dataset.query; searchInput.value = currentQuery; currentType = 'all';
  document.querySelectorAll('[data-type]').forEach(x => x.classList.toggle('active', x.dataset.type === 'all')); loadItems();
}));
document.querySelectorAll('[data-type]').forEach(button => button.addEventListener('click', () => setType(button.dataset.type)));
document.querySelectorAll('[data-nav-type]').forEach(button => button.addEventListener('click', () => { navigateHome(); setType(button.dataset.navType); }));
document.getElementById('homeButton').addEventListener('click', navigateHome);
document.getElementById('backButton').addEventListener('click', navigateHome);
window.addEventListener('hashchange', syncRouteFromHash);

initialize().catch(error => { cards.innerHTML = `<div class="empty" style="display:block">${escapeHtml(error.message)}</div>`; });
