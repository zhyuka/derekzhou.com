
#define A_STONE_LIT uP[12].rgb
#define A_STONE_SHADE uP[13].rgb
#define A_GRASS uP[14].rgb
#define A_MIST uP[15].rgb
#define A_SEALIT uP[15].x   /* (tod) how much of the light the cloud sea's tops take (the world's sky sets it: 1 by day; the afterglow's and the light before sunrise's seas in the Earth's shadow) */
#define A_GRASS_LIT uP[16].rgb
#define A_ROCK_DEEP uP[17].rgb
/* the sea of cloud: broad swells and heaps of billows, round tops and creases between */
/* (fast500 D) the sea's taps: offsets, (diagonal) scales for taps 0, 2, 4, 6 and the full matrices of taps 1, 3, 5 */
const vec2 A_TO[7] = vec2[7](vec2(0.0), vec2(77.0), vec2(13.0, 5.0), vec2(-41.0, 19.0), vec2(7.0, -3.0), vec2(-19.0, 31.0), vec2(5.0, 23.0));
const float A_TS[7] = float[7](1.0 / 900.0, 0.0, 1.0 / 210.0, 0.0, 1.0 / 26.0, 0.0, 1.0 / 17.0);
const mat2 A_M1 = mat2(0.8, 0.6, -0.6, 0.8) * (1.0 / 380.0), A_M3 = mat2(0.6, 0.8, -0.8, 0.6) * (1.0 / 75.0), A_M5 = mat2(0.9, -0.44, 0.44, 0.9) * (1.0 / 48.0);
/* (physics: clouds/sea) the sea's carry and its long waves (212's seaUniform: [D.x, D.z, phase 1, phase 2]): the heaps
   and billows read at p - D, so the whole pattern rides the wind at the sea's top; two long low waves on it, running in
   the air's frame (their directions fixed to the world, 0.94 and 0.36 rad apart). The shape alone: every light term is
   the same function of it */
