  /* ---------------------------------------------------------------- shaders: the scene */
  /* (E1.1, item 7) each opaque fragment's depth, coded into the scene's alpha for the composite: 0.5 + 0.5 log2(linear
     depth, m) / 16 (1 m .. 65 km), 1 on the far plane (the sky); water keeps its reflected share below 0.5 (0.49 (1 -
     F)). The scene's samples are averaged by the resolve, so where a pixel's samples stand at two depths (a floating
     rock's outline against a cloud) its alpha says how many stand near: the composite lays the cloud behind over the far
     ones only (FS_COMP). The depth resolve keeps one sample, so Fix 3's composite took each such pixel as wholly rock or
     wholly cloud, and the outline crawled (verify-gates-3: 29% of the edge pixels in between, the reference 51%) */
  var ZCODE = `
float zcode() {
  float d = gl_FragCoord.z; if (d >= 0.999999) return 1.0;
  float n = uProj.z, f = uProj.w, z = d * 2.0 - 1.0, lz = 2.0 * n * f / (f + n - z * (f - n));
  return lz >= 5.9e4 ? 1.0 : 0.5 + 0.5 * clamp(log2(max(lz, 1.0)) / 16.0, 0.0, 1.0);
}
float sceneA() { return gWater > 0.0 ? 0.49 * (1.0 - gWater) : zcode(); }
`;
  function VS_TERRAIN(H, G) {   // (world6 fix: G, a surface's gap function: its height over another surface, passed to its shading as gTX)
    return `
layout(location = 0) in vec2 aG;
uniform vec4 uLev;   // ring origin x, z; cell size; half the cells across
centroid out vec3 vW; centroid out vec3 vN; out float vX;
void main() {
  vec2 w = uLev.xy + aG * uLev.z;
  float d = max(abs(w.x - uCam.x), abs(w.y - uCam.z));
  float m = clamp((d - (uLev.w - 11.0) * uLev.z) / (8.5 * uLev.z), 0.0, 1.0);
  w -= mod(aG, 2.0) * uLev.z * m;
  gLodD = length(w - uCam.xz);
  vec3 hd = ${H}(w);
  vX = ${G ? G + '(w, hd.x)' : '1e4'};
  vW = vec3(w.x, hd.x, w.y); vN = vec3(-hd.y, 1.0, -hd.z);
  gl_Position = uVP * vec4(vW - uCam, 1.0);
}`;
  }
  /* (fast500 lane G) the split height: the land's height (Hd, HdGap's A_Hd) evaluated by four small fragment passes,
     one RGBA32F texel a point, instead of inside the land's vertex program and the probe. The passes call the realm's
     own functions unchanged (kitW4, dunes, siteOf / basinOf / plateauOf, ridges, A_Hd); only where they are evaluated
     moves. The point a texel stands for: uHsrc 0, a clipmap vertex (x = i, y = level x 97 + j: placed and morphed as the
     land's vertex stage places it, gLodD its distance from the camera); 1, the probe's point (uTex); 2, the probe's grid
     (uGCw), gLodD 0 for both, as in the probe. Then the land's vertex program and the probe read the passes' texels and
     do the last adds as Hd, HdGap and HdProbe do: the same fp32 operations, in the same order (the gate: today's land
     VS against this, by transform feedback, bit-identical heights, positions and gaps). The point: the compile. One
     program holding all of Hd took 2.3 s (land VS) and 1.6 s (probe FS) on ANGLE-D3D11; the parts compile in parallel */
  var HP_PARTS = ['kit', 'dunes', 'sites', 'ridges'];
  /* where the split is made: ANGLE on Direct3D11 with an NVIDIA GPU, the one maker whose heights were read back
     bit-exact against today's land program (the shipped DXBC lets drivers reorder arithmetic, so exactness is claimed
     only where read back). Elsewhere (AMD, Intel, Qualcomm, Metal, Linux, Android) today's land program. Per device,
     so the return visit's program cache holds */
  function HP_DEV(r) { return /^ANGLE \(NVIDIA[,\s]/.test(r || '') && /Direct3D11/.test(r || ''); }
  var HP_GRIDW = `
uniform int uHsrc;   // 0 the clipmap's vertices (uLevA), 1 the probe's points (uTex), 2 the probe's grid (uGCw)
uniform vec4 uLevA[10]; uniform vec4 uGCw; uniform highp sampler2D uTex;
uniform highp sampler2D uHP0, uHP2;
layout(location = 0) out vec4 o0; layout(location = 1) out vec4 o1;
ivec2 gq; vec2 gw;
void gridW() {
  gq = ivec2(gl_FragCoord.xy);
  if (uHsrc == 0) {
    int l = gq.y / 97; vec2 aG = vec2(float(gq.x), float(gq.y - l * 97)); vec4 L = uLevA[l];
    vec2 w = L.xy + aG * L.z;
    float d = max(abs(w.x - uCam.x), abs(w.y - uCam.z));
    float m = clamp((d - (L.w - 11.0) * L.z) / (8.5 * L.z), 0.0, 1.0);
    w -= mod(aG, 2.0) * L.z * m;
    gLodD = length(w - uCam.xz); gw = w;
  } else gw = uHsrc == 2 ? uGCw.xy + gl_FragCoord.xy * uGCw.z : texelFetch(uTex, gq, 0).xy;
}
`;
  var HP_MAIN = {
    kit: 'void main() { gridW(); vec3 wD, wC, lv, sk; kitW4(gw, wD, wC, lv, sk); o0 = vec4(wD, lv.x); o1 = vec4(sk, wC.x); }',
    dunes: 'void main() { gridW(); gKD = texelFetch(uHP0, gq, 0).xyz; o0 = vec4(dunes(gw), 0.0); o1 = vec4(0.0); }',
    sites: 'void main() { gridW(); o0 = vec4(D_HdSites(gw, texelFetch(uHP2, gq, 0).xyz), 0.0); o1 = vec4(0.0); }',
    ridges: 'void main() { gridW(); o0 = vec4(ridges(gw), A_Hd(gw).x); o1 = vec4(0.0); }',
    /* the probe's own two: today's probe keeps only the height live (h.x; its slopes are dead), so FXC fuses its
       arithmetic as it does when only .x is written; the land's passes (every channel live, as the land VS) differ
       from it by an ulp at 0.4% of points. Written .x only, the probe's passes read back bit-identical to today's probe */
    sitesX: 'void main() { gridW(); o0 = vec4(D_HdSites(gw, texelFetch(uHP2, gq, 0).xyz).x, 0.0, 0.0, 0.0); o1 = vec4(0.0); }',
    ridgesX: 'void main() { gridW(); o0 = vec4(ridges(gw).x, 0.0, 0.0, A_Hd(gw).x); o1 = vec4(0.0); }'
  };
  /* HP_LAND: the land VS read the passes too. Off: its slopes (the normals) cannot come out bit-identical through any
     texture boundary (today's one program fuses and reorders across D_Hd - sk; read back: 1 ulp at ~25% of vertices,
     whatever the cut), so only the probe is split, and the land keeps today's program */
  var HP_LAND = true;   // (the owner, 2026-11-05: the land split's 1-ulp slopes accepted for the speed, on the split's devices only)
  var HP_PROGS = HP_LAND ? ['kit', 'dunes', 'sites', 'ridges', 'sitesX', 'ridgesX'] : ['kit', 'dunes', 'sitesX', 'ridgesX'];   // (P.hp's order: the clipmap runs 0-3, the probe the last four's kit, dunes, sitesX, ridgesX)
  var HP_PORD = HP_LAND ? [0, 1, 4, 5] : [0, 1, 2, 3];
  /* the sites' part of D_Hd (its basins and plateaux over the 3x3 sites), taken from the realm's own D_Hd as it ships
     (today's, or a rewrite of its loops): its body between `vec3 h = dunes(p);` and `return h + ridges(p);`, the h
     handed in. null when D_Hd is not of that shape (the split is then not made: today's programs) */
  function HP_SITES_FN(g) {
    var a = g.indexOf('vec3 D_Hd(vec2 p) {'); if (a < 0 || g.indexOf('vec3 D_Hd(vec2 p) {', a + 1) >= 0) return null;
    var e = g.indexOf('\n}', a); if (e < 0) return null;
    var body = g.slice(a + 'vec3 D_Hd(vec2 p) {'.length, e), A = '\n  vec3 h = dunes(p);\n', Z = '\n  return h + ridges(p);';
    if (body.indexOf(A) !== 0 || body.lastIndexOf(Z) !== body.length - Z.length || body.split(A).length !== 2 || body.split(Z).length !== 2) return null;
    return '\nvec3 D_HdSites(vec2 p, vec3 h) {\n' + body.slice(A.length, body.length - Z.length) + '\n  return h;\n}\n';
  }
  function VS_TERRAIN_SPLIT(G) {   // (lane G) VS_TERRAIN with the height read from the passes (Hd - sk, HdGap's terms)
    return `
layout(location = 0) in vec2 aG;
uniform vec4 uLev;   // ring origin x, z; cell size; half the cells across
uniform int uLvl;    // the level: its rows in the passes' texels
uniform highp sampler2D uHP0, uHP1, uHP3, uHP4;   // kit (wD, lv), kit (sk, wC), the sites' h, the ridges (+ A_Hd)
centroid out vec3 vW; centroid out vec3 vN; out float vX;
void main() {
  vec2 w = uLev.xy + aG * uLev.z;
  float d = max(abs(w.x - uCam.x), abs(w.y - uCam.z));
  float m = clamp((d - (uLev.w - 11.0) * uLev.z) / (8.5 * uLev.z), 0.0, 1.0);
  w -= mod(aG, 2.0) * uLev.z * m;
  ivec2 q = ivec2(aG) + ivec2(0, uLvl * 97);
  vec4 k0 = texelFetch(uHP0, q, 0), k1 = texelFetch(uHP1, q, 0), s = texelFetch(uHP3, q, 0), r = texelFetch(uHP4, q, 0);
  vec3 hd = (s.xyz + r.xyz) - k1.xyz;
  vX = ${G ? 'hd.x - k0.w > 140.0 ? 1e4 : hd.x - (k0.w + r.w * (0.4 + 0.6 * k1.w))' : '1e4'};
  vW = vec3(w.x, hd.x, w.y); vN = vec3(-hd.y, 1.0, -hd.z);
  gl_Position = uVP * vec4(vW - uCam, 1.0);
}`;
  }
  var FS_PROBE_SPLIT = `
uniform int uPm; uniform vec4 uGCw; uniform highp sampler2D uHP0, uHP1, uHP3, uHP4; out vec4 oC;
vec4 pack(float h) { float v = clamp((h + 4096.0) / 8192.0, 0.0, 0.99999); vec4 e = fract(v * vec4(1.0, 255.0, 65025.0, 16581375.0)); return e - e.yzww * vec4(1.0 / 255.0, 1.0 / 255.0, 1.0 / 255.0, 0.0); }
void main() {
  ivec2 q = ivec2(gl_FragCoord.xy); bool cam = uPm == 1 || uPm == 3;
  vec4 k0 = texelFetch(uHP0, q, 0), k1 = texelFetch(uHP1, q, 0), s = texelFetch(uHP3, q, 0), r = texelFetch(uHP4, q, 0);
  float h = ((s.xyz + r.xyz) - k1.xyz).x;
  if (cam) h = max(h, k0.w + r.w * (0.4 + 0.6 * k1.w));
#ifdef GC_PACKED
  oC = pack(h);
#else
  oC = uPm == 2 ? vec4(h, 0.0, 0.0, 1.0) : pack(h);
#endif
}`;
  function FS_TERRAIN(H, S) {
    return ZCODE + `
centroid in vec3 vW; centroid in vec3 vN; in float vX; out vec4 oC;
void main() {
  vec3 n = normalize(vN);
#ifdef HAS_GTX
  gTX = vX;
#endif
  vec3 v = vW - uCam;
  float t = length(v); vec3 rd = v / t;
  float fp = t * 2.0 * uProj.y / uRes.y;
  vec3 c = ${S}(vW, n, rd, t, fp);
  if (uDbg == 2) { oC = vec4(vec3(clamp(dot(n, uSun), 0.0, 1.0)), 1.0); return; }
  if (uDbg == 3) { oC = vec4(n * 0.5 + 0.5, 1.0); return; }
  oC = vec4(uDbg == 1 ? c : atmos(c, rd, t), sceneA());   // (alpha: the depth's code, or water's reflected share under 0.5: E1.1)
}`;
  }
  /* landmarks: a cell's mesh, its vertices in the world already (seated); the colour's bytes hold half the value and
     the realm's material code, the spare byte its emission; a cell coming into being rises out of the haze (uFade) */
  var VS_LANDMARK = `
layout(location = 0) in vec3 aP; layout(location = 1) in vec3 aN; layout(location = 2) in vec4 aC; layout(location = 3) in float aY; layout(location = 4) in float aE;
centroid out vec3 vW; centroid out vec3 vN; centroid out vec4 vC; centroid out float vY; centroid out vec2 vE;
void main() {
  vW = aP; vN = aN; vC = vec4(aC.rgb * 2.0, floor(aC.a * 255.0 + 0.5)); vY = aY; vE = vec2(aE * 15.9375, 0.0);
  gl_Position = uVP * vec4(vW - uCam, 1.0);
}`;
  /* a set's instances: one mesh, many placements (a cell's trunks, pillars, lanterns): each its place and seat, its turn
     (and a slow spin), its scale, a tilt, a tint, its emission's share, a bob; the mesh's vertices are its local space
     (the base at y = 0) */
  var VS_LANDMARK_INST = `
layout(location = 0) in vec3 aP; layout(location = 1) in vec3 aN; layout(location = 2) in vec4 aC; layout(location = 3) in float aY; layout(location = 4) in float aE;
layout(location = 5) in vec4 iA;   // x, its seat (y), z, its turn (rad)
layout(location = 6) in vec4 iB;   // scale (x, y, z), its phase (0 .. 1)
layout(location = 7) in vec4 iC;   // tint (r, g, b: times the mesh's colours), its emission's share (times the mesh's own)
layout(location = 8) in vec4 iD;   // tilt about x and z (rad), a bob (m), the bob's rate (rad/s)
layout(location = 9) in vec4 iE;   // its spin (rad/s), -, -, -
centroid out vec3 vW; centroid out vec3 vN; centroid out vec4 vC; centroid out float vY; centroid out vec2 vE;
void main() {
  float a = iA.w + iE.x * uT, ca = cos(a), sa = sin(a), cx = cos(iD.x), sx = sin(iD.x), cz = cos(iD.y), sz = sin(iD.y);
  mat3 R = mat3(ca, 0.0, -sa, 0.0, 1.0, 0.0, sa, 0.0, ca) * mat3(1.0, 0.0, 0.0, 0.0, cx, sx, 0.0, -sx, cx) * mat3(cz, sz, 0.0, -sz, cz, 0.0, 0.0, 0.0, 1.0);
  vec3 lp = aP * iB.xyz;
  vW = iA.xyz + R * lp + vec3(0.0, iD.z * sin(uT * iD.w + iB.w * 6.2831853), 0.0);
  vN = R * (aN / iB.xyz);
  vC = vec4(aC.rgb * 2.0 * iC.rgb, floor(aC.a * 255.0 + 0.5)); vY = lp.y; vE = vec2(aE * 15.9375 * iC.w, iB.w);
  gl_Position = uVP * vec4(vW - uCam, 1.0);
}`;
  function FS_LANDMARK(S) {
    return ZCODE + `
uniform float uFade;
centroid in vec3 vW; centroid in vec3 vN; centroid in vec4 vC; centroid in float vY; centroid in vec2 vE; out vec4 oC;
void main() {
  vec3 v = vW - uCam; float t = length(v); vec3 rd = v / t;
  vec3 n = normalize(vN); if (dot(n, rd) > 0.0) n = -n;
  float fp = t * 2.0 * uProj.y / uRes.y;
  gEmit = vE.x; gPhase = vE.y;
  vec3 c = ${S}(vW, n, rd, t, fp, vC, vY);
#ifdef EMIT_HOOK
  gEmit = emitMod(vW, vC, gEmit, gPhase);
#endif
  if (gEmit > 0.0) c += vC.rgb * gEmit;
  vec3 o = atmos(c, rd, t);
  if (uFade < 0.999) o = mix(atmos(c, rd, 3.0e4), o, uFade);
  oC = vec4(o, sceneA());
}`;
  }
  /* scatter: one instance per cell of a grid around the camera; the cell's hash decides if, where, how big */
  var VS_SCATTER = `
uniform float uPxK;   // (E1.1) this window's pixels a pixel of the display's world (1; 4 in G0's 4x supersampled reference): every pixel-size floor and fade is in the display's pixels, so a supersampled frame is the same scene drawn finer
layout(location = 0) in vec3 aP; layout(location = 1) in vec3 aN; layout(location = 2) in vec4 aC; layout(location = 3) in float aY; layout(location = 4) in float aE;
uniform vec4 uSc;    // cell size, cells across, density, salt
uniform vec4 uSc2;   // scale min, max, sink (fraction of size), tilt (rad)
uniform vec4 uSc3;   // -, height stretch, -, -
centroid out vec3 vW; centroid out vec3 vN; centroid out vec4 vC; centroid out float vY; centroid out vec2 vE;
mat3 rotY(float a) { float c = cos(a), s = sin(a); return mat3(c, 0.0, -s, 0.0, 1.0, 0.0, s, 0.0, c); }
mat3 rotX(float a) { float c = cos(a), s = sin(a); return mat3(1.0, 0.0, 0.0, 0.0, c, s, 0.0, -s, c); }
mat3 rotZ(float a) { float c = cos(a), s = sin(a); return mat3(c, s, 0.0, -s, c, 0.0, 0.0, 0.0, 1.0); }
void main() {
  int n = int(uSc.y), id = gl_InstanceID;
  ivec2 base = ivec2(floor(uCam.xz / uSc.x));
  ivec2 cell = base + ivec2(id % n, id / n) - ivec2(n / 2);
  uint h = ih(ih2(cell + ivec2(int(uSc.w) * 7919, int(uSc.w) * 104729)) ^ uSalt);
  float r1 = hf(h), r2 = hf(ih(h + 1u)), r3 = hf(ih(h + 2u)), r4 = hf(ih(h + 3u)), r5 = hf(ih(h + 4u)), r6 = hf(ih(h + 5u)), r7 = hf(ih(h + 6u));
  vec2 pos = (vec2(cell) + vec2(r1, r2)) * uSc.x;
  float dens = uSc.z * scatterDensity(pos, int(uSc.w));
  float keep = step(r3, dens);
  vec2 dd = abs(pos - uCam.xz) / (float(n) * 0.5 * uSc.x);
  float fade = 1.0 - smoothstep(0.72, 0.97, max(dd.x, dd.y));
  float gy = groundH(pos);
  // (never a stone under the camera's nose: near it and low under it, they shrink away)
  float near = mix(1.0, smoothstep(5.0, 13.0, length(pos - uCam.xz)), step(uCam.y - gy, 10.0));
  float s = mix(uSc2.x, uSc2.y, r4 * r4) * keep * fade * near;
  // (round E1 Fix 3, G0) a stone smaller on the window than about two pixels shrinks away: a pebble one or two pixels
  // across, light in a dune's shade, crawled and blinked across the pixels as the view moved (the still-view film's
  // blinks, 2.8 a frame against the 4x reference's 0.8 in Chromium), which four samples a pixel cannot hold
  float dz = max(dot(vec3(pos.x, gy, pos.y) - uCam, uCamF), 1.0), pxs = s * uRes.y / (dz * uProj.y);
  // (and one whose height on the window is under about two pixels: a flat pebble far off, seen low across the sand, is
  // a sliver a few pixels wide and one or two high that stepped from row to row and blinked (the dunes film at t 120:
  // 1.56 blinks a frame against the reference's 0.44). Its height there: what stands above the sand (the mesh's half
  // height, 0.6 of its size, stretched, less what is sunk) and its top's depth seen from above (twice its size by the
  // sine of the view's angle down to it)
  float sinE = clamp((uCam.y - gy) / length(vec3(pos.x, gy, pos.y) - uCam), 0.0, 1.0);
  float pxv = pxs * (max(0.6 * mix(1.0, uSc3.y, r6) - uSc2.z, 0.12) + 2.0 * sinE);
  s *= smoothstep(1.0 * uPxK, 2.6 * uPxK, pxs) * smoothstep(1.2 * uPxK, 2.4 * uPxK, pxv);   // (E1.1: the sizes in the display's pixels, uPxK)
  mat3 R = rotY(r5 * 6.2831853) * rotX((r6 - 0.5) * uSc2.w) * rotZ((r7 - 0.5) * uSc2.w);
  vec3 sc = vec3(1.0, mix(1.0, uSc3.y, r6), 1.0) * s;
  vec3 lp = R * (aP * sc);
  vW = vec3(pos.x, gy - uSc2.z * s, pos.y) + lp;
  vN = R * (aN / max(sc, vec3(1e-4)));
  vC = vec4(aC.rgb * 2.0, floor(aC.a * 255.0 + 0.5)); vY = lp.y - uSc2.z * s; vE = vec2(aE * 15.9375, r7);
  gl_Position = s > 1e-4 ? uVP * vec4(vW - uCam, 1.0) : vec4(0.0, 0.0, -2.0, 1.0);
}`;
  /* particles in a volume that wraps around the camera (uPb.w, the kind): 0 grains blown across the ground (dim
     streaks; now and then a grain's facet turns to the sun and it glints), 1 motes (soft points of light drifting in
     the air, bright toward the sun; 2: about the camera's own height), 3 rain (streaks falling with the wind, each
     drop ending in a splash on the ground under it; gusts), 4 drifting things (petals, seeds, embers, spores,
     fireflies: carried by the wind, rising or sinking, wandering, tumbling or flickering, each its own life, in up to
     three colours) */
  var VS_PARTICLE = `
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
}`;
  var FS_PARTICLE = `
in vec4 vCol; in vec2 vQ; flat in float vKind; out vec4 oC;
void main() {
#ifndef NO_PKWX
  if (vKind > 2.5) {
    float a;
    if (vKind > 3.75) { vec2 q = vec2(vQ.x * 2.0 - 1.0, vQ.y); a = vCol.a * max(1.0 - dot(q, q), 0.0); a *= a; oC = vec4(vCol.rgb * a, a * 0.3); return; }
    if (vKind > 3.25) { vec2 q = vec2(vQ.x * 2.0 - 1.0, vQ.y); float r = length(q); a = vCol.a * exp(-(r - 0.7) * (r - 0.7) * 30.0) * step(r, 1.0); oC = vec4(vCol.rgb * a, a * 0.5); return; }
    a = vCol.a * (1.0 - vQ.y * vQ.y) * smoothstep(0.0, 0.3, vQ.x) * (1.0 - smoothstep(0.85, 1.0, vQ.x));
    oC = vec4(vCol.rgb * a, a * 0.6); return;
  }
#endif
  float q = 2.0 * vQ.x - 1.0;   // (squared by hand: pow of a negative base is undefined)
  float a = vKind > 0.5 ? vCol.a * (1.0 - vQ.y * vQ.y) * (1.0 - q * q) : vCol.a * (1.0 - vQ.y * vQ.y) * smoothstep(0.0, 0.35, vQ.x) * (0.4 + 0.6 * vQ.x);
  oC = vec4(vCol.rgb * a, a * (vKind > 0.5 ? 0.25 : 0.6));   // (mostly light added: a speck or a mote brightens what is behind it)
}`;
  /* creatures: one instanced draw a flock. Kinds (uFb.w): 1 birds wheeling (each its own orbit about the flock's
     drifting centre, beating and gliding, banking into the turn), 2 rays gliding (a slow wave running back along the
     wings), 3 moths and butterflies (small orbits about a light, a flutter in bursts, bobbing; their own light), 4
     jellies (upright bells drifting, pulsing: the bell narrows and shortens, rising a little on each pulse, threads
     trailing; their own light, drawn added: translucent), 5 floating caps (shallow domes hovering, bobbing, turning
     slowly, a ring of beads about the rim and a glow beneath, breathing). Members are laid out (uFd.z) on their orbits
     (0), up a helix (1: a chain of caps climbing beside a trunk), or still about the centre (2). */
  var VS_CREATURE = HEAD + FRAME_U + LIB + `
layout(location = 0) in vec4 aV;   // body space (x across, y up, z forward); w: the kind's weight (birds: 0 body, 1 wrist, 2 tip; rays: -1 - the span's share; moths: 1 fore wing, 2 hind wing; jellies: 1 + along a thread; caps: 1 bead, 2 underside)
uniform vec4 uFa, uFb, uFc;        // the flock: centre at u0 (x, y, z), u0; its drift (x, z per s), the orbit's radius, kind; wheel (rad/s), size (m), flap or pulse (Hz), height spread (m)
uniform vec4 uFd, uFe;             // a bob (m), its rate (rad/s), the layout (0 orbit, 1 helix, 2 still), -; the helix's radius (m), its step (rad), its rise a step (m), its turn (rad/s)
centroid out vec3 vW; centroid out vec3 vN; centroid out float vLit; centroid out float vGlow;
void main() {
  int i = gl_InstanceID; int kind = int(uFb.w + 0.5);
  uint h = ih(uint(i) * 2654435761u + uint(abs(uFa.w) * 13.0) + 77u);
  float r1 = hf(h), r2 = hf(ih(h + 1u)), r3 = hf(ih(h + 2u)), r4 = hf(ih(h + 3u)), r5 = hf(ih(h + 4u));
  float u = uT - 40.0 - uFa.w;
  vec3 ctr = uFa.xyz + vec3(uFb.x, 0.0, uFb.y) * u;
  float om = uFc.x * (0.8 + 0.4 * r1) * (r5 < 0.5 ? 1.0 : 0.92), rho = uFb.z * (0.3 + 0.7 * sqrt(r2)), th = r3 * 6.2831853 + om * u;
  float yy = uFc.w * (r4 - 0.5) + 0.12 * uFc.w * sin(u * 0.6 + r1 * 6.28);
  vec3 pos = ctr + vec3(rho * cos(th), yy, rho * sin(th));
  vec3 vel = vec3(uFb.x, 0.0, uFb.y) + rho * om * vec3(-sin(th), 0.0, cos(th)) + vec3(0.0, 0.07 * uFc.w * cos(u * 0.6 + r1 * 6.28), 0.0);
  if (uFd.z > 0.5) {
    if (uFd.z < 1.5) { float a = float(i) * uFe.y + uFe.w * u; pos = ctr + vec3(uFe.x * cos(a), float(i) * uFe.z, uFe.x * sin(a)); }
    else { float a = r3 * 6.2831853; pos = ctr + vec3(rho * cos(a), uFc.w * (r4 - 0.5), rho * sin(a)); }
    vel = vec3(uFb.x, 0.0, uFb.y) + vec3(1e-3, 0.0, 0.0);
  }
  if (uFd.x > 0.0) { pos.y += uFd.x * sin(u * uFd.y * (0.85 + 0.3 * r2) + r1 * 6.2831853); vel.y += uFd.x * uFd.y * cos(u * uFd.y + r1 * 6.2831853); }
  vec3 v = aV.xyz * uFc.y;
  vGlow = 0.0; vLit = r1;
  if (kind >= 4) {   // jellies and caps: upright, turning slowly about their own axis
    float yaw = r3 * 6.2831853 + u * (kind == 5 ? 0.06 : 0.1) * (r5 < 0.5 ? 1.0 : -1.0), cy = cos(yaw), sy = sin(yaw);
    vec3 nl;
    if (kind == 4) {
      float ph = fract(uFc.z * u + r4), p = smoothstep(0.0, 0.25, ph) * (1.0 - smoothstep(0.35, 1.0, ph));   // (the bell's pulse: quick in, slow out)
      pos.y += 0.35 * uFc.y * sin(6.2831853 * (uFc.z * u + r4) - 0.6);
      if (aV.w < 0.5) { v.xz *= 1.0 - 0.2 * p; v.y *= 1.0 - 0.15 * p; vGlow = 1.0; nl = normalize(aV.xyz * vec3(1.0, 1.5, 1.0) + vec3(0.0, 0.25, 0.0)); }
      else { float k = aV.w - 1.0; v.xz += 0.18 * uFc.y * k * vec2(sin(6.2831853 * uFc.z * u - k * 2.5 + r1 * 6.0), cos(6.2831853 * uFc.z * u * 0.8 - k * 2.0 + r2 * 6.0)); v.y *= 1.0 + 0.12 * p; vGlow = 0.6 * (1.0 - 0.5 * k); nl = vec3(0.0, 1.0, 0.0); }
    } else {
      vGlow = aV.w > 1.5 ? 0.6 : (aV.w > 0.5 ? 1.0 : 0.12);
      vGlow *= 1.0 + 0.1 * sin(u * (1.3 + 0.4 * r2) + r1 * 6.28);
      nl = aV.w > 1.5 ? vec3(0.0, -1.0, 0.0) : normalize(aV.xyz * vec3(1.0, 2.2, 1.0) + vec3(0.0, 0.2, 0.0));
    }
    vW = pos + vec3(cy * v.x + sy * v.z, v.y, -sy * v.x + cy * v.z);
    vN = vec3(cy * nl.x + sy * nl.z, nl.y, -sy * nl.x + cy * nl.z);
    gl_Position = uVP * vec4(vW - uCam, 1.0);
    return;
  }
  vec3 fw = normalize(vel + vec3(1e-4, 0.0, 0.0)), rt = normalize(cross(vec3(0.0, 1.0, 0.0), fw)), up = cross(fw, rt);
  float bank = clamp(-om * 0.45, -0.6, 0.6);
  vec3 rt2 = rt * cos(bank) + up * sin(bank), up2 = up * cos(bank) - rt * sin(bank);
  if (kind == 3) {
    // a moth: a flutter in bursts (the wings swing up to about 70 degrees over the back and down again), the hind
    // wings a little behind the fore; between bursts a short glide, the wings held up
    float burst = smoothstep(0.3, 0.55, gn(vec2(u * 0.6 + r1 * 19.0, r2 * 7.0)) + 0.5);
    float s0 = sin(6.2831853 * uFc.z * (0.9 + 0.2 * r4) * u + r5 * 6.28 - (aV.w > 1.5 ? 0.6 : 0.0));
    float a = mix(0.55, 0.45 + 0.75 * s0, burst), x = abs(v.x);
    v = vec3(sign(v.x) * x * cos(a), v.y + x * sin(a), v.z);
    vGlow = 1.0;
  } else if (aV.w >= 0.0) {
    // the beat: bursts of beating, then glides with the wings held a little up
    float burst = smoothstep(0.35, 0.6, gn(vec2(u * 0.35 + r1 * 19.0, r2 * 7.0)) + 0.5);
    float fl = mix(0.18, 0.75 * sin(6.2831853 * uFc.z * (0.9 + 0.2 * r4) * u + r5 * 6.28) + 0.05, burst);
    float a = fl * (aV.w > 1.5 ? 1.45 : 1.0) * min(aV.w, 1.0) + (aV.w > 1.5 ? 0.25 * fl : 0.0);
    float x = abs(v.x); v = vec3(sign(v.x) * x * cos(a), v.y + x * sin(a), v.z);
  } else {
    float sp = -aV.w - 1.0;
    v.y += uFc.y * 0.12 * sp * sin(6.2831853 * uFc.z * u - aV.z * 3.0 + r1 * 6.28);
  }
  vW = pos + rt2 * v.x + up2 * v.y + fw * v.z;
  vN = up2;
  gl_Position = uVP * vec4(vW - uCam, 1.0);
}`;
  var FS_CREATURE = HEAD + FRAME_U + LIB + ZCODE + `
uniform vec3 uCrL, uCrS, uCrE;   // lit and shaded colour; its own light (linear, HDR: moths, jellies, caps)
uniform float uCrA;              // drawn added (jellies: translucent light), else 0
uniform float uCrF;              // (world6 fix) how far in out of the haze (0: the air's far colour, 1: as seen)
centroid in vec3 vW; centroid in vec3 vN; centroid in float vLit; centroid in float vGlow; out vec4 oC;
void main() {
  vec3 v = vW - uCam; float t = length(v); vec3 rd = v / t;
  vec3 n = normalize(vN); if (dot(n, rd) > 0.0) n = -n;
  float dif = clamp(dot(n, uSun) * 0.6 + 0.4, 0.0, 1.0);
  vec3 c = mix(uCrS, uCrL, dif) * (0.92 + 0.16 * vLit);
  c += uCrL * 0.35 * pow(max(dot(rd, uSun), 0.0), 12.0);   // backlit: the wings glow at their edges
  if (uCrA > 0.5) {   // light added: a translucent bell, brighter at its rim, taken by the air
    float rim = 1.0 - abs(dot(n, rd));
    oC = vec4(uCrE * vGlow * (0.35 + 0.9 * rim * rim) * (1.0 - fogAmt(rd, t)) * (1.0 - hazeAmt(rd, t)), 0.0);
    return;
  }
  c += uCrE * vGlow;
  oC = vec4(mix(atmos(c, rd, 1.0e5), atmos(c, rd, t), uCrF), zcode());
}`;
  /* sand veils: thin sheets of sand blowing off the dunes' brinks in gusts (the realm's veilSpot moves each onto the
     nearest brink) */
  var VS_RIBBON = `
layout(location = 0) in vec2 aQ;   // x: 0 (at the brink) .. 1 (its downwind end), y: -1 .. 1 along the brink
uniform vec4 uRa;    // box (m), length (m), width along the brink (m), lift (m)
uniform vec3 uWind; uniform vec4 uPc;
uniform vec4 uRb;    // a gust's period (s), -, -, -
out vec4 vCol; out vec3 vW; out vec2 vQ;
void main() {
  int id = gl_InstanceID;
  uint h = ih(uint(id) * 2246822519u + 31u);
  float r1 = hf(h), r2 = hf(ih(h + 1u)), r3 = hf(ih(h + 2u)), r4 = hf(ih(h + 3u));
  vec2 p0 = uCam.xz + mod(vec2(r2, r3) * uRa.x - uCam.xz + 0.5 * uRa.x, uRa.x) - 0.5 * uRa.x;
  vec4 sp = veilSpot(p0);
  vec2 w = normalize(uWind.xz), pp = vec2(-w.y, w.x);
  float L = uRa.y * (0.45 + 0.55 * r4), Wd = uRa.z * (0.6 + 0.8 * r1), x = aQ.x, y = aQ.y;
  float g = uT / (uRb.x * (0.8 + 0.4 * r2)) + r1 * 7.0, gust = smoothstep(0.1, 0.35, fract(g)) * (1.0 - smoothstep(0.55, 0.95, fract(g)));
  vec2 xz = sp.xy + w * x * L + pp * y * Wd * (1.0 + 0.7 * x);
  vW = vec3(xz.x, sp.z + 0.15 + uRa.w * x * (0.6 + 0.8 * r2) - L * 0.12 * x * x, xz.y);
  gl_Position = uVP * vec4(vW - uCam, 1.0);
  float dist = length(vW - uCam); vec3 rd = (vW - uCam) / dist;
  float back = pow(max(dot(rd, uSun), 0.0), 3.0);
  float edge = 1.0 - smoothstep(0.38 * uRa.x, 0.5 * uRa.x, max(abs(p0.x - uCam.x), abs(p0.y - uCam.z)));
  float a = uPc.a * gust * sp.w * edge * smoothstep(6.0, 18.0, dist) * (1.0 - smoothstep(140.0, 230.0, dist));
  vCol = vec4(atmos(uPc.rgb * (0.85 + 1.8 * back), rd, dist), a); vQ = aQ;
}`;
  var FS_RIBBON = `
uniform vec3 uWind;
in vec4 vCol; in vec3 vW; in vec2 vQ; out vec4 oC;
void main() {
  vec2 w = normalize(uWind.xz), pp = vec2(-w.y, w.x);
  float s = n3v(vec3(dot(vW.xz, w) * 0.035 - uT * 0.22, dot(vW.xz, pp) * 0.28, 0.37)).a * 1.4 - 0.2;
  float a = vCol.a * clamp(s, 0.0, 1.0) * (1.0 - vQ.y * vQ.y) * smoothstep(0.0, 0.12, vQ.x) * (1.0 - smoothstep(0.35, 1.0, vQ.x));
  oC = vec4(vCol.rgb * a, a);
}`;
  /* the ground's height near the camera, from the cache (bilinear over four texels; packed when floats cannot be
     rendered); scatter and particles read it instead of evaluating the realm's height function per vertex */
  var GROUND_LIB = `
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
`;
  /* the realm's ground, at points (packed in bytes, read back) or over a grid about the camera: the land (the first
     surface's height) or the camera's own ground (the realm's camGround, e.g. a bay's cloud top) */
  function FS_PROBE(H, HC, HP) {   // (speed S1: HP, the realm's probeHgt: one function for both, float HP(vec2 p, bool cam))
    return `
uniform sampler2D uTex; uniform vec4 uGCw; uniform int uPm; out vec4 oC;
vec4 pack(float h) { float v = clamp((h + 4096.0) / 8192.0, 0.0, 0.99999); vec4 e = fract(v * vec4(1.0, 255.0, 65025.0, 16581375.0)); return e - e.yzww * vec4(1.0 / 255.0, 1.0 / 255.0, 1.0 / 255.0, 0.0); }
float hgt(vec2 p, bool cam) { ${HP ? 'return ' + HP + '(p, cam);' : (HC ? 'if (cam) return ' + HC + '(p); ' : '') + 'return ' + H + '(p).x;'} }
void main() {
  bool grid = uPm >= 2, cam = uPm == 1 || uPm == 3;
  vec2 p = grid ? uGCw.xy + gl_FragCoord.xy * uGCw.z : texelFetch(uTex, ivec2(gl_FragCoord.xy), 0).xy;
  float h = hgt(p, cam);
#ifdef GC_PACKED
  oC = pack(h);
#else
  oC = uPm == 2 ? vec4(h, 0.0, 0.0, 1.0) : pack(h);
#endif
}`;
  }
  /* the sky: the realm's gradient and haze, the sun (scaled by uSunVis: none in an interior or an overcast), high
     streaks, stars; then the realm's own sky, when its GLSL has one (vec3 skyHook(vec3 rd, vec3 c): an interior's
     void and its lights, an overcast's ceiling, a night's moon and bands: it is handed the sky as drawn and returns
     it; the air's far colour, the fog, stays the gradient's, so a realm keeps the two in step through its light) */
  /* (tod fix3, problem 3) the phase-2 sky (the galaxy, the aurora: noise reads in a loop under varying branches) compiled
     only in phase 2: a compiler that flattens such branches made every sky pixel of every sky pay for them (every sky
     23-34% dearer than the base on a phone's canvas, fair included) */
  var SKY_BODY = (SKY_PHASE >= 2 ? '\n#define SKY_PH2\n' : '') + `
uniform vec4 uSunD;   // disc: cos of radius, intensity, star amount, disc kind (1: a great flat disc)
uniform int uZs;   // (fast500 D T1) never set: 0 at link; the star loop's bound FXC cannot fold
uniform vec4 uHi;     // high cloud: cover, brightness, scale, drift
uniform vec3 uHiC;
uniform vec4 uMoon;   // (tod) the moon: its direction, its amount (0: none)
uniform vec3 uMoonC, uMoonG;   // (tod) its disc's colour (a pale flat disc, held under the light ceiling) and its glare's
uniform vec4 uNight;  // (tod) the belt (the Earth's shadow and the Belt of Venus), the noctilucent wisps, the stars' twinkle (1) or held (0), the stars' top (Y)
uniform vec4 uSunB;   // (fast500 no-fades) in a change between a twilight sky and a night: the wisps' amount and the veil's strength (both 0 in uNight and uHi there, so F0's blocks draw nothing and these below draw them), -, -
uniform vec4 uGal, uGalC;   // (tod, phase 2) the galaxy: its pole and amount; its core's direction
uniform vec4 uAur;    // (tod, phase 2) the aurora: -, its phase, its base (deg), its amount
out vec4 oC;
const float SKYTAU = 6.2831853;
/* (tod) the stars: world-anchored (a cell of the sphere by the direction: elevation bands STC rad deep, each cut into
   cells about STC rad wide), a star in a share of the cells at a hashed place well inside its own, a bell at least
   FWHM 1 px by the pixel's own angle with its energy held (its peak the same at any resolution: a turn slides it and
   never blinks it), twinkling slowly (+-15% at 0.6-1.8 rad/s); the cell and its four neighbours read */
const float STC = 0.04;
/* (tod, phase 2) the Milky Way (the live's band, bright core and dark lanes; its noise from uN3, a whole number of its
   period round the band so a turn never meets a seam) and the aurora (the live's three curtains, farther ones lower and
   fainter, folding slowly, green below and red above, rayed; their waves whole numbers round the sky) */
#ifdef SKY_PH2
vec3 galaxyAt(vec3 rd, float e) {
  vec3 P = uGal.xyz, C = uGalC.xyz;
  float b = dot(rd, P), l = atan(dot(rd, cross(P, C)), dot(rd, C)), u = l / SKYTAU;
  float band = exp(-b * b / 0.0225), core = exp(-l * l / 0.36) * exp(-b * b / 0.05);
  float n = n3v(vec3(u * 7.0, b * 3.15, 0.13)).b * 0.45 + n3v(vec3(u * 21.0, b * 9.9, 0.71)).a * 0.35 + n3v(vec3(u * 62.0, b * 29.7, 0.29)).a * 0.2;
  float lanes = smoothstep(0.4, 0.64, n3v(vec3(u * 4.0, b * 5.6 * 0.33 + 0.1 * n3v(vec3(u * 13.0, 0.4, 0.61)).b, 0.37)).b) * exp(-pow(b - 0.02 * sin(l * 5.0), 2.0) / 0.003);
  return (vec3(0.9, 0.86, 0.8) * band * (0.25 + 1.1 * n * n) + vec3(1.0, 0.85, 0.65) * core * 1.3) * (1.0 - 0.8 * lanes) * uGal.w * 0.04 * smoothstep(1.0, 12.0, e);
}
vec3 auroraAt(vec3 rd, float e) {
  float az = atan(rd.x, rd.z), u = az / SKYTAU; vec3 c = vec3(0.0);
  for (int j = 0; j < 3; j++) {
    float fj = float(j), sc = 1.0 - 0.22 * fj, ph = uT * (0.04 + 0.015 * fj) + uAur.y + fj * 2.1, f1 = 2.0 + fj, f2 = 5.0 + 2.0 * fj;
    float base = uAur.z * sc + 2.0 * fj + sc * (3.5 * sin(az * f1 + ph) + 2.0 * sin(az * f2 - ph * 1.3) + 2.4 * (n3v(vec3(u * 4.0 + fj * 0.31, ph * 0.02, 0.83)).b - 0.5));
    float slope = abs(3.5 * f1 * cos(az * f1 + ph) + 2.0 * f2 * cos(az * f2 - ph * 1.3)) * sc;
    float fold = 0.65 + 0.7 / (1.0 + slope * 0.12);
    float hgt = 7.0 + 9.0 * sc, x = e - base;
    if (x < -1.5 || x > hgt * 2.5) continue;
    float rays = 0.3 + 0.7 * pow(n3v(vec3(u * (100.0 + 31.0 * fj) + uT * 0.0005, 0.5 + fj * 0.2, 0.19)).a, 1.6) * (0.6 + 0.4 * n3v(vec3(u * 257.0 - uT * 0.0003, 0.27 + fj * 0.1, 0.47)).b);
    vec3 col = mix(vec3(0.25, 1.0, 0.55), vec3(0.85, 0.25, 0.55), smoothstep(0.25, 1.2, x / hgt));
    c += col * smoothstep(-0.6, 0.25, x) * (1.0 - smoothstep(hgt * 1.6, hgt * 2.5, x)) * (exp(-max(x, 0.0) / hgt) + 0.6 * exp(-max(x, 0.0) / (hgt * 0.15))) * rays * fold * (0.85 - 0.25 * fj);
  }
  return c * uAur.w * 0.09 * smoothstep(0.5, 6.0, e);
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
  float dens = 1.0 + (uGal.w > 0.0 ? 1.5 * uGal.w * exp(-pow(dot(sd0(jb, ib, n), uGal.xyz), 2.0) / 0.03) : 0.0);   // (the stars crowd in the galaxy's band)
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
}`;
  var FS_SKY = HEAD + FRAME_U + LIB + SKY_BODY;
  /* the depth, linearised to metres, at half resolution: the nearest of each 2x2 (so cloud never shows in front) */
  var FS_DEPTHDOWN = HEAD + FRAME_U + `
uniform sampler2D uDepth; uniform vec2 uScale; out vec4 oC;   // uScale: the last texel of the scene as drawn
float lin(float d) { float n = uProj.z, f = uProj.w, z = d * 2.0 - 1.0; return 2.0 * n * f / (f + n - z * (f - n)); }
void main() {
  ivec2 p = ivec2(gl_FragCoord.xy) * 2, lim = ivec2(uScale), p1 = min(p + 1, lim);
  float a = texelFetch(uDepth, min(p, lim), 0).r, b = texelFetch(uDepth, ivec2(p1.x, p.y), 0).r, c = texelFetch(uDepth, ivec2(p.x, p1.y), 0).r, d = texelFetch(uDepth, p1, 0).r;
  float m = min(min(a, b), min(c, d));
  float v = m >= 1.0 ? 6.0e4 : min(lin(m), 5.9e4);
#ifdef LIND_PACKED
  vec4 e = fract(clamp(v / 65536.0, 0.0, 0.99999) * vec4(1.0, 255.0, 65025.0, 16581375.0));
  oC = e - e.yzww * vec4(1.0 / 255.0, 1.0 / 255.0, 1.0 / 255.0, 0.0);
#else
  oC = vec4(v, 0.0, 0.0, 1.0);
#endif
  gl_FragDepth = m;
}`;
  var LIB_LIND = `
float linFetch(sampler2D s, ivec2 q) {
#ifdef LIND_PACKED
  return dot(texelFetch(s, q, 0), vec4(1.0, 1.0 / 255.0, 1.0 / 65025.0, 1.0 / 16581375.0)) * 65536.0;
#else
  return texelFetch(s, q, 0).r;
#endif
}
`;
  /* glow sprites: points of light by the thousand (a cell's fireflies, a carpet of light-flowers, a field of embers,
     the lights of a far wall), each a soft core and a faint halo facing the camera, its size in metres with a floor in
     pixels (a far one keeps its light spread over the floor: never a fat bright dot), steady, twinkling, pulsing,
     blinking, drifting about its place or bobbing; depth-tested against the scene and taken by the air, added to the
     HDR scene (so the bloom takes the bright ones) */
  var VS_GLOW = HEAD + FRAME_U + LIB + `
layout(location = 0) in vec2 aQ;   // the quad's corner (-1 .. 1)
layout(location = 1) in vec4 gA;   // its place (x, y, z), its size (m)
layout(location = 2) in vec4 gB;   // its colour (linear, HDR), its least size (px)
layout(location = 3) in vec4 gC;   // twinkle (0 .. 1), pulse (0 .. 1), rate (Hz), phase (0 .. 1)
layout(location = 4) in vec4 gD;   // drift about its place (m; < 0: a fall, down through that many m at rate m/s, again and again), bob (m), blink (the share of a cycle lit; 0: no blink), far (m: gone by then; 0: 3000)
uniform float uGlowK;   // the set's own fade (a cell coming into being)
out vec3 vCol; out vec2 vQ;
void main() {
  float ph = gC.w * 6.2831853, t = uT, fall = 1.0;
  vec3 p = gA.xyz;
  if (gD.x > 0.0) p += gD.x * vec3(sin(t * (0.21 + 0.07 * gC.w) + ph), 0.5 * sin(t * (0.17 + 0.05 * gC.w) + ph * 1.7), cos(t * (0.19 + 0.06 * gC.w) + ph * 2.3));
  else if (gD.x < 0.0) { float f = fract(t * gC.z / -gD.x + gC.w); p.y += gD.x * f; p.xz += 0.4 * sin(t * 0.9 + ph) * vec2(1.0, 0.7); fall = smoothstep(0.0, 0.1, f) * (1.0 - smoothstep(0.7, 1.0, f)); }
  if (gD.y > 0.0) p.y += gD.y * sin(t * (1.1 + 0.5 * gC.w) + ph);
  vec3 v = p - uCam; float dist = length(v), far = gD.w > 0.0 ? gD.w : 3000.0;
  vec4 c = uVP * vec4(v, 1.0);
  vQ = aQ;
  if (c.w < 0.3 || dist > far) { gl_Position = vec4(0.0, 0.0, -2.0, 1.0); vCol = vec3(0.0); return; }
  float rpx = gA.w * 0.25 * uRes.y / (uProj.y * c.w), rfl = max(rpx, gB.w * 0.5), k = (rpx / rfl) * (rpx / rfl);
  float I = 1.0;
  if (gC.x > 0.0) I *= 1.0 + gC.x * 1.4 * gn(vec2(t * gC.z + gC.w * 17.0, gC.w * 31.0));
  if (gC.y > 0.0) I *= 1.0 + gC.y * sin(6.2831853 * gC.z * t + ph);
  if (gD.z > 0.0) { float cy = fract(t * gC.z * 0.35 + gC.w); I *= smoothstep(0.0, 0.06, cy) * (1.0 - smoothstep(max(gD.z - 0.06, 0.0), gD.z, cy)); }
  vec3 rd = v / dist;
  I = max(I, 0.0) * k * fall * (1.0 - smoothstep(far * 0.7, far, dist)) * uGlowK * (1.0 - fogAmt(rd, dist)) * (1.0 - hazeAmt(rd, dist));
  vCol = gB.rgb * I;
  gl_Position = vec4(c.xy + aQ * rfl * 6.0 / uRes * c.w, c.z, c.w);   // (the quad holds the core and its halo: three radii)
}`;
  var FS_GLOW = HEAD + `
in vec3 vCol; in vec2 vQ; out vec4 oC;
void main() { float d = length(vQ) * 3.0; oC = vec4(vCol * (exp(-d * d * 1.6) + 0.05 * exp(-d * 1.3)), 0.0); }`;
  /* beams: soft shafts of light as geometry (a lantern's beam to a crystal, light falling through a hole in a canopy,
     a tower's beam into the fog): a cone from A (radius rA) to B (rB), its light gathered along each pixel's ray inside
     it (eight samples: a Gaussian across it, a white core, its far end faded, dust drifting along it, a shimmer), cut
     by the scene's depth (the half-resolution linear depth: no beam through a wall), taken by the air, added to the
     HDR scene; a beam drawn on from A (woken when the camera first comes near: a light event) */
  var VS_BEAM = HEAD + FRAME_U + `
layout(location = 0) in vec3 aB;   // the unit box's corner
layout(location = 1) in vec4 bA;   // from (x, y, z), its radius (m)
layout(location = 2) in vec4 bB;   // to (x, y, z), its radius
layout(location = 3) in vec4 bC;   // colour (linear, HDR), the white core's strength
layout(location = 4) in vec4 bD;   // dust (0 .. 1), shimmer (0 .. 1), woken at (the shaders' clock; -1e9: always lit; 1e9: not yet), the draw-on (s)
layout(location = 5) in vec4 bE;   // the share of its length faded at its far end, the share faded at its start, -, -
flat out vec4 vA, vB, vC, vD, vE; out vec3 vW;
void main() {
  vec3 ax = bB.xyz - bA.xyz; float L = max(length(ax), 1e-3); vec3 a = ax / L;
  vec3 u = normalize(cross(a, abs(a.y) < 0.95 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0))), w = cross(a, u);
  float R = max(bA.w, bB.w) * 2.2;
  vec3 p = bA.xyz + a * (aB.x * 0.5 + 0.5) * L + (u * aB.y + w * aB.z) * R;
  vW = p; vA = bA; vB = bB; vC = bC; vD = bD; vE = bE;
  gl_Position = uVP * vec4(p - uCam, 1.0);
}`;
  var FS_BEAM = HEAD + FRAME_U + LIB + LIB_LIND + `
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
}`;
  /* the cloud the camera flies through in a transition: billows about the eye, fixed in the cloud's own frame (the
     camera's travel, continuous across the change of realm), lit by a sun eased from one realm's to the next's, blue in
     their own shade; coming out, each pixel clears at its own time (below the eye first, then in ragged gaps), so the
     next realm opens over seconds, never all at once.
     (hotfix G0, pass 2) Sampled on planes fixed in the cloud, so the view slides through them. Round 3b marched 7
     shells at fixed distances from the eye (2.6-82 m, x1.78): moving 0.35 m a frame they cut the noise (0.3-0.8 m
     texels) somewhere new every frame, and the mist changed in blotches that reversed from frame to frame with no flow
     (seed 7's first bank: 2.6% of pixels a frame on average, up to 21%, by more than 2 codes of blurred luma). Now the
     samples lie on planes across the heading (level: the view's pitch, the passage's climb and the framing's ease never
     turn them; turned, they swept the noise at the screen's edges) whose places along it are fixed in the cloud
     (uInP.x: the travel along the heading), in six levels D = 2.6 x 2^L m apart; each level weighs its planes by a
     window over [D, 2D] with ramps exactly D long, so its planes weigh the same in all wherever they stand (a window in
     the log of the distance, tried first, pulsed the nearest levels' light at 4-8 Hz), and every plane comes in at
     nothing far off and goes out at nothing near: as the camera moves each plane, and the billows on it, comes nearer
     and grows on the screen as a cloud's would; the motion is flow, never a new cut. A turn of the heading turns the
     planes about the eye (each pixel's ray sweeps the noise as it would sweep a cloud there). The noise's LOD follows
     each sample's footprint (the far planes no longer alias) and the billows' own motion a frame (off the heading's
     line a ray's point on a plane slides fast: blurred to that, as a motion blur, they never move half a period a
     frame), and its fine billows (a 19 m tile) come in only from 6-24 m: nearer, a cloud is an even mist (round 3b's
     first shell, 2.6 m off, drew them magnified, 0.3 m blobs 8 deg across, and near the eye they stream past faster
     than the frames can follow). Where the cloud is whole (amt from 0.8 to 1) what is left of the view behind the
     planes is filled with the cloud's own light, so at the change of realm (amt 1) nothing behind it shows; coming out,
     the view is held whole for the first 0.1 of the way out (0.5 s), then clears pixel by pixel as before */
  /* (world6) FS_INCLOUD (the cloud about the eye in a passage) and FS_PASS (a passage's cover) are gone with the passages */
  /* cloud volumes: each body's lobes baked once into a small 3D texture (density; the optical depth toward the sun
     and toward the sky), then ray-marched inside the body's box at half resolution */
  var FS_VDENS = HEAD + FRAME_U + LIB + `
uniform vec4 uLobe[96]; uniform int uLobeN; uniform vec3 uHalf, uDims; uniform float uLayer;
uniform vec4 uVK;    // seed, erosion, noise scale (m), blend (m)
uniform vec4 uVK2;   // -, squash (the lobes' height over their width), the distance's range (m), the billows' depth (m)
out vec4 oC;
void main() {
  vec3 uvw = vec3(gl_FragCoord.xy, uLayer + 0.5) / uDims;
  vec3 p = (uvw * 2.0 - 1.0) * uHalf;
  float s = 1e5, k = uVK.w, sq = uVK2.y;
  for (int i = 0; i < 96; i++) {
    if (i >= uLobeN) break;
    vec4 L = uLobe[i]; vec3 d = p - L.xyz; d.y /= sq;
    float si = (length(d) - L.w) * min(sq, 1.0);
    float h = max(k - abs(s - si), 0.0) / k;
    s = min(s, si) - h * h * k * 0.25;
  }
  vec3 q = p / uVK.z + uVK.x;
  float n = texture(uN3, q).g * 0.8 + texture(uN3, q * 2.7 + 0.4).b * 0.2;
  float s0 = s;
  s -= (n - 0.5) * uVK.y * uVK2.w;
  oC = vec4(clamp(0.5 - s / uVK2.z, 0.0, 1.0), clamp(0.5 - s0 / (uVK2.z * 2.0), 0.0, 1.0), 0.0, 1.0);
}`;
  var FS_VLIGHT = HEAD + FRAME_U + `
uniform sampler3D uTex3; uniform vec3 uHalf, uDims, uScale, uSunL; uniform float uLayer, uSigma, uSD, uVox;
uniform vec2 uYawCS;
out vec4 oC;
float dens(vec3 u) { if (any(lessThan(u, vec3(0.0))) || any(greaterThan(u, vec3(1.0)))) return 0.0; return clamp((texture(uTex3, u * uScale).r - 0.5) * uSD, 0.0, 1.0); }
void main() {
  vec3 uvw = vec3(gl_FragCoord.xy, uLayer + 0.5) / uDims;
  float d0 = texture(uTex3, uvw * uScale).r;
  vec3 q = uvw; float tl = 0.0, ds = uVox * 0.6;
  for (int i = 0; i < 18; i++) { q += uSunL * (ds / (2.0 * uHalf)); tl += dens(q) * ds; ds *= 1.22; }
  tl *= uSigma;
  float ta = 0.0;
  for (int k = 0; k < 3; k++) {
    vec3 dw = k == 0 ? vec3(0.0, 1.0, 0.0) : (k == 1 ? vec3(0.62, 0.78, 0.0) : vec3(-0.44, 0.78, 0.44));
    vec3 dir = vec3(uYawCS.x * dw.x - uYawCS.y * dw.z, dw.y, uYawCS.y * dw.x + uYawCS.x * dw.z);
    vec3 r = uvw; float s = 0.0; ds = uVox * 0.6;
    for (int i = 0; i < 10; i++) { r += dir * (ds / (2.0 * uHalf)); s += dens(r) * ds; ds *= 1.35; }
    ta += s * uSigma / 3.0;
  }
  oC = vec4(d0, clamp(tl / 24.0, 0.0, 1.0), clamp(ta / 12.0, 0.0, 1.0), texture(uTex3, uvw * uScale).g);
}`;
  /* the clouds' opaque cores, into the depth only */
  var VS_OCC = HEAD + FRAME_U + `
layout(location = 0) in vec3 aV; layout(location = 1) in vec4 aO;
void main() { gl_Position = uVP * vec4(aO.xyz + aV * aO.w - uCam, 1.0); }`;
  var FS_OCC = HEAD + `
out vec4 oC;
void main() { oC = vec4(0.0); }`;
  var VS_VBODY = HEAD + FRAME_U + `
layout(location = 0) in vec3 aB;
uniform vec3 uVC, uVH; uniform vec2 uVY;
out vec3 vW;
void main() { vec3 l = aB * uVH, w = uVC + vec3(uVY.x * l.x + uVY.y * l.z, l.y, -uVY.y * l.x + uVY.x * l.z); vW = w; gl_Position = uVP * vec4(w - uCam, 1.0); }`;
  var FS_VBODY = HEAD + FRAME_U + LIB + LIB_LIND + `
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
  vec3 acc = vec3(0.0); float T = 1.0, taken = 0.0, nLeap = 0.0, nBand = 0.0, nIn = 0.0;
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
      t += sl > band ? max(sl * 0.9, dE) : max((s - amp) * 0.6, dE); nLeap += 1.0; continue;
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
    if (s > -band) nBand += 1.0; else nIn += 1.0;
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
#ifdef DEV
  if (uDbg == 6) { oC = vec4(taken * 0.001, 0.001, 0.0, 0.0); return; }
  if (uDbg == 7) { oC = vec4(nLeap * 0.001, nBand * 0.001, nIn * 0.001, 0.0); return; }
#endif
  if (T > 0.996) discard;
  float al = 1.0 - T;
  vec3 col = atmos(acc / al, rd, tn + (tf - tn) * 0.25);
  // (world6 fix) a body coming in out of the haze fades by its opacity (uVR2.y, 0 .. 1 over 2.5 s from its bake): the
  // step scaled its extinction, so a thick tower was a third opaque at 2% of its fade (the film's one pop-in)
  oC = vec4(col * al, al) * uVR2.y;
  if (oC.a < 0.0005) discard;
}`;
  /* bloom (dual filter): the first pass composes scene and cloud and keeps what is bright; every tap clamped to the
     part of its target this frame drew (a lower rung draws only part of each) */
  var FS_PRE = HEAD + FRAME_U + `
uniform sampler2D uScene, uCloud; uniform vec4 uBl; uniform vec4 uBlL;   // threshold, knee, scene uv scale; the scene's and cloud's last texel (uv)
out vec4 oC;
void main() {
  vec2 uv = gl_FragCoord.xy / uRes;
  vec3 s = texture(uScene, min(uv * uBl.zw, uBlL.xy)).rgb; vec4 cl = texture(uCloud, min(uv * uBl.zw, uBlL.zw));
  vec3 c = min(s, vec3(1.0 + 3.0 * (1.0 - cl.a))) * (1.0 - cl.a) + cl.rgb;
  float m = max(c.r, max(c.g, c.b)), k = uBl.y, r = clamp(m - uBl.x + k, 0.0, 2.0 * k);
  float w = max(r * r / (4.0 * k + 1e-4), m - uBl.x) / max(m, 1e-4);
  oC = vec4(c * w, 1.0);
}`;
  var FS_DOWN = HEAD + `
uniform sampler2D uTex; uniform vec2 uTexel; uniform vec2 uLim; out vec4 oC;
vec3 tp(vec2 q) { return texture(uTex, min(q, uLim)).rgb; }
void main() { vec2 uv = gl_FragCoord.xy * 2.0 * uTexel; vec2 h = uTexel;
  vec3 s = tp(uv) * 4.0 + tp(uv + vec2(-h.x, -h.y)) + tp(uv + vec2(h.x, -h.y)) + tp(uv + vec2(-h.x, h.y)) + tp(uv + vec2(h.x, h.y));
  oC = vec4(s / 8.0, 1.0); }`;
  var FS_UP = HEAD + `
uniform sampler2D uTex; uniform vec2 uTexel; uniform vec2 uLim; out vec4 oC;
vec3 tp(vec2 q) { return texture(uTex, min(q, uLim)).rgb; }
void main() { vec2 uv = gl_FragCoord.xy * uTexel * 0.5; vec2 h = uTexel;
  vec3 s = tp(uv + vec2(-h.x * 2.0, 0.0)) + tp(uv + vec2(h.x * 2.0, 0.0)) + tp(uv + vec2(0.0, -h.y * 2.0)) + tp(uv + vec2(0.0, h.y * 2.0));
  s += (tp(uv + vec2(-h.x, h.y)) + tp(uv + vec2(h.x, h.y)) + tp(uv + vec2(-h.x, -h.y)) + tp(uv + vec2(h.x, -h.y))) * 2.0;
  oC = vec4(s / 12.0, 1.0); }`;
  /* light shafts: what is open sky near the sun (no ground, little cloud), blurred toward the sun */
  var FS_SHAFTMASK = HEAD + FRAME_U + LIB_LIND + `
uniform sampler2D uScene, uCloud, uLinD; uniform vec4 uSh; // sun uv x, y, radius, -
uniform vec4 uShS;   // scene uv scale, cloud uv scale
uniform vec4 uShL;   // the scene's and cloud's last texel (uv)
out vec4 oC;
void main() {
  vec2 uv = gl_FragCoord.xy / uRes;
  float d = linFetch(uLinD, min(ivec2(uv * uShS.zw * vec2(textureSize(uLinD, 0))), textureSize(uLinD, 0) - 1));
  vec3 s = texture(uScene, min(uv * uShS.xy, uShL.xy)).rgb; float ca = texture(uCloud, min(uv * uShS.zw, uShL.zw)).a;
  float open = step(5.5e4, d) * (1.0 - ca);
  vec2 dv = (uv - uSh.xy) * vec2(uRes.x / uRes.y, 1.0);
  float fall = exp(-dot(dv, dv) / (uSh.z * uSh.z));
  oC = vec4(s * open * fall, 1.0);
}`;
  var FS_SHAFTBLUR = HEAD + `
uniform sampler2D uTex; uniform vec4 uSh; uniform vec2 uRes2; uniform vec2 uLim; out vec4 oC;
void main() {
  vec2 uv = gl_FragCoord.xy / uRes2, d = (uSh.xy - uv) * (uSh.w / 40.0);
  vec3 acc = vec3(0.0); float w = 1.0, ws = 0.0;
  for (int i = 0; i < 40; i++) { acc += texture(uTex, clamp(uv, vec2(0.0), uLim)).rgb * w; ws += w; w *= 0.965; uv += d; }
  oC = vec4(acc / ws, 1.0);
}`;
  /* (world6w) the ink birds' keep-off: the words' ink boxes grown 2 px and eased out over 3 px (r: the name's and the
     credit's, g: the links'), drawn at a quarter of the window whenever the words move and read by the ink birds alone,
     which take their own ink off the words' ground (a pixel can only be left lighter). The composite takes nothing from
     the words: the lift's window-wide fields are gone with the lift */
  var FS_INKKEEP = HEAD + `
uniform vec4 uWords[5]; uniform vec2 uOut; uniform float uMS, uDpr;
out vec4 oC;
float sdBox(vec2 p, vec4 b) { vec2 c = (b.xy + b.zw) * 0.5, h = (b.zw - b.xy) * 0.5, d = abs(p - c) - h; return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0); }
float msk(vec2 p, vec4 b, float core, float fe) { if (b.z <= b.x) return 0.0; float d = sdBox(p, b) - core; return d <= 0.0 ? 1.0 : (d >= fe ? 0.0 : 0.5 + 0.5 * cos(3.14159265 * d / fe)); }
void main() {
  vec2 p = gl_FragCoord.xy * uMS; p.y = uOut.y - p.y;
  float co = 2.0 * uDpr, fe = 3.0 * uDpr;
  float ks = max(msk(p, uWords[0], co, fe), max(msk(p, uWords[1], co, fe), msk(p, uWords[2], co, fe)));
  float kl = max(msk(p, uWords[3], co, fe), msk(p, uWords[4], co, fe));
  oC = vec4(ks, kl, 0.0, 1.0);
}`;
  /* the composite */
  /* the finished frame (the world's resolution) put up to the canvas (the device's): bilinear, as the browser's own
     upscale did before round 2 (the birds' ink is then drawn over it at the canvas's resolution) */
  /* (round E1 Fix 3, G0) the half-resolution clouds accumulated over frames: this frame's cloud (uCloud) and the last
     accumulation (uHist, the same pixel), the latter held to this frame's 3 x 3 neighbourhood (each channel's least and
     most: a cloud that moved or changed is never ghosted beyond what this frame has about it), mixed at uCA.x (this
     frame's share). The march samples a far tower's relief and a cloud's rim at half resolution, and as the view moves
     its detail crawled from one frame to the next in single texels (491 x 1065: the cloud-edge film's moving excess
     1.14 codes, the far tower's face and the rims); a few frames' average is what a finer march would show.
     (E1.1, item 3) Reprojected by the view's turn: Fix 3 read the history at the same pixel, so in a drag (69 deg/s, 4-5
     half-resolution texels a frame) the clamp held a smear of the last frames (verify-regress-3: the drag film's moving,
     blur-matched and flicker readings 1.5-2.6x those without the accumulation). Now each pixel's ray is put into the last
     frame's view (uRM, the two views' rotations; the clouds stand 100 m and more off, so the camera's own travel in a
     frame, under a metre, is a fraction of a texel there and inside the clamp) and the history read there by a
     Catmull-Rom spline; where it falls outside the last view this frame stands alone. Held still, the ray lands on its own texel's centre
     and the read is the texel itself: steady flight is as before */
  var FS_CACC = HEAD + LIB_LIND + `
uniform sampler2D uCloud, uHist, uLinD; uniform vec4 uCA;
uniform mat3 uRM;    // (E1.1) this frame's rays (ndc, 1) into the last frame's view: x/z, y/z its ndc
uniform vec2 uHS;    // the history texture's size (texels)
out vec4 oC;
// (E1.1) the history read by a Catmull-Rom spline (five bilinear reads, the corners dropped; the coordinates held to the
// drawn part): a bilinear read blurs by how far the ray falls between texels, which changes from frame to frame in a
// turn and flickered (the drag film's flicker p99 0.292 against 0.269 without the accumulation); on a texel's centre
// (held still) it is that texel exactly
vec4 histCR(vec2 hp) {
  vec2 t1 = floor(hp - 0.5) + 0.5, f = hp - t1, lo = vec2(0.5), hi = uCA.zw - 0.5;
  vec2 w0 = f * (-0.5 + f * (1.0 - 0.5 * f)), w1 = 1.0 + f * f * (-2.5 + 1.5 * f), w2 = f * (0.5 + f * (2.0 - 1.5 * f)), w3 = f * f * (-0.5 + 0.5 * f);
  vec2 w12 = w1 + w2, t0 = clamp(t1 - 1.0, lo, hi) / uHS, t3 = clamp(t1 + 2.0, lo, hi) / uHS, t12 = clamp(t1 + w2 / w12, lo, hi) / uHS;
  vec4 r = texture(uHist, vec2(t12.x, t0.y)) * (w12.x * w0.y) + texture(uHist, vec2(t0.x, t12.y)) * (w0.x * w12.y) + texture(uHist, t12) * (w12.x * w12.y)
         + texture(uHist, vec2(t3.x, t12.y)) * (w3.x * w12.y) + texture(uHist, vec2(t12.x, t3.y)) * (w12.x * w3.y);
  return r / (w12.x * w0.y + w0.x * w12.y + w12.x * w12.y + w3.x * w12.y + w12.x * w3.y);
}
void main() {
  ivec2 p = ivec2(gl_FragCoord.xy), mx = ivec2(uCA.zw) - 1;
  vec4 c = texelFetch(uCloud, p, 0), lo = c, hi = c;
  // (E1.1) the neighbourhood that bounds the history: not the texels more than twice as far as this one (everything
  // beyond 8 km one surface, as the composite takes it), so across the land's edge (a floating rock before a bright
  // tower) the cloud behind is not held where the rock now stands: Fix 3's whole 3 x 3 let a tower's light linger on a
  // rock's texel as it moved over it, fading by halves (491 x 1065: a rock pixel 62, 114, 92, 79, 71 codes). Only the
  // farther are left out: a far texel beside a near one is bounded as before (leaving those out too lost the history at
  // every edge: the 491 x 668 cloud-edge film's moving reading 0.050 -> 0.082)
  float z0 = min(linFetch(uLinD, p), 8000.0);
  for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) {
    if (i == 0 && j == 0) continue;
    ivec2 pq = clamp(p + ivec2(i, j), ivec2(0), mx);
    if (min(linFetch(uLinD, pq), 8000.0) > 2.0 * max(z0, 1.0)) continue;
    vec4 q = texelFetch(uCloud, pq, 0); lo = min(lo, q); hi = max(hi, q);
  }
  // (E1.1, item 3) the last accumulation read where this pixel's ray stood in the last frame's view (the view's turn
  // taken out; the camera's travel in a frame is within the clamp at a cloud's distance), by a Catmull-Rom spline; where
  // that falls off the last view (the edge a turn brings in) this frame's own
  vec3 r = uRM * vec3(gl_FragCoord.xy / uCA.zw * 2.0 - 1.0, 1.0);
  vec4 h = c; float w = uCA.x;
  if (r.z > 1e-4) {
    vec2 hp = (r.xy / r.z * 0.5 + 0.5) * uCA.zw;
    if (hp.x < 0.5 || hp.y < 0.5 || hp.x > uCA.z - 0.5 || hp.y > uCA.w - 0.5) w = 1.0;
    else h = histCR(hp);
  } else w = 1.0;
  oC = mix(clamp(h, lo, hi), c, w);
}`;
  var FS_BLIT = HEAD + `
uniform sampler2D uTex; uniform vec2 uOut;
out vec4 oC;
/* (stage2 quality Q4) the world put up to a larger canvas by a Catmull-Rom clamped to the inner 2x2's range (one
   sharp resample, no ring: never outside the four texels it lies between), was bilinear */
void main() {
  vec2 sz = vec2(textureSize(uTex, 0)), hp = gl_FragCoord.xy / uOut * sz - 0.5, f = fract(hp); ivec2 h0 = ivec2(floor(hp)), qm = ivec2(sz) - 1;
  vec2 w0c = f * (-0.5 + f * (1.0 - 0.5 * f)), w1c = 1.0 + f * f * (-2.5 + 1.5 * f), w2c = f * (0.5 + f * (2.0 - 1.5 * f)), w3c = f * f * (-0.5 + 0.5 * f);
  vec3 s = vec3(0.0), mn = vec3(1e9), mx = vec3(-1e9);
  for (int j = 0; j < 4; j++) { float wy = j == 0 ? w0c.y : (j == 1 ? w1c.y : (j == 2 ? w2c.y : w3c.y));
    for (int i = 0; i < 4; i++) { float wx = i == 0 ? w0c.x : (i == 1 ? w1c.x : (i == 2 ? w2c.x : w3c.x));
      vec3 q = texelFetch(uTex, clamp(h0 + ivec2(i - 1, j - 1), ivec2(0), qm), 0).rgb; s += q * (wx * wy);
      if (i >= 1 && i <= 2 && j >= 1 && j <= 2) { mn = min(mn, q); mx = max(mx, q); } } }
  oC = vec4(clamp(s, mn, mx), 1.0); }`;
  /* (world6w) the words' lift (LIB_LIFT, liftWords: a gain under dark words) is gone, with its floors and the world's toe */
  var FS_COMP = HEAD + FRAME_U + LIB + LIB_LIND + `
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
  if (uDbg == 5) {   // dev: the true motion field (% of the width per second), each pixel's point seen 0.1 s before
    vec2 ndc = px / uOut * 2.0 - 1.0;
    vec3 rv = uCamF + uCamR * ndc.x * uProj.x + uCamU * ndc.y * uProj.y;
    bool skyp = zl >= 5.5e4;
    vec4 q = skyp ? uPVP * vec4(rv, 0.0) : uPVP * vec4(uCam + rv * zl - uPCam, 1.0);
    float sp = length((ndc - q.xy / q.w) * vec2(0.5, 0.5 * uOut.y / uOut.x)) * 1000.0;
    oC = vec4(clamp(sp / 25.0, 0.0, 1.0), clamp(sp / 2.5, 0.0, 1.0), skyp ? 1.0 : 0.0, 1.0);
    return;
  }
  if (uDbg == 8) {   // (dev, E0: the pop detector's motion field) each pixel's displacement on the window since the film's last
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
  if (uDbg == 9) { oC = vec4(dbgL.x, clamp((dbgL.y - 0.5) * 2.0, 0.0, 1.0), clamp(dbgL.z * 50.0, 0.0, 1.0), 1.0); return; }   // (dev, E1.1: the layering: red its near share where taken, green the depth code, blue how far the samples' codes stand from the one resolved)
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
}`;

