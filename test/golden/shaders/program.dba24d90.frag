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

uniform sampler2D uScene, uCloud, uBloom, uShaft, uLinD, uDepth, uSceneH;
uniform mat4 uHVP; uniform vec4 uHC;   // (E1.1) the last frame's scene (uSceneH), its view and camera; w 1 where it may be read
uniform float uStb;   // (E1.1, item 7) 1: the scene's last frame mixed in where it shows the same surface (dev: stb=0 off)
uniform float uLay;   // (E1.1, dev) 1: an outline in front of a cloud laid over its near and far samples apart (lay=0 off)
const float CLZ = 8000.0;   // (Fix 3: as far as a cloud can stand; the clouds' upsampling compares depths no farther)
uniform vec4 uSc;     // scene uv scale (x, y), supersampling, FXAA (1 on; 0 off: the scene's own samples, E1 Fix 3)
uniform vec4 uClS;    // cloud uv scale (x, y), half-res size (x, y)
uniform vec4 uBlK;    // bloom amount, shafts amount, bloom uv scale x, y
uniform vec4 uShK;    // shaft uv scale (x, y), exposure, saturation
uniform vec3 uShC; uniform vec3 uLift, uGain;
uniform vec2 uOut;        // (world6w: the composite takes nothing from the words)
uniform mat4 uPVP; uniform vec3 uPCam;   // dev: the camera 0.1 s before (the motion field)
uniform vec4 uSSR;        // water in the realm (1: the nearby forms reflected), the reflection's reach (m), -, -
uniform vec4 uCeil;       // (tod) the light ceiling (the world's own light on the skies with light words, the same everywhere, no words input): x the ceiling (OKLab L; 2: off), y its knee
uniform vec4 uMi;         // (Fix 3) the cloud about the eye coming out: x -1 (worked out per pixel; 0: none), y the cloud (uIn.x), z the way out (uIn.w); w (E1.1) the scene's samples a pixel where it has them (0: none; its alpha the depth's code)
out vec4 oC;
vec3 shoulder(vec3 c) { float m = max(c.r, max(c.g, c.b)); const float K = 0.78; if (m <= K) return c;
  float mm = K + (1.0 - K) * (1.0 - exp(-(m - K) / (1.0 - K))); vec3 h = c * (mm / m); float over = clamp((m - 1.0) / 3.0, 0.0, 1.0); return mix(h, vec3(mm), over * 0.75); }