uniform vec4 uSeaD;
const vec2 A_WK1 = vec2(0.9397, 0.3420) * (6.2831853 / 2800.0), A_WK2 = vec2(-0.3746, 0.9272) * (6.2831853 / 4300.0);
const float A_WA1 = 3.0, A_WA2 = 2.0;
vec3 A_Hd(vec2 p) {
  p -= uSeaD.xy;
  float k1 = 1.0 - smoothstep(350.0, 900.0, gLodD), k2 = 1.0 - smoothstep(120.0, 380.0, gLodD);
  /* (fast500 D) the seven taps' noise in one loop FXC keeps rolled (one copy of gnd per kind of multiply), each tap's
     own multiply as before and its gradient turn after: the same operations on the same values */
  vec3 g0 = vec3(0.0), g1 = g0, g2 = g0, g3 = g0, g4 = g0, g5 = g0, g6 = g0;
  for (int o = 0; o < 5 + (k1 > 0.0 ? 1 : 0) + (k2 > 0.0 ? 1 : 0) + UZ; o++) {
    vec3 g;
    if (o == 1 || o == 3 || o == 5) g = gnd((o == 1 ? A_M1 : (o == 3 ? A_M3 : A_M5)) * (p + A_TO[o]));
    else g = gnd(mat2(A_TS[o]) * (p + A_TO[o]));
    if (o == 0) g0 = g; else if (o == 1) g1 = g; else if (o == 2) g2 = g; else if (o == 3) g3 = g; else if (o == 4) g4 = g; else if (o == 5) g5 = g; else g6 = g;
  }
  vec3 h = 30.0 * dNg(g0, mat2(1.0 / 900.0)) + 12.0 * dNg(g1, A_M1);
  h += 28.0 * dAbs(dNg(g2, mat2(1.0 / 210.0)), 0.04);
  h += 12.0 * dAbs(dNg(g3, A_M3), 0.05);
  h += 4.0 * dAbs(dNg(g4, mat2(1.0 / 26.0)), 0.07);
  // (world6 step B) the near domes the low flight sees (48 m and 17 m, round tops), faded out with the vertex's distance
  // (gLodD: 0 in the probes, so the camera's ground keeps them) before the clipmap's spacing could alias them
  if (k1 > 0.0) h += (9.0 * k1) * dAbs(dNg(g5, A_M5), 0.08);
  if (k2 > 0.0) h += (3.5 * k2) * dAbs(dNg(g6, mat2(1.0 / 17.0)), 0.1);
  float w1 = dot(A_WK1, p) - uSeaD.z, w2 = dot(A_WK2, p) - uSeaD.w;
  h += vec3(A_WA1 * sin(w1) + A_WA2 * sin(w2), A_WA1 * cos(w1) * A_WK1 + A_WA2 * cos(w2) * A_WK2);
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
/* (delight-weather 4) the glory and the fogbow on the moonlit cloud sea: rings about the point opposite the moon
   (uGlory.xyz: the moon's own direction, the air's airMoon; w its amount, nought but on a moonlit sky with the moon over
   the sea), a function of the view's angle alone, times the sea's own light, so it moves only with the view and the
   moon (its brightness: the rings take their own colours, not the sea's blue). The glory's first red ring at GLORY_R (the corona's 2.6 deg ring is droplets of about 6 um; a glory's ring
   goes as 1/r, 2.4 deg at 10 um: 3.9 deg), two fainter rings outside it and a bright centre; the fogbow broad and
   white at BOW_R, faintly red outside and blue inside, with a faint supernumerary BOW_SUP inside it. Only the cloud
   sea's surface takes it (A_shadeSea); no sky program reads it. Sources: the WMO Cloud Atlas (glory, fogbow);
   https://www.eoas.ubc.ca/books/Practical_Meteorology/ */
uniform vec4 uGlory;
const float GLORY_R = 3.9, GLORY_W = 0.35, BOW_R = 37.0, BOW_W = 2.6, BOW_SUP = 8.0;
vec3 A_glory(vec3 rd) {
  if (uGlory.w <= 0.0) return vec3(0.0);
  float a = degrees(acos(clamp(-dot(rd, uGlory.xyz), -1.0, 1.0)));
  if (a > BOW_R + 4.0 * BOW_W) return vec3(0.0);
  vec3 g = vec3(0.0);
  if (a < 3.0 * GLORY_R) {
    g += vec3(0.9, 0.92, 1.0) * 0.9 * exp(-pow(a / (0.45 * GLORY_R), 2.0));   // the bright centre
    for (int k = 0; k < 3; k++) {   // each ring red outside, green, then blue inside; each fainter
      float r = GLORY_R * (1.0 + 0.72 * float(k)), s = 1.0 / (1.0 + 1.2 * float(k));
      g += s * (vec3(1.0, 0.55, 0.45) * 0.6 * exp(-pow((a - r) / GLORY_W, 2.0)) + vec3(0.5, 0.95, 0.6) * 0.3 * exp(-pow((a - r + 0.55) / GLORY_W, 2.0))
        + vec3(0.45, 0.6, 1.0) * 0.45 * exp(-pow((a - r + 1.0) / GLORY_W, 2.0)));
    }
  }
  float b = (a - BOW_R) / BOW_W;
  g += 0.3 * (vec3(1.0) * exp(-b * b) + vec3(0.25, 0.05, 0.0) * exp(-2.0 * (b - 1.1) * (b - 1.1)) + vec3(0.0, 0.04, 0.12) * exp(-2.0 * (b + 1.1) * (b + 1.1)))
    + vec3(0.08) * exp(-pow((a - BOW_R + BOW_SUP) / 1.5, 2.0));
  return g * uGlory.w;
}
vec3 A_shadeSea(vec3 p, vec3 n, vec3 rd, float t, float fp) {
  n = normalize(n - A_bump(p.xz - uSeaD.xy, fp));   // (the near lumps ride with the heaps: physics: clouds/sea)
  // the sea's own heaps: their tops catch the low sun (pink), the creases between sink into the sky's blue
  float hgt = smoothstep(-25.0, 55.0, p.y);
  float crease = smoothstep(-8.0, 16.0, p.y - 30.0 * gn((p.xz - uSeaD.xy) / 900.0));
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
  c += dot(c, vec3(0.2126, 0.7152, 0.0722)) * A_glory(rd);   // (the glory and the fogbow: more of the sea's own light opposite the moon, in the moonlight's own colours)
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
