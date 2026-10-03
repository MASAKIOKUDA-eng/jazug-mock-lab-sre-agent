/* 依存ライブラリなしの小さな折れ線グラフ（SVG） */
(function () {
  "use strict";

  /**
   * opts = {
   *   title, unit, labels: ["18:00", ...],
   *   values: [数値 or null],        実線
   *   future: [数値 or null],        点線（このままだとどうなるか）
   *   max, threshold, thresholdLabel,
   *   markers: [{ index, label }],
   *   color: "var(--chart-1)", labelEvery: 3
   * }
   */
  function chart(opts) {
    var W = 640, H = 180, padL = 48, padR = 12, padT = 14, padB = 24;
    var iw = W - padL - padR, ih = H - padT - padB;
    var n = opts.labels.length;
    var max = opts.max;
    var color = opts.color || "var(--chart-1)";
    var every = opts.labelEvery || 3;

    function x(i) { return padL + (n === 1 ? 0 : (iw * i) / (n - 1)); }
    function y(v) { return padT + ih - (ih * Math.min(v, max)) / max; }

    function path(values) {
      var d = "", pen = false;
      values.forEach(function (v, i) {
        if (v == null) { pen = false; return; }
        d += (pen ? "L" : "M") + x(i).toFixed(1) + "," + y(v).toFixed(1);
        pen = true;
      });
      return d;
    }

    var svg = '<svg viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="' + opts.title + 'の推移">';

    // 横の目盛り線
    for (var g = 0; g <= 4; g++) {
      var gv = (max * g) / 4;
      var gy = y(gv);
      svg += '<line class="grid" x1="' + padL + '" x2="' + (W - padR) + '" y1="' + gy + '" y2="' + gy + '"/>';
      svg += '<text x="' + (padL - 6) + '" y="' + (gy + 3) + '" text-anchor="end">' + formatNum(gv) + "</text>";
    }

    // 時刻ラベル
    opts.labels.forEach(function (lb, i) {
      if (i % every !== 0 && i !== n - 1) return;
      svg += '<text x="' + x(i) + '" y="' + (H - 6) + '" text-anchor="middle">' + lb + "</text>";
    });

    if (opts.threshold != null) {
      var ty = y(opts.threshold);
      svg += '<line class="thr" x1="' + padL + '" x2="' + (W - padR) + '" y1="' + ty + '" y2="' + ty + '"/>';
      svg += '<text class="thr-label" x="' + (padL + 4) + '" y="' + (ty - 4) + '">' + (opts.thresholdLabel || "しきい値") + "</text>";
    }

    (opts.markers || []).forEach(function (m, k) {
      var mx = x(m.index);
      svg += '<line class="marker" x1="' + mx + '" x2="' + mx + '" y1="' + padT + '" y2="' + (padT + ih) + '"/>';
      // 右端に近いラベルは線の左側に出して、はみ出さないようにする
      var right = mx > W * 0.72;
      svg += '<text class="marker-label" x="' + (right ? mx - 4 : mx + 4) + '" y="' + (padT + 12 + k * 14) + '"' + (right ? ' text-anchor="end"' : "") + ">" + m.label + "</text>";
    });

    if (opts.values) {
      var d = path(opts.values);
      // 実線の下を薄く塗る
      var last = lastIndex(opts.values), first = firstIndex(opts.values);
      if (last > first) {
        svg += '<path class="area" fill="' + color + '" d="' + d + "L" + x(last) + "," + (padT + ih) + "L" + x(first) + "," + (padT + ih) + 'Z"/>';
      }
      svg += '<path class="line" stroke="' + color + '" d="' + d + '"/>';
    }
    if (opts.future) {
      svg += '<path class="line line--future" stroke="' + color + '" d="' + path(opts.future) + '"/>';
    }

    svg += "</svg>";

    return (
      '<figure class="chart">' +
      '<figcaption class="chart__title"><span>' + opts.title + "</span><span>単位: " + opts.unit + "</span></figcaption>" +
      svg +
      "</figure>"
    );
  }

  function firstIndex(a) { for (var i = 0; i < a.length; i++) if (a[i] != null) return i; return -1; }
  function lastIndex(a) { for (var i = a.length - 1; i >= 0; i--) if (a[i] != null) return i; return -1; }
  function formatNum(v) { return v >= 1000 ? (v / 1000).toFixed(v % 1000 ? 1 : 0) + "k" : String(Math.round(v)); }

  window.Lab.chart = chart;
})();
