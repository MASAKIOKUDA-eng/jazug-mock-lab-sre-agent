(function () {
  "use strict";
  var Lab = window.Lab;

  var QUESTIONS = [
    { id: "f1", text: "SRE Agent の説明として、正しいものはどれでしょう？",
      options: [
        "Azure のリソースや監視ツールにつながり、障害の調査や対処を手伝うサービス",
        "アラートの条件を自動で作ってくれる監視ツール",
        "人の代わりにすべての判断を行い、設定は不要なサービス"
      ], answer: 0,
      explain: "SRE Agent は調査・原因の推測・対処の提案（設定によっては実行）・記録を手伝います。どこまで任せるかは人が設定します。",
      hints: { 1: "アラートを受け取って動くことはできますが、監視ツールそのものではありません。", 2: "実行モードや権限など、どこまで任せるかは人が決めます。" } },
    { id: "f2", text: "LAB 02 の障害で、App Service の再起動を選ぶとどうなったでしょう？",
      options: [
        "原因が取り除かれ、そのまま安定した",
        "一度は回復したが、原因のコードが残っているため再びメモリが増え始めた",
        "再起動は SRE Agent にはできない操作なので、何も起きなかった"
      ], answer: 1,
      explain: "再起動はたまったメモリを空にするだけです。原因を取り除くには、ロールバックやコードの修正が必要でした。" },
    { id: "f3", text: "Review モードで、[承認] [拒否] のボタンが出るのはどんなときでしょう？",
      options: [
        "ログを検索するとき",
        "Teams にメッセージを投稿するとき",
        "App Service の再起動など、Azure のリソースを変更するとき"
      ], answer: 2,
      explain: "承認のボタンが出るのは、Azure CLI や Azure Resource Manager による変更操作です。ほかの行動に歯止めをかけるには、フックやツールのアクセスポリシーを使います。" },
    { id: "f4", text: "Review モードで提案された操作を承認できるのは誰でしょう？",
      options: ["SRE Agent 管理者のロールを持つ人", "Azure にサインインできる人なら誰でも", "インシデントを最初に見つけた人"], answer: 0,
      explain: "承認できるのは SRE Agent 管理者だけです。" },
    { id: "f5", text: "SRE Agent に変更の権限がないとき、Autonomous モードではどうなるでしょう？",
      options: [
        "権限がなくても、Autonomous なので実行される",
        "操作している人の権限を一時的に借りてよいか確認する",
        "エラーになり、調査も止まる"
      ], answer: 1,
      explain: "権限がない場合は、Microsoft Entra の On-Behalf-Of フローで、人の権限を一時的に借りてよいか確認します。実行モードは「聞くかどうか」、権限は「触れるかどうか」で、両方がそろって初めて操作できます。" },
    { id: "f6", text: "本番環境の障害対応プランを新しく作るとき、おすすめの進め方はどれでしょう？",
      options: [
        "最初から Autonomous にして、すぐに効果を出す",
        "最初は Review にして提案の内容を見て、いつも承認するパターンだけを Autonomous にしていく",
        "実行モードはエージェント全体で 1 つなので、どちらでも同じ"
      ], answer: 1,
      explain: "まず Review で 2〜4 週間ほど様子を見て、安心して任せられるものから Autonomous にしていくのがおすすめです。実行モードはプランやタスクごとに設定します。",
      hints: { 2: "実行モードはインシデント対応プランやスケジュールタスクごとに設定できます。" } },
    { id: "f7", text: "スケジュールタスクの指示文に「設定の変更や再起動は行わない」と書いておく理由として、最も近いものは？",
      options: [
        "書かないとタスクが保存できないから",
        "点検だけのつもりでも、Autonomous モードだと修正まで行う可能性があるから",
        "SRE Agent は日本語の否定文を理解できないから"
      ], answer: 1,
      explain: "人に頼むときと同じで、やってほしくないことははっきり書いておくのが安全です。" },
    { id: "f8", text: "Azure の外にある監視ツール（Datadog など）のデータを調査に使いたいときは？",
      options: ["スキルを追加する", "MCP サーバーでつなぐ", "フックを設定する"], answer: 1,
      explain: "外部のツールやデータとは、MCP サーバーでつなぎます。" }
  ];

  Lab.register("quiz", function (root) {
    var answered = {};
    var firstTry = 0;

    root.innerHTML =
      Lab.pageHead("quiz", "ここまでのラボの内容から 8 問です。間違えても何度でも選び直せます。全問正解すると修了です。") +
      QUESTIONS.map(function (q, i) { return Lab.questionHtml(q, "Q" + (i + 1) + " / " + QUESTIONS.length); }).join("") +
      '<div data-result role="status"></div>' +
      Lab.pageNav("quiz");

    var result = root.querySelector("[data-result]");

    function showResult() {
      result.innerHTML =
        '<div class="box" style="border-color:var(--ok)">' +
        '<h2 style="margin-top:0;font-size:1.1rem;border:0;padding:0">結果</h2>' +
        '<div class="result-score">' + firstTry + " / " + QUESTIONS.length + "</div>" +
        '<p style="color:var(--ink-2)">1 回目で正解した問題の数です。全問に正解したので、このラボは修了です。おつかれさまでした。</p>' +
        "<h3>次の一歩</h3>" +
        "<p>実際の SRE Agent を触ってみたくなったら、Microsoft Learn の公式ドキュメントから始めるのがおすすめです。</p>" +
        "<ul>" +
        "<li>" + Lab.extLink("https://learn.microsoft.com/ja-jp/azure/sre-agent/overview", "Azure SRE Agent の概要") + "</li>" +
        "<li>" + Lab.extLink("https://learn.microsoft.com/ja-jp/azure/sre-agent/run-modes", "実行モード（Run modes）") + "</li>" +
        "<li>" + Lab.extLink("https://learn.microsoft.com/ja-jp/azure/sre-agent/permissions", "権限（Permissions）") + "</li>" +
        "</ul>" +
        '<p style="font-size:.88rem;color:var(--ink-3);margin:0">実際に試すときは、まず検証用のリソースグループで、Review モードから始めると安心です。</p>' +
        "</div>";
    }

    Lab.bindQuestions(root, QUESTIONS, function (id, isFirst) {
      if (answered[id]) return;
      answered[id] = true;
      if (isFirst) firstTry++;
      if (Object.keys(answered).length === QUESTIONS.length) {
        Lab.complete("quiz");
        showResult();
      }
    });
  });
})();
