export const GRAPH_TYPE_COLORS = {
  code: '#58a6ff',
  exception: '#f0883e',
  'compiler-error': '#f85149',
  'compiler-warning': '#d29922',
  logic: '#bc8cff',
  concept: '#3fb950'
};

const TYPE_ORDER = ['code', 'exception', 'compiler-error', 'compiler-warning', 'logic', 'concept'];
const BASE_CARD = { width: 188, height: 92 };
const SELECTED_CARD = { width: 232, height: 122 };

export function cardWorldSize(selected = false) {
  return selected ? { ...SELECTED_CARD } : { ...BASE_CARD };
}

export function cardDetailLevel(scale, selected = false) {
  if (selected) return 'full';
  if (scale < 0.55) return 'title';
  if (scale < 1.1) return 'summary';
  return 'full';
}

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
  const radius = present.length <= 2 ? 420 : 820;
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
    const ring = 70 + ((seed >>> 8) % 260);
    return {
      ...node,
      x: center.x + Math.cos(angle) * ring,
      y: center.y + Math.sin(angle) * ring,
      vx: 0,
      vy: 0,
      floatPhase: ((seed >>> 4) % 628) / 100,
      floatSpeed: 0.00022 + ((seed >>> 16) % 9) * 0.000012,
      index
    };
  });
  const byId = new Map(nodes.map(node => [node.id, node]));
  const edges = graph.edges
    .map(edge => ({ ...edge, a: byId.get(edge.source), b: byId.get(edge.target) }))
    .filter(edge => edge.a && edge.b);

  const iterations = nodes.length > 220 ? 150 : 190;
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
        const force = Math.min(10, 11000 / d2) * heat;
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
      const target = edge.a.ghost || edge.b.ghost ? 300 : 245;
      const force = (dist - target) * 0.012 * heat;
      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;
      edge.a.vx += fx;
      edge.a.vy += fy;
      edge.b.vx -= fx;
      edge.b.vy -= fy;
    }

    for (const node of nodes) {
      const center = centers.get(node.type) ?? { x: 0, y: 0 };
      const attraction = node.ghost ? 0.0016 : 0.0034;
      node.vx += (center.x - node.x) * attraction * heat;
      node.vy += (center.y - node.y) * attraction * heat;
      node.vx *= 0.8;
      node.vy *= 0.8;
      node.x += node.vx;
      node.y += node.vy;
    }
  }

  return { nodes, edges, byId };
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function roundedRect(context, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + r, y);
  context.arcTo(x + width, y, x + width, y + height, r);
  context.arcTo(x + width, y + height, x, y + height, r);
  context.arcTo(x, y + height, x, y, r);
  context.arcTo(x, y, x + width, y, r);
  context.closePath();
}

function trimText(context, text, maxWidth) {
  const value = String(text ?? '');
  if (context.measureText(value).width <= maxWidth) return value;
  let lo = 0;
  let hi = value.length;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (context.measureText(`${value.slice(0, mid)}…`).width <= maxWidth) lo = mid;
    else hi = mid - 1;
  }
  return `${value.slice(0, lo)}…`;
}

function wrapLines(context, text, maxWidth, maxLines) {
  const words = String(text ?? '').trim().split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  const lines = [];
  let current = '';
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (!current || context.measureText(candidate).width <= maxWidth) {
      current = candidate;
      continue;
    }
    lines.push(current);
    current = word;
    if (lines.length === maxLines) break;
  }
  if (lines.length < maxLines && current) lines.push(current);
  if (lines.length === maxLines && words.join(' ').length > lines.join(' ').length) {
    lines[maxLines - 1] = trimText(context, lines[maxLines - 1], maxWidth);
  }
  return lines.slice(0, maxLines);
}

function cardScreenRect(node, point, scale, selected) {
  const world = cardWorldSize(selected);
  const width = clamp(world.width * scale, selected ? 132 : 64, selected ? 280 : 220);
  const height = clamp(world.height * scale, selected ? 78 : 34, selected ? 150 : 116);
  return {
    x: point.x - width / 2,
    y: point.y - height / 2,
    width,
    height
  };
}

