# CSharpAtlas 500-Article Expansion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expand the localized CSharpAtlas corpus from 100 articles to roughly 500 high-value C#/.NET articles with complete Japanese and English text, robust cross-links, and automated content-quality checks.

**Architecture:** Build on the completed i18n foundation from `2026-09-16-i18n-foundation.md`. Add content in category-sized batches to the language-independent `public/content/articles/*.json` files and matching `ja`/`en` locale files; validate every batch with repository-level integrity tests before moving to the next category.

**Tech Stack:** JSON content, browser ES modules, Node `node:test`, Vite 7.

**Spec:** `docs/superpowers/specs/2026-09-16-expand-content-to-500-design.md`

## Global Constraints

- Execute this plan only after the i18n foundation plan is complete and green.
- Target final corpus size is 480–520 articles, aiming near 500 rather than padding to an exact number.
- New scope is C# language + .NET standard library; do not add ASP.NET Core, EF Core, Unity, WPF, WinForms, MAUI, or other framework-specific articles.
- Every new article must have one stable ID, one type, language-independent code/related data, and complete `ja` and `en` locale entries.
- Every new article must provide non-empty `title`, `short`, `summary`, `why`, `tips`, and `tags` in both locales.
- New Japanese and English entries are added in the same small batch; do not accumulate translation debt.
- Explicit wiki links remain `[[id]]` / `[[id|label]]` and must target existing IDs.
- `related` targets must exist and must not point to the current article.
- Prefer 1–4 meaningful `related` entries and natural in-prose wiki links; never add links only to satisfy graph metrics.
- Do not create near-duplicate articles by merely changing a type or method name.
- Articles may be removed or merged if they are thin or redundant, even when this lowers the final count below 500; the lower hard bound remains 480.

---

### Task 1: Add repository-wide content integrity analysis

**Files:**
- Create: `src/content-quality.js`
- Create: `test/content-quality.test.js`
- Create: `test/content-integrity.test.js`

**Interfaces:**
- Produces: `analyzeContent({ baseArticles, locales, requiredLocales })` returning `{ errors, stats }`.
- `stats` contains `total`, `byType`, `wikiLinks`, `relatedLinks`, `isolatedIds`, and `localeCoverage`.
- `errors` contains human-readable validation failures; an empty array means the corpus satisfies structural integrity.

- [ ] **Step 1: Write unit tests for invalid synthetic content**

Cover all of these cases with tiny in-memory fixtures:

```text
duplicate ID
unknown type
missing required locale entry
incomplete locale entry
broken related target
self-related target
broken wiki target
self wiki target
duplicate localized title within the same locale
```

Also assert stats count types, wiki links, related links, isolated IDs, and locale coverage.

- [ ] **Step 2: Run and verify RED**

Run: `npm test -- test/content-quality.test.js`

Expected: FAIL because `src/content-quality.js` does not exist.

- [ ] **Step 3: Implement the analyzer**

Known types are exactly:

```js
new Set(['code', 'exception', 'compiler-error', 'compiler-warning', 'logic', 'concept'])
```

Required locale fields are exactly:

```js
['title', 'short', 'summary', 'why', 'tips', 'tags']
```

Scan wiki links in `short`, `summary`, `why`, and `tips` with the same `[[id]]` / `[[id|label]]` grammar as the renderer. Treat links as directed for counting but ignore direction when computing isolated nodes. An article is isolated only if it has zero valid `related` edges and zero valid wiki-link edges in either direction.

- [ ] **Step 4: Add repository integration test**

`test/content-integrity.test.js` must load all seven base categories and both locale trees, flatten them, call `analyzeContent`, print a compact stats report, and assert `errors` is empty. At this stage assert only `total >= 100`; the final count range is enforced in Task 10.

- [ ] **Step 5: Run all tests**

Run: `npm test`

Expected: PASS on the migrated 100-article i18n baseline.

- [ ] **Step 6: Commit**

```bash
git add src/content-quality.js test/content-quality.test.js test/content-integrity.test.js
git commit -m "test: validate localized article corpus"
```

---

### Task 2: Freeze a concrete 500-article inventory before authoring

**Files:**
- Create: `docs/content-inventory-500.md`
- Modify: `test/content-integrity.test.js`

**Interfaces:**
- Inventory is the authoritative content checklist for Tasks 3–8.
- Every row contains `id`, `type`, Japanese title, English title, and topic family.

- [ ] **Step 1: Enumerate all existing 100 article IDs first**

Read all seven base category files and record their IDs in the inventory under `Existing`. Do not rename them.

- [ ] **Step 2: Add exactly 400 proposed new rows using these quotas**

