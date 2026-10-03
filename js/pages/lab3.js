(function () {
  "use strict";
  var Lab = window.Lab;
  var T = Lab.term;

  // 「やりたいこと × 実行モード × 権限」の組み合わせごとの動き（Microsoft Learn の Run modes の表をもとにしています）
  function outcome(s) {
    var ex = s.kind === "read" ? "Log Analytics でログを検索する" : "App Service を再起動する";
    if (s.kind === "read") {
      if (s.perm === "yes") return { tone: "ok", head: "そのまま実行する", ex: ex,
        body: "読み取りの操作は、実行モードにかかわらず承認を待ちません。SRE Agent が自分の権限（" + T("managedid", "マネージド ID") + "）で実行します。" };
      return { tone: "warn", head: "一時的なアクセスを求める", ex: ex,
        body: "SRE Agent に読み取りの権限がないので、操作している人の権限を一時的に借りてよいかを確認します（" + T("obo", "On-Behalf-Of フロー") + "）。実行モードによる違いはありません。" };
    }
    if (s.perm === "no") return { tone: "warn", head: "一時的なアクセスを求める", ex: ex,
      body: "SRE Agent に変更の権限がないので、操作している人の権限を一時的に借りてよいかを確認します（" + T("obo", "On-Behalf-Of フロー") + "）。権限がなければ、Autonomous モードでも勝手には実行できません。" };
    if (s.mode === "review") return { tone: "accent", head: "承認を待ってから実行する", ex: ex,
      body: "Azure を変更する操作なので、[承認] [拒否] のボタンを出して待ちます。承認されたら SRE Agent の権限で実行します。承認できるのは " + T("sreadmin", "SRE Agent 管理者") + " だけです。" };
    return { tone: "bad", head: "すぐに実行して、あとで報告する", ex: ex,
      body: "権限があり、Autonomous モードなので、人の確認なしに実行します。速く対処できる反面、任せる範囲を事前によく考えておく必要があります。" };
  }

  var SORT = [
    { id: "s1", text: "本番 EC サイトの応答遅延アラート", answer: "review",
      fb: "本番はお客さまへの影響が大きいので、まずは Review で提案を確認するのが基本です。" },
    { id: "s2", text: "検証（ステージング）環境のアプリが落ちたときの再起動", answer: "autonomous",
      fb: "検証環境なら影響が小さいので、Autonomous で任せてしまって問題になりにくい場面です。" },
    { id: "s3", text: "毎朝 9 時のリソース健康チェック（結果を Teams に投稿するだけ）", answer: "autonomous",
      fb: "決まった内容を確認して報告するだけの定型作業は、Autonomous に向いています。" },
    { id: "s4", text: "セキュリティに関するアラート（不審なサインインなど）", answer: "review",
      fb: "セキュリティは判断を誤ったときの影響が大きく、状況ごとの判断も必要なので Review がおすすめです。" },
    { id: "s5", text: "毎週月曜のコストと使用量のレポート作成", answer: "autonomous",
      fb: "集計してレポートを作るだけなので、Autonomous で問題ありません。" },
    { id: "s6", text: "本番データベースのフェイルオーバー（予備系への切り替え）", answer: "review",
      fb: "データに関わる大きな操作は、必ず人が確認してから実行するべきです。" }
  ];

  Lab.register("lab3", function (root) {
    var sw = { kind: "write", mode: "review", perm: "yes" };
    var answers = {};

    function seg(key, opts, labelId) {
      return '<div class="seg" role="group" aria-labelledby="' + labelId + '">' + opts.map(function (o) {
        return '<button type="button" data-sw="' + key + '" data-val="' + o[0] + '" aria-pressed="' + (sw[key] === o[0]) + '">' + o[1] + "</button>";
      }).join("") + "</div>";
    }

    function outcomeHtml() {
      var o = outcome(sw);
      return (
        '<div class="outcome" style="border-color:var(--' + o.tone + ')">' +
        '<div class="outcome__head" style="color:var(--' + o.tone + ')">' + o.head + "</div>" +
        '<p style="font-size:.85rem;color:var(--ink-3);margin:0 0 4px">例：' + o.ex + "</p>" +
        "<p style=\"margin:0\">" + o.body + "</p></div>"
      );
    }

    function boardHtml() {
      return (
        '<div class="switch-board">' +
        '<div class="switch-board__row"><span class="switch-board__label" id="sw-kind">やりたいこと</span>' + seg("kind", [["read", "読み取り"], ["write", "変更"]], "sw-kind") + "</div>" +
        '<div class="switch-board__row"><span class="switch-board__label" id="sw-mode">実行モード</span>' + seg("mode", [["review", "Review"], ["autonomous", "Autonomous"]], "sw-mode") + "</div>" +
        '<div class="switch-board__row"><span class="switch-board__label" id="sw-perm">SRE Agent の権限</span>' + seg("perm", [["yes", "あり"], ["no", "なし"]], "sw-perm") + "</div>" +
        "</div>" +
        '<h3 class="sr-only">結果</h3><div aria-live="polite" data-outcome>' + outcomeHtml() + "</div>"
      );
    }

    function feedbackHtml(s) {
      var a = answers[s.id];
      if (!a) return "";
      var ok = a === s.answer;
      return (ok ? '<b style="color:var(--ok)">そのとおり。</b> ' : '<b style="color:var(--bad)">おすすめは ' + (s.answer === "review" ? "Review" : "Autonomous") + " です。</b> ") + s.fb;
    }

    function sorterHtml() {
      return SORT.map(function (s, i) {
        var a = answers[s.id];
        return (
          '<div class="sorter-row" data-sort="' + s.id + '"><span id="sort-' + s.id + '">' + (i + 1) + ". " + s.text + "</span>" +
          '<div class="seg" role="group" aria-labelledby="sort-' + s.id + '">' +
          '<button type="button" data-pick="review" aria-pressed="' + (a === "review") + '">Review</button>' +
          '<button type="button" data-pick="autonomous" aria-pressed="' + (a === "autonomous") + '">Autonomous</button>' +
          '</div><div class="sorter-row__fb" aria-live="polite">' + feedbackHtml(s) + "</div></div>"
        );
      }).join("");
    }

    function correctCount() {
      return SORT.filter(function (s) { return answers[s.id] === s.answer; }).length;
    }

    function sorterStatus() {
      var answered = Object.keys(answers).length;
      if (answered < SORT.length) return "残り " + (SORT.length - answered) + " 問";
      var c = correctCount();
      return c === SORT.length ? "全問おすすめどおりです。" : SORT.length + " 問中 " + c + " 問がおすすめどおりでした。違ったものは選び直せます。";
    }

    root.innerHTML =
      Lab.pageHead("lab3", "SRE Agent がどこまで自分で動くかは、「実行モード」と「権限」の 2 つで決まります。スイッチを切り替えながら確かめてみましょう。") +

      "<h2>2 つの設定の役割</h2>" +
      '<div class="two-col">' +
      '<div class="box"><h3 style="margin-top:0">実行モード</h3><p>変更の操作をする前に<strong>人に聞くかどうか</strong>。</p><ul style="margin:0"><li><strong>Review</strong>：提案して、承認を待つ</li><li><strong>Autonomous</strong>：実行して、あとで報告する</li></ul></div>' +
      '<div class="box"><h3 style="margin-top:0">権限</h3><p>そもそも<strong>そのリソースに触れるかどうか</strong>。</p><p style="margin:0">Azure の ' + T("rbac", "RBAC") + " で、SRE Agent の " + T("managedid", "マネージド ID") + " にロールを割り当てて決めます。</p></div>" +
      "</div>" +
      "<p>たとえるなら、権限は「部屋の鍵を持っているか」、実行モードは「部屋に入る前に一声かけるルールがあるか」です。鍵がなければ入れませんし、鍵があってもルールがあれば声をかけてから入ります。</p>" +

      "<h2>スイッチで確かめる</h2>" +
      '<div class="box" data-board>' + boardHtml() + "</div>" +
      '<div class="note"><span class="note__title">ポイント</span>読み取りの操作では、実行モードによる違いはありません。違いが出るのは「権限があって、変更の操作をするとき」だけです。</div>' +

      "<h2>承認のボタンが出るのは、Azure の変更操作だけ</h2>" +
      "<p>Review モードでも、すべての行動に承認が必要になるわけではありません。</p>" +
      '<div class="table-wrap"><table class="plain"><thead><tr><th scope="col">SRE Agent の行動</th><th scope="col">Review モードでの扱い</th></tr></thead><tbody>' +
      "<tr><td>ログやメトリックを読む</td><td>承認なしで実行</td></tr>" +
      "<tr><td>App Service の再起動、スケール変更など（Azure CLI や Azure Resource Manager の変更操作）</td><td><strong>[承認] [拒否] のボタンが出る</strong></td></tr>" +
      "<tr><td>Teams への投稿、メールの送信</td><td>ボタンは出ない。プランの指示と SRE Agent の判断で進む</td></tr>" +
      "<tr><td>外部のデータソースへの問い合わせ</td><td>ボタンは出ない。プランの指示と SRE Agent の判断で進む</td></tr>" +
      "</tbody></table></div>" +
      "<p>ボタンが出ない行動にも歯止めをかけたいときは、" + T("toolpolicy", "ツールのアクセスポリシー") + "（ツールごとに許可・確認・禁止を決める）や " + T("hook", "フック") + " を使います。LAB 05 で少しだけ触れます。</p>" +

      "<h2>課題：どちらのモードにする？</h2>" +
      "<p>次の 6 つの場面で、どちらの実行モードがよいか選んでください。全部おすすめどおりに選べたら完了です。</p>" +
      '<div data-sorter>' + sorterHtml() + "</div>" +
      '<p data-sorter-status style="margin-top:10px;font-size:.9rem;color:var(--ink-2)">' + sorterStatus() + "</p>" +

      '<div class="note note--ok"><span class="note__title">現場でのすすめ方</span>' +
      "最初は Review モードで始めて、2〜4 週間ほど提案の内容を見てみるのがおすすめです。毎回同じように承認しているパターンが見つかったら、その種類のプランやタスクだけを Autonomous に切り替えます。<br>" +
      "実行モードは" + T("responseplan", "インシデント対応プラン") + "や" + T("scheduledtask", "スケジュールタスク") + "ごとに設定します。作成するときに、どちらが選ばれているかを必ず確認してください。</div>" +

      Lab.completeBar("lab3", "次は、プランとタスクを自分で組み立ててみます。") +
      Lab.pageNav("lab3");

    root.addEventListener("click", function (e) {
      var b = e.target.closest("[data-sw]");
      if (b) {
        sw[b.getAttribute("data-sw")] = b.getAttribute("data-val");
        b.parentNode.querySelectorAll("button").forEach(function (x) { x.setAttribute("aria-pressed", x === b ? "true" : "false"); });
        root.querySelector("[data-outcome]").innerHTML = outcomeHtml();
        return;
      }
      var p = e.target.closest("[data-pick]");
      if (p) {
        var row = p.closest("[data-sort]");
        var sid = row.getAttribute("data-sort");
        answers[sid] = p.getAttribute("data-pick");
        p.parentNode.querySelectorAll("button").forEach(function (x) { x.setAttribute("aria-pressed", x === p ? "true" : "false"); });
        row.querySelector(".sorter-row__fb").innerHTML = feedbackHtml(SORT.filter(function (s) { return s.id === sid; })[0]);
        root.querySelector("[data-sorter-status]").textContent = sorterStatus();
        if (correctCount() === SORT.length) {
          Lab.complete("lab3");
          Lab.refreshCompleteBar(root, "lab3", "次は、プランとタスクを自分で組み立ててみます。");
        }
      }
    });
  });
})();
