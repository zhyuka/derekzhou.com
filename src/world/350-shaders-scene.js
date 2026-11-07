  /* ---------------------------------------------------------------- shaders: the scene */
  /* each opaque fragment's depth, coded into the scene's alpha for the composite: 0.5 + 0.5 log2(linear
     depth, m) / 16 (1 m .. 65 km), 1 on the far plane (the sky); water keeps its reflected share below 0.5 (0.49 (1 -
     F)). The scene's samples are averaged by the resolve, so where a pixel's samples stand at two depths (a floating
     rock's outline against a cloud) its alpha says how many stand near: the composite lays the cloud behind over the far
     ones only (FS_COMP). The depth resolve keeps one sample, so a composite reading it takes each such pixel as wholly
     rock or wholly cloud, and the outline crawls (29% of the edge pixels in between, the reference 51%) */
  var ZCODE = `
float zcode() {
  float d = gl_FragCoord.z; if (d >= 0.999999) return 1.0;
  float n = uProj.z, f = uProj.w, z = d * 2.0 - 1.0, lz = 2.0 * n * f / (f + n - z * (f - n));
  return lz >= 5.9e4 ? 1.0 : 0.5 + 0.5 * clamp(log2(max(lz, 1.0)) / 16.0, 0.0, 1.0);
}
float sceneA() { return gWater > 0.0 ? 0.49 * (1.0 - gWater) : zcode(); }
`;
  function VS_TERRAIN(H, G) {   // (G, a surface's gap function: its height over another surface, passed to its shading as gTX)
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
  /* the split height: the land's height (Hd, HdGap's A_Hd) evaluated by four small fragment passes,
     one RGBA32F texel a point, instead of inside the land's vertex program and the probe. The passes call the realm's
     own functions unchanged (kitW4, dunes, siteOf / basinOf / plateauOf, ridges, A_Hd); only where they are evaluated
     moves. The point a texel stands for: uHsrc 0, a clipmap vertex (x = i, y = level x 97 + j: placed and morphed as the
     land's vertex stage places it, gLodD its distance from the camera); 1, the probe's point (uTex); 2, the probe's grid
     (uGCw), gLodD 0 for both, as in the probe. Then the land's vertex program and the probe read the passes' texels and
     do the last adds as Hd, HdGap and HdProbe do: the same fp32 operations, in the same order (the gate: the one-program
     land VS against this, by transform feedback, bit-identical heights, positions and gaps). The point: the compile.
     One program holding all of Hd takes 2.3 s (land VS) and 1.6 s (probe FS) on ANGLE-D3D11; the parts compile in
     parallel */
  var HP_PARTS = ['kit', 'dunes', 'sites', 'ridges'];
  /* where the split is made: every ANGLE Direct3D11 device, the Windows GPUs (the owner, 2026-11-06: "Yes, if it saves
     100 ms+"). FXC is the same compiler on all of them, so the split's saving is the same everywhere there: the land VS
     (701 ms of FXC) and the probe (486 ms) become passes of at most ~137 ms, the compile wall 701 -> 426 ms
     (.work/hub/speed/FINDING-fxc-census.md). Its heights and gap read back exact and its slopes within one ulp on
     NVIDIA, the one Windows GPU read back (the shipped DXBC is the same for every maker; each driver compiles it to its
     own machine code). Elsewhere (Metal, Linux, Android) the one land program. Per device, so the return visit's
     program cache holds */
  function HP_DEV(r) { return /^ANGLE \(/.test(r || '') && /Direct3D11/.test(r || ''); }
  var HP_GRIDW = `@glsl hp-gridw`;
  var HP_MAIN = {
    kit: 'void main() { gridW(); vec3 wD, wC, lv, sk; kitW4(gw, wD, wC, lv, sk); o0 = vec4(wD, lv.x); o1 = vec4(sk, wC.x); }',
    dunes: 'void main() { gridW(); gKD = texelFetch(uHP0, gq, 0).xyz; o0 = vec4(dunes(gw), 0.0); o1 = vec4(0.0); }',
    sites: 'void main() { gridW(); o0 = vec4(D_HdSites(gw, texelFetch(uHP2, gq, 0).xyz), 0.0); o1 = vec4(0.0); }',
    ridges: 'void main() { gridW(); o0 = vec4(ridges(gw), A_Hd(gw).x); o1 = vec4(0.0); }',
    /* the probe's own two: the one-program probe keeps only the height live (h.x; its slopes are dead), so FXC fuses
       its arithmetic as it does when only .x is written; the land's passes (every channel live, as the land VS) differ
       from it by an ulp at 0.4% of points. Written .x only, the probe's passes read back bit-identical to it */
    sitesX: 'void main() { gridW(); o0 = vec4(D_HdSites(gw, texelFetch(uHP2, gq, 0).xyz).x, 0.0, 0.0, 0.0); o1 = vec4(0.0); }',
    ridgesX: 'void main() { gridW(); o0 = vec4(ridges(gw).x, 0.0, 0.0, A_Hd(gw).x); o1 = vec4(0.0); }'
  };
  /* HP_LAND: the land VS read the passes too. Off: its slopes (the normals) cannot come out bit-identical through any
     texture boundary (the one program fuses and reorders across D_Hd - sk; read back: 1 ulp at ~25% of vertices,
     whatever the cut), so only the probe is split, and the land keeps its one program */
  var HP_LAND = true;   // (the owner, 2026-11-05: the land split's 1-ulp slopes accepted for the speed, on the split's devices only)
  var HP_PROGS = HP_LAND ? ['kit', 'dunes', 'sites', 'ridges', 'sitesX', 'ridgesX'] : ['kit', 'dunes', 'sitesX', 'ridgesX'];   // (P.hp's order: the clipmap runs 0-3, the probe the last four's kit, dunes, sitesX, ridgesX)
  var HP_PORD = HP_LAND ? [0, 1, 4, 5] : [0, 1, 2, 3];
  /* the sites' part of D_Hd (its basins and plateaux over the 3x3 sites), taken from the realm's own D_Hd as it ships
     (as written, or a rewrite of its loops): its body between `vec3 h = dunes(p);` and `return h + ridges(p);`, the h
     handed in. null when D_Hd is not of that shape (the split is then not made: the one-program land and probe) */
  function HP_SITES_FN(g) {
    var a = g.indexOf('vec3 D_Hd(vec2 p) {'); if (a < 0 || g.indexOf('vec3 D_Hd(vec2 p) {', a + 1) >= 0) return null;
    var e = g.indexOf('\n}', a); if (e < 0) return null;
    var body = g.slice(a + 'vec3 D_Hd(vec2 p) {'.length, e), A = '\n  vec3 h = dunes(p);\n', Z = '\n  return h + ridges(p);';
    if (body.indexOf(A) !== 0 || body.lastIndexOf(Z) !== body.length - Z.length || body.split(A).length !== 2 || body.split(Z).length !== 2) return null;
    return '\nvec3 D_HdSites(vec2 p, vec3 h) {\n' + body.slice(A.length, body.length - Z.length) + '\n  return h;\n}\n';
  }
  function VS_TERRAIN_SPLIT(G) {   // VS_TERRAIN with the height read from the passes (Hd - sk, HdGap's terms)
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
  var FS_PROBE_SPLIT = `@glsl fs-probe-split`;
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
  var VS_LANDMARK = `@glsl vs-landmark`;
  /* a set's instances: one mesh, many placements (a cell's trunks, pillars, lanterns): each its place and seat, its turn
     (and a slow spin), its scale, a tilt, a tint, its emission's share, a bob; the mesh's vertices are its local space
     (the base at y = 0) */
  var VS_LANDMARK_INST = `@glsl vs-landmark-inst`;
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
  var VS_SCATTER = `@glsl vs-scatter`;
  var VS_LMSC = VS_SCATTER.replace(/void\s+main\s*\(\s*\)\s*\{/, 'void scMain() {') + `@glsl vs-lmsc`;   // (the landmarks and the scatter, one program)
  /* particles in a volume that wraps around the camera (uPb.w, the kind): 0 grains blown across the ground (dim
     streaks; now and then a grain's facet turns to the sun and it glints), 1 motes (soft points of light drifting in
     the air, bright toward the sun; 2: about the camera's own height), 3 rain (streaks falling with the wind, each
     drop ending in a splash on the ground under it; gusts), 4 drifting things (petals, seeds, embers, spores,
     fireflies: carried by the wind, rising or sinking, wandering, tumbling or flickering, each its own life, in up to
     three colours) */
  var VS_PARTICLE = `@glsl vs-particle`;
  var FS_PARTICLE = `@glsl fs-particle`;
  /* creatures: one instanced draw a flock. Kinds (uFb.w): 1 birds wheeling (each its own orbit about the flock's
     drifting centre, beating and gliding, banking into the turn), 2 rays gliding (a slow wave running back along the
     wings), 3 moths and butterflies (small orbits about a light, a flutter in bursts, bobbing; their own light), 4
     jellies (upright bells drifting, pulsing: the bell narrows and shortens, rising a little on each pulse, threads
     trailing; their own light, drawn added: translucent), 5 floating caps (shallow domes hovering, bobbing, turning
     slowly, a ring of beads about the rim and a glow beneath, breathing). Members are laid out (uFd.z) on their orbits
     (0), up a helix (1: a chain of caps climbing beside a trunk), or still about the centre (2). */
  var VS_CREATURE = HEAD + FRAME_U + LIB + `@glsl vs-creature`;
  var FS_CREATURE = HEAD + FRAME_U + LIB + ZCODE + `@glsl fs-creature`;
  /* sand veils: thin sheets of sand blowing off the dunes' brinks in gusts (the realm's veilSpot moves each onto the
     nearest brink) */
  var VS_RIBBON = `@glsl vs-ribbon`;
  var FS_RIBBON = `@glsl fs-ribbon`;
  /* the ground's height near the camera, from the cache (bilinear over four texels; packed when floats cannot be
     rendered); scatter and particles read it instead of evaluating the realm's height function per vertex */
  var GROUND_LIB = `@glsl ground-lib`;
  /* the realm's ground, at points (packed in bytes, read back) or over a grid about the camera: the land (the first
     surface's height) or the camera's own ground (the realm's camGround, e.g. a bay's cloud top) */
  function FS_PROBE(H, HC, HP) {   // (HP, the realm's probeHgt: one function for both, float HP(vec2 p, bool cam))
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
  /* the phase-2 sky (the galaxy, the aurora: noise reads in a loop under varying branches) compiled only in phase 2:
     a compiler that flattens such branches makes every sky pixel of every sky pay for them (every sky 23-34% dearer
     than the base on a phone's canvas, fair included) */
  var SKY_BODY = (SKY_PHASE >= 2 ? '\n#define SKY_PH2\n' : '') + `@glsl sky-body`;
  var FS_SKY = HEAD + FRAME_U + LIB + SKY_BODY;
  /* the depth, linearised to metres, at half resolution: the nearest of each 2x2 (so cloud never shows in front) */
  var FS_DEPTHDOWN = HEAD + FRAME_U + `@glsl fs-depthdown`;
  var LIB_LIND = `@glsl lib-lind`;
  /* glow sprites: points of light by the thousand (a cell's fireflies, a carpet of light-flowers, a field of embers,
     the lights of a far wall), each a soft core and a faint halo facing the camera, its size in metres with a floor in
     pixels (a far one keeps its light spread over the floor: never a fat bright dot), steady, twinkling, pulsing,
     blinking, drifting about its place or bobbing; depth-tested against the scene and taken by the air, added to the
     HDR scene (so the bloom takes the bright ones) */
  var VS_GLOW = HEAD + FRAME_U + LIB + `@glsl vs-glow`;
  var FS_GLOW = HEAD + `@glsl fs-glow`;
  /* beams: soft shafts of light as geometry (a lantern's beam to a crystal, light falling through a hole in a canopy,
     a tower's beam into the fog): a cone from A (radius rA) to B (rB), its light gathered along each pixel's ray inside
     it (eight samples: a Gaussian across it, a white core, its far end faded, dust drifting along it, a shimmer), cut
     by the scene's depth (the half-resolution linear depth: no beam through a wall), taken by the air, added to the
     HDR scene; a beam drawn on from A (woken when the camera first comes near: a light event) */
  var VS_BEAM = HEAD + FRAME_U + `@glsl vs-beam`;
  var FS_BEAM = HEAD + FRAME_U + LIB + LIB_LIND + `@glsl fs-beam`;
  /* cloud volumes: each body's lobes baked once into a small 3D texture (density; the optical depth toward the sun
     and toward the sky), then ray-marched inside the body's box at half resolution */
  var FS_VDENS = HEAD + FRAME_U + LIB + `@glsl fs-vdens`;
  var FS_VLIGHT = HEAD + FRAME_U + `@glsl fs-vlight`;
  /* the clouds' opaque cores, into the depth only */
  var VS_OCC = HEAD + FRAME_U + `@glsl vs-occ`;
  var FS_OCC = HEAD + `@glsl fs-occ`;
  var VS_VBODY = HEAD + FRAME_U + `@glsl vs-vbody`;
  var FS_VBODY = HEAD + FRAME_U + LIB + LIB_LIND + `@glsl fs-vbody`;
  /* bloom (dual filter): the first pass composes scene and cloud and keeps what is bright; every tap clamped to the
     part of its target this frame drew (a lower rung draws only part of each) */
  var FS_PRE = HEAD + FRAME_U + `@glsl fs-pre`;
  var FS_DOWN = HEAD + `@glsl fs-down`;
  var FS_UP = HEAD + `@glsl fs-up`;
  /* the composite */
  /* the finished frame (the world's resolution) put up to the canvas (the device's): bilinear, as the browser's own
     upscale is (the birds' ink is then drawn over it at the canvas's resolution) */
  /* the half-resolution clouds accumulated over frames: this frame's cloud (uCloud) and the last
     accumulation (uHist, the same pixel), the latter held to this frame's 3 x 3 neighbourhood (each channel's least and
     most: a cloud that moved or changed is never ghosted beyond what this frame has about it), mixed at uCA.x (this
     frame's share). The march samples a far tower's relief and a cloud's rim at half resolution, and as the view moves
     its detail crawls from one frame to the next in single texels (491 x 1065: the cloud-edge film's moving excess
     1.14 codes, the far tower's face and the rims); a few frames' average is what a finer march would show.
     Reprojected by the view's turn: read at the same pixel, the history in a drag (69 deg/s, 4-5 half-resolution
     texels a frame) leaves the clamp holding a smear of the last frames (the drag film's moving, blur-matched and
     flicker readings 1.5-2.6x those without the accumulation). Each pixel's ray is put into the last frame's view (uRM, the two views' rotations; the clouds stand 100 m and more off, so the camera's own travel in a
     frame, under a metre, is a fraction of a texel there and inside the clamp) and the history read there by a
     Catmull-Rom spline; where it falls outside the last view this frame stands alone. Held still, the ray lands on its own texel's centre
     and the read is the texel itself: steady flight reads the same pixel */
  var FS_CACC = HEAD + LIB_LIND + `@glsl fs-cacc`;
  var FS_BLIT = HEAD + `@glsl fs-blit`;
  var FS_COMP = HEAD + FRAME_U + LIB + LIB_LIND + `@glsl fs-comp`;