Use these new-article quotas unless an existing article already covers a topic; when a collision occurs, replace it with another topic from the same family rather than creating a duplicate:

```text
concept          +95
code             +105
exception        +55
compiler-error   +70
compiler-warning +30
logic            +45
--------------------
total            +400
```

Use these topic-family quotas for the 95 new concepts:

```text
numeric/types/conversions                 12
classes/structs/records/object model      16
inheritance/interfaces/accessibility      12
generics/delegates/events/lambdas         12
modern syntax/patterns/tuples/enums       11
collections/enumeration/LINQ model        12
async/tasks/cancellation/threading        10
IO/streams/encoding/JSON/HTTP/utility     10
```

Use these topic-family quotas for the 105 new code recipes:

```text
string/char/formatting/regex              16
arrays/lists/dictionaries/sets/queues     20
LINQ querying/aggregation/grouping        18
files/directories/paths/streams           14
JSON/encoding/URI/HTTP                    12
dates/times/math/random/guid              10
async/cancellation/concurrency            8
language utility/reflection/attributes    7
```

Use these topic-family quotas for the 55 new exceptions:

```text
argument/state/null/type conversion       15
collections/indexing/enumeration          10
IO/stream/path/encoding                    10
JSON/regex/formatting/parsing              8
async/task/cancellation/threading          6
reflection/runtime/other standard          6
```

Use these topic-family quotas for the 70 new compiler errors:

```text
names/scope/member lookup                 12
type conversion/operators                12
generics/type inference/constraints      10
inheritance/interface/override            10
async/iterator/lambda                     8
nullable/definite assignment              6
syntax/modifiers/accessibility            8
records/patterns/newer language features  4
```

Use these topic-family quotas for the 30 new compiler warnings:

```text
nullable analysis                         10
async/task/event usage                     6
unused/unreachable/obsolete                6
hiding/override/member design              4
misc compiler diagnostics                  4
```

Use these topic-family quotas for the 45 new logic pitfalls:

```text
numeric/culture/equality                   8
collections/mutation/equality/hash         8
LINQ/deferred execution/enumeration        8
async/cancellation/concurrency            10
IO/path/encoding/JSON/HTTP                 7
object model/closures/events/resources     4
```

- [ ] **Step 3: Use stable ID naming rules**

Use lowercase kebab-case descriptive IDs for concepts/recipes/logic/exceptions, except preserve official compiler diagnostic IDs in lowercase (`cs####`). Examples:

```text
string-split-options
hashset-set-equality
priority-queue
cancellation-token
stream-copy-to
http-client-timeout
invalid-operation-exception
closure-loop-capture
cs1503
cs8604
```

Do not encode the locale in the ID.

- [ ] **Step 4: Add an inventory uniqueness test**

Parse inventory rows or maintain a small machine-readable fenced list in the document and assert proposed IDs do not collide with existing IDs and total exactly 500 rows. The test may read the markdown file directly; it must fail when an ID is duplicated.

- [ ] **Step 5: Run and verify inventory checks**

Run: `npm test -- test/content-integrity.test.js`

Expected: PASS with 100 implemented articles and 500 unique inventory rows; inventory rows are planning metadata, not runtime content.

- [ ] **Step 6: Commit**

```bash
git add docs/content-inventory-500.md test/content-integrity.test.js
git commit -m "docs: define 500 article content inventory"
```

---

### Task 3: Add 95 concept articles in eight reviewed batches

**Files:**
- Modify: `public/content/articles/concepts.json`
- Modify: `public/content/locales/ja/concepts.json`
- Modify: `public/content/locales/en/concepts.json`

**Interfaces:**
- Adds exactly the 95 `concept` rows from the approved inventory.

- [ ] **Step 1: Add numeric/types/conversions batch (12)**

Cover gaps such as numeric literal forms, implicit vs explicit conversions, `Convert`, `checked`, `nint/nuint`, `decimal`, `Half`, `BigInteger` where appropriate, `char`, and `default` semantics. Use inventory IDs exactly.

- [ ] **Step 2: Run integrity tests and commit**

Run: `npm test -- test/content-integrity.test.js`

Expected: PASS and total increases by 12.

```bash
git add public/content/articles/concepts.json public/content/locales/ja/concepts.json public/content/locales/en/concepts.json
git commit -m "content: add type and conversion concepts"
```

- [ ] **Step 3: Add classes/structs/records/object-model batch (16)**

Cover constructor forms, primary constructors if inventory includes them, field/property distinctions, `init`, `required`, object initializers, `this`, `base`, static classes, nested types, partial types, structs/ref structs/read-only structs, records/record structs, and object lifetime semantics without framework-specific material.

