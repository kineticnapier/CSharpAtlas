export const GRAPH_TYPE_COLORS = {
  code: '#58a6ff',
  exception: '#f0883e',
  'compiler-error': '#f85149',
  'compiler-warning': '#d29922',
  logic: '#bc8cff',
  concept: '#3fb950'
};

const TYPE_ORDER = ['code', 'exception', 'compiler-error', 'compiler-warning', 'logic', 'concept'];
const BASE_CARD = { width: 320, height: 160 };
const SELECTED_CARD = { width: 400, height: 220 };
const COLLISION_PADDING = 180;
const FRAME_INTERVAL = 1000 / 24;

export function cardWorldSize(selected = false) {
  return selected ? { ...SELECTED_CARD } : { ...BASE_CARD };
}

export function cardDetailLevel(scale, selected = false) {
  if (selected) return 'full';
  if (scale < 0.16) return 'shell';
  if (scale < 0.62) return 'title';
  if (scale < 0.95) return 'summary';
  return 'full';
}

export function worldToScreen(point, { width, height, panX = 0, panY = 0, scale = 1 }) {
  return {
    x: width / 2 + panX + point.x * scale,
    y: height / 2 + panY + point.y * scale
  };
}

export function initialGraphScale(nodeCount) {
  if (nodeCount > 220) return 0.56;
  if (nodeCount > 120) return 0.62;
  if (nodeCount > 60) return 0.72;
  return 0.9;
}

export function floatingWorldAmplitude(screenPixels, scale) {
  return screenPixels / Math.max(scale, 0.035);
}

export function cardTextScale(renderScale) {
  return renderScale >= 1 ? 1 : 1 / Math.max(renderScale, 0.01);
}

export function resolveCardCollisions(
  nodes,
  { width = BASE_CARD.width, height = BASE_CARD.height, padding = COLLISION_PADDING, iterations = 12 } = {}
) {
  const personalWidth = width + padding;
  const personalHeight = height + padding;

  for (let pass = 0; pass < iterations; pass++) {
    let moved = false;
    for (let i = 0; i < nodes.length; i++) {
      const a = nodes[i];
      for (let j = i + 1; j < nodes.length; j++) {
        const b = nodes[j];
        let dx = b.x - a.x;
        let dy = b.y - a.y;

        if (dx === 0 && dy === 0) {
          const angle = ((i * 37 + j * 53) % 360) * Math.PI / 180;
          dx = Math.cos(angle) * 0.01;
          dy = Math.sin(angle) * 0.01;
        }

        const nx = dx / personalWidth;
        const ny = dy / personalHeight;
        const normalizedDistance = Math.hypot(nx, ny);
        if (normalizedDistance >= 1) continue;

        const scaleUp = 1 / Math.max(normalizedDistance, 0.0001);
        const targetDx = dx * scaleUp;
        const targetDy = dy * scaleUp;
        const pushX = (targetDx - dx) / 2;
        const pushY = (targetDy - dy) / 2;
        a.x -= pushX;
        a.y -= pushY;
        b.x += pushX;
        b.y += pushY;
        moved = true;
      }
    }
    if (!moved) break;
  }
  return nodes;
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
  const radius = present.length <= 2 ? 1180 : 2200;
  const centers = new Map();
  present.forEach((type, index) => {
    const angle = (Math.PI * 2 * index) / Math.max(present.length, 1) - Math.PI / 2;
    centers.set(type, { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius });
  });
  return centers;
}

