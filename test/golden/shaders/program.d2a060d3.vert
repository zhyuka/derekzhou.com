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

#define GROUND_CACHE
float gcTex(ivec2 q) {
#ifdef GC_PACKED
  vec4 e = texelFetch(uGround, q, 0); return (dot(e, vec4(1.0, 1.0 / 255.0, 1.0 / 65025.0, 1.0 / 16581375.0)) * 8192.0) - 4096.0;
#else
  return texelFetch(uGround, q, 0).r;
#endif
}
float groundH(vec2 xz) {
  vec2 g = (xz - uGC.xy) / uGC.z - 0.5; vec2 f = fract(g); ivec2 i = ivec2(floor(g)), m = ivec2(int(uGC.w) - 1);
  ivec2 a = clamp(i, ivec2(0), m), b = clamp(i + ivec2(1, 0), ivec2(0), m), c = clamp(i + ivec2(0, 1), ivec2(0), m), d = clamp(i + ivec2(1, 1), ivec2(0), m);
  return mix(mix(gcTex(a), gcTex(b), f.x), mix(gcTex(c), gcTex(d), f.x), f.y);
}

uniform float uPxK;   // (E1.1, as VS_SCATTER's)
layout(location = 0) in vec2 aQ;   // x: 0 tail .. 1 head, y: -1 .. 1 across
uniform vec4 uPa;    // box (m), height range (m), streak (s), size (px)
uniform vec3 uWind;  // m/s
uniform vec4 uPc;    // colour (rgb), opacity
uniform vec4 uPb;    // hop amplitude (m), hop rate, lift (m), kind
uniform vec4 uPd;    // rain: fall (m/s), the splash's life (s), gusts (0 .. 1), -; drifting: rise (m/s; < 0 sinks), life (s), wander (m/s), tumble or flicker (Hz)
uniform vec4 uPe;    // a second colour (rgb), its share
uniform vec4 uPf;    // a third colour (rgb), its share
uniform vec4 uPg;    // blink (the share of a cycle lit; 0: none), flicker (0 .. 1), the share drawn (0 .. 1: the rain's amount, an area's), -
uniform mat4 uPVP2; uniform vec3 uPCam2; uniform float uMB;   // (E1 Fix 3) the last frame's view and camera; the share of its motion a mote is drawn along (0: none)
out vec4 vCol; out vec2 vQ; flat out float vKind;
vec3 grain(int id, float t, out float edge) {
  uint h = ih(uint(id) * 2654435761u + 977u);
  float r1 = hf(h), r2 = hf(ih(h + 1u)), r3 = hf(ih(h + 2u)), r4 = hf(ih(h + 3u));
  vec3 vel = uWind * (0.65 + 0.7 * r1);
  vec2 p0 = vec2(r2, r3) * uPa.x;
  vec2 pos = p0 + vel.xz * t + vec2(gn(vec2(t * 0.3 + r4 * 10.0, r1 * 7.0)), gn(vec2(r2 * 9.0, t * 0.3))) * 3.0;
  vec2 rel = mod(pos - uCam.xz + 0.5 * uPa.x, uPa.x) - 0.5 * uPa.x;
  edge = 1.0 - smoothstep(0.36 * uPa.x, 0.5 * uPa.x, max(abs(rel.x), abs(rel.y)));
  vec2 xz = uCam.xz + rel;
  float hop = uPb.x * abs(sin(t * uPb.y * (0.7 + 0.6 * r4) + r1 * 6.28));
  float y = (uPb.w > 1.5 ? uCam.y - uPa.y * 0.5 : groundH(xz)) + uPb.z + uPa.y * r4 * r4 + hop + (uPb.w > 0.5 ? 1.5 * sin(t * 0.4 + r3 * 6.28) : 0.0);
  return vec3(xz.x, y, xz.y);
}
void hide() { gl_Position = vec4(0.0, 0.0, -2.0, 1.0); vCol = vec4(0.0); }
#ifndef NO_PKWX
void rain(int id) {
  // a drop: wrapped in a box about the camera (across) and in a column about its height; its streak the way it falls;
  // under the ground, it has landed: a splash there for its first moments, then nothing until it wraps round
  uint h = ih(uint(id) * 2654435761u + 4111u);
  float r1 = hf(h), r2 = hf(ih(h + 1u)), r3 = hf(ih(h + 2u)), r4 = hf(ih(h + 3u)), t = uT;
  float gust = 1.0 + uPd.z * 0.5 * smoothstep(0.55, 0.9, gn(vec2(t * 0.045, 3.7)) + 0.5);
  if (r4 > uPg.z * gust * 0.67) { hide(); return; }
  vec3 vel = vec3(uWind.x, -uPd.x * (0.9 + 0.2 * r1), uWind.z);
  vec2 rel = mod(vec2(r2, r3) * uPa.x + vel.xz * t - uCam.xz + 0.5 * uPa.x, uPa.x) - 0.5 * uPa.x;
  vec2 xz = uCam.xz + rel;
  float H = uPa.y, y = uCam.y + H * 0.5 - mod(-vel.y * t + r1 * H, H), g = groundH(xz);
  float edge = 1.0 - smoothstep(0.36 * uPa.x, 0.5 * uPa.x, max(abs(rel.x), abs(rel.y)));
  vec3 head = vec3(xz.x, y, xz.y), tail = head - vel * uPa.z;
  float since = (g - y) / max(-vel.y, 0.1);   // (s since it reached the ground; < 0 still falling)
  vKind = 3.0;
  if (since > 0.0) {   // its splash: a small ring of spray on the ground, for its first moments
    if (since > uPd.y) { hide(); return; }
    float k = since / uPd.y; head = vec3(xz.x, g + 0.02, xz.y); vKind = 3.5;
    vec4 c = uVP * vec4(head - uCam, 1.0); if (c.w < 0.5) { hide(); return; }
    float dist = length(head - uCam), w = max(uPa.w * 3.0 * (0.4 + 0.8 * k) * 18.0 / dist, 1.2 * uPxK);
    gl_Position = vec4(c.xy + vec2(aQ.x * 2.0 - 1.0, aQ.y) * w / uRes * 2.0 * c.w, c.z, c.w);
    vec3 rd = (head - uCam) / dist;
    vCol = vec4(atmos(uPc.rgb, rd, dist), uPc.a * 1.6 * (1.0 - k) * edge * (1.0 - smoothstep(25.0, 45.0, dist)));
    vQ = aQ; return;
  }
  vec4 ch = uVP * vec4(head - uCam, 1.0), ct = uVP * vec4(tail - uCam, 1.0);
  if (ch.w < 0.5 || ct.w < 0.5) { hide(); return; }
  vec2 sh = ch.xy / ch.w * uRes * 0.5, st = ct.xy / ct.w * uRes * 0.5, d = sh - st;
  float L = length(d); vec2 dir = L > 1e-3 ? d / L : vec2(0.0, 1.0), nrm = vec2(-dir.y, dir.x);
  float dist = length(head - uCam), w = max(uPa.w * 0.03 * 18.0 / dist * 20.0, uPa.w * uPxK);
  vec4 c = mix(ct, ch, aQ.x);
  vec2 px = c.xy / c.w * uRes * 0.5 + nrm * aQ.y * w * 0.5 + dir * (aQ.x - 0.5) * 1.5;
  gl_Position = vec4(px / (uRes * 0.5) * c.w, c.z, c.w);
  vec3 rd = (head - uCam) / dist;
  vCol = vec4(atmos(uPc.rgb, rd, dist), uPc.a * edge * smoothstep(1.0, 3.0, dist) * (1.0 - smoothstep(30.0, 48.0, dist)) * (0.75 + 0.5 * r2));
  vQ = aQ;
}
void drifter(int id) {
  // a petal, a seed, an ember, a spore, a firefly: carried by the wind and its own rise, wandering, tumbling (its
  // light twinkling as it turns) or flickering, living its own life (faded in and out), wrapped in the box
  uint h = ih(uint(id) * 2654435761u + 7919u);
  float r1 = hf(h), r2 = hf(ih(h + 1u)), r3 = hf(ih(h + 2u)), r4 = hf(ih(h + 3u)), r5 = hf(ih(h + 4u)), r6 = hf(ih(h + 5u)), t = uT;
  if (r6 > uPg.z) { hide(); return; }
  float life = uPd.y * (0.7 + 0.6 * r5), age = mod(t + r1 * life, life), born = floor((t + r1 * life) / life);
  uint h2 = ih(h + uint(born) * 31u); float q1 = hf(h2), q2 = hf(ih(h2 + 1u)), q3 = hf(ih(h2 + 2u));
  vec3 vel = uWind * (0.7 + 0.6 * r2) + vec3(0.0, uPd.x * (0.6 + 0.8 * r3), 0.0);
  vec3 wan = uPd.z * vec3(gn(vec2(t * 0.25 + q1 * 9.0, r4 * 5.0)), 0.5 * gn(vec2(t * 0.2 + q2 * 7.0, r3 * 3.0)), gn(vec2(r2 * 6.0, t * 0.25 + q3 * 11.0))) * 4.0;
  vec2 rel = mod(vec2(q1, q2) * uPa.x + vel.xz * age + wan.xz - uCam.xz + 0.5 * uPa.x, uPa.x) - 0.5 * uPa.x;
  vec2 xz = uCam.xz + rel;
  float edge = 1.0 - smoothstep(0.36 * uPa.x, 0.5 * uPa.x, max(abs(rel.x), abs(rel.y)));
  float base = uPb.w > 4.5 ? uCam.y - uPa.y * 0.5 : groundH(xz) + uPb.z;
  float y = base + mod(q3 * uPa.y + vel.y * age + wan.y, uPa.y);
  vec3 p = vec3(xz.x, y, xz.y);
  vec4 c = uVP * vec4(p - uCam, 1.0);
  if (c.w < 0.5) { hide(); return; }
  float dist = length(p - uCam), w = max(uPa.w * 18.0 / dist, 1.3 * uPxK);
  gl_Position = vec4(c.xy + vec2(aQ.x * 2.0 - 1.0, aQ.y) * w / uRes * c.w, c.z, c.w);
  float sel = hf(ih(h + 9u)); vec3 col = sel < uPe.w ? uPe.rgb : (sel < uPe.w + uPf.w ? uPf.rgb : uPc.rgb);
  float lf = sin(3.14159265 * age / life);
  float tw = uPd.w > 0.0 ? 0.55 + 0.45 * sin(6.2831853 * uPd.w * (0.8 + 0.4 * r4) * t + r5 * 6.28) : 1.0;
  if (uPg.y > 0.0) tw *= 1.0 + uPg.y * 1.4 * gn(vec2(t * 7.0 + r1 * 13.0, r2 * 5.0));
  if (uPg.x > 0.0) { float cy = fract(t * 0.4 * (0.7 + 0.6 * r3) + r4); tw *= smoothstep(0.0, 0.05, cy) * (1.0 - smoothstep(max(uPg.x - 0.05, 0.0), uPg.x, cy)); }
  vec3 rd = (p - uCam) / dist;
  float fwd = pow(max(dot(rd, uSun), 0.0), 5.0) * uSunVis;
  vCol = vec4(atmos(col * (1.0 + 1.5 * fwd), rd, dist), uPc.a * max(tw, 0.0) * lf * edge * smoothstep(0.8, 3.0, dist) * (1.0 - smoothstep(uPa.x * 0.45, uPa.x * 0.6, dist)));
  vKind = 4.0; vQ = aQ;
}
#endif
void main() {
#ifndef NO_PKWX
  if (uPb.w > 2.5 && uPb.w < 3.5) { rain(gl_InstanceID); return; }
  if (uPb.w > 3.5) { drifter(gl_InstanceID); return; }
#endif
  float edge, e2; int id = gl_InstanceID;
  vec3 head = grain(id, uT, edge), tail = uPb.w > 0.5 ? head : grain(id, uT - uPa.z, e2);
  vec4 ch = uVP * vec4(head - uCam, 1.0), ct = uVP * vec4(tail - uCam, 1.0);
  vKind = uPb.w;
  if (ch.w < 0.5 || ct.w < 0.5 || length(head - tail) > uPa.x * 0.25) { gl_Position = vec4(0.0, 0.0, -2.0, 1.0); vCol = vec4(0.0); vQ = aQ; return; }
  /* (round E1 Fix 3, G0) a mote drawn along its own motion on the window since the last frame (where it was then, seen
     from where the camera was), its light spread over that stretch: a near mote crossed the window by several pixels a
     frame as a 1.6 px dot, so each pixel it passed was lit for one frame and dark the next (the cloud-edge film's
     blinks, 1.2-2.0 a frame against the 4x reference's 0); a moving point of light is a short streak to the eye, with
     the same light in all */
  if (uPb.w > 0.5 && uMB > 0.0) {
    vec4 cp = uPVP2 * vec4(head - uPCam2, 1.0);
    if (cp.w > 0.5) ct = vec4(mix(ch.xy / ch.w, cp.xy / cp.w, uMB) * ch.w, ch.z, ch.w);
  }
  vec2 sh = ch.xy / ch.w * uRes * 0.5, st = ct.xy / ct.w * uRes * 0.5, d = sh - st;
  float L = length(d); vec2 dir = L > 1e-3 ? d / L : vec2(1.0, 0.0), nrm = vec2(-dir.y, dir.x);
  float dist = length(head - uCam), wt = uPa.w * 18.0 / dist, wo = max(wt, (uPb.w > 0.5 ? 1.6 : 0.8) * uPxK), w = max(wt, 1.6 * uPxK);   // (E1.1: the floors in the display's pixels, uPxK)   // (hotfix G0: never under 1.6 px wide (round 3b: 0.8); wo, the old width, keeps the light below)
  vec4 c = mix(ct, ch, aQ.x);
  vec2 px = c.xy / c.w * uRes * 0.5 + nrm * aQ.y * w * 0.5 + dir * (aQ.x - 0.5) * w;
  gl_Position = vec4(px / (uRes * 0.5) * c.w, c.z, c.w);
  vec3 rd = normalize(head - uCam), col;
  uint h = ih(uint(id) * 2654435761u + 31337u); float r1 = hf(h), r2 = hf(ih(h + 5u)), a;
  if (uPb.w < 0.5) {
    // (hotfix G0) no glint: a grain's facet spun through the sun at pow 60, a flash a turn (sparkle by design). Each
    // grain that glinted is lit steadily at its flash's mean over the turn: the facet's normal on a cone about the
    // vertical (cos 0.768, sin 0.640), so dot(n, h) = A + B cos(turn), and the mean of its 60th power over a turn is
    // (A + B)^60 sqrt((A + B) / (2 pi 60 B)) (Laplace; never more than the peak): the same light on average, no flash
    vec3 hg = normalize(uSun - rd); float gA = 0.7682 * hg.y, gB = 0.6402 * length(hg.xz), gm = max(gA + gB, 0.0);
    float gli = step(0.55, r2) * pow(gm, 60.0) * min(1.0, sqrt(gm / (376.99 * max(gB, 1e-3))));
    col = uPc.rgb * 0.5 + uSunC * gli * 4.0;
    a = uPc.a * (0.3 + 0.7 * min(gli * 4.0, 1.0));
  } else {
    float fwd = pow(max(dot(rd, uSun), 0.0), 5.0);
    col = uPc.rgb * (0.3 + 2.6 * fwd);
    a = uPc.a * (0.35 + 0.65 * fwd);
  }
  a *= edge * smoothstep(1.0, 4.0, dist) * (1.0 - smoothstep(60.0, 140.0, dist)) * clamp(wo / (1.2 * uPxK), 0.3, 1.0) * (wo * (L + wo)) / (w * (L + w));   // (hotfix G0: the light the old quad carried, spread over the wider one: the same in all)
  if (uPb.w > 0.5) a *= w / (L + w);   // (E1 Fix 3: a mote's light spread over its motion's stretch, L: the same in all)
  vCol = vec4(atmos(col, rd, dist), a); vQ = aQ;
}