- [ ] **Step 4: Run integrity tests and commit**

Run: `npm test -- test/content-integrity.test.js`

Expected: PASS and cumulative concept delta is 28.

```bash
git add public/content/articles/concepts.json public/content/locales/ja/concepts.json public/content/locales/en/concepts.json
git commit -m "content: add object model concepts"
```

- [ ] **Step 5: Add inheritance/interfaces/accessibility batch (12)**

Cover abstract classes, virtual/override, sealed, interface implementation, default interface members at a beginner-safe level, explicit interface implementation, public/internal/protected/private/protected internal/private protected, and assembly-level visibility concepts.

- [ ] **Step 6: Run integrity tests and commit**

Run: `npm test -- test/content-integrity.test.js`

```bash
git add public/content/articles/concepts.json public/content/locales/ja/concepts.json public/content/locales/en/concepts.json
git commit -m "content: add inheritance and interface concepts"
```

- [ ] **Step 7: Add generics/delegates/events/lambdas batch (12)**

Cover generic methods/types, variance, constraints, `where`, delegates, multicast delegates, `Func`, `Action`, events, event accessors, lambdas, captures, and expression-vs-statement lambda distinctions.

- [ ] **Step 8: Run integrity tests and commit**

Run: `npm test -- test/content-integrity.test.js`

```bash
git add public/content/articles/concepts.json public/content/locales/ja/concepts.json public/content/locales/en/concepts.json
git commit -m "content: add generic and delegate concepts"
```

- [ ] **Step 9: Add modern syntax/patterns/tuples/enums batch (11)**

Cover tuple/value tuple, deconstruction, enum flags, switch expressions, relational/logical/property/list/type patterns, range/index syntax, target-typed `new`, collection expressions where supported by the project target, and raw/interpolated strings where inventory assigns them.

- [ ] **Step 10: Run integrity tests and commit**

Run: `npm test -- test/content-integrity.test.js`

```bash
git add public/content/articles/concepts.json public/content/locales/ja/concepts.json public/content/locales/en/concepts.json
git commit -m "content: add modern C# syntax concepts"
```

- [ ] **Step 11: Add collections/enumeration/LINQ-model batch (12)**

Cover collection interfaces, read-only interfaces, iterators, enumerators, `yield`, deferred execution model, comparer concepts, dictionary/hash set mechanics, ordering stability caveats, and materialization.

- [ ] **Step 12: Run integrity tests and commit**

Run: `npm test -- test/content-integrity.test.js`

```bash
git add public/content/articles/concepts.json public/content/locales/ja/concepts.json public/content/locales/en/concepts.json
git commit -m "content: add collection and enumeration concepts"
```

- [ ] **Step 13: Add async/tasks/cancellation/threading batch (10)**

Cover `Task`, `Task<T>`, `ValueTask`, async state flow, cancellation token/source, task composition, synchronization context only at a general .NET level, thread vs task, locking basics, and concurrent collections concepts.

- [ ] **Step 14: Run integrity tests and commit**

Run: `npm test -- test/content-integrity.test.js`

```bash
git add public/content/articles/concepts.json public/content/locales/ja/concepts.json public/content/locales/en/concepts.json
git commit -m "content: add async and cancellation concepts"
```

- [ ] **Step 15: Add IO/streams/encoding/JSON/HTTP/utility batch (10)**

Cover streams, text readers/writers, encodings, BOM, path semantics, JSON serialization concepts, `Uri`, `HttpClient` lifetime basics, `IDisposable`, and `IAsyncDisposable` where inventory assigns them.

- [ ] **Step 16: Run integrity tests and verify concept quota**

Run: `npm test -- test/content-integrity.test.js`

Expected: PASS and concept count is baseline concept count + 95.

- [ ] **Step 17: Commit final concept batch**

```bash
git add public/content/articles/concepts.json public/content/locales/ja/concepts.json public/content/locales/en/concepts.json
git commit -m "content: add standard library concepts"
```

---

### Task 4: Add 105 code-recipe articles in eight reviewed batches

**Files:**
- Modify: `public/content/articles/code-recipes.json`
- Modify: `public/content/locales/ja/code-recipes.json`
- Modify: `public/content/locales/en/code-recipes.json`

**Interfaces:**
- Adds exactly the 105 `code` rows from the inventory.
- Recipe code goes in base data unless localization of comments/string literals is necessary.

- [ ] **Step 1: Add string/char/formatting/regex recipes (16)**

