(function () {
  "use strict";
  var Lab = window.Lab;
  var T = Lab.term;

  // 全体図のそれぞれの箱をクリックしたときの説明
  var NODES = {
    "in-alert": { col: "in", title: "Azure Monitor アラート", sub: "Azure 標準の監視",
      body: "「応答時間が 3 秒を超えた」「CPU が 90% を超えた」などの" + T("alert", "アラート") + "を受け取ると、SRE Agent が調査を始めます。いちばん手軽な始め方です。" },
    "in-pd": { col: "in", title: "PagerDuty / ServiceNow", sub: "インシデント管理ツール",
      body: "すでに " + T("pagerduty", "PagerDuty") + " や " + T("servicenow", "ServiceNow") + " でインシデントを管理しているなら、そこからチケットを受け取れます。調べた結果も同じチケットに書き戻されます。" },
    "in-schedule": { col: "in", title: "スケジュール", sub: "決まった時間に",
      body: "「毎朝 9 時にリソースの状態を確認する」のように、時間をきっかけに動かすこともできます。障害が起きる前の予防に使います（LAB 04 で作ります）。" },
    "in-chat": { col: "in", title: "チャットでの質問", sub: "人から話しかける",
      body: "「この 1 時間で何が変わった？」「このサービスはなぜ遅い？」と普通の言葉で聞くと、根拠つきで答えてくれます。" },

    "do-collect": { col: "core", title: "① 情報を集める", sub: "",
      body: "メトリック、ログ、最近のデプロイ、過去の調査記録などを、設定された接続先から集めます。人がいくつもの画面を開いてやっていた作業です。" },
    "do-analyze": { col: "core", title: "② 原因を推測する", sub: "",
      body: "集めた情報を時系列で突き合わせて、「何がきっかけで、何が起きているのか」という仮説を立てます。根拠になったデータも一緒に示します。" },
    "do-act": { col: "core", title: "③ 対処を提案・実行する", sub: "",
      body: "再起動やロールバックなどの対処を提案します。実際に実行するかどうかは、" + T("runmode", "実行モード") + "と権限の設定で決まります（LAB 03）。" },
    "do-record": { col: "core", title: "④ 記録・共有する", sub: "",
      body: "調べた内容とやったことをチケットやチャットに残します。次に似た障害が起きたとき、この記録が手がかりとして再利用されます。" },

    "src-mon": { col: "src", title: "Application Insights / Log Analytics", sub: "アプリの状態とログ",
      body: T("appinsights", "Application Insights") + " で応答時間やエラーを、" + T("loganalytics", "Log Analytics") + " でログを調べます。必要に応じて " + T("kql", "KQL") + " というクエリを自分で書いて実行します。" },
    "src-git": { col: "src", title: "GitHub / Azure DevOps", sub: "コードとデプロイ履歴",
      body: "「障害の少し前に何がデプロイされたか」を確認できます。原因のコミットを特定したり、修正のための Issue や作業項目を作ったりします。" },
    "src-res": { col: "src", title: "Azure リソース", sub: "App Service, AKS など",
      body: "許可された範囲で、リソースの設定を読んだり、再起動・スケール変更などの操作をしたりします。操作は Azure の " + T("rbac", "RBAC") + " による権限の中でだけ行われます。" },
    "src-notify": { col: "src", title: "Teams / Outlook", sub: "人への連絡",
      body: "調査の結果や承認のお願いを、チームのチャンネルやメールで知らせます。" },
    "src-mcp": { col: "src", title: "MCP サーバー", sub: "Azure 以外のツール",
      body: "Datadog や Splunk など、Azure 以外の監視ツールも " + T("mcp", "MCP") + " という共通の規格でつなげられます（LAB 05）。" }
  };

  function node(id) {
    var n = NODES[id];
    return '<button type="button" class="flow-node" data-node="' + id + '" aria-pressed="false">' + n.title + (n.sub ? "<small>" + n.sub + "</small>" : "") + "</button>";
  }

  var QUESTION = {
    id: "lab1-q1",
    text: "SRE Agent が「再起動」などの対処を、人の確認なしに実行するかどうかは、何で決まるでしょう？",
    options: [
      "SRE Agent が自分で判断するので、人は決められない",
      "実行モードの設定と、SRE Agent に与えた権限",
      "アラートの重要度（Sev）が高いと必ず自動で実行される"
    ],
    answer: 1,
    explain: "実行モード（Review / Autonomous）と権限の両方がそろって、はじめて操作できます。どこまで任せるかは人が決めます。詳しくは LAB 03 で試せます。",
    hints: {
      0: "SRE Agent が何をしてよいかは、使う人の設定で決まります。勝手に何でもできるわけではありません。",
      2: "重要度は「どのインシデントを担当させるか」の条件には使えますが、実行するかどうかを直接決めるものではありません。"
    }
  };

  Lab.register("lab1", function (root) {
    root.innerHTML =
      Lab.pageHead("lab1", "SRE Agent は、障害対応のときに人がやっている「調べる・考える・直す・記録する」を手伝ってくれる Azure のサービスです。まずは手作業の場合と比べてみます。") +

      "<h2>夜中にアラートが鳴ったら</h2>" +
      "<p>Web サイトの応答が遅くなって" + T("alert", "アラート") + "が飛んできた場面を考えます。担当者がやることを並べると、こうなります。</p>" +
      '<div class="compare">' +
      '<div class="compare__col"><h3>人が対応する場合</h3><ol>' +
      '<li>通知を見て、どのサービスか確認する<span class="screen-chip">[通知]</span></li>' +
      '<li>監視ダッシュボードでグラフを見る<span class="screen-chip">[ポータル]</span></li>' +
      '<li>ログを検索して、エラーを探す<span class="screen-chip">[ログ]</span></li>' +
      '<li>最近デプロイされた変更を確認する<span class="screen-chip">[GitHub]</span></li>' +
      '<li>手順書を見て、再起動などの対処をする<span class="screen-chip">[手順書]</span></li>' +
      '<li>やったことをチケットに書く<span class="screen-chip">[チケット]</span></li>' +
      "</ol><p style=\"margin:10px 0 0;font-size:.88rem;color:var(--ink-2)\">6 つの画面を行き来しながら、頭の中で情報をつなぎ合わせます。</p></div>" +
      '<div class="compare__col"><h3>SRE Agent がいる場合</h3><ol>' +
      "<li>アラートを受けて、SRE Agent が調査を始める</li>" +
      "<li>グラフ・ログ・デプロイ履歴をまとめて調べる</li>" +
      "<li>原因の候補と根拠を 1 つのスレッドにまとめる</li>" +
      "<li>対処を提案する（設定によっては実行まで）</li>" +
      "<li>人は内容を確認して、承認するかどうかを決める</li>" +
      "<li>経過はそのままチケットに残る</li>" +
      "</ol><p style=\"margin:10px 0 0;font-size:.88rem;color:var(--ink-2)\">人は「集める」より「判断する」ことに時間を使えます。</p></div>" +
      "</div>" +
      '<div class="note note--warn"><span class="note__title">誤解しやすいところ</span>SRE Agent は人の代わりに全部を決めるものではありません。どこまで任せるか（提案だけか、実行までか）は人が設定します。</div>' +

      "<h2>全体図を見てみる</h2>" +
      "<p>SRE Agent は、何かを<strong>きっかけ</strong>に動き出し、いろいろな<strong>つなぎ先</strong>から情報を集めて仕事をします。箱をクリックすると説明が出ます。</p>" +
      '<div class="flow-map">' +
      '<div class="flow-col"><div class="flow-col__label">きっかけ</div>' + node("in-alert") + node("in-pd") + node("in-schedule") + node("in-chat") + "</div>" +
      '<div class="flow-core"><div class="flow-core__title">SRE Agent がやること</div>' + node("do-collect") + node("do-analyze") + node("do-act") + node("do-record") + "</div>" +
      '<div class="flow-col"><div class="flow-col__label">つなぎ先</div>' + node("src-mon") + node("src-git") + node("src-res") + node("src-notify") + node("src-mcp") + "</div>" +
      "</div>" +
      '<div class="box flow-detail" aria-live="polite" data-detail><p style="color:var(--ink-3);margin:0">上の図の箱をどれか選んでください。</p></div>' +

      "<h2>主な使い方は 3 つ</h2>" +
      '<div class="table-wrap"><table class="plain"><thead><tr><th style="width:28%">使い方</th><th>どんなときに</th><th style="width:22%">このラボでは</th></tr></thead><tbody>' +
      "<tr><td><strong>インシデントへの自動対応</strong></td><td>アラートやチケットを受け取ったら、調査・原因の推測・対処の提案までを進める</td><td>LAB 02</td></tr>" +
      "<tr><td><strong>定期的な作業</strong></td><td>毎朝の健康チェック、週次のコスト確認など、決まった時間の作業を任せる</td><td>LAB 04</td></tr>" +
      "<tr><td><strong>質問して調べる</strong></td><td>「何が変わった？」「なぜ遅い？」と普通の言葉で聞いて、根拠つきの答えをもらう</td><td>LAB 01（この図）</td></tr>" +
      "</tbody></table></div>" +

      "<h2>課題</h2>" +
      Lab.questionHtml(QUESTION) +
      Lab.completeBar("lab1", "次は、実際に障害対応を体験してみましょう。") +
      Lab.pageNav("lab1");

    var detail = root.querySelector("[data-detail]");
    root.querySelector(".flow-map").addEventListener("click", function (e) {
      var btn = e.target.closest(".flow-node");
      if (!btn) return;
      var n = NODES[btn.getAttribute("data-node")];
      root.querySelectorAll(".flow-node").forEach(function (b) { b.setAttribute("aria-pressed", b === btn ? "true" : "false"); });
      var where = { in: "きっかけ", core: "SRE Agent がやること", src: "つなぎ先" }[n.col];
      detail.innerHTML = '<span class="explain__label">' + where + "</span><h3 style=\"margin:0 0 6px\">" + n.title + "</h3><p>" + n.body + "</p>";
    });

    Lab.bindQuestions(root, [QUESTION], function () {
      Lab.complete("lab1");
      Lab.refreshCompleteBar(root, "lab1", "次は、実際に障害対応を体験してみましょう。");
    });
  });
})();
