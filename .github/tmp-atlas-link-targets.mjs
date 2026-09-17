import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const contentRoot = path.join(root, 'public', 'content');

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function writeJson(file, value) {
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n');
}

function addBase(category, entries) {
  const file = path.join(contentRoot, 'articles', category);
  const data = readJson(file);
  const ids = new Set(data.map(entry => entry.id));
  for (const entry of entries) {
    if (!ids.has(entry.id)) {
      data.push(entry);
      ids.add(entry.id);
    }
  }
  writeJson(file, data);
}

function addLocale(locale, category, entries) {
  const file = path.join(contentRoot, 'locales', locale, category);
  const data = readJson(file);
  for (const [id, entry] of Object.entries(entries)) {
    if (!(id in data)) data[id] = entry;
  }
  writeJson(file, data);
}

const codeRecipes = [
  {
    id: 'memory-stream', type: 'code', bad: null, good: null,
    code: 'using var stream = new MemoryStream();\nstream.WriteByte(0x41);\nstream.WriteByte(0x42);\n\nConsole.WriteLine($"{stream.Length} bytes / capacity {stream.Capacity}");\nstream.Position = 0;\nConsole.WriteLine(stream.ReadByte()); // 65\n\nbyte[] copy = stream.ToArray();\nConsole.WriteLine(copy.Length);',
    related: ['stream-basics', 'stream-position', 'arrays-basics']
  },
  {
    id: 'binary-reader-writer', type: 'code', bad: null, good: null,
    code: 'using var stream = new MemoryStream();\nusing (var writer = new BinaryWriter(stream, Encoding.UTF8, leaveOpen: true))\n{\n    writer.Write(42);\n    writer.Write("Atlas");\n}\n\nstream.Position = 0;\nusing var reader = new BinaryReader(stream, Encoding.UTF8, leaveOpen: true);\nint number = reader.ReadInt32();\nstring name = reader.ReadString();\nConsole.WriteLine($"{number}: {name}");',
    related: ['stream-basics', 'end-of-stream', 'encoding-text-bytes']
  },
  {
    id: 'json-options-contracts', type: 'code', bad: null, good: null,
    code: 'using System.Text.Json;\nusing System.Text.Json.Serialization;\n\nvar options = new JsonSerializerOptions\n{\n    PropertyNamingPolicy = JsonNamingPolicy.CamelCase,\n    WriteIndented = true\n};\n\nstring json = JsonSerializer.Serialize(new User("Ada", "secret"), options);\nConsole.WriteLine(json);\n\nrecord User(\n    [property: JsonPropertyName("display_name")] string Name,\n    [property: JsonIgnore] string Secret);',
    related: ['json-read', 'json-write', 'custom-attributes-reflection']
  },
  {
    id: 'http-response-status', type: 'code', bad: null, good: null,
    code: 'using System.Net;\n\nusing var response = new HttpResponseMessage(HttpStatusCode.NotFound)\n{\n    Content = new StringContent("missing")\n};\n\nif (response.IsSuccessStatusCode)\n{\n    string body = await response.Content.ReadAsStringAsync();\n    Console.WriteLine(body);\n}\nelse\n{\n    Console.WriteLine($"HTTP {(int)response.StatusCode} {response.ReasonPhrase}");\n}',
    related: ['http-get', 'http-request-exception', 'try-catch']
  },
  {
    id: 'task-whenall', type: 'code', bad: null, good: null,
    code: 'Task<int> first = Task.FromResult(10);\nTask<int> second = Task.FromResult(20);\nTask<int> third = Task.FromResult(30);\n\nint[] results = await Task.WhenAll(first, second, third);\nConsole.WriteLine(string.Join(", ", results)); // 10, 20, 30',
    related: ['task', 'async-await', 'aggregate-exception']
  },
  {
    id: 'task-run-cpu', type: 'code', bad: null, good: null,
    code: 'using var cts = new CancellationTokenSource();\nCancellationToken token = cts.Token;\n\nlong sum = await Task.Run(() =>\n{\n    long total = 0;\n    for (int i = 0; i < 100_000; i++)\n    {\n        if ((i & 1023) == 0) token.ThrowIfCancellationRequested();\n        total += i;\n    }\n    return total;\n}, token);\n\nConsole.WriteLine(sum);',
    related: ['task', 'async-await', 'cancellation-token']
  },
  {
    id: 'interlocked', type: 'code', bad: null, good: null,
    code: 'int completed = 0;\n\nParallel.For(0, 1_000, _ =>\n{\n    Interlocked.Increment(ref completed);\n});\n\nConsole.WriteLine(Volatile.Read(ref completed)); // 1000',
    related: ['lock-shared-state', 'static-members']
  },
  {
    id: 'concurrent-dictionary', type: 'code', bad: null, good: null,
    code: 'using System.Collections.Concurrent;\n\nvar counts = new ConcurrentDictionary<string, int>(StringComparer.Ordinal);\nstring[] words = ["red", "blue", "red"];\n\nParallel.ForEach(words, word =>\n{\n    counts.AddOrUpdate(word, 1, (_, oldValue) => oldValue + 1);\n});\n\nConsole.WriteLine(counts["red"]); // 2',
    related: ['dict-safe', 'lock-shared-state', 'concurrent-collection-factories']
  },
  {
    id: 'semaphore-async', type: 'code', bad: null, good: null,
    code: 'using var gate = new SemaphoreSlim(2);\nusing var cts = new CancellationTokenSource();\n\nasync Task WorkAsync(int id, CancellationToken token)\n{\n    bool entered = false;\n    try\n    {\n        await gate.WaitAsync(token);\n        entered = true;\n        await Task.Delay(20, token);\n        Console.WriteLine(id);\n    }\n    finally\n    {\n        if (entered) gate.Release();\n    }\n}\n\nawait Task.WhenAll(Enumerable.Range(0, 4).Select(i => WorkAsync(i, cts.Token)));',
    related: ['lock-shared-state', 'finally-cleanup', 'cancellation-token']
  }
];

