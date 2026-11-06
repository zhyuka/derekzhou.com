  /* ---------------- the page: the window (the engine's measure of it) ---------------- */

  var W = 0, H = 0, dirty = true, view = 1, VW = {};
  var MPU = 0.13;              // m an air unit (px at nearness 1): B_SPAN over a mid bird's span in air units
  function measure() {
    HOST.view(VW);
    W = VW.cssW; H = VW.cssH;
    view = clamp(Math.pow(Math.min(W, 1.6 * H) / 1100, 0.4), 0.72, 1.12);   // a small window shows its birds a little smaller
    MPU = B_SPAN / (SPAN * view);
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

  function across(A) { return clamp(A[0] + (W - 390) * (A[1] - A[0]) / 1050, A[0], A[1]); }
  function topSpeed() { return Math.min(SPEED[1], W / across(CROSS)); }
  /* the page's calm: a bird's wild pace (px/s) times this */
  function calmOf() { return W / across(CALM) / (SPAN * view * REF); }
  /* a speed eased under a ceiling: as it is below KNEE of it, and ever closer to it above */
  function soft(v, top) { var k = KNEE * top; return v <= k ? v : k + (top - k) * (1 - Math.exp(-(v - k) / (top - k))); }
  function maxFlights() { var LCm = LIFE[skyCls()]; return (W >= WIDE ? FLIGHTS[1] : FLIGHTS[0]) - (LCm ? LCm.fewer : 0) - (placeSeen ? 1 : 0) - (STG.inView && !(STG.cur && STG.cur.place) ? 1 : 0); }   // (birds3d: and one fewer while a stage is in view)   // (one fewer while a place's thermal is seen)

  /* edges: 1 left, 2 right, 4 top, 8 bottom — the ones a flight crosses */
  function inView(x, y, hw, hh) { return x + hw > 0 && x - hw < W && y + hh > 0 && y - hh < H; }
  function withinEdges(x, y, hw, hh, e) {
    return (e & 1 || x - hw >= EDGE) && (e & 2 || x + hw <= W - EDGE) &&
           (e & 4 || y - hh >= EDGE) && (e & 8 || y + hh <= H - EDGE);
  }
  /* open sky round the ink box: to the edges the flight does not cross */
  function room(x, y, hw, hh, e) {
    var g = ROOMY;
    if (!(e & 1)) g = Math.min(g, x - hw);
    if (!(e & 2)) g = Math.min(g, W - x - hw);
    if (!(e & 4)) g = Math.min(g, y - hh);
    if (!(e & 8)) g = Math.min(g, H - y - hh);
    return g;
  }

  /* the heights a level crossing can hold its centre at, the flight
     reaching lo above it and hi below it: the window's height less EDGE
     and every other flight's band, as a list of [from, to] intervals */
  function openBands(lo, hi) {
    var out = [[EDGE + lo, H - EDGE - hi]], i, j, o, a, b, next, cut = [];
    for (i = 0; i < flights.length; i++) if (!flights[i].away) cut.push([flights[i].yLo - BAND_GAP, flights[i].yHi + BAND_GAP]);   // one flight to a band (round 3: but one the view has turned from)
    for (i = 0; i < cut.length; i++) {
      o = cut[i]; a = o[0] - hi; b = o[1] + lo;           // a centre in (a, b) puts the flight in another's band
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
  /* a height in those bands, u of the way through their total length */
  function inBands(B, u) {
    var tot = 0, i;
    for (i = 0; i < B.length; i++) tot += B[i][1] - B[i][0];
    u *= tot;
    for (i = 0; i < B.length; i++) { if (u <= B[i][1] - B[i][0]) return B[i][0] + u; u -= B[i][1] - B[i][0]; }
    return null;
  }

