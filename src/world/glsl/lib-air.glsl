
/* the sky's light: a gradient by elevation, warmer toward the sun and low, the sun's glow */
vec3 skyGrad(float e) {
  if (e < 0.0) return mix(uSky[1], uSky[0], smoothstep(0.0, 14.0, -e));
  vec3 c = mix(uSky[1], uSky[2], smoothstep(0.0, uSkyE.x, e));
  c = mix(c, uSky[3], smoothstep(uSkyE.x, uSkyE.y, e));
  c = mix(c, uSky[4], smoothstep(uSkyE.y, uSkyE.z, e));
  return mix(c, uSky[5], smoothstep(uSkyE.z, uSkyE.w, e));
}
float sunSide(vec3 rd) { vec2 h = normalize(rd.xz + vec2(1e-6, 0.0)), s = normalize(uSkyS.xz + vec2(1e-6, 0.0)); return 0.5 + 0.5 * dot(h, s); }
/* (fast500 no-fades, the sun and moon: "same w sun") the warm band in a change between a twilight sky and a night: the
   twilight's sunk with the sun (read uSunK.x deg higher, so it is whole only under the sun's depth) and weakening
   with that depth (uSunK.y), the night's own coming in with the night's colours (uSunK.z); skyCol's own band is
   then off (its amounts 0), its lines unchanged */
vec3 skyWarmN(vec3 c, float e, float side) {
  float lt = exp(-max(e + uSunK.x, 0.0) / uSkyKT.y) * uSunK.y, ln = exp(-max(e, 0.0) / uSkyKN.y) * uSunK.z;
  c = mix(c, uSkyWT, uSkyKT.x * side * side * lt);
  c *= 1.0 - uSkyKT.z * (1.0 - side) * lt;
  c = mix(c, uSkyWN, uSkyKN.x * side * side * ln);
  return c * (1.0 - uSkyKN.z * (1.0 - side) * ln);
}
vec3 skyCol0(vec3 rd) {
  float e = degrees(asin(clamp(rd.y, -1.0, 1.0)));
  vec3 c = skyGrad(e);
  float side = sunSide(rd), low = exp(-max(e, 0.0) / uSkyK.y);
  c = mix(c, uSkyW, uSkyK.x * side * side * low);
  c *= 1.0 - uSkyK.z * (1.0 - side) * low;
  float cs = max(dot(rd, uSkyS), 0.0);
  c += uGlowC * (uGlow.x * pow(cs, uGlow.y) + uGlow.z * pow(cs, uGlow.w));
  return c;
}
/* (fast500 no-fades, the sun and moon) in a change between a twilight sky and a night: skyCol0 with its own warm band
   off (its amounts 0: the gradient as it is) and its glow the sinking sun's, then the two ends' warm bands laid on the
   gradient (skyWarmN's difference added, so the glow stays over the band, as in skyCol0) and the night's own glow
   about the key; everywhere else skyCol0, F0's, bit for bit */
vec3 skyCol(vec3 rd) {
  vec3 c = skyCol0(rd);
  if (uSkyN.w > 0.0) {
    float e = degrees(asin(clamp(rd.y, -1.0, 1.0))), cn = max(dot(rd, uSkyN.xyz), 0.0); vec3 g = skyGrad(e);
    c += skyWarmN(g, e, sunSide(rd)) - g + uGlowN * (uGlow.x * pow(cn, uGlow.y) + uGlow.z * pow(cn, uGlow.w));
  }
  return c;
}
/* aerial perspective: height fog (density a at y0 falling off by b) and a distance haze, in-scattering the sky's
   own colour toward the view at the horizon (so distance dissolves into the sky), brighter toward the sun */
vec3 fogCol(vec3 rd) { return skyCol(normalize(vec3(rd.x, max(rd.y, 0.0) * uFog2.x + uFog2.y, rd.z))); }
float fogAmt(vec3 rd, float t) {
  float b = uFog.y, k = b * rd.y * t;
  float f = abs(k) < 1e-4 ? 1.0 - 0.5 * k : (1.0 - exp(-k)) / k;
  float od = uFog.x * exp(-b * (uCam.y - uFog.z)) * t * f + uFog.w * t;
  return 1.0 - exp(-od);
}
/* the ground haze: a shallow layer over the land (its base a fixed depth under the eye, so it reads the same on a
   swell and in a trough), thick along the ground and thin above: far land and the feet of far things dissolve into a
   bright band while their tops keep their colour; lavender, warmer toward the sun */
