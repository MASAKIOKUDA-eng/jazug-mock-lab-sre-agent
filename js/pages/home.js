(function () {
  "use strict";
  var Lab = window.Lab;
  var T = Lab.term;

  Lab.register("home", function render(root) {
    var labs = Lab.labPages();
    var total = labs.reduce(function (s, p) { return s + (p.minutes || 0); }, 0);
    var next = labs.filter(function (p) { return !Lab.isDone(p.id); })[0];

    var list = labs.map(function (p) {
      var done = Lab.isDone(p.id);
      return (
        '<li><a class="lab-item" href="#' + p.path + '">' +
        '<span class="lab-item__no"><span class="sr-only">LAB </span>' + p.no + "</span>" +
        '<span><span class="lab-item__title">' + p.title + '</span><span class="lab-item__desc">' + p.desc + "</span></span>" +
        '<span class="lab-item__side">' + (done ? '<span class="tag tag--ok">完了</span>' : "約 " + p.minutes + " 分<span class=\"sr-only\">（未完了）</span>") + "</span>" +
        "</a></li>"
      );
    }).join("");

    root.innerHTML =
      '<div class="eyebrow">JAZUG LT / HANDS-ON</div>' +
      "<h1 tabindex=\"-1\">SRE Agent モックラボ</h1>" +
      '<p class="lead">Azure SRE Agent が障害対応のときに何をしてくれるのかを、ブラウザの中の模擬環境で触りながら確かめるラボです。</p>' +

      '<div class="two-col">' +
      '<div class="box"><h2 style="margin-top:0;font-size:1.08rem;border:0;padding:0">こんな人向け</h2><ul style="margin:0">' +
      "<li>Azure を触り始めて間もない</li>" +
      "<li>" + T("sre", "SRE") + " という言葉は聞いたことがある程度</li>" +
      "<li>LT を聞いて、実際の動きをもう少し見てみたくなった</li>" +
      "</ul></div>" +
      '<div class="box"><h2 style="margin-top:0;font-size:1.08rem;border:0;padding:0">用意するもの</h2><ul style="margin:0">' +
      "<li>ブラウザだけで大丈夫です</li>" +
      "<li>Azure のサブスクリプションや料金はかかりません</li>" +
      "<li>全部で約 " + total + " 分。途中でやめても進み具合は残ります</li>" +
      "</ul></div>" +
      "</div>" +

      "<h2>題材にするシステム</h2>" +
      "<p>このラボでは、架空の EC サイト「contoso-shop」を題材にします。Azure の本番環境と SRE Agent は次のようにつながっています。LAB 02 では、この図のどこを使っているかを強調して見せます。</p>" +
      Lab.arch({ caption: "contoso-shop の構成。左が利用者と GitHub、中央が本番のリソースグループ、右が SRE Agent と通知先です。" }) +
      '<div class="note"><span class="note__title">このラボで扱う画面について</span>' +
      "ここに出てくる画面・ログ・グラフは、学習用に作った架空のものです。実際の Azure ポータルの見た目とは違いますが、SRE Agent の考え方や流れは公式ドキュメントに沿っています。</div>" +

      "<h2>ラボの一覧</h2>" +
      "<p>上から順に進めるのがおすすめです。02 の障害対応がいちばんの見どころなので、時間がない人は 01 と 02 だけでも十分です。</p>" +
      '<ul class="lab-list">' + list + "</ul>" +

      '<div class="btn-row">' +
      (next
        ? '<a class="btn btn--primary" href="#' + next.path + '">' + (next.id === "lab1" ? "LAB 01 から始める" : "続きから（LAB " + next.no + "）") + "</a>"
        : '<span class="tag tag--ok">すべて完了しています</span>') +
      '<a class="btn" href="#/glossary">先に用語集を見る</a>' +
      "</div>" +

      "<h2>進め方のコツ</h2>" +
      "<ul>" +
      '<li>本文で点線の下線が付いた言葉は、押すと説明が出ます。キーボードでも Tab で移動して Enter で開けます。</li>' +
      "<li>構成図やグラフには、同じ内容を文章や表で読める「図の内容を文章で読む」「数値を表で見る」が付いています。</li>" +
      "<li>各ラボの最後に小さな課題があります。答えると目次に「完了」の印が付きます。</li>" +
      "<li>間違えても何も壊れません。気になるところは何度でもやり直してください。</li>" +
      "</ul>" +

      '<h2>進み具合のリセット</h2>' +
      '<p>進み具合はこのブラウザの中だけに保存されています。最初からやり直したいときはリセットしてください。</p>' +
      '<div class="btn-row"><button type="button" class="btn btn--small btn--bad" data-reset>進み具合をリセットする</button></div>' +

      "<h2>ソースコードとフィードバック</h2>" +
      "<p>このラボのソースコードは GitHub で公開しています。説明の誤りや動かないところに気づいたら、Issue で教えてもらえると助かります。</p>" +
      '<div class="btn-row">' +
      Lab.extButton(Lab.REPO_URL, "GitHub でソースコードを見る", "btn") +
      Lab.extButton(Lab.newIssueUrl(), "Issue で不具合・要望を送る", "btn") +
      Lab.extButton(Lab.ISSUES_URL, "Issue の一覧を見る", "btn") +
      "</div>";

    root.querySelector("[data-reset]").addEventListener("click", function () {
      if (window.confirm("進み具合をすべて消して、最初からやり直しますか？")) {
        Lab.reset();
        render(root);
      }
    });
  });
})();
