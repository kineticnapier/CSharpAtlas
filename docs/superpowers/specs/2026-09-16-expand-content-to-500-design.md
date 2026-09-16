# CSharpAtlas 500記事拡張 + i18n 設計

## 目的

CSharpAtlas の既存100記事を、C#本体と .NET 標準ライブラリを中心に約500記事まで拡張する。同時に記事データをi18n対応へ移行し、日本語と英語を正式対応言語にする。

量だけを満たすための薄い記事は追加しない。最終件数は500を目標としつつ、重複や価値の低い候補を削る必要がある場合は 480〜520 件を許容する。

ASP.NET Core、Entity Framework Core、Unity、WPF、WinForms など特定フレームワークの記事は今回の対象外とする。

500記事を書き切ってから翻訳するのではなく、先にi18n基盤へ移行し、その後は日本語記事と英語訳を同じ作業単位で追加する。これにより翻訳負債を大量に後回しにしない。

## 基本方針

進め方は「カテゴリごとに設計して追加 + 自動検査」とする。

記事を次の2層へ分離する。

1. **言語非依存データ** — ID、種別、コード例、related など
2. **ローカライズデータ** — title、説明文、tags、コード注釈など

本文内リンクは既存の明示Wiki記法を使う。

- `[[article-id]]`
- `[[article-id|表示文字列]]`

自動部分一致リンクは復活させない。Wikiリンク先は記事IDで共通化し、表示文字列だけ各言語側で管理する。

## i18n アーキテクチャ

### 対応言語

今回の正式対応言語は次の2つ。

- `ja` — 基準言語。全記事必須。
- `en` — 正式対応。今回の完了時点では全記事必須。

将来 `ko`、`zh-CN` などを追加できる構造にする。追加言語は最初から100%翻訳されている必要はなく、日本語フォールバックを利用できる。

### データ分離

既存のカテゴリ分割を維持しつつ、言語非依存データとlocaleデータを分ける。

想定構成:

```text
public/content/
├─ articles/
│  ├─ items.json
│  ├─ exceptions.json
│  ├─ compiler-errors.json
│  ├─ compiler-warnings.json
│  ├─ concepts.json
│  ├─ code-recipes.json
│  └─ logic-errors.json
└─ locales/
   ├─ ja/
   │  ├─ items.json
   │  ├─ exceptions.json
   │  ├─ compiler-errors.json
   │  ├─ compiler-warnings.json
   │  ├─ concepts.json
   │  ├─ code-recipes.json
   │  └─ logic-errors.json
   └─ en/
      └─ 同じカテゴリ構成
```

500記事を1記事1ファイルには分割しない。既存のカテゴリ単位JSONを維持し、ファイル数の爆発を避ける。

### 言語非依存の記事データ

`articles/*.json` には原則として次を置く。

- `id`
- `type`
- `bad`
- `good`
- `code`
- `related`
- コードハイライト対象行など、文章を含まない注釈情報

コード例は原則共通化する。ただしコード内の説明コメント・表示文字列などを翻訳する必要がある場合、locale側から `bad` / `good` / `code` を上書きできる設計にする。

### localeデータ

`locales/<locale>/*.json` は記事IDをキーにして、原則として次を持つ。

- `title`
- `short`
- `summary`
- `why`
- `tips`
- `tags`
- `badNotes`
- `goodNotes`
- `codeNotes`
- 必要な場合のみ `bad` / `good` / `code` の言語別上書き

1記事のlocaleエントリは「完全」か「存在しない」のどちらかにする。必須フィールドの一部だけ欠けた半翻訳状態は許可しない。

### UI文字列

記事本文だけでなく、最低限のサイトUIも `ja` / `en` で切り替える。

対象:

- カテゴリ名
- 検索結果表示
- ボタン文言
- 「一言でいうと」「なぜ？」「補足」「関連」
- コピーボタンと成功・失敗表示
- 未翻訳バナー
- 未翻訳バッジ
- ページタイトル周辺の固定文言

UI文字列は記事localeとは別の小さな辞書で管理してよい。

### 言語選択

- 画面上に日本語 / English の言語切替を置く。
- 現在選択中の言語を明示する。
- 初期値は日本語とする。
- 選択状態は `localStorage` に保存する。
- 共有URLでも言語を指定できるよう、`?lang=en#/nullable` のような `lang` query parameter をサポートする。
- URLの `lang` が有効なら保存値より優先する。

既存の `#/article-id` ルーティングは維持する。

### フォールバック

選択localeに記事が存在しない場合、記事全体を `ja` へフォールバックする。

部分フィールドだけ日本語へフォールバックして混在させない。

記事ページでは必ず明示バナーを出す。

英語UI例:

```text
English translation is not available yet.
This article is being shown in Japanese.
```

日本語UI例:

```text
選択した言語の翻訳がまだありません。このページは日本語で表示しています。
```

検索結果でもフォールバック記事には「未翻訳 / Not translated」の小さな表示を付ける。

今回のPRでは `ja` と `en` を正式対応とするため、最終完了条件では両方100%翻訳済みにする。フォールバックは主に作業途中と将来の追加言語・新規記事のための安全機構として残す。

### 検索

検索対象は現在の実効localeの記事テキストを使う。

- `id` は常に検索対象
- `title`
- `short`
- `summary`
- locale別 `tags`

