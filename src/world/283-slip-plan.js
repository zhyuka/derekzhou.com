  /* the way past what stands ahead with the heading held, planned from first sight. A slip round the nearest solid
     only, seen 24 s ahead, wanting the offset still needed over the time left, is not enough: a wide mesa (DUNES:
     105-250 m across, its top 170-335 m over the camera) or a great tower's core (ABOVE: up to 186 m) needs more than
     14 deg of crab can give, and the hard rule pushes the camera along their faces for seconds (6 of 11 seeds, 81-1091
     pushes); a solid climbed only once heightTarget sees it, HT_T s off, is met too late if tall; and clouds' visible
     bodies have to be seen too.
     So every SLIP_PLAN = 0.25 s (and at once when the heading has turned) slipPlan looks SLIP_T = 90 s of flight
     ahead (at least SLIP_REACH = 1,200 m; the cells hold their solids 3.8-5.2 km out) and chooses the line to fly: an
     offset from the present line and a speed of slip, among a few dozen offsets (the line in hand, the slip stopped
     where it is, each edge of the 30 solids met soonest, a ladder) and seven speeds (SLIP_SPD x the realm's speed:
     2.3, 4.6 and 7.4 deg of crab, then 11-24 deg, the last four only to keep out of a solid's own zone: SLIP_SPDK),
     each flown in thought by the slip's own controller (slipTraj, 0.5 s a sample) and costed (slipCost) by how far it
     would pass inside a solid's own zone (SLIP_IN = 6 m about it: where the hard rule acts; SLIP_WIN a metre), inside
     its margin (avoidS's: 1.6 x the realm's for a cloud's core; SLIP_WOUT), inside a cloud's visible body (its lobes
     at the camera's height, SLIP_SOFT m about them: a cost, SLIP_WSOFT, not a wall), each the more the sooner it is
     met (SLIP_URG, SLIP_URGI: a conflict a minute off is weighed lightly, as later plans will meet it with more of the
     picture), how far it moves the line and how much crab it needs; the plan in hand is kept unless another is clearly
     better (15% and 150), so two near-equal ways never alternate. Where no single line keeps out of every solid's
     own zone, two lines are tried (the first past one of the solids met soonest, to its centre, then another: the way
     between two mesas that overlap across the line but not along it). A landmark under the ceiling is climbed over
     instead (heightTarget sees it as far off as the plan does, on the planned way: CS.climbs, with CLIMB_LEAD s in
     hand for the height's spring), but never a cloud's core (that would fly through its visible top) nor a floating
     stone above the eye (passed under or beside). At a visit's start, while the view is still wholly covered (the
     landing before its first frame), a line that would meet a solid's own zone is not flown at all: the camera is placed on the nearest
     clear line beside it (up to 420 m; never inside a solid), unseen. The slip (S.sv, m/s, + to the right) flies the chosen line
     by a controller eased at SLIP_ACC x the speed a second and braking in time (slipCtl), so its lateral acceleration
     is never over 1.05 m/s2 (the hard rule's onsets: 35-72 m/s2). The view never turns; the hard rule (pushOut) is
     untouched, the last resort.
     Two rates of easing: SLIP_ACC = 0.034 x the speed a second, so the course never swings more than 9.7 deg in 5 s
     (tan 9.7 deg = 0.034 x 5; 0.05 swings 10.2-14.0 deg on 6 of 50 seeds), and SLIP_ACC2 = 0.05 only where no plan
     eased at the first keeps out of a solid's own zone (the plan's cost there, SLIP_WIN x 0.02 and over) and one eased
     at the second does better: the plan is made at the first and, only then, again at the second (S.acc: the factor
     the plan in hand was made at). Not one rate for every plan: 0.035 slips later where it is urgent, and the hard rule
     pushes (seeds 4 and 8) */
  var SLIP_T = 90, SLIP_REACH = 1200, SLIP_SPD = [0.04, 0.08, 0.13, 0.2, 0.25, 0.35, 0.45], SLIP_SPDK = [0, 0, 0, 3000, 5000, 8000, 12000], SLIP_ACC = 0.034, SLIP_ACC2 = 0.05, SLIP_PLAN = 0.25, SLIP_DT = 0.5;
  var SLIP_IN = 6, SLIP_WIN = 1e5, SLIP_WOUT = 15, SLIP_SOFT = 8, SLIP_WSOFT = 3, SLIP_KC = 100, SLIP_URG = 15, SLIP_URGI = 20, SLIP_NC = 30, CLIMB_LEAD = 2.2;
  var SLIP_O = [], SPN = 0, SPMAX = 400, SPS = new Float64Array(SPMAX), SPSH = new Float64Array(SPMAX), SPL = new Float64Array(SPMAX), SPLH = new Float64Array(SPMAX), SPRI = new Float64Array(SPMAX), SPU = new Float64Array(SPMAX), SPUI = new Float64Array(SPMAX);
  var SPK0 = new Int32Array(SPMAX), SPK1 = new Int32Array(SPMAX), SPORD = new Int32Array(SPMAX), SPX = new Float64Array(420), SPC = new Float64Array(900);
  /* the plan's constants made once: ladders, the order's view and comparator made at every plan (four times a second)
     make the slip the frame path's largest allocator (9.9 MB in 26 s of flight); the plan allocates nothing once warm
     (the order kept by an insertion sort, stable) */
  var SLIP_LAD = [15, 30, 50, 80, 120, 170, 230, 300], SLIP_LAD2 = [20, 40, 60, 90, 120, 160, 200, 250, 300, 360, 420], SLIP_SP2 = [1, 2, 4, 6], SPKEY = new Float64Array(SPMAX);
  function slipOrder(n) {   // SPORD[0..n) by when each constraint is first met (SPS - SPSH), ascending, stable
    for (var i = 0; i < n; i++) { SPORD[i] = i; SPKEY[i] = SPS[i] - SPSH[i]; }
    for (i = 1; i < n; i++) { var o = SPORD[i], k = SPKEY[o], j = i - 1; while (j >= 0 && SPKEY[SPORD[j]] > k) { SPORD[j + 1] = SPORD[j]; j--; } SPORD[j + 1] = o; }
  }
  /* the slip's controller: toward the line still to go (e m) at the plan's speed vs, eased at a m/s2, braking so it
     stops on the line */
  function slipCtl(sv, e, vs, a, dt) {
    var want = (e < 0 ? -1 : 1) * Math.min(vs, Math.sqrt(2 * a * Math.abs(e)) * 0.85);
    return sv + clamp(want - sv, -a * dt, a * dt);
  }
  function slipAdd(sc, sh, lc, lh, ri, v) {   // (its weights by how soon it is met: a margin or a cloud's body 0.3-3.3, a solid's own zone 0.02-1.02)
    if (SPN >= SPMAX) return;
    var t = Math.max(sc - sh, 0) / v;
    SPS[SPN] = sc; SPSH[SPN] = sh; SPL[SPN] = lc; SPLH[SPN] = lh; SPRI[SPN] = ri; SPU[SPN] = 0.3 + 3 * Math.exp(-t / SLIP_URG); SPUI[SPN] = 0.02 + Math.exp(-t / SLIP_URGI); SPN++;
  }
  /* what stands on the way (from S, out to wide m more to either side): SPN constraints in the heading's frame */
  var SPOFF = 0, SLIPO = new Float64Array(3);
  /* (physics: clouds/drift) the time the way, at v along the heading, meets a thing s metres ahead that moves wh m/s
     along it: t* = s / (v - wh); behind, or outrunning the way, its place now (t* = s / v) */
  function slipMeet(s, v, wh) { var cl = v - wh; return s > 0 && cl > 0.5 ? s / cl : s / v; }
  function slipGather(V, S, wide) {
    var v = V.speed, cl = V.clear, m = V.margin || V.def.margin || 14, hx = Math.sin(S.psi), hz = Math.cos(S.psi), rx = -hz, rz = hx, i;
    var T = Math.max(SLIP_T, SLIP_REACH / v), Smax = v * T, Lmax = SLIP_SPD[SLIP_SPD.length - 1] * v * T * 0.75 + (wide || 0);
    var x0 = S.x, z0 = S.z, climbs = S.climbs || (S.climbs = []); climbs.length = 0; SPN = 0;
    // the solids: a cloud's core always passed beside; a landmark under the ceiling climbed over; the rest passed beside
    var O = nearObstaclesAt(V, x0, z0, Smax + 320, SLIP_O);
    for (i = 0; i < O.length; i++) {
      var o = O[i], ox = o.x - x0, oz = o.z - z0, s = ox * hx + oz * hz, l = ox * rx + oz * rz, mm = m * (o.cloud ? 1.6 : 1);
      if (o.w) { var mt = slipMeet(s, v, o.w[0] * hx + o.w[1] * hz); s = v * mt; l += (o.w[0] * rx + o.w[1] * rz) * mt; }   // (physics: clouds/drift: a drifting core planned where the way meets it)
      var rr = Math.max(obstR(o, S.y, mm), obstR(o, S.y + 20, mm), obstR(o, S.y - 20, mm));
      if (rr < 0 || s < -rr || s > Smax + rr || Math.abs(l) > Lmax + rr) continue;
      if (!o.cloud && (o.c || o.y <= S.y + 5) && climbOK(V, S, o, s, obstTop(o) + m)) { climbs.push(o); continue; }   // (a floating stone above the eye: passed under or beside, never climbed; climbable only under the ceiling the camera will have, climbOK)
      var ri = Math.max(obstR(o, S.y, SLIP_IN), obstR(o, S.y + 20, SLIP_IN), obstR(o, S.y - 20, SLIP_IN), 0);
      slipAdd(s, rr, l, rr, ri, v);
    }
    // the clouds' visible bodies: their lobes at the camera's height, a box on the way (a cost: kept out of when it can be)
    var L = V.cellList;
    for (var ci = 0; L && ci < L.length; ci++) {
      var C = L[ci]; if (C.st < 2 || !C.softB || !C.soft) continue;
      // (physics: clouds/drift) an air cell's bodies where the air has carried them, each planned where the way meets it:
      // the point taken back into the cell's frame, and the meeting's shift (along: the way's own; across: the air's)
      var off = cellOff(C, SIM.t, SLIPO), wv = C.air ? airW(V) : null, wh = wv ? wv[0] * hx + wv[1] * hz : 0, wr = wv ? wv[0] * rx + wv[1] * rz : 0, xc = x0 - off[0], zc = z0 - off[1];
      for (var bj = 0; bj < C.softB.length; bj++) {
        var sb = C.softB[bj], bx = sb[0] - xc, bz = sb[2] - zc, bs = bx * hx + bz * hz, bl = bx * rx + bz * rz, R = sb[3] + SLIP_SOFT;
        if (wv) { var bt = slipMeet(bs, v, wh); bl += wr * bt; bs = v * bt; }
        if (bs < -R || bs > Smax + R || Math.abs(bl) > Lmax + R || Math.abs(sb[1] + off[2] - S.y) > R) continue;
        var s0 = 1e9, s1 = -1e9, l0 = 1e9, l1 = -1e9, Sf = C.soft;
        for (var li = sb[4]; li < sb[5]; li += 4) {
          var dy = S.y - off[2] - Sf[li + 1], Rl = Sf[li + 3] + SLIP_SOFT; if (dy >= Rl || dy <= -Rl) continue;
          var r2 = Math.sqrt(Rl * Rl - dy * dy), qx = Sf[li] - xc, qz = Sf[li + 2] - zc, qs = qx * hx + qz * hz, ql = qx * rx + qz * rz;
          if (wv) { var qt = slipMeet(qs, v, wh); ql += wr * qt; qs = v * qt; }
          if (qs - r2 < s0) s0 = qs - r2; if (qs + r2 > s1) s1 = qs + r2; if (ql - r2 < l0) l0 = ql - r2; if (ql + r2 > l1) l1 = ql + r2;
        }
        if (s1 < 0 || s0 > Smax) continue;
        slipAdd((s0 + s1) / 2, (s1 - s0) / 2, (l0 + l1) / 2, (l1 - l0) / 2, -1, v);
      }
    }
    var K = Math.round(T / SLIP_DT);
    for (i = 0; i < SPN; i++) { SPK0[i] = Math.max(0, Math.ceil((SPS[i] - SPSH[i]) / (v * SLIP_DT))); SPK1[i] = Math.min(K, Math.floor((SPS[i] + SPSH[i]) / (v * SLIP_DT))); }
    return K;
  }
  /* the cost of the way SPX[0..K] (m to the right, a sample every SLIP_DT s) against the constraints, stopping once
     over lim: inside a solid's own zone (SLIP_IN m: where the hard rule acts) far the most, inside its margin less, inside
     a cloud's visible body less again; the nearer, the more */
  function slipCost(V, K, lim) {
    var v = V.speed, cost = 0;
    for (var i = 0; i < SPN && cost < lim; i++) {
      var po = 0, pi = 0, sc = SPS[i], sh = SPSH[i], lc = SPL[i], lh = SPLH[i], ri = SPRI[i];
      for (var k = SPK0[i]; k <= SPK1[i]; k++) {
        var hw = lh, ds = k * v * SLIP_DT - sc, ax;
        if (ri >= 0) { var q2 = sh * sh - ds * ds; if (q2 <= 0) continue; hw = Math.sqrt(q2); }
        ax = Math.abs(SPX[k] + SPOFF - lc);
        if (hw - ax > po) po = hw - ax;
        if (ri > 0) { var q3 = ri * ri - ds * ds; if (q3 > 0 && Math.sqrt(q3) - ax > pi) pi = Math.sqrt(q3) - ax; }
      }
      cost += ri >= 0 ? SPU[i] * SLIP_WOUT * po + SPUI[i] * SLIP_WIN * pi : SPU[i] * SLIP_WSOFT * po;
    }
    return cost;
  }
  /* the plan made at the gentle easing; again at the quicker (SLIP_ACC2) only where that meets a solid's own zone and
     the quicker does better (the plan in hand then kept at the rate that costs it least) */
  function slipPlan(V, S) {
    var c0 = slipPlanA(V, S, SLIP_ACC, true);
    if (c0 < SLIP_WIN * 0.02) { S.acc = SLIP_ACC; return; }
    var lt = S.latT, lt2 = S.latT2, tw = S.tsw, vs = S.vs;
    var c1 = slipPlanA(V, S, SLIP_ACC2, false);
    if (c1 < c0) S.acc = SLIP_ACC2;
    else { S.latT = lt; S.latT2 = lt2; S.tsw = tw; S.vs = vs; S.acc = SLIP_ACC; }
  }
