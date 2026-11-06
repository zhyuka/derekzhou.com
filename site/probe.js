/* PREVIEW ONLY (a claude/wk-probe-* branch, never main): the boot's timing readout, for a screenshot on a real iPhone,
   in Safari or an app's in-app browser. The world calls self.PROBE(name, ms[, info]) at its boot marks, at a failure
   and at the show; self.PROBE.gov, once the world gives it, reads the governor. */
(function () {
  var LABEL = 'main (live today)';
  var M = [], fcp = -1, last = -1, maxGap = 0, longs = [], shown = -1, info = null, fails = [], el = null, final = false, ring = [], declined = false;
  var prev = null, nav = '?';
  try { prev = JSON.parse(sessionStorage.getItem('wkprobe') || 'null'); } catch (e) {}
  try { var ne = performance.getEntriesByType('navigation')[0]; if (ne) nav = ne.type; } catch (e) {}
  function alive() { try { sessionStorage.setItem('wkprobe', JSON.stringify({ up: performance.now(), shown: shown >= 0, at: Date.now() })); } catch (e) {} }
  function mark(n) { try { performance.mark(n); } catch (e) {} }   // (for the bench: the same moments, read exactly)
  self.PROBE = function (name, t, x) {
    if (name.indexOf('link: ') === 0 || name.indexOf('draw: ') === 0) { mark('world-' + name.replace(': ', ':')); return; }
    mark(name === 'shown' ? 'world-shown' : 'world-mark:' + name);
    if (name === 'shown') { if (shown < 0) { shown = t; info = x || null; } return; }
    if (name.indexOf('fail: ') === 0) { if (fails.length < 3) fails.push(name.slice(6, 80)); if (name.indexOf('fail: declined') === 0) declined = true; return; }
    M.push([name, t]);
  };
  try { new PerformanceObserver(function (l) { l.getEntries().forEach(function (e) { if (e.name === 'first-contentful-paint') fcp = e.startTime; }); }).observe({ type: 'paint', buffered: true }); } catch (e) {}
  function raf() {
    var n = performance.now();
    if (last >= 0) { var g = n - last; if (g > maxGap) maxGap = g; if (g > 100 && longs.length < 200) longs.push([last, g]); ring.push(g); if (ring.length > 180) ring.shift(); }
    last = n;
    if (!final && ((shown >= 0 && n - shown > 10000) || declined)) final = true;
    requestAnimationFrame(raf);
  }
  requestAnimationFrame(raf);
  function at(pre) { for (var i = 0; i < M.length; i++) if (M[i][0].indexOf(pre) === 0) return M[i][1]; return -1; }
  function f(t) { return t < 0 ? '   --' : (t / 1000).toFixed(2) + ' s'; }
  function mmss(ms) { var s = Math.floor(ms / 1000); return Math.floor(s / 60) + ':' + ('0' + (s % 60)).slice(-2); }
  function med(a) { var b = a.slice().sort(function (x, y) { return x - y; }); return b[b.length >> 1]; }
  function app(ua) {
    if (/LinkedInApp/i.test(ua)) return 'LinkedIn app';
    if (/Instagram/i.test(ua)) return 'Instagram app';
    if (/FBAN|FBAV|FB_IAB/i.test(ua)) return 'Facebook app';
    if (/musical_ly|BytedanceWebview|TikTok/i.test(ua)) return 'TikTok app';
    if (/CriOS/.test(ua)) return 'Chrome (iOS)';
    if (/FxiOS/.test(ua)) return 'Firefox (iOS)';
    if (/EdgiOS/.test(ua)) return 'Edge (iOS)';
    return /Version\/[\d.]+.*Safari\//.test(ua) ? 'Safari' : 'in-app browser (unknown app)';
  }
  function cache() {   // cold: the world's script came over the network; warm: from this browser's cache
    try {
      var r = performance.getEntriesByType('resource').filter(function (e) { return /\/world\.[0-9a-f]+\.js$/.test(e.name); })[0];
      if (!r) return '?'; if (r.transferSize === 0 && r.decodedBodySize > 0) return 'WARM (scripts from cache)';
      return r.transferSize > 0 ? 'COLD (scripts from network)' : '?';
    } catch (e) { return '?'; }
  }
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
    var n = performance.now(), L = [], ua = navigator.userAgent || '', rm = false;
    try { rm = matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}
    L.push('PREVIEW ' + LABEL + '   ' + (final ? 'BOOT FINAL' : 'booting') + ', open ' + mmss(n));
    L.push(app(ua) + ', ' + (navigator.hardwareConcurrency || '?') + ' cores, ' + innerWidth + 'x' + innerHeight + '@' + (devicePixelRatio || 1) + (rm ? ', REDUCED MOTION' : ''));
    L.push('cache ' + cache() + ', load: ' + nav);
    if (prev) L.push('this tab before: ran ' + mmss(prev.up) + (prev.shown ? ' (world shown)' : ' (world NOT shown)') + ', then ' + (nav === 'reload' ? 'RELOADED' : nav));
    L.push('first paint     ' + f(fcp));
    L.push('boot start      ' + f(at('start: run')));
    L.push('links issued    ' + f(at('start: issued')));
    L.push('links done      ' + f(at('C done')));
    L.push('first draws     ' + f(at('F warmed')));
    L.push('world ready     ' + f(at('D world ready')));
    L.push('WORLD SHOWN     ' + f(shown));
    var tot = 0; for (var i = 0; i < longs.length; i++) tot += longs[i][1];
    L.push('long frames     ' + longs.length + ' over 100 ms, ' + (tot / 1000).toFixed(2) + ' s in all; longest ' + (maxGap / 1000).toFixed(2) + ' s');
    var top = longs.slice().sort(function (a, b) { return b[1] - a[1]; }).slice(0, 3);
    for (var j = 0; j < top.length; j++) L.push('  at ' + f(top[j][0]) + ': ' + Math.round(top[j][1]) + ' ms');
    if (ring.length > 30) { var md = med(ring), fps = 1000 / md; L.push('now ' + Math.round(fps) + ' fps (median ' + md.toFixed(1) + ' ms)' + (fps > 27 && fps < 33 ? '  30 FPS CAP (Low Power Mode?)' : '')); }
    if (self.PROBE.gov) { try { var g = self.PROBE.gov(); L.push('governor: rung ' + g.rung + '/' + (g.n - 1) + ' (scale ' + (+g.scale).toFixed(2) + '), pace ' + (+g.pace).toFixed(1) + ' ms, p50 ' + (+g.p50).toFixed(1) + ' ms' + (g.dead ? ', STOPPED (still sky)' : g.running ? '' : ', loop idle')); } catch (e) {} }
    if (info) {
      L.push('path ' + info.path + ', parallel ext ' + (info.par ? 'yes' : 'NO') + ', ' + info.progs + ' programs, ' + info.keys + ' first draws');
      if (info.q >= 0) L.push('slowest queue wait ' + Math.round(info.q) + ' ms');
      for (var k = 0; k < info.slow.length; k++) L.push('  slice ' + info.slow[k]);
      L.push(String(info.renderer).slice(0, 44));
    }
    for (var m = 0; m < fails.length; m++) L.push('FAIL ' + fails[m]);
    el.textContent = L.join('\n');
    alive();
  }
  setInterval(draw, 500);
})();
