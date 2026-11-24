  /* ---------------------------------------------------------------- the fog pools (delight-weather: AIR's events) */
  /* A fog pool: the visit's mist drained into one hollow (AIR's site, kind 'fogpool', 216-events.js: where it is, its
     basin's radius r, the ring it drains (EV_POOL.catch times r) and its depth for the mist now, evPoolDepth). Its reader
     is the land. AIR places a site without the land's height, so it lies on a slope, a flat or over the cloud sea as
     often as in a basin (tools/physics/fog-sim.mjs: at the site itself the rim held every pool to a median 4 m, 1% of
     the basin). So the pool takes the hollow the site drains: of FOG_K x FOG_K centres over the ring (within catch x r,
     over land: the cloud sea's weight under 0.5), the one whose rim (the lowest land on its circle at r) stands highest
     over its floor (the lowest centre within r of it). It fills that hollow to AIR's depth, held FOG_SPILL under the rim,
     so it never spills (the shoreline is the ground's own; no edge is drawn at r); no hollow over land, no pool. The
     centres and their rims are read once a site from the realm's probe (the land's own height, probeJob mode 0),
     asynchronously, as the cells read theirs. Still the site's (placed by where it is, never by the way flown). It comes
     and goes with the one mist (L.mist, 229-mist-pools.js): no mist, no pool, and the level moves at the mist's own rate
     times the drain's gain, a moving shoreline, never a fade. Drawn by the mist pools' own shading (mistOver,
     world-glsl: fogTopAt beside mistTop), so it looks as they do. The nearest fog site within FOG_REACH only: the lattice
     keeps them about 8 km apart, so one is in view at a time. The camera's ground never reads it (as the mist pools);
     the flight keeps over it by its own floor (fogTopAt in 270's hard rule and 280's height) */
  var FOG_K = 9, FOG_RIM = 16, FOG_REACH = 4000, FOG_SPILL = 0.5;
  var FOG = { id: null, V: null, j: null, h: null }, FOGU = new Float32Array(4);
  function fogPts(s) {   // the probe's points: each of FOG_K x FOG_K centres over the drained ring's square, then its FOG_RIM on its circle at r
    var pts = [], R = EV_POOL.catch * s.r, i, k, x, z, a;
    for (i = 0; i < FOG_K * FOG_K; i++) {
      x = s.x + R * (2 * (i % FOG_K) / (FOG_K - 1) - 1); z = s.z + R * (2 * ((i / FOG_K) | 0) / (FOG_K - 1) - 1); pts.push(x, z);
      for (k = 0; k < FOG_RIM; k++) { a = 2 * PI * k / FOG_RIM; pts.push(x + s.r * Math.cos(a), z + s.r * Math.sin(a)); }
    }
    return pts;
  }
  function fogPick(s, p, h) {   // the hollow: [x, z, floor, rim] of the centre whose rim stands highest over its floor, over land, or null
    var m = FOG_RIM + 1, R = EV_POOL.catch * s.r, best = null, i, j, k, x, z, lo, rim;
    for (i = 0; i < FOG_K * FOG_K; i++) {
      x = p[2 * i * m]; z = p[2 * i * m + 1];
      if ((x - s.x) * (x - s.x) + (z - s.z) * (z - s.z) > R * R || kitAt(x, z).wC >= 0.5) continue;
      for (lo = 1e9, j = 0; j < FOG_K * FOG_K; j++) if ((p[2 * j * m] - x) * (p[2 * j * m] - x) + (p[2 * j * m + 1] - z) * (p[2 * j * m + 1] - z) < s.r * s.r) lo = Math.min(lo, h[j * m]);
      for (rim = 1e9, k = 1; k < m; k++) rim = Math.min(rim, h[i * m + k]);
      if (rim > lo && (!best || rim - lo > best[3] - best[2])) best = [x, z, lo, rim];
    }
    return best;
  }
  function fogStep(V, L) {   // L.fogPool: [x, z, r, top] of the pool in view, or null
    L.fogPool = null;
    if (!(L.mist > 0)) return;
    var near = eventsNear(CAM.pos[0], CAM.pos[2], FOG_REACH), s = null, i, J, p, b;
    for (i = 0; i < near.length && !s; i++) if (near[i].kind === 'fogpool') s = near[i];
    if (!s) return;
    if (FOG.id !== s.id || FOG.V !== V) {
      if (FOG.j) FOG.j.cancel = true;
      FOG.id = s.id; FOG.V = V; FOG.h = null; p = fogPts(s); FOG.j = probeJob(V, p, p.length / 2, 0, false); FOG.j.p = p;
    }
    J = FOG.j;
    if (J) { if (!J.done) return; FOG.h = fogPick(s, J.p, J.h); FOG.j = null; }
    if (!(b = FOG.h)) return;
    var top = Math.min(b[2] + evPoolDepth(s, L.mist), b[3] - FOG_SPILL);
    if (top > b[2]) L.fogPool = [b[0], b[1], s.r, top];
  }
  function fogTopAt(V, x, z) {   // the pool's top over (x, z), m, or -Infinity (none there)
    var f = V && V.L && V.L.fogPool;
    return f && (x -= f[0]) * x + (z -= f[1]) * z < f[2] * f[2] ? f[3] : -Infinity;
  }
  function fogU(u, L) {
    FOGU.set(L.fogPool || [0, 0, 0, -1e4]); gl.uniform4fv(u.uFogP, FOGU);
  }
