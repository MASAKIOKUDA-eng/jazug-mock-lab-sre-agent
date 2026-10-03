/* 共通のしくみ（ページ登録・進み具合の保存・小さな部品） */
(function () {
  "use strict";

  var STORAGE_KEY = "sre-agent-mock-lab:v1";

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
      return '<button type="button" class="term" data-term="' + key + '">' + (label || key) + "</button>";
    },

    pageHead: function (id, lead) {
      var p = Lab.page(id);
      var meta = p.minutes ? '<div class="meta-row"><span>目安 ' + p.minutes + " 分</span><span>Azure サブスクリプション不要</span></div>" : "";
      return (
        '<div class="eyebrow">LAB ' + p.no + "</div>" +
        "<h1>" + p.title + "</h1>" +
        (lead ? '<p class="lead">' + lead + "</p>" : "") +
        meta
      );
    },

    /* ページ下部の「このラボを完了にする」帯 */
    completeBar: function (id, text) {
      var done = Lab.isDone(id);
      return (
        '<div class="complete-bar' + (done ? " is-done" : "") + '" data-complete-bar="' + id + '">' +
        (done
          ? "<strong>このラボは完了しています。</strong><span>" + (text || "") + "</span>"
          : "<span>" + (text || "下の課題に取り組むと、このラボが完了になります。") + "</span>") +
        "</div>"
      );
    },

    refreshCompleteBar: function (root, id, text) {
      var bar = root.querySelector('[data-complete-bar="' + id + '"]');
      if (bar) bar.outerHTML = Lab.completeBar(id, text);
    },

    /*
     * 選択式の問題。q = { id, text, options: [...], answer: 正解の番号, explain, hints: { 番号: "間違えたときの説明" } }
     * 間違えたらその選択肢だけ消して、もう一度選べるようにしています。
     */
    questionHtml: function (q, label) {
      return (
        '<div class="q" data-q="' + q.id + '">' +
        (label ? '<div class="q__no">' + label + "</div>" : "") +
        '<p class="q__text">' + q.text + "</p>" +
        '<div class="q__opts">' +
        q.options.map(function (o, i) {
          return '<button type="button" class="q__opt" data-opt="' + i + '">' + o + "</button>";
        }).join("") +
        '</div><div class="q__fb" hidden aria-live="polite"></div></div>'
      );
    },

    bindQuestions: function (root, questions, onAnswer) {
      var byId = {};
      questions.forEach(function (q) { byId[q.id] = q; });
      root.addEventListener("click", function (e) {
        var btn = e.target.closest(".q__opt");
        if (!btn || btn.disabled) return;
        var box = btn.closest(".q");
        var q = byId[box.getAttribute("data-q")];
        if (!q) return;
        var i = Number(btn.getAttribute("data-opt"));
        var fb = box.querySelector(".q__fb");
        var tries = Number(box.getAttribute("data-tries") || 0) + 1;
        box.setAttribute("data-tries", tries);
        fb.hidden = false;
        if (i === q.answer) {
          btn.classList.add("is-correct");
          box.querySelectorAll(".q__opt").forEach(function (b) { b.disabled = true; });
          fb.innerHTML = '<b class="ok">正解です。</b> ' + (q.explain || "");
          if (onAnswer) onAnswer(q.id, tries === 1);
        } else {
          btn.classList.add("is-wrong");
          btn.disabled = true;
          fb.innerHTML = '<b class="ng">ちがいます。</b> ' + ((q.hints && q.hints[i]) || "ほかの選択肢も考えてみてください。");
        }
      });
    },

    pageNav: function (id) {
      var idx = -1;
      for (var i = 0; i < PAGES.length; i++) if (PAGES[i].id === id) idx = i;
      var prev = idx > 0 ? PAGES[idx - 1] : null;
      var next = idx >= 0 && idx < PAGES.length - 1 ? PAGES[idx + 1] : null;
      if (next && next.group === "ref") next = null;
      return (
        '<nav class="page-nav" aria-label="前後のページ">' +
        (prev ? '<a class="btn" href="#' + prev.path + '"><span><span class="page-nav__dir">前へ</span>' + prev.title + "</span></a>" : "<span></span>") +
        (next ? '<a class="btn btn--primary" href="#' + next.path + '"><span><span class="page-nav__dir" style="color:inherit;opacity:.8">次へ</span>' + next.title + "</span></a>" : "") +
        "</nav>"
      );
    }
  };

  window.Lab = Lab;
})();