const concepts = [
  {
    id: 'stream-basics', type: 'concept', bad: null, good: null,
    code: 'using var stream = new MemoryStream(new byte[] { 1, 2, 3 });\nConsole.WriteLine($"read={stream.CanRead}, write={stream.CanWrite}, seek={stream.CanSeek}");\n\nbyte[] buffer = new byte[2];\nint read = stream.Read(buffer, 0, buffer.Length);\nConsole.WriteLine($"read {read}, position {stream.Position}, length {stream.Length}");',
    related: ['idisposable', 'not-supported', 'stream-short-reads']
  },
  {
    id: 'lock-shared-state', type: 'concept', bad: null, good: null,
    code: 'var counter = new Counter();\nParallel.For(0, 1_000, _ => counter.Increment());\nConsole.WriteLine(counter.Value);\n\nsealed class Counter\n{\n    private readonly object gate = new();\n    private int value;\n\n    public void Increment()\n    {\n        lock (gate)\n            value++;\n    }\n\n    public int Value\n    {\n        get { lock (gate) return value; }\n    }\n}',
    related: ['static-members', 'interlocked', 'deadlock-lock-order']
  },
  {
    id: 'lazy-initialization', type: 'concept', bad: null, good: null,
    code: 'var value = new Lazy<string>(\n    () => Load(),\n    LazyThreadSafetyMode.ExecutionAndPublication);\n\nConsole.WriteLine(value.IsValueCreated); // False\nConsole.WriteLine(value.Value);\nConsole.WriteLine(value.IsValueCreated); // True\n\nstatic string Load() => "Atlas";',
    related: ['static-members', 'lock-shared-state', 'try-catch']
  },
  {
    id: 'custom-exceptions', type: 'concept', bad: null, good: null,
    code: 'static void Import()\n{\n    try\n    {\n        throw new IOException("source read failed");\n    }\n    catch (IOException ex)\n    {\n        throw new DataImportException("Could not import the document.", ex);\n    }\n}\n\nsealed class DataImportException : Exception\n{\n    public DataImportException(string message, Exception innerException)\n        : base(message, innerException) { }\n}',
    related: ['try-catch', 'argument-exception', 'exception-rethrow']
  },
  {
    id: 'finally-cleanup', type: 'concept', bad: null, good: null,
    code: 'var gate = new SemaphoreSlim(1);\nawait gate.WaitAsync();\ntry\n{\n    Console.WriteLine("protected work");\n}\nfinally\n{\n    gate.Release();\n    gate.Dispose();\n}',
    related: ['try-catch', 'idisposable', 'semaphore-async']
  }
];

