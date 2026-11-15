  /* ---------------------------------------------------------------- the ground and what stands ahead */
  var NEAR_OBST = [];
  function nearObstacles(V, range) { return nearObstaclesAt(V, CS.x, CS.z, range, NEAR_OBST); }   // the obstacles of the cells about the camera
  /* (physics: clouds/drift) an air cell's obstacles (its clouds' cores) stand where the air has carried them by t (the
     sim's moment unless given): copies, from the out list's own pool, each with the air's wind (w) for the slip's plan */
  var OBO = new Float64Array(2);
  function nearObstaclesAt(V, x, z, range, out, t) {
    out.length = 0;
    var L = V.cellList; if (!L) return out;
    var tt = t === undefined ? SIM.t : t, pool = out.pool || (out.pool = []), np = 0;
    for (var i = 0; i < L.length; i++) {
      var C = L[i]; if (C.st < 2 || !C.obst.length) continue;
      var off = cellOff(C, tt, OBO), dx = C.bound[0] + off[0] - x, dz = C.bound[2] + off[1] - z, R = range + C.bound[3];
      if (dx * dx + dz * dz > R * R) continue;
      if (!C.air) { for (var k = 0; k < C.obst.length; k++) out.push(C.obst[k]); continue; }
      for (var k2 = 0; k2 < C.obst.length; k2++) {
        var o = C.obst[k2], q = pool[np] || (pool[np] = {}); np++;
        q.c = o.c; q.x = o.x + off[0]; q.z = o.z + off[1]; q.y = o.y; q.r = o.r; q.y0 = o.y0; q.y1 = o.y1; q.cloud = o.cloud; q.w = airW(V);
        out.push(q);
      }
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
    // the solids under the ceiling on the planned way further off (slipPlan's climbs), beyond the HT_T s looked at
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
     ceiling the camera will have: simStep's is the ground under the camera + clear[2] + CEIL_OVER. The top against the ground
     at the solid's centre + clear[2] alone is not enough: that reads the camera's grid there (160 x 4 m about the
     camera: a solid farther off reads the grid's edge), so on seed 27 (day, from 34 s) a mesa whose centre reads 2 m
     while the valley the camera crosses lies at -159 m (its ceiling 21 m, the height wanted 52 m) is taken for
     climbable: the slip plans no way past it and the hard rule pushes the camera along its face for 27 s (1,619
     pushes, the course 41-53 deg off the heading). So a solid is climbable only if its top is under both (1) the
     ground under it + clear[2], that ground never above the item's own seat (exact, from the GPU: a column's y0 + 30)
     and (2) on the way in, at CR_D lengths of the height spring's lead short of it on the planned line, the solid's
     own top + CR_CLEAR (6 m: over the hard rule's 3.5) less TAN_CLIMB beyond the lead, under the ground there +
     clear[2] + CEIL_OVER (where the ceiling holds the camera under heightTarget's top + margin + 4, it still passes over
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
