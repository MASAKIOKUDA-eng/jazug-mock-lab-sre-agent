(function () {
  "use strict";
  var Lab = window.Lab;
  var T = Lab.term;

  var EXT = [
    { id: "skill", name: "スキル", text: "ランブックや Azure CLI のスクリプトなど、まとまった「できること」を追加します。マーケットプレイスから選んで入れることもできます。",
      ex: "例：「App Service のメモリ不足を調べる手順」を追加する" },
    { id: "agent", name: "カスタムエージェント", text: "特定の分野に詳しい専門のエージェントを作ります。最初から用意されているものもあり、エージェントビルダーで自分でも作れます。",
      ex: "例：データベースの障害だけを担当するエージェント" },
    { id: "python", name: "Python ツール", text: "設定だけでは足りないときに、Python のコードで独自の処理を書きます。データの変換や社内 API の呼び出しなどに使います。",
      ex: "例：社内の課金 API から金額を取ってきて表にまとめる" },
    { id: "mcp", name: "MCP サーバー", text: T("mcp", "MCP") + " という共通の規格で、外部のツールやデータにつなぎます。Datadog、Splunk、New Relic などはつなぐ設定が用意されています。",
      ex: "例：Datadog の監視データも調査に使う" },
    { id: "hook", name: "フック", text: "「ツールを実行した後」「止まるとき」など、決まったタイミングで自動的に動く処理です。ルールに合わない操作を止めたり、記録を残したりします。",
      ex: "例：本番リソースを削除する操作を必ずブロックする" }
  ];

  var QUESTIONS = [
    { id: "l5-1", text: "監視には Datadog を使っている。そのデータも調査に使ってほしい。", options: EXT.map(function (e) { return e.name; }), answer: 3,
      explain: "外部のツールとつなぐのは MCP サーバーの役目です。Datadog はつなぐ設定が用意されています。" },
    { id: "l5-2", text: "「本番のリソースを削除する操作」は、どんな場合でも必ず止めたい。", options: EXT.map(function (e) { return e.name; }), answer: 4,
      explain: "決まったタイミングで割り込んで、操作を許可したりブロックしたりできるのがフックです。ツールのアクセスポリシーで「禁止」にする方法もあります。" },
    { id: "l5-3", text: "社内の課金 API を呼び出して、結果を独自の形式に整えたい。", options: EXT.map(function (e) { return e.name; }), answer: 2,
      explain: "設定だけではできない独自の処理は、Python ツールで書きます。" },
    { id: "l5-4", text: "データベースの障害だけを担当する、専門の担当者を用意したい。", options: EXT.map(function (e) { return e.name; }), answer: 1,
      explain: "特定の分野に絞った専門のエージェントは、カスタムエージェントとして作ります。" },
    { id: "l5-5", text: "マーケットプレイスにある定番のランブックを追加したい。", options: EXT.map(function (e) { return e.name; }), answer: 0,
      explain: "ランブックやスクリプトのような「まとまったできること」は、スキルとして追加します。" }
  ];

  Lab.register("lab5", function (root) {
    var correct = {};

    root.innerHTML =
      Lab.pageHead("lab5", "SRE Agent は最初から Azure についての知識を持っていますが、チームのやり方や使っているツールに合わせて、できることを広げられます。広げ方は 5 種類あります。") +

      "<h2>5 つの拡張ポイント</h2>" +
      '<div class="ext-grid">' +
      EXT.map(function (e) {
        return '<div class="ext-card"><h3>' + e.name + "</h3><p>" + e.text + '</p><p class="ext-card__ex">' + e.ex + "</p></div>";
      }).join("") +
      "</div>" +
      '<div class="note"><span class="note__title">迷ったときの考え方</span>' +
      "<ul style=\"margin:0\"><li>手順や定番の作業を足したい → <strong>スキル</strong></li>" +
      "<li>担当を分けたい → <strong>カスタムエージェント</strong></li>" +
      "<li>コードを書かないとできない → <strong>Python ツール</strong></li>" +
      "<li>Azure の外にあるものとつなぎたい → <strong>MCP サーバー</strong></li>" +
      "<li>ルールで縛りたい・自動で割り込みたい → <strong>フック</strong></li></ul></div>" +
      "<p>どの拡張を使っても、SRE Agent の操作はあらかじめ決めた権限と" + T("toolpolicy", "ツールのアクセスポリシー") + "の範囲内で行われます。拡張したからといって、勝手にできることが増えるわけではありません。</p>" +

      "<h2>課題：どれを使う？</h2>" +
      "<p>次の 5 つの場面で、どの拡張ポイントを使えばよいか選んでください。</p>" +
      QUESTIONS.map(function (q, i) { return Lab.questionHtml(q, "Q" + (i + 1)); }).join("") +
      Lab.completeBar("lab5", "5 問すべてに正解すると完了になります。") +
      Lab.pageNav("lab5");

    Lab.bindQuestions(root, QUESTIONS, function (id) {
      correct[id] = true;
      if (Object.keys(correct).length === QUESTIONS.length) {
        Lab.complete("lab5");
        Lab.refreshCompleteBar(root, "lab5", "最後に、確認テストで全体をふりかえりましょう。");
      }
    });
  });
})();
