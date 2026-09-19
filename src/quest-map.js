const DEFAULT_NODE_SIZE = {
  main: { width: 220, height: 86 },
  support: { width: 180, height: 68 }
};

const NODE_VERTICAL_GAP = 40;
const EDGE_CHANNEL_GAP = 24;
const EDGE_OBSTACLE_GAP = 28;

export function extractSupportSnippet(article, maxLines = 4) {
  const bad = typeof article?.bad === 'string' ? article.bad.trim() : '';
  const code = typeof article?.code === 'string' ? article.code.trim() : '';
  const source = bad || code;
  if (!source) return '';

  const lines = source.split('\n');
  const highlights = Array.isArray(article?.badHighlight)
    ? article.badHighlight.filter(line => Number.isInteger(line) && line > 0)
    : [];

  if (!bad || !highlights.length) {
    return lines.slice(0, maxLines).join('\n');
  }

  const first = Math.min(...highlights) - 1;
  const last = Math.max(...highlights) - 1;
  const start = Math.max(0, first - (maxLines - 1));
  const end = Math.min(lines.length, Math.max(last + 1, start + 1));
  return lines.slice(Math.max(start, end - maxLines), end).join('\n');
}

export function buildQuestChapter(articles, chapter) {
  const articlesById = new Map(articles.map(article => [article.id, article]));
  const configById = new Map(chapter.nodes.map(node => [node.id, node]));
  const nodes = chapter.nodes
    .map(config => {
      const article = articlesById.get(config.id);
      if (!article) return null;
      const kind = config.kind ?? 'main';
      return {
        ...article,
        kind,
        code: config.code ?? (kind === 'support' ? extractSupportSnippet(article) : ''),
        prerequisites: [...(config.prerequisites ?? [])],
        attachedTo: config.attachedTo ?? null,
        lane: config.lane,
        offsetY: config.offsetY ?? 0
      };
    })
    .filter(Boolean);

  const edges = [];
  for (const node of chapter.nodes) {
    if (!configById.has(node.id)) continue;
    for (const prerequisite of node.prerequisites ?? []) {
      if (configById.has(prerequisite)) {
        edges.push({ source: prerequisite, target: node.id, kind: 'prerequisite' });
      }
    }
    if ((node.kind ?? 'main') === 'support' && node.attachedTo && configById.has(node.attachedTo)) {
      edges.push({ source: node.attachedTo, target: node.id, kind: 'support' });
    }
  }

  return {
    id: chapter.id,
    title: chapter.title,
    description: chapter.description,
    nodes: computeQuestLayout(nodes),
    edges
  };
}

export function computeQuestLayout(nodes) {
  const byId = new Map(nodes.map(node => [node.id, node]));
  const depthMemo = new Map();
  const visiting = new Set();

  function depthOf(node) {
    if (depthMemo.has(node.id)) return depthMemo.get(node.id);
    if (visiting.has(node.id)) return 0;
    visiting.add(node.id);
    const localPrerequisites = (node.prerequisites ?? [])
      .map(id => byId.get(id))
      .filter(Boolean);
    const depth = localPrerequisites.length
      ? Math.max(...localPrerequisites.map(depthOf)) + 1
      : 0;
    visiting.delete(node.id);
    depthMemo.set(node.id, depth);
    return depth;
  }

  const usedLanes = new Map();
  const staged = [];
  for (const node of nodes) {
    let depth = depthOf(node);
    if (node.kind === 'support' && node.attachedTo && byId.has(node.attachedTo)) {
      depth = depthOf(byId.get(node.attachedTo)) + 1;
    }
    const nextLane = usedLanes.get(depth) ?? 0;
    const lane = Number.isFinite(node.lane) ? node.lane : nextLane;
    usedLanes.set(depth, Math.max(nextLane + 1, lane + 1));
    staged.push({ ...node, depth, lane });
  }

  return reflowQuestLayout(staged);
}

