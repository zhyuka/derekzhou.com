// The comments in this file keep the tags and file names of the world's development record (design-v5, its rounds,
// fixes and judges; notes.md, w04b_sky.js, diag.js and the like), which lives outside this repository (CLAUDE.md).
/* realm-dunes.js — the DUNES kit (world6): the sand province's land, rock, landmarks and light. It no longer is a place
   of its own: the one world (world.js, w04_world.js) draws its land everywhere, its dunes' height by the maps' sand
   weight (gKD) and sunk under the cloud sea by theirs, its landmarks scattered by density, its light blended with the
   other kits' by the smoothed climate. Its bays are gone (the cloud sea is the maps'). */
(function () {
  'use strict';
  if (window.WORLD && window.WORLD.stamp) window.WORLD.stamp('realm-dunes.js top');   // (E0 Fix 3: the record bounds each script's evaluation)
  var W = window.WORLD;
  if (!W || !W.forms) return;
  var K = W.kit, F = W.forms, lch = K.lch, PI = Math.PI;
  var mesaG = F.mesaG, butteG = F.butteG, giantShard = F.giantShard, shard = F.shard, menhir = F.menhir, ruinSegment = F.ruinSegment,
    rampartSegment = F.rampartSegment, pillar = F.pillar, stupa = F.stupa, templeStepped = F.templeStepped, stairDown = F.stairDown;

  /* ------------------------------------------------------------------ DUNES: the dawn desert, endless */
  /* The land is one field over the plane: the dune sea (swells, the main dunes as an asymmetric wave across the wind,
     a smaller family across them), the areas laid out over it as regions (a jittered site per 1.5 km cell: open dunes,
     a basin with a giant shard, a field of ruins, a temple on a plateau in terraces, a bay where the land falls to a sea
     of cloud), and far ridges of rock (a site per 4.5 km cell, about half of them). The sites are hashed from the
     visit's salt the same way here and in the GLSL, so the land the shaders raise and the things the cells place agree. */
  var DS = 1500, RS = 4500, SEA_Y = -160;
  var CUT_D = [77, 123, 169, 205, 256];   // the areas' shares (of 256): open, shard, ruins, temple, bay
  function dSite(ix, iz, salt) {
    var h = K.cellHash(ix, iz, salt), k = K.hk(h, 2) >>> 24, kind = 0;
    while (k >= CUT_D[kind]) kind++;
    if (kind === 4) kind = 0;   // (world6: no bays: the cloud sea is the maps')
    return { ix: ix, iz: iz, h: h, kind: kind, x: (ix + 0.2 + 0.6 * K.hfl(h)) * DS, z: (iz + 0.2 + 0.6 * K.hfl(K.hk(h, 1))) * DS,
      r: [K.hfl(K.hk(h, 3)), K.hfl(K.hk(h, 4)), K.hfl(K.hk(h, 5)), K.hfl(K.hk(h, 6))] };
  }
  var DUNES_GLSL = `
#define SAND_LIT uP[0].rgb
#define SAND_LIT2 uP[1].rgb
#define SAND_SHADE uP[2].rgb
#define SAND_DEEP uP[3].rgb
#define ROCK_LIT uP[4].rgb
#define ROCK_SHADE uP[5].rgb
#define STONE_LIT uP[6].rgb
#define STONE_SHADE uP[7].rgb
#define SHEEN uP[8].rgb
#define WINDDIR uP[9].xy
#define GLINT uP[9].z
#define SEA_Y uP[9].w
#define ROCK_DEEP uP[10].rgb
#define PALE uP[11].rgb
const float DS = 1500.0, RS = 4500.0;
/* an area's site: its cell's hash (the visit's salt), its place jittered in the cell, its kind, four parameters */
struct Site { vec2 p; int kind; vec4 r; };
Site siteOf(ivec2 c) {
  uint h = cellHash(c); Site s;
  s.p = (vec2(c) + 0.2 + 0.6 * vec2(hf(h), hf(ih(h + 1u)))) * DS;
  uint k = ih(h + 2u) >> 24;
  s.kind = k < 77u ? 0 : (k < 123u ? 1 : (k < 169u ? 2 : (k < 205u ? 3 : 0)));   // (world6: no bays: the cloud sea is the maps')
  s.r = vec4(hf(ih(h + 3u)), hf(ih(h + 4u)), hf(ih(h + 5u)), hf(ih(h + 6u)));
  return s;
}
/* a far ridge: a great ridge of rock (centre, half-length, height; angle, width over length, tilt along it, the steep
   side's share), one face steep and one long, its crest rounded */
vec3 massif(vec2 p, vec4 m, vec4 b, float seed) {
  vec2 d = p - m.xy;
  float ca = cos(b.x), sa = sin(b.x);
  vec2 l = vec2(ca * d.x + sa * d.y, -sa * d.x + ca * d.y) / m.z;
  if (abs(l.x) > 1.3 || abs(l.y) > b.y * 2.2 + 0.2) return vec3(0.0);
  vec2 dlx = vec2(ca, sa) / m.z, dly = vec2(-sa, ca) / m.z;
  vec3 bend = 0.12 * dN(p + vec2(seed * 57.0), mat2(1.1 / m.z));
  vec3 y = vec3(l.y, dly) / b.y - bend;
  float side = y.x > 0.0 ? b.w : 1.0;
  vec3 ay = vec3(abs(y.x), sign(y.x) * y.yz) / side;
  vec3 across = dSstep(1.0, 0.0, ay + 0.12 * dN(p, mat2(2.4 / m.z)));
  across = dMul(across, across) * 0.35 + across * 0.65;
  vec3 along = dSstep(1.15, 0.45, vec3(abs(l.x), sign(l.x) * dlx) + 0.1 * dN(p + 13.0, mat2(2.2 / m.z)));
  vec3 top = vec3(1.0 + b.z * l.x, b.z * dlx) + 0.05 * dN(p + 29.0, mat2(2.2 / m.z));
  return m.w * dMul(dMul(across, along), top);
}
vec3 ridges(vec2 p) {
  vec3 s = vec3(0.0); ivec2 c0 = ivec2(floor(p / RS));
  for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) {
    ivec2 c = c0 + ivec2(i, j); uint h = ih(cellHash(c) ^ 0x51ed27u);
    if ((ih(h + 2u) >> 24) >= 115u) continue;
    vec2 ctr = (vec2(c) + 0.25 + 0.5 * vec2(hf(h), hf(ih(h + 1u)))) * RS;
    // (world6 step B fix, defects 7 and 10) a broad rise of rock, 30-60 m, its faces long (each side 0.6-1 of its half
    // width): the flight's envelope (w06 groundEnv) climbs any of it from within its 320 m grid on any line (the step's
    // great ridges, 240-600 m with faces of 1-6 m/m, met after a drag, threw the camera up them at 467 m/s)
    vec4 m = vec4(ctr, 900.0 + 700.0 * hf(ih(h + 3u)), 30.0 + 30.0 * hf(ih(h + 4u)));
    vec4 b = vec4(hf(ih(h + 5u)) * PI, 0.5 + 0.3 * hf(ih(h + 6u)), (hf(ih(h + 7u)) - 0.5) * 0.3, 0.6 + 0.4 * hf(ih(h + 8u)));
    s += massif(p, m, b, float(i * 3 + j));
  }
  return s;
}
/* one family of dunes: an asymmetric wave across the wind (a long windward slope, a rounded brink, a steep lee
   face, a smooth trough), its phase warped so the crests wander and break */
vec3 duneWave(vec2 p, vec2 w, float lam, float c, vec3 warp) {
  vec3 ph = vec3(dot(p, w) / lam, w / lam) + warp;
  float f = fract(ph.x), s, ds;
  if (f < c) { float x = f / c; s = x * x * (2.0 - x); ds = (4.0 * x - 3.0 * x * x) / c; }
  else { float y = (f - c) / (1.0 - c); s = 1.0 - y * y * (3.0 - 2.0 * y); ds = -6.0 * y * (1.0 - y) / (1.0 - c); }
  return vec3(s, ph.yz * ds);
}
float swell(vec2 p) { return 40.0 * gnd(p * (1.0 / 760.0)).x + 15.0 * gnd(mat2(0.8, 0.6, -0.6, 0.8) * (1.0 / 330.0) * (p + vec2(311.0, -97.0))).x; }
vec3 dunes(vec2 p) {
  vec3 h = 40.0 * dN(p, mat2(1.0 / 760.0)) + 15.0 * dN(p + vec2(311.0, -97.0), mat2(0.8, 0.6, -0.6, 0.8) * (1.0 / 330.0));
  vec2 w = WINDDIR, pp = vec2(-w.y, w.x);
  vec3 warp = 0.42 * dN(p, mat2(1.0 / 340.0)) + 0.13 * dN(p + 71.0, mat2(1.0 / 95.0));
  vec3 s1 = duneWave(p, w, 205.0, 0.68, warp);
  mat2 Ma = mat2(w.x / 420.0, pp.x / 190.0, w.y / 420.0, pp.y / 190.0);
  vec3 amp = dSstep(-0.42, 0.3, dN(p + 400.0, Ma)) * 0.75 + vec3(0.25, 0.0, 0.0);
  h += 32.0 * dMul(dMul(s1, amp), gKD);   // (world6: the main dunes by the maps' sand weight)
  float wSmall = 1.0 - smoothstep(900.0, 1300.0, gLodD);
  if (wSmall > 0.0) {
    vec2 w2 = normalize(w + 1.3 * pp);
    vec3 s2 = duneWave(p + 37.0, w2, 64.0, 0.7, 0.25 * dN(p + 9.0, mat2(1.0 / 80.0)));
    h += (4.0 * wSmall) * dMul(dMul(s2, dSstep(-0.5, 0.4, dN(p + 900.0, mat2(1.0 / 160.0)))), gKD);
  }
  return h;
}
vec3 ovalOut(vec2 p, vec2 c, vec2 ab, float ang) {   // metres outside an oval's rim (about), with its gradient
  vec2 dp = p - c; float cc = cos(ang), s = sin(ang);
  vec2 l = vec2(cc * dp.x + s * dp.y, -s * dp.x + cc * dp.y), ln = l / ab;
  float r = length(ln), m = min(ab.x, ab.y);
  vec2 gl = (ln / ab) / max(r, 1e-4) * m;
  return vec3((r - 1.0) * m, cc * gl.x - s * gl.y, s * gl.x + cc * gl.y);
}
/* a basin: the dunes calmed and sunk about a point (a giant shard's; gentler about the ruins) */
vec3 basinOf(vec2 p, vec3 h, Site s) {
  float R = s.kind == 1 ? 170.0 + 60.0 * s.r.x : 260.0, depth = s.kind == 1 ? 12.0 + 8.0 * s.r.y : 4.0, fl = s.kind == 1 ? 0.55 : 0.4;
  vec2 dp = p - s.p; float d = length(dp);
  if (d >= R) return h;
  vec3 w = dSstep(R, R * 0.25, vec3(d, dp / max(d, 1e-3)));
  return dMul(h, vec3(1.0, 0.0, 0.0) - fl * w) - depth * w;
}
/* a plateau: an oval of flat top, its sides in terraces (a riser, then a ledge), a stair's way cut down its -x face */
vec3 plateauOf(vec2 p, vec3 h, Site s) {
  vec2 ab = vec2(72.0 + 16.0 * s.r.x, 150.0 + 28.0 * s.r.y); float ang = s.r.z * PI;
  float rise = 46.0 + 14.0 * s.r.w, steps = s.r.w < 0.5 ? 2.0 : 3.0;
  vec3 e = ovalOut(p, s.p, ab, ang);
  float stepH = (rise + 10.0) / (steps + 0.5);
  if (e.x > stepH * 9.0 + 140.0) return h;
  float base = swell(s.p) + 8.0, top = base + rise;
  e += 5.0 * dN(p + 17.0, mat2(1.0 / 140.0));
  float Pp = stepH * 2.3, u = max(e.x, 0.0) / Pp, k = floor(u), fr = u - k, x = clamp(fr / 0.3, 0.0, 1.0);
  float rs = x * x * (3.0 - 2.0 * x), drs = fr < 0.3 ? 6.0 * x * (1.0 - x) / 0.3 : 0.0;
  vec3 pl = vec3(top - stepH * (k + rs), e.x > 0.0 ? -stepH * drs / Pp * e.yz : vec2(0.0));
  // the top keeps a little of the dunes' swell (sand lies on it), none at the rim
  pl += (0.16 * sstepDown(0.0, -45.0, e.x)) * (h - vec3(base, 0.0, 0.0));
  // the stair's way down the -x face: the terraces cut to its slope (26 deg), sand drifted over some of its steps
  vec2 dp = p - s.p; float c = cos(ang), sn = sin(ang);
  float lx = c * dp.x + sn * dp.y, ly = -sn * dp.x + c * dp.y;
  if (lx < -ab.x + 4.0 && abs(ly) < 12.0) {
    float ou = -ab.x - lx, w = sstepDown(12.0, 9.5, abs(ly)), drift = 1.4 * max(gn(p / 8.0) + 0.05, 0.0) * smoothstep(0.0, 12.0, ou);
    vec3 ramp = vec3(top - max(ou, 0.0) * 0.4877 + drift, ou > 0.0 ? 0.4877 * vec2(c, sn) : vec2(0.0));
    vec3 cut = dSmin(pl, ramp, 1.5);
    pl = vec3(mix(pl.x, cut.x, w), mix(pl.yz, cut.yz, w));
  }
  return dSmax(h, pl, 5.0);
}
vec3 D_Hd(vec2 p) {
  vec3 h = dunes(p);
  ivec2 c0 = ivec2(floor(p / DS));
  Site S[9];
  for (int j = 0; j < 3; j++) for (int i = 0; i < 3; i++) S[j * 3 + i] = siteOf(c0 + ivec2(i - 1, j - 1));
  for (int k = 0; k < 9; k++) if (S[k].kind == 1 || S[k].kind == 2) h = basinOf(p, h, S[k]);
  for (int k = 0; k < 9; k++) if (S[k].kind == 3) h = plateauOf(p, h, S[k]);
  return h + ridges(p);
}
/* (world6) the bays' sea of cloud and its shading are gone: the cloud sea is the world's (HdSea, shadeSea) */
float D_scatterDensity(vec2 p, int layer) {
  float n = gn(p / 160.0 + float(layer) * 3.7);
  return smoothstep(-0.25, 0.35, n);
}
#ifdef GROUND_CACHE
/* where a sand veil blows from: the brink of the main dunes nearest p (walked along the wind onto the crest line, the
   crests' wander followed twice), the crest's height, and how much of a crest it is (the dunes' height there) */
vec4 veilSpot(vec2 p) {
  vec2 w = WINDDIR, pp = vec2(-w.y, w.x);
  for (int k = 0; k < 2; k++) {
    vec3 warp = 0.42 * dN(p, mat2(1.0 / 340.0)) + 0.13 * dN(p + 71.0, mat2(1.0 / 95.0));
    float df = 0.68 - fract(dot(p, w) / 205.0 + warp.x);
    df -= floor(df + 0.5);
    p += w * df * 205.0;
  }
  mat2 Ma = mat2(w.x / 420.0, pp.x / 190.0, w.y / 420.0, pp.y / 190.0);
  float amp = dSstep(-0.42, 0.3, dN(p + 400.0, Ma)).x;
  return vec4(p, groundH(p), smoothstep(0.3, 0.8, amp));
}
#endif
/* rock: blue stone in broad strata (each band its own tone, warmer in the sun, the lines wandering), streaked down by
   erosion, ledges of a lighter cap */
vec3 rockCol(vec3 p, vec3 n, float ndl, float fp) {
  float y = p.y + 9.0 * gn(p.xz / 260.0);
  float b1 = gn(vec2(y / 38.0, 1.7)), b2 = gn(vec2(y / 11.0, 4.1)), st = b1 * 0.8 + b2 * 0.35;
  float streak = gn(vec2(dot(p.xz, vec2(0.6, 0.8)) / 7.0 + 2.0 * gn(p.xz / 40.0), p.y / 90.0)) * (1.0 - smoothstep(0.6, 3.0, fp));
  float dif = smoothstep(-0.2, 0.7, ndl);
  vec3 shd = mix(ROCK_DEEP, ROCK_SHADE, 0.5 + 0.5 * n.y);
  vec3 lit = ROCK_LIT * mix(vec3(1.0), vec3(1.1, 0.98, 0.94), smoothstep(-0.2, 0.4, b1));
  return mix(shd, lit, dif) * (1.0 + 0.17 * st + 0.08 * streak);
}
vec3 shadeSand(vec3 p, vec3 n0, vec3 rd, float t, float fp) {
  vec3 n = n0;
  float steep = smoothstep(0.42, 0.66, 1.0 - n0.y);
  // ripples across the wind, near only: one tap of the noise gives their turn, wander, spacing and patches
  float rk = (1.0 - smoothstep(0.012, 0.05, fp)) * (1.0 - steep);
  if (rk > 0.002) {
    // (world6 fix, the judges' defect 6) the ripples' phase a fixed wave (along the wind, 0.9 m) and a warp of bounded
    // gradient (their wander, turn and spacing): the step divided the position by a wavelength and turned it by an angle
    // that both varied over the sand, so the pattern's frequency grew with the distance from the world's origin (at
    // x -5000 a few centimetres: fingerprint rings, a G0 risk)
    vec4 nz = n3v(vec3(p.xz / 61.0, 0.71));
    vec2 w = WINDDIR, wp = vec2(-w.y, w.x), wr = normalize(w + wp * (nz.r - 0.5) * 0.6);
    float ph = dot(p.xz, w) / 0.9 + (nz.g - 0.5) * 9.0 + (nz.a - 0.5) * 6.0;
    float sl = cos(6.2831853 * ph) + 0.35 * cos(12.566 * ph + 1.0);
    float rpatch = smoothstep(0.38, 0.62, nz.b);
    n = normalize(n - rk * rpatch * 0.06 * sl * vec3(wr.x, 0.0, wr.y));
  }
  float ndl = dot(n, uSun);
  // the low sun lights the level sand and the faces toward it; the faces turned from it fall into the sky's blue
  float dif = smoothstep(-0.08, 0.26, ndl);
  float hb = smoothstep(-40.0, 50.0, p.y);
  vec3 lit = mix(SAND_LIT, SAND_LIT2, smoothstep(0.16, 0.62, ndl));
  vec3 shd = mix(SAND_DEEP, SAND_SHADE, hb);
  vec3 c = mix(shd, lit, dif);
  float gk = 1.0 - smoothstep(0.01, 0.04, fp);   // (hotfix G0: the grain gone before its cells are under three pixels)
  if (gk > 0.0) c *= 1.0 + gk * 0.07 * (h12(p.xz * 9.0) + h12(p.xz * 9.0 + 0.5) - 1.0);
  if (steep > 0.0) c = mix(c, rockCol(p, n0, dot(n0, uSun), fp), steep);
  float vd = clamp(dot(n, -rd), 0.0, 1.0), gr = 1.0 - vd;
  c += SHEEN * gr * gr * gr * gr * smoothstep(-0.05, 0.6, ndl) * (1.0 - steep);
  // (hotfix G0) no glints: one 0.22 m cell in fourteen flashed the sun at pow 140 as the view moved, a few pixels
  // each (sparkle by design). Their light on average was under 1e-4 of the sun's (7% of cells x the flash's mean over
  // the facets' spread x the spot's mean), under a hundredth of a code: nothing the sand loses
  return c;
}
/* the landmarks: col.a says what each is (1 dark stone, 2 rock: the great formations, 3 pale stone) */
vec3 D_shadeStone(vec3 p, vec3 n, vec3 rd, float t, float fp, vec4 col, float yAbove) {
  float ndl = dot(n, uSun), mat = col.a, rr = 1.0 - clamp(dot(n, -rd), 0.0, 1.0), rim = rr * rr * rr;
  vec3 c;
  if (mat > 1.5 && mat < 2.5) {
    c = rockCol(p, n, ndl, fp);
    float sandy = smoothstep(0.72, 0.9, n.y) * 0.85 + (1.0 - smoothstep(2.0, 16.0, yAbove)) * 0.7;
    vec3 sc = mix(mix(SAND_DEEP, SAND_SHADE, 0.6), SAND_LIT, smoothstep(-0.1, 0.24, ndl));
    c = mix(c, sc, clamp(sandy, 0.0, 1.0));
    c += SHEEN * 0.35 * rim * smoothstep(0.0, 0.5, ndl);
    return c;
  }
  float dif = smoothstep(-0.15, 0.8, ndl);
  if (mat > 2.5) c = (mix(STONE_SHADE * 1.7, PALE, dif) + PALE * 0.22 * max(n.y, 0.0)) * col.rgb;
  else c = mix(STONE_SHADE, STONE_LIT, dif) * col.rgb;
  c += STONE_SHADE * 0.3 * max(n.y, 0.0);
  c *= mix(0.6, 1.0, smoothstep(0.0, 3.0, yAbove));
  c += SHEEN * 0.6 * rim * smoothstep(0.0, 0.5, ndl);
  return c;
}
`;
  /* (world6 step B fix, defect 7) the great formations at FORM_K of their height (mesas 35-80 m, buttes 45-90, rock
     needles 18-35, a bay's 65-110): the flight's envelope climbs over every one of them on any line the visitor turns to
     (w06 solidEnv, 0.18 m/m from as far off as its height asks), so the eye rises at most about 120 m beside the tallest
     (at 0.45 of their height the f6 flight's clearance had a median of 107 m: the low framing lost); at their old
     heights (to 440 m) it would have climbed for minutes, and a slip cannot pass a 400 m wide
     mesa met after a drag (875 hard-rule pushes along one's face in a dragged flight) */
  var FORM_K = 0.25;
  var D_STONE = [1, 1, 1, 1], D_DARK = [0.78, 0.76, 0.84, 1], D_ROCK = [1, 1, 1, 2], D_PALE = [1, 1, 1, 3];
  var D_BIRD_L = lch(0.40, 0.04, 300), D_BIRD_S = lch(0.22, 0.035, 288);
  function sRng(s, k) { return K.RNG(K.hk(s.h, k)); }
  /* the areas' pieces. The great ones (seen kilometres off) belong to the site's own 1.5 km cell; the details (a ruin
     wall's segments, standing stones, pillars, small shards, a rampart) to whichever 375 m cell holds them */
  function dGreat(C, s) {
    var R, it, k, a, i;
    if (s.kind === 1) {   // the giant shard in its basin
      R = sRng(s, 11); var gh = R.r(34, 46), gw = R.r(7, 10);
      it = C.add({ kind: 'giantShard', x: s.x, z: s.z, foot: 9, dy: -1.5, yaw: R.r(0, 360), h: gh, w: gw, seed: K.hk(s.h, 12), solid: [gw + 0.42 * gh + 4, gh] });
      C.poi({ kind: 'shard', x: s.x, z: s.z, ref: it, dy: gh * 0.5, interest: 0.8, pass: 42 + gw });
      if (R.f() < 0.6) C.flock({ kind: 'bird', n: 10 + R.i(8), x: s.x, z: s.z, ref: it, dy: R.r(36, 62), orbit: R.r(26, 40), wheel: R.sign() * R.r(0.2, 0.32), size: R.r(1.3, 1.7), flap: 3.4, spread: R.r(6, 12), lit: D_BIRD_L, shade: D_BIRD_S });
    } else if (s.kind === 2) {   // the ruins' mesa behind them
      R = sRng(s, 31); a = s.r[2] * 2 * PI; var d = R.r(380, 700), rM = R.r(170, 260), HM = FORM_K * R.r(150, 230), mx = s.x + Math.sin(a) * d, mz = s.z + Math.cos(a) * d;
      it = C.add({ kind: 'mesa', form: true, x: mx, z: mz, foot: rM * 1.2, yaw: R.r(0, 360), rad: rM, H: HM, seed: K.hk(s.h, 32), solid: [rM * 1.3, HM * 1.42], foot2: [rM * 1.62, HM * 0.14] });
      C.poi({ kind: 'mesa', x: mx, z: mz, ref: it, dy: HM * 0.5, interest: 0.4, pass: rM + 90 });
      C.poi({ kind: 'ruins', x: s.x, z: s.z, dy: 6, interest: 0.75, pass: 36 });
    } else if (s.kind === 3) {   // the temple on its plateau, the stair up its face, two stupas at the stair's head
      R = sRng(s, 51);
      var ab = [72 + 16 * s.r[0], 150 + 28 * s.r[1]], ang = s.r[2] * PI, ca = Math.cos(ang), sa = Math.sin(ang), rise = 46 + 14 * s.r[3], yawF = 90 - ang * 180 / PI;
      var L2W = function (lx, ly) { return [s.x + ca * lx - sa * ly, s.z + sa * lx + ca * ly]; };
      var tsz = R.r(60, 72), tp = L2W(ab[0] * 0.2, R.r(-0.25, 0.25) * ab[1]);
      it = C.add({ kind: 'temple', x: tp[0], z: tp[1], foot: tsz * 0.5, yaw: yawF + R.r(-5, 5), size: tsz, seed: K.hk(s.h, 52), solid: [tsz * 0.76, tsz * 1.2] });
      var hd = L2W(-ab[0] + 5, 0);
      C.add({ kind: 'stair', x: hd[0], z: hd[1], foot: 0, yaw: yawF, drop: rise + 18, seed: K.hk(s.h, 53) });
      for (k = 0; k < 2; k++) { var q = L2W(-ab[0] + 14, (k ? 1 : -1) * R.r(14, 17)), stH = R.r(15, 19); C.add({ kind: 'stupa', x: q[0], z: q[1], foot: 4, yaw: yawF, h: stH, seed: K.hk(s.h, 54 + k), solid: [stH * 0.45, stH] }); }
      C.poi({ kind: 'temple', x: tp[0], z: tp[1], ref: it, dy: tsz * 0.4, interest: 1.0, pass: 75 });
      if (R.f() < 0.8) C.flock({ kind: 'bird', n: 12 + R.i(8), x: tp[0], z: tp[1], ref: it, dy: tsz * 1.15, orbit: R.r(55, 80), wheel: R.sign() * R.r(0.12, 0.2), size: R.r(1.4, 1.8), flap: 3.0, spread: R.r(14, 24), lit: D_BIRD_L, shade: D_BIRD_S });
    } else if (s.kind === 4) {   // the bay: buttes and mesas standing in its sea, its rim, a range of cloud lying on the sea
      R = sRng(s, 61);
      var ab2 = [650 + 350 * s.r[0], 550 + 300 * s.r[1]], ang2 = s.r[2] * PI, c2 = Math.cos(ang2), s2 = Math.sin(ang2);
      var B2W = function (lx, ly) { return [s.x + c2 * lx - s2 * ly, s.z + s2 * lx + c2 * ly]; };
      var nb = 2 + R.i(2);
      for (k = 0; k < nb; k++) {
        var p = B2W(R.r(-0.5, 0.5) * ab2[0], R.r(-0.5, 0.5) * ab2[1]), rad = R.r(55, 130), HB = FORM_K * R.r(260, 440), isM = R.f() < 0.5;
        it = C.add({ kind: isM ? 'mesa' : 'butte', x: p[0], z: p[1], foot: rad * (isM ? 1.45 : 1.2), yaw: R.r(0, 360), rad: isM ? rad * 1.2 : rad, H: isM ? HB * 0.8 : HB, sink: 20, seed: K.hk(s.h, 62 + k), solid: [rad * (isM ? 1.55 : 1.3), HB * 1.12], foot2: [rad * (isM ? 1.95 : 1.65), HB * 0.15] });
        C.poi({ kind: 'butte', x: p[0], z: p[1], ref: it, dy: HB * 0.5, interest: 0.55, pass: rad * 1.2 + 80 });
      }
      for (k = 0; k < 3; k++) { var ph = s.r[3] * 2 * PI + k * 2 * PI / 3, rq = B2W(Math.cos(ph) * ab2[0], Math.sin(ph) * ab2[1]); C.poi({ kind: 'bay', x: rq[0], z: rq[1], dy: 0, interest: 0.9, pass: 0 }); }
      if (R.f() < 0.7) { var q2 = B2W(R.r(-0.3, 0.3) * ab2[0], R.r(-0.3, 0.3) * ab2[1]); C.cloud({ kind: 'range', x: q2[0], z: q2[1], y: SEA_Y - 30, dir: R.r(0, PI), len: R.r(500, 900), w: R.r(160, 260), h: R.r(70, 120), seed: K.hk(s.h, 70) }); }
    }
  }
  function dDetails(s, out) {
    var R, k, i;
    if (s.kind === 1) {   // a rampart across the basin's far side; small shards about the giant one
      R = sRng(s, 21); var a = s.r[3] * 2 * PI, d = R.r(150, 210), cx = s.x + Math.sin(a) * d, cz = s.z + Math.cos(a) * d, L = R.r(150, 240), dir = a + PI / 2 + R.r(-0.4, 0.4), rh = R.r(9, 14);
      for (var u = -L / 2, n = 0; u < L / 2; u += 26, n++) { if (R.f() < 0.15) continue; out.push({ kind: 'rampart', x: cx + Math.sin(dir) * u, z: cz + Math.cos(dir) * u, foot: 12, yaw: dir * 180 / PI + 90, h: rh * R.r(0.8, 1.1), seed: K.hk(s.h, 200 + n), solid: [16, rh + 2] }); }
      for (i = 0; i < 6; i++) { var b = R.r(0, 2 * PI), r = R.r(18, 95), shH = R.r(5, 14), shW = R.r(2.5, 6); out.push({ kind: 'shard', x: s.x + Math.cos(b) * r, z: s.z + Math.sin(b) * r, foot: 2, yaw: R.r(0, 360), tp: R.r(-25, 25), tr: R.r(-25, 25), h: shH, w: shW, seed: K.hk(s.h, 300 + i), solid: [shW + 0.3 * shH, shH] }); }
    } else if (s.kind === 2) {   // a stepped ruin wall; standing stones in a line beside it; pillars behind it
      R = sRng(s, 41); var th = s.r[0] * PI, Lw = 150 + 80 * s.r[1], segL = R.r(22, 30), layers = 4 + R.i(3), dx = Math.sin(th), dz = Math.cos(th), px = dz, pz = -dx, flip = R.f() < 0.5 ? 180 : 0;
      k = 0;
      for (var uu = -Lw / 2; uu < Lw / 2; uu += segL, k++) { if (k > 0 && R.f() < 0.12) continue; var off = R.r(-2.5, 2.5), ly = layers - (R.f() < 0.3 ? 1 : 0); out.push({ kind: 'ruin', x: s.x + dx * uu + px * off, z: s.z + dz * uu + pz * off, foot: segL * 0.5, yaw: th * 180 / PI + flip + R.r(-4, 4), len: segL * 1.06, layers: ly, seed: K.hk(s.h, 400 + k), solid: [segL * 0.62, ly * 3 + 4] }); }
      var side = R.sign(), lat = R.r(13, 20), gap = R.r(11, 17), nm = 6 + R.i(4);
      for (k = 0; k < nm; k++) { var u2 = (k - nm / 2) * gap, la = side * (lat + k * R.r(-1.5, 1.5)), mh = R.r(4, 10), mr = R.r(1.0, 1.8); out.push({ kind: 'menhir', x: s.x + dx * u2 + px * la, z: s.z + dz * u2 + pz * la, foot: 1.5, dy: -0.5, yaw: R.r(0, 360), tp: R.r(-8, 8), tr: R.r(-8, 8), h: mh, r: mr, seed: K.hk(s.h, 500 + k), solid: [mr * 1.6, mh] }); }
      var np = 3 + R.i(3);
      for (k = 0; k < np; k++) { var u3 = R.r(-0.4, 0.4) * Lw, la3 = -side * R.r(14, 26), ph2 = R.r(6, 14), pr = R.r(1.2, 1.9); out.push({ kind: 'pillar', x: s.x + dx * u3 + px * la3, z: s.z + dz * u3 + pz * la3, foot: 2, dy: -R.r(0.5, 2), yaw: R.r(0, 360), tp: R.r(-6, 6), tr: R.r(-6, 6), h: ph2, r: pr, seed: K.hk(s.h, 600 + k), solid: [pr * 1.6, ph2] }); }
    }
  }
  /* the open dunes' own: now and then a great formation (a mesa, a butte, a giant shard) clear of the areas' pieces, and
     far banks of cloud with flat bases high over the sand */
  /* (world6 fix, the judges' defect 4) the great formations by density, the bays' buttes and mesas given back: FORM_N
     candidate spots a cell, each with its own draws (the same whether kept or not), kept where its draw falls under
     the density there: FORM_D in the open sand, more (FORM_C) in the band along the cloud sea's coast (its weight
     0.05-0.85 there), where they are the bays' tall buttes and mesas, seated on the lowest ground of their footprint, so
     those that stand where the land has sunk under the sea rise out of it as the bays' did. Each is marked a formation
     (form): the director's corridor keeps the held line ahead clear of their solids */
  var FORM_N = 6, FORM_D = 0.16, FORM_C = 0.55;
  function dForms(C, s, R) {
    for (var k = 0; k < FORM_N; k++) {
      var x = C.x0 + R.r(0.08, 0.92) * C.size, z = C.z0 + R.r(0.08, 0.92) * C.size, kp = R.f(), kind = R.f(), a1 = R.f(), a2 = R.f(), a3 = R.f(), yaw = R.r(0, 360), seed = R.seed();
      var wc = C.weights(x, z)[1], coast = K.smooth(0.05, 0.35, wc) * (1 - K.smooth(0.55, 0.85, wc));
      if (kp >= FORM_D + FORM_C * coast) continue;
      var bay = coast > 0.3, rad = bay ? 55 + 75 * a1 : (kind < 0.45 ? 150 + 150 * a1 : kind < 0.8 ? 80 + 90 * a1 : 30 + 30 * a1);
      var dx = x - s.x, dz = z - s.z, dd = Math.sqrt(dx * dx + dz * dz);
      if (s.kind > 0 && dd < 480 + rad) continue;
      var it;
      if (bay) {
        var HB = FORM_K * (260 + 180 * a2), isM = a3 < 0.5;
        it = C.add({ kind: isM ? 'mesa' : 'butte', form: true, x: x, z: z, foot: rad * (isM ? 1.45 : 1.2), yaw: yaw, rad: isM ? rad * 1.2 : rad, H: isM ? HB * 0.8 : HB, sink: 20, seed: seed, solid: [rad * (isM ? 1.55 : 1.3), HB * 1.12], foot2: [rad * (isM ? 1.95 : 1.65), HB * 0.15] });
        C.poi({ kind: 'butte', x: x, z: z, ref: it, dy: HB * 0.5, interest: 0.55, pass: rad * 1.2 + 80 });
        continue;
      }
      var H = FORM_K * (kind < 0.45 ? 140 + 180 * a2 : kind < 0.8 ? 180 + 180 * a2 : 70 + 70 * a2);
      if (kind < 0.45) it = C.add({ kind: 'mesa', form: true, x: x, z: z, foot: rad * 1.2, yaw: yaw, rad: rad, H: H, seed: seed, solid: [rad * 1.3, H * 1.42], foot2: [rad * 1.62, H * 0.14] });
      else if (kind < 0.8) it = C.add({ kind: 'butte', form: true, x: x, z: z, foot: rad * 1.2, yaw: yaw, rad: rad, H: H, seed: seed, solid: [rad * 1.3, H], foot2: [rad * 1.65, H * 0.15] });
      else it = C.add({ kind: 'gshard', form: true, x: x, z: z, foot: 30, yaw: yaw, h: H, w: rad * 0.7, seed: seed, solid: [rad * 0.7 + 0.42 * H + 6, H] });
      C.poi({ kind: 'form', x: x, z: z, ref: it, dy: H * 0.5, interest: 0.45, pass: rad * 1.2 + 80 });
    }
    if (R.f() < 0.28) C.cloud({ kind: 'range', x: C.x0 + R.r(0.2, 0.8) * C.size, z: C.z0 + R.r(0.2, 0.8) * C.size, foot: 0, dy: R.r(480, 680), dir: R.r(0, PI), len: R.r(1100, 1900), w: R.r(260, 420), h: R.r(150, 240), seed: R.seed() });
  }
  function dOpen(C, s, R) {
    if (C.weights) return dForms(C, s, R);   // (world6: the formations by density over the maps' weights)
    var n = R.f() < 0.35 ? 0 : (R.f() < 0.7 ? 1 : 2), tries = 0, k = 0;
    while (k < n && tries++ < 14) {
      var x = C.x0 + R.r(0.08, 0.92) * C.size, z = C.z0 + R.r(0.08, 0.92) * C.size, kind = R.f(), rad = kind < 0.45 ? R.r(150, 300) : kind < 0.8 ? R.r(80, 170) : R.r(30, 60);
      var dx = x - s.x, dz = z - s.z, dd = Math.sqrt(dx * dx + dz * dz);
      if (s.kind === 4 ? dd < 1150 + rad : (s.kind > 0 && dd < 480 + rad)) continue;
      var H = FORM_K * (kind < 0.45 ? R.r(140, 320) : kind < 0.8 ? R.r(180, 360) : R.r(70, 140)), it;
      if (kind < 0.45) it = C.add({ kind: 'mesa', x: x, z: z, foot: rad * 1.2, yaw: R.r(0, 360), rad: rad, H: H, seed: R.seed(), solid: [rad * 1.3, H * 1.42], foot2: [rad * 1.62, H * 0.14] });
      else if (kind < 0.8) it = C.add({ kind: 'butte', x: x, z: z, foot: rad * 1.2, yaw: R.r(0, 360), rad: rad, H: H, seed: R.seed(), solid: [rad * 1.3, H], foot2: [rad * 1.65, H * 0.15] });
      else it = C.add({ kind: 'gshard', x: x, z: z, foot: 30, yaw: R.r(0, 360), h: H, w: rad * 0.7, seed: R.seed(), solid: [rad * 0.7 + 0.42 * H + 6, H] });
      C.poi({ kind: 'form', x: x, z: z, ref: it, dy: H * 0.5, interest: 0.45, pass: rad * 1.2 + 80 });
      k++;
    }
    if (R.f() < 0.28) C.cloud({ kind: 'range', x: C.x0 + R.r(0.2, 0.8) * C.size, z: C.z0 + R.r(0.2, 0.8) * C.size, foot: 0, dy: R.r(480, 680), dir: R.r(0, PI), len: R.r(1100, 1900), w: R.r(260, 420), h: R.r(150, 240), seed: R.seed() });
  }
  /* a small cell of open dunes: a few stones of its own */
  function dSmall(C, R) {
    var f = R.f(), x = C.x0 + R.r(0.1, 0.9) * C.size, z = C.z0 + R.r(0.1, 0.9) * C.size, k, n;
    if (f < 0.2) { n = 1 + R.i(3); for (k = 0; k < n; k++) { var mh = R.r(4, 9), mr = R.r(1, 1.7); C.add({ kind: 'menhir', x: x + R.r(-9, 9), z: z + R.r(-9, 9), foot: 1.5, dy: -0.5, yaw: R.r(0, 360), tp: R.r(-10, 10), tr: R.r(-10, 10), h: mh, r: mr, seed: R.seed(), solid: [mr * 1.6, mh] }); } }
    else if (f < 0.31) { var ph = R.r(6, 13), pr = R.r(1.2, 1.9); C.add({ kind: 'pillar', x: x, z: z, foot: 2, dy: -R.r(0.5, 2), yaw: R.r(0, 360), tp: R.r(-6, 6), tr: R.r(-6, 6), h: ph, r: pr, seed: R.seed(), solid: [pr * 1.6, ph] }); }
    else if (f < 0.48) { n = 2 + R.i(3); for (k = 0; k < n; k++) { var sh2 = R.r(5, 13), sw = R.r(2.5, 5.5); C.add({ kind: 'shard', x: x + R.r(-14, 14), z: z + R.r(-14, 14), foot: 2, yaw: R.r(0, 360), tp: R.r(-25, 25), tr: R.r(-25, 25), h: sh2, w: sw, seed: R.seed(), solid: [sw + 0.3 * sh2, sh2] }); } }
    else if (f < 0.54) { var th = R.r(0, 180); for (k = 0; k < 2; k++) { var sl = R.r(20, 26), ly = 3 + R.i(2); C.add({ kind: 'ruin', x: x + Math.sin(th * PI / 180) * k * sl, z: z + Math.cos(th * PI / 180) * k * sl, foot: sl * 0.5, yaw: th, len: sl, layers: ly, seed: R.seed(), solid: [sl * 0.62, ly * 3 + 4] }); } }
  }
  W.realm({
    id: 'dunes', words: 'dark', still: 'dunes', hours: ['dawn'], dur: [70, 110], speed: 12, clear: [7, 14, 140], frame: [0.56, 0.74], look: 90, climb: 42, pitchFollow: 0.12,
    margin: 12, exitH: [80, 120], lookT: 20, lookTan: 0.15,   // (round E1 Fix 2: the tour's heightLine and turn gone with it, design-v5 Revision 3)
    glsl: DUNES_GLSL,
    surfaces: [{ height: 'Hd', shade: 'shadeSand', g0: 0.35, levels: 10 }, { height: 'HdSea', shade: 'shadeSea', g0: 16, levels: 5 }],
    landmarkShade: 'shadeStone',
    layout: { scales: [{ size: DS, radius: 5200 }, { size: 375, radius: 1300 }], volRes: 44 },
    field: function (R, V) {
      // the wind the dunes lie across (their crests across it, their steep lee faces downwind), drawn per visit
      var wa = R.r(0, 2 * PI), wind = [Math.sin(wa), Math.cos(wa)]; V.wind = wind; V.windAz = wa * 180 / PI;
      var hue = R.r(-8, 8);   // (a pinker or a bluer visit)
      return { params: [
        lch(0.615, 0.07, 322 + hue), lch(0.665, 0.066, 330 + hue), lch(0.56, 0.085, 284 + hue * 0.5), lch(0.50, 0.09, 276),
        lch(0.60, 0.09, 262), lch(0.50, 0.10, 260), lch(0.58, 0.045, 296), lch(0.50, 0.05, 285),
        lch(0.75, 0.05, 30, 0.3), [wind[0], wind[1], 2.2, SEA_Y], lch(0.42, 0.09, 262), lch(0.86, 0.03, 300)
      ] };
      /* (world6 step B, W3) the sand's shade (0.475 -> 0.56, its deep 0.37 -> 0.50) and the rock's (lit 0.57 -> 0.60, shade
         0.41 -> 0.50, deep 0.30 -> 0.42) lifted in the world's own light: at the one framing the links stand over the
         near sand and the name beside the formations, and the step's shadows (OKLab L about 0.44 as drawn) asked the
         words' gain for x2 over the whole window */
    },
    light: function (R, V) {
      // the low sun from upwind of the dunes (their windward slopes lit, their lee faces blue), 5-14 deg up
      var up = Math.atan2(-V.wind[0], -V.wind[1]) * 180 / PI, el = R.r(5, 14), hz = R.r(0.45, 0.85);
      return {
        sunAz: up + R.r(-55, 55), sunEl: el, sunC: lch(0.97, 0.04, 65, 3.1),
        sky: [lch(0.62, 0.08, 272), lch(0.84, 0.05, 238), lch(0.82, 0.058, 230), lch(0.79, 0.068, 225), lch(0.75, 0.078, 222), lch(0.70, 0.085, 224)],
        skyE: [3, 10, 26, 58], skyW: lch(0.88, 0.07, 45), skyK: [0.5, 8, 0.08, 0],
        glow: [0.3, 6, 0.16, 90], glowC: lch(0.95, 0.06, 65),
        fog: [2.0e-4, 1 / 220, 0, 0.6e-4], fog2: [0.45, 0.02, 0, 0], fogB: [lch(0.56, 0.12, 258), 0.8],
        haze: [1.0e-3 * hz, 30, 24, 0], hazeC: lch(0.78, 0.055, 292), hazeW: lch(0.83, 0.065, 40),
        ambU: lch(0.7, 0.1, 240), ambD: lch(0.55, 0.07, 330),
        clLit: lch(0.9, 0.055, 330), clShade: lch(0.67, 0.095, 276), clDeep: lch(0.60, 0.11, 268), clRim: lch(0.98, 0.05, 60, 0.9),
        clK: [0.86, 0.35, 0.6, 0.3], clK2: [0.12, 0.75, 0.75, 0.35], clDetail: [120, 4],
        discR: 1.9, discI: 5, stars: 0, hi: [0.22, 0.45, 0.0016, 0.004], hiC: lch(0.95, 0.03, 330),
        bloom: [1.05, 0.45, 0.16], shafts: 0.5, shaftC: lch(0.95, 0.05, 60), exposure: 1.0, sat: 1.04, lift: [0.0, 0.0, 0.004], gain: [1, 1, 1],
        cl: [7.0, 0.13, 0.0035, 1], inCloudK: 1.04
      };
    },
    cell: function (C, R, K2) {
      if (C.scale === 0) { var s = dSite(C.ix, C.iz, C.salt); dGreat(C, s); dOpen(C, s, R); return; }
      // a small cell: the details of the areas about it that fall in it, and its own stones
      var bx = Math.floor((C.x0 + C.size / 2) / DS), bz = Math.floor((C.z0 + C.size / 2) / DS), out = [], i, j, k;
      for (j = -1; j <= 1; j++) for (i = -1; i <= 1; i++) { var s2 = dSite(bx + i, bz + j, C.salt); if (s2.kind === 1 || s2.kind === 2) { out.length = 0; dDetails(s2, out); for (k = 0; k < out.length; k++) if (C.inside(out[k].x, out[k].z)) C.add(out[k]); } }
      var sh0 = dSite(bx, bz, C.salt), dx = C.x0 + C.size / 2 - sh0.x, dz = C.z0 + C.size / 2 - sh0.z;
      if (sh0.kind === 0 || dx * dx + dz * dz > 600 * 600) dSmall(C, R);
    },
    build: function (it, B, R) {
      switch (it.kind) {
        case 'giantShard': giantShard(B, R, it.h, it.w, D_DARK); break;
        case 'gshard': giantShard(B, R, it.h, it.w, D_ROCK); break;
        case 'mesa': return mesaG(B, R, it.rad, it.H, D_ROCK, it.sink ? { sink: it.sink } : null);   // (generators: a few rows at a time)
        case 'butte': return butteG(B, R, it.rad, it.H, D_ROCK, it.sink ? { sink: it.sink } : null);
        case 'temple': return templeStepped(B, R, it.size, D_STONE, D_PALE);   // (a generator: a part at a time)
        case 'stair': var run = it.drop / Math.tan(26 * PI / 180); stairDown(B, 16, run, it.drop, Math.round(it.drop / 1.6), D_PALE, D_STONE); break;
        case 'stupa': stupa(B, R, it.h, D_STONE, D_PALE); break;
        case 'rampart': rampartSegment(B, R, 27, it.h, D_DARK); break;
        case 'ruin': ruinSegment(B, R, it.len, it.layers, D_STONE); break;
        case 'menhir': B.xf(0, 0, 0, 0, it.tp || 0, it.tr || 0); menhir(B, R, it.h, it.r, D_STONE); break;
        case 'pillar': B.xf(0, 0, 0, 0, it.tp || 0, it.tr || 0); pillar(B, R, it.h, it.r, D_STONE); break;
        case 'shard': B.xf(0, 0, 0, 0, it.tp || 0, it.tr || 0); shard(B, R, it.h, it.w, D_DARK); break;
      }
    },
    cloud: function (cl, PF, R) {
      if (cl.kind === 'range') K.range(PF, R, cl.x - Math.sin(cl.dir) * cl.len / 2, cl.base, cl.z - Math.cos(cl.dir) * cl.len / 2, cl.dir, cl.len, cl.w, cl.h);
    },
    // the scatter: pebbles near, shards of dark stone farther, dark boulders half sunk in the middle distance
    scatter: [
      { mesh: function (mb, R) { K.rock(mb, R, 1, 0.6, [0.9, 0.88, 0.95, 1]); }, cell: 7, grid: 30, density: 0.32, size: [0.25, 1.2], sink: 0.35, tilt: 0.7, stretch: 1 },
      { mesh: function (mb, R) { shard(mb, R, 1, 0.35, [0.8, 0.78, 0.86, 1]); }, cell: 22, grid: 22, density: 0.09, size: [1.6, 5.5], sink: 0.1, tilt: 0.9, stretch: 1.6 },
      { mesh: function (mb, R) { K.rock(mb, R, 1, 0.7, [0.62, 0.6, 0.7, 1]); }, cell: 26, grid: 24, density: 0.2, size: [1.6, 4.6], sink: 0.32, tilt: 0.5, stretch: 1.2, salt: 7 }
    ],
    // grains blowing over the sand (now and then one glints), motes in the low sun, veils of sand off the brinks
    particles: function (V) {
      var w = V.wind, sand = lch(0.9, 0.04, 60), mote = lch(0.96, 0.05, 70, 1.4);
      return [
        { count: 700, box: 90, height: 1.6, streak: 0.05, width: 1.0, wind: [w[0] * 6.5, 0, w[1] * 6.5], color: [sand[0], sand[1], sand[2], 0.55], hop: [0.35, 2.6, 0.12, 0] },
        { count: 160, box: 110, height: 26, streak: 0, width: 1.4, wind: [w[0] * 1.6, 0.1, w[1] * 1.6], color: [mote[0], mote[1], mote[2], 0.65], hop: [0, 0, 1.5, 1] }
      ];
    },
    ribbons: function (V) { var w = V.wind, sand = lch(0.9, 0.04, 60); return { count: 20, box: 260, length: 70, width: 14, lift: 5, gust: 7, wind: [w[0] * 5.5, 0, w[1] * 5.5], color: [sand[0] * 0.95, sand[1] * 0.92, sand[2] * 0.95, 0.24] }; },
    // now and then a flock of dark birds crosses the way ahead
    event: function (V, R, cam) {
      var d = R.r(70, 170), lat = R.sign() * R.r(30, 90), fx = Math.sin(cam.psi), fz = Math.cos(cam.psi), px = fz, pz = -fx, cr = lat > 0 ? -1 : 1;
      var x = cam.x + fx * d + px * lat, z = cam.z + fz * d + pz * lat;
      return { next: R.r(14, 22), life: 32, flock: { kind: 'bird', n: 9 + R.i(9), x: x, y: cam.ground(x, z) + R.r(22, 46), z: z, drift: [px * cr * 3.4 + fx * 1.4, pz * cr * 3.4 + fz * 1.4], orbit: R.r(14, 24), wheel: R.sign() * R.r(0.25, 0.4), size: R.r(1.3, 1.7), flap: 3.4, spread: R.r(6, 10), lit: D_BIRD_L, shade: D_BIRD_S } };
    }
  });
})();
