  /* ---------------------------------------------------------------- the ground and what stands ahead */
  var NEAR_OBST = [];
  function nearObstacles(V, range) { return nearObstaclesAt(V, CS.x, CS.z, range, NEAR_OBST); }   // the obstacles of the cells about the camera
  function nearObstaclesAt(V, x, z, range, out) {
    out.length = 0;
    var L = V.cellList; if (!L) return out;
    for (var i = 0; i < L.length; i++) {
      var C = L[i]; if (C.st < 2 || !C.obst.length) continue;
      var dx = C.bound[0] - x, dz = C.bound[2] - z, R = range + C.bound[3];
      if (dx * dx + dz * dz > R * R) continue;
      for (var k = 0; k < C.obst.length; k++) out.push(C.obst[k]);
    }
    return out;
  }
  function obstR(o, y, m) {   // an obstacle's radius in the horizontal plane at height y (with margin m), or -1
    if (o.c) return (y > o.y0 - m && y < o.y1 + m) ? o.r + m : -1;
    var dy = y - o.y, R = o.r + m;
    return Math.abs(dy) < R ? Math.sqrt(R * R - dy * dy) : -1;
  }
  function obstTop(o) { return o.c ? o.y1 : o.y + o.r; }
  /* the height to keep: the most the ground ahead asks over the next seconds (each sample's ground plus the clearance,
     less what a climb of about 22 deg makes up on the way), and the tops of solids the way crosses that can be climbed
     over (under the ceiling) */
  /* (the one camera) the height's spring and its limits: the vertical speed within VY_UP / VY_DN and its change within
     VY_ACC (well under what reads as a nod: a climb at 5.5 m/s with a 41 deg turn of the view reads as one),
     the ground ahead looked at over HT_T s at TAN_CLIMB (the slope those limits can climb, with room), so a rise is
     climbed early and gently */
  var TAN_CLIMB = Math.tan(11 * DEG), VY_UP = 2.6, VY_DN = 2.2, VY_ACC = 0.5, VY_ACCU = 1.0, VY_W = 0.55, HT_T = 12, CEIL_OVER = 10, PUSH_V = 3.9;   // (a climb may gather at up to VY_ACCU m/s2, a descent's change at VY_ACC)
  function heightTarget(V, t) {
    var v = V.speed, cl = V.clear, hx = Math.sin(CS.psi), hz = Math.cos(CS.psi), yT = -1e9, T = HT_T, i;
    var g0 = groundAt(V, CS.x, CS.z, true);
    for (i = 0; i <= 16; i++) {
      var s = v * T * i / 16, ye = groundAt(V, CS.x + hx * s, CS.z + hz * s, true) + CS.c - s * TAN_CLIMB;
      if (ye > yT) yT = ye;
    }
    // a realm may look further, with a gentler slope: the eye rises early toward a crest far ahead, so it sees over it
    // (DUNES: the land's rises would otherwise fill the window behind the words)
    var LT = V.def.lookT || 0, LK = V.def.lookTan || TAN_CLIMB;
    if (LT > T) for (i = 1; i <= 12; i++) {
      var s3 = v * T + (v * LT - v * T) * i / 12, ye3 = groundAt(V, CS.x + hx * s3, CS.z + hz * s3, true) + CS.c - s3 * LK;
      if (ye3 > yT) yT = ye3;
    }
    // on the slip's planned way (between the line now and the line it is going to: e), and with a lead of CLIMB_LEAD s:
    // the height's spring lags a ramp at TAN_CLIMB by about 2 s of it (2 x its rate / 0.95), so a ramp aimed at the top's
    // edge meets it a few metres low and the hard rule lifts the camera in one step (seed 13: 5.5 m); a floating stone
    // above the eye is passed under or beside (slipPlan), never climbed from below
    var O = nearObstacles(V, v * T + 60), m = V.margin || V.def.margin || 14, e = CS.latT - CS.lat, lo = Math.min(0, e), hi = Math.max(0, e), lead = v * CLIMB_LEAD;
    for (i = 0; i < O.length; i++) {
      var o = O[i], ox = o.x - CS.x, oz = o.z - CS.z, s2 = ox * hx + oz * hz;
      if (s2 < -o.r - m || s2 > v * T + o.r) continue;
      var l2 = -ox * hz + oz * hx, lat = l2 < lo ? lo - l2 : (l2 > hi ? l2 - hi : 0), top = obstTop(o) + m;
      if (lat > o.r + m || (!o.c && !o.cloud && o.y > CS.y + 5) || !climbOK(V, CS, o, s2, top)) continue;   // (passed beside it, or too tall to climb: flown round; judged as slipGather judges it, climbOK)
      var ye2 = top + 4 - Math.max(s2 - o.r - lead, 0) * TAN_CLIMB;
      if (ye2 > yT) yT = ye2;
    }
    // the solids under the ceiling on the planned way further off (slipPlan's climbs), beyond the 8 s looked at
    // above: climbed at TAN_CLIMB from as far off as the plan sees them, so a tall one is never met late
    var CB = CS.climbs;
    if (CB) for (i = 0; i < CB.length; i++) {
      var q = CB[i], qx = q.x - CS.x, qz = q.z - CS.z, s4 = qx * hx + qz * hz;
      if (s4 <= v * T + q.r || s4 > Math.max(v * SLIP_T, SLIP_REACH) + q.r) continue;
      var l4 = -qx * hz + qz * hx, dl = l4 < lo ? lo - l4 : (l4 > hi ? l4 - hi : 0);
      if (dl > q.r + m) continue;
      var ye4 = obstTop(q) + m + 4 - Math.max(s4 - q.r - lead, 0) * TAN_CLIMB;
      if (ye4 > yT) yT = ye4;
    }
    return Math.max(yT, g0 + cl[0]);
  }
  /* can the camera climb over a solid (its top with the margin, `top`, s m ahead on the heading)? Only under the
     ceiling the camera will have: simStep's is the ground under the camera + clear[2] + 40. The top against the ground
     at the solid's centre + clear[2] alone is not enough: that reads the camera's grid there (160 x 4 m about the
     camera: a solid farther off reads the grid's edge), so on seed 27 (day, from 34 s) a mesa whose centre reads 2 m
     while the valley the camera crosses lies at -159 m (its ceiling 21 m, the height wanted 52 m) is taken for
     climbable: the slip plans no way past it and the hard rule pushes the camera along its face for 27 s (1,619
     pushes, the course 41-53 deg off the heading). So a solid is climbable only if its top is under both (1) the
     ground under it + clear[2], that ground never above the item's own seat (exact, from the GPU: a column's y0 + 30)
     and (2) on the way in, at CR_D lengths of the height spring's lead short of it on the planned line, the solid's
     own top + CR_CLEAR (6 m: over the hard rule's 3.5) less TAN_CLIMB beyond the lead, under the ground there +
     clear[2] + 40 (where the ceiling holds the camera under heightTarget's top + margin + 4, it still passes over
     without a push; asking the margin here too slips seed 29, climbable without a push, past at 0.35 x the speed);
     else it is a slip constraint, passed beside from first sight. Allocates nothing */
  var CR_D = [0.15, 0.5, 1, 1.6, 2.4], CR_CLEAR = 6;
  function climbOK(V, S, o, s, top) {
    var cl = V.clear, gi = groundAt(V, o.x, o.z, false);
    if (o.c && o.y0 + 30 < gi) gi = o.y0 + 30;
    if (top > gi + cl[2]) return false;
    var hx = Math.sin(S.psi), hz = Math.cos(S.psi), e = S.latT - S.lat, lead = V.speed * CLIMB_LEAD, edge = s - o.r;
    for (var i = 0; i < CR_D.length; i++) {
      var d = CR_D[i] * lead, q = edge - d;
      if (q < 0) continue;   // (passed already: the camera is nearer than that)
      var need = obstTop(o) + CR_CLEAR - Math.max(d - lead, 0) * TAN_CLIMB, gq = groundAt(V, S.x + hx * q - hz * e, S.z + hz * q + hx * e, false);
      if (need > gq + cl[2] + CEIL_OVER) return false;
    }
    return true;
  }
  /* the way past what stands ahead with the heading held, planned from first sight. A slip round the nearest solid
     only, seen 24 s ahead, wanting the offset still needed over the time left, is not enough: a wide mesa (DUNES:
     105-250 m across, its top 170-335 m over the camera) or a great tower's core (ABOVE: up to 186 m) needs more than
     14 deg of crab can give, and the hard rule pushes the camera along their faces for seconds (6 of 11 seeds, 81-1091
     pushes); a solid climbed only once heightTarget sees it, 8 s off, is met too late if tall; and clouds' visible
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
     landing before its first frame, or the first 0.45 s of the cloud a visit begins in: FS_INCLOUD holds the view whole
     that long), a line that would meet a solid's own zone is not flown at all: the camera is placed on the nearest
     clear line beside it (up to 420 m; never inside a solid), unseen; the cloud about the eye is fixed in its own
     frame (TRAVEL), so nothing on the screen moves with it. The slip (S.sv, m/s, + to the right) flies the chosen line
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
  var SPOFF = 0;
  function slipGather(V, S, wide) {
    var v = V.speed, cl = V.clear, m = V.margin || V.def.margin || 14, hx = Math.sin(S.psi), hz = Math.cos(S.psi), rx = -hz, rz = hx, i;
    var T = Math.max(SLIP_T, SLIP_REACH / v), Smax = v * T, Lmax = SLIP_SPD[SLIP_SPD.length - 1] * v * T * 0.75 + (wide || 0);
    var x0 = S.x, z0 = S.z, climbs = S.climbs || (S.climbs = []); climbs.length = 0; SPN = 0;
    // the solids: a cloud's core always passed beside; a landmark under the ceiling climbed over; the rest passed beside
    var O = nearObstaclesAt(V, x0, z0, Smax + 320, SLIP_O);
    for (i = 0; i < O.length; i++) {
      var o = O[i], ox = o.x - x0, oz = o.z - z0, s = ox * hx + oz * hz, l = ox * rx + oz * rz, mm = m * (o.cloud ? 1.6 : 1);
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
      for (var bj = 0; bj < C.softB.length; bj++) {
        var sb = C.softB[bj], bx = sb[0] - x0, bz = sb[2] - z0, bs = bx * hx + bz * hz, bl = bx * rx + bz * rz, R = sb[3] + SLIP_SOFT;
        if (bs < -R || bs > Smax + R || Math.abs(bl) > Lmax + R || Math.abs(sb[1] - S.y) > R) continue;
        var s0 = 1e9, s1 = -1e9, l0 = 1e9, l1 = -1e9, Sf = C.soft;
        for (var li = sb[4]; li < sb[5]; li += 4) {
          var dy = S.y - Sf[li + 1], Rl = Sf[li + 3] + SLIP_SOFT; if (dy >= Rl || dy <= -Rl) continue;
          var r2 = Math.sqrt(Rl * Rl - dy * dy), qx = Sf[li] - x0, qz = Sf[li + 2] - z0, qs = qx * hx + qz * hz, ql = qx * rx + qz * rz;
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
  /* a plan at the easing ak (x the speed a second): its cost (the plan in hand's if kept); arrive: the arrival's line
     may be chosen (the first pass only) */
  function slipPlanA(V, S, ak, arrive) {
    var v = V.speed, a = ak * v, i, k, K = slipGather(V, S, 0), T = K * SLIP_DT;
    var e0 = S.latT - S.lat, dstop = S.sv * Math.abs(S.sv) / (2 * a * 0.72);
    if (!SPN) { if (Math.abs(e0) > Math.abs(dstop) + 0.5) S.latT = S.lat + dstop; S.latT2 = S.latT; S.tsw = -1; return 0; }   // (nothing on the way: the slip eased out where it is)
    // (the arrival: a line that meets a solid's own zone, and the view still wholly covered (the cloud or cover a visit
    // begins in, or the landing before its first frame): the camera comes out of it on the nearest clear line instead)
    if (arrive && S === CS && arrivalCovered(V)) {
      for (k = 0; k <= K; k++) SPX[k] = dstop * Math.min(1, k * SLIP_DT / 4);
      if (slipCost(V, K, 1e18) >= SLIP_WIN * 0.5) {
        var bo = 0, bc = 1e18, lad2 = SLIP_LAD2;
        K = slipGather(V, S, 430);   // (gathered once, wide; each line tried by its offset, SPOFF)
        for (k = 0; k <= K; k++) SPX[k] = 0;
        var O2 = nearObstaclesAt(V, S.x, S.z, 520, SLIP_O2);
        for (var j = 0; j < lad2.length * 2; j++) {
          var off = (j & 1 ? -1 : 1) * lad2[j >> 1]; SPOFF = off;
          if (solidAt(O2, S.x - Math.cos(S.psi) * off, S.y, S.z + Math.sin(S.psi) * off, 6)) continue;   // (never into a solid, even one it would climb)
          var cc = slipCost(V, K, bc) + Math.abs(off) * 2;
          if (cc < bc) { bc = cc; bo = off; }
          if (cc < SLIP_WIN * 0.01 + Math.abs(off) * 2) break;
        }
        SPOFF = 0;
        if (bo) { var rx = -Math.cos(S.psi) * bo, rz = Math.sin(S.psi) * bo; S.x += rx; S.z += rz; CSP.x += rx; CSP.z += rz; SIM.reseat = (SIM.reseat || 0) + 1; if (BIRDS) BIRDS.visit(V.k); }   // (the birds' sky begins again about the camera, as at the arrival)
        K = slipGather(V, S, 0); dstop = 0; S.sv = 0; S.latT = S.latT2 = S.lat; S.tsw = -1;
      }
    }
    // the candidates: the line held, the slip stopped, each constraint's two edges, a ladder
    var nc = 0; SPC[nc++] = e0; SPC[nc++] = dstop;
    var lad = SLIP_LAD;
    for (k = 0; k < lad.length; k++) { SPC[nc++] = lad[k]; SPC[nc++] = -lad[k]; }
    // (each edge of the SLIP_NC constraints met soonest, never two candidates within 4 m: the plan's work bounded)
    slipOrder(SPN); var ord = SPORD;
    for (var oi = 0; oi < Math.min(SPN, SLIP_NC); oi++) {
      i = ord[oi];
      for (var sd = -1; sd <= 1; sd += 2) {
        var cd = SPL[i] + sd * (SPLH[i] + 3), dup = false;
        for (k = 0; k < nc && !dup; k++) if (Math.abs(SPC[k] - cd) < 4) dup = true;
        if (!dup) SPC[nc++] = cd;
      }
    }
    var Lmax = SLIP_SPD[SLIP_SPD.length - 1] * v * T * 0.75, e2 = S.tsw > SIM.t ? S.latT2 - S.lat : e0, kw0 = S.tsw > SIM.t ? Math.round((S.tsw - SIM.t) / SLIP_DT) : K + 1;
    // the plan in hand (its second line too, if it has one), costed in full: kept unless another is clearly better
    var keep = 1e18, kt = SLIP_SPD.indexOf(S.vs / v);
    for (var t0 = 0; t0 < SLIP_SPD.length; t0++) if (Math.abs(SLIP_SPD[t0] * v - (S.vs || 0)) < 1e-6) kt = t0;
    if (kt >= 0) { slipTraj(K, S.sv, e0, e2, kw0, S.vs, a); keep = SLIP_SPDK[kt] + Math.abs(e2) + SLIP_KC * SLIP_SPD[kt] * Math.max(Math.abs(e0), Math.abs(e2)) / v + slipCost(V, K, 1e18); }
    var lim = keep * 0.85 - 150, best = 1e18, bd = e0, bd2 = e2, bk = kw0, bv = S.vs || SLIP_SPD[0] * v;
    for (var t = 0; t < SLIP_SPD.length; t++) {
      var c1 = SLIP_SPD[t], vs = c1 * v, pen = SLIP_SPDK[t];   // (over 7.4 deg of crab only to keep out of a solid's own zone)
      for (var c = 0; c < nc; c++) {
        var d = SPC[c]; if (Math.abs(d) > Lmax) continue;
        var cost = pen + Math.abs(d) + Math.abs(d - e0) + ((e0 > 10 && d < -10) || (e0 < -10 && d > 10) ? 300 : 0) + SLIP_KC * c1 * Math.abs(d) / v;
        if (cost >= Math.min(best, lim)) continue;
        slipTraj(K, S.sv, d, d, K + 1, vs, a);
        cost += slipCost(V, K, Math.min(best, lim) - cost);
        if (cost < Math.min(best, lim)) { best = cost; bd = d; bd2 = d; bk = K + 1; bv = vs; }
      }
    }
    // (no single line keeps out of every solid's own zone: two lines, the first past one of the solids met soonest (to
    // its centre), then another (the way between two mesas that overlap across the line but not along it: seed 20's
    // DUNES, 540 s). Rarely needed, so tried only then, and at four of the speeds)
    if (Math.min(best, keep) >= SLIP_WIN * 0.02) {
      var SP2 = SLIP_SP2;
      for (var oj = 0, nh = 0; oj < SPN && nh < 4; oj++) {
        i = ord[oj]; if (!(SPRI[i] > 0)) continue; nh++;
        var kw = Math.max(1, Math.min(K, Math.round(SPS[i] / (v * SLIP_DT))));
        for (var s1 = -1; s1 <= 1; s1 += 2) {
          var d1 = SPL[i] + s1 * (SPLH[i] + 3); if (Math.abs(d1) > Lmax) continue;
          for (var t2 = 0; t2 < SP2.length; t2++) {
            var tt = SP2[t2], c2 = SLIP_SPD[tt], vs2 = c2 * v;
            for (c = 0; c < Math.min(nc, 24); c++) {
              var dd = SPC[c]; if (Math.abs(dd) > Lmax) continue;
              var cost2 = SLIP_SPDK[tt] + Math.abs(dd) + Math.abs(d1 - e0) + SLIP_KC * c2 * (Math.abs(d1) + Math.abs(dd - d1)) / v;
              if (cost2 >= Math.min(best, lim)) continue;
              slipTraj(K, S.sv, d1, dd, kw, vs2, a);
              cost2 += slipCost(V, K, Math.min(best, lim) - cost2);
              if (cost2 < Math.min(best, lim)) { best = cost2; bd = d1; bd2 = dd; bk = kw; bv = vs2; }
            }
          }
        }
      }
    }
    if (best >= lim) return keep;   // (the plan in hand kept)
    S.latT = S.lat + bd; S.latT2 = S.lat + bd2; S.tsw = bk <= K ? SIM.t + bk * SLIP_DT : -1; S.vs = bv;
    return best;
  }
  /* the way the slip's controller flies (SPX[0..K], m to the right of the camera now, a sample every SLIP_DT s): toward
     d1, and from sample kw on toward d2, at vs */
  function slipTraj(K, sv, d1, d2, kw, vs, a) {
    var x = 0; SPX[0] = 0;
    for (var k = 1; k <= K; k++) {
      var d = k < kw ? d1 : d2;
      sv = slipCtl(sv, d - x, vs, a, SLIP_DT); x += sv * SLIP_DT; SPX[k] = x;
      if (k >= kw && Math.abs(d2 - x) < 0.05 && Math.abs(sv) < 0.02) { for (var k2 = k + 1; k2 <= K; k2++) SPX[k2] = x; break; }
    }
  }
  /* inside a solid (the hard rule's own test, with mh m to spare): a cylinder's column or a sphere */
  var SLIP_O2 = [];
  function solidAt(O, x, y, z, mh) {
    for (var i = 0; i < O.length; i++) {
      var o = O[i], dx = x - o.x, dz = z - o.z;
      if (o.c) { if (y <= o.y1 + mh && y >= o.y0 - mh && dx * dx + dz * dz < (o.r + mh) * (o.r + mh)) return true; }
      else { var dy = y - o.y, R = o.r + mh * 2; if (dx * dx + dy * dy + dz * dz < R * R) return true; }
    }
    return false;
  }
  /* the view not yet shown: the landing before its first frame (there is no other cover) */
  function arrivalCovered(V) { return !shown && SIM.t < 1; }
  /* a step of the slip (the flight's, plan true; the forecast's, flying the plan it was given) */
  function slipStep(V, S, dt, plan) {
    var v = V.speed;
    if (!(S.fpsi === S.fpsi) || Math.abs(angDiff(S.psi, S.fpsi)) > 0.004) { S.latT -= S.lat; S.latT2 -= S.lat; S.lat = 0; S.fpsi = S.psi; if (plan) S.pt = -1e9; }   // (the heading turned: the line still to go, in the new frame)
    if (plan && SIM.t - S.pt >= SLIP_PLAN) { S.pt = SIM.t; slipPlan(V, S); }
    var now = plan ? SIM.t : S.t;
    if (S.tsw > 0 && now >= S.tsw) { S.latT = S.latT2; S.tsw = -1; }   // (the plan's second line, from its time on)
    S.sv = slipCtl(S.sv, S.latT - S.lat, S.vs || SLIP_SPD[0] * v, (S.acc || SLIP_ACC) * v, dt);   // (at the rate its plan was made at)
    S.lat += S.sv * dt;
  }
  /* the hard rule: out of any solid (a landmark's cylinder, a cloud's core), pushed out by the shortest way */
  function pushOut(V) {
    var O = nearObstacles(V, 80), mh = 3.5;
    for (var i = 0; i < O.length; i++) {
      var o = O[i], dx = CS.x - o.x, dz = CS.z - o.z;
      if (o.c) {
        if (CS.y > o.y1 + mh || CS.y < o.y0) continue;
        var d = Math.sqrt(dx * dx + dz * dz), R = o.r + mh;
        if (d >= R) continue;
        var up = o.y1 + mh - CS.y, outh = R - d;
        if (up < outh) { CS.y = o.y1 + mh; if (CS.vy < 0) CS.vy = 0; }
        else { var k = R / Math.max(d, 1e-3); CS.x = o.x + dx * k; CS.z = o.z + dz * k; }
        SIM.fixO++;
      } else {
        var dy = CS.y - o.y, dd = Math.sqrt(dx * dx + dy * dy + dz * dz), R2 = o.r + mh * 2;
        if (dd >= R2) continue;
        var k2 = R2 / Math.max(dd, 1e-3); CS.x = o.x + dx * k2; CS.y = o.y + dy * k2; CS.z = o.z + dz * k2;
        SIM.fixO++;
      }
    }
  }

