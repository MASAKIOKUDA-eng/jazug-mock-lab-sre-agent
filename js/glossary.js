/* 用語集：本文中の点線の言葉をクリックすると、ここの説明が小さく表示されます */
(function () {
  "use strict";
  var Lab = window.Lab;

  var TERMS = {
    sre: { name: "SRE（Site Reliability Engineering）", cat: "考え方",
      text: "サービスを止めずに動かし続けるための運用を、エンジニアリングで改善していく考え方・職種です。Google が広めました。手作業の繰り返しを減らすことを重視します。" },
    incident: { name: "インシデント", cat: "考え方",
      text: "サービスが遅い・使えないなど、利用者に影響が出ている（または出そうな）状態のこと。障害とほぼ同じ意味で使われます。" },
    alert: { name: "アラート", cat: "監視",
      text: "「応答時間が 3 秒を超えた」など、あらかじめ決めた条件を満たしたときに飛んでくる通知です。インシデント対応のきっかけになります。" },
    sev: { name: "重要度（Sev）", cat: "監視",
      text: "アラートやインシデントの深刻さ。Azure Monitor では Sev0（最も深刻）〜 Sev4（情報）の 5 段階です。数字が小さいほど深刻です。" },
    mttr: { name: "MTTR（平均復旧時間）", cat: "考え方",
      text: "障害が起きてから元に戻るまでにかかる時間の平均。短いほど良いとされます。SRE Agent はこの時間を縮めるための道具の一つです。" },
    rca: { name: "根本原因（RCA）", cat: "考え方",
      text: "障害を引き起こした本当の理由。「メモリ不足」は症状で、「キャッシュに上限がなかった」が根本原因、というように一段深く掘ります。RCA は Root Cause Analysis（根本原因分析）の略です。" },
    runbook: { name: "ランブック（手順書）", cat: "考え方",
      text: "「この症状が出たら、まずこれを確認して、次にこれを実行する」という対応手順をまとめたもの。SRE Agent にスキルとして渡すこともできます。" },
    mitigation: { name: "緩和策", cat: "考え方",
      text: "根本的に直す前に、まず利用者への影響を止めるための対処です。再起動やロールバックがよく使われます。" },
    rollback: { name: "ロールバック", cat: "Azure",
      text: "新しいバージョンに問題があったとき、一つ前の正常なバージョンに戻すこと。App Service ではデプロイスロットの入れ替え（スワップ）で行うことがあります。" },
    scaleout: { name: "スケールアウト", cat: "Azure",
      text: "サーバー（インスタンス）の台数を増やして負荷を分散すること。処理能力は上がりますが、その分コストもかかります。" },
    appservice: { name: "Azure App Service", cat: "Azure",
      text: "Web アプリを動かすための Azure のサービス。サーバーの管理を Azure に任せて、アプリの中身に集中できます。" },
    slot: { name: "デプロイスロット", cat: "Azure",
      text: "App Service で、本番とは別にアプリを置いておける場所。新旧を入れ替える（スワップ）ことで、すばやく切り替えたり戻したりできます。" },
    azmonitor: { name: "Azure Monitor", cat: "監視",
      text: "Azure のリソースのメトリック（数値）やログを集めて、グラフ表示やアラート通知を行う監視サービスの総称です。" },
    appinsights: { name: "Application Insights", cat: "監視",
      text: "Azure Monitor の機能の一つで、アプリの応答時間・エラー・依存先の呼び出しなどを記録します。アプリの中で何が起きているかを見るための道具です。" },
    loganalytics: { name: "Log Analytics", cat: "監視",
      text: "ログをためておき、KQL というクエリ言語で検索・集計できる Azure のサービスです。ログをためる場所を「ワークスペース」と呼びます。" },
    kql: { name: "KQL（Kusto Query Language）", cat: "監視",
      text: "Log Analytics などでログを検索するための言語。上から順に「どの表から」「どう絞り込んで」「どう集計するか」をパイプ（|）でつないで書きます。" },
    adx: { name: "Azure Data Explorer", cat: "監視",
      text: "大量のログや時系列データを高速に検索するためのサービス。KQL で問い合わせます。" },
    rbac: { name: "Azure RBAC（ロールベースのアクセス制御）", cat: "セキュリティ",
      text: "「誰が・どのリソースに・何をしてよいか」をロール（役割）で決めるしくみです。閲覧だけできる Reader、変更もできる Contributor などがあります。" },
    managedid: { name: "マネージド ID", cat: "セキュリティ",
      text: "Azure のサービスに与える「身分証」のようなもの。パスワードを管理しなくても、ほかのリソースに安全にアクセスできます。SRE Agent はこれを使って Azure にアクセスします。" },
    obo: { name: "On-Behalf-Of（OBO）フロー", cat: "セキュリティ",
      text: "Microsoft Entra ID のしくみで、「操作している人の権限を一時的に借りて」処理を行う方法。SRE Agent に権限が足りないときに使われます。" },
    pagerduty: { name: "PagerDuty", cat: "連携先",
      text: "インシデントの通知や当番（オンコール）管理のための SaaS。SRE Agent はここからインシデントを受け取れます。" },
    servicenow: { name: "ServiceNow", cat: "連携先",
      text: "IT サービス管理の SaaS。インシデントのチケット管理によく使われます。SRE Agent はチケットを受け取り、調査結果を書き込めます。" },
    mcp: { name: "MCP（Model Context Protocol）", cat: "連携先",
      text: "AI エージェントと外部のツールやデータをつなぐための共通の規格。Datadog や Splunk など、Azure 以外の監視ツールともこれでつなげます。" },
    responseplan: { name: "インシデント対応プラン", cat: "SRE Agent",
      text: "どんなインシデントを SRE Agent に任せるか（条件）と、そのときどう対応してほしいか（指示）をまとめた設定。英語の画面では Incident response plan と表示されます。" },
    scheduledtask: { name: "スケジュールタスク", cat: "SRE Agent",
      text: "毎朝の健康チェックや週次のコスト確認など、決まった時間に SRE Agent に仕事をさせる設定です。" },
    runmode: { name: "実行モード", cat: "SRE Agent",
      text: "SRE Agent が Azure への変更操作をする前に人の承認を待つか（Review）、そのまま実行して報告するか（Autonomous）を決める設定。プランやタスクごとに選べます。" },
    hook: { name: "フック（Agent hooks）", cat: "SRE Agent",
      text: "「ツールを実行した後」「エージェントが止まるとき」など、決まったタイミングで自動的に動く処理。危ない操作を止めるルールなどに使います。" },
    toolpolicy: { name: "ツールのアクセスポリシー", cat: "SRE Agent",
      text: "SRE Agent が使う道具（ツール）ごとに「許可（allow）」「確認する（ask）」「禁止（deny）」を決める設定です。" },
    sreadmin: { name: "SRE Agent 管理者", cat: "SRE Agent",
      text: "SRE Agent のユーザーロールの一つ。Review モードで提案された操作を承認できるのは、このロールを持つ人だけです。" }
  };

  Lab.TERMS = TERMS;

  /* ---- ポップアップ ----
   * 言葉（ボタン）を押すと説明を開き、フォーカスを説明に移します。
   * Esc・「閉じる」・外側のクリックで閉じ、フォーカスは元の言葉に戻します。
   */
  var pop, currentBtn;

  function closePop(returnFocus) {
    if (!pop || pop.hidden) return;
    pop.hidden = true;
    var btn = currentBtn;
    currentBtn = null;
    if (btn) {
      btn.setAttribute("aria-expanded", "false");
      if (returnFocus && btn.isConnected) btn.focus();
    }
  }

  function openPop(btn) {
    var t = TERMS[btn.getAttribute("data-term")];
    if (!t) return;
    pop = pop || document.getElementById("term-pop");
    if (currentBtn === btn) { closePop(true); return; }
    closePop(false);
    pop.innerHTML = '<strong id="term-pop-title">' + t.name + "</strong><p style=\"margin:0\">" + t.text + "</p>" +
      '<div style="margin-top:8px;display:flex;gap:12px;align-items:center;flex-wrap:wrap"><button type="button" class="btn btn--small" data-pop-close>閉じる</button><a href="#/glossary">用語集をすべて見る</a></div>';
    pop.hidden = false;
    var r = btn.getBoundingClientRect();
    var left = r.left + window.scrollX;
    var maxLeft = window.scrollX + document.documentElement.clientWidth - pop.offsetWidth - 16;
    pop.style.left = Math.max(16, Math.min(left, maxLeft)) + "px";
    pop.style.top = r.bottom + window.scrollY + 6 + "px";
    btn.setAttribute("aria-expanded", "true");
    currentBtn = btn;
    pop.focus();
  }

  document.addEventListener("click", function (e) {
    var btn = e.target.closest && e.target.closest(".term");
    if (btn) { e.preventDefault(); openPop(btn); return; }
    if (e.target.closest && e.target.closest("[data-pop-close]")) { closePop(true); return; }
    if (pop && !pop.hidden && !pop.contains(e.target)) closePop(false);
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && pop && !pop.hidden) { e.preventDefault(); closePop(true); }
  });
  // Tab でポップアップの外に出たら閉じる
  document.addEventListener("focusin", function (e) {
    if (!pop || pop.hidden) return;
    if (!pop.contains(e.target) && e.target !== currentBtn) closePop(false);
  });
  window.addEventListener("hashchange", function () { closePop(false); });
  window.addEventListener("resize", function () { closePop(false); });

  /* ---- 用語集ページ ---- */
  Lab.register("glossary", function (root) {
    var cats = [];
    Object.keys(TERMS).forEach(function (k) { if (cats.indexOf(TERMS[k].cat) < 0) cats.push(TERMS[k].cat); });

    var html = '<div class="eyebrow">REFERENCE</div><h1 tabindex="-1">用語集</h1>' +
      '<p class="lead">ラボの中で出てくる言葉をまとめました。本文の点線の下線が付いた言葉を押しても、同じ説明が出ます。</p>';

    cats.forEach(function (c) {
      html += "<h2>" + c + '</h2><dl class="glossary">';
      Object.keys(TERMS).forEach(function (k) {
        var t = TERMS[k];
        if (t.cat !== c) return;
        html += '<dt id="term-' + k + '" style="font-weight:700;margin-top:14px">' + t.name + '</dt><dd style="margin:2px 0 0">' + t.text + "</dd>";
      });
      html += "</dl>";
    });

    root.innerHTML = html + Lab.feedback("glossary");
  });
})();
