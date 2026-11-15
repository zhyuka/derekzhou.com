
uniform vec4 uSunD;   // disc: cos of radius, intensity, star amount, disc kind (1: a great flat disc)
uniform int uZs;   // (fast500 D T1) never set: 0 at link; the star loop's bound FXC cannot fold
uniform vec4 uHi;     // high cloud: cover, brightness, scale, drift
uniform vec3 uHiC;
uniform vec4 uMoon;   // (tod) the moon: its direction, its amount (0: none)
uniform vec3 uMoonC, uMoonG;   // (tod) its disc's colour (a pale flat disc, held under the light ceiling) and its glare's
uniform vec4 uNight;  // (tod) the belt (the Earth's shadow and the Belt of Venus), the noctilucent wisps, the stars' twinkle (1) or held (0), the stars' top (Y)
uniform vec4 uSunB;   // (fast500 no-fades) in a change between a twilight sky and a night: the wisps' amount and the veil's strength (both 0 in uNight and uHi there, so F0's blocks draw nothing and these below draw them), -, -
uniform vec4 uGal, uGalC;   // (tod, phase 2) the galaxy: its pole and amount (0 or 1); its core's direction and how far it has come in (1 whole)
uniform vec4 uAur;    // (tod, phase 2) the aurora: how far it has come in (1 whole), its centre's azimuth, its folds' phase, its amount (0 or 1)
uniform vec4 uAurB;   // (physics: aurora/phases) how far through its hold, the breakup's front (km along the sheet, east +), the second arc's km farther (0 none), a breakup (0 or 1)
out vec4 oC;
const float SKYTAU = 6.2831853;
/* (tod) the stars: world-anchored (a cell of the sphere by the direction: elevation bands STC rad deep, each cut into
   cells about STC rad wide), a star in a share of the cells at a hashed place well inside its own, a bell at least
   FWHM 1 px by the pixel's own angle with its energy held (its peak the same at any resolution: a turn slides it and
   never blinks it), twinkling slowly (+-15% at 0.6-1.8 rad/s); the cell and its four neighbours read */
const float STC = 0.04;
/* (aurora-enter-by-place, no fades) the galaxy comes and goes by place: an edge (as the Earth's shadow over the wisps)
   climbs from under the horizon over it as it goes and sinks off it as it comes; under the edge it is not drawn */
float galEdge(float e) { float g = (1.0 - uGalC.w) * 95.0 - 3.0; return smoothstep(g - 0.8, g + 1.2, e); }
/* (tod, phase 2) the Milky Way (the live's band, bright core and dark lanes; its noise from uN3, a whole number of its
   period round the band so a turn never meets a seam) and the aurora (one sheet low over the key's horizon, its colour by altitude: physics: aurora) */
#ifdef SKY_PH2
vec3 galaxyAt(vec3 rd, float e) {
  if (uGalC.w <= 0.0) return vec3(0.0);   // (aurora-enter-by-place: nothing read until it has begun to come in)
  vec3 P = uGal.xyz, C = uGalC.xyz;
  float b = dot(rd, P), l = atan(dot(rd, cross(P, C)), dot(rd, C)), u = l / SKYTAU;
  float band = exp(-b * b / 0.0225), core = exp(-l * l / 0.36) * exp(-b * b / 0.05);
  float n = n3v(vec3(u * 7.0, b * 3.15, 0.13)).b * 0.45 + n3v(vec3(u * 21.0, b * 9.9, 0.71)).a * 0.35 + n3v(vec3(u * 62.0, b * 29.7, 0.29)).a * 0.2;
  float lanes = smoothstep(0.4, 0.64, n3v(vec3(u * 4.0, b * 5.6 * 0.33 + 0.1 * n3v(vec3(u * 13.0, 0.4, 0.61)).b, 0.37)).b) * exp(-pow(b - 0.02 * sin(l * 5.0), 2.0) / 0.003);
  return (vec3(0.9, 0.86, 0.8) * band * (0.25 + 1.1 * n * n) + vec3(1.0, 0.85, 0.65) * core * 1.3) * (1.0 - 0.8 * lanes) * uGal.w * 0.04 * smoothstep(1.0, 12.0, e) * galEdge(e);
}
/* (physics: aurora/phases) one sheet D km away toward the key's azimuth, seen from the ground: phi from its centre,
   the folds' phase f0, and how deep into a breakup it is (bk: 0 none; the section east of the front, s > uAurB.y) */