function layoutGraph(graph) {
  const centers = categoryCenters(graph.nodes);
  const nodes = graph.nodes.map((node, index) => {
    const center = centers.get(node.type) ?? { x: 0, y: 0 };
    const seed = hashString(node.id);
    const angle = ((seed % 3600) / 3600) * Math.PI * 2;
    const ring = 240 + ((seed >>> 8) % 1180);
    return {
      ...node,
      x: center.x + Math.cos(angle) * ring,
      y: center.y + Math.sin(angle) * ring,
      vx: 0,
      vy: 0,
      floatPhase: ((seed >>> 4) % 628) / 100,
      floatSpeed: 0.00032 + ((seed >>> 16) % 7) * 0.00002,
      index
    };
  });

  const byId = new Map(nodes.map(node => [node.id, node]));
  const edges = graph.edges
    .map(edge => ({ ...edge, a: byId.get(edge.source), b: byId.get(edge.target) }))
    .filter(edge => edge.a && edge.b);

  const iterations = nodes.length > 220 ? 70 : 110;
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
        const force = Math.min(7, 12000 / d2) * heat;
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
      const target = edge.a.ghost || edge.b.ghost ? 900 : 780;
      const force = (dist - target) * 0.0035 * heat;
      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;
      edge.a.vx += fx;
      edge.a.vy += fy;
      edge.b.vx -= fx;
      edge.b.vy -= fy;
    }

    for (const node of nodes) {
      const center = centers.get(node.type) ?? { x: 0, y: 0 };
      const attraction = node.ghost ? 0.00035 : 0.00065;
      node.vx += (center.x - node.x) * attraction * heat;
      node.vy += (center.y - node.y) * attraction * heat;
      node.vx *= 0.84;
      node.vy *= 0.84;
      node.x += node.vx;
      node.y += node.vy;
    }

    if (step % 6 === 5) {
      resolveCardCollisions(nodes, { padding: COLLISION_PADDING, iterations: 2 });
    }
  }

  resolveCardCollisions(nodes, { padding: COLLISION_PADDING, iterations: 40 });
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

export function cardScreenSize(scale, selected = false) {
  const world = cardWorldSize(selected);
  if (selected) {
    return {
      width: clamp(world.width * scale, 180, 420),
      height: clamp(world.height * scale, 100, 230)
    };
  }
  return {
    width: clamp(world.width * scale, 16, 340),
    height: clamp(world.height * scale, 8, 180)
  };
}

function cardScreenRect(point, scale, selected) {
  const size = cardScreenSize(scale, selected);
  return { x: point.x - size.width / 2, y: point.y - size.height / 2, ...size };
}

