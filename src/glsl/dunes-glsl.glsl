
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
#define ROCK_DEEP uP[10].rgb
#define PALE uP[11].rgb
const float DS = 1500.0, RS = 4500.0;
const float RIP_I = 0.15, RIP_M = 0.9, RIP_FLOOR = 1.5;   // (shadeSand's ripples, m)
float gAF = 1e4;   // (height over the troughs' floor: 350 sets it)
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
  /* (fast500 D) the four taps' noise in one loop (one copy of gnd for FXC), each tap's multiply and gradient turn as before */
  vec3 g0 = vec3(0.0), g1 = g0, g2 = g0, g3 = g0;
  for (int t = 0; t < 4 + UZ; t++) {
    vec2 o = t == 0 ? vec2(seed * 57.0) : (t == 1 ? vec2(0.0) : (t == 2 ? vec2(13.0) : vec2(29.0)));
    float kk = t == 0 ? 1.1 : (t == 1 ? 2.4 : 2.2);
    vec3 g = gnd(mat2(kk / m.z) * (p + o));
    if (t == 0) g0 = g; else if (t == 1) g1 = g; else if (t == 2) g2 = g; else g3 = g;
  }
  vec3 bend = 0.12 * dNg(g0, mat2(1.1 / m.z));
  vec3 y = vec3(l.y, dly) / b.y - bend;
  float side = y.x > 0.0 ? b.w : 1.0;
  vec3 ay = vec3(abs(y.x), sign(y.x) * y.yz) / side;
  vec3 across = dSstep(1.0, 0.0, ay + 0.12 * dNg(g1, mat2(2.4 / m.z)));
  across = dMul(across, across) * 0.35 + across * 0.65;
  vec3 along = dSstep(1.15, 0.45, vec3(abs(l.x), sign(l.x) * dlx) + 0.1 * dNg(g2, mat2(2.2 / m.z)));
  vec3 top = vec3(1.0 + b.z * l.x, b.z * dlx) + 0.05 * dNg(g3, mat2(2.2 / m.z));
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
/* (physics: sand/S1) the main dunes' phase: along the wind, moved by a noise of the across-wind coordinate only (the
   crests wander as a line; a 2D warp squeezed the local wavelength 0.55-1.47x and with it the slip faces). d1, d2: the
   two slices of noise (gnd of the across-wind coordinate / 340 m and / 95 m). vec3(phase, its gradient) */
vec3 s1Phase(vec2 p, vec2 w, vec2 pp, float lam, vec3 d1, vec3 d2) {
  float dD = lam * (0.42 * d1.y / 340.0 + 0.13 * d2.y / 95.0);
  return vec3((dot(p, w) + lam * (0.42 * d1.x + 0.13 * d2.x)) / lam, (w + dD * pp) / lam);
}
/* (physics: sand/S1, the hub's sand spec: a transverse dune is a gentle windward slope (7-15 deg), a brink, and a slip
   face at sand's angle of repose, 32 deg, down to a toe) one main dune: the windward rise 0.5x + 0.5x^2 (3 - 2x), the
   slip face a plane from the brink, its own slope m chosen so the surface's steepest descent there is 32 deg with the
   swell and the crest's change in height (G) included: m = G.g + sqrt(tan^2 32 - |G across g|^2); its share of the
   wavelength fl = H k / m. The brink a smooth min over 2 m across, the toe a smooth max over 0.15 of the face. H = min(the
   dune's height, 0.13 of the local wavelength). The face's slope carries (1 - f) d(H / fl): the surface's.
   Census (tools/physics/dune-census.mjs, four winds): lee mode 31-32, p99 33.1, 0.01-0.04% over 34 deg (by
   differences 0.013-0.030%, the steepest 35-36); stoss p50 9, p90 13.5 (was 17, 41.8, 2.7%, 51.5, 10.9, 18.3). nw: the near family's share
   (none on the slip face, eased over 0.06 of the phase at both ends) */