export function reflowQuestLayout(nodes, measurements = new Map()) {
  if (!nodes.length) return [];

  const sized = nodes.map((node, index) => {
    const fallback = DEFAULT_NODE_SIZE[node.kind === 'support' ? 'support' : 'main'];
    const measured = measurements.get(node.id) ?? {};
    return {
      ...node,
      width: measured.width ?? node.width ?? fallback.width,
      height: measured.height ?? node.height ?? fallback.height,
      layoutOrder: index
    };
  });

  const depths = [...new Set(sized.map(node => node.depth ?? 0))].sort((a, b) => a - b);
  const maxWidthByDepth = new Map(depths.map(depth => [
    depth,
    Math.max(...sized.filter(node => (node.depth ?? 0) === depth).map(node => node.width))
  ]));
  const depthX = new Map();
  let nextX = 120;
  for (const depth of depths) {
    depthX.set(depth, nextX);
    nextX += maxWidthByDepth.get(depth) + 110;
  }

  const positions = new Map();
  const sizedById = new Map(sized.map(node => [node.id, node]));
  const parentCenter = node => {
    const parentIds = node.kind === 'support' && node.attachedTo
      ? [node.attachedTo]
      : (node.prerequisites ?? []);
    const centers = parentIds
      .map(id => {
        const parent = sizedById.get(id);
        const position = positions.get(id);
        return parent && position ? position.y + parent.height / 2 : null;
      })
      .filter(value => value !== null);
    return centers.length ? centers.reduce((sum, value) => sum + value, 0) / centers.length : null;
  };

  for (const depth of depths) {
    const column = sized
      .filter(node => (node.depth ?? 0) === depth)
      .sort((a, b) => {
        const aParent = parentCenter(a);
        const bParent = parentCenter(b);
        if (aParent !== null && bParent !== null && aParent !== bParent) return aParent - bParent;
        if (aParent !== null && bParent === null) return -1;
        if (aParent === null && bParent !== null) return 1;
        return (a.lane ?? 0) - (b.lane ?? 0) || a.layoutOrder - b.layoutOrder;
      });

    let nextY = 110;
    for (const node of column) {
      const y = nextY + (node.offsetY ?? 0);
      positions.set(node.id, { x: depthX.get(depth), y });
      nextY = Math.max(nextY, y) + node.height + NODE_VERTICAL_GAP;
    }
  }

  return sized.map(({ layoutOrder, ...node }) => ({
    ...node,
    ...positions.get(node.id)
  }));
}

export function routeQuestEdgePoints(source, target, nodes, routeOffset = 0) {
  const sourceWidth = source.width ?? DEFAULT_NODE_SIZE[source.kind === 'support' ? 'support' : 'main'].width;
  const sourceHeight = source.height ?? DEFAULT_NODE_SIZE[source.kind === 'support' ? 'support' : 'main'].height;
  const targetHeight = target.height ?? DEFAULT_NODE_SIZE[target.kind === 'support' ? 'support' : 'main'].height;
  const start = { x: source.x + sourceWidth, y: source.y + sourceHeight / 2 };
  const end = { x: target.x, y: target.y + targetHeight / 2 };

  const sourceDepth = source.depth ?? 0;
  const targetDepth = target.depth ?? sourceDepth + 1;
  const sourceDepthRight = Math.max(...nodes
    .filter(node => (node.depth ?? 0) === sourceDepth)
    .map(node => node.x + (node.width ?? DEFAULT_NODE_SIZE[node.kind === 'support' ? 'support' : 'main'].width)));
  const targetDepthLeft = Math.min(...nodes
    .filter(node => (node.depth ?? 0) === targetDepth)
    .map(node => node.x));

  const sourceChannelX = sourceDepthRight + EDGE_CHANNEL_GAP + routeOffset;
  const targetChannelX = targetDepthLeft - EDGE_CHANNEL_GAP - routeOffset;
  const intermediate = nodes.filter(node => {
    const depth = node.depth ?? 0;
    return depth > sourceDepth && depth < targetDepth;
  });

  if (!intermediate.length || targetDepth <= sourceDepth + 1) {
    const midX = (sourceChannelX + targetChannelX) / 2;
    return [
      start,
      { x: midX, y: start.y },
      { x: midX, y: end.y },
      end
    ];
  }

  const topY = Math.min(...intermediate.map(node => node.y)) - EDGE_OBSTACLE_GAP - routeOffset;
  const bottomY = Math.max(...intermediate.map(node => {
    const height = node.height ?? DEFAULT_NODE_SIZE[node.kind === 'support' ? 'support' : 'main'].height;
    return node.y + height;
  })) + EDGE_OBSTACLE_GAP + routeOffset;
  const topCost = Math.abs(start.y - topY) + Math.abs(end.y - topY);
  const bottomCost = Math.abs(start.y - bottomY) + Math.abs(end.y - bottomY);
  const routeY = topCost <= bottomCost ? topY : bottomY;

  return [
    start,
    { x: sourceChannelX, y: start.y },
    { x: sourceChannelX, y: routeY },
    { x: targetChannelX, y: routeY },
    { x: targetChannelX, y: end.y },
    end
  ];
}

export function questWorldBounds(nodes) {
  if (!nodes.length) return { width: 900, height: 560 };
  return {
    width: Math.max(900, Math.max(...nodes.map(node => node.x + (node.width ?? 220))) + 140),
    height: Math.max(560, Math.max(...nodes.map(node => node.y + (node.height ?? 86))) + 120)
  };
}