Include practical operations such as split with options, join, trim variants, replace, contains/starts/ends with comparison, interpolation/formatting, `StringBuilder`, span-safe conversions only if beginner-useful, regex match/group/replace/split, and regex escaping/timeouts where appropriate.

- [ ] **Step 2: Validate and commit**

Run: `npm test -- test/content-integrity.test.js`

```bash
git add public/content/articles/code-recipes.json public/content/locales/ja/code-recipes.json public/content/locales/en/code-recipes.json
git commit -m "content: add string and regex recipes"
```

- [ ] **Step 3: Add collection recipes (20)**

Cover array/list creation and transforms, safe dictionary updates/lookups, grouping dictionary values, hash-set operations, queue/stack, priority queue, linked list where useful, sorting with comparer, binary search, deduplication, counting frequencies, and read-only exposure.

- [ ] **Step 4: Validate and commit**

Run: `npm test -- test/content-integrity.test.js`

```bash
git add public/content/articles/code-recipes.json public/content/locales/ja/code-recipes.json public/content/locales/en/code-recipes.json
git commit -m "content: add collection recipes"
```

- [ ] **Step 5: Add LINQ recipes (18)**

Cover filter/map, projection with index, `Any`/`All`, `FirstOrDefault`, `Single`, `OrderBy`/`ThenBy`, grouping, joins, lookup, distinct with comparer, chunking, zip, aggregate, min/max/sum/average, dictionary/materialization, and multiple-key ordering.

- [ ] **Step 6: Validate and commit**

Run: `npm test -- test/content-integrity.test.js`

```bash
git add public/content/articles/code-recipes.json public/content/locales/ja/code-recipes.json public/content/locales/en/code-recipes.json
git commit -m "content: add LINQ recipes"
```

- [ ] **Step 7: Add file/directory/path/stream recipes (14)**

Cover read/write text and lines, append, enumerate files, create/delete/copy/move, combine/normalize paths, temp paths, stream copy, buffered reading, memory streams, and async file operations.

- [ ] **Step 8: Validate and commit**

Run: `npm test -- test/content-integrity.test.js`

```bash
git add public/content/articles/code-recipes.json public/content/locales/ja/code-recipes.json public/content/locales/en/code-recipes.json
git commit -m "content: add IO recipes"
```

- [ ] **Step 9: Add JSON/encoding/URI/HTTP recipes (12)**

Cover serialize/deserialize, naming policy/options, JSON DOM basics, UTF-8 encode/decode, base64, URI building/parsing, query escaping, GET, POST JSON, headers, timeout/cancellation, and response status handling.

- [ ] **Step 10: Validate and commit**

Run: `npm test -- test/content-integrity.test.js`

```bash
git add public/content/articles/code-recipes.json public/content/locales/ja/code-recipes.json public/content/locales/en/code-recipes.json
git commit -m "content: add JSON and HTTP recipes"
```

- [ ] **Step 11: Add date/time/math/random/guid recipes (10)**

Cover parse/format date/time, UTC conversions, date arithmetic, `TimeSpan`, stopwatch timing, rounding, clamp, random selection/shuffle with appropriate caveats, and GUID generation/parsing.

- [ ] **Step 12: Validate and commit**

Run: `npm test -- test/content-integrity.test.js`

```bash
git add public/content/articles/code-recipes.json public/content/locales/ja/code-recipes.json public/content/locales/en/code-recipes.json
git commit -m "content: add date math and identifier recipes"
```

- [ ] **Step 13: Add async/cancellation/concurrency recipes (8)**

Cover `Task.WhenAll`, `Task.WhenAny`, timeout with cancellation, cooperative cancellation, parallel-safe throttling with `SemaphoreSlim`, concurrent dictionary update, async streams, and `await foreach`.

- [ ] **Step 14: Validate and commit**

Run: `npm test -- test/content-integrity.test.js`

```bash
git add public/content/articles/code-recipes.json public/content/locales/ja/code-recipes.json public/content/locales/en/code-recipes.json
git commit -m "content: add async recipes"
```

- [ ] **Step 15: Add language utility/reflection/attributes recipes (7)**

Cover type inspection, enum names/values, custom attributes readback, generic type checks, cloning/copy patterns that are actually safe to teach, environment values, and command-line args when present in inventory.

- [ ] **Step 16: Run quota verification and commit**

Run: `npm test -- test/content-integrity.test.js`

Expected: code count is baseline code count + 105.

```bash
git add public/content/articles/code-recipes.json public/content/locales/ja/code-recipes.json public/content/locales/en/code-recipes.json
git commit -m "content: add language utility recipes"
```

---

### Task 5: Add 55 exception articles