vec3 duneS1(vec3 ph, vec3 Hm, vec3 swell, vec3 Hs, vec2 dph, out vec3 nw, out vec4 s1o, out vec2 s1q) {
  float k = length(ph.yz); vec2 g = ph.yz / k;
  vec3 H = dSmin(Hm, vec3(0.13 / k, 0.0, 0.0), 2.0);   // (a smooth cap: a hard one switched H's slope, and with it m and fl: a 1 m step)
  // (the face's height H (1 - f) / fl is m (1 - f) / k: H drops out of it, so its slope holds no dH, and m is solved for
  // the ground under it alone, G0; solving it for G0 + dH as well held a gradient the surface does not have at 32 deg,
  // and where fl changed fast across the wind the brink turned along it in walls of 48-62 deg: the hub's review)
  vec2 G0 = swell.yz;
  float m = dot(G0, g) + sqrt(max(0.39046 - pow(-G0.x * g.y + G0.y * g.x, 2.0), 0.04));   // (tan^2 32 = 0.39046: repose 32, critical 34 deg, measured on slip faces: https://doi.org/10.1002/2015JF003636)
  float flr = H.x * k / max(m, 0.2), fl = clamp(flr, 0.04, 0.6), L = 1.0 - fl, f = fract(ph.x);
  // (the face's height H (1 - f) / fl: its slope carries (1 - f) d(H / fl). Unclamped H / fl = m / k: it changes with
  // the phase's direction (dph: d/ds of its gradient, s across the wind) and the swell's slope (Hs, its curvature xx xy
  // yy); clamped, dH / fl)
  float dk = dot(g, dph); vec2 dg = (dph - g * dk) / k;
  float c = -G0.x * g.y + G0.y * g.x, rad = 0.39046 - c * c, q = rad > 0.04 ? -c / sqrt(rad) : 0.0;
  vec2 v = g + q * vec2(-g.y, g.x), pp = vec2(-WINDDIR.y, WINDDIR.x);   // (dm / dG0)
  vec2 dQ = flr < 0.04 || flr > 0.6 ? H.yz / fl : (m > 0.2 ? (pp * dot(v, dg) + mat2(Hs.xy, Hs.yz) * v) / k : vec2(0.0)) - pp * (max(m, 0.2) * dk / (k * k));
  float a = f / L, n = (f - 1.0) / L;
  vec3 A = dMul(vec3(0.5 * a + 0.5 * a * a * (3.0 - 2.0 * a), ph.yz * ((0.5 + 3.0 * a * (1.0 - a)) / L)), H);
  vec3 F = vec3(H.x * (1.0 - f) / fl, ph.yz * (-H.x / fl) + (1.0 - f) * dQ);
  vec3 N = dMul(vec3(0.5 * n, ph.yz * (0.5 / L)), H);   // (the next stoss's plane below its toe: the cubic turned up behind it, a 1.9 m step at f 0.5)
  vec3 P = vec3(-H.x * f / fl, ph.yz * (-H.x / fl) - f * dQ);
  vec3 top = dSmin(A, F, max(H.x * k * (0.5 / L + 1.0 / fl), 0.05)), h = dSmax(top, f > 0.5 ? N : P, max(0.15 * H.x, 0.05));   // (the brink rounded over 2 m across: a smooth min over the height the two slopes part by in 1 m each side)
  vec3 e1 = dSstep(L - 0.06, L, vec3(f, ph.yz)), e2 = dSstep(0.0, 0.06, vec3(f, ph.yz));
  nw = dMul(vec3(1.0, 0.0, 0.0) - e1, e2); s1o = vec4(H.x, fl, H.yz); s1q = dQ;
  return h;
}
/* (physics: sand/S2, a crisp brink) the main dune's slope rebuilt from its phase: f = fract(phase), g its gradient
   (cycles per m), H its height and dH its change (the sites' share in both), fl the slip face's share: duneS1's own
   pieces and their slopes, dH where duneS1 has it (the stoss and the next stoss; the faces have none). rb, rt: the
   brink's and the toe's rounding (height, m). The land's fragments take this whole at their own phase in place of the
   vertices' whole (FS_TERRAIN): nothing of the main dune that turns at the brink is left to the triangles (the hub's
   review of #285: the dH part, kept per vertex, made the brink a sawtooth that crawled), so its lit and shaded sides
   meet on the brink to the pixel. dH.zw: the faces' d(H / fl) (duneS1's dQ), carried (1 - f) on the face, -f before it */
