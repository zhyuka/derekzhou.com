
uniform sampler2D uScene, uCloud, uBloom, uShaft, uLinD, uDepth, uSceneH;
uniform mat4 uHVP; uniform vec4 uHC;   // the last frame's scene (uSceneH), its view and camera; w 1 where it may be read
uniform float uStb;   // 1: the scene's last frame mixed in where it shows the same surface (dev: stb=0 off)
uniform float uLay;   // (dev) 1: an outline in front of a cloud laid over its near and far samples apart (lay=0 off)
const float CLZ = 8000.0;   // (as far as a cloud can stand; the clouds' upsampling compares depths no farther)
uniform vec4 uSc;     // scene uv scale (x, y), supersampling, FXAA (1 on; 0 off: the scene's own samples)
uniform vec4 uClS;    // cloud uv scale (x, y), half-res size (x, y)
uniform vec4 uBlK;    // bloom amount, shafts amount, bloom uv scale x, y
uniform vec4 uShK;    // shaft uv scale (x, y), exposure, saturation
uniform vec3 uShC; uniform vec3 uLift, uGain;
uniform vec2 uOut;        // (the composite takes nothing from the words)
uniform vec4 uSSR;        // water in the realm (1: the nearby forms reflected), the reflection's reach (m), -, -
uniform vec4 uCeil;       // the light ceiling (the world's own light on the skies with light words, the same everywhere, no words input): x the ceiling (OKLab L; 2: off), y its knee
uniform vec4 uMi;         // the cloud about the eye coming out: x -1 (worked out per pixel; 0: none), y the cloud (uIn.x), z the way out (uIn.w); w the scene's samples a pixel where it has them (0: none; its alpha the depth's code)
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
float zc(float z) { return z >= 5.9e4 ? 1.0 : 0.5 + 0.5 * clamp(log2(max(z, 1.0)) / 16.0, 0.0, 1.0); }   // (a half-resolution depth's code, as zcode() codes the scene's)
void main() {
  vec2 px = gl_FragCoord.xy, uv = px / uOut;
  vec3 c = vec3(0.0); int n = int(uSc.z);
  if (n > 1) { for (int j = 0; j < 4; j++) for (int i = 0; i < 4; i++) { if (i >= n || j >= n) continue; c += texelFetch(uScene, ivec2(floor(px) * uSc.z) + ivec2(i, j), 0).rgb; } c /= uSc.z * uSc.z; }
  else if (uSc.w > 0.5) c = fxaa(uv * uSc.xy);
  else c = texture(uScene, uv * uSc.xy).rgb;
  vec4 cl = vec4(0.0);   // (the clouds: brought up below)
  bool lay = false; vec3 cLay = vec3(0.0);   // (the cloud laid over a pixel's near and far samples apart, below)
  float dz = texelFetch(uDepth, min(ivec2(floor(uv * uSc.xy * vec2(textureSize(uDepth, 0)))), textureSize(uDepth, 0) - 1), 0).r;
  float zl = dz >= 1.0 ? 6.0e4 : 2.0 * uProj.z * uProj.w / (uProj.w + uProj.z - (dz * 2.0 - 1.0) * (uProj.w - uProj.z));
#ifndef NO_WATER
  // water (the scene's alpha under 1: its reflected share): the nearby forms seen in its reflection, put over the sky
  // the water shader reflected there (a short march of the reflected ray against the scene's depth, screen-space)
  if (uSSR.x > 0.5 && zl < 5.0e4) {
    vec2 dsz = vec2(textureSize(uDepth, 0));
    float wa = texelFetch(uScene, min(ivec2(floor(uv * uSc.xy * dsz)), ivec2(dsz) - 1), 0).a;
    if (wa < 0.495) {   // (water's alpha 0.49 (1 - F); every other fragment's the depth's code, 0.5 and over)
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
  /* where the scene has its samples, the last frame's scene mixed in at half wherever it shows the same surface: each
     pixel's point (its resolved depth) seen from where the camera was, read there from the last frame's scene (the
     twin, uSceneH), taken only where that frame's depth code there is the point's own (within 0.008: a depth within
     19%, so nothing that moved on its own nor what stood behind an edge is taken) and held within this frame's 3 x 3
     (nothing else of the last frame can come back). The four samples a pixel see a small form at another place among
     them in each frame, so its edge is the mean of eight: a pale pebble's tip on the sand in a dune's shade lights a
     pixel wholly for one frame and is gone the next (Chromium's still view: 2.89 blinks a frame against the 4x
     reference's 0.89). The sky (code 1) and water (under 0.5) are left alone (but the sky at a rim, below); the clouds
     are laid over it after (the layering below takes the pixel's own frame, cR, and its own history) */
  vec3 cR = c;
  if (uStb > 0.5 && uHC.w > 0.5 && n <= 1) {
    ivec2 ssz0 = textureSize(uScene, 0), ip0 = min(ivec2(floor(uv * uSc.xy * vec2(ssz0))), ssz0 - 1);
    float A0 = texelFetch(uScene, ip0, 0).a;
    if (A0 >= 0.5) {
      /* and at a rim too: where this frame's 3 x 3 holds two depths (an outline: a floating rock before the sky or a
         farther rock, a sliver of sky between two; the sky's pixels at the rim included) the last frame's pixel is
         taken though its code is not the point's own (the rim's samples go in or out), held within this frame's 3 x 3
         all the same: four samples a pixel step a rim pixel by a quarter of the edge's contrast (25 codes between a navy
         rock and the sky) as one sample goes in or out, and a pixel the edge brushes steps up and back; mixed at half
         with the frame before, the step is halved (1:1 pixels, 1440 x 900: 2.83 -> 0.83 blinks a frame with the rock's
         pixels alone, the sky's added below; the 4x reference's 0) */
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
    // the half-resolution clouds brought up edge-aware: across an edge of the land (a landmark against what stands
    // behind it, the land against the sky) each of the 2x2 weighted by how near its depth is to this pixel's, so no
    // cloud bleeds across it; over an even surface (the 2x2's depths, interpolated, within 5% of this pixel's) not by
    // depth (weighted by depth everywhere, and as steeply, the sea, whose depth changes from one pixel to the next,
    // takes the nearest texel: the clouds' edges drawn in half-resolution stairs that crawl and blink as the view moves)
    vec2 hp = uv * uClS.zw - 0.5, f = fract(hp); ivec2 h0 = ivec2(floor(hp));
    /* over an even surface the half-resolution clouds are brought up by a cubic, not bilinear: a bilinear ramp between
       half-resolution texels moves in periodic kinks as an edge slides across them, which the 4x reference does not
       show (WebKit, the cloud-edge film at 42 m/s, 491x668: the moving silhouettes' excess p99 1.156 codes with
       bilinear, 0.799 with a B-spline; its blinks at 6 codes 199 a million pixels against 78). The four bilinear reads
       here (a cubic B-spline's, GPU Gems 2 ch. 20) gate the work below on the 4x4's own reach: gated on a plain
       bilinear read (the 2x2), where the 4x4 reaches a cloud the 2x2 does not, its tail is cut, and the cut moves with
       the half-resolution grid (gating on the 4x4 takes the edge film's blocks over 1 code from 41 to 34). And the
       cubic is taken only where its whole 4x4 lies on one surface: each of its outer twelve texels' depth within 5% of
       the plane the inner 2x2's depths make (a smooth slope, the sea toward the horizon, passes; an edge does not),
       else the depth-weighted 2x2 (outer texels on a dune below a far cloud draw a stepped light line inside the cloud
       just above the crest, the 2x2 alone being all sky).
       The depths are compared as far as a cloud can stand (CLZ, 8 km: no realm streams a cloud beyond its cells'
       reach, ABOVE's 3.8 km and DUNES' 5.2 km radius and a cell beyond), so what lies behind every cloud is one
       surface: else the far sea and the sky behind a tower's edge at the horizon are two to the test (sea at 10-40 km,
       sky at 60), and the edge goes from the cubic to the 2x2 and back as the horizon slides across the pixels
       (WebKit, 491 x 1065: three points on the towers' edges at the horizon blinked 5-9 times in 24 frames, the
       reference never) */
    vec2 tsz = vec2(textureSize(uCloud, 0)), b0 = (1.0 - f) * (1.0 - f) * (1.0 - f) / 6.0, b1 = (4.0 - 6.0 * f * f + 3.0 * f * f * f) / 6.0, b3 = f * f * f / 6.0, b2 = 1.0 - b0 - b1 - b3;
    vec2 g0 = b0 + b1, g1 = b2 + b3, o0 = (vec2(h0) + 0.5 - 1.0 + b1 / g0) / tsz, o1 = (vec2(h0) + 0.5 + 1.0 + b3 / g1) / tsz, lm = lim(uCloud, uClS.xy);
    vec4 tA = texture(uCloud, min(o0, lm)), tB = texture(uCloud, min(vec2(o1.x, o0.y), lm)), tC = texture(uCloud, min(vec2(o0.x, o1.y), lm)), tD = texture(uCloud, min(o1, lm));
    /* brought up by a Catmull-Rom (interpolating: a detail a quarter of the half resolution's rate keeps its
       contrast, which a B-spline cuts by about 40%), clamped to the range of the inner 2x2 it interpolates (no ring,
       no overshoot: never above the brightest texel there, never below the darkest; so never above the light ceiling
       either). The four reads above are only the gate's (the 4x4's reach) */
    vec4 cS; { vec2 w0c = f * (-0.5 + f * (1.0 - 0.5 * f)), w1c = 1.0 + f * f * (-2.5 + 1.5 * f), w2c = f * (0.5 + f * (2.0 - 1.5 * f)), w3c = f * f * (-0.5 + 0.5 * f);
      ivec2 qm = ivec2(uClS.zw) - 1; vec4 s4 = vec4(0.0), mn4 = vec4(1e9), mx4 = vec4(-1e9);
      for (int j = 0; j < 4; j++) { float wy = j == 0 ? w0c.y : (j == 1 ? w1c.y : (j == 2 ? w2c.y : w3c.y));
        for (int i = 0; i < 4; i++) { float wx = i == 0 ? w0c.x : (i == 1 ? w1c.x : (i == 2 ? w2c.x : w3c.x));
          vec4 q4 = texelFetch(uCloud, clamp(h0 + ivec2(i - 1, j - 1), ivec2(0), qm), 0); s4 += q4 * (wx * wy);
          if (i >= 1 && i <= 2 && j >= 1 && j <= 2) { mn4 = min(mn4, q4); mx4 = max(mx4, q4); } } }
      cS = clamp(s4, mn4, mx4); }
    cl = cS;
    /* km: the share of a cloud about the eye, brought up plainly where it stands. There is none (no passages), so km
       is 0 and every pixel takes the depth-weighted 2x2 below */
    float km = 0.0;   // (no cloud about the eye: there are no passages)
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
      /* a pixel standing farther than every texel of its 2x2 (all its samples on the sky behind a floating rock's rim,
         its texels the rock's: the half-resolution depth keeps the nearer) takes the cloud of the texels about it at its
         own depth, as the layering takes its far part's: those texels' cloud is what stands before the rock, so with it
         the cloud behind (a tower) goes missing and the pixel shows the bare sky (pale, 177-179 codes, against the
         tower's lavender 123-142, every other frame as the rim's samples go in and out: Chromium's rim blinks) */
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
      cl = mix(cS, cW, smoothstep(0.05, 0.2, ev) * (1.0 - km));   // (the Catmull-Rom over an even surface, the depth-weighted 2x2 across the land's edges; and plainly where the cloud about the eye stands)
    }
    /* where the scene has its samples and a pixel's samples stand at two depths (its alpha, their depth codes
       averaged, unlike the code of its one resolved depth), the cloud is laid over each part apart: the share of near
       samples cov from the codes of the nearest and farthest half-resolution depths about it (the 4 x 4), the cloud
       before the near ones (the texels at the near depth) and before the far ones (at the far depth), and each part's
       own colour from the 3 x 3 pixels most near and most far (their residual shared, so the pixel's own colour is
       kept). Taken as wholly near or wholly far by its one depth sample, such a pixel makes the floating rocks'
       outlines against a bright tower step and crawl (491 x 1065: the moving reading 1.179) */
#ifndef NO_WATER
    if (uLay > 0.5 && uMi.w > 0.5 && n <= 1 && uSSR.x < 0.5 && km < 0.001 && max(max(tA.a, tB.a), max(tC.a, tD.a)) > 0.002) {
#else
    if (uLay > 0.5 && uMi.w > 0.5 && n <= 1 && km < 0.001 && max(max(tA.a, tB.a), max(tC.a, tD.a)) > 0.002) {
#endif
      ivec2 ssz = textureSize(uScene, 0), ip = min(ivec2(floor(uv * uSc.xy * vec2(ssz))), ssz - 1);
      float A = texelFetch(uScene, ip, 0).a;
      if (A >= 0.5 && abs(A - zc(zl)) > 0.003) {
        ivec2 qmax = ivec2(uClS.zw) - 1; float cn = 2.0, cf = -1.0; float cq[16];
        for (int j = -1; j <= 2; j++) for (int i = -1; i <= 2; i++) { float k = zc(linFetch(uLinD, clamp(h0 + ivec2(i, j), ivec2(0), qmax))); cq[(j + 1) * 4 + i + 1] = k; cn = min(cn, k); }
        // the far part: the resolved sample's own depth where it is the far one, else the nearest texel standing far of
        // the near part (not the farthest of the sixteen: below a floating rock the sea stands between it and the sky)
        float zs = zc(zl), dbest = 1e9;
        if (zs > cn + 0.02) cf = zs;
        else for (int j = -1; j <= 2; j++) for (int i = -1; i <= 2; i++) { float k = cq[(j + 1) * 4 + i + 1]; vec2 dq = vec2(float(i), float(j)) - f; float dd = dot(dq, dq); if (k > cn + 0.02 && dd < dbest) { dbest = dd; cf = k; } }
        if (cf - cn > 0.02 && cn < zc(CLZ) && A > cn + 0.002 && A < cf + 0.002) {   // (the near part within a cloud's reach: beyond it the clouds stand before both parts alike)
          float cov = clamp((cf - A) / (cf - cn), 0.0, 1.0);
          vec4 sN = vec4(0.0), sF = vec4(0.0); float wN = 0.0, wF = 0.0;
          for (int j = -1; j <= 2; j++) for (int i = -1; i <= 2; i++) {
            float k = cq[(j + 1) * 4 + i + 1]; vec2 dq = vec2(float(i), float(j)) - f; float wb = 1.0 / (0.25 + dot(dq, dq));
            vec4 cv = texelFetch(uCloud, clamp(h0 + ivec2(i, j), ivec2(0), qmax), 0);
            if (k < cn + 0.01) { sN += cv * wb; wN += wb; }
            if (abs(k - cf) < 0.01) { sF += cv * wb; wF += wb; }
          }
          vec4 clN = sN / wN, clF = wF > 1e-6 ? sF / wF : cS;   // (no texel at the far part's own depth (cf, the resolved sample's code): the cloud as brought up for the pixel, never 0 / 0)
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
              // the last frame's pixel there read as it is (its texel, not a bilinear blend of the rim's codes: across
              // the rim a blend takes the sky's code in, under-reads the near share, and the mix pulls the pixel toward
              // the far part: a rim pixel swings 56 -> 78 -> 56 codes, its samples one in and out)
              vec4 hs = texelFetch(uSceneH, clamp(ivec2(floor((hq.xy / hq.w * 0.5 + 0.5) * uSc.xy * vec2(ssz))), ivec2(0), ssz - 1), 0);
              if (hs.a >= 0.5) { cov = 0.5 * cov + 0.5 * clamp((cf - hs.a) / (cf - cn), 0.0, 1.0); cc = 0.5 * cR + 0.5 * clamp(hs.rgb, min(rE, bE), max(rE, bE)); }
            }
          }
          vec3 dl = cc - (cov * rE + (1.0 - cov) * bE); rE = max(rE + dl, 0.0); bE = max(bE + dl, 0.0);
          cLay = cov * (min(rE, vec3(1.0 + 3.0 * (1.0 - clN.a))) * (1.0 - clN.a) + clN.rgb) + (1.0 - cov) * (min(bE, vec3(1.0 + 3.0 * (1.0 - clF.a))) * (1.0 - clF.a) + clF.rgb);
          cl = mix(clF, clN, cov); lay = true;
        }
      }
    }
  }
  // (under cloud the scene's light is held to 1: a disc behind an opaque cloud never prints through)
  c = lay ? cLay : min(c, vec3(1.0 + 3.0 * (1.0 - cl.a))) * (1.0 - cl.a) + cl.rgb;
  c += texture(uBloom, min(uv * uBlK.zw, lim(uBloom, uBlK.zw))).rgb * uBlK.x;
  c += texture(uShaft, min(uv * uShK.xy, lim(uShaft, uShK.xy))).rgb * uShC * uBlK.y * smoothstep(150.0, 2500.0, zl) * (1.0 - 0.7 * cl.a);
  c *= uShK.z;
  c = uLift + c * uGain;
  float y0 = lumi(c); c = max(mix(vec3(y0), c, uShK.w), 0.0);
  c = shoulder(c);
  // the light ceiling: what passes K = ceiling - knee eased under the ceiling by a soft shoulder in OKLab L, the
  // colour scaled by the cube of the L ratio (hue and chroma's direction kept: L(s c) = s^(1/3) L(c)); never above it
  if (uCeil.x < 1.5) {
    vec3 lms = pow(max(vec3(dot(c, vec3(0.4122214708, 0.5363325363, 0.0514459929)), dot(c, vec3(0.2119034982, 0.6806995451, 0.1073969566)), dot(c, vec3(0.0883024619, 0.2817188376, 0.6299787005))), vec3(0.0)), vec3(1.0 / 3.0));
    float Lk = dot(lms, vec3(0.2104542553, 0.7936177850, -0.0040720468)), Kc = uCeil.x - uCeil.y;
    if (Lk > Kc) c *= pow((Kc + uCeil.y * (1.0 - exp(-(Lk - Kc) / uCeil.y))) / Lk, 3.0);
  }
  c = clamp(c, 0.0, 1.0);
  // W7-TAIL-BEGIN (the composite takes nothing from the words (no mask, floor, gain or toe), so the frame with the
  // words' machinery on and off is the same program on the same inputs; CI's rule 7 fails if any words input comes
  // into the composite, and its unit test runs this tail over random grounds)
  vec3 s = enc(clamp(c, 0.0, 1.0));
  // the dither: one 8-bit step (uniform, -0.5 .. +0.5 of a code), in one fixed R2 pattern on the window: no bands in
  // the 8 bits, and nothing that changes from one frame to the next (a triangular dither two codes wide, shifted every
  // frame, fizzes over every even colour: a passage's cloud, its cover, the sky)
  s += (fract(dot(px, vec2(0.7548776662, 0.5698402910))) - 0.5) / 255.0;
  oC = vec4(s, 1.0);
  // W7-TAIL-END
}