export function buildQuestChapter(articles, chapter) {
  const articlesById = new Map(articles.map(article => [article.id, article]));
  const configById = new Map(chapter.nodes.map(node => [node.id, node]));
  const nodes = chapter.nodes
    .map(config => {
      const article = articlesById.get(config.id);
      if (!article) return null;
      return {
        ...article,
        kind: config.kind ?? 'main',
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
  const result = [];
  for (const node of nodes) {
    let depth = depthOf(node);
    if (node.kind === 'support' && node.attachedTo && byId.has(node.attachedTo)) {
      depth = depthOf(byId.get(node.attachedTo)) + 1;
    }
    const nextLane = usedLanes.get(depth) ?? 0;
    const lane = Number.isFinite(node.lane) ? node.lane : nextLane;
    usedLanes.set(depth, Math.max(nextLane + 1, lane + 1));
    result.push({
      ...node,
      depth,
      x: 120 + depth * 330,
      y: 110 + lane * 150 + (node.offsetY ?? 0)
    });
  }
  return result;
}

export function questWorldBounds(nodes) {
  if (!nodes.length) return { width: 900, height: 560 };
  return {
    width: Math.max(900, Math.max(...nodes.map(node => node.x)) + 360),
    height: Math.max(560, Math.max(...nodes.map(node => node.y)) + 220)
  };
}