vec2 s1Slope(float f, vec2 g, float H, float fl, float rb, float rt, vec4 dH) {
  float L = 1.0 - fl, a = f / L, n = (f - 1.0) / L, sa = 0.5 * a + 0.5 * a * a * (3.0 - 2.0 * a);
  vec3 A = vec3(H * sa, g * (H * (0.5 + 3.0 * a * (1.0 - a)) / L) + sa * dH.xy);
  vec3 F = vec3(H * (1.0 - f) / fl, g * (-H / fl) + (1.0 - f) * dH.zw);
  vec3 N = vec3(H * 0.5 * n, g * (H * 0.5 / L) + 0.5 * n * dH.xy);
  vec3 P = vec3(-H * f / fl, g * (-H / fl) - f * dH.zw);
  return dSmax(dSmin(A, F, rb), f > 0.5 ? N : P, rt).yz;
}
/* the brink's rounding as duneS1's (2 m across) */
float s1Rb(float H, float k, float fl) { return max(H * k * (0.5 / (1.0 - fl) + 1.0 / fl), 0.05); }
float swell(vec2 p) { return 40.0 * gnd(p * (1.0 / 760.0)).x + 15.0 * gnd(mat2(0.8, 0.6, -0.6, 0.8) * (1.0 / 330.0) * (p + vec2(311.0, -97.0))).x; }
/* (fast500 D) the dunes' taps: offsets and (diagonal) scales; taps 1 and 4 take a full matrix */
const vec2 D_TO[7] = vec2[7](vec2(0.0), vec2(311.0, -97.0), vec2(0.0), vec2(71.0), vec2(400.0), vec2(9.0), vec2(900.0));
const float D_TS[7] = float[7](1.0 / 760.0, 0.0, 1.0 / 340.0, 1.0 / 95.0, 0.0, 1.0 / 80.0, 1.0 / 160.0);
const mat2 D_M1 = mat2(0.8, 0.6, -0.6, 0.8) * (1.0 / 330.0);
/* gnd with its second derivatives (hs: xx, xy, yy), for the slip face's slope (duneS1) */
vec3 gndH(vec2 p, out vec3 hs) {
  vec2 i = floor(p), f = p - i; ivec2 ii = ivec2(i);
  vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0), du = 30.0 * f * f * (f * (f - 2.0) + 1.0), ddu = 60.0 * f * (f * (2.0 * f - 3.0) + 1.0);
  vec2 ga = g2(ii), gb = g2(ii + ivec2(1, 0)), gc = g2(ii + ivec2(0, 1)), gd = g2(ii + ivec2(1, 1));
  float va = dot(ga, f), vb = dot(gb, f - vec2(1.0, 0.0)), vc = dot(gc, f - vec2(0.0, 1.0)), vd = dot(gd, f - vec2(1.0, 1.0));
  float k = va - vb - vc + vd; vec2 gk = ga - gb - gc + gd;
  hs = vec3(2.0 * du.x * (gb.x - ga.x + u.y * gk.x) + ddu.x * (u.y * k + vb - va),
            du.y * (gc.x - ga.x + u.x * gk.x) + du.x * (gb.y - ga.y + u.y * gk.y) + du.x * du.y * k,
            2.0 * du.y * (gc.y - ga.y + u.x * gk.y) + ddu.y * (u.x * k + vc - va));
  return vec3(va + u.x * (vb - va) + u.y * (vc - va) + u.x * u.y * k,
              ga + u.x * (gb - ga) + u.y * (gc - ga) + u.x * u.y * gk + du * (u.yx * k + vec2(vb - va, vc - va)));
}
vec3 dunes(vec2 p) {
  vec2 w = WINDDIR, pp = vec2(-w.y, w.x);
  mat2 Ma = mat2(w.x / 420.0, pp.x / 190.0, w.y / 420.0, pp.y / 190.0);
  float wSmall = 1.0 - smoothstep(900.0, 1300.0, gLodD);
  /* (fast500 D) the seven taps' noise in one loop FXC keeps rolled (one copy of gnd, not seven), each tap's own multiply
     as before and its gradient turn after (dNg, its matrix a constant as before): the same operations on the same values */
  vec3 g0 = vec3(0.0), g1 = g0, g2 = g0, g3 = g0, g4 = g0, g5 = g0, g6 = g0, q0 = g0, q1 = g0, q2 = g0, q3 = g0;
  for (int o = 0; o < (wSmall > 0.0 ? 7 : 5) + UZ; o++) {
    vec3 g, q;
    if (o == 1 || o == 4) g = gndH((o == 1 ? D_M1 : Ma) * (p + D_TO[o]), q);
    else if (o == 2 || o == 3) g = gndH(vec2(dot(p, pp) * D_TS[o], o == 2 ? 3.7 : 11.3), q);   // (physics: sand/S1: the crests' wander, a slice in the across-wind coordinate)
    else g = gndH(mat2(D_TS[o]) * (p + D_TO[o]), q);
    if (o == 0) { g0 = g; q0 = q; } else if (o == 1) { g1 = g; q1 = q; } else if (o == 2) { g2 = g; q2 = q; } else if (o == 3) { g3 = g; q3 = q; } else if (o == 4) g4 = g; else if (o == 5) g5 = g; else g6 = g;
  }
  // (the swell's curvature, M^T Hn M a tap, and d/ds of the phase's gradient from the slices' own second derivatives: duneS1)
  mat2 Q1 = transpose(D_M1) * mat2(q1.xy, q1.yz) * D_M1;
  vec3 Hs = (40.0 / (760.0 * 760.0)) * q0 + 15.0 * vec3(Q1[0][0], Q1[0][1], Q1[1][1]);
  vec2 dph = (0.42 * q2.x / (340.0 * 340.0) + 0.13 * q3.x / (95.0 * 95.0)) * pp;
  vec3 h = 40.0 * dNg(g0, mat2(1.0 / 760.0)) + 15.0 * dNg(g1, D_M1);
  gMB = vec2(h.x, gKD.x);   // (delight-weather 1: the mist pools' floor before the basins and the sink (the swell the dunes stand on), and their reach, the sand)
  vec3 amp = dSstep(-0.42, 0.3, dNg(g4, Ma)) * 0.75 + vec3(0.25, 0.0, 0.0);
  vec3 nw, ph = s1Phase(p, w, pp, 205.0, g2, g3); vec4 s1o; vec2 s1q;
  vec3 s1 = duneS1(ph, 32.0 * dMul(amp, gKD), h - gSK, Hs, dph, nw, s1o, s1q);   // (the ground under the dunes: the swell, less the sink)   // (world6: the main dunes by the maps' sand weight)
  h += s1; gS1 = vec4(ph, s1o.x); gS1F = s1o.y; gS1D = vec4(s1o.zw, s1q); gS1W = 1.0;   // (physics: sand/S2: for the land's fragments)
  if (wSmall > 0.0) {
    vec2 w2 = normalize(w + 1.3 * pp);
    vec3 s2 = duneWave(p + 37.0, w2, 64.0, 0.7, 0.25 * dNg(g5, mat2(1.0 / 80.0)));
    h += (2.4 * wSmall) * dMul(dMul(dMul(s2, dSstep(-0.5, 0.4, dNg(g6, mat2(1.0 / 160.0)))), gKD), nw);   // (physics: sand/S1: x0.6, none on the slip face)
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
  gS1W *= 1.0 - fl * w.x;   // (physics: sand/S2: the main dunes' share of the slope, calmed)
  gMS = vec2(gMS.x * (1.0 - fl * w.x), gMS.y * (1.0 - fl * w.x) - depth * w.x);   // (delight-weather 1: the mist pools' floor sinks with the basin)
  return dMul(h, vec3(1.0, 0.0, 0.0) - fl * w) - depth * w;
}
/* a plateau: an oval of flat top, its sides in terraces (a riser, then a ledge), a stair's way cut down its -x face */
vec3 plateauOf(vec2 p, vec3 h, Site s, vec3 n17, float g8) {   // (fast500 D) n17 = dN(p + 17.0, mat2(1.0 / 140.0)), g8 = gn(p / 8.0): the same for every site, worked out once (D_Hd)
  vec2 ab = vec2(72.0 + 16.0 * s.r.x, 150.0 + 28.0 * s.r.y); float ang = s.r.z * PI;
  float rise = 46.0 + 14.0 * s.r.w, steps = s.r.w < 0.5 ? 2.0 : 3.0;
  vec3 e = ovalOut(p, s.p, ab, ang);
  float stepH = (rise + 10.0) / (steps + 0.5);
  if (e.x > stepH * 9.0 + 140.0) return h;
  float base = swell(s.p) + 8.0, top = base + rise;
  e += 5.0 * n17;
  float Pp = stepH * 2.3, u = max(e.x, 0.0) / Pp, k = floor(u), fr = u - k, x = clamp(fr / 0.3, 0.0, 1.0);
  float rs = x * x * (3.0 - 2.0 * x), drs = fr < 0.3 ? 6.0 * x * (1.0 - x) / 0.3 : 0.0;
  vec3 pl = vec3(top - stepH * (k + rs), e.x > 0.0 ? -stepH * drs / Pp * e.yz : vec2(0.0));
  // the top keeps a little of the dunes' swell (sand lies on it), none at the rim
  pl += (0.16 * sstepDown(0.0, -45.0, e.x)) * (h - vec3(base, 0.0, 0.0));
  // the stair's way down the -x face: the terraces cut to its slope (26 deg), sand drifted over some of its steps
  vec2 dp = p - s.p; float c = cos(ang), sn = sin(ang);
  float lx = c * dp.x + sn * dp.y, ly = -sn * dp.x + c * dp.y;
  if (lx < -ab.x + 4.0 && abs(ly) < 12.0) {
    float ou = -ab.x - lx, w = sstepDown(12.0, 9.5, abs(ly)), drift = 1.4 * max(g8 + 0.05, 0.0) * smoothstep(0.0, 12.0, ou);
    vec3 ramp = vec3(top - max(ou, 0.0) * 0.4877 + drift, ou > 0.0 ? 0.4877 * vec2(c, sn) : vec2(0.0));
    vec3 cut = dSmin(pl, ramp, 1.5);
    pl = vec3(mix(pl.x, cut.x, w), mix(pl.yz, cut.yz, w));
  }
  float b = clamp(0.5 + 0.5 * (h.x - pl.x) / 5.0, 0.0, 1.0);
  gS1W *= b + (1.0 - b) * 0.16 * sstepDown(0.0, -45.0, e.x);   // (physics: sand/S2: the dunes' share where the plateau rises over them)
  return dSmax(h, pl, 5.0);
}
vec3 D_Hd(vec2 p) {
  vec3 h = dunes(p);
  ivec2 c0 = ivec2(floor(p / DS));
  Site S[9];
  for (int j = 0; j < 3; j++) for (int i = 0; i < 3; i++) S[j * 3 + i] = siteOf(c0 + ivec2(i - 1, j - 1));
  for (int k = 0; k < 9 + UZ; k++) if (S[k].kind == 1 || S[k].kind == 2) h = basinOf(p, h, S[k]);   // (fast500 D: + uZ, kept rolled)
  vec3 n17 = dN(p + 17.0, mat2(1.0 / 140.0)); float g8 = gn(p / 8.0);   // (fast500 D) the plateaux' vertex-only taps, once
  for (int k = 0; k < 9 + UZ; k++) if (S[k].kind == 3) h = plateauOf(p, h, S[k], n17, g8);
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
  mat2 Ma = mat2(w.x / 420.0, pp.x / 190.0, w.y / 420.0, pp.y / 190.0);
  float amp = 0.0;
  for (int k = 0; k < 2; k++) {   // (physics: sand/S1: onto the brink, f = 1 - fl, with the dunes' own phase and height)
    float sx = dot(p, pp);
    vec3 ph = s1Phase(p, w, pp, 205.0, gnd(vec2(sx / 340.0, 3.7)), gnd(vec2(sx / 95.0, 11.3)));
    amp = dSstep(-0.42, 0.3, dN(p + 400.0, Ma)).x;
    float kk = length(ph.yz), H = min(32.0 * (0.25 + 0.75 * amp), 0.13 / kk);
    float df = (1.0 - clamp(H * kk / 0.62487, 0.04, 0.6)) - fract(ph.x);   // (tan 32 = 0.62487)
    df -= floor(df + 0.5);
    p += w * df / kk;
  }
  return vec4(p, groundH(p), smoothstep(0.3, 0.8, amp));
}
#endif
/* (physics: light/cloud-shadow) the land's light left under the clouds: the key's direct share lost, the cloud's
   diffuse transmission given back (262-cloud-shadow.js says the physics and its sources) */
uniform sampler2D uCSh; uniform vec4 uCShP;
/* the map read over its 3x3 texels, weighted 1-2-1 by 1-2-1 (four bilinear taps half a texel off): the edge spread over
   three texels (about 117 m), so a texel's step never crawls along an edge as the eye moves over it */
float cshTap(vec2 u) {
  const float h = 0.5 / 1024.0;
  return 0.25 * (texture(uCSh, u + vec2(h, h)).r + texture(uCSh, u - vec2(h, h)).r + texture(uCSh, u + vec2(h, -h)).r + texture(uCSh, u + vec2(-h, h)).r);
}
float cloudShadow(vec3 p, float ndl) {
  if (uCShP.z <= 0.0 || ndl <= 0.0) return 1.0;
  vec2 q = (p.xz + uSun.xz * (uCShP.w - p.y) / max(uSun.y, 0.02) - uCShP.xy) / uCShP.z;
  float tau = -32.0 * log(max(mix(cshTap(q * 0.5 + 0.5), 1.0, smoothstep(0.75, 1.0, max(abs(q.x), abs(q.y)))), 0.002));
  float sy = max(uSun.y, 0.02), f = ndl / (ndl + 0.13 * sy / (sy + 0.02));
  return 1.0 - f * (1.0 - 1.0 / (1.0 + 0.1125 * tau));
}
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
/* (fast500 D R6) rockCol for the land's sand: four of the five taps in one loop FXC keeps rolled (uZ), each tap's input
   x * s as before (the same values; the landmarks keep rockCol: lanes/D/RESULT.md) */
vec3 rockColL(vec3 p, vec3 n, float ndl, float fp) {
  float y = 0.0, b1 = 0.0, b2 = 0.0, g40 = 0.0;
  for (int o = 0; o < 4 + UZ; o++) {
    vec2 x = o < 2 ? p.xz : vec2(y, o == 2 ? 1.7 : 4.1);
    vec2 s = o == 0 ? vec2(1.0 / 260.0) : (o == 1 ? vec2(1.0 / 40.0) : vec2(o == 2 ? 1.0 / 38.0 : 1.0 / 11.0, 1.0));
    float g = gn(x * s);
    if (o == 0) y = p.y + 9.0 * g; else if (o == 1) g40 = g; else if (o == 2) b1 = g; else b2 = g;
  }
  float st = b1 * 0.8 + b2 * 0.35;
  float streak = gn(vec2(dot(p.xz, vec2(0.6, 0.8)) / 7.0 + 2.0 * g40, p.y / 90.0)) * (1.0 - smoothstep(0.6, 3.0, fp));
  float dif = smoothstep(-0.2, 0.7, ndl);
  vec3 shd = mix(ROCK_DEEP, ROCK_SHADE, 0.5 + 0.5 * n.y);
  vec3 lit = ROCK_LIT * mix(vec3(1.0), vec3(1.1, 0.98, 0.94), smoothstep(-0.2, 0.4, b1));
  return mix(shd, lit, dif) * (1.0 + 0.17 * st + 0.08 * streak);
}
/* the noise volume read C1 across its texels in x and y (z as given): the lattice's fraction through a cubic
   (f^2 (3 - 2 f)) before the linear read, so the value's gradient is continuous where the read moves from one cell
   of four texels to the next (each texel's centre), where the plain read's jumps (C0). For the ripples' warp, whose
   gradient is their phase's: the plain read kinked the ripples every 1.9 m (61 m / 32 texels). Level 0 (the ripples are drawn only under 0.05 m a pixel, magnified texels: the same
   level the plain read takes there) */
vec4 n3vC1(vec3 p) {
  float N = float(textureSize(uN3, 0).x);
  vec2 q = p.xy * N - 0.5, i = floor(q), f = q - i;
  f = f * f * (3.0 - 2.0 * f);
  return textureLod(uN3, vec3((i + f + 0.5) / N, p.z), 0.0);
}
vec3 shadeSand(vec3 p, vec3 n0, vec3 rd, float t, float fp) {
  vec3 n = n0;
  float steep = smoothstep(0.42, 0.66, 1.0 - n0.y);
  /* the ripples: impact ripples on the loose sand (https://arxiv.org/html/2501.10643v1), megaripples on the interdune
     floors only (https://arxiv.org/pdf/2208.00888); each faded by its pixels a wavelength (docs/world.md, ## THE SAND'S RIPPLES) */
  vec2 w = WINDDIR, rh = normalize(rd.xz + vec2(1e-6, 0.0));
  float d = dot(p.xz, w), fwD = fp * (abs(dot(w, rh)) / max(abs(dot(rd, n0)), 0.02) + abs(dot(w, vec2(-rh.y, rh.x))));
  float kI = 1.0 - smoothstep(0.2, 0.4, fwD / RIP_I);
  float kM = (1.0 - smoothstep(0.2, 0.4, fwD / RIP_M)) * (1.0 - smoothstep(RIP_FLOOR, 2.0 * RIP_FLOOR, gAF)) * smoothstep(0.97, 0.99, n0.y);
  float rk = (1.0 - steep) * smoothstep(0.906, 0.927, n0.y);   // (none on a slip face, over 22-25 deg: its avalanches wipe them)
  if (rk * max(kI, kM) > 0.002) {
    vec4 nz = n3vC1(vec3(p.xz / 61.0, 0.71));
    vec2 wp = vec2(-w.y, w.x), wr = normalize(w + wp * (nz.r - 0.5) * 0.6);
    float wv = (nz.g - 0.5) * 9.0 + (nz.a - 0.5) * 6.0, phI = d / RIP_I + wv, phM = d / RIP_M + wv;
    float sl = kI * (cos(6.2831853 * phI) + 0.35 * cos(12.566 * phI + 1.0)) + kM * smoothstep(0.38, 0.62, nz.b) * (cos(6.2831853 * phM) + 0.35 * cos(12.566 * phM + 1.0));
    n = normalize(n - rk * 0.06 * sl * vec3(wr.x, 0.0, wr.y));
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
  if (steep > 0.0) c = mix(c, rockColL(p, n0, dot(n0, uSun), fp), steep);   // (fast500 D R6)
  float vd = clamp(dot(n, -rd), 0.0, 1.0), gr = 1.0 - vd;
  c += SHEEN * gr * gr * gr * gr * smoothstep(-0.05, 0.6, ndl) * (1.0 - steep);
  // (hotfix G0) no glints: one 0.22 m cell in fourteen flashed the sun at pow 140 as the view moved, a few pixels
  // each (sparkle by design). Their light on average was under 1e-4 of the sun's (7% of cells x the flash's mean over
  // the facets' spread x the spot's mean), under a hundredth of a code: nothing the sand loses
  return c * cloudShadow(p, ndl);
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
    return c * cloudShadow(p, ndl);
  }
  float dif = smoothstep(-0.15, 0.8, ndl);
  if (mat > 2.5) c = (mix(STONE_SHADE * 1.7, PALE, dif) + PALE * 0.22 * max(n.y, 0.0)) * col.rgb;
  else c = mix(STONE_SHADE, STONE_LIT, dif) * col.rgb;
  c += STONE_SHADE * 0.3 * max(n.y, 0.0);
  c *= mix(0.6, 1.0, smoothstep(0.0, 3.0, yAbove));
  c += SHEEN * 0.6 * rim * smoothstep(0.0, 0.5, ndl);
  return c * cloudShadow(p, ndl);
}
