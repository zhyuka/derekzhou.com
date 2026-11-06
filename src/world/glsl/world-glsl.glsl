
/* ---- the world (world6): the two kits composed by weight; smooth functions only, nothing switches on a place */
/* the land: the dunes kit's, its dunes as high as the sand weight says, sunk as the cloud weight rises (the sink
   bounded in slope by construction: the grids' derived channel) */
/* (world6 fix, the judges' defect 5) where the land comes down within RIM_HI m of the cloud sea's level it falls away
   under a rim, RIM_DROP m by RIM_LO (so under the sea's lowest troughs), as the old bays' land fell 70 m under theirs:
   the sea is seen below the rim, its edge a cliff's, never a waterline on the sand (a smooth function of the land and
   the level: C1) */
/* (world6 step B) the rim is gone: the sea no longer lies in a basin under the land but rises around the dunes, filling
   their troughs first, so the coast is cloud lapping the sand (softened by the fringe below), never a cliff */
vec3 Hd(vec2 p) {
  vec3 wD, wC, lv, sk; kitW4(p, wD, wC, lv, sk);
  gKD = wD; gLV = lv; gWC = wC;
  vec3 h = D_Hd(p) - sk;
  gKD = vec3(1.0, 0.0, 0.0);
  return h;
}
/* the cloud sea's top: its level (rising with the cloud weight out of the low ground, far under the land where the
   weight is nought; bounded in slope by construction), the ABOVE kit's heaps and billows growing on it */
vec3 HdSea(vec2 p) {
  vec3 wD, wC, lv, sk; kitW4(p, wD, wC, lv, sk);
  vec3 amp = vec3(0.4, 0.0, 0.0) + 0.6 * wC;
  return lv + dMul(A_Hd(p), amp);
}
/* (world6 fix, the judges' defect 5) the coast: the land's height over the cloud sea's top at its vertices (after Hd),
   and the land within COAST_H of it taking the sea's own colour, the more the nearer, so where sand meets cloud the
   shore is a soft fringe of the cloud's mist on the land, never a waterline (the step met them at a hard edge 0-1 px
   wide: a desert lake) */
const float COAST_H = 14.0;   // (world6 step B: 40 -> 14 m: the sea now lies near the land, and a 40 m fringe painted whole sandy flats the cloud's colour)
float HdGap(vec2 p, float h) { if (h - gLV.x > 140.0) return 1e4; return h - (gLV.x + A_Hd(p).x * (0.4 + 0.6 * gWC.x)); }
vec3 shadeSea(vec3 p, vec3 n, vec3 rd, float t, float fp);
vec3 shadeLand(vec3 p, vec3 n, vec3 rd, float t, float fp) {
  vec3 c = shadeSand(p, n, rd, t, fp);
  if (gTX < COAST_H) { float k = 1.0 - smoothstep(0.0, COAST_H, gTX); c = mix(c, shadeSea(vec3(p.x, p.y - max(gTX, 0.0), p.z), vec3(0.0, 1.0, 0.0), rd, t, fp), k * k); }
  return c;
}
/* the camera's ground: the land or the cloud's top, whichever is higher */
float HdCam(vec2 p) { return max(Hd(p).x, HdSea(p).x); }
/* (speed S1) the probe's height: Hd(p).x, or (cam) HdCam(p), with the weights and the dunes' land made once: HdCam
   inlined kitW4 three times and D_Hd twice into the probe (its compile on D3D11 was 2.4x the terrain's). The same
   operations in the same order: kitW4 reads none of the globals Hd sets, A_Hd none but gLodD */
float HdProbe(vec2 p, bool cam) {
  vec3 wD, wC, lv, sk; kitW4(p, wD, wC, lv, sk);
  gKD = wD; gLV = lv; gWC = wC;
  vec3 h = D_Hd(p) - sk;
  gKD = vec3(1.0, 0.0, 0.0);
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
