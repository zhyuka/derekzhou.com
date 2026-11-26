
/* the sky's light: a gradient by elevation, warmer toward the sun and low, the sun's glow */
vec3 skyGrad(float e) {
  if (e < 0.0) return mix(uSky[1], uSky[0], smoothstep(0.0, 14.0, -e));
  vec3 c = mix(uSky[1], uSky[2], smoothstep(0.0, uSkyE.x, e));
  c = mix(c, uSky[3], smoothstep(uSkyE.x, uSkyE.y, e));
  c = mix(c, uSky[4], smoothstep(uSkyE.y, uSkyE.z, e));
  return mix(c, uSky[5], smoothstep(uSkyE.z, uSkyE.w, e));
}
float sunSide(vec3 rd) { vec2 h = normalize(rd.xz + vec2(1e-6, 0.0)), s = normalize(uSkyS.xz + vec2(1e-6, 0.0)); return 0.5 + 0.5 * dot(h, s); }
/* (the sun and moon: "same w sun") the warm band in a change between a twilight sky and a night: the twilight's
   sunk with the sun (read uSunK.x deg higher, so it is whole only under the sun's depth) and weakening with that
   depth (uSunK.y), the night's own coming in with the night's colours (uSunK.z); skyCol's own band is then off (its
   amounts 0) */
vec3 skyWarmN(vec3 c, float e, float side) {
  float lt = exp(-max(e + uSunK.x, 0.0) / uSkyKT.y) * uSunK.y, ln = exp(-max(e, 0.0) / uSkyKN.y) * uSunK.z;
  c = mix(c, uSkyWT, uSkyKT.x * side * side * lt);
  c *= 1.0 - uSkyKT.z * (1.0 - side) * lt;
  c = mix(c, uSkyWN, uSkyKN.x * side * side * ln);
  return c * (1.0 - uSkyKN.z * (1.0 - side) * ln);
}
/* the sky's colour along rd. (the sun and moon) in a change between a twilight sky and a night: its own warm band
   off (its amounts 0: the gradient as it is) and its glow the sinking sun's, then the two ends' warm bands laid on
   the gradient (skyWarmN's difference added, so the glow stays over the band) and the night's own glow about the key;
   everywhere else the plain sky's (uSkyN.w 0), bit for bit. The elevation, the gradient and the side are worked out
   once for both: FXC does not merge an inlined function's repeats, so it would compile them twice in every program
   that reads the sky (the same operations on the same values) */
vec3 skyCol(vec3 rd) {
  float e = degrees(asin(clamp(rd.y, -1.0, 1.0)));
  vec3 g = skyGrad(e), c = g;
  float side = sunSide(rd), low = exp(-max(e, 0.0) / uSkyK.y);
  c = mix(c, uSkyW, uSkyK.x * side * side * low);
  c *= 1.0 - uSkyK.z * (1.0 - side) * low;
  float cs = max(dot(rd, uSkyS), 0.0);
  c += uGlowC * (uGlow.x * pow(cs, uGlow.y) + uGlow.z * pow(cs, uGlow.w));
  if (uSkyN.w > 0.0) {
    float cn = max(dot(rd, uSkyN.xyz), 0.0);
    c += skyWarmN(g, e, side) - g + uGlowN * (uGlow.x * pow(cn, uGlow.y) + uGlow.z * pow(cn, uGlow.w));
  }
  return c;
}
/* aerial perspective, physical (physics: Looks): the air between the eye and a point takes its light away by
   extinction and gives the sky's back by in-scatter, L = c T + Linf (1 - T), per channel, T = exp(-od). Two kinds of
   scatterer: the gas, by wavelength (as the inverse fourth power: BR, its sea-level scattering at 680, 550 and 440 nm,
   https://doi.org/10.1364/AO.34.002765, thinning with an 8 km scale height along the path: gasPath), and the aerosol (the shape of the sky's own
   height fog, density a at y0 falling off by b, and its even distance term, uFog; times uAer.x, the visit's dust and
   moisture by AIR's weather: its amount the look's; by wavelength as uAer.w's wavelength exponent, green's extinction
   that amount: 370). Linf, what a path long enough gives back, is the sky's own colour toward the
   horizon (fogCol: the sky drawn there), so far ridges dissolve into the sky behind them; and since blue is taken and
   given first, a thin air is blue and a thick one the horizon's colour (no tint of its own). The aerosol's forward
   peak toward the light (the one-parameter phase of https://doi.org/10.1086/144246, its asymmetry uAer.y) only adds
   light: its share over an even scatter, which the sky's colour already holds. In-scatter never veils with grey:
   Linf is the sky's own light */
