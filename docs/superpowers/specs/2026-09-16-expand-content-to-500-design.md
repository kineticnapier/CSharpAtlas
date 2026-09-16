# CSharpAtlas 500記事拡張 設計

## 目的

CSharpAtlas の既存100記事を、C#本体と .NET 標準ライブラリを中心に約500記事まで拡張する。

量だけを満たすための薄い記事は追加しない。最終件数は500を目標としつつ、重複や価値の低い候補を削る必要がある場合は 480〜520 件を許容する。

ASP.NET Core、Entity Framework Core、Unity、WPF、WinForms など特定フレームワークの記事は今回の対象外とする。

## 基本方針

既存の記事スキーマとUIを維持し、コンテンツをカテゴリごとに設計して追加する。

記事スキーマは次を維持する。

- `id`
- `type`
- `title`
- `short`
- `summary`
- `bad`
- `good`
- `code`
- `why`
- `tips`
- `tags`
- `related`

本文内リンクは既存の明示Wiki記法を使う。

- `[[article-id]]`
- `[[article-id|表示文字列]]`

自動部分一致リンクは復活させない。

## 対象カテゴリと目安

最終的な総数の目安は次の通り。

| type | 目標件数 | 主な内容 |
|---|---:|---|
| `code` | 約130 | よく使うコード例、標準ライブラリ利用例 |
| `exception` | 約75 | 標準的な実行時例外と原因・対処 |
| `compiler-error` | 約95 | 頻出コンパイルエラー |
| `compiler-warning` | 約40 | nullable、async、未使用、API関連など |
| `concept` | 約120 | C#言語機能、型、コレクション、非同期、IO等 |
| `logic` | 約40 | 動くが間違う、遅い、壊れやすい実装パターン |

既存記事数との兼ね合いで各カテゴリの最終数は多少前後してよい。総件数と実用性を優先する。

## コンテンツ領域

### C# 言語基礎

- 値型 / 参照型
- 数値型、変換、checked / unchecked
- string、char、補間文字列
- nullable
- pattern matching
- switch 式
- tuple / ValueTuple
- enum
- class / struct / record
- property / field
- constructor
- inheritance
- virtual / override / abstract
- interface
- access modifiers
- static
- extension method
- generic / constraints
- delegate / event
- lambda
- iterator / yield
- exception handling
- using / IDisposable
- async / await / Task / ValueTask
- cancellation
- attributes
- reflection の基礎

### .NET 標準ライブラリ

- Array / List / Dictionary / HashSet
- Queue / Stack / LinkedList / PriorityQueue
- IEnumerable / ICollection / IReadOnlyCollection 等
- LINQ
- string APIs
- Regex
- DateTime / DateTimeOffset / TimeSpan
- Guid
- Math / Random
- File / Directory / Path
- Stream / StreamReader / StreamWriter
- Encoding
- System.Text.Json
- HttpClient
- Uri
- Stopwatch
- Environment
- process-independent な基本診断・ユーティリティ
- threading / synchronization の基礎

### 事故・落とし穴

- off-by-one
- integer division
- overflow
- floating-point comparison
- culture依存の parse / format
- equality / hash code
- mutable reference sharing
- collection modification during enumeration
- deferred execution / multiple enumeration
- closure capture
- async void
- fire-and-forget
- sync-over-async
- cancellation ignoring
- resource disposal leak
- relative path confusion
- encoding mismatch
- JSON schema/type mismatch
- regex escaping

## 記事設計ルール

1. 1記事1テーマとする。
2. `short` は検索結果だけで症状・目的が分かる文にする。
3. `summary` は初心者が意味を判断できる説明にする。
4. `bad` / `good` は事故記事と診断記事で優先して用意する。
5. `code` はレシピ・概念記事で、最小限の実行可能性を意識した例にする。
6. `why` は原因や仕組みを1段深く説明する。
7. `tips` は関連する判断基準や注意点を書く。単なる本文の言い換えにしない。
8. `tags` は検索語として自然な語を2〜5個程度付ける。
9. `related` は原則1〜4件程度。意味的に近い記事だけを選ぶ。
10. 本文中のWikiリンクは、その語を読んだ利用者が追加説明を欲しくなる箇所にだけ付ける。
11. リンク数を増やすためだけの不自然な一文は追加しない。
12. 同じ内容を型名やメソッド名だけ変えて量産しない。

## リンク方針

`related` と本文Wikiリンクは役割を分ける。

- `related`: 記事末尾で次に読む候補
- Wikiリンク: 本文中の用語や前提概念から直接移動する導線

追加記事は可能な範囲で既存記事にも接続する。新しい島を大量に作らない。

ただし、グラフ連結性そのものを満たすためだけに内容不自然なリンクは作らない。連結性は品質検査の参考値として扱い、必須要件は「壊れたリンクなし」とする。

## 品質検査

コンテンツ拡張と同時に、Node標準テストで記事データを検査する。

最低限、次を検査する。

1. 全JSONを正常に読み込める。
2. 全記事の `id` が空でなく、一意である。
3. `type` が既知の6種類のいずれかである。
4. `title`、`short`、`summary`、`why`、`tips`、`tags`、`related` が想定型である。
5. `related` の全IDが存在する。
6. `related` に自分自身を含めない。
7. `[[id]]` / `[[id|label]]` のリンク先が存在する。
8. Wikiリンクが自分自身を指さない。
9. 完全一致する重複タイトルがない。
10. 総記事数を集計し、目標範囲 480〜520 件に入る。

可能なら診断出力として、type別件数、Wikiリンク数、related数、孤立記事数も表示する。

## ファイル構成

既存の `public/content/*.json` を継続利用する。今回のためだけにDSLや生成システムは導入しない。

主な更新対象:

- `public/content/items.json`
- `public/content/exceptions.json`
- `public/content/compiler-errors.json`
- `public/content/compiler-warnings.json`
- `public/content/concepts.json`
- `public/content/code-recipes.json`
- `public/content/logic-errors.json`

検査用テストを `test/` に追加する。

既存の `src/main.js` は、新しい記事スキーマや追加ファイルが不要な限り変更しない。

## 作業単位

1本の `content/expand-to-500` branch / PR で進めるが、コミットは意味のある単位に分ける。

想定順序:

1. コンテンツ検査テストを追加
2. concepts を拡張
3. code recipes を拡張
4. exceptions を拡張
5. compiler errors を拡張
6. compiler warnings を拡張
7. logic errors を拡張
8. 既存・新規記事間のWikiリンク / related を調整
9. 重複・薄い記事を整理
10. 最終検査

## 完了条件

- 総記事数が 480〜520 件
- C#本体 + .NET標準ライブラリ中心である
- 特定フレームワーク依存記事を追加していない
- ID重複なし
- 壊れた `related` なし
- 壊れたWikiリンクなし
- 完全重複タイトルなし
- 既存記事の表示・検索・Wikiリンク仕様を壊していない
- 新規記事が検索可能である
- 量合わせだけの明らかに重複・薄い記事を残していない
