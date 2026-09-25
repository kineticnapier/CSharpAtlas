import { localizeArticles } from './article-localization.js';

// Historical batch names are documented here for old compatibility checks:
// hourly-batch-012.json hourly-batch-013.json hourly-batch-014.json hourly-batch-015.json
// hourly-batch-016.json hourly-batch-017.json hourly-batch-018.json hourly-batch-019.json
// hourly-batch-020.json hourly-batch-021.json hourly-batch-022.json hourly-batch-023.json
export const CONTENT_CATEGORIES = [
  'items.json', 'exceptions.json', 'compiler-errors.json', 'compiler-warnings.json',
  'concepts.json', 'code-recipes.json', 'logic-errors.json', 'advanced-expansion.json',
  ...Array.from({ length: 47 }, (_, index) => `hourly-batch-${String(index + 1).padStart(3, '0')}.json`)
];

const CONTENT_ID_ALIASES = {
  'advanced-expansion.json': {
    'collection-expressions': 'collection-expression-syntax'
  },
  'hourly-batch-042.json': {
    'memorymappedfile-large-random-access': 'memorymappedfile-view-lifetime',
    'aspnetcore-endpoint-filter-crosscutting': 'aspnetcore-endpoint-filter-ordering'
  }
};

const RELATED_TARGET_ALIASES = {
  'memorycache-size-expiration': 'memorycache-eviction-callback-work', 'system-diagnostics-metrics': 'metrics-meter-instrument-design',
  'eventsource-runtime-diagnostics': 'activity-tags-baggage-boundaries', 'backgroundservice-scoped-dependency': 'optionsmonitor-runtime-configuration',
  'keyed-services-di': 'optionsmonitor-runtime-configuration', 'partitioned-ratelimiter-per-key': 'rate-limiter-partition-cardinality',
  'aspnetcore-rate-limit-concurrency': 'rate-limiter-partition-cardinality', 'memorypool-owner-lifetime': 'memory-owner-pooled-lifetime',
  'httpclient-resilience-standard-handler': 'httpclient-pooled-connection-lifetime', 'aspnetcore-problemdetails-error-contract': 'aspnet-request-timeout-cancellation',
  'threadpool-starvation-blocking': 'task-run-cpu-bound-concurrency', 'async-allocation-avoid-unnecessary-state-machine': 'valuetask-multiple-await-hazard',
  'conditionalweaktable-associated-data': 'conditionalweaktable-key-lifetime', 'memorypool-shared-owner': 'memory-owner-pooled-lifetime',
  'partitioned-rate-limiter': 'partitioned-rate-limiter-fairness', 'aspnetcore-rate-limit-per-user': 'rate-limiter-partition-cardinality',
  'generic-math-static-abstract': 'generic-math-checked-operators', 'threadpool-starvation': 'task-run-cpu-bound-concurrency',
  'regex-nonbacktracking-engine': 'regex-timeout-untrusted-input', 'generated-regex-source-generation': 'regex-timeout-untrusted-input',
  'valuetask-sync-completion': 'valuetask-multiple-await-hazard', 'async-allocation-state-machine': 'valuetask-multiple-await-hazard',
  'init-only-properties': 'csharp-required-members-construction', 'nullable-reference-types': 'csharp-required-members-construction',
  'reflection-cache-metadata': 'jsonserializeroptions-reuse-metadata-cache', 'activator-createinstance-hot-path': 'reflection-attribute-instantiation-cost',
  'unity-object-pool-reuse': 'unity-domain-reload-static-state', 'unity-component-lookup-cache': 'unity-domain-reload-static-state',
  'span-stackalloc-buffer': 'utf8formatter-direct-formatting', 'stringbuilder-reuse-hot-path': 'string-create-allocation-aware-formatting',
  'pinned-object-heap': 'gc-latency-modes-tradeoffs', 'gc-addmemorypressure-unmanaged': 'gc-memoryinfo-pressure-observation',
  'httpclient-lifetime-management': 'httpclient-pooled-connection-lifetime', 'httpclient-http-version-negotiation': 'http-response-streaming-headers-read',
  'cache-stampede-singleflight': 'memorycache-stampede-singleflight', 'conditionalweaktable-lifetime-cache': 'weakreference-cache-semantics',
  'json-polymorphism-contracts': 'json-typeinforesolver-contract-customization', 'json-unknown-derived-type-handling': 'json-typeinforesolver-contract-customization',
  'semaphoreslim-release-pairing': 'semaphoreslim-release-balance', 'socket-send-backpressure': 'socket-partial-send-receive',
  'unity-nativearray-jobs': 'unity-native-container-disposal', 'dotnet-counters-runtime-monitoring': 'dotnet-counters-runtime-diagnostics',
  'aspnet-forwarded-headers-trust': 'aspnetcore-forwarded-headers-trust', 'aspnet-request-body-buffering': 'aspnetcore-response-bodywriter-streaming',
  'unobservedtaskexception-boundaries': 'fire-and-forget-task-lifetime', 'exception-filter-observation': 'exceptiondispatchinfo-cross-boundary-rethrow',
  'assemblyloadcontext-resolving': 'metadata-load-context-inspection', 'reflection-create-delegate-hot-path': 'reflection-attribute-instantiation-cost',
  'linked-cancellationtoken-source': 'linked-cancellation-token', 'aspnet-response-compression': 'aspnetcore-response-bodywriter-streaming',
  'linq-unintended-multiple-enumeration': 'enumerable-trygetnonenumeratedcount', 'unnecessary-tolist-allocation': 'enumerable-trygetnonenumeratedcount',
  'arraybufferwriter-growing-buffer': 'ibufferwriter-producer-pattern', 'file-async-randomaccess-concurrency': 'randomaccess-offset-io',
  'system-io-hashing-noncryptographic': 'cryptographicoperations-fixed-time-equality', 'lock-contention-hot-path': 'async-lock-held-across-io'
};