vec3 enc(vec3 c) { return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c)); }
float lumi(vec3 c) { return dot(c, LUMA); }
float lumaA(vec3 c) { float l = dot(c, LUMA); return l / (1.0 + l); }
vec2 SC0, SC1;
vec3 sc(vec2 q) { return texture(uScene, clamp(q, SC0, SC1)).rgb; }
vec3 fxaa(vec2 q) {
  vec2 rc = 1.0 / vec2(textureSize(uScene, 0));
  SC0 = rc * 0.5; SC1 = uSc.xy - rc * 0.5;
  vec3 cM = sc(q);
  float lNW = lumaA(sc(q + vec2(-0.5, -0.5) * rc)), lNE = lumaA(sc(q + vec2(0.5, -0.5) * rc));
  float lSW = lumaA(sc(q + vec2(-0.5, 0.5) * rc)), lSE = lumaA(sc(q + vec2(0.5, 0.5) * rc)), lM = lumaA(cM);
  float lo = min(lM, min(min(lNW, lNE), min(lSW, lSE))), hi = max(lM, max(max(lNW, lNE), max(lSW, lSE)));
  if (hi - lo < max(0.02, hi * 0.12)) return cM;
  vec2 dir = vec2(-((lNW + lNE) - (lSW + lSE)), (lNW + lSW) - (lNE + lSE));
  float red = max((lNW + lNE + lSW + lSE) * 0.03125, 1.0 / 128.0), rmin = 1.0 / (min(abs(dir.x), abs(dir.y)) + red);
  dir = clamp(dir * rmin, -6.0, 6.0) * rc;
  vec3 a = 0.5 * (sc(q - dir / 6.0) + sc(q + dir / 6.0));
  vec3 b = a * 0.5 + 0.25 * (sc(q - dir * 0.5) + sc(q + dir * 0.5));
  float lb = lumaA(b);
  return (lb < lo || lb > hi) ? a : b;
}
vec2 lim(sampler2D s, vec2 drawn) { return drawn - 0.5 / vec2(textureSize(s, 0)); }
float zc(float z) { return z >= 5.9e4 ? 1.0 : 0.5 + 0.5 * clamp(log2(max(z, 1.0)) / 16.0, 0.0, 1.0); }   // (E1.1: a half-resolution depth's code, as zcode() codes the scene's)
void main() {
  vec2 px = gl_FragCoord.xy, uv = px / uOut;
  vec3 c = vec3(0.0); int n = int(uSc.z);
  if (n > 1) { for (int j = 0; j < 4; j++) for (int i = 0; i < 4; i++) { if (i >= n || j >= n) continue; c += texelFetch(uScene, ivec2(floor(px) * uSc.z) + ivec2(i, j), 0).rgb; } c /= uSc.z * uSc.z; }
  else if (uSc.w > 0.5) c = fxaa(uv * uSc.xy);
  else c = texture(uScene, uv * uSc.xy).rgb;
  vec4 cl = vec4(0.0);   // (the clouds: brought up below, E1 Fix 3)
  bool lay = false; vec3 cLay = vec3(0.0); vec4 dbgL = vec4(0.0);   // (E1.1: the cloud laid over a pixel's near and far samples apart, below; dbgL: dev 9)
  float dz = texelFetch(uDepth, min(ivec2(floor(uv * uSc.xy * vec2(textureSize(uDepth, 0)))), textureSize(uDepth, 0) - 1), 0).r;
  float zl = dz >= 1.0 ? 6.0e4 : 2.0 * uProj.z * uProj.w / (uProj.w + uProj.z - (dz * 2.0 - 1.0) * (uProj.w - uProj.z));
#ifdef DEV
  if (0 == 5) {   // dev: the true motion field (% of the width per second), each pixel's point seen 0.1 s before
    vec2 ndc = px / uOut * 2.0 - 1.0;
    vec3 rv = uCamF + uCamR * ndc.x * uProj.x + uCamU * ndc.y * uProj.y;
    bool skyp = zl >= 5.5e4;
    vec4 q = skyp ? uPVP * vec4(rv, 0.0) : uPVP * vec4(uCam + rv * zl - uPCam, 1.0);
    float sp = length((ndc - q.xy / q.w) * vec2(0.5, 0.5 * uOut.y / uOut.x)) * 1000.0;
    oC = vec4(clamp(sp / 25.0, 0.0, 1.0), clamp(sp / 2.5, 0.0, 1.0), skyp ? 1.0 : 0.0, 1.0);
    return;
  }
  if (0 == 8) {   // (dev, E0: the pop detector's motion field) each pixel's displacement on the window since the film's last
    // frame (px, the current position less the last), 12 bits a component at 1/32 px over +-64 px, in R, G and B
    vec2 ndc = px / uOut * 2.0 - 1.0;
    vec3 rv = uCamF + uCamR * ndc.x * uProj.x + uCamU * ndc.y * uProj.y;
    bool skyp = zl >= 5.5e4;
    vec4 q = skyp ? uPVP * vec4(rv, 0.0) : uPVP * vec4(uCam + rv * zl - uPCam, 1.0);
    vec2 d = (ndc - q.xy / q.w) * 0.5 * uOut;
    vec2 e = clamp(floor(d * 32.0 + 2048.0 + 0.5), 0.0, 4095.0);
    oC = vec4(floor(e.x / 16.0) / 255.0, (mod(e.x, 16.0) * 16.0 + floor(e.y / 256.0)) / 255.0, mod(e.y, 256.0) / 255.0, 1.0);
    return;
  }
#endif
#ifndef NO_WATER
  // water (the scene's alpha under 1: its reflected share): the nearby forms seen in its reflection, put over the sky
  // the water shader reflected there (a short march of the reflected ray against the scene's depth, screen-space)
  if (uSSR.x > 0.5 && zl < 5.0e4) {
    vec2 dsz = vec2(textureSize(uDepth, 0));
    float wa = texelFetch(uScene, min(ivec2(floor(uv * uSc.xy * dsz)), ivec2(dsz) - 1), 0).a;
    if (wa < 0.495) {   // (E1.1: water's alpha 0.49 (1 - F); every other fragment's the depth's code, 0.5 and over)
      float F = clamp(1.0 - wa / 0.49, 0.0, 1.0);
      vec2 ndc = px / uOut * 2.0 - 1.0;
      vec3 rv = uCamF + uCamR * ndc.x * uProj.x + uCamU * ndc.y * uProj.y, P = uCam + rv * zl, rd = normalize(rv);
      vec3 n = waterNormal(P, zl * 2.0 * uProj.y / uRes.y), r = reflect(rd, n); r.y = abs(r.y) + 1e-3;
      float s = max(0.5, zl * 0.004), s0 = 0.0; bool hit = false; vec2 nq = vec2(0.0);
      for (int i = 0; i < 22; i++) {
        vec3 q = P + r * s; vec4 cq = uVP * vec4(q - uCam, 1.0);
        if (cq.w < 0.2) break;
        nq = cq.xy / cq.w; if (abs(nq.x) > 1.0 || abs(nq.y) > 1.0) break;
        float dq = texelFetch(uDepth, min(ivec2((nq * 0.5 + 0.5) * uSc.xy * dsz), ivec2(dsz) - 1), 0).r;
        float zs = dq >= 1.0 ? 6.0e4 : 2.0 * uProj.z * uProj.w / (uProj.w + uProj.z - (dq * 2.0 - 1.0) * (uProj.w - uProj.z)), zq = dot(q - uCam, uCamF);
        if (zq > zs && zq - zs < max(1.5, s * 0.15)) { hit = true; break; }
        if (s > uSSR.y) break;
        s0 = s; s *= 1.3;
      }
      if (hit) {
        for (int j = 0; j < 4; j++) {   // (refined between the last two steps)
          float sm = (s0 + s) * 0.5; vec3 q = P + r * sm; vec4 cq = uVP * vec4(q - uCam, 1.0); vec2 nm = cq.xy / cq.w;
          float dq = texelFetch(uDepth, min(ivec2((nm * 0.5 + 0.5) * uSc.xy * dsz), ivec2(dsz) - 1), 0).r;
          float zs = dq >= 1.0 ? 6.0e4 : 2.0 * uProj.z * uProj.w / (uProj.w + uProj.z - (dq * 2.0 - 1.0) * (uProj.w - uProj.z));
          if (dot(q - uCam, uCamF) > zs) { s = sm; nq = nm; } else s0 = sm;
        }
        vec3 hc = texture(uScene, (nq * 0.5 + 0.5) * uSc.xy).rgb;
        float tw = zl * length(rv), fade = (1.0 - smoothstep(0.8, 1.0, max(abs(nq.x), abs(nq.y)))) * (1.0 - smoothstep(uSSR.y * 0.5, uSSR.y, s));
        c = max(c + F * fade * (1.0 - fogAmt(rd, tw)) * (1.0 - hazeAmt(rd, tw)) * (min(hc, vec3(8.0)) - waterRefl(rd, n)), 0.0);
      }
    }
  }
#endif
  /* (E1.1, item 7, G0) where the scene has its samples, the last frame's scene mixed in at half wherever it shows the
     same surface: each pixel's point (its resolved depth) seen from where the camera was, read there from the last
     frame's scene (the twin, uSceneH), taken only where that frame's depth code there is the point's own (within 0.008:
     a depth within 19%, so nothing that moved on its own nor what stood behind an edge is taken) and held within this
     frame's 3 x 3 (nothing else of the last frame can come back). The four samples a pixel see a small form at another
     place among them in each frame, so its edge is the mean of eight: a pale pebble's tip on the sand in a dune's shade
     lit a pixel wholly for one frame and was gone the next (Chromium's still view: 2.89 blinks a frame against the 4x
     reference's 0.89, every round since c4). The sky (code 1) and water (under 0.5) are left alone (Fix 2: but the sky at a rim); the clouds are laid
     over it after (the layering below takes the pixel's own frame, cR, and its own history) */
  vec3 cR = c;
  if (uStb > 0.5 && uHC.w > 0.5 && n <= 1) {
    ivec2 ssz0 = textureSize(uScene, 0), ip0 = min(ivec2(floor(uv * uSc.xy * vec2(ssz0))), ssz0 - 1);
    float A0 = texelFetch(uScene, ip0, 0).a;
    if (A0 >= 0.5) {
      /* (E1.1 Fix 2, G0 at 1:1 pixels: 1440 x 900, 2.83 blinks a frame against the 4x reference's 0) and at a rim too:
         where this frame's 3 x 3 holds two depths (an outline: a floating rock before the sky or a farther rock, a sliver
         of sky between two; the sky's pixels at the rim included) the last frame's pixel is taken though its code is not
         the point's own (the rim's samples went in or out), held within this frame's 3 x 3 as ever: four samples a pixel
         step a rim pixel by a quarter of the edge's contrast (25 codes between a navy rock and the sky) as one sample goes
         in or out, and a pixel the edge brushed stepped up and back; mixed at half with the frame before, the step is
         halved (1440 x 900: 2.83 -> 0.83 blinks a frame with the rock's pixels alone, the sky's added below) */
      vec3 mn = c, mx = c; float aLo3 = A0, aHi3 = A0;
      for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) { if (i == 0 && j == 0) continue; vec4 q = texelFetch(uScene, clamp(ip0 + ivec2(i, j), ivec2(0), ssz0 - 1), 0); mn = min(mn, q.rgb); mx = max(mx, q.rgb); aLo3 = min(aLo3, q.a); aHi3 = max(aHi3, q.a); }
      bool rim = aLo3 >= 0.5 && aHi3 - aLo3 > 0.02;
      if ((A0 < 0.999 && zl < 5.0e4) || rim) {
        vec2 nd0 = px / uOut * 2.0 - 1.0; vec3 rv0 = uCamF + uCamR * nd0.x * uProj.x + uCamU * nd0.y * uProj.y;
        vec4 hq0 = uHVP * vec4(uCam - uHC.xyz + rv0 * zl, 1.0);
        if (hq0.w > 1.0 && abs(hq0.x) < hq0.w * 0.998 && abs(hq0.y) < hq0.w * 0.998) {
          vec4 hs0 = texture(uSceneH, (hq0.xy / hq0.w * 0.5 + 0.5) * uSc.xy);
          if ((A0 < 0.999 && abs(hs0.a - zc(hq0.w)) < 0.008) || (rim && hs0.a >= 0.5)) c = 0.5 * c + 0.5 * clamp(hs0.rgb, mn, mx);
        }
      }
    }
  }
  {
    // the half-resolution clouds brought up edge-aware (hotfix G0): across an edge of the land (a landmark against what
    // stands behind it, the land against the sky) each of the 2x2 weighted by how near its depth is to this pixel's, so
    // no cloud bleeds across it; over an even surface (the 2x2's depths, interpolated, within 5% of this pixel's) plain
    // bilinear. (Round 3b weighted by depth everywhere, and so steeply that over the sea, whose depth changes from one
    // pixel to the next, it took the nearest texel: the clouds' edges were drawn in half-resolution stairs that crawled
    // and blinked as the view moved.) The same 2x2 reads as before
    vec2 hp = uv * uClS.zw - 0.5, f = fract(hp); ivec2 h0 = ivec2(floor(hp));
    /* (round E1 Fix 2, G0) over an even surface the half-resolution clouds are brought up by a cubic B-spline (four
       bilinear reads, GPU Gems 2 ch. 20), not bilinear: a bilinear ramp between half-resolution texels moves in
       periodic kinks as an edge slides across them, which the 4x reference does not show (WebKit, the cloud-edge film
       at 42 m/s, 491x668: the moving silhouettes' excess p99 1.156 codes with bilinear, 0.799 with the B-spline; its
       blinks at 6 codes 199 a million pixels against 78). Four more reads, only where a cloud covers the pixel.
       (Fix 3) Gated on the B-spline's own reach: Fix 2 asked first whether a plain bilinear read (the 2x2) saw any
       cloud, so where the B-spline's 4x4 reached a cloud the 2x2 did not, its tail was cut, and the cut moved with the
       half-resolution grid (verify-gates-2: removing it took the edge film's blocks over 1 code from 41 to 34). And
       the B-spline is taken only where its whole 4x4 lies on one surface: each of its outer twelve texels' depth within
       5% of the plane the inner 2x2's depths make (a smooth slope, the sea toward the horizon, passes; an edge does
       not), else the depth-weighted 2x2 (verify-regress-2: the B-spline's outer texels on a dune below a far cloud drew
       a stepped light line inside the cloud just above the crest, the 2x2 alone being all sky).
       (Fix 3, defect 19) The depths are compared as far as a cloud can stand (CLZ, 8 km: no realm streams a cloud
       beyond its cells' reach, ABOVE's 3.8 km and DUNES' 5.2 km radius and a cell beyond), so what lies behind every
       cloud is one surface: the far sea and the sky behind a tower's edge at the horizon were two to the test (sea
       at 10-40 km, sky at 60), and the edge went from the B-spline to the 2x2 and back as the horizon slid across the
       pixels (WebKit, 491 x 1065: three points on the towers' edges at the horizon blinked 5-9 times in 24 frames,
       the reference never) */
    vec2 tsz = vec2(textureSize(uCloud, 0)), b0 = (1.0 - f) * (1.0 - f) * (1.0 - f) / 6.0, b1 = (4.0 - 6.0 * f * f + 3.0 * f * f * f) / 6.0, b3 = f * f * f / 6.0, b2 = 1.0 - b0 - b1 - b3;
    vec2 g0 = b0 + b1, g1 = b2 + b3, o0 = (vec2(h0) + 0.5 - 1.0 + b1 / g0) / tsz, o1 = (vec2(h0) + 0.5 + 1.0 + b3 / g1) / tsz, lm = lim(uCloud, uClS.xy);
    vec4 tA = texture(uCloud, min(o0, lm)), tB = texture(uCloud, min(vec2(o1.x, o0.y), lm)), tC = texture(uCloud, min(vec2(o0.x, o1.y), lm)), tD = texture(uCloud, min(o1, lm));
    /* (stage2 quality Q2) brought up by a Catmull-Rom (interpolating: a detail a quarter of the half resolution's
       rate keeps its contrast, which the B-spline cut by about 40%), clamped to the range of the inner 2x2 it
       interpolates (no ring, no overshoot: never above the brightest texel there, never below the darkest; so
       never above the light ceiling either). The four reads above stay the gate's (the 4x4's reach) */
    vec4 cS; { vec2 w0c = f * (-0.5 + f * (1.0 - 0.5 * f)), w1c = 1.0 + f * f * (-2.5 + 1.5 * f), w2c = f * (0.5 + f * (2.0 - 1.5 * f)), w3c = f * f * (-0.5 + 0.5 * f);
      ivec2 qm = ivec2(uClS.zw) - 1; vec4 s4 = vec4(0.0), mn4 = vec4(1e9), mx4 = vec4(-1e9);
      for (int j = 0; j < 4; j++) { float wy = j == 0 ? w0c.y : (j == 1 ? w1c.y : (j == 2 ? w2c.y : w3c.y));
        for (int i = 0; i < 4; i++) { float wx = i == 0 ? w0c.x : (i == 1 ? w1c.x : (i == 2 ? w2c.x : w3c.x));
          vec4 q4 = texelFetch(uCloud, clamp(h0 + ivec2(i - 1, j - 1), ivec2(0), qm), 0); s4 += q4 * (wx * wy);
          if (i >= 1 && i <= 2 && j >= 1 && j <= 2) { mn4 = min(mn4, q4); mx4 = max(mx4, q4); } } }
      cS = clamp(s4, mn4, mx4); }
    cl = cS;
    /* (Fix 3, the hotfix verify-2's item 3) coming out of a cloud, the cloud about the eye (FS_INCLOUD, drawn into the
       same half-resolution target, in front of everything) is brought up plainly wherever it still stands: its share
       here worked out as FS_INCLOUD works it (the same when from the same two reads of the noise, the same way out),
       km 1 where it stands (amt from 0.06 up: below that its planes draw next to nothing), 0 in the holes. The
       depth-weighted 2x2 judged it by the land's depth, which it does not lie at: over ABOVE's sea of cloud, whose
       domes are no plane at half resolution, each hole's edge was taken from the nearest texel, stairs that crawled as
       the holes opened (seed 13 into ABOVE at 85.35-85.85 s, 393x852: the block excess p99 1.408 codes). In the holes
       the clouds and the land behind are brought up as before; nothing changes out of a passage */
    float km = 0.0;   // (world6: no cloud about the eye: there are no passages)
    if (km < 0.999 && max(max(tA.a, tB.a), max(tC.a, tD.a)) > 0.002) {
      vec4 c2 = vec4(0.0); float ws = 0.0, zb = 0.0, zlc = min(zl, CLZ); float zq4[4];
      ivec2 qmax = ivec2(uClS.zw) - 1;
      for (int j = 0; j < 2; j++) for (int i = 0; i < 2; i++) {
        ivec2 q = clamp(h0 + ivec2(i, j), ivec2(0), qmax);
        float zq = min(linFetch(uLinD, q), CLZ), bw = (i == 0 ? 1.0 - f.x : f.x) * (j == 0 ? 1.0 - f.y : f.y);
        vec4 cq = texelFetch(uCloud, q, 0);
        float w = bw * (1.0 / (1e-3 + abs(zq - zlc) / max(zlc, 1.0) * 40.0)) + 1e-5;
        c2 += cq * w; ws += w; zb += zq * bw; zq4[j * 2 + i] = zq;
      }
      float ev = abs(zb - zlc) / max(zlc, 1.0);
      if (ev < 0.2) {   // (the outer twelve against the inner 2x2's plane: only where the B-spline may still be taken)
        float gx = 0.5 * (zq4[1] - zq4[0] + zq4[3] - zq4[2]), gy = 0.5 * (zq4[2] - zq4[0] + zq4[3] - zq4[1]), zc = 0.25 * (zq4[0] + zq4[1] + zq4[2] + zq4[3]);
        for (int j = -1; j <= 2; j++) for (int i = -1; i <= 2; i++) {
          if (i >= 0 && i <= 1 && j >= 0 && j <= 1) continue;
          float zo = min(linFetch(uLinD, clamp(h0 + ivec2(i, j), ivec2(0), qmax)), CLZ), zp = zc + gx * (float(i) - 0.5) + gy * (float(j) - 0.5);
          ev = max(ev, abs(zo - zp) / max(min(zo, max(zp, 1.0)), 1.0));
        }
      }
      /* (E1.1 Fix 2, G0: Chromium's rim blinks) a pixel standing farther than every texel of its 2x2 (all its samples on
         the sky behind a floating rock's rim, its texels the rock's: the half-resolution depth keeps the nearer) took
         those texels' cloud, which is what stands before the rock, so the cloud behind it (a tower) was missing there
         and the pixel showed the bare sky (pale, 177-179 codes, against the tower's lavender 123-142, every other frame
         as the rim's samples went in and out): now the cloud of the texels about it at its own depth, as the layering
         takes its far part's */
      vec4 cW = c2 / ws;
      float zcp = zc(zl);
      if (zcp > zc(max(max(zq4[0], zq4[1]), max(zq4[2], zq4[3]))) + 0.02 && km < 0.001) {
        vec4 sO = vec4(0.0); float wO = 0.0;
        for (int j = -1; j <= 2; j++) for (int i = -1; i <= 2; i++) {
          ivec2 qo = clamp(h0 + ivec2(i, j), ivec2(0), qmax);
          if (abs(zc(linFetch(uLinD, qo)) - zcp) < 0.01) { vec2 dq = vec2(float(i), float(j)) - f; float wb = 1.0 / (0.25 + dot(dq, dq)); sO += texelFetch(uCloud, qo, 0) * wb; wO += wb; }
        }
        if (wO > 1e-6) cW = sO / wO;
      }
      cl = mix(cS, cW, smoothstep(0.05, 0.2, ev) * (1.0 - km));   // (the B-spline over an even surface, the depth-weighted 2x2 across the land's edges; Fix 3: and plainly where the cloud about the eye stands)
    }
    /* (E1.1, item 7, G0) where the scene has its samples and a pixel's samples stand at two depths (its alpha, their
       depth codes averaged, unlike the code of its one resolved depth), the cloud is laid over each part apart: the
       share of near samples cov from the codes of the nearest and farthest half-resolution depths about it (the 4 x 4),
       the cloud before the near ones (the texels at the near depth) and before the far ones (at the far depth), and each
       part's own colour from the 3 x 3 pixels most near and most far (their residual shared, so the pixel's own colour is
       kept). Fix 3 took each such pixel as wholly near or wholly far by its one depth sample: the floating rocks'
       outlines against a bright tower stepped and crawled (491 x 1065: the moving reading 1.179) */
#ifndef NO_WATER
    if (uLay > 0.5 && uMi.w > 0.5 && n <= 1 && uSSR.x < 0.5 && km < 0.001 && max(max(tA.a, tB.a), max(tC.a, tD.a)) > 0.002) {
#else
    if (uLay > 0.5 && uMi.w > 0.5 && n <= 1 && km < 0.001 && max(max(tA.a, tB.a), max(tC.a, tD.a)) > 0.002) {
#endif
      ivec2 ssz = textureSize(uScene, 0), ip = min(ivec2(floor(uv * uSc.xy * vec2(ssz))), ssz - 1);
      float A = texelFetch(uScene, ip, 0).a; dbgL.y = A; dbgL.z = abs(A - zc(zl));
      if (A >= 0.5 && abs(A - zc(zl)) > 0.003) {
        ivec2 qmax = ivec2(uClS.zw) - 1; float cn = 2.0, cf = -1.0; float cq[16];
        for (int j = -1; j <= 2; j++) for (int i = -1; i <= 2; i++) { float k = zc(linFetch(uLinD, clamp(h0 + ivec2(i, j), ivec2(0), qmax))); cq[(j + 1) * 4 + i + 1] = k; cn = min(cn, k); }
        // the far part: the resolved sample's own depth where it is the far one, else the nearest texel standing far of
        // the near part (not the farthest of the sixteen: below a floating rock the sea stands between it and the sky)
        float zs = zc(zl), dbest = 1e9;
        if (zs > cn + 0.02) cf = zs;
        else for (int j = -1; j <= 2; j++) for (int i = -1; i <= 2; i++) { float k = cq[(j + 1) * 4 + i + 1]; vec2 dq = vec2(float(i), float(j)) - f; float dd = dot(dq, dq); if (k > cn + 0.02 && dd < dbest) { dbest = dd; cf = k; } }
        dbgL.w = cf - cn;
        if (cf - cn > 0.02 && cn < zc(CLZ) && A > cn + 0.002 && A < cf + 0.002) {   // (the near part within a cloud's reach: beyond it the clouds stand before both parts alike)
          float cov = clamp((cf - A) / (cf - cn), 0.0, 1.0);
          vec4 sN = vec4(0.0), sF = vec4(0.0); float wN = 0.0, wF = 0.0;
          for (int j = -1; j <= 2; j++) for (int i = -1; i <= 2; i++) {
            float k = cq[(j + 1) * 4 + i + 1]; vec2 dq = vec2(float(i), float(j)) - f; float wb = 1.0 / (0.25 + dot(dq, dq));
            vec4 cv = texelFetch(uCloud, clamp(h0 + ivec2(i, j), ivec2(0), qmax), 0);
            if (k < cn + 0.01) { sN += cv * wb; wN += wb; }
            if (abs(k - cf) < 0.01) { sF += cv * wb; wF += wb; }
          }
          vec4 clN = sN / wN, clF = wF > 1e-6 ? sF / wF : cS;   // (E1.1: no texel at the far part's own depth (cf, the resolved sample's code): the cloud as brought up for the pixel, never 0 / 0)
          vec3 rE = cR, bE = cR; float aLo = 2.0, aHi = -1.0;
          for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) {
            vec4 sp = texelFetch(uScene, clamp(ip + ivec2(i, j), ivec2(0), ssz - 1), 0);
            if (sp.a >= 0.5 && sp.a < aLo) { aLo = sp.a; rE = sp.rgb; }
            if (sp.a > aHi) { aHi = sp.a; bE = sp.rgb; }
          }
          /* the last frame's same outline, reprojected by the near depth (it moves with the near form), mixed in at half:
             four samples a pixel step its share by quarters as it slides, and the step is spread over the frames that
             see it at other places among them (its share held between the two depths, its colour between the two
             parts': nothing else of the last frame can come back) */
          vec3 cc = cR;
          if (uHC.w > 0.5) {
            vec2 nd = px / uOut * 2.0 - 1.0; vec3 rv = uCamF + uCamR * nd.x * uProj.x + uCamU * nd.y * uProj.y;
            vec4 hq = uHVP * vec4(uCam - uHC.xyz + rv * exp2((cn - 0.5) * 32.0), 1.0);
            if (hq.w > 1e-3 && abs(hq.x) < hq.w && abs(hq.y) < hq.w) {
              // (E1.1 Fix 2) the last frame's pixel there read as it was (its texel, not a bilinear blend of the rim's codes:
              // across the rim the blend took the sky's code in, under-read the near share, and the mix pulled the
              // pixel toward the far part: a rim pixel swung 56 -> 78 -> 56 codes, its samples one in and out)
              vec4 hs = texelFetch(uSceneH, clamp(ivec2(floor((hq.xy / hq.w * 0.5 + 0.5) * uSc.xy * vec2(ssz))), ivec2(0), ssz - 1), 0);
              if (hs.a >= 0.5) { cov = 0.5 * cov + 0.5 * clamp((cf - hs.a) / (cf - cn), 0.0, 1.0); cc = 0.5 * cR + 0.5 * clamp(hs.rgb, min(rE, bE), max(rE, bE)); }
            }
          }
          dbgL.x = 0.2 + 0.8 * cov;
          vec3 dl = cc - (cov * rE + (1.0 - cov) * bE); rE = max(rE + dl, 0.0); bE = max(bE + dl, 0.0);
          cLay = cov * (min(rE, vec3(1.0 + 3.0 * (1.0 - clN.a))) * (1.0 - clN.a) + clN.rgb) + (1.0 - cov) * (min(bE, vec3(1.0 + 3.0 * (1.0 - clF.a))) * (1.0 - clF.a) + clF.rgb);
          cl = mix(clF, clN, cov); lay = true;
        }
      }
    }
  }
  // (under cloud the scene's light is held to 1: a disc behind an opaque cloud never prints through)
  c = lay ? cLay : min(c, vec3(1.0 + 3.0 * (1.0 - cl.a))) * (1.0 - cl.a) + cl.rgb;