**Files:**
- Modify: `public/content/articles/exceptions.json`
- Modify: `public/content/locales/ja/exceptions.json`
- Modify: `public/content/locales/en/exceptions.json`

**Interfaces:**
- Adds exactly the 55 `exception` rows from the inventory.

- [ ] **Step 1: Add argument/state/null/type-conversion exceptions (15)**

Prioritize standard exceptions users can realistically encounter: `ArgumentException`, `ArgumentNullException`, `ArgumentOutOfRangeException`, `InvalidOperationException`, `InvalidCastException`, `ObjectDisposedException`, `NotSupportedException`, and related standard runtime cases not already present.

- [ ] **Step 2: Validate and commit**

Run: `npm test -- test/content-integrity.test.js`

```bash
git add public/content/articles/exceptions.json public/content/locales/ja/exceptions.json public/content/locales/en/exceptions.json
git commit -m "content: add argument and state exceptions"
```

- [ ] **Step 3: Add collection/index/enumeration exceptions (10)**

Cover array/list/dictionary/enumerator failure modes and comparer/duplicate-key cases that map to distinct standard exception types or distinct beginner-diagnostic situations.

- [ ] **Step 4: Validate and commit**

Run: `npm test -- test/content-integrity.test.js`

```bash
git add public/content/articles/exceptions.json public/content/locales/ja/exceptions.json public/content/locales/en/exceptions.json
git commit -m "content: add collection exceptions"
```

- [ ] **Step 5: Add IO/stream/path/encoding exceptions (10)**

Cover `DirectoryNotFoundException`, `PathTooLongException` where applicable, `UnauthorizedAccessException`, `IOException`, `EndOfStreamException`, and common stream/encoding failure cases.

- [ ] **Step 6: Validate and commit**

Run: `npm test -- test/content-integrity.test.js`

```bash
git add public/content/articles/exceptions.json public/content/locales/ja/exceptions.json public/content/locales/en/exceptions.json
git commit -m "content: add IO exceptions"
```

- [ ] **Step 7: Add JSON/regex/formatting/parsing exceptions (8)**

Cover remaining distinct `System.Text.Json`, regex timeout, formatting, numeric/date parsing, and encoding exceptions that are useful to diagnose.

- [ ] **Step 8: Validate and commit**

Run: `npm test -- test/content-integrity.test.js`

```bash
git add public/content/articles/exceptions.json public/content/locales/ja/exceptions.json public/content/locales/en/exceptions.json
git commit -m "content: add parsing and text exceptions"
```

- [ ] **Step 9: Add async/task/cancellation/threading exceptions (6)**

Cover cancellation and task aggregation/coordination failures without inventing framework-specific cases.

- [ ] **Step 10: Validate and commit**

Run: `npm test -- test/content-integrity.test.js`

```bash
git add public/content/articles/exceptions.json public/content/locales/ja/exceptions.json public/content/locales/en/exceptions.json
git commit -m "content: add async exceptions"
```

- [ ] **Step 11: Add reflection/runtime/other standard exceptions (6)**

Use only standard exceptions with a clear beginner-facing reproduction and recovery path, such as missing members/types/targets or platform limitations if present in the inventory.

- [ ] **Step 12: Verify exception quota and commit**

Run: `npm test -- test/content-integrity.test.js`

Expected: exception count is baseline exception count + 55.

```bash
git add public/content/articles/exceptions.json public/content/locales/ja/exceptions.json public/content/locales/en/exceptions.json
git commit -m "content: add runtime exceptions"
```

---

### Task 6: Add 70 compiler-error articles

**Files:**
- Modify: `public/content/articles/compiler-errors.json`
- Modify: `public/content/locales/ja/compiler-errors.json`
- Modify: `public/content/locales/en/compiler-errors.json`

**Interfaces:**
- Adds exactly the 70 `compiler-error` rows from inventory using official diagnostic IDs/titles.

- [ ] **Step 1: Add names/scope/member-lookup diagnostics (12)**

Use official CS codes only. Each article must show a minimal failing snippet and corrected snippet and avoid paraphrasing one diagnostic into several articles.

- [ ] **Step 2: Validate and commit**

Run: `npm test -- test/content-integrity.test.js`

```bash
git add public/content/articles/compiler-errors.json public/content/locales/ja/compiler-errors.json public/content/locales/en/compiler-errors.json
git commit -m "content: add name and scope compiler errors"
```

- [ ] **Step 3: Add type-conversion/operator diagnostics (12)**

Cover distinct compile-time conversion, overload, operator, argument, and return-type failures from the approved inventory.

- [ ] **Step 4: Validate and commit**

Run: `npm test -- test/content-integrity.test.js`

