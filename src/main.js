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

let currentType = 'all';
let currentQuery = '';
let currentItems = [];
let allItems = [];
let wikiTerms = [];

const homeView = document.getElementById('homeView');
const detailView = document.getElementById('detailView');
const cards = document.getElementById('cards');
const empty = document.getElementById('empty');
const listTitle = document.getElementById('listTitle');
const resultCount = document.getElementById('resultCount');
const searchInput = document.getElementById('searchInput');
const detailContent = document.getElementById('detailContent');

async function initialize() {
  const groups = await Promise.all(contentFiles.map(loadContentFile));
  allItems = groups.flat();

  const ids = new Set();
  for (const item of allItems) {
    const id = item.id.toLowerCase();
    if (ids.has(id)) throw new Error(`記事IDが重複しています: ${item.id}`);
    ids.add(id);
  }

  wikiTerms = buildWikiTerms(allItems);
  loadItems();
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
      <div class="tags">${item.tags.slice(0, 3).map(tag => `<span class="tag">${escapeHtml(tag)}</span>`).join('')}</div>
    </button>
  `).join('');

  cards.querySelectorAll('.card').forEach(card => {
    card.addEventListener('click', () => openItem(card.dataset.id));
  });

  empty.style.display = currentItems.length ? 'none' : 'block';
  resultCount.textContent = `${currentItems.length}件`;
  listTitle.textContent = currentQuery
    ? `「${currentQuery}」の検索結果`
    : currentType === 'all' ? 'おすすめ' : labels[currentType];
}

function openItem(id) {
  const item = fetchItem(id);
  if (!item) return;

  const sections = [];
  sections.push(`<div class="block"><h2>一言でいうと</h2><div class="note">${linkify(item.summary, item.id)}</div></div>`);

  if (item.bad && item.good) {
    const changed = changedLineSets(item.bad, item.good);
    const badHighlights = explicitLineSet(item.badHighlight) ?? changed.bad;
    const goodHighlights = explicitLineSet(item.goodHighlight) ?? changed.good;

    sections.push(`<div class="code-compare">
      ${codeSection('原因', item.bad, 'bad', badHighlights)}
      ${codeSection('直し方', item.good, 'good', goodHighlights)}
    </div>`);
  } else {
    if (item.bad) sections.push(codeSection('原因', item.bad, 'bad', explicitLineSet(item.badHighlight)));
    if (item.good) sections.push(codeSection('直し方', item.good, 'good', explicitLineSet(item.goodHighlight)));
  }

  if (item.code) sections.push(codeSection('コード', item.code, '', explicitLineSet(item.codeHighlight)));
  if (item.why) sections.push(`<div class="block"><h2>なぜ？</h2><p>${linkify(item.why, item.id)}</p></div>`);
  if (item.tips) sections.push(`<div class="block"><h2>補足</h2><p>${linkify(item.tips, item.id)}</p></div>`);

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
      <p>${linkify(item.short, item.id)}</p>
    </div>
    ${sections.join('')}
  `;

  detailContent.querySelectorAll('[data-related-id]').forEach(button => {
    button.addEventListener('click', () => openItem(button.dataset.relatedId));
  });

  detailContent.querySelectorAll('[data-wiki-id]').forEach(button => {
    button.addEventListener('click', () => openItem(button.dataset.wikiId));
  });

  homeView.classList.add('hidden');
  detailView.classList.remove('hidden');
  window.scrollTo({ top: 0, behavior: 'instant' });
}

function fetchItem(id) {
  return allItems.find(x => x.id.toLowerCase() === id.toLowerCase()) ?? null;
}

function buildWikiTerms(items) {
  const byTerm = new Map();
  for (const item of items) {
    const terms = new Set([item.title, ...item.tags]);
    for (const rawTerm of terms) {
      const term = String(rawTerm ?? '').trim();
      if (term.length < 2 || isGenericWikiTerm(term)) continue;
      if (!byTerm.has(term)) byTerm.set(term, []);
      byTerm.get(term).push(item);
    }
  }

  const result = [];
  for (const [term, candidates] of byTerm) {
    const exactTitle = candidates.find(item => item.title.toLowerCase() === term.toLowerCase());
    let target = exactTitle ?? null;
    if (!target && candidates.length === 1) target = candidates[0];
    if (!target) {
      const titleMatches = candidates.filter(item => item.title.toLowerCase().includes(term.toLowerCase()));
      if (titleMatches.length === 1) target = titleMatches[0];
    }
    if (target) result.push({ term, id: target.id });
  }
  return result.sort((a, b) => b.term.length - a.term.length);
}

