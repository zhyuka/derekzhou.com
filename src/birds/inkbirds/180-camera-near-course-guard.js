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
  /* the view for a flight h s from now, on the guard's course (GV: the engine's forecast) */
  function viewAtG(F, h) {
    var G = GV, f = clamp((h + t - GVT) / GSTEP, 0, G.n - 1), i = Math.min(Math.floor(f), G.n - 2), a = f - i, d, p, r;
    if (G.n < 2) { i = 0; a = 0; }
    d = angDiff(G.yaw[i] + (G.n > 1 ? angDiff(G.yaw[i + 1], G.yaw[i]) * a : 0), F.yaw);
    p = G.pitch[i] + (G.n > 1 ? (G.pitch[i + 1] - G.pitch[i]) * a : 0);
    r = G.roll[i] + (G.n > 1 ? (G.roll[i + 1] - G.roll[i]) * a : 0);
    if (p !== p) p = Math.atan2(cam.s, cam.c);
    PV.cd = Math.cos(d); PV.sd = Math.sin(d); PV.ct = Math.cos(p); PV.st = Math.sin(p); PV.cr = Math.cos(r); PV.sr = Math.sin(r); PV.k = -1;
  }
