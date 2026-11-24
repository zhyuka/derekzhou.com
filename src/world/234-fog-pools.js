  /* ---------------------------------------------------------------- the fog pools (delight-weather: AIR's events) */
  /* A fog pool: the visit's mist drained into one hollow (AIR's site, kind 'fogpool', 216-events.js: where it is, its
     basin's radius r and its depth for the mist now, evPoolDepth). Its reader is the land: the pool fills the lowest
     ground within r of the site to that depth, held under the basin's own rim, so it never spills (the shoreline is the
     ground's own; no edge is drawn at r). The floor is the lowest land on a grid within r, the rim the lowest land on the
     circle at r (the pass it would spill through), both read once a site from the realm's probe (the land's own height,
     probeJob mode 0), asynchronously, as the cells read theirs. The top: min(floor + depth, rim - FOG_SPILL). It comes
     and goes with the one mist (L.mist, 229-mist-pools.js): no mist, no pool, and the level moves at the mist's own rate
     (AIR_MIST_RATE times the drain's gain), a moving shoreline, never a fade. Drawn by the mist pools' own shading
     (mistOver, world-glsl: fogTopAt beside mistTop), so it looks as they do. The nearest fog site within FOG_REACH only:
     the lattice keeps them about 8 km apart, so one is in view at a time. The camera's ground never reads it (as the
     mist pools); the flight keeps over it by its own floor (fogTopAt in 270's hard rule and 280's height) */
  var FOG_N = 24, FOG_RIM = 64, FOG_REACH = 4000, FOG_SPILL = 0.5;
  var FOG = { id: null, V: null, j: null, lo: 0, rim: 0 }, FOGU = new Float32Array(4);
  function fogPts(s) {   // the probe's points: a FOG_N x FOG_N grid over the basin's square (its share of r: g), then FOG_RIM on its circle
    var pts = [], i, a, g = function (k) { return 2 * (k + 0.5) / FOG_N - 1; };
    for (i = 0; i < FOG_N * FOG_N; i++) pts.push(s.x + s.r * g(i % FOG_N), s.z + s.r * g((i / FOG_N) | 0));
    for (i = 0; i < FOG_RIM; i++) { a = 2 * PI * i / FOG_RIM; pts.push(s.x + s.r * Math.cos(a), s.z + s.r * Math.sin(a)); }
    return pts;
  }
  function fogStep(V, L) {   // L.fogPool: [x, z, r, top] of the pool in view, or null
    L.fogPool = null;
    if (!(L.mist > 0)) return;
    var near = eventsNear(CAM.pos[0], CAM.pos[2], FOG_REACH), s = null, i, J, p, dx, dz;
    for (i = 0; i < near.length && !s; i++) if (near[i].kind === 'fogpool') s = near[i];
    if (!s) return;
    if (FOG.id !== s.id || FOG.V !== V) {
      if (FOG.j) FOG.j.cancel = true;
      FOG.id = s.id; FOG.V = V; p = fogPts(s); FOG.j = probeJob(V, p, p.length / 2, 0, false); FOG.j.p = p;
    }
    J = FOG.j;
    if (J) {   // (the basin read: its floor the lowest land within r, its rim the lowest land on the circle at r)
      if (!J.done) return;
      FOG.lo = FOG.rim = 1e9;
      for (i = 0; i < J.n; i++) {
        dx = J.p[2 * i] - s.x; dz = J.p[2 * i + 1] - s.z;
        if (i >= FOG_N * FOG_N) FOG.rim = Math.min(FOG.rim, J.h[i]); else if (dx * dx + dz * dz <= s.r * s.r) FOG.lo = Math.min(FOG.lo, J.h[i]);
      }
      FOG.lo = Math.min(FOG.lo, FOG.rim); FOG.j = null;
    }
    var top = Math.min(FOG.lo + evPoolDepth(s, L.mist), FOG.rim - FOG_SPILL);
    if (top > FOG.lo) L.fogPool = [s.x, s.z, s.r, top];
  }
  function fogTopAt(V, x, z) {   // the pool's top over (x, z), m, or -Infinity (none there)
    var f = V && V.L && V.L.fogPool;
    return f && (x -= f[0]) * x + (z -= f[1]) * z < f[2] * f[2] ? f[3] : -Infinity;
  }
  function fogU(u, L) {
    FOGU.set(L.fogPool || [0, 0, 0, -1e4]); gl.uniform4fv(u.uFogP, FOGU);
  }