```bash
git add public/content/articles/compiler-errors.json public/content/locales/ja/compiler-errors.json public/content/locales/en/compiler-errors.json
git commit -m "content: add type compiler errors"
```

- [ ] **Step 5: Add generics/inference/constraint diagnostics (10)**

Cover generic arity, inference, constraint, variance, and type-parameter misuse diagnostics with distinct examples.

- [ ] **Step 6: Validate and commit**

Run: `npm test -- test/content-integrity.test.js`

```bash
git add public/content/articles/compiler-errors.json public/content/locales/ja/compiler-errors.json public/content/locales/en/compiler-errors.json
git commit -m "content: add generic compiler errors"
```

- [ ] **Step 7: Add inheritance/interface/override diagnostics (10)**

Cover abstract member implementation, incorrect override, sealed override, interface implementation, accessibility mismatch, and related official diagnostics.

- [ ] **Step 8: Validate and commit**

Run: `npm test -- test/content-integrity.test.js`

```bash
git add public/content/articles/compiler-errors.json public/content/locales/ja/compiler-errors.json public/content/locales/en/compiler-errors.json
git commit -m "content: add inheritance compiler errors"
```

- [ ] **Step 9: Add async/iterator/lambda diagnostics (8)**

Cover invalid `await`, async return types, iterator restrictions, lambda conversion/parameter failures, and related official diagnostics.

- [ ] **Step 10: Validate and commit**

Run: `npm test -- test/content-integrity.test.js`

```bash
git add public/content/articles/compiler-errors.json public/content/locales/ja/compiler-errors.json public/content/locales/en/compiler-errors.json
git commit -m "content: add async compiler errors"
```

- [ ] **Step 11: Add nullable/definite-assignment diagnostics (6)**

Prefer true errors here; nullable warnings belong to Task 7. Include unassigned local/use-before-assignment and nullability-related errors only where the compiler classifies them as errors.

- [ ] **Step 12: Validate and commit**

Run: `npm test -- test/content-integrity.test.js`

```bash
git add public/content/articles/compiler-errors.json public/content/locales/ja/compiler-errors.json public/content/locales/en/compiler-errors.json
git commit -m "content: add assignment compiler errors"
```

- [ ] **Step 13: Add syntax/modifier/accessibility diagnostics (8)**

Cover modifier conflicts, invalid declarations, accessibility inconsistency, readonly/ref restrictions, and similar official diagnostics.

- [ ] **Step 14: Validate and commit**

Run: `npm test -- test/content-integrity.test.js`

```bash
git add public/content/articles/compiler-errors.json public/content/locales/ja/compiler-errors.json public/content/locales/en/compiler-errors.json
git commit -m "content: add declaration compiler errors"
```

- [ ] **Step 15: Add records/patterns/newer-language diagnostics (4)**

Use only diagnostics reproducible on the repository's supported compiler/runtime; do not add version-specific diagnostics that cannot be demonstrated in the chosen language level.

- [ ] **Step 16: Verify compiler-error quota and commit**

Run: `npm test -- test/content-integrity.test.js`

Expected: compiler-error count is baseline + 70.

```bash
git add public/content/articles/compiler-errors.json public/content/locales/ja/compiler-errors.json public/content/locales/en/compiler-errors.json
git commit -m "content: add modern C# compiler errors"
```

---

### Task 7: Add 30 compiler-warning articles

**Files:**
- Modify: `public/content/articles/compiler-warnings.json`
- Modify: `public/content/locales/ja/compiler-warnings.json`
- Modify: `public/content/locales/en/compiler-warnings.json`

**Interfaces:**
- Adds exactly the 30 `compiler-warning` inventory rows.

- [ ] **Step 1: Add nullable-analysis warnings (10)**

Cover distinct nullable flow warnings such as possible null arguments/returns/assignments/member dereferences that are not already represented. Keep each official CS code unique.

- [ ] **Step 2: Validate and commit**

Run: `npm test -- test/content-integrity.test.js`

```bash
git add public/content/articles/compiler-warnings.json public/content/locales/ja/compiler-warnings.json public/content/locales/en/compiler-warnings.json
git commit -m "content: add nullable compiler warnings"
```

- [ ] **Step 3: Add async/task/event warnings (6)**

Use distinct official warnings around unawaited tasks, async methods without await, events/members where appropriate, excluding cases already present.

- [ ] **Step 4: Validate and commit**

Run: `npm test -- test/content-integrity.test.js`

```bash
git add public/content/articles/compiler-warnings.json public/content/locales/ja/compiler-warnings.json public/content/locales/en/compiler-warnings.json
git commit -m "content: add async compiler warnings"
```

