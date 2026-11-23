
uniform vec4 uSunD;   // disc: cos of radius, intensity, star amount, disc kind (1: a great flat disc)
uniform int uZs;   // (fast500 D T1) never set: 0 at link; the star loop's bound FXC cannot fold
uniform vec4 uHi;     // high cloud: cover, brightness, scale, drift
uniform vec3 uHiC;
uniform vec4 uMoon;   // (tod) the moon: its direction, its amount (0: none)
uniform vec4 uAnvF;   // (physics: weather/far-anvil, the owner's "Soft distant flicker") lightning inside the far storm: its envelope now (0-1), its place in the storm (x, z km) and its reach (km)
uniform vec4 uAnv;    // (physics: weather/far-anvil) the far storm: its azimuth (rad), its distance (km, 0: none), the sun's height (deg), the sun's azimuth (rad)
uniform vec4 uHalo;   // (physics: weather/moon-halo) the ice veil over the moonlit sky: 1 on (about one moonlit stay in three), 0 none; its strength
uniform vec3 uMoonC, uMoonG;   // (tod) its disc's colour (a pale flat disc, held under the light ceiling) and its glare's
uniform vec4 uNight;  // (tod) the belt (the Earth's shadow and the Belt of Venus), the noctilucent wisps, the stars' twinkle (1) or held (0), the stars' top (Y)
uniform vec4 uSunB;   // (fast500 no-fades) in a change between a twilight sky and a night: the wisps' amount and the veil's strength (both 0 in uNight and uHi there, so F0's blocks draw nothing and these below draw them), -, -
uniform vec4 uGal, uGalC;   // (tod, phase 2) the galaxy: its pole and amount (0 or 1), its core's direction, in the sky's frame
uniform mat3 uSkyF;   // (physics: night/sky-turn) world to the sky's frame (215's skyFrame, transposed): the stars and the galaxy turn together, at SKY_RATE
uniform vec4 uAur;    // (tod, phase 2) the aurora: how far it has come in (1 whole), its centre's azimuth, its folds' phase, its amount (0 or 1)
uniform vec4 uAurB;   // (physics: aurora/phases) how far through its hold, the breakup's front (km along the sheet, east +), the second arc's km farther (0 none), a breakup (0 or 1)
out vec4 oC;
const float SKYTAU = 6.2831853;
/* (tod) the stars: world-anchored (a cell of the sphere by the direction: elevation bands STC rad deep, each cut into
   cells about STC rad wide), a star in a share of the cells at a hashed place well inside its own, a bell at least
   FWHM 1 px by the pixel's own angle with its energy held (its peak the same at any resolution: a turn slides it and
   never blinks it), twinkling slowly (+-15% at 0.6-1.8 rad/s); the cell and its four neighbours read */
const float STC = 0.04;
const float ANV_FK = 0.02 / 0.8966;   // (the flicker's peak: Y +0.02 at most before the cap, its colour's luminance 0.8966: far under a flash's 10%)
const float ANV_K = 0.05;   // (physics: weather/far-anvil) its lit top's strength (composited at most L 0.50: test/unit/sky.mjs)
/* (physics: weather/far-anvil) a far storm, uAnv.y km away (100-150) at uAnv.x, 80-110 deg off the sun's bearing (lit
   from the side, against the darker sky away from the sun), drawn by direction (no parallax at that distance): its
   tower and its anvil in km across (x) and up (z, the Earth's curve added), its edges lumped by the noise at 2-4 km and
   faded over 1.2 km (5 px or more: softer than the far land's). It returns (its cover, its lit part): its body is a
   cloud, so it hides the sky behind it as the mesas and the floating islands do, in the air's own colour at its range
   (the far land's distance haze, atmos; under the Earth's shadow up to ~3% Y darker, a natural shadow); the low sun lights it wherever it still
   reaches the cloud above the Earth's shadow at the storm's place, R (1 / cos d - 1) with d the sun's depression there.
   With the sun 3 deg down only the anvil's top is lit; as the sun sinks the shadow climbs it and the light goes up and
   off its top (a boundary moving with the sun, never a fade). No rays. Its third part is the flicker's: lightning lighting
   the cloud from inside, a soft blob of it (uAnvF's place and reach) on the cover only (the owner's narrow exception, 2026-11-15) */
