
/* ---- the world: the two kits composed by weight; smooth functions only, nothing switches on a place */
/* the land: the dunes kit's, its dunes as high as the sand weight says, sunk as the cloud weight rises (the sink
   bounded in slope by construction: the grids' derived channel) */
/* no rim: the sea does not lie in a basin under the land but rises around the dunes, filling their troughs first, so
   the coast is cloud lapping the sand (softened by the fringe below), never a cliff */
vec3 Hd(vec2 p) {
  vec3 wD, wC, lv, sk; kitW4(p, wD, wC, lv, sk);
  gKD = wD; gLV = lv; gWC = wC; gSK = sk; gMS = vec2(1.0, 0.0);
  vec3 h = D_Hd(p) - sk;
  gKD = vec3(1.0, 0.0, 0.0); gSK = vec3(0.0);
  gMB.x = gMB.x * gMS.x + gMS.y - sk.x;   // (delight-weather 1: the mist pools' floor, the basins and the sink in)
  return h;
}
/* the cloud sea's top: its level (rising with the cloud weight out of the low ground, far under the land where the
   weight is nought; bounded in slope by construction), the ABOVE kit's heaps and billows growing on it */
vec3 HdSea(vec2 p) {
  vec3 wD, wC, lv, sk; kitW4(p, wD, wC, lv, sk);
  vec3 amp = vec3(0.4, 0.0, 0.0) + 0.6 * wC;
  return lv + dMul(A_Hd(p), amp);
}
/* the coast: the land's height over the cloud sea's top at its vertices (after Hd), and the land within COAST_H of it
   taking the sea's own colour, the more the nearer, so where sand meets cloud the shore is a soft fringe of the
   cloud's mist on the land, never a waterline (a step meets them at a hard edge 0-1 px wide: a desert lake) */
const float COAST_H = 14.0;   // (14 m: the sea lies near the land, and a 40 m fringe paints whole sandy flats the cloud's colour)
float HdGap(vec2 p, float h) { if (h - gLV.x > 140.0) return 1e4; return h - (gLV.x + A_Hd(p).x * (0.4 + 0.6 * gWC.x)); }
vec3 shadeSea(vec3 p, vec3 n, vec3 rd, float t, float fp);
vec3 shadeLand(vec3 p, vec3 n, vec3 rd, float t, float fp) {
  vec3 c = shadeSand(p, n, rd, t, fp);
  if (gTX < COAST_H) { float k = 1.0 - smoothstep(0.0, COAST_H, gTX); c = mix(c, shadeSea(vec3(p.x, p.y - max(gTX, 0.0), p.z), vec3(0.0, 1.0, 0.0), rd, t, fp), k * k); }
  return c;
}
/* (delight-weather 1) the mist pools' top over a point: its floor (the ground the dunes stand on) and the sky's depth
   by the sand weight (229-mist-pools.js) */
float mistTop(vec2 mb) { return uMist.x > 0.0 ? mb.x + uMist.x * mb.y : -1e4; }
/* (the fog pools) a basin's pool's top over p, within its radius (234-fog-pools.js: held under the rim, so no edge shows at r) */
float fogTopAt(vec2 p) { vec2 d = p - uFogP.xy; return dot(d, d) < uFogP.z * uFogP.z ? uFogP.w : -1e4; }   // (none at depth 0: the land never under its own floor, so nothing changes as the depth leaves 0)
/* (physics: sand/saltation) the saltation layer on a windy visit: grains in hops densest within about 10 cm of the bed
   and thinning over a few decimetres, gathered in gusts into streamers along the wind (https://arxiv.org/pdf/1201.4353;
   streamers: https://doi.org/10.1029/2004JF000270). From 14 m up it is a column of SALT_TAU seen through 1 / g of it at
   the grazing cosine g: a faint lift of the sand toward its own lit colour (the grains in the light over it), so it never
   darkens; none on a calm visit (AIR's dust 0) and none on the lee's steep faces, sheltered. The streamers (SALT_W apart
   across the wind, SALT_L long) drift on the air 10 cm up; where their spacing spans under 5 px they are their mean, so
   they never glitter */
