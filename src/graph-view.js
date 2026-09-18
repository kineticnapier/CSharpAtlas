export const GRAPH_TYPE_COLORS = {
  code: '#58a6ff',
  exception: '#f0883e',
  'compiler-error': '#f85149',
  'compiler-warning': '#d29922',
  logic: '#bc8cff',
  concept: '#3fb950'
};

const TYPE_ORDER = ['code', 'exception', 'compiler-error', 'compiler-warning', 'logic', 'concept'];

function hashString(value) {
  let hash = 2166136261;
  for (const ch of String(value ?? '')) {
    hash ^= ch.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function categoryCenters(nodes) {
  const present = TYPE_ORDER.filter(type => nodes.some(node => node.type === type));
  const radius = present.length <= 2 ? 180 : 330;
  const centers = new Map();
  present.forEach((type, index) => {
    const angle = (Math.PI * 2 * index) / Math.max(present.length, 1) - Math.PI / 2;
    centers.set(type, {
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius
    });
  });
  return centers;
}

function layoutGraph(graph) {
  const centers = categoryCenters(graph.nodes);
  const nodes = graph.nodes.map((node, index) => {
    const center = centers.get(node.type) ?? { x: 0, y: 0 };
    const seed = hashString(node.id);
    const angle = ((seed % 3600) / 3600) * Math.PI * 2;
    const ring = 35 + ((seed >>> 8) % 140);
    return {
      ...node,
      x: center.x + Math.cos(angle) * ring,
      y: center.y + Math.sin(angle) * ring,
      vx: 0,
      vy: 0,
      index
    };
  });
  const byId = new Map(nodes.map(node => [node.id, node]));
  const edges = graph.edges
    .map(edge => ({ ...edge, a: byId.get(edge.source), b: byId.get(edge.target) }))
    .filter(edge => edge.a && edge.b);

  const iterations = nodes.length > 220 ? 125 : 165;
  for (let step = 0; step < iterations; step++) {
    const heat = 1 - step / iterations;

    for (let i = 0; i < nodes.length; i++) {
      const a = nodes[i];
      for (let j = i + 1; j < nodes.length; j++) {
        const b = nodes[j];
        let dx = b.x - a.x;
        let dy = b.y - a.y;
        let d2 = dx * dx + dy * dy;
        if (d2 < 1) {
          dx = ((hashString(`${a.id}:${b.id}`) % 17) - 8) * 0.1 || 0.1;
          dy = ((hashString(`${b.id}:${a.id}`) % 19) - 9) * 0.1 || -0.1;
          d2 = dx * dx + dy * dy;
        }
        const dist = Math.sqrt(d2);
        const force = Math.min(7, 1750 / d2) * heat;
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        a.vx -= fx;
        a.vy -= fy;
        b.vx += fx;
        b.vy += fy;
      }
    }

    for (const edge of edges) {
      const dx = edge.b.x - edge.a.x;
      const dy = edge.b.y - edge.a.y;
      const dist = Math.max(1, Math.hypot(dx, dy));
      const target = edge.a.ghost || edge.b.ghost ? 115 : 88;
      const force = (dist - target) * 0.018 * heat;
      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;
      edge.a.vx += fx;
      edge.a.vy += fy;
      edge.b.vx -= fx;
      edge.b.vy -= fy;
    }

    for (const node of nodes) {
      const center = centers.get(node.type) ?? { x: 0, y: 0 };
      const attraction = node.ghost ? 0.0025 : 0.006;
      node.vx += (center.x - node.x) * attraction * heat;
      node.vy += (center.y - node.y) * attraction * heat;
      node.vx *= 0.78;
      node.vy *= 0.78;
      node.x += node.vx;
      node.y += node.vy;
    }
  }

  return { nodes, edges, byId };
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function createGraphCanvas({ canvas, tooltip, onOpen, typeLabel }) {
  const context = canvas.getContext('2d');
  let state = layoutGraph({ nodes: [], edges: [] });
  let scale = 1;
  let panX = 0;
  let panY = 0;
  let hoveredId = null;
  let selectedId = null;
  let dragging = false;
  let dragStart = null;
  let panStart = null;

  function resize() {
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const width = Math.max(1, Math.round(rect.width * dpr));
    const height = Math.max(1, Math.round(rect.height * dpr));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    draw();
  }

  function graphToScreen(node) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: rect.width / 2 + panX + node.x * scale,
      y: rect.height / 2 + panY + node.y * scale
    };
  }

  function screenToGraph(x, y) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (x - rect.width / 2 - panX) / scale,
      y: (y - rect.height / 2 - panY) / scale
    };
  }

  function fit() {
    if (!state.nodes.length) {
      scale = 1;
      panX = 0;
      panY = 0;
      draw();
      return;
    }
    const xs = state.nodes.map(node => node.x);
    const ys = state.nodes.map(node => node.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const rect = canvas.getBoundingClientRect();
    const width = Math.max(120, maxX - minX + 120);
    const height = Math.max(120, maxY - minY + 120);
    scale = clamp(Math.min(rect.width / width, rect.height / height), 0.18, 1.9);
    panX = -((minX + maxX) / 2) * scale;
    panY = -((minY + maxY) / 2) * scale;
    draw();
  }

  function connectedToSelected(edge) {
    return selectedId && (edge.source === selectedId || edge.target === selectedId);
  }

  function neighborIds() {
    const result = new Set();
    if (!selectedId) return result;
    for (const edge of state.edges) {
      if (edge.source === selectedId) result.add(edge.target);
      if (edge.target === selectedId) result.add(edge.source);
    }
    return result;
  }

  function draw() {
    const rect = canvas.getBoundingClientRect();
    context.clearRect(0, 0, rect.width, rect.height);
    const neighbors = neighborIds();

    for (const edge of state.edges) {
      const a = state.byId.get(edge.source);
      const b = state.byId.get(edge.target);
      if (!a || !b) continue;
      const pa = graphToScreen(a);
      const pb = graphToScreen(b);
      const active = connectedToSelected(edge);
      context.beginPath();
      context.moveTo(pa.x, pa.y);
      context.lineTo(pb.x, pb.y);
      context.lineWidth = active ? 1.9 : 0.7;
      context.strokeStyle = active
        ? 'rgba(201, 209, 217, 0.9)'
        : 'rgba(139, 148, 158, 0.17)';
      context.stroke();
    }

    for (const node of state.nodes) {
      const point = graphToScreen(node);
      const selected = node.id === selectedId;
      const hovered = node.id === hoveredId;
      const related = neighbors.has(node.id);
      const radius = selected ? 7 : hovered ? 6 : node.ghost ? 2.6 : 4;
      const dim = selectedId && !selected && !related;
      context.beginPath();
      context.arc(point.x, point.y, radius, 0, Math.PI * 2);
      context.fillStyle = GRAPH_TYPE_COLORS[node.type] ?? '#8b949e';
      context.globalAlpha = dim ? 0.12 : node.ghost ? 0.27 : 0.9;
      context.fill();
      context.globalAlpha = 1;
      if (selected || hovered) {
        context.lineWidth = 2;
        context.strokeStyle = '#f0f6fc';
        context.stroke();
      }
    }

    const labelIds = new Set([hoveredId, selectedId].filter(Boolean));
    for (const id of labelIds) {
      const node = state.byId.get(id);
      if (!node) continue;
      const point = graphToScreen(node);
      context.font = '12px ui-sans-serif, system-ui, sans-serif';
      context.textBaseline = 'middle';
      const text = node.title || node.id;
      const width = context.measureText(text).width;
      context.fillStyle = 'rgba(13, 17, 23, 0.92)';
      context.fillRect(point.x + 9, point.y - 10, width + 10, 20);
      context.fillStyle = '#f0f6fc';
      context.fillText(text, point.x + 14, point.y);
    }
  }

  function hitTest(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    let best = null;
    let bestDistance = Infinity;
    for (const node of state.nodes) {
      const point = graphToScreen(node);
      const distance = Math.hypot(point.x - x, point.y - y);
      const radius = node.ghost ? 8 : 10;
      if (distance <= radius && distance < bestDistance) {
        best = node;
        bestDistance = distance;
      }
    }
    return best;
  }

  function updateTooltip(node, event) {
    if (!tooltip) return;
    if (!node) {
      tooltip.classList.add('hidden');
      return;
    }
    tooltip.replaceChildren();
    const strong = document.createElement('strong');
    strong.textContent = node.title || node.id;
    const meta = document.createElement('span');
    meta.textContent = `${typeLabel?.(node.type) ?? node.type}${node.ghost ? ' · outside category' : ''}`;
    tooltip.append(strong, meta);
    tooltip.classList.remove('hidden');
    const shell = canvas.parentElement.getBoundingClientRect();
    tooltip.style.left = `${clamp(event.clientX - shell.left + 12, 8, shell.width - 290)}px`;
    tooltip.style.top = `${clamp(event.clientY - shell.top + 12, 8, shell.height - 60)}px`;
  }

  canvas.addEventListener('mousemove', event => {
    const node = hitTest(event.clientX, event.clientY);
    hoveredId = node?.id ?? null;
    updateTooltip(node, event);
    if (dragging && dragStart && panStart) {
      panX = panStart.x + event.clientX - dragStart.x;
      panY = panStart.y + event.clientY - dragStart.y;
    }
    draw();
  });

  canvas.addEventListener('mouseleave', () => {
    hoveredId = null;
    dragging = false;
    canvas.classList.remove('dragging');
    updateTooltip(null);
    draw();
  });

  canvas.addEventListener('mousedown', event => {
    if (hitTest(event.clientX, event.clientY)) return;
    dragging = true;
    dragStart = { x: event.clientX, y: event.clientY };
    panStart = { x: panX, y: panY };
    canvas.classList.add('dragging');
  });

  window.addEventListener('mouseup', () => {
    dragging = false;
    canvas.classList.remove('dragging');
  });

  canvas.addEventListener('click', event => {
    const node = hitTest(event.clientX, event.clientY);
    selectedId = node?.id ?? null;
    draw();
  });

  canvas.addEventListener('dblclick', event => {
    const node = hitTest(event.clientX, event.clientY);
    if (node && typeof onOpen === 'function') onOpen(node.id);
  });

  canvas.addEventListener('wheel', event => {
    event.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const pointerX = event.clientX - rect.left;
    const pointerY = event.clientY - rect.top;
    const before = screenToGraph(pointerX, pointerY);
    const factor = event.deltaY < 0 ? 1.12 : 0.89;
    scale = clamp(scale * factor, 0.12, 4.5);
    const after = graphToScreen(before);
    panX += pointerX - after.x;
    panY += pointerY - after.y;
    draw();
  }, { passive: false });

  return {
    setGraph(graph) {
      state = layoutGraph(graph);
      selectedId = null;
      hoveredId = null;
      resize();
      fit();
    },
    fit,
    resize,
    draw
  };
}