vec3 auroraSheet(float el, float cp, float sp, float D, float f0, float bk, float rk, float pa) {
  /* (physics: aurora/geometry) the ray's crossing with it (rho cos phi = D + y(rho sin phi), three fixed-point steps)
     and the altitude there, h = R (cos e / cos(e + rho / R) - 1); at infinity (drawn by direction: no parallax in
     flight), not tied to the stars */
  /* (physics: aurora/motion) the sheet's line y(s): a swell (15 km, 500 km, 0.3 km/s: 0.0038 rad/s) and folds (3 km,
     40 km, 1 km/s: 0.157 rad/s; 9 km inside a breakup), the folds gone where 40 km spans under 8 px as projected
     (40 cos psi / rho pa: psi the sheet's swell-only angle to the view), and held shallow where the crossing's three
     steps would not converge (slope x tan phi at most 0.5: seen along the sheet); nothing faster
     (no curls, corona, pulsing or flicker: on screen they would glitter or fade) */
  float rho = D / cp, y = 0.0, yd = 0.0, ys = 0.0, b = 0.0;
  for (int i = 0; i < 3; i++) {
    /* (the folds' spacing irregular, as real folds are: a fixed wobble of their phase over 170 km, so their edge-on
       flanks never stand in a regular comb) */
    float s = rho * sp, w = SKYTAU * s / 170.0 + f0 * 3.0;
    b = bk * smoothstep(uAurB.y - 15.0, uAurB.y + 15.0, s);
    float cw = abs(cos(el) * (cp - ys * sp)) / sqrt(1.0 + ys * ys), fa = min(mix(3.0, 9.0, b) * smoothstep(8.0, 16.0, 40.0 * cw / max(rho * pa, 1e-4)), 2.0 * cp / max(abs(sp), 1e-3));
    float a1 = SKYTAU * s / 500.0 + 0.0038 * uT + f0 * 7.0, a2 = SKYTAU * s / 40.0 - 0.157 * uT + f0 * 13.0 + 1.3 * sin(w);
    y = 15.0 * sin(a1) + fa * sin(a2);
    ys = 15.0 * SKYTAU / 500.0 * cos(a1);
    yd = ys + fa * (SKYTAU / 40.0 + 1.3 * SKYTAU / 170.0 * cos(w)) * cos(a2);
    rho = (D + y) / cp;
  }
  float ee = el + rho / 6371.0;
  if (ee >= 1.5) return vec3(0.0);
  float h = 6371.0 * (cos(el) / cos(ee) - 1.0), s = rho * sp;
  /* (physics: aurora/colour) by altitude: the green line's hem (557.7 nm) rising from h0 - 2 to h0 + 4 (h0 105 km),
     then e-folding over 15 km (30-40 inside a ray); no stop in the saddle (150-190 km: the sky's own blue shows); the
     red line's top (630 nm) rising from 180 to 230 km, e-folding over 60, a fifth of the green's column, unrayed. The
     rays along the sheet only (functions of s: they meet at the zenith in perspective), the noise's 48 km period at
     1 km/s, read at level 0 (no mip before the hard smoothstep) and drifting in v and w (113 and 271 km: their autocorrelation along the sheet at most 0.6 for lags of 10-1100 km),
     eased to their own mean (the volume's, 0.12) wherever its 6 km octave spans under 3-6 px as projected (physics:
     aurora/sampling: 1x within 3 codes of 2x2, test/unit/aurora.mjs).
     (physics: aurora/phases) inside a breakup: brighter, the rays twice as tall, the pink fringe under the hem (the
     nitrogen bands, 95-108 km, running into the hem), and the red brightened where the front passed 10 deg back (it trails it, east) */
  float cps = abs(cos(el) * (cp - yd * sp)) / sqrt(1.0 + yd * yd), cpr = abs(cos(el) * (cp - ys * sp)) / sqrt(1.0 + ys * ys);
  float ry = mix(0.12, smoothstep(0.45, 0.9, textureLod(uN3, vec3(s / 48.0 + uT / 48.0, 0.5 + s / 113.0, 0.19 + f0 + s / 271.0), 0.0).a), smoothstep(3.0, 6.0, 6.0 * cpr / max(rho * pa, 1e-4)));
  float g = smoothstep(103.0, 109.0, h) * exp(-max(h - 109.0, 0.0) / mix(15.0, mix(35.0, 70.0, b), ry)) * (0.75 + 0.5 * ry) * (1.0 + 0.5 * b);
  float r = rk * smoothstep(180.0, 230.0, h) * exp(-max(h - 230.0, 0.0) / 60.0) * 0.2 * (1.0 + 1.5 * bk * smoothstep(uAurB.y + 0.18 * D - 15.0, uAurB.y + 0.18 * D + 15.0, s));
  float pk = b * smoothstep(95.0, 100.0, h) * (1.0 - smoothstep(104.0, 110.0, h)) * 0.7;
  /* edge-on is brightest: the column along the ray through the sheet, 1 / |cos psi| (eased to 3 at most: a smooth
     peak, never a pixel-thin flank); the red's by the
     swell alone (it is blurred over 30 km and more: the folds' flanks never show in it) */
  float eo = inversesqrt(cps * cps + 0.11);
  return (vec3(0.225, 1.5, 0.18) * g * eo + vec3(0.9, 0.1, 0.06) * r * min(1.0 / max(cpr, 1e-3), 1.2) + vec3(0.9, 0.2, 0.45) * pk * eo) * 0.08;
}
vec3 auroraAt(vec3 rd, float e) {
  if (uAur.x <= 0.0) return vec3(0.0);   // (likewise)
  /* (physics: aurora/phases) the night's: D from its lower border's elevation at its centre (h 105 km), which rises with
     its own rise from 5.7 deg under the horizon (D 1950: nothing of it over, the red's 300 km first) to 6.2 deg over it
     (D 650), drifts over the hold to 9.5 (D 500: uAurB.x), and sinks again (the green first, the red last); at most
     0.3 deg/s (222's skyAur). In half the stays a second arc uAurB.z km farther at 0.6 */
  float eb = radians(mix(-5.735, mix(6.17, 9.51, uAurB.x), uAur.x));
  float D = 6371.0 * (acos(cos(eb) / (1.0 + 105.0 / 6371.0)) - eb);
  float phi = atan(rd.x, rd.z) - uAur.y, cp = cos(phi), sp = sin(phi);
  if (cp < 0.05) return vec3(0.0);
  float el = asin(clamp(rd.y, -1.0, 1.0)), pa = 2.0 * atan(uProj.y) / uRes.y;
  vec3 c = auroraSheet(el, cp, sp, D, uAur.z, uAurB.w, 1.0, pa);
  if (uAurB.z > 0.0) c += 0.6 * auroraSheet(el, cp, sp, D + uAurB.z, uAur.z + 0.37, 0.0, 0.0, pa);   // (the far arc green only: its red top would stand in the near arc's saddle and grey the sky's blue)
  /* its light held under the words' floor: the green's composited peak at most L 0.50 at every height it stands, in a
     breakup and edge-on, under either ceiling knee (a soft cap on what it adds,
     its hue kept: test/unit/aurora.mjs) */
  float yl = dot(c, LUMA);
  c *= yl > 1e-6 ? 0.10 * (1.0 - exp(-yl / 0.10)) / yl : 1.0;
  return c * uAur.w * smoothstep(0.5, 2.5, e);
}
#endif
vec3 sd0(float jb, float ib, float n) { float se = (jb + 0.5) * STC, sa = (ib + 0.5) / n * SKYTAU - PI; return vec3(sin(sa) * cos(se), sin(se), cos(sa) * cos(se)); }
float starAt(vec3 rd, float el, float az, float pa, int dj, int di) {
  float jb = floor(el / STC) + float(dj), elc = (jb + 0.5) * STC;
  if (elc <= 0.0 || elc >= 1.5) return 0.0;
  float n = max(1.0, floor(SKYTAU * cos(elc) / STC));
  float ib = floor((az + PI) / SKYTAU * n) + float(di);
  ib = mod(ib, n);
  uint h = ih(ih(uint(int(jb) + 4096) * 0x9e3779b1u) ^ uint(int(ib)) * 0x85ebca6bu);
  float hx = hf(h), hy = hf(ih(h + 1u)), hz = hf(ih(h + 2u)), hw = hf(ih(h + 3u));
  float dens = 1.0 + (uGal.w > 0.0 && uGalC.w > 0.0 ? 1.5 * uGal.w * exp(-pow(dot(sd0(jb, ib, n), uGal.xyz), 2.0) / 0.03) * galEdge(degrees(elc)) : 0.0);   // (the stars crowd in the galaxy's band)
  if (hx > 0.42 * dens) return 0.0;
  float se = (jb + 0.2 + 0.6 * hy) * STC, sa = (ib + 0.2 + 0.6 * hz) / n * SKYTAU - PI;
  vec3 sd = vec3(sin(sa) * cos(se), sin(se), cos(sa) * cos(se));
  float b = pow(fract(hx * 7.31 + hy * 3.17), 6.0) * 0.95 + 0.07;
  b *= 1.0 + 0.15 * uNight.z * sin(uT * (0.6 + 1.2 * hw) + hz * SKYTAU);
  float sg = 0.42 * pa; vec3 dv = rd - sd; float d2 = dot(dv, dv);   // (the chord: acos of a dot near 1 loses a star's footprint in float32)
  return b * exp(-d2 / (2.0 * sg * sg));
}
// (world6 step B fix) the veil the approved sky had: the old high-streak block's cover as the approved stills saw it
// (the first minute of a visit, its noise near the tile's origin: n 0.07-0.22, cover 0.74-1 for these climates; the
// tile's mean, 0.29 at uHi.x 0.2, is the drifted state its judge flagged: fx/py/veilmean.py), taken at n 0.12, as a
// function of the climate's cover alone: no clock
float veilMean(float x) { return smoothstep(0.55 - x, 0.95 - x, 0.692); }
void main() {
  vec2 ndc = gl_FragCoord.xy / uRes * 2.0 - 1.0;
  vec3 rd = normalize(uCamF + uCamR * ndc.x * uProj.x + uCamU * ndc.y * uProj.y);
  vec3 c = rd.y < 0.0 ? fogCol(rd) : skyCol(rd);
  c = mix(c, hazeCol(rd), hazeSky(rd));
  float cs = dot(rd, uSkyS);
  {
    /* (world6) the two kinds of sun, mixed by the light's disc weight (uSunD.w: 0 a low sun, 1 a great flat disc; the
       climate blends the kits' lights, so it is a weight, never a switch) */
    float kd = clamp(uSunD.w, 0.0, 1.0);
    // a great pale disc low in the haze: flat, its limb defined (a pixel or two of softness); a faint ring of halo
    float ang = degrees(acos(clamp(cs, -1.0, 1.0))), R = degrees(acos(uSunD.x)), px = 2.0 * degrees(atan(uProj.y)) / uRes.y;
    float disc = (1.0 - smoothstep(R - px * 1.2, R + px * 1.2, ang)) * uSunVis;
    vec3 dc = uSunC * uSunD.y * (0.94 + 0.06 * smoothstep(R * 0.6, R, ang));
    vec3 cA = mix(c, max(c, dc), disc);
    float zr = (ang - R * 1.55) / (R * 0.22);   // (squared by hand: pow of a negative base is undefined)
    cA += uSunC * uSunD.y * 0.05 * exp(-zr * zr) * (1.0 - disc) * uSunVis;
    // a low sun: its disc, a tight glare about it, a faint ring of halo and a gentle streak along the horizon's line
    float discB = smoothstep(uSunD.x - (1.0 - uSunD.x) * 0.35, uSunD.x + (1.0 - uSunD.x) * 0.2, cs);
    float angB = acos(clamp(cs, -1.0, 1.0)), RB = acos(uSunD.x);
    float z9 = (angB - RB * 9.0) / (RB * 1.4);
    vec3 cB = c + uSunC * discB * uSunD.y * uSunVis;
    cB += uSunC * (0.32 * exp(-angB / (RB * 1.6)) + 0.05 * exp(-z9 * z9)) * uSunVis;
    vec3 dv = rd - uSkyS; float sx = dot(dv, uCamR), sy = dot(dv, uCamU);
    cB += uSunC * 0.1 * exp(-abs(sy) / (RB * 0.35)) * exp(-abs(sx) / (RB * 16.0)) * step(0.0, cs) * uSunVis;
    c = mix(cB, cA, kd);
  }
  if (uHi.x > 0.0 && rd.y > 0.01) {
    /* (world6 step B, the judges' defect 6) high streaks on a deck HI_H m up, anchored to the world: the ray's point on
       the deck (from the camera's own place), so the sky is a function of where the camera is (and its cover, uHi.x,
       the climate's about it); no clock and no camera-relative term (the step's q = rd.xz / rd.y x 0.0012 + uT x 0.003
       was one coarse veil about the camera whose cover drifted with the flight's time). A texel of the noise 2.4 km
       along the streaks and 600 m across (the second octave 1.8x finer), faded out low (where the deck's texels would
       come under a pixel: never a glitter) */
    vec2 P = uCam.xz + rd.xz / rd.y * (3000.0 - uCam.y);
    vec2 qs = P * vec2(1.0 / 153600.0, 1.0 / 38400.0);
    float n = n3v(vec3(qs, 0.37)).a * 0.66 + n3v(vec3(qs * 1.8 + 0.31, 0.71)).a * 0.34 - 0.5;
    float cov = smoothstep(0.55 - uHi.x, 0.95 - uHi.x, n * 1.6 + 0.5) * smoothstep(0.06, 0.25, rd.y);
    vec3 hc = uHiC * (1.0 + 1.5 * pow(max(cs, 0.0), 6.0));
    /* (world6 step B fix, defect 4) the old sky's veil kept: the old block was one coarse cover about the camera whose
       value drifted with the clock; the cover the approved stills show (veilMean) for the climate's cover here (uHi.x,
       the maps' about the camera) is laid under the streaks with the old low fade, so the sky's top keeps the approved
       paleness with no clock; the world-anchored streaks add only their cover beyond it */
    /* (tod fix round, the judges' defect 10) the veil's strength taken to 0 with its cover (vk: 1 from cover 0.05, as
       every kit's is): veilMean(0+) is 0.29, not 0, and a waypoint or the mist takes the cover to exactly 0, so the
       veil (and its streaks) entered or left the whole sky in one frame */
    float vm = veilMean(uHi.x), vk = smoothstep(0.0, 0.05, uHi.x);
    c = mix(c, hc, vm * uHi.y * vk * smoothstep(0.01, 0.12, rd.y));
    c = mix(c, hc, max(cov - vm, 0.0) / max(1.0 - vm, 0.05) * uHi.y * vk);
  }
  if (uSkyN.w > 0.0 && uHi.x > 0.0 && rd.y > 0.01) {   // (fast500 no-fades) the veil in a change between a twilight sky and a night (above, its strength 0): the same, its brightening toward the sun sinking with it and weakening with its depth, the night's coming in at the key
    vec2 P = uCam.xz + rd.xz / rd.y * (3000.0 - uCam.y);
    vec2 qs = P * vec2(1.0 / 153600.0, 1.0 / 38400.0);
    float n = n3v(vec3(qs, 0.37)).a * 0.66 + n3v(vec3(qs * 1.8 + 0.31, 0.71)).a * 0.34 - 0.5;
    float cov = smoothstep(0.55 - uHi.x, 0.95 - uHi.x, n * 1.6 + 0.5) * smoothstep(0.06, 0.25, rd.y);
    vec3 hc = uHiC * (1.0 + 1.5 * (pow(max(cs, 0.0), 6.0) * uSunK.y + pow(max(dot(rd, uSkyN.xyz), 0.0), 6.0) * uSunK.z));
    float vm = veilMean(uHi.x), vk = smoothstep(0.0, 0.05, uHi.x);
    c = mix(c, hc, vm * uSunB.y * vk * smoothstep(0.01, 0.12, rd.y));
    c = mix(c, hc, max(cov - vm, 0.0) / max(1.0 - vm, 0.05) * uSunB.y * vk);
  }
  // (tod) the sky's night: each its amount times its shape, 0 at amount 0
  float eS = degrees(asin(clamp(rd.y, -1.0, 1.0)));
  if (uNight.x > 0.0 && eS > -1.0) {   // the Earth's shadow rising opposite the sky's own light, and the Belt of Venus over it (the live's belt)
    float se = degrees(asin(clamp(uSkyS.y, -1.0, 1.0))), side = pow(clamp(0.5 + 0.5 * dot(normalize(rd.xz + 1e-5), normalize(-uSkyS.xz + 1e-5)), 0.0, 1.0), 2.0) * uNight.x * smoothstep(-1.0, 0.0, eS);
    float hs = 1.0 + max(-se, 0.0) * 1.1;
    float sh = 1.0 - smoothstep(hs - 0.8, hs + 1.2, eS), bl = smoothstep(hs - 0.4, hs + 2.0, eS) * (1.0 - smoothstep(hs + 5.0, hs + 13.0, eS));
    c = mix(c, c * vec3(0.72, 0.78, 0.95), sh * side * 0.55);
    c += vec3(0.95, 0.6, 0.66) * bl * side * dot(c, LUMA) * 0.35;
  }
  if (uNight.y > 0.0 && eS > 0.5 && eS < 18.0) {   // noctilucent wisps, fine and blue, low on the side the sun set (the live's nlc; the noise seamless round the sky)
    float side = pow(clamp(0.5 + 0.5 * dot(normalize(rd.xz + 1e-5), normalize(uSkyS.xz + 1e-5)), 0.0, 1.0), 1.5);
    vec2 q = vec2(atan(rd.x, rd.z) / SKYTAU * 14.0, eS * 0.09);
    float n = textureLod(uN3, vec3(q.x, q.y * 4.0, 0.21) * 0.25, 0.0).a * 0.55 + textureLod(uN3, vec3(q.x * 3.0, q.y * 11.0, 0.53) * 0.25, 0.0).b * 0.45;   // (tod fix3: an explicit level inside a varying branch: a compiler that hoists implicit-derivative reads out of flow control (HLSL) would read these for every sky pixel; the wisps' texels are magnified (14 noise periods round the sky), so level 0 is what texture() picked)
    c += vec3(0.55, 0.8, 1.0) * smoothstep(0.52, 0.78, n) * smoothstep(1.0, 4.0, eS) * (1.0 - smoothstep(9.0, 17.0, eS)) * side * uNight.y * 0.05;
  }
  if (uSkyN.w > 0.0 && uSunB.x > 0.0 && eS > 0.5 && eS < 18.0) {   // (fast500 no-fades) the wisps in such a change (above, their amount 0): the same, dark from below as the Earth's shadow climbs over them (by place, never dimmed where they stand)
    float side = pow(clamp(0.5 + 0.5 * dot(normalize(rd.xz + 1e-5), normalize(uSkyS.xz + 1e-5)), 0.0, 1.0), 1.5);
    vec2 q = vec2(atan(rd.x, rd.z) / SKYTAU * 14.0, eS * 0.09);
    float n = textureLod(uN3, vec3(q.x, q.y * 4.0, 0.21) * 0.25, 0.0).a * 0.55 + textureLod(uN3, vec3(q.x * 3.0, q.y * 11.0, 0.53) * 0.25, 0.0).b * 0.45;
    c += vec3(0.55, 0.8, 1.0) * smoothstep(0.52, 0.78, n) * smoothstep(1.0, 4.0, eS) * (1.0 - smoothstep(9.0, 17.0, eS)) * side * uSunB.x * 0.05 * smoothstep(uSunK.w - 0.8, uSunK.w + 1.2, eS);
  }
#ifdef SKY_PH2
  if (uGal.w > 0.0 && eS > 0.0) c += galaxyAt(rd, eS);   // (phase 2)
  if (uAur.w > 0.0 && eS > 0.5) c += auroraAt(rd, eS);   // (phase 2)
#endif
  if (uMoon.w > 0.0) {   // the moon: a cool silver disc held under the light ceiling, its limb soft, a glare that never lightens the sky past its own colour, the corona's rings
    /* (fast500 no-fades, the sun and moon) drawn whole wherever it stands on its route (it rises and sets by moving: below
       the horizon the sea and the land, drawn before the sky, hide it by place); only its faint broad light on the whole
       sky (the 0.08 tail) follows its depth (uMoon.w, gone 16 deg down); it takes the haze of the sky where it stands */
    vec3 c0 = c;
    float ma = degrees(acos(clamp(dot(rd, uMoon.xyz), -1.0, 1.0))), mr = 1.8, mpx = 2.0 * degrees(atan(uProj.y)) / uRes.y;
    float out1 = max(ma - mr, 0.0);
    /* (tod fix round, the judges' defect 4) a cool silver (the moonlit sky's table: L 0.62, C 0.03, h 250, the ceiling's
       shoulder bringing it to about 0.51 as shown), its limb soft over a fifth of its radius (was a pale khaki 0.52, C 0.02,
       h 95, edged at a pixel: a flat olive coin on the ultramarine) and a wider glare carrying its light */
    c = mix(c, max(c, uMoonG), clamp(exp(-out1 / 2.2) * 0.9 + 0.08 * exp(-ma / 14.0) * uMoon.w, 0.0, 1.0));
    if (ma < 7.0) c += uMoonG * 0.15 * (vec3(0.95, 0.62, 0.42) * exp(-pow((ma - 2.6) / 0.3, 2.0)) * 0.5 + vec3(0.4, 0.75, 1.0) * exp(-pow((ma - 3.4) / 0.35, 2.0)) * 0.3
      + vec3(0.5, 1.0, 0.6) * exp(-pow((ma - 4.1) / 0.4, 2.0)) * 0.2 + vec3(1.0, 0.55, 0.6) * exp(-pow((ma - 4.9) / 0.45, 2.0)) * 0.22);
    c = mix(c, uMoonC, 1.0 - smoothstep(mr - max(mpx * 1.2, 0.3), mr + max(mpx * 1.2, 0.12), ma));
    c = c0 + (c - c0) * (1.0 - hazeSky(rd));
  }
  if (uSunD.z > 0.0 && rd.y > 0.0) {   // the stars, bounded at the source: with the sky's own light under it no star lifts a pixel past the stars' top (Y uNight.w, OKLab L 0.45)
    float el = asin(clamp(rd.y, -1.0, 1.0)), az = atan(rd.x, rd.z), pa = 2.0 * atan(uProj.y) / uRes.y;
    float s = 0.0;   // (fast500 D T1) the five cells in one loop (one copy of starAt for FXC), summed in their old order
    for (int c = 0; c < 5 + uZs; c++) { int dj = c == 3 ? -1 : (c == 4 ? 1 : 0), di = c == 1 ? -1 : (c == 2 ? 1 : 0); s += starAt(rd, el, az, pa, dj, di); }
    s *= uSunD.z * smoothstep(0.0, 0.2, rd.y) * 0.94;
    float head = max(uNight.w - dot(c, LUMA), 0.0);
    c += vec3(0.92, 0.94, 1.0) / 0.94 * head * (1.0 - exp(-s / max(head, 1e-5)));
  }
#ifdef SKY_HOOK
  c = skyHook(rd, c);
#endif
  oC = vec4(c, 1.0);
}