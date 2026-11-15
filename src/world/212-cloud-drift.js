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
    r[0] = o.c0[0] + (w ? w[0] * t : 0); r[1] = o.c0[1]; r[2] = o.c0[2] + (w ? w[1] * t : 0); return r;
  }
  /* the air frame: the low layer's clouds, with their points of interest and flocks, live in air cells (a grid keyed by
     x - W t, streamed about the camera's place in it); D(t) = W_low t is how far the air has carried them by t. An air
     cell is laid out at tL where its ground is then (its seats, gates and the band's lift read there, out of view), so
     what it holds is stored as it stood at tL, and at t it stands D(t) - D(tL) further on: cellOff. A world cell's offset
     is none. */
  function airW(V) { return V.airW || (V.airW = cloudWind(V, 'low')); }
  function airD(V, t, out) { var w = airW(V), o = out || new Float64Array(2); o[0] = w[0] * t; o[1] = w[1] * t; return o; }
  function cellOff(C, t, out) {
    var o = out || new Float64Array(2);
    if (!C.air) { o[0] = 0; o[1] = 0; return o; }
    var w = airW(C.V); o[0] = w[0] * t - C.dL[0]; o[1] = w[1] * t - C.dL[1]; return o;
  }