function lineRectIntersection(rect, from, to) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  if (!dx && !dy) return { ...from };
  const sx = dx === 0 ? Infinity : (rect.width / 2) / Math.abs(dx);
  const sy = dy === 0 ? Infinity : (rect.height / 2) / Math.abs(dy);
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
  let active = false;
  let lastFrame = 0;
  const cardBitmapCache = new Map();

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
    const screenAmplitude = selectedId === node.id ? 4 : node.ghost ? 3 : 5;
    const amplitude = floatingWorldAmplitude(screenAmplitude, scale);
    return {
      x: node.x + Math.cos(time * node.floatSpeed + node.floatPhase) * amplitude,
      y: node.y + Math.sin(time * node.floatSpeed * 0.83 + node.floatPhase) * amplitude
    };
  }

  function nodeToScreen(node, time = performance.now()) {
    const rect = canvas.getBoundingClientRect();
    return worldToScreen(floatingPosition(node, time), {
      width: rect.width,
      height: rect.height,
      panX,
      panY,
      scale
    });
  }

  function screenToWorld(x, y) {
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
    const width = Math.max(200, maxX - minX + 360);
    const height = Math.max(200, maxY - minY + 360);
    scale = clamp(Math.min(rect.width / width, rect.height / height), 0.035, 1.9);
    panX = -((minX + maxX) / 2) * scale;
    panY = -((minY + maxY) / 2) * scale;
    draw(performance.now());
  }

  function focus() {
    if (!state.nodes.length) {
      scale = 1;
      panX = 0;
      panY = 0;
      draw(performance.now());
      return;
    }

    const degree = new Map(state.nodes.map(node => [node.id, 0]));
    for (const edge of state.edges) {
      degree.set(edge.source, (degree.get(edge.source) ?? 0) + 1);
      degree.set(edge.target, (degree.get(edge.target) ?? 0) + 1);
    }
    const candidates = state.nodes.filter(node => !node.ghost);
    const anchor = (candidates.length ? candidates : state.nodes).reduce((best, node) =>
      (degree.get(node.id) ?? 0) > (degree.get(best.id) ?? 0) ? node : best
    );

    scale = initialGraphScale(state.nodes.length);
    panX = -anchor.x * scale;
    panY = -anchor.y * scale;
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

  function createCardBitmap(node, detail, selected, renderScale) {
    const size = cardWorldSize(selected);
    const textScale = cardTextScale(renderScale);
    const offscreen = document.createElement('canvas');
    offscreen.width = size.width * 2;
    offscreen.height = size.height * 2;
    const ctx = offscreen.getContext('2d');
    ctx.scale(2, 2);

    const color = GRAPH_TYPE_COLORS[node.type] ?? '#8b949e';
    ctx.globalAlpha = node.ghost ? 0.58 : 1;
    roundedRect(ctx, 1, 1, size.width - 2, size.height - 2, 10);
    ctx.fillStyle = node.ghost ? 'rgba(22,27,34,0.82)' : 'rgba(22,27,34,0.97)';
    ctx.fill();
    ctx.lineWidth = 1.2;
    ctx.strokeStyle = color;
    ctx.stroke();
    ctx.fillStyle = color;
    roundedRect(ctx, 1, 1, 5, size.height - 2, 2.5);
    ctx.fill();

    if (detail === 'shell') {
      ctx.globalAlpha = 1;
      return offscreen;
    }

    const left = 14 * textScale;
    const contentWidth = Math.max(12 * textScale, size.width - 24 * textScale);
    ctx.textBaseline = 'top';
    ctx.font = `600 ${10 * textScale}px ui-sans-serif, system-ui, sans-serif`;
    ctx.fillStyle = color;
    ctx.fillText(trimText(ctx, typeLabel?.(node.type) ?? node.type, contentWidth), left, 10 * textScale);
    ctx.font = `700 ${(selected ? 16 : 14) * textScale}px ui-sans-serif, system-ui, sans-serif`;
    ctx.fillStyle = '#f0f6fc';
    ctx.fillText(trimText(ctx, node.title || node.id, contentWidth), left, 26 * textScale);

    if (detail !== 'title') {
      ctx.font = `${11 * textScale}px ui-sans-serif, system-ui, sans-serif`;
      ctx.fillStyle = '#8b949e';
      const lines = wrapLines(ctx, node.short, contentWidth, detail === 'full' ? 2 : 1);
      let y = (selected ? 49 : 47) * textScale;
      for (const line of lines) {
        ctx.fillText(line, left, y);
        y += 14 * textScale;
      }

      if (detail === 'full' && node.tags?.length) {
        ctx.font = `600 ${9 * textScale}px ui-monospace, SFMono-Regular, Consolas, monospace`;
        const tagY = size.height - 17 * textScale;
        let x = left;
        for (const tag of node.tags.slice(0, 3)) {
          const label = String(tag);
          const tagWidth = ctx.measureText(label).width + 10 * textScale;
          if (x + tagWidth > size.width - 10 * textScale) break;
          roundedRect(ctx, x, tagY - 3 * textScale, tagWidth, 15 * textScale, 5 * textScale);
          ctx.fillStyle = 'rgba(110,118,129,0.2)';
          ctx.fill();
          ctx.fillStyle = '#c9d1d9';
          ctx.fillText(label, x + 5 * textScale, tagY);
          x += tagWidth + 5 * textScale;
        }
      }
    }

    ctx.globalAlpha = 1;
    return offscreen;
  }

  function getCardBitmap(node, detail, selected, renderScale) {
    const scaleBucket = Math.round(renderScale * 20) / 20;
    const key = `${node.id}|${detail}|${selected ? 1 : 0}|${node.ghost ? 1 : 0}|${scaleBucket}`;
    let bitmap = cardBitmapCache.get(key);
    if (!bitmap) {
      bitmap = createCardBitmap(node, detail, selected, Math.max(scaleBucket, 0.01));
      cardBitmapCache.set(key, bitmap);
    }
    return bitmap;
  }

  function drawCard(node, point, neighbors) {
    const selected = node.id === selectedId;
    const hovered = node.id === hoveredId;
    const related = neighbors.has(node.id);
    const dim = selectedId && !selected && !related;
    const detail = cardDetailLevel(scale, selected);
    const rect = cardScreenRect(point, scale, selected);
    const worldSize = cardWorldSize(selected);
    const renderScale = rect.width / worldSize.width;
    const bitmap = getCardBitmap(node, detail, selected, renderScale);

    context.save();
    context.globalAlpha = dim ? 0.12 : 1;
    context.drawImage(bitmap, rect.x, rect.y, rect.width, rect.height);
    if (selected || hovered) {
      roundedRect(context, rect.x, rect.y, rect.width, rect.height, Math.max(5, 10 * Math.min(scale, 1.3)));
      context.lineWidth = selected ? 2.2 : 1.7;
      context.strokeStyle = '#f0f6fc';
      context.stroke();
    }
    context.restore();
  }

  function draw(time = performance.now()) {
    const rect = canvas.getBoundingClientRect();
    context.clearRect(0, 0, rect.width, rect.height);
    const neighbors = neighborIds();
    const geometry = new Map();

    for (const node of state.nodes) {
      const point = nodeToScreen(node, time);
      geometry.set(node.id, {
        point,
        rect: cardScreenRect(point, scale, node.id === selectedId)
      });
    }

    for (const edge of state.edges) {
      const ga = geometry.get(edge.source);
      const gb = geometry.get(edge.target);
      if (!ga || !gb) continue;
      const a = lineRectIntersection(ga.rect, ga.point, gb.point);
      const b = lineRectIntersection(gb.rect, gb.point, ga.point);
      const isActive = connectedToSelected(edge);
      context.beginPath();
      context.moveTo(a.x, a.y);
      context.lineTo(b.x, b.y);
      context.lineWidth = isActive ? 2 : 0.7;
      context.strokeStyle = isActive
        ? 'rgba(201, 209, 217, 0.82)'
        : 'rgba(139, 148, 158, 0.12)';
      context.stroke();
    }

    const ordered = [...state.nodes].sort((a, b) => {
      const rank = node => node.id === selectedId ? 3 : node.id === hoveredId ? 2 : neighbors.has(node.id) ? 1 : 0;
      return rank(a) - rank(b);
    });
    for (const node of ordered) drawCard(node, geometry.get(node.id).point, neighbors);
  }

  function hitTest(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const time = performance.now();
    const ordered = [...state.nodes].reverse();
    for (const node of ordered) {
      const point = nodeToScreen(node, time);
      const card = cardScreenRect(point, scale, node.id === selectedId);
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
    if (active && !document.hidden && time - lastFrame >= FRAME_INTERVAL) {
      lastFrame = time;
      draw(time);
    }
    animationFrame = requestAnimationFrame(animate);
  }

  canvas.addEventListener('mousemove', event => {
    const node = hitTest(event.clientX, event.clientY);
    hoveredId = node?.id ?? null;
    updateTooltip(node, event);
    if (dragging && dragStart && panStart) {
      panX = panStart.x + event.clientX - dragStart.x;
      panY = panStart.y + event.clientY - dragStart.y;
      draw(performance.now());
    }
  });

  canvas.addEventListener('mouseleave', () => {
    hoveredId = null;
    dragging = false;
    canvas.classList.remove('dragging');
    updateTooltip(null);
    if (active) draw(performance.now());
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
    const before = screenToWorld(pointerX, pointerY);
    const factor = event.deltaY < 0 ? 1.12 : 0.89;
    scale = clamp(scale * factor, 0.035, 4.5);
    const after = worldToScreen(before, {
      width: rect.width,
      height: rect.height,
      panX,
      panY,
      scale
    });
    panX += pointerX - after.x;
    panY += pointerY - after.y;
    draw(performance.now());
  }, { passive: false });

  cancelAnimationFrame(animationFrame);
  animationFrame = requestAnimationFrame(animate);

  return {
    setGraph(graph) {
      state = layoutGraph(graph);
      selectedId = null;
      hoveredId = null;
      cardBitmapCache.clear();
      resize();
      if (active) focus();
      else draw(performance.now());
    },
    setActive(nextActive) {
      active = Boolean(nextActive);
      if (active) {
        lastFrame = 0;
        resize();
        draw(performance.now());
      }
    },
    fit,
    focus,
    resize,
    draw
  };
}