- [ ] **Step 5: Add unused/unreachable/obsolete warnings (6)**

Cover distinct official diagnostics for unused values/fields/labels, unreachable code where represented as a warning, obsolete APIs, and related static diagnostics.

- [ ] **Step 6: Validate and commit**

Run: `npm test -- test/content-integrity.test.js`

```bash
git add public/content/articles/compiler-warnings.json public/content/locales/ja/compiler-warnings.json public/content/locales/en/compiler-warnings.json
git commit -m "content: add usage compiler warnings"
```

- [ ] **Step 7: Add hiding/override/member-design warnings (4)**

Cover `new`/hiding and related member-design warnings with distinct official codes.

- [ ] **Step 8: Validate and commit**

Run: `npm test -- test/content-integrity.test.js`

```bash
git add public/content/articles/compiler-warnings.json public/content/locales/ja/compiler-warnings.json public/content/locales/en/compiler-warnings.json
git commit -m "content: add member compiler warnings"
```

- [ ] **Step 9: Add miscellaneous standard warnings (4)**

Use remaining high-frequency, beginner-relevant official warnings from the inventory; avoid analyzer-only IDs unless they are emitted by the C# compiler itself and fit the site's CS diagnostic scope.

- [ ] **Step 10: Verify warning quota and commit**

Run: `npm test -- test/content-integrity.test.js`

Expected: compiler-warning count is baseline + 30.

```bash
git add public/content/articles/compiler-warnings.json public/content/locales/ja/compiler-warnings.json public/content/locales/en/compiler-warnings.json
git commit -m "content: add remaining compiler warnings"
```

---

### Task 8: Add 45 logic/pitfall articles

**Files:**
- Modify: `public/content/articles/logic-errors.json`
- Modify: `public/content/locales/ja/logic-errors.json`
- Modify: `public/content/locales/en/logic-errors.json`

**Interfaces:**
- Adds exactly the 45 `logic` inventory rows.

- [ ] **Step 1: Add numeric/culture/equality pitfalls (8)**

Cover integer truncation, overflow context, floating-point tolerance, decimal vs double misuse, culture-dependent parsing/formatting, reference/value equality, comparer/hash consistency, and NaN/signed-zero style traps only when pedagogically distinct.

- [ ] **Step 2: Validate and commit**

Run: `npm test -- test/content-integrity.test.js`

```bash
git add public/content/articles/logic-errors.json public/content/locales/ja/logic-errors.json public/content/locales/en/logic-errors.json
git commit -m "content: add numeric logic pitfalls"
```

- [ ] **Step 3: Add collection/mutation/equality/hash pitfalls (8)**

Cover modifying during enumeration, mutable dictionary keys, incorrect comparer assumptions, list aliasing, shallow copy confusion, set equality assumptions, order dependence, and accidental quadratic collection operations where concrete.

- [ ] **Step 4: Validate and commit**

Run: `npm test -- test/content-integrity.test.js`

```bash
git add public/content/articles/logic-errors.json public/content/locales/ja/logic-errors.json public/content/locales/en/logic-errors.json
git commit -m "content: add collection logic pitfalls"
```

- [ ] **Step 5: Add LINQ/deferred-enumeration pitfalls (8)**

Cover multiple enumeration, deferred mutation visibility, accidental `First`/`Single` assumptions, ordering loss, closure interaction, repeated expensive predicates, materialization timing, and side effects in LINQ.

- [ ] **Step 6: Validate and commit**

Run: `npm test -- test/content-integrity.test.js`

```bash
git add public/content/articles/logic-errors.json public/content/locales/ja/logic-errors.json public/content/locales/en/logic-errors.json
git commit -m "content: add LINQ logic pitfalls"
```

- [ ] **Step 7: Add async/cancellation/concurrency pitfalls (10)**

Cover `async void`, forgotten await/fire-and-forget, blocking on `.Result`, cancellation ignored/swallowed, creating `HttpClient` per call if inventory classifies it as standard-library lifecycle misuse, shared mutable state, lock misuse, `Task.Run` misuse, timeout vs cancellation confusion, and exception observation.

- [ ] **Step 8: Validate and commit**

Run: `npm test -- test/content-integrity.test.js`

```bash
git add public/content/articles/logic-errors.json public/content/locales/ja/logic-errors.json public/content/locales/en/logic-errors.json
git commit -m "content: add async logic pitfalls"
```

- [ ] **Step 9: Add IO/path/encoding/JSON/HTTP pitfalls (7)**

Cover relative-path assumptions, current directory confusion, encoding mismatch/BOM assumptions, partial stream reads, JSON case/name mismatch, HTTP status not checked, and URI/string concatenation problems.

