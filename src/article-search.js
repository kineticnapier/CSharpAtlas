export function matchesArticle(item, word) {
  const query = String(word ?? '').toLowerCase();
  return [item.id, item.title, item.short, item.summary, ...(item.tags ?? [])]
    .some(value => String(value ?? '').toLowerCase().includes(query));
}
