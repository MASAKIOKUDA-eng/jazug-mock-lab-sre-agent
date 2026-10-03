/* ページの切り替えと目次 */
(function () {
  "use strict";
  var Lab = window.Lab;
  var nav = document.getElementById("side-nav");
  var main = document.getElementById("main");
  var toggle = document.querySelector(".nav-toggle");
  var currentId = null;
  var initialized = false;

  function routeId() {
    var path = (location.hash || "#/").replace(/^#/, "") || "/";
    for (var i = 0; i < Lab.PAGES.length; i++) if (Lab.PAGES[i].path === path) return Lab.PAGES[i].id;
    return "home";
  }

  function renderNav() {
    var labs = Lab.labPages();
    var done = labs.filter(function (p) { return Lab.isDone(p.id); }).length;

    function item(p) {
      var isDone = Lab.isDone(p.id);
      return (
        '<li><a class="nav-link" href="#' + p.path + '"' + (p.id === currentId ? ' aria-current="page"' : "") + ">" +
        '<span class="nav-link__no" aria-hidden="true">' + (p.no || "") + "</span>" +
        "<span>" + p.title + "</span>" +
        (p.group === "lab" ? '<span class="nav-link__state' + (isDone ? " is-done" : "") + '" aria-hidden="true">✓</span><span class="sr-only">' + (isDone ? "（完了）" : "（未完了）") + "</span>" : "<span></span>") +
        "</a></li>"
      );
    }

    nav.innerHTML =
      '<div class="nav-group"><ul class="nav-list">' + item(Lab.page("home")) + "</ul></div>" +
      '<div class="nav-group"><p class="nav-group__label">ラボ</p><ul class="nav-list">' + labs.map(item).join("") + "</ul></div>" +
      '<div class="nav-group"><p class="nav-group__label">資料</p><ul class="nav-list">' + item(Lab.page("glossary")) + "</ul></div>" +
      '<div class="nav-progress">進み具合 ' + done + " / " + labs.length +
      '<div class="meter" role="progressbar" aria-label="ラボの進み具合" aria-valuemin="0" aria-valuemax="' + labs.length + '" aria-valuenow="' + done + '" aria-valuetext="' + labs.length + " 個中 " + done + ' 個完了"><span style="width:' + (done / labs.length) * 100 + '%"></span></div></div>';
  }

  function render() {
    var id = routeId();
    var changed = id !== currentId;
    currentId = id;
    renderNav();
    if (!changed) return;

    var page = document.createElement("div");
    page.className = "page";
    main.innerHTML = "";
    main.appendChild(page);
    var fn = Lab.renderers[id];
    if (fn) fn(page);

    var p = Lab.page(id);
    document.title = (id === "home" ? "" : p.title + " | ") + "SRE Agent モックラボ";
    window.scrollTo(0, 0);
    // ページが変わったら見出しにフォーカスを移して、スクリーンリーダーに新しいページを伝える
    if (initialized) {
      var h1 = page.querySelector("h1");
      (h1 || main).focus({ preventScroll: true });
    }
    initialized = true;

    nav.classList.remove("is-open");
    toggle.setAttribute("aria-expanded", "false");
  }

  toggle.addEventListener("click", function () {
    var open = nav.classList.toggle("is-open");
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
  });

  // 「本文へスキップ」はハッシュでページを切り替えるしくみとぶつかるので、自分でフォーカスを移す
  document.querySelector(".skip-link").addEventListener("click", function (e) {
    e.preventDefault();
    var h1 = main.querySelector("h1");
    (h1 || main).focus();
  });

  // 横にスクロールする表は、キーボードでもスクロールできるようにフォーカス可能にする
  function enhance() {
    main.querySelectorAll(".table-wrap, .console").forEach(function (w) {
      if (w.hasAttribute("tabindex") || w.querySelector("button")) return;
      w.setAttribute("tabindex", "0");
      w.setAttribute("role", "group");
      var cap = w.querySelector("caption");
      var name = cap ? cap.textContent : (w.classList.contains("console") ? "コマンド" : "表");
      w.setAttribute("aria-label", name + "（スクロールできます）");
    });
  }
  var pending = false;
  new MutationObserver(function () {
    if (pending) return;
    pending = true;
    window.setTimeout(function () { pending = false; enhance(); }, 0);
  }).observe(main, { childList: true, subtree: true });
  window.addEventListener("resize", enhance);

  Lab.onChange(renderNav);
  window.addEventListener("hashchange", render);
  render();
})();
