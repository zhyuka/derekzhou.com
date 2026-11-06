#version 300 es
#define HPSPLIT
#define NO_TWILIGHT
#define NO_RAIN
#define NO_WATER
#define NO_PKWX
precision highp float;
precision highp int;
precision highp sampler3D;
precision highp sampler2D;

uniform vec3 uCam; uniform vec3 uCamR, uCamU, uCamF; uniform vec4 uProj; uniform mat4 uVP;
uniform vec2 uRes; uniform float uT; uniform int uDbg;
uniform vec3 uSun; uniform vec3 uSunC;
uniform vec4 uTwM;    // (tod fix3) the twilight's low mist as the light crosses the inks' band: its amount (0: none), its half-height and feather about the horizon (sines of elevation)
uniform vec3 uSkyS;   // (tod) the sky's own light: its glow, its warmth and its disc (the key light's azimuth at the sky's own elevation; the key itself by day)
uniform vec3 uSky[6]; uniform vec4 uSkyE; uniform vec3 uSkyW; uniform vec4 uSkyK;
uniform vec4 uGlow; uniform vec3 uGlowC; uniform vec4 uFog; uniform vec4 uFog2; uniform vec4 uFogB;
uniform vec4 uSkyN;   // (fast500 no-fades, the sun and moon) w 1 only in a change between a twilight sky and a night sky (0 everywhere else: every branch on it skipped), xyz the key (the night's own light)
uniform vec3 uGlowN, uSkyWT, uSkyWN, uHzT, uHzN; uniform vec4 uSkyKT, uSkyKN, uSunK;   // (with it) the night's glow about the key; the twilight's and the night's warm colours and amounts; the haze's warm side at each end (toward the light less away); the sun's depth under the twilight's own (deg), its share (band), the night's (QN), the wisps' shadow line (deg)
uniform vec4 uHaze; uniform vec3 uHazeC, uHazeW;   // the ground haze: density at its base (1/m), scale height (m), its base below the eye (m), -; colour, toward the sun
uniform vec3 uAmbU, uAmbD;
uniform vec3 uClLit, uClShade, uClDeep, uClRim; uniform vec4 uClK, uClK2;
uniform vec4 uP[24];   // the realm's parameters for this visit
uniform uint uSalt;    // the visit's salt for the layout's hashes (cellHash)
uniform sampler3D uN3;
uniform highp sampler2D uGround; uniform vec4 uGC;   // the ground's height cached around the camera: origin x, z; cell (m); texels across
uniform float uSunVis;  // how much of the sun the sky shows (its disc, glare, halo, streak, glint): 0 where there is none (an interior, an overcast)
uniform vec4 uWet;      // water: the rain's rings (0 .. 1), the ripples' strength, the wind's direction (x, z)

const float PI = 3.14159265;
float gLodD = 0.0;   // set by the terrain's vertex stage: how far this point lies from the camera (0 elsewhere: full detail)
/* set for the shade functions (they may read and change them): the surface's own light (emission: added as its colour
   times this, after the shade, before the air), the instance's phase (0 .. 1; 0 for a cell's mesh), and the share of
   the light that water reflects (waterShade sets it; the composite reflects the nearby forms into that share) */