float hazeAmt(vec3 rd, float t) {
  if (uHaze.x <= 0.0) return 0.0;
  float H = uHaze.y, a0 = uHaze.x * exp(-uHaze.z / H);   // (the density at the eye)
  if (rd.y >= 0.0) { float k = rd.y * t / H, f = k < 1e-4 ? 1.0 - 0.5 * k : (1.0 - exp(-k)) / k; return 1.0 - exp(-a0 * t * f); }
  // down: thicker toward the haze's base, then even (and thinner) below it (a bay, a drop to the sea of cloud)
  float s1 = uHaze.z / -rd.y, tt = min(t, s1), k = -rd.y * tt / H, f = k < 1e-4 ? 1.0 + 0.5 * k : (exp(k) - 1.0) / k;
  return 1.0 - exp(-(a0 * tt * f + uHaze.x * 0.22 * max(t - s1, 0.0)));
}
float hazeSky(vec3 rd) { if (uHaze.x <= 0.0) return 0.0; return 1.0 - exp(-uHaze.x * exp(-uHaze.z / uHaze.y) * uHaze.y / max(rd.y, 2e-3)); }
vec3 hazeCol0(vec3 rd) { float cs = max(dot(normalize(vec3(rd.x, 0.0, rd.z) + 1e-6), normalize(vec3(uSkyS.x, 0.0, uSkyS.z) + 1e-6)), 0.0); return mix(uHazeC, uHazeW, cs * cs * cs); }
/* (fast500 no-fades, the sun and moon) the haze's warm side in a change between a twilight sky and a night: by its two
   ends, the twilight's sinking with the sun as its warm band does (whole only under the sun's depth) and weakening
   with that depth, the night's coming in with the night's colours; elsewhere F0's (hazeCol0) */
vec3 hazeCol(vec3 rd) {
  if (uSkyN.w <= 0.0) return hazeCol0(rd);
  float cs = max(dot(normalize(vec3(rd.x, 0.0, rd.z) + 1e-6), normalize(vec3(uSkyS.x, 0.0, uSkyS.z) + 1e-6)), 0.0), e = degrees(asin(clamp(rd.y, -1.0, 1.0)));
  float st = exp(-(max(e + uSunK.x, 0.0) - max(e, 0.0)) / uSkyKT.y) * uSunK.y;
  return uHazeC + cs * cs * cs * (uHzT * st + uHzN * uSunK.z);
}
vec3 atmos(vec3 c, vec3 rd, float t) {
  float f = fogAmt(rd, t);
  // the air's colour: blue first (dark forms far off turn blue), the horizon's own colour as it thickens
  vec3 fc = mix(mix(fogCol(rd), uFogB.rgb, uFogB.a), fogCol(rd), smoothstep(0.25, 0.95, f));
  c = mix(c, fc, f);
  c = mix(c, hazeCol(rd), hazeAmt(rd, t));
  /* (tod fix3, problem 2) the twilight's low mist: while the light crosses the inks' band on a change of the words'
     kind, everything seen within a few degrees of the horizon (the far land, a mesa, a dune's crest, the feet of the
     towers) lies in a mist of the horizon's own colour, so the ground about the words is even, while the land nearer
     and lower keeps its darkness and the sky its own: the frame keeps its body. Its amount times its shape (0 at amount
     0: the identity); a function of the ray alone, the same everywhere, no words input */
#ifndef NO_TWILIGHT
  if (uTwM.x > 0.0) c = mix(c, fogCol(rd), uTwM.x * (1.0 - smoothstep(uTwM.y, uTwM.y + uTwM.z, abs(rd.y))));
#endif
  return c;
}
vec3 ambient(vec3 n) { return mix(uAmbD, uAmbU, 0.5 + 0.5 * n.y); }
