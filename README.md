# jazug-mock-lab-sre-agent

SRE Agent をビジュアルで理解するためのラボアプリです。

JAZUG の LT「Azure SRE Agent」の補助教材として作りました。障害対応のときに SRE Agent が何をするのかを、ブラウザの中の模擬環境で触りながら確かめられます。

- Azure のサブスクリプションは不要、料金もかかりません
- インストール不要。ブラウザで開くだけで動きます
- 対象は Azure を触り始めたばかりの人です。全部で 40 分ほどかかります

> 画面・ログ・グラフはすべて学習用に作った架空のもので、実際の Azure ポータルとは見た目が違います。
> 仕様の説明は Microsoft Learn の [Azure SRE Agent ドキュメント](https://learn.microsoft.com/ja-jp/azure/sre-agent/overview)（2026 年 8 月時点）をもとにしています。

## ラボの内容

| No. | タイトル | 内容 | 目安 |
| --- | --- | --- | --- |
| 01 | SRE Agent ってなに？ | 手作業の障害対応と比べながら全体像をつかむ。全体図をクリックして、きっかけ・つなぎ先を確認する | 5 分 |
| 02 | 障害対応を体験する | 架空の EC サイトで起きたメモリ不足の障害を、アラート受信 → メトリック → ログ（KQL）→ デプロイ履歴 → 対処 → 記録の順に進める。対処の選び方で結果が変わる | 12 分 |
| 03 | 実行モードと権限 | Review / Autonomous と権限の有無をスイッチで切り替えて、SRE Agent の動きの違いを確かめる | 6 分 |
| 04 | タスクとプランを作る | スケジュールタスクの指示文を書いてテスト実行する。インシデント対応プランの条件を作ってテストのインシデントを送る | 8 分 |
| 05 | できることを広げる | スキル、カスタムエージェント、Python ツール、MCP サーバー、フックの使い分け | 4 分 |
| 06 | 確認テスト | 8 問。全問正解で修了 | 5 分 |

時間がない場合は 01 と 02 だけでも、SRE Agent の考え方はひととおりつかめます。

## 使い方

### いちばん簡単な方法

1. このリポジトリをダウンロードします（緑の「Code」ボタン →「Download ZIP」）
2. ZIP を展開して、`index.html` をダブルクリックします

### GitHub Pages で公開する

1. リポジトリの **Settings** → **Pages** を開きます
2. **Build and deployment** の Source を「Deploy from a branch」にします
3. Branch で `main`、フォルダーで `/ (root)` を選んで **Save** します
4. 数分後に `https://<ユーザー名>.github.io/jazug-mock-lab-sre-agent/` で開けるようになります

### 手元でサーバーを立てて確認する

```bash
npx http-server . -p 8080
```

ブラウザで `http://localhost:8080` を開きます。

## 構成図

題材の EC サイト「contoso-shop」と SRE Agent の構成図を、トップページ・LAB 01・LAB 02 に入れています。LAB 02 では「構成図でこのステップを見る」で、各ステップで SRE Agent が使っている部分を強調して表示します。

- 本番環境：App Service（production / staging スロット）、Azure SQL Database、Application Insights、Log Analytics、Azure Monitor アラート
- SRE Agent：別のリソースグループに置き、マネージド ID と Azure RBAC で本番環境へのアクセスを許可
- 外部サービス：GitHub（デプロイ・Issue）、Teams / ServiceNow（通知・チケット）

図のアイコンは、Microsoft 公式の [Azure アーキテクチャアイコン](https://learn.microsoft.com/azure/architecture/icons/)（2026 年 7 月版）です。使っている分だけを `assets/azure-icons/` に入れています。入手元・利用条件・元のファイル名は [assets/azure-icons/README.md](assets/azure-icons/README.md) にまとめました。公式のアイコンセットに SRE Agent 単体のアイコンはないため、SRE Agent は文字で表しています。

## アクセシビリティ

WCAG 2.2 AA を目安に作っています。

- キーボードだけで全ページを操作できます（「本文へスキップ」リンク、タブの矢印キー操作、用語ポップアップの Esc）
- 操作で内容が増えたときは、新しく出た見出しにフォーカスを移します
- 構成図とグラフには、同じ内容を文章や表で読める代替手段があります
- 文字色と背景色のコントラスト比は 4.5:1 以上です
- 色だけで意味を伝えないようにしています（強調行には「新しく発生」などの文字も付けています）
- 動きを減らす設定（prefers-reduced-motion）に対応しています

確認には [axe-core](https://github.com/dequelabs/axe-core) を使い、全ページと LAB 02 のすべての分岐で違反 0 件を確認しています。

## フィードバック

画面上部の「GitHub」「Issue」ボタンと、各ページの下にある「このページの不具合・要望を Issue で送る」から、このリポジトリの Issue を開けます。ページ名とテンプレートが入った状態で Issue の作成画面が開きます（GitHub のアカウントが必要です）。

## 進み具合の保存

各ラボの課題に答えると、目次に完了の印が付きます。進み具合はブラウザの localStorage にだけ保存され、どこにも送信されません。トップページの「進み具合をリセットする」で消せます。

## ファイル構成

```
index.html          ページの骨組み
assets/azure-icons/ 構成図で使う Azure 公式アイコン
css/style.css       見た目（白基調）
js/core.js          ページの登録、進み具合の保存、問題の部品
js/chart.js         折れ線グラフ（SVG、ライブラリなし）
js/arch.js          構成図（SVG）と、拡大表示のダイアログ
js/glossary.js      用語集と、本文中の用語ポップアップ
js/app.js           ページの切り替えと目次
js/pages/*.js       各ページの中身
docs/facilitator.md 勉強会で使うときの進め方
```

ビルドの仕組みやライブラリは使っていません。文章を直したいときは `js/pages/` の中の該当ファイルを直接編集してください。目次の順番やタイトルは `js/core.js` の `PAGES` で変えられます。

## ライセンス

[Apache License 2.0](LICENSE)