float gEmit = 0.0, gPhase = 0.0, gWater = 0.0;
const vec3 LUMA = vec3(0.2126, 0.7152, 0.0722);
uint ih(uint x) { x ^= x >> 16; x *= 0x7feb352dU; x ^= x >> 15; x *= 0x846ca68bU; x ^= x >> 16; return x; }
uint ih2(ivec2 p) { return ih(uint(p.x) * 0x8da6b343U ^ ih(uint(p.y) + 0x68e31da4U)); }
uint cellHash(ivec2 c) { return ih(ih2(c) ^ uSalt); }   // a world cell's hash for this visit (the same as the JS cellHash)
float hf(uint h) { return float(h >> 8) * (1.0 / 16777216.0); }
float h12(vec2 p) { return hf(ih2(ivec2(floor(p)))); }
vec2 g2(ivec2 p) { uint h = ih2(p); return vec2(float(h & 0xffffU), float(h >> 16)) * (2.0 / 65535.0) - 1.0; }
/* gradient noise, about [-0.7, 0.7], with its derivatives: vec3(n, dn/dx, dn/dy) */
vec3 gnd(vec2 p) {
  vec2 i = floor(p), f = p - i; ivec2 ii = ivec2(i);
  vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0), du = 30.0 * f * f * (f * (f - 2.0) + 1.0);
  vec2 ga = g2(ii), gb = g2(ii + ivec2(1, 0)), gc = g2(ii + ivec2(0, 1)), gd = g2(ii + ivec2(1, 1));
  float va = dot(ga, f), vb = dot(gb, f - vec2(1.0, 0.0)), vc = dot(gc, f - vec2(0.0, 1.0)), vd = dot(gd, f - vec2(1.0, 1.0));
  float k = va - vb - vc + vd;
  return vec3(va + u.x * (vb - va) + u.y * (vc - va) + u.x * u.y * k,
              ga + u.x * (gb - ga) + u.y * (gc - ga) + u.x * u.y * (ga - gb - gc + gd) + du * (u.yx * k + vec2(vb - va, vc - va)));
}
float gn(vec2 p) {
  vec2 i = floor(p), f = p - i; ivec2 ii = ivec2(i);
  vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  float va = dot(g2(ii), f), vb = dot(g2(ii + ivec2(1, 0)), f - vec2(1.0, 0.0)), vc = dot(g2(ii + ivec2(0, 1)), f - vec2(0.0, 1.0)), vd = dot(g2(ii + ivec2(1, 1)), f - vec2(1.0, 1.0));
  return mix(mix(va, vb, u.x), mix(vc, vd, u.x), u.y);
}
float fbm(vec2 p, int o) { float s = 0.0, a = 0.5; for (int i = 0; i < 8; i++) { if (i >= o) break; s += a * gn(p); p = mat2(1.6, 1.2, -1.2, 1.6) * p; a *= 0.5; } return s; }
/* value-and-gradient arithmetic (vec3(v, d/dx, d/dz)) for height functions */
vec3 dN(vec2 p, mat2 M) { vec3 n = gnd(M * p); return vec3(n.x, transpose(M) * n.yz); }
vec3 dAbs(vec3 a, float e) { float s = sqrt(a.x * a.x + e * e); return vec3(s, a.yz * (a.x / s)); }
vec3 dMul(vec3 a, vec3 b) { return vec3(a.x * b.x, a.x * b.yz + b.x * a.yz); }
vec3 dSmax(vec3 a, vec3 b, float k) { float h = clamp(0.5 + 0.5 * (a.x - b.x) / k, 0.0, 1.0); return vec3(mix(b.x, a.x, h) + k * h * (1.0 - h), mix(b.yz, a.yz, h)); }
vec3 dSmin(vec3 a, vec3 b, float k) { float h = clamp(0.5 + 0.5 * (b.x - a.x) / k, 0.0, 1.0); return vec3(mix(b.x, a.x, h) - k * h * (1.0 - h), mix(b.yz, a.yz, h)); }
/* a smooth step of a value with its gradient; e0 may be above e1 (a descending step: computed as such, never
   handed to the built-in smoothstep, whose edges must ascend) */
vec3 dSstep(float e0, float e1, vec3 a) { float x = clamp((a.x - e0) / (e1 - e0), 0.0, 1.0); return vec3(x * x * (3.0 - 2.0 * x), a.yz * (6.0 * x * (1.0 - x) / (e1 - e0))); }
vec3 dPow2(vec3 a) { return vec3(a.x * a.x, 2.0 * a.x * a.yz); }
float sstepDown(float e0, float e1, float x) { return 1.0 - smoothstep(e1, e0, x); }   // 1 below e1 .. 0 above e0 (e1 < e0)
float n3(vec3 p) { return texture(uN3, p).r; }
vec4 n3v(vec3 p) { return texture(uN3, p); }

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
/* water: ripples running with the wind, rings where the rain falls (uWet.x), the sky and the sun's glint reflected by
   Fresnel over the water's own body; it sets gWater (the share reflected), and the composite puts the nearby forms
   seen in that reflection over the sky's (screen-space, cheap). Any shade function may call it: a surface of still
   water (a pool's level), a mesh's water (a moat), a puddle in the land's own shade. */