- [ ] **Step 10: Validate and commit**

Run: `npm test -- test/content-integrity.test.js`

```bash
git add public/content/articles/logic-errors.json public/content/locales/ja/logic-errors.json public/content/locales/en/logic-errors.json
git commit -m "content: add IO and HTTP logic pitfalls"
```

- [ ] **Step 11: Add object-model/closure/event/resource pitfalls (4)**

Cover loop-variable capture, event subscription lifetime, disposal ownership confusion, and mutable record/class equality assumptions or equivalent distinct inventory topics.

- [ ] **Step 12: Verify logic quota and commit**

Run: `npm test -- test/content-integrity.test.js`

Expected: logic count is baseline + 45.

```bash
git add public/content/articles/logic-errors.json public/content/locales/ja/logic-errors.json public/content/locales/en/logic-errors.json
git commit -m "content: add object and lifetime pitfalls"
```

---

### Task 9: Cross-link the 500-article corpus and remove weak entries

**Files:**
- Modify: all `public/content/articles/*.json`
- Modify: all `public/content/locales/ja/*.json`
- Modify: all `public/content/locales/en/*.json`
- Modify: `docs/content-inventory-500.md`

**Interfaces:**
- `related` remains language-independent.
- Wiki links remain locale-specific prose with shared target IDs.

- [ ] **Step 1: Review isolated IDs from `content-integrity` stats**

Run: `npm test -- test/content-integrity.test.js`

Use the printed `isolatedIds` only as a review list. For each isolated article, either add a genuinely useful relation/wiki link or leave it isolated with no artificial link if no natural relationship exists.

- [ ] **Step 2: Strengthen hub topics**

Ensure broad hub articles such as nullable, equality, collections, LINQ deferred execution, async/await, Task, cancellation, file/path/stream, JSON, encoding, HTTP, generics, interfaces, records, and exceptions have meaningful incoming/outgoing links across related articles. Use natural labels in both locales.

- [ ] **Step 3: Review duplicate/near-duplicate content manually**

Search titles and summaries for pairs that teach the same behavior. Merge or delete thin entries and update inventory status. If an article is removed, remove corresponding base and both locale entries and repair all links.

- [ ] **Step 4: Review translation parity**

For every article, ensure Japanese and English teach the same conclusion, code behavior, caveat, and link targets. Do not require sentence-level literal correspondence.

- [ ] **Step 5: Validate after cleanup**

Run: `npm test`

Expected: no broken link, locale, duplicate-title, or structure failures.

- [ ] **Step 6: Commit**

```bash
git add public/content docs/content-inventory-500.md
git commit -m "content: connect and refine article corpus"
```

---

### Task 10: Enforce final corpus size and verify production build

**Files:**
- Modify: `test/content-integrity.test.js`
- Modify: `README.md`

**Interfaces:**
- Repository test becomes the permanent guard for article-count range and full ja/en coverage.

- [ ] **Step 1: Tighten final count assertion**

Replace the temporary `total >= 100` assertion with:

```js
assert.ok(stats.total >= 480 && stats.total <= 520, `expected 480-520 articles, got ${stats.total}`);
```

Also require:

```js
assert.equal(stats.localeCoverage.ja.translated, stats.total);
assert.equal(stats.localeCoverage.en.translated, stats.total);
```

- [ ] **Step 2: Run final content verification**

Run: `npm test`

Expected: PASS with 480–520 articles and 100% Japanese/English coverage.

- [ ] **Step 3: Run production build**

Run: `npm run build`

Expected: Vite build succeeds without missing content paths/imports.

- [ ] **Step 4: Update README corpus documentation**

Document approximate article count, supported languages, fallback behavior for future locales, the six article types, authoring schema, link syntax, and `npm test` quality gates.

- [ ] **Step 5: Re-run full verification after docs-only changes**

Run:

```bash
npm test
npm run build
```

Expected: PASS.

- [ ] **Step 6: Commit final verification state**

```bash
git add test/content-integrity.test.js README.md
git commit -m "test: enforce final localized corpus quality"
```

---

## Final Review Checklist

Before opening the PR, verify all of the following from fresh command output:

```text
480-520 total articles
100% ja coverage
100% en coverage
0 duplicate IDs
0 broken related targets
0 self-related targets
0 broken wiki targets
0 self wiki targets
0 duplicate titles per locale
all node tests passing
Vite production build passing
```

Then compare the branch to `main`, review the diff size/category counts, and open one PR from `content/expand-to-500` to `main`. Do not merge it without explicit user instruction.
