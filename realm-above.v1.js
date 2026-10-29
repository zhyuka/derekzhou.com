// The comments in this file keep the tags and file names of the world's development record (design-v5, its rounds,
// fixes and judges; notes.md, w04b_sky.js, diag.js and the like), which lives outside this repository (CLAUDE.md).
/* realm-above.js — the ABOVE kit (world6): the sea of cloud's surface, its towers, canyons, floating islands and light.
   It no longer is a place of its own: the one world (world.js, w04_world.js) raises its sea where the maps' cloud
   weight says, its pieces scattered by density and seated on the local sea, its light blended with the other kits'. */
(function () {
  'use strict';
  if (window.WORLD && window.WORLD.stamp) window.WORLD.stamp('realm-above.js top');   // (E0 Fix 3: the record bounds each script's evaluation)
  var W = window.WORLD;
  if (!W || !W.forms) return;
  var K = W.kit, F = W.forms, lch = K.lch, PI = Math.PI;
  var floatIslandG = F.floatIslandG, isleTemple = F.isleTemple, stupa = F.stupa;

  /* ------------------------------------------------------------------ ABOVE: the sunrise over the sea of cloud, endless */
  /* The sea of cloud is one field over the plane (broad swells and heaps of billows). Over it, the areas, a site per
     1.2 km cell: open sea (a tower now and then), a canyon (two walls of cloud along an axis, a slot of sky between
     them, a white flock wheeling down it; the autopilot flies it from one mouth to the other), a sea of towering clouds,
     small floating islands (a stupa on some), and the island with its temple (approached from the side away from the
     sun, so the low sun stands behind it). */
  var AS = 1200, CUT_A = [51, 107, 174, 225, 256];   // open, canyon, towers, islands, isle
  function aSite(ix, iz, salt) {
    var h = K.cellHash(ix, iz, salt), k = K.hk(h, 2) >>> 24, kind = 0;
    while (k >= CUT_A[kind]) kind++;
    return { ix: ix, iz: iz, h: h, kind: kind, x: (ix + 0.2 + 0.6 * K.hfl(h)) * AS, z: (iz + 0.2 + 0.6 * K.hfl(K.hk(h, 1))) * AS,
      r: [K.hfl(K.hk(h, 3)), K.hfl(K.hk(h, 4)), K.hfl(K.hk(h, 5)), K.hfl(K.hk(h, 6))] };
  }
  var ABOVE_GLSL = `
#define A_STONE_LIT uP[12].rgb
#define A_STONE_SHADE uP[13].rgb
#define A_GRASS uP[14].rgb
#define A_MIST uP[15].rgb
#define A_SEALIT uP[15].x   /* (tod) how much of the light the cloud sea's tops take (the world's sky sets it: 1 by day; the afterglow's and the light before sunrise's seas in the Earth's shadow) */
#define A_GRASS_LIT uP[16].rgb
#define A_ROCK_DEEP uP[17].rgb
/* the sea of cloud: broad swells and heaps of billows, round tops and creases between */
vec3 A_Hd(vec2 p) {
  vec3 h = 30.0 * dN(p, mat2(1.0 / 900.0)) + 12.0 * dN(p + 77.0, mat2(0.8, 0.6, -0.6, 0.8) * (1.0 / 380.0));
  h += 28.0 * dAbs(dN(p + vec2(13.0, 5.0), mat2(1.0 / 210.0)), 0.04);
  h += 12.0 * dAbs(dN(p + vec2(-41.0, 19.0), mat2(0.6, 0.8, -0.8, 0.6) * (1.0 / 75.0)), 0.05);
  h += 4.0 * dAbs(dN(p + vec2(7.0, -3.0), mat2(1.0 / 26.0)), 0.07);
  // (world6 step B) the near domes the low flight sees (48 m and 17 m, round tops), faded out with the vertex's distance
  // (gLodD: 0 in the probes, so the camera's ground keeps them) before the clipmap's spacing could alias them
  float k1 = 1.0 - smoothstep(350.0, 900.0, gLodD), k2 = 1.0 - smoothstep(120.0, 380.0, gLodD);
  if (k1 > 0.0) h += (9.0 * k1) * dAbs(dN(p + vec2(-19.0, 31.0), mat2(0.9, -0.44, 0.44, 0.9) * (1.0 / 48.0)), 0.08);
  if (k2 > 0.0) h += (3.5 * k2) * dAbs(dN(p + vec2(5.0, 23.0), mat2(1.0 / 17.0)), 0.1);
  return h;
}
/* (world6 step B) the sea's near billows, seen from 14-32 m now (step A's ABOVE was seen from 150 m, where its 26-75 m
   heaps gave the frame its texture; up close they read as a flat plain: the ruler's flat floor 0.027): cauliflower
   lumps of 7 m and 2.6 m (a smooth abs of gradient noise, analytic gradients) tilt the normal the sun and sky light,
   each faded out by the pixel's footprint (the 7 m lumps by 0.1-0.4 m a pixel: never under 17 px a lump; the 2.6 m by
   0.04-0.15), so they never come under a few pixels (G0) */
vec3 A_bump(vec2 q, float fp) {
  float k1 = 1.0 - smoothstep(0.1, 0.4, fp), k2 = 1.0 - smoothstep(0.04, 0.15, fp);
  vec2 g = vec2(0.0);
  if (k1 > 0.002) { vec3 a = gnd(q / 7.0 + vec2(3.1, 7.7)); float s = a.x / sqrt(a.x * a.x + 0.0064); g += k1 * 2.2 * s * a.yz / 7.0; }
  if (k2 > 0.002) { vec3 c = gnd(mat2(0.8, 0.6, -0.6, 0.8) * q / 2.6 + vec2(11.3, 5.9)); float s = c.x / sqrt(c.x * c.x + 0.0064); g += k2 * 0.7 * s * c.yz / 2.6; }
  return vec3(g.x, 0.0, g.y);
}
vec3 A_shadeSea(vec3 p, vec3 n, vec3 rd, float t, float fp) {
  n = normalize(n - A_bump(p.xz, fp));
  // the sea's own heaps: their tops catch the low sun (pink), the creases between sink into the sky's blue
  float hgt = smoothstep(-25.0, 55.0, p.y);
  float crease = smoothstep(-8.0, 16.0, p.y - 30.0 * gn(p.xz / 900.0));
  float ndl = dot(n, uSun);
  float tauL = (1.0 - hgt) * 2.8 + max(0.0, -ndl) * 3.6 + 0.6;
  float rr = 1.0 - clamp(dot(n, -rd), 0.0, 1.0);
  float ao = mix(0.45, 1.0, hgt) * mix(0.75, 1.0, crease);   // (world6 step B: the creases' shade lifted a little (0.25, 0.6 before): the links stand over the near sea now)
  vec3 c = cloudLight(n, rd, tauL, ao, hgt, rr * rr * rr * rr * 0.06);
  /* (world6 step B fix, defects 3 and 12) the sea's own light at the low framing: the heaps' tops (the normal near
     upright, high on their swell) catch the whole bright sky over them and glow toward the cloud's lit colour, while
     their flanks keep the sky's blue shade (cloudLight's): seen from 14-32 m, the near heaps (48 m and 17 m domes, the
     75-210 m billows) read by their light, lit tops against shaded sides, as the reference's low flights over cloud do;
     the step lit only what faced the low sun, and the sea was one even periwinkle (OKLab L spread 0.028). The troughs
     stay over black's floor by the world's toe (FS_COMP), never by flattening */
  float top = smoothstep(0.84, 0.985, n.y) * smoothstep(0.2, 0.75, hgt) * smoothstep(-0.2, 0.4, crease - 0.3);
  c = mix(c, uClLit * vec3(1.04, 1.03, 1.05) * A_SEALIT, 0.78 * top);
  c = mix(c, uClDeep, 0.35 * smoothstep(0.93, 0.7, n.y) * (1.0 - hgt * 0.5));   // (the flanks turned from the sky: its blue)
  return c;
}
vec3 A_shadeStone(vec3 p, vec3 n, vec3 rd, float t, float fp, vec4 col, float yAbove) {
  float ndl = dot(n, uSun), mat = col.a, dif = smoothstep(-0.15, 0.8, ndl);
  float rr = 1.0 - clamp(dot(n, -rd), 0.0, 1.0), r2 = rr * rr * rr;
  vec3 c;
  if (mat > 3.5) c = mix(A_GRASS, A_GRASS_LIT, dif) * (0.85 + 0.15 * gn(p.xz / 9.0));   // moss and grass
  else if (mat > 1.5 && mat < 2.5) c = mix(A_ROCK_DEEP, A_STONE_SHADE, 0.5 + 0.5 * n.y) * (1.0 + 0.12 * gn(vec2(p.y / 14.0, 2.0)));   // the islands' rock
  else c = mix(A_STONE_SHADE, A_STONE_LIT, dif) * col.rgb + A_STONE_SHADE * 0.25 * max(n.y, 0.0);
  // backlit: the very edge toward the sun glows
  c += uClRim * 0.25 * r2 * r2 * smoothstep(0.3, 0.9, dot(rd, uSun));
  return c;
}
`;
  var A_STONE = [1, 1, 1, 5], A_HI = [1.25, 1.2, 1.3, 5], A_ROCK = [1, 1, 1, 6], A_GRASS = [1, 1, 1, 4];   // (world6: material codes of its own)
  var A_WL = lch(0.99, 0.02, 60, 1.35), A_WS = lch(0.9, 0.035, 290), CRUISE = 150;
  function aRng(s, k) { return K.RNG(K.hk(s.h, k)); }
  function aTower(C, R, x, z, Wt, Ht, seed, poi) {
    C.cloud({ kind: 'cumulus', x: x, z: z, y: R.r(-30, 0), w: Wt, h: Ht, seed: seed });
    if (poi) C.poi({ kind: 'tower', x: x, z: z, y: CRUISE, interest: 0.5, pass: Wt * 0.55 + 80 });
  }
  function aIsland(C, R, x, z, y, r, stupaP) {
    var depth = r * R.r(1.0, 1.6);
    C.add({ kind: 'island', x: x, z: z, air: true, y: y, yaw: R.r(0, 360), r: r, depth: depth, stupa: R.f() < stupaP, seed: R.seed(), spheres: [0, -depth * 0.35, 0, Math.max(r, depth * 0.55) * 1.1, 0, r * 0.4, 0, r * 0.7] });
    C.poi({ kind: 'island', x: x, z: z, y: y, interest: 0.55, pass: r + 70 });
  }
  W.realm({
    id: 'above', words: 'dark', still: 'above', hours: ['dawn'], dur: [70, 110], speed: 21, clear: [95, CRUISE, 520], frame: [0.33, 0.29], look: 200, climb: 40, pitchFollow: 0.2, exitH: [160, 300],
    margin: 26, softMargin: 40,   // (round E1 Fix 2: the tour's heightLine and turn gone with it, design-v5 Revision 3)
    glsl: ABOVE_GLSL,
    surfaces: [{ height: 'Hd', shade: 'shadeSea', g0: 2, levels: 10 }],
    landmarkShade: 'shadeStone',
    layout: { scales: [{ size: AS, radius: 3800 }], volRes: 44 },
    field: function () {
      return { params: [lch(0.64, 0.06, 268), lch(0.60, 0.065, 272), lch(0.56, 0.05, 165), lch(0.78, 0.07, 262), lch(0.68, 0.07, 150), lch(0.56, 0.06, 285)] };   // (world6 step B fix, defect 2: the isles' stone and rock lit by the sky and the cloud sea's light under them (L 0.16-0.36 before: near-black undersides behind the name))
    },
    /* (world6 step B) the cloud's shade (clShade 0.58 -> 0.67, clDeep 0.45 -> 0.60) the sky's blue held over black ink's
       floor (OKLab L 0.567: towers stand behind the name at the one framing); more aerial perspective (fog.w 0.42e-4 ->
       1.1e-4: far towers and rock fade toward the horizon's light) */
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
        // flown from mouth to mouth: first a point out along the axis, then the mouth, then through to the far one
        var e1 = L / 2 + 160, e2 = L / 2 + 620;
        var m1 = [s.x - dx * e1, s.z - dz * e1], m2 = [s.x + dx * e1, s.z + dz * e1], o1 = [s.x - dx * e2, s.z - dz * e2], o2 = [s.x + dx * e2, s.z + dz * e2];
        C.poi({ kind: 'canyon', x: m2[0], z: m2[1], y: CRUISE, path: [o1, m1], interest: 1.0, pass: 0 });
        C.poi({ kind: 'canyon', x: m1[0], z: m1[1], y: CRUISE, path: [o2, m2], interest: 1.0, pass: 0 });
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
        C.poi({ kind: 'isle', x: s.x, z: s.z, y: y + r * 0.4, interest: 1.0, pass: r + 190, approach: sun.sunAz + 180, viaD: D });
        C.flock({ kind: 'bird', n: 18 + Rs.i(9), x: s.x + Rs.r(-60, 60), z: s.z + Rs.r(-60, 60), y: y + r * Rs.r(0.1, 0.6), orbit: Rs.r(r * 0.9, r * 1.4), wheel: Rs.sign() * Rs.r(0.12, 0.2), size: Rs.r(2.6, 3.4), flap: 2.4, spread: Rs.r(30, 60), lit: A_WL, shade: A_WS });
        var nsm = 1 + Rs.i(2);
        for (k = 0; k < nsm; k++) { a = Rs.r(0, 2 * PI); d = Rs.r(320, 600); aIsland(C, Rs, s.x + Math.sin(a) * d, s.z + Math.cos(a) * d, Rs.r(170, 380), Rs.r(26, 50), 0.6); }
      } else if (R.f() < 0.5) { var Wo = R.r(260, 460); aTower(C, R, s.x, s.z, Wo, Wo * R.r(1.1, 1.6), R.seed(), true); }
      // (world6 fix) rays gliding over the open sea, world-anchored and scattered by density (the step's were spawned
      // ahead of the camera on a clock): each slowly circling its own place, below the cruise
      if (C.weights) for (k = 0; k < 2; k++) {
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
    },
    particles: function () { var mote = lch(0.97, 0.04, 90, 1.6); return [{ count: 220, box: 150, height: 70, streak: 0, width: 1.5, wind: [1.2, 0.2, 0.5], color: [mote[0], mote[1], mote[2], 0.55], hop: [0, 0, 0, 2] }]; },
    // now and then a ray glides across the open sea ahead, or a white flock crosses
    event: function (V, R, cam) {
      var ray = R.f() < 0.5, d = R.r(ray ? 90 : 140, ray ? 160 : 260), lat = R.sign() * R.r(40, 110), fx = Math.sin(cam.psi), fz = Math.cos(cam.psi), px = fz, pz = -fx, cr = lat > 0 ? -1 : 1;
      var x = cam.x + fx * d + px * lat, z = cam.z + fz * d + pz * lat;
      if (ray) return { next: R.r(16, 26), life: 34, flock: { kind: 'ray', n: 1 + R.i(2), x: x, y: cam.y - R.r(25, 60), z: z, drift: [px * cr * 7.5 + fx * 4, pz * cr * 7.5 + fz * 4], orbit: 18, wheel: 0.02, size: R.r(10, 14), flap: 0.22, spread: 14, lit: lch(0.52, 0.07, 258), shade: lch(0.3, 0.07, 265) } };
      return { next: R.r(16, 26), life: 34, flock: { kind: 'bird', n: 16 + R.i(10), x: x, y: cam.y + R.r(-20, 30), z: z, drift: [px * cr * 6 + fx * 3, pz * cr * 6 + fz * 3], orbit: R.r(26, 40), wheel: R.sign() * R.r(0.22, 0.36), size: R.r(2.4, 3.0), flap: 2.6, spread: R.r(10, 18), lit: A_WL, shade: A_WS } };
    }
  });
})();