#ifdef DEV
  if (0 == 9) { oC = vec4(dbgL.x, clamp((dbgL.y - 0.5) * 2.0, 0.0, 1.0), clamp(dbgL.z * 50.0, 0.0, 1.0), 1.0); return; }   // (dev, E1.1: the layering: red its near share where taken, green the depth code, blue how far the samples' codes stand from the one resolved)
#endif
  c += texture(uBloom, min(uv * uBlK.zw, lim(uBloom, uBlK.zw))).rgb * uBlK.x;
  c += texture(uShaft, min(uv * uShK.xy, lim(uShaft, uShK.xy))).rgb * uShC * uBlK.y * smoothstep(150.0, 2500.0, zl) * (1.0 - 0.7 * cl.a);
  c *= uShK.z;
  c = uLift + c * uGain;
  float y0 = lumi(c); c = max(mix(vec3(y0), c, uShK.w), 0.0);
  c = shoulder(c);
  // (tod) the light ceiling: what passes K = ceiling - knee eased under the ceiling by a soft shoulder in OKLab L, the
  // colour scaled by the cube of the L ratio (hue and chroma's direction kept: L(s c) = s^(1/3) L(c)); never above it
  if (uCeil.x < 1.5) {
    vec3 lms = pow(max(vec3(dot(c, vec3(0.4122214708, 0.5363325363, 0.0514459929)), dot(c, vec3(0.2119034982, 0.6806995451, 0.1073969566)), dot(c, vec3(0.0883024619, 0.2817188376, 0.6299787005))), vec3(0.0)), vec3(1.0 / 3.0));
    float Lk = dot(lms, vec3(0.2104542553, 0.7936177850, -0.0040720468)), Kc = uCeil.x - uCeil.y;
    if (Lk > Kc) c *= pow((Kc + uCeil.y * (1.0 - exp(-(Lk - Kc) / uCeil.y))) / Lk, 3.0);
  }
  c = clamp(c, 0.0, 1.0);
  // W7-TAIL-BEGIN (world6w: the words' lift is gone: the composite takes nothing from the words (no mask, floor, gain
  // or toe), so the frame with the words' machinery on and off is the same program on the same inputs; CI's rule 7
  // fails if any words input comes back into the composite, and its unit test runs this tail over random grounds)
  vec3 s = enc(clamp(c, 0.0, 1.0));
  // (hotfix G0) the dither: one 8-bit step (uniform, -0.5 .. +0.5 of a code), in one fixed R2 pattern on the window: no
  // bands in the 8 bits, and nothing that changes from one frame to the next (round 3b's triangular dither, two codes
  // wide and shifted every frame, fizzed over every even colour: a passage's cloud, its cover, the sky)
  s += (fract(dot(px, vec2(0.7548776662, 0.5698402910))) - 0.5) / 255.0;
  oC = vec4(s, 1.0);
  // W7-TAIL-END
}