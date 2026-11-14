// The comments in this file keep the tags and file names of the world's development record (design-v5, its rounds,
// fixes and judges; notes.md, w04b_sky.js, diag.js and the like), which lives outside this repository (CLAUDE.md).
/* realm-above.js — the ABOVE kit: the sea of cloud's surface, its towers, canyons, floating islands and light. It is
   not a place of its own: the one world (world.js) raises its sea where the maps' cloud weight says, its pieces
   scattered by density and seated on the local sea, its light blended with the other kits'. */
(function () {
  'use strict';
  if (window.WORLD && window.WORLD.stamp) window.WORLD.stamp('realm-above.js top');   // (the record bounds each script's evaluation)
  var W = window.WORLD;
  if (!W || !W.forms) return;
  var K = W.kit, F = W.forms, lch = K.lch, PI = Math.PI;
  var floatIslandG = F.floatIslandG, isleTemple = F.isleTemple, stupa = F.stupa;

  /* ------------------------------------------------------------------ ABOVE: the sunrise over the sea of cloud, endless */
  /* The sea of cloud is one field over the plane (broad swells and heaps of billows). Over it, the areas, a site per
     1.2 km cell: open sea (a tower now and then), a canyon (two walls of cloud along an axis, a slot of sky between
     them, a white flock wheeling down it), a sea of towering clouds, small floating islands (a stupa on some), and the
     island with its temple (the low sun behind it, seen from the side away from the sun). */
  var AS = 1200, CUT_A = [51, 107, 174, 225, 256];   // open, canyon, towers, islands, isle
  function aSite(ix, iz, salt) {
    var h = K.cellHash(ix, iz, salt), k = K.hk(h, 2) >>> 24, kind = 0;
    while (k >= CUT_A[kind]) kind++;
    return { ix: ix, iz: iz, h: h, kind: kind, x: (ix + 0.2 + 0.6 * K.hfl(h)) * AS, z: (iz + 0.2 + 0.6 * K.hfl(K.hk(h, 1))) * AS,
      r: [K.hfl(K.hk(h, 3)), K.hfl(K.hk(h, 4)), K.hfl(K.hk(h, 5)), K.hfl(K.hk(h, 6))] };
  }
  var ABOVE_GLSL = `@glsl above-glsl`;
  var A_STONE = [1, 1, 1, 5], A_HI = [1.25, 1.2, 1.3, 5], A_ROCK = [1, 1, 1, 6], A_GRASS = [1, 1, 1, 4];   // (material codes of its own)
  var A_WL = lch(0.99, 0.02, 60, 1.35), A_WS = lch(0.9, 0.035, 290), CRUISE = 150;
  function aRng(s, k) { return K.RNG(K.hk(s.h, k)); }
  function aTower(C, R, x, z, Wt, Ht, seed, poi) {
    C.cloud({ kind: 'cumulus', x: x, z: z, y: R.r(-30, 0), w: Wt, h: Ht, seed: seed });
    if (poi) C.poi({ kind: 'tower', x: x, z: z, y: CRUISE, pass: Wt * 0.55 + 80 });
  }
  function aIsland(C, R, x, z, y, r, stupaP) {
    var depth = r * R.r(1.0, 1.6);
    C.add({ kind: 'island', x: x, z: z, air: true, y: y, yaw: R.r(0, 360), r: r, depth: depth, stupa: R.f() < stupaP, seed: R.seed(), spheres: [0, -depth * 0.35, 0, Math.max(r, depth * 0.55) * 1.1, 0, r * 0.4, 0, r * 0.7] });
    C.poi({ kind: 'island', x: x, z: z, y: y, pass: r + 70 });
  }
  W.realm({
    id: 'above', margin: 26,   // (what worldDef reads: world.js)
    glsl: ABOVE_GLSL,
    layout: { scales: [{ size: AS, radius: 3800 }] },
    field: function () {
      return { params: [lch(0.64, 0.06, 268), lch(0.60, 0.065, 272), lch(0.56, 0.05, 165), lch(0.78, 0.07, 262), lch(0.68, 0.07, 150), lch(0.56, 0.06, 285)] };   // (the isles' stone and rock lit by the sky and the cloud sea's light under them: at L 0.16-0.36 their undersides show near-black behind the name)
    },
    /* the cloud's shade (clShade 0.67, clDeep 0.60) the sky's blue (towers stand behind the name at the one framing);
       strong aerial perspective (fog.w 1.1e-4: far towers and rock fade toward the horizon's light) */
    light: function (R) {
      return {
        sunAz: R.r(0, 360), sunEl: R.r(7, 10), sunC: lch(0.97, 0.035, 85, 2.2),
        sky: [lch(0.54, 0.11, 262), lch(0.80, 0.05, 238), lch(0.76, 0.07, 234), lch(0.69, 0.1, 236), lch(0.61, 0.125, 242), lch(0.55, 0.135, 252)],
        skyE: [2, 7, 14, 30], skyW: lch(0.88, 0.045, 205), skyK: [0.4, 6, 0.12, 0],
        glow: [0.12, 22, 0.05, 300], glowC: lch(0.97, 0.03, 95),
        fog: [1.0e-4, 1 / 260, 0, 1.1e-4], fog2: [0.42, 0.015, 0, 0], fogB: [lch(0.56, 0.13, 258), 0.7],
        ambU: lch(0.66, 0.11, 255), ambD: lch(0.6, 0.08, 290),
        clLit: lch(0.84, 0.07, 330), clShade: lch(0.67, 0.115, 257), clDeep: lch(0.60, 0.12, 262), clRim: lch(0.97, 0.05, 50, 1.0),
        clK: [0.86, 0.45, 0.42, 0.3], clK2: [0.18, 0.62, 0.55, 0.22], clDetail: [80, 5],
        discR: 6.5, discI: 1.05, disc: 1, stars: 0, hi: [0.2, 0.35, 0.0012, 0.003], hiC: lch(0.95, 0.03, 230),
        bloom: [1.15, 0.42, 0.11], shafts: 0.55, shaftC: lch(0.96, 0.03, 100), exposure: 1.0, sat: 1.06, lift: [0, 0, 0.004], gain: [1, 1, 1],
        cl: [7.0, 0.13, 0.003, 1], inCloudK: 1.0
      };
    },
    cell: function (C, R) {
      var s = aSite(C.ix, C.iz, C.salt), Rs, k, a, d;
      if (s.kind === 1) {   // a canyon: walls of cloud on both sides of its axis, in runs, lower toward its mouths
        Rs = aRng(s, 11);
        var th = s.r[0] * PI, L = 900 + 400 * s.r[1], half = 175 + 60 * s.r[2], dx = Math.sin(th), dz = Math.cos(th), px = dz, pz = -dx;
        for (var si = 0; si < 2; si++) {
          var sd = si ? 1 : -1, u = -L / 2 - Rs.r(0, 120), n = 0;
          while (u < L / 2 && n < 3) {
            var len = Rs.r(360, 520), thick = Rs.r(170, 250), endp = u + len > L / 2 - 100 || u < -L / 2 + 40, H = endp ? Rs.r(260, 360) : Rs.r(430, 600), off = sd * (half + thick * 0.5);
            C.cloud({ kind: 'wall', x: s.x + dx * u + px * off, z: s.z + dz * u + pz * off, y: Rs.r(-50, -25), dir: th, len: len, thick: thick, h: H, face: -sd, seed: K.hk(s.h, 100 + si * 10 + n) });
            u += len * Rs.r(0.82, 0.97); n++;
          }
        }
        // its two mouths, each a point of interest
        var e1 = L / 2 + 160;
        var m1 = [s.x - dx * e1, s.z - dz * e1], m2 = [s.x + dx * e1, s.z + dz * e1];
        C.poi({ kind: 'canyon', x: m2[0], z: m2[1], y: CRUISE, pass: 0 });
        C.poi({ kind: 'canyon', x: m1[0], z: m1[1], y: CRUISE, pass: 0 });
        if (Rs.f() < 0.85) C.flock({ kind: 'bird', n: 20 + Rs.i(10), x: s.x, z: s.z, y: CRUISE + Rs.r(-10, 25), orbit: Rs.r(36, 60), wheel: Rs.sign() * Rs.r(0.18, 0.3), size: Rs.r(2.4, 3.1), flap: 2.6, spread: Rs.r(12, 20), lit: A_WL, shade: A_WS });
      } else if (s.kind === 2) {   // a sea of towering clouds
        Rs = aRng(s, 21); var nt = 2 + Rs.i(2);
        for (k = 0; k < nt; k++) { a = Rs.r(0, 2 * PI); d = Rs.r(0, 460); var Wt = Rs.r(260, 480); aTower(C, Rs, s.x + Math.sin(a) * d, s.z + Math.cos(a) * d, Wt, Wt * Rs.r(1.1, 1.7), K.hk(s.h, 120 + k), true); }
      } else if (s.kind === 3) {   // small floating islands, a stupa on some; white birds about them
        Rs = aRng(s, 31); var ni = 2 + Rs.i(3);
        for (k = 0; k < ni; k++) { a = Rs.r(0, 2 * PI); d = Rs.r(0, 480); aIsland(C, Rs, s.x + Math.sin(a) * d, s.z + Math.cos(a) * d, Rs.r(170, 430), Rs.r(28, 60), 0.6); }
        if (Rs.f() < 0.6) C.flock({ kind: 'bird', n: 14 + Rs.i(10), x: s.x, z: s.z, y: Rs.r(200, 320), orbit: Rs.r(40, 70), wheel: Rs.sign() * Rs.r(0.15, 0.25), size: Rs.r(2.4, 3.2), flap: 2.5, spread: Rs.r(16, 30), lit: A_WL, shade: A_WS });
        if (Rs.f() < 0.4) { var Wq = Rs.r(260, 420); aTower(C, Rs, s.x + Rs.r(-500, 500), s.z + Rs.r(-500, 500), Wq, Wq * Rs.r(1.1, 1.5), K.hk(s.h, 130), true); }
      } else if (s.kind === 4) {   // the island and its temple, the low sun behind them as seen from the side away from it
        Rs = aRng(s, 41);
        var sun = C.V.light, r = Rs.r(110, 140), D = 950, y = CRUISE + D * Math.tan(sun.sunEl * PI / 180) - r * 0.55, size = r * Rs.r(0.9, 1.1);
        C.add({ kind: 'isle', x: s.x, z: s.z, air: true, y: y, yaw: Rs.r(0, 360), r: r, depth: r * Rs.r(1.1, 1.5), size: size, seed: K.hk(s.h, 42), spheres: [0, -r * 0.45, 0, r * 1.18, 0, size * 0.55, 0, size * 0.8] });
        C.poi({ kind: 'isle', x: s.x, z: s.z, y: y + r * 0.4, pass: r + 190 });
        C.flock({ kind: 'bird', n: 18 + Rs.i(9), x: s.x + Rs.r(-60, 60), z: s.z + Rs.r(-60, 60), y: y + r * Rs.r(0.1, 0.6), orbit: Rs.r(r * 0.9, r * 1.4), wheel: Rs.sign() * Rs.r(0.12, 0.2), size: Rs.r(2.6, 3.4), flap: 2.4, spread: Rs.r(30, 60), lit: A_WL, shade: A_WS });
        var nsm = 1 + Rs.i(2);
        for (k = 0; k < nsm; k++) { a = Rs.r(0, 2 * PI); d = Rs.r(320, 600); aIsland(C, Rs, s.x + Math.sin(a) * d, s.z + Math.cos(a) * d, Rs.r(170, 380), Rs.r(26, 50), 0.6); }
      } else if (R.f() < 0.5) { var Wo = R.r(260, 460); aTower(C, R, s.x, s.z, Wo, Wo * R.r(1.1, 1.6), R.seed(), true); }
      // rays gliding over the open sea, world-anchored and scattered by density: each slowly circling its own place,
      // below the cruise
      for (k = 0; k < 2; k++) {
        var rx = C.x0 + R.r(0.1, 0.9) * C.size, rz = C.z0 + R.r(0.1, 0.9) * C.size, rp = R.f(), rn = 1 + R.i(2), ry = CRUISE - R.r(25, 60), ro = R.r(60, 120), rw = R.sign() * R.r(0.03, 0.05), rs = R.r(10, 14);
        if (rp < 0.45) C.flock({ kind: 'ray', n: rn, x: rx, y: ry, z: rz, orbit: ro, wheel: rw, size: rs, flap: 0.22, spread: 14, lit: lch(0.52, 0.07, 258), shade: lch(0.3, 0.07, 265) });
      }
      // the skyline: now and then a great cumulus
      if (R.f() < 0.2) { var Wf = R.r(700, 1100), fx = C.x0 + R.r(0.15, 0.85) * C.size, fz = C.z0 + R.r(0.15, 0.85) * C.size, dd = Math.sqrt((fx - s.x) * (fx - s.x) + (fz - s.z) * (fz - s.z)); if (s.kind === 0 ? dd > 400 : dd > 900) aTower(C, R, fx, fz, Wf, Wf * R.r(0.8, 1.3), R.seed(), false); }
    },
    build: function (it, B, R) {
      if (it.kind === 'island') return (function* () { yield* floatIslandG(B, R, it.r, it.depth, A_ROCK, A_GRASS); if (it.stupa) { B.xf(0, it.r * 0.05, 0); stupa(B, R, it.r * R.r(0.6, 0.9), A_STONE, A_HI); } })();   // (a few rows at a time)
      else if (it.kind === 'isle') return (function* () { yield* floatIslandG(B, R, it.r, it.depth, A_ROCK, A_GRASS); B.push(); B.xf(0, it.r * 0.04, 0); yield* isleTemple(B, R, it.size, A_STONE, A_HI); B.pop(); })();   // (a part at a time)
    },
    cloud: function (cl, PF, R) {
      // (smaller, crisper billows than DUNES' far banks: cells about a quarter of a lobe, a harder edge)
      if (cl.kind === 'wall') K.wall(PF, R, cl.x, cl.base, cl.z, cl.dir, cl.len, cl.thick, cl.h, { face: cl.face, noise: 2.4, band: 0.05 });
      else if (cl.kind === 'cumulus') K.cumulus(PF, R, cl.x, cl.base, cl.z, cl.w, cl.h, { puff: 1.25, noise: 2.2, band: 0.045 });
    }
  });
})();