function isGenericWikiTerm(term) {
  return new Set(['例外','頻出','基本','変数','入力','変換','ファイル','配列','型','パス','境界','collection','namespace']).has(term);
}

function linkify(value, currentId) {
  const text = String(value ?? '');
  const terms = wikiTerms.filter(x => x.id !== currentId && text.toLowerCase().includes(x.term.toLowerCase()));
  if (!terms.length) return escapeHtml(text);
  const pattern = new RegExp(terms.map(x => escapeRegExp(x.term)).join('|'), 'gi');
  const lookup = new Map(terms.map(x => [x.term.toLowerCase(), x]));
  let result = '';
  let lastIndex = 0;
  for (const match of text.matchAll(pattern)) {
    const index = match.index ?? 0;
    result += escapeHtml(text.slice(lastIndex, index));
    const found = lookup.get(match[0].toLowerCase());
    result += found
      ? `<button class="wiki-link" data-wiki-id="${escapeHtml(found.id)}">${escapeHtml(match[0])}</button>`
      : escapeHtml(match[0]);
    lastIndex = index + match[0].length;
  }
  result += escapeHtml(text.slice(lastIndex));
  return result;
}

function changedLineSets(badCode, goodCode) {
  const bad = String(badCode ?? '').split('\n');
  const good = String(goodCode ?? '').split('\n');
  const dp = Array.from({ length: bad.length + 1 }, () => Array(good.length + 1).fill(0));

  for (let i = bad.length - 1; i >= 0; i--) {
    for (let j = good.length - 1; j >= 0; j--) {
      dp[i][j] = bad[i] === good[j]
        ? dp[i + 1][j + 1] + 1
        : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }

  const unchangedBad = new Set();
  const unchangedGood = new Set();
  let i = 0;
  let j = 0;
  while (i < bad.length && j < good.length) {
    if (bad[i] === good[j]) {
      unchangedBad.add(i);
      unchangedGood.add(j);
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      i++;
    } else {
      j++;
    }
  }

  return {
    bad: new Set(bad.map((_, index) => index).filter(index => !unchangedBad.has(index))),
    good: new Set(good.map((_, index) => index).filter(index => !unchangedGood.has(index)))
  };
}

function explicitLineSet(lines) {
  if (!Array.isArray(lines)) return null;
  return new Set(lines
    .map(Number)
    .filter(Number.isInteger)
    .filter(line => line > 0)
    .map(line => line - 1));
}

function escapeRegExp(value) { return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
function isCompilerType(type) { return type === 'compiler-error' || type === 'compiler-warning'; }
function codeSection(title, value, className, highlightLines = null) {
  const lines = String(value ?? '').split('\n');
  const highlighted = highlightLines ?? new Set();
  const callout = className === 'bad' ? '原因' : className === 'good' ? '修正' : '';
  const body = lines.map((line, index) => {
    const isHighlighted = highlighted.has(index);
    return `<div class="code-line${isHighlighted ? ' highlighted' : ''}" data-line="${index + 1}"><span class="code-text">${escapeHtml(line) || ' '}</span>${isHighlighted && callout ? `<span class="code-callout">// ← ${callout}</span>` : ''}</div>`;
  }).join('');
  return `<div class="block code-block"><h2>${title}</h2><div class="code ${className}">${body}</div></div>`;
}
function escapeHtml(value) {
  return String(value ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');
}
function showHome() {
  detailView.classList.add('hidden');
  homeView.classList.remove('hidden');
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
document.querySelectorAll('[data-nav-type]').forEach(button => button.addEventListener('click', () => { showHome(); setType(button.dataset.navType); }));
document.getElementById('homeButton').addEventListener('click', showHome);
document.getElementById('backButton').addEventListener('click', showHome);

initialize().catch(error => { cards.innerHTML = `<div class="empty" style="display:block">${escapeHtml(error.message)}</div>`; });
