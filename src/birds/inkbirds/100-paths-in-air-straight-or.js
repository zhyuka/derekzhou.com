  /* ---------------- the paths: in the air, straight or wheeling ---------------- */

  /* A path: through the point (x, y, z) at s = 0, heading h (radians in
     the level: 0 along x, to the right; + away from the window), then from
     s1 to s2 wheeling at k radians a unit, and on straight; climbing at
     gradient g all the way. s is along the ground, in units of the air */
  var work = 0;                                           // path points worked out: the planner's cost
  var wp = {}, pp = {}, IO = {};
  function prepare(P) {
    P.c1 = Math.cos(P.h); P.n1 = Math.sin(P.h);
    P.h2 = P.h + P.k * (P.s2 - P.s1); P.c2 = Math.cos(P.h2); P.n2 = Math.sin(P.h2);
    if (P.k) { P.ex = (P.n2 - P.n1) / P.k; P.ez = (P.c1 - P.c2) / P.k; }
    else { P.ex = (P.s2 - P.s1) * P.c1; P.ez = (P.s2 - P.s1) * P.n1; }
    P.i0x = 0; P.i0z = 0;
    integ(P, 0, IO); P.i0x = IO.ix; P.i0z = IO.iz;
  }
  /* the way the path runs, summed from s1 to a */
  function integ(P, a, o) {
    var d;
    if (a <= P.s1) { d = a - P.s1; o.ix = d * P.c1; o.iz = d * P.n1; }
    else if (a <= P.s2) { d = P.h + P.k * (a - P.s1); o.ix = (Math.sin(d) - P.n1) / P.k; o.iz = (P.c1 - Math.cos(d)) / P.k; }
    else { d = a - P.s2; o.ix = P.ex + d * P.c2; o.iz = P.ez + d * P.n2; }
    return o;
  }
  /* the point s along a flight's path, and its heading there */
  function path3(F, s, o) {
    var P = F.path;
    work++;
    if (P.sp && s > P.sp[0].s) return path3sp(P, s, o);   // (round 3: steered in flight, from its first splice on)
    if (P.tab) return path3tab(P, s, o);                  // (birds3d: a ribbon's weave, sampled)
    integ(P, s, IO);
    o.x = P.x + IO.ix - P.i0x; o.z = P.z + IO.iz - P.i0z; o.y = P.y + P.g * s;
    o.h = s <= P.s1 ? P.h : s >= P.s2 ? P.h2 : P.h + P.k * (s - P.s1);
    return o;
  }
  /* how far the heading at s is off the window's plane, degrees */
  function offPlane(F, s) {
    var P = F.path, h = P.h + P.k * (clamp(s, P.s1, P.s2) - P.s1), a = F.dir > 0 ? h : Math.PI - h;
    return Math.abs(Math.atan2(Math.sin(a), Math.cos(a))) / DEG;
  }
  /* from the path's point in the window out along it (sg: +1 ahead, -1
     back) until its leader is OUT beyond the window, gone into the distance
     or below the window's sill: how far that is; null if it would pass
     behind the eye or come too near in view */
  /* (walk: the module's, i5_plan.js) */
  /* the edge a path's end is beyond (0: gone into the distance) */
  function endEdge(F, s) {
    path3(F, s, wp); proj(wp.x, wp.y, wp.z, pp);
    return pp.n < farOf(F) ? 0 : side(pp.x, pp.y) | (wp.y <= 0 && pp.y > H ? 8 : 0);
  }
  function side(x, y) {
    return (x <= -OUT + 1 ? 1 : 0) | (x >= W + OUT - 1 ? 2 : 0) | (y <= -OUT + 1 ? 4 : 0) | (y >= H + OUT - 1 ? 8 : 0);
  }
  /* a path through (qx, qy) that runs across the window at angle a (x the
     flight's way, y down), its nearness changing by dn of itself a px:
     the heading and the climb in the air that are seen so */
  function pathAcross(F, qx, qy, a, dn, turn) {
    var e = 8, X, Y, Z, dx, dy, dz, L;
    unproj(qx, qy, F.n0, wp); X = wp.x; Y = wp.y; Z = wp.z;
    unproj(qx + F.dir * Math.cos(a) * e, qy + Math.sin(a) * e, F.n0 * (1 + dn * e), wp);
    dx = wp.x - X; dy = wp.y - Y; dz = wp.z - Z; L = Math.sqrt(dx * dx + dz * dz);
    if (Math.abs(Math.atan2(dy, L)) > 45 * DEG) return false;   // no bird climbs or dives so steeply for long
    return pathThrough(F, qx, qy, Math.atan2(dz, dx * F.dir), turn, Math.atan2(dy, L));
  }
  /* a path through the window point (qx, qy) at the flight's nearness,
     heading hd off the window's plane (+ away), wheeling through `turn`
     radians in a few seconds somewhere near there, climbing at `climb` */
  function pathThrough(F, qx, qy, hd, turn, climb) {
    var P = F.path = {}, sIn, sOut, L, c;
    unproj(qx, qy, F.n0, wp);
    P.x = wp.x; P.y = wp.y; P.z = wp.z;
    P.h = F.dir > 0 ? hd : Math.PI - hd;
    P.k = 0; P.s1 = P.s2 = 0;
    if (turn) {
      L = F.vw * pick(F.r, TURN_T);                       // the turn's length on the path, at the flight's own pace
      c = mix(F.r(), -0.35, 0.35) * W / F.n0;             // centred somewhere near the middle of the crossing
      P.s1 = c - L / 2; P.s2 = c + L / 2; P.k = F.dir * turn / L;
      P.h -= P.k * (Math.max(0, Math.min(0, P.s2) - P.s1));   // (so the flight heads hd where it passes the point: its heading there is the one drawn)
    }
    P.g = Math.tan(climb);
    prepare(P);
    if (turn && offPlane(F, -1e5) > HEAD_MAX || turn && offPlane(F, 1e5) > HEAD_MAX) return false;   // it never turns back across the window
    sOut = walk(F, 1); if (sOut === null) return false;
    sIn = walk(F, -1); if (sIn === null) return false;
    F.sa = sIn; F.len = sOut - sIn;
    F.edges = endEdge(F, sIn) | endEdge(F, sOut);
    return true;
  }

