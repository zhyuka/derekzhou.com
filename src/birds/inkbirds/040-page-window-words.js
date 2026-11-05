  /* ---------------- the page: the window and the words (the engine's measure of them) ---------------- */

  var W = 0, H = 0, words = [], dirty = true, stackB = 0, stackT = 0, view = 1, VW = {};
  var MPU = 0.13;              // m an air unit (px at nearness 1): B_SPAN over a mid bird's span in air units
  function measure() {
    HOST.view(VW);
    W = VW.cssW; H = VW.cssH;
    view = clamp(Math.pow(Math.min(W, 1.6 * H) / 1100, 0.4), 0.72, 1.12);   // a small window shows its birds a little smaller
    MPU = B_SPAN / (SPAN * view);
    words = [];
    var w = HOST.words(), b = w.boxes, k = 1 / (VW.bdpr || VW.dpr || 1), l = Infinity, t = Infinity, r = -Infinity, bo = -Infinity, i;
    for (i = 0; i < 3; i++) if (b[i * 4 + 2] > b[i * 4]) { l = Math.min(l, b[i * 4] * k); t = Math.min(t, b[i * 4 + 1] * k); r = Math.max(r, b[i * 4 + 2] * k); bo = Math.max(bo, b[i * 4 + 3] * k); }
    if (r > l) { keep({ left: l, top: t, right: r, bottom: bo }, WORDS); stackB = bo; stackT = t; }   // (the name, bio and credit: the live .stack)
    else { stackB = stackT = 0; }
    for (i = 3; i < 5; i++) keep({ left: b[i * 4] * k, top: b[i * 4 + 1] * k, right: b[i * 4 + 2] * k, bottom: b[i * 4 + 3] * k }, LINKS);
    dirty = false;
  }
  /* the window or the words changed since they were measured (no garbage a step: numbers compared in place) */
  var WK = new Float64Array(22);
  function changed() {
    HOST.view(VW);
    var b = HOST.words().boxes, ch = WK[20] !== VW.cssW || WK[21] !== VW.cssH, i, v;
    for (i = 0; i < 20; i++) { v = Math.round(b[i]); if (WK[i] !== v) { WK[i] = v; ch = true; } }
    WK[20] = VW.cssW; WK[21] = VW.cssH;
    return ch;
  }
  function keep(r, m) { if (r.right > r.left && r.bottom > r.top) words.push({ l: r.left, t: r.top, r: r.right, b: r.bottom, m: m }); }

  function across(A) { return clamp(A[0] + (W - 390) * (A[1] - A[0]) / 1050, A[0], A[1]); }
  function topSpeed() { return Math.min(SPEED[1], W / across(CROSS)); }
  /* the page's calm: a bird's wild pace (px/s) times this */
  function calmOf() { return W / across(CALM) / (SPAN * view * REF); }
  /* a speed eased under a ceiling: as it is below KNEE of it, and ever closer to it above */
  function soft(v, top) { var k = KNEE * top; return v <= k ? v : k + (top - k) * (1 - Math.exp(-(v - k) / (top - k))); }
  function maxFlights() { var LCm = LIFE[skyCls()]; return (W >= WIDE ? FLIGHTS[1] : FLIGHTS[0]) - (LCm ? LCm.fewer : 0) - (placeSeen ? 1 : 0) - (STG.inView && !(STG.cur && STG.cur.place) ? 1 : 0); }   // (birds3d: and one fewer while a stage is in view)   // (one fewer while a place's thermal is seen)

  /* the ink box (x ± hw, y ± hh) keeps its margin from every word box
     (a flight already flying, when the page moves, half of it) */
  var held = 1;
  function clearOfWords(x, y, hw, hh) {
    for (var i = 0, o, m; i < words.length; i++) {
      o = words[i]; m = o.m * held;
      if (x + hw > o.l - m && x - hw < o.r + m && y + hh > o.t - m && y - hh < o.b + m) return false;
    }
    return true;
  }
  /* edges: 1 left, 2 right, 4 top, 8 bottom — the ones a flight crosses */
  function inView(x, y, hw, hh) { return x + hw > 0 && x - hw < W && y + hh > 0 && y - hh < H; }
  function withinEdges(x, y, hw, hh, e) {
    return (e & 1 || x - hw >= EDGE) && (e & 2 || x + hw <= W - EDGE) &&
           (e & 4 || y - hh >= EDGE) && (e & 8 || y + hh <= H - EDGE);
  }
  /* open sky round the ink box: to the nearest word box, and to the edges the flight does not cross */
  function room(x, y, hw, hh, e) {
    var g = ROOMY, i, o, dx, dy;
    for (i = 0; i < words.length; i++) {
      o = words[i];
      dx = Math.max(o.l - x - hw, x - hw - o.r, 0);
      dy = Math.max(o.t - y - hh, y - hh - o.b, 0);
      g = Math.min(g, Math.sqrt(dx * dx + dy * dy));
    }
    if (!(e & 1)) g = Math.min(g, x - hw);
    if (!(e & 2)) g = Math.min(g, W - x - hw);
    if (!(e & 4)) g = Math.min(g, y - hh);
    if (!(e & 8)) g = Math.min(g, H - y - hh);
    return g;
  }

  /* the heights a level crossing can hold its centre at, the flight
     reaching lo above it and hi below it: the window's height less EDGE,
     less every word box's height (grown by its margin) and every other
     flight's band, as a list of [from, to] intervals */
  function openBands(lo, hi) {
    var out = [[EDGE + lo, H - EDGE - hi]], i, j, o, a, b, next, cut = words.map(function (o) { return [o.t - o.m - BANDSLACK, o.b + o.m + BANDSLACK]; });   // (round 3: and the course's slack up and down)
    for (i = 0; i < flights.length; i++) if (!flights[i].away) cut.push([flights[i].yLo - BAND_GAP, flights[i].yHi + BAND_GAP]);   // one flight to a band (round 3: but one the view has turned from)
    for (i = 0; i < cut.length; i++) {
      o = cut[i]; a = o[0] - hi; b = o[1] + lo;           // a centre in (a, b) puts the flight on the words' line, or in another's band
      next = [];
      for (j = 0; j < out.length; j++) {
        if (out[j][1] <= a || out[j][0] >= b) next.push(out[j]);
        else {
          if (out[j][0] < a) next.push([out[j][0], a]);
          if (out[j][1] > b) next.push([b, out[j][1]]);
        }
      }
      out = next;
    }
    return out.filter(function (v) { return v[1] > v[0]; });
  }
  /* how much of the window's height is open for a level crossing */
  function openSky() { return openBands(12, 12).reduce(function (a, b) { return a + b[1] - b[0]; }, 0); }
  /* the words stand between two flights wherever the two share heights (on
     a phone turned sideways, one flight each side of them): no train */
  function between(A, B) {
    var lo = Math.max(A.yLo, B.yLo, 0), hi = Math.min(A.yHi, B.yHi, H), i, o;
    if (A.xLo > B.xLo) { o = A; A = B; B = o; }
    for (i = 0; i < words.length; i++) {
      o = words[i];
      if (o.l >= A.xHi && o.r <= B.xLo && o.t - o.m - BAND_GAP <= lo && o.b + o.m + BAND_GAP >= hi) return true;
    }
    return false;
  }
  /* a height in those bands, u of the way through their total length */
  function inBands(B, u) {
    var tot = 0, i;
    for (i = 0; i < B.length; i++) tot += B[i][1] - B[i][0];
    u *= tot;
    for (i = 0; i < B.length; i++) { if (u <= B[i][1] - B[i][0]) return B[i][0] + u; u -= B[i][1] - B[i][0]; }
    return null;
  }

