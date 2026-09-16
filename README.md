# CSharpAtlas

C# のコード例、例外、コンパイルエラー・警告、仕組みをひとつにまとめる逆引きリファレンスです。

## 構成

- Vite + Vanilla JavaScript
- 記事データは `public/content/*.json`
- 検索・種類絞り込み・関連記事取得はブラウザ側で処理
- Cloudflare Pages へそのままデプロイ可能
- サーバー側の .NET / ASP.NET Core 依存なし

## 記事内Wikiリンク

本文中のWikiリンクは自動検出せず、記事側で明示します。

```text
[[equality]]
[[equality|Equals / GetHashCode]]
```

- `[[記事ID]]` はリンク先記事のタイトルを表示
- `[[記事ID|表示文字列]]` は指定した文字列を表示
- 存在しない記事IDはリンク化せず、読める文字列として表示

この方式により、`GetHashCode` 内の `GET` のような意図しない部分一致を防ぎます。

## 開発

```bash
npm install
npm run dev
```

Vite は `0.0.0.0` で待ち受けるため、WSL + Cloudflare Tunnel からもそのまま確認できます。

## テスト

```bash
npm test
```

## ビルド

```bash
npm run build
```

成果物は `dist/` に生成されます。

## Cloudflare Pages

- Build command: `npm run build`
- Build output directory: `dist`
- Production branch: `main`

詳しくは `CLOUDFLARE_PAGES.md` を参照してください。

## 今後

- 記事数と記事間リンクの拡充
- 検索改善
- 必要になった場合のみ、C# プレイグラウンド用の別サービス/APIを追加
