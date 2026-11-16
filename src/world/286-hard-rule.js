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
     HARD_IN (the near plane is 0.8 m) */
  var HARD_IN = 1;
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
  }

