(function () {
  "use strict";
  var Lab = window.Lab;
  var T = Lab.term;
  var esc = Lab.esc;

  /* ---------- スケジュールタスク：指示文のチェック項目 ---------- */
  var CHECKS = [
    { id: "target", label: "対象がはっきりしている", hint: "例：rg-contoso-prod、App Service など",
      re: /rg-|app-|sql-|リソースグループ|サブスクリプション|App Service|AKS|仮想マシン|\bVM\b|ストレージ|データベース|SQL/i },
    { id: "what", label: "何を確認するかが書いてある", hint: "例：CPU、メモリ、エラー、証明書の期限",
      re: /CPU|メモリ|エラー|応答|証明書|ディスク|コスト|料金|可用性|再起動|ログ|アラート|5xx/i },
    { id: "criteria", label: "判断の基準がある", hint: "例：80% 以上、10 件を超えたら、30 日以内",
      re: /\d+\s*(%|％|件|日|秒|ms|ミリ秒|円|回|時間)|以上|以下|超え/ },
    { id: "deliver", label: "結果の届け先が書いてある", hint: "例：Teams の #ops チャンネル、メール",
      re: /Teams|メール|Outlook|チケット|ServiceNow|PagerDuty|Issue|チャンネル/i },
    { id: "limit", label: "やってはいけないことが書いてある", hint: "例：設定の変更や再起動は行わない",
      re: /しない|禁止|行わない|触らない|読み取りのみ|変更不可|やらない/ }
  ];

  var EXAMPLE =
    "rg-contoso-prod の App Service と Azure SQL Database を対象に、次の点を確認してください。\n" +
    "- 過去 24 時間の CPU とメモリの最大値（80% 以上なら要注意）\n" +
    "- HTTP 5xx エラーが 1 時間あたり 10 件を超えた時間帯\n" +
    "- 30 日以内に期限が切れる TLS 証明書\n" +
    "結果は Teams の #contoso-ops チャンネルに、問題があるものだけを箇条書きで投稿してください。\n" +
    "この作業では、設定の変更や再起動は行わないでください。";

  /* ---------- インシデント対応プラン：テスト用のインシデント ---------- */
  var TEST_INCIDENTS = [
    { id: "t1", source: "azmon", sev: 2, resource: "app-contoso-shop-prod", title: "応答時間 (p95) が 3 秒を超えた" },
    { id: "t2", source: "azmon", sev: 1, resource: "sql-contoso-prod", title: "DTU 使用率が 95% を超えた" },
    { id: "t3", source: "azmon", sev: 3, resource: "app-contoso-admin-dev", title: "アプリの再起動が 15 分で 5 回発生" }
  ];
  var SOURCE_LABEL = { azmon: "Azure Monitor アラート", pagerduty: "PagerDuty", servicenow: "ServiceNow" };

  Lab.register("lab4", function (root) {
    var tab = "task";
    var task = { name: "", freq: "daily", mode: "autonomous", text: "" };
    var plan = { name: "本番 Web アプリの障害対応", source: "azmon", sevs: [0, 1], filter: "prod", mode: "review", test: "t1" };
    var taskResult = "", planResult = "";

    function checkState(text) {
      var r = {};
      CHECKS.forEach(function (c) { r[c.id] = c.re.test(text); });
      return r;
    }

    function checkCount() {
      var st = checkState(task.text);
      return CHECKS.filter(function (c) { return st[c.id]; }).length;
    }
    function checkSummary() { return CHECKS.length + " 項目中 " + checkCount() + " 項目を満たしています"; }

    function checklistHtml() {
      var st = checkState(task.text);
      return '<ul class="checklist">' + CHECKS.map(function (c) {
        return '<li class="' + (st[c.id] ? "is-ok" : "") + '"><span class="mark" aria-hidden="true">✓</span><span>' + c.label +
          '<span class="sr-only">' + (st[c.id] ? "（満たしています）" : "（まだです）") + "</span><small>" + c.hint + "</small></span></li>";
      }).join("") + "</ul>";
    }

    function seg(name, val, opts, labelId) {
      return '<div class="seg" role="group" aria-labelledby="' + labelId + '">' + opts.map(function (o) {
        return '<button type="button" data-seg="' + name + '" data-val="' + o[0] + '" aria-pressed="' + (val === o[0]) + '">' + o[1] + "</button>";
      }).join("") + "</div>";
    }

    /* ----- タスクのテスト実行（模擬） ----- */
    function runTask() {
      var st = checkState(task.text);
      var freqLabel = { daily: "毎日 9:00", weekly: "毎週月曜 9:00", hourly: "1 時間ごと" }[task.freq];
      var lines = [];
      var warnings = [];

      if (!task.name.trim()) warnings.push("タスク名が空です。あとで一覧から探しにくくなるので、何をするタスクか分かる名前を付けましょう。");
      if (!task.text.trim()) {
        return '<div class="note note--bad"><span class="note__title">指示文が空です</span>SRE Agent は何をすればよいか分かりません。まずは「例文を入れる」を押して、中身を見てみてください。</div>';
      }

      lines.push(st.target
        ? "対象のリソースグループから、App Service 2 件、Azure SQL Database 1 件を確認しました。"
        : "対象が書かれていないため、サブスクリプション内のリソースを<strong>すべて</strong>確認しました（127 件）。結果が長くなり、大事な情報が埋もれています。");
      lines.push(st.what
        ? "指示された項目について、メトリックとログを調べました。"
        : "何を確認すればよいか書かれていないため、リソースの一覧と状態（実行中かどうか）だけを報告しました。");
      lines.push(st.criteria
        ? "基準に当てはまったもの：app-contoso-shop-prod のメモリ最大値 86%（80% 以上）、TLS 証明書 shop.contoso.example の期限まで残り 21 日。"
        : "判断の基準がないため、数値をそのまま並べました。どれが問題なのかは、読む人が判断する必要があります。");
      lines.push(st.deliver
        ? "結果を Teams の #contoso-ops チャンネルに投稿しました。"
        : "届け先が書かれていないため、結果はこのスレッドにだけ残しています。誰も気づかないかもしれません。");

      if (!st.limit) {
        warnings.push(task.mode === "autonomous"
          ? "「やってはいけないこと」が書かれていません。Autonomous モードなので、問題を見つけたときに SRE Agent が自分の判断で修正（再起動など）まで行う可能性があります。点検だけのタスクなら、変更しないことをはっきり書いておきましょう。"
          : "「やってはいけないこと」が書かれていません。Review モードなので変更の前に承認を求めますが、点検だけのタスクなら、変更しないことを書いておくほうが確実です。");
      }

      var allOk = CHECKS.every(function (c) { return st[c.id]; }) && task.name.trim();

      var html =
        '<div class="thread" style="margin-top:16px"><div class="thread__head"><strong>テスト実行：' + esc(task.name.trim() || "（名前なし）") + "</strong><span>" +
        '<span class="tag">' + freqLabel + '</span> <span class="tag ' + (task.mode === "review" ? "tag--accent" : "tag--warn") + '">' + (task.mode === "review" ? "Review" : "Autonomous") + "</span></span></div>" +
        '<div class="entry"><div class="entry__meta"><span class="entry__time">09:00:00</span><span class="entry__who">SRE Agent</span></div><ul>' +
        lines.map(function (l) { return "<li>" + l + "</li>"; }).join("") + "</ul></div></div>";

      if (warnings.length) {
        html += '<div class="note note--warn" style="margin-top:12px"><span class="note__title">見直したいところ</span><ul style="margin:0">' +
          warnings.map(function (w) { return "<li>" + w + "</li>"; }).join("") + "</ul></div>";
      }
      if (allOk) {
        html += '<div class="note note--ok" style="margin-top:12px"><span class="note__title">よくできた指示です</span>対象・確認項目・基準・届け先・やってはいけないことがそろっているので、SRE Agent は迷わずに仕事ができます。</div>';
        Lab.complete("lab4");
      }
      return html;
    }

    /* ----- プランのテスト（模擬） ----- */
    function runPlan() {
      var inc = TEST_INCIDENTS.filter(function (t) { return t.id === plan.test; })[0];
      var reasons = [];
      if (plan.source !== inc.source) reasons.push("受け取り元が「" + SOURCE_LABEL[plan.source] + "」になっていますが、テストのインシデントは Azure Monitor アラートから来ています。");
      if (plan.sevs.indexOf(inc.sev) < 0) reasons.push("重要度 Sev" + inc.sev + " が、このプランの対象に入っていません。");
      var f = plan.filter.trim();
      if (f && inc.resource.indexOf(f) < 0) reasons.push("対象リソースの条件「" + esc(f) + "」が、" + inc.resource + " に含まれていません。");

      var head = '<dl class="kv" style="margin:0 0 10px"><dt>テストのインシデント</dt><dd>Sev' + inc.sev + " / " + inc.resource + " / " + inc.title + "</dd></dl>";

      if (reasons.length) {
        return head + '<div class="note note--warn" style="margin:0"><span class="note__title">このプランでは担当しません</span><ul style="margin:0">' +
          reasons.map(function (r) { return "<li>" + r + "</li>"; }).join("") + "</ul>" +
          '<p style="margin:6px 0 0;font-size:.9rem">本当に任せたいインシデントなら条件を広げ、任せたくないものなら今のままで正解です。</p></div>';
      }
      Lab.complete("lab4");
      var act = plan.mode === "review"
        ? "調査して原因の候補と対処を提案し、Azure を変更する前に<strong>承認を待ちます</strong>。"
        : "調査して、対処が必要なら<strong>承認を待たずに実行</strong>し、結果を報告します。";
      var dev = inc.resource.indexOf("-dev") > 0 && plan.mode === "review"
        ? '<p style="margin:6px 0 0;font-size:.9rem">これは開発環境のリソースです。影響が小さい環境なら、別のプランを作って Autonomous にする方法もあります。</p>' : "";
      var prodAuto = inc.resource.indexOf("-prod") > 0 && plan.mode === "autonomous"
        ? '<p style="margin:6px 0 0;font-size:.9rem">本番のリソースを Autonomous で扱う設定です。慣れるまでは Review にしておくと安心です。</p>' : "";
      return head + '<div class="note note--ok" style="margin:0"><span class="note__title">このプランが担当します</span>SRE Agent は' + act + dev + prodAuto + "</div>";
    }

    function taskTab() {
      return (
        "<p>" + T("scheduledtask", "スケジュールタスク") + "は、決まった時間に SRE Agent に仕事を頼む設定です。ここでは毎朝の点検タスクを作ります。いちばん大事なのは<strong>指示文</strong>です。</p>" +
        '<div class="two-col" style="align-items:start">' +
        '<div class="form-grid">' +
        '<div class="field"><label for="t-name">タスク名</label><input type="text" id="t-name" data-task="name" value="' + esc(task.name) + '" placeholder="例：本番環境の朝の点検"></div>' +
        '<div class="field"><label for="t-freq">実行のタイミング</label><select id="t-freq" data-task="freq">' +
        [["daily", "毎日 9:00"], ["weekly", "毎週月曜 9:00"], ["hourly", "1 時間ごと"]].map(function (o) {
          return '<option value="' + o[0] + '"' + (task.freq === o[0] ? " selected" : "") + ">" + o[1] + "</option>";
        }).join("") + "</select></div>" +
        '<div class="field"><span id="t-mode-label" style="display:block;font-weight:700;font-size:.9rem;margin-bottom:4px">実行モード</span>' + seg("task-mode", task.mode, [["review", "Review"], ["autonomous", "Autonomous"]], "t-mode-label") + "</div>" +
        '<div class="field"><label for="t-text">指示文</label><textarea id="t-text" data-task="text" aria-describedby="t-text-hint" placeholder="SRE Agent にやってほしいことを、人に頼むときと同じように書きます。">' + esc(task.text) + "</textarea>" +
        '<span class="hint" id="t-text-hint">「よい指示文のチェック」の 5 項目がすべて満たされるように書いてみてください。</span></div>' +
        '<div class="btn-row" style="margin:0"><button type="button" class="btn btn--primary" data-run-task>テスト実行</button><button type="button" class="btn" data-example>例文を入れる</button></div>' +
        "</div>" +
        '<div class="box box--muted" style="margin:0"><h2 style="margin-top:0;font-size:1.05rem;border:0;padding:0">よい指示文のチェック</h2><p data-check-sum aria-live="polite" style="font-size:.88rem;margin:0 0 8px">' + checkSummary() + '</p><div data-checklist>' + checklistHtml() + "</div>" +
        '<p style="font-size:.85rem;color:var(--ink-2);margin:12px 0 0">新しく入ったメンバーに仕事を頼むつもりで書くと、うまくいきます。あいまいな指示だと、SRE Agent も人と同じように迷います。</p></div>' +
        "</div>" +
        '<div data-task-result aria-live="polite">' + taskResult + "</div>"
      );
    }

    function planTab() {
      return (
        "<p>" + T("responseplan", "インシデント対応プラン") + "は、「どんなインシデントを任せるか（条件）」と「どう対応してほしいか（指示）」の組み合わせです。条件を作って、テストのインシデントを送ってみましょう。</p>" +
        '<div class="two-col" style="align-items:start">' +
        '<div class="form-grid">' +
        '<div class="field"><label for="p-name">プラン名</label><input type="text" id="p-name" data-plan="name" value="' + esc(plan.name) + '"></div>' +
        '<div class="field"><label for="p-source">インシデントの受け取り元</label><select id="p-source" data-plan="source">' +
        Object.keys(SOURCE_LABEL).map(function (k) { return '<option value="' + k + '"' + (plan.source === k ? " selected" : "") + ">" + SOURCE_LABEL[k] + "</option>"; }).join("") +
        "</select></div>" +
        '<div class="field"><fieldset><legend>対象にする重要度</legend><div class="check-row">' +
        [0, 1, 2, 3, 4].map(function (s) {
          return '<label><input type="checkbox" data-sev="' + s + '"' + (plan.sevs.indexOf(s) >= 0 ? " checked" : "") + "> Sev" + s + "</label>";
        }).join("") +
        '</div><span class="hint">Sev0 がいちばん深刻です（' + T("sev", "重要度とは") + "）</span></fieldset></div>" +
        '<div class="field"><label for="p-filter">対象リソース名に含まれる文字</label><input type="text" id="p-filter" data-plan="filter" aria-describedby="p-filter-hint" value="' + esc(plan.filter) + '"><span class="hint" id="p-filter-hint">空にすると、すべてのリソースが対象になります</span></div>' +
        '<div class="field"><span id="p-mode-label" style="display:block;font-weight:700;font-size:.9rem;margin-bottom:4px">実行モード</span>' + seg("plan-mode", plan.mode, [["review", "Review"], ["autonomous", "Autonomous"]], "p-mode-label") + "</div>" +
        "</div>" +
        '<div class="box box--muted" style="margin:0"><h2 style="margin-top:0;font-size:1.05rem;border:0;padding:0">テストのインシデントを送る</h2>' +
        '<div class="field"><label for="p-test">送るインシデント</label><select id="p-test" data-plan="test">' +
        TEST_INCIDENTS.map(function (t) { return '<option value="' + t.id + '"' + (plan.test === t.id ? " selected" : "") + ">Sev" + t.sev + " " + t.resource + "</option>"; }).join("") +
        "</select></div>" +
        '<div class="btn-row"><button type="button" class="btn btn--primary" data-run-plan>テストを送る</button></div>' +
        '<div data-plan-result aria-live="polite">' + planResult + "</div>" +
        "</div>" +
        "</div>" +
        '<div class="note" style="margin-top:20px"><span class="note__title">条件の決め方</span>条件を広げすぎると、SRE Agent が細かいアラートまで拾って通知が増えます。狭めすぎると、任せたい障害を拾い漏らします。3 つのテストを順に送って、どれが担当になるか確かめてみてください。</div>'
      );
    }

    function tabBtn(id, label) {
      var sel = tab === id;
      return '<button type="button" class="tab" role="tab" id="tab-' + id + '" data-tab="' + id + '" aria-selected="' + sel + '" aria-controls="lab4-panel" tabindex="' + (sel ? "0" : "-1") + '">' + label + "</button>";
    }

    function selectTab(id) {
      tab = id;
      render();
      root.querySelector("#tab-" + id).focus();
    }

    function render() {
      root.innerHTML =
        Lab.pageHead("lab4", "SRE Agent に仕事を任せるときの 2 つの設定、「スケジュールタスク」と「インシデント対応プラン」を、模擬フォームで組み立ててみます。") +
        '<div class="tabs" role="tablist" aria-label="作る設定の種類">' +
        tabBtn("task", "スケジュールタスク") + tabBtn("plan", "インシデント対応プラン") +
        "</div>" +
        '<div role="tabpanel" id="lab4-panel" aria-labelledby="tab-' + tab + '" tabindex="0">' + (tab === "task" ? taskTab() : planTab()) + "</div>" +
        Lab.completeBar("lab4", "どちらかのタブでテストを成功させると完了になります。") +
        Lab.pageNav("lab4");
    }

    render();

    root.addEventListener("click", function (e) {
      var el;
      if ((el = e.target.closest("[data-tab]"))) { selectTab(el.getAttribute("data-tab")); return; }
      if ((el = e.target.closest("[data-seg]"))) {
        var name = el.getAttribute("data-seg"), val = el.getAttribute("data-val");
        if (name === "task-mode") task.mode = val; else plan.mode = val;
        el.parentNode.querySelectorAll("button").forEach(function (b) { b.setAttribute("aria-pressed", b === el ? "true" : "false"); });
        return;
      }
      if (e.target.closest("[data-example]")) {
        task.text = EXAMPLE;
        if (!task.name) task.name = "本番環境の朝の点検";
        render();
        root.querySelector("#t-text").focus();
        Lab.announce("例文を入れました。" + checkSummary());
        return;
      }
      if (e.target.closest("[data-run-task]")) {
        taskResult = runTask();
        root.querySelector("[data-task-result]").innerHTML = taskResult;
        Lab.refreshCompleteBar(root, "lab4", "LAB 05 では、SRE Agent にできることを広げる方法を見ます。");
        return;
      }
      if (e.target.closest("[data-run-plan]")) {
        planResult = runPlan();
        root.querySelector("[data-plan-result]").innerHTML = planResult;
        Lab.refreshCompleteBar(root, "lab4", "LAB 05 では、SRE Agent にできることを広げる方法を見ます。");
      }
    });

    // タブは左右の矢印キー・Home・End で切り替える
    root.addEventListener("keydown", function (e) {
      if (!e.target.matches || !e.target.matches('[role="tab"]')) return;
      var order = ["task", "plan"];
      var i = order.indexOf(tab);
      var next = null;
      if (e.key === "ArrowRight") next = order[(i + 1) % order.length];
      else if (e.key === "ArrowLeft") next = order[(i - 1 + order.length) % order.length];
      else if (e.key === "Home") next = order[0];
      else if (e.key === "End") next = order[order.length - 1];
      if (next) { e.preventDefault(); selectTab(next); }
    });

    root.addEventListener("input", function (e) {
      var t = e.target;
      if (t.hasAttribute("data-task")) {
        task[t.getAttribute("data-task")] = t.value;
        if (t.getAttribute("data-task") === "text") {
          root.querySelector("[data-checklist]").innerHTML = checklistHtml();
          var sumEl = root.querySelector("[data-check-sum]");
          var sumText = checkSummary();
          if (sumEl.textContent !== sumText) sumEl.textContent = sumText;
        }
      } else if (t.hasAttribute("data-plan")) {
        plan[t.getAttribute("data-plan")] = t.value;
      } else if (t.hasAttribute("data-sev")) {
        var s = Number(t.getAttribute("data-sev"));
        plan.sevs = plan.sevs.filter(function (x) { return x !== s; });
        if (t.checked) plan.sevs.push(s);
      }
    });
  });
})();