const vec3 BR = vec3(5.8e-6, 13.5e-6, 33.1e-6);   // (1/m)
vec3 fogCol(vec3 rd) { return skyCol(normalize(vec3(rd.x, max(rd.y, 0.0) * uFog2.x + uFog2.y, rd.z))); }
float fogOD(vec3 rd, float t) {   // the aerosol's optical depth along rd to t
  float b = uFog.y, k = b * rd.y * t;
  float f = abs(k) < 1e-4 ? 1.0 - 0.5 * k : (1.0 - exp(-k)) / k;
  return (uFog.x * exp(-b * (uCam.y - uFog.z)) * t * f + uFog.w * t) * uAer.x;
}
/* the gas's path, m of sea-level air: along rd to t through air thinning with its 8 km scale height from the eye's,
   the slant integral of exp(-y / H) (a cloud 7 km up is seen through the thin air it stands in, not the eye's) */
float gasPath(vec3 rd, float t) { float k = rd.y * t / 8000.0; return t * exp(-uCam.y / 8000.0) * (abs(k) < 1e-4 ? 1.0 - 0.5 * k : (1.0 - exp(-k)) / k); }
float fogAmt(vec3 rd, float t) { return 1.0 - exp(-fogOD(rd, t) - BR.g * gasPath(rd, t)); }   // (one share for a light's own glow: the green's)
/* the ground haze: a shallow layer over the land (its base a fixed depth under the eye, so it reads the same on a
   swell and in a trough), thick along the ground and thin above: far land and the feet of far things dissolve into a
   bright band while their tops keep their colour. Its light is the air's own (physics: Looks, the land row's haze by
   physics): what it gives back is the sky's light toward the horizon (fogCol, as the aerosol's), and in atmos the sun's
   forward peak over it, the aerosol's own (uAer: AIR's moisture); never a colour of its own, never a grey veil */
float hazeAmt(vec3 rd, float t) {
  if (uHaze.x <= 0.0) return 0.0;
  float H = uHaze.y, a0 = uHaze.x * exp(-uHaze.z / H);   // (the density at the eye)
  if (rd.y >= 0.0) { float k = rd.y * t / H, f = k < 1e-4 ? 1.0 - 0.5 * k : (1.0 - exp(-k)) / k; return 1.0 - exp(-a0 * t * f); }
  // down: thicker toward the haze's base, then even (and thinner) below it (a bay, a drop to the sea of cloud)
  float s1 = uHaze.z / -rd.y, tt = min(t, s1), k = -rd.y * tt / H, f = k < 1e-4 ? 1.0 + 0.5 * k : (exp(k) - 1.0) / k;
  return 1.0 - exp(-(a0 * tt * f + uHaze.x * 0.22 * max(t - s1, 0.0)));
}
float hazeSky(vec3 rd) { if (uHaze.x <= 0.0) return 0.0; return 1.0 - exp(-uHaze.x * exp(-uHaze.z / uHaze.y) * uHaze.y / max(rd.y, 2e-3)); }
vec3 hazeCol(vec3 rd) { return fogCol(rd); }
vec3 atmos(vec3 c, vec3 rd, float t) {
  float m = fogOD(rd, t), g = uAer.y, cs = dot(rd, uSun);
  float gp = gasPath(rd, t);
  vec3 T = exp(-(m * pow(vec3(680.0, 550.0, 440.0) / 550.0, vec3(-uAer.w)) + BR * gp)), T0 = exp(-(m + BR * gp)), fq = fogCol(rd);   // (the aerosol by wavelength, green's its amount: the wavelength exponent alpha, uAer.w, 370)
  /* the aerosol only adds the sky's light: each channel the brighter of the coloured air and the grey air of the same
     amount, so a red channel brighter than the horizon's sky, which a bluer air's lighter red extinction would leave
     nearer its own and a blue one a thicker blue would pull toward the sky, never goes below the grey's (nothing is
     darkened) */
  vec3 pk = uSunC * (uAer.z * uSunVis * smoothstep(-0.02, 0.06, uSun.y) * max((1.0 - g * g) / pow(1.0 + g * g - 2.0 * g * cs, 1.5) - 1.0, 0.0));
  c = max(c * T + fq * (1.0 - T), c * T0 + fq * (1.0 - T0)) + pk * (1.0 - exp(-m));
  float h = hazeAmt(rd, t); c = mix(c, fq, h) + pk * h;   // (the haze: the sky's light and the sun's forward peak, as the aerosol's)
  /* the twilight's low mist: while the light crosses the inks' band on a change of the words' kind, everything seen
     within a few degrees of the horizon (the far land, a mesa, a dune's crest, the feet of the towers) lies in a mist of the horizon's own colour, so the ground about the words is even, while the land nearer
     and lower keeps its darkness and the sky its own: the frame keeps its body. Its amount times its shape (0 at amount
     0: the identity); a function of the ray alone, the same everywhere, no words input */
#ifndef NO_TWILIGHT
  if (uTwM.x > 0.0) c = mix(c, fq, uTwM.x * (1.0 - smoothstep(uTwM.y, uTwM.y + uTwM.z, abs(rd.y))));
#endif
  return c;
}
