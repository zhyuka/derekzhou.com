  /* ---------------- the guard: each flight a few seconds ahead ---------------- */

  /* a flight through the guard's course (GUARD_T): how long its birds would slide backward on the window against the
     way they face (GBACK: its share of the course, and the sweep against it), and its pace there */
  var GR = { back: 0, sweep: 0, own: 0, slow: 0, fast: 0, w: 0, o: 0, n: 0 }, gq = {}, gq2 = {};
  function guardRun(F, tau, withBack) {
    var i, j, m, h, d, hw, hh, n, prevX = GPX, prevOk = GPOK, nb = 0, nbk = 0, sw = 0, ow = 0, ns = 0, nf = 0, wsum = 0, osum = 0, nsum = 0, pmax = paceMax();
    GR.back = 0; GR.sweep = 0; GR.own = 0; GR.slow = 0; GR.fast = 0; GR.w = 0; GR.o = 0; GR.n = 0;
    for (j = 0; j < F.m.length; j++) GPOK[j] = 0;
    for (i = 0; i < GUARD_T.length; i++) {
      h = GUARD_T[i];
      viewAtG(F, h);
      for (j = 0; j < F.m.length; j++) {
        m = F.m[j]; d = m.d;
        spot(F, m, tau + h, gq);
        projV(gq.ax, gq.ay, gq.az, pv);
        n = pv.n;
        if (!(n > 0) || fadeOf(n) < 0.05) { GPOK[j] = 0; continue; }
        hw = d.hw * n; hh = (d.hh + BOB * d.span) * n;
        if (!inView(pv.x, pv.y, hw, hh)) { GPOK[j] = 0; continue; }
        if (withBack && h <= 2.01) {
          /* its window motion since the last sample, and its own (the view held): backward against its facing? */
          if (GPOK[j]) {
            spot(F, m, tau + h - 0.25, gq2); projV(gq2.ax, gq2.ay, gq2.az, pv2);
            var ox = (pv.x - pv2.x) / 0.25, oy = (pv.y - pv2.y) / 0.25, dh = h - prevX[3 * j + 2], wx = (pv.x - prevX[3 * j]) / dh, wy = (pv.y - prevX[3 * j + 1]) / dh,
                face = m.s ? m.s.face : (ox < 0 ? -1 : 1), ws = Math.sqrt(wx * wx + wy * wy);
            if (Math.abs(ox) > 1) face = ox < 0 ? -1 : 1;
            nb++;
            if (wx * face < -BACK_PX) { nbk++; sw += Math.abs(wx - ox); ow += Math.abs(ox); }
            if (fadeOf(n) > 0.3) { if (ws < SLOW_SEEN) ns++; if (ws > pmax) nf++; wsum += ws; osum += Math.sqrt(ox * ox + oy * oy); nsum += n; }
          }
          GPOK[j] = 1; prevX[3 * j] = pv.x; prevX[3 * j + 1] = pv.y; prevX[3 * j + 2] = h;
        }
      }
    }
    GR.back = nb ? nbk / nb : 0; GR.sweep = nbk ? sw / nbk : 0; GR.own = nbk ? ow / nbk : 0;
    GR.slow = nb ? ns / nb : 0; GR.fast = nb ? nf / nb : 0; GR.w = nb ? wsum / nb : 0; GR.o = nb ? osum / nb : 0; GR.n = nb ? nsum / nb : 0;
    return GR;
  }
  var GPX = new Float64Array(3 * MAXP), GPOK = new Uint8Array(MAXP), GLOG = null;   // (GLOG, development: the guard's findings, when asked)

  /* once a flight is in the sky (each, every GUARD_EVERY steps, on a step of its own): ahead GUARD_T, would its birds
     hang or race on the window (its pace eased), or slide backward on the window, the view turning against them
     faster than they fly, for most of the next two seconds? Then the flight wheels round toward the turn (WHEEL deg/s in the air, banked as it turns, by way
     of the distance: no bird loomed at), so it flies with it; a flight wheels at most once in WHEEL_GAP s */
  function guard(F) {
    var tau = t - F.t0, r, s, st, L;
    if (F.gone || F.place || F.still || F.soar || F.stage || tau < -LEAD - 1) return;   // (birds3d: a staged flight is planned whole on the held course)   // (past its planned span too: a turn the course did not foresee may keep it in view)
    /* (round 3) not while the visitor drags the view: their sweep is their own, and every flight flies on through it */
    if (sweepNow() > DRAG_PX) return;
    if (!guardCourse()) return;
    r = guardRun(F, tau, true);
    STATS.guard.n++;
    if (GLOG && r.back > 0) GLOG.push({ t: +t.toFixed(2), id: F.id, kind: F.kind, back: +r.back.toFixed(2), sweep: +r.sweep.toFixed(1), own: +r.own.toFixed(1), gv: GV.n });
    /* (round 3) its pace on the window: a turn the course did not foresee can leave a flight all but hanging there (its
       own way cancelled by the land's sweep: its drift then turns it this way and that) or racing; it flies a little
       faster or slower against the land, eased over ACC_T (never past a third over its kind's calm pace nor the calm's
       own bounds on looming, receding and turning, nor under half its pace) */
    if (r.n > 0 && !(t - (F.accT || -1e9) < ACC_GAP)) {
      var vNow = F.v + accelV(F, tau), dv = 0;
      var calmW = Math.max(SLOW_SEEN * 1.6, 0.75 * F.vPx * r.n / F.n0);   // (the window pace it was planned at, where it is now)
      if ((r.slow >= 0.5 || r.w < 0.6 * calmW) && r.o > r.w) dv = Math.min((calmW - r.w) / r.n, Math.min(1.33 * F.vw, F.vLim || Infinity) - vNow);
      else if (r.fast >= 0.5) dv = Math.max(-(r.w - 0.85 * paceMax()) / r.n, 0.5 * F.vw - vNow);
      if (Math.abs(dv) > 0.05 * F.vw) { accel(F, tau, dv); F.accT = t; STATS.guard.paced++; if (dv < 0) F.dur = Math.max(F.dur, tau + 30); return; }
    }
    /* sliding backward: the view's turn against it, unforeseen, faster than it flies */
    if (r.back >= GBACK && r.sweep > r.own && !(t - (F.wheeled || -1e9) < WHEEL_GAP)) {
      s = spliceAt(F, tau); st = pathState(F, s, SPS);
      var want = wheelTarget(F, st.h);
      L = Math.abs(want) * F.v / (WHEEL * DEG);
      splice(F, s, want / L, L, null, 0);
      F.wheeled = t; F.dur = Math.max(F.dur, tau + L / F.v + 20); STATS.guard.wheeled++;
    }
  }
  /* (round 3) a flight's change of pace in flight: each a smooth ramp of dv (air units/s) over ACC_T from t0 (its own
     clock), the path's arc length gaining sum dv x R(tau - t0), R the integral of the ramp (spot()) */
  function accel(F, tau, dv) { if (!F.acc) F.acc = []; F.acc.push(tau, dv); }
  function accelS(F, tau) {
    var A = F.acc, s = 0, i, x, q;
    for (i = 0; i < A.length; i += 2) { x = tau - A[i]; if (x <= 0) continue; q = x / ACC_T; s += A[i + 1] * (q < 1 ? ACC_T * (q * q * q - q * q * q * q / 2) : x - ACC_T / 2); }
    return s;
  }
  function accelV(F, tau) {
    var A = F.acc, v = 0, i, q;
    if (!A) return 0;
    for (i = 0; i < A.length; i += 2) { q = (tau - A[i]) / ACC_T; if (q > 0) v += A[i + 1] * (q < 1 ? q * q * (3 - 2 * q) : 1); }
    return v;
  }
  /* the turn (signed, radians) from heading h round to fly the other way across the window, by way of the distance (its
     heading through straight away from the eye: the bird recedes as it turns, never looms) */
  function wheelTarget(F, h) {
    var c = Math.cos(h), to = c < 0 ? 15 * DEG : Math.PI - 15 * DEG, d1 = angDiff(to, h), d2 = d1 > 0 ? d1 - TAU : d1 + TAU, mid1 = h + d1 / 2;
    return Math.sin(mid1) > 0 ? d1 : d2;   // (sin > 0: away from the eye)
  }