const jaCode = {
  'memory-stream': { title: 'MemoryStream でバイト列を一時的に組み立てる', short: 'メモリ上の可変バイトバッファとして Stream API を使う。', summary: 'MemoryStream はメモリ上にデータを保持する seek 可能な Stream です。Length は書き込まれた長さ、Capacity は確保済み領域で、ToArray は現在の内容を別配列へコピーします。', why: '書き込み後の Position は末尾にあるため、そのまま読み始めると何も読めません。[[stream-position]] のように読み取り開始位置を明示します。', tips: '大きなデータを無制限に貯める用途には向きません。所有権とサイズ上限を決め、必要ならファイルや逐次処理を使います。', tags: ['MemoryStream', 'Stream', 'バイト列'] },
  'binary-reader-writer': { title: 'BinaryReader と BinaryWriter で値を保存する', short: '型付きの値を決めた順序でバイナリへ書き、同じ契約で読み戻す。', summary: 'BinaryWriter と BinaryReader は Stream 上でプリミティブ値や文字列を読み書きします。書き手と読み手はフィールド順、型、文字列エンコーディングなど同じフォーマット契約を共有する必要があります。', why: '途中で切れたレコードを型付き読み取りで復元しようとすると [[end-of-stream|EndOfStreamException]] になることがあります。', tips: '長期保存する形式ではバージョンやマジック値なども設計し、異なる実装との交換では数値のバイト順まで明示します。', tags: ['BinaryReader', 'BinaryWriter', 'バイナリ'] },
  'json-options-contracts': { title: 'JSON の命名規則とメンバー契約を設定する', short: 'C# の型と外部 JSON の形を JsonSerializerOptions と属性で結び付ける。', summary: 'System.Text.Json では命名ポリシー、JsonPropertyName、JsonIgnore などで JSON 契約を調整できます。C# の内部名と外部データの名前を分けたいときに使います。', why: 'シリアライズ結果は単なる実装詳細ではなく、保存形式や API と共有する契約になります。[[custom-attributes-reflection|属性]]は個別メンバーのメタデータとして利用できます。', tips: 'オプションを場当たり的に変えず、読み書きで同じ契約を共有します。互換性が必要な JSON のプロパティ名変更は慎重に扱います。', tags: ['System.Text.Json', 'JsonSerializerOptions', 'JSON'] },
  'http-response-status': { title: 'HTTP の状態コードを確認して応答を扱う', short: '本文を成功データと決めつける前に状態コードを確認する。', summary: 'HttpResponseMessage は成功・失敗の状態コード、ヘッダー、本文をまとめて表します。成功以外を例外へ変換するか、状態ごとに処理するかを呼び出し側の契約として決めます。', why: 'HTTP 通信自体が成立しても 404 や 500 などの応答は返り得ます。必要なら [[http-request-exception|EnsureSuccessStatusCode による例外化]]も選べます。', tips: '応答本文を使い終えたら HttpResponseMessage を Dispose します。キャンセルや通信失敗は状態コードによる失敗と別に分類します。', tags: ['HttpClient', 'HTTP', 'StatusCode'] },
  'task-whenall': { title: 'Task.WhenAll で複数の処理を待つ', short: '独立して開始した複数 Task の完了をまとめて待つ。', summary: 'Task.WhenAll は複数の [[task|Task]] を1つの完了として合成します。Task<T> の配列では結果配列の順序は入力 Task の順序に対応します。', why: '逐次 await すると独立処理を必要以上に直列化することがあります。WhenAll なら先に処理を開始してからまとめて完了を待てます。', tips: '失敗が複数ある場合は合成 Task の状態も確認します。await が投げる例外と、Task.Exception に保持される複数例外の観測は区別します。', tags: ['Task', 'WhenAll', 'async'] },
  'task-run-cpu': { title: 'Task.Run で CPU 処理を分離する', short: '有限の CPU 計算をスレッドプールへ移し、キャンセルにも協調する。', summary: 'Task.Run は同期的な CPU バウンド処理をスレッドプールで実行する手段です。[[async-await|非同期 I/O]]を Task.Run で包む必要は通常ありません。', why: 'CPU 計算は実際にスレッドを占有しますが、非同期 I/O は待ち時間中にワーカースレッドを保持しなくてよいからです。', tips: '処理量を制限し、長いループでは CancellationToken を定期的に確認します。大量の Task.Run を無制限に作るのは避けます。', tags: ['Task.Run', 'CPU', 'スレッドプール'] },
  'interlocked': { title: 'Interlocked で共有カウンターを原子的に更新する', short: '単一の共有値を競合なしで読み書きする。', summary: 'Interlocked は Increment や CompareExchange など、単一値への原子的な read-modify-write を提供します。単純なカウンターでは lock より直接的です。', why: 'value++ は読み取り・加算・書き込みの複数操作なので、複数スレッドが重なると更新を失う可能性があります。', tips: '複数フィールドを同時に守る不変条件には十分ではありません。その場合は [[lock-shared-state|lock]] などで一まとまりの操作を保護します。', tags: ['Interlocked', 'atomic', '並行処理'] },
  'concurrent-dictionary': { title: 'ConcurrentDictionary で共有マップを更新する', short: '複数スレッドから共有する辞書を専用の原子的操作で更新する。', summary: 'ConcurrentDictionary<TKey,TValue> は TryAdd、AddOrUpdate、GetOrAdd など並行利用向けの操作を提供します。別々の呼び出しを並べただけで全体が1つのトランザクションになるわけではありません。', why: '通常の Dictionary を同時に更新すると状態を安全に保てません。[[dict-safe|Dictionary の通常操作]]とは別の契約が必要です。', tips: '値生成デリゲートは競合時に複数回呼ばれ得ます。不可逆な副作用を入れないようにします。', tags: ['ConcurrentDictionary', 'Dictionary', '並行処理'] },
  'semaphore-async': { title: 'SemaphoreSlim で非同期の同時実行数を制限する', short: '非同期処理へ入れる個数を制限し、取得した許可だけを必ず返す。', summary: 'SemaphoreSlim.WaitAsync はスレッドをブロックせずに許可を待てます。取得後は [[finally-cleanup|finally]] で Release し、キャンセル前に取得できなかった場合は誤って返さないようにします。', why: 'Release の漏れは後続処理を止め、取得していない許可を Release すると上限の意味を壊します。', tips: '共有データ自体の整合性を守る lock と、同時実行数を制限する semaphore の目的を分けます。', tags: ['SemaphoreSlim', 'async', '同時実行数'] }
};

