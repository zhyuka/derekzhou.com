  /* ---------------- the camera's near course: the guard's ---------------- */

  /* from now, a sample every GSTEP s to GUARD_T's last: the engine's own forecast on a channel of its own (HOST.ahead
     on 1: the birds' planner keeps 0), or, without one, the camera's present turn, pitch and roll carried on as they
     go (its last quarter second's rates) */
  var GSTEP = 0.5, GN = 13;
  var GV = { yaw: new Float64Array(GN + 1), pitch: new Float64Array(GN + 1), roll: new Float64Array(GN + 1), x: new Float64Array(GN + 1), y: new Float64Array(GN + 1), z: new Float64Array(GN + 1), n: 0, t0: 0, step: GSTEP, end: 1e9 }, GVT = -1;
  var CH = { t: new Float64Array(32), yaw: new Float64Array(32), pitch: new Float64Array(32), roll: new Float64Array(32), n: 0, i: 0 };
  function camHistory(C) {   // (every step: the camera's yaw, pitch and roll, for the course carried on)
    var i = CH.i; CH.t[i] = t; CH.yaw[i] = FL.view; CH.pitch[i] = C.pitch; CH.roll[i] = C.roll || 0;
    CH.i = (i + 1) % 32; CH.n = Math.min(CH.n + 1, 32);
  }
  /* (the engine's forecast is the guard's main cost: one serves every flight for GUARD_FC s, read from its own start) */
  var GUARD_FC = 0.2;
  function guardCourse() {
    if (t - GVT < GUARD_FC && t >= GVT) return GV.n > 0;
    GVT = t; GV.n = 0;
    if (HOST.aheadCh >= 2 && !FORCED) { HOST.ahead(true, GN, GSTEP, GV, 1); work += GV.n * AHEAD_COST; if (GV.n > 1) return true; }
    if (CH.n < 2) return false;
    var a = (CH.i + 31) % 32, b = (CH.i + 32 - Math.min(CH.n, 16)) % 32, dt = CH.t[a] - CH.t[b], k;
    if (!(dt > 0)) return false;
    var ry = angDiff(CH.yaw[a], CH.yaw[b]) / dt, rp = (CH.pitch[a] - CH.pitch[b]) / dt, rr = (CH.roll[a] - CH.roll[b]) / dt;
    for (k = 0; k < GN; k++) { GV.yaw[k] = CH.yaw[a] + ry * k * GSTEP; GV.pitch[k] = CH.pitch[a] + rp * k * GSTEP; GV.roll[k] = CH.roll[a] + rr * k * GSTEP; }
    GV.n = GN; GV.t0 = t;
    return true;
  }
  /* (round 3) the course with the view held (the hold): the camera's present turn (its last quarter second) eased out at
     the engine's calm slew, its pitch and roll as they are; and whether its turn now is the calm's own (no faster than
     the calm's rate and a little: not a cloud's way round, a solid's, nor the visitor's hand), which a hold does stop */
  var GH = { yaw: new Float64Array(GN + 1), pitch: new Float64Array(GN + 1), roll: new Float64Array(GN + 1), n: 0 }, GC = GV;
  var GT = { yaw: new Float64Array(GN + 1), pitch: new Float64Array(GN + 1), roll: new Float64Array(GN + 1), n: 0 };
  var HOLD = { until: -1e9, on: 0, req: 0, rest: -1e9, w0: 0, spared: 0, refused: 0 };
  /* the camera's turn now (rad/s, its last quarter second; NaN without a history) */
  function camRate() {
    if (CH.n < 2) return NaN;
    var a = (CH.i + 31) % 32, b = (CH.i + 32 - Math.min(CH.n, 16)) % 32, dt = CH.t[a] - CH.t[b];
    return dt > 0 ? angDiff(CH.yaw[a], CH.yaw[b]) / dt : NaN;
  }
  /* a course from the camera as it is now, its turn eased at the engine's calm slew from its rate now to w1 (rad/s).
     (world5 E0 Fix 2) A hold stops the turn, never the pitch or the roll: they follow the engine's own forecast (GV),
     from where they are now. Held at their present values, a pitch the autopilot was raising read as clear, the hold
     was asked for again and again, and the view, pitching up, carried ABOVE s7's skein down onto the lettered name's
     margin at 30 px/s for 2 s before the guard let it go (its birds stepped back at the words, 255.6 s) */
  function gvAt(arr, h) {
    if (GV.n < 2) return NaN;
    var f = clamp((h + t - GVT) / GSTEP, 0, GV.n - 1), i = Math.min(Math.floor(f), GV.n - 2), a = f - i;
    return arr[i] + (arr[i + 1] - arr[i]) * a;
  }
  function easedCourse(G, w1) {
    var a = (CH.i + 31) % 32, w = camRate(), sl = HOLD_SLEW * DEG, k, h, y = 0, wk = w, dh = GSTEP / 4, q, p0 = gvAt(GV.pitch, 0), r0 = gvAt(GV.roll, 0), gp, gr;
    if (w !== w) return false;
    G.yaw[0] = CH.yaw[a]; G.pitch[0] = CH.pitch[a]; G.roll[0] = CH.roll[a];
    for (k = 1; k < GN; k++) {
      for (q = 0; q < 4; q++) { wk += clamp(w1 - wk, -sl * dh, sl * dh); y += wk * dh; }
      gp = gvAt(GV.pitch, k * GSTEP); gr = gvAt(GV.roll, k * GSTEP);
      G.yaw[k] = CH.yaw[a] + y; G.pitch[k] = CH.pitch[a] + (gp === gp && p0 === p0 ? gp - p0 : 0); G.roll[k] = CH.roll[a] + (gr === gr && r0 === r0 ? gr - r0 : 0);
    }
    G.n = GN;
    return true;
  }
  function heldCourse() {
    var w = camRate();
    if (!(Math.abs(w) <= 1.5 * calmBase() + 0.1 * DEG)) return false;   // (turning faster than the calm lets it: not the autopilot's own turn, which is all a hold stops)
    return easedCourse(GH, 0);
  }
  /* (held) the turn resumed: back to the rate it had when the hold began */
  function turnCourse() { return easedCourse(GT, HOLD.w0); }
  /* clear of the words (and over the floor) through GUARD_T on a course */
  function clearOn(F, tau, G) { GC = G; var r = guardRun(F, tau, false), ok = r.gap >= 0 && !r.floor; GC = GV; return ok; }
  /* would holding the view bring another flight into the words, one its turn keeps clear? */
  function holdHarms(F0) {
    for (var i = 0; i < flights.length; i++) {
      var G = flights[i], tg = t - G.t0;
      if (G === F0 || G.gone || G.place || G.still || G.soar || G.away || tg < -LEAD - 1) continue;
      if (!clearOn(G, tg, GH) && clearOn(G, tg, GV)) return true;
    }
    return false;
  }
  /* the view for a flight h s from now, on the guard's course (GC: the engine's forecast, GV; or the held one, GH) */
  function viewAtG(F, h) {
    var G = GC, f = clamp((h + (G === GV ? t - GVT : 0)) / GSTEP, 0, G.n - 1), i = Math.min(Math.floor(f), G.n - 2), a = f - i, d, p, r;
    if (G.n < 2) { i = 0; a = 0; }
    d = angDiff(G.yaw[i] + (G.n > 1 ? angDiff(G.yaw[i + 1], G.yaw[i]) * a : 0), F.yaw);
    p = G.pitch[i] + (G.n > 1 ? (G.pitch[i + 1] - G.pitch[i]) * a : 0);
    r = G.roll[i] + (G.n > 1 ? (G.roll[i + 1] - G.roll[i]) * a : 0);
    if (p !== p) p = Math.atan2(cam.s, cam.c);
    PV.cd = Math.cos(d); PV.sd = Math.sin(d); PV.ct = Math.cos(p); PV.st = Math.sin(p); PV.cr = Math.cos(r); PV.sr = Math.sin(r); PV.k = -1;
  }
  /* how far an ink box is from the words' margins (px; < 0: inside one), and which way is out: -1 up, 1 down */
  var WG = { g: 0, side: 0 };
  function wordsGap(x, y, hw, hh) {
    var gmin = Infinity, i, o, dx, dy, g;
    WG.side = 0;
    for (i = 0; i < words.length; i++) {
      o = words[i];
      dx = Math.max(o.l - x - hw, x - hw - o.r, 0); dy = Math.max(o.t - y - hh, y - hh - o.b, 0);
      g = Math.sqrt(dx * dx + dy * dy) - o.m;
      if (g < gmin) { gmin = g; WG.side = y < (o.t + o.b) / 2 ? -1 : 1; }
    }
    WG.g = gmin;
    return gmin;
  }