function normalizeExpansionLocaleEntry(id, entry) {
  if (id !== 'bounded-channel-producer-consumer' || !entry || typeof entry !== 'object') return entry;
  if (entry.title === 'Channel<T> で producer / consumer をつなぐ') return { ...entry, title: '容量制限付き Channel<T> で producer / consumer をつなぐ' };
  if (entry.title === 'Connect producers and consumers with Channel<T>') return { ...entry, title: 'Connect producers and consumers with a bounded Channel<T>' };
  return entry;
}

export function normalizeContentGroup(file, group) {
  const aliases = CONTENT_ID_ALIASES[file];
  if (Array.isArray(group)) return (group ?? []).map(article => ({ ...article, id: aliases?.[article.id] ?? article.id, related: (article.related ?? []).map(id => RELATED_TARGET_ALIASES[id] ?? aliases?.[id] ?? id) }));
  return Object.fromEntries(Object.entries(group ?? {}).map(([id, entry]) => { const normalizedId = aliases?.[id] ?? id; return [normalizedId, normalizeExpansionLocaleEntry(normalizedId, entry)]; }));
}

async function loadGroups(fetchJson, prefix) {
  return Promise.all(CONTENT_CATEGORIES.map(async file => normalizeContentGroup(file, await fetchJson(`${prefix}/${file}`))));
}

export async function loadLocalizedContent({ fetchJson, locale, fallbackLocale = 'ja' }) {
  if (typeof fetchJson !== 'function') throw new Error('fetchJson is required');
  const baseGroups = await loadGroups(fetchJson, './content/articles');
  const fallbackGroups = await loadGroups(fetchJson, `./content/locales/${fallbackLocale}`);
  const requestedGroups = locale === fallbackLocale ? fallbackGroups : await loadGroups(fetchJson, `./content/locales/${locale}`);
  const baseArticles = baseGroups.flat();
  const mergeLocaleGroups = groups => Object.assign({}, ...groups);
  const localeMaps = { [fallbackLocale]: mergeLocaleGroups(fallbackGroups), [locale]: mergeLocaleGroups(requestedGroups) };
  return { articles: localizeArticles(baseArticles, localeMaps, locale, fallbackLocale), requestedLocale: locale };
}

export async function loadContent({ locale = 'ja', fetchImpl = fetch } = {}) {
  const fetchJson = async path => {
    const response = await fetchImpl(path.replace(/^\.\//, '/'));
    if (!response.ok) throw new Error(`Failed to load ${path}`);
    return response.json();
  };
  const result = await loadLocalizedContent({ fetchJson, locale });
  return result.articles;
}
