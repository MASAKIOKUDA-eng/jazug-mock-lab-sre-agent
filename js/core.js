/* 共通のしくみ（ページ登録・進み具合の保存・小さな部品） */
(function () {
  "use strict";

  var STORAGE_KEY = "sre-agent-mock-lab:v1";

  // ソースコードとフィードバックの送り先
  var REPO_URL = "https://github.com/MASAKIOKUDA-eng/jazug-mock-lab-sre-agent";

  // 目次に並べる順番。ここを書き換えるとサイドバーとトップページの一覧が変わります。
  var PAGES = [
    { id: "home", path: "/", no: "", title: "はじめに", group: "start" },
    { id: "lab1", path: "/lab1", no: "01", title: "SRE Agent ってなに？", minutes: 5, group: "lab",
      desc: "人が手作業でやっている障害対応と比べながら、全体像をつかみます。" },
    { id: "lab2", path: "/lab2", no: "02", title: "障害対応を体験する", minutes: 12, group: "lab",
      desc: "架空のECサイトで起きた障害を、SRE Agent と一緒に調べて直します。" },
    { id: "lab3", path: "/lab3", no: "03", title: "実行モードと権限", minutes: 6, group: "lab",
      desc: "「聞いてから動く」と「動いてから報告する」の違いを切り替えて確かめます。" },
    { id: "lab4", path: "/lab4", no: "04", title: "タスクとプランを作る", minutes: 8, group: "lab",
      desc: "定期点検タスクと障害対応のプランを、フォームで組み立てて試します。" },
    { id: "lab5", path: "/lab5", no: "05", title: "できることを広げる", minutes: 4, group: "lab",
      desc: "スキル、MCP サーバー、フックなど、5つの拡張ポイントを整理します。" },
    { id: "quiz", path: "/quiz", no: "06", title: "確認テスト", minutes: 5, group: "lab",
      desc: "ここまでの内容を 8 問で確認します。全問正解で修了です。" },
    { id: "glossary", path: "/glossary", no: "", title: "用語集", group: "ref" }
  ];

  function load() {
    try {
      var raw = window.localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      return {};
    }
  }
  var state = load();

  function save() {
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) { /* 保存できなくても動作は続ける */ }
  }

  var listeners = [];

  var Lab = {
    PAGES: PAGES,
    REPO_URL: REPO_URL,
    ISSUES_URL: REPO_URL + "/issues",

    /* ページ名を入れた状態で Issue の作成画面を開く URL */
    newIssueUrl: function (id) {
      var p = id ? Lab.page(id) : null;
      var where = p ? (p.no ? "LAB " + p.no + " " : "") + p.title : "";
      var title = where ? "[" + where + "] " : "";
      var body =
        "## どのページですか\n" + (where || "（ページ名）") + "\n\n" +
        "## 起きたこと・気になったこと\n\n\n" +
        "## 期待していたこと\n\n\n" +
        "## 使っている環境（わかる範囲で）\n- ブラウザ：\n- 画面の幅（PC / スマホ）：\n";
      return REPO_URL + "/issues/new?title=" + encodeURIComponent(title) + "&body=" + encodeURIComponent(body);
    },
    renderers: {},

    register: function (id, fn) { Lab.renderers[id] = fn; },

    page: function (id) {
      for (var i = 0; i < PAGES.length; i++) if (PAGES[i].id === id) return PAGES[i];
      return null;
    },

    labPages: function () { return PAGES.filter(function (p) { return p.group === "lab"; }); },

    isDone: function (id) { return !!(state.done && state.done[id]); },

    complete: function (id) {
      state.done = state.done || {};
      if (state.done[id]) return;
      state.done[id] = new Date().toISOString();
      save();
      listeners.forEach(function (fn) { fn(); });
    },

    get: function (key, fallback) { return key in state ? state[key] : fallback; },
    set: function (key, value) { state[key] = value; save(); },

    reset: function () {
      state = {};
      save();
      listeners.forEach(function (fn) { fn(); });
    },

    onChange: function (fn) { listeners.push(fn); },

    esc: function (s) {
      return String(s).replace(/[&<>"']/g, function (c) {
        return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
      });
    },

    /* 用語集に載っている言葉をクリックで説明できるようにする */
    term: function (key, label) {
      return '<button type="button" class="term" data-term="' + key + '" aria-haspopup="dialog" aria-expanded="false" aria-controls="term-pop">' + (label || key) + '<span class="sr-only">（用語の説明）</span></button>';
    },

    pageHead: function (id, lead) {
      var p = Lab.page(id);
      var meta = p.minutes ? '<div class="meta-row"><span>目安 ' + p.minutes + " 分</span><span>Azure サブスクリプション不要</span></div>" : "";
      return (
        '<div class="eyebrow">LAB ' + p.no + "</div>" +
        "<h1 tabindex=\"-1\">" + p.title + "</h1>" +
        (lead ? '<p class="lead">' + lead + "</p>" : "") +
        meta
      );
    },

    /* ページ下部の「このラボを完了にする」帯 */
    completeBar: function (id, text) {
      var done = Lab.isDone(id);
      return (
        '<div class="complete-bar' + (done ? " is-done" : "") + '" data-complete-bar="' + id + '" role="status">' +
        (done
          ? "<strong>このラボは完了しています。</strong><span>" + (text || "") + "</span>"
          : "<span>" + (text || "下の課題に取り組むと、このラボが完了になります。") + "</span>") +
        "</div>"
      );
    },

    refreshCompleteBar: function (root, id, text) {
      var bar = root.querySelector('[data-complete-bar="' + id + '"]');
      if (!bar) return;
      // role="status" の中身だけを入れ替えて、完了したことを読み上げる
      var tmp = document.createElement("div");
      tmp.innerHTML = Lab.completeBar(id, text);
      bar.className = tmp.firstChild.className;
      bar.innerHTML = tmp.firstChild.innerHTML;
    },

    /* スクリーンリーダー向けのお知らせ（画面には出ない） */
    announce: function (msg) {
      var el = document.getElementById("announcer");
      if (!el) return;
      el.textContent = "";
      window.setTimeout(function () { el.textContent = msg; }, 50);
    },

    /* 外部リンク（新しいタブで開く） */
    extLink: function (href, label) {
      return '<a href="' + href + '" target="_blank" rel="noopener">' + label + '<span class="sr-only">（新しいタブで開きます）</span></a>';
    },

    /*
     * 選択式の問題。q = { id, text, options: [...], answer: 正解の番号, explain, hints: { 番号: "間違えたときの説明" } }
     * 間違えたらその選択肢だけ消して、もう一度選べるようにしています。
     */
    questionHtml: function (q, label) {
      return (
        '<div class="q" data-q="' + q.id + '">' +
        (label ? '<div class="q__no">' + label + "</div>" : "") +
        '<p class="q__text" id="q-' + q.id + '">' + q.text + "</p>" +
        '<div class="q__opts" role="group" aria-labelledby="q-' + q.id + '">' +
        q.options.map(function (o, i) {
          return '<button type="button" class="q__opt" data-opt="' + i + '">' + o + "</button>";
        }).join("") +
        '</div><div class="q__fb" role="status"></div></div>'
      );
    },

    bindQuestions: function (root, questions, onAnswer) {
      var byId = {};
      questions.forEach(function (q) { byId[q.id] = q; });
      root.addEventListener("click", function (e) {
        var btn = e.target.closest(".q__opt");
        // disabled にするとフォーカスが外れてしまうので、aria-disabled で止める
        if (!btn || btn.getAttribute("aria-disabled") === "true") return;
        var box = btn.closest(".q");
        var q = byId[box.getAttribute("data-q")];
        if (!q) return;
        var i = Number(btn.getAttribute("data-opt"));
        var fb = box.querySelector(".q__fb");
        var tries = Number(box.getAttribute("data-tries") || 0) + 1;
        box.setAttribute("data-tries", tries);
        if (i === q.answer) {
          btn.classList.add("is-correct");
          btn.insertAdjacentHTML("beforeend", '<span class="sr-only">（正解）</span>');
          box.querySelectorAll(".q__opt").forEach(function (b) { b.setAttribute("aria-disabled", "true"); });
          fb.innerHTML = '<b class="ok">正解です。</b> ' + (q.explain || "");
          if (onAnswer) onAnswer(q.id, tries === 1);
        } else {
          btn.classList.add("is-wrong");
          btn.setAttribute("aria-disabled", "true");
          btn.insertAdjacentHTML("beforeend", '<span class="sr-only">（不正解）</span>');
          fb.innerHTML = '<b class="ng">ちがいます。</b> ' + ((q.hints && q.hints[i]) || "ほかの選択肢も考えてみてください。");
        }
      });
    },

    /* ページ下部のフィードバック欄 */
    feedback: function (id) {
      return (
        '<aside class="feedback" aria-labelledby="feedback-' + id + '">' +
        '<h2 class="feedback__title" id="feedback-' + id + '">このページについて</h2>' +
        "<p>説明がわかりにくい、うまく動かない、などがあれば GitHub の Issue で教えてください。GitHub のアカウントが必要です。</p>" +
        '<div class="btn-row" style="margin:0">' +
        Lab.extButton(Lab.newIssueUrl(id), "このページの不具合・要望を Issue で送る", "btn btn--small") +
        Lab.extButton(Lab.ISSUES_URL, "Issue の一覧を見る", "btn btn--small") +
        "</div></aside>"
      );
    },

    extButton: function (href, label, cls) {
      return '<a class="' + (cls || "btn") + '" href="' + href + '" target="_blank" rel="noopener">' + label +
        '<svg class="ext-mark" width="12" height="12" viewBox="0 0 12 12" aria-hidden="true" focusable="false"><path d="M7 1h4v4M11 1 5.5 6.5M9.5 7.5V11H1V2.5h3.5" fill="none" stroke="currentColor" stroke-width="1.4"/></svg>' +
        '<span class="sr-only">（新しいタブで開きます）</span></a>';
    },

    pageNav: function (id) {
      var idx = -1;
      for (var i = 0; i < PAGES.length; i++) if (PAGES[i].id === id) idx = i;
      var prev = idx > 0 ? PAGES[idx - 1] : null;
      var next = idx >= 0 && idx < PAGES.length - 1 ? PAGES[idx + 1] : null;
      if (next && next.group === "ref") next = null;
      return (
        Lab.feedback(id) +
        '<nav class="page-nav" aria-label="前後のページ">' +
        (prev ? '<a class="btn" href="#' + prev.path + '"><span><span class="page-nav__dir">前へ<span class="sr-only">：</span></span>' + prev.title + "</span></a>" : "<span></span>") +
        (next ? '<a class="btn btn--primary" href="#' + next.path + '"><span><span class="page-nav__dir" style="color:inherit">次へ<span class="sr-only">：</span></span>' + next.title + "</span></a>" : "") +
        "</nav>"
      );
    }
  };

  window.Lab = Lab;
})();