const enCode = {
  'memory-stream': { title: 'Building temporary binary data with MemoryStream', short: 'Use a seekable in-memory Stream as a growable byte buffer.', summary: 'MemoryStream stores data in memory. Length is the amount written, Capacity is reserved storage, and ToArray returns a separate copy of the current contents.', why: 'After writing, Position is at the end, so reading immediately can appear empty. Reposition deliberately as described in [[stream-position]].', tips: 'Do not use an unbounded MemoryStream for arbitrarily large data. Define ownership and size limits, and prefer streaming or files when appropriate.', tags: ['MemoryStream', 'Stream', 'bytes'] },
  'binary-reader-writer': { title: 'Persisting values with BinaryReader and BinaryWriter', short: 'Write typed values in a defined order and read them back with the same binary contract.', summary: 'BinaryWriter and BinaryReader encode primitive values and strings over a Stream. Writer and reader must agree on field order, types, and string encoding.', why: 'A typed read from a truncated record can reach [[end-of-stream|EndOfStreamException]] before the requested value is complete.', tips: 'For durable formats, define versioning or magic values as needed, and document byte order when exchanging numeric data with other implementations.', tags: ['BinaryReader', 'BinaryWriter', 'binary'] },
  'json-options-contracts': { title: 'Configuring JSON names and member contracts', short: 'Map a C# type to a stable external JSON shape with options and attributes.', summary: 'System.Text.Json supports naming policies, JsonPropertyName, JsonIgnore, and related metadata for controlling the serialized contract.', why: 'Serialized names become part of stored data or an API contract. [[custom-attributes-reflection|Attributes]] can attach member-specific serialization metadata.', tips: 'Share compatible options between readers and writers. Rename externally visible JSON properties only with deliberate compatibility planning.', tags: ['System.Text.Json', 'JsonSerializerOptions', 'JSON'] },
  'http-response-status': { title: 'Handling HTTP responses according to status codes', short: 'Inspect the status before treating the response body as successful data.', summary: 'HttpResponseMessage carries the status code, headers, and content. Decide whether non-success statuses are handled explicitly or converted to exceptions.', why: 'A request can complete at the transport layer and still return 404, 500, or another application-level failure. [[http-request-exception|EnsureSuccessStatusCode]] is one possible policy.', tips: 'Dispose the response after consuming it. Classify cancellation and transport failures separately from HTTP status failures.', tags: ['HttpClient', 'HTTP', 'status code'] },
  'task-whenall': { title: 'Waiting for multiple operations with Task.WhenAll', short: 'Combine independently started Tasks and await their shared completion.', summary: 'Task.WhenAll combines multiple [[task|Task]] instances. For Task<T> inputs, the returned result array follows the input task order.', why: 'Awaiting independent operations one by one can serialize work unnecessarily; starting them first and awaiting WhenAll allows their waits to overlap.', tips: 'When several operations fail, distinguish the exception rethrown by await from the set of exceptions recorded by the combined Task.', tags: ['Task', 'WhenAll', 'async'] },
  'task-run-cpu': { title: 'Offloading CPU work with Task.Run', short: 'Move a bounded synchronous CPU calculation to the thread pool and cooperate with cancellation.', summary: 'Task.Run is useful for synchronous CPU-bound work. Already asynchronous I/O generally does not need to be wrapped in Task.Run because [[async-await|asynchronous I/O]] need not occupy a worker thread while waiting.', why: 'CPU calculations consume a thread while computing, whereas asynchronous I/O can suspend until completion.', tips: 'Keep work bounded, observe CancellationToken in long loops, and avoid creating unbounded numbers of Task.Run operations.', tags: ['Task.Run', 'CPU', 'thread pool'] },
  'interlocked': { title: 'Updating shared counters atomically with Interlocked', short: 'Use atomic read-modify-write operations for a single shared value.', summary: 'Interlocked provides atomic operations such as Increment and CompareExchange. It is a direct fit for simple counters and flags.', why: 'value++ is a read, calculation, and write, so concurrent executions can lose updates.', tips: 'Atomic single-value operations do not protect a multi-field invariant. Use [[lock-shared-state|lock]] when several pieces of state must change together.', tags: ['Interlocked', 'atomic', 'concurrency'] },
  'concurrent-dictionary': { title: 'Updating shared maps with ConcurrentDictionary', short: 'Use map operations designed for concurrent callers.', summary: 'ConcurrentDictionary<TKey,TValue> provides TryAdd, AddOrUpdate, GetOrAdd, and other operations for concurrent access. A sequence of separate calls is not automatically one transaction.', why: 'Mutating an ordinary Dictionary concurrently does not preserve its required state. The contract differs from normal [[dict-safe|Dictionary access]].', tips: 'Value factories may run more than once under contention, so keep irreversible side effects out of them.', tags: ['ConcurrentDictionary', 'Dictionary', 'concurrency'] },
  'semaphore-async': { title: 'Limiting asynchronous concurrency with SemaphoreSlim', short: 'Bound entry to an asynchronous section and release only permits that were acquired.', summary: 'SemaphoreSlim.WaitAsync waits for a permit without blocking a thread. After successful acquisition, release in [[finally-cleanup|finally]], and do not release when cancellation happened before entry.', why: 'A missing Release can stall later callers, while releasing an unacquired permit breaks the concurrency bound.', tips: 'Use locks to protect shared-state invariants and semaphores to bound concurrency; they solve different problems.', tags: ['SemaphoreSlim', 'async', 'concurrency limit'] }
};

