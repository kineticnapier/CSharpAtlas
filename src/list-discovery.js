export const TOPIC_DEFINITIONS = [
  { id: 'syntax', labels: { ja: '基本文法', en: 'Syntax' } },
  { id: 'oop', labels: { ja: '型・OOP', en: 'Types & OOP' } },
  { id: 'null', labels: { ja: 'null', en: 'null' } },
  { id: 'numbers', labels: { ja: '数値', en: 'Numbers' } },
  { id: 'strings', labels: { ja: '文字列', en: 'Strings' } },
  { id: 'collections', labels: { ja: 'コレクション', en: 'Collections' } },
  { id: 'linq', labels: { ja: 'LINQ', en: 'LINQ' } },
  { id: 'exceptions', labels: { ja: '例外・デバッグ', en: 'Exceptions & debugging' } },
  { id: 'io', labels: { ja: 'ファイル・I/O', en: 'Files & I/O' } },
  { id: 'serialization', labels: { ja: 'JSON・シリアライズ', en: 'JSON & serialization' } },
  { id: 'network', labels: { ja: 'ネットワーク', en: 'Networking' } },
  { id: 'async', labels: { ja: '非同期', en: 'Async' } },
  { id: 'text', labels: { ja: '正規表現・文字コード', en: 'Regex & text encoding' } },
  { id: 'practical', labels: { ja: '実践・その他', en: 'Practical & other' } }
];

const TOPIC_RULES = {
  syntax: ['変数', 'スコープ', '構文', '演算子', '制御フロー', 'return', 'method', 'メソッド', '引数', 'if', 'switch', 'while', 'for loop', 'forループ', 'break', 'continue'],
  oop: ['class', 'record', 'interface', 'property', 'プロパティ', '継承', '多態', '抽象化', 'object', 'generic', 'ジェネリック', '型推論', 'delegate', 'event'],
  null: ['null', 'nullable', 'nullreferenceexception', 'argumentnullexception', 'cs860', 'cs8618', 'cs8625', '?'],
  numbers: ['int', 'long', 'double', 'float', 'decimal', '数値', '整数', '除算', 'overflow', 'checked', 'modulo', '剰余', '浮動小数点'],
  strings: ['string', '文字列', 'split', 'join', '補間', 'tostring', 'datetime'],
  collections: ['collection', 'コレクション', 'list', 'dictionary', 'hashset', 'queue', 'stack', 'array', '配列', 'ienumerable', '列挙子'],
  linq: ['linq', 'where', 'select', 'orderby', 'groupby', 'distinct', 'ienumerable', 'tolist', 'toarray', 'todictionary', '遅延実行'],
  exceptions: ['exception', '例外', 'try', 'catch', 'throw', '警告', 'debug', 'デバッグ'],
  io: ['file', 'directory', 'stream', 'ファイル', 'パス', 'ioexception', 'binaryreader'],
  serialization: ['json', 'jsonserializer', 'serialize', 'deserialize', 'system.text.json', 'シリアライズ'],
  network: ['http', 'httpclient', 'uri', 'url', 'websocket', 'ネットワーク'],
  async: ['async', 'await', 'task', 'cancellationtoken', 'キャンセル', 'タイムアウト', 'parallel', 'thread', '並行'],
  text: ['regex', '正規表現', 'encoding', 'utf-8', 'utf8', '文字コード', 'decoder'],
  practical: []
};

function articleHaystack(article) {
  return [
    article?.id,
    article?.title,
    ...(Array.isArray(article?.tags) ? article.tags : [])
  ].filter(Boolean).join(' ').toLowerCase();
}

export function deriveArticleTopics(article) {
  const haystack = articleHaystack(article);
  const topics = TOPIC_DEFINITIONS
    .filter(topic => topic.id !== 'practical')
    .filter(topic => TOPIC_RULES[topic.id].some(term => haystack.includes(term.toLowerCase())))
    .map(topic => topic.id);

  if (!topics.length || (article?.type === 'code' && topics.length === 1 && topics[0] === 'syntax')) {
    topics.push('practical');
  }
  return topics;
}

export function filterArticlesByTopics(articles, selectedTopics) {
  const selected = selectedTopics instanceof Set ? selectedTopics : new Set(selectedTopics ?? []);
  if (!selected.size) return [...articles];
  return articles.filter(article => {
    const topics = article.topics ?? deriveArticleTopics(article);
    return topics.some(topic => selected.has(topic));
  });
}

export function sortArticles(articles, mode = 'recommended', { recentIds = [], favoriteIds = new Set() } = {}) {
  const result = [...articles];
  const titleSort = (a, b) => String(a.title ?? '').localeCompare(String(b.title ?? ''), undefined, { sensitivity: 'base' });

  if (mode === 'title') return result.sort(titleSort);
  if (mode === 'recent') {
    const order = new Map(recentIds.map((id, index) => [id, index]));
    return result.sort((a, b) => {
      const ai = order.has(a.id) ? order.get(a.id) : Number.POSITIVE_INFINITY;
      const bi = order.has(b.id) ? order.get(b.id) : Number.POSITIVE_INFINITY;
      return ai - bi || titleSort(a, b);
    });
  }
  if (mode === 'favorites') {
    return result.sort((a, b) => Number(favoriteIds.has(b.id)) - Number(favoriteIds.has(a.id)) || titleSort(a, b));
  }
  return result;
}

export function toggleId(ids, id) {
  const result = new Set(ids ?? []);
  if (result.has(id)) result.delete(id);
  else result.add(id);
  return result;
}

export function pushRecent(ids, id, limit = 24) {
  return [id, ...(ids ?? []).filter(existing => existing !== id)].slice(0, Math.max(1, limit));
}
