  /* ---------------------------------------------------------------- the mist pools (delight-weather 1) */
  /* Mist lies in the dunes' troughs and about the mesas' feet: a pool whose top is the ground the dunes stand on (the
     swell less the sink toward the cloud sea: their troughs' floor) plus a depth by the sky, over the sand alone (the
     sand weight), so at first light the crests stand out of it as islands. The depth is the sky's (MIST_D: until AIR's
     weather(sky) gives it, the hub's table), blended from one sky's to the next through a change by the flight's own
     clock, never faster than MIST_RATE: the level moves, so the rim is a moving shoreline, never a fade; nothing thickens
     in place (the pool's top is opaque within MIST_OPAQUE of depth, the same at every depth: FS_TERRAIN). A pure function
     of the sky's time (no state: a still at any moment is the flight's own). The camera's ground reads the pool's top
     (HdCam, HdProbe, the split's probe), so the flight passes over it as over the cloud sea, never through it.
     Measured by tools/physics/mist-sim.mjs on the 16 openings' land (docs/world.md, ## THE MIST POOLS) */
  var MIST_D = { firstlight: 10, moonlit: 3.5, milkyway: 3.5, aurora: 3.5, bluehour: 1, afterglow: 0 };   // (m: the hub's table, delight-weather 1; the blue hour AIR's 1 m, #297)
  var MIST_RATE = 0.085, MIST_OPAQUE = 1.5;   // (m/s: the level's most, so first light's 10 m drains within a change and the next sky's shortest hold (55 + 63 s); m)
  var MISTU = new Float32Array(4);
  function mistD(id) { return MIST_D[id] || 0; }
  /* the depth at sky time t, in change i of the sky's order: the last sky's depth until its change begins, then a ramp
     at one speed to the next's, as long as the change or as MIST_RATE needs (it may run on past the change: the next
     ramp starts from wherever it stands); back: how many changes before this one to follow */
  function mistAt(i, t, back) {
    var seq = SKY.seq, e = seq[i], n = seq[i + 1], t0 = e.at + e.hold;
    var a = back > 0 && i > 0 ? mistAt(i - 1, Math.min(t, t0), back - 1) : mistD(e.id);
    if (t <= t0 || !n) return a;
    var b = mistD(n.id), T = Math.max(e.move, Math.abs(b - a) / MIST_RATE);
    return a + (b - a) * Math.min(1, (t - t0) / T);
  }
  function mistStep(L) { L.mist = SKY.seq.length > 1 ? mistAt(SKY.i, SIM.t + SKY.dt, 3) : 0; }
  function mistU(u, L) { MISTU[0] = L.mist || 0; MISTU[1] = MIST_OPAQUE; gl.uniform4fv(u.uMist, MISTU); }