function lineRectIntersection(rect, from, to) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  if (!dx && !dy) return { ...from };
  const halfW = rect.width / 2;
  const halfH = rect.height / 2;
  const sx = dx === 0 ? Infinity : halfW / Math.abs(dx);
  const sy = dy === 0 ? Infinity : halfH / Math.abs(dy);
  const t = Math.min(sx, sy);
  return { x: from.x + dx * t, y: from.y + dy * t };
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
  let animationFrame = 0;
  let visible = true;

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
    draw(performance.now());
  }

  function floatingPosition(node, time) {
    const amplitude = selectedId === node.id ? 2.5 : node.ghost ? 2 : 4.5;
    return {
      x: node.x + Math.cos(time * node.floatSpeed + node.floatPhase) * amplitude,
      y: node.y + Math.sin(time * node.floatSpeed * 0.83 + node.floatPhase) * amplitude
    };
  }

  function graphToScreen(node, time = performance.now()) {
    const rect = canvas.getBoundingClientRect();
    const floating = floatingPosition(node, time);
    return {
      x: rect.width / 2 + panX + floating.x * scale,
      y: rect.height / 2 + panY + floating.y * scale
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
      draw(performance.now());
      return;
    }
    const halfW = BASE_CARD.width / 2;
    const halfH = BASE_CARD.height / 2;
    const minX = Math.min(...state.nodes.map(node => node.x - halfW));
    const maxX = Math.max(...state.nodes.map(node => node.x + halfW));
    const minY = Math.min(...state.nodes.map(node => node.y - halfH));
    const maxY = Math.max(...state.nodes.map(node => node.y + halfH));
    const rect = canvas.getBoundingClientRect();
    const width = Math.max(200, maxX - minX + 160);
    const height = Math.max(200, maxY - minY + 160);
    scale = clamp(Math.min(rect.width / width, rect.height / height), 0.07, 1.9);
    panX = -((minX + maxX) / 2) * scale;
    panY = -((minY + maxY) / 2) * scale;
    draw(performance.now());
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

  function drawCard(node, point, neighbors) {
    const selected = node.id === selectedId;
    const hovered = node.id === hoveredId;
    const related = neighbors.has(node.id);
    const dim = selectedId && !selected && !related;
    const detail = cardDetailLevel(scale, selected);
    const rect = cardScreenRect(node, point, scale, selected);
    const color = GRAPH_TYPE_COLORS[node.type] ?? '#8b949e';
    const alpha = dim ? 0.13 : node.ghost ? 0.34 : 0.96;

    context.save();
    context.globalAlpha = alpha;
    context.shadowColor = selected || hovered ? 'rgba(88,166,255,0.32)' : 'rgba(0,0,0,0.2)';
    context.shadowBlur = selected ? 22 : hovered ? 16 : 8;
    context.shadowOffsetY = 4;
    roundedRect(context, rect.x, rect.y, rect.width, rect.height, Math.max(5, 10 * Math.min(scale, 1.3)));
    context.fillStyle = node.ghost ? 'rgba(22,27,34,0.68)' : 'rgba(22,27,34,0.94)';
    context.fill();
    context.shadowColor = 'transparent';
    context.lineWidth = selected ? 2.2 : hovered ? 1.8 : 1;
    context.strokeStyle = selected || hovered ? '#f0f6fc' : color;
    context.stroke();

    const accentWidth = Math.max(3, Math.min(6, rect.width * 0.035));
    context.fillStyle = color;
    roundedRect(context, rect.x, rect.y, accentWidth, rect.height, accentWidth / 2);
    context.fill();

    const pad = Math.max(5, Math.min(12, rect.width * 0.06));
    const left = rect.x + pad + accentWidth;
    const contentWidth = Math.max(20, rect.width - pad * 2 - accentWidth);
    const top = rect.y + pad;

    const badgeSize = clamp(9.5 * Math.max(scale, 0.75), 8, 12);
    context.font = `600 ${badgeSize}px ui-sans-serif, system-ui, sans-serif`;
    context.fillStyle = color;
    context.textBaseline = 'top';
    context.fillText(trimText(context, typeLabel?.(node.type) ?? node.type, contentWidth), left, top);

    const titleSize = clamp((selected ? 16 : 14) * Math.max(scale, 0.72), 9, selected ? 17 : 15);
    context.font = `700 ${titleSize}px ui-sans-serif, system-ui, sans-serif`;
    context.fillStyle = '#f0f6fc';
    const titleY = top + badgeSize + 4;
    context.fillText(trimText(context, node.title || node.id, contentWidth), left, titleY);

    if (detail !== 'title') {
      const bodySize = clamp(11.5 * Math.max(scale, 0.78), 8.5, 12.5);
      context.font = `${bodySize}px ui-sans-serif, system-ui, sans-serif`;
      context.fillStyle = '#8b949e';
      const lines = wrapLines(context, node.short, contentWidth, detail === 'full' ? 2 : 1);
      let y = titleY + titleSize + 6;
      for (const line of lines) {
        context.fillText(line, left, y);
        y += bodySize + 3;
      }

      if (detail === 'full' && node.tags?.length && rect.height >= 72) {
        const tagSize = clamp(9.5 * Math.max(scale, 0.8), 8, 10.5);
        context.font = `600 ${tagSize}px ui-monospace, SFMono-Regular, Consolas, monospace`;
        const tagY = rect.y + rect.height - pad - tagSize;
        let x = left;
        for (const tag of node.tags.slice(0, 3)) {
          const label = String(tag);
          const width = context.measureText(label).width + 10;
          if (x + width > rect.x + rect.width - pad) break;
          roundedRect(context, x, tagY - 3, width, tagSize + 6, 5);
          context.fillStyle = 'rgba(110,118,129,0.2)';
          context.fill();
          context.fillStyle = '#c9d1d9';
          context.fillText(label, x + 5, tagY);
          x += width + 5;
        }
      }
    }

    context.restore();
    return rect;
  }

  function draw(time = performance.now()) {
    const rect = canvas.getBoundingClientRect();
    context.clearRect(0, 0, rect.width, rect.height);
    const neighbors = neighborIds();
    const geometry = new Map();

    for (const node of state.nodes) {
      const point = graphToScreen(node, time);
      const selected = node.id === selectedId;
      geometry.set(node.id, {
        point,
        rect: cardScreenRect(node, point, scale, selected)
      });
    }

    for (const edge of state.edges) {
      const ga = geometry.get(edge.source);
      const gb = geometry.get(edge.target);
      if (!ga || !gb) continue;
      const a = lineRectIntersection(ga.rect, ga.point, gb.point);
      const b = lineRectIntersection(gb.rect, gb.point, ga.point);
      const active = connectedToSelected(edge);
      context.beginPath();
      context.moveTo(a.x, a.y);
      context.lineTo(b.x, b.y);
      context.lineWidth = active ? 2 : 0.85;
      context.strokeStyle = active
        ? 'rgba(201, 209, 217, 0.82)'
        : 'rgba(139, 148, 158, 0.15)';
      context.stroke();
    }

    const ordered = [...state.nodes].sort((a, b) => {
      const rank = node => node.id === selectedId ? 3 : node.id === hoveredId ? 2 : neighbors.has(node.id) ? 1 : 0;
      return rank(a) - rank(b);
    });
    for (const node of ordered) {
      const point = geometry.get(node.id)?.point ?? graphToScreen(node, time);
      drawCard(node, point, neighbors);
    }
  }

  function hitTest(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const time = performance.now();
    const ordered = [...state.nodes].reverse();
    for (const node of ordered) {
      const point = graphToScreen(node, time);
      const card = cardScreenRect(node, point, scale, node.id === selectedId);
      if (x >= card.x && x <= card.x + card.width && y >= card.y && y <= card.y + card.height) return node;
    }
    return null;
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

  function animate(time) {
    if (visible) draw(time);
    animationFrame = requestAnimationFrame(animate);
  }

  canvas.addEventListener('mousemove', event => {
    const node = hitTest(event.clientX, event.clientY);
    hoveredId = node?.id ?? null;
    updateTooltip(node, event);
    if (dragging && dragStart && panStart) {
      panX = panStart.x + event.clientX - dragStart.x;
      panY = panStart.y + event.clientY - dragStart.y;
    }
  });

  canvas.addEventListener('mouseleave', () => {
    hoveredId = null;
    dragging = false;
    canvas.classList.remove('dragging');
    updateTooltip(null);
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
    draw(performance.now());
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
    scale = clamp(scale * factor, 0.06, 4.5);
    const after = graphToScreen(before, performance.now());
    panX += pointerX - after.x;
    panY += pointerY - after.y;
  }, { passive: false });

  document.addEventListener('visibilitychange', () => {
    visible = !document.hidden;
  });

  cancelAnimationFrame(animationFrame);
  animationFrame = requestAnimationFrame(animate);

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