vec2 rainRings(vec2 p, float t) {
  vec2 g = vec2(0.0);
  for (int k = 0; k < 2; k++) {
    vec2 q = p / 0.7 + float(k) * vec2(0.37, 0.61), c = floor(q), f = q - c;
    uint h = ih2(ivec2(c) + ivec2(k * 101, k * 37));
    vec2 d = f - (vec2(hf(h), hf(ih(h + 1u))) * 0.6 + 0.2);
    float ph = fract(t * (0.9 + 0.3 * hf(ih(h + 2u))) + hf(ih(h + 3u))), r = length(d), x = (r - ph * 0.45) * 28.0;
    g += (r > 1e-4 ? d / r : vec2(0.0)) * x * exp(-x * x) * (1.0 - ph) * (1.0 - ph);
  }
  return g;
}
vec3 waterNormal(vec3 p, float fp) {
  vec2 w = uWet.zw; float t = uT;
  vec3 a = gnd(p.xz * 0.35 + w * t * 0.35), b = gnd(mat2(0.8, 0.6, -0.6, 0.8) * p.xz * 0.9 - w * t * 0.5);
  vec2 g = (a.yz * 0.21 + b.yz * 0.27) * uWet.y * (1.0 - smoothstep(0.05, 0.6, fp));
#ifndef NO_RAIN
  if (uWet.x > 0.0) g += rainRings(p.xz, t) * 0.25 * uWet.x * (1.0 - smoothstep(0.02, 0.12, fp));
#endif
  return normalize(vec3(-g.x, 1.0, -g.y));
}
vec3 waterRefl(vec3 rd, vec3 n) {   // what the water reflects of the sky (the composite subtracts it where a form stands in the reflection)
  vec3 r = reflect(rd, n); r.y = abs(r.y) + 1e-3;
  return skyCol(r) + uSunC * uSunVis * 6.0 * pow(max(dot(r, uSun), 0.0), 300.0);
}
vec3 waterShade(vec3 p, vec3 rd, float t, float fp, vec3 body) {
  vec3 n = waterNormal(p, fp);
  float cv = clamp(dot(n, -rd), 0.0, 1.0), F = 0.02 + 0.98 * pow(1.0 - cv, 5.0);
  gWater = F;
  return mix(body, waterRefl(rd, n), F);
}
float hgN(float c, float g) { float g2 = g * g; return (1.0 - g2) / pow(max(1.0 + g2 - 2.0 * g * c, 1e-4), 1.5); }
/* cloud lit as cloud: light carried on through it (octaves of scattering, each dimmer, deeper, less forward), its
   colour the light's where thin and the sky's saturated colour where deep, the edge toward the sun silvered */
vec3 cloudLight2(vec3 n, vec3 na, vec3 rd, float tauL, float ao, float hgt, float thin) {
  // n: the form the sun lights; na: the form the sky lights (a lobe's own top catches the sky)
  float ndl = dot(n, uSun), cs = dot(rd, uSun);
  float ms = 0.0, aw = 1.0, bw = 1.0, gw = uClK.z;
  for (int o = 0; o < 3; o++) { ms += aw * exp(-tauL * bw) * mix(hgN(cs, gw), hgN(cs, -0.25 * gw), 0.3); aw *= 0.5; bw *= 0.5; gw *= 0.6; }
  float wrap = clamp((ndl + uClK2.w) / (1.0 + uClK2.w), 0.0, 1.0);
  float lit = wrap * (0.55 + 0.45 * min(ms, 2.4)) * exp(-tauL * uClK.y);
  float sky = clamp(ao * (0.45 + 0.55 * (0.5 + 0.5 * na.y)) * mix(uClK2.z, 1.0, hgt), 0.0, 1.0);
  vec3 sh = mix(uClDeep, uClShade, sky);
  vec3 c = mix(sh, uClLit, clamp(lit, 0.0, 1.0)) * mix(1.0, ao, uClK2.x);
  c += uClRim * hgN(cs, 0.86) * thin * exp(-tauL * 0.6) * uClK.w;
  return c;
}
vec3 cloudLight(vec3 n, vec3 rd, float tauL, float ao, float hgt, float thin) { return cloudLight2(n, n, rd, tauL, ao, hgt, thin); }

