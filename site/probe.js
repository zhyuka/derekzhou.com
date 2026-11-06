/* PREVIEW ONLY (a claude/wk-probe-* branch, never main): the boot's timing readout, for a screenshot on a real iPhone.
   The world calls self.PROBE(name, ms[, info]) at its boot marks, at a failure and at the show. */
(function () {
  var LABEL = 'main (live today)';
  var after = [], M = [], fcp = -1, last = -1, maxGap = 0, longs = [], shown = -1, info = null, fails = [], el = null, done = false;
  self.PROBE = function (name, t, x) {
    if (name === 'shown') { if (shown < 0) { shown = t; info = x || null; } return; }
    if (name.indexOf('fail: ') === 0) { if (fails.length < 4) fails.push(name.slice(6, 90)); if (name.indexOf('fail: declined') === 0) { done = true; setTimeout(draw, 0); } return; }
    M.push([name, t]);
  };
  try { new PerformanceObserver(function (l) { l.getEntries().forEach(function (e) { if (e.name === 'first-contentful-paint') fcp = e.startTime; }); }).observe({ type: 'paint', buffered: true }); } catch (e) {}
  function raf() {
    var n = performance.now();
    if (last >= 0) { var g = n - last; if (g > maxGap) maxGap = g; if (g > 100) longs.push([last, g]); if (shown >= 0 && n - shown > 2000) after.push(g); }
    last = n;
    if (shown >= 0 && n - shown > 10000) { done = true; draw(); return; }
    requestAnimationFrame(raf);
  }
  requestAnimationFrame(raf);
  function at(pre) { for (var i = 0; i < M.length; i++) if (M[i][0].indexOf(pre) === 0) return M[i][1]; return -1; }
  function f(t) { return t < 0 ? '   --' : (t / 1000).toFixed(2) + ' s'; }
  function draw() { try { draw1(); } catch (e) {} }
  function draw1() {
    if (!document.body || typeof document.body.appendChild !== 'function') return;
    if (!el) {
      el = document.createElement('pre'); var s = el.style;
      s.position = 'fixed'; s.left = '6px'; s.top = '6px'; s.zIndex = '2147483647'; s.margin = '0'; s.padding = '6px 8px';
      s.font = '11px/1.35 ui-monospace, Menlo, monospace'; s.color = '#fff'; s.background = 'rgba(0,0,0,0.78)'; s.pointerEvents = 'none';
      s.whiteSpace = 'pre'; s.borderRadius = '4px'; s.maxWidth = 'calc(100vw - 12px)'; s.overflow = 'hidden';
      document.body.appendChild(el);
    }
    var n = performance.now(), L = [];
    var ua = navigator.userAgent || '', br = /LinkedInApp/.test(ua) ? 'LinkedIn app' : /CriOS/.test(ua) ? 'Chrome (iOS)' : /FxiOS/.test(ua) ? 'Firefox (iOS)' : /EdgiOS/.test(ua) ? 'Edge (iOS)' : (/Version\/[\d.]+.*Safari\//.test(ua) ? 'Safari' : 'in-app browser');
    var rm = false; try { rm = matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}
    L.push('PREVIEW ' + LABEL + (done ? '  (final)' : '  (running ' + f(n) + ')'));
    L.push(br + ', ' + (navigator.hardwareConcurrency || '?') + ' cores' + (rm ? ', REDUCED MOTION' : '') + ', ' + innerWidth + 'x' + innerHeight + '@' + (devicePixelRatio || 1));
    L.push('first paint     ' + f(fcp));
    L.push('boot start      ' + f(at('start: run')));
    L.push('links issued    ' + f(at('start: issued')));
    L.push('links done      ' + f(at('C done')));
    L.push('first draws     ' + f(at('F warmed')));
    L.push('world ready     ' + f(at('D world ready')));
    L.push('WORLD SHOWN     ' + f(shown));
    var tot = 0; for (var i = 0; i < longs.length; i++) tot += longs[i][1];
    L.push('long frames     ' + longs.length + ' over 100 ms, ' + (tot / 1000).toFixed(2) + ' s in all');
    L.push('longest frame   ' + (maxGap / 1000).toFixed(2) + ' s');
    var top = longs.slice().sort(function (a, b) { return b[1] - a[1]; }).slice(0, 4);
    for (var j = 0; j < top.length; j++) L.push('  at ' + f(top[j][0]) + ': ' + Math.round(top[j][1]) + ' ms');
    if (info) {
      L.push('parallel compile ext: ' + (info.par ? 'yes' : 'NO'));
      if (after.length > 10) { var a = after.slice().sort(function (x, y) { return x - y; }), md = a[a.length >> 1]; L.push('flight ' + Math.round(1000 / md) + ' fps (median frame ' + md.toFixed(1) + ' ms)'); }
      L.push('path ' + info.path + ', ' + info.progs + ' programs, ' + info.keys + ' first draws');
      if (info.q >= 0) L.push('slowest queue wait ' + Math.round(info.q) + ' ms');
      for (var k = 0; k < info.slow.length; k++) L.push('  slice ' + info.slow[k]);
      L.push(String(info.renderer).slice(0, 44));
    }
    for (var m = 0; m < fails.length; m++) L.push('FAIL ' + fails[m]);
    el.textContent = L.join('\n');
  }
  var iv = setInterval(function () { draw(); if (done) clearInterval(iv); }, 250);
})();