vec3 anvilAt(vec3 rd) {
  float D = uAnv.y, phi = atan(rd.x, rd.z) - uAnv.x;
  phi = atan(sin(phi), cos(phi));
  if (abs(phi) > 0.7 || rd.y < -0.01) return vec3(0.0);
  float x = D * tan(phi), z = D * rd.y / max(sqrt(1.0 - rd.y * rd.y), 1e-3) + D * D / 14866.0;   // (the Earth's curve with standard refraction: R 7/6 x 6371 km: at 150 km its foot sinks 0.578 deg, not 0.674)
  float lump = (textureLod(uN3, vec3(z / 36.0, x / 68.0, 0.43), 0.0).a - 0.5) * 2.4;
  float wc = 3.2 + 0.18 * z + lump, col = (1.0 - smoothstep(wc - 0.7, wc + 0.7, abs(x - 0.35 * z))) * smoothstep(0.5, 1.5, z) * (1.0 - smoothstep(10.2, 11.2, z));
  /* the anvil's underside flares fast (its half-width grows up to 26 km a km): its edge faded over 1.2 km measured
     across the edge itself (the distance outside it over sqrt(1 + slope^2)), so however flat the edge lies it stays
     5 px or more thick */
  float ta = clamp((z - 9.4) / 2.6, 0.0, 1.0), sa = ta * ta * (3.0 - 2.0 * ta), sl = 26.0 * 6.0 * ta * (1.0 - ta) / 2.6;
  float wa = 5.0 + 19.0 * sa + lump, anv = (1.0 - smoothstep(-0.6, 0.6, (abs(x - 4.0 - 7.0 * sa) - wa) / sqrt(1.0 + sl * sl))) * smoothstep(9.2, 10.2, z) * (1.0 - smoothstep(12.0, 12.7, z - 0.9 * exp(-pow((x - 3.5) / 4.0, 2.0))));
  float m = max(col, anv);
  float ps = uAnv.x - uAnv.w, dc = radians(-uAnv.z) - D / 6371.0 * cos(ps), hs = dc > 0.0 ? 6371.0 * (1.0 / cos(dc) - 1.0) : 0.0;
  float lit = smoothstep(hs - 0.5, hs + 0.5, z);
  float fl = uAnvF.x > 0.0 ? exp(-((x - uAnvF.y) * (x - uAnvF.y) + (z - uAnvF.z) * (z - uAnvF.z)) / (uAnvF.w * uAnvF.w)) * uAnvF.x : 0.0;
  return vec3(m, m * lit, m * fl);
}
/* (physics: weather/moon-halo) the 22 deg halo and the moon dogs, under an ice veil: light refracted through ice crystals'
   60 deg prisms (n 1.31) at their minimum deviation, 21.84 deg; the ring's inner edge sharp and faintly warm (red is
   bent least), its light falling away outward; nothing inside it brightened. The dogs: plates lying flat, at the moon's
   own height, their offset in azimuth the same minimum deviation through the plate's index for a slanted ray,
   n' = sqrt(n^2 - sin^2 e) / cos e (so they stand farther out as the moon climbs). Only adds light; held under the
   ceiling by its small strength (uHalo.y) and the moon's depth (uMoon.w) */
const float HALO_N = 1.31;
float haloDev(float n) { return degrees(2.0 * asin(clamp(n * 0.5, -1.0, 1.0))) - 60.0; }
vec3 haloAt(vec3 rd) {
  float th = degrees(acos(clamp(dot(rd, uMoon.xyz), -1.0, 1.0))), r0 = haloDev(HALO_N);
  if (th > 40.0) return vec3(0.0);   // (past the farthest dog's tail: the dog at most 29.7 deg out at a 45 deg moon, its light 1e-5 by 40)
  float ring = smoothstep(r0 - 0.35, r0 + 0.25, th) * exp(-max(th - r0 - 0.25, 0.0) / 2.6);
  float me = asin(clamp(uMoon.y, -1.0, 1.0)), se = sin(me), np = sqrt(HALO_N * HALO_N - se * se) / max(cos(me), 0.2), dp = radians(haloDev(np));
  float ea = asin(clamp(rd.y, -1.0, 1.0)), da = atan(rd.x, rd.z) - atan(uMoon.x, uMoon.z);
  da = atan(sin(da), cos(da));
  float off = abs(da) - dp, dog = smoothstep(-radians(0.5), radians(0.15), off) * exp(-max(off, 0.0) / radians(1.6)) * exp(-pow((ea - me) / radians(0.9), 2.0));
  vec3 warm = mix(vec3(1.0, 0.8, 0.66), vec3(1.0), smoothstep(r0, r0 + 1.4, th));
  vec3 warmD = mix(vec3(1.0, 0.8, 0.66), vec3(1.0), smoothstep(-radians(0.2), radians(1.2), off));   // (as colourless as the ring: by moonlight the eye sees both near white)
  return (warm * ring + warmD * dog * 1.6) * uHalo.y;
}
/* (aurora-enter-by-place, no fades) the galaxy comes and goes by place: an edge (as the Earth's shadow over the wisps)
   climbs from under the horizon over it as it goes and sinks off it as it comes; under the edge it is not drawn */
/* (tod, phase 2) the Milky Way (the live's band, bright core and dark lanes; its noise from uN3, a whole number of its
   period round the band so a turn never meets a seam) and the aurora (one sheet low over the key's horizon, its colour by altitude: physics: aurora) */