選択localeの翻訳が無い記事は、日本語フォールバック内容を検索対象にする。

Wikiリンク記法そのものは検索用テキストから適切に扱い、`[[id|label]]` の表示ラベルが普通の検索語として機能するようにする。

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
8. `tags` は各localeで検索語として自然な語を2〜5個程度付ける。
9. `related` は原則1〜4件程度。意味的に近い記事だけを選ぶ。
10. 本文中のWikiリンクは、その語を読んだ利用者が追加説明を欲しくなる箇所にだけ付ける。
11. リンク数を増やすためだけの不自然な一文は追加しない。
12. 同じ内容を型名やメソッド名だけ変えて量産しない。
13. 日本語版と英語版で記事の意味・コード上の結論を変えない。
14. 機械的な逐語訳ではなく、各言語で自然かつ簡潔な技術文にする。
15. 新規記事は原則として `ja` と `en` を同じコミットまたは同じ小バッチで追加する。

## リンク方針

`related` と本文Wikiリンクは役割を分ける。

- `related`: 記事末尾で次に読む候補
- Wikiリンク: 本文中の用語や前提概念から直接移動する導線

`related` は言語非依存で共有する。本文Wikiリンクは各locale文面に自然に埋め込むが、リンク先IDは共通とする。

追加記事は可能な範囲で既存記事にも接続する。新しい島を大量に作らない。

ただし、グラフ連結性そのものを満たすためだけに不自然なリンクは作らない。連結性は品質検査の参考値として扱い、必須要件は「壊れたリンクなし」とする。

## 品質検査

コンテンツ拡張と同時に、Node標準テストで記事データとi18nを検査する。

最低限、次を検査する。

1. 対象JSONをすべて正常に読み込める。
2. 全記事の `id` が空でなく、一意である。
3. `type` が既知の6種類のいずれかである。
4. `bad`、`good`、`code` が文字列または `null` である。
5. `related` が文字列配列である。
6. `related` の全IDが存在する。
7. `related` に自分自身を含めない。
8. localeエントリの必須フィールドが完全に揃っている。
9. `title`、`short`、`summary`、`why`、`tips` が文字列である。
10. `tags` が文字列配列である。
11. `[[id]]` / `[[id|label]]` のリンク先が存在する。
12. Wikiリンクが自分自身を指さない。
13. locale内で完全一致する重複タイトルがない。
14. `ja` は全記事100%存在する。
15. 今回の最終状態では `en` も全記事100%存在する。
16. UI文字列は `ja` / `en` の両方で必須キーが揃う。
17. 総記事数を集計し、目標範囲 480〜520 件に入る。
18. フォールバック判定が記事単位で動作し、部分的な言語混在を起こさない。
19. URL `lang`、保存済み言語、既定言語の優先順位をテストする。
20. 選択localeで検索し、未翻訳記事は日本語フォールバックで検索できることをテストする。

既存 `code-annotations.json` はi18n移行時に、文章を含まない行情報とlocale別ノートへ分離する。旧ファイルを残す場合でも、最終的に日本語固定テキストが英語記事へ漏れないことを検査する。

診断出力として、可能なら次を表示する。

- 総記事数
- type別件数
- locale別翻訳率 (`ja 500/500`, `en 500/500` など)
- 未翻訳記事ID一覧
- Wikiリンク数
- related数
- 孤立記事数

## 移行と作業順序

1本の `content/expand-to-500` branch / PR で進めるが、コミットは意味のある単位に分ける。

**最初にi18n基盤を完成させ、その後に記事数を増やす。**

想定順序:

1. i18n loader / merge / fallback のテストを先に追加する。
2. 現在100記事を「言語非依存データ + `ja` locale」へ移行し、表示を変えずに動かす。
3. UI文字列辞書、言語切替、`?lang=`、`localStorage`、フォールバックバナーを実装する。
4. 現在100記事の `en` localeを追加する。
5. コンテンツ全体の品質検査テストを追加する。
6. concepts を日英セットで拡張する。
7. code recipes を日英セットで拡張する。
8. exceptions を日英セットで拡張する。
9. compiler errors を日英セットで拡張する。
10. compiler warnings を日英セットで拡張する。
11. logic errors を日英セットで拡張する。
12. 既存・新規記事間のWikiリンク / related を調整する。
13. 重複・薄い記事を整理する。
14. 最終翻訳率と全検査を確認する。

大量の英訳を最後にまとめて行わない。カテゴリごとの小バッチを `ja + en + links + validation` の単位で完成させる。

## 完了条件

- 総記事数が 480〜520 件
- C#本体 + .NET標準ライブラリ中心である
- 特定フレームワーク依存記事を追加していない
- 日本語記事が全件存在する
- 英語記事が全件存在する
- 日本語 / English の切替が動作する
- `?lang=` と保存済み選択が動作する
- 未翻訳localeでは記事単位で日本語へフォールバックし、明示バナーを表示する
- 検索結果でもフォールバックを明示する
- ID重複なし
- 壊れた `related` なし
- 壊れたWikiリンクなし
- 完全重複タイトルなし
- 既存記事URL `#/id` を壊していない
- 新規記事が検索可能である
- 英語表示時に日本語固定のコード注釈やUI文言が漏れない
- 量合わせだけの明らかに重複・薄い記事を残していない
