  /* ---------------------------------------------------------------- cloud volumes: drift (physics: clouds/drift) */
  /* Free clouds move with the wind at their level; only terrain-held cloud (the cloud sea, cap and lee clouds) stays
     put. A body's place is a pure function of the one clock: cloudPos(o, t) = o.c0 + W(layer) x t, in doubles, so the
     baked opening still matches the cut and reduced motion (SIM.t held) holds every cloud still.
     The wind at a cloud's level is the air's (215-air.js): windAt at the layer's declared height (AIR_H.clouds, the low
     layer's free clouds; AIR_H.deck, the 3000 m deck); the cloud sea is held. The profile is the air's to give
     (physics: air/wind-profile); nothing here holds a wind of its own. */
  function cloudWind(V, layer, out) {
    var o = out || new Float64Array(2);
    if (layer === 'sea' || !V || !V.wind) { o[0] = 0; o[1] = 0; return o; }
    var a = windAt(0, 0, layer === 'deck' ? AIR_H.deck : AIR_H.clouds, 0, V); o[0] = a.x; o[1] = a.z; return o;
  }
  /* the wind at h m over the surface: the air's */
  function cloudWindAt(V, h, out) { var o = out || new Float64Array(2), a = windAt(0, 0, h, 0, V); o[0] = a.x; o[1] = a.z; return o; }
  /* a tower's lean downwind (physics: clouds/drift): the shear across it, du = W(top) - W(base), over twice its updraft
     (w, about 1.5 m/s), at most 0.15 (m across a metre up); [x, z] */
  var CLOUD_UP = 1.5, CLOUD_LEAN = 0.15, LEANA = new Float64Array(2), LEANB = new Float64Array(2);
  function cloudLean(V, hBase, hTop) {
    var a = cloudWindAt(V, hBase, LEANA), b = cloudWindAt(V, hTop, LEANB), dx = b[0] - a[0], dz = b[1] - a[1], du = Math.sqrt(dx * dx + dz * dz);
    if (du < 1e-9) return [0, 0];
    var k = Math.min(du / (2 * CLOUD_UP), CLOUD_LEAN) / du; return [dx * k, dz * k];
  }
  /* the draw's own moment (between the last two steps, as the camera is drawn) */
  function cloudT() { return SIM.t - (1 - SIM.alpha) * SIM_DT; }
  /* a body's centre at t: its laid-out centre c0 carried by its layer's wind (o.w: [x, z] m/s, set when it is made) */
  function cloudPos(o, t, out) {
    var r = out || new Float64Array(3), w = o.w;
    r[0] = o.c0[0] + (w ? w[0] * t : 0); r[1] = o.c0[1] + (o.cell && o.cell.lift ? cellLift(o.cell, t) : 0); r[2] = o.c0[2] + (w ? w[1] * t : 0); return r;
  }
  /* the air frame: the low layer's clouds, with their points of interest and flocks, live in air cells (a grid keyed by
     x - W t, streamed about the camera's place in it); D(t) = W_low t is how far the air has carried them by t. An air
     cell is laid out at tL where its ground is then (its seats, gates and the band's lift read there, out of view), so
     what it holds is stored as it stood at tL, and at t it stands D(t) - D(tL) further on: cellOff. A world cell's offset
     is none. */
  function airW(V) { return V.airW || (V.airW = cloudWind(V, 'low')); }
  function airD(V, t, out) { var w = airW(V), o = out || new Float64Array(2); o[0] = w[0] * t; o[1] = w[1] * t; return o; }
  function cellOff(C, t, out) {   // [x, z, y]: the carry, and the lift over the band
    var o = out || new Float64Array(3);
    if (!C.air) { o[0] = 0; o[1] = 0; o[2] = 0; return o; }
    var w = airW(C.V); o[0] = w[0] * t - C.dL[0]; o[1] = w[1] * t - C.dL[1]; o[2] = cellLift(C, t); return o;
  }
  /* the lift (physics: clouds/drift, the band): as the air carries a cell over higher ground or a higher sea, its bodies
     rise so their lowest billow stays over the flight band's top, and come down after, never faster than LIFT_V: one
     lift a cell, the most any of its bodies needs, y(t) = max over tau of (need(tau) - LIFT_V |t - tau|), a pure
     function of t. need: the band's top where the body stands at tau (bandTopAt, the maps' own, over the land it was
     seated on) less its lowest billow as laid out, sampled every LIFT_DT s along its straight way (cached; LIFT_M m for
     what falls between two samples) over LIFT_T s each side: a rise LIFT_V x LIFT_T (140 m) high is met in time */
  var LIFT_DT = 2, LIFT_T = 280, LIFT_V = 0.5, LIFT_M = 8;   // (LIFT_T: a rise of 140 m met in time at LIFT_V; the band's rises reach 123-130 m)
  /* the most bandTopAt can be over a land, anywhere (the sea at its highest with its heaps, or the land with the tallest
     formation's allowance): a body over it never meets the band */
  function bandTopMost(land) { return Math.max(SEA_LO + RISE + HEAP_MAX, (land === undefined || land !== land ? -1e9 : land) + FORM_ALLOW) + FLY_TOP + BAND_M; }
  function cellLift(C, t) {
    var L = C.lift; if (!L || !L.length) return 0;
    if (C.liftT === t) return C.liftY;
    var w = airW(C.V), k0 = Math.floor((t - LIFT_T) / LIFT_DT), k1 = Math.ceil((t + LIFT_T) / LIFT_DT), y = 0, N = C.liftN;
    if (!N || k0 < C.liftK) { N = C.liftN = []; C.liftK = k0; }
    else if (k0 - C.liftK > 512) { N = C.liftN = N.slice(k0 - C.liftK); C.liftK = k0; }   // (the samples behind the window dropped)
    for (var k = k0; k <= k1; k++) {
      var q = k - C.liftK, n = N[q];
      if (n === undefined) {   // the most any body needs at the k-th sample, once
        var tau = k * LIFT_DT, ox = w[0] * tau - C.dL[0], oz = w[1] * tau - C.dL[1]; n = 0;
        for (var i = 0; i < L.length; i++) { var b = L[i], e0 = bandTopAt(b.x + ox, b.z + oz, b.land) + LIFT_M - b.low; if (e0 > n) n = e0; }
        N[q] = n;
      }
      var e = n - LIFT_V * Math.abs(t - k * LIFT_DT); if (e > y) y = e;
    }
    C.liftT = t; C.liftY = y; return y;
  }