#ifdef SKY_PH2
vec3 galaxyAt(vec3 rd, float e) {
  vec3 P = uGal.xyz, C = uGalC.xyz;
  float b = dot(rd, P), l = atan(dot(rd, cross(P, C)), dot(rd, C)), u = l / SKYTAU;
  float band = exp(-b * b / 0.0225), core = exp(-l * l / 0.36) * exp(-b * b / 0.05);
  float n = n3v(vec3(u * 7.0, b * 3.15, 0.13)).b * 0.45 + n3v(vec3(u * 21.0, b * 9.9, 0.71)).a * 0.35 + n3v(vec3(u * 62.0, b * 29.7, 0.29)).a * 0.2;
  float lanes = smoothstep(0.4, 0.64, n3v(vec3(u * 4.0, b * 5.6 * 0.33 + 0.1 * n3v(vec3(u * 13.0, 0.4, 0.61)).b, 0.37)).b) * exp(-pow(b - 0.02 * sin(l * 5.0), 2.0) / 0.003);
  return (vec3(0.9, 0.86, 0.8) * band * (0.25 + 1.1 * n * n) + vec3(1.0, 0.85, 0.65) * core * 1.3) * (1.0 - 0.8 * lanes) * uGal.w * 0.04 * smoothstep(1.0, 12.0, e);
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
/* (stars-flux, no glitter) a star's light integrated over the pixel's footprint (a box of the bell, by erf, each axis
   alone): what falls in the pixels about it sums to its flux wherever it stands between their centres, so a turn that
   slides it across them never makes it pulse (a bell sampled at the pixel's centre, 0.42 px wide, did, and the pixel's
   own saturating cap made it worse); erf: a closed-form approximation, 1 - exp(-x^2 (4/pi + a x^2) / (1 + a x^2)) under the root (a 0.147), |err| < 2e-3, and the sums telescope whatever its error */
const float STF = 1.1083;   // (the star's flux in pixels at b 1: the old bell's, 2 pi 0.42^2)
float starErf(float x) { float x2 = x * x; return sign(x) * sqrt(1.0 - exp(-x2 * (1.2732395 + 0.147 * x2) / (1.0 + 0.147 * x2))); }
float starBox(float d, float sg) { float k = 0.70710678 / sg; return 0.5 * (starErf((d + 0.5) * k) - starErf((d - 0.5) * k)); }
vec3 sd0(float jb, float ib, float n) { float se = (jb + 0.5) * STC, sa = (ib + 0.5) / n * SKYTAU - PI; return vec3(sin(sa) * cos(se), sin(se), cos(sa) * cos(se)); }
float starAt(vec3 rd, float el, float az, float pa, float cap, int dj, int di) {
  float jb = floor(el / STC) + float(dj), elc = (jb + 0.5) * STC;
  if (abs(elc) > 1.56) return 0.0;   // (both of the frame's hemispheres: the sky turns, its south rises)
  float n = max(1.0, floor(SKYTAU * cos(elc) / STC));
  float ib = floor((az + PI) / SKYTAU * n) + float(di);
  ib = mod(ib, n);
  uint h = ih(ih(uint(int(jb) + 4096) * 0x9e3779b1u) ^ uint(int(ib)) * 0x85ebca6bu);
  float hx = hf(h), hy = hf(ih(h + 1u)), hz = hf(ih(h + 2u)), hw = hf(ih(h + 3u));
  float dens = 1.0 + (uGal.w > 0.0 ? 1.5 * uGal.w * exp(-pow(dot(sd0(jb, ib, n), uGal.xyz), 2.0) / 0.03) : 0.0);   // (the stars crowd in the galaxy's band)
  if (hx > 0.42 * dens) return 0.0;
  float se = (jb + 0.2 + 0.6 * hy) * STC, sa = (ib + 0.2 + 0.6 * hz) / n * SKYTAU - PI;
  vec3 sd = vec3(sin(sa) * cos(se), sin(se), cos(sa) * cos(se));
  float b = pow(fract(hx * 7.31 + hy * 3.17), 6.0) * 0.95 + 0.07;
  b *= 1.0 + 0.15 * uNight.z * sin(uT * (0.6 + 1.2 * hw) + hz * SKYTAU);
  /* the cap is the star's, never the pixel's: a star whose peak would pass it is drawn a little wider (sigma by sqrt of
     its flux over the cap, a pixel's share of a bell being at most its peak density F / (2 pi sigma^2)), but never past
     0.7 px, so a star stays a point (the review: unbounded, the brightest became soft discs of 4-6x main's light); what
     still passes is cut from the star's flux, never from its pixels, so its light stays whatever its place */
  float F = b * STF, cp = SKYTAU * max(cap, 1e-5), sg = clamp(sqrt(F / cp), 0.5, 0.7);
  F = min(F, cp * sg * sg);
  /* the star's place on the screen in pixels (the inverse of main's rd: ndc = (r, u) / (f x uProj)), so the box is the
     pixel's own footprint at any place in any window (the review: the chord over the centre's angle was 1.2 pixels a
     step at the centre of a tall window and 0.7 px became 1.1-1.4 at its sides) */
  float zf = max(dot(sd, uCamF), 1e-4);
  vec2 d = gl_FragCoord.xy - (vec2(dot(sd, uCamR) / (zf * uProj.x), dot(sd, uCamU) / (zf * uProj.y)) * 0.5 + 0.5) * uRes;
  return F * starBox(d.x, sg) * starBox(d.y, sg);
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
  /* (physics: weather/far-anvil) the far storm, drawn before everything nearer than it (the 3 km veil and its streaks,
     the Earth's shadow and the Belt: laid over it), and hiding everything farther (the wisps 83 km up, 500-700 km away
     on its rays; the galaxy, the aurora, the moon, the stars: what they add is taken back over its cover, anvCov, after
     the stars) */
  float anvCov = 0.0;
  if (uAnv.y > 0.0) {   // its body in the air's colour at its range, its lit top, its flicker
    vec3 aM = anvilAt(rd);
    anvCov = aM.x;
    if (aM.x > 0.0) {
      c = mix(c, atmos(uClShade, rd, 1000.0 * uAnv.y / max(length(rd.xz), 1e-3)), aM.x);
      /* its lit top and its flicker through the haze, held under L 0.50 over whatever stands behind it (a soft cap on what it adds, by
         the room left under Y 0.118; where that stands at 0.50 it gives way) */
      vec3 aA = (vec3(1.0, 0.6, 0.46) * aM.y * ANV_K + vec3(0.85, 0.9, 1.0) * aM.z * ANV_FK) * (1.0 - hazeSky(rd));
      float yA = dot(aA, LUMA), room = max(0.118 - dot(c, LUMA), 0.0);
      c += aA * (yA > 1e-6 ? room * (1.0 - exp(-yA / max(room, 1e-6))) / yA : 1.0);
    }
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
  vec3 cBA = c;   // (physics: weather/far-anvil) the sky as it stands before what lies beyond the far storm (the wisps, 83 km up: 500-700 km away on its rays)
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
  /* (aurora-haze) both behind the haze, as the moon is: what the haze over them lets through (1 - hazeSky), a little
     redder where it is thick (low), never added over it at full strength */
  float hzS = 1.0 - hazeSky(rd); vec3 hzT = hzS * mix(vec3(1.0, 0.84, 0.68), vec3(1.0), hzS);
  if (uGal.w > 0.0 && eS > 0.0) c += galaxyAt(uSkyF * rd, eS) * hzT;   // (by the sky's turn: physics: night/sky-turn)   // (phase 2)
  if (uAur.w > 0.0 && eS > 0.5) c += auroraAt(rd, eS) * hzT;   // (phase 2)
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
    if (uHalo.x > 0.0) c += haloAt(rd) * uMoon.w;   // (physics: weather/moon-halo: by the stay's veil, with the moon's depth)
    c = c0 + (c - c0) * (1.0 - hazeSky(rd));
  }
  if (uSunD.z > 0.0 && rd.y > 0.0) {   // the stars, bounded at the source: with the sky's own light under it no star lifts a pixel past the stars' top (Y uNight.w, OKLab L 0.45)
    vec3 rs = uSkyF * rd;   // (the sky's frame: the stars turn with it, at SKY_RATE)
    float el = asin(clamp(rs.y, -1.0, 1.0)), az = atan(rs.x, rs.z), pa = 2.0 * atan(uProj.y) / uRes.y;
    float head = max(uNight.w - dot(c, LUMA), 0.0), sk = uSunD.z * smoothstep(0.0, 0.2, rd.y) * 0.94;
    float s = 0.0;   // (fast500 D T1) the five cells in one loop (one copy of starAt for FXC), summed in their old order
    for (int c = 0; c < 5 + uZs; c++) { int dj = c == 3 ? -1 : (c == 4 ? 1 : 0), di = c == 1 ? -1 : (c == 2 ? 1 : 0); s += starAt(rs, el, az, pa, head / max(sk, 1e-5), dj, di); }
    c += vec3(0.92, 0.94, 1.0) / 0.94 * min(s * sk, head);   // (stars-flux) added as they are; the min binds only where two stars overlap
  }
  if (anvCov > 0.0) c = mix(c, cBA, anvCov);   // (physics: weather/far-anvil) the galaxy, the aurora, the moon and the stars behind the storm's body
#ifdef SKY_HOOK
  c = skyHook(rd, c);
#endif
  oC = vec4(c, 1.0);
}