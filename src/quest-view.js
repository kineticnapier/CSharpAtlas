import { questWorldBounds } from './quest-map.js';

const TYPE_COLORS = {
  code: '#58a6ff',
  exception: '#f0883e',
  'compiler-error': '#f85149',
  'compiler-warning': '#d29922',
  logic: '#bc8cff',
  concept: '#3fb950'
};

export function createQuestView({ viewport, world, edgeLayer, nodeLayer, detail, onOpen, typeLabel, copy }) {
  let graph = { nodes: [], edges: [] };
  let scale = 1;
  let panX = 24;
  let panY = 24;
  let dragging = false;
  let dragStart = null;
  let panStart = null;

  function applyTransform() {
    world.style.transform = `translate(${panX}px, ${panY}px) scale(${scale})`;
  }

  function edgePath(a, b) {
    const aWidth = a.kind === 'support' ? 180 : 220;
    const aHeight = a.kind === 'support' ? 68 : 86;
    const bHeight = b.kind === 'support' ? 68 : 86;
    const startX = a.x + aWidth;
    const startY = a.y + aHeight / 2;
    const endX = b.x;
    const endY = b.y + bHeight / 2;
    const bend = Math.max(70, (endX - startX) * 0.45);
    return `M ${startX} ${startY} C ${startX + bend} ${startY}, ${endX - bend} ${endY}, ${endX} ${endY}`;
  }

  function renderDetail(node) {
    if (!detail) return;
    if (!node) {
      detail.innerHTML = `<div class="quest-detail-empty">${copy.selectNode}</div>`;
      return;
    }
    detail.innerHTML = `
      <div class="quest-detail-meta">
        <span class="quest-detail-kind ${node.kind}">${node.kind === 'support' ? copy.support : copy.main}</span>
        <span>${escapeHtml(typeLabel(node.type))}</span>
      </div>
      <h3>${escapeHtml(node.title)}</h3>
      <p>${escapeHtml(node.short)}</p>
      <button type="button" class="quest-open-article">${copy.openArticle}</button>
    `;
    detail.querySelector('.quest-open-article')?.addEventListener('click', () => onOpen(node.id));
  }

  function selectNode(id) {
    nodeLayer.querySelectorAll('.quest-node').forEach(button => {
      button.classList.toggle('selected', button.dataset.id === id);
    });
    renderDetail(graph.nodes.find(node => node.id === id) ?? null);
  }

  function render(nextGraph) {
    graph = nextGraph;
    const byId = new Map(graph.nodes.map(node => [node.id, node]));
    const bounds = questWorldBounds(graph.nodes);
    world.style.width = `${bounds.width}px`;
    world.style.height = `${bounds.height}px`;
    edgeLayer.setAttribute('viewBox', `0 0 ${bounds.width} ${bounds.height}`);
    edgeLayer.setAttribute('width', bounds.width);
    edgeLayer.setAttribute('height', bounds.height);

    edgeLayer.innerHTML = graph.edges.map(edge => {
      const source = byId.get(edge.source);
      const target = byId.get(edge.target);
      if (!source || !target) return '';
      const className = edge.kind === 'support' ? 'quest-edge support' : 'quest-edge';
      return `<path class="${className}" d="${edgePath(source, target)}"></path>`;
    }).join('');

    nodeLayer.innerHTML = graph.nodes.map(node => {
      const color = TYPE_COLORS[node.type] ?? '#8b949e';
      const support = node.kind === 'support';
      return `
        <button type="button" class="quest-node ${support ? 'support' : 'main'}" data-id="${escapeHtml(node.id)}"
          style="left:${node.x}px;top:${node.y}px;--quest-color:${color}">
          <span class="quest-node-type">${escapeHtml(typeLabel(node.type))}</span>
          <strong>${escapeHtml(node.title)}</strong>
          ${support ? `<span class="quest-node-support">${copy.support}</span>` : ''}
        </button>
      `;
    }).join('');

    nodeLayer.querySelectorAll('.quest-node').forEach(button => {
      button.addEventListener('click', event => {
        event.stopPropagation();
        selectNode(button.dataset.id);
      });
      button.addEventListener('dblclick', event => {
        event.stopPropagation();
        onOpen(button.dataset.id);
      });
    });

    renderDetail(null);
    requestAnimationFrame(fit);
  }

  function fit() {
    const bounds = questWorldBounds(graph.nodes);
    const rect = viewport.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    scale = Math.min(1, Math.max(0.28, Math.min((rect.width - 48) / bounds.width, (rect.height - 48) / bounds.height)));
    panX = (rect.width - bounds.width * scale) / 2;
    panY = Math.max(24, (rect.height - bounds.height * scale) / 2);
    applyTransform();
  }

  viewport.addEventListener('pointerdown', event => {
    if (event.target.closest('.quest-node') || event.target.closest('.quest-detail')) return;
    dragging = true;
    dragStart = { x: event.clientX, y: event.clientY };
    panStart = { x: panX, y: panY };
    viewport.setPointerCapture?.(event.pointerId);
    viewport.classList.add('dragging');
  });

  viewport.addEventListener('pointermove', event => {
    if (!dragging) return;
    panX = panStart.x + event.clientX - dragStart.x;
    panY = panStart.y + event.clientY - dragStart.y;
    applyTransform();
  });

  viewport.addEventListener('pointerup', event => {
    dragging = false;
    viewport.releasePointerCapture?.(event.pointerId);
    viewport.classList.remove('dragging');
  });

  viewport.addEventListener('wheel', event => {
    event.preventDefault();
    const rect = viewport.getBoundingClientRect();
    const pointerX = event.clientX - rect.left;
    const pointerY = event.clientY - rect.top;
    const worldX = (pointerX - panX) / scale;
    const worldY = (pointerY - panY) / scale;
    const factor = event.deltaY < 0 ? 1.12 : 0.89;
    scale = Math.max(0.25, Math.min(1.8, scale * factor));
    panX = pointerX - worldX * scale;
    panY = pointerY - worldY * scale;
    applyTransform();
  }, { passive: false });

  return { render, fit };
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
