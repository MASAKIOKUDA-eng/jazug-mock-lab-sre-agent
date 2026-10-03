/*
 * ラボの題材「contoso-shop」の構成図（SVG）
 * LAB 01 / LAB 02 で使います。highlight に部品の id を渡すと、その部分だけ強調します。
 */
(function () {
  "use strict";
  var Lab = window.Lab;

  var ZONES = [
    { x: 200, y: 22, w: 420, h: 516, label: "リソースグループ rg-contoso-prod（本番の EC サイト）" },
    { x: 656, y: 186, w: 288, h: 236, label: "リソースグループ rg-sre-agent" }
  ];

  var NODES = [
    { id: "users", x: 20, y: 110, w: 150, h: 60, kind: "インターネット", title: "利用者", sub: "ブラウザから閲覧",
      text: "利用者はブラウザから HTTPS で EC サイトにアクセスします。" },
    { id: "github", x: 20, y: 420, w: 150, h: 74, kind: "外部サービス", title: "GitHub", sub: "contoso/shop",
      sub2: "Actions でデプロイ",
      text: "アプリのソースコードを管理し、GitHub Actions で App Service の staging スロットにデプロイします。" },
    { id: "app", x: 230, y: 62, w: 360, h: 150, kind: "App Service", title: "app-contoso-shop-prod", sub: "",
      text: "EC サイト本体。App Service プラン plan-contoso-prod の上で 2 台のインスタンスで動いています。" },
    { id: "slot-prod", x: 250, y: 118, w: 150, h: 76, kind: "デプロイスロット", title: "production", sub: "v2.8.0（公開中）",
      text: "利用者に公開されているスロット。20:12 に v2.8.0 に切り替わりました。", inner: true },
    { id: "slot-stg", x: 420, y: 118, w: 150, h: 76, kind: "デプロイスロット", title: "staging", sub: "v2.7.3（1 つ前）",
      text: "入れ替え用のスロット。スワップで production と入れ替えると、1 つ前の v2.7.3 に戻せます。", inner: true },
    { id: "sql", x: 230, y: 250, w: 160, h: 62, kind: "Azure SQL Database", title: "sql-contoso-prod", sub: "商品・注文データ",
      text: "商品や注文のデータを保存するデータベースです。" },
    { id: "appi", x: 430, y: 250, w: 160, h: 62, kind: "Application Insights", title: "appi-contoso-shop", sub: "応答時間・例外",
      text: "アプリの応答時間や例外（エラー）、メモリなどのテレメトリを集めます。" },
    { id: "log", x: 430, y: 350, w: 160, h: 62, kind: "Log Analytics", title: "log-contoso-prod", sub: "ログの保存・検索",
      text: "Application Insights のデータを含むログをためておくワークスペース。KQL で検索できます。" },
    { id: "alert", x: 430, y: 450, w: 160, h: 62, kind: "Azure Monitor", title: "アラートルール", sub: "p95 応答時間 > 3 秒",
      text: "応答時間が 3 秒を超えたら Sev2 のアラートを出すルールです。" },
    { id: "sre", x: 680, y: 222, w: 240, h: 176, kind: "Azure SRE Agent", title: "sre-contoso", sub: "マネージド ID + Azure RBAC",
      sub2: "インシデント対応プラン", sub3: "スケジュールタスク",
      text: "SRE Agent 本体。マネージド ID で Azure にアクセスし、Azure RBAC で rg-contoso-prod への権限を与えています。" },
    { id: "notify", x: 680, y: 58, w: 240, h: 72, kind: "外部サービス", title: "Teams / ServiceNow", sub: "通知・インシデントチケット",
      text: "調査結果の共有や、承認のお願い、インシデントチケットの更新に使います。" }
  ];

  var EDGES = [
    { id: "e-user", from: "users", to: "app", d: "M170,140 L228,140", label: "HTTPS", lx: 199, ly: 128 },
    { id: "e-deploy", from: "github", to: "app", d: "M95,420 L95,190 L228,190", label: "デプロイ", lx: 200, ly: 184 },
    { id: "e-sql", from: "app", to: "sql", d: "M310,212 L310,248", label: "", lx: 0, ly: 0 },
    { id: "e-tel", from: "app", to: "appi", d: "M510,212 L510,248", label: "テレメトリ", lx: 518, ly: 235, anchor: "start" },
    { id: "e-ingest", from: "appi", to: "log", d: "M510,312 L510,348", label: "ログを保存", lx: 518, ly: 335, anchor: "start" },
    { id: "e-rule", from: "log", to: "alert", d: "M510,412 L510,448", label: "ルールで監視", lx: 518, ly: 435, anchor: "start" },
    { id: "e-alert", from: "alert", to: "sre", d: "M590,481 L740,481 L740,400", label: "アラート通知", lx: 664, ly: 470 },
    { id: "e-query", from: "sre", to: "log", d: "M680,381 L592,381", label: "ログ検索", lx: 636, ly: 370 },
    { id: "e-action", from: "sre", to: "app", d: "M722,222 L722,160 L592,160", label: "スワップ・再起動", lx: 656, ly: 149 },
    { id: "e-notify", from: "sre", to: "notify", d: "M860,222 L860,132", label: "通知・記録", lx: 868, ly: 182, anchor: "start" },
    { id: "e-git", from: "sre", to: "github", d: "M860,398 L860,562 L95,562 L95,496", label: "デプロイ履歴の確認・Issue の作成", lx: 478, ly: 562 }
  ];

  var EDGE_TEXT = {
    "e-user": "利用者から App Service へ HTTPS でアクセス",
    "e-deploy": "GitHub Actions から App Service の staging スロットへデプロイ",
    "e-sql": "App Service から Azure SQL Database を読み書き",
    "e-tel": "App Service から Application Insights へテレメトリを送信",
    "e-ingest": "Application Insights のデータを Log Analytics に保存",
    "e-rule": "Azure Monitor のアラートルールがデータを監視",
    "e-alert": "Azure Monitor のアラートが SRE Agent に届く（調査のきっかけ）",
    "e-query": "SRE Agent が Log Analytics をクエリしてメトリックやログを調べる",
    "e-action": "SRE Agent が App Service のスワップや再起動を行う（Review モードでは承認後）",
    "e-notify": "SRE Agent が Teams に要約を送り、ServiceNow のチケットを更新する",
    "e-git": "SRE Agent が GitHub のデプロイ履歴を確認し、修正用の Issue を作る"
  };

  var seq = 0;

  function textWidth(s) {
    // 全角は 12px、半角は 7px くらいで見積もる
    var w = 0;
    for (var i = 0; i < s.length; i++) w += s.charCodeAt(i) > 255 ? 12 : 7;
    return w;
  }

  function nodeSvg(n, on) {
    var cx = n.x + n.w / 2;
    var s = '<g class="a-node' + (on ? " is-on" : "") + '">';
    s += '<rect x="' + n.x + '" y="' + n.y + '" width="' + n.w + '" height="' + n.h + '" rx="6"/>';
    if (n.id === "app") {
      s += '<text class="a-kind" x="' + (n.x + 12) + '" y="' + (n.y + 20) + '">App Service（plan-contoso-prod / 2 インスタンス）</text>';
      s += '<text class="a-title" x="' + (n.x + 12) + '" y="' + (n.y + 40) + '">' + n.title + "</text>";
    } else {
      s += '<text class="a-kind" x="' + cx + '" y="' + (n.y + 18) + '" text-anchor="middle">' + n.kind + "</text>";
      s += '<text class="a-title" x="' + cx + '" y="' + (n.y + 37) + '" text-anchor="middle">' + n.title + "</text>";
      if (n.sub) s += '<text class="a-sub" x="' + cx + '" y="' + (n.y + 54) + '" text-anchor="middle">' + n.sub + "</text>";
      if (n.sub2) s += '<text class="a-sub" x="' + cx + '" y="' + (n.y + 70) + '" text-anchor="middle">' + n.sub2 + "</text>";
      if (n.sub3) s += '<text class="a-sub" x="' + cx + '" y="' + (n.y + 86) + '" text-anchor="middle">' + n.sub3 + "</text>";
    }
    return s + "</g>";
  }

  function edgeSvg(e, on, uid) {
    var s = '<g class="a-edge' + (on ? " is-on" : "") + '">';
    s += '<path d="' + e.d + '" marker-end="url(#' + uid + (on ? "-arrow-on" : "-arrow") + ')"/>';
    if (e.label) {
      var w = textWidth(e.label) + 8;
      var anchor = e.anchor || "middle";
      var rx = anchor === "start" ? e.lx - 4 : e.lx - w / 2;
      s += '<rect class="a-edge-bg" x="' + rx + '" y="' + (e.ly - 13) + '" width="' + w + '" height="18" rx="3"/>';
      s += '<text x="' + e.lx + '" y="' + e.ly + '" text-anchor="' + anchor + '">' + e.label + "</text>";
    }
    return s + "</g>";
  }

  /**
   * opts = { highlight: ["sre", "e-alert", ...], caption: "図の説明" }
   */
  function arch(opts) {
    opts = opts || {};
    var hl = opts.highlight || [];
    var focus = hl.length > 0;
    var uid = "arch" + ++seq;
    var on = function (id) { return hl.indexOf(id) >= 0; };

    var svg =
      '<svg viewBox="0 0 960 584" role="img" aria-labelledby="' + uid + '-t" aria-describedby="' + uid + '-d" focusable="false">' +
      '<title id="' + uid + '-t">contoso-shop と SRE Agent の構成図</title>' +
      '<desc id="' + uid + '-d">本番の EC サイトを構成する App Service、Azure SQL Database、Application Insights、Log Analytics、Azure Monitor と、それらにつながる Azure SRE Agent、GitHub、Teams の関係を示した図です。図の下の「図の内容を文章で読む」に同じ内容があります。</desc>' +
      "<defs>" +
      '<marker id="' + uid + '-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="#6b747e"/></marker>' +
      '<marker id="' + uid + '-arrow-on" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="#0b5cad"/></marker>' +
      "</defs>";

    ZONES.forEach(function (z) {
      svg += '<rect class="a-zone" x="' + z.x + '" y="' + z.y + '" width="' + z.w + '" height="' + z.h + '" rx="8"/>';
      svg += '<text class="a-zone-label" x="' + (z.x + 12) + '" y="' + (z.y + 20) + '">' + z.label + "</text>";
    });
    NODES.forEach(function (n) { if (!n.inner) svg += nodeSvg(n, on(n.id)); });
    NODES.forEach(function (n) { if (n.inner) svg += nodeSvg(n, on(n.id)); });
    EDGES.forEach(function (e) { svg += edgeSvg(e, on(e.id), uid); });
    svg += "</svg>";

    // 図と同じ内容を文章でも読めるようにする
    var list =
      "<h3 style=\"font-size:.95rem;margin:8px 0 4px\">部品</h3><ul>" +
      NODES.map(function (n) {
        return "<li><strong>" + n.kind + " " + n.title + "</strong>：" + n.text + (on(n.id) ? "<strong>（強調中）</strong>" : "") + "</li>";
      }).join("") +
      "</ul><h3 style=\"font-size:.95rem;margin:8px 0 4px\">つながり</h3><ul>" +
      EDGES.map(function (e) { return "<li>" + EDGE_TEXT[e.id] + (on(e.id) ? "<strong>（強調中）</strong>" : "") + "</li>"; }).join("") +
      "</ul>";

    return (
      '<figure class="arch' + (focus ? " is-focus" : "") + '">' +
      '<div class="arch__scroll" tabindex="0" role="group" aria-label="構成図（横にスクロールできます）">' + svg + "</div>" +
      (focus ? '<ul class="arch-legend"><li><svg width="26" height="10" aria-hidden="true"><line x1="0" y1="5" x2="26" y2="5" stroke="#0b5cad" stroke-width="3"/></svg> 青い太線：このステップで使う部分</li><li>灰色の箱・点線の矢印：今回は使わない部分</li></ul>' : "") +
      (opts.caption ? "<figcaption>" + opts.caption + "</figcaption>" : "") +
      '<details class="data-alt"><summary>図の内容を文章で読む</summary>' + list + "</details>" +
      "</figure>"
    );
  }

  /* ---- 構成図をダイアログで大きく表示する ---- */
  var dialog, opener;

  function openArch(highlight, heading, caption) {
    if (!dialog) {
      dialog = document.createElement("dialog");
      dialog.className = "arch-dialog";
      dialog.setAttribute("aria-labelledby", "arch-dialog-title");
      document.body.appendChild(dialog);
      dialog.addEventListener("close", function () { if (opener && opener.isConnected) opener.focus(); });
      dialog.addEventListener("click", function (e) {
        if (e.target === dialog || e.target.closest("[data-arch-close]")) dialog.close();
      });
    }
    opener = document.activeElement;
    dialog.innerHTML =
      '<div class="arch-dialog__head"><h2 id="arch-dialog-title">' + heading + '</h2><button type="button" class="btn btn--small" data-arch-close>閉じる</button></div>' +
      '<div class="arch-dialog__body">' + arch({ highlight: highlight, caption: caption }) + "</div>";
    dialog.showModal();
    dialog.querySelector("[data-arch-close]").focus();
  }

  Lab.arch = arch;
  Lab.openArch = openArch;
})();
