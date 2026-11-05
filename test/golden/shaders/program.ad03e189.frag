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

uniform sampler2D uLinD; uniform vec2 uLinS;   // the half-resolution linear depth, its last texel
flat in vec4 vA, vB, vC, vD, vE; in vec3 vW; out vec4 oC;
void main() {
  vec3 rd = normalize(vW - uCam), ax = vB.xyz - vA.xyz; float L = max(length(ax), 1e-3); vec3 a = ax / L;
  vec3 u = normalize(cross(a, abs(a.y) < 0.95 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0))), w = cross(a, u);
  float R = max(vA.w, vB.w) * 2.2;
  // the ray in the beam's frame, through its box (along: 0 .. L, across: -R .. R)
  vec3 o = uCam - vA.xyz, ro = vec3(dot(o, a), dot(o, u), dot(o, w)), rl = vec3(dot(rd, a), dot(rd, u), dot(rd, w));
  vec3 inv = 1.0 / (rl + vec3(1e-6)), t0 = (vec3(0.0, -R, -R) - ro) * inv, t1 = (vec3(L, R, R) - ro) * inv, tmn = min(t0, t1), tmx = max(t0, t1);
  float tn = max(max(max(tmn.x, tmn.y), tmn.z), 0.0), tf = min(min(tmx.x, tmx.y), tmx.z);
  ivec2 q = min(ivec2(gl_FragCoord.xy * 0.5), ivec2(uLinS));
  tf = min(tf, linFetch(uLinD, q) / max(dot(rd, uCamF), 1e-3));
  if (tf <= tn) discard;
  float drawn = vD.z < -1e8 ? 2.0 * L : (uT - vD.z) / max(vD.w, 0.05) * L;   // (m of it lit, from A)
  if (drawn <= 0.0) discard;
  float ds = (tf - tn) / 8.0, jit = 0.5;   // (hotfix G0: no per-pixel offset, a pattern the view crawled through)
  vec3 acc = vec3(0.0);
  for (int i = 0; i < 8; i++) {
    float t = tn + (float(i) + jit) * ds;
    vec3 p = ro + rl * t; float s = clamp(p.x / L, 0.0, 1.0), rr = mix(vA.w, vB.w, s), r2 = (p.y * p.y + p.z * p.z) / (rr * rr);
    float win = smoothstep(0.0, max(vE.y, 0.02), s) * (1.0 - smoothstep(1.0 - max(vE.x, 0.02), 1.0, s)) * smoothstep(p.x - 3.0, p.x, drawn);
    float dens = exp(-r2 * 2.2), core = exp(-r2 * 22.0) * vC.w;
    vec3 pw = vA.xyz + a * p.x + u * p.y + w * p.z;
    float dust = 1.0 + vD.x * (n3(pw * 0.07 - a * uT * 0.025) * 2.0 - 1.0) * 1.2;
    acc += vC.rgb * (dens * max(dust, 0.0) + core) * win * ds / (rr * 1.8);
  }
  acc *= 1.0 + vD.y * 0.08 * sin(uT * 12.6 + dot(vA.xyz, vec3(0.37, 0.71, 0.53)));
  float tm = (tn + tf) * 0.5;
  oC = vec4(acc * (1.0 - fogAmt(rd, tm)) * (1.0 - hazeAmt(rd, tm)), 0.0);
}