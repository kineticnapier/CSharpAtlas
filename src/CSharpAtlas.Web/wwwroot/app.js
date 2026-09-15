const labels = {
  code: 'コード',
  exception: '例外',
  compiler: 'コンパイル',
  logic: '論理エラー',
  concept: '仕組み'
};

let currentType = 'all';
let currentQuery = '';
let currentItems = [];

const homeView = document.getElementById('homeView');
const detailView = document.getElementById('detailView');
const cards = document.getElementById('cards');
const empty = document.getElementById('empty');
const listTitle = document.getElementById('listTitle');
const resultCount = document.getElementById('resultCount');
const searchInput = document.getElementById('searchInput');
const detailContent = document.getElementById('detailContent');

async function loadItems() {
  const params = new URLSearchParams();
  if (currentQuery) params.set('q', currentQuery);
  if (currentType !== 'all') params.set('type', currentType);

  const response = await fetch(`/api/items?${params}`);
  if (!response.ok) throw new Error('記事の取得に失敗しました。');
  currentItems = await response.json();
  renderCards();
}

function renderCards() {
  cards.innerHTML = currentItems.map(item => `
    <button class="card" data-id="${escapeHtml(item.id)}">
      <span class="badge ${escapeHtml(item.type)}">${labels[item.type] ?? item.type}</span>
      <h3 class="${['exception', 'compiler'].includes(item.type) ? 'mono' : ''}">${escapeHtml(item.title)}</h3>
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

async function openItem(id) {
  const response = await fetch(`/api/items/${encodeURIComponent(id)}`);
  if (!response.ok) return;
  const item = await response.json();

  const sections = [];
  sections.push(`<div class="block"><h2>一言でいうと</h2><div class="note">${escapeHtml(item.summary)}</div></div>`);
  if (item.bad) sections.push(codeSection('こうすると起きる', item.bad, 'bad'));
  if (item.good) sections.push(codeSection('直し方の例', item.good, 'good'));
  if (item.code) sections.push(codeSection('コード', item.code, ''));
  if (item.why) sections.push(`<div class="block"><h2>なぜ？</h2><p>${escapeHtml(item.why)}</p></div>`);
  if (item.tips) sections.push(`<div class="block"><h2>補足</h2><p>${escapeHtml(item.tips)}</p></div>`);

  if (item.related?.length) {
    const relatedItems = await Promise.all(item.related.map(fetchItem));
    const links = relatedItems.filter(Boolean).map(related => `
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
      <h1 class="${['exception', 'compiler'].includes(item.type) ? 'mono' : ''}">${escapeHtml(item.title)}</h1>
      <p>${escapeHtml(item.short)}</p>
    </div>
    ${sections.join('')}
  `;

  detailContent.querySelectorAll('[data-related-id]').forEach(button => {
    button.addEventListener('click', () => openItem(button.dataset.relatedId));
  });

  homeView.classList.add('hidden');
  detailView.classList.remove('hidden');
  window.scrollTo({ top: 0, behavior: 'instant' });
}

async function fetchItem(id) {
  const response = await fetch(`/api/items/${encodeURIComponent(id)}`);
  return response.ok ? response.json() : null;
}

function codeSection(title, value, className) {
  return `<div class="block"><h2>${title}</h2><div class="code ${className}">${escapeHtml(value)}</div></div>`;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function showHome() {
  detailView.classList.add('hidden');
  homeView.classList.remove('hidden');
  window.scrollTo({ top: 0, behavior: 'instant' });
}

function setType(type) {
  currentType = type;
  document.querySelectorAll('[data-type]').forEach(button => {
    button.classList.toggle('active', button.dataset.type === type);
  });
  loadItems();
}

document.getElementById('searchForm').addEventListener('submit', event => {
  event.preventDefault();
  currentQuery = searchInput.value.trim();
  loadItems();
});

document.querySelectorAll('[data-query]').forEach(button => {
  button.addEventListener('click', () => {
    currentQuery = button.dataset.query;
    searchInput.value = currentQuery;
    currentType = 'all';
    document.querySelectorAll('[data-type]').forEach(x => x.classList.toggle('active', x.dataset.type === 'all'));
    loadItems();
  });
});

document.querySelectorAll('[data-type]').forEach(button => {
  button.addEventListener('click', () => setType(button.dataset.type));
});

document.querySelectorAll('[data-nav-type]').forEach(button => {
  button.addEventListener('click', () => {
    showHome();
    setType(button.dataset.navType);
  });
});

document.getElementById('homeButton').addEventListener('click', showHome);
document.getElementById('backButton').addEventListener('click', showHome);

loadItems().catch(error => {
  cards.innerHTML = `<div class="empty" style="display:block">${escapeHtml(error.message)}</div>`;
});