const jaConcept = {
  'stream-basics': { title: 'Stream の能力とバイト単位の入出力', short: 'Stream は読み取り・書き込み・シークの能力を個別に持つバイト列の抽象化。', summary: 'Stream はバイト指向の入出力を共通化します。CanRead、CanWrite、CanSeek で能力を確認し、対応する場合だけ Position や Length を使います。', why: 'すべての Stream が同じ能力を持つわけではなく、未対応操作は [[not-supported|NotSupportedException]] になることがあります。', tips: 'Read は要求した長さを必ず満たすとは限りません。必要な長さが決まっている処理では [[stream-short-reads|短い読み取り]]を考慮します。', tags: ['Stream', 'I/O', 'バイト'] },
  'lock-shared-state': { title: 'lock で共有状態の整合性を守る', short: '複数操作で成り立つ共有状態の不変条件を同じロックで守る。', summary: 'lock は指定オブジェクトに対して一度に1スレッドだけを同期区間へ入れます。関連する読み書きを同じ private なロックで保護します。', why: '共有値への複数ステップ操作は個々の読み書きが安全でも途中状態を他スレッドに観測される可能性があります。', tips: 'クリティカルセクションは短く同期的に保ち、lock 内で await しません。単一値だけなら [[interlocked|Interlocked]] が適する場合があります。', tags: ['lock', '共有状態', '並行処理'] },
  'lazy-initialization': { title: 'Lazy<T> と初期化の遅延', short: '値が初めて必要になるまで作成を遅らせる。', summary: 'Lazy<T> は Value が最初に要求されたときに値を生成し、その結果を保持します。選んだモードにより公開時のスレッド安全性も制御できます。', why: '高価な値を実際に使わない場合は生成コストを避けられます。ただし初期化で投げられた例外がキャッシュされるモードもあります。', tips: 'Lazy が安全に値を公開しても、その値自身の後続変更まで同期されるわけではありません。必要なら [[lock-shared-state|共有状態の同期]]を別に設計します。', tags: ['Lazy', '遅延初期化', 'スレッド安全性'] },
  'custom-exceptions': { title: '独自例外と原因例外の保持', short: '呼び出し側が区別する必要がある失敗だけを独自例外として表す。', summary: '標準例外で意味を十分表せないドメイン境界では独自 Exception 型を定義できます。下位例外を包むときは InnerException として保持します。', why: '原因を捨てて新しい例外だけを投げると、元の失敗情報やスタックの調査が難しくなります。', tips: '単なる引数不正なら [[argument-exception|標準の引数例外]]を優先します。独自型は呼び出し側の処理分岐に意味があるときに使います。', tags: ['Exception', 'InnerException', '例外設計'] },
  'finally-cleanup': { title: 'finally による後始末と例外の伝播', short: '通常終了でも例外終了でも必要な後始末を実行する。', summary: 'finally は try を抜ける際に実行され、取得した許可の返却などの後始末に使えます。リソース所有なら [[idisposable|using]] の方が意図を直接表せる場合もあります。', why: '後始末を通常経路だけに置くと、途中で例外が起きたときに共有資源や許可が残ります。', tips: 'finally 自身から新しい例外を投げると元の失敗を隠すことがあります。後始末処理の失敗方針も明示します。', tags: ['finally', '例外', '後始末'] }
};

