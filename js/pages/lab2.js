/*
 * LAB 02 障害対応を体験する
 * 架空の EC サイト「contoso-shop」で、デプロイ後にメモリが増え続けて遅くなる障害を題材にしています。
 */
(function () {
  "use strict";
  var Lab = window.Lab;
  var T = Lab.term;
  var esc = Lab.esc;

  /* ---------------- 模擬データ ---------------- */

  // 18:00 から 22:30 まで 10 分おき（28 点）。index 19 = 21:10 までが「障害発生時点で見えている範囲」
  var LABELS = [];
  for (var m = 18 * 60; m <= 22 * 60 + 30; m += 10) {
    LABELS.push(Math.floor(m / 60) + ":" + ("0" + (m % 60)).slice(-2));
  }
  var NOW = 19;      // 21:10
  var CHECK = 23;    // 21:50 再確認

  var MEM_BEFORE = [46, 45, 47, 46, 45, 46, 47, 46, 45, 46, 47, 46, 45, 46, 52, 58, 65, 72, 80, 86];
  var RES_BEFORE = [310, 320, 300, 330, 315, 305, 320, 310, 325, 300, 315, 330, 310, 320, 330, 350, 520, 1100, 3400, 4200];

  var AFTER = {
    rollback: { mem: [84, 47, 46, 45, 47, 46, 46, 45], res: [3900, 380, 330, 320, 310, 325, 315, 320] },
    restart:  { mem: [84, 40, 47, 54, 61, 68, 75, 82], res: [3900, 340, 330, 360, 450, 700, 1500, 3100] },
    scale:    { mem: [84, 62, 66, 70, 74, 78, 82, 86], res: [3900, 900, 820, 850, 1100, 1600, 2400, 3300] },
    deny:     { mem: [90, 94, 97, 98, 98, 98, 98, 98], res: [5200, 7000, 7600, 7800, 7900, 8000, 8000, 8000] }
  };

  var ACTIONS = {
    rollback: {
      key: "A", title: "1 つ前のバージョン（v2.7.3）に戻す", recommend: true,
      desc: "原因と考えられる変更を取り除くので、再発しにくい方法です。staging スロットに残っている v2.7.3 と入れ替える（スワップ）ので、切り替えは 1 分ほどで終わります。v2.8.0 に入っていたほかの変更も一緒に戻る点には注意が必要です。",
      op: "デプロイスロットのスワップ（staging → production）",
      cmd: '<span class="k">az</span> webapp deployment slot swap \\\n  --resource-group <span class="s">rg-contoso-prod</span> \\\n  --name <span class="s">app-contoso-shop-prod</span> \\\n  --slot <span class="s">staging</span> --target-slot <span class="s">production</span>'
    },
    restart: {
      key: "B", title: "App Service を再起動する",
      desc: "たまったメモリが解放されるので、すぐに速くなります。ただし原因のコードは残るため、同じペースでメモリが増えて、1 時間ほどで元の状態に戻る見込みです。再起動中は 30〜60 秒ほど応答が途切れます。",
      op: "App Service の再起動",
      cmd: '<span class="k">az</span> webapp restart \\\n  --resource-group <span class="s">rg-contoso-prod</span> \\\n  --name <span class="s">app-contoso-shop-prod</span>'
    },
    scale: {
      key: "C", title: "インスタンスを 2 台から 4 台に増やす（スケールアウト）",
      desc: "負荷が分散されるので応答は改善します。ただし 1 台ずつのメモリは増え続けるため、時間稼ぎにしかなりません。台数が増えた分、料金も上がります。",
      op: "App Service プランのインスタンス数を 4 に変更",
      cmd: '<span class="k">az</span> appservice plan update \\\n  --resource-group <span class="s">rg-contoso-prod</span> \\\n  --name <span class="s">plan-contoso-prod</span> \\\n  --number-of-workers <span class="s">4</span>'
    }
  };

  var KQL = [
    { code: "AppExceptions", text: "アプリで発生した例外（エラー）が記録されている表を使います。表の名前から書き始めるのが KQL の基本です。" },
    { code: "| where TimeGenerated > ago(2h)", text: "直近 2 時間の行だけに絞り込みます。ago(2h) は「今から 2 時間前」という意味です。" },
    { code: '| where AppRoleName == "app-contoso-shop-prod"', text: "対象のアプリだけに絞り込みます。同じワークスペースにほかのアプリのログも入っていることがあるためです。" },
    { code: "| summarize Count = count() by ExceptionType, bin(TimeGenerated, 20m)", text: "例外の種類ごと・20 分ごとに件数を数えます。bin() は時刻を 20 分単位の区切りにまとめる関数です。" },
    { code: "| order by TimeGenerated asc", text: "古い順に並べます。asc は昇順（小さい順）という意味です。" }
  ];

  /* ---------------- 各ステップの解説（右側） ---------------- */

  var EXPLAIN = {
    1: { title: "アラートが調査のきっかけになる",
      body: "<p>アラートが「" + T("responseplan", "インシデント対応プラン") + "」の条件に当てはまると、SRE Agent が担当になって調査を始めます。どのアラートを任せるかは、プランの条件（" + T("sev", "重要度") + "や対象のサービス）で決めます。</p>",
      human: "通知に気づいて、PC を開いて、ポータルにサインインして……と、調査を始めるまでに時間がかかります。" },
    2: { title: "「いつから」変わったかを見る",
      body: "<p>グラフを見るときは、値の大きさよりも<strong>いつから変わり始めたか</strong>に注目します。</p><p>アラートが鳴ったのは 21:04 ですが、メモリはその 40 分以上前から増え続けています。応答時間の悪化は「症状」で、メモリの増加はその手前で起きている「変化」です。</p>",
      human: "ダッシュボードを開いて、期間を変えながらグラフを見比べます。" },
    3: { title: "ログで裏付けを取る",
      body: "<p>SRE Agent は必要に応じて " + T("kql", "KQL") + " を自分で書いて " + T("loganalytics", "Log Analytics") + " を検索します。左のクエリは<strong>1 行ずつクリックすると意味が出ます</strong>。</p><p>コツは「以前から出ているエラー」と「新しく出始めたエラー」を分けることです。今回は OutOfMemoryException（メモリ不足）が 20:20 から急に出始めています。</p>",
      human: "どのテーブルを見ればいいか、クエリをどう書くかを調べながら検索します。慣れていないと時間がかかるところです。" },
    4: { title: "直前に何が変わったかを確かめる",
      body: "<p>障害の原因で多いのは「直前の変更」です。SRE Agent は GitHub や Azure DevOps につないでおくと、デプロイ履歴とコードの差分まで確認します。</p><p>ただし、時間が近いだけで決めつけることはしません。コードの中身を見て「メモリが増え続ける作りになっている」ことまで確かめています。</p>",
      human: "デプロイ履歴を開き、変更内容を一つずつ読みます。自分が書いていないコードだと特に大変です。" },
    5: { title: "仮説と根拠をセットで示す",
      body: "<p>まとめには、原因の候補だけでなく<strong>その根拠</strong>が並んでいます。根拠があるので、人は自分の目で確かめてから判断できます。</p><p>「可能性が高い」「完全には否定できていない」という言い方にも注目してください。断定しないことで、最終判断を人に残しています。</p>",
      human: "ここまでの情報を頭の中でつなぎ合わせて、チームに説明できる形にまとめます。" },
    6: null, // モードによって変える
    7: { title: "対処のあとも確認を続ける",
      body: "<p>対処して終わりではなく、時間をおいてもう一度メトリックを確認します。グラフの<strong>点線は「このままだとどうなるか」の見込み</strong>です。</p>",
      human: "対処のあと、しばらくダッシュボードを見張ります。" },
    8: { title: "記録が次の調査に生きる",
      body: "<p>調査の経過・原因・対処はチケットに残ります。SRE Agent は過去の調査から得た原因や解決手順を覚えておき、似た障害が起きたときの手がかりにします。</p><p>新しく当番に入った人でも、過去の経緯をふまえた状態から対応を始められます。</p>",
      human: "対応が終わったあと、記憶をたどりながら報告を書きます。夜中だと後回しになりがちです。" }
  };

  /* ---------------- 状態 ---------------- */

  var state;
  function freshState() { return { mode: null, step: 0, choice: null, decision: null }; }

  /* ---------------- 表示の部品 ---------------- */

  function entry(kind, time, who, body) {
    return '<div class="entry entry--' + kind + '"><div class="entry__meta"><span class="entry__time">' + time + '</span><span class="entry__who">' + who + "</span></div>" + body + "</div>";
  }

  function chartsBefore() {
    return (
      Lab.chart({ title: "メモリ使用率（平均）", unit: "%", labels: LABELS.slice(0, NOW + 1), values: MEM_BEFORE, max: 100,
        markers: [{ index: 13.2, label: "20:12 デプロイ" }, { index: 18.4, label: "21:04 アラート" }] }) +
      Lab.chart({ title: "応答時間（p95）", unit: "ミリ秒", labels: LABELS.slice(0, NOW + 1), values: RES_BEFORE, max: 5000,
        threshold: 3000, thresholdLabel: "アラート条件 3 秒", color: "var(--chart-2)",
        markers: [{ index: 13.2, label: "20:12 デプロイ" }] })
    );
  }

  function chartsAfter(outcome) {
    var a = AFTER[outcome];
    var mem = MEM_BEFORE.concat(a.mem);
    var res = RES_BEFORE.concat(a.res);
    function solid(arr) { return arr.map(function (v, i) { return i <= CHECK ? v : null; }); }
    function dashed(arr) { return arr.map(function (v, i) { return i >= CHECK ? v : null; }); }
    var markerLabel = outcome === "deny" ? "21:09 拒否" : "21:09 対処";
    return (
      Lab.chart({ title: "メモリ使用率（平均）", unit: "%", labels: LABELS, values: solid(mem), future: dashed(mem), max: 100,
        markers: [{ index: 19.9, label: markerLabel }, { index: CHECK, label: "21:50 再確認" }] }) +
      Lab.chart({ title: "応答時間（p95）", unit: "ミリ秒", labels: LABELS, values: solid(res), future: dashed(res), max: 8000,
        threshold: 3000, thresholdLabel: "アラート条件 3 秒", color: "var(--chart-2)",
        markers: [{ index: 19.9, label: markerLabel }] })
    );
  }

  function kqlBlock() {
    return (
      '<div class="console" style="white-space:normal">' +
      KQL.map(function (l, i) { return '<button type="button" class="kql-line" data-kql="' + i + '" aria-pressed="false">' + esc(l.code) + "</button>"; }).join("") +
      "</div>" +
      '<div class="kql-explain" data-kql-explain aria-live="polite"><span style="color:var(--ink-3)">クエリの行をクリックすると、ここに意味が出ます。</span></div>'
    );
  }

  function exceptionTable() {
    var rows = [
      ["19:20", "System.Net.Http.HttpRequestException", 2, false],
      ["20:00", "System.Net.Http.HttpRequestException", 1, false],
      ["20:20", "System.OutOfMemoryException", 3, true],
      ["20:40", "System.OutOfMemoryException", 27, true],
      ["20:40", "System.Threading.Tasks.TaskCanceledException", 41, false],
      ["21:00", "System.OutOfMemoryException", 118, true],
      ["21:00", "System.Threading.Tasks.TaskCanceledException", 236, false]
    ];
    return (
      '<div class="table-wrap" style="margin:0"><table class="mini-table"><thead><tr><th>TimeGenerated</th><th>ExceptionType</th><th style="text-align:right">Count</th></tr></thead><tbody>' +
      rows.map(function (r) {
        return "<tr" + (r[3] ? ' class="hl"' : "") + "><td>" + r[0] + "</td><td>" + r[1] + '</td><td class="num">' + r[2] + "</td></tr>";
      }).join("") +
      "</tbody></table></div>"
    );
  }

  var DIFF =
    '<span class="d">src/Services/ThumbnailService.cs</span>\n' +
    '<span class="add">+ private static readonly Dictionary&lt;string, byte[]&gt; _cache = new();</span>\n' +
    "\n" +
    "  public byte[] GetThumbnail(string productId)\n" +
    "  {\n" +
    '<span class="add">+     if (_cache.TryGetValue(productId, out var cached)) return cached;</span>\n' +
    "      var image = _storage.Load(productId);\n" +
    '<span class="del">-     return Resize(image, 320);</span>\n' +
    '<span class="add">+     var thumb = Resize(image, 320);</span>\n' +
    '<span class="add">+     _cache[productId] = thumb;</span>\n' +
    '<span class="add">+     return thumb;</span>\n' +
    "  }";

  /* ---------------- スレッド（左側）の中身 ---------------- */

  function entriesForStep(step) {
    var AG = "SRE Agent";
    switch (step) {
      case 1:
        return [
          entry("alert", "21:04:00", "Azure Monitor",
            "<p><strong>アラートが発生しました</strong></p>" +
            '<dl class="kv"><dt>アラートルール</dt><dd>contoso-shop 応答時間 (p95) &gt; 3 秒</dd>' +
            "<dt>重要度</dt><dd>Sev2</dd>" +
            "<dt>対象</dt><dd>app-contoso-shop-prod（App Service / Japan East）</dd>" +
            "<dt>現在の値</dt><dd>3.4 秒</dd></dl>"),
          entry("agent", "21:04:12", AG,
            "<p>インシデント対応プラン「本番 Web アプリの障害対応」の条件に一致したので、調査を始めます。まず直近 3 時間のメトリックを確認します。</p>")
        ];
      case 2:
        return [
          entry("tool", "21:04:31", "ツール実行：Azure Monitor メトリックの取得", chartsBefore()),
          entry("agent", "21:04:40", AG,
            "<p>メモリ使用率が <strong>20:20 ごろから一定のペースで上がり続けています</strong>。応答時間が悪くなったのは 20:50 以降で、メモリが 70% を超えたあたりからです。</p>" +
            "<p>メモリの増加のほうが先に始まっているので、これを主な手がかりにして、次はエラーログを確認します。</p>")
        ];
      case 3:
        return [
          entry("tool", "21:05:31", "ツール実行：Log Analytics クエリ", kqlBlock() + exceptionTable()),
          entry("agent", "21:05:44", AG,
            "<ul>" +
            "<li><strong>OutOfMemoryException</strong>（メモリ不足）が 20:20 から新しく出始め、急に増えています。</li>" +
            "<li>TaskCanceledException は処理のタイムアウトで、応答が遅くなった<em>結果</em>として出ていると考えられます。</li>" +
            "<li>HttpRequestException は以前から少しずつ出ているもので、今回とは関係が薄そうです。</li>" +
            "</ul><p>20:20 の少し前に何か変わっていないか、デプロイ履歴を確認します。</p>")
        ];
      case 4:
        return [
          entry("tool", "21:06:02", "ツール実行：GitHub デプロイ履歴の取得",
            '<div class="table-wrap" style="margin:0"><table class="mini-table"><thead><tr><th>日時</th><th>バージョン</th><th>内容</th></tr></thead><tbody>' +
            '<tr class="hl"><td>10/03 20:12</td><td>v2.8.0</td><td>#412 商品サムネイルをメモリにキャッシュして表示を速くする</td></tr>' +
            "<tr><td>10/02 18:30</td><td>v2.7.3</td><td>#405 注文確認メールの文面を修正</td></tr>" +
            "<tr><td>09/30 11:05</td><td>v2.7.2</td><td>#401 ライブラリの更新</td></tr>" +
            "</tbody></table></div>" +
            '<div class="console">' + DIFF + "</div>"),
          entry("agent", "21:06:45", AG,
            "<p>メモリの増加が始まる <strong>約 8 分前</strong>に v2.8.0 がデプロイされています。</p>" +
            "<p>この変更では、サムネイル画像を static な Dictionary にため続けていますが、<strong>件数の上限も、古いものを消す処理もありません</strong>。見られた商品の数だけメモリが増え続ける作りです。</p>")
        ];
      case 5:
        return [
          entry("agent", "21:07:10", AG,
            "<p><strong>調査のまとめ</strong></p>" +
            '<dl class="kv" style="font-family:inherit">' +
            "<dt>起きていること</dt><dd style=\"font-family:inherit\">app-contoso-shop-prod のメモリ使用率が上がり続け、応答時間が 3 秒を超えている</dd>" +
            "<dt>原因の可能性が高いもの</dt><dd style=\"font-family:inherit\">20:12 にデプロイされた v2.8.0 のサムネイルキャッシュ。上限なしでメモリにため続けている</dd>" +
            "<dt>確からしさ</dt><dd style=\"font-family:inherit\">高い。ただし、ほかの要因を完全には否定できていません</dd></dl>" +
            "<p style=\"margin-top:8px\"><strong>根拠</strong></p><ol>" +
            "<li>メモリ増加の始まり（20:20）が、デプロイ（20:12）の直後</li>" +
            "<li>20:20 以降、それまでなかった OutOfMemoryException が発生</li>" +
            "<li>変更されたコードに、キャッシュを消す処理がない</li></ol>")
        ];
      case 6:
        return entriesForActions();
      case 7:
        return entriesForResult();
      case 8:
        return entriesForRecord();
    }
    return [];
  }

  function actionCards(interactive) {
    return (
      '<div class="choice-grid" role="group" aria-label="対処の候補">' +
      Object.keys(ACTIONS).map(function (k) {
        var a = ACTIONS[k];
        var pressed = state.choice === k;
        return (
          '<button type="button" class="choice" data-action="' + k + '" aria-pressed="' + pressed + '"' + (interactive ? "" : " disabled") + ">" +
          '<span class="choice__title">' + a.key + ". " + a.title + (a.recommend ? ' <span class="tag tag--accent">おすすめ</span>' : "") + "</span>" +
          '<span class="choice__desc">' + a.desc + "</span></button>"
        );
      }).join("") +
      "</div>"
    );
  }

  function entriesForActions() {
    var list = [];
    var waiting = state.mode === "review" && !state.decision;
    var intro = "<p>まずは利用者への影響を早く止めることを優先して、次の 3 つを候補に挙げます。おすすめは A です。</p>";

    if (state.mode === "autonomous") {
      list.push(entry("agent", "21:07:30", "SRE Agent", intro + actionCards(false)));
      list.push(entry("tool", "21:07:31", "ツール実行：" + ACTIONS.rollback.op + "（自動実行）",
        '<div class="console">' + ACTIONS.rollback.cmd + "</div>"));
      list.push(entry("agent", "21:08:40", "SRE Agent",
        "<p>Autonomous モードの設定に従い、承認を待たずに <strong>A. v2.7.3 へのロールバック</strong>を実行しました。切り替えは完了しています。20 分後にもう一度状態を確認します。</p>"));
      return list;
    }

    var approval = "";
    if (waiting) {
      approval = state.choice
        ? '<div class="approval" role="group" aria-label="承認">' +
          '<div class="approval__title">承認が必要な操作です</div>' +
          '<dl class="kv"><dt>操作</dt><dd>' + ACTIONS[state.choice].op + "</dd><dt>対象</dt><dd>app-contoso-shop-prod</dd></dl>" +
          '<p style="font-size:.88rem;margin:6px 0 0">Azure リソースを変更する操作なので、Review モードでは承認を待っています。承認できるのは ' + T("sreadmin", "SRE Agent 管理者") + " だけです。このラボでは、あなたが管理者という想定です。</p>" +
          '<div class="btn-row" style="margin-bottom:0"><button type="button" class="btn btn--ok" data-decide="approve">承認する</button><button type="button" class="btn btn--bad" data-decide="deny">拒否する</button></div>' +
          "</div>"
        : '<p style="font-size:.88rem;color:var(--ink-2);margin:8px 0 0">候補をどれか選ぶと、承認の画面が出ます。</p>';
    }
    list.push(entry("agent", "21:07:30", "SRE Agent", intro + actionCards(waiting) + approval));

    if (state.decision === "approve") {
      var a = ACTIONS[state.choice];
      list.push(entry("human", "21:09:02", "あなた（SRE Agent 管理者）", "<p>「" + a.key + ". " + a.title + "」を<strong>承認</strong>しました。</p>"));
      list.push(entry("tool", "21:09:05", "ツール実行：" + a.op, '<div class="console">' + a.cmd + "</div>"));
      list.push(entry("agent", "21:09:58", "SRE Agent", "<p>操作が完了しました。20 分後にもう一度状態を確認します。</p>"));
    } else if (state.decision === "deny") {
      list.push(entry("human", "21:09:02", "あなた（SRE Agent 管理者）", "<p>提案された操作を<strong>拒否</strong>しました。</p>"));
      list.push(entry("agent", "21:09:10", "SRE Agent", "<p>操作は実行していません。調査結果をチケットに残し、当番の担当者に判断をお願いする連絡を送りました。20 分後にもう一度状態を確認します。</p>"));
    }
    return list;
  }

  function outcome() {
    if (state.mode === "autonomous") return "rollback";
    if (state.decision === "deny") return "deny";
    return state.choice;
  }

  var RESULT_TEXT = {
    rollback: "<p>メモリ使用率は 46%、応答時間（p95）は 0.32 秒に戻り、その後も安定しています。OutOfMemoryException も 21:20 以降は出ていません。</p><p>原因のコードは v2.8.0 に残っているので、修正のための Issue を作ります。</p>",
    restart: "<p>再起動の直後は回復しましたが、<strong>メモリ使用率がまた上がり始めています</strong>（21:50 時点で 54%）。このペースだと 22:30 ごろに再びアラート条件を超える見込みです。</p><p>根本的に直すには、ロールバックかコードの修正が必要です。</p>",
    scale: "<p>応答時間は 0.85 秒まで改善しましたが、<strong>メモリ使用率は全インスタンスで上がり続けています</strong>。時間稼ぎにはなりますが、原因は残ったままです。インスタンスが増えた分、料金も上がっています。</p>",
    deny: "<p>操作をしていないため、状態は悪くなっています。メモリ使用率は 97% に達し、一部のリクエストで <strong>503 エラー</strong>が出始めました。担当者の判断を待っています。</p>"
  };

  var RESULT_EXPLAIN = {
    rollback: "原因と考えられる変更そのものを取り除いたので、時間がたっても元に戻りません。緩和策としていちばん確実な選択でした。",
    restart: "再起動はたまったメモリを空にするだけで、メモリを増やし続けるコードはそのままです。症状は一度消えますが、同じことがくり返されます。「とりあえず再起動」が効かない典型的な例です。",
    scale: "台数を増やすと 1 台あたりの負荷は減りますが、メモリが増え続ける原因には手を付けていません。しかもコストが増えます。",
    deny: "拒否が正しい場面もあります（提案に納得できないとき、営業時間中で影響が大きいときなど）。ただし、その場合は人が代わりの対処を急ぐ必要があります。"
  };

  function entriesForResult() {
    var o = outcome();
    return [
      entry("tool", "21:50:00", "ツール実行：Azure Monitor メトリックの取得", chartsAfter(o)),
      entry("agent", "21:50:12", "SRE Agent", RESULT_TEXT[o])
    ];
  }

  function entriesForRecord() {
    var o = outcome();
    var status = { rollback: ["緩和済み", "ok"], restart: ["監視中（再発の見込みあり）", "warn"], scale: ["監視中（原因未対処）", "warn"], deny: ["対応中（担当者の判断待ち）", "bad"] }[o];
    var actionLine = o === "deny" ? "なし（提案した操作は拒否されました）" :
      (state.mode === "autonomous" ? "v2.7.3 へのロールバック（Autonomous モードで自動実行）" : ACTIONS[state.choice].title + "（SRE Agent 管理者が承認）");

    var ticket =
      '<div class="ticket"><div class="ticket__head"><strong>contoso-shop の応答時間が悪化</strong><span><span class="ticket__id">INC-2048</span> <span class="tag tag--' + status[1] + '">' + status[0] + "</span></span></div>" +
      '<div class="ticket__body">' +
      "<h4>経過</h4><ul>" +
      "<li>21:04 アラート発生（Sev2）。SRE Agent が調査を開始</li>" +
      "<li>21:07 原因の候補を特定：v2.8.0 のサムネイルキャッシュ</li>" +
      "<li>21:09 対処：" + actionLine + "</li>" +
      "<li>21:50 再確認：" + { rollback: "正常に戻ったことを確認", restart: "メモリが再び増加中", scale: "応答は改善、メモリは増加中", deny: "悪化、503 エラー発生" }[o] + "</li>" +
      "</ul>" +
      "<h4>原因</h4><p>v2.8.0（#412）で追加されたサムネイルキャッシュに件数の上限がなく、メモリを使い続けていた。</p>" +
      "<h4>次にやること</h4><ul>" +
      "<li>GitHub Issue #418「サムネイルキャッシュに件数の上限と有効期限を設ける」（SRE Agent が作成済み）</li>" +
      (o !== "rollback" ? "<li>根本的な対処（ロールバックまたは修正版のデプロイ）を早めに行う</li>" : "") +
      "</ul></div></div>";

    return [
      entry("agent", "21:51:30", "SRE Agent",
        "<p>インシデントチケットを更新し、チームの Teams チャンネルに要約を送りました。</p>" + ticket)
    ];
  }

  /* ---------------- 画面の組み立て ---------------- */

  var root, prevEntryCount = 0;

  function explainFor(step) {
    if (step === 6) {
      if (state.mode === "autonomous") {
        return { title: "Autonomous モードでは、ここで止まらない",
          body: "<p>Autonomous モードなので、SRE Agent はおすすめの対処を<strong>人の確認なしに実行</strong>しました。夜中でもすぐに影響を止められるのが利点です。</p><p>その代わり、どの操作をしてよいかを事前にしっかり決めておく必要があります。本番環境では、まず Review モードで提案の質を見てから切り替えるのがおすすめです。</p>",
          human: "手順書を確認し、上長に連絡して、操作の許可をもらってから実行します。" };
      }
      return { title: "最後に決めるのは人",
        body: "<p>Review モードなので、SRE Agent は Azure を変更する前に<strong>承認を待っています</strong>。候補を見比べて、どれかを選んで承認するか、拒否してください。</p><p>おすすめ以外を選んでも大丈夫です。あとで別の対処を選び直して、結果を比べられます。</p>",
        human: "手順書を確認し、どの対処がよいかを自分で判断して実行します。" };
    }
    if (step === 7) {
      var e = EXPLAIN[7];
      return { title: e.title, body: e.body + "<p>" + RESULT_EXPLAIN[outcome()] + "</p>", human: e.human };
    }
    return EXPLAIN[step];
  }

  function explainHtml(step) {
    var e = explainFor(step);
    if (!e) return "";
    return (
      '<span class="explain__label">いま起きていること</span>' +
      "<h3>" + e.title + "</h3>" + e.body +
      (e.human ? '<div class="note" style="margin:12px 0 0;font-size:.9rem"><span class="note__title">人が手作業でやる場合</span>' + e.human + "</div>" : "")
    );
  }

  function canGoNext() {
    if (state.step >= 8) return false;
    if (state.step === 6 && state.mode === "review" && !state.decision) return false;
    return true;
  }

  function nextLabel() {
    return ["", "メトリックを調べる", "ログを調べる", "変更履歴を調べる", "調査をまとめる", "対処を考える", "結果を確認する", "記録を見る", ""][state.step] || "次へ";
  }

  var REFLECT = {
    id: "lab2-q1",
    text: "今回、原因を絞り込むうえで決め手になったのはどれでしょう？",
    options: [
      "アラートの発生時刻と重要度（Sev2）",
      "メモリが増え始めた時刻とデプロイの時刻が近いこと、そしてコードの中身",
      "TaskCanceledException がたくさん出ていたこと"
    ],
    answer: 1,
    explain: "「直前の変更」と「変化が始まった時刻」を突き合わせ、さらにコードで裏付けを取ったことで、原因を絞り込めました。SRE Agent はこの突き合わせを、複数のツールをまたいで自動で行います。",
    hints: {
      0: "アラートの時刻は「症状が目立った時刻」です。変化そのものは、もっと前から始まっていました。",
      2: "TaskCanceledException は応答が遅くなった結果として出ていたものでした。原因ではなく症状のほうです。"
    }
  };

  function renderSetup() {
    root.innerHTML =
      Lab.pageHead("lab2", "架空の EC サイト「contoso-shop」で障害が起きました。SRE Agent がどう調べて、どう直すのかを、一歩ずつ進めながら見ていきます。") +
      "<h2>今回の状況</h2>" +
      '<div class="box">' +
      '<dl class="kv" style="font-family:inherit">' +
      "<dt>サービス</dt><dd style=\"font-family:inherit\">contoso-shop（EC サイト。" + T("appservice", "App Service") + " で動いている）</dd>" +
      "<dt>リソース</dt><dd>app-contoso-shop-prod / rg-contoso-prod</dd>" +
      "<dt>時刻</dt><dd style=\"font-family:inherit\">土曜日の 21:04。担当者は自宅にいる</dd>" +
      "<dt>起きたこと</dt><dd style=\"font-family:inherit\">サイトの表示が遅いというアラートが鳴った</dd>" +
      "</dl></div>" +
      "<h2>はじめに、実行モードを選ぶ</h2>" +
      "<p>この障害に対応する" + T("responseplan", "インシデント対応プラン") + "の" + T("runmode", "実行モード") + "を選んでください。迷ったら Review がおすすめです。終わったあとで、もう一方のモードも試せます。</p>" +
      '<div class="choice-grid">' +
      '<button type="button" class="choice" data-mode="review"><span class="choice__title">Review モード <span class="tag tag--accent">おすすめ</span></span>' +
      '<span class="choice__desc">SRE Agent が調べて対処を提案し、Azure を変更する前にあなたの承認を待ちます。本番環境向けです。</span></button>' +
      '<button type="button" class="choice" data-mode="autonomous"><span class="choice__title">Autonomous モード</span>' +
      '<span class="choice__desc">SRE Agent が調べて、おすすめの対処をそのまま実行し、あとで報告します。検証環境や、任せても安心な定型作業向けです。</span></button>' +
      "</div>" +
      Lab.completeBar("lab2", "最後のふりかえりの問題に答えると完了になります。") +
      Lab.pageNav("lab2");
  }

  function renderSim() {
    var all = [];
    for (var s = 1; s <= state.step; s++) all = all.concat(entriesForStep(s));
    var html = all.map(function (h, i) {
      return i >= prevEntryCount ? h.replace('class="entry ', 'class="entry is-new ') : h;
    }).join("");
    var firstNew = prevEntryCount;
    prevEntryCount = all.length;

    var dots = "";
    for (var d = 1; d <= 8; d++) dots += '<span class="' + (d < state.step ? "is-done" : d === state.step ? "is-now" : "") + '"></span>';

    var modeTag = state.mode === "review" ? '<span class="tag tag--accent">Review モード</span>' : '<span class="tag tag--warn">Autonomous モード</span>';

    var footer = "";
    if (canGoNext()) {
      footer = '<div class="btn-row" style="margin:0"><button type="button" class="btn btn--primary" data-next>' + nextLabel() + "</button></div>";
    } else if (state.step === 6) {
      footer = '<p style="margin:0;font-size:.9rem;color:var(--ink-2)">上の候補から対処を選んで、承認するか拒否してください。</p>';
    } else if (state.step === 8) {
      footer =
        '<div class="btn-row" style="margin:0">' +
        (state.mode === "review" ? '<button type="button" class="btn" data-retry-action>別の対処を選び直す</button>' : "") +
        '<button type="button" class="btn" data-restart>' + (state.mode === "review" ? "Autonomous モードで最初から" : "Review モードで最初から") + "</button>" +
        "</div>";
    }

    root.innerHTML =
      Lab.pageHead("lab2") +
      '<div class="sim">' +
      '<section class="thread" aria-label="インシデントのスレッド">' +
      '<div class="thread__head"><strong>INC-2048 contoso-shop の応答時間が悪化</strong><span>' + modeTag + "</span></div>" +
      '<div class="thread__body" aria-live="polite">' + html + "</div>" +
      '<div class="entry" style="background:var(--surface-2)">' + footer +
      '<div class="explain explain--inline box" style="margin:14px 0 0">' + explainHtml(state.step) + "</div>" +
      "</div>" +
      "</section>" +
      '<aside class="sim__aside">' +
      '<div class="box"><span class="explain__label">進み具合 ' + state.step + " / 8</span>" + '<div class="step-dots">' + dots + "</div></div>" +
      '<div class="box explain">' + explainHtml(state.step) + "</div>" +
      "</aside>" +
      "</div>" +
      (state.step === 8
        ? "<h2>ふりかえり</h2>" + Lab.questionHtml(REFLECT) + Lab.completeBar("lab2", "LAB 03 では、Review と Autonomous の違いをもう少し詳しく見ます。")
        : "") +
      Lab.pageNav("lab2");

    // 新しく増えたエントリーが見えるようにスクロール
    var entries = root.querySelectorAll(".thread__body .entry");
    if (entries[firstNew] && firstNew > 0) {
      entries[firstNew].scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
    }
  }

  function render() {
    if (!state.mode) renderSetup(); else renderSim();
  }

  Lab.register("lab2", function (r) {
    root = r;
    state = freshState();
    prevEntryCount = 0;
    render();

    root.addEventListener("click", function (e) {
      var t = e.target;
      var el;

      if ((el = t.closest("[data-mode]"))) {
        state.mode = el.getAttribute("data-mode");
        state.step = 1;
        prevEntryCount = 0;
        render();
        window.scrollTo(0, 0);
        return;
      }
      if (t.closest("[data-next]")) {
        if (canGoNext()) { state.step++; render(); }
        return;
      }
      if ((el = t.closest("[data-action]")) && !el.disabled) {
        state.choice = el.getAttribute("data-action");
        prevEntryCount = Math.min(prevEntryCount, countEntriesBefore(6));
        render();
        return;
      }
      if ((el = t.closest("[data-decide]"))) {
        state.decision = el.getAttribute("data-decide");
        render();
        return;
      }
      if (t.closest("[data-retry-action]")) {
        state.step = 6;
        state.choice = null;
        state.decision = null;
        prevEntryCount = countEntriesBefore(6);
        render();
        return;
      }
      if (t.closest("[data-restart]")) {
        var other = state.mode === "review" ? "autonomous" : "review";
        state = freshState();
        state.mode = other;
        state.step = 1;
        prevEntryCount = 0;
        render();
        window.scrollTo(0, 0);
        return;
      }
      if ((el = t.closest(".kql-line"))) {
        var i = Number(el.getAttribute("data-kql"));
        el.closest(".console").querySelectorAll(".kql-line").forEach(function (b) { b.setAttribute("aria-pressed", b === el ? "true" : "false"); });
        el.closest(".entry").querySelector("[data-kql-explain]").innerHTML = "<code>" + esc(KQL[i].code) + "</code><br>" + KQL[i].text;
      }
    });

    Lab.bindQuestions(root, [REFLECT], function () {
      Lab.complete("lab2");
      Lab.refreshCompleteBar(root, "lab2", "LAB 03 では、Review と Autonomous の違いをもう少し詳しく見ます。");
    });
  });

  function countEntriesBefore(step) {
    var n = 0;
    for (var s = 1; s < step; s++) n += entriesForStep(s).length;
    return n;
  }
})();
