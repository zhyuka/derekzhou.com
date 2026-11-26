  /* ---------------------------------------------------------------- shaders: landmarks, scatter, creatures, the probe */
  /* landmarks: a cell's mesh, its vertices in the world already (seated); the colour's bytes hold half the value and
     the realm's material code, the spare byte its emission; a cell coming into being rises out of the haze (uFade) */
  var VS_LANDMARK = `@glsl vs-landmark`;
  /* a set's instances: one mesh, many placements (a cell's trunks, pillars, lanterns): each its place and seat, its turn
     (and a slow spin), its scale, a tilt, a tint, its emission's share, a bob; the mesh's vertices are its local space
     (the base at y = 0) */
  function FS_LANDMARK(S) {
    return ZCODE + `
uniform float uFade;
centroid in vec3 vW; centroid in vec3 vN; centroid in vec4 vC; centroid in float vY; centroid in vec2 vE; centroid in float vMT; out vec4 oC;
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
  c = mistOver(c, vMT - vW.y, n, rd, fp);   // (delight-weather 1: the mist pools over the stones too)
  vec3 o = atmos(c, rd, t);
  if (uFade < 0.999) o = mix(atmos(c, rd, 3.0e4), o, uFade);
  oC = vec4(o, sceneA());
}`;
  }
  /* scatter: one instance per cell of a grid around the camera; the cell's hash decides if, where, how big */
  var VS_SCATTER = `@glsl vs-scatter`;
  var VS_LMSC = VS_SCATTER.replace(/void\s+main\s*\(\s*\)\s*\{/, 'void scMain() {') + `@glsl vs-lmsc`;   // (the landmarks and the scatter, one program)
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
