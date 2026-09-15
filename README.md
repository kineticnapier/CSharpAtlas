# CSharpAtlas

C# のコード例、例外、コンパイルエラー、仕組みをひとつにまとめる逆引きリファレンスです。

## 現在の構成

- ASP.NET Core (.NET 10)
- 記事データは `src/CSharpAtlas.Web/content/items.json`
- `/api/items` で検索・種類絞り込み
- `/api/items/{id}` で個別記事取得
- コード、例外、コンパイルエラー、論理エラー、仕組みを同じ検索対象にする
- 関連項目を相互リンクする

## 起動

```bash
dotnet run --project src/CSharpAtlas.Web/CSharpAtlas.Web.csproj
```

起動後、表示されたローカルURLをブラウザで開いてください。

## 今後

- 記事数を増やす
- URLを記事単位で持てるようにする
- 検索改善
- コード例から直接開ける C# プレイグラウンド

プレイグラウンドで任意コードをサーバー実行する場合は、Webサーバー本体とは分離し、CPU時間・メモリ・ファイル・ネットワークを制限できる隔離環境を前提にします。
