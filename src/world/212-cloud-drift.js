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
  /* the draw's own moment (between the last two steps, as the camera is drawn) */
  function cloudT() { return SIM.t - (1 - SIM.alpha) * SIM_DT; }
  /* a body's centre at t: its laid-out centre c0 carried by its layer's wind (o.w: [x, z] m/s, set when it is made) */
  function cloudPos(o, t, out) {
    var r = out || new Float64Array(3), w = o.w;
    r[0] = o.c0[0] + (w ? w[0] * t : 0); r[1] = o.c0[1]; r[2] = o.c0[2] + (w ? w[1] * t : 0); return r;
  }