const enConcept = {
  'stream-basics': { title: 'Stream capabilities and byte-oriented I/O', short: 'A Stream exposes byte I/O with separate read, write, and seek capabilities.', summary: 'Stream unifies byte-oriented I/O. Check CanRead, CanWrite, and CanSeek, and use Position or Length only when the implementation supports them.', why: 'Not every Stream supports every operation; unsupported members can throw [[not-supported|NotSupportedException]].', tips: 'Read does not promise to fill the requested buffer. Exact-size protocols must account for [[stream-short-reads|short reads]].', tags: ['Stream', 'I/O', 'bytes'] },
  'lock-shared-state': { title: 'Protecting shared-state invariants with lock', short: 'Guard all operations in a shared multi-step invariant with the same lock.', summary: 'lock allows one thread at a time into a synchronized region for a particular object. Protect related reads and writes with one private gate.', why: 'Even individually valid reads and writes can expose an intermediate state when a compound operation races with another caller.', tips: 'Keep critical sections short and synchronous; do not await inside lock. For one independent value, [[interlocked|Interlocked]] may be enough.', tags: ['lock', 'shared state', 'concurrency'] },
  'lazy-initialization': { title: 'Deferred initialization with Lazy<T>', short: 'Delay value creation until the value is first needed.', summary: 'Lazy<T> invokes its factory when Value is first requested and then stores the result. The selected mode also controls publication behavior between threads.', why: 'Expensive construction can be avoided when the value is never used. Some modes also cache an exception thrown by the factory.', tips: 'Safe publication of a Lazy value does not synchronize later mutation of that value. Design separate [[lock-shared-state|shared-state synchronization]] when needed.', tags: ['Lazy', 'deferred initialization', 'thread safety'] },
  'custom-exceptions': { title: 'Custom exceptions and preserving causes', short: 'Create a custom exception only when callers benefit from distinguishing the failure.', summary: 'At a domain boundary, a custom Exception type can add useful meaning when standard exceptions are insufficient. Preserve an underlying failure as InnerException when wrapping it.', why: 'Discarding the original exception loses diagnostic context and makes the real source harder to investigate.', tips: 'Prefer a standard [[argument-exception|argument exception]] when it already describes the invalid condition. Custom types are most useful when callers need a distinct recovery path.', tags: ['Exception', 'InnerException', 'exception design'] },
  'finally-cleanup': { title: 'Cleanup and exception propagation with finally', short: 'Run required cleanup on both normal and exceptional exits.', summary: 'finally executes when control leaves its try block, which makes it suitable for releasing acquired permits and similar cleanup. For owned disposable resources, [[idisposable|using]] can express the same intent more directly.', why: 'Cleanup placed only on the normal path is skipped when an earlier operation throws.', tips: 'Avoid throwing a new failure from finally unless that policy is deliberate, because it can hide the original exception.', tags: ['finally', 'exceptions', 'cleanup'] }
};

addBase('code-recipes.json', codeRecipes);
addBase('concepts.json', concepts);
addLocale('ja', 'code-recipes.json', jaCode);
addLocale('en', 'code-recipes.json', enCode);
addLocale('ja', 'concepts.json', jaConcept);
addLocale('en', 'concepts.json', enConcept);

console.log('Added missing link targets:', [...codeRecipes, ...concepts].map(x => x.id).join(', '));
