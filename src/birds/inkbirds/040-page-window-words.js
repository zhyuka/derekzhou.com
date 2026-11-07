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

  /* edges: 1 left, 2 right, 4 top, 8 bottom — the ones a flight crosses */
  function inView(x, y, hw, hh) { return x + hw > 0 && x - hw < W && y + hh > 0 && y - hh < H; }
