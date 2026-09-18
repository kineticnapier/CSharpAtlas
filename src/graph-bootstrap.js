import { articleHash } from './article-ui.js';
import { buildArticleGraph } from './article-graph.js';
import { loadLocalizedContent } from './content-loader.js';
import { resolveLocale } from './i18n.js';
import { GRAPH_TYPE_COLORS, createGraphCanvas } from './graph-view.js';
import { typeLabel } from './translation-ui.js';

const LOCALE_STORAGE_KEY = 'csharp-atlas-locale';

const COPY = {
  ja: {
    list: '一覧で見る',
    graph: 'グラフで見る',
    links: '接続',
    both: 'related + Wiki',
    related: 'related のみ',
    wiki: 'Wiki のみ',
    fit: '全体を表示',
    help: 'ドラッグ: 移動 / ホイール: ズーム / クリック: 強調 / ダブルクリック: 記事を開く',
    stats: (active, ghost, edges) => `${active}記事 + 外部${ghost} / ${edges}接続`,
    outside: 'カテゴリ外'
  },
  en: {
    list: 'List view',
    graph: 'Graph view',
    links: 'Links',
    both: 'related + Wiki',
    related: 'related only',
    wiki: 'Wiki only',
    fit: 'Fit graph',
    help: 'Drag: pan / wheel: zoom / click: highlight / double-click: open article',
    stats: (active, ghost, edges) => `${active} articles + ${ghost} outside / ${edges} links`,
    outside: 'outside category'
  }
};

function readStoredLocale() {
  try {
    return window.localStorage?.getItem(LOCALE_STORAGE_KEY) ?? '';
  } catch {
    return '';
  }
}

async function loadJson(path) {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`Failed to load ${path}`);
  return response.json();
}

async function initializeGraphView() {
  const listButton = document.getElementById('listViewButton');
  const graphButton = document.getElementById('graphViewButton');
  const listPanel = document.getElementById('listViewPanel');
  const graphPanel = document.getElementById('graphViewPanel');
  const edgeModeSelect = document.getElementById('edgeModeSelect');
  const resetButton = document.getElementById('graphResetButton');
  const stats = document.getElementById('graphStats');
  const legend = document.getElementById('graphLegend');
  const canvas = document.getElementById('articleGraph');
  const tooltip = document.getElementById('graphTooltip');
  const help = document.getElementById('graphHelp');

  if (!listButton || !graphButton || !listPanel || !graphPanel || !canvas) return;

  const locale = resolveLocale({
    search: window.location.search,
    storedLocale: readStoredLocale()
  });
  const copy = COPY[locale] ?? COPY.ja;
  let view = 'list';
  let currentType = document.querySelector('[data-type].active')?.dataset.type ?? 'all';
  let edgeMode = edgeModeSelect?.value ?? 'both';

  const { articles } = await loadLocalizedContent({
    fetchJson: loadJson,
    locale
  });

  listButton.textContent = copy.list;
  graphButton.textContent = copy.graph;
  document.getElementById('graphEdgeModeLabel').textContent = copy.links;
  resetButton.textContent = copy.fit;
  help.textContent = copy.help;
  edgeModeSelect.options[0].textContent = copy.both;
  edgeModeSelect.options[1].textContent = copy.related;
  edgeModeSelect.options[2].textContent = copy.wiki;

  legend.innerHTML = Object.entries(GRAPH_TYPE_COLORS).map(([type, color]) => `
    <span class="graph-legend-item">
      <span class="graph-legend-dot" style="--legend-color:${color}"></span>
      ${typeLabel(type, locale)}
    </span>
  `).join('') + `
    <span class="graph-legend-item graph-legend-ghost">
      <span class="graph-legend-dot" style="--legend-color:#8b949e"></span>
      ${copy.outside}
    </span>
  `;

  const graphCanvas = createGraphCanvas({
    canvas,
    tooltip,
    typeLabel: type => typeLabel(type, locale),
    onOpen: id => {
      window.location.hash = articleHash(id);
    }
  });

  function rebuild() {
    const graph = buildArticleGraph(articles, { type: currentType, edgeMode });
    graphCanvas.setGraph(graph);
    const ghostCount = graph.nodes.filter(node => node.ghost).length;
    const activeCount = graph.nodes.length - ghostCount;
    stats.textContent = copy.stats(activeCount, ghostCount, graph.edges.length);
  }

  function setView(nextView) {
    view = nextView;
    const showingGraph = view === 'graph';
    listPanel.classList.toggle('hidden', showingGraph);
    graphPanel.classList.toggle('hidden', !showingGraph);
    listButton.classList.toggle('active', !showingGraph);
    graphButton.classList.toggle('active', showingGraph);
    listButton.setAttribute('aria-pressed', String(!showingGraph));
    graphButton.setAttribute('aria-pressed', String(showingGraph));
    graphCanvas.setActive(showingGraph);
    if (showingGraph) {
      requestAnimationFrame(() => {
        graphCanvas.resize();
        graphCanvas.fit();
      });
    }
  }

  listButton.addEventListener('click', () => setView('list'));
  graphButton.addEventListener('click', () => setView('graph'));
  edgeModeSelect.addEventListener('change', () => {
    edgeMode = edgeModeSelect.value;
    rebuild();
  });
  resetButton.addEventListener('click', () => graphCanvas.fit());

  document.querySelectorAll('[data-type]').forEach(button => {
    button.addEventListener('click', () => {
      currentType = button.dataset.type ?? 'all';
      rebuild();
    });
  });

  document.querySelectorAll('[data-nav-type]').forEach(button => {
    button.addEventListener('click', () => {
      currentType = button.dataset.navType ?? 'all';
      rebuild();
    });
  });

  window.addEventListener('resize', () => graphCanvas.resize());
  rebuild();
  setView('list');
}

initializeGraphView().catch(error => {
  const stats = document.getElementById('graphStats');
  if (stats) stats.textContent = error.message;
});