float linFetch(sampler2D s, ivec2 q) {
#ifdef LIND_PACKED
  return dot(texelFetch(s, q, 0), vec4(1.0, 1.0 / 255.0, 1.0 / 65025.0, 1.0 / 16581375.0)) * 65536.0;
#else
  return texelFetch(s, q, 0).r;
#endif
}

uniform sampler3D uVol; uniform sampler2D uLinD; uniform vec3 uVC, uVH; uniform vec2 uVY;   // centre, half size, yaw (cos, sin)
uniform vec4 uVR;   // extinction (1/m), most steps, the fine billows' scale (m), their depth (m)
uniform vec4 uVS;   // the stored distance's range (m), the soft band (m), the ceiling a forming cloud rises under (world y), a passage cloud's near reach (m)
uniform vec4 uVR2;  // how far the billows reach out of the smooth form (m), its fade (0 .. 1), the camera inside it (1), (fix) its flat base (world y; -1e5 none)
in vec3 vW; out vec4 oC;
void main() {
  vec3 rd = normalize(vW - uCam), d0 = uCam - uVC;
  vec3 ro = vec3(uVY.x * d0.x - uVY.y * d0.z, d0.y, uVY.y * d0.x + uVY.x * d0.z), rl = vec3(uVY.x * rd.x - uVY.y * rd.z, rd.y, uVY.y * rd.x + uVY.x * rd.z);
  vec3 inv = 1.0 / rl, ta = (-uVH - ro) * inv, tb = (uVH - ro) * inv, t0 = min(ta, tb), t1 = max(ta, tb);
  float tn = max(max(max(t0.x, t0.y), t0.z), 0.0), tf = min(min(t1.x, t1.y), t1.z);
  float zs = linFetch(uLinD, ivec2(gl_FragCoord.xy)) / max(dot(rd, uCamF), 1e-3);
  tf = min(tf, zs);
  if (tf <= tn) discard;
  float cs = dot(rd, uSun), g = uClK.z;
  float P0 = mix(hgN(cs, g), hgN(cs, -0.25), 0.22), P1 = hgN(cs, g * 0.6), P2 = hgN(cs, g * 0.36);
  float vox = max(uVH.x, max(uVH.y, uVH.z)) / 26.0, band = uVS.y, amp = uVR.w;
  float dIn = max(vox * 0.75, band * 1.2), dEdge = max(band * 0.6, 1.0);
  // (hotfix G0, design-v5 Revision 3: no glitter) the march, stable from one frame to the next:
  // - no start offset: round 3b began each ray at a fixed per-pixel offset (an R2 pattern on the window, up to one
  //   edge step), a pattern the moving cloud crawled through. The march begins where the ray enters the body's box (a
  //   place fixed on the cloud: moving along the ray, the camera meets the same samples), or at the eye;
  // - the density integrated over each segment between two samples (the distance taken as linear between them, the
  //   soft band's ramp integrated exactly), lit at the segment's front as round 3b lit each step at its start: where a
  //   sample falls then moves the answer only a little (round 3b's point samples, a step or more apart across a band
  //   about a step wide, turned each small move of the view into a jump of the cloud's edge, pixel by pixel). A leap's
  //   start is a segment's front too (its distance without the billows: their mean), so a leap that ends past the
  //   cloud's face still counts the face (a leap is at least a band step long, and where it landed beyond the face the
  //   face was skipped or not as the samples moved: the far towers' speckle);
  // - no step inside the cloud shorter than the rest of the ray over the steps left, so every ray reaches its end (the
  //   land, or the box's far side) within its budget (24-48 steps; 40% of that in a passage): round 3b cut a ray where
  //   its budget ran out and left the rest clear, and in a cloud's wispy flank the sea showed through, in holes that
  //   opened and shut as the samples moved (leaps are never stretched: a leap is bounded by the distance to the cloud);
  // - the fine billows' noise at an explicit LOD: its texel (32 to a tile) no finer than two of the half-resolution
  //   pixel's footprints at the sample, nor than half the band's step there (inside this loop the implicit LOD's
  //   derivatives are undefined, and each GPU picks its own mip pixel by pixel; billows finer than the march's own
  //   pixel or step are sampled as aliases that crawl and blink at the cloud's edges);
  // - the band at least 2 half-resolution pixels soft at the sample (an edge sharper than its pixel crawled on the
  //   half-resolution grid).
  // The same samples and the same texture reads as before; a few more instructions a step.
  float t = tn, pxA = 2.0 * uProj.y / uRes.y;   // (pxA: a half-resolution pixel's angle; its footprint is t x pxA)
  vec3 acc = vec3(0.0); float T = 1.0, taken = 0.0;
  vec3 sunL = vec3(uVY.x * uSun.x - uVY.y * uSun.z, uSun.y, uVY.y * uSun.x + uVY.x * uSun.z), nrm = vec3(0.0, 1.0, 0.0);
  float wrapL = 1.0, facing = 1.0; bool hit = false;
  // the last sample (a band sample or a leap's start): its distance to the cloud, place, light depths, own density and fade (tP < 0: none yet)
  float sP = 0.0, tP = -1.0, gP = 0.0, bP = 0.0, dP = 0.0, fP = 1.0; bool last = false;
  for (int i = 0; i < 64; i++) {
    if (t > tf || last || float(i) >= uVR.y) break;
    if (t >= tf) { t = tf; last = true; }   // (the ray's end is a sample, so its last segment is counted)
    taken += 1.0;
    float mS = (tf - t) / max(uVR.y - taken + 1.0, 1.0);   // (the shortest step that still reaches the ray's end)
    vec3 p = ro + rl * t;
    vec4 v = texture(uVol, p / (2.0 * uVH) + 0.5);
    float dE = max(dEdge, t * 0.012);
    float yb = uVR2.w - p.y - uVC.y;   // (world6 step B fix) under the body's flat base: outside it
    float s = max(max((0.5 - v.r) * uVS.x, p.y + uVC.y - uVS.z), yb);
    float sl = max(max((0.5 - v.a) * uVS.x * 2.0 - uVR2.x, p.y + uVC.y - uVS.z), yb) - amp;
    if (sl > band || s > band + amp) {   // a leap: its start kept as the next segment's front (above)
      vec3 fqL = (uVH - abs(p)) / uVH; float fzL = smoothstep(0.0, 0.07, min(min(fqL.x, fqL.y), fqL.z));
      if (uVS.w > 0.0) fzL *= smoothstep(uVS.w * 0.2, uVS.w, t);
      sP = s; tP = t; gP = v.g; bP = v.b; dP = 0.0; fP = fzL;
      t += sl > band ? max(sl * 0.9, dE) : max((s - amp) * 0.6, dE); continue;
    }
    if (!hit) {
      hit = true;
      vec3 uv0 = p / (2.0 * uVH) + 0.5, e = 1.2 / vec3(textureSize(uVol, 0)); vec2 kk = vec2(1.0, -1.0);
      vec3 gg = kk.xyy * texture(uVol, uv0 + kk.xyy * e).r + kk.yyx * texture(uVol, uv0 + kk.yyx * e).r + kk.yxy * texture(uVol, uv0 + kk.yxy * e).r + kk.xxx * texture(uVol, uv0 + kk.xxx * e).r;
      nrm = normalize(-gg / (2.0 * uVH) + vec3(0.0, 1e-6, 0.0));
      wrapL = clamp((dot(nrm, sunL) + 0.35) / 1.35, 0.0, 1.0); facing = 0.5 + 0.5 * nrm.y;
    }
    float dn = textureLod(uN3, (p + uVC) / uVR.z + vec3(uT * 0.004, 0.0, uT * 0.003), clamp(log2(max(max(2.0 * t * pxA, 0.5 * dE) * 32.0 / uVR.z, 1e-4)), 0.0, 5.0)).g;
    s -= (dn - 0.5) * amp * 2.0;
    float dt = max(s > 0.0 ? max(dE, s * 0.5) : (s > -band ? dE : max(dIn, dE)), mS);
    // (no face of the box can draw an edge: the density thins over its outer few per cent)
    vec3 fq = (uVH - abs(p)) / uVH; float fz = smoothstep(0.0, 0.07, min(min(fq.x, fq.y), fq.z));
    if (uVS.w > 0.0) fz *= smoothstep(uVS.w * 0.2, uVS.w, t);
    float bE = max(band, 2.0 * t * pxA);
    if (tP >= 0.0) {
      // the segment from the last band sample to this one: the band's ramp clamp(-s / bE, 0, 1) integrated with s linear
      float ds = s - sP, G0 = sP >= 0.0 ? 0.0 : (sP > -bE ? sP * sP / (2.0 * bE) : -sP - 0.5 * bE), G1 = s >= 0.0 ? 0.0 : (s > -bE ? s * s / (2.0 * bE) : -s - 0.5 * bE);
      float d = (abs(ds) < 1e-3 * bE ? clamp(-0.5 * (sP + s) / bE, 0.0, 1.0) : (G0 - G1) / ds) * 0.5 * (fP + fz);
      float a = 1.0 - exp(-d * uVR.x * (t - tP));
      if (a > 0.0005) {   // (lit at the segment's front, the last sample)
        float tl = gP * 24.0, sky = exp(-bP * 12.0 * 0.85);
        float ms = exp(-tl) * P0 + 0.5 * exp(-tl * 0.45) * P1 + 0.25 * exp(-tl * 0.2) * P2;
        vec3 amb = mix(uClDeep, uClShade, sky * (0.7 + 0.3 * facing));
        amb = mix(amb, uClLit * 0.9, 0.38 * facing * facing * sky);
        float fk = 0.7 * (1.0 - smoothstep(0.35, 0.92, cs) * exp(-tl * 0.5));
        vec3 c = mix(amb, uClLit, (1.0 - exp(-ms * uClK2.y)) * (0.5 + 0.5 * sky) * mix(1.0, wrapL, fk)) + uClRim * exp(-tl * 1.5) * max(P0 - 1.2, 0.0) * 0.045 * uClK.w * (1.0 - dP);
        // near the eye, a cloud the camera is in (or a passage's) is its own lit mist: never a dark wall
        float nearK = max(uVS.w > 0.0 ? 0.55 * (1.0 - smoothstep(uVS.w * 0.3, uVS.w * 1.8, tP)) : 0.0, uVR2.z * 0.6 * (1.0 - smoothstep(30.0, 260.0, tP)));
        c = mix(c, uClLit, nearK);
        acc += T * a * c; T *= 1.0 - a;
        if (T < 0.015) { T = 0.0; break; }   // (opaque: nothing behind it prints through)
      }
    }
    sP = s; tP = t; gP = v.g; bP = v.b; dP = clamp(-s / bE, 0.0, 1.0) * fz; fP = fz;
    t = min(t + dt, tf);   // (a step past the ray's end stops at it, so the last segment is never dropped)
  }
  if (T > 0.996) discard;
  float al = 1.0 - T;
  vec3 col = atmos(acc / al, rd, tn + (tf - tn) * 0.25);
  // (world6 fix) a body coming in out of the haze fades by its opacity (uVR2.y, 0 .. 1 over 2.5 s from its bake): the
  // step scaled its extinction, so a thick tower was a third opaque at 2% of its fade (the film's one pop-in)
  oC = vec4(col * al, al) * uVR2.y;
  if (oC.a < 0.0005) discard;
}