const WIKI_LINK_PATTERN = /\[\[([^\]]*)\]\]/g;
const WIKI_TEXT_FIELDS = ['short', 'summary', 'why', 'tips'];

export function extractWikiLinkIds(article) {
  const ids = [];
  const seen = new Set();

  for (const field of WIKI_TEXT_FIELDS) {
    const text = String(article?.[field] ?? '');
    for (const match of text.matchAll(WIKI_LINK_PATTERN)) {
      const raw = match[1] ?? '';
      const separator = raw.indexOf('|');
      const id = (separator >= 0 ? raw.slice(0, separator) : raw).trim();
      const key = id.toLowerCase();
      if (!id || seen.has(key)) continue;
      seen.add(key);
      ids.push(id);
    }
  }

  return ids;
}

export function buildArticleGraph(articles, { type = 'all', edgeMode = 'both' } = {}) {
  const items = Array.isArray(articles) ? articles : [];
  const byId = new Map(items.map(item => [String(item.id).toLowerCase(), item]));
  const pairMap = new Map();

  const addEdge = (sourceItem, rawTarget, kind) => {
    const targetItem = byId.get(String(rawTarget ?? '').toLowerCase());
    if (!sourceItem?.id || !targetItem || sourceItem.id.toLowerCase() === targetItem.id.toLowerCase()) return;
    if (edgeMode !== 'both' && edgeMode !== kind) return;

    const [left, right] = [sourceItem.id, targetItem.id].sort((a, b) => a.localeCompare(b));
    const key = `${left}\u0000${right}`;
    const existing = pairMap.get(key) ?? { source: left, target: right, kinds: new Set() };
    existing.kinds.add(kind);
    pairMap.set(key, existing);
  };

  for (const item of items) {
    for (const target of item.related ?? []) addEdge(item, target, 'related');
    for (const target of extractWikiLinkIds(item)) addEdge(item, target, 'wiki');
  }

  const allEdges = [...pairMap.values()]
    .map(edge => ({
      source: edge.source,
      target: edge.target,
      kinds: [...edge.kinds].sort((a, b) => {
        const order = { related: 0, wiki: 1 };
        return order[a] - order[b];
      })
    }))
    .sort((a, b) => a.source.localeCompare(b.source) || a.target.localeCompare(b.target));

  const activeIds = new Set(
    items
      .filter(item => type === 'all' || item.type === type)
      .map(item => item.id)
  );

  const includedIds = new Set(activeIds);
  if (type !== 'all') {
    for (const edge of allEdges) {
      if (activeIds.has(edge.source)) includedIds.add(edge.target);
      if (activeIds.has(edge.target)) includedIds.add(edge.source);
    }
  }

  const nodes = items
    .filter(item => includedIds.has(item.id))
    .map(item => ({
      id: item.id,
      type: item.type,
      title: item.title,
      short: item.short ?? '',
      tags: Array.isArray(item.tags) ? item.tags.slice(0, 3) : [],
      ghost: type !== 'all' && !activeIds.has(item.id)
    }));

  const edges = allEdges.filter(edge => {
    if (!includedIds.has(edge.source) || !includedIds.has(edge.target)) return false;
    return type === 'all' || activeIds.has(edge.source) || activeIds.has(edge.target);
  });

  return { nodes, edges };
}
