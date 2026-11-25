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
  /* a step of the slip. (flight-controllers-smooth) The plan is made every SLIP_PLAN s, and sooner only once the
     heading has turned SLIP_REPSI since the last (S.ppsi), and never within SLIP_REGAP s of it: a drag's turn
     re-planned every step, 46-48 plans a second while turning (test/unit/flight-sim.mjs); a few degrees of turn move
     what stands ahead little against a plan's 90 s, and the line still to go is turned with the heading every step.
     On its line and at rest the slip is held at rest (as slipTraj flies it): its controller chattered about the line,
     the slip's sign flipping 2-12 times a second */
  var SLIP_REPSI = 2 * DEG, SLIP_REGAP = 0.1;
  function slipStep(V, S, dt) {
    var v = V.speed;
    if (!(S.fpsi === S.fpsi) || Math.abs(angDiff(S.psi, S.fpsi)) > 0.004) { S.latT -= S.lat; S.latT2 -= S.lat; S.lat = 0; S.fpsi = S.psi; }   // (the heading turned: the line still to go, in the new frame)
    if (SIM.t - S.pt >= SLIP_PLAN || (SIM.t - S.pt >= SLIP_REGAP && !(Math.abs(angDiff(S.psi, S.ppsi)) < SLIP_REPSI))) { S.pt = SIM.t; S.ppsi = S.psi; slipPlan(V, S); }
    if (S.tsw > 0 && SIM.t >= S.tsw) { S.latT = S.latT2; S.tsw = -1; }   // (the plan's second line, from its time on)
    S.sv = slipCtl(S.sv, S.latT - S.lat, S.vs || SLIP_SPD[0] * v, (S.acc || SLIP_ACC) * v, dt);   // (at the rate its plan was made at)
    if (Math.abs(S.latT - S.lat) < 0.05 && Math.abs(S.sv) < 0.02) S.sv = 0;
    S.lat += S.sv * dt;
  }
  /* the hard rule: out of any solid (a landmark's cylinder, a cloud's core), pushed out by the shortest way.
     (flight-controllers-smooth) Within its margin (mh) eased out at the climb's own travel in a step (PUSH_V), as the
     ground's rule is: a push was a jump of up to the whole margin in one step; never nearer the solid itself than
     HARD_IN. (follow-up) Not the near plane's distance (0.8 m) but its corners': at 0.8 m along the view they lie
     0.8 sqrt(1 + tanX^2 + tanY^2) from the eye, 1.15 m in a square window (tanX = tanY = tan 36 deg, the frustum's
     widest corner: 386), so at 1 m a corner cut a face met obliquely. 1.25 m clears every settled window's corner by 0.1 m
     (test/unit/flight-sim.mjs works it from NEAR, FOV_LONG and frustumFor); for the 0.35 s the frustum eases to a
     new window's shape after a resize (386) a corner can reach about 1.78 m */
  var HARD_IN = 1.25;
  function pushOut(V) {
    var O = nearObstacles(V, 80), mh = 3.5, ds = PUSH_V * SIM_DT;
    for (var i = 0; i < O.length; i++) {
      var o = O[i], dx = CS.x - o.x, dz = CS.z - o.z;
      if (o.c) {
        if (CS.y > o.y1 + mh || CS.y < o.y0) continue;
        var d = Math.sqrt(dx * dx + dz * dz), R = o.r + mh;
        if (d >= R) continue;
        var up = o.y1 + mh - CS.y, outh = R - d;
        if (up < outh) { CS.y = Math.max(Math.min(o.y1 + mh, CS.y + ds), o.y1 + HARD_IN); if (CS.vy < 0) CS.vy = 0; if (CS.ay < 0) CS.ay = 0; }
        else { var k = Math.max(Math.min(R, d + ds), o.r + HARD_IN) / Math.max(d, 1e-3); CS.x = o.x + dx * k; CS.z = o.z + dz * k; }
        SIM.fixO++;
      } else {
        var dy = CS.y - o.y, dd = Math.sqrt(dx * dx + dy * dy + dz * dz), R2 = o.r + mh * 2;
        if (dd >= R2) continue;
        var k2 = Math.max(Math.min(R2, dd + ds), o.r + HARD_IN) / Math.max(dd, 1e-3); CS.x = o.x + dx * k2; CS.y = o.y + dy * k2; CS.z = o.z + dz * k2;
        SIM.fixO++;
      }
    }
    /* (wedged between two solids) each push above keeps HARD_IN from its own solid, but the next can move the camera back
       inside an earlier one's: a few passes then hold every solid's HARD_IN, by its face as the flight sim measures it (a
       landmark's side, top or the corner between; a core's sphere), moving the camera only where one is under it.
       (Before: on #424's ground the camera, wedged between two, came 1.24 m from a face in 84 steps of a drag) */
    for (var p = 0, m = 1; p < 3 && m; p++) for (m = 0, i = 0; i < O.length; i++) if (hardFloor(O[i])) m = ++SIM.fixO;
  }
  function hardFloor(o) {   // the camera moved to HARD_IN from o's face if nearer (its side, top or the corner between; a core's sphere): 1 if it moved
    var dx = CS.x - o.x, dz = CS.z - o.z, d = Math.hypot(dx, dz), dy, q, s;
    if (!o.c) {
      dy = CS.y - o.y; s = Math.hypot(d, dy);
      if (s - o.r >= HARD_IN - 1e-9 || s < 1e-6) return 0;
      q = (o.r + HARD_IN) / s; CS.y = o.y + dy * q;
    } else {
      var dr = d - o.r, up = CS.y > (o.y0 + o.y1) / 2, dv = up ? CS.y - o.y1 : o.y0 - CS.y, a = Math.max(dr, 0), b = Math.max(dv, 0);
      if (Math.hypot(a, b) + Math.min(Math.max(dr, dv), 0) >= HARD_IN - 1e-9) return 0;
      s = a && b ? HARD_IN / Math.hypot(a, b) : 0;
      if (s) { q = (o.r + a * s) / d; CS.y = up ? o.y1 + b * s : o.y0 - b * s; }   // (the corner: along the way to its edge)
      else if (dr > dv) q = (o.r + HARD_IN) / d;
      else { CS.y = up ? o.y1 + HARD_IN : o.y0 - HARD_IN; return 1; }
    }
    CS.x = o.x + dx * q; CS.z = o.z + dz * q; return 1;
  }