const float SALT_TAU = 0.05, SALT_K = 0.35, SALT_W = 1.5, SALT_L = 12.0;
vec3 saltOver(vec3 c, vec3 p, vec3 n, vec3 rd, float fp, vec3 lit) {
  if (uGrains.x <= 0.0) return c;
  float g = max(abs(dot(rd, n)), 0.1);
  vec2 w = uGrains.zw, pp = vec2(-w.y, w.x), rh = normalize(rd.xz + vec2(1e-6, 0.0));
  float fw = fp * (abs(dot(pp, rh)) / g + abs(dot(pp, vec2(-rh.y, rh.x))));
  float s = n3v(vec3(dot(p.xz, pp) / (4.0 * SALT_W), (dot(p.xz, w) - uGrains.y) / (4.0 * SALT_L), 0.53)).a;
  float str = mix(0.3 + 1.4 * smoothstep(0.35, 0.75, s), 1.0, smoothstep(0.2, 0.4, fw / SALT_W));
  return c + max(lit - c, vec3(0.0)) * (uGrains.x * SALT_K * smoothstep(0.85, 0.95, n.y) * (1.0 - exp(-SALT_TAU * str / g)));
}
/* the same at a point, from the weights (the landmarks and the scatter, per vertex: no varying of the land's to read) */
float mistTopAt(vec2 p) {
  if (uMist.x <= 0.0) return -1e4;
  vec3 wD, wC, lv, sk; kitW4(p, wD, wC, lv, sk);
  gMS = vec2(1.0, 0.0);
  ivec2 c0 = ivec2(floor(p / DS));   // (the basins about p, as D_Hd's: their change to the floor)
  for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) { Site S = siteOf(c0 + ivec2(i, j)); if (S.kind == 1 || S.kind == 2) basinOf(p, vec3(0.0), S); }
  return max(mistTop(vec2(swell(p) * gMS.x + gMS.y - sk.x, wD.x)), fogTopAt(p));
}
/* the mist over a surface d m under the pool's top: opaque within uMist.y of depth, the same at every depth (the level
   moves, nothing thickens in place); the rim's ramp at least two pixels' worth of the surface's depth (the far
   shorelines never crawl); lit by the sky's own cloud light, as the cloud sea's flat tops */
vec3 mistOver(vec3 c, float d, vec3 n, vec3 rd, float fp) {
  if (uMist.x <= 0.0 || d < -12.0) return c;
  float px = fp * length(n.xz) / max(abs(dot(n, rd)), 0.05);   // (the depth a pixel spans on this surface)
  float a = clamp((d - 0.5 * uMist.y) / max(uMist.y, 2.0 * px) + 0.5, 0.0, 1.0);
  return mix(c, cloudLight(vec3(0.0, 1.0, 0.0), rd, 1.4, 0.9, 0.35, 0.0), a * a * (3.0 - 2.0 * a));
}
/* the camera's ground: the land or the cloud's top, whichever is higher (never the mist pools': the ground is the same
   under every sky; the flight keeps over the pools by its own floor, 270-flight.js) */
float HdCam(vec2 p) { return max(Hd(p).x, HdSea(p).x); }
/* the probe's height: Hd(p).x, or (cam) HdCam(p), with the weights and the dunes' land made once: HdCam inlines
   kitW4 three times and D_Hd twice into the probe (its compile on D3D11 2.4x the terrain's). The same
   operations in the same order: kitW4 reads none of the globals Hd sets, A_Hd none but gLodD */
float HdProbe(vec2 p, bool cam) {
  vec3 wD, wC, lv, sk; kitW4(p, wD, wC, lv, sk);
  gKD = wD; gLV = lv; gWC = wC; gSK = sk;
  vec3 h = D_Hd(p) - sk;
  gKD = vec3(1.0, 0.0, 0.0); gSK = vec3(0.0);
  if (!cam) return h.x;
  vec3 amp = vec3(0.4, 0.0, 0.0) + 0.6 * wC;
  return max(h.x, (lv + dMul(A_Hd(p), amp)).x);
}
vec3 shadeSea(vec3 p, vec3 n, vec3 rd, float t, float fp) {
  vec3 wD, wC, lv, sk; kitW4(p.xz, wD, wC, lv, sk);
  return A_shadeSea(vec3(p.x, p.y - lv.x, p.z), n, rd, t, fp);
}
/* a piece's own material code (per vertex: its generator's): 4-6 the ABOVE kit's grass, stone and rock, else the
   dunes kit's */
vec3 shadeStone(vec3 p, vec3 n, vec3 rd, float t, float fp, vec4 col, float yAbove) {
  float m = col.a;
  if (m > 3.5) return A_shadeStone(p, n, rd, t, fp, vec4(col.rgb, m > 5.5 ? 2.0 : (m > 4.5 ? 1.0 : 4.0)), yAbove);
  return D_shadeStone(p, n, rd, t, fp, col, yAbove);
}
/* the dunes kit's scatter, thinned as the cloud sea rises */
float scatterDensity(vec2 p, int layer) { vec3 wD, wC; kitW(p, wD, wC); return D_scatterDensity(p, layer) * (1.0 - smoothstep(0.4, 0.8, wC.x)); }
