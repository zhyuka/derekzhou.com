  /* ---------------------------------------------------------------- cloud volumes: drift (physics: clouds/drift) */
  /* Free clouds move with the wind at their level; only terrain-held cloud (the cloud sea, cap and lee clouds) stays
     put. A body's place is a pure function of the one clock: cloudPos(o, t) = o.c0 + W(layer) x t, in doubles, so the
     baked opening still matches the cut and reduced motion (SIM.t held) holds every cloud still.
     The wind at a cloud's level is read from one place, cloudWind (the hub's profile, until the shared windAt(y) lands:
     U10 = 6.5 m/s along the visit's wind; the low layer, +100 to +1500 m, 1.3 U10 at its azimuth + 20 deg; the 3000 m
     deck 2 U10 at + 40 deg; the cloud sea none). A visit with no wind of its own (V.wind unset): no drift. */
  var CLOUD_U10 = 6.5, CLOUD_LAYERS = { low: [1.3, 20], deck: [2.0, 40], sea: [0, 0] };
  function cloudWind(V, layer, out) {
    var o = out || new Float64Array(2), L = CLOUD_LAYERS[layer] || CLOUD_LAYERS.low, w = V && V.wind;
    if (!w || !L[0]) { o[0] = 0; o[1] = 0; return o; }
    var a = Math.atan2(w[0], w[1]) + L[1] * Math.PI / 180, s = CLOUD_U10 * L[0];
    o[0] = Math.sin(a) * s; o[1] = Math.cos(a) * s; return o;
  }
  /* the wind at h m over the surface (the hub's profile, until windAt(y)): a log law under 100 m (z0 = 0.003 m, U10
     along the visit's wind), the low layer's over it */
  var CLOUD_Z0 = 0.003;
  function cloudWindAt(V, h, out) {
    var o = out || new Float64Array(2), w = V && V.wind;
    if (!w) { o[0] = 0; o[1] = 0; return o; }
    if (h >= 100) return cloudWind(V, 'low', o);
    var u = CLOUD_U10 * Math.log(Math.max(h, CLOUD_Z0 * 1.01) / CLOUD_Z0) / Math.log(10 / CLOUD_Z0);
    o[0] = w[0] * u; o[1] = w[1] * u; return o;
  }
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
