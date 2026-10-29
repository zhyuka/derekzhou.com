// The comments in this file keep the tags and file names of the world's development record (design-v5, its rounds,
// fixes and judges; notes.md, w04b_sky.js, diag.js and the like), which lives outside this repository (CLAUDE.md).
/* world.js — the world behind the page (v4 engine, round 3a): free flight through an endless world of realms.

   The window is a camera flying through a 3D world drawn in WebGL2, generated in code from the visit's seed (no
   picture, no model file). The visitor steers it: a drag anywhere on the page (touch, pen, or a mouse with its button
   held) turns the view and the flight, the scene following the finger as in a 360-degree viewer, and tilts it to climb
   or dive; or the phone itself, turned about (its rotation from where it was when motion was enabled). Nothing is
   shown for it. Left alone, the view holds the heading the visitor last set (at the landing, the landing's own) and
   flies straight and level but for the ground's rise: nothing turns it by itself (design-v5 Revision 3: no tour, no
   aiming at places, no weave, no nod). What stands ahead and cannot be climbed is passed by a slip sideways, planned
   from first sight with the heading held (slipPlan). The world has no edge: a realm is a field (its land as global functions in GLSL, its
   areas laid out over the plane as regions, its light) and cells (landmarks, clouds, creatures and points of interest
   generated per world cell from the visit's seed and the cell's coordinates), streamed in about the camera within a
   budget a frame and freed behind it. Every 60-120 s the realm changes around the camera, flown straight on whichever
   heading it holds: a bank of cloud forms ahead, the cloud closes about the eye (its mist fixed in the cloud's own
   frame), the next realm is generated about the camera's place while the cloud is whole, the view's framing eased
   from the one realm's to the next's (pitchCarry), and the camera comes out of the cloud into it.

   What is drawn, each frame:
     the scene (HDR, RGBA16F, drawn with 4 samples a pixel where the device allows, resolved into a texture and its
       depth before anything reads it): the sky; each surface of the realm as a GPU geometry clipmap
       (nested rings of one grid around the camera, raised in the vertex shader by the realm's height function, odd
       vertices morphed onto the coarser ring); the cells' landmarks (one mesh a cell, seated on the ground); the
       scatter (instanced per cell of a grid about the camera); creatures; particles;
     the depth, linearised at half resolution;
     the clouds at half resolution: each cloud body baked once into a small 3D texture (its lobes joined into one form,
       billowed, stored as a signed distance beside the optical depth toward the sun and the sky), marched in its box
       far to near, cut by the scene's depth; then, in a transition, the cloud the camera is in (in camera space);
     bloom, light shafts, and the composite: the clouds brought up edge-aware (a cubic B-spline over an even surface,
       weighted by depth across the land's edges), a shoulder that keeps hue, the realm's grade, the words' lift (under
       dark words only, the ground raised where black words need it; nothing is ever drawn darker for the words), one
       fixed 8-bit dither.

   Every realm registers itself (realms.js) with WORLD.realm({...}). Time is requestAnimationFrame's own (no clock
   read); randomness is one draw from the crypto API above INIT-END, split into splitmix32 streams and integer hashes.

   The shipped page has no harness: of the attributes on <html> the world reads only data-sky and data-sky-at (the
   hour's script writes them), it puts nothing on window but WORLD (the realms' and the ink birds' registry) and
   skyAir (the hand-over with today's birds), and it keeps no record (the switches stay at their defaults; the record's
   code is unreachable). The page's one clock is clockNow(): read for budgets only, never for what is drawn. */
(function () {
  'use strict';
  /* the one clock: time budgets and the record, never content (CI: performance.now exactly once, here) */
  function clockNow() { return performance.now(); }
  var EVAL0 = clockNow();   // (the record: when this script's evaluation began)
  var root = document.documentElement;
  /* (tod fix round, the judges' defect 9) the browser's bar takes the world's still top for the hour's group as this
     script's first act (the page's body shows the world's still from its first paint; hour.v2.js's colour is the live
     sky's still top), before the boot's heavy work; the drawn sky's own follows once it shows (skyTheme), the still's
     when it hides (markStill). The tops are the world's still skies' (style.css, tools/stillsky.py). */
  var SKYTOP = { dawn: '#6f9fdf', day: '#afc6e1', rain: '#9ed4e9', sunset: '#d9c3c8', dusk: '#4c3b66', night: '#14295f' };
  var THEME0 = document.querySelector('meta[name="theme-color"]'), TOP0 = SKYTOP[root.getAttribute('data-sky')];
  if (THEME0 && TOP0 && document.querySelector('canvas.sky')) THEME0.setAttribute('content', TOP0);
  var canvas = document.querySelector('canvas.sky');
  if (!canvas || typeof WebGL2RenderingContext === 'undefined') return;

  function attr(n) { return root.getAttribute(n); }
  var OPT = { realm: null, seed: null, t: null, ss: null, still: false, dev: false, dur: null, nogov: false, dtmax: null, order: null,
    sw: null, cvs: null, skyScene: null, skyNext: null, skyDt: null };   // (the shipped page: no harness, every option the visitor's)
  /* the visitor's hour: hour.v2.js (in the head, before the first paint) marks the page with its group (data-sky: dawn,
     day, rain, sunset, dusk, night); read here once, before the world marks the page with its own still sky. The world
     itself reads no clock. */
  var HOUR = attr('data-sky') || 'day';

  /* ---------------------------------------------------------------- the visit's weather (the one draw of entropy) */
  var SEED0, ent = new Uint32Array(1); crypto.getRandomValues(ent); SEED0 = ent[0];
  /* ---- INIT-END: no entropy below this line; no clock but clockNow() (budgets and the record, never content) ---- */

  /* ---------------------------------------------------------------- streams */
  function mix32(a) { a = (a + 0x9e3779b9) | 0; var t = a ^ (a >>> 16); t = Math.imul(t, 0x21f0aaad); t ^= t >>> 15; t = Math.imul(t, 0x735a2d97); return (t ^ (t >>> 15)) >>> 0; }
  function splitmix32(seed) {
    var s = seed | 0;
    return function () { s = (s + 0x9e3779b9) | 0; var t = s ^ (s >>> 16); t = Math.imul(t, 0x21f0aaad); t ^= t >>> 15; t = Math.imul(t, 0x735a2d97); return ((t ^ (t >>> 15)) >>> 0) / 4294967296; };
  }
  function subseed(seed, salt) { return mix32((seed ^ mix32(salt * 0x632be5ab + 0x1b873593)) | 0); }
  function RNG(seed) {   // a stream with helpers (handed to the realms)
    var f = splitmix32(seed);
    return {
      f: f,
      r: function (a, b) { return a + (b - a) * f(); },
      i: function (n) { return Math.floor(f() * n); },
      pick: function (a) { return a[Math.floor(f() * a.length)]; },
      n: function () { var u = Math.max(f(), 1e-9), v = f(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(6.2831853 * v); },
      sign: function () { return f() < 0.5 ? -1 : 1; },
      seed: function () { return Math.floor(f() * 4294967296) >>> 0; }
    };
  }
  /* integer hashes, the same in JS and GLSL bit for bit (the layout of a realm's areas is read on both sides: the
     shaders raise the land from it, the cells place things by it) */
  function ihash(x) { x = x >>> 0; x ^= x >>> 16; x = Math.imul(x, 0x7feb352d) >>> 0; x ^= x >>> 15; x = Math.imul(x, 0x846ca68b) >>> 0; x ^= x >>> 16; return x >>> 0; }
  function ihash2(ix, iz) { return ihash((Math.imul(ix >>> 0, 0x8da6b343) ^ ihash(((iz >>> 0) + 0x68e31da4) >>> 0)) >>> 0); }
  function cellHash(ix, iz, salt) { return ihash((ihash2(ix, iz) ^ salt) >>> 0); }
  function hfl(h) { return (h >>> 8) / 16777216; }   // [0, 1) from a hash, as GLSL's hf()
  function hk(h, k) { return ihash((h + k) >>> 0); }  // the k-th hash after h, as GLSL's ih(h + k)

  /* ---------------------------------------------------------------- colour */
  function s2l(c) { return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }
  function hex(h) { var n = parseInt(h.slice(1), 16); return [s2l((n >> 16 & 255) / 255), s2l((n >> 8 & 255) / 255), s2l((n & 255) / 255)]; }
  function oklab2lin(L, a, b) {
    var l = L + 0.3963377774 * a + 0.2158037573 * b, m = L - 0.1055613458 * a - 0.0638541728 * b, s = L - 0.0894841775 * a - 1.2914855480 * b;
    l = l * l * l; m = m * m * m; s = s * s * s;
    return [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s];
  }
  function lch(L, C, h, k) { var r = h * Math.PI / 180, c = oklab2lin(L, C * Math.cos(r), C * Math.sin(r)); k = k === undefined ? 1 : k; return [Math.max(c[0], 0) * k, Math.max(c[1], 0) * k, Math.max(c[2], 0) * k]; }
  function lum(c) { return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; }
  function lab(L, C, h) { var r = h * Math.PI / 180; return [L, C * Math.cos(r), C * Math.sin(r)]; }
  function hexLum(h) { return lum(hex(h)); }

  /* ---------------------------------------------------------------- small vector maths (build time) */
  function v3(x, y, z) { return [x, y, z]; }
  function add(a, b) { return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]; }
  function sub3(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
  function mul(a, s) { return [a[0] * s, a[1] * s, a[2] * s]; }
  function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
  function cross(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
  function norm(a) { var l = Math.sqrt(a[0] * a[0] + a[1] * a[1] + a[2] * a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; }
  function clamp(x, a, b) { return x < a ? a : x > b ? b : x; }
  function smooth(a, b, x) { var t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function dirAzEl(az, el) { var a = az * Math.PI / 180, e = el * Math.PI / 180; return [Math.sin(a) * Math.cos(e), Math.sin(e), Math.cos(a) * Math.cos(e)]; }
  function angDiff(a, b) { var d = a - b; d -= Math.floor((d + Math.PI) / (2 * Math.PI)) * 2 * Math.PI; return d; }   // a - b in (-pi, pi]
  var PI = Math.PI, DEG = Math.PI / 180;
  var BUILD = 'b0300e91';   // (E1 Fix 3: make.sh writes in world.js's md5 prefix, as built with this placeholder; the record files it)

  /* ---------------------------------------------------------------- the context */
  var gl = null, EXT = {}, FLOAT_RT = false, FLOAT32_RT = false, HALF = 0, LOST = false, DEFS = '', AAS = 0, AASUP = [];   // (AAS, E1 Fix 3: the scene's samples a pixel; AASUP, E1.1: the counts the context offers, up to the switch aa)
  var STILLMODE = false;                                    // (the shipped page: no harness drives the time)
  var DEVMODE = false;                                      // (and no dev hooks)
  function getGL() {
    gl = canvas.getContext('webgl2', { antialias: false, alpha: false, depth: false, stencil: false, premultipliedAlpha: true, preserveDrawingBuffer: DEVMODE, powerPreference: 'default' });
    if (!gl) return false;
    initExtensions();
    return true;
  }
  /* the extensions are the context's: a restored context has them all off again, so they are asked for at start and
     after every restore (float render targets, parallel compiles), and the shaders' defines follow them */
  function initExtensions() {
    EXT.cbf = gl.getExtension('EXT_color_buffer_float');
    EXT.cbh = EXT.cbf ? null : gl.getExtension('EXT_color_buffer_half_float');
    EXT.par = gl.getExtension('KHR_parallel_shader_compile');
    FLOAT_RT = !!(EXT.cbf || EXT.cbh); FLOAT32_RT = !!EXT.cbf;
    HALF = FLOAT_RT ? gl.HALF_FLOAT : gl.UNSIGNED_BYTE;
    var dbg = gl.getExtension('WEBGL_debug_renderer_info');
    EXT.renderer = dbg ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL)) : String(gl.getParameter(gl.RENDERER) || '');
    // without float targets the linear depth and the ground's height are packed into the bytes of an RGBA8 texel
    DEFS = (FLOAT_RT ? '' : '#define LIND_PACKED\n') + (FLOAT32_RT ? '' : '#define GC_PACKED\n');
    /* (round E1 Fix 3, G0) the scene drawn with 4 samples a pixel (MSAA) where the scene's colour format and its depth
       both allow it: the scene's hard edges (a floating rock, a standing stone, a dune's crest, a far mesa's outline)
       stepped a whole pixel from one frame to the next at 1 sample (FXAA only), which the 4x reference does not; four
       samples resolve each edge pixel to its covered share, so an edge sliding across the pixels moves in fifths. The
       samples are resolved (blitFramebuffer) into the scene's own texture and depth before the depth pass, and are never
       stored (invalidated after the resolve: a tile GPU keeps them on chip). Switch aa (boot): 4 (default), 2, or 0 off.
       Asked once at the context's start (and after a restore): getInternalformatParameter is a boot-time query */
    AAS = 0; AASUP = [];
    try {
      var want = SW.aa | 0;
      if (want > 1) {
        var sc = gl.getInternalformatParameter(gl.RENDERBUFFER, FLOAT_RT ? gl.RGBA16F : gl.RGBA8, gl.SAMPLES), sd = gl.getInternalformatParameter(gl.RENDERBUFFER, gl.DEPTH_COMPONENT24, gl.SAMPLES);
        for (var i = 0; sc && i < sc.length; i++) if (sc[i] <= want && sd && Array.prototype.indexOf.call(sd, sc[i]) >= 0) AASUP.push(sc[i]);
      }
    } catch (e) { AASUP = []; }
    AAS = memPlanAA();   // (E1.1, item 5: the samples the memory allows, w10_engine.js)
  }
  /* (Fix 2, T4) the context is made in the boot's first frame (stage A, design-v5 14), not at this script's top level:
     WebGL2's context and its extensions took about 210 of world.js's 276 ms of evaluation here (trace x1), which no
     cut of world.js into parts would have removed; the scripts' top levels now only define */

  var FAILMSG = null;
  function fail(msg) { FAILMSG = msg; }   // (the shipped page: kept here, never put on window or logged)
  var LOSTP = 'lost';   // what a stage returns when the context was lost under it (never a failure of the realm's)

  /* ---------------------------------------------------------------- GLSL: the shared library */
  var HEAD = '#version 300 es\nprecision highp float;\nprecision highp int;\nprecision highp sampler3D;\nprecision highp sampler2D;\n';
  var FRAME_U = `
uniform vec3 uCam; uniform vec3 uCamR, uCamU, uCamF; uniform vec4 uProj; uniform mat4 uVP;
uniform vec2 uRes; uniform float uT; uniform int uDbg;
uniform vec3 uSun; uniform vec3 uSunC;
uniform vec4 uTwM;    // (tod fix3) the twilight's low mist as the light crosses the inks' band: its amount (0: none), its half-height and feather about the horizon (sines of elevation)
uniform vec3 uSkyS;   // (tod) the sky's own light: its glow, its warmth and its disc (the key light's azimuth at the sky's own elevation; the key itself by day)
uniform vec3 uSky[6]; uniform vec4 uSkyE; uniform vec3 uSkyW; uniform vec4 uSkyK;
uniform vec4 uGlow; uniform vec3 uGlowC; uniform vec4 uFog; uniform vec4 uFog2; uniform vec4 uFogB;
uniform vec4 uHaze; uniform vec3 uHazeC, uHazeW;   // the ground haze: density at its base (1/m), scale height (m), its base below the eye (m), -; colour, toward the sun
uniform vec3 uAmbU, uAmbD;
uniform vec3 uClLit, uClShade, uClDeep, uClRim; uniform vec4 uClK, uClK2;
uniform vec4 uP[24];   // the realm's parameters for this visit
uniform uint uSalt;    // the visit's salt for the layout's hashes (cellHash)
uniform sampler3D uN3;
uniform highp sampler2D uGround; uniform vec4 uGC;   // the ground's height cached around the camera: origin x, z; cell (m); texels across
uniform float uSunVis;  // how much of the sun the sky shows (its disc, glare, halo, streak, glint): 0 where there is none (an interior, an overcast)
uniform vec4 uWet;      // water: the rain's rings (0 .. 1), the ripples' strength, the wind's direction (x, z)
`;
  /* the air: the sky's light, its glow, the fog and the ground haze, the ambient (round 2: its own string, so a program
     that needs only these, the birds' ink, compiles only these) */
  var LIB_AIR = `
/* the sky's light: a gradient by elevation, warmer toward the sun and low, the sun's glow */
vec3 skyGrad(float e) {
  if (e < 0.0) return mix(uSky[1], uSky[0], smoothstep(0.0, 14.0, -e));
  vec3 c = mix(uSky[1], uSky[2], smoothstep(0.0, uSkyE.x, e));
  c = mix(c, uSky[3], smoothstep(uSkyE.x, uSkyE.y, e));
  c = mix(c, uSky[4], smoothstep(uSkyE.y, uSkyE.z, e));
  return mix(c, uSky[5], smoothstep(uSkyE.z, uSkyE.w, e));
}
float sunSide(vec3 rd) { vec2 h = normalize(rd.xz + vec2(1e-6, 0.0)), s = normalize(uSkyS.xz + vec2(1e-6, 0.0)); return 0.5 + 0.5 * dot(h, s); }
vec3 skyCol(vec3 rd) {
  float e = degrees(asin(clamp(rd.y, -1.0, 1.0)));
  vec3 c = skyGrad(e);
  float side = sunSide(rd), low = exp(-max(e, 0.0) / uSkyK.y);
  c = mix(c, uSkyW, uSkyK.x * side * side * low);
  c *= 1.0 - uSkyK.z * (1.0 - side) * low;
  float cs = max(dot(rd, uSkyS), 0.0);
  c += uGlowC * (uGlow.x * pow(cs, uGlow.y) + uGlow.z * pow(cs, uGlow.w));
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
vec3 hazeCol(vec3 rd) { float cs = max(dot(normalize(vec3(rd.x, 0.0, rd.z) + 1e-6), normalize(vec3(uSkyS.x, 0.0, uSkyS.z) + 1e-6)), 0.0); return mix(uHazeC, uHazeW, cs * cs * cs); }
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
  if (uTwM.x > 0.0) c = mix(c, fogCol(rd), uTwM.x * (1.0 - smoothstep(uTwM.y, uTwM.y + uTwM.z, abs(rd.y))));
  return c;
}
vec3 ambient(vec3 n) { return mix(uAmbD, uAmbU, 0.5 + 0.5 * n.y); }
`;
  var LIB = `
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
` + LIB_AIR + `/* water: ripples running with the wind, rings where the rain falls (uWet.x), the sky and the sun's glint reflected by
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
  if (uWet.x > 0.0) g += rainRings(p.xz, t) * 0.25 * uWet.x * (1.0 - smoothstep(0.02, 0.12, fp));
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
`;
  /* the OKLab conversions (world6w: the composite no longer takes them; kept for the realms' library) */
  var LIB_OKLAB = `
vec3 lin2oklab(vec3 c) {
  float l = 0.4122214708 * c.r + 0.5363325363 * c.g + 0.0514459929 * c.b;
  float m = 0.2119034982 * c.r + 0.6806995451 * c.g + 0.1073969566 * c.b;
  float s = 0.0883024619 * c.r + 0.2817188376 * c.g + 0.6299787005 * c.b;
  l = pow(max(l, 0.0), 1.0 / 3.0); m = pow(max(m, 0.0), 1.0 / 3.0); s = pow(max(s, 0.0), 1.0 / 3.0);
  return vec3(0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s, 1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s);
}
vec3 oklab2lin(vec3 c) {
  float l = c.x + 0.3963377774 * c.y + 0.2158037573 * c.z, m = c.x - 0.1055613458 * c.y - 0.0638541728 * c.z, s = c.x - 0.0894841775 * c.y - 1.2914855480 * c.z;
  l = l * l * l; m = m * m * m; s = s * s * s;
  return vec3(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s);
}
`;
  var VS_FULL = HEAD + 'void main() { vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2)); gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0); }';
  // the sky's triangle lies on the far plane: drawn after the land, it is shaded only where nothing else stands
  var VS_FAR = HEAD + 'void main() { vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2)); gl_Position = vec4(p * 2.0 - 1.0, 1.0, 1.0); }';

  /* ---------------------------------------------------------------- programs */
  /* (E1, design-v5 8.4) every program the page will ever draw with is registered before the world shows, and the boot's
     stage C makes them, one at a time (Fix 2: progStep). After the world shows nothing is compiled, linked or asked (S1, S3):
     compile() then fails loudly (dev: throws), and the programs' uniforms are the ones read once at the link.
     A context lost under a query is reported as such (LOSTP), never as a broken program. */
  var PROGS = [];   // (every program, in the order registered)
  var PROGX = { compiled: 0, linked: 0, finished: 0, broken: 0, cur: null };   // (stage C's progress, for the boot's timeline; cur: the program in flight, Fix 2)
  function compile(vs, fs, name) {
    if (shown && !STILLMODE) { fail('program ' + name + ' asked for after the world showed (S1)'); if (DEVMODE) throw new Error('S1: program ' + name + ' after show'); }
    var P = { p: null, name: name, u: null, ok: false, vs: vs, fs: fs, v: null, f: null, st: 0 };   // st: 0 registered, 1 compiled, 2 linked (status not asked), 3 finished
    PROGS.push(P);
    return P;
  }
  /* stage C (Fix 2 of round E1: one program at a time). Round E1 first compiled every shader and linked every program
     in as few slices as the calls allowed and then asked their status a frame at a time; but a deadline cannot split a
     call, and where the calls are messages to a GPU process (WebKit, iOS) that was all of them at once: the owner's
     first iPhone record shows one boot frame of 20,442 ms and fifteen programs stamped done within 3 ms of each other
     (round E0's batch). Now one program is in flight at a time: its two shaders given and compiled and the program
     linked, one flush; then nothing else synchronous is asked while it is outstanding (the boot's read-back waits for
     stage E) but its own completion, once a frame (with KHR_parallel_shader_compile a query that never waits for the
     link; without it the link status itself, a frame after the link went out: a wait for that one program alone); the
     next is issued only once it has reported done, in the next frame (Fix 3). The order: the volume programs (vdens, vlight,
     vbody), then the realms' surfaces and landmarks, then the rest as registered. Each program keeps when it was issued
     and when it was found done (clock and frame), its completion queries and their time, so the record can say which
     program is slow (rec.bootStages.programs.one). sync (the harness's stills, a context restored under them): every
     program at once, as before. Returns true once every program is finished, false while not yet, LOSTP if the
     context went; a broken program (its link failed) is finished with ok false and named in fail() */
  var PORDER = null, VOLP = ['engine.vdens', 'engine.vlight', 'engine.vbody'];
  function progOrder() {
    var a = [], b = [], c = [], i, n;
    for (i = 0; i < PROGS.length; i++) {
      n = PROGS[i].name;
      if (VOLP.indexOf(n) >= 0) a.push(PROGS[i]);
      else if (n.indexOf('engine.') !== 0 && n.indexOf('birds:') !== 0 && /\.(surface\d+|landmark|landmarkInst)$/.test(n)) b.push(PROGS[i]);
      else c.push(PROGS[i]);
    }
    a.sort(function (x, y) { return VOLP.indexOf(x.name) - VOLP.indexOf(y.name); });
    return a.concat(b, c);
  }
  function progIssue(P) {
    var tc = clockNow();
    P.kb = Math.round((P.vs.length + P.fs.length) / 1024);
    P.p = gl.createProgram();
    P.v = gl.createShader(gl.VERTEX_SHADER); gl.shaderSource(P.v, P.vs.replace('#version 300 es\n', '#version 300 es\n' + DEFS)); gl.compileShader(P.v);
    P.f = gl.createShader(gl.FRAGMENT_SHADER); gl.shaderSource(P.f, P.fs.replace('#version 300 es\n', '#version 300 es\n' + DEFS)); gl.compileShader(P.f);
    P.vs = P.fs = null; P.st = 1; PROGX.compiled++;
    P.cms = +(clockNow() - tc).toFixed(2);   // (the main thread's share of its compile)
    var tl = clockNow(); gl.attachShader(P.p, P.v); gl.attachShader(P.p, P.f); gl.linkProgram(P.p); P.st = 2; PROGX.linked++; P.lms = +(clockNow() - tl).toFixed(2);
    P.issAt = +tc.toFixed(1); P.issF = FRAMEN; P.polls = 0; P.qms = 0;
  }
  function progDone(P) {   // its status read (and its uniforms): true linked, false broken, LOSTP
    var tf = clockNow(), r = finish(P);
    if (r === LOSTP) return LOSTP;
    P.fms = +(clockNow() - tf).toFixed(2); P.doneAt = +clockNow().toFixed(1); P.doneF = FRAMEN;
    PROGX.finished++; if (!r) PROGX.broken++;
    return r;
  }
  function progStep(sync, deadline) {
    var i, P;
    if (gl.isContextLost()) return LOSTP;
    if (sync) {
      for (i = 0; i < PROGS.length; i++) if (PROGS[i].st === 0) progIssue(PROGS[i]);
      gl.flush();
      for (i = 0; i < PROGS.length; i++) { P = PROGS[i]; if (P.st === 2 && progDone(P) === LOSTP) return LOSTP; }
      return true;
    }
    if (!PORDER || PORDER.length !== PROGS.length) PORDER = progOrder();
    P = PROGX.cur;
    if (P) {   // the one in flight: its completion, once a frame
      if (EXT.par) {
        var tq = clockNow(), done = gl.getProgramParameter(P.p, EXT.par.COMPLETION_STATUS_KHR);
        P.polls++; P.qms = +(P.qms + clockNow() - tq).toFixed(2);
        if (gl.isContextLost()) return LOSTP;
        if (!done) return false;
      }
      if (progDone(P) === LOSTP) return LOSTP;
      PROGX.cur = null;
      // (Fix 3) the next one is issued in the next frame: a frame carries one program's calls (its issue, or its
      // completion read), so the record can name the one program a long frame belongs to (Fix 2 read one and issued
      // the next in the same frame, and booked the frame to both)
      for (i = 0; i < PORDER.length; i++) if (PORDER[i].st === 0) return false;
      for (i = 0; i < PROGS.length; i++) if (PROGS[i].st !== 3) return false;
      return true;
    }
    for (i = 0; i < PORDER.length; i++) if (PORDER[i].st === 0) break;
    if (i >= PORDER.length) { for (i = 0; i < PROGS.length; i++) if (PROGS[i].st !== 3) return false; return true; }
    P = PORDER[i]; progIssue(P); gl.flush(); PROGX.cur = P;
    return false;
  }
  function progsDone() { for (var i = 0; i < PROGS.length; i++) if (PROGS[i].st !== 3) return false; return true; }
  var UNITS = { uN3: 0, uKW: 1, uDepth: 2, uScene: 3, uCloud: 4, uBloom: 5, uShaft: 6, uTex: 7, uTex2: 8, uTex3: 8, uLinD: 9, uVol: 10, uGround: 11, uInkKeep: 12, uWin: 13, uPts: 7, uHist: 14, uSceneH: 15 };
  function finish(P) {   // true: linked; false: broken; LOSTP: the context was lost (asked again after the restore)
    if (P.st === 3) return P.ok;
    if (P.st !== 2) return false;
    if (gl.isContextLost()) return LOSTP;
    var st = gl.getProgramParameter(P.p, gl.LINK_STATUS);
    if (st === null || gl.isContextLost()) return LOSTP;
    if (!st) {
      var log = P.name + ': ' + (gl.getShaderInfoLog(P.v) || '') + ' / ' + (gl.getShaderInfoLog(P.f) || '') + ' / ' + (gl.getProgramInfoLog(P.p) || '');
      if (gl.isContextLost()) return LOSTP;
      fail(log); P.u = {}; P.ok = false; P.st = 3; return false;
    }
    var u = {}, n = gl.getProgramParameter(P.p, gl.ACTIVE_UNIFORMS);
    for (var i = 0; i < n; i++) { var a = gl.getActiveUniform(P.p, i); if (a) u[a.name.replace(/\[0\]$/, '')] = gl.getUniformLocation(P.p, a.name); }
    P.u = u; P.ok = true; P.st = 3;
    if (REC) recLink(P, true);   // (E0: each link's completion, for the boot's timeline)
    gl.useProgram(P.p);
    for (var k in UNITS) if (u[k]) gl.uniform1i(u[k], UNITS[k]);
    gl.deleteShader(P.v); gl.deleteShader(P.f); P.v = P.f = null;
    return true;
  }
  function freeProg(P) { if (P && P.p) { gl.deleteProgram(P.p); P.p = null; var i = PROGS.indexOf(P); if (i >= 0) PROGS.splice(i, 1); } }

  /* ---------------------------------------------------------------- render targets (made at full size, used in part) */
  function tex2d(w, h, ifmt, fmt, type, filter, data) {
    var t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texImage2D(gl.TEXTURE_2D, 0, ifmt, w, h, 0, fmt, type, data || null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return t;
  }
  var FBOK = {};   // (E1.1: the kinds of target whose completeness was asked)
  function target(w, h, kind, depthTex) {
    var T = { w: w, h: h, f: gl.createFramebuffer() };
    if (kind === 'hdr') T.t = tex2d(w, h, FLOAT_RT ? gl.RGBA16F : gl.RGBA8, gl.RGBA, HALF, gl.LINEAR);
    else if (kind === 'r16') T.t = tex2d(w, h, FLOAT_RT ? gl.R16F : gl.RGBA8, FLOAT_RT ? gl.RED : gl.RGBA, HALF, gl.NEAREST);
    else T.t = tex2d(w, h, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, gl.LINEAR);
    gl.bindFramebuffer(gl.FRAMEBUFFER, T.f);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, T.t, 0);
    if (depthTex) {
      T.d = tex2d(w, h, gl.DEPTH_COMPONENT24, gl.DEPTH_COMPONENT, gl.UNSIGNED_INT, gl.NEAREST);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, T.d, 0);
    }
    // (E1.1, item 5; S3) asked once a kind of target, the first time it is made (at the boot, or a restore's): never again
    // on a resize, a rotation or a change of scale, where it was a synchronous call in a frame's work
    var ck = kind + (depthTex ? '+d' : '');
    if (!FBOK[ck]) { if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE && !gl.isContextLost()) fail('framebuffer ' + kind + ' incomplete'); else FBOK[ck] = 1; }
    return T;
  }
  function freeTarget(T) { if (!T) return; gl.deleteFramebuffer(T.f); gl.deleteTexture(T.t); if (T.d) gl.deleteTexture(T.d); }

  /* ---------------------------------------------------------------- the 3D noise (tiling, 32 cubed, made once) */
  /* (E1, design-v5 8.5) baked on the GPU: round 3b baked it on the CPU (bakeNoise3, 48 ms of the main thread here at
     x1, a long task on a phone). The same field, bit for bit: the CPU draws the same random points and lattices from
     the same stream (18,688 numbers, a fraction of a millisecond), the GPU evaluates round 3b's Worley and value noise
     at every voxel (a draw of K layers by MRT a frame, K = 8 where the context has eight draw buffers, 6 here in
     Chromium), and the few voxels whose exact value lies within a thousandth of a code of a rounding boundary in any
     channel (NOISE_FIX: 258 of 32,768, listed by src/noise_fix.js from the exact field and checked by make.sh) are
     worked out on the CPU in double precision as round 3b did and written over the GPU's, so a GPU's float32 rounding
     can never change a byte. Then the mipmaps, as before. NOISE.done once all of that is in. */
  var NOISE_FIX = [68,118,235,594,630,1040,1237,1238,1422,1461,1505,1856,1874,2071,2201,2606,2625,2857,3034,3066,3072,3240,3299,3305,3502,3503,3647,3706,3789,4145,4639,4720,4772,4843,5020,5125,5217,5306,5391,5536,5640,5956,6023,6024,6222,6270,6281,6449,6586,6901,6949,7203,7221,7542,8018,8056,8123,8185,8208,8433,8779,8881,9051,9138,9147,9342,9420,9646,9732,9741,9744,9838,10074,10313,10344,10480,10635,10706,10807,11109,11136,11196,11467,11509,11563,11764,11788,11833,11923,12135,12416,12425,12547,12612,12719,12770,12844,13312,13571,13742,13905,13913,14151,14273,14305,14346,14438,14452,14494,14727,14937,14942,14948,15204,15205,15604,15644,15660,15676,15784,15855,15907,16187,16237,16285,16308,16335,16445,16639,16759,16830,17035,17126,17147,17237,17324,17437,17922,18123,18315,18464,18500,18547,18720,18902,18973,19056,19103,19143,19315,19448,19510,19566,19604,19790,20543,20928,20936,21001,21197,21356,21463,21574,21941,22461,22522,22554,22701,22876,23166,23180,23332,23363,23585,23593,23636,23665,23709,23921,23940,23965,24100,24207,24248,24344,24462,24566,25216,25563,25664,25749,25779,25913,25939,26169,26382,26604,26610,26851,26876,26886,26939,26951,27219,27293,27380,27419,27653,27702,27743,27760,27763,27982,28000,28069,28121,28193,28226,28274,28407,28436,28454,28491,28521,28523,28720,28911,28941,29143,29429,29456,29701,29711,29965,30217,30419,30500,30544,30545,30911,30982,31056,31065,31292,31356,31398,31416,31501,31642,32017,32035,32207,32269,32410,32460,32564,32723,32730];
  var NOISE = { t: null, fb: null, pts: null, prog: null, z: 0, K: 0, done: false, fixed: 0, raw: null };
  var NOISE_N = 32, NOISE_PTS = [[0, 4, 3], [192, 8, 3], [1728, 16, 3], [14016, 4, 1], [14080, 8, 1], [14592, 16, 1]];   // (offset, n, components): P4, P8, P16, L4, L8, L16
  /* round 3b's stream, in its order: the points of the Worley noise at 4, 8 and 16 cells across, then the value
     noise's lattices (all of them float32, as round 3b's Float32Arrays held them) */
  function noiseData() {
    var r = RNG(0x5eed1234), a = new Float32Array(256 * 73);
    for (var i = 0; i < 18688; i++) a[i] = r.f();
    return a;
  }
  /* round 3b's own arithmetic (double precision) for one voxel, into out[o..o+3] */
  function noiseVoxel(D, x, y, z, out, o) {
    var N = NOISE_N, u = (x + 0.5) / N, v = (y + 0.5) / N, w = (z + 0.5) / N;
    function worley(n, base) {
      var px = u * n, py = v * n, pz = w * n, ix = Math.floor(px), iy = Math.floor(py), iz = Math.floor(pz), best = 9;
      for (var dz = -1; dz <= 1; dz++) for (var dy = -1; dy <= 1; dy++) for (var dx = -1; dx <= 1; dx++) {
        var cx = ix + dx, cy = iy + dy, cz = iz + dz, k = base + ((((cz % n) + n) % n * n + (((cy % n) + n) % n)) * n + (((cx % n) + n) % n)) * 3;
        var fx = cx + D[k] - px, fy = cy + D[k + 1] - py, fz = cz + D[k + 2] - pz, d = fx * fx + fy * fy + fz * fz;
        if (d < best) best = d;
      }
      return Math.sqrt(best);
    }
    function vnoise(n, base) {
      var px = u * n, py = v * n, pz = w * n, ix = Math.floor(px), iy = Math.floor(py), iz = Math.floor(pz);
      var fx = px - ix, fy = py - iy, fz = pz - iz; fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy); fz = fz * fz * (3 - 2 * fz);
      function g(a, b, c) { return D[base + ((((c % n) + n) % n) * n + (((b % n) + n) % n)) * n + (((a % n) + n) % n)]; }
      var x00 = lerp(g(ix, iy, iz), g(ix + 1, iy, iz), fx), x10 = lerp(g(ix, iy + 1, iz), g(ix + 1, iy + 1, iz), fx);
      var x01 = lerp(g(ix, iy, iz + 1), g(ix + 1, iy, iz + 1), fx), x11 = lerp(g(ix, iy + 1, iz + 1), g(ix + 1, iy + 1, iz + 1), fx);
      return lerp(lerp(x00, x10, fy), lerp(x01, x11, fy), fz);
    }
    var vn = vnoise(4, 14016) * 0.55 + vnoise(8, 14080) * 0.3 + vnoise(16, 14592) * 0.15;
    var w4 = 1 - worley(4, 0), w8 = 1 - worley(8, 192), w16 = 1 - worley(16, 1728);
    var pw = clamp(vn * 0.55 + (w4 * 0.625 + w8 * 0.25 + w16 * 0.125) * 0.6, 0, 1);
    out[o] = Math.round(pw * 255); out[o + 1] = Math.round(clamp(w8 * 0.7 + w16 * 0.3, 0, 1) * 255); out[o + 2] = Math.round(clamp(w16, 0, 1) * 255); out[o + 3] = Math.round(clamp(vn, 0, 1) * 255);
  }
  /* the GPU's half: K layers a draw (K outputs), round 3b's arithmetic in float32 (each byte written as round(v x 255)
     / 255, so the conversion to the texel's byte is exact) */
  function FS_NOISE(K) {
    var outs = '', body = '';
    for (var i = 0; i < K; i++) { outs += 'layout(location = ' + i + ') out vec4 o' + i + ';\n'; body += '  o' + i + ' = voxel(vec3(gl_FragCoord.xy, float(uZ0 + ' + i + ') + 0.5));\n'; }
    return HEAD + `
uniform highp sampler2D uPts; uniform int uZ0;
` + outs + `
float pt(int i) { return texelFetch(uPts, ivec2(i & 255, i >> 8), 0).r; }
int wr(int a, int n) { return a < 0 ? a + n : (a >= n ? a - n : a); }
float worley(vec3 p, int n, int base) {
  vec3 ip = floor(p); float best = 9.0;
  for (int dz = -1; dz <= 1; dz++) for (int dy = -1; dy <= 1; dy++) for (int dx = -1; dx <= 1; dx++) {
    ivec3 c = ivec3(ip) + ivec3(dx, dy, dz);
    int k = base + ((wr(c.z, n) * n + wr(c.y, n)) * n + wr(c.x, n)) * 3;
    vec3 f = (vec3(c) - p) + vec3(pt(k), pt(k + 1), pt(k + 2));
    float d = f.x * f.x + f.y * f.y + f.z * f.z;
    if (d < best) best = d;
  }
  return sqrt(best);
}
float lt(int base, int n, ivec3 c) { return pt(base + (wr(c.z, n) * n + wr(c.y, n)) * n + wr(c.x, n)); }
float vnoise(vec3 p, int n, int base) {
  vec3 ip = floor(p), f = p - ip; f = f * f * (3.0 - 2.0 * f); ivec3 i = ivec3(ip);
  float x00 = lt(base, n, i), x10 = lt(base, n, i + ivec3(1, 0, 0)); x00 = x00 + (x10 - x00) * f.x;
  float y10a = lt(base, n, i + ivec3(0, 1, 0)), y10b = lt(base, n, i + ivec3(1, 1, 0)); float x1 = y10a + (y10b - y10a) * f.x;
  float z01a = lt(base, n, i + ivec3(0, 0, 1)), z01b = lt(base, n, i + ivec3(1, 0, 1)); float x01 = z01a + (z01b - z01a) * f.x;
  float z11a = lt(base, n, i + ivec3(0, 1, 1)), z11b = lt(base, n, i + ivec3(1, 1, 1)); float x11 = z11a + (z11b - z11a) * f.x;
  float a = x00 + (x1 - x00) * f.y, b = x01 + (x11 - x01) * f.y;
  return a + (b - a) * f.z;
}
float q8(float v) { return floor(clamp(v, 0.0, 1.0) * 255.0 + 0.5) / 255.0; }
vec4 voxel(vec3 g) {
  vec3 u = g / 32.0;
  float vn = vnoise(u * 4.0, 4, 14016) * 0.55 + vnoise(u * 8.0, 8, 14080) * 0.3 + vnoise(u * 16.0, 16, 14592) * 0.15;
  float w4 = 1.0 - worley(u * 4.0, 4, 0), w8 = 1.0 - worley(u * 8.0, 8, 192), w16 = 1.0 - worley(u * 16.0, 16, 1728);
  return vec4(q8(vn * 0.55 + (w4 * 0.625 + w8 * 0.25 + w16 * 0.125) * 0.6), q8(w8 * 0.7 + w16 * 0.3), q8(w16), q8(vn));
}
void main() {
` + body + `}`;
  }
  /* stage B: the texture, its framebuffer and the points (the program is registered with the rest, stage C) */
  function noiseInit() {
    var N = NOISE_N, mdb = gl.getParameter(gl.MAX_DRAW_BUFFERS) | 0;   // (read once, at boot)
    NOISE.K = Math.max(1, Math.min(8, mdb || 4)); NOISE.z = 0; NOISE.done = false; NOISE.fixed = 0;
    NOISE.t = gl.createTexture(); gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_3D, NOISE.t);
    gl.texImage3D(gl.TEXTURE_3D, 0, gl.RGBA8, N, N, N, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR); gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_S, gl.REPEAT); gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_T, gl.REPEAT); gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_R, gl.REPEAT);
    gl.bindTexture(gl.TEXTURE_3D, null);
    NOISE.data = noiseData();
    NOISE.pts = gl.createTexture(); gl.activeTexture(gl.TEXTURE7); gl.bindTexture(gl.TEXTURE_2D, NOISE.pts);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.R32F, 256, 73, 0, gl.RED, gl.FLOAT, NOISE.data);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.bindTexture(gl.TEXTURE_2D, null); gl.activeTexture(gl.TEXTURE0);
    NOISE.fb = gl.createFramebuffer();
    NOISE.prog = compile(VS_FULL, FS_NOISE(NOISE.K), 'engine.noise');
    NOISE3 = NOISE.t;
  }
  /* stage E: one draw of K layers a call (sync: every layer), then the CPU's exact voxels and the mipmaps; true once
     done. Needs the program finished */
  var NOISE_DB = [];
  function noiseStep(sync) {
    if (NOISE.done) return true;
    var N = NOISE_N, K = NOISE.K, P = NOISE.prog, i;
    if (!P || P.st !== 3 || !P.ok) return false;
    if (NOISE_DB.length !== K) { NOISE_DB.length = 0; for (i = 0; i < K; i++) NOISE_DB.push(gl.COLOR_ATTACHMENT0 + i); }
    while (NOISE.z < N) {
      var z0 = Math.min(NOISE.z, N - K);   // (the last draw overlaps the one before: every draw writes K layers, one key)
      gl.bindFramebuffer(gl.FRAMEBUFFER, NOISE.fb);
      for (i = 0; i < K; i++) gl.framebufferTextureLayer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0 + i, NOISE.t, 0, z0 + i);
      gl.drawBuffers(NOISE_DB);
      gl.viewport(0, 0, N, N); gl.disable(gl.BLEND); gl.disable(gl.DEPTH_TEST); gl.disable(gl.CULL_FACE); gl.colorMask(true, true, true, true);
      gl.useProgram(P.p); gl.uniform1i(P.u.uZ0, z0);
      gl.activeTexture(gl.TEXTURE7); gl.bindTexture(gl.TEXTURE_2D, NOISE.pts); gl.activeTexture(gl.TEXTURE0);
      gl.bindVertexArray(FULLVAO); gl.drawArrays(gl.TRIANGLES, 0, 3);
      NOISE.z = z0 + K;
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      if (!sync) return false;
    }
    if (DEVMODE && NOISE.raw === null) NOISE.raw = devNoiseRead();   // (dev: the GPU's own bytes, before the CPU's are written over them)
    var px = new Uint8Array(4);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_3D, NOISE.t);
    for (i = 0; i < NOISE_FIX.length; i++) {
      var q = NOISE_FIX[i], x = q % N, y = ((q / N) | 0) % N, z = (q / (N * N)) | 0;
      noiseVoxel(NOISE.data, x, y, z, px, 0);
      gl.texSubImage3D(gl.TEXTURE_3D, 0, x, y, z, 1, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
    }
    NOISE.fixed = NOISE_FIX.length;
    gl.generateMipmap(gl.TEXTURE_3D);
    gl.bindTexture(gl.TEXTURE_3D, null);
    // (the framebuffer's layers let go: the texture is sampled from now on, never attached; the points are kept for a restore's bake)
    gl.bindFramebuffer(gl.FRAMEBUFFER, NOISE.fb); for (i = 0; i < K; i++) gl.framebufferTextureLayer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0 + i, null, 0, 0); gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    NOISE.done = true;
    return true;
  }
  /* (dev) the noise's level 0 read back, layer by layer (the GPU's or, after the fix, the texture as sampled) */
  function devNoiseRead() {
    var N = NOISE_N, out = new Uint8Array(N * N * N * 4), fb = gl.createFramebuffer(), lay = new Uint8Array(N * N * 4);
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    for (var z = 0; z < N; z++) { gl.framebufferTextureLayer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, NOISE.t, 0, z); gl.readPixels(0, 0, N, N, gl.RGBA, gl.UNSIGNED_BYTE, lay); out.set(lay, z * N * N * 4); }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.deleteFramebuffer(fb);
    return out;
  }
  /* (dev) round 3b's own CPU bake, whole (the check of the GPU's) */
  function devNoiseCPU() {
    var N = NOISE_N, D = NOISE.data || noiseData(), out = new Uint8Array(N * N * N * 4);
    for (var z = 0; z < N; z++) for (var y = 0; y < N; y++) for (var x = 0; x < N; x++) noiseVoxel(D, x, y, z, out, ((z * N + y) * N + x) * 4);
    return out;
  }

  /* ---------------------------------------------------------------- the clipmap grid (one grid, five index sets) */
  /* the triangles in column strips of 16 cells, row after row inside a strip: a vertex is shaded about once (its row's
     neighbours still in the post-transform cache when the next row reuses them) where a row-major order over the whole
     grid shaded every vertex twice */
  var GN = 96;   // cells across a ring (even, divisible by 4)
  function makeGrid() {
    var G = { vao: gl.createVertexArray(), ib: [] }, n = GN + 1, v = new Uint8Array(n * n * 2), i, j;
    for (j = 0; j < n; j++) for (i = 0; i < n; i++) { v[(j * n + i) * 2] = i; v[(j * n + i) * 2 + 1] = j; }
    gl.bindVertexArray(G.vao);
    G.vb = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, G.vb); gl.bufferData(gl.ARRAY_BUFFER, v, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.UNSIGNED_BYTE, false, 0, 0);
    // set 0: the full grid (the finest ring); sets 1-4: the grid with the finer ring's hole at offset (ox, oy) in {0,1}^2
    for (var set = 0; set < 5; set++) {
      var idx = [], ox = (set - 1) & 1, oy = ((set - 1) >> 1) & 1, q4 = GN / 4, h0x = q4 + ox, h0y = q4 + oy;
      for (var s0 = 0; s0 < GN; s0 += 16) for (j = 0; j < GN; j++) for (i = s0; i < Math.min(s0 + 16, GN); i++) {
        if (set > 0 && i >= h0x && i < h0x + GN / 2 && j >= h0y && j < h0y + GN / 2) continue;
        var a = j * n + i, b = a + 1, c = a + n, d = c + 1;
        if (((i + j) & 1) === 0) idx.push(a, c, b, b, c, d); else idx.push(a, c, d, a, d, b);
      }
      var ib = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(idx), gl.STATIC_DRAW);
      G.ib.push({ b: ib, n: idx.length });
    }
    gl.bindVertexArray(null);
    return G;
  }

  /* ---------------------------------------------------------------- the mesh kit (landmarks, scatter) */
  /* A builder takes triangles in local space (y up, the base at y = 0) through the current transform and colour,
     straight into a growing vertex buffer (no array per vertex). Vertex, 24 bytes: position (3 floats, the world's),
     normal (3 signed bytes), its emission (a byte: B.emit, 0 .. 16 in sixteenths: the surface's own light, its colour
     times this, added after the shade: a lamp's window, a crystal, a flame), colour (3 bytes, half the value: 0..2) and
     the realm's material code (a byte), the height over the item's seat (a float; 100 for a piece in the air). The
     engine places each item (place: its point, its seat on the ground, its turn) before the realm's builder draws it;
     the builder keeps each item's bounds. B.emit is 0 at each item's start: set it before the emissive parts, and back
     to 0 after them. */
  var VSTRIDE = 24;
  function Builder(cap) {
    this.cap = cap || 2048; this.ab = new ArrayBuffer(this.cap * VSTRIDE);
    this.F = new Float32Array(this.ab); this.I8 = new Int8Array(this.ab); this.U8 = new Uint8Array(this.ab); this.n = 0;
    this.M = [1, 0, 0, 0, 1, 0, 0, 0, 1]; this.N = [1, 0, 0, 0, 1, 0, 0, 0, 1]; this.T = [0, 0, 0]; this.col = [0.2, 0.2, 0.25, 1]; this.stack = [];
    this.seatY = 0; this.air = false; this.lod = 0; this.emit = 0;   // (lod 1: a far cell's coarse build: lathes and grids at about half their segments)
    this.lo = [1e9, 1e9, 1e9]; this.hi = [-1e9, -1e9, -1e9];   // the current item's bounds
  }
  Builder.prototype = {
    /* an item's frame: at (x, y, z), turned yaw deg about the vertical; y is its seat (seated) or its height (air) */
    place: function (x, y, z, yaw, air) {
      var a = (yaw || 0) * DEG, c = Math.cos(a), s = Math.sin(a);
      this.M = [c, 0, s, 0, 1, 0, -s, 0, c]; this.T = [x, y, z]; this.stack.length = 0; this.normalMat();
      this.seatY = y; this.air = !!air; this.emit = 0;
      this.lo[0] = this.lo[1] = this.lo[2] = 1e9; this.hi[0] = this.hi[1] = this.hi[2] = -1e9;
      return this;
    },
    push: function () { this.stack.push([this.M.slice(), this.T.slice()]); return this; },
    pop: function () { var s = this.stack.pop(); this.M = s[0]; this.T = s[1]; this.normalMat(); return this; },
    // apply a local transform: translate (x, y, z), then yaw (deg, about y), pitch (about x), roll (about z), scale s (number or [sx, sy, sz])
    xf: function (x, y, z, yaw, pitch, roll, s) {
      var a = (yaw || 0) * DEG, b = (pitch || 0) * DEG, c = (roll || 0) * DEG;
      var ca = Math.cos(a), sa = Math.sin(a), cb = Math.cos(b), sb = Math.sin(b), cc = Math.cos(c), sc = Math.sin(c);
      // R = Ry(a) * Rx(b) * Rz(c), row-major 3x3
      var Ry = [ca, 0, sa, 0, 1, 0, -sa, 0, ca], Rx = [1, 0, 0, 0, cb, -sb, 0, sb, cb], Rz = [cc, -sc, 0, sc, cc, 0, 0, 0, 1];
      var R = mm3(mm3(Ry, Rx), Rz), S = s === undefined ? [1, 1, 1] : (typeof s === 'number' ? [s, s, s] : s);
      R = [R[0] * S[0], R[1] * S[1], R[2] * S[2], R[3] * S[0], R[4] * S[1], R[5] * S[2], R[6] * S[0], R[7] * S[1], R[8] * S[2]];
      var M = this.M, t = [M[0] * x + M[1] * y + M[2] * z + this.T[0], M[3] * x + M[4] * y + M[5] * z + this.T[1], M[6] * x + M[7] * y + M[8] * z + this.T[2]];
      this.M = mm3(this.M, R); this.T = t; this.normalMat();
      return this;
    },
    normalMat: function () {   // normals by the inverse transpose (the cofactors; scale may be non-uniform)
      var M = this.M, a = M[0], b = M[1], c = M[2], d = M[3], e = M[4], f = M[5], g = M[6], h = M[7], i = M[8], N = this.N;
      N[0] = e * i - f * h; N[1] = -(d * i - f * g); N[2] = d * h - e * g; N[3] = -(b * i - c * h); N[4] = a * i - c * g; N[5] = -(a * h - b * g); N[6] = b * f - c * e; N[7] = -(a * f - c * d); N[8] = a * e - b * d;
    },
    grow: function () {
      var cap = this.cap * 2, ab = new ArrayBuffer(cap * VSTRIDE); new Uint8Array(ab).set(this.U8.subarray(0, this.n * VSTRIDE));
      this.cap = cap; this.ab = ab; this.F = new Float32Array(ab); this.I8 = new Int8Array(ab); this.U8 = new Uint8Array(ab);
    },
    /* one vertex: local position (px, py, pz), local normal (nx, ny, nz), colour (rgb + code) */
    v: function (px, py, pz, nx, ny, nz, col) {
      if (this.n >= this.cap) this.grow();
      var M = this.M, T = this.T, N = this.N, o = this.n * 6, ob = this.n * VSTRIDE;
      var x = M[0] * px + M[1] * py + M[2] * pz + T[0], y = M[3] * px + M[4] * py + M[5] * pz + T[1], z = M[6] * px + M[7] * py + M[8] * pz + T[2];
      var mx = N[0] * nx + N[1] * ny + N[2] * nz, my = N[3] * nx + N[4] * ny + N[5] * nz, mz = N[6] * nx + N[7] * ny + N[8] * nz, l = Math.sqrt(mx * mx + my * my + mz * mz) || 1;
      this.F[o] = x; this.F[o + 1] = y; this.F[o + 2] = z;
      this.I8[ob + 12] = Math.round(mx / l * 127); this.I8[ob + 13] = Math.round(my / l * 127); this.I8[ob + 14] = Math.round(mz / l * 127);
      this.U8[ob + 15] = this.emit > 0 ? Math.min(255, Math.round(this.emit * 16)) : 0;
      var c = col || this.col;
      this.U8[ob + 16] = Math.round(clamp(c[0] * 0.5, 0, 1) * 255); this.U8[ob + 17] = Math.round(clamp(c[1] * 0.5, 0, 1) * 255); this.U8[ob + 18] = Math.round(clamp(c[2] * 0.5, 0, 1) * 255); this.U8[ob + 19] = c[3] | 0;
      this.F[o + 5] = this.air ? 100 : y - this.seatY;
      if (x < this.lo[0]) this.lo[0] = x; if (y < this.lo[1]) this.lo[1] = y; if (z < this.lo[2]) this.lo[2] = z;
      if (x > this.hi[0]) this.hi[0] = x; if (y > this.hi[1]) this.hi[1] = y; if (z > this.hi[2]) this.hi[2] = z;
      this.n++;
    },
    vert: function (p, n, col) { this.v(p[0], p[1], p[2], n[0], n[1], n[2], col); },
    tri: function (a, b, c, col) {
      var ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], wx = c[0] - a[0], wy = c[1] - a[1], wz = c[2] - a[2];
      var nx = uy * wz - uz * wy, ny = uz * wx - ux * wz, nz = ux * wy - uy * wx;
      this.v(a[0], a[1], a[2], nx, ny, nz, col); this.v(b[0], b[1], b[2], nx, ny, nz, col); this.v(c[0], c[1], c[2], nx, ny, nz, col);
    },
    triOut: function (a, b, c, ctr, col) {
      var ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], wx = c[0] - a[0], wy = c[1] - a[1], wz = c[2] - a[2];
      var nx = uy * wz - uz * wy, ny = uz * wx - ux * wz, nz = ux * wy - uy * wx;
      if (nx * (a[0] - ctr[0]) + ny * (a[1] - ctr[1]) + nz * (a[2] - ctr[2]) < 0) this.tri(a, c, b, col); else this.tri(a, b, c, col);
    },
    quadOut: function (a, b, c, d, ctr, col) { this.triOut(a, b, c, ctr, col); this.triOut(a, c, d, ctr, col); },
    triN: function (a, b, c, na, nb, nc, col) { this.v(a[0], a[1], a[2], na[0], na[1], na[2], col); this.v(b[0], b[1], b[2], nb[0], nb[1], nb[2], col); this.v(c[0], c[1], c[2], nc[0], nc[1], nc[2], col); },
    count: function () { return this.n; },
    bytes: function () { return new Uint8Array(this.ab, 0, this.n * VSTRIDE); }
  };
  /* a lamp's light baked into the stone about it: each vertex from v0 to v1 (B.count() before and after the parts)
     gains emission from the lamps within reach, I = k max(n.l, 0) / (1 + (d / r0)^2) (n.l toward the lamp, its
     falloff at r0 m, nothing past 4 r0): static lamps on static stone, no cost a frame. The emission is the vertex's
     own colour times I (a pool of the lamp's light on that stone); a warm lamp's tint is the realm's shade's to give
     (gEmit is there for it to read). lamps: [[x, y, z, k, r0], ...] in the builder's world (B.T after place()). */
  function glowBake(B, v0, v1, lamps) {
    var F = B.F, I8 = B.I8, U8 = B.U8;
    for (var i = v0; i < v1; i++) {
      var o = i * 6, ob = i * VSTRIDE, x = F[o], y = F[o + 1], z = F[o + 2], nx = I8[ob + 12] / 127, ny = I8[ob + 13] / 127, nz = I8[ob + 14] / 127, e = U8[ob + 15] / 16;
      for (var k = 0; k < lamps.length; k++) {
        var L = lamps[k], dx = L[0] - x, dy = L[1] - y, dz = L[2] - z, d = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1e-3, r0 = L[4] || 4;
        if (d > r0 * 4) continue;
        var nl = (nx * dx + ny * dy + nz * dz) / d; if (nl <= 0) continue;
        e += L[3] * nl / (1 + (d / r0) * (d / r0)) * (1 - smooth(r0 * 3, r0 * 4, d));
      }
      U8[ob + 15] = Math.min(255, Math.round(e * 16));
    }
  }
  function mm3(A, B) {
    var C = new Array(9);
    for (var r = 0; r < 3; r++) for (var c = 0; c < 3; c++) C[r * 3 + c] = A[r * 3] * B[c] + A[r * 3 + 1] * B[3 + c] + A[r * 3 + 2] * B[6 + c];
    return C;
  }
  var KIT = {
    /* a box from (x0,y0,z0) to (x1,y1,z1), its edges chamfered by bev */
    box: function (B, x0, y0, z0, x1, y1, z1, bev, col) {
      var c = [(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2], h = [(x1 - x0) / 2, (y1 - y0) / 2, (z1 - z0) / 2];
      bev = Math.min(bev || 0, h[0] * 0.45, h[1] * 0.45, h[2] * 0.45);
      function P(ax, sx, sy, sz) {   // the corner (sx,sy,sz)'s point on the face of axis ax
        return [c[0] + sx * (h[0] - (ax === 0 ? 0 : bev)), c[1] + sy * (h[1] - (ax === 1 ? 0 : bev)), c[2] + sz * (h[2] - (ax === 2 ? 0 : bev))];
      }
      var s = [-1, 1], a, b, k;
      for (a = 0; a < 2; a++) {   // the six faces
        var sg = s[a];
        B.quadOut(P(0, sg, -1, -1), P(0, sg, 1, -1), P(0, sg, 1, 1), P(0, sg, -1, 1), c, col);
        B.quadOut(P(1, -1, sg, -1), P(1, 1, sg, -1), P(1, 1, sg, 1), P(1, -1, sg, 1), c, col);
        B.quadOut(P(2, -1, -1, sg), P(2, 1, -1, sg), P(2, 1, 1, sg), P(2, -1, 1, sg), c, col);
      }
      if (bev <= 0) return;
      for (a = 0; a < 2; a++) for (b = 0; b < 2; b++) {   // the twelve chamfers
        var sa = s[a], sb = s[b];
        B.quadOut(P(0, sa, sb, -1), P(1, sa, sb, -1), P(1, sa, sb, 1), P(0, sa, sb, 1), c, col);   // x-y edges along z
        B.quadOut(P(0, sa, -1, sb), P(2, sa, -1, sb), P(2, sa, 1, sb), P(0, sa, 1, sb), c, col);   // x-z edges along y
        B.quadOut(P(1, -1, sa, sb), P(2, -1, sa, sb), P(2, 1, sa, sb), P(1, 1, sa, sb), c, col);   // y-z edges along x
      }
      for (a = 0; a < 2; a++) for (b = 0; b < 2; b++) for (k = 0; k < 2; k++) B.triOut(P(0, s[a], s[b], s[k]), P(1, s[a], s[b], s[k]), P(2, s[a], s[b], s[k]), c, col);
    },
    /* a prism: polygon (convex, [x,z] pairs) from y0 up to per-vertex tops (number or array), the top scaled and shifted */
    prism: function (B, poly, y0, tops, topScale, dx, dz, col, noBottom) {
      var n = poly.length, i, ctr = [0, 0, 0], top = [], bot = [];
      for (i = 0; i < n; i++) { ctr[0] += poly[i][0] / n; ctr[2] += poly[i][1] / n; }
      var ty = 0;
      for (i = 0; i < n; i++) {
        var yt = typeof tops === 'number' ? tops : tops[i]; ty += yt / n;
        bot.push([poly[i][0], y0, poly[i][1]]);
        top.push([ctr[0] + (poly[i][0] - ctr[0]) * (topScale || 1) + (dx || 0), yt, ctr[2] + (poly[i][1] - ctr[2]) * (topScale || 1) + (dz || 0)]);
      }
      ctr[1] = (y0 + ty) / 2;
      for (i = 0; i < n; i++) { var j = (i + 1) % n; B.quadOut(bot[i], bot[j], top[j], top[i], ctr, col); }
      var tc = [0, 0, 0]; for (i = 0; i < n; i++) tc = add(tc, mul(top[i], 1 / n));
      for (i = 0; i < n; i++) B.triOut(tc, top[i], top[(i + 1) % n], add(tc, [0, -10, 0]), col);
      if (!noBottom) { var bc = [ctr[0], y0, ctr[2]]; for (i = 0; i < n; i++) B.triOut(bc, bot[i], bot[(i + 1) % n], add(bc, [0, 10, 0]), col); }
    },
    /* a surface of revolution: profile [[r, y], ...] from the bottom up, seg sides; flat (faceted) or smooth */
    lathe: function (B, prof, seg, flat, col, phase) {
      var i, j, ring = [], nrm = [];
      if (B.lod) seg = Math.max(5, Math.round(seg * 0.4));
      for (i = 0; i < prof.length; i++) {
        var r = prof[i][0], y = prof[i][1], pr = prof[Math.max(i - 1, 0)], nx = prof[Math.min(i + 1, prof.length - 1)];
        var tr = nx[0] - pr[0], ty = nx[1] - pr[1], nr = ty, ny = -tr, l = Math.sqrt(nr * nr + ny * ny) || 1; nr /= l; ny /= l;
        var R1 = [], N1 = [];
        for (j = 0; j <= seg; j++) { var a = (j / seg + (phase || 0)) * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a); R1.push([r * ca, y, r * sa]); N1.push([nr * ca, ny, nr * sa]); }
        ring.push(R1); nrm.push(N1);
      }
      for (i = 0; i + 1 < prof.length; i++) for (j = 0; j < seg; j++) {
        var a0 = ring[i][j], a1 = ring[i][j + 1], b0 = ring[i + 1][j], b1 = ring[i + 1][j + 1];
        var mid = [0, (prof[i][1] + prof[i + 1][1]) / 2, 0];
        if (flat) { if (prof[i][0] > 1e-4) B.triOut(a0, a1, b1, mid, col); if (prof[i + 1][0] > 1e-4) B.triOut(a0, b1, b0, mid, col); }
        else {
          // wind outward: ring order is counter-clockwise seen from above
          if (prof[i][0] > 1e-4) B.triN(a0, b1, a1, nrm[i][j], nrm[i + 1][j + 1], nrm[i][j + 1], col);
          if (prof[i + 1][0] > 1e-4) B.triN(a0, b0, b1, nrm[i][j], nrm[i + 1][j], nrm[i + 1][j + 1], col);
        }
      }
    },
    /* a rough rock: a deformed octahedron subdivided once (for scatter and rubble) */
    rock: function (B, rng, r, flatten, col) {
      var V = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]], F = [[0, 2, 4], [4, 2, 1], [1, 2, 5], [5, 2, 0], [4, 3, 0], [1, 3, 4], [5, 3, 1], [0, 3, 5]];
      var mid = {}, i;
      function m(a, b) { var k = a < b ? a + '_' + b : b + '_' + a; if (mid[k] === undefined) { V.push(norm(mul(add(V[a], V[b]), 0.5))); mid[k] = V.length - 1; } return mid[k]; }
      var F2 = [];
      for (i = 0; i < F.length; i++) { var a = F[i][0], b = F[i][1], c = F[i][2], ab = m(a, b), bc = m(b, c), ca = m(c, a); F2.push([a, ab, ca], [ab, b, bc], [ca, bc, c], [ab, bc, ca]); }
      var P = V.map(function (p) { var k = r * (0.75 + 0.5 * rng.f()); return [p[0] * k, p[1] * k * (flatten || 1), p[2] * k]; });
      for (i = 0; i < F2.length; i++) B.triOut(P[F2[i][0]], P[F2[i][1]], P[F2[i][2]], [0, 0, 0], col);
    }
  };

  /* ---------------------------------------------------------------- cloud bodies */
  /* a body's lobes (centre, radius; 12 floats each, the rest spare), laid out by the kit's generators; each body is
     baked into a volume (volPrep, volBake) */
  function Puffs() { this.a = []; this.bodies = []; }
  Puffs.prototype = {
    body: function () { this.bodies.push({ i0: this.a.length / 12, cx: 0, cy: 0, cz: 0, y0: 0, y1: 1 }); return this.bodies[this.bodies.length - 1]; },
    add: function (x, y, z, R, seed, op) { this.a.push(x, y, z, R, 1, 1, seed, op === undefined ? 1 : op, 0, 1, 0, 0.5); },
    count: function () { return this.a.length / 12; }
  };
  /* a cumulus tower: a flat base, a body of lobes over a bulging, narrowing envelope, a crown of big domes */
  function cumulus(PF, rng, x, y0, z, W, H, o) {
    o = o || {};
    var b = PF.body(); b.cx = x; b.cz = z; b.y0 = y0; b.y1 = y0 + H; b.cy = y0 + H * 0.4; b.vol = !o.puffs; b.seed = rng.f() * 10;
    if (o.erode !== undefined) b.erode = o.erode; if (o.billow !== undefined) b.billow = o.billow; if (o.noise) b.noise = o.noise; if (o.band) b.band = o.band;
    var big = o.puff || 1, n = Math.round(clamp(o.n || 12 + 16 * H / W + W / 60, 14, 72)), i;
    function env(h) { return W * 0.5 * (0.82 + 0.25 * Math.sin(Math.PI * Math.min(h * 1.1, 1))) * (1 - 0.5 * h * h); }
    var lean = o.lean || [0, 0];
    for (i = 0; i < n; i++) {   // lobes on the body's surface, smaller toward the top
      var h = Math.pow(rng.f(), 0.75), th = rng.f() * Math.PI * 2, R = W * (0.14 + 0.1 * rng.f()) * (1 - 0.35 * h) * big;
      var e = env(h), rr = Math.max(e - R * 0.55, 0) * (0.75 + 0.25 * rng.f());
      var py = y0 + Math.max(h * (H - R * 0.5), R * 0.5);
      PF.add(x + Math.cos(th) * rr + lean[0] * h * H, py, z + Math.sin(th) * rr + lean[1] * h * H, R, rng.f(), 1);
    }
    var nc = 3 + rng.i(3);
    for (i = 0; i < nc; i++) {   // the crown: domes of mixed size at different heights
      var a = rng.f() * Math.PI * 2, d = W * 0.22 * Math.sqrt(rng.f()), R2 = W * (0.15 + 0.12 * rng.f()) * big;
      PF.add(x + Math.cos(a) * d + lean[0] * H, y0 + H - R2 * (0.55 + 0.5 * rng.f()), z + Math.sin(a) * d + lean[1] * H, R2, rng.f(), 1);
    }
    var ni = Math.round(2 + W / 120);
    for (i = 0; i < ni; i++) {   // a few inside, so the body is never hollow
      PF.add(x + rng.r(-0.15, 0.15) * W, y0 + H * rng.r(0.15, 0.6), z + rng.r(-0.15, 0.15) * W, W * 0.3 * big, rng.f(), 1);
    }
    var nb = Math.round(3 + W / 90);
    for (i = 0; i < nb; i++) {   // the base: wide and flat
      var a2 = rng.f() * Math.PI * 2, d2 = W * 0.34 * Math.sqrt(rng.f()), R3 = W * (0.2 + 0.08 * rng.f()) * big;
      PF.add(x + Math.cos(a2) * d2, y0 + R3 * 0.35, z + Math.sin(a2) * d2, R3, rng.f(), 1);
    }
    return b;
  }
  /* a range: a long, low bank of heaped cloud lying along a line (from x0,z0 toward dir), the base flat, the tops
     heaped in mounds of different heights */
  function range(PF, rng, x0, y0, z0, dir, len, W, H, o) {
    o = o || {};
    var b = PF.body(); b.vol = true; b.seed = rng.f() * 10; b.erode = 0.85; b.yaw = dir;
    var dx = Math.sin(dir), dz = Math.cos(dir), px = -dz, pz = dx;
    b.cx = x0 + dx * len / 2; b.cz = z0 + dz * len / 2; b.cy = y0 + H * 0.3; b.y0 = y0; b.y1 = y0 + H;
    var n = Math.round(clamp(len / W * 9, 16, 80)), mounds = [];
    for (var m = 0; m < 4; m++) mounds.push([rng.f(), rng.r(0.5, 1), rng.r(0.08, 0.22)]);
    for (var i = 0; i < n; i++) {
      var u = rng.f(), lat = rng.r(-0.5, 0.5) * W, prof = 0.35;
      for (m = 0; m < 4; m++) { var q = (u - mounds[m][0]) / mounds[m][2]; prof = Math.max(prof, mounds[m][1] * Math.exp(-q * q)); }
      var R = W * rng.r(0.22, 0.4) * (0.6 + 0.4 * prof), y = y0 + R * 0.5 + rng.f() * Math.max(H * prof - R, 0);
      PF.add(x0 + dx * u * len + px * lat, y, z0 + dz * u * len + pz * lat, R, rng.f(), 1);
    }
    return b;
  }
  /* a wall: a long, tall bank of cloud (a canyon's side), its billows stacked in shelves, each shelf's run along
     the wall shorter toward the top (a skyline of mounds), the face bulging toward one side (face: +1 to the right of
     dir, -1 to the left, 0 both) */
  function wall(PF, rng, x0, y0, z0, dir, len, thick, H, o) {
    o = o || {};
    var b = PF.body(); b.vol = true; b.seed = rng.f() * 10; b.erode = o.erode === undefined ? 0.8 : o.erode;
    b.squash = o.squash || 0.8; b.blend = o.blend || 0.6; b.billow = o.billow || 0.95; b.yaw = dir; if (o.noise) b.noise = o.noise; if (o.band) b.band = o.band;
    var dx = Math.sin(dir), dz = Math.cos(dir), px = dz, pz = -dx, face = o.face || 0, m;
    b.cx = x0 + dx * len / 2; b.cz = z0 + dz * len / 2; b.y0 = y0; b.y1 = y0 + H; b.cy = y0 + H * 0.4;
    var shelves = Math.max(2, Math.round(H / (thick * 0.5))), mounds = [];
    for (m = 0; m < 3; m++) mounds.push([rng.r(-0.1, 1.1), rng.r(0.55, 1), rng.r(0.18, 0.4)]);
    for (var k = 0; k < shelves; k++) {
      var f = k / Math.max(shelves - 1, 1), R = thick * (0.52 - 0.2 * f) * rng.r(0.9, 1.1), y = y0 + R * 0.55 + f * Math.max(H - R * 1.1, 0);
      var step = R * 1.2, u = rng.r(0, 0.6) * step;
      while (u < len && PF.count() - b.i0 < 96) {
        var uu = u / len, prof = 0.3;
        for (m = 0; m < 3; m++) { var q = (uu - mounds[m][0]) / mounds[m][2]; prof = Math.max(prof, mounds[m][1] * Math.exp(-q * q)); }
        if (f <= prof + 0.08) {
          var lat = (rng.r(-0.3, 0.3) + face * 0.16 * (1 - f)) * thick;
          PF.add(x0 + dx * u + px * lat, y + rng.r(-0.15, 0.15) * R, z0 + dz * u + pz * lat, R * rng.r(0.72, 1.25), rng.f(), 1);
        }
        u += step * rng.r(0.75, 1.15);
      }
    }
    return b;
  }
  /* a bank: a heap of lobes over a round footprint (the cloud a passage goes through): a flat base, mounds on top */
  function mound(PF, rng, x, y0, z, W, H, o) {
    o = o || {};
    var b = PF.body(); b.vol = true; b.seed = rng.f() * 10; b.erode = o.erode === undefined ? 0.7 : o.erode; b.squash = o.squash || 0.85; b.blend = o.blend || 0.6; b.billow = o.billow || 0.9;
    b.cx = x; b.cz = z; b.y0 = y0; b.y1 = y0 + H; b.cy = y0 + H * 0.45;
    var n = Math.min(90, Math.round(18 + W / 18)), i;
    for (i = 0; i < n; i++) {
      var a = rng.f() * Math.PI * 2, d = Math.sqrt(rng.f()) * W * 0.42, f = 1 - d / (W * 0.5), R = W * rng.r(0.1, 0.17);
      var top = H * (0.45 + 0.55 * f), y = y0 + R * 0.5 + rng.f() * Math.max(top - R * 1.3, 0);
      PF.add(x + Math.cos(a) * d, y, z + Math.sin(a) * d, R, rng.f(), 1);
    }
    return b;
  }
  function bank(PF, rng, x, y, z, W, H, D, R0, n) {
    var b = PF.body(); b.cx = x; b.cy = y; b.cz = z; b.y0 = y - H * 0.5; b.y1 = y + H * 0.5; b.vol = true; b.seed = rng.f() * 10;
    for (var i = 0; i < n; i++) {
      var u = rng.f() * 2 - 1, v = rng.f() * 2 - 1, w = rng.f() * 2 - 1, R = R0 * (0.7 + 0.6 * rng.f());
      PF.add(x + u * W * 0.5, y + v * H * 0.5, z + w * D * 0.5, R, rng.f(), 1);
    }
    return b;
  }
  /* ---------------------------------------------------------------- the maps and the director (world6: gen/, wrapped by mkmaps.js) */
  var CW = (function () {
    var module = undefined, CWROOT = {};
// gen/hash.js: the world's 32-bit integer hash and splitmix32 (bit-exact with GLSL's uint arithmetic: maps.glsl's
// mix32 / hash2 / hash3 are the same lines). Plain ES5, usable in node and in a page.
(function (root) {
  'use strict';
  function mix32(x) {
    x = x >>> 0;
    x ^= x >>> 16; x = Math.imul(x, 0x7feb352d) >>> 0;
    x ^= x >>> 15; x = Math.imul(x, 0x846ca68b) >>> 0;
    x ^= x >>> 16;
    return x >>> 0;
  }
  // lattice corner (ix, iy) of stream s: ints may be negative (two's complement, as GLSL's uint(int))
  function hash2(ix, iy, s) { return mix32(((ix | 0) ^ mix32(((iy | 0) ^ mix32(s >>> 0)) >>> 0)) >>> 0); }
  function hash3(ix, iy, iz, s) { return mix32(((ix | 0) ^ mix32(((iy | 0) ^ mix32(((iz | 0) ^ mix32(s >>> 0)) >>> 0)) >>> 0)) >>> 0); }
  function u01(h) { return (h >>> 8) / 16777216; } // 24 bits -> [0,1), exact in float32
  // splitmix32: a stream from a seed (the director's and the place's own streams)
  function splitmix32(seed) {
    var s = seed >>> 0;
    return function () {
      s = (s + 0x9e3779b9) >>> 0;
      var z = s;
      z = Math.imul(z ^ (z >>> 16), 0x85ebca6b) >>> 0;
      z = Math.imul(z ^ (z >>> 13), 0xc2b2ae35) >>> 0;
      z = (z ^ (z >>> 16)) >>> 0;
      return z / 4294967296;
    };
  }
  var H = { mix32: mix32, hash2: hash2, hash3: hash3, u01: u01, splitmix32: splitmix32 };
  if (typeof module !== 'undefined' && module.exports) module.exports = H; else root.CWHash = H;
})(CWROOT);
// gen/noise.js: gradient noise 2D (value and analytic gradient), quintic fade (C2), 16 fixed unit gradients chosen by
// the hash (so the gradient set is finite and the bound G1 certifiable), octave sums with per-octave gains, and the
// footprint fade used by shading. One unit octave has wavelength 1 (lattice spacing 1). Values are scaled by NORM so
// a unit octave spans about [-1, 1].
(function (root) {
  'use strict';
  var Hs = (typeof module !== 'undefined' && module.exports) ? require('./hash.js') : root.CWHash;
  var hash2 = Hs.hash2;
  var GX = new Float64Array(16), GY = new Float64Array(16);
  for (var k = 0; k < 16; k++) { var a = (k + 0.5) * Math.PI / 8; GX[k] = Math.cos(a); GY[k] = Math.sin(a); }
  var NORM = 1.4142135623730951;
  // returns [v, dv/dx, dv/dy] in lattice units, written into out (length 3)
  function grad2(x, y, s, out) {
    var ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
    var h00 = hash2(ix, iy, s) & 15, h10 = hash2(ix + 1, iy, s) & 15, h01 = hash2(ix, iy + 1, s) & 15, h11 = hash2(ix + 1, iy + 1, s) & 15;
    var n00 = GX[h00] * fx + GY[h00] * fy, n10 = GX[h10] * (fx - 1) + GY[h10] * fy;
    var n01 = GX[h01] * fx + GY[h01] * (fy - 1), n11 = GX[h11] * (fx - 1) + GY[h11] * (fy - 1);
    var ux = fx * fx * fx * (fx * (fx * 6 - 15) + 10), uy = fy * fy * fy * (fy * (fy * 6 - 15) + 10);
    var dux = 30 * fx * fx * (fx * (fx - 2) + 1), duy = 30 * fy * fy * (fy * (fy - 2) + 1);
    var k0 = n00, k1 = n10 - n00, k2 = n01 - n00, k3 = n00 - n10 - n01 + n11;
    var v = k0 + k1 * ux + k2 * uy + k3 * ux * uy;
    // gradient: the corner gradients' interpolation plus the fade's derivative times the corner values
    var gx = GX[h00] + (GX[h10] - GX[h00]) * ux + (GX[h01] - GX[h00]) * uy + (GX[h00] - GX[h10] - GX[h01] + GX[h11]) * ux * uy + (k1 + k3 * uy) * dux;
    var gy = GY[h00] + (GY[h10] - GY[h00]) * ux + (GY[h01] - GY[h00]) * uy + (GY[h00] - GY[h10] - GY[h01] + GY[h11]) * ux * uy + (k2 + k3 * ux) * duy;
    out[0] = v * NORM; out[1] = gx * NORM; out[2] = gy * NORM;
    return out;
  }
  var tmp = [0, 0, 0];
  function n2(x, y, s) { return grad2(x, y, s, tmp)[0]; }
  // octave sum: longest wavelength lam (m), n octaves, gain per octave g; normalised by the sum of gains.
  // returns value (about [-1,1]) and gradient per metre into out; also its analytic slope bound per metre, given G1
  function fbm(x, y, lam, n, g, s, out) {
    var v = 0, dx = 0, dy = 0, a = 1, sa = 0, l = lam;
    for (var k = 0; k < n; k++) {
      grad2(x / l + 0.5 * k, y / l - 0.3 * k, (s + k * 1013) >>> 0, tmp);
      v += a * tmp[0]; dx += a * tmp[1] / l; dy += a * tmp[2] / l; sa += a; a *= g; l *= 0.5;
    }
    out[0] = v / sa; out[1] = dx / sa; out[2] = dy / sa;
    return out;
  }
  function fbmBound(lam, n, g, G1) { var b = 0, a = 1, sa = 0, l = lam; for (var k = 0; k < n; k++) { b += a * G1 / l; sa += a; a *= g; l *= 0.5; } return b / sa; }
  // footprint fade for an octave of frequency f (1/m) at a pixel footprint fp (m): 1 - smoothstep(0.25, 0.5, f*fp)
  function fpFade(f, fp) { var t = Math.min(1, Math.max(0, (f * fp - 0.25) / 0.25)); return 1 - t * t * (3 - 2 * t); }
  var N = { grad2: grad2, n2: n2, fbm: fbm, fbmBound: fbmBound, fpFade: fpFade, NORM: NORM, GX: GX, GY: GY };
  if (typeof module !== 'undefined' && module.exports) module.exports = N; else root.CWNoise = N;
})(CWROOT);
// gen/maps.js (v2): the world's maps, a pure function of position (x east, z north, game metres), the visit's seed and
// the director's committed anchors (read through `fields.P`, never a place). No function here takes a place, a kind or
// a region; no integer is computed from a map value and branched on. v2: the climate travels (fewer, longer octaves),
// the land has form (hills, ridges, terraces and mesas, dunes, valleys, lakes and rivers, outcrops), plants of several
// forms by climate. The seed alone fixes the large-scale maps (no macro offsets); the director's anchors only bias the
// place channels.
(function (root) {
  'use strict';
  var isNode = typeof module !== 'undefined' && module.exports;
  var Hs = isNode ? require('./hash.js') : root.CWHash;
  var Nz = isNode ? require('./noise.js') : root.CWNoise;
  var mix32 = Hs.mix32, fbm = Nz.fbm, grad2 = Nz.grad2;

  function logi(t) { return 1 / (1 + Math.exp(-4.394 * t)); } // 10-90 % over t in [-0.5, 0.5]
  function L(v, c, w) { return logi((v - c) / w); }              // 10-90 over w
  function sstep(a, b, v) { var t = Math.min(1, Math.max(0, (v - a) / (b - a))); return t * t * (3 - 2 * t); }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function smax(a, b, k) { var h = Math.max(k - Math.abs(a - b), 0) / k; return Math.max(a, b) + h * h * k * 0.25; } // C1 smooth max
  var TAU = 2 * Math.PI;
  function terr(q) { return q - Math.sin(TAU * q) / TAU; } // a C-infinity step: flats at integers, risers between

  // monotone cubic (Fritsch-Carlson) through knots: C1
  function monoCubic(xs, ys) {
    var n = xs.length, d = [], m = [];
    for (var i = 0; i < n - 1; i++) d.push((ys[i + 1] - ys[i]) / (xs[i + 1] - xs[i]));
    m.push(d[0]);
    for (i = 1; i < n - 1; i++) m.push(d[i - 1] * d[i] <= 0 ? 0 : 2 / (1 / d[i - 1] + 1 / d[i]));
    m.push(d[n - 2]);
    function f(x, out) {
      if (x <= xs[0]) { out[0] = ys[0] + m[0] * (x - xs[0]); out[1] = m[0]; return out; }
      if (x >= xs[n - 1]) { out[0] = ys[n - 1] + m[n - 1] * (x - xs[n - 1]); out[1] = m[n - 1]; return out; }
      var k = 0; while (x > xs[k + 1]) k++;
      var h = xs[k + 1] - xs[k], t = (x - xs[k]) / h, t2 = t * t, t3 = t2 * t;
      out[0] = (2 * t3 - 3 * t2 + 1) * ys[k] + (t3 - 2 * t2 + t) * h * m[k] + (-2 * t3 + 3 * t2) * ys[k + 1] + (t3 - t2) * h * m[k + 1];
      out[1] = ((6 * t2 - 6 * t) * ys[k] + (3 * t2 - 4 * t + 1) * h * m[k] + (-6 * t2 + 6 * t) * ys[k + 1] + (3 * t2 - 2 * t) * h * m[k + 1]) / h;
      return out;
    }
    // the slope's maximum, sampled densely on every segment (+2 %: the cubic's derivative is a smooth quadratic)
    var mx = 0, oo = [0, 0];
    for (i = 0; i < n - 1; i++) for (var s = 0; s <= 200; s++) { f(xs[i] + (xs[i + 1] - xs[i]) * s / 200, oo); mx = Math.max(mx, Math.abs(oo[1])); }
    f.slopeMax = mx * 1.02; f.xs = xs; f.ys = ys; f.m = m;
    return f;
  }

  function gsum(g, n) { var s = 0, a = 1; for (var k = 0; k < n; k++) { s += a; a *= g; } return s; }
  function World(seed, K, fields) {
    seed = seed >>> 0;
    var w = this;
    w.seed = seed; w.K = K; w.fields = fields || null;
    var S = function (k) { return mix32(seed ^ Math.imul(k, 0x9E3779B1)); };
    var sC = S(1), sT = S(2), sP = S(3), sE = S(4), sEw = S(5), sA = S(6), sW = S(7), sV = S(8), sM = S(9), sSv = S(10),
      sFl = S(11), sWind = S(12), sH = S(13), sR = S(14), sDu = S(15), sLv = S(16), sGu = S(17), sFog = S(18), sCl = S(19),
      sRg = S(20), sRv = S(21), sOc = S(22), sBn = S(23), sBw = S(24);
    w.streams = { sBn: sBn, sBw: sBw, sC: sC, sT: sT, sP: sP, sE: sE, sEw: sEw, sA: sA, sW: sW, sV: sV, sM: sM, sSv: sSv, sFl: sFl, sWind: sWind, sH: sH, sR: sR, sDu: sDu, sLv: sLv, sGu: sGu, sFog: sFog, sCl: sCl, sRg: sRg, sRv: sRv, sOc: sOc };
    var o3 = [0, 0, 0];
    var G1 = K.G1 || 2.6;
    w.G1 = G1;
    w.origin = [0, 0];
    function maxGrad(lam, n, g, s) {
      var mx = 0, r = Hs.splitmix32(s ^ 0xA5A5);
      for (var i = 0; i < 40000; i++) { fbm(r() * 4e5, r() * 4e5, lam, n, g, s, o3); var q = Math.hypot(o3[1], o3[2]); if (q > mx) mx = q; }
      return mx * 1.15;
    }
    var B = K.bounds, M = K.macro, KK = K.kit;
    // v2: the climate's amplitudes are the design's (its range over the world), its wavelengths long enough that a
    // climate step comes every 8-12 min at cruise; the bounds (1.2 K/km, 0.16 /km) are certified by gen/test/p5.js
    w.aT = M.aT; w.aP = M.aP;
    var hb = monoCubic(K.hbase.C, K.hbase.h);
    var gCmax = maxGrad(M.lamC, M.octC, M.gC, sC);
    w.aC = Math.min(1.5, 0.85 * K.bounds.hbase / (hb.slopeMax * gCmax)); // |grad hbase| <= 85 % of its bound
    var gH = maxGrad(100000, 2, 0.5, sH);
    w.aH = 0.9 * B.sun_deg_per_km / 1000 / gH; // the hour map uses 90 % of its slope bound: the sun travels
    w.HA0 = ((K.landing_hour && K.landing_hour[String(seed)]) || 17.5) * 15 - 180;

    // ---- the macro channels: the seed's alone (no director offsets)
    w.macro = function (x, z, o) {
      fbm(x, z, M.lamC, M.octC, M.gC, sC, o3); o.C = clamp(w.aC * o3[0], -1.2, 1.25);
      fbm(x, z, M.lamT, M.octT, M.gT, sT, o3); o.T = M.T0 + w.aT * o3[0];
      fbm(x, z, M.lamP, M.octP, M.gP, sP, o3); o.lnP = M.lnP0 + w.aP * o3[0];
      fbm(x, z, 100000, 2, 0.5, sH, o3); o.HA = w.HA0 + w.aH * o3[0];
      // rock provinces (geology is crisp: logistic edges about 150 m after the warp)
      fbm(x, z, 1500, 2, 0.5, sA ^ 77, o3); var wx = 600 * o3[0];
      fbm(x + wx, z - wx, 12000, 3, 0.55, sA, o3); o.Ar = 0.07 + 0.36 * L(o3[0], 0.0, 0.08); o.ArN = o3[0];   // (world6: the rock province's raw noise, for the sand's smooth supply)
      fbm(x - wx, z + wx, 12000, 3, 0.55, sW, o3); o.Wr = L(o3[0], -0.05, 0.10);
      fbm(x + wx, z + wx, 20000, 3, 0.55, sV, o3); o.V = L(o3[0], 0.48, 0.06);
      fbm(x, z, 80000, 2, 0.5, sWind, o3); o.wind = 0.6 + 1.6 * o3[0]; // radians from north: blowing toward
      // (world6) the basin channel: the low ground the cloud sea fills, at the place's scale (warped: organic shores)
      fbm(x, z, KK.lamBw, 2, 0.5, sBw, o3); var bw = KK.aBw * o3[0];
      fbm(x + bw, z - 0.7 * bw, KK.lamB, KK.octB, 0.5, sBn, o3); o.Bn = o3[0];
      return o;
    };
    // ---- what the LIGHT reads: the climate's first octave only (90 and 80 km) and the hour. The sky, the sun, the haze,
    // the cloud cover and type and the exposure read this and nothing else (spec 3.8; v2's light rate limit, test L1)
    w.lightIn = function (x, z, o) {
      fbm(x, z, M.lamT, 1, M.gT, sT, o3); o.T = M.T0 + w.aT * o3[0] / gsum(M.gT, M.octT);
      fbm(x, z, M.lamP, 1, M.gP, sP, o3); o.lnP = M.lnP0 + w.aP * o3[0] / gsum(M.gP, M.octP);
      fbm(x, z, 100000, 2, 0.5, sH, o3); o.HA = w.HA0 + w.aH * o3[0];
      return o;
    };

    // ---- the place channels: continuous base maps plus the director's additive anchors (spec 3.3; v2: no cells)
    var po = new Float64Array(8);
    var hbo0 = [0, 0];
    w.place = function (x, z, o, mcIn) {
      if (w.fields && w.fields.P) w.fields.P(x, z, po); else po.fill(0);
      fbm(x, z, 900, 2, 0.5, sEw, o3); var ww = 500 * o3[0];
      fbm(x + ww, z + 0.7 * ww, 3000, 4, 0.80, sE, o3);
      var Eb = sstep(-0.55, 0.55, o3[0]);
      // uplands are rougher (relief follows height: Earth's slope vs height)
      var C = mcIn ? mcIn.C : (fbm(x, z, M.lamC, M.octC, M.gC, sC, o3), clamp(w.aC * o3[0], -1.2, 1.25));
      hb(C, hbo0);
      Eb = clamp(Eb * (0.75 + 0.25 * sstep(60, 500, hbo0[0])) + 0.35 * sstep(80, 700, hbo0[0]), 0, 1);
      o.Eb = Eb; o.E = clamp(Eb + po[0], 0, 1);
      o.rk = po[1];
      fbm(x, z, 1500, 3, 0.6, sM, o3); o.mb = 0.25 * o3[0]; o.m = o.mb + po[2];
      fbm(x, z, 2000, 3, 0.6, sSv, o3); o.Svb = sstep(-0.6, 0.6, o3[0]); o.Sv = clamp(o.Svb + po[3], 0, 1);
      fbm(x, z, 1000, 3, 0.6, sFl, o3); o.Flb = sstep(-0.3, 0.7, o3[0]); o.Fl = clamp(o.Flb + po[4], 0, 1);
      o.kd = po[5]; o.kx = po[6]; o.Fc = po[7];
      return o;
    };

    // ---- height (spec 3.4, v2)
    var RL = K.relief.lam, RG = K.relief.gain, NOCT = RL.length, NSM = K.relief.smooth_oct;
    var ga = [1]; for (var k = 1; k < NOCT; k++) ga.push(ga[k - 1] * RG[k]);
    var gs = 0; for (k = 0; k < NOCT; k++) gs += ga[k];
    for (k = 0; k < NOCT; k++) ga[k] /= gs;
    w.reliefAmp = ga;
    var dropped = 0; for (k = NSM; k < NOCT; k++) dropped += ga[k];
    w.dropped = dropped;
    var EA = K.Eamp;
    function Eamp(E) { return Math.exp(EA[0] + EA[1] * E + EA[2] * E * E) * 0.5; } // half the z range
    w.Eamp = Eamp;
    // the relief amplitude: the place's roughness, larger on uplands and mountains
    function ampOf(E, hbv) { return Eamp(E) * (1 + 0.8 * sstep(100, 900, hbv)); }
    w.ampOf = ampOf;
    var hbo = [0, 0];
    // R: eroded fractal noise; out: [R full, dR/dx, dR/dz, R of the first NSM octaves]
    function relief(x, z, A, nmax, fp, out) {
      var v = 0, dx = 0, dy = 0, vs = 0;
      for (var k = 0; k < nmax; k++) {
        var l = RL[k];
        var f = fp > 0 ? Nz.fpFade(1 / l, fp) : 1;
        if (f <= 0) break;
        grad2(x / l + 0.37 * k, z / l - 0.21 * k, (sR + k * 1013) >>> 0, o3);
        var s2 = (dx * dx + dy * dy) * A * A;
        var damp = 1 / (1 + K.relief.erode * s2);
        var a = ga[k] * damp * f;
        v += a * o3[0]; dx += a * o3[1] / l; dy += a * o3[2] / l;
        if (k === NSM - 1) vs = v;
      }
      if (nmax < NSM) vs = v;
      out[0] = v; out[1] = dx; out[2] = dy; out[3] = vs; return out;
    }
    w.relief = relief;
    var mc = {}, pc = {}, r4 = [0, 0, 0, 0];
    // the slow weights, a function of the macro and place channels only (the GPU bakes them)
    w.weights = function (mc, pc, o) {
      hb(mc.C, hbo);
      var hbv = hbo[0], A = ampOf(pc.E, hbv);
      var lnPd = mc.lnP + Math.log(1 + K.oro_per_m * Math.max(hbv, 0)) + pc.m;
      var Tl0 = mc.T + K.lapse_K_per_m * hbv;
      var veg0 = L(lnPd, K.cover.veg_lnP50 + 0.02 * (Tl0 - 10), K.cover.veg_w * 4.394);
      var sand = L(mc.Ar + pc.rk, 0.20, 0.08) * (1 - mc.V) * (0.5 + 0.5 * mc.Wr);
      var Kd = clamp((1 - veg0) * sand * L(-lnPd, -K.cover.dry_dune_lnP, 0.3) * (0.4 + 0.6 * L(Tl0, 12, 10)) + pc.kd, 0, 1);
      var dry = 1 - L(lnPd, Math.log(320), 0.5);
      // terraces and mesas: dry, layered rock (not sand seas, not lava), where it is rough enough to stand in tiers
      var Km = dry * L(mc.Ar + pc.rk, 0.16, 0.12) * (1 - mc.V) * (1 - 0.8 * Kd) * sstep(0.22, 0.55, pc.E);
      // ridges: rough, rocky or cold uplands
      var kr = sstep(0.45, 0.9, pc.E) * (0.5 + 0.5 * sstep(150, 700, hbv));
      // valleys (fluvial): wet enough to carve, not in sand seas
      var Kv = L(lnPd, Math.log(420), 0.6) * (1 - Kd) * (1 - 0.6 * Km);
      // lakes: the share of the land under the lake level rises with wetness and lowness
      var thrL = -1.35 + 0.9 * sstep(6.0, 7.3, lnPd) * (1 - sstep(150, 600, hbv)) + 0.15 * (pc.m / 0.4);
      var Kl = clamp(mc.V + pc.kx * 0.5, 0, 1);
      var step = K.terrace.step_min + (K.terrace.step_max - K.terrace.step_min) * sstep(0.3, 0.9, pc.E);
      o.hb = hbv; o.A = A; o.Kd = Kd; o.Km = Km; o.kr = kr; o.Kv = Kv; o.thrL = thrL; o.Kl = Kl; o.step = step; o.lnPd = lnPd; o.Tl0 = Tl0; o.sand = sand; o.dry = dry;
      return o;
    };
    var wt = {};
    w.duneK = function (mc, pc) { return w.weights(mc, pc, wt).Kd; };
    // ---- (world6) the two kits' weights, smooth functions of the maps (logistic shaping curves; no switch, no integer
    // from a map value): wD, the sand province (dry, hot, sandy, plus the director's dune offset kd); wC, the cloud sea
    // (the land falls away under a sea of cloud: the basin channel's low ground, plus the director's kx, filled the
    // more readily the wetter the climate). Both read only the macro and place channels (the director composes them)
    w.kit = function (mc, pc, o) {
      var lnPd = mc.lnP + pc.m;
      var Bq = mc.Bn + KK.kxB * pc.kx;
      var thC = KK.thC + KK.thCw * (lnPd - KK.lnPmid);
      var wC = L(thC - Bq, 0, KK.wB);
      var sandy = L(mc.ArN + KK.rkS * pc.rk, KK.ar0, KK.arW);
      var Ds = L(KK.dryP - lnPd, 0, KK.dryW) * L(mc.T, KK.T0, KK.TW) * (0.35 + 0.65 * sandy);
      o.wC = wC; o.wD = clamp(Ds + pc.kd, 0, 1); o.Bq = Bq; o.thC = thC;
      return o;
    };
    // the ridged term (C1: |n| as sqrt(n^2 + e^2)), in [-1, 0.9]
    function ridged(X, Z) { fbm(X, Z, K.ridge.lam, 2, 0.5, sRg, o3); return 1 - 2 * Math.sqrt(o3[0] * o3[0] + 0.0025); }
    // the valley field: a warped noise whose zero line is the valley's axis; returns [profile 0..1, river core 0..1]
    var vo = [0, 0];
    function valley(X, Z, out) {
      fbm(X, Z, 1100, 2, 0.5, sRv ^ 31, o3); var wv = 260 * o3[0];
      fbm(X + wv, Z - 0.8 * wv, K.valley.lam, 2, 0.5, sRv, o3);
      var q = o3[0] / K.valley.w;
      out[0] = Math.exp(-q * q); out[1] = Math.exp(-q * q * 9);
      return out;
    }
    // the full height and its parts; fp: pixel footprint (m) for band-limiting (0: all octaves)
    w.height = function (x, z, fp, o) {
      w.macro(x, z, mc); w.place(x, z, pc, mc);
      var W = w.weights(mc, pc, wt);
      var A = W.A;
      relief(x, z, A, NOCT, fp || 0, r4);
      var R = r4[0], Rs = r4[3];
      // ridges blended in where rough
      var rg = ridged(x, z);
      R = R + W.kr * K.ridge.w * (rg - 0.3 * R); Rs = Rs + W.kr * K.ridge.w * (rg - 0.3 * Rs);
      // glacial: valley floors widened into a U where it is cold
      var Kg = L(-W.Tl0, -1.0, 2.0);
      var floorv = -0.25, kk = 0.15;
      var hm = 0.5 * (R + floorv) - Math.sqrt(0.25 * (R - floorv) * (R - floorv) + kk * kk);
      R = R + Kg * 0.8 * (Math.max(hm, R - 0.6) - R);
      var y = A * R;
      // terraces and mesas: a C-infinity staircase twice over (flats and cliffs), blended in by Km
      var q = y / W.step, q2 = terr(terr(q));
      y = y + W.Km * (W.step * q2 - y);
      var h = W.hb + y;
      // dunes: transverse crests across the wind, asymmetric, broken where supply is low
      var wa = mc.wind, cx = Math.sin(wa), cz = Math.cos(wa);
      fbm(x, z, 300, 2, 0.5, sDu, o3); var dw = o3[0];
      fbm(x, z, 4000, 2, 0.5, sDu ^ 9, o3); var dl = K.dune.lam_min + (K.dune.lam_max - K.dune.lam_min) * sstep(-0.5, 0.5, o3[0]);
      var u = (x * cx + z * cz) / dl + 0.6 * dw;
      var ph = TAU * u;
      var prof = 0.5 + 0.5 * Math.sin(ph + K.dune.asym * Math.sin(ph));
      fbm(x, z, 160, 2, 0.5, sDu ^ 3, o3); var br = sstep(-0.35 + 0.6 * W.sand, 0.35 + 0.6 * W.sand, o3[0] + 0.3);
      var Hd = K.dune.h_min + (K.dune.h_max - K.dune.h_min) * sstep(-0.4, 0.6, dw * 0.5 + 0.2);
      var D = W.Kd * Hd * prof * (0.35 + 0.65 * br);
      // lava fronts
      fbm(x, z, 250, 2, 0.5, sLv ^ 5, o3); var lw = 90 * o3[0];
      fbm(x + lw, z - lw, K.lava.lam, 3, 0.55, sLv, o3);
      var Lv = W.Kl * K.lava.h * L(o3[0], 0.05, 0.12);
      // valleys: carved where wet, deepest where the land is rough (C-infinity profile)
      valley(x, z, vo);
      var Dv = W.Kv * (4 + Math.min(0.9 * A, K.valley.depth_max));
      var Va = -Dv * vo[0];
      // outcrops (tors) where the rock shows and the land is rough: ridged bumps of 20-60 m
      fbm(x, z, 140, 2, 0.5, sOc, o3); var on = o3[0];
      var Ko = (1 - L(W.lnPd, Math.log(500), 0.8)) * sstep(0.35, 0.8, pc.E) * (1 - W.Kd);
      var Oc = Ko * 9 * Math.pow(sstep(0.25, 0.75, on), 2);
      // gullies (fluvial, small) where wet
      var Kf = L(W.lnPd, Math.log(300), 0.4) * sstep(0.05, 0.5, pc.E);
      fbm(x, z, K.gully.lam, 2, 0.5, sGu, o3);
      var an = Math.sqrt(o3[0] * o3[0] + 0.01);
      var Gu = -Kf * K.gully.h * Math.pow(Math.max(0, 1 - an), 3);
      h += D + Lv + Va + Oc + Gu;
      if (o) {
        o.h = h; o.hb = W.hb; o.A = A; o.R = R; o.Rs = Rs; o.D = D; o.Kd = W.Kd; o.Lv = Lv; o.Kl = W.Kl; o.Kg = Kg; o.Gu = Gu; o.Kf = Kf; o.sand = W.sand;
        o.Km = W.Km; o.kr = W.kr; o.Kv = W.Kv; o.lnPd = W.lnPd; o.Va = Va; o.Oc = Oc; o.valley = vo[0]; o.river = vo[1]; o.thrL = W.thrL; o.Dv = Dv;
        o.mc = mc; o.pc = pc;
      }
      return h;
    };
    // the water level (smooth; far under the land where there is none): lakes in the low ground where wet, rivers in
    // the valley floors. The surface drawn is smax(h, water) (C1)
    var ho = {};
    w.water = function (x, z, hparts) {
      var P = hparts || (w.height(x, z, 0, ho), ho);
      // (where it is dry there are no lakes: the level sinks far under the land; no lakes on a desert's terraces)
      var lake = P.hb + P.A * P.thrL - 60 * (1 - sstep(5.5, 6.1, P.lnPd));
      // the river: the valley's smooth floor plus a metre, only in the channel's core and where valleys are carved
      var floor = P.hb + P.A * P.Rs - P.Dv + 1.0;
      var riv = floor - 60 * (1 - P.river) - 60 * (1 - sstep(0.15, 0.5, P.Kv));
      return smax(lake, riv, 2.0);
    };
    // the smooth height and the envelope h_env = h_smooth + rho (spec 3.4): rho bounds everything dropped
    w.env = function (x, z, o) {
      w.macro(x, z, mc); w.place(x, z, pc, mc);
      var W = w.weights(mc, pc, wt);
      var A = W.A;
      relief(x, z, A, NSM, 0, r4);
      var rg = ridged(x, z);
      var Rs = r4[0] + W.kr * K.ridge.w * (rg - 0.3 * r4[0]);
      var hs = W.hb + A * Rs;
      // rho: the dropped octaves (|n| <= 1 each; the ridge's own share of them), the terrace's deviation (<= 0.32 step),
      // the dunes, lava, outcrops, gullies (only lower) and valleys (only lower), the canopy
      var lnPd = W.lnPd;
      var canB = sstep(K.cover.tree_lnP50 - 0.85, K.cover.tree_lnP50 - 0.10, lnPd + 0.15);
      var canB2 = sstep(5.267, 5.617, lnPd);
      var rho = A * dropped * (1 + 0.3 * W.kr * K.ridge.w) + W.Km * (0.32 * W.step + A * 0.05) + W.Kd * K.dune.h_max + W.Kl * K.lava.h + 9
        + K.trees.h_max * (0.45 * canB + 0.55 * canB2) * 0.8 + 1.0;
      // the glacial U only lowers; the terrace may raise a point by its deviation (counted above)
      if (o) { o.hs = hs; o.rho = rho; o.env = hs + rho; }
      return hs + rho;
    };
    // the fog sea's top (cloud sea in basins): the inversion level plus 2-8 m domes; far under the land where none
    w.fogTop = function (x, z) {
      w.macro(x, z, mc);
      var basin = L(-mc.C, 0.30, 0.12);
      fbm(x, z, 40000, 2, 0.5, sFog, o3);
      var inv = -20 + 30 * o3[0];
      fbm(x, z, 140, 2, 0.5, sFog ^ 7, o3);
      var top = inv + 5 + 3 * o3[0];
      return top - (1 - basin) * 300;
    };

    // ---- local climate and cover (spec 3.5, v2: thresholds shift with heat; plant forms by climate)
    w.cover = function (x, z, h, gx, gz, o) {
      w.macro(x, z, mc); w.place(x, z, pc, mc);
      return w.coverWith(mc, pc, h, gx, gz, o);
    };
    w.coverWith = function (mc, pc, h, gx, gz, o) {
      var slope = Math.hypot(gx, gz);
      var sunAz = w.sunAz(mc.HA);
      var asp = -(gx * Math.sin(sunAz) + gz * Math.cos(sunAz)) / Math.max(1e-3, Math.hypot(1, slope));
      var Tl = mc.T + K.lapse_K_per_m * h + 1.5 * asp;
      var wx = Math.sin(mc.wind), wz = Math.cos(mc.wind);
      var windward = clamp(-(gx * wx + gz * wz), -0.5, 0.5);
      var lnPl = mc.lnP + Math.log(1 + K.oro_per_m * Math.max(h, 0)) + 0.15 * windward + pc.m;
      var P = Math.exp(lnPl);
      var snow = logi(-Tl / 0.6) * Math.min(1, P / 150);
      // heat raises the water plants need (evaporation): the curves' centres move with T
      var veg = L(lnPl, K.cover.veg_lnP50 + 0.02 * (Tl - 10), K.cover.veg_w * 4.394) * (1 - snow) * logi((Tl + 4) / 1.5);
      var tP = K.cover.tree_lnP50 + 0.025 * (Tl - 2);
      var closed = K.cover.tree_plateau * L(lnPl, tP, 0.16) * logi((Tl - 2) / 1.0) * (0.6 + 0.4 * sstep(0.08, 0.30, slope)) * pc.Sv;
      var open = 0.2 * L(lnPl, Math.log(260), 0.45) * L(Tl, 17, 6) * (0.5 + 0.5 * pc.Sv); // savanna: scattered trees
      var tree = closed + open * (1 - closed);
      var moss = L(lnPl, 6.2, 0.6) * L(-Tl, -8, 6) * (0.3 + 0.7 * mc.V) + 0.02;
      var shrub = (1 - L(lnPl, 5.65 + 0.02 * (Tl - 10), 0.5)) * (0.35 + sstep(0.05, 0.25, slope)) * (1 - 0.5 * pc.Sv) + 0.05;
      var grass = 1.0;
      var sw = moss + shrub + grass;
      var rest = veg * (1 - tree);
      o.snow = snow; o.tree = veg * tree; o.moss = rest * moss / sw; o.shrub = rest * shrub / sw; o.grass = rest * grass / sw;
      o.bloom = o.grass * 0.3 * pc.Fl * L(Tl, 4, 8);
      var bare = Math.max(0, 1 - snow - veg);
      var sandS = L(mc.Ar + pc.rk, 0.20, 0.08) * (1 - mc.V);
      var talus = sstep(0.55, 0.75, slope) * (0.5 + 0.5 * clamp(pc.kx + 0.5, 0, 1));
      o.sand = bare * sandS * (1 - talus); o.rock = bare - o.sand;
      o.dry = 1 - L(lnPl, 5.55 + 0.02 * (Tl - 10), 0.35);
      // plant forms (continuous weights; a site's form is its own pick against them): conifer where cold, umbrella
      // crowns (acacia, palm) where hot, broadleaf between
      var wCon = L(-Tl, -7, 7) * (0.7 + 0.3 * sstep(0.1, 0.4, slope));
      var wUmb = L(Tl, 20, 5) * (1 - wCon);
      o.wCon = wCon; o.wUmb = wUmb; o.wBro = Math.max(0, 1 - wCon - wUmb);
      o.Tl = Tl; o.lnPl = lnPl; o.slope = slope; o.Ar = mc.Ar + pc.rk; o.Wr = mc.Wr; o.V = mc.V;
      return o;
    };

    // ---- the sun from the hour map (lat 40, declination 10)
    var lat = K.sky.lat * Math.PI / 180, dec = K.sky.decl * Math.PI / 180;
    w.sunEl = function (HA) { var h = HA * Math.PI / 180; return Math.asin(Math.sin(lat) * Math.sin(dec) + Math.cos(lat) * Math.cos(dec) * Math.cos(h)); };
    w.sunAz = function (HA) {
      var h = HA * Math.PI / 180;
      var az = Math.atan2(Math.sin(h), Math.cos(h) * Math.sin(lat) - Math.tan(dec) * Math.cos(lat));
      return az + Math.PI;
    };
    w.sunDir = function (HA, out) { var e = w.sunEl(HA), a = w.sunAz(HA); out[0] = Math.cos(e) * Math.sin(a); out[1] = Math.sin(e); out[2] = Math.cos(e) * Math.cos(a); return out; };

    w.bounds = {
      T: w.aT * maxGrad(M.lamT, M.octT, M.gT, sT), lnP: w.aP * maxGrad(M.lamP, M.octP, M.gP, sP),
      hbase: hb.slopeMax * w.aC * gCmax, sunDegPerM: w.aH * gH,
      T_analytic: w.aT * Nz.fbmBound(M.lamT, M.octT, M.gT, G1), lnP_analytic: w.aP * Nz.fbmBound(M.lamP, M.octP, M.gP, G1)
    };
    w.hbFn = hb;
  }

  // ---- albedo per cover (linear RGB), from OKLab (L, C, hue) at the x2.5 reflectance scale (spec 2.3 / 3.6); v2 hues
  // and chroma toward the reference's colour script (teal greens, warm sand)
  function oklabToLin(Lk, a, b) {
    var l_ = Lk + 0.3963377774 * a + 0.2158037573 * b, m_ = Lk - 0.1055613458 * a - 0.0638541728 * b, s_ = Lk - 0.0894841775 * a - 1.2914855480 * b;
    var l = l_ * l_ * l_, m = m_ * m_ * m_, s = s_ * s_ * s_;
    return [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s];
  }
  function linToOklab(r, g, b) {
    var l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b, m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b, s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b;
    l = Math.cbrt(l); m = Math.cbrt(m); s = Math.cbrt(s);
    return [0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s, 1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s];
  }
  function alb(Lk, C, hdeg) { var h = hdeg * Math.PI / 180, c = oklabToLin(Lk, C * Math.cos(h), C * Math.sin(h)); return [Math.max(0, c[0]) / 2.5, Math.max(0, c[1]) / 2.5, Math.max(0, c[2]) / 2.5]; }
  var ALB = {
    sand: alb(0.83, 0.075, 68), steppe: alb(0.74, 0.060, 82), grass: alb(0.60, 0.075, 140), shrub: alb(0.55, 0.050, 118),
    conifer: alb(0.50, 0.050, 165), broad: alb(0.60, 0.075, 138), moss: alb(0.62, 0.065, 120), snow: [0.86, 0.87, 0.90],
    litter: alb(0.50, 0.035, 70), bloomW: alb(0.95, 0.02, 90), bloomY: alb(0.90, 0.15, 95), bloomP: alb(0.82, 0.11, 350), bloomV: alb(0.72, 0.13, 300),
    acacia: alb(0.60, 0.065, 118), water: alb(0.35, 0.04, 210)
  };
  function rockAlb(A, Wr) { var Lk = Math.cbrt(Math.max(A, 0.03) * 2.5), C = 0.02 + 0.10 * Wr, h = 38 + 37 * (1 - Wr); return alb(Lk, C, h); }

  var api = { World: World, logi: logi, L: L, sstep: sstep, clamp: clamp, smax: smax, terr: terr, oklabToLin: oklabToLin, linToOklab: linToOklab, alb: alb, ALB: ALB, rockAlb: rockAlb, monoCubic: monoCubic };
  if (isNode) module.exports = api; else root.CWMaps = api;
})(CWROOT);
// gen/director.js (v2): the director composes the land ahead by ANCHORS on the place channels: two seed-fixed jittered
// lattices (big anchors, radius 1-2.2 km; small anchors, radius 0.3-0.65 km), each anchor a compact C2 bump on a
// domain-warped distance (organic outlines, varied sizes), its offset ADDED to the continuous base maps (many anchors
// are null: the base maps' own regions stand). There is no partition into cells and no place list the maps can read.
// It writes only its own append-only tables (each anchor's radius and offset, once, before it can influence anything
// in reach of the view) and keeps its own record (looks seen, for novelty). It never touches the camera, the heading or
// the time. Places are measured from the maps (gen/sim.js pacing), not from this record.
(function (root) {
  'use strict';
  var isNode = typeof module !== 'undefined' && module.exports;
  var Hs = isNode ? require('./hash.js') : root.CWHash;
  var Mp = isNode ? require('./maps.js') : root.CWMaps;
  var Nz = isNode ? require('./noise.js') : root.CWNoise;
  var mix32 = Hs.mix32, hash2 = Hs.hash2, u01 = Hs.u01;

  function phi(r) { if (r >= 1) return 0; var a = 1 - r; return a * a * a * a * (4 * r + 1); }
  // v2's anchor kernel: a plateau (flat inside 0.55 r, a C2 quintic fall to 0 at r): a place's interior is even, its
  // edge an ecotone of 0.45 r
  function plat(r) { if (r >= 1) return 0; if (r <= 0.55) return 1; var t = (1 - r) / 0.45; return t * t * t * (t * (t * 6 - 15) + 10); }
  function smax1(s) { var k = 0.5, h = Math.max(k - Math.abs(s - 1), 0) / k; return Math.max(s, 1) + h * h * k * 0.25; }
  function dphi(r) { if (r >= 1) return 0; var a = 1 - r; return -20 * r * a * a * a; }

  function Lattice(g, s) { this.g = g; this.s = s; this.dz = g * 0.8660254037844386; }
  Lattice.prototype.pos = function (i, j, out) {
    var h = hash2(i, j, this.s);
    out[0] = (i + 0.5 * (j & 1)) * this.g + (u01(h) - 0.5) * 0.4 * this.g;
    out[1] = j * this.dz + (u01(mix32(h)) - 0.5) * 0.4 * this.g;
    return out;
  };
  Lattice.prototype.each = function (x, z, r, fn) {
    var g = this.g, dz = this.dz, p = [0, 0];
    var j0 = Math.floor((z - r) / dz) - 1, j1 = Math.ceil((z + r) / dz) + 1;
    for (var j = j0; j <= j1; j++) {
      var i0 = Math.floor((x - r) / g) - 1, i1 = Math.ceil((x + r) / g) + 1;
      for (var i = i0; i <= i1; i++) {
        this.pos(i, j, p);
        var d = Math.hypot(p[0] - x, p[1] - z);
        if (d <= r) fn(i, j, p[0], p[1], d);
      }
    }
  };
  Lattice.prototype.eachNew = function (x, z, px, pz, r, fn) {
    var g = this.g, dz = this.dz, p = [0, 0], m = 0.35 * g;
    var j0 = Math.floor((z - r) / dz) - 1, j1 = Math.ceil((z + r) / dz) + 1;
    for (var j = j0; j <= j1; j++) {
      var zr = j * dz, jz = 0.2 * g + 1e-6;
      var dzc = Math.max(0, Math.abs(zr - z) - jz), hw = r * r - dzc * dzc;
      var cw = hw > 0 ? Math.sqrt(hw) : 0;
      var lo = x - cw - m - g, hi = x + cw + m + g;
      var dzp = Math.abs(zr - pz) + jz, hp = r * r - dzp * dzp, pw = hp > 0 ? Math.sqrt(hp) : -1;
      var plo = px - pw + m + g, phi_ = px + pw - m - g;
      var i0 = Math.floor(lo / g), i1 = Math.ceil(hi / g);
      for (var i = i0; i <= i1; i++) {
        var xi = (i + 0.5 * (j & 1)) * g;
        if (pw > 0 && xi > plo && xi < phi_) continue;
        this.pos(i, j, p);
        var d = Math.hypot(p[0] - x, p[1] - z);
        if (d <= r && Math.hypot(p[0] - px, p[1] - pz) > r) fn(i, j, p[0], p[1], d);
      }
    }
  };
  function key(i, j) { return i * 1048576 + j; }

  function Director(world, K, seed) {
    var D = this;
    D.world = world; D.K = K; D.seed = seed >>> 0;
    var F = K.family, NV = K.pvec.length, PB = K.pbound;
    D.NV = NV;
    D.fam = {};
    ['B', 'S', 'N'].forEach(function (n, k) {
      var f = F[n];
      // the warp of a lattice's distances (organic outlines): amplitude and wavelength scale with the anchors' size
      var wA = f.wA || 0, wL = f.wL || 1000;
      var Reff = (n === 'B' ? 1.3 : 1) * f.R + wA; // big anchors' land channels reach 1.3 R
      D.fam[n] = { name: n, g: f.g, R: f.R, D: f.D, m: f.m, p: f.p || 1, rmin: f.rmin || 1, wA: wA, wL: wL, Reff: Reff, Rc: f.D + Reff + f.m,
        lat: new Lattice(f.g, mix32(seed ^ (0x7A11 + k))), tab: new Map(), n: 0, nActive: 0, sw1: mix32(seed ^ (0x5A1 + k)), sw2: mix32(seed ^ (0x5B2 + k)) };
    });
    D.cam = null; D.t = 0; D.log = { anchors: 0, active: 0, hardMiss: 0, nullChosen: 0 };
    D.seen = [];  // looks seen: {t, look} every 5 s at the view ahead (the record; never read by the drawing)
    var o3 = [0, 0, 0], wv = [0, 0];
    function warpOf(f, x, z, out) {
      if (!f.wA) { out[0] = x; out[1] = z; return out; }
      Nz.fbm(x, z, f.wL, 2, 0.5, f.sw1, o3); var a = o3[0];
      Nz.fbm(x, z, f.wL, 2, 0.5, f.sw2, o3); var b = o3[0];
      out[0] = x + f.wA * a; out[1] = z + f.wA * b; return out;
    }
    D.warpOf = warpOf;
    // ---- the field the maps read: the sum of the anchors' bumps, softly bounded per channel (tanh: C-infinity)
    var acc = new Float64Array(8), acs = new Float64Array(8), acr = new Float64Array(8);
    // the channels that shape the land (roughness, rock mix, moisture, dunes, lava and talus) move the relief and the
    // flight's envelope: they are carried by a smooth bump (C2) over 1.3 of the anchor's radius, big anchors only, so
    // the envelope stays climbable (P5). The channels that colour and furnish a place (tree structure, bloom, cloud
    // form) are carried by the plateau (an even interior, a crisper edge), big and small anchors.
    var RELIEF = [1, 1, 1, 0, 0, 1, 1, 0], WIDE = 1.3;
    function addFam(f, x, z, a8, relief) {
      warpOf(f, x, z, wv); var sw = 0;
      a8.fill(0);
      f.lat.each(wv[0], wv[1], relief ? WIDE * f.R : f.R, function (i, j, sx, sz, d) {
        var a = f.tab.get(key(i, j)); if (!a || !a.v) return;
        var q = relief ? phi(d / (WIDE * a.r)) : plat(d / a.r); if (q <= 0) return;
        sw += q; for (var c = 0; c < NV; c++) a8[c] += q * a.v[c];
      });
      var den = smax1(sw); for (var c = 0; c < NV; c++) a8[c] /= den; // where anchors overlap, their mean
      return sw;
    }
    // the field: big anchors' blend (each place's offset; the base matrix between them) plus small anchors' patches
    // (look channels only), each a mean over a smooth max of 1 (C1), so never beyond its anchors' own bounds
    D.fieldP = function (x, z, out) {
      addFam(D.fam.B, x, z, acc, false); addFam(D.fam.S, x, z, acs, false); addFam(D.fam.B, x, z, acr, true);
      for (var c = 0; c < NV; c++) out[c] = Math.max(-PB[c], Math.min(PB[c], RELIEF[c] ? acr[c] : acc[c] + acs[c]));
      return out;
    };
    world.fields = { P: D.fieldP };

    // ---- the look predictor (provisional, as v1): cover shares, the albedo mix as OKLab, roughness, dunes, bloom,
    // cloud form, rock; standardised at the landing, x sqrt 2 for the ruler's tau
    var ALB = Mp.ALB, cv = {}, wt = {}, kw = {};
    D.lookOf = function (mc, pv, out) {
      var W = world.weights(mc, pv, wt);
      var sl = Math.min(1.2, W.A * 0.0045);
      world.coverWith(mc, pv, W.hb, sl * 0.7, sl * 0.7, cv);
      var rk = Mp.rockAlb(Math.max(0.05, cv.Ar), cv.Wr);
      var gr = [0, 0, 0];
      for (var c = 0; c < 3; c++) gr[c] = ALB.grass[c] * (1 - cv.dry) + ALB.steppe[c] * cv.dry;
      var tr = cv.tree, sh = cv.shrub, gs = cv.grass, mo = cv.moss, sa = cv.sand, ro = cv.rock, sn = cv.snow;
      var al = [0, 0, 0];
      for (c = 0; c < 3; c++) al[c] = tr * (cv.wCon * ALB.conifer[c] + cv.wBro * ALB.broad[c] + cv.wUmb * ALB.acacia[c]) + sh * ALB.shrub[c] + gs * gr[c] + mo * ALB.moss[c] + sa * ALB.sand[c] + ro * rk[c] + sn * ALB.snow[c];
      var lab = Mp.linToOklab(al[0] * 2.5, al[1] * 2.5, al[2] * 2.5);
      out[0] = lab[0]; out[1] = lab[1]; out[2] = lab[2]; out[3] = tr; out[4] = gs; out[5] = sh; out[6] = sa + ro; out[7] = W.Kd;
      out[8] = Math.log(W.A); out[9] = cv.bloom; out[10] = W.Km; out[11] = W.Kv * 0.5 + 0.5 * Mp.sstep(-1.2, 0.0, W.thrL);
      world.kit(mc, pv, kw); out[12] = kw.wC; out[13] = kw.wD;   // (world6: the kits' weights are part of the look)
      return out;
    };
    D.NF = 14;
    D.scale = new Float64Array(D.NF);
    D.dist = function (a, b) { var s = 0; for (var c = 0; c < D.NF; c++) { var q = (a[c] - b[c]) / D.scale[c]; s += q * q; } return Math.sqrt(s) * Math.SQRT2; };
    // candidate offsets for an anchor at (cx, cz): Earth-first conditional draws given the climate there (spec 4.4.1)
    var mcc = {}, pcc = {}, hb2 = [0, 0];
    D.candidates = function (cx, cz, rng, n, scale) {
      world.macro(cx, cz, mcc);
      var hbv = world.hbFn(mcc.C, hb2)[0];
      var drySandy = Mp.L(mcc.Ar, 0.20, 0.08) * (1 - Mp.L(mcc.lnP, 5.3, 0.4));
      var up = Mp.sstep(20, 300, hbv), out = [new Float64Array(NV)]; // candidate 0: the null anchor (the base stands)
      for (var k = 1; k < n; k++) {
        var v = new Float64Array(NV);
        v[0] = ((rng() * 2 - 1) * 0.85 + 0.25 * up) * PB[0] * scale;
        v[1] = (rng() * 2 - 1) * PB[1] * scale;
        v[2] = (rng() * 2 - 1) * PB[2] * scale;
        v[3] = (rng() * 2 - 1) * PB[3] * scale;
        v[4] = (rng() * 2 - 1) * PB[4] * scale;
        v[5] = (rng() * 1.3 - 0.3) * PB[5] * drySandy * scale;
        v[6] = (rng() * 2 - 1) * PB[6] * scale;
        v[7] = (rng() * 2 - 1) * PB[7] * scale;
        out.push(v);
      }
      return out;
    };
    // the place vector at a point with an extra offset v added to the field's sum (for scoring a candidate)
    var pvTmp = {};
    function placeWith(cx, cz, v, f, wgt) {
      world.place(cx, cz, pvTmp, mcc);
      // the field already holds the committed anchors; add this candidate's bump at its weight (the soft bound is
      // ignored here: scoring only)
      var o = { E: Math.min(1, Math.max(0, pvTmp.E + wgt * v[0])), rk: pvTmp.rk + wgt * v[1], m: pvTmp.m + wgt * v[2], Sv: Math.min(1, Math.max(0, pvTmp.Sv + wgt * v[3])),
        Fl: Math.min(1, Math.max(0, pvTmp.Fl + wgt * v[4])), kd: pvTmp.kd + wgt * v[5], kx: pvTmp.kx + wgt * v[6], Fc: pvTmp.Fc + wgt * v[7] };
      return o;
    }
    // ---- the landing (v2): the world's origin for this visit, chosen once before anything is drawn, among 24 seed-fixed
    // candidates, as the one with the most kinds of land within 7 km all round (10 min of flight whichever way you go:
    // it never assumes a heading) and the widest spread of climate there. It places the visitor; it never steers.
    D.landing = function () {
      var r = Hs.splitmix32(mix32(D.seed ^ 0x1A4D)), best = [0, 0], bs = -1, mc = {}, pc = {}, W = {}, cv = {};
      for (var k = 0; k < 24; k++) {
        var x0 = (r() - 0.5) * 120000, z0 = (r() - 0.5) * 120000, kinds = {}, Ts = [], Ps = [];
        for (var ring = 0; ring <= 3; ring++) for (var q = 0; q < (ring ? 8 : 1); q++) {
          var a = (q + 0.5 * (ring & 1)) * Math.PI / 4, rr = ring * 2333, x = x0 + rr * Math.sin(a), z = z0 + rr * Math.cos(a);
          world.macro(x, z, mc); world.place(x, z, pc, mc); world.weights(mc, pc, W); world.coverWith(mc, pc, W.hb, 0.05, 0.03, cv);
          var kind = cv.snow > 0.4 ? 'snow' : W.thrL > -0.6 ? 'wet' : cv.tree > 0.35 ? (cv.wCon > 0.5 ? 'conifer' : cv.wUmb > 0.5 ? 'palm' : 'forest') : cv.tree > 0.08 ? 'wood' :
            (cv.sand + cv.rock > 0.5 ? (W.Kd > 0.25 ? 'dunes' : W.Km > 0.25 ? 'mesa' : 'bare') : cv.dry > 0.6 ? 'steppe' : W.A > 40 ? 'hills' : 'meadow');
          kinds[kind] = 1; Ts.push(mc.T); Ps.push(mc.lnP);
        }
        var sd = function (a) { var m = 0; a.forEach(function (v) { m += v / a.length; }); var s2 = 0; a.forEach(function (v) { s2 += (v - m) * (v - m) / a.length; }); return Math.sqrt(s2); };
        var sc = Object.keys(kinds).length + 0.5 * (sd(Ts) / 2 + sd(Ps) / Math.log(1.5));
        if (sc > bs) { bs = sc; best = [x0, z0]; }
      }
      D.landScore = bs;
      return best;
    };
    D.land0 = D.landing();
    // calibrate the look scales at the landing's climate (random candidates), each floored at the smallest difference
    // that shows
    var FLOOR = [0.02, 0.006, 0.006, 0.05, 0.05, 0.03, 0.05, 0.05, 0.12, 0.02, 0.05, 0.05, 0.08, 0.08];
    (function () {
      var r = Hs.splitmix32(mix32(seed ^ 0xCA11)), Ls = [], mean = new Float64Array(D.NF);
      for (var k = 0; k < 400; k++) {
        // the spread of looks the place channels make at one climate (the landing's): base maps at random points plus
        // random offsets (as v1: the climate's own travel comes on top of this)
        var x = (r() - 0.5) * 30000, z = (r() - 0.5) * 30000; world.macro(D.land0[0], D.land0[1], mcc);
        var v = D.candidates(x, z, r, 2, 1)[1]; world.macro(D.land0[0], D.land0[1], mcc);
        var pw = placeWith(x, z, v, null, 1); world.macro(D.land0[0], D.land0[1], mcc);
        var lk = D.lookOf(mcc, pw, new Float64Array(D.NF));
        Ls.push(lk); for (var c = 0; c < D.NF; c++) mean[c] += lk[c] / 400;
      }
      for (var c2 = 0; c2 < D.NF; c2++) { var s = 0; for (k = 0; k < Ls.length; k++) s += (Ls[k][c2] - mean[c2]) * (Ls[k][c2] - mean[c2]); D.scale[c2] = Math.max(FLOOR[c2], Math.sqrt(s / Ls.length)); }
    })();

    // ---- committing an anchor (spec 4.3-4.4, v2): its radius and whether it acts are the slot's own (hash); its offset
    // is chosen, aware of what has been seen and of its committed neighbours
    var lk = new Float64Array(14);
    function commitAnchor(f, i, j, sx, sz) {
      var h = hash2(i, j, mix32(D.seed ^ 0xA2C7 ^ f.g));
      var active = u01(h) < f.p;
      var r = f.R * (f.rmin + (1 - f.rmin) * u01(mix32(h ^ 0x51)));
      var rec = { v: null, r: r, t: D.t, look: null };
      D.log.anchors++;
      if (active) {
        D.log.active++;
        var rng = Hs.splitmix32(mix32(h ^ 0x77));
        world.macro(sx, sz, mcc);
        var C = D.candidates(sx, sz, rng, K.K, f.name === 'B' ? 1 : 0.6);
        // neighbours' looks (committed anchors of this family within 1.8 R): pacing
        var nb = [];
        f.lat.each(sx, sz, 1.8 * f.R, function (a, b) { var q = f.tab.get(key(a, b)); if (q && q.look) nb.push(q.look); });
        // the look here as it stands (the base matrix and the anchors already committed): a place must stand apart
        // from its surroundings (big anchors: >= 0.8 tau; small ones are patches and need not)
        var baseLook = Float64Array.from(D.lookOf(mcc, placeWith(sx, sz, C[0], f, 0), lk));
        var apart = f.name === 'B' ? 0.8 * K.tau : 0;
        // looks seen: the last 20 min hard (tau), earlier ones tau / 2
        var best = 0, bs = -1e9, bestAny = 0, bMin = -1;
        for (var k = 0; k < C.length; k++) {
          D.lookOf(mcc, placeWith(sx, sz, C[k], f, 1), lk);
          var mind = 1e9, hard = true;
          for (var a = 0; a < D.seen.length; a++) {
            var e = D.seen[a], d = D.dist(lk, e.look);
            if (D.t - e.t <= K.novelty_window_s) { if (d < mind) mind = d; } else if (d < K.tau / 2) hard = false;
          }
          if (D.seen.length && mind < K.tau) hard = false;
          var dBase = D.dist(lk, baseLook);
          if (dBase < apart) hard = false;
          var s = 0.1 * Math.min(3, Math.max(0, (D.seen.length ? mind : K.tau) - K.tau)) - 0.3 * Math.max(0, dBase - 1.8 * K.tau);
          var pace = 0;
          for (a = 0; a < nb.length; a++) { var dd = D.dist(lk, nb[a]); if (dd < 0.6 * K.tau) pace += 0.6 * K.tau - dd; else if (dd > 1.6 * K.tau) pace += dd - 1.6 * K.tau; }
          s -= 0.5 * pace / Math.max(1, nb.length) * 2;
          if (hard && s > bs) { bs = s; best = k; }
          if (mind > bMin) { bMin = mind; bestAny = k; }
        }
        if (bs === -1e9) { best = bestAny; D.log.hardMiss++; }
        if (best === 0) D.log.nullChosen++;
        // quantise to 8 bits over each channel's bound (as the GPU table would hold it): exact, append-only
        var v = new Float32Array(NV);
        for (var c = 0; c < NV; c++) { var qn = Math.round((Math.max(-PB[c], Math.min(PB[c], C[best][c])) / PB[c] * 0.5 + 0.5) * 255); v[c] = (qn / 255 - 0.5) * 2 * PB[c]; }
        rec.v = v;
        D.lookOf(mcc, placeWith(sx, sz, C[best], f, 1), lk); rec.look = Float64Array.from(lk);
        f.nActive++;
      }
      f.tab.set(key(i, j), rec);
      f.n++;
    }
    function commitN(i, j) {
      var f = D.fam.N, h = hash2(i, j, mix32(D.seed ^ 0x4E4E));
      var v = new Float32Array(2), bm = -1;
      for (var k = 0; k < 4; k++) { var a = u01(mix32(h + k)), b = u01(mix32(h ^ (k * 977))); var d = Math.abs(a - D.nMean[0]) + Math.abs(b - D.nMean[1]); if (d > bm) { bm = d; v[0] = a; v[1] = b; } }
      D.nMean[0] = 0.999 * D.nMean[0] + 0.001 * v[0]; D.nMean[1] = 0.999 * D.nMean[1] + 0.001 * v[1];
      f.tab.set(key(i, j), { v: v, r: f.R, t: D.t }); f.n++;
    }
    D.nMean = [0.5, 0.5];
    D.key = key;
    // ---- the tick (spec 4.5): every uncommitted slot within its family's commit radius, nearest first
    D.tick = function (cam, t) {
      D.t = t;
      var prev = D.cam;
      D.cam = [cam[0], cam[1]];
      var n0 = D.fam.S.n + D.fam.B.n;
      ['B', 'S', 'N'].forEach(function (n) {
        var f = D.fam[n], list = [];
        var add = function (i, j, sx, sz, d) { if (!f.tab.has(key(i, j))) list.push([d, i, j, sx, sz]); };
        if (!prev) f.lat.each(cam[0], cam[1], f.Rc, add); else f.lat.eachNew(cam[0], cam[1], prev[0], prev[1], f.Rc, add);
        list.sort(function (a, b) { return a[0] - b[0]; });
        for (var k = 0; k < list.length; k++) {
          if (n === 'N') commitN(list[k][1], list[k][2]); else commitAnchor(f, list[k][1], list[k][2], list[k][3], list[k][4]);
          if (D.onCommit) D.onCommit(n, list[k][3], list[k][4], t);
        }
      });
      return D.fam.S.n + D.fam.B.n - n0;
    };
    // the record of what is seen (the sim calls it every 5 s with the look of the view ahead)
    D.see = function (t, look) { D.seen.push({ t: t, look: Float64Array.from(look) }); if (D.seen.length > 4000) D.seen.shift(); };
    D.isCommitted = function (n, i, j) { return D.fam[n].tab.has(key(i, j)); };
  }
  var api = { Director: Director, phi: phi, dphi: dphi, plat: plat, Lattice: Lattice };
  if (isNode) module.exports = api; else root.CWDirector = api;
})(CWROOT);
    var K = {"_":"Every number the first look uses, from spec.md (section in brackets). Read by gen/*.js and written into the GLSL by render/proto.js.","cruise":12,"clearance":14,"vcap":30,"tick":0.25,"scale_land":0.338,"scale_climate":0.23,"place":{"p10_s":55,"p50_s":90,"p90_s":180,"max_line_s":240},"lapse_K_per_m":-0.0178,"oro_per_m":0.00044,"bounds":{"T_K_per_km":1.2,"lnP_per_km":0.16,"light_dE_per_km":0.012,"sun_deg_per_km":0.75,"env":0.5774,"h":2.7475,"use":0.85,"hbase":0.2},"macro":{"T0":13.5,"lnP0":5.94,"lamC":60000,"octC":3,"gC":0.6,"lamT":90000,"octT":2,"gT":0.5,"aT":28,"lamP":80000,"octP":2,"gP":0.5,"aP":3,"lamL":360000},"hbase":{"C":[-1,-0.5,-0.2,0.05,0.25,0.45,0.7,1],"h":[-40,-8,8,30,110,320,750,1400]},"relief":{"lam":[2000,1000,500,250,125,62.5,31.25,15.625,7.8125],"gain":[1,0.8,0.54,0.54,0.54,0.62,0.62,0.62,0.62],"smooth_oct":3,"erode":3},"Eamp":[1.79,5.86,-1.88],"dune":{"lam_min":70,"lam_max":260,"h_min":4,"h_max":30,"asym":0.45},"lava":{"h":6,"lam":420},"gully":{"h":2.5,"lam":60},"cover":{"veg_lnP50":5.118,"veg_w":0.082,"tree_lnP50":5.749,"tree_w":0.03,"tree_plateau":0.77,"snow_w":0.137,"dry_dune_lnP":5.521},"trees":{"cell":12,"h_min":7,"h_max":22,"r_min":2.6,"r_max":5.5},"family":{"B":{"g":1000,"R":1250,"D":15000,"m":700,"p":0.85,"rmin":0.4,"wA":500,"wL":1800},"S":{"g":420,"R":450,"D":15000,"m":700,"p":0.2,"rmin":0.4,"wA":120,"wL":600},"N":{"g":100,"R":160,"D":4000,"m":300}},"pvec":["E","rk","m","Sv","Fl","kd","kx","Fc"],"pbound":[0.35,0.15,0.4,0.5,0.5,0.3,0.3,0.2],"mvec":["dT","dP","dC","dHA"],"mbound":[4,0.6,0.25,10],"tau":5.02,"novelty_window_s":1200,"K":16,"ecotone":{"median":0.108,"q25":0.034,"q75":0.32,"floor_R":0.6},"sky":{"lat":40,"decl":10,"visibility_km":[5,8],"haze_H":3000,"far":15000,"fade0":12000},"flight":{"lookahead_s":8,"climb":7.5,"dive":4,"acc":1.5},"landing_hour":{"1":17.5,"2":9},"G1":5.1387,"G1_sampled":2.893,"G2":25.41,"_v2":"look v2 (2026-10-21): climate that travels, land with form, places as regions (see PLAN-v2.md)","ridge":{"lam":1600,"w":0.45},"terrace":{"step_min":14,"step_max":34},"valley":{"lam":4200,"w":0.1,"depth_max":45},"kit":{"_":"world6: the kits' weights (maps.js w.kit); (world6 step B fix, defect 16) the basin 2400 m in 3 octaves, its warp 950 m x 240 m: places of 1-2 min at 12 m/s (fx/t_kit_runs.js: cloud runs median 64-101 s, land 102-106 s, seeds 7/1/23; were 107-155 and 144-149)","lamB":2400,"octB":3,"lamBw":950,"aBw":240,"kxB":1.1,"thC":-0.08,"thCw":0.25,"lnPmid":5.6,"wB":0.3,"ar0":0,"arW":0.4,"dryP":5.9,"dryW":0.6,"T0":12,"TW":10,"rkS":2}};
    return { H: CWROOT.CWHash, N: CWROOT.CWNoise, M: CWROOT.CWMaps, D: CWROOT.CWDirector, K: K };
  })();
  /* ---------------------------------------------------------------- the kits, and the one world (world6) */
  /* (world6, step A) There are no realms, no visits, no passages. The world is one continuous landscape over the plane:
     the maps (CW.M: heat, wetness, the land's height regime, the rock provinces, the basin channel, at the seed's own
     large scales) and the director (CW.D: anchors on the place channels, committed out of sight, aware of what has been
     seen) decide, at every position, the WEIGHTS of the two kits (wD: the sand province; wC: the sea of cloud that fills
     the low ground). The kits (realm-dunes.js, realm-above.js; they still register with WORLD.realm) give their GLSL,
     their pieces and their light; the world's own definition (worldDef) composes them by weight, with smooth functions
     only: the land is the dunes kit's (its dunes' height by wD), sunk by the cloud weight, and the cloud sea's surface
     rises out of the low ground with it; their pieces are scattered by density; the light is their lights blended by
     the cloud weight smoothed about the camera. The weights are baked on the CPU, from the maps, into a grid about the
     camera (KW: 64 m texels, toroidal, the GPU reading it through a cubic B-spline: C2), each texel once and never
     again (every anchor that reaches it is committed long before). Nothing in the drawing switches on a place. */
  var KITS = {}, REALMS = {}, ORDER = [];
  function registerRealm(def) {
    if (REC) REC.regs.push(['kit ' + (def && def.id), +clockNow().toFixed(1)]);   // (E0: each kit file's evaluation ends with its registration)
    if (!def || !def.id || KITS[def.id]) return; KITS[def.id] = def;
    if (KITS.dunes && KITS.above && !REALMS.world) { REALMS.world = worldDef(KITS.dunes, KITS.above); ORDER.push('world'); }
  }

  /* ---------------------------------------------------------------- the maps and the director */
  var MAPS = { w: null, D: null, ox: 0, oz: 0, t: 0, lastTick: -1e9, lastSee: -1e9, mc: {}, pc: {}, kw: {}, look: null };
  function mapsInit(seed) {
    var K = CW.K, w = new CW.M.World(seed >>> 0, K, null), D = new CW.D.Director(w, K, seed >>> 0);
    MAPS.w = w; MAPS.D = D; MAPS.ox = D.land0[0]; MAPS.oz = D.land0[1]; MAPS.look = new Float64Array(D.NF);
    MAPS.lastTick = -1e9; MAPS.lastSee = -1e9;
    D.tick([MAPS.ox, MAPS.oz], 0);   // (the boot's commit about the landing: everything within reach of the first view)
  }
  // the kits' weights at a point of the world (engine coordinates: the landing at the origin), straight from the maps
  function kitAt(x, z) {
    var w = MAPS.w, X = x + MAPS.ox, Z = z + MAPS.oz;
    w.macro(X, Z, MAPS.mc); w.place(X, Z, MAPS.pc, MAPS.mc);
    return w.kit(MAPS.mc, MAPS.pc, MAPS.kw);
  }
  /* the director's tick (every DIR_DT s of the flight: the anchors coming into its reach, 15 km and more ahead, nearest
     first) and its record of what has been seen (every DIR_SEE s: the look of the land within 250 m all round). It
     never steers: it touches only its own tables */
  var DIR_DT = 0.5, DIR_SEE = 5, SEERING = [[0, 0]];
  (function () { for (var r = 120; r <= 250; r += 130) for (var k = 0; k < 6; k++) { var a = (k + (r > 200 ? 0.5 : 0)) * Math.PI / 3; SEERING.push([r * Math.sin(a), r * Math.cos(a)]); } })();
  function directorStep(t) {
    var D = MAPS.D; if (!D) return;
    if (t - MAPS.lastTick >= DIR_DT) { MAPS.lastTick = t; D.tick([CS.x + MAPS.ox, CS.z + MAPS.oz], t); }
    if (t - MAPS.lastSee >= DIR_SEE) {
      MAPS.lastSee = t;
      var L = MAPS.look, lk = new Float64Array(D.NF), w = MAPS.w, i, c; L.fill(0);
      for (i = 0; i < SEERING.length; i++) { var X = CS.x + MAPS.ox + SEERING[i][0], Z = CS.z + MAPS.oz + SEERING[i][1]; w.macro(X, Z, MAPS.mc); w.place(X, Z, MAPS.pc, MAPS.mc); D.lookOf(MAPS.mc, MAPS.pc, lk); for (c = 0; c < D.NF; c++) L[c] += lk[c] / SEERING.length; }
      D.see(t, L);
    }
  }

  /* ---------------------------------------------------------------- the weights' grids (KW near, KF far) */
  /* (world6; fix round) KW: KN x KN texels of KSTEP m, world-anchored (texel i at (i + 0.5) KSTEP), stored at i mod KN
     (toroidal) about the camera. KF, the far field: FN x FN texels of FSTEP m, the same way, in the texture's rows under
     KW's. Four channels each: wD and wC (raw, from the maps) and two derived from wC by construction: the cloud sea's
     level (its raw SEA_LO + RISE wC, taken from below) and the land's sink (its raw SINK wC, taken from above), each the
     L1 Lipschitz envelope of its raw values with KLIP m per m along each axis (a min-plus, or max-minus, of the texels
     within KAR of it, worked as two passes, along x then z), so neither the sea's level nor the land's sink can rise
     faster than KLIP along an axis, KLIP x sqrt 2 = 0.354 m/m (19.5 deg) in any direction, on any seed (the cubic
     B-spline of samples so bounded keeps the bound). (The step's level, raw, rose at up to 0.66 m/m: the judges' defect
     11.) Each texel is baked once (raw: every anchor that reaches it is committed long before, the director settling all
     within 15.7 km; KF's raw only within KF_RAW of the camera) and derived once all it reads is baked. The drawn weights
     (kitW4) are KW's within KN1 of the camera, eased into KF's over KN0-KN1 and those into a constant over KF0-KF1, by
     smooth weights of the distance: no edge is clamped and none moves in steps (the judges' defect 12: beyond 8 km the
     step clamped to a window edge that moved 64 m at a time, and read an unbaked texel). The CPU reads the same grids
     through the same B-spline and the same blend (kwAt) */
  var KN = 256, KSTEP = 64, FN = 64, FSTEP = 512, KLIP = 0.25, SEA_LO = -110, SEA_HI = -20, SINK = 60, RISE = SEA_HI - SEA_LO;   // (world6 step B: the sea rises around the dunes: its level from under the dunes' troughs to over their sunk crests; the land sinks 60 m, not 170: the camera's surface stays within a few tens of metres of one height)
  var KAR = Math.ceil(RISE / (KLIP * KSTEP)), FAR_R = Math.ceil(RISE / (KLIP * FSTEP));   // (13 and 2 texels: past them no texel can win)
  var KH = KN / 2 - 2, KDH = KH - KAR - 1, KSH = KDH - 3, FH = FN / 2 - 2, FDH = FH - FAR_R - 1, FSH = FDH - 3;   // (half windows: raw 126, derived 112, sampled 109 texels; KF 30, 27, 24)
  var KN0 = 5300, KN1 = 6800, KF0 = 10300, KF1 = 11800, KF_RAW = 15000, KW_FAR = [0.5, 0.5, SEA_LO + RISE * 0.5, SINK * 0.5];
  var BADK = 0x7fffffff;
  var KW = { data: new Float32Array(KN * KN * 4), ix: new Int32Array(KN * KN).fill(BADK), dx: new Int32Array(KN * KN).fill(BADK), cx: 0, cz: 0, tex: null, dirty: [], pend: 0, baked: 0, derived: 0, ok: false, i0: 0, j0: 0, qi: 0, di: 0 };
  var KG = { v: new Float32Array(KN * KN * 2), ix: new Int32Array(KN * KN).fill(BADK) };   // (the x pass of the derived channels)
  var KF = { data: new Float32Array(FN * FN * 4), ix: new Int32Array(FN * FN).fill(BADK), dx: new Int32Array(FN * FN).fill(BADK), cx: 0, cz: 0, i0: 0, j0: 0, dirty: false, baked: 0, derived: 0, ok: false };
  var KW_FRAME = 320, KD_FRAME = 400, KF_FRAME = 48;   // (texels a slice in flight: raw, derived, far raw)
  function kmod(i, n) { return ((i % n) + n) % n; }
  function kkey(i, j) { return (i * 65536 + j) | 0; }
  function kwBakeTexel(i, j) {
    var q = kmod(j, KN) * KN + kmod(i, KN), key = kkey(i, j);
    if (KW.ix[q] === key) return false;
    var k = kitAt((i + 0.5) * KSTEP, (j + 0.5) * KSTEP);
    KW.data[q * 4] = k.wD; KW.data[q * 4 + 1] = k.wC; KW.data[q * 4 + 2] = SEA_LO; KW.data[q * 4 + 3] = SINK;
    KW.ix[q] = key; KW.dx[q] = BADK; KW.baked++;
    return true;
  }
  function kgAt(i, j) {   // the x pass at (i, j): its index, or -1 while a raw texel it reads is not baked
    var n = kmod(j, KN), q = n * KN + kmod(i, KN), key = kkey(i, j);
    if (KG.ix[q] === key) return q;
    var lv = 1e9, sk = -1e9;
    for (var a = -KAR; a <= KAR; a++) {
      var qa = n * KN + kmod(i + a, KN); if (KW.ix[qa] !== kkey(i + a, j)) return -1;
      var w = KW.data[qa * 4 + 1], d = KLIP * KSTEP * Math.abs(a);
      lv = Math.min(lv, SEA_LO + RISE * w + d); sk = Math.max(sk, SINK * w - d);
    }
    KG.v[q * 2] = lv; KG.v[q * 2 + 1] = sk; KG.ix[q] = key;
    return q;
  }
  function kwDerive(i, j) {   // 1 made, 0 made already, -1 not yet (a raw texel it reads is not baked)
    var q = kmod(j, KN) * KN + kmod(i, KN), key = kkey(i, j);
    if (KW.dx[q] === key) return 0;
    if (KW.ix[q] !== key) return -1;
    var lv = 1e9, sk = -1e9;
    for (var b = -KAR; b <= KAR; b++) {
      var g = kgAt(i, j + b); if (g < 0) return -1;
      var d = KLIP * KSTEP * Math.abs(b);
      lv = Math.min(lv, KG.v[g * 2] + d); sk = Math.max(sk, KG.v[g * 2 + 1] - d);
    }
    KW.data[q * 4 + 2] = lv; KW.data[q * 4 + 3] = sk; KW.dx[q] = key; KW.derived++;
    return 1;
  }
  /* the windows follow the camera: KW's centre the camera's texel; every texel within KH baked (a slice's share in
     flight, the nearest rows first), every texel within KDH derived; the texture's rows written as they change */
  var KWQ = [], KDQ = [];
  function kwFollow(x, z, sync) {
    var ci = Math.floor(x / KSTEP), cj = Math.floor(z / KSTEP), h = KH, j;
    if (!KW.ok || ci !== KW.i0 || cj !== KW.j0 || sync) {
      KW.i0 = ci; KW.j0 = cj; KWQ.length = 0; KDQ.length = 0;
      for (j = cj - h; j < cj + h; j++) KWQ.push(j);
      for (j = cj - KDH; j <= cj + KDH; j++) KDQ.push(j);
      var near = function (a, b) { return Math.abs(a - cj) - Math.abs(b - cj); };
      KWQ.sort(near); KDQ.sort(near);
      KW.qi = 0; KW.di = 0;
    }
    var budget = sync ? 1e9 : KW_FRAME;
    while (KW.qi < KWQ.length && budget > 0) {
      var jj = KWQ[KW.qi], any = false;
      for (var ii = KW.i0 - h; ii < KW.i0 + h; ii++) if (kwBakeTexel(ii, jj)) { any = true; budget--; }
      if (any) KW.dirty.push(kmod(jj, KN));
      if (budget > 0 || !any) KW.qi++;
      else break;
    }
    var db = sync ? 1e9 : KD_FRAME;
    while (KW.di < KDQ.length && db > 0) {
      var jd = KDQ[KW.di], made = false, wait = false;
      for (var id = KW.i0 - KDH; id <= KW.i0 + KDH; id++) { var r = kwDerive(id, jd); if (r > 0) { made = true; db--; } else if (r < 0) { wait = true; break; } }
      if (made) KW.dirty.push(kmod(jd, KN));
      if (wait) break;   // (its raw rows not yet baked: again next slice)
      if (db > 0 || !made) KW.di++;
      else break;
    }
    if (!KW.ok && KW.qi >= KWQ.length && KW.di >= KDQ.length) KW.ok = true;
    KW.cx = (KW.i0 + 0.5) * KSTEP; KW.cz = (KW.j0 + 0.5) * KSTEP;
    kfFollow(x, z, sync);
  }
  /* the far field (KF): raw texels within FH and KF_RAW of the camera (the director's settled reach), derived within FDH
     once their neighbours are */
  function kfFollow(x, z, sync) {
    var ci = Math.floor(x / FSTEP), cj = Math.floor(z / FSTEP), i, j, budget = sync ? 1e9 : KF_FRAME;
    KF.i0 = ci; KF.j0 = cj;
    for (var r = 0; r <= FH && budget > 0; r++) for (j = cj - r; j <= cj + r && budget > 0; j++) for (i = ci - r; i <= ci + r; i++) {   // (rings, the nearest first)
      if (Math.max(Math.abs(i - ci), Math.abs(j - cj)) !== r) continue;
      var q = kmod(j, FN) * FN + kmod(i, FN), key = kkey(i, j);
      if (KF.ix[q] === key) continue;
      var tx = (i + 0.5) * FSTEP, tz = (j + 0.5) * FSTEP;
      if ((tx - x) * (tx - x) + (tz - z) * (tz - z) > KF_RAW * KF_RAW) continue;
      var k = kitAt(tx, tz);
      KF.data[q * 4] = k.wD; KF.data[q * 4 + 1] = k.wC; KF.data[q * 4 + 2] = SEA_LO; KF.data[q * 4 + 3] = SINK;
      KF.ix[q] = key; KF.dx[q] = BADK; KF.baked++; KF.dirty = true;
      if (--budget <= 0) break;
    }
    for (j = cj - FDH; j <= cj + FDH; j++) for (i = ci - FDH; i <= ci + FDH; i++) {
      var q2 = kmod(j, FN) * FN + kmod(i, FN), key2 = kkey(i, j);
      if (KF.dx[q2] === key2 || KF.ix[q2] !== key2) continue;
      var lv = 1e9, sk = -1e9, ok = true;
      for (var b = -FAR_R; b <= FAR_R && ok; b++) for (var a = -FAR_R; a <= FAR_R; a++) {
        var qa = kmod(j + b, FN) * FN + kmod(i + a, FN);
        if (KF.ix[qa] !== kkey(i + a, j + b)) { ok = false; break; }
        var w = KF.data[qa * 4 + 1], d = KLIP * FSTEP * (Math.abs(a) + Math.abs(b));
        lv = Math.min(lv, SEA_LO + RISE * w + d); sk = Math.max(sk, SINK * w - d);
      }
      if (!ok) continue;
      KF.data[q2 * 4 + 2] = lv; KF.data[q2 * 4 + 3] = sk; KF.dx[q2] = key2; KF.derived++; KF.dirty = true;
    }
    KF.ok = true;
    KF.cx = (KF.i0 + 0.5) * FSTEP; KF.cz = (KF.j0 + 0.5) * FSTEP;
  }
  var KFROWS = FN * FN / KN;   // (KF's texels in the texture's rows under KW's: 16 rows of 256)
  function kwUpload() {   // GPU: the texture made at the start; the rows baked since, written (unit 1, kept bound)
    if (!KW.tex) {
      KW.tex = gl.createTexture(); gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, KW.tex);
      gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGBA32F, KN, KN + KFROWS);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, KN, KN, gl.RGBA, gl.FLOAT, KW.data); KW.dirty.length = 0;
      gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, KN, KN, KFROWS, gl.RGBA, gl.FLOAT, KF.data); KF.dirty = false;
      gl.activeTexture(gl.TEXTURE0); return;
    }
    if (!KW.dirty.length && !KF.dirty) return;
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, KW.tex);
    var seen = {};
    for (var k = 0; k < KW.dirty.length; k++) { var r = KW.dirty[k]; if (seen[r]) continue; seen[r] = 1; gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, r, KN, 1, gl.RGBA, gl.FLOAT, KW.data, r * KN * 4); }
    if (KF.dirty) { gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, KN, KN, KFROWS, gl.RGBA, gl.FLOAT, KF.data); KF.dirty = false; }
    KW.dirty.length = 0; gl.activeTexture(gl.TEXTURE0);
  }
  function kwForget() { KW.tex = null; KW.dirty.length = 0; }   // (a lost context: the texture made again, whole, from the CPU's grids)
  /* the cubic B-spline (C2) over a grid, as the GLSL's: channel values and gradients; then the blend (kitW4's) */
  function bsw(f, o) { var f2 = f * f, f3 = f2 * f; o[0] = (1 - 3 * f + 3 * f2 - f3) / 6; o[1] = (4 - 6 * f2 + 3 * f3) / 6; o[2] = (1 + 3 * f + 3 * f2 - 3 * f3) / 6; o[3] = f3 / 6; }
  function bsd(f, o) { var f2 = f * f; o[0] = (-3 + 6 * f - 3 * f2) / 6; o[1] = (-12 * f + 9 * f2) / 6; o[2] = (3 + 6 * f - 9 * f2) / 6; o[3] = 3 * f2 / 6; }
  var BWX = [0, 0, 0, 0], BWZ = [0, 0, 0, 0], BDX = [0, 0, 0, 0], BDZ = [0, 0, 0, 0], KWO = new Float64Array(12), KBN = new Float64Array(12), KBF = new Float64Array(12);
  function bsGrid(far, x, z, out) {   // out: channel c's value, d/dx, d/dz at 3c .. 3c + 2
    var D = far ? KF.data : KW.data, N = far ? FN : KN, st = far ? FSTEP : KSTEP, cx = far ? KF.cx : KW.cx, cz = far ? KF.cz : KW.cz, hw = (far ? FSH : KSH) * st;
    var qx = clamp(x, cx - hw, cx + hw), qz = clamp(z, cz - hw, cz + hw);
    var tx = qx / st - 0.5, tz = qz / st - 0.5, ix = Math.floor(tx), iz = Math.floor(tz), fx = tx - ix, fz = tz - iz;
    bsw(fx, BWX); bsw(fz, BWZ); bsd(fx, BDX); bsd(fz, BDZ);
    out.fill(0);
    for (var b = 0; b < 4; b++) for (var a = 0; a < 4; a++) {
      var q = (kmod(iz - 1 + b, N) * N + kmod(ix - 1 + a, N)) * 4, w0 = BWX[a] * BWZ[b], wx = BDX[a] * BWZ[b] / st, wz = BWX[a] * BDZ[b] / st;
      for (var c = 0; c < 4; c++) { var v = D[q + c]; out[c * 3] += w0 * v; out[c * 3 + 1] += wx * v; out[c * 3 + 2] += wz * v; }
    }
    return out;
  }
  function sstepD(a, b, x) { var t = (x - a) / (b - a); return t <= 0 || t >= 1 ? 0 : 6 * t * (1 - t) / (b - a); }
  /* the weights at (x, z) (KWO: wD, d/dx, d/dz; wC ...; the sea's level ...; the land's sink ...): KW near the camera,
     eased into KF and that into KW_FAR by the distance from the camera (the flight's: CS, as the GPU's is the drawn
     camera's, the same within a step) */
  function kwAt(x, z) {
    var ex = x - CS.x, ez = z - CS.z, dc = Math.sqrt(ex * ex + ez * ez), ux = dc > 1e-3 ? ex / dc : 0, uz = dc > 1e-3 ? ez / dc : 0;
    var kn = 1 - smooth(KN0, KN1, dc), kf = 1 - smooth(KF0, KF1, dc), dkn = -sstepD(KN0, KN1, dc), dkf = -sstepD(KF0, KF1, dc), c;
    if (kn >= 1) return bsGrid(false, x, z, KWO);
    for (c = 0; c < 4; c++) { KBF[c * 3] = KW_FAR[c]; KBF[c * 3 + 1] = 0; KBF[c * 3 + 2] = 0; }
    if (kf > 0) bsGrid(true, x, z, KBF);
    if (kn > 0) bsGrid(false, x, z, KBN);
    for (c = 0; c < 4; c++) {
      var vF = KBF[c * 3], vN = kn > 0 ? KBN[c * 3] : vF, vM = vF + (vN - vF) * kn;
      var gxM = KBF[c * 3 + 1] + ((kn > 0 ? KBN[c * 3 + 1] : KBF[c * 3 + 1]) - KBF[c * 3 + 1]) * kn + (vN - vF) * dkn * ux;
      var gzM = KBF[c * 3 + 2] + ((kn > 0 ? KBN[c * 3 + 2] : KBF[c * 3 + 2]) - KBF[c * 3 + 2]) * kn + (vN - vF) * dkn * uz;
      KWO[c * 3] = KW_FAR[c] + (vM - KW_FAR[c]) * kf; KWO[c * 3 + 1] = gxM * kf + (vM - KW_FAR[c]) * dkf * ux; KWO[c * 3 + 2] = gzM * kf + (vM - KW_FAR[c]) * dkf * uz;
    }
    return KWO;
  }
  /* the cloud sea's level and the land's sink, as the GLSL's (kitW4's derived channels) */
  function seaBaseAt(x, z) { return kwAt(x, z)[6]; }
  /* the climate the light reads: the cloud weight averaged over a disc of LIGHT_R about the camera (a pure function of
     where the camera is: no clock, no easing in time) */
  var LIGHT_R = [0, 350, 700], LIGHT_WT = [4, 1, 0.5];
  function lightWeight(x, z) {
    var s = 0, sw = 0;
    for (var r = 0; r < LIGHT_R.length; r++) {
      var n = r ? 8 : 1;
      for (var k = 0; k < n; k++) { var a = (k + 0.5 * r) / n * 2 * PI; s += kwAt(x + Math.sin(a) * LIGHT_R[r], z + Math.cos(a) * LIGHT_R[r])[3] * LIGHT_WT[r]; sw += LIGHT_WT[r]; }
    }
    return s / sw;
  }

  /* ---------------------------------------------------------------- the world itself (one V for the page's life) */
  var J = { seed: SEED0, V: null, visits: [], base: 0 };
  function theWorld() {
    if (J.V) return J.V;
    var def = REALMS.world; if (!def || def.bad) return null;
    var r = RNG(subseed(J.seed, 1000));
    J.V = { k: 0, id: 'world', def: def, seed: r.seed(), D: Infinity, t0: 0, u0: 0, t1: Infinity, st: 0, cells: null, failed: false };
    J.visits = [J.V];
    return J.V;
  }
  var JA = { V: null, u: 0 };
  function worldAt(t) { JA.V = theWorld(); JA.u = t; return JA; }
  function worldReset(seed) { if (J.V) freeVisit(J.V); J.V = null; J.visits = []; J.seed = seed; MAPS.w = null; KW.ok = false; KW.ix.fill(BADK); KW.dx.fill(BADK); KG.ix.fill(BADK); KF.ok = false; KF.ix.fill(BADK); KF.dx.fill(BADK); }

  /* ---------------------------------------------------------------- the world's definition: the two kits, by weight */
  var WORLD_GLSL_HEAD = `
uniform highp sampler2D uKW; uniform vec4 uKWc, uKFc;   // the weights' grids: KW (its window's centre x, z; texel m; texels across) and the far field KF (the same; in the rows under KW's)
vec3 gKD = vec3(1.0, 0.0, 0.0);   // the sand weight (value, d/dx, d/dz) while the dunes kit's land is raised (set by Hd)
#define HAS_GTX
float gTX = 1e4; vec3 gLV = vec3(0.0), gWC = vec3(0.0);   // (world6 fix) the land's height over the cloud sea's top (from its vertices), and Hd's last level and cloud weight
vec4 kwT(ivec2 i) { uint m = uint(uKWc.w) - 1u; return texelFetch(uKW, ivec2(uvec2(i) & uvec2(m)), 0); }
vec4 kfT(ivec2 i) { uint m = uint(uKFc.w) - 1u, W = uint(uKWc.w); uvec2 u = uvec2(i) & uvec2(m); uint L = u.y * uint(uKFc.w) + u.x; return texelFetch(uKW, ivec2(int(L % W), int(W + L / W)), 0); }
void bsW(float f, out vec4 w, out vec4 d) {
  float f2 = f * f, f3 = f2 * f;
  w = vec4(1.0 - 3.0 * f + 3.0 * f2 - f3, 4.0 - 6.0 * f2 + 3.0 * f3, 1.0 + 3.0 * f + 3.0 * f2 - 3.0 * f3, f3) / 6.0;
  d = vec4(-3.0 + 6.0 * f - 3.0 * f2, -12.0 * f + 9.0 * f2, 3.0 + 6.0 * f - 9.0 * f2, 3.0 * f2) / 6.0;
}
/* a grid's four channels at p (cubic B-spline: C2), with their gradients (per m) */
void bsGrid(bool isF, vec2 p, out vec4 v, out vec4 gx, out vec4 gz) {
  vec4 c = isF ? uKFc : uKWc; float hw = (isF ? ${FSH}.0 : ${KSH}.0) * c.z;
  vec2 q = clamp(p, c.xy - hw, c.xy + hw), t = q / c.z - 0.5, f = fract(t); ivec2 i0 = ivec2(floor(t)) - 1;
  vec4 wx, dx, wz, dz; bsW(f.x, wx, dx); bsW(f.y, wz, dz);
  v = vec4(0.0); gx = vec4(0.0); gz = vec4(0.0);
  for (int b = 0; b < 4; b++) for (int a = 0; a < 4; a++) {
    vec4 s = isF ? kfT(i0 + ivec2(a, b)) : kwT(i0 + ivec2(a, b));
    v += wx[a] * wz[b] * s; gx += dx[a] * wz[b] * s; gz += wx[a] * dz[b] * s;
  }
  gx /= c.z; gz /= c.z;
}
float sstepD(float a, float b, float x) { float t = (x - a) / (b - a); return (t <= 0.0 || t >= 1.0) ? 0.0 : 6.0 * t * (1.0 - t) / (b - a); }
/* the kits' weights at p, each (value, d/dx, d/dz): wD the sand province's, wC the cloud sea's, lv the cloud sea's
   level and sk the land's sink (both bounded in slope by construction: world.js's grids). KW near the camera, eased
   into the far field (KF) and that into a constant by smooth weights of the distance: as world.js's kwAt */
const vec4 KW_FAR = vec4(${KW_FAR[0]}, ${KW_FAR[1]}, ${KW_FAR[2]}.0, ${KW_FAR[3]}.0);
void kitW4(vec2 p, out vec3 wD, out vec3 wC, out vec3 lv, out vec3 sk) {
  vec2 e = p - uCam.xz; float dc = length(e); vec2 u = dc > 1e-3 ? e / dc : vec2(0.0);
  float kn = 1.0 - smoothstep(${KN0}.0, ${KN1}.0, dc), kf = 1.0 - smoothstep(${KF0}.0, ${KF1}.0, dc), dkn = -sstepD(${KN0}.0, ${KN1}.0, dc), dkf = -sstepD(${KF0}.0, ${KF1}.0, dc);
  vec4 v, gx, gz;
  if (kn >= 1.0) bsGrid(false, p, v, gx, gz);
  else {
    vec4 vF = KW_FAR, xF = vec4(0.0), zF = vec4(0.0), vN, xN, zN;
    if (kf > 0.0) bsGrid(true, p, vF, xF, zF);
    vN = vF; xN = xF; zN = zF;
    if (kn > 0.0) bsGrid(false, p, vN, xN, zN);
    vec4 vM = mix(vF, vN, kn), xM = mix(xF, xN, kn) + (vN - vF) * dkn * u.x, zM = mix(zF, zN, kn) + (vN - vF) * dkn * u.y;
    v = mix(KW_FAR, vM, kf); gx = xM * kf + (vM - KW_FAR) * dkf * u.x; gz = zM * kf + (vM - KW_FAR) * dkf * u.y;
  }
  wD = vec3(v.x, gx.x, gz.x); wC = vec3(v.y, gx.y, gz.y); lv = vec3(v.z, gx.z, gz.z); sk = vec3(v.w, gx.w, gz.w);
}
void kitW(vec2 p, out vec3 wD, out vec3 wC) { vec3 a, b; kitW4(p, wD, wC, a, b); }
`;
  var WORLD_GLSL = `
/* ---- the world (world6): the two kits composed by weight; smooth functions only, nothing switches on a place */
/* the land: the dunes kit's, its dunes as high as the sand weight says, sunk as the cloud weight rises (the sink
   bounded in slope by construction: the grids' derived channel) */
/* (world6 fix, the judges' defect 5) where the land comes down within RIM_HI m of the cloud sea's level it falls away
   under a rim, RIM_DROP m by RIM_LO (so under the sea's lowest troughs), as the old bays' land fell 70 m under theirs:
   the sea is seen below the rim, its edge a cliff's, never a waterline on the sand (a smooth function of the land and
   the level: C1) */
/* (world6 step B) the rim is gone: the sea no longer lies in a basin under the land but rises around the dunes, filling
   their troughs first, so the coast is cloud lapping the sand (softened by the fringe below), never a cliff */
vec3 Hd(vec2 p) {
  vec3 wD, wC, lv, sk; kitW4(p, wD, wC, lv, sk);
  gKD = wD; gLV = lv; gWC = wC;
  vec3 h = D_Hd(p) - sk;
  gKD = vec3(1.0, 0.0, 0.0);
  return h;
}
/* the cloud sea's top: its level (rising with the cloud weight out of the low ground, far under the land where the
   weight is nought; bounded in slope by construction), the ABOVE kit's heaps and billows growing on it */
vec3 HdSea(vec2 p) {
  vec3 wD, wC, lv, sk; kitW4(p, wD, wC, lv, sk);
  vec3 amp = vec3(0.4, 0.0, 0.0) + 0.6 * wC;
  return lv + dMul(A_Hd(p), amp);
}
/* (world6 fix, the judges' defect 5) the coast: the land's height over the cloud sea's top at its vertices (after Hd),
   and the land within COAST_H of it taking the sea's own colour, the more the nearer, so where sand meets cloud the
   shore is a soft fringe of the cloud's mist on the land, never a waterline (the step met them at a hard edge 0-1 px
   wide: a desert lake) */
const float COAST_H = 14.0;   // (world6 step B: 40 -> 14 m: the sea now lies near the land, and a 40 m fringe painted whole sandy flats the cloud's colour)
float HdGap(vec2 p, float h) { if (h - gLV.x > 140.0) return 1e4; return h - (gLV.x + A_Hd(p).x * (0.4 + 0.6 * gWC.x)); }
vec3 shadeSea(vec3 p, vec3 n, vec3 rd, float t, float fp);
vec3 shadeLand(vec3 p, vec3 n, vec3 rd, float t, float fp) {
  vec3 c = shadeSand(p, n, rd, t, fp);
  if (gTX < COAST_H) { float k = 1.0 - smoothstep(0.0, COAST_H, gTX); c = mix(c, shadeSea(vec3(p.x, p.y - max(gTX, 0.0), p.z), vec3(0.0, 1.0, 0.0), rd, t, fp), k * k); }
  return c;
}
/* the camera's ground: the land or the cloud's top, whichever is higher */
float HdCam(vec2 p) { return max(Hd(p).x, HdSea(p).x); }
vec3 shadeSea(vec3 p, vec3 n, vec3 rd, float t, float fp) {
  vec3 wD, wC, lv, sk; kitW4(p.xz, wD, wC, lv, sk);
  return A_shadeSea(vec3(p.x, p.y - lv.x, p.z), n, rd, t, fp);
}
/* a piece's own material code (per vertex: its generator's): 4-6 the ABOVE kit's grass, stone and rock, else the
   dunes kit's */
vec3 shadeStone(vec3 p, vec3 n, vec3 rd, float t, float fp, vec4 col, float yAbove) {
  float m = col.a;
  if (m > 3.5) return A_shadeStone(p, n, rd, t, fp, vec4(col.rgb, m > 5.5 ? 2.0 : (m > 4.5 ? 1.0 : 4.0)), yAbove);
  return D_shadeStone(p, n, rd, t, fp, col, yAbove);
}
/* the dunes kit's scatter, thinned as the cloud sea rises */
float scatterDensity(vec2 p, int layer) { vec3 wD, wC; kitW(p, wD, wC); return D_scatterDensity(p, layer) * (1.0 - smoothstep(0.4, 0.8, wC.x)); }
`;
  /* the pieces' density by the weights: a piece is kept where its own hash falls under its kit's density there (the
     dunes kit's thin out as the cloud sea closes over the land; the ABOVE kit's come in as it rises) */
  /* (world6 step B fix, defect 14) read from the raw maps (kitAt), never through the camera-blended grids: what a cell
     keeps is a function of the place alone, whatever the path to it */
  function densD(x, z) { return 1 - smooth(0.6, 0.95, kitAt(x, z).wC); }
  function densA(x, z) { return smooth(0.6, 0.9, kitAt(x, z).wC); }   // (world6 fix: the cloud sea's pieces only where it is well up; then gated on the land under them, aboveKeep)
  /* (world6 fix, the judges' defect 4) the ABOVE kit's pieces stand only where the sea is up and seen about them: the
     land under their footprint (probed: landQ) at least 0-40 m under the sea's level there, times the density above;
     kept where the piece's own hash falls under that (the same hash as at its placing), so nothing of the cloud sea
     stands on, or floats over, sand */
  var GATE = { kept: 0, dropped: 0 };
  /* (world6 step B fix, defect 7) the flight band's top at a place, path-free, from the raw maps: the cloud sea's raw
     level (SEA_LO + RISE wC: the drawn level is its envelope from below, never higher) with the heaps' most (HEAP_MAX)
     or the land under the piece (its probed most), whichever is higher, plus the most the camera can stand over its
     surface (FLY_TOP: the ceiling clear[2] and the hard ceiling's 10 m over it) and the mist's reach (BAND_M: the mist
     about the eye begins with a lobe 80 m off). No cloud body's lobe and no floating stone is ever kept under it, so
     on any line the visitor turns to the eye never meets one */
  var HEAP_MAX = 55, FLY_TOP = 55, BAND_M = 90, FORM_ALLOW = 130, BAND = { lifted: 0, liftM: 0, isles: 0 };
  /* (fix) where the dunes kit's formations can stand (within 700 m: their cones reach that far), the eye can stand over
     their envelope too: FORM_ALLOW (the tallest formation's solid, 123 m, and its margin) by the dunes' density there */
  var BQ = [[0, 0], [700, 0], [-700, 0], [0, 700], [0, -700]];
  function bandTopAt(x, z, land) {
    var wc = kitAt(x, z).wC, fd = 0;
    for (var i = 0; i < BQ.length; i++) fd = Math.max(fd, densD(x + BQ[i][0], z + BQ[i][1]));
    return Math.max(SEA_LO + RISE * wc + HEAP_MAX * (0.4 + 0.6 * wc), (land === undefined || land !== land ? -1e9 : land) + FORM_ALLOW * fd) + FLY_TOP + BAND_M;
  }
  function aboveKeep(o) {
    var wc = kitAt(o.x, o.z).wC, d = smooth(-10, 25, SEA_LO + RISE * wc + 18 * (0.4 + 0.6 * wc) - o.landMax) * densA(o.x, o.z), k = pickOf(o, 0x5bd1e995) < d;   // (fix, defect 14: the raw level, which bounds the drawn one from above)   // (world6 step B: against the sea's mean top, which now lies near the land's height)
    if (k) GATE.kept++; else GATE.dropped++;
    return k;
  }
  /* (world6 fix, the judges' defect 1) the director's corridor: what it settles ahead keeps every cloud body's visible
     body (its lobes, their billows) CORR_W m clear of the held line ahead, and the floating isles' rock CORR_WS m, where
     they would stand within the heights the flight keeps there (camBandAt: the camera's ground from the maps, its
     clearance from the cloud weight, CORR_V m either way). Judged when a cell's pieces are resolved (3.8-5.2 km out,
     never in view), from the camera's line then; a turn later is met by the slip and the mist's fade, never a pop.
     It composes, never steers: the heading is untouched */
  var CORR_W = 100, CORR_WS = 60, CORR_BACK = 150, CORR_V = 60, CORR = { bodies: 0, items: 0, forms: 0 }, CQ = new Float64Array(4), CB = new Float64Array(2);
  function corridorNow() {
    if (SIM.V) { CQ[0] = CS.x; CQ[1] = CS.z; CQ[2] = Math.sin(CS.psi); CQ[3] = Math.cos(CS.psi); return CQ; }
    var dp = DEVMODE && POSE, h = dp ? POSE[2] * DEG : heading0();
    CQ[0] = dp ? POSE[0] : 0; CQ[1] = dp ? POSE[1] : 0; CQ[2] = Math.sin(h); CQ[3] = Math.cos(h); return CQ;
  }
  function camBandAt(x, z, ground) {
    var wc = kwAt(x, z)[3], g = Math.max(seaBaseAt(x, z) + 40 * (0.4 + 0.6 * wc), ground === undefined ? -1e9 : ground);
    CB[0] = g + 7 - CORR_V; CB[1] = g + 32 + 40 + CORR_V; return CB;   // (world6 step B: the one clearance band, 14-32 m, and the spring's overshoot)
  }
  function inCorridor(Q, x, y, z, R, w, ground) {
    var dx = x - Q[0], dz = z - Q[1], s = dx * Q[2] + dz * Q[3], l = -dx * Q[3] + dz * Q[2];
    if (s < -R - CORR_BACK || Math.abs(l) >= R + w) return false;
    var b = camBandAt(x, z, ground);
    return y + R > b[0] && y - R < b[1];
  }
  function corridorBody(Q, PF, i0, i1, ground) {   // a cloud body's lobes (x, y, z, R; 12 floats each), billows 0.3 R
    for (var i = i0; i < i1; i++) { var a = PF.a, R = a[i * 12 + 3] * 1.3; if (inCorridor(Q, a[i * 12], a[i * 12 + 1], a[i * 12 + 2], R, CORR_W, ground)) return true; }
    return false;
  }
  var KWP = [0, 0];
  function corridorForm(Q, it) {   // a great formation's solid (and its talus foot), in plan: CORR_WS m clear of the held line
    var R = Math.max(it.solid ? it.solid[0] : 0, it.foot2 ? it.foot2[0] : 0), dx = it.x - Q[0], dz = it.z - Q[1], s = dx * Q[2] + dz * Q[3], l = -dx * Q[3] + dz * Q[2];
    return s > -R - CORR_BACK && Math.abs(l) < R + CORR_WS;
  }
  function corridorItem(Q, it) {   // a floating piece's spheres (dx, dy, dz, r over its place and seat)
    var S = it.spheres; if (!S) return false;
    for (var i = 0; i < S.length; i += 4) if (inCorridor(Q, it.x + S[i], it.y + S[i + 1], it.z + S[i + 2], S[i + 3], CORR_WS, it.landMax)) return true;
    return false;
  }
  function pickOf(o, salt) { return hfl(ihash(((Math.round(o.x * 8) * 0x9e3779b1) ^ (Math.round(o.z * 8) * 0x85ebca6b) ^ salt) >>> 0)); }
  function kitApi(C, kit, dens, lift) {
    var A = {}, k;
    for (k in C) A[k] = C[k];
    function keep(o) { return pickOf(o, kit === 'above' ? 0x5bd1e995 : 0x27d4eb2d) < dens(o.x, o.z); }
    function seat(o) { if (lift && o.y !== undefined) o.y += seaBaseAt(o.x, o.z); }   // (the ABOVE kit's heights are over its sea)
    A.add = function (it) { it.kit = kit; if (!keep(it)) { it._drop = true; return it; } seat(it); if (lift) it.landQ = it.r || 50; return C.add(it); };
    A.cloud = function (cl) { cl.kit = kit; if (!keep(cl)) { cl._drop = true; return cl; } seat(cl); if (lift) cl.landQ = (cl.w || cl.thick || 300) * 0.5; return C.cloud(cl); };   // (world6 fix: the land under its footprint probed: aboveKeep)
    A.flock = function (f) { if ((f.ref && f.ref._drop) || !keep(f)) return f; seat(f); return C.flock(f); };
    A.poi = function (p) { if ((p.ref && p.ref._drop) || !keep(p)) return p; seat(p); return C.poi(p); };
    A.place = function (set, x, z, o) { var q = o || {}; q.x = x; q.z = z; if (!keep(q)) return q; return C.place(set, x, z, q); };
    A.weights = function (x, z) { var k = kwAt(x, z); KWP[0] = k[0]; KWP[1] = k[3]; return KWP; };   // (world6 fix: the kits read the maps' weights: wD, wC)
    return A;
  }
  function worldDef(KD, KA) {
    return {
      id: 'world', words: 'dark', still: KD.still, hours: KD.hours,
      /* (world6 step B, the one camera) one framing everywhere (the horizon at 0.55 of a wide window's height and 0.58 of
         an upright phone's: about 6% of the height under the credit, design-v5 11.7), no look at the ground ahead
         (pitchFollow 0: one pitch), one clearance band over the surface flown (cruise: 14 m over the sand to 32 m over
         the cloud sea, by the maps ahead; flightParams), a ceiling of 60 m over the ground (a solid taller is passed
         beside, never climbed), one speed (12 m/s: the maps' pacing was worked out for it) */
      speed: KD.speed || 12, clear: [7, 14, 45], frame: [0.55, 0.58], cruise: [14, 32], marginB: KA.margin,
       look: KD.look, climb: KD.climb, pitchFollow: 0, margin: KD.margin, lookT: KD.lookT, lookTan: KD.lookTan,
      glsl: WORLD_GLSL_HEAD + (KD.glsl || '') + (KA.glsl || '') + WORLD_GLSL,
      surfaces: [{ height: 'Hd', shade: 'shadeLand', gap: 'HdGap', g0: 0.35, levels: 10 }, { height: 'HdSea', shade: 'shadeSea', g0: 2, levels: 10 }],
      camGround: 'HdCam', landmarkShade: 'shadeStone',
      layout: { scales: [KD.layout.scales[0], KD.layout.scales[1], KA.layout.scales[0]], volRes: 44 },
      field: function (R, V) {
        var fd = KD.field(R, V), fa = KA.field(RNG(subseed(V.seed, 23)), V), P = fd.params.slice(0, 12);
        while (P.length < 12) P.push([0, 0, 0, 0]);
        return { params: P.concat(fa.params) };
      },
      light: function (R, V) { return KD.light(R, V); },
      lightB: function (R, V) { return KA.light(R, V); },
      cell: function (C, R, K2) {
        if (C.scale < 2) KD.cell(kitApi(C, 'dunes', densD, false), R, K2);
        else KA.cell(kitApi(C, 'above', densA, true), R, K2);
      },
      build: function (it, B, R, K2) { return (it.kit === 'above' ? KA : KD).build(it, B, R, K2); },
      cloud: function (cl, PF, R, K2) { return (cl.kit === 'above' ? KA : KD).cloud(cl, PF, R, K2); },
      scatter: KD.scatter, particles: KD.particles, ribbons: KD.ribbons, sandFx: true,   // (world6 fix: the sand's particles drawn as the sand weight at the camera says: sandAt)
      // (world6 fix, the judges' defect 14) no events: nothing is spawned on a clock; the creatures are the cells' own,
      // world-anchored and scattered by density, coming in out of the haze (drawCreatures' distance fade)
      event: null
    };
  }
  /* the world's lights: the dunes kit's and the ABOVE kit's (one sun: the first's), blended by the cloud weight about
     the camera (climateLight), colours in OKLab, as round 3b's light by area did */
  function worldLights(V) {
    var raw = V.lightRaw, rawB = V.def.lightB(RNG(subseed(V.seed, 21)), V);
    var LB = prepOne(Object.assign({}, rawB)); LB.sunDir = V.light.sunDir;
    V.LA = [V.light, LB]; V.areaNames = ['dunes', 'cloud sea'];
    var live = prepOne(Object.assign({}, raw)); live.sunDir = V.light.sunDir; V.L = live;
    V.LAlab = V.LA.map(function (A) { var o = {}; LKC.forEach(function (k) { o[k] = lin2lab(A[k]); }); o.skyFlat = new Float32Array(18); for (var i = 0; i < 6; i++) { var c = lin2lab([A.skyFlat[i * 3], A.skyFlat[i * 3 + 1], A.skyFlat[i * 3 + 2]]); o.skyFlat[i * 3] = c[0]; o.skyFlat[i * 3 + 1] = c[1]; o.skyFlat[i * 3 + 2] = c[2]; } o.fogB = lin2lab([A.fogBf[0], A.fogBf[1], A.fogBf[2]]); return o; });
    V.aw = new Float32Array(2); V.awT = new Float32Array(2); V.awB = new Float32Array([-1, -1]); V.aw[0] = 1;
    V.lightRawB = rawB; V.paramsBase = new Float32Array(V.paramsFlat);   // (tod: the skies are laid over the kits' raw lights and the kits' own paint)
  }
  function climateLight(V) {
    if (!V.LA || !KW.ok) return;
    var w = lightWeight(CS.x, CS.z);
    V.aw[0] = 1 - w; V.aw[1] = w; V.lw = w;
    skyStep(V, w);   // (tod: the two kits by place and the two skies on show by time, w04b_sky.js)
  }

  /* ---------------------------------------------------------------- a realm's programs (kept for the page's life) */
  /* each realm's programs are compiled once, when it is first needed, and kept: a realm met again links nothing */
  /* the realm's GLSL hooks, found by name: its own sky (vec3 skyHook(vec3 rd, vec3 c)), its emission's flicker
     (float emitMod(vec3 p, vec4 col, float e, float phase)), water (it calls waterShade: the composite then reflects
     the nearby forms into it) */
  function realmHooks(def) {
    var g = def.glsl || '', h = '';
    if (/\bskyHook\s*\(/.test(g)) h += '#define SKY_HOOK\n';
    if (/\bemitMod\s*\(/.test(g)) h += '#define EMIT_HOOK\n';
    def.water = /\bwaterShade\s*\(/.test(g);
    return h;
  }
  function realmProgs(def) {
    if (def.P) return def.P;
    var hk = realmHooks(def);
    var pre = HEAD + hk + FRAME_U + LIB + (def.glsl || '') + '\n', preG = HEAD + hk + FRAME_U + LIB + GROUND_LIB + (def.glsl || '') + '\n', i;
    var surfs = def.surfaces, P = { list: [], k: 0, st: 1, surf: [] };
    function C(vs, fs, name) { var p = compile(vs, fs, def.id + '.' + name); P.list.push(p); return p; }
    for (i = 0; i < surfs.length; i++) P.surf.push({ P: C(pre + VS_TERRAIN(surfs[i].height, surfs[i].gap), pre + FS_TERRAIN(surfs[i].height, surfs[i].shade), 'surface' + i), g0: surfs[i].g0 || 0.5, levels: surfs[i].levels || 10 });
    P.lm = C(pre + VS_LANDMARK, pre + FS_LANDMARK(def.landmarkShade || 'shadeStone'), 'landmark');
    P.pr = C(VS_FULL, pre + FS_PROBE(surfs[0].height, def.camGround || null), 'probe');
    P.sc = def.scatter && def.scatter.length ? C(preG + VS_SCATTER, pre + FS_LANDMARK(def.scatterShade || def.landmarkShade || 'shadeStone'), 'scatter') : null;
    P.pt = def.particles ? C(preG + VS_PARTICLE, pre + FS_PARTICLE, 'particle') : null;
    P.rb = def.ribbons ? C(preG + VS_RIBBON, preG + FS_RIBBON, 'ribbon') : null;
    P.sky = /SKY_HOOK/.test(hk) ? C(VS_FAR, pre + SKY_BODY, 'sky') : null;
    P.lmi = def.sets ? C(pre + VS_LANDMARK_INST, pre + FS_LANDMARK(def.landmarkShade || 'shadeStone'), 'landmarkInst') : null;
    def.P = P;
    return P;
  }
  /* (E1) a realm's programs are registered at the boot's stage C with every other program, and made with them (compile
     all, link all, flush, status last: progStep); here only their status is read: 2 once every one is linked, -1 if
     one is broken (the realm is then set aside, its visits planned again), 1 while the boot is still making them */
  function linkStep(def) {
    var P = realmProgs(def);
    if (P.st === 2 || P.st === -1) return P.st === 2;
    for (var i = 0; i < P.list.length; i++) { var Q = P.list[i]; if (Q.st !== 3) return false; if (!Q.ok) { P.st = -1; return false; } }
    P.st = 2;
    return true;
  }
  /* (world6) the world's programs will not build here (a driver's quirk): the world gives up, the still sky stays */
  function setAside(V) {
    V.def.bad = true; freeVisit(V);
    DEAD = true; stop(); shown = false; canvas.classList.remove('on'); clearWords();
  }

  /* ---------------------------------------------------------------- the world's build, in stages */
  /* The plan (the maps and the director, the weights' grid about the landing, the light, the field), the programs, the
     ground at the origin (probed), the scatter's shapes and the sets; then the cells about the camera, through the
     streamer (cells.js). There is nothing after it: the world goes on as the camera flies (world6: no visit follows). */
  function planVisit(V) {
    if (V.light) return;
    var def = V.def;
    if (!MAPS.w) mapsInit(J.seed);   // (world6: the maps and the director, the boot's commit about the landing)
    kwFollow(CS.x, CS.z, true);       // (the weights' grid about the camera, whole)
    V.rng = RNG(subseed(V.seed, 1)); V.rng2 = RNG(subseed(V.seed, 2));
    V.salt = subseed(V.seed, 7) >>> 0;
    V.speed = def.speed || 12; V.clear = (def.clear || [6, 12, 120]).slice(); V.margin = def.margin || 14;
    V.field = def.field ? def.field(V.rng, V) : { params: [] };
    V.light = def.light(V.rng2, V);
    V.light.sunDir = dirAzEl(V.light.sunAz, V.light.sunEl);
    V.lightRaw = Object.assign({}, V.light);
    var r3 = RNG(subseed(V.seed, 3)); V.ph = [r3.r(0, 6.28), r3.r(0, 6.28), r3.r(0, 6.28), r3.r(0, 6.28)];
    V.evRng = RNG(subseed(V.seed, 5));
    prepLight(V);
    worldLights(V);   // (world6: the kits' lights, blended by the climate about the camera)
  }
  /* (E1, design-v5 4.3) each stage is CPU work (the slice after the frame's flush: no GL call) or GPU work (the jobs at
     the start of the next drawn frame); `kind` says which a call may run ('cpu', 'gpu'; sync or no kind: any) */
  var VSTAGES = [vsPlan, vsLink, vsKW, vsOrigin, vsOriginRead, vsScatter, vsScatterUp, vsSets, vsSetsUp];
  var VKIND = ['cpu', 'cpu', 'gpu', 'cpu', 'cpu', 'cpu', 'gpu', 'cpu', 'gpu'];
  function visitStep(V, sync, kind) {   // one stage's step (sync: all of them); true once the visit's own parts are built
    if (V.st >= VSTAGES.length) return true;
    if (V.failed || LOST || gl.isContextLost()) return false;
    if (!V.G) V.G = { bufs: [], vaos: [], texs: [] };
    while (V.st < VSTAGES.length) {
      if (!sync && kind && VKIND[V.st] !== kind) return false;
      var r = VSTAGES[V.st](V, sync);
      if (r === LOSTP) return false;
      if (r === 'fail') { V.failed = true; freeVisit(V); setAside(V); return false; }
      if (r) V.st++;
      if (!sync) break;
      if (!r) return false;
    }
    return V.st >= VSTAGES.length;
  }
  function vsPlan(V) { planVisit(V); return true; }
  function vsKW() { kwUpload(); return true; }   // (world6: the weights' grid onto the GPU before anything is probed)
  function vsLink(V) {   // (E1: never a link in flight: the boot made every realm's programs; this only reads their status)
    if (linkStep(V.def)) return true;
    return realmProgs(V.def).st === -1 ? 'fail' : false;
  }
  // the ground under the origin and about it (the camera's height when it arrives; a ring for the arrival's clearance)
  function vsOrigin(V, sync) {
    var pts = new Float32Array(2 * 17);
    for (var i = 0; i < 16; i++) { var a = i / 16 * 2 * PI, r = i < 8 ? 40 : 160; pts[i * 2] = Math.cos(a) * r; pts[i * 2 + 1] = Math.sin(a) * r; }
    V.oq = probeJob(V, pts, 17, 1, sync);
    return true;
  }
  function vsOriginRead(V) {
    if (!V.oq.done) return false;
    var h = V.oq.h, m = h[16], mx = h[16];
    for (var i = 0; i < 16; i++) mx = Math.max(mx, h[i]);
    V.g0 = m; V.g0max = mx; V.oq = null;
    return true;
  }
  function vsScatter(V) {   // (E1: the shapes built here, CPU; uploaded by vsScatterUp, GPU)
    var sc = V.def.scatter || [];
    V.scB = [];
    for (var i = 0; i < sc.length; i++) {
      var mb = new Builder(512); mb.place(0, 0, 0, 0, false); sc[i].mesh(mb, RNG(subseed(V.seed, 300 + i)), KITAPI);
      V.scB.push(mb);
    }
    var pt = typeof V.def.particles === 'function' ? V.def.particles(V, RNG(subseed(V.seed, 9))) : (V.def.particles || []);
    V.parts = pt.map(partPrep);
    var rb = typeof V.def.ribbons === 'function' ? V.def.ribbons(V) : V.def.ribbons;
    V.ribbons = rb ? particleSet(rb, { wobble: [2, 0.5, 0, 0] }) : null;
    return true;
  }
  function vsScatterUp(V) {
    var sc = V.def.scatter || [];
    V.G.scatter = [];
    for (var i = 0; i < sc.length; i++) {
      var m = uploadMesh(V.scB[i], V.G); m.cell = sc[i].cell; m.grid = sc[i].grid; m.density = sc[i].density; m.size = sc[i].size; m.sink = sc[i].sink || 0; m.tilt = sc[i].tilt || 0; m.stretch = sc[i].stretch || 1; m.salt = sc[i].salt || i + 1;
      V.G.scatter.push(m);
    }
    V.scB = null;
    return true;
  }
  /* the realm's instanced sets: each a mesh built once a visit (and a coarse one, the same draws at the far cells'
     detail), placed by the cells as many times as they like (C.place): one draw a set a cell */
  function vsSets(V) {   // (E1: the sets' meshes built here, CPU; uploaded by vsSetsUp, GPU)
    var S = V.def.sets; V.setB = [];
    if (!S) return true;
    var names = Object.keys(S);
    for (var k = 0; k < names.length; k++) {
      var d = S[names[k]], seed = subseed(V.seed, 500 + k);
      var B = new Builder(1024); B.place(0, 0, 0, 0, false); d.mesh(B, RNG(seed), KITAPI);
      var B2 = null;
      if (d.coarse !== false) { B2 = new Builder(512); B2.lod = 1; B2.place(0, 0, 0, 0, false); d.mesh(B2, RNG(seed), KITAPI); if (!(B2.n && B2.n < B.n * 0.9)) B2 = null; }
      V.setB.push([names[k], d, B, B2]);
    }
    return true;
  }
  function vsSetsUp(V) {
    V.G.sets = {};
    var L = V.setB || [];
    for (var k = 0; k < L.length; k++) {
      var d = L[k][1], B = L[k][2], B2 = L[k][3];
      var full = uploadMesh(B, V.G); full.lo = B.lo.slice(); full.hi = B.hi.slice();
      var coarse = B2 ? uploadMesh(B2, V.G) : null;
      var r = 0; for (var a = 0; a < 3; a++) r = Math.max(r, Math.abs(full.lo[a]), Math.abs(full.hi[a]));
      V.G.sets[L[k][0]] = { full: full, coarse: coarse, far: d.far || 900, r: r, cy: (full.lo[1] + full.hi[1]) / 2 };
    }
    V.setB = null;
    return true;
  }
  /* the world's GL objects and its cells' freed (a reset or a lost context; the programs stay) */
  function freeVisit(V) {
    if (!V) return;
    if (V.cells) { V.cells.forEach(function (C) { freeCell(C); }); V.cells = null; V.cellList = null; }
    var G = V.G;
    if (G && !LOST) {
      G.bufs.forEach(function (b) { glFree('Buffer', b); });   // (E1: deleted among the next frame's GPU jobs)
      G.vaos.forEach(function (v) { glFree('VertexArray', v); });
      G.texs.forEach(function (t) { glFree('Texture', t); });
    }
    V.G = null; V.st = 0; V.parts = null; V.ribbons = null; V.flocksEv = null; V.scB = null; V.setB = null;
    V.pois = null; V.oq = null; V.rng = null; V.rng2 = null; V.evRng = null; V.ready = false; V.field = null;
  }
  function forgetVisit(V) {   // (after a lost context the objects are gone already)
    if (V.cells) V.cells.forEach(function (C) { C.gone = true; }); V.cells = null; V.cellList = null;
    V.G = null; V.st = 0; V.parts = null; V.ribbons = null; V.ready = false; V.scB = null; V.setB = null;
  }
  /* a particle set as the realm gives it: { kind: 'grain' | 'mote' | 'mote2' (about the camera's height) | 'rain' |
     'drift' | 'drift2' (about the camera's height) (or hop[3]: 0-5), count, box (m), height (m), streak (s), width
     (px), wind [x, y, z] (m/s), color [r, g, b, opacity], hop [m, rate, lift m, kind] (grains), lift (m over the
     ground); rain: fall (m/s), splash (s), gusts (0-1); drifting: rise (m/s; < 0 sinks), life (s), wander (m/s),
     tumble (Hz), colors [[r, g, b, share], [r, g, b, share]] (a second and third colour), blink (the share of a cycle
     lit), flicker (0-1); areas: [names] (drawn in proportion to those areas' shares), rainScale (by the light's
     rain) } */
  var PKIND = { grain: 0, mote: 1, mote2: 2, rain: 3, drift: 4, drift2: 5 };
  function partPrep(o) {
    var q = {}, k;
    for (k in o) if (k !== 'colors' && k !== 'areas' && k !== 'kind') q[k] = o[k];
    var pa = particleSet(q, { hop: [0, 0, 0.2, 0] });
    if (o.kind !== undefined) pa.hop[3] = typeof o.kind === 'number' ? o.kind : PKIND[o.kind];
    if (o.lift !== undefined) pa.hop[2] = o.lift;
    var kd = pa.hop[3];
    pa.ud = new Float32Array(kd === 3 ? [o.fall || 8.5, o.splash || 0.25, o.gusts || 0, 0] : [o.rise || 0, o.life || 8, o.wander === undefined ? 0.3 : o.wander, o.tumble || 0]);
    pa.ue = new Float32Array(o.colors && o.colors[0] || [0, 0, 0, 0]); pa.uf = new Float32Array(o.colors && o.colors[1] || [0, 0, 0, 0]);
    pa.ug = new Float32Array([o.blink || 0, o.flicker || 0, 1, 0]);
    pa.areas = o.areas || null; pa.rainScale = !!o.rainScale;
    if (pa.streak === undefined) pa.streak = kd === 3 ? 0.06 : 0;
    if (pa.width === undefined) pa.width = 1.2;
    if (pa.height === undefined) pa.height = 20;
    if (!pa.wind) pa.wind = new Float32Array([0, 0, 0]);
    return pa;
  }
  function particleSet(o, def) {
    if (!o) return null;
    var r = {}, k;
    for (k in o) r[k] = (o[k] && o[k].length !== undefined && typeof o[k] !== 'string') ? new Float32Array(o[k]) : o[k];
    for (k in def) if (!r[k]) r[k] = new Float32Array(def[k]);
    return r;
  }
  function uploadMesh(B, G) {
    var M = { n: B.count(), vao: null, vb: null };
    if (!M.n) return M;
    M.vao = pTake('mesh'); if (G) G.vaos.push(M.vao);   // (E1 Fix 3: from the pools)
    M.vb = pTake('buf'); if (G) G.bufs.push(M.vb);
    gl.bindVertexArray(M.vao); gl.bindBuffer(gl.ARRAY_BUFFER, M.vb); gl.bufferData(gl.ARRAY_BUFFER, B.bytes(), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, VSTRIDE, 0);
    gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 3, gl.BYTE, true, VSTRIDE, 12);
    gl.enableVertexAttribArray(2); gl.vertexAttribPointer(2, 4, gl.UNSIGNED_BYTE, true, VSTRIDE, 16);
    gl.enableVertexAttribArray(3); gl.vertexAttribPointer(3, 1, gl.FLOAT, false, VSTRIDE, 20);
    gl.enableVertexAttribArray(4); gl.vertexAttribPointer(4, 1, gl.UNSIGNED_BYTE, true, VSTRIDE, 15);   // (its emission)
    gl.bindVertexArray(null);
    return M;
  }
  /* a mesh's attributes (0-4) on a VAO of its own, with an instance buffer's (from location `at`, `n` vec4s each,
     stride n x 16 bytes, from byte `off`) */
  function meshAttribs(M) {
    gl.bindBuffer(gl.ARRAY_BUFFER, M.vb);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, VSTRIDE, 0);
    gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 3, gl.BYTE, true, VSTRIDE, 12);
    gl.enableVertexAttribArray(2); gl.vertexAttribPointer(2, 4, gl.UNSIGNED_BYTE, true, VSTRIDE, 16);
    gl.enableVertexAttribArray(3); gl.vertexAttribPointer(3, 1, gl.FLOAT, false, VSTRIDE, 20);
    gl.enableVertexAttribArray(4); gl.vertexAttribPointer(4, 1, gl.UNSIGNED_BYTE, true, VSTRIDE, 15);
  }
  function instAttribs(buf, at, n, off) {
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    for (var i = 0; i < n; i++) { gl.enableVertexAttribArray(at + i); gl.vertexAttribPointer(at + i, 4, gl.FLOAT, false, n * 16, off + i * 16); gl.vertexAttribDivisor(at + i, 1); }
  }

  /* ---------------------------------------------------------------- cloud volumes: baking */
  var VOL_LAYERS = 24, VSIGMA = 0.19;
  function tex3params() {
    gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_R, gl.CLAMP_TO_EDGE);
  }
  /* a cloud body: its box from its lobes (in its own frame, turned about the vertical by its yaw, so a wall's box is
     tight along it), its voxels (res across its longest side), its texture; then baked: the density into the scratch
     volume a layer per draw, then the final volume (the distance, the optical depth toward the sun and the sky) */
  function volPrep(PF, bi, G, res) {
    var B = PF.bodies[bi], a = PF.a, i0 = B.i0, i1 = bi + 1 < PF.bodies.length ? PF.bodies[bi + 1].i0 : PF.count(), i, k;
    var rs = []; for (i = i0; i < Math.min(i1, i0 + 96); i++) rs.push(a[i * 12 + 3]); rs.sort(function (x, y) { return x - y; });
    var Rm = rs[rs.length >> 1] || 10, mg = Rm * ((B.billow || 0.8) * 0.45 + 0.12);   // the median lobe; room for the billows and fillets
    var cy = Math.cos(B.yaw || 0), sy = Math.sin(B.yaw || 0), n = Math.min(i1 - i0, 96), LP = new Float32Array(n * 3);
    for (i = 0; i < n; i++) { var ax = a[(i0 + i) * 12], az = a[(i0 + i) * 12 + 2]; LP[i * 3] = cy * ax - sy * az; LP[i * 3 + 1] = a[(i0 + i) * 12 + 1]; LP[i * 3 + 2] = sy * ax + cy * az; }
    var lo = [1e9, 1e9, 1e9], hi = [-1e9, -1e9, -1e9];
    for (i = 0; i < n; i++) for (k = 0; k < 3; k++) { lo[k] = Math.min(lo[k], LP[i * 3 + k] - a[(i0 + i) * 12 + 3] - mg); hi[k] = Math.max(hi[k], LP[i * 3 + k] + a[(i0 + i) * 12 + 3] + mg); }
    var cl = [(lo[0] + hi[0]) / 2, (lo[1] + hi[1]) / 2, (lo[2] + hi[2]) / 2], h = [(hi[0] - lo[0]) / 2 * 1.06, (hi[1] - lo[1]) / 2 * 1.06, (hi[2] - lo[2]) / 2 * 1.06];
    var c = [cy * cl[0] + sy * cl[2], cl[1], -sy * cl[0] + cy * cl[2]];   // the centre in the world
    if (DEVMODE && SW.volres > 0) res = SW.volres;   // (E1, dev: the structural harness's long flights with small bodies: the same calls, a fraction of SwiftShader's bake time)
    var vox = Math.max(h[0], h[1], h[2]) * 2 / (res || 52), dims = [0, 0, 0];
    for (k = 0; k < 3; k++) dims[k] = clamp(Math.ceil(h[k] * 2 / vox), 6, 64);
    var L = new Float32Array(96 * 4);
    for (i = 0; i < n; i++) { L[i * 4] = LP[i * 3] - cl[0]; L[i * 4 + 1] = LP[i * 3 + 1] - cl[1]; L[i * 4 + 2] = LP[i * 3 + 2] - cl[2]; L[i * 4 + 3] = a[(i0 + i) * 12 + 3]; }
    var T3 = null;   // (E1: the texture is made by the body's first bake, GPU work: volTex)
    var erode = B.erode === undefined ? 0.75 : B.erode, bil = B.billow || 0.8;
    // the opaque cores: an icosahedron inside each lobe, past its billows and 25 m of cloud
    var inward = erode * bil * Rm * 0.42 + 4 + 25, cores = [];
    for (i = i0; i < i1; i++) { var rc = a[i * 12 + 3] * Math.min(B.squash || 0.9, 1) - inward; if (rc > 6) cores.push(a[i * 12], a[i * 12 + 1], a[i * 12 + 2], rc); }
    return { G: G || null, L: L, n: n, h: h, dims: dims, vox: vox, Rm: Rm, cy: cy, sy: sy, B: { seed: B.seed || 0.37, erode: erode, noise: B.noise || 3.6, blend: B.blend || 0.5, squash: B.squash || 0.9, billow: bil }, pass: 0, z: 0, done: false,
      out: { t: T3, c: new Float32Array(c), h: new Float32Array(h), yaw: new Float32Array([cy, sy]), dims: dims, r: Math.sqrt(h[0] * h[0] + h[1] * h[1] + h[2] * h[2]), range: Rm * 4, band: Math.max(Rm * (B.band || 0.07), 3),
        reach: erode * Rm * bil * 0.5 + 2, kind: B.kind || 0, vox: vox, y0: lo[1], y1: hi[1], base: B.base !== undefined ? B.base : -1e5, fade: 0, ready: false, cores: cores, bytes: dims[0] * dims[1] * dims[2] * (VOL16 ? 8 : 4),
        u4a: new Float32Array(4), u4b: new Float32Array(4), u4c: new Float32Array(4) } };
  }
  /* up to budget units of this body's baking; returns the units spent. A unit is a 44 x 44 layer of 48 lobes (the
     density pass: its pixels times its lobes; the light pass: its pixels, half again), so a great wall of 64 x 64 and
     96 lobes takes about 4 units a layer, and a frame's baking stays about the same work whatever the body */
  function volTex(vb) {   // (E1) the body's texture, at its first bake
    var d = vb.dims, T3 = pTake('tex3'); if (vb.G) vb.G.texs.push(T3);   // (E1 Fix 3: from the pool, re-specified below)
    gl.activeTexture(gl.TEXTURE10); gl.bindTexture(gl.TEXTURE_3D, T3);
    // (hotfix G0, pass 2) half floats where this GPU filters an 8-bit texture at 8 bits (VOL16, probeFilter): there the
    // RGBA8 volume came back in terraces of the soft band (about four and a half codes wide) that the march's samples
    // crossed as the view moved, and the clouds' edges blinked in half-resolution blobs at 3-4x the 4x reference (WebKit
    // here). The values are the same (each channel clamped to 0 .. 1 as the bytes were); filtered in float the field is
    // smooth. Twice the bytes and the bandwidth, so only where it is needed
    gl.texImage3D(gl.TEXTURE_3D, 0, VOL16 ? gl.RGBA16F : gl.RGBA8, d[0], d[1], d[2], 0, gl.RGBA, VOL16 ? gl.HALF_FLOAT : gl.UNSIGNED_BYTE, null); tex3params();
    gl.activeTexture(gl.TEXTURE0);
    vb.out.t = T3;
  }
  function volBake(vb, V, budget) {
    if (!vb.out.t) volTex(vb);
    var P, d = vb.dims, made = 0, B = vb.B, px = d[0] * d[1] / 1936, uD = Math.max(1, px * vb.n / 48), uL = Math.max(1, px * 1.5);
    gl.disable(gl.BLEND); gl.disable(gl.DEPTH_TEST); gl.disable(gl.CULL_FACE);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_3D, NOISE3);
    if (vb.pass === 0) {
      P = EP.vdens; gl.useProgram(P.p); setFrameUniforms(P, V);
      gl.uniform4fv(P.u.uLobe, vb.L); gl.uniform1i(P.u.uLobeN, vb.n); gl.uniform3fv(P.u.uHalf, vb.h); gl.uniform3f(P.u.uDims, d[0], d[1], d[2]);
      gl.uniform4f(P.u.uVK, B.seed, B.erode, vb.Rm * B.noise, vb.Rm * B.blend);
      gl.uniform4f(P.u.uVK2, 0, B.squash, vb.Rm * 4, vb.Rm * B.billow);
      gl.bindFramebuffer(gl.FRAMEBUFFER, VTMP.f); gl.viewport(0, 0, d[0], d[1]); gl.bindVertexArray(FULLVAO);
      while (vb.z < d[2] && made < budget) { gl.framebufferTextureLayer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, VTMP.t, 0, vb.z); gl.uniform1f(P.u.uLayer, vb.z); gl.drawArrays(gl.TRIANGLES, 0, 3); vb.z++; made += uD; }
      if (vb.z < d[2]) return made;
      vb.pass = 1; vb.z = 0;
    }
    if (made >= budget) return made;
    P = EP.vlight; gl.useProgram(P.p); setFrameUniforms(P, V);
    gl.activeTexture(gl.TEXTURE8); gl.bindTexture(gl.TEXTURE_3D, VTMP.t); gl.activeTexture(gl.TEXTURE0);
    gl.uniform3fv(P.u.uHalf, vb.h); gl.uniform3f(P.u.uDims, d[0], d[1], d[2]); gl.uniform3f(P.u.uScale, d[0] / 64, d[1] / 64, d[2] / 64);
    var sd = V.light.sunDir, cy = vb.cy, sy = vb.sy;
    gl.uniform3f(P.u.uSunL, cy * sd[0] - sy * sd[2], sd[1], sy * sd[0] + cy * sd[2]); gl.uniform2f(P.u.uYawCS, cy, sy);
    gl.uniform1f(P.u.uSigma, VSIGMA); gl.uniform1f(P.u.uSD, vb.Rm * 4 / (vb.vox * 2.2)); gl.uniform1f(P.u.uVox, vb.vox);
    gl.bindFramebuffer(gl.FRAMEBUFFER, BAKEFB); gl.viewport(0, 0, d[0], d[1]); gl.bindVertexArray(FULLVAO);
    while (vb.z < d[2] && made < budget) { gl.framebufferTextureLayer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, vb.out.t, 0, vb.z); gl.uniform1f(P.u.uLayer, vb.z); gl.drawArrays(gl.TRIANGLES, 0, 3); vb.z++; made += uL; }
    if (vb.z >= d[2]) { vb.done = true; vb.L = null; vb.out.ready = true; }
    return made;
  }
  /* ---------------------------------------------------------------- the time of day (tod, 2026-10-27) */
  /* The owner (2026-10-23): "Add dusk and night first"; and, of the live sky, "Only the starting landing scene should
     depend on the system time. The rest should cycle through smoothly randomly non-time-dependent." The world opens on
     a sky of the visitor's own time of day (hour.v2.js marks data-sky and data-sky-at: its one read of the clock) and then
     passes from sky to sky in an order of its own, the live sky's (sky.v3.js nextSky): mostly into a neighbouring sky,
     now and then (SKY_FAR) into any through the mist, never into one of the last SKY_RECENT, a sky not yet seen likelier,
     and after a run of four skies of one kind of words the other kind four times likelier. The cycle runs on the
     flight's own clock (SIM.t: a still at data-t is any moment of it), its draws from the visit's own streams
     (subseed(SEED0, 41): the order; 42: the visit's own placements): no new entropy, no clock.
     Each sky is a set of colours and amounts laid over each kit's own light (the dunes' and the cloud sea's; 'fair' is
     the kits' own light, unchanged) and a paint transform of everything the kits paint rather than light (the land, the
     stones, the isles, the creatures, the particles). The key light keeps the visit's one baked direction (every cloud
     body's light depth is baked along it): at night it is the moon's light from the same place; the sky's own light (its
     glow, warmth, disc: uSkyS) may stand lower (the afterglow's -3 deg). Between two skies the light is blended four
     ways (two kits by place, two skies by time): colours on the light clock q, structure (warmth, glow, veil, events,
     fog, the gradient's shape, the land's offset from the sky and its contrast) on the structure clock qs; a change
     between skies of different words passes a twilight waypoint (even, well below the inks' crossing, the land lost in
     a mist of the twilight's own light), and the light under the words crosses the band where neither ink reads well
     (OKLab L 0.562-0.654) in CROSS_T s (the quick crossing: the half's clock warped, planned from the two skies alone).
     Nothing here reads the words (rule 7, W7). Design: tod/design/design.md. */
  var WSKY = {
    sunrise: { g:'dawn', w:'dark', ph:1, land:1, hold:85, near:['fair','azure','mist','firstlight'], sky:[[0.66,0.085,272],[0.85,0.08,240],[0.83,0.083,244],[0.79,0.09,250],[0.72,0.1,255],[0.64,0.115,256]], skyW:[0.88,0.08,20], glowC:[0.97,0.03,40], hazeC:[0.74,0.06,270], hazeW:[0.9,0.04,70], fogB:[0.62,0.09,262], ambU:[0.72,0.09,255], ambD:[0.6,0.06,290], clLit:[0.93,0.03,60], clShade:[0.64,0.08,275], clDeep:[0.6,0.085,272], clRim:[0.98,0.03,70], skyK:[0.6,8,0.1], key:[0.98,0.02,85,3], skyEl:null, sunVis:1, fogK:1, hazeK:1, seaLit:1, paint:{lit:[1,1.15,40,0.7,9,0.6],shade:[1,0.9,285,0.5],deep:[1,0.9,290,0.4],pale:[1,1,0,0]}, post:{bloomK:1.25,shafts:0.4,sat:1.04,stars:0,hi:0,hiC:[0.95,0.02,300]}, fx:{belt:0.9}, ceil:2 },
    fair: { g:'day', w:'dark', ph:1, land:1, hold:105, near:['azure','mist','golden','sunrise','silver'], kit:1, paint:{lit:[1,1,0,0],shade:[1,1,0,0],deep:[1,1,0,0],pale:[1,1,0,0]}, fx:{}, ceil:2 },
    azure: { g:'day', w:'dark', ph:2, land:1, hold:100, near:['fair','silver','golden','sunrise'], sky:[[0.8,0.012,225],[0.89,0.06,220],[0.86,0.07,224],[0.8,0.085,230],[0.72,0.09,236],[0.62,0.095,241]], skyW:[0.95,0.02,85], glowC:[0.99,0.02,90], hazeC:[0.8,0.07,233], hazeW:[0.88,0.04,80], fogB:[0.62,0.08,240], ambU:[0.74,0.09,236], ambD:[0.6,0.03,120], clLit:[0.94,0.006,120], clShade:[0.72,0.03,235], clDeep:[0.66,0.04,238], clRim:[0.99,0.01,90], skyK:[0.3,8,0.06], key:[0.99,0.02,90,2.8], skyEl:null, sunVis:1, fogK:1, hazeK:1, seaLit:1, paint:{lit:[1.02,0.8,40,0.3],shade:[1.05,0.8,235,0.5],deep:[1.08,0.8,240,0.5],pale:[1,1,0,0]}, post:{bloomK:1.1,shafts:0.35,sat:1.04,stars:0,hi:0.25,hiC:[0.97,0.01,230]}, fx:{}, ceil:2 },
    mist: { g:'rain', w:'dark', ph:1, land:1, hold:90, near:['fair','silver','sunrise','azure'], sky:[[0.86,0.04,215],[0.93,0.035,212],[0.92,0.04,214],[0.9,0.05,218],[0.86,0.06,222],[0.8,0.07,226]], skyW:[0.96,0.02,95], glowC:[0.98,0.02,95], hazeC:[0.88,0.05,215], hazeW:[0.92,0.04,200], fogB:[0.8,0.06,218], ambU:[0.86,0.05,215], ambD:[0.78,0.05,215], clLit:[0.92,0.03,205], clShade:[0.8,0.06,215], clDeep:[0.74,0.065,220], clRim:[0.96,0.02,200], skyK:[0.25,10,0.03], key:[0.97,0.02,95,1.4], skyEl:null, sunVis:0.35, fogK:4, hazeK:3, seaLit:1, paint:{lit:[1.15,0.6,215,0.6,0.8,0],shade:[1.15,0.7,218,0.6,0.72,0],deep:[1.2,0.7,220,0.6,0.66,0],pale:[1.05,0.6,215,0.5,0.92,0]}, post:{bloomK:0.9,shafts:0.3,sat:1,stars:0,hi:0,hiC:[0.95,0.02,215]}, fx:{}, ceil:2 },
    silver: { g:'rain', w:'dark', ph:2, land:1, hold:85, near:['mist','fair','golden','azure'], sky:[[0.74,0.03,248],[0.8,0.03,245],[0.79,0.032,247],[0.78,0.035,250],[0.76,0.036,250],[0.73,0.038,252]], skyW:[0.78,0.02,240], glowC:[0.8,0.02,240], hazeC:[0.78,0.03,248], hazeW:[0.82,0.03,240], fogB:[0.7,0.04,250], ambU:[0.76,0.03,248], ambD:[0.68,0.03,250], clLit:[0.86,0.02,245], clShade:[0.72,0.03,248], clDeep:[0.68,0.035,250], clRim:[0.9,0.02,240], skyK:[0.1,8,0], key:[0.9,0.02,205,0.9], skyEl:null, sunVis:0, fogK:2.5, hazeK:1.5, seaLit:1, paint:{lit:[1.18,0.45,245,0.7,0.78,0],shade:[1.26,0.45,250,0.7,0.72,0],deep:[1.38,0.45,250,0.7,0.69,0],pale:[0.9,0.5,245,0.5]}, post:{bloomK:0.6,shafts:0,sat:0.98,stars:0,hi:0.9,hiC:[0.8,0.02,245],rain:1}, fx:{curtain:0.8}, ceil:2 },
    golden: { g:'sunset', w:'dark', ph:1, land:1, hold:85, near:['rose','afterglow','fair','silver'], sky:[[0.7,0.06,300],[0.9,0.07,72],[0.88,0.065,66],[0.84,0.05,45],[0.77,0.045,320],[0.7,0.06,262]], skyW:[0.9,0.08,62], glowC:[0.97,0.05,80], hazeC:[0.8,0.05,330], hazeW:[0.9,0.07,65], fogB:[0.6,0.07,300], ambU:[0.74,0.06,280], ambD:[0.62,0.07,40], clLit:[0.9,0.07,60], clShade:[0.62,0.06,300], clDeep:[0.6,0.065,295], clRim:[0.97,0.06,75], skyK:[0.65,9,0.1], key:[0.92,0.09,65,3.2], skyEl:null, sunVis:1, fogK:1, hazeK:1.1, seaLit:1, paint:{lit:[1.12,1.35,45,0.85,0.74,0],shade:[0.98,0.8,300,0.6],deep:[0.98,0.8,330,0.5],pale:[1,1.2,70,0.6]}, post:{bloomK:1.2,shafts:0.7,sat:1.06,stars:0,hi:0.2,hiC:[0.94,0.05,60],motes:1.5}, fx:{belt:0.3}, ceil:2 },
    rose: { g:'sunset', w:'dark', ph:2, land:1, hold:85, near:['golden','afterglow','azure'], sky:[[0.72,0.05,345],[0.93,0.05,75],[0.9,0.055,55],[0.86,0.06,25],[0.8,0.06,340],[0.66,0.06,300]], skyW:[0.94,0.05,70], glowC:[0.97,0.04,75], hazeC:[0.82,0.05,345], hazeW:[0.92,0.05,60], fogB:[0.62,0.06,320], ambU:[0.76,0.06,330], ambD:[0.6,0.08,25], clLit:[0.72,0.15,36], clShade:[0.62,0.09,10], clDeep:[0.6,0.08,350], clRim:[0.95,0.05,60], skyK:[0.6,9,0.08], key:[0.93,0.06,50,2.6], skyEl:null, sunVis:1, fogK:1, hazeK:1.1, seaLit:1, paint:{lit:[1,1.6,28,0.85],shade:[0.98,1,10,0.6],deep:[0.98,1,22,0.5],pale:[1,1.3,65,0.6]}, post:{bloomK:1.1,shafts:0.4,sat:1.06,stars:0,hi:0.3,hiC:[0.92,0.04,20]}, fx:{belt:0.3}, ceil:2 },
    afterglow: { g:'dusk', w:'light', ph:1, land:1, hold:70, near:['bluehour','golden','rose','milkyway','moonlit'], sky:[[0.3,0.05,265],[0.52,0.075,40],[0.47,0.07,25],[0.41,0.07,330],[0.375,0.08,292],[0.34,0.08,284]], skyW:[0.53,0.09,40], glowC:[0.53,0.1,45], hazeC:[0.42,0.06,290], hazeW:[0.5,0.08,35], fogB:[0.3,0.06,272], ambU:[0.42,0.07,290], ambD:[0.32,0.05,300], clLit:[0.78,0.12,5], clShade:[0.52,0.08,345], clDeep:[0.45,0.07,320], clRim:[0.78,0.1,25], skyK:[0.5,6,0.15], key:[0.78,0.12,40,0.7], skyEl:-3, sunVis:0, fogK:1, hazeK:1, seaLit:0.75, paint:{lit:[0.5,0.7,300,0.6],shade:[0.43,0.6,285,0.6],deep:[0.4,0.6,275,0.6],pale:[0.5,0.8,300,0.5]}, post:{bloomK:0.4,shafts:0.1,sat:1.05,stars:0.05,hi:0.15,hiC:[0.48,0.08,10]}, fx:{belt:0.6}, ceil:0.525 },
    bluehour: { g:'dusk', w:'light', ph:1, land:1, hold:70, near:['moonlit','milkyway','aurora','afterglow','firstlight'], sky:[[0.27,0.05,268],[0.5,0.06,40],[0.45,0.065,325],[0.41,0.085,295],[0.36,0.09,285],[0.3,0.09,272]], skyW:[0.48,0.07,35], glowC:[0.48,0.07,40], hazeC:[0.38,0.07,275], hazeW:[0.46,0.06,35], fogB:[0.27,0.07,270], ambU:[0.38,0.08,272], ambD:[0.28,0.05,275], clLit:[0.62,0.07,285], clShade:[0.47,0.07,280], clDeep:[0.4,0.07,275], clRim:[0.66,0.06,300], skyK:[0.4,5,0.12], key:[0.6,0.08,58,0.4], skyEl:-7, sunVis:0, fogK:1, hazeK:1, seaLit:0.85, paint:{lit:[0.53,0.8,320,0.8],shade:[0.46,0.75,305,0.7],deep:[0.4,0.7,290,0.7],pale:[0.5,0.7,300,0.6]}, post:{bloomK:0.35,shafts:0.05,sat:1.05,stars:0.35,hi:0.1,hiC:[0.42,0.06,280]}, fx:{belt:0.4,nlc:1}, ceil:0.525 },
    moonlit: { g:'night', w:'light', ph:1, land:1, hold:95, near:['milkyway','aurora','firstlight','bluehour'], sky:[[0.3,0.12,264],[0.48,0.07,254],[0.43,0.1,257],[0.35,0.12,261],[0.28,0.12,264],[0.22,0.09,265]], skyW:[0.36,0.08,255], glowC:[0.42,0.04,250], hazeC:[0.33,0.045,262], hazeW:[0.38,0.035,252], fogB:[0.26,0.11,264], ambU:[0.34,0.09,262], ambD:[0.26,0.06,262], clLit:[0.7,0.06,258], clShade:[0.52,0.07,262], clDeep:[0.44,0.08,264], clRim:[0.74,0.04,250], skyK:[0.2,8,0.05], key:[0.84,0.03,245,0.55], skyEl:null, sunVis:0, fogK:1, hazeK:1, seaLit:0.9, paint:{lit:[0.37,0.6,258,0.8],shade:[0.28,0.7,262,0.8],deep:[0.24,0.75,262,0.8],pale:[0.48,0.4,250,0.5]}, post:{bloomK:0.3,shafts:0,sat:1,stars:0.6,hi:0.1,hiC:[0.36,0.08,262]}, fx:{moon:{r:1.8,L:[0.62,0.03,250],glow:[0.44,0.05,250],corona:1}}, ceil:0.525 },
    milkyway: { g:'night', w:'light', ph:2, land:1, hold:95, near:['aurora','moonlit','firstlight'], sky:[[0.25,0.09,264],[0.3,0.1,262],[0.29,0.1,263],[0.26,0.1,264],[0.22,0.09,265],[0.18,0.075,266]], skyW:[0.3,0.06,262], glowC:[0.3,0.03,260], hazeC:[0.28,0.09,264], hazeW:[0.31,0.08,260], fogB:[0.22,0.08,265], ambU:[0.26,0.07,264], ambD:[0.2,0.05,264], clLit:[0.38,0.1,266], clShade:[0.28,0.09,266], clDeep:[0.25,0.085,266], clRim:[0.42,0.06,255], skyK:[0.1,8,0], key:[0.6,0.02,250,0.15], skyEl:null, sunVis:0, fogK:1, hazeK:1, seaLit:0.8, paint:{lit:[0.44,0.6,262,0.8],shade:[0.42,0.7,264,0.8],deep:[0.4,0.75,264,0.8],pale:[0.44,0.8,262,0.7]}, post:{bloomK:0.3,shafts:0,sat:1,stars:1,hi:0,hiC:[0.28,0.09,264]}, fx:{galaxy:1}, ceil:0.525 },
    aurora: { g:'night', w:'light', ph:2, land:1, hold:100, near:['milkyway','moonlit','firstlight','bluehour'], sky:[[0.27,0.06,250],[0.33,0.06,225],[0.32,0.065,235],[0.29,0.08,250],[0.25,0.08,262],[0.21,0.07,266]], skyW:[0.34,0.06,175], glowC:[0.36,0.06,165], hazeC:[0.31,0.05,215], hazeW:[0.36,0.065,175], fogB:[0.24,0.065,250], ambU:[0.34,0.055,172], ambD:[0.24,0.05,240], clLit:[0.44,0.08,170], clShade:[0.32,0.07,240], clDeep:[0.28,0.07,250], clRim:[0.48,0.09,160], skyK:[0.15,10,0], key:[0.72,0.09,152,0.38], skyEl:null, sunVis:0, fogK:1, hazeK:1, seaLit:0.85, paint:{lit:[0.46,0.6,175,0.35],shade:[0.43,0.6,250,0.7],deep:[0.41,0.6,255,0.7],pale:[0.46,0.8,175,0.4]}, post:{bloomK:0.35,shafts:0,sat:1.02,stars:0.75,hi:0,hiC:[0.31,0.05,215]}, fx:{aurora:1}, ceil:0.525 },
    firstlight: { g:'night', w:'light', ph:1, land:0, hold:70, near:['sunrise','moonlit','bluehour'], sky:[[0.28,0.06,262],[0.52,0.095,38],[0.45,0.085,15],[0.37,0.075,265],[0.33,0.09,252],[0.29,0.09,255]], skyW:[0.5,0.09,45], glowC:[0.52,0.09,50], hazeC:[0.34,0.07,264], hazeW:[0.48,0.08,45], fogB:[0.27,0.07,255], ambU:[0.36,0.07,270], ambD:[0.26,0.05,268], clLit:[0.78,0.15,45], clShade:[0.46,0.07,292], clDeep:[0.4,0.07,286], clRim:[0.8,0.12,50], skyK:[0.5,6,0.12], key:[0.82,0.1,50,0.6], skyEl:-3, sunVis:0, fogK:1, hazeK:1, seaLit:0.8, paint:{lit:[0.42,0.65,245,0.9],shade:[0.38,0.65,248,0.9],deep:[0.35,0.65,250,0.9],pale:[0.5,0.5,250,0.5]}, post:{bloomK:0.35,shafts:0.15,sat:1.04,stars:0.3,hi:0.1,hiC:[0.4,0.06,252]}, fx:{belt:0.4}, ceil:0.525 }
  };
  var SKY_PHASE = 1;   // (phase 1: sunrise, fair, mist, golden, afterglow, bluehour, moonlit, firstlight; phase 2 adds azure, silver, rose, milkyway, aurora)
  var TW_L = [0.44, 0.48, 0.474, 0.468, 0.466, 0.43];   // (the twilight's sky stops, OKLab L below, at 0, 3, 10, 26, 58 deg: the live's TWILIGHT mapped)
  /* (tod fix round) TW_FOG, TW_HAZE: the twilight's mist (were 2.5 and 3); FAR_FOG, FAR_HAZE: through the mist (were 1.7,
     2.5): the judges' defect 12, frames flattened to the COVER bar. SKY_EVEN: on the half that crosses the inks' band only,
     its structure gone by this share of the way to the band's bright edge (skyEdge; was 1.8 x on both halves: defect
     5's 26 s of flat fog, defect 11's uneven ground at the crossing); GAP_L, the sky's mean light's band, the inks' band
     (L 0.562-0.654) widened by the ground's spread under the words (+-0.04), crossed in CROSS_T (was 2 s over the bare
     band: defects 7 and 11; 3.6 s holds the mean's fastest step to 0.06 L/s over the wider band) */
  var TW_FOG = 2, TW_HAZE = 1.6, FAR_FOG = 1.25, FAR_HAZE = 1.5, SKY_PKW = 0.4, SKY_PKF = 1, FB_L = [0.5, 0.55];   // (SKY_PKW: the share of a crossing half's way past the band's dark edge over which the waypoint's land comes or goes; tod fix3, problem 2: SKY_PKF, the waypoint's land under its sky at least this share from the start of a crossing half (was 0 until the band's dark edge: the frame a flat fog for about 10 s); TW_FOG, the twilight's own air, 2 x the kit's own fog (was 1.5 x the two skies' mean, the mist's x4 carried in); FB_L, the sky's mean light over which a crossing half's low mist (TWM) comes in, fully from FB_L[1]: the band's bright side and the band, where the stack's ground must be even)
  var TWM_A = 0.9, TWM_E = [4, 16], SKYTWM = new Float32Array(4);   // (tod fix3, problem 2: the twilight's low mist (atmos, uTwM): TWM_A of the horizon's colour within TWM_E[0] deg of the horizon, gone by TWM_E[1], while the light is on the band's bright side or in it (SKY.fb) and in the waypoint's share of the change's structure)
  var SKY_EVEN = 0.92, CROSS_T = 3.6, WARP_D = 0.5, GAP_L = [0.522, 0.694], SKY_FAR = 0.38, SKY_RECENT = 3, SKYE_W = [3, 10, 26, 58];
  var ROLE_SLOT = ['lit', 'lit', 'shade', 'deep', 'lit', 'shade', 'lit', 'shade', 'sheen', '', 'deep', 'pale', 'lit', 'shade', 'shade', 'sea', 'lit', 'deep'];
  var SKY_COLK = ['sunC', 'skyW', 'glowC', 'hazeC', 'hazeW', 'ambU', 'ambD', 'clLit', 'clShade', 'clDeep', 'clRim', 'hiC', 'shaftC'];
  var SKY_CLOUDK = ['clLit', 'clShade', 'clDeep', 'clRim'];
  var SKY = { seed: null, hour: null, V: null, ids: [], land: {}, seq: [], visits: {}, streak: 0, rO: null, rV: null, sets: {}, dt: 0,
    i: -1, e: null, pair: '', A: null, B: null, X: null, Y: null, k: 0, q: 0, qs: 0, x: 0, half: 0, gen: 0, pgen: 0, tw: false, far: false,
    baseLab: null, mm: 0, pk: 1, fb: 0, cap: false, recT: -1e9, skyS: new Float32Array(3), fx: new Float32Array(8), sunVis: 1, ceil: 2, moonD: null };
  /* what the words' ink is told of the cycle each frame (w10_engine.js inkOf: the sky flip): turning (a change between
     skies of different words, under way), want (the incoming sky's words), the change's index, how far it is */
  var SKYI = { turning: false, want: 'dark', from: 'dark', id: -1, k: 0, words: 'dark', sky: '', next: '', group: '' };
  function ss01(x) { x = x < 0 ? 0 : x > 1 ? 1 : x; return x * x * (3 - 2 * x); }
  function angd(a, b) { var d = ((a - b + 180) % 360 + 360) % 360 - 180; return d; }
  function labA(c) { var o = lin2lab(c); return [o[0], o[1], o[2]]; }
  function linA(l) { return lab2linA(l[0], l[1], l[2]); }
  function lchA(c, k) { return lch(c[0], c[1], c[2], k); }
  function cpv(v) { return v && typeof v === 'object' ? (v.length !== undefined && typeof v[0] === 'object' ? Array.prototype.map.call(v, cpv) : Array.prototype.slice.call(v)) : v; }
  function cpRaw(R) { var L = {}, k; for (k in R) L[k] = cpv(R[k]); return L; }
  function scl(c, k) { return [c[0] * k, c[1] * k, c[2] * k]; }
  function midLab(a, b) { return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2]; }
  /* ---- a sky's light on a kit: the kit's own set with the sky's colours and stops in place and its amounts on the kit's densities */
  function skyRaw(S, K, sunDir) {
    var L = cpRaw(K), dk;
    for (dk in LDEF) if (L[dk] === undefined) L[dk] = cpv(LDEF[dk]);
    if (!L.hazeW) L.hazeW = cpv(L.hazeC);
    L.sunDir = Array.prototype.slice.call(sunDir);
    if (S.kit) { L.sunVis = 1; return L; }
    L.sunC = lchA(S.key, S.key[3]);
    L.sky = S.sky.map(function (c) { return lchA(c); });
    L.skyE = SKYE_W.slice(); L.skyW = lchA(S.skyW); L.skyK = [S.skyK[0], S.skyK[1], S.skyK[2], 0];
    L.glowC = lchA(S.glowC);
    L.fog = [L.fog[0] * S.fogK, L.fog[1], L.fog[2], L.fog[3] * S.fogK];
    L.fogB = [lchA(S.fogB), K.fogB ? K.fogB[1] : 0];
    L.haze = [L.haze[0] * S.hazeK, L.haze[1], L.haze[2], L.haze[3]];
    L.hazeC = lchA(S.hazeC); L.hazeW = lchA(S.hazeW); L.ambU = lchA(S.ambU); L.ambD = lchA(S.ambD);
    L.clLit = lchA(S.clLit); L.clShade = lchA(S.clShade); L.clDeep = lchA(S.clDeep); L.clRim = lchA(S.clRim);
    L.hi = [S.post.hi, L.hi[1], L.hi[2], L.hi[3]]; L.hiC = lchA(S.post.hiC);
    L.bloom = [L.bloom[0], L.bloom[1], L.bloom[2] * S.post.bloomK];
    L.shafts = S.post.shafts; L.sat = S.post.sat; L.exposure = 1; L.stars = S.post.stars; L.sunVis = S.sunVis; L.rain = S.post.rain || 0;
    return L;
  }
  /* (the mist of a twilight waypoint) colours to the twilight's horizon colour T, at a third of their contrast about
     their family's mean (mm) (the land's paint at MIST_PK of it, MIST_PL under T: the land under the sky, as at night),
     their colour 0.3 their own and 0.7 T's (tod fix round, the judges' defect 5: at 0.7 their own, golden's orange sand
     came down to L 0.5 as brown) */
  var MIST_PL = -0.30, MIST_PK = 0.6, MIST_C = 0.3, MIST_CL = 0.02;   // (tod fix3, problem 2: MIST_PL -0.30, was -0.13: the near land well under the twilight from the start of a crossing half (SKY_PKF) while the thick mist (TW_FOG) dissolves the far land into the horizon: the frame keeps its body (golden>afterglow's std 0.054-0.059 at 393x852 and 1440x900, was 0.012) and the stack's ground stays even (0.014-0.047 in the band))   // (MIST_CL: the cloud's over T; was -0.02: the cloud body as drawn (its ambient's 0.9, its edges) came out 0.035-0.047 under the sky about it at the crossing)
  function mistLab(l, T, mm, out, paint) { out[0] = T[0] + (paint ? MIST_PL + MIST_PK * (l[0] - mm) : MIST_CL + 0.3 * (l[0] - mm)); out[1] = MIST_C * l[1] + (1 - MIST_C) * T[1]; out[2] = MIST_C * l[2] + (1 - MIST_C) * T[2]; return out; }
  /* (tod fix round, defect 5) a twilight stop's hue kept out of the ochres: a warm hue (about 55, the two skies'
     horizons' mean) turned to rose (355) by how near it is, so the band under the words is rose or violet, never olive */
  function twHue(h) { var d = Math.abs(angd(h, 55)), wv = d < 60 ? ss01(1 - d / 60) : 0; return h + wv * angd(355, h); }
  function wayRaw(RA, RB, K, tw, far, up) {
    var L = {}, k, j;
    for (k in RA) {
      var a = RA[k], b = RB[k];
      if (SKY_COLK.indexOf(k) >= 0) L[k] = linA(midLab(labA(a), labA(b)));
      else if (k === 'sky') { L.sky = []; for (j = 0; j < 6; j++) L.sky.push(linA(midLab(labA(a[j]), labA(b[j])))); }
      else if (k === 'fogB') L.fogB = [linA(midLab(labA(a[0]), labA(b[0]))), (a[1] + b[1]) / 2];
      else if (typeof a === 'number') L[k] = (a + b) / 2;
      else if (a && a.length !== undefined && typeof a[0] === 'number') { L[k] = []; for (j = 0; j < a.length; j++) L[k].push((a[j] + b[j]) / 2); }
      else L[k] = cpv(a);
    }
    L.sunDir = Array.prototype.slice.call(RA.sunDir);
    if (tw) {
      var sky = [];
      for (j = 0; j < 6; j++) { var m = labA(L.sky[j]), ch = Math.hypot(m[1], m[2]), c2 = Math.max(0.7 * ch, 0.045), th = ch > 0.012 ? twHue(Math.atan2(m[2], m[1]) / DEG) : 305; sky.push([TW_L[j], c2 * Math.cos(th * DEG), c2 * Math.sin(th * DEG)]); }
      var T = sky[1], f = up ? 1.12 : 0.8, Tl = linA(T), mm = 0, cl = [], o = [0, 0, 0];
      L.sky = sky.map(linA);
      L.skyK[0] = 0; L.skyK[2] = 0; L.glow = [0, L.glow[1], 0, L.glow[3]]; L.hi[0] = 0; L.shafts = 0;
      L.bloom[2] = Math.min(L.bloom[2], 0.3 * (K.bloom ? K.bloom[2] : LDEF.bloom[2])); L.sunVis = 0; L.stars *= 0.25;
      L.sunC = scl(L.sunC, 0.4 * f); L.ambU = scl(L.ambU, 0.6 * f); L.ambD = scl(L.ambD, 0.55 * f);
      var kf = K.fog || LDEF.fog, kh = K.haze || LDEF.haze; L.fog[0] = kf[0] * TW_FOG; L.fog[3] = kf[3] * TW_FOG; L.haze[0] = kh[0] * TW_HAZE;   // (tod fix3, problem 2: the twilight's mist from the kit's own air (was the two skies' mean x TW_FOG, so the mist's own fog x4 carried in), thick: the far land and a far mesa dissolve into the twilight's horizon while the near land keeps its darkness (MIST_PL), so the frame keeps its body and the stack's ground stays even)
      L.hazeC = Tl.slice(); L.hazeW = Tl.slice(); L.fogB = [Tl.slice(), L.fogB[1]]; L.skyW = Tl.slice(); L.glowC = Tl.slice();
      for (j = 0; j < SKY_CLOUDK.length; j++) { cl.push(labA(L[SKY_CLOUDK[j]])); mm += cl[j][0] / SKY_CLOUDK.length; }
      for (j = 0; j < SKY_CLOUDK.length; j++) L[SKY_CLOUDK[j]] = linA(mistLab(cl[j], T, mm, o));
    }
    if (far) {   // (through the mist: the live's "through the cloud", the world's way: no white cover)
      if (!tw) { L.fog[0] *= FAR_FOG; L.fog[3] *= FAR_FOG; L.haze[0] *= FAR_HAZE; } L.haze[2] *= 0.5;   // (fix3: a twilight's mist is its own: the far multipliers on top flattened mist>moonlit to the cover bar) if (!tw) L.hi[0] = Math.min(1, L.hi[0] + 0.2); L.shafts *= 0.5;   // (a twilight keeps no veil: it is even)
      var cf = [], mf = 0;
      for (j = 0; j < SKY_CLOUDK.length; j++) { cf.push(labA(L[SKY_CLOUDK[j]])); mf += cf[j][0] / SKY_CLOUDK.length; }
      for (j = 0; j < SKY_CLOUDK.length; j++) { cf[j][0] = mf + 0.6 * (cf[j][0] - mf); L[SKY_CLOUDK[j]] = linA(cf[j]); }
    }
    return L;
  }
  /* a prepared set's OKLab (as worldLights' were), and its sky's mean light (stops 0-58 deg) */
  function skyLabSet(A) {
    var o = {}, i; LKC.forEach(function (k) { o[k] = lin2lab(A[k]); });
    o.skyFlat = new Float32Array(18); o.mL = 0;
    for (i = 0; i < 6; i++) { var c = lin2lab([A.skyFlat[i * 3], A.skyFlat[i * 3 + 1], A.skyFlat[i * 3 + 2]]); o.skyFlat[i * 3] = c[0]; o.skyFlat[i * 3 + 1] = c[1]; o.skyFlat[i * 3 + 2] = c[2]; if (i > 0) o.mL += c[0] / 5; }
    o.fogB = lin2lab([A.fogBf[0], A.fogBf[1], A.fogBf[2]]);
    o.fam = {}; for (var f in SKY_FAM) { var m = 0; for (i = 0; i < SKY_FAM[f].length; i++) m += o[SKY_FAM[f][i]][0] / SKY_FAM[f].length; o.fam[f] = m; }
    return o;
  }
  /* (tod) the colour families whose contrast is structure: the cloud's lit, shade, deep and rim (a tower behind the
     name), the haze toward the light and away, the ambient from above and below: each family's mean light rides the light
     clock with the sky's, each colour's offset from it the structure clock, so the ground under the words is as even as
     the sky about them as the light crosses the inks' band (the first coarse film: the tower behind the name kept half
     golden's lit-to-shade contrast at the crossing, the stack's ground 0.11 L from its tenth to its ninetieth) */
  var SKY_FAM = { cl: ['clLit', 'clShade', 'clDeep', 'clRim'], hz: ['hazeC', 'hazeW'], amb: ['ambU', 'ambD'] }, SKY_FAMOF = { clLit: 'cl', clShade: 'cl', clDeep: 'cl', clRim: 'cl', hazeC: 'hz', hazeW: 'hz', ambU: 'amb', ambD: 'amb' };
  /* the paint: a role's transform of an OKLab colour (L x kL, capped or floored; C x kC; the hue pulled toward h) */
  function trRole(p, l, out) {
    if (p[0] === 1 && p[1] === 1 && p[3] === 0 && p.length < 5) { out[0] = l[0]; out[1] = l[1]; out[2] = l[2]; return out; }
    var L = l[0] * p[0], C = Math.hypot(l[1], l[2]) * p[1], h = Math.atan2(l[2], l[1]) / DEG;
    if (p.length > 4) L = Math.max(Math.min(L, p[4]), p[5]);
    h += p[3] * angd(p[2], h);
    out[0] = L; out[1] = C * Math.cos(h * DEG); out[2] = C * Math.sin(h * DEG);
    return out;
  }
  var TRS = [[0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0]];
  /* a creature's colour (a flock's lit or shade) or a particle's through a sky: creatures keep their own light but the
     night's (x crK, at most crCap: the white birds pale and moonlit, the dunes' birds silhouettes), the lit role's
     chroma and hue; particles take the lit role whole. A waypoint: the two skies' midpoint, in its mist at a twilight */
  function trCr(O, l, out, part) {
    if (O.wA) {
      var a = trCr(O.wA, l, TRS[0], part), b = trCr(O.wB, l, TRS[1], part);
      out[0] = (a[0] + b[0]) / 2; out[1] = (a[1] + b[1]) / 2; out[2] = (a[2] + b[2]) / 2;
      if (O.tw) mistLab(out, O.T, O.mm, out, part);   // (a particle is the land's: under the sky with it)
      return out;
    }
    var p = O.sky.paint.lit;
    if (part) return trRole(p, l, out);
    if (O.crId) { out[0] = l[0]; out[1] = l[1]; out[2] = l[2]; return out; }
    trRole([1, p[1], p[2], p[3]], l, out); out[0] = Math.min(l[0] * O.crK, O.crCap);
    return out;
  }
  function skyFinish(O) {
    O.d = prepOne(cpRaw(O.rawD)); O.a = prepOne(cpRaw(O.rawA)); O.dl = skyLabSet(O.d); O.al = skyLabSet(O.a);
    O.mD = O.dl.mL; O.mA = O.al.mL; O.mR = (O.mD + O.mA) / 2;
  }
  /* a sky's own: its two kits' sets, its paint (OKLab per slot, and the whole uP array as drawn in its hold), its amounts */
  function skyObj(id) {
    if (SKY.sets[id]) return SKY.sets[id];
    var S = WSKY[id], V = SKY.V, O = { id: id, w: S.w, sky: S, g: S.g }, s, j, o = [0, 0, 0];
    O.rawD = skyRaw(S, V.lightRaw, V.light.sunDir); O.rawA = skyRaw(S, V.lightRawB, V.light.sunDir);
    skyFinish(O);
    O.pLab = new Float32Array(72); O.pLin = new Float32Array(V.paramsBase);
    var mm = 0, nm = 0;
    for (s = 0; s < 18; s++) {
      var r = ROLE_SLOT[s], B = SKY.baseLab[s];
      if (!r) continue;
      if (r === 'sea') { O.pLab[s * 3] = S.seaLit === undefined ? 1 : S.seaLit; O.pLin[s * 4] = O.pLin[s * 4 + 1] = O.pLin[s * 4 + 2] = O.pLab[s * 3]; continue; }
      if (r === 'sheen') {   // (the sheen: lit's transform of its colour before its own x0.3, then the x0.3 again)
        var sb = SKY.sheenLab; trRole(S.paint.lit, sb, o); var sl = lab2linA(o[0], o[1], o[2]), sv = labA(scl(sl, 0.3));
        O.pLab[s * 3] = sv[0]; O.pLab[s * 3 + 1] = sv[1]; O.pLab[s * 3 + 2] = sv[2];
      } else { trRole(S.paint[r], B, o); O.pLab[s * 3] = o[0]; O.pLab[s * 3 + 1] = o[1]; O.pLab[s * 3 + 2] = o[2]; mm += o[0]; nm++; }
      if (S.kit) continue;   // ('fair': the kits' own paint, bit for bit)
      labTo(O.pLin, s * 4, O.pLab[s * 3], O.pLab[s * 3 + 1], O.pLab[s * 3 + 2]);
    }
    O.mm = mm / Math.max(nm, 1);
    var light = S.w === 'light';
    O.crK = light ? 0.5 : 1; O.crCap = light ? 0.5 : 99;
    O.crId = !light && S.paint.lit[1] === 1 && S.paint.lit[3] === 0;
    O.ceil = S.ceil; O.seaLit = S.seaLit === undefined ? 1 : S.seaLit; O.sunVis = S.kit ? 1 : S.sunVis;
    O.skyEl = S.kit ? null : S.skyEl;
    O.motes = S.post && S.post.motes !== undefined ? S.post.motes : light ? 0 : 1;
    O.grainK = light ? 0.45 : 1; O.ribK = light ? 0.5 : 1;   // (the sand's grains and veils at night: x0.45 and x0.5 of the paint's colour, so a speck near the eye is no lamp against the night sky)
    var fx = S.fx || {};
    O.fx = [fx.belt || 0, fx.nlc || 0, fx.galaxy || 0, fx.aurora || 0, fx.moon ? 1 : 0, fx.curtain || 0, 0, 0];
    O.dir = O.skyEl === null ? Array.prototype.slice.call(V.light.sunDir) : dirAzEl(V.light.sunAz, O.skyEl);
    SKY.sets[id] = O;
    return O;
  }
  /* a change's waypoint (the live's way(A, B, far)): the two skies' midpoint, every event at a quarter; between skies of
     different words the twilight (even, well below the crossing, no warmth, glow, veil, ray or event, the sun gone, the
     land and the cloud in its mist); through the mist where the two are not neighbours */
  function skyWay(a, b, far) {
    var key = a + '>' + b + (far ? '*' : '');
    if (SKY.sets[key]) return SKY.sets[key];
    var A = skyObj(a), B = skyObj(b), V = SKY.V, tw = A.w !== B.w, up = A.w === 'dark', O = { id: key, w: null, wA: A, wB: B, tw: tw, far: far, g: A.g }, s, j;
    O.rawD = wayRaw(A.rawD, B.rawD, V.lightRaw, tw, far, up); O.rawA = wayRaw(A.rawA, B.rawA, V.lightRawB, tw, far, up);
    skyFinish(O);
    O.T = tw ? labA(O.rawD.sky[1]) : null;
    O.pLab = new Float32Array(72); O.pLin = new Float32Array(V.paramsBase);
    var mm = 0, nm = 0, o = [0, 0, 0];
    for (s = 0; s < 18; s++) { var r = ROLE_SLOT[s]; if (!r) continue; for (j = 0; j < 3; j++) O.pLab[s * 3 + j] = (A.pLab[s * 3 + j] + B.pLab[s * 3 + j]) / 2; if (r !== 'sea' && r !== 'sheen') { mm += O.pLab[s * 3]; nm++; } }
    O.mm = mm / Math.max(nm, 1);
    for (s = 0; s < 18; s++) {
      var r2 = ROLE_SLOT[s]; if (!r2) continue;
      if (r2 === 'sea') { O.pLin[s * 4] = O.pLin[s * 4 + 1] = O.pLin[s * 4 + 2] = O.pLab[s * 3]; continue; }
      if (tw) { mistLab([O.pLab[s * 3], O.pLab[s * 3 + 1], O.pLab[s * 3 + 2]], O.T, O.mm, o, true); O.pLab[s * 3] = o[0]; O.pLab[s * 3 + 1] = o[1]; O.pLab[s * 3 + 2] = o[2]; }
      labTo(O.pLin, s * 4, O.pLab[s * 3], O.pLab[s * 3 + 1], O.pLab[s * 3 + 2]);
    }
    O.ceil = tw ? Math.min(A.ceil, B.ceil) : (A.ceil + B.ceil) / 2; O.seaLit = (A.seaLit + B.seaLit) / 2; O.sunVis = 0; O.skyEl = null;
    O.motes = tw ? 0 : (A.motes + B.motes) / 2; O.grainK = (A.grainK + B.grainK) / 2; O.ribK = (A.ribK + B.ribK) / 2;
    O.fx = []; for (j = 0; j < 8; j++) O.fx.push(tw ? 0 : (A.fx[j] + B.fx[j]) / 2 * 0.25);
    O.dir = A.dir;
    SKY.sets[key] = O;
    return O;
  }
  /* ---- the order (the live's pushSky and nextSky, on the world's streams) */
  function skyInit(V) {
    SKY.V = V; SKY.seed = J.seed; SKY.hour = HOUR; SKY.sets = {}; SKY.seq = []; SKY.visits = {}; SKY.streak = 0; SKY.i = -1; SKY.pair = ''; SKY.e = null; SKY.X = null; SKY.Y = null;
    SKY.rO = RNG(subseed(J.seed, 41)); SKY.rV = RNG(subseed(J.seed, 42));
    SKY.dt = DEVMODE && OPT.skyDt !== null && isFinite(+OPT.skyDt) ? +OPT.skyDt : 0;   // (dev: the cycle's clock this far ahead of the flight's)
    SKY.ids = Object.keys(WSKY).filter(function (id) { return WSKY[id].ph <= SKY_PHASE; });
    SKY.land = {};
    SKY.ids.forEach(function (id) { var S = WSKY[id]; if (S.land) (SKY.land[S.g] = SKY.land[S.g] || []).push(id); });
    SKY.baseLab = []; for (var s = 0; s < 24; s++) SKY.baseLab.push(labA([V.paramsBase[s * 4], V.paramsBase[s * 4 + 1], V.paramsBase[s * 4 + 2]]));
    SKY.sheenLab = labA(scl([V.paramsBase[32], V.paramsBase[33], V.paramsBase[34]], 1 / 0.3));
    var g = SKY.land[HOUR] ? HOUR : 'day', at = parseFloat(attr('data-sky-at'));   // (the hour's script writes it at load)
    if (!(at >= 0 && at <= 1)) at = 0.5;
    var open = DEVMODE && OPT.skyScene && WSKY[OPT.skyScene] && SKY.ids.indexOf(OPT.skyScene) >= 0 ? OPT.skyScene : null;
    if (!open) open = SKY.land[g][Math.floor(SKY.rO.f() * SKY.land[g].length)];
    skyPush(open);
    SKY.seq[0].at = -SKY.seq[0].hold * at * 0.9;
    SKY.landing = { hour: HOUR, group: g, at: at, sky: open };
    SKY.moonSide = SKY.rV.sign();   // (the visit's own: the moon's side of the key light)
    /* (phase 2) the visit's own: the galaxy's lie (the live's: of 24 poles drawn, the one whose band crosses most of the
       landing's view low, its core the lowest point of the band there), the aurora's phase and base */
    var h0 = RNG(subseed(J.seed, 77)).r(0, 2 * PI), fw = [Math.sin(h0), 0, Math.cos(h0)], best = null, bn = -1, i, j;
    for (i = 0; i < 24; i++) {
      var P = dirAzEl(SKY.rV.r(-180, 180), SKY.rV.r(15, 60)), U = norm(cross(P, [0, 1, 0])), W = cross(P, U), nn = 0, lo = 99, core = null;
      for (j = 0; j < 90; j++) { var a = j / 90 * 2 * PI, g = [U[0] * Math.cos(a) + W[0] * Math.sin(a), U[1] * Math.cos(a) + W[1] * Math.sin(a), U[2] * Math.cos(a) + W[2] * Math.sin(a)], e = Math.asin(clamp(g[1], -1, 1)) / DEG;
        if (dot(g, fw) > 0.85 && e > 4 && e < 34) { nn++; if (e < lo) { lo = e; core = g; } } }
      if (nn > bn) { bn = nn; best = { pole: P, core: core || U }; }
    }
    SKY.gal = best; SKY.aur = { ph: SKY.rV.f() * 6.2832, base: 5 + 3 * SKY.rV.f() };
    SKY.gen++;
  }
  function skyPush(id) {
    var S = WSKY[id], seq = SKY.seq, prev = seq[seq.length - 1], r = SKY.rO;
    SKY.visits[id] = (SKY.visits[id] || 0) + 1;
    seq.push({ id: id, at: prev ? prev.at + prev.hold + prev.move : 0, hold: S.hold * (0.9 + 0.25 * r.f()), move: 55 + 5 * r.f(), far: false, n: seq.length, warp: [null, null], cross: [false, false], dark: [0, 0] });
  }
  function skyNext() {
    var seq = SKY.seq, last = seq[seq.length - 1], r = SKY.rO, recent = [], c = [], w = [], sum = 0, i, x, id;
    for (i = Math.max(0, seq.length - SKY_RECENT); i < seq.length; i++) recent.push(seq[i].id);
    var far = r.f() < SKY_FAR, pool = far ? SKY.ids : WSKY[last.id].near;
    for (i = 0; i < pool.length; i++) if (SKY.ids.indexOf(pool[i]) >= 0 && recent.indexOf(pool[i]) < 0) c.push(pool[i]);
    if (!c.length) for (i = 0; i < SKY.ids.length; i++) if (SKY.ids[i] !== last.id) c.push(SKY.ids[i]);
    for (i = 0; i < c.length; i++) { var v = 1 / (1 + 2 * (SKY.visits[c[i]] || 0)); if (SKY.streak >= 4 && WSKY[c[i]].w !== WSKY[last.id].w) v *= 4; w.push(v); sum += v; }
    x = r.f() * sum;
    for (i = 0; i < c.length - 1 && x >= w[i]; i++) x -= w[i];
    id = c[i];
    if (DEVMODE && seq.length === 1 && OPT.skyNext && SKY.ids.indexOf(OPT.skyNext) >= 0 && OPT.skyNext !== last.id) id = OPT.skyNext;   // (dev: the first change's sky forced)
    last.far = WSKY[last.id].near.indexOf(id) < 0;
    SKY.streak = WSKY[id].w === WSKY[last.id].w ? SKY.streak + 1 : 1;
    skyPush(id);
  }
  /* ---- the quick crossing: a half of a change whose sky's mean light (stops 0-58 deg, the two kits' mean, a pure
     function of the two skies: no words input) crosses the gap where neither ink meets both bars (OKLab L 0.562-0.654)
     is warped (its progress u -> x) so the gap takes CROSS_T s and the rest of the half keeps its length; the warp's
     knots blended over +-WARP_D s (its rate a moving average: no step in it) */
  function skyCross(X, Y) { return Math.min(X.mR, Y.mR) < GAP_L[0] && Math.max(X.mR, Y.mR) > GAP_L[1]; }   // (the half's light crosses the band)
  /* (fix round, defects 5 and 11) where a crossing half's structure is gone (the first half, into the twilight: by
     SKY_EVEN of the way to the band's bright edge) or comes back (the second, out of it: from SKY_EVEN past it), in the
     half's own progress x: the ground under the words is even while any of it is in the inks' band, and the change has
     its structure the rest of the time (was a fixed 1.8 x on both halves) */
  /* (fix round, defects 8 and 11) the band's dark edge in the half's x: the waypoint's land (MIST_PL under its sky) comes
     only past it (into the twilight) and goes before it (out of it), so the ground under the words (the far mesa behind
     the credit) is even while the light crosses the band, and the twilight frame has its land under its sky */
  function skyEdgeD(X, Y) { return Math.min(Math.max(invSs(clamp((GAP_L[0] - X.mR) / (Y.mR - X.mR), 0, 1)), 0.05), 0.95); }
  function skyEdge(X, Y, half) { var x1 = invSs(clamp((GAP_L[1] - X.mR) / (Y.mR - X.mR), 0, 1)); return half ? Math.min(x1 + (1 - x1) * (1 - SKY_EVEN), 0.95) : Math.max(x1 * SKY_EVEN, 0.05); }
  function skyWarp(X, Y, half) {
    var r0 = X.mR, r1 = Y.mR;
    if (!skyCross(X, Y)) return null;
    var qa = (GAP_L[1] - r0) / (r1 - r0), qb = (GAP_L[0] - r0) / (r1 - r0); if (qa > qb) { var t0 = qa; qa = qb; qb = t0; }
    var xa = invSs(qa), xb = invSs(qb), tg = CROSS_T / half;
    if (xb - xa <= tg) return null;
    var W = warpMk(xa, xb, tg, half), it;
    for (it = 0; it < 8; it++) W = warpMk(xa, xb, W.xc * tg / Math.max(warpInv(W, xb) - warpInv(W, xa), 1e-6), half);   // (the blended knots lengthen the crossing: its own length set so the gap, as drawn, takes CROSS_T)
    return W;
  }
  function warpMk(xa, xb, xc, half) { var s = (1 - xc) / (1 - (xb - xa)); return { u1: xa * s, xa: xa, xc: xc, xb: xb, s: s, d: WARP_D / half }; }
  function warpInv(W, x) { var lo = -W.d, hi = 1 + W.d; for (var i = 0; i < 44; i++) { var m = (lo + hi) / 2; if (warpAt(W, m) < x) lo = m; else hi = m; } return (lo + hi) / 2; }
  function invSs(q) { var lo = 0, hi = 1; for (var i = 0; i < 40; i++) { var m = (lo + hi) / 2; if (ss01(m) < q) lo = m; else hi = m; } return (lo + hi) / 2; }
  function warpInt(W, u) {   // its integral from 0 (for the moving average)
    var a = W.u1, b = W.u1 + W.xc, v = 0, p;
    if (u <= a) return u * u / (2 * W.s);
    v = a * a / (2 * W.s);
    p = Math.min(u, b) - a; v += W.xa * p + p * p / (2 * W.xc) * (W.xb - W.xa);
    if (u <= b) return v;
    p = u - b; return v + W.xb * p + p * p / (2 * W.s);
  }
  function warpI(W, z) {   // the integral of the warp from 0 to z, the warp extended linearly past both ends (slope 1/s)
    if (z <= 0) return z * z / (2 * W.s);
    if (z <= 1) return warpInt(W, z);
    var p = z - 1; return warpInt(W, 1) + p + p * p / (2 * W.s);   // (the warp is 1 at the half's end)
  }
  function warpAt(W, u) { if (!W) return u; var d = W.d; return (warpI(W, u + d) - warpI(W, u - d)) / (2 * d); }
  /* ---- the cycle at t: the change under way (or the hold), its waypoint, the two sets on show and the two clocks */
  function skyAt(t) {
    var seq = SKY.seq, i;
    while (seq[seq.length - 1].at < t + 30) skyNext();
    i = seq.length - 2;
    while (i > 0 && seq[i].at > t) i--;
    var e = seq[i], A = skyObj(e.id), B = skyObj(seq[i + 1].id), k = clamp((t - e.at - e.hold) / e.move, 0, 1);
    var tw = A.w !== B.w, X, Y, q, qs, x, half = 0;
    if (tw || e.far) {
      var C = e.way || (e.way = skyWay(e.id, seq[i + 1].id, e.far)), hf = e.move / 2;   // (found once a change: no key built a frame)
      half = k < 0.5 ? 0 : 1;
      var u = half ? 2 * k - 1 : 2 * k;
      X = half ? C : A; Y = half ? B : C;
      if (e.warp[half] === null) { e.warp[half] = skyWarp(X, Y, hf) || 0; e.cross[half] = skyCross(X, Y) ? skyEdge(X, Y, half) : 0; e.dark[half] = e.cross[half] ? skyEdgeD(X, Y) : 0; }
      x = clamp(warpAt(e.warp[half] || null, u), 0, 1);
      q = ss01(x);
      qs = !tw || !e.cross[half] ? q : half ? ss01((x - e.cross[half]) / (1 - e.cross[half])) : ss01(x / e.cross[half]);   // (the half that crosses the inks' band: even before its bright edge, and back only after it; the other: the structure with the light)
      SKY.cap = !!(tw && e.cross[half]);
      SKY.fb = tw && e.cross[half] ? ss01((X.mR + (Y.mR - X.mR) * q - FB_L[0]) / (FB_L[1] - FB_L[0])) : 0;   // (fix3: the low mist from the band's bright side on, a pure function of the two skies' light: no words input)
      SKYTWM[0] = TWM_A * SKY.fb * (X.wA ? 1 - qs : qs); SKYTWM[1] = Math.sin(TWM_E[0] * DEG); SKYTWM[2] = Math.sin(TWM_E[1] * DEG) - SKYTWM[1];   // (fix3: the low mist in the waypoint's share of the structure, as its land's darkness is)
      SKY.pk = !tw || !e.cross[half] ? 1 : Math.max(SKY_PKF, half ? ss01((e.dark[half] - x) / (SKY_PKW * e.dark[half])) : ss01((x - e.dark[half]) / (SKY_PKW * (1 - e.dark[half]))));   // (the waypoint's land under its sky only past the band's dark edge, there within SKY_PKW of the half's way)
    } else { X = A; Y = B; x = k; q = qs = ss01(k); SKY.pk = 1; SKY.cap = false; SKY.fb = 0; SKYTWM[0] = 0; }
    SKY.i = i; SKY.e = e; SKY.A = A; SKY.B = B; SKY.k = k; SKY.x = x; SKY.half = half; SKY.tw = tw; SKY.far = e.far;
    if (X !== SKY.X || Y !== SKY.Y) { SKY.pair = X.id + '|' + Y.id; SKY.X = X; SKY.Y = Y; SKY.gen++; }
    SKY.q = q; SKY.qs = qs;
    SKYI.turning = tw && k > 0 && k < 1; SKYI.want = B.w; SKYI.from = A.w; SKYI.id = e.n; SKYI.k = k;
    SKYI.words = k < 0.5 ? A.w : B.w; SKYI.sky = A.id; SKYI.next = B.id; SKYI.group = (k < 0.5 ? A : B).g;
  }
  /* from one direction to another (the live's arc: over the top where they face apart) */
  function skyArc(a, b, k, out) {
    var d = a[0] * b[0] + a[1] * b[1] + a[2] * b[2], m0 = a[0] + (b[0] - a[0]) * k, m1 = a[1] + (b[1] - a[1]) * k + Math.max(0, -d) * Math.sin(PI * k) * 0.6, m2 = a[2] + (b[2] - a[2]) * k;
    var n = Math.sqrt(m0 * m0 + m1 * m1 + m2 * m2) || 1; out[0] = m0 / n; out[1] = m1 / n; out[2] = m2 / n; return out;
  }
  /* ---- each step: the cycle, the four-way blend (two kits by place, two skies by time), the sky's own amounts, the paint */
  var SKW = { c: new Float64Array(4), s: new Float64Array(4), cb: new Float64Array([-1, -1, -1, -1]), sb: new Float64Array([-1, -1, -1, -1]), gen: -1 };
  var LKN_ST = { skyK: 1, glow: 1, haze: 1, fog: 1, hi: 1, bloom: 1, discK: 1 };   // (structure: on the structure clock)
  function skyStep(V, w) {
    if (SKY.seed !== J.seed || SKY.hour !== HOUR || SKY.V !== V) skyInit(V);
    skyAt(SIM.t + SKY.dt);
    var q = SKY.q, qs = SKY.qs, c = SKW.c, s = SKW.s, X = SKY.X, Y = SKY.Y;
    c[0] = (1 - w) * (1 - q); c[1] = w * (1 - q); c[2] = (1 - w) * q; c[3] = w * q;
    s[0] = (1 - w) * (1 - qs); s[1] = w * (1 - qs); s[2] = (1 - w) * qs; s[3] = w * qs;
    if (V.LA[0] !== X.d || V.LA[2] !== Y.d) { V.LA = [X.d, X.a, Y.d, Y.a]; V.LAlab = [X.dl, X.al, Y.dl, Y.al]; }
    blendSky(V);
    var L = V.L, A = SKY.A, B = SKY.B, k = SKY.k, f = SKY.tw ? 2.6 : 2, j;
    // the sun's disc fades where it stands (gone by the middle of a change; into or out of a twilight by 0.38, from 0.62)
    SKY.sunVis = A.sunVis * ss01(1 - f * k) + B.sunVis * ss01(f * k - (f - 1)); L.sunVis = SKY.sunVis;
    skyArc(A.dir, B.dir, k, SKY.skyS); L.skyS = SKY.skyS;
    SKY.ceil = X.ceil + (Y.ceil - X.ceil) * q; L.ceil = SKY.ceil;
    for (j = 0; j < 8; j++) SKY.fx[j] = X.fx[j] + (Y.fx[j] - X.fx[j]) * qs;
    SKY.fx[6] = X.motes + (Y.motes - X.motes) * qs; L.fx = SKY.fx;
    skyPaint(V);
    if (REC && SIM.t - SKY.recT >= 1) { SKY.recT = SIM.t; if (!REC.cycle) REC.cycle = []; if (REC.cycle.length < 4000) REC.cycle.push([+SIM.t.toFixed(1), A.id, B.id, +k.toFixed(3), +q.toFixed(3), +qs.toFixed(3), SKYI.group, SKYI.words, +SKY.ceil.toFixed(3)]); }
  }
  /* (tod fix3, problem 1 and the look's minor: a change into first light turned its tower grey (C 0.015), fair>golden half
     the frame silver-grey) two skies' colours blended by their chroma vectors (a, b) at q along the hue's arc, the chroma
     the two's own blended, never through the neutral axis: the hue moves by the chroma-weighted share of the way (a
     near-grey end lends no hue), along the shorter arc, unless the two are more than 100 deg apart and that arc crosses
     the greens (h 135): then the other way round, through the violets and roses (a blue sky into a gold one passes rose,
     as a dusk does, never teal). The light (L) is the caller's; q 0 and 1 are the ends exactly (a hold is drawn as before) */
  function abLong(a1, b1, a2, b2) {   // (the way round, from the two ends alone: the long way only for hues over 100 deg apart whose shorter arc crosses the greens)
    if (a1 * a1 + b1 * b1 < 1e-10 || a2 * a2 + b2 * b2 < 1e-10) return false;
    var h1 = Math.atan2(b1, a1) / DEG, d = angd(Math.atan2(b2, a2) / DEG, h1), e = ((135 - h1) % 360 + 360) % 360;
    return Math.abs(d) > 100 && (d > 0 ? e < d : 360 - e < -d);
  }
  function abMix(a1, b1, a2, b2, q, out, o, lw) {   // lw: the way round (abLong of the ends; given once a pair where the ends move with the place)
    if (q <= 0) { out[o] = a1; out[o + 1] = b1; return out; }
    if (q >= 1) { out[o] = a2; out[o + 1] = b2; return out; }
    var c1 = Math.sqrt(a1 * a1 + b1 * b1), c2 = Math.sqrt(a2 * a2 + b2 * b2), cw = (1 - q) * c1 + q * c2;
    if (c1 < 1e-5 || c2 < 1e-5) { out[o] = a1 + (a2 - a1) * q; out[o + 1] = b1 + (b2 - b1) * q; return out; }
    var h1 = Math.atan2(b1, a1) / DEG, d = angd(Math.atan2(b2, a2) / DEG, h1);
    if (lw) d -= d > 0 ? 360 : -360;
    var h = (h1 + q * c2 / cw * d) * DEG;
    out[o] = cw * Math.cos(h); out[o + 1] = cw * Math.sin(h); return out;
  }
  var ABO = [0, 0], ABX = [0, 0], ABL = new Uint8Array(32);   // (ABL: blendSky's way round per colour, decided once a pair)
  function skyAB(p0, p1, p2, p3, j, out, lw) {   // (the four-way blend's chroma: the kits by place (w) linearly within each sky, the two skies by time (q) through abMix)
    var wc = SKW.c, q = wc[2] + wc[3], w = wc[1] + wc[3], xa = p0[j] + (p1[j] - p0[j]) * w, xb = p0[j + 1] + (p1[j + 1] - p0[j + 1]) * w;
    return abMix(xa, xb, p2[j] + (p3[j] - p2[j]) * w, p2[j + 1] + (p3[j + 1] - p2[j + 1]) * w, q, out, 0, lw);
  }
  function blendSky(V) {
    var wc = SKW.c, ws = SKW.s, i, k, j, same = SKW.gen === SKY.gen;
    for (i = 0; i < 4; i++) if (Math.abs(wc[i] - SKW.cb[i]) > 1e-4 || Math.abs(ws[i] - SKW.sb[i]) > 1e-4) same = false;
    if (same) return;
    for (i = 0; i < 4; i++) { SKW.cb[i] = wc[i]; SKW.sb[i] = ws[i]; }
    if (SKW.gen !== SKY.gen) { var Bp = V.LAlab, jj; for (jj = 0; jj < LKC.length; jj++) ABL[jj] = abLong(Bp[0][LKC[jj]][1], Bp[0][LKC[jj]][2], Bp[2][LKC[jj]][1], Bp[2][LKC[jj]][2]) ? 1 : 0; for (jj = 0; jj < 6; jj++) ABL[20 + jj] = abLong(Bp[0].skyFlat[jj * 3 + 1], Bp[0].skyFlat[jj * 3 + 2], Bp[2].skyFlat[jj * 3 + 1], Bp[2].skyFlat[jj * 3 + 2]) ? 1 : 0; ABL[26] = abLong(Bp[0].fogB[1], Bp[0].fogB[2], Bp[2].fogB[1], Bp[2].fogB[2]) ? 1 : 0; }   // (fix3: each colour's way round decided once a pair, from the two skies' own sets: never switched mid-change by the place)
    SKW.gen = SKY.gen;
    var L = V.L, A = V.LA, B = V.LAlab, n = 4, eq = true;
    for (i = 0; i < 4; i++) if (wc[i] !== ws[i]) eq = false;
    for (j = 0; j < LKC.length; j++) {
      var key = LKC[j], a0 = 0, a1 = 0, a2 = 0;
      var fam = eq ? null : SKY_FAMOF[key];
      if (fam) for (i = 0; i < n; i++) { var cf = B[i][key], mf = B[i].mL; a0 += mf * wc[i] + (cf[0] - mf) * ws[i]; }   // (fix round, defect 11: each family colour's offset from its set's SKY mean rides the structure clock, so a tower is the sky's own light as the ground crosses the band; was the family's own mean: golden's tower stayed 0.05-0.06 under its sky at the crossing)
      else for (i = 0; i < n; i++) a0 += B[i][key][0] * wc[i];
      skyAB(B[0][key], B[1][key], B[2][key], B[3][key], 1, ABO, ABL[j]);   // (fix3: the chroma along the hue's arc)
      labTo(L[key], 0, a0, ABO[0], ABO[1]);
    }
    // the gradient: its mean light on the light clock, its shape (each stop's offset from the mean) on the structure clock
    for (k = 0; k < 6; k++) {
      var s0 = 0, s1 = 0, s2 = 0;
      if (eq) for (i = 0; i < n; i++) s0 += B[i].skyFlat[k * 3] * wc[i];
      else for (i = 0; i < n; i++) { var sg = B[i].skyFlat; s0 += B[i].mL * wc[i] + (sg[k * 3] - B[i].mL) * ws[i]; }
      skyAB(B[0].skyFlat, B[1].skyFlat, B[2].skyFlat, B[3].skyFlat, k * 3 + 1, ABO, ABL[20 + k]);
      labTo(L.skyFlat, k * 3, s0, ABO[0], ABO[1]);
    }
    var f0 = 0, f3 = 0; for (i = 0; i < n; i++) { f0 += B[i].fogB[0] * wc[i]; f3 += A[i].fogBf[3] * wc[i]; } skyAB(B[0].fogB, B[1].fogB, B[2].fogB, B[3].fogB, 1, ABO, ABL[26]); labTo(L.fogBf, 0, f0, ABO[0], ABO[1]); L.fogBf[3] = f3;
    for (j = 0; j < LKN.length; j++) { var kn = LKN[j], dst = L[kn], ww = LKN_ST[kn] ? ws : wc; for (k = 0; k < dst.length; k++) { var v = 0; for (i = 0; i < n; i++) v += A[i][kn][k] * ww[i]; dst[k] = v; } }
    for (j = 0; j < LKS.length; j++) { var ks = LKS[j], vs = 0, wk = ks === 'shafts' ? ws : wc; for (i = 0; i < n; i++) vs += A[i][ks] * wk[i]; L[ks] = vs; }
    var wl = Math.sqrt(L.windDir[0] * L.windDir[0] + L.windDir[1] * L.windDir[1]) || 1;
    L.wet[0] = L.rain; L.wet[1] = L.ripple; L.wet[2] = L.windDir[0] / wl; L.wet[3] = L.windDir[1] / wl;
  }
  /* the paint as drawn: each slot's light on the light clock with the sky's mean, its offset from it and its contrast on
     the structure clock (the land crosses the words' band with the sky); a hold's own paint whole, bit for bit */
  var SKP = { gen: -1, q: -1, qs: -1, pk: -1 }, PL = [0, 0, 0];
  function skyPaint(V) {
    var X = SKY.X, Y = SKY.Y, q = SKY.q, qs = SKY.qs, pf = V.paramsFlat, s;
    if (SKP.gen === SKY.gen && Math.abs(q - SKP.q) < 1e-4 && Math.abs(qs - SKP.qs) < 1e-4 && Math.abs(SKY.pk - SKP.pk) < 1e-4) return;
    SKP.gen = SKY.gen; SKP.q = q; SKP.qs = qs; SKP.pk = SKY.pk; SKY.pgen++;
    if (X === Y || (q === 0 && qs === 0)) { pf.set(X.pLin); return; }
    if (q === 1 && qs === 1) { pf.set(Y.pLin); return; }
    for (s = 0; s < 18; s++) {
      var r = ROLE_SLOT[s]; if (!r) continue;
      var a = X.pLab, b = Y.pLab, o = s * 3;
      if (r === 'sea') { pf[s * 4] = pf[s * 4 + 1] = pf[s * 4 + 2] = a[o] + (b[o] - a[o]) * q; continue; }
      var mx = s < 12 ? X.mD : X.mA, my = s < 12 ? Y.mD : Y.mA, mq = mx + (my - mx) * q;
      var lv = mq + (a[o] - mx) * (1 - qs) * (X.wA ? SKY.pk : 1) + (b[o] - my) * qs * (Y.wA ? SKY.pk : 1);
      if (SKY.cap) lv = Math.min(lv, X.wA ? b[o] : a[o]);   // (a crossing half: the land never lighter than its day sky's own, so the near sand under the links never brightens as the evening comes and the far mesa is even with the sky by the band)
      abMix(a[o + 1], a[o + 2], b[o + 1], b[o + 2], q, ABX, 0, abLong(a[o + 1], a[o + 2], b[o + 1], b[o + 2]));   // (fix3: the paint's chroma along the hue's arc too; its ends the two skies' own, constant through a change)
      labTo(pf, s * 4, lv, ABX[0], ABX[1]);
    }
  }
  /* a flock's or a particle's colour through the paint (cached on it for the paint's generation: no garbage a frame) */
  var TRX = [0, 0, 0], TRY = [0, 0, 0], TRL = [0, 0, 0];
  function skyTint(src, out, part, mR) {
    var X = SKY.X, Y = SKY.Y, q = SKY.q, qs = SKY.qs;
    if (!X || (X.crId && Y.crId && !part) || (part && X.sky && X.sky.kit && Y.sky && Y.sky.kit)) { out[0] = src[0]; out[1] = src[1]; out[2] = src[2]; return out; }
    var c0 = src[0], c1 = src[1], c2 = src[2], l = Math.cbrt(0.4122214708 * c0 + 0.5363325363 * c1 + 0.0514459929 * c2), m = Math.cbrt(0.2119034982 * c0 + 0.6806995451 * c1 + 0.1073969566 * c2), s = Math.cbrt(0.0883024619 * c0 + 0.2817188376 * c1 + 0.6299787005 * c2), lb = TRL;
    lb[0] = 0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s; lb[1] = 1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s; lb[2] = 0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s;   // (lin2lab's, in place: no array a call)
    trCr(X, lb, TRX, part); trCr(Y, lb, TRY, part);
    var mx = mR ? X.mR : X.mD, my = mR ? Y.mR : Y.mD, mq = mx + (my - mx) * q;
    var lv = mq + (TRX[0] - mx) * (1 - qs) * (X.wA ? SKY.pk : 1) + (TRY[0] - my) * qs * (Y.wA ? SKY.pk : 1);
    if (SKY.cap) lv = Math.min(lv, X.wA ? TRY[0] : TRX[0]);
    abMix(TRX[1], TRX[2], TRY[1], TRY[2], q, ABX, 0, abLong(TRX[1], TRX[2], TRY[1], TRY[2]));
    labTo(out, 0, lv, ABX[0], ABX[1]);
    return out;
  }
  function skyFlock(F) {
    var c = F._sky;
    if (!c) c = F._sky = { g: -1, lit: new Float32Array(3), shade: new Float32Array(3) };
    if (c.g !== SKY.pgen) { c.g = SKY.pgen; skyTint(F.lit, c.lit, false, true); skyTint(F.shade, c.shade, false, true); }
    return c;
  }
  function skyPart(pa, out, rib) {   // a particle set's colour (rgb) and opacity: grains and veils through the paint (and the night's own factor), the motes by the sky's own amount
    var c = pa._sky, X = SKY.X, Y = SKY.Y;
    if (!c) c = pa._sky = { g: -1, rgb: new Float32Array(3) };
    if (c.g !== SKY.pgen) { c.g = SKY.pgen; skyTint(pa.color, c.rgb, true, false); var f = rib ? X.ribK + (Y.ribK - X.ribK) * SKY.q : X.grainK + (Y.grainK - X.grainK) * SKY.q; c.rgb[0] *= f; c.rgb[1] *= f; c.rgb[2] *= f; }
    out[0] = c.rgb[0]; out[1] = c.rgb[1]; out[2] = c.rgb[2];
    var kd = pa.hop ? pa.hop[3] : 0;
    out[3] = pa.color[3] * (kd > 0.5 && kd < 2.5 ? SKY.fx[6] : 1);
    return out;
  }
  /* dev and the record: the cycle as it stands */
  function skyState() {
    if (!SKY.e) return null;
    return { sky: SKY.A.id, next: SKY.B.id, k: +SKY.k.toFixed(4), q: +SKY.q.toFixed(4), qs: +SKY.qs.toFixed(4), x: +SKY.x.toFixed(4), half: SKY.half, X: SKY.X.id, Y: SKY.Y.id,
      tw: SKY.tw, far: SKY.far, warp: SKY.e.warp.map(function (W) { return W ? { u1: +W.u1.toFixed(4), xa: +W.xa.toFixed(4), xb: +W.xb.toFixed(4), xc: +W.xc.toFixed(4), s: +W.s.toFixed(4) } : W; }),
      ceil: +SKY.ceil.toFixed(4), sunVis: +SKY.sunVis.toFixed(4), fx: Array.prototype.map.call(SKY.fx, function (v) { return +v.toFixed(3); }), skyS: Array.prototype.map.call(SKY.skyS, function (v) { return +v.toFixed(4); }),
      landing: SKY.landing, moon: { side: SKY.moonSide, az: SIM.V && SIM.V.light ? +(SIM.V.light.sunAz + 25 * (SKY.moonSide || 1)).toFixed(2) : null, el: +SKYN.el.toFixed(2), place: SKYN.place }, theme: THEME.hex, ink: { turning: SKYI.turning, want: SKYI.want, from: SKYI.from, id: SKYI.id, words: SKYI.words, group: SKYI.group }, dt: SKY.dt, phase: SKY_PHASE,
      seq: SKY.seq.slice(0, 40).map(function (e) { return [e.id, +e.at.toFixed(2), +e.hold.toFixed(2), +e.move.toFixed(2), e.far ? 1 : 0]; }) };
  }
  /* ---- the night's sky (SKY_BODY): the moon (a pale flat disc held under the ceiling, standing above the words where
     the window has room at the default pitch, else above the top edge, its light the key's), the belt, the wisps, the
     stars' twinkle (held under reduced motion) and their top */
  var CEIL_KNEE = 0.08, STAR_TOP_Y = 0.0911, MOON_R = 1.8, MOON_FOOT = 4.5, MOON_KEEP = 12;
  var SKYN = { moon: new Float32Array(4), moonC: new Float32Array(3), moonG: new Float32Array(3), night: new Float32Array(4), el: 30, at: '', aw: -1, ah: -1, ay: -1e9, place: null };
  function skyMoonPlace() {   // (composition: the one use of the words' boxes in the sky, as the words' rule allows)
    var V = SIM.V; if (!V || !OUT.h) return;
    var h = OUT.h, ty = FRT.tanY, p = basePitch(V);
    var y0 = WORDS[2] - WORDS[0] > 1 ? WORDS[1] : h * 0.3, yn = 1 - 2 * y0 / h;
    var el = function (y) { return Math.atan((1 - 2 * y / h) * ty) / DEG + p / DEG; };
    var top = el(0), st = el(y0), pxdeg = (h / 2) / ty * (1 + yn * ty * yn * ty) * DEG;
    var lo = st + MOON_FOOT + MOON_KEEP * (OUT.dpr || 1) / pxdeg, hi = top - MOON_R - 1;
    SKYN.el = lo <= hi ? (lo + Math.min(hi, lo + 8)) / 2 : top + MOON_FOOT;
    SKYN.place = { lo: +lo.toFixed(2), hi: +hi.toFixed(2), el: +SKYN.el.toFixed(2), top: +top.toFixed(2), stack: +st.toFixed(2), inView: lo <= hi };
  }
  function skyNightUniforms(P) {
    var V = SIM.V, fx = SKY.fx, u = P.u;
    if (!u.uMoon) return;
    if (!SKYN.c0 && V) { var MF = WSKY.moonlit.fx.moon; SKYN.moonC.set(lchA(MF.L)); SKYN.moonG.set(lchA(MF.glow)); SKYN.c0 = true; }   // (the moon's disc and glare: the moonlit sky's own table)
    if (OUT.w !== SKYN.aw || OUT.h !== SKYN.ah || Math.abs(WORDS[1] - SKYN.ay) > 0.05) { SKYN.aw = OUT.w; SKYN.ah = OUT.h; SKYN.ay = WORDS[1]; SKYN.at = OUT.w + 'x' + OUT.h + ':' + WORDS[1].toFixed(1); skyMoonPlace(); }
    if (V) { var ma = (V.light.sunAz + 25 * (SKY.moonSide || 1)) * DEG, me = SKYN.el * DEG; SKYN.moon[0] = Math.sin(ma) * Math.cos(me); SKYN.moon[1] = Math.sin(me); SKYN.moon[2] = Math.cos(ma) * Math.cos(me); }   // (dirAzEl's, written in place)
    else { SKYN.moon[0] = 0; SKYN.moon[1] = 1; SKYN.moon[2] = 0; }
    SKYN.moon[3] = fx[4];
    SKYN.night[0] = fx[0]; SKYN.night[1] = fx[1]; SKYN.night[2] = reduced() ? 0 : 1; SKYN.night[3] = STAR_TOP_Y;
    gl.uniform4fv(u.uMoon, SKYN.moon); gl.uniform3fv(u.uMoonC, SKYN.moonC); gl.uniform3fv(u.uMoonG, SKYN.moonG); gl.uniform4fv(u.uNight, SKYN.night);
    if (u.uGal) { var G = SKY.gal; gl.uniform4f(u.uGal, G.pole[0], G.pole[1], G.pole[2], fx[2]); gl.uniform4f(u.uGalC, G.core[0], G.core[1], G.core[2], 0); gl.uniform4f(u.uAur, 0, SKY.aur.ph, SKY.aur.base, fx[3]); }
  }
  /* ---- the browser's bars (theme-color): the drawn sky's colour on the window's top-centre ray, worked out on the CPU
     from the blended light as skyGrad and skyCol draw it (words-free), written into the page's own meta (an attribute:
     no DOM built) when it moves by 2 codes or more, at most twice a second of the flight's clock; at the first paint the
     hour's script's colour stands; when the canvas hides, the still sky's top (markStill) */
  var THEME = { t: -1e9, rgb: [-9, -9, -9], meta: null, n: 0, hex: '', f: [0, 0, 0], c: [0, 0, 0], v: [0, 0, 0] }, LUMA3 = [0.2126, 0.7152, 0.0722];
  function skyGmix(o, s, j, t) { for (var i = 0; i < 3; i++) o[i] += (s[j * 3 + i] - o[i]) * t; }
  function skyGradCPU(L, e, o) {
    var s = L.skyFlat, E = L.skyE, i;
    for (i = 0; i < 3; i++) o[i] = s[3 + i];
    if (e < 0) { skyGmix(o, s, 0, smooth(0, 14, -e)); return o; }
    skyGmix(o, s, 2, smooth(0, E[0], e)); skyGmix(o, s, 3, smooth(E[0], E[1], e)); skyGmix(o, s, 4, smooth(E[1], E[2], e)); skyGmix(o, s, 5, smooth(E[2], E[3], e));
    return o;
  }
  function skyTheme(force) {
    var V = SIM.V; if (!V || !V.L) return;
    var cf = CAM.f[0] * THEME.f[0] + CAM.f[1] * THEME.f[1] + CAM.f[2] * THEME.f[2];
    if (!force && SIM.t - THEME.t < 0.5 && THEME.n && cf > 0.9994) return;   // (at most twice a second of the flight's clock, or the view turned 2 deg)
    THEME.t = SIM.t; THEME.f[0] = CAM.f[0]; THEME.f[1] = CAM.f[1]; THEME.f[2] = CAM.f[2];
    if (THEME.meta === null) THEME.meta = document.querySelector('meta[name="theme-color"]') || false;
    if (!THEME.meta) return;
    var L = V.L, ty = FR.tanY, d0 = CAM.f[0] + CAM.u[0] * ty, d1 = CAM.f[1] + CAM.u[1] * ty, d2 = CAM.f[2] + CAM.u[2] * ty, n = Math.sqrt(d0 * d0 + d1 * d1 + d2 * d2) || 1;
    d0 /= n; d1 /= n; d2 /= n;
    var e = Math.asin(clamp(d1, -1, 1)) / DEG, c = skyGradCPU(L, e, THEME.c), S = L.skyS || L.sunDir, K = L.skyK;
    var hl = Math.sqrt(d0 * d0 + d2 * d2) || 1, sl = Math.sqrt(S[0] * S[0] + S[2] * S[2]) || 1, side = 0.5 + 0.5 * (d0 * S[0] + d2 * S[2]) / (hl * sl), low = Math.exp(-Math.max(e, 0) / K[1]), j;
    for (j = 0; j < 3; j++) { c[j] += (L.skyW[j] - c[j]) * K[0] * side * side * low; c[j] *= 1 - K[2] * (1 - side) * low; }
    var cs = Math.max(d0 * S[0] + d1 * S[1] + d2 * S[2], 0), g = L.glow[0] * Math.pow(cs, L.glow[1]) + L.glow[2] * Math.pow(cs, L.glow[3]);
    for (j = 0; j < 3; j++) c[j] += L.glowC[j] * g;
    // the ground haze over the sky (hazeSky, hazeCol) and the high veil's even paleness (veilMean), as SKY_BODY lays them
    var H = L.haze, hs = H[0] > 0 ? 1 - Math.exp(-H[0] * Math.exp(-H[2] / H[1]) * H[1] / Math.max(d1, 2e-3)) : 0, hcs = Math.max((d0 * S[0] + d2 * S[2]) / (hl * sl), 0), hw = hcs * hcs * hcs;
    for (j = 0; j < 3; j++) c[j] += ((L.hazeC[j] + (L.hazeW[j] - L.hazeC[j]) * hw) - c[j]) * hs;
    if (L.hi[0] > 0 && d1 > 0.01) { var vm = smooth(0.55 - L.hi[0], 0.95 - L.hi[0], 0.692) * L.hi[1] * smooth(0.01, 0.12, d1) * smooth(0, 0.05, L.hi[0]), fs = 1 + 1.5 * Math.pow(Math.max(cs, 0), 6); for (j = 0; j < 3; j++) c[j] += (L.hiC[j] * fs - c[j]) * vm; }
    var y0 = 0, rgb = THEME.v, hx = '#';
    for (j = 0; j < 3; j++) { c[j] *= L.exposure; y0 += c[j] * LUMA3[j]; }
    for (j = 0; j < 3; j++) rgb[j] = Math.round(clamp(agL2s(Math.max(y0 + (c[j] - y0) * L.sat, 0)), 0, 1) * 255);
    if (Math.max(Math.abs(rgb[0] - THEME.rgb[0]), Math.abs(rgb[1] - THEME.rgb[1]), Math.abs(rgb[2] - THEME.rgb[2])) < 2) return;
    for (j = 0; j < 3; j++) { THEME.rgb[j] = rgb[j]; hx += (rgb[j] < 16 ? '0' : '') + rgb[j].toString(16); }
    THEME.hex = hx; THEME.n++;
    THEME.meta.setAttribute('content', hx);
  }
  function skyThemeStill(group) { if (THEME.meta === null) THEME.meta = document.querySelector('meta[name="theme-color"]') || false; if (THEME.meta && SKYTOP[group]) { THEME.meta.setAttribute('content', SKYTOP[group]); THEME.rgb[0] = THEME.rgb[1] = THEME.rgb[2] = -9; THEME.hex = SKYTOP[group]; } }

  /* ---------------------------------------------------------------- cells: the endless world */
  /* A realm's things are generated per world cell, at one or two scales (a realm's layout.scales: [{ size, radius }]),
     each cell from the visit's salt and its own coordinates (the same cell is the same place whenever it is made). The
     streamer keeps the cells within each scale's radius about the camera (those ahead first), and frees those past
     1.3 radii (a cell is not made and freed again as the camera wanders at its edge). A cell's way to the screen:
       0  laid out: the realm's cell() places its items (landmarks), clouds, flocks and points of interest;
       1  probed: the ground under every item's footprint, read back (a pixel buffer and a fence: a few frames);
       2  resolved: each item seated on the lowest ground of its footprint; the clouds' lobes laid out on their seats;
          the obstacles (items' solids, the clouds' opaque cores) and the points of interest known (the flight and the
          autopilot read them from here on);
       3  meshed and uploaded (the items built a vertex budget a frame, one buffer a cell);
       4  ready: its clouds baked (a few dozen layers a frame), each fading in from the haze as it lands.
     Nothing is built in a frame past its budget, and a frame never waits on the GPU. */
  var VERT_BUDGET = 2500, LAYOUT_BUDGET = 2, RESOLVE_BUDGET = 2, CELLS_MAX = 220, VOL_BYTES_MAX = 24e6;
  /* detail: a big cell whose nearest point is farther than LOD_FAR when its landmarks are built gets the coarse build
     (lathes and grids at about half their segments, the same forms); within LOD_NEAR it is built again in full (the
     coarse mesh drawn until the full one is up) */
  var LOD_FAR = 1800, LOD_NEAR = 1500;
  function nearDist(C, x, z) { var dx = Math.max(Math.abs(x - C.cx) - C.size / 2, 0), dz = Math.max(Math.abs(z - C.cz) - C.size / 2, 0); return Math.sqrt(dx * dx + dz * dz); }
  function cellKey(sc, ix, iz) { return (sc * 65536 + (ix + 32768)) * 65536 + (iz + 32768); }
  function Cell(V, sc, ix, iz) {
    var L = V.def.layout.scales[sc];
    this.V = V; this.sc = sc; this.ix = ix; this.iz = iz; this.size = L.size; this.x0 = ix * L.size; this.z0 = iz * L.size;
    this.cx = this.x0 + L.size / 2; this.cz = this.z0 + L.size / 2; this.key = cellKey(sc, ix, iz);
    this.st = 0; this.items = []; this.clouds = []; this.flocks = []; this.pois = []; this.obst = []; this.vols = []; this.mesh = null; this.occ = null;
    this.places = []; this.glowG = []; this.beamL = []; this.inst = null; this.glowB = null; this.beamB = null;
    this.bound = new Float32Array([this.cx, 0, this.cz, L.size]); this.soft = null; this.softB = null; this.born = -1; this.prio = 0; this.job = null; this.bi = 0; this.B = null; this.gone = false;
    this.lod = 0; this.RB = null; this.rbi = 0; this.gen = null; this.rgen = null;
  }
  /* the cell handed to the realm's cell(): where it is, its stream, and the means to place things */
  function cellApi(C) {
    var V = C.V;
    return {
      V: V, scale: C.sc, ix: C.ix, iz: C.iz, x0: C.x0, z0: C.z0, size: C.size, salt: V.salt, hash: cellHash(C.ix, C.iz, (V.salt ^ (C.sc * 0x9e3779b9)) >>> 0),
      field: V.field, sun: V.light.sunDir,
      inside: function (x, z) { return x >= C.x0 && x < C.x0 + C.size && z >= C.z0 && z < C.z0 + C.size; },
      // a landmark: { kind, x, z, yaw (deg), foot (m: the footprint seated on its lowest ground), dy (m), air (y given),
      //   y, solid: [radius, height] (an obstacle: a cylinder over its seat), seed, ...the realm's own fields }
      add: function (it) { C.items.push(it); return it; },
      // a cloud: { kind, x, z, foot (to seat its base on the ground) or y (its base), ...the realm's fields }
      cloud: function (cl) { C.clouds.push(cl); return cl; },
      // creatures: { kind: 'bird' | 'ray', n, x, z, y or dy over the ground (or ref: an item, over its seat), orbit,
      //   wheel, size, flap, spread, drift [x, z], lit, shade }
      flock: function (f) { C.flocks.push(f); return f; },
      // a point of interest the autopilot may fly to: { x, z, y or dy (or ref), kind, interest (0-1), pass (m beside it),
      //   via: [x, z] (a point to pass first, e.g. a canyon's mouth), alt (the camera's clearance there), approach (deg:
      //   the bearing to come from, e.g. away from the sun) }
      poi: function (p) { C.pois.push(p); return p; },
      // an instance of one of the realm's sets (def.sets[set]: one mesh built once a visit), as many as the cell likes:
      //   { yaw (deg), scale (number or [x, y, z]), tilt: [about x, about z] (deg), dy (m), foot (m: seated on the
      //   lowest ground of a ring this wide; 0: the ground at its centre), air: true and y (in the air), ref (an item or a
      //   placement: over its seat), tint: [r, g, b], glow (its emission x this, default 1), bob: [m, period s], spin
      //   (deg/s), phase (0-1), solid: [radius, height, dx, dz] (an obstacle over its seat), sphere: [dy, radius] }
      place: function (set, x, z, o) { var q = o || {}; q.set = set; q.x = x; q.z = z; C.places.push(q); return q; },
      // glow sprites, a group of n: { n, pos: [x, y, z, ...] (y over the ground under each when ground is set, over the
      //   seat of ref when it is given, else the world's), size (m; a number or an array of n), color ([r, g, b] linear,
      //   HDR, or an array of 3n), px (the least size, px; 1.5), twinkle, pulse (0-1), rate (Hz), phase (array of n; else
      //   from the hash), drift (m; < 0: a fall down through that many m at rate m/s, again and again: a fall of light, a
      //   drip), bob (m), blink (the share of a cycle lit), far (m) }
      glows: function (g) { g.n = g.n || (g.pos ? g.pos.length / 3 : 0); if (g.n > 0) C.glowG.push(g); return g; },
      glow: function (o) { var g = { n: 1, pos: [o.x, o.y !== undefined ? o.y : (o.dy || 0), o.z], ground: o.y === undefined && !o.ref, ref: o.ref }; for (var k in o) if (!(k in g) && k !== 'x' && k !== 'y' && k !== 'z' && k !== 'dy') g[k] = o[k]; C.glowG.push(g); return g; },
      // a beam: { from: [x, y, z], to: [x, y, z] (the world's; or over the seat of ref, offsets from its place; or y over
      //   the ground at from's place when ground is set), r: radius (m) or [at from, at to], color [r, g, b] (linear,
      //   HDR), core (0-1), dust, shimmer (0-1), fade: [the share faded at its far end, at its start], wake: [radius m,
      //   delay s, draw-on s] (lit when the camera first comes within radius of from: drawn on from it) }
      beam: function (b) { C.beamL.push(b); return b; }
    };
  }
  /* the ground points to probe: each item's (and cloud's, flock's, poi's, placement's with a foot) centre and a ring at
     its footprint (9 points), a placement's or a beam's centre alone (1), each grounded glow sprite (1) */
  function anchorsOf(C) {
    var list = [], n = 0, i;
    function want(o, k) {
      if (o.landQ) { o.ai = n; o.an = 9; o.lq = true; list.push(o); n += 9; return; }   // (world6 fix: the land under a cloud-sea piece's footprint, for aboveKeep)
      if (o.air || o.y !== undefined || o.ref) return; o.ai = n; o.an = k; list.push(o); n += k;
    }
    for (i = 0; i < C.items.length; i++) want(C.items[i], 9);
    for (i = 0; i < C.clouds.length; i++) want(C.clouds[i], 9);
    for (i = 0; i < C.flocks.length; i++) want(C.flocks[i], 9);
    for (i = 0; i < C.pois.length; i++) want(C.pois[i], 9);
    for (i = 0; i < C.places.length; i++) want(C.places[i], C.places[i].foot > 0 ? 9 : 1);
    for (i = 0; i < C.glowG.length; i++) { var g = C.glowG[i]; if (g.ground && !g.ref) { g.ai = n; g.an = g.n; g.isG = true; list.push(g); n += g.n; } }
    for (i = 0; i < C.beamL.length; i++) { var bm = C.beamL[i]; if (bm.ground && !bm.ref) { bm.ai = n; bm.an = 1; bm.x = bm.from[0]; bm.z = bm.from[2]; list.push(bm); n += 1; } }
    var pts = new Float32Array(n * 2), q = 0;
    for (i = 0; i < list.length; i++) {
      var o = list[i];
      if (o.isG) { for (var k = 0; k < o.n; k++) { pts[q++] = o.pos[k * 3]; pts[q++] = o.pos[k * 3 + 2]; } continue; }
      var r = o.lq ? o.landQ : (o.foot || 0); pts[q++] = o.x; pts[q++] = o.z;
      if (o.an === 9) for (var j = 0; j < 8; j++) { var a = j / 8 * 2 * PI; pts[q++] = o.x + Math.cos(a) * r; pts[q++] = o.z + Math.sin(a) * r; }
    }
    C.alist = list;
    return pts;
  }
  function cellLayout(C, sync) {
    var V = C.V, api = cellApi(C);
    V.def.cell(api, RNG(api.hash), KITAPI);
    var pts = anchorsOf(C);
    C.job = pts.length ? probeJob(V, pts, pts.length / 2, 0, sync) : { done: true, h: new Float32Array(0) };
    C.st = 1;
  }
  function cellResolve(C) {
    var V = C.V, h = C.job.h, i, j;
    for (i = 0; i < C.alist.length; i++) {
      var o = C.alist[i], b = o.ai, m = h[b];
      if (o.isG) { o.gh = h.subarray(b, b + o.n); continue; }
      if (o.lq) { var mx = m; for (j = 1; j < 9; j++) mx = Math.max(mx, h[b + j]); o.landMax = mx; o.ground = h[b]; continue; }
      if (o.an === 9 && o.foot > 0) for (j = 1; j < 9; j++) m = Math.min(m, h[b + j]);
      o.seat = m + (o.dy || 0); o.ground = h[b];
    }
    C.job = null; C.alist = null;
    function yOf(o) { return o.y !== undefined ? o.y : o.ref ? o.ref.seat + (o.dy || 0) : o.seat; }
    // (world6 fix) the cloud sea's pieces only where its sea is up about them (aboveKeep), and the director's corridor
    // kept clear of the floating isles (corridorItem)
    // (world6 step B fix, defects 7 and 14: no held-line corridor: what is kept is the place's, whatever line is flown;
    // the floating pieces raised over the flight band instead)
    if (C.items.length) C.items = C.items.filter(function (it) { if (it.form) return true; if (!it.lq) return true; return aboveKeep(it); });
    for (i = 0; i < C.items.length; i++) {
      var ia = C.items[i]; if (!ia.air || !ia.spheres) continue;
      var lowS = 1e9; for (j = 0; j < ia.spheres.length; j += 4) lowS = Math.min(lowS, ia.spheres[j + 1] - ia.spheres[j + 3]);
      var btI = bandTopAt(ia.x, ia.z, ia.landMax), dI = btI - (ia.y + lowS);
      if (dI > 0) { ia.y += dI; BAND.isles++; }
    }
    if (C.pois.length) C.pois = C.pois.filter(function (p) { return !(p.ref && p.ref._drop); });
    if (C.flocks.length) C.flocks = C.flocks.filter(function (f) { return !(f.ref && f.ref._drop); });
    if (C.clouds.length) C.clouds = C.clouds.filter(function (cl) { return !cl.lq || aboveKeep(cl); });
    // obstacles: each solid item a cylinder over its seat
    for (i = 0; i < C.items.length; i++) {
      var it = C.items[i]; it.seat = it.air ? it.y : yOf(it);
      if (it.solid) C.obst.push({ c: 1, x: it.x + (it.solid[2] || 0), z: it.z + (it.solid[3] || 0), r: it.solid[0], y0: it.seat - 30, y1: it.seat + it.solid[1] });
      if (it.foot2) C.obst.push({ c: 1, x: it.x, z: it.z, r: it.foot2[0], y0: it.seat - 30, y1: it.seat + it.foot2[1] });   // (a rock's talus foot)
      if (it.spheres) for (j = 0; j < it.spheres.length; j += 4) C.obst.push({ c: 0, x: it.x + it.spheres[j], y: it.seat + it.spheres[j + 1], z: it.z + it.spheres[j + 2], r: it.spheres[j + 3] });
    }
    // clouds: their lobes laid out on their seats, prepared for baking; their cores are obstacles
    if (C.clouds.length) {
      var PF = new Puffs(), bodyCl = [];
      for (i = 0; i < C.clouds.length; i++) { var cl = C.clouds[i], nb0 = PF.bodies.length; cl.base = yOf(cl); V.def.cloud(cl, PF, RNG(cl.seed || (C.key + i * 7919) >>> 0), KITAPI); for (j = nb0; j < PF.bodies.length; j++) bodyCl[j] = cl; }
      // each body kept (not empty; out of the director's corridor), its volume prepared and its cores obstacles; its
      // visible body (its lobes) kept for the slip (a cost) and the mist about the eye (mistK), in the volumes' order
      var soft = [], softB = [];
      for (var bi = 0; bi < PF.bodies.length; bi++) {
        var bj0 = PF.bodies[bi].i0, bj1 = bi + 1 < PF.bodies.length ? PF.bodies[bi + 1].i0 : PF.count();
        if (bj0 >= bj1) continue;
        // (world6 step B fix, defect 7) the body lifted whole over the flight band (its lowest lobe's billows at the band's
        // top): its shape kept, its base floating over the sea as a cumulus's over a deck; never cut by the line flown
        var clb = bodyCl[bi], lowB = 1e9, cxB = 0, czB = 0;
        for (j = bj0; j < bj1; j++) { lowB = Math.min(lowB, PF.a[j * 12 + 1] - 1.3 * PF.a[j * 12 + 3]); cxB += PF.a[j * 12]; czB += PF.a[j * 12 + 2]; }
        cxB /= (bj1 - bj0); czB /= (bj1 - bj0);
        var btB = bandTopAt(cxB, czB, clb ? (clb.landMax !== undefined ? clb.landMax : clb.ground) : undefined), dB = btB - lowB;
        if (dB > 0) { for (j = bj0; j < bj1; j++) PF.a[j * 12 + 1] += dB; var Bb = PF.bodies[bi]; Bb.y0 += dB; Bb.y1 += dB; Bb.cy += dB; BAND.lifted++; BAND.liftM = Math.max(BAND.liftM, dB); }
        // (fix) its base flat at its lowest lobe's centre: seen from under it a cloud floats on its condensation level,
        // never on a hanging fringe of lobes (the film's first minute: a range's lobes hung over the dunes like a bunch)
        var ycB = 1e9; for (j = bj0; j < bj1; j++) ycB = Math.min(ycB, PF.a[j * 12 + 1]); PF.bodies[bi].base = ycB;
        var vb = volPrep(PF, bi, null, PF.bodies[bi].res || V.def.layout.volRes || 48); vb.out.kind = PF.bodies[bi].kind || 0; C.vols.push(vb);
        var cores = vb.out.cores;
        for (j = 0; j < cores.length; j += 4) C.obst.push({ c: 0, x: cores[j], y: cores[j + 1], z: cores[j + 2], r: cores[j + 3], cloud: true });
        var s0 = soft.length, lo = [1e9, 1e9, 1e9], hi = [-1e9, -1e9, -1e9];
        for (var q = bj0; q < bj1; q++) { soft.push(PF.a[q * 12], PF.a[q * 12 + 1], PF.a[q * 12 + 2], PF.a[q * 12 + 3]); for (var a3 = 0; a3 < 3; a3++) { lo[a3] = Math.min(lo[a3], PF.a[q * 12 + a3] - PF.a[q * 12 + 3]); hi[a3] = Math.max(hi[a3], PF.a[q * 12 + a3] + PF.a[q * 12 + 3]); } }
        var rb = Math.sqrt((hi[0] - lo[0]) * (hi[0] - lo[0]) + (hi[1] - lo[1]) * (hi[1] - lo[1]) + (hi[2] - lo[2]) * (hi[2] - lo[2])) / 2;
        var sbd = [(lo[0] + hi[0]) / 2, (lo[1] + hi[1]) / 2, (lo[2] + hi[2]) / 2, rb, s0, soft.length];
        softB.push(sbd); vb.out.soft = sbd; vb.out.cell = C;
      }
      C.soft = new Float32Array(soft); C.softB = softB;
    }
    // creatures and points of interest at their heights
    for (i = 0; i < C.flocks.length; i++) { var f = C.flocks[i]; f.at = [f.x, yOf(f), f.z]; f.set = flockOf(f); }
    for (i = 0; i < C.pois.length; i++) { var p = C.pois[i]; p.y = yOf(p); p.cell = C; p.id = C.key * 64 + i; }
    // the placements of the realm's sets (their seats, obstacles), the glow sprites and the beams, packed for the GPU
    resolvePlaces(C, yOf); resolveGlows(C); resolveBeams(C);
    // the cell's bound (for the frustum): its items' and clouds' extents
    var lo = [1e9, 1e9, 1e9], hi = [-1e9, -1e9, -1e9];
    function grow(x, y, z, r) { lo[0] = Math.min(lo[0], x - r); lo[1] = Math.min(lo[1], y - r); lo[2] = Math.min(lo[2], z - r); hi[0] = Math.max(hi[0], x + r); hi[1] = Math.max(hi[1], y + r); hi[2] = Math.max(hi[2], z + r); }
    for (i = 0; i < C.items.length; i++) { var q = C.items[i], rr = Math.max(q.foot || 0, q.solid ? q.solid[0] : 0, q.reach || 0, 20); grow(q.x, q.seat + (q.solid ? q.solid[1] * 0.5 : 0), q.z, rr + (q.solid ? q.solid[1] * 0.6 : 30)); }
    for (i = 0; i < C.vols.length; i++) { var o2 = C.vols[i].out; grow(o2.c[0], o2.c[1], o2.c[2], o2.r); }
    for (i = 0; i < C.places.length; i++) { var pl = C.places[i]; grow(pl.x, pl.seat + pl.cy, pl.z, pl.r); }
    if (C.glowB) { var gb = C.glowB.bound; grow(gb[0], gb[1], gb[2], gb[3]); }
    if (C.beamB) { var bb = C.beamB.bound; grow(bb[0], bb[1], bb[2], bb[3]); }
    if (lo[0] < 1e8) { C.bound[0] = (lo[0] + hi[0]) / 2; C.bound[1] = (lo[1] + hi[1]) / 2; C.bound[2] = (lo[2] + hi[2]) / 2; C.bound[3] = Math.sqrt((hi[0] - lo[0]) * (hi[0] - lo[0]) + (hi[1] - lo[1]) * (hi[1] - lo[1]) + (hi[2] - lo[2]) * (hi[2] - lo[2])) / 2; }
    else C.bound[3] = 0;
    C.st = 2;
    C.B = C.items.length ? new Builder(4096) : null; C.bi = 0;
    var sa = V.scanAt || [0, 0]; C.lod = C.sc === 0 && nearDist(C, sa[0], sa[1]) > LOD_FAR ? 1 : 0;
    if (C.B) C.B.lod = C.lod;
    V.poiGen = (V.poiGen || 0) + 1;
  }
  /* the landmarks built into a builder until the vertex budget is spent (an item whose build is a generator, a great
     temple, is built a part at a time, across frames); returns the vertices made. full: the rebuild in full detail
     of a coarse cell come near (its own builder, index and generator) */
  function buildItems(C, full, budget) {
    var V = C.V, B = full ? C.RB : C.B, k = full ? C.rbi : C.bi, gen = full ? C.rgen : C.gen, made = 0;
    while (B && k < C.items.length && made < budget) {
      var it = C.items[k], n0 = B.n, done = true;
      if (!gen) {
        B.place(it.x, it.seat, it.z, it.yaw || 0, !!it.air);
        var g = V.def.build(it, B, RNG(it.seed || ((C.key + k * 104729) >>> 0)), KITAPI);
        if (DEVMODE) it.nv = 0;
        if (g && typeof g.next === 'function') gen = g;
      }
      var parts = 0;
      if (gen) { done = false; while (made + B.n - n0 < budget) { parts++; if (gen.next().done) { done = true; gen = null; break; } } }
      made += B.n - n0; if (DEVMODE) { it.nv += B.n - n0; if (B.n - n0 > 2000) WORK.big = (WORK.big || '') + it.kind + (full ? '*' : '') + ':' + (B.n - n0) + '/' + parts + '/' + budget + ' '; }
      if (done) k++;
    }
    if (full) { C.rbi = k; C.rgen = gen; } else { C.bi = k; C.gen = gen; }
    return made;
  }
  function cellMesh(C, budget) { return buildItems(C, false, budget); }
  function cellUpload(C) {
    if (C.B && C.B.n) {
      C.mesh = uploadMesh(C.B, null);
      if (DEVMODE && DEVKEEP) C.pts = C.B.F.slice(0, C.B.n * 6);   // (dev: the vertices kept, for the clearance check)
    }
    C.B = null;
    // the opaque cores of its clouds: what stands behind them is never marched
    var occ = [];
    for (var i = 0; i < C.vols.length; i++) { var o = C.vols[i].out; if (!o.kind) for (var j = 0; j < o.cores.length; j++) occ.push(o.cores[j]); }
    if (occ.length) {
      C.occ = { vao: pTake('occ'), b: pTake('buf'), n: occ.length / 4 };
      gl.bindVertexArray(C.occ.vao);
      gl.bindBuffer(gl.ARRAY_BUFFER, ICO.vb); gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ARRAY_BUFFER, C.occ.b); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(occ), gl.STATIC_DRAW);
      gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 4, gl.FLOAT, false, 0, 0); gl.vertexAttribDivisor(1, 1);
      gl.bindVertexArray(null);
    }
    uploadInst(C);
    C.st = 3; C.vi = 0;
    C.mborn = lateBorn(C.V, cellDistFade(C));
  }
  function cellBake(C, budget) {   // bakes its clouds; returns the layer draws made
    var made = 0;
    while (C.vi < C.vols.length && made < budget) {
      var vb = C.vols[C.vi];
      if (!vb.done) { made += volBake(vb, C.V, budget - made); if (!vb.done) break; var vf = volDistFade(vb.out); vb.out.born = lateBorn(C.V, vf); if (vb.out.born > -1e8) LATE.vols++; }
      C.vi++;
    }
    if (C.vi >= C.vols.length) { C.st = 4; C.born = lateBorn(C.V, cellDistFade(C)); }
    return made;
  }
  function freeCell(C) {
    if (!C || C.gone) return;
    C.gone = true;
    if (!LOST) {   // (E1: queued, deleted among the next frame's GPU jobs: freeDrain)
      if (C.mesh && C.mesh.vao) { glFree('VertexArray', C.mesh.vao); glFree('Buffer', C.mesh.vb); }
      if (C.occ) { glFree('VertexArray', C.occ.vao); glFree('Buffer', C.occ.b); }
      for (var i = 0; i < C.vols.length; i++) glFree('Texture', C.vols[i].out.t);
      if (C.inst) C.inst.forEach(function (q) { if (q.buf) glFree('Buffer', q.buf); if (q.vaoF) glFree('VertexArray', q.vaoF); if (q.vaoC) glFree('VertexArray', q.vaoC); });
      if (C.glowB && C.glowB.buf) { glFree('Buffer', C.glowB.buf); glFree('VertexArray', C.glowB.vao); }
      if (C.beamB && C.beamB.buf) { glFree('Buffer', C.beamB.buf); glFree('VertexArray', C.beamB.vao); }
    }
    if (C.job) C.job.cancel = true;
    C.mesh = null; C.occ = null; C.vols = []; C.items = []; C.clouds = []; C.flocks = []; C.pois = []; C.obst = []; C.B = null; C.RB = null; C.gen = null; C.rgen = null; C.pts = null; C.soft = null; C.softB = null;
    C.places = []; C.glowG = []; C.beamL = []; C.inst = null; C.glowB = null; C.beamB = null;
    if (C.V) C.V.poiGen = (C.V.poiGen || 0) + 1;
  }
  var DEVKEEP = false;

  /* the placements of a cell: seated, their obstacles, packed per set (20 floats an instance: place and turn; scale and
     phase; tint and emission; tilt and bob; spin) */
  function resolvePlaces(C, yOf) {
    if (!C.places.length) return;
    var sets = C.V.G && C.V.G.sets || {}, by = {}, i;
    for (i = 0; i < C.places.length; i++) {
      var q = C.places[i], S = sets[q.set];
      if (!S) { if (DEVMODE) fail('no set ' + q.set); continue; }
      q.seat = q.air ? q.y : (q.ref ? q.ref.seat + (q.dy || 0) : q.seat);
      var sc = q.scale === undefined ? [1, 1, 1] : (typeof q.scale === 'number' ? [q.scale, q.scale, q.scale] : q.scale);
      q.sc = sc; q.r = S.r * Math.max(sc[0], sc[1], sc[2]) + (q.bob ? q.bob[0] : 0); q.cy = S.cy * sc[1];
      if (q.solid) C.obst.push({ c: 1, x: q.x + (q.solid[2] || 0), z: q.z + (q.solid[3] || 0), r: q.solid[0], y0: q.seat - 30, y1: q.seat + q.solid[1] });
      if (q.sphere) C.obst.push({ c: 0, x: q.x, y: q.seat + q.sphere[0], z: q.z, r: q.sphere[1] });
      (by[q.set] = by[q.set] || []).push(q);
    }
    C.inst = [];
    for (var name in by) {
      var L = by[name], d = new Float32Array(L.length * 20);
      for (i = 0; i < L.length; i++) {
        var p = L[i], o = i * 20, t = p.tint || [1, 1, 1], tl = p.tilt || [0, 0], bob = p.bob || [0, 1];
        d[o] = p.x; d[o + 1] = p.seat; d[o + 2] = p.z; d[o + 3] = (p.yaw || 0) * DEG;
        d[o + 4] = p.sc[0]; d[o + 5] = p.sc[1]; d[o + 6] = p.sc[2]; d[o + 7] = p.phase !== undefined ? p.phase : hfl(ihash((C.key * 977 + i * 131 + 7) >>> 0));
        d[o + 8] = t[0]; d[o + 9] = t[1]; d[o + 10] = t[2]; d[o + 11] = p.glow === undefined ? 1 : p.glow;
        d[o + 12] = tl[0] * DEG; d[o + 13] = tl[1] * DEG; d[o + 14] = bob[0]; d[o + 15] = 2 * PI / Math.max(bob[1], 0.1);
        d[o + 16] = (p.spin || 0) * DEG;
      }
      C.inst.push({ set: name, n: L.length, data: d, buf: null, vaoF: null, vaoC: null });
    }
  }
  /* a cell's glow sprites, packed (16 floats a sprite: place and size; colour and least size; twinkle, pulse, rate,
     phase; drift, bob, blink, far) with their bound */
  function resolveGlows(C) {
    if (!C.glowG.length) return;
    var n = 0, i, k; for (i = 0; i < C.glowG.length; i++) n += C.glowG[i].n;
    var d = new Float32Array(n * 16), lo = [1e9, 1e9, 1e9], hi = [-1e9, -1e9, -1e9], o = 0;
    for (i = 0; i < C.glowG.length; i++) {
      var g = C.glowG[i], base = g.ref ? g.ref.seat : 0, col = g.color || [1, 1, 1], per = col.length === g.n * 3;
      for (k = 0; k < g.n; k++, o += 16) {
        var x = g.pos[k * 3], y = g.pos[k * 3 + 1] + (g.gh ? g.gh[k] : base), z = g.pos[k * 3 + 2];
        var sz = typeof g.size === 'number' ? g.size : (g.size ? g.size[k] : 0.3);
        d[o] = x; d[o + 1] = y; d[o + 2] = z; d[o + 3] = sz;
        d[o + 4] = per ? col[k * 3] : col[0]; d[o + 5] = per ? col[k * 3 + 1] : col[1]; d[o + 6] = per ? col[k * 3 + 2] : col[2]; d[o + 7] = g.px || 1.5;
        d[o + 8] = g.twinkle || 0; d[o + 9] = g.pulse || 0; d[o + 10] = g.rate || 0.5;
        d[o + 11] = g.phase ? g.phase[k] : hfl(ihash((C.key * 7919 + o * 31 + 3) >>> 0));
        d[o + 12] = g.drift || 0; d[o + 13] = g.bob || 0; d[o + 14] = g.blink || 0; d[o + 15] = g.far || 0;
        var m = Math.abs(g.drift || 0) + (g.bob || 0) + sz, yl = g.drift < 0 ? y + g.drift : y;
        if (x - m < lo[0]) lo[0] = x - m; if (yl - m < lo[1]) lo[1] = yl - m; if (z - m < lo[2]) lo[2] = z - m;
        if (x + m > hi[0]) hi[0] = x + m; if (y + m > hi[1]) hi[1] = y + m; if (z + m > hi[2]) hi[2] = z + m;
      }
    }
    var c = [(lo[0] + hi[0]) / 2, (lo[1] + hi[1]) / 2, (lo[2] + hi[2]) / 2];
    C.glowB = { n: n, data: d, buf: null, vao: null, bound: new Float32Array([c[0], c[1], c[2], Math.sqrt((hi[0] - lo[0]) * (hi[0] - lo[0]) + (hi[1] - lo[1]) * (hi[1] - lo[1]) + (hi[2] - lo[2]) * (hi[2] - lo[2])) / 2]) };
  }
  /* a cell's beams, packed (20 floats a beam: from and its radius; to and its radius; colour and core; dust, shimmer,
     woken at, draw-on; the fades) with their bound and their wakes */
  function resolveBeams(C) {
    if (!C.beamL.length) return;
    var n = C.beamL.length, d = new Float32Array(n * 20), lo = [1e9, 1e9, 1e9], hi = [-1e9, -1e9, -1e9], wakes = [];
    for (var i = 0; i < n; i++) {
      var b = C.beamL[i], o = i * 20, A = b.from.slice(), Bp = b.to.slice();
      if (b.ref) { A[0] += b.ref.x; A[1] += b.ref.seat; A[2] += b.ref.z; Bp[0] += b.ref.x; Bp[1] += b.ref.seat; Bp[2] += b.ref.z; }
      else if (b.ground) { A[1] += b.seat; Bp[1] += b.seat; }
      var r = b.r === undefined ? 1 : b.r, rA = typeof r === 'number' ? r : r[0], rB = typeof r === 'number' ? r : r[1], col = b.color || [1, 1, 1], fd = b.fade || [0.3, 0.02];
      d[o] = A[0]; d[o + 1] = A[1]; d[o + 2] = A[2]; d[o + 3] = rA; d[o + 4] = Bp[0]; d[o + 5] = Bp[1]; d[o + 6] = Bp[2]; d[o + 7] = rB;
      d[o + 8] = col[0]; d[o + 9] = col[1]; d[o + 10] = col[2]; d[o + 11] = b.core === undefined ? 0.6 : b.core;
      d[o + 12] = b.dust || 0; d[o + 13] = b.shimmer || 0; d[o + 14] = b.wake ? 1e9 : -1e9; d[o + 15] = b.wake ? b.wake[2] || 2 : 1;
      d[o + 16] = fd[0]; d[o + 17] = fd[1];
      if (b.wake) wakes.push([i, A[0], A[1], A[2], b.wake[0], b.wake[1] || 0]);
      var R = Math.max(rA, rB) * 2.2;
      for (var a = 0; a < 3; a++) { lo[a] = Math.min(lo[a], A[a] - R, Bp[a] - R); hi[a] = Math.max(hi[a], A[a] + R, Bp[a] + R); }
    }
    var c = [(lo[0] + hi[0]) / 2, (lo[1] + hi[1]) / 2, (lo[2] + hi[2]) / 2];
    C.beamB = { n: n, data: d, buf: null, vao: null, wakes: wakes, dirty: false, bound: new Float32Array([c[0], c[1], c[2], Math.sqrt((hi[0] - lo[0]) * (hi[0] - lo[0]) + (hi[1] - lo[1]) * (hi[1] - lo[1]) + (hi[2] - lo[2]) * (hi[2] - lo[2])) / 2]) };
  }
  /* a beam wakes when the camera first comes within its reach of its start: drawn on from then (the shaders' clock:
     the visit's time + 40, as uT) */
  function beamWake(V, u) {
    var L = V.cellList; if (!L) return;
    for (var i = 0; i < L.length; i++) {
      var C = L[i], B = C.beamB; if (C.st < 2 || !B || !B.wakes.length) continue;
      var dx = B.bound[0] - CS.x, dz = B.bound[2] - CS.z, R = B.bound[3] + 400;
      if (dx * dx + dz * dz > R * R) continue;
      for (var k = B.wakes.length - 1; k >= 0; k--) {
        var w = B.wakes[k], ex = w[1] - CS.x, ey = w[2] - CS.y, ez = w[3] - CS.z;
        if (ex * ex + ey * ey + ez * ez > w[4] * w[4]) continue;
        B.data[w[0] * 20 + 14] = u + 40 + w[5]; B.dirty = true; B.wakes.splice(k, 1);
      }
    }
  }
  /* the cell's GPU side of its sets, glows and beams */
  var QUAD = null;
  function uploadInst(C) {
    var sets = C.V.G && C.V.G.sets || {};
    if (C.inst) C.inst.forEach(function (q) {
      var S = sets[q.set]; if (!S || !S.full.vb) return;
      q.buf = pTake('buf'); gl.bindBuffer(gl.ARRAY_BUFFER, q.buf); gl.bufferData(gl.ARRAY_BUFFER, q.data, gl.STATIC_DRAW);
      q.vaoF = pTake('inst'); gl.bindVertexArray(q.vaoF); meshAttribs(S.full); instAttribs(q.buf, 5, 5, 0);
      if (S.coarse && S.coarse.vb) { q.vaoC = pTake('inst'); gl.bindVertexArray(q.vaoC); meshAttribs(S.coarse); instAttribs(q.buf, 5, 5, 0); }
      gl.bindVertexArray(null);
      q.S = S; if (!DEVMODE) q.data = null;
    });
    if (C.glowB) {
      if (!QUAD) { QUAD = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, QUAD); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW); }
      var G = C.glowB; G.buf = pTake('buf'); gl.bindBuffer(gl.ARRAY_BUFFER, G.buf); gl.bufferData(gl.ARRAY_BUFFER, G.data, gl.STATIC_DRAW);
      G.vao = pTake('glow'); gl.bindVertexArray(G.vao);
      gl.bindBuffer(gl.ARRAY_BUFFER, QUAD); gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
      instAttribs(G.buf, 1, 4, 0); gl.bindVertexArray(null);
      if (!DEVMODE) G.data = null;
    }
    if (C.beamB) {
      var Bm = C.beamB; Bm.buf = pTake('buf'); gl.bindBuffer(gl.ARRAY_BUFFER, Bm.buf); gl.bufferData(gl.ARRAY_BUFFER, Bm.data, gl.DYNAMIC_DRAW);
      Bm.vao = pTake('beam'); gl.bindVertexArray(Bm.vao);
      gl.bindBuffer(gl.ARRAY_BUFFER, VCUBE.vb); gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
      instAttribs(Bm.buf, 1, 5, 0); gl.bindVertexArray(null);
      Bm.dirty = false;
    }
  }

  /* the streamer: which cells a visit wants about a point (heading hx, hz), made in order of need, freed far behind */
  var SCAN = new Float64Array(4);
  function streamCells(V, cx, cz, hx, hz, sync, focusOnly) {
    if (!V.cells) { V.cells = new Map(); V.cellList = []; V.scanAt = [1e9, 1e9]; }
    var sc, L, scales = V.def.layout.scales, i;
    // the wanted set, scanned again when the point has moved 24 m (or at once when asked)
    var dx = cx - V.scanAt[0], dz = cz - V.scanAt[1];
    if (sync || dx * dx + dz * dz > 576) {
      V.scanAt[0] = cx; V.scanAt[1] = cz;
      for (sc = 0; sc < scales.length; sc++) {
        L = scales[sc]; var R = L.radius, n = Math.ceil(R / L.size) + 1, bx = Math.floor(cx / L.size), bz = Math.floor(cz / L.size);
        for (var jz = -n; jz <= n; jz++) for (var jx = -n; jx <= n; jx++) {
          var ix = bx + jx, iz = bz + jz, ccx = (ix + 0.5) * L.size - cx, ccz = (iz + 0.5) * L.size - cz, d = Math.sqrt(ccx * ccx + ccz * ccz);
          if (d > R + L.size * 0.5) continue;
          var key = cellKey(sc, ix, iz);
          if (!V.cells.has(key)) { var C = new Cell(V, sc, ix, iz); V.cells.set(key, C); V.cellList.push(C); }
        }
      }
      // coarse cells come near: built again in full (one still building starts over at full detail)
      for (i = 0; i < V.cellList.length; i++) {
        var Cl = V.cellList[i];
        if (Cl.lod !== 1 || nearDist(Cl, cx, cz) > LOD_NEAR) continue;
        if (Cl.st === 2) { Cl.lod = 0; if (Cl.B) { Cl.B = new Builder(4096); Cl.bi = 0; Cl.gen = null; } }
        else if (Cl.st >= 3 && !Cl.RB) { Cl.RB = new Builder(4096); Cl.rbi = 0; }
      }
      // free the cells far behind (past 1.3 radii)
      for (i = V.cellList.length - 1; i >= 0; i--) {
        var Cf = V.cellList[i], Lf = scales[Cf.sc], fx = Cf.cx - cx, fz = Cf.cz - cz;
        if (Math.sqrt(fx * fx + fz * fz) > Lf.radius * 1.3 + Lf.size * 0.5) {
          if (WLOG && Cf.mesh && V === SIM.V) wl('free', V.k + ':' + Cf.key, Cf.lastW || 0, nearDist(Cf, CAM.pos[0], CAM.pos[2]), Cf.lastVis);   // (dev: a drawn cell dropped, P6)
          freeCell(Cf); V.cells.delete(Cf.key); V.cellList.splice(i, 1);
        }
      }
    }
    // priorities: nearer first, ahead before behind
    var list = V.cellList, hl = Math.sqrt(hx * hx + hz * hz) || 1;
    for (i = 0; i < list.length; i++) {
      var Cp = list[i], px = Cp.cx - cx, pz = Cp.cz - cz, pd = Math.sqrt(px * px + pz * pz) || 1, ahead = (px * hx + pz * hz) / (pd * hl);
      Cp.prio = pd * (1 - 0.35 * ahead) / scales[Cp.sc].radius;
    }
    return list;
  }
  /* one step of the cells' work for a visit, within the frame's budgets (sync: everything for the cells within
     `near` of the point, at once) */
  var WORK = { verts: 0, layers: 0, layouts: 0, uploads: 0, resolves: 0 };
  var PEND = [];
  function byPrio(a, b) { return a.prio - b.prio; }
  function bornNow(V) { return (V === SIM.V && shown) ? SIM.t : -1e9; }   // (a cell ready before its visit is seen is simply there)
  /* (world6 step B fix, defect 11) every arrival a function of distance alone: a cell's (or a cloud body's) opacity is
     1 - smooth(FD_FULL, FD_ZERO, its nearest distance from the eye), FD_ZERO inside the radius it is made in (its
     scale's radius less a reach the streamer is ahead by: 0.1 R + 100 m) and the fade 0.12 R wide (at 12 m/s, 26-52 s
     for the great cells: it comes out of the haze), so nothing appears on a clock. A cell or body ready only once it
     should already show (late) is eased in over 2.5 s of the clock as a guard, and counted (LATE: a gate failure) */
  var LATE = { n: 0, vols: 0, worst: 0 };
  function fadeZ(V, sc) { var R = V.def.layout.scales[sc].radius; return R - (0.1 * R + 100); }
  function distFadeAt(V, sc, d) { var R = V.def.layout.scales[sc].radius, z = fadeZ(V, sc); return 1 - smooth(z - 0.12 * R, z, d); }
  function cellDistFade(C) { return distFadeAt(C.V, C.sc, nearDist(C, CAM.pos[0], CAM.pos[2])); }
  function volDistFade(o) { var C = o.cell; if (!C) return 1; var dx = o.c[0] - CAM.pos[0], dz = o.c[2] - CAM.pos[2]; return distFadeAt(C.V, C.sc, Math.max(Math.sqrt(dx * dx + dz * dz) - o.r, 0)); }
  function lateBorn(V, f) { var b = bornNow(V); if (b < -1e8 || f <= 0.001) return -1e9; LATE.n++; if (f > LATE.worst) LATE.worst = f; return b; }   // (ready while it should already show: the clock's guard, counted)
  /* (E1, design-v5 4.3) kind 'cpu' (the slice after the frame's flush): layouts, resolves and builds, no GL call;
     kind 'gpu' (the jobs at the start of the next drawn frame): uploads and bakes; sync or no kind: everything */
  function cellWork(V, sync, nearOnly, upTo, kind) {
    var list = V.cellList; if (!list) return true;
    upTo = upTo || 4;
    var cpu = sync || kind !== 'gpu', gpuW = sync || kind !== 'cpu';
    var i, done = true, pend = PEND; pend.length = 0;
    for (i = 0; i < list.length; i++) if (list[i].st < 4) pend.push(list[i]);
    pend.sort(byPrio);
    for (i = 0; i < pend.length; i++) {
      var C = pend[i];
      if (nearOnly && C.prio > nearOnly) continue;
      if (C.st === 0) { if (!cpu || (!sync && WORK.layouts >= BUD.layouts)) { done = false; continue; } prof('c.gap'); cellLayout(C, sync); WORK.layouts++; prof('c.layout'); }
      if (C.st === 1) { if (!cpu || !C.job.done || (!sync && WORK.resolves >= BUD.resolves)) { done = false; continue; } prof('c.gap'); cellResolve(C); WORK.resolves++; prof('c.resolve'); }
      if (upTo <= 2) continue;
      if (C.st === 2) {
        if (C.B && C.bi < C.items.length) { if (!cpu) { done = false; continue; } prof('c.gap'); var m = cellMesh(C, sync ? 1e9 : Math.max(BUD.verts - WORK.verts, 0)); WORK.verts += m; prof('c.mesh'); if (C.bi < C.items.length) { done = false; continue; } }
        if (!gpuW || (!sync && WORK.uploads >= BUD.uploads)) { done = false; continue; }
        prof('c.gap'); cellUpload(C); WORK.uploads++; prof('c.upload');
      }
      if (C.st === 3) { if (!gpuW) { done = false; continue; } prof('c.gap'); var bl = sync ? 1e9 : Math.max(BAKE.left, 0), l = cellBake(C, bl); WORK.layers += l; if (!sync) BAKE.left -= l; prof('c.bake'); if (C.st < 4) { done = false; continue; } }
    }
    // the coarse cells come near, built again in full (their coarse meshes drawn meanwhile): built in the CPU's slice,
    // the swap (an upload) among the GPU's jobs
    if (upTo > 2) for (i = 0; i < list.length; i++) {
      var Cr = list[i]; if (!Cr.RB || Cr.st < 3) continue;
      if (Cr.rbi < Cr.items.length) { if (cpu) WORK.verts += buildItems(Cr, true, sync ? 1e9 : Math.max(BUD.verts - WORK.verts, 0)); }
      if (Cr.rbi < Cr.items.length || !gpuW || (!sync && WORK.uploads >= BUD.uploads)) { done = false; continue; }
      var old = Cr.mesh; Cr.mesh = uploadMesh(Cr.RB, null); WORK.uploads++;
      if (WLOG) wl('swap', V.k + ':' + Cr.key, 1, nearDist(Cr, CAM.pos[0], CAM.pos[2]), Cr.lastVis);   // (dev: the coarse mesh replaced in one frame, P3)
      if (old && old.vao) { glFree('VertexArray', old.vao); glFree('Buffer', old.vb); }
      if (DEVMODE && DEVKEEP) Cr.pts = Cr.RB.F.slice(0, Cr.RB.n * 6);
      Cr.RB = null; Cr.lod = 0;
    }
    return done;
  }
  /* (E1) the frame's budgets for the cells (round 3b's counts; the boot's larger while the still sky shows) and the one
     bake budget every bake shares (cells' clouds and the next visit's passage, design-v5 7.3) */
  var BUD = { layouts: LAYOUT_BUDGET, resolves: RESOLVE_BUDGET, verts: VERT_BUDGET, uploads: 1, bake: 24 };
  var BAKE = { left: 0 };
  /* (E1) GL objects let go by the CPU's slice (a cell freed far behind) are deleted among the next frame's GPU jobs */
  var FREEQ = [];
  function glFree(kind, o) { if (o && !LOST) FREEQ.push(kind, o); }
  /* (round E1 Fix 3, S1: "nothing new in flight") the GL objects of cells and visits are kept for the next instead of
     deleted, and made ahead at stage B: a free list per kind (buffers; vertex arrays by their layout, so a draw's
     vertex layout and pipeline key never change with reuse; the clouds' 3D textures), each object given back by
     freeDrain with its storage shrunk to nothing and taken again by the next upload or bake, which re-specifies it
     (bufferData, texImage3D). An object is made in flight only when its list has run dry (the record counts them by
     kind: rec.pools.madeShown; E1 Fix 2's 600 s runs made 709-816 buffers and VAOs and 84-201 3D textures after the
     world showed). E3b's size classes and sub-allocation remain to be done: a reused object's storage is still
     re-specified at its new size. POOL_PRE: made at stage B, from the peaks of 600 s presented runs with streaming,
     both engines, with room to spare (rec.pools.peakLive); POOL_CAP: never more kept than this a kind */
  var POOL_KINDS = ['buf', 'tex3', 'mesh', 'inst', 'occ', 'glow', 'beam'];
  var POOL_PRE = { buf: 192, tex3: 192, mesh: 128, inst: 64, occ: 96, glow: 16, beam: 16 }, POOL_CAP = 512;
  var POOL = { lists: {}, made: {}, madeShown: {}, reused: {}, live: {}, peakLive: {}, deleted: {} };
  function poolReset() { POOL_KINDS.forEach(function (k) { POOL.lists[k] = []; POOL.made[k] = 0; POOL.madeShown[k] = 0; POOL.reused[k] = 0; POOL.live[k] = 0; POOL.peakLive[k] = 0; POOL.deleted[k] = 0; }); }
  poolReset();
  function poolMake(k) { var o = k === 'buf' ? gl.createBuffer() : k === 'tex3' ? gl.createTexture() : gl.createVertexArray(); o.__pk = k; POOL.made[k]++; return o; }
  function poolPre() { POOL_KINDS.forEach(function (k) { var L = POOL.lists[k]; while (L.length < POOL_PRE[k]) { var o = poolMake(k); POOL.made[k]--; L.push(o); } }); }   // (stage B: not counted as made)
  function pTake(k) {
    var L = POOL.lists[k], o = L.pop();
    if (o) POOL.reused[k]++; else { o = poolMake(k); if (shown) POOL.madeShown[k]++; }
    if (++POOL.live[k] > POOL.peakLive[k]) POOL.peakLive[k] = POOL.live[k];
    return o;
  }
  function pGive(o) {   // true: kept (its storage let go); false: not a pooled object
    var k = o.__pk; if (!k) return false;
    POOL.live[k]--;
    var L = POOL.lists[k]; if (L.length >= POOL_CAP) { POOL.deleted[k]++; return false; }
    if (k === 'buf') { gl.bindBuffer(gl.ARRAY_BUFFER, o); gl.bufferData(gl.ARRAY_BUFFER, 16, gl.STATIC_DRAW); }
    else if (k === 'tex3') { gl.activeTexture(gl.TEXTURE10); gl.bindTexture(gl.TEXTURE_3D, o); gl.texImage3D(gl.TEXTURE_3D, 0, gl.R8, 1, 1, 1, 0, gl.RED, gl.UNSIGNED_BYTE, null); gl.bindTexture(gl.TEXTURE_3D, null); gl.activeTexture(gl.TEXTURE0); }
    L.push(o); return true;
  }
  function freeDrain() {
    if (LOST) { FREEQ.length = 0; return; }
    var any = false;
    for (var i = 0; i < FREEQ.length; i += 2) {
      var k = FREEQ[i], o = FREEQ[i + 1]; any = true;
      if (pGive(o)) continue;
      if (k === 'Buffer') gl.deleteBuffer(o); else if (k === 'VertexArray') gl.deleteVertexArray(o); else if (k === 'Texture') gl.deleteTexture(o);
    }
    if (any) gl.bindBuffer(gl.ARRAY_BUFFER, null);
    FREEQ.length = 0;
  }
  /* how much of a visit is ready about a point: every cell within its scale's `frac` of the radius done */
  function cellsReady(V, frac) {
    if (!V.cellList) return false;
    var scales = V.def.layout.scales;
    for (var i = 0; i < V.cellList.length; i++) { var C = V.cellList[i]; if (C.st < 4 && C.prio < frac) return false; }
    return true;
  }
  function volBytes() {   // dev and the cap: the cloud volumes' memory over the visits alive
    var b = 0;
    J.visits.forEach(function (V) { if (V.cellList) V.cellList.forEach(function (C) { for (var i = 0; i < C.vols.length; i++) b += C.vols[i].out.bytes; }); });
    return b;
  }
  /* creatures: a flock's uniforms from its description: { kind: 'bird' | 'ray' | 'moth' | 'jelly' | 'cap', n (<= 32), at,
     u0, drift [x, z] (m/s), orbit (m), wheel (rad/s), size (m), flap (Hz: the beat, the flutter, a jelly's pulse),
     spread (m: heights), lit, shade (colours), glow ([r, g, b], linear HDR: its own light; moths, jellies, caps),
     bob: [m, period s], layout: 'orbit' | 'helix' | 'still', helix: [radius m, step deg, rise m a step, turn deg/s] } */
  var FKIND = { bird: 1, ray: 2, moth: 3, jelly: 4, cap: 5 };
  function flockOf(f) {
    var kd = FKIND[f.kind] || 1, hx = f.helix || [4, 40, 5, 0], bob = f.bob || [0, 1];
    return { ray: kd === 2, kind: kd, n: Math.min(f.n || 12, 32), a: new Float32Array([f.at[0], f.at[1], f.at[2], f.u0 || 0]), b: new Float32Array([f.drift ? f.drift[0] : 0, f.drift ? f.drift[1] : 0, f.orbit || 30, kd]),
      c: new Float32Array([f.wheel || 0.3, f.size || 1.3, f.flap || 3, f.spread || 8]), lit: new Float32Array(f.lit || [1, 1, 1]), shade: new Float32Array(f.shade || [0.6, 0.6, 0.7]), life: f.life || null,
      d: new Float32Array([bob[0], 2 * PI / Math.max(bob[1], 0.1), f.layout === 'helix' ? 1 : f.layout === 'still' ? 2 : 0, 0]), e: new Float32Array([hx[0], hx[1] * DEG, hx[2], (hx[3] || 0) * DEG]), glow: new Float32Array(f.glow || [0, 0, 0]) };
  }

  /* ---------------------------------------------------------------- the read-back ring (E1, design-v5 7.5) */
  /* Everything the CPU must learn from the GPU (the ground under the cells' items, the camera's ground about it) comes
     back through one ring of three pixel-pack buffers of 64 KB, with one fence a frame:
       1. at a frame's start, only the oldest pending fence is polled, once (clientWaitSync, timeout 0);
       2. if it has signalled, one getBufferSubData of its slot (64 KB or less) into one reused array, then deleteSync;
       3. then fenceSync for the work since the last fence (the switch: at the frame's start, after its flush, every
          second frame, or all but off);
       4. a frame's readPixels go into the slot being filled; if no slot is free (the GPU two frames and more behind)
          the frame's reads are skipped, never waited for: the batch stays queued.
     Data arrive two or three frames old. Round 3b made up to 7 polls and 3 reads a frame, about 100 fences a minute, and
     a new pixel buffer and Uint8Array a batch (audit 3.2). The fence also gives the frame's GPU signal: was the oldest
     fence still unsignalled at this frame's start (the record's gpu tag; the boot's budgets).
     (dev) RBFIX: the oldest slot is read exactly two of the loop's frames after its fence, waited for if the GPU is
     slower: a film or a fast flight then sees the same ground whatever the GPU's speed (E0's jwfast was not
     deterministic for want of it). Never in production. */
  var RB_N = 3, RB_SLOT = 65536, RB_FENCES = 4;
  var RB = { slots: [], fences: [], buf: new Uint8Array(RB_SLOT), lagged: false, lastPoll: -1, made: 0, polled: 0, reads: 0, readBytes: 0, skipped: 0, fenceSkipped: 0, lagN: 0, fix: false };
  function rbInit() {
    RB.slots = []; RB.fences = []; RB.lagged = false;
    for (var i = 0; i < RB_N; i++) {
      var b = gl.createBuffer(); gl.bindBuffer(gl.PIXEL_PACK_BUFFER, b); gl.bufferData(gl.PIXEL_PACK_BUFFER, RB_SLOT, gl.STREAM_READ);
      RB.slots.push({ pbo: b, used: 0, ents: [], st: 0, frame: -1 });   // st: 0 free, 1 filling, 2 fenced
    }
    gl.bindBuffer(gl.PIXEL_PACK_BUFFER, null);
  }
  function rbForget() { RB.slots = []; RB.fences = []; RB.lagged = false; }   // (a lost context: everything went with it)
  /* the slot this frame fills, with room for `bytes` (null: none free) */
  function rbSlot(bytes) {
    var i, S;
    for (i = 0; i < RB.slots.length; i++) { S = RB.slots[i]; if (S.st === 1) return S.used + bytes <= RB_SLOT ? S : null; }
    for (i = 0; i < RB.slots.length; i++) { S = RB.slots[i]; if (S.st === 0) { S.st = 1; S.used = 0; S.ents.length = 0; S.frame = FRAMEN; return bytes <= RB_SLOT ? S : null; } }
    RB.skipped++;
    return null;
  }
  /* a rectangle of the bound read framebuffer into the slot (RGBA bytes), its entry kept for the delivery */
  function rbRead(S, x, y, w, h, ent) {
    ent.off = S.used; ent.bytes = w * h * 4;
    gl.bindBuffer(gl.PIXEL_PACK_BUFFER, S.pbo);
    gl.readPixels(x, y, w, h, gl.RGBA, gl.UNSIGNED_BYTE, S.used);
    gl.bindBuffer(gl.PIXEL_PACK_BUFFER, null);
    S.used += ent.bytes; S.ents.push(ent);
    if (REC) REC.fr.rbBytes += ent.bytes;
  }
  /* the fence: covers everything since the last one (the filling slot is now its) */
  function rbFence() {
    if (RB.fences.length >= RB_FENCES) { RB.fenceSkipped++; return; }
    var f = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0), S = null;
    for (var i = 0; i < RB.slots.length; i++) if (RB.slots[i].st === 1) { S = RB.slots[i]; S.st = 2; break; }
    RB.fences.push({ s: f, slot: S, frame: FRAMEN }); RB.made++;
  }
  /* the poll: the oldest fence, once; its slot read if it has signalled */
  function rbPoll() {
    RB.lagged = false;
    if (!RB.fences.length) return;
    var F = RB.fences[0], r;
    if (RB.fix) {   // (dev: delivered exactly two frames after its fence, whatever the GPU's speed)
      if (FRAMEN - F.frame < 2) return;
      RB.polled++; r = gl.clientWaitSync(F.s, 0, 0);
      /* (Fix 2 of round E1) inside one long JavaScript task (the harness's ticks) WebGL 2 never changes a fence's
         status, so the slot is read unconditionally two frames on: the read itself waits for the data (dev only; the
         harness's counts of the ring are then its own, not the loop's: RB.forced) */
      if (r === gl.TIMEOUT_EXPIRED) { RB.forced = (RB.forced || 0) + 1; r = gl.CONDITION_SATISFIED; }
    } else { RB.polled++; r = gl.clientWaitSync(F.s, 0, 0); }
    if (r === gl.TIMEOUT_EXPIRED) { RB.lagged = true; RB.lagN++; return; }
    if (r === gl.WAIT_FAILED) { RB.fences.shift(); return; }   // (a context lost under it)
    gl.deleteSync(F.s); RB.fences.shift();
    var S = F.slot; if (!S) return;
    if (S.used > 0) {
      gl.bindBuffer(gl.PIXEL_PACK_BUFFER, S.pbo);
      gl.getBufferSubData(gl.PIXEL_PACK_BUFFER, 0, RB.buf, 0, S.used);
      gl.bindBuffer(gl.PIXEL_PACK_BUFFER, null);
      RB.reads++; RB.readBytes += S.used;
      for (var i = 0; i < S.ents.length; i++) rbDeliver(S.ents[i]);
    }
    S.st = 0; S.used = 0; S.ents.length = 0;
  }
  function rbDeliver(e) { if (e.k === 'probe') probeLand(e); else if (e.k === 'ground') groundHalf(e); else if (e.k === 'words') wordsGroundDeliver(e); }
  /* (dev) every pending fence waited for and its slot delivered (a film's frame; the harness's still) */
  function rbDrain() { var guard = 0, fx = RB.fix; RB.fix = false; gl.finish(); while (RB.fences.length && guard++ < 16) rbPoll(); RB.fix = fx; }

  /* ---------------------------------------------------------------- probes: the realm's ground, read back */
  /* The realm's height function evaluated at points on the GPU (the same function the land is drawn with), packed into
     the bytes of an RGBA8 target and read back through the ring. Jobs from the cells are batched, one batch a frame of
     at most PROBE_FRAME points (the high tier's 2,048, design-v5 5.4; 8,192 while the boot runs behind the still sky);
     a job larger than that goes in parts and is done when its last part lands. (A still drawn for the harness reads
     its points at once, as round 3b did.) The points go up through a ring of three textures, so no texture a frame in
     flight samples is written (S5) */
  var PROBE_W = 256, PROBE_H = 64, PROBE_CAP = PROBE_W * PROBE_H, PROBE_FRAME = 2048, PROBE_BOOT = 8192;
  var PROBE_T = null, PROBE_PTS = [], PROBE_PI = 0, PSCR = new Float32Array(PROBE_CAP * 2);
  var PJOBS = [], PPARTS = [], PSTAT = { batches: 0, points: 0, maxPts: 0, waits: 0 };
  function probeJob(V, pts, n, mode, sync) {
    var job = { V: V, pts: pts, n: n, mode: mode, h: null, done: false, cancel: false, sent: 0, landed: 0 };
    if (sync) {
      if (n > PROBE_CAP) { fail('probe: ' + n + ' points, over the ' + PROBE_CAP + ' a batch holds'); job.n = n = PROBE_CAP; }   // (loudly: never a silent clamp)
      probeRun([job], true);
    } else { job.h = new Float32Array(n); PJOBS.push(job); }
    return job;
  }
  function probeDec(px, n) { var b = n * 4; return ((px[b] / 255 + px[b + 1] / 65025 + px[b + 2] / 16581375 + px[b + 3] / 4228250625) * 8192) - 4096; }
  /* the realm's probe program, with its uniforms: a frame's uniforms for the visit, and the mode (0 land at points,
     1 the camera's ground at points, 2 the land on a grid, 3 the camera's ground on a grid, packed) */
  function probeProg(V, mode, gx, gz, gcell) {
    var P = V.def.P.pr; gl.useProgram(P.p); setFrameUniforms(P, V);
    gl.uniform4f(P.u.uGCw, gx || 0, gz || 0, gcell || 0, 0); gl.uniform1i(P.u.uPm, mode);
    return P;
  }
  function probeTargets() {
    if (PROBE_T) return;
    PROBE_T = target(PROBE_W, PROBE_H, 'rgba8');
    gl.activeTexture(gl.TEXTURE7);
    PROBE_PTS = []; for (var i = 0; i < 3; i++) PROBE_PTS.push(tex2d(PROBE_W, PROBE_H, gl.RG32F, gl.RG, gl.FLOAT, gl.NEAREST));
    gl.activeTexture(gl.TEXTURE0);
  }
  function probeDraw(V, mode, n) {   // the points in PSCR, n of them, drawn into PROBE_T (rows as needed)
    probeTargets();
    var rows = Math.max(1, Math.ceil(n / PROBE_W));
    PROBE_PI = (PROBE_PI + 1) % PROBE_PTS.length;   // (the ring: this texture was last sampled three batches ago)
    gl.activeTexture(gl.TEXTURE7); gl.bindTexture(gl.TEXTURE_2D, PROBE_PTS[PROBE_PI]);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, PROBE_W, rows, gl.RG, gl.FLOAT, PSCR, 0);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_3D, NOISE3);
    gl.bindFramebuffer(gl.FRAMEBUFFER, PROBE_T.f); gl.viewport(0, 0, PROBE_W, rows);
    gl.disable(gl.DEPTH_TEST); gl.disable(gl.BLEND); gl.disable(gl.CULL_FACE); gl.colorMask(true, true, true, true);
    probeProg(V, mode);
    gl.bindVertexArray(FULLVAO); gl.drawArrays(gl.TRIANGLES, 0, 3);
    return rows;
  }
  function probeRun(jobs, sync) {   // (the harness's stills: jobs of one visit and one mode, drawn and read at once)
    var V = jobs[0].V, mode = jobs[0].mode, n = 0, i, k, offs = [];
    for (i = 0; i < jobs.length; i++) { offs.push(n); var J0 = jobs[i]; for (k = 0; k < J0.n * 2; k++) PSCR[n * 2 + k] = J0.pts[k]; n += J0.n; }
    var rows = probeDraw(V, mode, n);
    var px = new Uint8Array(PROBE_W * rows * 4); gl.readPixels(0, 0, PROBE_W, rows, gl.RGBA, gl.UNSIGNED_BYTE, px);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    for (i = 0; i < jobs.length; i++) {
      var J1 = jobs[i], h = new Float32Array(J1.n);
      for (k = 0; k < J1.n; k++) h[k] = probeDec(px, offs[i] + k);
      J1.h = h; J1.done = true; J1.sent = J1.landed = J1.n;
    }
  }
  /* a frame's batch: up to `cap` points of the jobs waiting (one visit and mode: the first waiting job's), drawn and
     read into the ring's slot. Needs the realm's programs and the noise */
  function probeFlush(cap) {
    var i, n = 0, V = null, mode = 0, J0;
    while (PJOBS.length && PJOBS[0].cancel) PJOBS.shift();
    if (!PJOBS.length) return;
    V = PJOBS[0].V; mode = PJOBS[0].mode;
    if (!V.def.P || V.def.P.st !== 2 || !NOISE.done) return;
    var want = 0; for (i = 0; i < PJOBS.length && want < cap; i++) { J0 = PJOBS[i]; if (!J0.cancel && J0.V === V && J0.mode === mode) want += J0.n - J0.sent; }
    want = Math.min(want, cap);
    var S = rbSlot(Math.ceil(want / PROBE_W) * PROBE_W * 4);
    if (!S) { PSTAT.waits++; return; }
    var parts = [];
    for (i = 0; i < PJOBS.length && n < cap; i++) {
      J0 = PJOBS[i]; if (J0.cancel || J0.V !== V || J0.mode !== mode) continue;
      var m = Math.min(J0.n - J0.sent, cap - n);
      for (var k = 0; k < m * 2; k++) PSCR[n * 2 + k] = J0.pts[J0.sent * 2 + k];
      parts.push(J0, J0.sent, m, n);
      J0.sent += m; n += m;
    }
    for (i = PJOBS.length - 1; i >= 0; i--) if (PJOBS[i].cancel || PJOBS[i].sent >= PJOBS[i].n) PJOBS.splice(i, 1);
    if (!n) return;
    var rows = probeDraw(V, mode, n);
    rbRead(S, 0, 0, PROBE_W, rows, { k: 'probe', parts: parts });
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    PSTAT.batches++; PSTAT.points += n; if (n > PSTAT.maxPts) PSTAT.maxPts = n;
    if (REC) REC.fr.probes += n;
  }
  function probeLand(e) {
    var P = e.parts, px = RB.buf, base = e.off / 4;
    for (var i = 0; i < P.length; i += 4) {
      var J0 = P[i], j0 = P[i + 1], m = P[i + 2], o = P[i + 3];
      if (J0.cancel) continue;
      for (var k = 0; k < m; k++) J0.h[j0 + k] = probeDec(px, base + o + k);
      J0.landed += m; if (J0.landed >= J0.n) J0.done = true;
    }
  }
  function probeDropAll() {   // (a lost context, a journey reset: the jobs are gone with it; their owners ask again)
    PJOBS.forEach(function (j) { j.cancel = true; }); PJOBS = [];
    if (!LOST) RB.fences.forEach(function (F) { gl.deleteSync(F.s); });
    RB.fences = []; RB.slots.forEach(function (S) { S.st = 0; S.used = 0; S.ents.length = 0; });
  }

  /* ---------------------------------------------------------------- the ground about the camera */
  /* Two grids of the realm's ground, 160 x 160 at 4 m (640 m across), drawn when the camera has moved 16 m: the land's
     height for the scatter, the particles and the veils of sand (a float target where the context can); and the
     camera's own ground (the realm's camGround: over a bay of cloud, the cloud's top), packed and read back for the
     flight. (E1) The camera's grid is 100 KB of bytes, so it comes back in two halves of 80 rows (50 KB each, each in
     one frame's slot beside the frame's probes); the grid is not drawn again until both halves are read out of it.
     The flight reads the last grid that has landed: a few frames late, always about the camera. */
  var GCN = 160, GCCELL = 4, GCT = null, GCCT = null, GCU = new Float32Array(4), GCK = new Float64Array([-1, 0, 0, 0]);
  var GROUND = { V: null, x0: 0, z0: 0, cell: GCCELL, n: GCN, h: new Float32Array(GCN * GCN), e: new Float32Array(GCN * GCN), ok: false, rd: 0, gen: 0, got: 0, P: { V: null, x0: 0, z0: 0, gen: 0 }, nx: 0, nz: 0, nV: null };
  var GPX = new Uint8Array(GCN * GCN * 4), GHALF = GCN / 2;
  function groundCache(V, cx, cz, sync) {
    if (!V.def.P || V.def.P.st !== 2 || !NOISE.done) return;
    if (!sync && GROUND.rd > 0) return;   // (the last grid's halves not yet read out of the target)
    var x0 = Math.floor(cx / 16) * 16 - GCN / 2 * GCCELL, z0 = Math.floor(cz / 16) * 16 - GCN / 2 * GCCELL;
    if (GCK[0] === V.k && GCK[1] === x0 && GCK[2] === z0 && GCK[3] === J.seed) return;
    GCK[0] = V.k; GCK[1] = x0; GCK[2] = z0; GCK[3] = J.seed;
    if (!GCT) {
      GCT = { f: gl.createFramebuffer() }; gl.activeTexture(gl.TEXTURE11); GCT.t = tex2d(GCN, GCN, FLOAT32_RT ? gl.R32F : gl.RGBA8, FLOAT32_RT ? gl.RED : gl.RGBA, FLOAT32_RT ? gl.FLOAT : gl.UNSIGNED_BYTE, gl.NEAREST); gl.activeTexture(gl.TEXTURE0);
      gl.bindFramebuffer(gl.FRAMEBUFFER, GCT.f); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, GCT.t, 0);
      GCCT = target(GCN, GCN, 'rgba8');
    }
    GCU[0] = x0; GCU[1] = z0; GCU[2] = GCCELL; GCU[3] = GCN;
    gl.activeTexture(gl.TEXTURE11); gl.bindTexture(gl.TEXTURE_2D, null); gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_3D, NOISE3);
    gl.disable(gl.DEPTH_TEST); gl.disable(gl.BLEND); gl.disable(gl.CULL_FACE); gl.colorMask(true, true, true, true); gl.bindVertexArray(FULLVAO);
    gl.bindFramebuffer(gl.FRAMEBUFFER, GCT.f); gl.viewport(0, 0, GCN, GCN); probeProg(V, 2, x0, z0, GCCELL); gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.bindFramebuffer(gl.FRAMEBUFFER, GCCT.f); gl.viewport(0, 0, GCN, GCN); probeProg(V, 3, x0, z0, GCCELL); gl.drawArrays(gl.TRIANGLES, 0, 3);
    ST.gc++;
    if (sync) {
      var px = new Uint8Array(GCN * GCN * 4); gl.readPixels(0, 0, GCN, GCN, gl.RGBA, gl.UNSIGNED_BYTE, px);
      groundLand(px, V, x0, z0);
    } else {
      GROUND.gen++; GROUND.P.V = V; GROUND.P.x0 = x0; GROUND.P.z0 = z0; GROUND.P.gen = GROUND.gen; GROUND.got = 0; GROUND.rd = 1;
      groundRead();
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }
  /* the next half of the camera's grid into this frame's slot (if it has room) */
  function groundRead() {
    if (GROUND.rd <= 0 || !GCCT) return;
    var S = rbSlot(GCN * GHALF * 4); if (!S) return;
    var half = GROUND.rd - 1;
    gl.bindFramebuffer(gl.FRAMEBUFFER, GCCT.f);
    rbRead(S, 0, half * GHALF, GCN, GHALF, { k: 'ground', half: half, gen: GROUND.P.gen, V: GROUND.P.V, x0: GROUND.P.x0, z0: GROUND.P.z0 });
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    GROUND.rd = half === 0 ? 2 : 0;
  }
  function groundHalf(e) {
    if (e.gen !== GROUND.P.gen) return;   // (a grid since replaced: a restore, a reset)
    GPX.set(RB.buf.subarray(e.off, e.off + e.bytes), e.half * GCN * GHALF * 4);
    GROUND.got |= 1 << e.half;
    if (GROUND.got === 3) { GROUND.got = 0; groundLand(GPX, e.V, e.x0, e.z0); }
  }
  function groundLand(px, V, x0, z0) {
    var h = GROUND.h, n = GCN * GCN;
    for (var i = 0; i < n; i++) { var b = i * 4; h[i] = ((px[b] / 255 + px[b + 1] / 65025 + px[b + 2] / 16581375 + px[b + 3] / 4228250625) * 8192) - 4096; }
    groundEnv(h, GROUND.e);
    GROUND.V = V; GROUND.x0 = x0; GROUND.z0 = z0; GROUND.ok = true; GROUND.gen2 = (GROUND.gen2 || 0) + 1;
  }
  /* (world6 step B fix, defects 7 and 10) the surface the flight follows: the camera's ground's upper envelope at
     ENV_K m per m, E(p) = max over q of H(q) - ENV_K |p - q| (a cone dilation, worked as two chamfer passes over the
     grid: 4 m straight, 4 sqrt 2 diagonal, so E is within ENV_K x 1.082 = 0.195 m/m in every direction). E is never
     under the ground (so the hard rule's floor holds over it) and never steeper than the climb the flight can make (2.6
     m/s at 12 m/s: 0.217), on any line the visitor turns to: a rise is climbed from as far off as its height asks, and
     a crest, a terrace, a heap or the coast's rise never meets the camera faster than it can climb. A function of the
     ground alone (no heading, no path); the land's taller features are bounded by construction (realm-dunes.js: the
     ridges at 30-60 m, the terraces at 46-60) so their cones lie within the grid's 320 m */
  var ENV_K = 0.18, ENV_S = ENV_K * GCCELL, ENV_D = ENV_K * GCCELL * Math.SQRT2;
  function groundEnv(h, e) {
    var N = GCN, i, j, q, v;
    for (i = 0; i < N * N; i++) e[i] = h[i];
    for (j = 0; j < N; j++) for (i = 0; i < N; i++) {   // forward: from the left, below-left, below, below-right
      q = j * N + i; v = e[q];
      if (i > 0 && e[q - 1] - ENV_S > v) v = e[q - 1] - ENV_S;
      if (j > 0) { if (e[q - N] - ENV_S > v) v = e[q - N] - ENV_S; if (i > 0 && e[q - N - 1] - ENV_D > v) v = e[q - N - 1] - ENV_D; if (i < N - 1 && e[q - N + 1] - ENV_D > v) v = e[q - N + 1] - ENV_D; }
      e[q] = v;
    }
    for (j = N - 1; j >= 0; j--) for (i = N - 1; i >= 0; i--) {   // backward
      q = j * N + i; v = e[q];
      if (i < N - 1 && e[q + 1] - ENV_S > v) v = e[q + 1] - ENV_S;
      if (j < N - 1) { if (e[q + N] - ENV_S > v) v = e[q + N] - ENV_S; if (i < N - 1 && e[q + N + 1] - ENV_D > v) v = e[q + N + 1] - ENV_D; if (i > 0 && e[q + N - 1] - ENV_D > v) v = e[q + N - 1] - ENV_D; }
      e[q] = v;
    }
  }
  function groundRawAt(V, x, z) { return groundAt(V, x, z, false, true); }
  /* (world6 step B fix, defect 7) the formations in the envelope too: each solid standing on the land (a cell's
     cylinder: a mesa, a shard, a slab, a ruin's wall, a talus foot) raises the surface flown by its own cone, its top
     plus SOL_M less ENV_K per metre beyond its radius, worked analytically from the solids within SOL_R of the camera
     (refreshed every step: ENV_SOL), so whatever line the visitor turns to, a formation is climbed over from as far off
     as its height asks, never met: the slip passes beside what it can, the hard rule is never needed (the step met a
     mesa's face after a drag and the hard rule slid the camera along it, 875 pushes) */
  var SOL_M = 10, SOL_R = 1700, ENV_SOL = [];
  function envSolids(V, x, z) {
    ENV_SOL.length = 0; var L = V.cellList; if (!L) return;
    for (var i = 0; i < L.length; i++) {
      var C = L[i]; if (C.st < 2 || !C.obst.length) continue;
      var dx = C.bound[0] - x, dz = C.bound[2] - z, R = SOL_R + C.bound[3];
      if (dx * dx + dz * dz > R * R) continue;
      for (var k = 0; k < C.obst.length; k++) { var o = C.obst[k]; if (o.c && !o.cloud) ENV_SOL.push(o); }
    }
  }
  function solidEnv(x, z, v) {
    for (var i = 0; i < ENV_SOL.length; i++) { var o = ENV_SOL[i], dx = x - o.x, dz = z - o.z, d = Math.sqrt(dx * dx + dz * dz) - o.r, e = o.y1 + SOL_M - ENV_K * Math.max(d, 0); if (e > v) v = e; }
    return v;
  }
  /* the camera's ground at a point: bilinear, or (conservative) the highest of the 4 x 4 texels about it (no crest
     between samples is missed); (fix) the envelope's unless raw is asked */
  function groundAt(V, x, z, cons, raw) {
    var G = GROUND;
    if (G.V !== V || !G.ok) return V.g0max !== undefined ? V.g0max : 0;
    var fx = (x - G.x0) / G.cell - 0.5, fz = (z - G.z0) / G.cell - 0.5, n = G.n;
    fx = clamp(fx, 1, n - 3); fz = clamp(fz, 1, n - 3);
    var ix = Math.floor(fx), iz = Math.floor(fz), h = raw ? G.h : G.e;
    if (cons) {
      var m = -1e9;
      for (var j = iz - 1; j <= iz + 2; j++) for (var i = ix - 1; i <= ix + 2; i++) { var v = h[j * n + i]; if (v > m) m = v; }
      return raw ? m : solidEnv(x, z, m);
    }
    var wx = fx - ix, wz = fz - iz, a = h[iz * n + ix], b = h[iz * n + ix + 1], c = h[(iz + 1) * n + ix], d = h[(iz + 1) * n + ix + 1];
    var bl = (a * (1 - wx) + b * wx) * (1 - wz) + (c * (1 - wx) + d * wx) * wz;
    return raw ? bl : solidEnv(x, z, bl);
  }

  /* ---------------------------------------------------------------- the flight */
  /* The camera flies on, simulated in fixed steps of 1/60 s (the same flight whatever the display's rate; drawn
     between the last two steps). Its state: where it is; the view's yaw (only the drags and the phone's motion turn it: design-v5 Revision 3) and the
     phone's turn on top of it; the flight's heading, which follows the view within about half a second; the pitch the
     visitor gives (a drag's tilt, kept after the release (E1.1); the phone's tilt, held while the phone is); the
     clearance it keeps over the ground (climbing as the view looks up, diving as it looks down, between the realm's
     least and its ceiling). Its height follows the ground and what stands ahead in time: the ground read back about
     the camera (groundAt), the landmarks' solids and the clouds' cores of the cells about it (climbed over when the
     ceiling allows, passed beside by a slip sideways when not, the heading held). Whatever the input, no step leaves the camera in the ground, in a landmark's
     solid or in a cloud's core (the hard rules, applied after every step and counted). */
  var SIM_DT = 1 / 60;
  var SIM = { t: 0, V: null, u: 0, acc: 0, alpha: 1, steps: 0, fixG: 0, fixO: 0, inited: false, junction: false, waits: 0 };
  var TH_MAX = 35 * DEG;
  function freshState() {
    return { x: 0, y: 0, z: 0, psi: 0, yawV: 0, phi: 0, thU: 0, thP: 0, thPraw: 0, c: 0, vy: 0, om: 0, omP: 0, since: 9, roll: 0, yawRate: 0,
      lastIn: -1e9, idleAfter: 8, auto: 1, cy: 0, hl: 0, pf: NaN, pfT: 0, ring: new Float32Array(12), ringP: new Float32Array(12), ri: 0, sv: 0,
      lat: 0, latT: 0, latT2: 0, tsw: -1, fpsi: NaN, vs: 0, acc: 0, pt: -1e9, climbs: null, gV: null, pfE: 0, cw: NaN };
  }
  var CS = freshState(), CSP = freshState();
  function copyState(a, b) { b.x = a.x; b.y = a.y; b.z = a.z; b.yawV = a.yawV; b.phi = a.phi; b.thU = a.thU; b.thP = a.thP; b.roll = a.roll; b.psi = a.psi; b.cy = a.cy; b.pf = a.pf; b.pfT = a.pfT; b.cw = a.cw; }
  function simReset() {
    CS = freshState(); CSP = freshState(); SIM.t = 0; SIM.V = null; SIM.u = 0; SIM.acc = 0; SIM.alpha = 1; SIM.steps = 0; SIM.fixG = 0; SIM.fixO = 0; SIM.inited = false;
    INP.dx = INP.dy = 0; INP.rel = false; INPLOG.length = 0; INPQ.length = 0; INPQ.i = 0;
    GROUND.ok = false; GROUND.V = null; GCK[0] = -1;
    if (BIRDS) BIRDS.reset();
  }
  /* the flight begins at the landing (world6: once, for the page's life; no cloud to come down out of) */
  function arrive(V) {
    planVisit(V);
    var cl = V.clear;
    if (!SIM.inited) {
      var r = RNG(subseed(J.seed, 77)); CS.psi = CS.yawV = r.r(0, 2 * PI); SIM.inited = true;
      if (DEVMODE && POSE) CS.psi = CS.yawV = POSE[2] * DEG;
    }
    CS.x = 0; CS.z = 0; CS.c = cl[1]; CS.vy = 0; CS.thU = clamp(CS.thU, -TH_MAX, TH_MAX); CS.om = 0; CS.omP = 0; CS.sv = 0; CS.lat = 0; CS.latT = 0; CS.latT2 = 0; CS.tsw = -1; CS.fpsi = CS.psi; CS.vs = 0; CS.acc = 0; CS.pt = -1e9; if (CS.climbs) CS.climbs.length = 0;
    if (DEVMODE && POSE) { CS.x = POSE[0]; CS.z = POSE[1]; }
    if (CS.x || CS.z) { kwFollow(CS.x, CS.z, true); if (V.G) kwUpload(); }   // (dev: a landing elsewhere: its weights at once)
    CS.cw = NaN; cruiseStep(CS, 0); flightParams(V, CS.cw); CS.c = cl[1];   // (world6 step B: the landing's own clearance, from the maps ahead; one framing everywhere)
    if (DEVMODE && POSE && POSE[3] !== undefined && POSE[3] >= 0) CS.c = clamp(POSE[3], cl[0], cl[2]);
    if (DEVMODE && POSE && (CS.x || CS.z)) groundCache(V, CS.x, CS.z, true);   // (world6 step B fix, dev: a pose's own ground before its first height: it read the landing's, and the hard rule lifted the camera 46 times in the film's first 3 s)
    CS.y = (V.g0max !== undefined && !CS.x && !CS.z ? V.g0max : groundAt(V, CS.x, CS.z, true)) + CS.c;
    CS.yawV = CS.psi - CS.phi;
    V.evNext = 6 + V.evRng.r(0, 6); V.flocksEv = [];
    if (BIRDS) BIRDS.visit(V.k);
    climateLight(V);
    CSP.x = CS.x; CSP.y = CS.y; CSP.z = CS.z; CSP.pf = CS.pf; CSP.pfT = CS.pfT; CSP.cw = CS.cw;
    SIM.junction = true;
  }
  /* (E1.1 Fix 2, verify-regress-1's defect 2) the dive a kept tilt drives, once the finger is up: the view keeps the
     tilt the visitor set (nothing turns it by itself), but its dive fades out as the clearance comes down to the
     realm's cruise (KEEP_FLOOR of the way from its least to its cruise: DUNES 14 m, faded over the quarter of that span
     above it), and a clearance already below that (the drag's own dive) comes back up to it at KEEP_UP m/s: E1.1's
     kept tilt dived at 0.9 v sin(tilt) for good, so in DUNES (12 m/s) any tilt down over about 12 deg held the clearance
     at its 7 m floor, where the height's spring cannot follow the dunes, and the hard ground rule lifted the camera in
     one-tick steps 18-44 times a visit (vlong.js; c6b 0-16, no drag 0). A floor of 1.5 x the least (10.5 m) still left
     15 pushes on seed 5 and 4 after a passage into DUNES, at 11-12 m; flown left alone at the cruise there are none.
     While the finger is down (or the phone tilted: thP) the dive goes to the least as before. A tilt up climbs to the
     ceiling as before */
  var KEEP_FLOOR = 1, KEEP_UP = 2.2;
  function keptFloor(cl) { return cl[0] + KEEP_FLOOR * (cl[1] - cl[0]); }
  function keptTilt(th, c, cl, held) {
    if (held || !(th < 0)) return th;
    var a = keptFloor(cl);
    return th * smooth(a, a + Math.max(1, 0.25 * (cl[1] - cl[0])), c);
  }
  /* one step of the flight */
  function simStep() {
    var t = SIM.t + SIM_DT, j = worldAt(t), V = j.V;
    if (!V) return false;
    if (V !== SIM.V) {   // (world6: only at the start: the world is built, then flown for the page's life)
      /* (E1) built in the background long before its junction; in flight never built at once (round 3b's fallback was
         a synchronous build, a long task in flight): if it is not ready the flight holds at the junction, in the
         passage's cover, until it is (counted: SIM.waits). The harness's stills (simTo) build it at once */
      if (V.st < VSTAGES.length && !(STILLMODE && visitStep(V, true))) { SIM.waits++; return false; }
      arrive(V); SIM.V = V;
    }
    SIM.t = t; SIM.u = j.u; SIM.steps++;
    var dt = SIM_DT, u = j.u, cl = V.clear, v = V.speed;
    if (DEVMODE && SW.camhold) { CS.vy = 0; CS.yawRate = 0; events(V, t, u); return true; }   // (dev, Fix 2: the camera held where it is while the clock runs: G0's frozen-scene film, where any change from frame to frame is the world's own animation)
    applyInput(dt, t, V);
    // (hotfix H1, design-v5 Revision 3: "should keep flying same-ish direction unless user drags") left alone, the view
    // holds the heading the visitor last set (at the landing, the landing's own): no autopilot, no aim at places or
    // beacons, no weave, no turn from rising ground or round what stands ahead. Only a drag (or the phone's motion)
    // turns it. CS.auto now says only how long the flight has been left alone (6-10 s, eased in over 3 s): the
    // clearance then eases back to the realm's cruise height, level
    var idle = t - CS.lastIn;
    if (idle > CS.idleAfter && !NOAUTO) CS.auto = Math.min(1, CS.auto + dt / 3); else CS.auto = 0;
    CALM.k += clamp(CALM.want - CALM.k, -dt / CALM_T, dt / CALM_T);   // (round 3: the birds' calm eased in or out)
    // what stands ahead and cannot be climbed over: passed beside, the heading held (a slip sideways, never a turn)
    slipStep(V, CS, dt, true);
    // the flight follows the view (within about half a second; at most 52 deg/s)
    var want = CS.yawV + CS.phi, d = angDiff(want, CS.psi), turn = clamp(d * (1 - Math.exp(-dt / 0.45)), -0.9 * dt, 0.9 * dt);
    CS.psi += turn; CS.yawRate = turn / dt;
    // (world6 step B) one framing everywhere (basePitch: no weight, no mode); the cruise clearance a smooth function of
    // the maps ahead (the cloud sea's weight on the held line), followed at most CW_V a second, never by a clock
    cruiseStep(CS, dt); flightParams(V, CS.cw);
    envSolids(V, CS.x, CS.z);   // (fix: the formations' cones in the surface flown, this step's)
    // the clearance: the visitor's tilt climbs or dives; left alone it eases back to the cruise height (level: the
    // autopilot's height line, a swell of up to 38 m, is gone with the autopilot)
    var tilt = keptTilt(CS.thU, CS.c, cl, INP.down) + CS.thP;
    if (Math.abs(tilt) > 0.02) CS.c += v * Math.sin(tilt) * dt * 0.9;
    if (!INP.down && CS.thU < -0.02 && CS.c < keptFloor(cl)) CS.c = Math.min(keptFloor(cl), CS.c + KEEP_UP * dt);   // (E1.1 Fix 2: below the kept tilt's floor once the finger is up: back up to it)
    if (CS.auto > 0) CS.c += clamp(cl[1] - CS.c, -2.2 * dt, 2.2 * dt) * CS.auto;
    CS.c = clamp(CS.c, cl[0], cl[2]);
    // the height: the ground ahead in time and what stands on it, a spring toward it
    pitchLook(V, CS, dt, CALM.k);   // (round 3: the look at the ground ahead, eased under the birds' calm)
    var yT = heightTarget(V, t), w = VY_W, acc = clamp(w * w * (yT - CS.y) - 2 * w * CS.vy, -VY_ACC, yT > CS.y ? VY_ACCU : VY_ACC);
    CS.vy = clamp(CS.vy + acc * dt, -VY_DN, VY_UP);
    CS.y += CS.vy * dt;
    CS.x += (Math.sin(CS.psi) * v - Math.cos(CS.psi) * CS.sv) * dt; CS.z += (Math.cos(CS.psi) * v + Math.sin(CS.psi) * CS.sv) * dt;   // (on the heading, and the slip to its right: (-cos, sin))
    // the hard rules: never in the ground, a landmark or a cloud's core
    // (world6 step B fix, defect 10) over the envelope (never under the ground), and rate-limited to the climb's own
    // travel in a step (PUSH_V): the hard rule, if it acts at all, is never a jump; every push is counted (a gate fails)
    var gh = groundAt(V, CS.x, CS.z, true, true) + cl[0] * 0.6;   // (the ground itself: the envelope is the cruise's, never a wall; a cone entering the 320 m grid steps it, f1: 9 pushes at 1451 s with the ground 26 m under the eye)
    if (CS.y < gh) { CS.y = Math.min(gh, CS.y + PUSH_V * dt); if (CS.vy < 0) CS.vy = 0; SIM.fixG++; }
    pushOut(V);
    var ceil = groundAt(V, CS.x, CS.z, false) + cl[2] + CEIL_OVER;   // (the ceiling: never far over it; (fix) 10 m over the clearance's top, the flight band's top: bandTopAt)
    if (CS.y > ceil) { CS.y = ceil; if (CS.vy > 0) CS.vy = 0; }
    // banking with the turn, gentle and bounded
    var rl = clamp(-CS.yawRate * 0.42, -0.13, 0.13);
    CS.roll += (rl - CS.roll) * (1 - Math.exp(-dt / 0.6));
    events(V, t, u);
    directorStep(t);   // (world6: the director composes what lies ahead, out of sight; it never steers)
    climateLight(V);   // (world6 fix: every step: a pure function of where the camera is; at every sixth it stepped at 10 Hz)
    if (SIM.steps % 6 === 0) beamWake(V, u);
    if (DEVMODE && DEVTRACE) devTrace(V);
    return true;
  }

  /* ---------------------------------------------------------------- the ground and what stands ahead */
  var NEAR_OBST = [];
  function nearObstacles(V, range) { return nearObstaclesAt(V, CS.x, CS.z, range, NEAR_OBST); }   // the obstacles of the cells about the camera
  function nearObstaclesAt(V, x, z, range, out) {
    out.length = 0;
    var L = V.cellList; if (!L) return out;
    for (var i = 0; i < L.length; i++) {
      var C = L[i]; if (C.st < 2 || !C.obst.length) continue;
      var dx = C.bound[0] - x, dz = C.bound[2] - z, R = range + C.bound[3];
      if (dx * dx + dz * dz > R * R) continue;
      for (var k = 0; k < C.obst.length; k++) out.push(C.obst[k]);
    }
    return out;
  }
  function obstR(o, y, m) {   // an obstacle's radius in the horizontal plane at height y (with margin m), or -1
    if (o.c) return (y > o.y0 - m && y < o.y1 + m) ? o.r + m : -1;
    var dy = y - o.y, R = o.r + m;
    return Math.abs(dy) < R ? Math.sqrt(R * R - dy * dy) : -1;
  }
  function obstTop(o) { return o.c ? o.y1 : o.y + o.r; }
  /* the height to keep: the most the ground ahead asks over the next seconds (each sample's ground plus the clearance,
     less what a climb of about 22 deg makes up on the way), and the tops of solids the way crosses that can be climbed
     over (under the ceiling) */
  /* (world6 step B, the one camera) the height's spring and its limits: the vertical speed within VY_UP / VY_DN and its
     change within VY_ACC (well under what reads as a nod: the step's climbs ran 5.5 m/s with a 41 deg turn of the view),
     the ground ahead looked at over HT_T s at TAN_CLIMB (the slope those limits can climb, with room), so a rise is
     climbed early and gently */
  var TAN_CLIMB = Math.tan(11 * DEG), VY_UP = 2.6, VY_DN = 2.2, VY_ACC = 0.5, VY_ACCU = 1.0, VY_W = 0.55, HT_T = 12, CEIL_OVER = 10, PUSH_V = 3.9;   // (fix: a climb may gather at up to VY_ACCU m/s2, a descent's change at VY_ACC)
  function heightTarget(V, t) {
    var v = V.speed, cl = V.clear, hx = Math.sin(CS.psi), hz = Math.cos(CS.psi), yT = -1e9, T = HT_T, i;
    var g0 = groundAt(V, CS.x, CS.z, true);
    for (i = 0; i <= 16; i++) {
      var s = v * T * i / 16, ye = groundAt(V, CS.x + hx * s, CS.z + hz * s, true) + CS.c - s * TAN_CLIMB;
      if (ye > yT) yT = ye;
    }
    // a realm may look further, with a gentler slope: the eye rises early toward a crest far ahead, so it sees over it
    // (DUNES: the land's rises would otherwise fill the window behind the words)
    var LT = V.def.lookT || 0, LK = V.def.lookTan || TAN_CLIMB;
    if (LT > T) for (i = 1; i <= 12; i++) {
      var s3 = v * T + (v * LT - v * T) * i / 12, ye3 = groundAt(V, CS.x + hx * s3, CS.z + hz * s3, true) + CS.c - s3 * LK;
      if (ye3 > yT) yT = ye3;
    }
    // (hotfix H1, pass 2) on the slip's planned way (between the line now and the line it is going to: e), and with a
    // lead of CLIMB_LEAD s: the height's spring lags a ramp at TAN_CLIMB by about 2 s of it (2 x its rate / 0.95), so a
    // ramp aimed at the top's edge met it a few metres low and the hard rule lifted the camera in one step (seed 13:
    // 5.5 m); a floating stone above the eye is passed under or beside (slipPlan), never climbed from below
    var O = nearObstacles(V, v * T + 60), m = V.margin || V.def.margin || 14, e = CS.latT - CS.lat, lo = Math.min(0, e), hi = Math.max(0, e), lead = v * CLIMB_LEAD;
    for (i = 0; i < O.length; i++) {
      var o = O[i], ox = o.x - CS.x, oz = o.z - CS.z, s2 = ox * hx + oz * hz;
      if (s2 < -o.r - m || s2 > v * T + o.r) continue;
      var l2 = -ox * hz + oz * hx, lat = l2 < lo ? lo - l2 : (l2 > hi ? l2 - hi : 0), top = obstTop(o) + m;
      if (lat > o.r + m || (!o.c && !o.cloud && o.y > CS.y + 5) || !climbOK(V, CS, o, s2, top)) continue;   // (passed beside it, or too tall to climb: flown round; Fix 3: judged as slipGather judges it, climbOK)
      var ye2 = top + 4 - Math.max(s2 - o.r - lead, 0) * TAN_CLIMB;
      if (ye2 > yT) yT = ye2;
    }
    // (pass 2) the solids under the ceiling on the planned way further off (slipPlan's climbs), beyond the 8 s looked at
    // above: climbed at TAN_CLIMB from as far off as the plan sees them, so a tall one is never met late
    var CB = CS.climbs;
    if (CB) for (i = 0; i < CB.length; i++) {
      var q = CB[i], qx = q.x - CS.x, qz = q.z - CS.z, s4 = qx * hx + qz * hz;
      if (s4 <= v * T + q.r || s4 > Math.max(v * SLIP_T, SLIP_REACH) + q.r) continue;
      var l4 = -qx * hz + qz * hx, dl = l4 < lo ? lo - l4 : (l4 > hi ? l4 - hi : 0);
      if (dl > q.r + m) continue;
      var ye4 = obstTop(q) + m + 4 - Math.max(s4 - q.r - lead, 0) * TAN_CLIMB;
      if (ye4 > yT) yT = ye4;
    }
    return Math.max(yT, g0 + cl[0]);
  }
  /* (E1 Fix 3, the hotfix verify-2's item 2) can the camera climb over a solid (its top with the margin, `top`, s m
     ahead on the heading)? Only under the ceiling the camera will have: simStep's is the ground under the camera +
     clear[2] + 40. Pass 2 judged the top against the ground at the solid's centre + clear[2] alone, the camera's grid
     there (160 x 4 m about the camera: a solid farther off read the grid's edge), so on seed 27 (day, from 34 s) a
     mesa whose centre read 2 m while the valley the camera crossed lay at -159 m (its ceiling 21 m, the height wanted
     52 m) was taken for climbable: the slip planned no way past it and the hard rule pushed the camera along its face
     for 27 s (1,619 pushes, the course 41-53 deg off the heading). Now a solid is climbable only if its top is under
     both (1) the ground under it + clear[2] as before, that ground never above the item's own seat (exact, from the
     GPU: a column's y0 + 30) and (2) on the way in, at CR_D lengths of the height spring's lead short of it on the
     planned line, the solid's own top + CR_CLEAR (6 m: over the hard rule's 3.5) less TAN_CLIMB beyond the lead,
     under the ground there + clear[2] + 40 (where the ceiling holds the camera under heightTarget's top + margin + 4,
     it still passes over without a push: the first cut asked the margin too, and seed 29, climbed in c5 without a push,
     was slipped past at 0.35 x the speed); else it is a slip constraint, passed beside from first sight. Allocates
     nothing */
  var CR_D = [0.15, 0.5, 1, 1.6, 2.4], CR_CLEAR = 6;
  function climbOK(V, S, o, s, top) {
    var cl = V.clear, gi = groundAt(V, o.x, o.z, false);
    if (o.c && o.y0 + 30 < gi) gi = o.y0 + 30;
    if (top > gi + cl[2]) return false;
    var hx = Math.sin(S.psi), hz = Math.cos(S.psi), e = S.latT - S.lat, lead = V.speed * CLIMB_LEAD, edge = s - o.r;
    for (var i = 0; i < CR_D.length; i++) {
      var d = CR_D[i] * lead, q = edge - d;
      if (q < 0) continue;   // (passed already: the camera is nearer than that)
      var need = obstTop(o) + CR_CLEAR - Math.max(d - lead, 0) * TAN_CLIMB, gq = groundAt(V, S.x + hx * q - hz * e, S.z + hz * q + hx * e, false);
      if (need > gq + cl[2] + CEIL_OVER) return false;
    }
    return true;
  }
  /* (hotfix H1, pass 2) the way past what stands ahead with the heading held, planned from first sight. Pass 1 slipped
     round the nearest solid only, seen 24 s ahead, wanting the offset still needed over the time left: a wide mesa
     (DUNES: 105-250 m across, its top 170-335 m over the camera) or a great tower's core (ABOVE: up to 186 m) needed
     more than its 14 deg of crab could give, and the hard rule pushed the camera along their faces for seconds (6 of 11
     seeds, 81-1091 pushes); a solid it took for climbed was climbed only once heightTarget saw it, 8 s off, too late
     for a tall one; and it flew into clouds' visible bodies, which it did not see.
     Now every SLIP_PLAN = 0.25 s (and at once when the heading has turned) slipPlan looks SLIP_T = 90 s of flight
     ahead (at least SLIP_REACH = 1,200 m; the cells hold their solids 3.8-5.2 km out) and chooses the line to fly: an
     offset from the present line and a speed of slip, among a few dozen offsets (the line in hand, the slip stopped
     where it is, each edge of the 30 solids met soonest, a ladder) and seven speeds (SLIP_SPD x the realm's speed:
     2.3, 4.6 and 7.4 deg of crab, then 11-24 deg, the last four only to keep out of a solid's own zone: SLIP_SPDK),
     each flown in thought by the slip's own controller (slipTraj, 0.5 s a sample) and costed (slipCost) by how far it
     would pass inside a solid's own zone (SLIP_IN = 6 m about it: where the hard rule acts; SLIP_WIN a metre), inside
     its margin (avoidS's: 1.6 x the realm's for a cloud's core; SLIP_WOUT), inside a cloud's visible body (its lobes
     at the camera's height, SLIP_SOFT m about them: a cost, SLIP_WSOFT, not a wall), each the more the sooner it is
     met (SLIP_URG, SLIP_URGI: a conflict a minute off is weighed lightly, as later plans will meet it with more of the
     picture), how far it moves the line and how much crab it needs; the plan in hand is kept unless another is clearly
     better (15% and 150), so two near-equal ways never alternate. Where no single line keeps out of every solid's
     own zone, two lines are tried (the first past one of the solids met soonest, to its centre, then another: the way
     between two mesas that overlap across the line but not along it). A landmark under the ceiling is climbed over
     instead (heightTarget sees it as far off as the plan does, on the planned way: CS.climbs, with CLIMB_LEAD s in
     hand for the height's spring), but never a cloud's core (that would fly through its visible top) nor a floating
     stone above the eye (passed under or beside). At a visit's start, while the view is still wholly covered (the
     landing before its first frame, or the first 0.45 s of the cloud a visit begins in: FS_INCLOUD holds the view whole
     that long), a line that would meet a solid's own zone is not flown at all: the camera is placed on the nearest
     clear line beside it (up to 420 m; never inside a solid), unseen; the cloud about the eye is fixed in its own
     frame (TRAVEL), so nothing on the screen moves with it. The slip (S.sv, m/s, + to the right) flies the chosen line
     by a controller eased at SLIP_ACC x the speed a second and braking in time (slipCtl), so its lateral acceleration
     is never over 1.05 m/s2 (pass 1's hard-rule onsets: 35-72 m/s2). The view never turns; the hard rule (pushOut) is
     untouched, the last resort. The forecast (aheadSub) flies the flight's plan by the same controller.
     (E1.1, item 8) Two rates of easing: SLIP_ACC = 0.034 x the speed a second, so the course never swings more than
     9.7 deg in 5 s (tan 9.7 deg = 0.034 x 5; c6b's 0.05 swung 10.2-14.0 deg on 6 of 50 seeds), and SLIP_ACC2 = 0.05,
     the hotfix's, only where no plan eased at the first keeps out of a solid's own zone (the plan's cost there,
     SLIP_WIN x 0.02 and over) and one eased at the second does better: the plan is made at the first and, only then,
     again at the second (S.acc: the factor the plan in hand was made at). c6c's 0.035 for every plan (taken back) was
     a later slip where it was urgent and the hard rule pushed (seeds 4 and 8) */
  var SLIP_T = 90, SLIP_REACH = 1200, SLIP_SPD = [0.04, 0.08, 0.13, 0.2, 0.25, 0.35, 0.45], SLIP_SPDK = [0, 0, 0, 3000, 5000, 8000, 12000], SLIP_ACC = 0.034, SLIP_ACC2 = 0.05, SLIP_PLAN = 0.25, SLIP_DT = 0.5;
  var SLIP_IN = 6, SLIP_WIN = 1e5, SLIP_WOUT = 15, SLIP_SOFT = 8, SLIP_WSOFT = 3, SLIP_KC = 100, SLIP_URG = 15, SLIP_URGI = 20, SLIP_NC = 30, CLIMB_LEAD = 2.2;
  var SLIP_O = [], SPN = 0, SPMAX = 400, SPS = new Float64Array(SPMAX), SPSH = new Float64Array(SPMAX), SPL = new Float64Array(SPMAX), SPLH = new Float64Array(SPMAX), SPRI = new Float64Array(SPMAX), SPU = new Float64Array(SPMAX), SPUI = new Float64Array(SPMAX);
  var SPK0 = new Int32Array(SPMAX), SPK1 = new Int32Array(SPMAX), SPORD = new Int32Array(SPMAX), SPX = new Float64Array(420), SPC = new Float64Array(900);
  /* (round E1 Fix 3, S6) the plan's constants made once: pass 2 made its ladders and the order's view and comparator at
     every plan (four times a second), and Fix 2's slip was the frame path's largest allocator (9.9 MB in 26 s of flight,
     verify-gates-2); the plan now allocates nothing once warm (the order kept by an insertion sort, stable as the sort
     it replaces) */
  var SLIP_LAD = [15, 30, 50, 80, 120, 170, 230, 300], SLIP_LAD2 = [20, 40, 60, 90, 120, 160, 200, 250, 300, 360, 420], SLIP_SP2 = [1, 2, 4, 6], SPKEY = new Float64Array(SPMAX);
  function slipOrder(n) {   // SPORD[0..n) by when each constraint is first met (SPS - SPSH), ascending, stable
    for (var i = 0; i < n; i++) { SPORD[i] = i; SPKEY[i] = SPS[i] - SPSH[i]; }
    for (i = 1; i < n; i++) { var o = SPORD[i], k = SPKEY[o], j = i - 1; while (j >= 0 && SPKEY[SPORD[j]] > k) { SPORD[j + 1] = SPORD[j]; j--; } SPORD[j + 1] = o; }
  }
  /* the slip's controller: toward the line still to go (e m) at the plan's speed vs, eased at a m/s2, braking so it
     stops on the line */
  function slipCtl(sv, e, vs, a, dt) {
    var want = (e < 0 ? -1 : 1) * Math.min(vs, Math.sqrt(2 * a * Math.abs(e)) * 0.85);
    return sv + clamp(want - sv, -a * dt, a * dt);
  }
  function slipAdd(sc, sh, lc, lh, ri, v) {   // (its weights by how soon it is met: a margin or a cloud's body 0.3-3.3, a solid's own zone 0.02-1.02)
    if (SPN >= SPMAX) return;
    var t = Math.max(sc - sh, 0) / v;
    SPS[SPN] = sc; SPSH[SPN] = sh; SPL[SPN] = lc; SPLH[SPN] = lh; SPRI[SPN] = ri; SPU[SPN] = 0.3 + 3 * Math.exp(-t / SLIP_URG); SPUI[SPN] = 0.02 + Math.exp(-t / SLIP_URGI); SPN++;
  }
  /* what stands on the way (from S, out to wide m more to either side): SPN constraints in the heading's frame */
  var SPOFF = 0;
  function slipGather(V, S, wide) {
    var v = V.speed, cl = V.clear, m = V.margin || V.def.margin || 14, hx = Math.sin(S.psi), hz = Math.cos(S.psi), rx = -hz, rz = hx, i;
    var T = Math.max(SLIP_T, SLIP_REACH / v), Smax = v * T, Lmax = SLIP_SPD[SLIP_SPD.length - 1] * v * T * 0.75 + (wide || 0);
    var x0 = S.x, z0 = S.z, climbs = S.climbs || (S.climbs = []); climbs.length = 0; SPN = 0;
    // the solids: a cloud's core always passed beside; a landmark under the ceiling climbed over; the rest passed beside
    var O = nearObstaclesAt(V, x0, z0, Smax + 320, SLIP_O);
    for (i = 0; i < O.length; i++) {
      var o = O[i], ox = o.x - x0, oz = o.z - z0, s = ox * hx + oz * hz, l = ox * rx + oz * rz, mm = m * (o.cloud ? 1.6 : 1);
      var rr = Math.max(obstR(o, S.y, mm), obstR(o, S.y + 20, mm), obstR(o, S.y - 20, mm));
      if (rr < 0 || s < -rr || s > Smax + rr || Math.abs(l) > Lmax + rr) continue;
      if (!o.cloud && (o.c || o.y <= S.y + 5) && climbOK(V, S, o, s, obstTop(o) + m)) { climbs.push(o); continue; }   // (a floating stone above the eye: passed under or beside, never climbed; Fix 3: climbable only under the ceiling the camera will have, climbOK)
      var ri = Math.max(obstR(o, S.y, SLIP_IN), obstR(o, S.y + 20, SLIP_IN), obstR(o, S.y - 20, SLIP_IN), 0);
      slipAdd(s, rr, l, rr, ri, v);
    }
    // the clouds' visible bodies: their lobes at the camera's height, a box on the way (a cost: kept out of when it can be)
    var L = V.cellList;
    for (var ci = 0; L && ci < L.length; ci++) {
      var C = L[ci]; if (C.st < 2 || !C.softB || !C.soft) continue;
      for (var bj = 0; bj < C.softB.length; bj++) {
        var sb = C.softB[bj], bx = sb[0] - x0, bz = sb[2] - z0, bs = bx * hx + bz * hz, bl = bx * rx + bz * rz, R = sb[3] + SLIP_SOFT;
        if (bs < -R || bs > Smax + R || Math.abs(bl) > Lmax + R || Math.abs(sb[1] - S.y) > R) continue;
        var s0 = 1e9, s1 = -1e9, l0 = 1e9, l1 = -1e9, Sf = C.soft;
        for (var li = sb[4]; li < sb[5]; li += 4) {
          var dy = S.y - Sf[li + 1], Rl = Sf[li + 3] + SLIP_SOFT; if (dy >= Rl || dy <= -Rl) continue;
          var r2 = Math.sqrt(Rl * Rl - dy * dy), qx = Sf[li] - x0, qz = Sf[li + 2] - z0, qs = qx * hx + qz * hz, ql = qx * rx + qz * rz;
          if (qs - r2 < s0) s0 = qs - r2; if (qs + r2 > s1) s1 = qs + r2; if (ql - r2 < l0) l0 = ql - r2; if (ql + r2 > l1) l1 = ql + r2;
        }
        if (s1 < 0 || s0 > Smax) continue;
        slipAdd((s0 + s1) / 2, (s1 - s0) / 2, (l0 + l1) / 2, (l1 - l0) / 2, -1, v);
      }
    }
    var K = Math.round(T / SLIP_DT);
    for (i = 0; i < SPN; i++) { SPK0[i] = Math.max(0, Math.ceil((SPS[i] - SPSH[i]) / (v * SLIP_DT))); SPK1[i] = Math.min(K, Math.floor((SPS[i] + SPSH[i]) / (v * SLIP_DT))); }
    return K;
  }
  /* the cost of the way SPX[0..K] (m to the right, a sample every SLIP_DT s) against the constraints, stopping once
     over lim: inside a solid's own zone (SLIP_IN m: where the hard rule acts) far the most, inside its margin less, inside
     a cloud's visible body less again; the nearer, the more */
  function slipCost(V, K, lim) {
    var v = V.speed, cost = 0;
    for (var i = 0; i < SPN && cost < lim; i++) {
      var po = 0, pi = 0, sc = SPS[i], sh = SPSH[i], lc = SPL[i], lh = SPLH[i], ri = SPRI[i];
      for (var k = SPK0[i]; k <= SPK1[i]; k++) {
        var hw = lh, ds = k * v * SLIP_DT - sc, ax;
        if (ri >= 0) { var q2 = sh * sh - ds * ds; if (q2 <= 0) continue; hw = Math.sqrt(q2); }
        ax = Math.abs(SPX[k] + SPOFF - lc);
        if (hw - ax > po) po = hw - ax;
        if (ri > 0) { var q3 = ri * ri - ds * ds; if (q3 > 0 && Math.sqrt(q3) - ax > pi) pi = Math.sqrt(q3) - ax; }
      }
      cost += ri >= 0 ? SPU[i] * SLIP_WOUT * po + SPUI[i] * SLIP_WIN * pi : SPU[i] * SLIP_WSOFT * po;
    }
    return cost;
  }
  /* (E1.1, item 8) the plan made at the gentle easing; again at the hotfix's only where that meets a solid's own zone and
     the quicker does better (the plan in hand then kept at the rate that costs it least) */
  function slipPlan(V, S) {
    var c0 = slipPlanA(V, S, SLIP_ACC, true);
    if (c0 < SLIP_WIN * 0.02) { S.acc = SLIP_ACC; return; }
    var lt = S.latT, lt2 = S.latT2, tw = S.tsw, vs = S.vs;
    var c1 = slipPlanA(V, S, SLIP_ACC2, false);
    if (c1 < c0) S.acc = SLIP_ACC2;
    else { S.latT = lt; S.latT2 = lt2; S.tsw = tw; S.vs = vs; S.acc = SLIP_ACC; }
  }
  /* a plan at the easing ak (x the speed a second): its cost (the plan in hand's if kept); arrive: the arrival's line
     may be chosen (the first pass only) */
  function slipPlanA(V, S, ak, arrive) {
    var v = V.speed, a = ak * v, i, k, K = slipGather(V, S, 0), T = K * SLIP_DT;
    var e0 = S.latT - S.lat, dstop = S.sv * Math.abs(S.sv) / (2 * a * 0.72);
    if (!SPN) { if (Math.abs(e0) > Math.abs(dstop) + 0.5) S.latT = S.lat + dstop; S.latT2 = S.latT; S.tsw = -1; return 0; }   // (nothing on the way: the slip eased out where it is)
    // (the arrival: a line that meets a solid's own zone, and the view still wholly covered (the cloud or cover a visit
    // begins in, or the landing before its first frame): the camera comes out of it on the nearest clear line instead)
    if (arrive && S === CS && arrivalCovered(V)) {
      for (k = 0; k <= K; k++) SPX[k] = dstop * Math.min(1, k * SLIP_DT / 4);
      if (slipCost(V, K, 1e18) >= SLIP_WIN * 0.5) {
        var bo = 0, bc = 1e18, lad2 = SLIP_LAD2;
        K = slipGather(V, S, 430);   // (gathered once, wide; each line tried by its offset, SPOFF)
        for (k = 0; k <= K; k++) SPX[k] = 0;
        var O2 = nearObstaclesAt(V, S.x, S.z, 520, SLIP_O2);
        for (var j = 0; j < lad2.length * 2; j++) {
          var off = (j & 1 ? -1 : 1) * lad2[j >> 1]; SPOFF = off;
          if (solidAt(O2, S.x - Math.cos(S.psi) * off, S.y, S.z + Math.sin(S.psi) * off, 6)) continue;   // (never into a solid, even one it would climb)
          var cc = slipCost(V, K, bc) + Math.abs(off) * 2;
          if (cc < bc) { bc = cc; bo = off; }
          if (cc < SLIP_WIN * 0.01 + Math.abs(off) * 2) break;
        }
        SPOFF = 0;
        if (bo) { var rx = -Math.cos(S.psi) * bo, rz = Math.sin(S.psi) * bo; S.x += rx; S.z += rz; CSP.x += rx; CSP.z += rz; SIM.reseat = (SIM.reseat || 0) + 1; if (BIRDS) BIRDS.visit(V.k); }   // (the birds' sky begins again about the camera, as at the arrival)
        K = slipGather(V, S, 0); dstop = 0; S.sv = 0; S.latT = S.latT2 = S.lat; S.tsw = -1;
      }
    }
    // the candidates: the line held, the slip stopped, each constraint's two edges, a ladder
    var nc = 0; SPC[nc++] = e0; SPC[nc++] = dstop;
    var lad = SLIP_LAD;
    for (k = 0; k < lad.length; k++) { SPC[nc++] = lad[k]; SPC[nc++] = -lad[k]; }
    // (each edge of the SLIP_NC constraints met soonest, never two candidates within 4 m: the plan's work bounded)
    slipOrder(SPN); var ord = SPORD;
    for (var oi = 0; oi < Math.min(SPN, SLIP_NC); oi++) {
      i = ord[oi];
      for (var sd = -1; sd <= 1; sd += 2) {
        var cd = SPL[i] + sd * (SPLH[i] + 3), dup = false;
        for (k = 0; k < nc && !dup; k++) if (Math.abs(SPC[k] - cd) < 4) dup = true;
        if (!dup) SPC[nc++] = cd;
      }
    }
    var Lmax = SLIP_SPD[SLIP_SPD.length - 1] * v * T * 0.75, e2 = S.tsw > SIM.t ? S.latT2 - S.lat : e0, kw0 = S.tsw > SIM.t ? Math.round((S.tsw - SIM.t) / SLIP_DT) : K + 1;
    // the plan in hand (its second line too, if it has one), costed in full: kept unless another is clearly better
    var keep = 1e18, kt = SLIP_SPD.indexOf(S.vs / v);
    for (var t0 = 0; t0 < SLIP_SPD.length; t0++) if (Math.abs(SLIP_SPD[t0] * v - (S.vs || 0)) < 1e-6) kt = t0;
    if (kt >= 0) { slipTraj(K, S.sv, e0, e2, kw0, S.vs, a); keep = SLIP_SPDK[kt] + Math.abs(e2) + SLIP_KC * SLIP_SPD[kt] * Math.max(Math.abs(e0), Math.abs(e2)) / v + slipCost(V, K, 1e18); }
    var lim = keep * 0.85 - 150, best = 1e18, bd = e0, bd2 = e2, bk = kw0, bv = S.vs || SLIP_SPD[0] * v;
    for (var t = 0; t < SLIP_SPD.length; t++) {
      var c1 = SLIP_SPD[t], vs = c1 * v, pen = SLIP_SPDK[t];   // (over 7.4 deg of crab only to keep out of a solid's own zone)
      for (var c = 0; c < nc; c++) {
        var d = SPC[c]; if (Math.abs(d) > Lmax) continue;
        var cost = pen + Math.abs(d) + Math.abs(d - e0) + ((e0 > 10 && d < -10) || (e0 < -10 && d > 10) ? 300 : 0) + SLIP_KC * c1 * Math.abs(d) / v;
        if (cost >= Math.min(best, lim)) continue;
        slipTraj(K, S.sv, d, d, K + 1, vs, a);
        cost += slipCost(V, K, Math.min(best, lim) - cost);
        if (cost < Math.min(best, lim)) { best = cost; bd = d; bd2 = d; bk = K + 1; bv = vs; }
      }
    }
    // (no single line keeps out of every solid's own zone: two lines, the first past one of the solids met soonest (to
    // its centre), then another (the way between two mesas that overlap across the line but not along it: seed 20's
    // DUNES, 540 s). Rarely needed, so tried only then, and at four of the speeds)
    if (Math.min(best, keep) >= SLIP_WIN * 0.02) {
      var SP2 = SLIP_SP2;
      for (var oj = 0, nh = 0; oj < SPN && nh < 4; oj++) {
        i = ord[oj]; if (!(SPRI[i] > 0)) continue; nh++;
        var kw = Math.max(1, Math.min(K, Math.round(SPS[i] / (v * SLIP_DT))));
        for (var s1 = -1; s1 <= 1; s1 += 2) {
          var d1 = SPL[i] + s1 * (SPLH[i] + 3); if (Math.abs(d1) > Lmax) continue;
          for (var t2 = 0; t2 < SP2.length; t2++) {
            var tt = SP2[t2], c2 = SLIP_SPD[tt], vs2 = c2 * v;
            for (c = 0; c < Math.min(nc, 24); c++) {
              var dd = SPC[c]; if (Math.abs(dd) > Lmax) continue;
              var cost2 = SLIP_SPDK[tt] + Math.abs(dd) + Math.abs(d1 - e0) + SLIP_KC * c2 * (Math.abs(d1) + Math.abs(dd - d1)) / v;
              if (cost2 >= Math.min(best, lim)) continue;
              slipTraj(K, S.sv, d1, dd, kw, vs2, a);
              cost2 += slipCost(V, K, Math.min(best, lim) - cost2);
              if (cost2 < Math.min(best, lim)) { best = cost2; bd = d1; bd2 = dd; bk = kw; bv = vs2; }
            }
          }
        }
      }
    }
    if (best >= lim) return keep;   // (the plan in hand kept)
    S.latT = S.lat + bd; S.latT2 = S.lat + bd2; S.tsw = bk <= K ? SIM.t + bk * SLIP_DT : -1; S.vs = bv;
    return best;
  }
  /* the way the slip's controller flies (SPX[0..K], m to the right of the camera now, a sample every SLIP_DT s): toward
     d1, and from sample kw on toward d2, at vs */
  function slipTraj(K, sv, d1, d2, kw, vs, a) {
    var x = 0; SPX[0] = 0;
    for (var k = 1; k <= K; k++) {
      var d = k < kw ? d1 : d2;
      sv = slipCtl(sv, d - x, vs, a, SLIP_DT); x += sv * SLIP_DT; SPX[k] = x;
      if (k >= kw && Math.abs(d2 - x) < 0.05 && Math.abs(sv) < 0.02) { for (var k2 = k + 1; k2 <= K; k2++) SPX[k2] = x; break; }
    }
  }
  /* inside a solid (the hard rule's own test, with mh m to spare): a cylinder's column or a sphere */
  var SLIP_O2 = [];
  function solidAt(O, x, y, z, mh) {
    for (var i = 0; i < O.length; i++) {
      var o = O[i], dx = x - o.x, dz = z - o.z;
      if (o.c) { if (y <= o.y1 + mh && y >= o.y0 - mh && dx * dx + dz * dz < (o.r + mh) * (o.r + mh)) return true; }
      else { var dy = y - o.y, R = o.r + mh * 2; if (dx * dx + dy * dy + dz * dz < R * R) return true; }
    }
    return false;
  }
  /* the view not yet shown: the landing before its first frame (world6: there is no other cover) */
  function arrivalCovered(V) { return !shown && SIM.t < 1; }
  /* a step of the slip (the flight's, plan true; the forecast's, flying the plan it was given) */
  function slipStep(V, S, dt, plan) {
    var v = V.speed;
    if (!(S.fpsi === S.fpsi) || Math.abs(angDiff(S.psi, S.fpsi)) > 0.004) { S.latT -= S.lat; S.latT2 -= S.lat; S.lat = 0; S.fpsi = S.psi; if (plan) S.pt = -1e9; }   // (the heading turned: the line still to go, in the new frame)
    if (plan && SIM.t - S.pt >= SLIP_PLAN) { S.pt = SIM.t; slipPlan(V, S); }
    var now = plan ? SIM.t : S.t;
    if (S.tsw > 0 && now >= S.tsw) { S.latT = S.latT2; S.tsw = -1; }   // (the plan's second line, from its time on)
    S.sv = slipCtl(S.sv, S.latT - S.lat, S.vs || SLIP_SPD[0] * v, (S.acc || SLIP_ACC) * v, dt);   // (E1.1: at the rate its plan was made at)
    S.lat += S.sv * dt;
  }
  /* the hard rule: out of any solid (a landmark's cylinder, a cloud's core), pushed out by the shortest way */
  function pushOut(V) {
    var O = nearObstacles(V, 80), mh = 3.5;
    for (var i = 0; i < O.length; i++) {
      var o = O[i], dx = CS.x - o.x, dz = CS.z - o.z;
      if (o.c) {
        if (CS.y > o.y1 + mh || CS.y < o.y0) continue;
        var d = Math.sqrt(dx * dx + dz * dz), R = o.r + mh;
        if (d >= R) continue;
        var up = o.y1 + mh - CS.y, outh = R - d;
        if (up < outh) { CS.y = o.y1 + mh; if (CS.vy < 0) CS.vy = 0; }
        else { var k = R / Math.max(d, 1e-3); CS.x = o.x + dx * k; CS.z = o.z + dz * k; }
        SIM.fixO++;
      } else {
        var dy = CS.y - o.y, dd = Math.sqrt(dx * dx + dy * dy + dz * dz), R2 = o.r + mh * 2;
        if (dd >= R2) continue;
        var k2 = R2 / Math.max(dd, 1e-3); CS.x = o.x + dx * k2; CS.y = o.y + dy * k2; CS.z = o.z + dz * k2;
        SIM.fixO++;
      }
    }
  }

  /* ---------------------------------------------------------------- the places, the birds' calm, the look ahead */
  /* (Fix 2 of round E1, design-v5 Revision 3 #1 and 13.4: the tour is retired) Round 3b's autopilot flew on, left
     alone, toward the places the cells hold, with a weave, a turn from rising ground and a way round what stood ahead.
     All of it is gone (apChoose, apPath, apAim, apDone, apAlt, the clear way's search, autopilot, WEAVE, calmCap,
     calmSlew, avoid, avoidS): nothing turns the view but the visitor's drag and the phone's motion. The places
     themselves stay (the dev hook lists them) */
  function apPois(V) {
    var out = [], L = V.cellList; if (!L) return out;
    for (var i = 0; i < L.length; i++) { var C = L[i]; if (C.st >= 2) for (var k = 0; k < C.pois.length; k++) out.push(C.pois[k]); }
    return out;
  }
  /* (round 3) the birds' calm. While the ink birds have a flight in the sky (or one being planned) the module asks for
     it (HOST.calm(rate, ev), rad/s; 0: none), eased in and out over CALM_T s (k). (Fix 2: with the autopilot gone the
     view never turns by itself, so the calm holds only the look at the ground ahead, pitchLook; rate and ev are kept
     as the module gives them.) The visitor's own input is never held */
  var CALM = { want: 0, k: 0, rate: 0.0175, ev: 0.05 }, CALM_T = 2;
  /* (round 3) the camera's look at the ground ahead (the realm's pitchFollow of its slope over V.def.look m), followed over
     CALM_PITCH s under the calm (none without it): over DUNES's rises it pitched the view up to 2 deg/s, sweeping every
     bird up or down the window at up to 40 px/s, and bending their ways there. S.pfT: the look now; S.pf: as followed */
  var CALM_PITCH = 1.6, PF_EASE = 1.5, PF_K = 0.3;
  /* (round E1 Fix 3) the look eased in when a visit's own ground first arrives (the grid's first read, a few frames after
     the change of realm): until then groundAt has only the realm's placeholder height, the look is level, and its read
     landing stepped the view's pitch by 0.6-0.8 deg in one frame inside the cloud (seed 1: at all four junctions, H1's
     camera bound being 0.5 deg a frame); now followed over PF_EASE s at CALM_PITCH x PF_K (0.48 s), the following
     itself eased out over its last 0.5 s */
  function pitchLook(V, S, dt, k) {
    var look = V.def.look || 90, yaw = S.yawV + S.phi, ga = groundAt(V, S.x + Math.sin(yaw) * look, S.z + Math.cos(yaw) * look, false), gh = groundAt(V, S.x, S.z, false);
    S.pfT = Math.atan2(ga - gh, look) * pfK(V);
    if (GROUND.V === V && GROUND.ok && S.gV !== V) { S.gV = V; if (S.pf === S.pf) S.pfE = PF_EASE; }   // (the visit's own ground arrived)
    var kk = S.pfE > 0 ? Math.max(k, PF_K * Math.min(1, S.pfE / 0.5)) : k; if (S.pfE > 0) S.pfE -= dt;   // (its last 0.5 s eased out: ended at once, the lag of a look still moving stepped the pitch 0.5-0.9 deg: seeds 8, 19, 20)
    var pf0 = S.pf;
    if (!(S.pf === S.pf) || kk <= 0) S.pf = S.pfT;
    else S.pf += (S.pfT - S.pf) * (1 - Math.exp(-dt / (CALM_PITCH * kk)));
    if (pf0 === pf0) S.pf = pf0 + clamp(S.pf - pf0, -PF_RATE * dt, PF_RATE * dt);   // (Fix 3: at most PF_RATE)
  }
  /* (E1 Fix 3, the hotfix verify-2's item 1) the look followed at most PF_RATE (1.5 deg/s): without the birds' calm it
     followed the ground at once, and over DUNES (seed 13 at 405-408 s, a visit's middle) the view pitched 7 deg in 3 s,
     at up to 3.77 deg/s, by itself; the look is the one turn of the view left alone besides the carry inside the cloud */
  var PF_RATE = 1.5 * DEG;
  /* ---------------------------------------------------------------- the flight ahead
     (round 2, for the birds' planner: HOST.ahead) The camera's coming view, predicted from the flight as it is now:
     where the camera will be and the way it will look (the view's yaw, its pitch and roll), at `step` s intervals.
     (Fix 2) Left alone the heading is held, so the prediction holds until the visitor drags; while a drag is held the
     view is held (a release's coast spent first); what stands ahead is passed by the same slip as the flight's. The ground is the cache's (about the camera). It never changes the flight; it is worked in
     chunks (a reset starts it again from the flight as it is), so no one step pays for a long look ahead. */
  var AH = { on: false, t: 0, x: 0, z: 0, y: 0, vy: 0, yawV: 0, psi: 0, auto: 0, roll: 0, c: 0, om: 0, omP: 0, thU: 0, since: 0, k: 0,
             phi: 0, thP: 0, held: false, V: null, u: 0,
             calmK: 0, calmWant: 0, calmRate: 0, calmEv: 0, sv: 0, lat: 0, latT: 0, latT2: 0, tsw: -1, fpsi: NaN, vs: 0, acc: 0, gV: null, pfE: 0, cw: 0, cl: [7, 14, 60] };
  /* (round 3) channels: each caller's forecast its own (the birds' planner on 0, carried on a chunk at a time; their
     flights' guard on 1, a few seconds from now): one never resets the other's */
  var AHS = [AH];
  function ahSel(ch) {
    ch = ch | 0;
    if (!AHS[ch]) { var o = {}, k; for (k in AHS[0]) o[k] = AHS[0][k]; o.on = false; o.obst = []; o.obstV = null; o.obstT = -1e9; o.cl = [7, 14, 140]; AHS[ch] = o; }   // (its own list of what stands ahead)
    AH = AHS[ch];
  }
  function aheadReset() {
    var V = SIM.V; AH.on = !!V; if (!V) return;
    AH.V = V; AH.t = SIM.t; AH.u = SIM.u; AH.k = 0;
    AH.x = CS.x; AH.z = CS.z; AH.y = CS.y; AH.vy = CS.vy; AH.yawV = CS.yawV; AH.psi = CS.psi; AH.auto = CS.auto;
    AH.roll = CS.roll; AH.c = CS.c; AH.om = INP.down ? 0 : CS.om; AH.omP = INP.down ? 0 : CS.omP; AH.thU = CS.thU; AH.since = CS.since; AH.phi = CS.phi; AH.thP = CS.thP; AH.held = !!INP.down;
    AH.calmK = CALM.k; AH.calmWant = CALM.want; AH.calmRate = CALM.rate; AH.calmEv = CALM.ev; AH.pf = CS.pf; AH.pfT = CS.pfT; AH.sv = CS.sv; AH.lat = CS.lat; AH.latT = CS.latT; AH.latT2 = CS.latT2; AH.tsw = CS.tsw; AH.fpsi = CS.fpsi; AH.vs = CS.vs; AH.acc = CS.acc; AH.gV = CS.gV; AH.pfE = CS.pfE; AH.cw = CS.cw;
    if (!AH.obst) AH.obst = [];
    if (AH.obstV !== V || !(SIM.t - AH.obstT < 1)) { nearObstaclesAt(V, CS.x, CS.z, V.speed * 52 + 120, AH.obst); AH.obstV = V; AH.obstT = SIM.t; }   // (round 3: what the forecast may pass beside, out to ~40 s of flight; gathered once a second)
  }
  function aheadSub(h) {
    var V = AH.V, v = V.speed, cl = AH.cl || (AH.cl = [7, 14, 140]);
    cruiseStep(AH, h); var A0 = V.def.clear || cl; cl[0] = A0[0]; cl[1] = cruiseOf(V, AH.cw); cl[2] = A0[2];   // (world6 step B: the forecast's clearance, as the flight's)
    AH.t += h; AH.u += h;
    // (hotfix H1) left alone the heading is held, as the flight holds it: no autopilot, no turn of its own; only how
    // long it has been left alone (the clearance eased back to the cruise height) and the slip past what stands ahead
    if (AH.held) AH.auto = 0;
    else if (AH.t - CS.lastIn > CS.idleAfter && !NOAUTO) AH.auto = Math.min(1, AH.auto + h / 3); else AH.auto = 0;
    AH.calmK += clamp(AH.calmWant - AH.calmK, -h / CALM_T, h / CALM_T);
    slipStep(V, AH, h, false);   // (pass 2: the flight's planned line, flown by the same controller)
    // a release's coast (E1.1: the tilt kept)
    if (!AH.held) { AH.yawV += AH.om * h; AH.om *= Math.exp(-h / 0.3); AH.thU = clamp(AH.thU + AH.omP * h, -TH_MAX, TH_MAX); AH.omP *= Math.exp(-h / 0.2); AH.since += h; }   // (E1.1: the tilt kept, as the flight keeps it, its short coast spent)
    // the flight follows the view; the roll banks with its turn
    var dpsi = angDiff(AH.yawV + AH.phi, AH.psi), turn = clamp(dpsi * (1 - Math.exp(-h / 0.45)), -0.9 * h, 0.9 * h);
    AH.psi += turn;
    var rl = clamp(-turn / h * 0.42, -0.13, 0.13); AH.roll += (rl - AH.roll) * (1 - Math.exp(-h / 0.6));
    // the clearance (left alone: back to the cruise height, level) and the height (a spring toward the ground ahead)
    var tiltA = keptTilt(AH.thU, AH.c, cl, AH.held) + AH.thP;   // (E1.1: the kept tilt climbs or dives, as simStep's does, to the clearance's limits; Fix 2: its dive faded as simStep's)
    if (Math.abs(tiltA) > 0.02) AH.c += v * Math.sin(tiltA) * h * 0.9;
    if (!AH.held && AH.thU < -0.02 && AH.c < keptFloor(cl)) AH.c = Math.min(keptFloor(cl), AH.c + KEEP_UP * h);
    if (AH.auto > 0) AH.c += clamp(cl[1] - AH.c, -2.2 * h, 2.2 * h) * AH.auto;
    AH.c = clamp(AH.c, cl[0], cl[2]);
    var hx = Math.sin(AH.psi), hz = Math.cos(AH.psi), yT = -1e9, i, LT = V.def.lookT || 0, LK = V.def.lookTan || TAN_CLIMB;
    for (i = 0; i <= 4; i++) { var s = v * HT_T * i / 4, ye = groundAt(V, AH.x + hx * s, AH.z + hz * s, false) + AH.c - s * TAN_CLIMB; if (ye > yT) yT = ye; }
    if (LT > HT_T) for (i = 1; i <= 4; i++) { var s3 = v * HT_T + (v * LT - v * HT_T) * i / 4, ye3 = groundAt(V, AH.x + hx * s3, AH.z + hz * s3, false) + AH.c - s3 * LK; if (ye3 > yT) yT = ye3; }   // (as heightTarget: a far crest seen early)
    var g0 = groundAt(V, AH.x, AH.z, false), w = VY_W, acc = clamp(w * w * (yT - AH.y) - 2 * w * AH.vy, -VY_ACC, VY_ACC);
    AH.vy = clamp(AH.vy + acc * h, -VY_DN, VY_UP); AH.y += AH.vy * h;
    if (AH.y < g0 + cl[0] * 0.6) { AH.y = g0 + cl[0] * 0.6; if (AH.vy < 0) AH.vy = 0; }
    AH.x += (hx * v - hz * AH.sv) * h; AH.z += (hz * v + hx * AH.sv) * h;   // (and the slip, as the flight's)
    pitchLook(V, AH, h, AH.calmK);   // (the look followed, as the flight's)
  }
  /* n samples into out (arrays yaw, pitch, roll, x, y, z, from index out.n), `step` s apart: from the flight as it is
     now (reset), or on from the last chunk. The camera as drawn (camPose's pitch: the realm's framing, the ground ahead,
     the visitor's tilt; its height with the passage's climb and the tall window's lift) */
  var AHT = new Float64Array(8);
  function flightAhead(reset, n, step, out, ch) {
    ahSel(ch);
    if (reset || !AH.on || AH.V !== SIM.V) { aheadReset(); out.n = 0; out.t0 = SIM.t; out.step = step; if (!AH.on) { AH = AHS[0]; return 0; } out.end = Infinity; if (reset) { aheadSample(out); n--; } }
    if (!AH.on) { AH = AHS[0]; return 0; }
    var sub = Math.max(1, Math.round(step / 0.15)), h = step / sub, i, j;
    for (i = 0; i < n && out.n < out.yaw.length; i++) { for (j = 0; j < sub; j++) aheadSub(h); aheadSample(out); }
    AH = AHS[0];
    return out.n;
  }
  function aheadSample(out) {
    var V = AH.V, k = out.n, yaw = AH.yawV + AH.phi, look = V.def.look || 90, x = AH.x, z = AH.z;
    var ga = groundAt(V, x + Math.sin(yaw) * look, z + Math.cos(yaw) * look, false), gh = groundAt(V, x, z, false);
    var fr = basePitch(V) + (AH.pf === AH.pf ? AH.pf : Math.atan2(ga - gh, look) * pfK(V));
    var pitch = fr + AH.thU + AH.thP;
    out.yaw[k] = yaw; out.pitch[k] = clamp(pitch, -60 * DEG, 50 * DEG); out.roll[k] = AH.roll;
    out.x[k] = x; out.y[k] = AH.y + CAMLIFT * Math.min(V.clear[1], 12); out.z[k] = z;
    out.n = k + 1;
  }

  /* ---------------------------------------------------------------- events on the way */
  /* creatures crossing ahead now and then (the realm's events: a flock across the way, a ray) */
  function events(V, t, u) {
    if (!V.def.event || !V.flocksEv) return;
    for (var i = V.flocksEv.length - 1; i >= 0; i--) if (u > V.flocksEv[i].end) V.flocksEv.splice(i, 1);
    if (u < V.evNext) return;
    var e = V.def.event(V, V.evRng, { x: CS.x, y: CS.y, z: CS.z, psi: CS.psi, u: u, ground: function (x, z) { return groundAt(V, x, z, false); } });
    V.evNext = u + (e && e.next ? e.next : 20);
    if (e && e.flock && V.flocksEv.length < 2) { e.flock.u0 = u; e.flock.at = [e.flock.x, e.flock.y, e.flock.z]; var f = flockOf(e.flock); f.end = u + (e.life || 30); V.flocksEv.push(f); }
  }

  /* ---------------------------------------------------------------- the camera, drawn between the last two steps */
  var CAM = { pos: [0, 0, 0], f: [0, 0, 1], r: [1, 0, 0], u: [0, 1, 0], roll: 0, pitch: 0, inCloud: 0, arrive: 0, cover: 0, pmode: 0, hold: -1, open: -1, expo: 1 };
  var CAMV = new Float32Array(12);   // pos, r, u, f (for the uniforms)
  function camPose(V, u, a, out) {
    var A = CSP, Bs = CS;   // (E1 Fix 3: at the junction too, CSP being the arrival's own place: arrive)
    var x = lerp(A.x, Bs.x, a), y = lerp(A.y, Bs.y, a), z = lerp(A.z, Bs.z, a);
    var yaw = A.yawV + A.phi + angDiff(Bs.yawV + Bs.phi, A.yawV + A.phi) * a, uth = lerp(A.thU + A.thP, Bs.thU + Bs.thP, a), roll = lerp(A.roll, Bs.roll, a);
    y += CAMLIFT * Math.min(V.clear[1], 12);
    // the pitch: the realm's framing for this window's shape, a look at the ground ahead, the visitor's tilt
    var look = V.def.look || 90, fx = Math.sin(yaw), fz = Math.cos(yaw);
    var ga = groundAt(V, x + fx * look, z + fz * look, false), gh = groundAt(V, x, z, false);
    var pfNow = Math.atan2(ga - gh, look) * pfK(V), pfA = A.pf === A.pf ? A.pf : pfNow, pfB = Bs.pf === Bs.pf ? Bs.pf : pfNow;
    // (round 3: the look followed, CS.pf. E1.1: the followed look alone wherever both states have one; round 3 added the
    // ground read again here less the targets read in the step, which is nothing until the ground under the look point
    // is refined between the step and the drawing (a cell's ground arriving), when it stepped the pitch by itself:
    // 0.055 deg in one frame, 3.3 deg/s, in DUNES at 197.13 s of seed 7's test-order flight, c6b as well)
    if (A.pf === A.pf && Bs.pf === Bs.pf) pfNow = lerp(pfA, pfB, a);
    else pfNow += lerp(pfA, pfB, a) - lerp(A.pf === A.pf ? A.pfT : pfNow, Bs.pf === Bs.pf ? Bs.pfT : pfNow, a);
    // (world6 step B) the one framing; the ground's look is off (pfK 0), so the pitch is the framing and the visitor's tilt
    var fr = basePitch(V) + pfNow, pitch = fr + uth;
    pitch = clamp(pitch, -60 * DEG, 50 * DEG);
    var cp = Math.cos(pitch), f0 = fx * cp, f1 = Math.sin(pitch), f2 = fz * cp;
    var r0 = -f2, r2 = f0, rl = Math.sqrt(r0 * r0 + r2 * r2) || 1; r0 /= rl; r2 /= rl;
    var u0 = -r2 * f1, u1 = r2 * f0 - r0 * f2, u2 = r0 * f1;
    var cr = Math.cos(roll), sr = Math.sin(roll);
    out.pos[0] = x; out.pos[1] = y; out.pos[2] = z;
    out.f[0] = f0; out.f[1] = f1; out.f[2] = f2;
    out.r[0] = r0 * cr + u0 * sr; out.r[1] = u1 * sr; out.r[2] = r2 * cr + u2 * sr;
    out.u[0] = u0 * cr - r0 * sr; out.u[1] = u1 * cr; out.u[2] = u2 * cr - r2 * sr;
    out.roll = roll; out.pitch = pitch; out.inCloud = 0; out.arrive = 0; out.yaw = yaw;
    out.cover = 0; out.pmode = 0; out.hold = -1; out.open = -1; out.expo = 1;
    return out;
  }
  /* the framing: a realm says where the horizon should sit (a fraction of the window's height from the top) on a wide
     window and on a tall one; the pitch that puts it there follows the window's shape */
  var TALLK = 0;
  function basePitch(V) {
    var fr = V.def.frame || [0.4, 0.6];
    return Math.atan((2 * lerp(fr[0], fr[1], TALLK) - 1) * FR.tanY);
  }
  /* (world6 step B) the look at the ground ahead's share of the pitch: the world's own (0: none: one pitch everywhere) */
  function pfK(V) { return V.def.pitchFollow === undefined ? 0.2 : V.def.pitchFollow; }
  /* (world6 step B, the one camera) the cruise clearance: one band over the surface flown (the higher of the land and the
     cloud sea's top: the camera's ground), CRUISE[0] m over the sand to CRUISE[1] over the cloud sea, by a smooth function
     of the maps ahead (the cloud weight averaged over CW_S m along the held heading, through smooth(CW_A, CW_B)),
     followed at most CW_V a second (of the weight: 18 m of clearance over about 90 s at the most). It replaces step A's
     framing weight (fw), which turned the view by 41 deg and lifted the camera 150 m at every coast: there is no framing
     to blend and no mode. The margin about solids follows the same weight */
  var CW_S = [150, 300, 450], CW_A = 0.25, CW_B = 0.85, CW_V = 0.011, CRUISE = [14, 32];
  function cruiseTarget(S) {
    var hx = Math.sin(S.psi), hz = Math.cos(S.psi), s = 0;
    for (var i = 0; i < CW_S.length; i++) s += kwAt(S.x + hx * CW_S[i], S.z + hz * CW_S[i])[3];
    return smooth(CW_A, CW_B, s / CW_S.length);
  }
  function cruiseStep(S, dt) {
    var T = cruiseTarget(S);
    if (!(S.cw === S.cw)) { S.cw = T; return; }
    S.cw = clamp(S.cw + clamp(T - S.cw, -CW_V * dt, CW_V * dt), 0, 1);
  }
  function cruiseOf(V, cw) { var C = V.def.cruise || CRUISE, w = cw === cw ? cw : 0; return lerp(C[0], C[1], w * w * (3 - 2 * w)); }
  function flightParams(V, cw) {
    var A = V.def.clear || [7, 14, 60], w = cw === cw ? cw : 0;
    if (!V.clear || V.clear === V.def.clear) V.clear = A.slice();
    V.clear[0] = A[0]; V.clear[1] = cruiseOf(V, cw); V.clear[2] = A[2];
    V.margin = lerp(V.def.margin || 14, V.def.marginB || V.def.margin || 14, w);
    return V.clear;
  }

  /* ---------------------------------------------------------------- dev: the flight's trace */
  var DEVTRACE = false, TRACE = [], NOAUTO = false, POSE = null;   // (dev: the first visit begun at [x, z, heading deg, y])
  function devTrace(V) {
    if (SIM.steps % 6) return;
    TRACE.push([+SIM.t.toFixed(3), V.k, +CS.x.toFixed(2), +CS.y.toFixed(2), +CS.z.toFixed(2), +(CS.psi / DEG).toFixed(2), +((CS.yawV + CS.phi) / DEG).toFixed(2), +CS.c.toFixed(1), +CS.auto.toFixed(2), null, SIM.fixG, SIM.fixO, 0, +SIM.u.toFixed(2), +CS.sv.toFixed(3), V.speed, SIM.reseat || 0]);   // (Fix 3: in cloud, u, the slip's speed, the realm's speed, the arrivals placed: H1 on the course)
    if (DEVKEEP) { var c = devClearance(); if (c) { DEVWORST.n++; if (c.vert < DEVWORST.vert) DEVWORST.vert = c.vert; if (c.solid < DEVWORST.solid) DEVWORST.solid = c.solid; if (c.core < DEVWORST.core) DEVWORST.core = c.core; } }
    if (TRACE.length > 40000) TRACE.splice(0, 10000);
  }

  /* ---------------------------------------------------------------- input: a drag anywhere, the phone's turn */
  /* No control is shown. A drag anywhere on the page (touch, pen, or a mouse with its main button held; it begins after
     8 px, so a tap stays a tap) turns the view and the flight: across the window's width, 90 deg (a little more than a
     desktop's view is wide, so a swipe across looks aside; the same on a phone, whose view is narrower), the scene
     following the finger; up and down, the view tilts and the flight climbs or dives. Let go, and the turn runs on a
     little and eases out; the tilt is kept (E1.1: round 3b eased it level by itself). A pointer's moves are read only while it is pressed (no hover), there
     is no key handler, nothing is stored. A drag begun on a link steers and never follows it; a tap on a link is a tap.
     Two fingers are never steering (pinch-zoom is the page's: touch-action pinch-zoom, pan-y as well on a page that
     scrolls, and everything the browser's while it is zoomed in). The phone: its turn and tilt from where it was when
     motion began (iOS asks first, only inside a gesture: at the end of the first drag or a tap on the page, never on a
     link, never at load; refused, never asked again). Under reduced motion all of it is inert. */
  var INP = { dx: 0, dy: 0, down: false, rel: false, n: 0, lastDx: 0, evT0: 0 };
  var INPLOG = [], INPQ = []; INPQ.i = 0;   // (dev: what the flight received a step; a script to replay)
  var DRAG = { id: -1, x0: 0, y0: 0, x: 0, y: 0, on: false, type: '', multi: false, cap: false };
  var SUPPRESS = false, SUPPRESS_N = 0;
  function inert() { return reduced() || DEAD || LOST; }
  function onLink(el) { for (var e = el; e && e !== root; e = e.parentNode) if (e.tagName === 'A' || e.tagName === 'BUTTON') return true; return false; }
  function onDown(e) {
    if (inert()) return;
    if (DRAG.id !== -1) { if (e.pointerId !== DRAG.id) { DRAG.multi = true; endDrag(false); } return; }   // (a second finger: no steering)
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if (e.pointerType === 'touch' && TOUCHMODE === 'zoom') return;   // (zoomed in: the finger is the browser's)
    DRAG.id = e.pointerId; DRAG.x0 = DRAG.x = e.clientX; DRAG.y0 = DRAG.y = e.clientY; DRAG.on = false; DRAG.type = e.pointerType || 'mouse'; DRAG.multi = false;
    SUPPRESS = false;
    window.addEventListener('pointermove', onMove, true); window.addEventListener('pointerup', onUp, true); window.addEventListener('pointercancel', onCancel, true);
  }
  function onMove(e) {
    if (e.pointerId !== DRAG.id) return;
    var x = e.clientX, y = e.clientY;
    if (!DRAG.on) {
      var dx = x - DRAG.x0, dy = y - DRAG.y0;
      if (dx * dx + dy * dy < 64) return;
      if (DRAG.type === 'touch' && TOUCHMODE === 'scroll' && Math.abs(dy) > Math.abs(dx)) return;   // (a vertical swipe on a page that scrolls is the page's: the browser takes it)
      DRAG.on = true; DOMQ.steer = 1; DOMQ.unsel = true; if (!running) domNext();   // (E1.1 Fix 2, S10: data-steer and the selection cleared in the next frame)
      if (DRAG.type === 'mouse') { try { root.setPointerCapture(e.pointerId); DRAG.cap = true; } catch (er) { DRAG.cap = false; } }
      INP.down = true; DRAG.x = DRAG.x0; DRAG.y = DRAG.y0;   // (the first 8 px are taken too: the scene catches the finger up)
    }
    INP.dx += x - DRAG.x; INP.dy += y - DRAG.y; DRAG.x = x; DRAG.y = y;
    if (REC && !INP.evT0) INP.evT0 = e.timeStamp;   // (E0, the record: the oldest move not yet drawn, for the input's latency)
  }
  function onUp(e) {
    if (e.pointerId !== DRAG.id) return;
    var was = DRAG.on;
    endDrag(true);
    if (was) { SUPPRESS = true; SUPPRESS_F = FRAMEN; SUPPRESS_N++; }   // (a drag's click is not a tap)
  }
  function onCancel(e) { if (e.pointerId === DRAG.id) endDrag(false); }
  function endDrag(release) {
    if (DRAG.on) { INP.down = false; INP.rel = release; DOMQ.steer = 0; if (!running) domNext(); MOTIONASK.drag = true; }
    if (DRAG.cap) { try { root.releasePointerCapture(DRAG.id); } catch (er) { /* gone */ } DRAG.cap = false; }
    DRAG.id = -1; DRAG.on = false;
    window.removeEventListener('pointermove', onMove, true); window.removeEventListener('pointerup', onUp, true); window.removeEventListener('pointercancel', onCancel, true);
  }
  function onClick(e) {
    if (SUPPRESS && e.detail !== 0) { SUPPRESS = false; e.preventDefault(); e.stopPropagation(); askMotion(); return; }
    if (!onLink(e.target)) askMotion();   // (a tap on the page, never on a link)
  }
  function onTouchEnd(e) {   // (iOS grants motion only inside a touch's own end)
    if (MOTIONASK.drag || (e.changedTouches && e.changedTouches.length === 1 && !onLink(e.target) && !DRAG.on)) askMotion();
    MOTIONASK.drag = false;
  }
  /* the phone's turn: yaw and pitch of the direction its back looks (the view's), from the device's own Euler angles
     (alpha about z, beta about x, gamma about y, in that order); the screen's rotation turns the picture about that
     direction and changes neither */
  var MOTION = { st: 'off', on: false, has: false, yaw: 0, pitch: 0, yaw0: 0, pitch0: 0, sy: 0, sp: 0, ref: false, tries: 0, n: 0, gen: 0 };
  var MOTIONASK = { drag: false };
  function askMotion() {
    if (MOTION.st !== 'off' || inert()) return;
    var DOE = window.DeviceOrientationEvent;
    if (!DOE || typeof DOE.requestPermission !== 'function') return;
    MOTION.st = 'asking';
    try {
      DOE.requestPermission().then(function (r) { if (r === 'granted') enableMotion(); else MOTION.st = 'denied'; },
        function () { MOTION.tries++; MOTION.st = MOTION.tries >= 3 ? 'denied' : 'off'; });   // (not inside a gesture: asked again at the next)
    } catch (er) { MOTION.st = 'off'; }
  }
  function enableMotion() { if (MOTION.on) return; MOTION.on = true; MOTION.st = 'on'; MOTION.ref = false; window.addEventListener('deviceorientation', onOrient); }
  function onOrient(e) {
    if (e.alpha === null || e.beta === null || e.gamma === null || inert()) return;
    if (REC && REC.ori.length < 6000) REC.ori.push([+e.timeStamp.toFixed(1), +e.alpha.toFixed(2), +e.beta.toFixed(2), +e.gamma.toFixed(2)]);   // (E0, the record: raw, for the filter's lag, D6)
    orientAt(e.alpha, e.beta, e.gamma);
  }
  function orientAt(al, be, ga) {
    var a = al * DEG, b = be * DEG, g = ga * DEG, ca = Math.cos(a), sa = Math.sin(a), cb = Math.cos(b), sb = Math.sin(b), cg = Math.cos(g), sg = Math.sin(g);
    var m13 = ca * sg + sa * sb * cg, m23 = cb * cg, m33 = -sa * sg + ca * sb * cg;
    var pitch = Math.asin(clamp(-m23, -1, 1)), yaw = Math.atan2(m13, m33);
    if (Math.abs(pitch) > 75 * DEG) yaw = MOTION.ref ? MOTION.yaw : yaw;   // (looking straight down or up the yaw is undefined: held)
    if (!MOTION.ref) { MOTION.yaw0 = yaw - MOTION.sy; MOTION.pitch0 = pitch - MOTION.sp; MOTION.ref = true; }
    MOTION.yaw = yaw; MOTION.pitch = pitch; MOTION.has = true; MOTION.n++;
  }
  /* each step: the drag's motion and the phone's into the flight's state */
  var IDLE_K = 0;
  function applyInput(dt, t, V) {
    // (dev: a scripted input replayed at its own times)
    while (INPQ.i < INPQ.length && INPQ[INPQ.i].t <= t + 1e-9) devInput(INPQ[INPQ.i++]);
    var G = (PI / 2) / Math.max(OUT.cssW || 800, 240), dx = INP.dx, dy = INP.dy, any = false;
    INP.dx = 0; INP.dy = 0;
    if (dx || dy) any = true;
    if (INP.down) {
      CS.yawV += dx * G; CS.thU = clamp(CS.thU + dy * G, -TH_MAX, TH_MAX);
      CS.ring[CS.ri] = dx * G; CS.ringP[CS.ri] = dy * G; CS.ri = (CS.ri + 1) % 12;   // (the last 0.2 s: the release's speed)
      CS.om = 0; CS.omP = 0; CS.since = 0;
    }
    if (INP.rel) {
      INP.rel = false; any = true;
      var sx = 0, sy = 0; for (var i = 0; i < 12; i++) { sx += CS.ring[i]; sy += CS.ringP[i]; CS.ring[i] = 0; CS.ringP[i] = 0; }
      CS.om = clamp(sx / (12 * dt), -0.8, 0.8); CS.omP = clamp(sy / (12 * dt), -0.5, 0.5);   // (the coast: the speed x 0.3 s, at most 14 deg; the tilt's x 0.2 s, at most 5.7 deg: E1.1)
    }
    if (!INP.down) {
      CS.yawV += CS.om * dt; CS.om *= Math.exp(-dt / 0.3);
      // (E1.1, item 2; design-v5 Revision 3: nothing turns the view by itself) the tilt the visitor set is kept: round 3b
      // eased it level over 2.5 s from 0.8 s after the release (verify-regress-3: an 18 deg tilt swung back 24.6 deg by
      // itself over 8 s, at up to 8.8 deg/s). The climb or dive it drives stops at the realm's clearance limits
      // (simStep); the release's coast of the tilt is short (0.2 s, at most 0.5 rad/s), so 0.8 s after it the tilt's
      // own rate is under 0.6 deg/s, and from then on only the look at the ground moves the pitch (at most 1.5 deg/s)
      CS.thU = clamp(CS.thU + CS.omP * dt, -TH_MAX, TH_MAX); CS.omP *= Math.exp(-dt / 0.2);
      CS.since += dt;
    }
    // the phone: smoothed (0.1 s), a dead zone of 1.2 deg (a hand's tremor moves nothing), the tilt held within 30 deg
    if (MOTION.on && MOTION.has) {
      var ry = angDiff(MOTION.yaw, MOTION.yaw0), rp = MOTION.pitch - MOTION.pitch0, k = 1 - Math.exp(-dt / 0.1);
      MOTION.sy += angDiff(ry, MOTION.sy) * k; MOTION.sp += (rp - MOTION.sp) * k;
      var dz = 1.2 * DEG, ey = angDiff(MOTION.sy, CS.phi), ep = MOTION.sp - CS.thPraw;
      if (Math.abs(ey) > dz) { CS.phi += ey - (ey > 0 ? dz : -dz); any = true; }
      if (Math.abs(ep) > dz) { CS.thPraw += ep - (ep > 0 ? dz : -dz); any = true; }
      var L = 30 * DEG; CS.thP = L * Math.tanh(CS.thPraw / L);
    }
    if (any) {
      CS.lastIn = t; CS.auto = 0;
      IDLE_K++; CS.idleAfter = 6 + 4 * hfl(ihash((IDLE_K * 2654435761 + J.seed) >>> 0));   // (6-10 s before the clearance eases back to the cruise height)
      if (DEVMODE) INPLOG.push([+t.toFixed(4), +dx.toFixed(2), +dy.toFixed(2), INP.down ? 1 : 0, MOTION.has ? +(MOTION.yaw / DEG).toFixed(3) : null, MOTION.has ? +(MOTION.pitch / DEG).toFixed(3) : null]);
    }
  }
  /* dev: an input injected at a step's time ({ t, drag: [dx, dy] } moves a held drag; { t, down } / { t, up } press and
     release; { t, orient: [alpha, beta, gamma] } the phone; { t, motion: true } motion enabled) */
  function devInput(ev) {
    if (ev.down) { INP.down = true; }
    if (ev.drag) { INP.dx += ev.drag[0]; INP.dy += ev.drag[1]; }
    if (ev.up) { INP.down = false; INP.rel = true; }
    if (ev.motion) { MOTION.on = true; MOTION.st = 'on'; MOTION.ref = false; }
    if (ev.orient) orientAt(ev.orient[0], ev.orient[1], ev.orient[2]);
  }
  /* the page's touch: one finger steers; a page taller than the window scrolls with a vertical drag; zoomed in, the
     browser has every finger */
  var TOUCHMODE = null;
  function touchMode() {
    var vv = window.visualViewport, zoomed = !!(vv && vv.scale > 1.01), scrolls = root.scrollHeight > window.innerHeight + 2;
    var m = zoomed ? 'zoom' : scrolls ? 'scroll' : 'steer';
    if (m !== TOUCHMODE) { TOUCHMODE = m; root.setAttribute('data-touch', m); }
  }
  function inputInit() {
    window.addEventListener('pointerdown', onDown, true);
    window.addEventListener('click', onClick, true);
    window.addEventListener('touchend', onTouchEnd, { passive: true, capture: true });
    document.addEventListener('dragstart', function (e) { if (!inert()) e.preventDefault(); }, true);   // (a link is never dragged away)
    if (window.visualViewport) window.visualViewport.addEventListener('resize', function () { DOMQ.touch = true; if (!running) domNext(); });   // (E1.1 Fix 2, S10: measured in the next frame)
    touchMode();
    // Android and the rest: the phone's motion needs no asking; iOS asks inside a gesture
    var DOE = window.DeviceOrientationEvent;
    if (DOE && typeof DOE.requestPermission !== 'function') enableMotion();
  }

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
void main() {
  if (uPb.w > 2.5 && uPb.w < 3.5) { rain(gl_InstanceID); return; }
  if (uPb.w > 3.5) { drifter(gl_InstanceID); return; }
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
  if (vKind > 2.5) {
    float a;
    if (vKind > 3.75) { vec2 q = vec2(vQ.x * 2.0 - 1.0, vQ.y); a = vCol.a * max(1.0 - dot(q, q), 0.0); a *= a; oC = vec4(vCol.rgb * a, a * 0.3); return; }
    if (vKind > 3.25) { vec2 q = vec2(vQ.x * 2.0 - 1.0, vQ.y); float r = length(q); a = vCol.a * exp(-(r - 0.7) * (r - 0.7) * 30.0) * step(r, 1.0); oC = vec4(vCol.rgb * a, a * 0.5); return; }
    a = vCol.a * (1.0 - vQ.y * vQ.y) * smoothstep(0.0, 0.3, vQ.x) * (1.0 - smoothstep(0.85, 1.0, vQ.x));
    oC = vec4(vCol.rgb * a, a * 0.6); return;
  }
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
  function FS_PROBE(H, HC) {
    return `
uniform sampler2D uTex; uniform vec4 uGCw; uniform int uPm; out vec4 oC;
vec4 pack(float h) { float v = clamp((h + 4096.0) / 8192.0, 0.0, 0.99999); vec4 e = fract(v * vec4(1.0, 255.0, 65025.0, 16581375.0)); return e - e.yzww * vec4(1.0 / 255.0, 1.0 / 255.0, 1.0 / 255.0, 0.0); }
float hgt(vec2 p, bool cam) { ${HC ? 'if (cam) return ' + HC + '(p);' : ''} return ${H}(p).x; }
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
uniform vec4 uHi;     // high cloud: cover, brightness, scale, drift
uniform vec3 uHiC;
uniform vec4 uMoon;   // (tod) the moon: its direction, its amount (0: none)
uniform vec3 uMoonC, uMoonG;   // (tod) its disc's colour (a pale flat disc, held under the light ceiling) and its glare's
uniform vec4 uNight;  // (tod) the belt (the Earth's shadow and the Belt of Venus), the noctilucent wisps, the stars' twinkle (1) or held (0), the stars' top (Y)
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
#ifdef SKY_PH2
  if (uGal.w > 0.0 && eS > 0.0) c += galaxyAt(rd, eS);   // (phase 2)
  if (uAur.w > 0.0 && eS > 0.5) c += auroraAt(rd, eS);   // (phase 2)
#endif
  if (uMoon.w > 0.0) {   // the moon: a cool silver disc held under the light ceiling, its limb soft, a glare that never lightens the sky past its own colour, the corona's rings
    float ma = degrees(acos(clamp(dot(rd, uMoon.xyz), -1.0, 1.0))), mr = 1.8, mpx = 2.0 * degrees(atan(uProj.y)) / uRes.y;
    float out1 = max(ma - mr, 0.0);
    /* (tod fix round, the judges' defect 4) a cool silver (the moonlit sky's table: L 0.62, C 0.03, h 250, the ceiling's
       shoulder bringing it to about 0.51 as shown), its limb soft over a fifth of its radius (was a pale khaki 0.52, C 0.02,
       h 95, edged at a pixel: a flat olive coin on the ultramarine) and a wider glare carrying its light */
    c = mix(c, max(c, uMoonG), clamp(exp(-out1 / 2.2) * 0.9 + 0.08 * exp(-ma / 14.0), 0.0, 1.0) * uMoon.w);
    if (ma < 7.0) c += uMoonG * uMoon.w * 0.15 * (vec3(0.95, 0.62, 0.42) * exp(-pow((ma - 2.6) / 0.3, 2.0)) * 0.5 + vec3(0.4, 0.75, 1.0) * exp(-pow((ma - 3.4) / 0.35, 2.0)) * 0.3
      + vec3(0.5, 1.0, 0.6) * exp(-pow((ma - 4.1) / 0.4, 2.0)) * 0.2 + vec3(1.0, 0.55, 0.6) * exp(-pow((ma - 4.9) / 0.45, 2.0)) * 0.22);
    c = mix(c, uMoonC, (1.0 - smoothstep(mr - max(mpx * 1.2, 0.3), mr + max(mpx * 1.2, 0.12), ma)) * uMoon.w);
  }
  if (uSunD.z > 0.0 && rd.y > 0.0) {   // the stars, bounded at the source: with the sky's own light under it no star lifts a pixel past the stars' top (Y uNight.w, OKLab L 0.45)
    float el = asin(clamp(rd.y, -1.0, 1.0)), az = atan(rd.x, rd.z), pa = 2.0 * atan(uProj.y) / uRes.y;
    float s = starAt(rd, el, az, pa, 0, 0) + starAt(rd, el, az, pa, 0, -1) + starAt(rd, el, az, pa, 0, 1) + starAt(rd, el, az, pa, -1, 0) + starAt(rd, el, az, pa, 1, 0);
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
  if (uDbg == 6) { oC = vec4(taken * 0.001, 0.001, 0.0, 0.0); return; }
  if (uDbg == 7) { oC = vec4(nLeap * 0.001, nBand * 0.001, nIn * 0.001, 0.0); return; }
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
void main() { oC = vec4(texture(uTex, gl_FragCoord.xy / uOut).rgb, 1.0); }`;
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
    vec4 cS = g0.x * g0.y * tA + g1.x * g0.y * tB + g0.x * g1.y * tC + g1.x * g1.y * tD;
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
    if (uLay > 0.5 && uMi.w > 0.5 && n <= 1 && uSSR.x < 0.5 && km < 0.001 && max(max(tA.a, tB.a), max(tC.a, tD.a)) > 0.002) {
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
  if (uDbg == 9) { oC = vec4(dbgL.x, clamp((dbgL.y - 0.5) * 2.0, 0.0, 1.0), clamp(dbgL.z * 50.0, 0.0, 1.0), 1.0); return; }   // (dev, E1.1: the layering: red its near share where taken, green the depth code, blue how far the samples' codes stand from the one resolved)
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

  /* ---------------------------------------------------------------- engine programs (shared by every realm) */
  var EP = {}, ENG = { st: 0, k: 0, names: null };
  var NOISE3 = null, GRID = null, FULLVAO = null, QUAD_VB = null, STRIP = null, VCUBE = null, VTMP = null, ICO = null, BAKEFB = null, CREATURE = null;
  /* (E1) the engine's own resources and programs, made once (again after a lost context) by the boot's stages: B the
     objects (bootObjects), C the programs with every realm's and the birds' (progStep), E the noise (noiseStep). The
     harness's stills (and a restore under them) make all of it at once: engineStep(true) */
  function engineStep(sync) {
    if (ENG.st < 0) return false;
    if (gl.isContextLost()) return false;
    if (ENG.st === 0) { bootObjects(); ENG.st = 1; }
    var r = progStep(true, 0);
    if (r === LOSTP) return false;
    if (!progsDone() || PROGX.broken && !engineOk()) { ENG.st = -1; return false; }
    noiseStep(true);
    ENG.st = 2;
    return true;
  }
  function engineOk() { for (var k in EP) if (!EP[k].ok) return false; return NOISE.prog && NOISE.prog.ok; }
  /* stage B: every object the engine draws with (the grid, the strips, the cube, the icosahedron, the bake's scratch,
     the creatures, the glows' quad, the noise, the read-back ring, the warm table's targets), and the registration of
     its programs and every realm's (compiled at stage C, all at once) */
  function bootObjects() {
    buildEngine();
    poolPre();   // (E1 Fix 3: the cells' and visits' objects made ahead)
    for (var k = 0; k < ORDER.length; k++) { var d = REALMS[ORDER[k]]; if (!d.bad) realmProgs(d); }
  }
  /* (hotfix G0, pass 2) does this GPU filter an 8-bit texture at 8 bits? Two texels 4 codes apart (the clouds' soft
     band is about four and a half codes wide), sampled at 64 points between them into a half-float target and read
     back: filtered at 8 bits the answer comes in steps of a whole code (an error up to half a code, 0.002); filtered
     in float, or with 8-bit weights on a float result, under a hundredth of a code. Where it is 8-bit (WebKit's
     renderer here) the clouds' volumes are made at 16 bits (VOL16); elsewhere (SwiftShader, and the GPUs that filter
     in float) they stay RGBA8, half the bytes and the bandwidth. Unknown (no float targets: RGBA8 as ever; a read that
     fails: 16 bits, the safe side). The record files the answer (device.vol16, device.filtErr), so the owner's next
     record says what the iPhone does. Switch vol16=0/1 forces it (dev, the record's A/B) */
  var VOL16 = false, FILTERR = -1;
  function probeFilter() {
    VOL16 = false; FILTERR = -1;
    if (!FLOAT_RT) return;
    var P = null, vs = null, fs = null, T = null, R = null, F = null;
    try {
      vs = gl.createShader(gl.VERTEX_SHADER); gl.shaderSource(vs, '#version 300 es\nvoid main() { gl_Position = vec4(float((gl_VertexID & 1) * 4 - 1), float((gl_VertexID >> 1) * 4 - 1), 0.0, 1.0); }'); gl.compileShader(vs);
      fs = gl.createShader(gl.FRAGMENT_SHADER); gl.shaderSource(fs, '#version 300 es\nprecision highp float; uniform sampler2D uT; out vec4 o;\nvoid main() { float f = (gl_FragCoord.x - 0.5) / 63.0; o = texture(uT, vec2((0.5 + f) * 0.5, 0.5)); }'); gl.compileShader(fs);
      P = gl.createProgram(); gl.attachShader(P, vs); gl.attachShader(P, fs); gl.linkProgram(P);
      if (!gl.getProgramParameter(P, gl.LINK_STATUS)) throw new Error('probe');
      gl.activeTexture(gl.TEXTURE0);
      T = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, T);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, 2, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 0, 4, 4, 4, 4]));
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      R = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, R); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, 64, 1, 0, gl.RGBA, gl.HALF_FLOAT, null);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      F = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, F); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, R, 0);
      gl.viewport(0, 0, 64, 1); gl.disable(gl.BLEND); gl.disable(gl.DEPTH_TEST); gl.disable(gl.CULL_FACE);
      gl.useProgram(P); gl.uniform1i(gl.getUniformLocation(P, 'uT'), 0); gl.bindTexture(gl.TEXTURE_2D, T);
      gl.bindVertexArray(FULLVAO); gl.drawArrays(gl.TRIANGLES, 0, 3); gl.bindVertexArray(null);
      var px = new Float32Array(256); px.fill(-1); gl.readPixels(0, 0, 64, 1, gl.RGBA, gl.FLOAT, px);
      var e = 0; for (var i = 0; i < 64; i++) e = Math.max(e, Math.abs(px[i * 4] - i / 63 * 4 / 255));
      FILTERR = e; VOL16 = !(e < 0.0008);
    } catch (err) { VOL16 = true; FILTERR = -2; }
    if (F) gl.deleteFramebuffer(F); if (R) gl.deleteTexture(R); if (T) gl.deleteTexture(T); if (P) gl.deleteProgram(P); if (vs) gl.deleteShader(vs); if (fs) gl.deleteShader(fs);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.bindTexture(gl.TEXTURE_2D, null); gl.useProgram(null);
    if (SW.vol16 === 0) VOL16 = false; else if (SW.vol16 === 1) VOL16 = true;
  }
  function buildEngine() {
    GRID = makeGrid();
    FULLVAO = gl.createVertexArray();
    probeFilter();   // (pass 2: before any volume is made)
    var sv = [], i; for (i = 0; i <= 32; i++) sv.push(i / 32, -1, i / 32, 1);
    STRIP = { vb: gl.createBuffer(), vaoP: gl.createVertexArray(), vaoR: gl.createVertexArray(), n: 66 };
    gl.bindBuffer(gl.ARRAY_BUFFER, STRIP.vb); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(sv), gl.STATIC_DRAW);
    gl.bindVertexArray(STRIP.vaoR); gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    var qv = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, qv); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, -1, 1, -1, 0, 1, 1, 1]), gl.STATIC_DRAW);
    gl.bindVertexArray(STRIP.vaoP); gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.bindVertexArray(null);
    // the unit cube a cloud volume is drawn as (36 corners), and the bake's scratch density (64 cubed)
    var cv = [], C = [[-1, -1, -1], [1, -1, -1], [-1, 1, -1], [1, 1, -1], [-1, -1, 1], [1, -1, 1], [-1, 1, 1], [1, 1, 1]];
    [[0, 2, 3, 1], [4, 5, 7, 6], [0, 1, 5, 4], [2, 6, 7, 3], [0, 4, 6, 2], [1, 3, 7, 5]].forEach(function (q) { [q[0], q[1], q[2], q[0], q[2], q[3]].forEach(function (k) { cv.push(C[k][0], C[k][1], C[k][2]); }); });
    VCUBE = { vao: gl.createVertexArray(), vb: gl.createBuffer() };
    gl.bindVertexArray(VCUBE.vao); gl.bindBuffer(gl.ARRAY_BUFFER, VCUBE.vb); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(cv), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0); gl.bindVertexArray(null);
    (function () {   // an icosahedron, 20 faces as 60 vertices
      var t = (1 + Math.sqrt(5)) / 2, V3 = [[-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0], [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t], [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1]];
      var F = [[0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11], [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8], [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9], [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]], out = [], l = Math.sqrt(1 + t * t);
      F.forEach(function (f) { f.forEach(function (i) { out.push(V3[i][0] / l, V3[i][1] / l, V3[i][2] / l); }); });
      ICO = { vb: gl.createBuffer() }; gl.bindBuffer(gl.ARRAY_BUFFER, ICO.vb); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(out), gl.STATIC_DRAW);
    })();
    // (E1) the glows' quad, made here (round 3b made it with the first glows, in flight)
    QUAD = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, QUAD); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    VTMP = { t: gl.createTexture(), f: gl.createFramebuffer() };
    gl.activeTexture(gl.TEXTURE8); gl.bindTexture(gl.TEXTURE_3D, VTMP.t);
    gl.texImage3D(gl.TEXTURE_3D, 0, VOL16 ? gl.RG16F : gl.RG8, 64, 64, 64, 0, gl.RG, VOL16 ? gl.HALF_FLOAT : gl.UNSIGNED_BYTE, null);   // the distance with its billows, and without (pass 2: half floats where VOL16, as the volumes)
    tex3params(); gl.activeTexture(gl.TEXTURE0);
    var list = [
      ['sky', VS_FAR, FS_SKY], ['depth', VS_FULL, FS_DEPTHDOWN], ['inkkeep', VS_FULL, FS_INKKEEP],
      ['pre', VS_FULL, FS_PRE], ['down', VS_FULL, FS_DOWN], ['up', VS_FULL, FS_UP], ['smask', VS_FULL, FS_SHAFTMASK], ['sblur', VS_FULL, FS_SHAFTBLUR], ['comp', VS_FULL, FS_COMP], ['blit', VS_FULL, FS_BLIT],
      ['vdens', VS_FULL, FS_VDENS], ['vlight', VS_FULL, FS_VLIGHT], ['vbody', VS_VBODY, FS_VBODY], ['occ', VS_OCC, FS_OCC], ['creature', VS_CREATURE, FS_CREATURE],
      ['glow', VS_GLOW, FS_GLOW], ['beam', VS_BEAM, FS_BEAM], ['cacc', VS_FULL, FS_CACC]
    ];
    EP = {};
    noiseInit();   // (the noise's program first among the engine's: the first the boot needs)
    list.forEach(function (l) { EP[l[0]] = compile(l[1], l[2], 'engine.' + l[0]); });
    BAKEFB = gl.createFramebuffer();
    makeCreatures();
    rbInit();
    warmInit();
    return true;
  }
  function makeCreatures() {   // the meshes: a gull (an M of two jointed wings) and a ray (a diamond, its wings in strips), one buffer
    var v = [], i;
    function T(a, b, c) { v.push(a[0], a[1], a[2], a[3], b[0], b[1], b[2], b[3], c[0], c[1], c[2], c[3]); }
    [-1, 1].forEach(function (s) {
      var sh0 = [0.05 * s, 0, 0.12, 0], sh1 = [0.05 * s, 0, -0.1, 0], wr0 = [0.27 * s, 0.03, 0.07, 1], wr1 = [0.27 * s, 0.03, -0.07, 1], tip = [0.52 * s, -0.02, -0.14, 2];
      T(sh0, wr0, wr1); T(sh0, wr1, sh1); T(wr0, tip, wr1);
      T([0, 0.01, 0.34, 0], [0.05 * s, 0, 0.05, 0], [0, 0.02, -0.1, 0]); T([0, 0.02, -0.1, 0], [0.04 * s, 0, -0.08, 0], [0, 0, -0.32, 0]);
    });
    var nb = v.length / 4, S = 4;
    [-1, 1].forEach(function (s) {
      for (i = 0; i < S; i++) {
        var x0 = i / S * 0.5, x1 = (i + 1) / S * 0.5, z0f = 0.45 - x0 * 0.95, z1f = 0.45 - x1 * 0.95, z0b = -0.18 + x0 * 0.2, z1b = -0.18 + x1 * 0.2;
        T([x0 * s, 0, z0f, -1 - x0 * 2], [x1 * s, 0, z1f, -1 - x1 * 2], [x1 * s, 0, z1b, -1 - x1 * 2]);
        T([x0 * s, 0, z0f, -1 - x0 * 2], [x1 * s, 0, z1b, -1 - x1 * 2], [x0 * s, 0, z0b, -1 - x0 * 2]);
      }
      T([0, 0.01, -0.18, -1], [0.03 * s, 0, -0.2, -1], [0, 0, -0.95, -1]);
    });
    var nr = v.length / 4 - nb;
    // a moth: a slim body, a rounded fore wing and a smaller hind wing on each side (w 1 fore, 2 hind)
    var m0 = v.length / 4;
    T([0, 0.02, 0.22, 0], [0.025, 0, 0, 0], [0, 0.02, -0.2, 0]); T([0, 0.02, 0.22, 0], [0, 0.02, -0.2, 0], [-0.025, 0, 0, 0]);
    [-1, 1].forEach(function (s) {
      function wing(z0, z1, span, w) {   // a fan of triangles from the root: a rounded wing
        var pts = [], k, N = 7;
        for (k = 0; k <= N; k++) { var a = k / N * Math.PI, r = span * (0.75 + 0.25 * Math.sin(a)); pts.push([s * (0.03 + Math.sin(a) * r), 0, (z0 + z1) / 2 + Math.cos(a) * (z1 - z0) / 2 * (0.6 + 0.4 * Math.sin(a))]); }
        var root = [s * 0.03, 0, (z0 + z1) / 2, w];
        for (k = 0; k < N; k++) T(root, [pts[k][0], 0, pts[k][2], w], [pts[k + 1][0], 0, pts[k + 1][2], w]);
      }
      wing(0.2, -0.06, 0.47, 1); wing(0.0, -0.26, 0.33, 2);
    });
    var nm = v.length / 4 - m0;
    // a jelly: a bell (w 0) and five threads hanging from its rim (w 1 at the rim .. 2 at the end), each two crossed ribbons
    var j0 = v.length / 4, PR = [[0.5, 0.0], [0.47, 0.18], [0.38, 0.36], [0.24, 0.5], [0.0, 0.56]], SG = 10;
    for (var pi = 0; pi + 1 < PR.length; pi++) for (var sg = 0; sg < SG; sg++) {
      var a0 = sg / SG * 2 * Math.PI, a1 = (sg + 1) / SG * 2 * Math.PI, P0 = PR[pi], P1 = PR[pi + 1];
      var A = [P0[0] * Math.cos(a0), P0[1], P0[0] * Math.sin(a0), 0], Bv = [P0[0] * Math.cos(a1), P0[1], P0[0] * Math.sin(a1), 0];
      var Cv = [P1[0] * Math.cos(a1), P1[1], P1[0] * Math.sin(a1), 0], Dv = [P1[0] * Math.cos(a0), P1[1], P1[0] * Math.sin(a0), 0];
      T(A, Bv, Cv); T(A, Cv, Dv);
    }
    for (var th = 0; th < 5; th++) {
      var ta = th / 5 * 2 * Math.PI + 0.3, tx = Math.cos(ta) * 0.3, tz = Math.sin(ta) * 0.3, W2 = 0.025;
      for (var sgm = 0; sgm < 3; sgm++) {
        var y0 = -sgm * 0.45, y1 = -(sgm + 1) * 0.45, w0 = 1 + sgm / 3, w1 = 1 + (sgm + 1) / 3;
        T([tx - W2, y0, tz, w0], [tx + W2, y0, tz, w0], [tx + W2, y1, tz, w1]); T([tx - W2, y0, tz, w0], [tx + W2, y1, tz, w1], [tx - W2, y1, tz, w1]);
        T([tx, y0, tz - W2, w0], [tx, y0, tz + W2, w0], [tx, y1, tz + W2, w1]); T([tx, y0, tz - W2, w0], [tx, y1, tz + W2, w1], [tx, y1, tz - W2, w1]);
      }
    }
    var nj = v.length / 4 - j0;
    // a floating cap: a shallow dome (w 0), a ring of beads at its rim (w 1), a disc beneath (w 2)
    var c0 = v.length / 4, CPR = [[1.0, 0.0], [0.96, 0.1], [0.72, 0.28], [0.34, 0.41], [0.0, 0.45]], CS2 = 14;
    for (pi = 0; pi + 1 < CPR.length; pi++) for (sg = 0; sg < CS2; sg++) {
      var b0 = sg / CS2 * 2 * Math.PI, b1 = (sg + 1) / CS2 * 2 * Math.PI, Q0 = CPR[pi], Q1 = CPR[pi + 1];
      T([Q0[0] * Math.cos(b0), Q0[1], Q0[0] * Math.sin(b0), 0], [Q0[0] * Math.cos(b1), Q0[1], Q0[0] * Math.sin(b1), 0], [Q1[0] * Math.cos(b1), Q1[1], Q1[0] * Math.sin(b1), 0]);
      T([Q0[0] * Math.cos(b0), Q0[1], Q0[0] * Math.sin(b0), 0], [Q1[0] * Math.cos(b1), Q1[1], Q1[0] * Math.sin(b1), 0], [Q1[0] * Math.cos(b0), Q1[1], Q1[0] * Math.sin(b0), 0]);
    }
    for (sg = 0; sg < CS2; sg++) { var d0 = sg / CS2 * 2 * Math.PI, d1 = (sg + 1) / CS2 * 2 * Math.PI; T([0, -0.01, 0, 2], [0.85 * Math.cos(d1), -0.01, 0.85 * Math.sin(d1), 2], [0.85 * Math.cos(d0), -0.01, 0.85 * Math.sin(d0), 2]); }
    for (sg = 0; sg < 12; sg++) {
      var e = sg / 12 * 2 * Math.PI, ex = Math.cos(e) * 1.02, ez = Math.sin(e) * 1.02, q = 0.06;
      T([ex, 0.08, ez, 1], [ex + q, 0.02, ez, 1], [ex, -0.04, ez, 1]); T([ex, 0.08, ez, 1], [ex, -0.04, ez, 1], [ex - q, 0.02, ez, 1]);
      T([ex, 0.08, ez, 1], [ex, 0.02, ez + q, 1], [ex, -0.04, ez, 1]); T([ex, 0.08, ez, 1], [ex, -0.04, ez, 1], [ex, 0.02, ez - q, 1]);
    }
    var nc = v.length / 4 - c0;
    CREATURE = { vao: gl.createVertexArray(), vb: gl.createBuffer(), bird: [0, nb], ray: [nb, nr], moth: [m0, nm], jelly: [j0, nj], cap: [c0, nc] };
    gl.bindVertexArray(CREATURE.vao); gl.bindBuffer(gl.ARRAY_BUFFER, CREATURE.vb); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(v), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 4, gl.FLOAT, false, 0, 0); gl.bindVertexArray(null);
  }

  /* ---------------------------------------------------------------- frame uniforms (typed, filled in place: no
     garbage a frame) */
  var VP = new Float32Array(16), RES = new Float32Array(2), PROJ = new Float32Array(4), UT = new Float32Array(1), NEAR = 0.8, FAR = 40000, DBG = 0;
  var CPOS = CAMV.subarray(0, 3), CR = CAMV.subarray(3, 6), CU = CAMV.subarray(6, 9), CF = CAMV.subarray(9, 12);
  var FOV_LONG = 72;
  var FR = { tanX: 1, tanY: 1, t: 0 }, FRT = { tanX: 1, tanY: 1 };
  var HZU = new Float32Array(4);
  function setFrameUniforms(P, V) {
    var u = P.u, L = V.L || V.light;
    if (u.uCam) gl.uniform3fv(u.uCam, CPOS);
    if (u.uCamR) gl.uniform3fv(u.uCamR, CR);
    if (u.uCamU) gl.uniform3fv(u.uCamU, CU);
    if (u.uCamF) gl.uniform3fv(u.uCamF, CF);
    if (u.uProj) gl.uniform4fv(u.uProj, PROJ);
    if (u.uVP) gl.uniformMatrix4fv(u.uVP, false, VP);
    if (u.uRes) gl.uniform2fv(u.uRes, RES);
    if (u.uT) gl.uniform1fv(u.uT, UT);
    if (u.uDbg) gl.uniform1i(u.uDbg, DBG);
    if (u.uPxK) gl.uniform1f(u.uPxK, Math.max(1, OUT.dpr * SS / 1.25));   // (E1.1: the world's pixels a pixel of the display's: 1 but in a supersampled reference)
    if (u.uSalt) gl.uniform1ui(u.uSalt, V.salt);
    if (u.uSun) gl.uniform3fv(u.uSun, L.sunDir);
    if (u.uSkyS) gl.uniform3fv(u.uSkyS, L.skyS || L.sunDir);   // (tod: the sky's own light)
    if (u.uTwM) gl.uniform4fv(u.uTwM, SKYTWM);   // (tod fix3: the twilight's low mist, w04b_sky.js)
    if (u.uSunC) gl.uniform3fv(u.uSunC, L.sunC);
    if (u.uSky) gl.uniform3fv(u.uSky, L.skyFlat);
    if (u.uSkyE) gl.uniform4fv(u.uSkyE, L.skyE);
    if (u.uSkyW) gl.uniform3fv(u.uSkyW, L.skyW);
    if (u.uSkyK) gl.uniform4fv(u.uSkyK, L.skyK);
    if (u.uGlow) gl.uniform4fv(u.uGlow, L.glow);
    if (u.uGlowC) gl.uniform3fv(u.uGlowC, L.glowC);
    if (u.uFog) gl.uniform4fv(u.uFog, L.fog);
    if (u.uFog2) gl.uniform4fv(u.uFog2, L.fog2);
    if (u.uFogB) gl.uniform4fv(u.uFogB, L.fogBf);
    // (world6 step B) the ground haze's base under the eye follows the cruise clearance (a slow function of the maps),
    // so the surface flown lies over the base and the far ground's haze meets the sky's at the horizon (the step's base,
    // a fixed 24 m under the eye, lay above a cloud sea flown 30-40 m over: the far sea took a fifth of the haze the sky
    // took just above it, and the horizon was a bright line)
    if (u.uHaze) { HZU[0] = L.haze[0]; HZU[1] = L.haze[1]; HZU[2] = L.haze[2] + Math.max(0, (V.clear ? V.clear[1] : 14) - 14) * 1.6; HZU[3] = L.haze[3]; gl.uniform4fv(u.uHaze, HZU); }
    if (u.uHazeC) gl.uniform3fv(u.uHazeC, L.hazeC);
    if (u.uHazeW) gl.uniform3fv(u.uHazeW, L.hazeW);
    if (u.uAmbU) gl.uniform3fv(u.uAmbU, L.ambU);
    if (u.uAmbD) gl.uniform3fv(u.uAmbD, L.ambD);
    if (u.uClLit) gl.uniform3fv(u.uClLit, L.clLit);
    if (u.uClShade) gl.uniform3fv(u.uClShade, L.clShade);
    if (u.uClDeep) gl.uniform3fv(u.uClDeep, L.clDeep);
    if (u.uClRim) gl.uniform3fv(u.uClRim, L.clRim);
    if (u.uClK) gl.uniform4fv(u.uClK, L.clK);
    if (u.uClK2) gl.uniform4fv(u.uClK2, L.clK2);
    if (u.uP) gl.uniform4fv(u.uP, V.paramsFlat);
    if (u.uKWc) gl.uniform4f(u.uKWc, KW.cx, KW.cz, KSTEP, KN);   // (world6: the kits' weights' grid, on unit 1)
    if (u.uKFc) gl.uniform4f(u.uKFc, KF.cx, KF.cz, FSTEP, FN);   // (world6 fix: the far field's grid, in the same texture)
    if (u.uGC) gl.uniform4fv(u.uGC, GCU);
    if (u.uSunVis) gl.uniform1f(u.uSunVis, L.sunVis);
    if (u.uWet) gl.uniform4fv(u.uWet, L.wet);
  }
  /* a light, flattened for uniforms: typed arrays, defaults filled (round 3b: sunVis, the sun's share of the sky;
     rain, the rain's amount; ripple, the water's; windDir; deep, the realm's deep shade (a passage through the dark);
     glare, the white of a passage through light) */
  var LDEF = { bloom: [1.1, 0.5, 0.18], cl: [7, 0.13, 0.003, 1], clDetail: [120, 4], shaftC: [1, 0.9, 0.8], lift: [0, 0, 0], gain: [1, 1, 1], fog2: [0.5, 0.012, 0, 0], hi: [0, 0, 0, 0], hiC: [1, 1, 1], exposure: 1, sat: 1,
    haze: [0, 30, 20, 0], hazeC: [1, 1, 1], hazeW: null, sunVis: 1, rain: 0, ripple: 0.5, windDir: [0.6, 0.8], shafts: 0, inCloudK: 1 };
  var LKC = ['sunC', 'skyW', 'glowC', 'ambU', 'ambD', 'clLit', 'clShade', 'clDeep', 'clRim', 'hazeC', 'hazeW', 'hiC', 'shaftC', 'deep', 'glare'];   // colours: blended in OKLab
  var LKN = ['skyE', 'skyK', 'glow', 'fog', 'fog2', 'haze', 'clK', 'clK2', 'bloom', 'cl', 'clDetail', 'lift', 'gain', 'hi', 'discK', 'windDir'];   // numbers: linearly
  var LKS = ['exposure', 'sat', 'shafts', 'inCloudK', 'sunVis', 'rain', 'ripple'];
  function prepOne(L) {
    for (var dk in LDEF) if (L[dk] === undefined) L[dk] = LDEF[dk];
    if (!L.hazeW) L.hazeW = L.hazeC;
    if (!L.deep) { var s0 = lin2lab(L.sky[0]); L.deep = lab2linA(clamp(Math.min(s0[0] * 0.55, 0.3), 0.13, 0.3), s0[1] * 0.8, s0[2] * 0.8); }
    if (!L.glare) L.glare = lch(0.99, 0.02, 85, 2.4);
    ['sunDir', 'sunC', 'skyE', 'skyW', 'skyK', 'glow', 'glowC', 'fog', 'fog2', 'ambU', 'ambD', 'clLit', 'clShade', 'clDeep', 'clRim', 'clK', 'clK2', 'bloom', 'cl', 'clDetail', 'shaftC', 'lift', 'gain', 'hi', 'hiC', 'haze', 'hazeC', 'hazeW', 'deep', 'glare', 'windDir'].forEach(function (k) { if (L[k] && !(L[k] instanceof Float32Array)) L[k] = new Float32Array(L[k]); });
    L.skyFlat = new Float32Array(18); for (var i = 0; i < 6; i++) { L.skyFlat[i * 3] = L.sky[i][0]; L.skyFlat[i * 3 + 1] = L.sky[i][1]; L.skyFlat[i * 3 + 2] = L.sky[i][2]; }
    var fb = L.fogB || [L.sky[1], 0]; L.fogBf = new Float32Array([fb[0][0], fb[0][1], fb[0][2], fb[1]]);
    L.discK = new Float32Array([Math.cos((L.discR || 1) * DEG), L.discI || 0, L.stars || 0, L.disc || 0]);
    var wl = Math.sqrt(L.windDir[0] * L.windDir[0] + L.windDir[1] * L.windDir[1]) || 1;
    L.wet = new Float32Array([L.rain, L.ripple, L.windDir[0] / wl, L.windDir[1] / wl]);
    return L;
  }
  function prepLight(V) {   // the world's base light (once), its field's parameters
    var L = V.light;
    prepOne(L);
    var P = V.field.params || [], pf = new Float32Array(96);
    for (var j = 0; j < Math.min(P.length, 24); j++) for (var k = 0; k < 4; k++) pf[j * 4 + k] = P[j][k] === undefined ? 0 : P[j][k];
    V.paramsFlat = pf;
    V.L = L; V.LA = null;   // (world6: the kits' lights are set by worldLights; no light by area)
  }
  /* OKLab of a linear colour, and back */
  function lin2lab(c) {
    var l = Math.cbrt(0.4122214708 * c[0] + 0.5363325363 * c[1] + 0.0514459929 * c[2]), m = Math.cbrt(0.2119034982 * c[0] + 0.6806995451 * c[1] + 0.1073969566 * c[2]), s = Math.cbrt(0.0883024619 * c[0] + 0.2817188376 * c[1] + 0.6299787005 * c[2]);
    return new Float32Array([0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s, 1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s]);
  }
  function lab2linA(L, a, b) { var c = oklab2lin(L, a, b); return [Math.max(c[0], 0), Math.max(c[1], 0), Math.max(c[2], 0)]; }
  var LABT = new Float32Array(3);
  function labTo(out, o, L, a, b) {   // OKLab into out[o..o+2], linear (no allocation)
    var l = L + 0.3963377774 * a + 0.2158037573 * b, m = L - 0.1055613458 * a - 0.0638541728 * b, s = L - 0.0894841775 * a - 1.2914855480 * b;
    l = l * l * l; m = m * m * m; s = s * s * s;
    out[o] = Math.max(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, 0); out[o + 1] = Math.max(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, 0); out[o + 2] = Math.max(-0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s, 0);
  }
  function blendLight(V) {
    var w = V.aw, n = w.length, i, k, j, same = true;
    for (i = 0; i < n; i++) if (Math.abs(w[i] - V.awB[i]) > 1e-4) same = false;
    if (same) return;
    for (i = 0; i < n; i++) V.awB[i] = w[i];
    var L = V.L, A = V.LA, B = V.LAlab;
    for (j = 0; j < LKC.length; j++) {
      var key = LKC[j], a0 = 0, a1 = 0, a2 = 0;
      for (i = 0; i < n; i++) { var c = B[i][key]; a0 += c[0] * w[i]; a1 += c[1] * w[i]; a2 += c[2] * w[i]; }
      labTo(L[key], 0, a0, a1, a2);
    }
    for (k = 0; k < 6; k++) { var s0 = 0, s1 = 0, s2 = 0; for (i = 0; i < n; i++) { var sf = B[i].skyFlat; s0 += sf[k * 3] * w[i]; s1 += sf[k * 3 + 1] * w[i]; s2 += sf[k * 3 + 2] * w[i]; } labTo(L.skyFlat, k * 3, s0, s1, s2); }
    var f0 = 0, f1 = 0, f2 = 0, f3 = 0; for (i = 0; i < n; i++) { f0 += B[i].fogB[0] * w[i]; f1 += B[i].fogB[1] * w[i]; f2 += B[i].fogB[2] * w[i]; f3 += A[i].fogBf[3] * w[i]; } labTo(L.fogBf, 0, f0, f1, f2); L.fogBf[3] = f3;
    for (j = 0; j < LKN.length; j++) { var kn = LKN[j], dst = L[kn]; for (k = 0; k < dst.length; k++) { var v = 0; for (i = 0; i < n; i++) v += A[i][kn][k] * w[i]; dst[k] = v; } }
    for (j = 0; j < LKS.length; j++) { var ks = LKS[j], vs = 0; for (i = 0; i < n; i++) vs += A[i][ks] * w[i]; L[ks] = vs; }
    var wl = Math.sqrt(L.windDir[0] * L.windDir[0] + L.windDir[1] * L.windDir[1]) || 1;
    L.wet[0] = L.rain; L.wet[1] = L.ripple; L.wet[2] = L.windDir[0] / wl; L.wet[3] = L.windDir[1] / wl;
  }
  /* the composite's inputs (world6: the world's live light; there is no junction to ease across) */
  var EL = { bloom: new Float32Array(3), shaftC: new Float32Array(3), lift: new Float32Array(3), gain: new Float32Array(3), exposure: 1, sat: 1 };
  function easedLight(V, u) {
    var L = V.L || V.light, P = null, w = 1, k;   // (world6: no last realm to ease from)
    var Q = L;
    for (k = 0; k < 3; k++) { EL.bloom[k] = lerp(Q.bloom[k], L.bloom[k], w); EL.shaftC[k] = lerp(Q.shaftC[k], L.shaftC[k], w); EL.lift[k] = lerp(Q.lift[k], L.lift[k], w); EL.gain[k] = lerp(Q.gain[k], L.gain[k], w); }
    EL.exposure = lerp(Q.exposure, L.exposure, w); EL.sat = lerp(Q.sat, L.sat, w);
    return EL;
  }

  /* ---------------------------------------------------------------- targets for the window */
  /* the world is drawn at OUT (at most 1.25 device px a CSS px); the canvas itself is FULL, the device's own
     resolution (round 2: the birds' ink is drawn at it, crisp as the live site's SVG strokes; the world's finished
     frame is put up to it with one bilinear pass, as the browser itself upscaled it before) */
  /* (round 3) the canvas at most FULL_DPR device px a CSS px and FULL_PX in all; where that is the world's own size
     (DIRECT: a window at 1 or 1.25 device px a CSS px) the composite is drawn straight onto it, and TG.win holds only
     what lies under the birds (HOST.under: their boxes copied in) */
  var FULL_DPR = 2, FULL_PX = 2.5e6, DIRECT = false;
  /* (E1.1, item 5) the scene's samples chosen by memory, against design-v5 5.5's caps. 4x MSAA (Fix 3) was in no budget:
     at 393x852@3 its renderbuffers (RGBA16F and DEPTH24, 4 samples: 48 B a pixel) are 23.9 MB of a world of 491 x 1065,
     over the high iPhone's 115 MB with the tier's planned pools. The plan, made once when the context is (and again
     after a restore: the same answer), for the largest window this screen can give (the screen's own size: a phone's bars
     can hide, a desktop window can be made full), as resize() sizes the world and the canvas there: the targets as
     allocTargets makes them, the canvas's back buffers (3 x RGBA8 at the canvas's size, the browser's), and design-v5
     5.5's other lines for the device's memory tier (clipmap, air, cloud volumes, re-bake, meshes, instances, rings: the
     pools E3b sizes from the cap). The scene's samples, with the scene's second colour texture they bring (FS_COMP's
     outlines), may take from those pools at most MEMGIVE (15%) of their plan: the largest count the context offers (up
     to the switch aa, 4) that leaves the pools that much is taken, else 2, else none (FXAA). Fixed for the context's
     life, so no pipeline key changes with a resize. The tiers (5.5): full pools, 115 MB: iPhones 390 pt and wider at
     3x, Android with 8 GB; low pools, 80 MB: other iPhones, iPads; 64 MB: other Android; desktops 160 MB. On the
     owner's 393x852@3 iPhone: 2x where the context offers it (122.3 MB with 2x and the twin, its pools then at 68.7 of
     76 MB: 90%); 4x would leave them 56.8 (75%), so where 4 is the only count offered (this WebKit's and Chromium's
     RGBA16F: [4]) none, with the twin alone (110.3 MB). E7 replaces the tier's guess with the device's class */
  /* (E1.1 Fix 2, the lead's ruling of 2026-10-15: the owner's rule, no glitter, outranks design-v5 5.5's caps, which
     are the design's estimate and not a measured limit) the full tier (the owner's 393x852@3 phone's class) and the
     desktop tier take the largest count the context offers, wherever its target is made whole (targetMS: a format the
     driver will not make, or an incomplete framebuffer, falls back to one sample as before); the low tiers (3-4 GB
     iPhones, iPads, other Android: where a jetsam kill reloads the page) keep the plan by MEMGIVE. The verifiers read
     MEMGIVE 0.25 (the ruling's figure) as not enough at 393x852@3 (4x leaves the pools 74.6 % of their plan: the least
     MEMGIVE that gives 4x there is 0.2536, at 430x932@3 0.41), hence the tier rule, not a figure. The record files the
     plan with the memory facts (rec.device.memPlan: aa, the targets' MB, losses, restores, the give-up) */
  var MEMGIVE = 0.15, MEMP = null, TWIN0 = false, MEMALL = { full: 1, desktop: 1 };   // (TWIN0: the scene's second colour texture without samples, where it fits)
  var MEMN = { lost: 0, restored: 0, msFail: 0 };   // (E1.1 Fix 2: the context's losses and restores, and samples the driver would not make, for the record)
  var MEMTIERS = { full: [115, 76], low: [80, 35], lowA: [64, 35], desktop: [160, 104] };   // (cap, design-v5 5.5's other lines in MB)
  function memTier() {
    if (SW.memtier && MEMTIERS[SW.memtier]) return SW.memtier;   // (dev: a tier named)
    var nav = navigator, dpr = window.devicePixelRatio || 1, sw = Math.min(screen.width || 0, screen.height || 0), coarse = false;
    try { coarse = !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches); } catch (e) { coarse = false; }
    var apple = /Apple/i.test(EXT.renderer || '') || /iPhone|iPad|Macintosh/.test(nav.userAgent || '');
    if (!coarse && !(nav.maxTouchPoints > 1)) return 'desktop';
    if (apple) return sw >= 390 && sw < 600 && dpr >= 2.9 ? 'full' : 'low';
    return (nav.deviceMemory || 0) >= 8 ? 'full' : 'lowA';
  }
  function memWorld(cw, ch) {   // (resize()'s sizes for a window of cw x ch CSS px)
    var dpr0 = window.devicePixelRatio || 1, area = Math.max(cw * ch, 1), d = Math.min(dpr0, SW.dpr1 ? 1 : 1.25, Math.sqrt(1.3e6 / area));
    var W = Math.max(1, Math.round(cw * d)), H = Math.max(1, Math.round(ch * d)), fd = Math.max(d, Math.min(dpr0, SW.dpr1 ? 1 : FULL_DPR, Math.sqrt(FULL_PX / area)));
    return [W, H, Math.max(W, Math.round(cw * fd)), Math.max(H, Math.round(ch * fd))];
  }
  function memTargets(W, H) {   // (allocTargets' bytes at SS 1)
    var cb = FLOAT_RT ? 8 : 4, w2 = Math.ceil(W / 2), h2 = Math.ceil(H / 2), b = W * H * (cb + 4) + w2 * h2 * ((FLOAT_RT ? 2 : 4) + cb + 4 + 2 * cb), bw = w2, bh = h2;
    for (var i = 0; i < 5; i++) { b += Math.max(1, bw) * Math.max(1, bh) * cb * (i < 4 ? 2 : 1); bw = Math.ceil(bw / 2); bh = Math.ceil(bh / 2); }
    return b + Math.ceil(W / 4) * Math.ceil(H / 4) * (cb * 2 + 4) + W * H * 4;
  }
  function memPlanAA() {
    var MB = 1048576, tier = memTier(), T = MEMTIERS[tier], sw = Math.max(screen.width || 0, 1), sh = Math.max(screen.height || 0, 1);
    var r = canvas.getBoundingClientRect(), cw = Math.max(r.width || 0, sw > sh === (r.width > r.height) ? sw : sh), ch = Math.max(r.height || 0, sw > sh === (r.width > r.height) ? sh : sw);
    var wd = memWorld(cw, ch), W = wd[0], H = wd[1], base = memTargets(W, H) + wd[2] * wd[3] * 12, n = 0, rows = {};
    var cands = AASUP.slice().sort(function (a, b) { return b - a; });
    for (var i = 0; i < cands.length; i++) {
      var k = cands[i], extra = W * H * k * ((FLOAT_RT ? 8 : 4) + 4) + W * H * (FLOAT_RT ? 8 : 4), pools = T[0] - (base + extra) / MB;
      rows[k] = { totalMB: +((base + extra) / MB + T[1]).toFixed(1), poolsMB: +pools.toFixed(1) };
      if (!n && (MEMALL[tier] || pools >= T[1] * (1 - MEMGIVE))) n = k;
    }
    /* (E1.1 Fix 2) no arm of the samples: E1.1 alternated 4x and none by the visit's number in the preview (diag's aaArm),
       which the lead's ruling retires (half the owner's visits would glitter); the preview draws as production plans */
    /* (E1.1) without samples (none fits, none is offered: this WebKit offers RGBA16F only at 4, so no 2x is ever
       there; or the record's arm), the scene's second colour texture alone where it fits the pools as above: the
       composite then mixes in the last frame (FS_COMP's uStb) on one sample a pixel, the half of 4x's help that costs
       a quarter of 4x's memory. At 393x852@3: 110.3 MB of 115 */
    var tw0 = W * H * (FLOAT_RT ? 8 : 4), poolsT = T[0] - (base + tw0) / MB;
    var aaUse = n;
    TWIN0 = !aaUse && poolsT >= T[1] * (1 - MEMGIVE);
    MEMP = { tier: tier, capMB: T[0], otherMB: T[1], give: MEMGIVE, screen: [sw, sh], planned: [W, H, wd[2], wd[3]], targetsMB: +(memTargets(W, H) / MB).toFixed(1), canvasMB: +(wd[2] * wd[3] * 12 / MB).toFixed(1),
      noneMB: +(base / MB + T[1]).toFixed(1), twin0MB: +((base + tw0) / MB + T[1]).toFixed(1), twin0: TWIN0, offered: AASUP.slice(), options: rows, planned_aa: n, rule: MEMALL[tier] ? 'largest offered' : 'MEMGIVE', aa: aaUse,
      aaMB: aaUse ? rows[aaUse].totalMB : (TWIN0 ? +((base + tw0) / MB + T[1]).toFixed(1) : +(base / MB + T[1]).toFixed(1)) };
    return MEMP.aa;
  }
  var TG = null, OUT = { w: 0, h: 0, dpr: 1, cssW: 0, cssH: 0 }, FULL = { w: 0, h: 0, dpr: 1 }, SS = 1, RUNG = 0, RUNGS = [1, 0.85, 0.72, 0.6, 0.5], CAMLIFT = 0;
  function allocTargets() {
    if (TG) { ['scene', 'lind', 'cloud', 'sm', 'sb', 'mask', 'win', 'gs'].forEach(function (k) { if (TG[k]) freeTarget(TG[k]); }); TG.bd.forEach(freeTarget); TG.bu.forEach(freeTarget); if (TG.hz) gl.deleteRenderbuffer(TG.hz); freeMS(TG.ms); if (TG.ch) TG.ch.forEach(freeTarget); if (TG.sceneH) { gl.deleteFramebuffer(TG.sceneH.f); gl.deleteTexture(TG.sceneH.t); } }
    var W = OUT.w * SS, H = OUT.h * SS, w2 = Math.max(1, Math.ceil(W / 2)), h2 = Math.max(1, Math.ceil(H / 2));
    TG = { W: W, H: H, scene: target(W, H, 'hdr', true), lind: target(w2, h2, 'r16'), cloud: target(w2, h2, 'hdr'), bd: [], bu: [], ms: null };
    // (E1 Fix 3, G0) the scene's samples: AAS a pixel, its colour and depth resolved into TG.scene before the depth pass
    if (AAS > 1) { TG.ms = targetMS(W, H, AAS); if (!TG.ms) AAS = 0; }
    // (E1.1, item 7) where the scene has its samples, a second colour texture for it (the depth shared): the frames take
    // them in turn, so the composite reads the last frame's scene as well (its samples' depth codes too), for the
    // outlines in front of a cloud (FS_COMP)
    TG.sceneH = AAS > 1 || TWIN0 ? sceneTwin(TG.scene) : null; SHIST.ok = false;   // (E1.1: without samples too where it fits, TWIN0)
    TG.ch = [target(w2, h2, 'hdr'), target(w2, h2, 'hdr')]; CACC.ok = false;   // (E1 Fix 3: the clouds' accumulation, two in turn)
    // one depth buffer under both half-resolution targets: the land's depth (from the depth pass) and the opaque cores
    // of the clouds, so a cloud box behind either is never marched
    TG.hz = gl.createRenderbuffer(); gl.bindRenderbuffer(gl.RENDERBUFFER, TG.hz); gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT24, w2, h2);
    [TG.lind, TG.cloud].forEach(function (T) { gl.bindFramebuffer(gl.FRAMEBUFFER, T.f); gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, TG.hz); });
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    var bw = w2, bh = h2;
    for (var i = 0; i < 5; i++) { TG.bd.push(target(Math.max(1, bw), Math.max(1, bh), 'hdr')); if (i < 4) TG.bu.push(null); bw = Math.ceil(bw / 2); bh = Math.ceil(bh / 2); }
    for (i = 0; i < 4; i++) TG.bu[i] = target(TG.bd[i].w, TG.bd[i].h, 'hdr');
    TG.sm = target(Math.max(1, Math.ceil(W / 4)), Math.max(1, Math.ceil(H / 4)), 'hdr');
    TG.sb = target(TG.sm.w, TG.sm.h, 'hdr');
    TG.inkKeep = target(Math.max(1, Math.ceil(OUT.w / 4)), Math.max(1, Math.ceil(OUT.h / 4)), 'rgba8');   // (world6w: the ink birds' keep-off)
    // (the finished frame at the world's resolution, put up to the canvas's; the birds' ink reads what lies under it)
    TG.win = target(OUT.w, OUT.h, 'rgba8');
    TG.gs = target(Math.max(1, Math.ceil(OUT.w / GS_K)), Math.max(1, Math.ceil(OUT.h / GS_K)), 'rgba8');   // (world6 fix: the words' ground as the world drew it, at an eighth: wordsGround)
    KEEPDIRTY = true; AG.n = 0;
  }
  /* (E1 Fix 3) a multisampled target: n samples a pixel of the scene's colour format and DEPTH_COMPONENT24 (the scene's
     depth texture's own format, so its resolve is a plain blit), as renderbuffers that are never sampled; null if the
     driver will not make it whole (the scene is then drawn at one sample, as before) */
  function targetMS(w, h, n) {
    var T = { w: w, h: h, n: n, f: gl.createFramebuffer(), c: gl.createRenderbuffer(), d: gl.createRenderbuffer() };
    gl.bindRenderbuffer(gl.RENDERBUFFER, T.c); gl.renderbufferStorageMultisample(gl.RENDERBUFFER, n, FLOAT_RT ? gl.RGBA16F : gl.RGBA8, w, h);
    gl.bindRenderbuffer(gl.RENDERBUFFER, T.d); gl.renderbufferStorageMultisample(gl.RENDERBUFFER, n, gl.DEPTH_COMPONENT24, w, h);
    gl.bindRenderbuffer(gl.RENDERBUFFER, null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, T.f);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.RENDERBUFFER, T.c);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, T.d);
    var ck = 'ms' + n, ok = FBOK[ck] ? true : gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE; if (ok) FBOK[ck] = 1;   // (E1.1: asked once, the first time)
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    if (!ok) { freeMS(T); MEMN.msFail++; if (!gl.isContextLost()) fail('the scene\'s ' + n + ' samples incomplete: one sample'); return null; }
    return T;
  }
  function sceneTwin(T) {
    var T2 = { w: T.w, h: T.h, f: gl.createFramebuffer(), t: tex2d(T.w, T.h, FLOAT_RT ? gl.RGBA16F : gl.RGBA8, gl.RGBA, HALF, gl.LINEAR), d: T.d, twin: true };
    gl.bindFramebuffer(gl.FRAMEBUFFER, T2.f);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, T2.t, 0);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, T2.d, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return T2;
  }
  function freeMS(T) { if (!T) return; gl.deleteFramebuffer(T.f); gl.deleteRenderbuffer(T.c); gl.deleteRenderbuffer(T.d); }
  /* (E1 Fix 3) the scene's samples resolved into its texture and depth (w x h of them, from the corner), then let go:
     invalidated, so a tile GPU never stores them */
  var MSINV = null;
  function resolveMS(MS, T, w, h) {
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, MS.f); gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, T.f);
    gl.blitFramebuffer(0, 0, w, h, 0, 0, w, h, gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT, gl.NEAREST);
    if (!MSINV) MSINV = [gl.COLOR_ATTACHMENT0, gl.DEPTH_ATTACHMENT];
    gl.invalidateFramebuffer(gl.READ_FRAMEBUFFER, MSINV);
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, null); gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null);
  }
  /* the frustum: 72 deg across a wide window's width; a tall window at least 42 deg across and at most 80 tall; a
     change of height alone (a phone's toolbar) eases the view over a second, any other change re-aims at once */
  function setFrustum(snap) {
    var aspect = OUT.w / Math.max(OUT.h, 1), tl = Math.tan(FOV_LONG * DEG / 2);
    TALLK = smooth(0.95, 1.75, OUT.h / Math.max(OUT.w, 1));
    if (aspect >= 1) { FRT.tanX = tl; FRT.tanY = tl / aspect; }
    else { FRT.tanX = Math.max(tl * aspect, Math.tan(21 * DEG)); FRT.tanY = Math.min(FRT.tanX / aspect, Math.tan(40 * DEG)); FRT.tanX = FRT.tanY * aspect; }
    if (snap) { FR.tanX = FRT.tanX; FR.tanY = FRT.tanY; }
  }
  function easeFrustum(dt) { var k = 1 - Math.exp(-dt / 0.35); FR.tanY += (FRT.tanY - FR.tanY) * k; FR.tanX = FR.tanY * OUT.w / Math.max(OUT.h, 1); }
  function resize() {
    if (LOST) return false;
    // the world at most 1.25 device px a CSS px, and at most 1.3 Mpx in all (a soft world gains nothing past it; the
    // words are HTML); the canvas at the device's own px (at most 3 a CSS px, 8.3 Mpx in all), for the birds' ink
    var r = canvas.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) return false;   // (hidden: nothing is sized while it is)
    var dmax = SW.dpr1 ? 1 : 1.25, fmax = SW.dpr1 ? 1 : FULL_DPR;   // (E0, the switch: the canvas at 1.0 device px a CSS px)
    var area = Math.max(r.width * r.height, 1), dpr = Math.min(window.devicePixelRatio || 1, dmax, Math.sqrt(1.3e6 / area));
    var w = Math.max(1, Math.round(r.width * dpr)), h = Math.max(1, Math.round(r.height * dpr));
    var fdpr = Math.max(dpr, Math.min(window.devicePixelRatio || 1, fmax, Math.sqrt(FULL_PX / area)));   // (round 3: 2 and 2.5 Mpx; round 2's 3 and 8.3 Mpx cost a phone 1.4 GB/s of copies for 0.6 % of its pixels in ink)
    var fw = Math.max(w, Math.round(r.width * fdpr)), fh = Math.max(h, Math.round(r.height * fdpr));
    if (DEVMODE && OPT.cvs) { var cvm = /^(\d+)x(\d+)$/.exec(OPT.cvs); if (cvm) { w = fw = +cvm[1]; h = fh = +cvm[2]; dpr = w / r.width; } }   // (dev, E0: a fixed small canvas: CPU timing and presented runs)
    if (w === OUT.w && h === OUT.h && fw === FULL.w && fh === FULL.h && TG) return false;
    var heightOnly = TG && w === OUT.w && Math.abs(h - OUT.h) < 0.15 * OUT.h;
    OUT.w = w; OUT.h = h; OUT.dpr = dpr; OUT.cssW = r.width; OUT.cssH = r.height;
    FULL.w = fw; FULL.h = fh; FULL.dpr = fw / Math.max(r.width, 1);
    DIRECT = fw === w && fh === h;
    CAMLIFT = clamp(h / w - 1, 0, 1) * 0.9;
    canvas.width = fw; canvas.height = fh;
    allocTargets();
    setFrustum(!heightOnly);
    measureWords();
    if (!heightOnly) inkRestart();   // (ink load fix: a new window, the words' reading anew; a phone's bar coming and going keeps it)
    touchMode();
    return true;
  }

  /* ---------------------------------------------------------------- the words */
  var WORDS = new Float32Array(20), WORDCOL = null, KEEPDIRTY = true, WLINE = [];   // ((line2 fix) WLINE: the line's own line boxes, canvas px (x0, y0, x1, y1 each), one a line: the client rects of the span its text is set in; [] none known)
  var wordEls = { name: document.querySelector('h1'), bio: document.querySelector('.bio') || document.querySelector('.words'),   /* (line2) the old bio's slot: the live page's line under the name (the ink birds' keep-off covers it; the words' read takes it as block 3) */ credit: document.querySelector('.credit'), links: document.querySelectorAll('footer a') };
  /* (E0) the name is lettered (an inline SVG in the h1, no bio): its box is the ink's own, the path's bounds in the
     drawing put where the svg stands (read once, then only scaled); without it, the h1's box */
  var nameSvg = wordEls.name ? wordEls.name.querySelector('svg') : null, namePath = nameSvg ? nameSvg.querySelector('path') : null, NAMEBB = null;
  function nameInk(cr, k) {
    try {
      var vb = nameSvg.viewBox && nameSvg.viewBox.baseVal, r = nameSvg.getBoundingClientRect();
      if (!vb || !vb.width || !vb.height || r.width < 1 || r.height < 1) return false;
      if (!NAMEBB) { var b = namePath.getBBox(); if (!b || !b.width) return false; NAMEBB = [b.x, b.y, b.width, b.height]; }
      var s = Math.min(r.width / vb.width, r.height / vb.height), ox = r.left + (r.width - vb.width * s) / 2, oy = r.top + (r.height - vb.height * s) / 2;
      WORDS[0] = (ox + (NAMEBB[0] - vb.x) * s - cr.left) * k; WORDS[1] = (oy + (NAMEBB[1] - vb.y) * s - cr.top) * k;
      WORDS[2] = (ox + (NAMEBB[0] + NAMEBB[2] - vb.x) * s - cr.left) * k; WORDS[3] = (oy + (NAMEBB[1] + NAMEBB[3] - vb.y) * s - cr.top) * k;
      return true;
    } catch (e) { return false; }
  }
  function measureWords() {
    var cr = canvas.getBoundingClientRect(), k = OUT.w / Math.max(cr.width, 1);
    function box(el, i) {
      if (!el) { WORDS[i * 4] = 0; WORDS[i * 4 + 1] = 0; WORDS[i * 4 + 2] = 0; WORDS[i * 4 + 3] = 0; return; }
      var b = el.getBoundingClientRect();
      WORDS[i * 4] = (b.left - cr.left) * k; WORDS[i * 4 + 1] = (b.top - cr.top) * k; WORDS[i * 4 + 2] = (b.right - cr.left) * k; WORDS[i * 4 + 3] = (b.bottom - cr.top) * k;
    }
    if (!(namePath && nameInk(cr, k))) box(wordEls.name, 0);
    box(wordEls.bio, 1); box(wordEls.credit, 2); box(wordEls.links[0], 3); box(wordEls.links[1], 4);
    /* (line2 fix) the line's own line boxes: the client rects of the span its text is set in, one a line (a read of the
       layout, as the boxes above; nothing built). The line's ground is read under them alone, never under its ragged
       right or the empty end of its last line (ground under no letter). No span: none, and the line is not read */
    WLINE.length = 0;
    var le = wordEls.bio && wordEls.bio.querySelector ? wordEls.bio.querySelector(':scope > span') : null, lr = le ? le.getClientRects() : [];
    for (var i = 0; i < lr.length; i++) if (lr[i].right - lr[i].left >= 1 && lr[i].bottom - lr[i].top >= 1) WLINE.push((lr[i].left - cr.left) * k, (lr[i].top - cr.top) * k, (lr[i].right - cr.left) * k, (lr[i].bottom - cr.top) * k);
    KEEPDIRTY = true;
  }
  function drawInkKeep() {   // (world6w) the ink birds' keep-off, when the words move
    if (!KEEPDIRTY || !TG) return;
    KEEPDIRTY = false;
    var P = EP.inkkeep; gl.useProgram(P.p);
    gl.bindFramebuffer(gl.FRAMEBUFFER, TG.inkKeep.f); gl.viewport(0, 0, TG.inkKeep.w, TG.inkKeep.h);
    gl.disable(gl.BLEND); gl.disable(gl.DEPTH_TEST);
    gl.uniform4fv(P.u.uWords, WORDS); gl.uniform2f(P.u.uOut, OUT.w, OUT.h); gl.uniform1f(P.u.uMS, OUT.w / TG.inkKeep.w); gl.uniform1f(P.u.uDpr, OUT.dpr || 1);
    gl.bindVertexArray(FULLVAO); gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
  /* (world6w, the owner's word of 2026-10-21: "remove that white background behind the text. it's fine failing
     accesibility") the words' inks. Nothing is done to the world for the words: no lift, no floor, no gain, no toe; the
     composite takes nothing from them (the same frame with the words' machinery on or off). Two groups take their ink
     each from their own ground, as the world drew it (the composite at an eighth, TG.gs, read back): the stack (the name
     and the credit, set on .stack) and the links (set on the footer). (Ink step, the owner's word of 2026-10-22: "hold
     each colour change long enough that it can never blink, and choose the links' colour by their worst letters, not
     their average") Each ink is scored by its APCA |Lc| on its own worst ground under the group's boxes (the links: dark
     on the darkest cell under their own ink boxes, light on the lightest; the stack: its ground's darkest and lightest
     tenth), the other ink taken only when it scores INK_M better, once that want
     has held INK_HOLD s (the stack's turn to light ink INK_HOLDS s) and no sooner than INK_DWELL s after the group's last flip; a rescue only where the shown ink
     cannot be read (under |Lc| INK_RLC on the ground's median), and never within INK_RGAP s of the last flip (no round
     trip). (ink fix) Each group takes its first ink after the page loads or the words' reading restarts (inkRestart: the
     first frame shown, a resize, the words' colours cleared, a restored context) from the readings of the frames shown
     in the generation's first INK_TAKE s (at least INK_TAKEN): the median of each reading's worst grounds, by the
     rule's own choice, once the canvas has been shown INK_TAKE s (at load, the dissolve at the inks' crossing); a
     restart's take changes an ink within INK_DWELL of the group's last change only where the shown ink cannot be read
     at all; never more than INK_CAP changes in a minute; the harness's stills each frame their own. The credit's grey
     and the focus ring are worked out from their ground (AG_R, AG_RR), with nothing under them, from the first take on
     (before it the page's own) */
  var WORDSETS = {
    dark: { text: '#000000', dimmed: '#42403c', focus: '#43300c', selection: '#e6e2d6' },
    light: { text: '#fdfcf7', dimmed: '#c9cdd6', focus: '#e0bd6a', selection: '#3b3f55' }
  };
  var INK_YC = 0.356, INK_BUF = 0.03, INK_R3 = 3, INK_LC = 45;   // (the record's: APCA's equal point for the two inks (grey 161, Y 0.356) and the shares at |Lc| 45, 3:1; the light grey's default ground)
  var INK_HOLD = 5, INK_HOLDS = 60, INK_DWELL = 20, INK_M = 8, INK_RLC = 20, INK_RHOLD = 1, INK_RGAP = 20;   // (ink step: the want held INK_HOLD s (every change; the stack's turn to light ink INK_HOLDS s: the stack's ground must ask for light ink 60 s unbroken before the name turns: 1.7 times the longest light-want run measured at 0.5 s (11 s on the census's flight before a crest; on step C's world 26.5 s before a crest and 35.5 s on a split ground); back to dark INK_HOLD); no flip within INK_DWELL s of the group's last; the other ink must read INK_M Lc better on its own worst ground; the rescue: the shown ink under |Lc| INK_RLC on the ground's median, held INK_RHOLD s, never within INK_RGAP s of the last flip)
  var INK_TAKE = 0.5, INK_TAKEN = 3, INK_SURE = 0.75, INK_SUREN = 8, INK_TAKEMAX = 1.5, INK_CAP = 3;   // (ink fix) the take: the readings of the frames shown in the generation's first INK_TAKE s, at least INK_TAKEN of them (on a slow device more than INK_TAKE s), once the canvas has been shown INK_TAKE s, when three in four of them (INK_SURE), and at least INK_SUREN, choose on their own what their medians choose, else more readings, to INK_TAKEMAX s, where the medians decide (a slow device's few readings never agree by chance): a stone under a letter for under about half the time never decides it (the default landing on a 60 fps clock: a pale shard under the links from 0.25 to 0.72 s shown); never more than INK_CAP changes of a group in any 60 s
  var INK_YD = hexLum(WORDSETS.dark.text), INK_YL = hexLum(WORDSETS.light.text);
  var INK_D3 = INK_R3 * (INK_YD + 0.05) - 0.05, INK_L3 = (INK_YL + 0.05) / INK_R3 - 0.05;
  /* (fix round) APCA 0.0.98G-4g's |Lc| of an ink on a ground: the ground's luminance taken as its grey's code to the 2.4
     power (APCA's own linearisation), the inks' from their codes */
  function inkY2A(y) { var c = y <= 0.0031308 ? y * 12.92 : 1.055 * Math.pow(y, 1 / 2.4) - 0.055; return Math.pow(clamp(c, 0, 1), 2.4); }
  function inkHexA(h) { var n = parseInt(h.slice(1), 16); return 0.2126729 * Math.pow((n >> 16 & 255) / 255, 2.4) + 0.7151522 * Math.pow((n >> 8 & 255) / 255, 2.4) + 0.0721750 * Math.pow((n & 255) / 255, 2.4); }
  function inkApca(t, b) {
    t = t > 0.022 ? t : t + Math.pow(0.022 - t, 1.414); b = b > 0.022 ? b : b + Math.pow(0.022 - b, 1.414);
    if (Math.abs(b - t) < 0.0005) return 0;
    var o = b > t ? (Math.pow(b, 0.56) - Math.pow(t, 0.57)) * 1.14 : (Math.pow(b, 0.65) - Math.pow(t, 0.62)) * 1.14;
    o = b > t ? (o < 0.1 ? 0 : o - 0.027) : (o > -0.1 ? 0 : o + 0.027);
    return Math.abs(o * 100);
  }
  var INK_AD = inkHexA(WORDSETS.dark.text), INK_AL = inkHexA(WORDSETS.light.text);
  function inkLc(kind, y) { return inkApca(kind === 'light' ? INK_AL : INK_AD, inkY2A(y)); }
  function inkLcY(kind, lc) {   // the ground's luminance where the ink reads at |Lc| lc (dark: at or above it; light: at or below it)
    var lo = 0, hi = 1;
    for (var i = 0; i < 40; i++) { var m = (lo + hi) / 2; if ((inkLc(kind, m) >= lc) === (kind === 'dark')) hi = m; else lo = m; }
    return kind === 'dark' ? hi : lo;
  }
  var INK_D45 = inkLcY('dark', INK_LC), INK_L45 = inkLcY('light', INK_LC);   // (about 0.27 and 0.41: between them both inks read at Lc 45, and the median decides)   // (the ground dark ink reads on at 3:1: Y >= INK_D3 (0.10); light ink: Y <= INK_L3 (0.29))
  var GS_K = 8, AG_R = 4.7, AG_RR = 3.4, AG_UP = 0.004, AG_GREY = hex('#5f5c56'), AG_RING = hex('#43300c'), AG_YG = lum(AG_GREY), AG_YRMAX = 0.1, AG_PAGE = 1, AG_PSTEP = 0.25;   // ((line2) AG_PAGE: a read made without the line's block keeps the line's last reading of the generation, at most AG_PAGE s older)   // ((line2 fix) AG_PSTEP: in flight the line's block is read with the words at most once in AG_PSTEP s of frames, and only where it crowds no other read (agLineDue))
  var AG_LRING = '#f4e2b0', AG_LGREY = hex('#c9cdd6'), AG_LSPARE = 1.2;   // ((tod fix3) AG_LSPARE: the light grey worked out on the credit's lightest ground read x1.2, a fifth to spare, as sky.v3.js does)
  /* AG: the grounds (per block: 0 the name, 1 the credit, 2 the links, 3 (line2) the line under the name: yd the 3rd
     percentile, ym the lightest, y0 the darkest; AGL the block's sorted luminances), the groups (GQ: 0 the stack, 1 the
     links: p10, p50, p90, the shares at 3:1 for dark and light ink, the want's start, the last flip), the inks (sk the
     stack's, lk the links'; null: none set yet) and the colours worked out (y, yr: the dark grey's and ring's luminance;
     dim, foc, sdim their hex) */
  var AG = { on: true, n: 0, yd: [-1, -1, -1, -1], ym: [-1, -1, -1, -1], y0: [-1, -1, -1, -1], u0: [-1, -1, -1, -1], ud: [-1, -1, -1, -1], u97: [-1, -1, -1, -1], um: [-1, -1, -1, -1], un: [0, 0, 0, 0], pg: -1, pt: -1, pl: -1, ph: -1, pq: -1e9, qg: -1, trim: 0, miss: 0, y: 0, yr: 0, set: false, dim: '', foc: '', sdim: '', reads: 0, rd: -1,
    lk: null, flips: 0, sk: null, sflips: 0, log: [], rgb: [null, null, null], sh: [0, 0], sdl: '', gen: 0, rg: -1, tk: [-1, -1], t0: -1, w0: -1e9, rt: -1, wn: 0, ink: false, ik: [false, false], fz: -1 };   // (ink fix) t0: the generation's start on the clock (-1: not shown); w0: the first frame shown, on the wall; fz: the wall when the flight's clock last ran (reduced motion's rule clock); rt: the frame the read last landed was drawn at; wn: the readings in the take; ink: the words' colours are the world's (from the first take); ik: each group's (the credit's grey from the stack's take, the links' underline and ring from the links')   // (ink load fix) gen: the words' reading's generation (inkRestart); rg: the generation of the read last landed; tk: when each group last took its ink at once   // (line2) pg, pt: the generation and frame time of the line's block last landed; pl, ph: the line's darkest and lightest tenth as last counted in the stack's worst grounds (-1: not counted); trim: the words' reads made without the line's block for want of room in the slot (the old read); miss: those refused even so (no room for the old read, or no slot free)   // ((line2 fix) pq, qg: the frame time and generation of the last read sent with the line's block)
  var AGL = [null, null, null, null];
  var GQ = [{ p10: -1, p50: -1, p90: -1, sd: 0, sl: 0, sd3: 0, sl3: 0, n: 0, since: -1, last: -1e9, rs: -1, lastR: -1e9, want: '', lo: -1, hi: -1, ld: 0, ll: 0, hold: INK_HOLDS, took: -1, ch: [], ulo: -1, uhi: -1 }, { p10: -1, p50: -1, p90: -1, sd: 0, sl: 0, sd3: 0, sl3: 0, n: 0, since: -1, last: -1e9, rs: -1, lastR: -1e9, want: '', lo: -1, hi: -1, ld: 0, ll: 0, took: -1, ch: [] }];
  var AGW = { lo: [[], []], hi: [[], []], md: [[], []], yd: [2, 2] };   // (ink fix) the take's readings: each group's worst grounds (lo, hi) and median; the credit's and the links' darkest
  var stackEl = document.querySelector('.stack'), footEl = document.querySelector('footer');
  function agL2s(c) { return c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055; }
  function agHex(base, y) {   // the colour of base's hue at luminance y (scaled in linear light), as #rrggbb
    var k = y / Math.max(lum(base), 1e-6), s = '#';
    for (var i = 0; i < 3; i++) { var v = Math.round(clamp(agL2s(Math.min(base[i] * k, 1)), 0, 1) * 255); s += (v < 16 ? '0' : '') + v.toString(16); }
    return s;
  }
  /* a group's ground from its blocks' sorted luminances: p10, p50, p90 and the shares each ink reads on at 3:1 */
  function agGroup(G, a) {
    var n = a ? a.length : 0; G.n = n;
    if (!n) { G.p10 = G.p50 = G.p90 = -1; G.sd = G.sl = G.sd3 = G.sl3 = 0; return; }
    G.p10 = a[Math.min(n - 1, Math.floor(n * 0.1))]; G.p50 = a[Math.min(n - 1, Math.floor(n * 0.5))]; G.p90 = a[Math.min(n - 1, Math.floor(n * 0.9))];
    var d = 0, l = 0, d3 = 0, l3 = 0;
    for (var i = 0; i < n; i++) { if (a[i] >= INK_D45) d++; if (a[i] <= INK_L45) l++; if (a[i] >= INK_D3) d3++; if (a[i] <= INK_L3) l3++; }
    G.sd = d / n; G.sl = l / n; G.sd3 = d3 / n; G.sl3 = l3 / n;   // (the shares at APCA Lc 45 decide; the WCAG 3:1 shares are the record's)
  }
  /* (ink step, fix round) a group's worst grounds, as the read-back gives them under the words' own ink boxes (ungrown:
     the name's path bounds, the credit's box, each link's own box): dark ink's the darkest cell (AG.u0), light ink's the
     lightest (AG.um), one cell of the eighth-size composite each (6.4 CSS px on a phone at three device px a CSS px, 8
     at one: about a footer letter). (The ink step's
     first cut read the boxes grown 5-7 px for the ring's grey, dark on their 3rd percentile, light on their lightest
     cell: ground under no letter, leaning the links to dark.) */
  function inkWorst(G, bs, yd, ym) {
    var lo = 2, hi = -1;
    for (var i = 0; i < bs.length; i++) { var b = bs[i]; if (yd[b] >= 0 && ym[b] >= 0) { lo = Math.min(lo, yd[b]); hi = Math.max(hi, ym[b]); } }
    G.lo = hi >= 0 ? lo : -1; G.hi = hi;
  }
  /* (ink step, fix round) the stack's worst grounds: its ground's darkest tenth for dark ink (G.p10) and its lightest
     tenth for light ink (G.p90), as agGroup read them: the name is ten letters, its worst letter about a tenth of its
     ground; one dark cell under the credit's box (a cell is 8 CSS px) must not turn the whole name light on a mid-bright
     ground (step C's landing: 20% of 30 minutes, the median letter at |Lc| 31 where black read 64) */
  function inkDeciles(G) { G.lo = G.n > 0 ? G.p10 : -1; G.hi = G.n > 0 ? G.p90 : -1; }
  /* the ink a group's ground asks for: each ink scored by its |Lc| on its own worst ground (dark on the darkest, light on
     the lightest); the other ink only when it scores INK_M better than the one shown (the better worst wins, with
     hysteresis); with none shown yet, the better */
  function inkWant(G, cur) {
    var d = inkLc('dark', G.lo), l = inkLc('light', G.hi); G.ld = d; G.ll = l;
    if (cur === 'dark') return l >= d + INK_M ? 'light' : 'dark';
    if (cur === 'light') return d >= l + INK_M ? 'dark' : 'light';
    return l >= d ? 'light' : 'dark';
  }
  /* the group's ink this frame: its want, once held its hold (INK_HOLD s; the stack's turn to light ink INK_HOLDS s,
     G.hold: a dune face must keep asking for it that long, while back to dark ink it takes INK_HOLD, so light ink is
     never kept on a crest longer than the dwell) and no sooner than INK_DWELL s after its last flip (so an
     ink once shown stays at least that long: never a blink); the rescue, for a ground on which the shown ink cannot be
     read (under |Lc| INK_RLC on the median, the other ink INK_M better there), held INK_RHOLD s and never within INK_RGAP
     s of the last flip (no round trip); at once on the first frame and in the harness's stills */
  function inkStep(G, cur, now, atOnce) {
    if (G.n <= 0) return cur;
    var want = inkWant(G, cur); G.want = want; G.why = 'ground';
    if (atOnce || cur === null) { G.since = -1; G.rs = -1; G.last = now; return want; }
    var oth = cur === 'light' ? 'dark' : 'light', lc = inkLc(cur, G.p50);
    if (lc < INK_RLC && inkLc(oth, G.p50) >= lc + INK_M && !(G.ulo >= 0 && inkWant(G, oth) === cur && inkWant({ lo: G.ulo, hi: G.uhi }, oth) === oth)) {   // ((line2 fix) no rescue the want would undo only for the line's fold (G.ulo, G.uhi: the worst grounds before it): the ink the fold holds stays)
      if (!(G.rs >= 0)) G.rs = now;
      if (now - G.rs >= INK_RHOLD && now - G.last >= INK_RGAP) { G.since = -1; G.rs = -1; G.last = now; G.lastR = now; G.why = 'rescue'; return oth; }
    } else G.rs = -1;
    if (want === cur) { G.since = -1; return cur; }
    if (!(G.since >= 0)) G.since = now;
    if (now - G.since >= (want === 'light' && G.hold ? G.hold : INK_HOLD) && now - G.last >= INK_DWELL) { G.since = -1; G.rs = -1; G.last = now; return want; }   // ((e3) the hold to turn light: G.hold, the stack's INK_HOLDS; every other change INK_HOLD)
    return cur;
  }
  /* (ink load fix) the words' reading starts again: the next read taken from now on is each group's first, and sets its
     ink at once (agUpdate); the grounds read before are forgotten (a read queued earlier lands with its own generation
     and is not taken for the groups) */
  function inkRestart(show) {   // (ink fix: show, the first frame shown: the take waits for the dissolve, from the moment the canvas shows (render sets AG.w0 after the frame is drawn); a restart while the canvas is hidden opens no window until it shows)
    AG.gen++; GQ[0].n = 0; GQ[1].n = 0; AG.wn = 0; AG.t0 = show || shown ? SIM.t : -1; if (show) AG.w0 = 1e15;
    for (var k = 0; k < 2; k++) { AGW.lo[k].length = 0; AGW.hi[k].length = 0; AGW.md[k].length = 0; }
    AGW.yd[0] = AGW.yd[1] = 2;
  }
  /* (ink fix) a reading of a frame shown since the generation began, into its take: each group's worst grounds and
     median, the credit's and the links' darkest (the greys' grounds at the take) */
  function inkWin() {
    if (AG.wn >= 256) return;
    for (var k = 0; k < 2; k++) if (GQ[k].n > 0 && GQ[k].hi >= 0) { AGW.lo[k].push(GQ[k].lo); AGW.hi[k].push(GQ[k].hi); AGW.md[k].push(GQ[k].p50); }
    if (AG.yd[1] >= 0) AGW.yd[0] = Math.min(AGW.yd[0], AG.yd[1]); if (AG.yd[2] >= 0) AGW.yd[1] = Math.min(AGW.yd[1], AG.yd[2]);
    AG.wn++;
  }
  function inkMedOf(a) { var b = a.slice().sort(function (x, y) { return x - y; }), n = b.length; return n % 2 ? b[(n - 1) / 2] : (b[n / 2 - 1] + b[n / 2]) / 2; }
  function inkMed() { for (var k = 0; k < 2; k++) if (AGW.lo[k].length) { GQ[k].lo = inkMedOf(AGW.lo[k]); GQ[k].hi = inkMedOf(AGW.hi[k]); GQ[k].p50 = inkMedOf(AGW.md[k]); } }   // (each group's grounds for its take: the medians over the take's readings)
  function inkSure(k, cur) {   // (each reading's own choice: INK_SURE of the take's readings, at least INK_SUREN of them, choose what their medians choose)
    var A = AGW, n = A.lo[k].length, T = { lo: inkMedOf(A.lo[k]), hi: inkMedOf(A.hi[k]) }, c = inkWant(T, cur), m = 0;
    for (var i = 0; i < n; i++) { T.lo = A.lo[k][i]; T.hi = A.hi[k][i]; if (inkWant(T, cur) === c) m++; }
    return n >= INK_SUREN && m >= n * INK_SURE;
  }
  function inkCap(G, now) { return G.ch.length >= INK_CAP && now - G.ch[G.ch.length - INK_CAP] < 60; }   // (INK_CAP changes in the last minute: no more)
  function inkCh(G, a, b, now) { if (a !== null && b !== a) { G.ch.push(now); if (G.ch.length > INK_CAP) G.ch.shift(); } }
  /* (ink fix) a group's take: with no ink chosen yet (the page's load; the words' colours cleared) the better of the
     two on the take's grounds, at once, and the dwell runs from it; with one shown (a restart: a resize; reduced
     motion's still) the other only INK_M better, and within INK_DWELL of the group's last change only where the shown
     ink cannot be read on the new ground at all (the rescue's test on the take's median); never a change past INK_CAP
     in a minute. The harness's stills: their own, at once. The take's readings are its hold */
  function inkTake(G, cur, now, hs) {
    var want = inkWant(G, cur), lc; G.want = want; G.since = -1; G.rs = -1; G.why = 'take';
    if (cur === null || hs) { if (want !== cur) G.last = now; return want; }
    if (want === cur) return cur;
    lc = inkLc(cur, G.p50);
    if ((now - G.last >= INK_DWELL || lc < INK_RLC && inkLc(want, G.p50) >= lc + INK_M) && !inkCap(G, now)) { G.last = now; return want; }
    return cur;
  }
  /* (ink fix) a group's ink this frame: its take; before it what it shows; under reduced motion each still a take (it is
     drawn once); in flight the rule (inkStep), never past INK_CAP changes in a minute; the harness's stills at once */
  function inkOf(G, cur, now, take, hs, still, links) {
    if (take || still && !hs && G.took === AG.gen && G.n > 0) return inkTake(G, cur, now, hs);
    if (G.took !== AG.gen || G.n <= 0) return cur;
    if (hs) return inkStep(G, cur, now, true);
    var sk = inkSky(G, cur, now, links); if (sk !== null) return sk;   // (tod: the sky flip, ahead of the cap: counted in it, never blocked by it)
    if (inkCap(G, now)) { G.since = -1; G.rs = -1; return cur; }
    return inkStep(G, cur, now, false);
  }
  /* (tod) the sky flip: through a change between skies of different words (SKYI.turning, the cycle's: w04b_sky.js) the
     group's ground rule is suspended (no hold's want, no ground flip, no rescue against the change) and the group turns
     to the incoming sky's words once, on the first reading where they score at least as well as the ink shown, each on
     its own worst ground (dark on the darkest, light on the lightest), the score both bars at once: min(WCAG / 4.5,
     |Lc| / 45) (on an even ground the two meet at Y 0.2206, OKLab L 0.604, both inks at 0.84 of both bars); toward dark
     words the stack at k 0.75 at the latest (the live's), and the links keep their own ground rule (on the dunes' sand by
     day they read light). Once a group a change (G.skyId), never back; it counts in INK_CAP and sets G.last, so
     INK_DWELL holds the ground rule off for 20 s after it. A group already showing the incoming words is done */
  function inkScore(kind, y) { var w = kind === 'light' ? (INK_YL + 0.05) / (y + 0.05) : (y + 0.05) / (INK_YD + 0.05); return Math.min(w / 4.5, inkLc(kind, y) / 45); }
  function inkSky(G, cur, now, links) {
    if (!SKYI.turning || cur === null) return null;
    var want = SKYI.want;
    if (links && want === 'dark') return null;
    if (G.skyId === SKYI.id || cur === want) { G.skyId = SKYI.id; G.since = -1; G.rs = -1; return cur; }
    var yw = want === 'dark' ? G.lo : G.hi, yc = cur === 'dark' ? G.lo : G.hi;
    if (!(yw >= 0) || !(yc >= 0)) return cur;
    var sw = inkScore(want, yw), sc = inkScore(cur, yc); G.sw = sw; G.sc = sc;
    if (sw >= sc || (!links && want === 'dark' && SKYI.k >= 0.75)) { G.skyId = SKYI.id; G.since = -1; G.rs = -1; G.last = now; G.why = 'sky'; return want; }
    return cur;
  }
  function agStack(kind) {
    if (AG.sk === kind || !stackEl) return;
    if (AG.sk !== null) { AG.sflips++; if (AG.log.length < 400) AG.log.push([+SIM.t.toFixed(2), 's', kind, GQ[0].why || '', SKYI.id, +SKYI.k.toFixed(3)]); }
    AG.sk = kind; AG.sdim = '';
    stackEl.style.setProperty('--color-text', WORDSETS[kind].text);
  }
  function agLinks(kind) {
    if (AG.lk === kind || !footEl) return;
    if (AG.lk !== null) { AG.flips++; if (AG.log.length < 400) AG.log.push([+SIM.t.toFixed(2), 'l', kind, GQ[1].why || '', SKYI.id, +SKYI.k.toFixed(3)]); }
    AG.lk = kind;
    var s = footEl.style;
    s.setProperty('--color-text', WORDSETS[kind].text);
    if (kind === 'light') { s.setProperty('--color-dimmed', WORDSETS.light.dimmed); s.setProperty('--color-focus', AG_LRING); }
    else { s.removeProperty('--color-dimmed'); s.removeProperty('--color-focus'); }   // (dark: the root's, worked out below)
  }
  /* the measured grounds to the inks and the shown colours */
  function agUpdate() {
    if (!AG.on) return;
    var now = SIM.t, still = STILLMODE ? !SW.wlive : reduced(), hs = STILLMODE && !SW.wlive;   // (still: a frame that is all there is, its own colours (the harness's stills, reduced motion's still); hs: the harness's stills, each frame its own inks at once)
    if (!STILLMODE) { if (!reduced()) AG.fz = clockNow(); else { var z = AG.fz >= 0 ? AG.fz : AG.w0; if (z > -1e8) now += Math.max(0, clockNow() - z) / 1000; } }   // (ink fix: under reduced motion the flight's clock stands still; the rule's runs on with the wall from where it stood, so its dwell and its minute pass)
    if (AG.reads !== AG.rd && AG.rg === AG.gen) {   // (a new read of this generation: the groups' grounds)
      AG.rd = AG.reads;
      var st = (AGL[0] || []).concat(AGL[1] || []); st.sort(function (x, y) { return x - y; });
      agGroup(GQ[0], st); agGroup(GQ[1], AGL[2]);
      inkDeciles(GQ[0]); inkWorst(GQ[1], [2], AG.u0, AG.um);   // (ink step, fix round) each ink's worst ground: the stack's darkest and lightest tenth, the links' darkest and lightest cell under their own boxes
      /* (line2) the line under the name, read as its own block (3: no gap, no union with the name), counted as a worst-of
         only: the stack's darkest tenth no lighter than the line's own darkest tenth, its lightest no darker than the
         line's lightest; the name's and the credit's pooled tenths, median and shares exactly as before. A read made
         without the line's block (wordsGroundRead: for room, or between its AG_PSTEP reads) counts the line's last
         reading of this generation, at most AG_PAGE s older; with none, the old rule. (line2 fix) The line's tenths are
         those of the cells under its own line boxes (agLand), never of its block's ground under no letter; and the
         stack's worst grounds as they were before the fold are kept (ulo, uhi: -1 when the line is not counted), so
         the rescue never makes a round trip the fold alone would undo (inkStep) */
      var pa = AGL[3], pn = pa && AG.pg === AG.gen && AG.rt - AG.pt <= AG_PAGE ? pa.length : 0; AG.pl = AG.ph = -1; GQ[0].ulo = GQ[0].uhi = -1;
      if (pn > 0 && GQ[0].n > 0) { AG.pl = pa[Math.min(pn - 1, Math.floor(pn * 0.1))]; AG.ph = pa[Math.min(pn - 1, Math.floor(pn * 0.9))]; GQ[0].ulo = GQ[0].lo; GQ[0].uhi = GQ[0].hi; GQ[0].lo = Math.min(GQ[0].lo, AG.pl); GQ[0].hi = Math.max(GQ[0].hi, AG.ph); }
      if (AG.t0 >= 0 && AG.rt >= AG.t0) inkWin();   // (ink fix) a reading of a frame shown since the generation began: into its take
    }
    /* (ink fix) the take is due once the generation's readings cover its first INK_TAKE s shown (at least INK_TAKEN of
       them; under reduced motion the still's own) and the canvas has been shown INK_TAKE s (the dissolve); the
       harness's stills at once */
    var due = hs || AG.wn > 0 && (STILLMODE || clockNow() - AG.w0 >= INK_TAKE * 1000) && (still || AG.wn >= INK_TAKEN && AG.rt >= AG.t0 + INK_TAKE);
    var late = hs || still || AG.rt >= AG.t0 + INK_TAKEMAX;   // (past INK_TAKEMAX the medians decide however the readings split)
    var fs = due && GQ[0].n > 0 && GQ[0].took !== AG.gen && (late || inkSure(0, AG.sk)), fl = due && GQ[1].n > 0 && GQ[1].took !== AG.gen && (late || inkSure(1, AG.lk));   // (each group's take: once a generation, when its readings agree)
    if (fs || fl) { inkMed(); AG.ink = true; } if (fs) AG.ik[0] = true; if (fl) AG.ik[1] = true;
    var s0 = AG.sk, l0 = AG.lk;
    agStack(SW.inks >= 0 ? (SW.inks ? 'light' : 'dark') : inkOf(GQ[0], AG.sk, now, fs, hs, still, false));   // (dev inks/inkl: the harness's forced inks; before its take a group keeps what it shows: the root's, the realm's words)
    agLinks(SW.inkl >= 0 ? (SW.inkl ? 'light' : 'dark') : inkOf(GQ[1], AG.lk, now, fl, hs, still, true));
    inkCh(GQ[0], s0, AG.sk, now); inkCh(GQ[1], l0, AG.lk, now);
    if (fs) { GQ[0].took = AG.gen; AG.tk[0] = now; } if (fl) { GQ[1].took = AG.gen; AG.tk[1] = now; }
    if (!AG.ink) return;   // (ink fix) before the first take the page keeps its own colours (the stylesheet's grey, underline and ring): nothing written
    // the dark grey (the credit under dark ink, the links' underline) and the dark ring, from their blocks' darkest (at the
    // first take the darkest of the take's readings, so the next reading brings no jump)
    var first = !AG.set && (fs || fl), ydC = first ? AGW.yd[0] : AG.yd[1], ydL = first ? AGW.yd[1] : AG.yd[2];
    if (ydC < 0 || ydL < 0 || ydC > 1 || ydL > 1) { if (!AG.set) { AG.y = 0; AG.yr = 0; } }   // (no ground read yet: full ink)
    else {
      var tg = clamp((ydC + 0.05) / AG_R - 0.05, 0, AG_YG), tr = clamp((ydL + 0.05) / AG_RR - 0.05, 0, AG_YRMAX);
      AG.y = tg < AG.y || !AG.set ? tg : Math.min(tg, AG.y + Math.max(AG_UP * 0.125, AG.y * 0.03));   // (lightening: about 3% a frame)
      AG.yr = tr < AG.yr || !AG.set ? tr : Math.min(tr, AG.yr + Math.max(AG_UP * 0.125, AG.yr * 0.03));
      if (still) { AG.y = tg; AG.yr = tr; }   // (the harness's stills and films: each frame its own ground's colours)
      AG.set = true;
    }
    var dim = agHex(AG_GREY, Math.max(AG.y, 1e-5)), foc = agHex(AG_RING, Math.max(AG.yr, 1e-5)), s = root.style;
    if (AG.ik[1] && dim !== AG.dim) { AG.dim = dim; s.setProperty('--color-dimmed', dim); }   // (ink fix: the root's grey and ring are the links' underline and focus ring under dark ink: from the links' take, so each changes once at load)
    if (AG.ik[1] && foc !== AG.foc) { AG.foc = foc; s.setProperty('--color-focus', foc); }
    // the stack's grey: under dark ink the dark grey above; under light ink a light grey for AG_R over the credit's lightest
    if (stackEl && AG.ik[0]) {   // (ink fix: the credit's grey from the stack's take)
      var sd;
      var yc = AG.ym[1] >= 0 ? AG.ym[1] : INK_YC, yg = clamp(AG_R * (yc * AG_LSPARE + 0.05) - 0.05, lum(AG_LGREY), 0.96); AG.sdl = agHex(AG_LGREY, yg);   // (fix round: worked out under either ink, for the record; tod fix3, problem 5: on the credit's lightest ground read with a fifth to spare (AG_LSPARE, the live sky's): the read-back's eighth steps over a thin lit top under the credit, which read 4.43-4.47:1 in night holds with no spare)
      if (AG.sk === 'light') sd = AG.sdl;
      else sd = dim;
      if (sd !== AG.sdim) { AG.sdim = sd; stackEl.style.setProperty('--color-dimmed', sd); }
    }
  }
  /* the ground's read: the blocks' boxes in TG.gs (grown 4 px), RGBA bytes, bottom-up rows */
  var AGR = [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]], AGBUF = null, AGY = new Float32Array(16384), AG_GROW = [5, 5, 7, 5];   // ((line2) block 3, the line under the name: grown as the credit's)
  var AGRI = [[], [], [], []], AGU = new Float32Array(16384);   // (ink step, fix round) each block's ink boxes ungrown, in the read-back's cells ([x0, y0, x1, y1] each, bottom-up rows): the grounds under the words themselves   // (the ink's boxes and the ring's few pixels, window px a device px)
  function agRects() {
    var gw = TG.gs.w, gh = TG.gs.h, k = 1 / GS_K, n = 0;
    var B = [[0], [2], [3, 4], [1]];   // ((line2) the line under the name (slot 1) its own block, last: blocks 0-2 as before, at their own offsets in the read)
    for (var b = 0; b < B.length; b++) {
      var x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
      for (var j = 0; j < B[b].length; j++) { var i = B[b][j] * 4; if (WORDS[i + 2] - WORDS[i] < 1) continue; x0 = Math.min(x0, WORDS[i]); y0 = Math.min(y0, WORDS[i + 1]); x1 = Math.max(x1, WORDS[i + 2]); y1 = Math.max(y1, WORDS[i + 3]); }
      if (x1 < x0 || b === 3 && !WLINE.length) { AGR[b][2] = 0; continue; }   // ((line2 fix) the line read only where its line boxes are known)
      var RI = AGRI[b]; RI.length = 0;
      if (b === 3) for (j = 0; j < WLINE.length; j += 4) RI.push(Math.round(WLINE[j] * k), Math.round(gh - WLINE[j + 3] * k), Math.round(WLINE[j + 2] * k), Math.round(gh - WLINE[j + 1] * k));   // ((line2 fix) the line's ink boxes: its own line boxes, the cells whose centres lie in them (not every cell they touch), so its tenths are the ground under its letters)
      else for (j = 0; j < B[b].length; j++) { i = B[b][j] * 4; if (WORDS[i + 2] - WORDS[i] < 1) continue; RI.push(Math.floor(WORDS[i] * k), Math.floor(gh - WORDS[i + 3] * k), Math.ceil(WORDS[i + 2] * k), Math.ceil(gh - WORDS[i + 1] * k)); }
      var gr = AG_GROW[b] * (OUT.dpr || 1);
      var rx0 = clamp(Math.floor((x0 - gr) * k), 0, gw - 1), rx1 = clamp(Math.ceil((x1 + gr) * k), rx0 + 1, gw), ry0 = clamp(Math.floor(gh - (y1 + gr) * k), 0, gh - 1), ry1 = clamp(Math.ceil(gh - (y0 - gr) * k), ry0 + 1, gh);
      AGR[b][0] = rx0; AGR[b][1] = ry0; AGR[b][2] = rx1 - rx0; AGR[b][3] = ry1 - ry0; n++;
    }
    return n;
  }
  function agLand(b, px, off, w, h, R0, RI) {   // a block's bytes: its luminances, sorted (AGL), its robust darkest, lightest, darkest; and those of the cells under its ink boxes (ungrown: u0, ud, u97, um)
    var n = w * h, m = 0, r = RI || [], x0 = R0 ? R0[0] : 0, y0 = R0 ? R0[1] : 0;
    if (AGY.length < n) { AGY = new Float32Array(n); AGU = new Float32Array(n); }   // ((line2) never a block cut short: reduced motion's read made at once can pass 16,384 cells at a large text size; the ring's slot bounds its own)
    for (var i = 0; i < n; i++) {
      var q = off + i * 4; AGY[i] = 0.2126 * s2l(px[q] / 255) + 0.7152 * s2l(px[q + 1] / 255) + 0.0722 * s2l(px[q + 2] / 255);
      var cx = x0 + i % w, cy = y0 + (i / w | 0);
      for (var j = 0; j < r.length; j += 4) if (cx >= r[j] && cx < r[j + 2] && cy >= r[j + 1] && cy < r[j + 3]) { AGU[m++] = AGY[i]; break; }
    }
    var a = Array.prototype.slice.call(AGY.subarray(0, n)).sort(function (x, y) { return x - y; });
    AGL[b] = a; AG.yd[b] = a[Math.min(n - 1, Math.floor(n * 0.03))]; AG.ym[b] = a[n - 1]; AG.y0[b] = a[0];
    if (m > 0) { var u = Array.prototype.slice.call(AGU.subarray(0, m)).sort(function (x, y) { return x - y; }); AG.u0[b] = u[0]; AG.ud[b] = u[Math.min(m - 1, Math.floor(m * 0.03))]; AG.u97[b] = u[Math.min(m - 1, Math.floor(m * 0.97))]; AG.um[b] = u[m - 1]; }
    else { AG.u0[b] = AG.y0[b]; AG.ud[b] = AG.yd[b]; AG.u97[b] = a[Math.min(n - 1, Math.floor(n * 0.97))]; AG.um[b] = AG.ym[b]; }
    AG.un[b] = m; AG.reads++;
    if (b === 3) { AGL[3] = m > 0 ? u : null; AG.pg = AG.rg; AG.pt = AG.rt; }   // ((line2) the line's reading: its generation and frame time)   // ((line2 fix) the line's sorted luminances: the cells under its own line boxes alone)
  }
  function wordsGroundDeliver(e) { if (e.g !== AG.gen) return; AG.rg = e.g; AG.rt = e.t; for (var b = 0; b < e.r.length; b++) if (e.r[b][2] > 0) agLand(b, RB.buf, e.off + e.o[b], e.r[b][2], e.r[b][3], e.r[b], e.ri[b]); }
  /* (line2 fix) in flight the line's block goes with the words' read once in AG_PSTEP s of frames at most, and where it
     crowds no other read: as the last read its slot takes (the jobs before the draws, and the slot fenced after this
     frame's flush with a fence free, or at the next frame's start by fenceDue's rhythm a frame on, a fence free then:
     fewer than RB_FENCES now, or this frame's poll found the GPU caught up, so the next pops one). In a new generation
     at once (the take's readings count the line); with the jobs after the draws (no read is a slot's last) only as the
     line's reading nears AG_PAGE / 2. Otherwise the read is the old one; a line not read for AG_PAGE s is not counted */
  function agLineDue() {
    if (AG.qg === AG.gen && SIM.t - AG.pq >= 0 && SIM.t - AG.pq < AG_PSTEP) return false;
    if (AG.pg !== AG.gen) return true;
    if (SW.order !== 0) return !(SIM.t - AG.pt >= 0 && SIM.t - AG.pt < AG_PAGE / 2);
    var f = SW.fence, n = FRAMEN + 1, free = RB.fences.length < RB_FENCES;
    return f === 3 ? free : (free || !RB.lagged) && (f === 1 || (f === 2 ? n % 2 === 0 : n % 8 === 0));
  }
  /* after the ground pass (TG.gs bound): read now (the harness) or through the ring (in flight) */
  function wordsGroundRead() {
    if (!agRects()) return;
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, TG.gs.f);
    var b, bytes = 0, nb = AGR.length, o = [];
    for (b = 0; b < nb; b++) { o[b] = bytes; bytes += AGR[b][2] * AGR[b][3] * 4; }
    if (STILLMODE ? !SW.wlive || SW.wsync : reduced()) {   // (dev wsync: read at once, the inks' live rule kept; (ink load fix) reduced motion's still, drawn once: its ground read at once)
      AG.rg = AG.gen; AG.rt = SIM.t;   // (ink fix: the frame's time, for the take)
      if (!AGBUF || AGBUF.length < bytes) AGBUF = new Uint8Array(bytes);
      for (b = 0; b < nb; b++) if (AGR[b][2] > 0) { var v = new Uint8Array(AGBUF.buffer, o[b], AGR[b][2] * AGR[b][3] * 4); gl.readPixels(AGR[b][0], AGR[b][1], AGR[b][2], AGR[b][3], gl.RGBA, gl.UNSIGNED_BYTE, v); agLand(b, AGBUF, o[b], AGR[b][2], AGR[b][3], AGR[b], AGRI[b]); }
    } else {
      /* (line2) never refused unseen: a read that has no room in the slot is made without its last block (the line's: the
         read is then the old one, blocks 0-2 at their own offsets, and fits wherever the old one did), counted (AG.trim);
         one refused even so is counted (AG.miss) */
      var sk = RB.skipped, pb = nb > 3 ? AGR[3][2] * AGR[3][3] * 4 : 0, S;
      if (pb > 0 && !agLineDue()) { bytes -= pb; nb = 3; pb = 0; }   // ((line2 fix) the line's block yields to the ring's other reads (agLineDue); the reads between are the old ones, the line's last reading counted AG_PAGE s)
      S = rbSlot(bytes);
      if (!S && pb > 0 && RB.skipped === sk) { S = rbSlot(bytes - pb); if (S) { bytes -= pb; nb = 3; AG.trim++; } }
      if (!S) AG.miss++;
      if (S && nb > 3 && pb > 0) { AG.pq = SIM.t; AG.qg = AG.gen; }
      if (S) {
        var ent = { k: 'words', g: AG.gen, t: SIM.t, r: AGR.slice(0, nb).map(function (r) { return r.slice(); }), ri: AGRI.slice(0, nb).map(function (r) { return r.slice(); }), o: o.slice(0, nb), off: 0, bytes: 0 }, start = S.used;
        gl.bindBuffer(gl.PIXEL_PACK_BUFFER, S.pbo);
        for (b = 0; b < nb; b++) if (AGR[b][2] > 0) gl.readPixels(AGR[b][0], AGR[b][1], AGR[b][2], AGR[b][3], gl.RGBA, gl.UNSIGNED_BYTE, start + o[b]);
        gl.bindBuffer(gl.PIXEL_PACK_BUFFER, null);
        ent.off = start; ent.bytes = bytes; S.used += bytes; S.ents.push(ent);
        if (REC) REC.fr.rbBytes += bytes;
      }
    }
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, null);
  }
  function setWords(kind) {
    if (WORDCOL === kind) return;
    if (REC && WORDCOL !== null) { REC.flips.push([+SIM.t.toFixed(2), WORDCOL + '>' + kind, 'root', SKYI.id]); if (REC.firstFlip === null && REC.dissolveEnd > 0) REC.firstFlip = +((clockNow() - REC.dissolveEnd) / 1000).toFixed(2); }
    WORDCOL = kind;
    var W = WORDSETS[kind], s = root.style;
    s.setProperty('--color-text', W.text); s.setProperty('--color-selection', W.selection);
    if (!(SW.words && AG.on)) { s.setProperty('--color-dimmed', W.dimmed); s.setProperty('--color-focus', W.focus); }   // (ink fix: with the words' machinery on, the grey and the ring are agUpdate's, from the first take; before it the stylesheet's)
  }
  function clearWords() { WORDCOL = null; ['--color-text', '--color-dimmed', '--color-focus', '--color-selection'].forEach(function (p) { root.style.removeProperty(p); }); if (stackEl) { stackEl.style.removeProperty('--color-text'); stackEl.style.removeProperty('--color-dimmed'); } if (footEl) ['--color-text', '--color-dimmed', '--color-focus'].forEach(function (p) { footEl.style.removeProperty(p); }); AG.sk = null; AG.lk = null; AG.dim = ''; AG.foc = ''; AG.sdim = ''; AG.set = false; AG.ink = false; AG.ik[0] = AG.ik[1] = false; inkRestart(); }   // (ink load fix: the stylesheet's colours again; the next reading sets the inks at once)

  /* ---------------------------------------------------------------- stats (draw calls, triangles, instances, pixels) */
  var ST = { draws: 0, tris: 0, inst: 0, px: { scene: 0, half: 0, quarter: 0, out: 0 }, cells: 0, cellsDrawn: 0, vols: 0, flocks: 0, gc: 0, volFrag: 0 }, PROF = null;
  function prof(name) { if (PROF) PROF(name); }
  function dc(mode, count, inst, idx) {
    ST.draws++; var tri = mode === gl.TRIANGLES ? count / 3 : Math.max(count - 2, 0); ST.tris += tri * (inst || 1); ST.inst += inst || 0;
    if (idx) { if (inst) gl.drawElementsInstanced(mode, count, gl.UNSIGNED_SHORT, 0, inst); else gl.drawElements(mode, count, gl.UNSIGNED_SHORT, 0); }
    else if (inst) gl.drawArraysInstanced(mode, 0, count, inst); else gl.drawArrays(mode, 0, count);
  }

  /* ---------------------------------------------------------------- drawing a frame */
  function viewProj(c) {
    var A = (FAR + NEAR) / (NEAR - FAR), Bq = 2 * FAR * NEAR / (NEAR - FAR), sx = 1 / FR.tanX, sy = 1 / FR.tanY;
    VP[0] = c.r[0] * sx; VP[4] = c.r[1] * sx; VP[8] = c.r[2] * sx; VP[12] = 0;
    VP[1] = c.u[0] * sy; VP[5] = c.u[1] * sy; VP[9] = c.u[2] * sy; VP[13] = 0;
    VP[2] = -A * c.f[0]; VP[6] = -A * c.f[1]; VP[10] = -A * c.f[2]; VP[14] = Bq;
    VP[3] = c.f[0]; VP[7] = c.f[1]; VP[11] = c.f[2]; VP[15] = 0;
    CPOS[0] = c.pos[0]; CPOS[1] = c.pos[1]; CPOS[2] = c.pos[2];
    CR[0] = c.r[0]; CR[1] = c.r[1]; CR[2] = c.r[2]; CU[0] = c.u[0]; CU[1] = c.u[1]; CU[2] = c.u[2]; CF[0] = c.f[0]; CF[1] = c.f[1]; CF[2] = c.f[2];
    PROJ[0] = FR.tanX; PROJ[1] = FR.tanY; PROJ[2] = NEAR; PROJ[3] = FAR;
  }
  /* a sphere in view (the frustum's four sides, in front of the eye, within the far distance) */
  function inView(x, y, z, R) {
    var dx = x - CAM.pos[0], dy = y - CAM.pos[1], dz = z - CAM.pos[2];
    var zc = dx * CAM.f[0] + dy * CAM.f[1] + dz * CAM.f[2];
    if (zc < -R || zc > FAR + R) return false;
    var xc = dx * CAM.r[0] + dy * CAM.r[1] + dz * CAM.r[2], yc = dx * CAM.u[0] + dy * CAM.u[1] + dz * CAM.u[2];
    if (Math.abs(xc) > zc * FR.tanX + R * Math.sqrt(1 + FR.tanX * FR.tanX)) return false;
    if (Math.abs(yc) > zc * FR.tanY + R * Math.sqrt(1 + FR.tanY * FR.tanY)) return false;
    return true;
  }
  function fadeOf(born) { return born < -1e8 ? 1 : smooth(born, born + 2.5, SIM.t); }   // (fix: only the late guard's clock)
  function fadeCell(C, born) { return cellDistFade(C) * fadeOf(born); }   // (world6 step B fix, defect 11: by distance)
  /* (dev, E0) the weight log (gate C2): every drawn weight of a frame (a cell's fade, a set's coarse or full mesh, a
     cloud body's fade and march steps, a flock among the drawn eight, a glow, the governor's scale) and the events
     that swap or drop a drawn thing (a coarse mesh rebuilt in full, a cell freed), each with its distance; and the
     injected pop (gate C3's calibration): a chosen cell held undrawn, then drawn at full weight in one frame */
  var WLOG = null, WID = 0, INJ = { key: null, on: true };
  function wl(kind, id, w, d, vis) {   // (events between frames, a swap or a free in the frame's jobs, wait for the next frame's entry)
    if (!WLOG) return;
    var tgt = WLOG.cur || WLOG.pend || (WLOG.pend = []);
    if (tgt.length < 30000) tgt.push([kind, id, +w.toFixed(4), Math.round(d), vis ? 1 : 0]);
  }
  var VOLS = [], VKEY = new Float32Array(512), VORD = new Int32Array(512), FLK = [], UF = new Float32Array(1);
  function pushVol(B) {
    var n = VOLS.length; if (n >= 512) return;
    var dx = B.c[0] - CAM.pos[0], dy = B.c[1] - CAM.pos[1], dz = B.c[2] - CAM.pos[2], d = dx * dx + dy * dy + dz * dz;
    if (d > (32000 + B.r) * (32000 + B.r) || !inView(B.c[0], B.c[1], B.c[2], B.r)) return;
    VOLS.push(B); VKEY[n] = d; VORD[n] = n;
  }
  function drawVolumes(V, u) {
    var n, i, j; MISTMAX = 0;
    VOLS.length = 0;
    /* (E1) deep in a cloud or under a whole cover no body is drawn; round 3b returned here before the state below was
       put back, so the in-cloud and cover passes after it ran depth-tested (LESS against the half-res depth) with the
       depth writes off: a pipeline state no other frame drew with, and the cloud about the eye cut where the land is
       near (audit 3694). The state is now put back on both ways */
    /* (E1.1 Fix 2) only while the view is whole: going in, the cloud whole (lateClose now reaches 0.93 about 0.07 s
       before the whole, with the scene still showing through); coming out, until the clearing's first holes open (open
       0.1). E1.1 left the bodies out from 0.93, which coming out was 0.25 s after the first holes opened */
    var push = pushVol;
    var L = V.cellList;
    if (L) for (i = 0; i < L.length; i++) { var C = L[i]; if (C.st < 3) continue; for (j = 0; j < C.vols.length; j++) { var o = C.vols[j].out; if (o.ready) { o.fade = volDistFade(o) * fadeOf(o.born); if (o.fade > 0) push(o); } } }
    n = VOLS.length;
    for (i = 1; i < n; i++) { var vv = VORD[i], kv = VKEY[vv]; j = i - 1; while (j >= 0 && VKEY[VORD[j]] < kv) { VORD[j + 1] = VORD[j]; j--; } VORD[j + 1] = vv; }
    var P = EP.vbody; gl.useProgram(P.p); setFrameUniforms(P, V);
    // (world6 fix, the judges' defects 2 and 8) one pipeline state on both sides of a box's faces: its back faces,
    // untested (the march itself starts where the ray enters the box, or at the eye, and ends at the land's depth), so
    // crossing a face changes nothing on the screen; the round-3b swap (front faces tested outside, back faces inside)
    // was a switch on the camera's position
    gl.enable(gl.CULL_FACE); gl.cullFace(gl.FRONT); gl.disable(gl.DEPTH_TEST); gl.bindVertexArray(VCUBE.vao);
    var det = (V.L || V.light).clDetail, m = 0;
    for (i = 0; i < n; i++) {
      var B = VOLS[VORD[i]], d = Math.sqrt(VKEY[VORD[i]]), c2 = B.c;
      var steps = d < B.r * 1.5 ? 48 : d < 2500 ? 36 : 24;
      if (WLOG) { if (!B.wid) B.wid = ++WID; wl('vol', B.wid, B.fade === undefined ? 1 : B.fade, d, 1); wl('steps', B.wid, steps / 48, d, 1); }
      // (world6 fix) the lit mist about the eye: a continuous weight of the eye's distance to the body's nearest lobe
      // (1 within 20 m of its surface, none from 80 m), so coming near a cloud, going in or out, is a fade the flight
      // drives; round 3b's inMist was 0 or 1 on the camera's position (a one-frame flash of 50 grey levels)
      var mk = mistK(B); if (mk > MISTMAX) MISTMAX = mk;
      var ceil = 1e5;
      B.u4a[0] = VSIGMA; B.u4a[1] = steps; B.u4a[2] = det[0]; B.u4a[3] = det[1];
      B.u4b[0] = B.range; B.u4b[1] = B.band; B.u4b[2] = ceil; B.u4b[3] = B.kind ? V.speed * 4 : 0;
      B.u4c[0] = B.reach; B.u4c[1] = B.fade; B.u4c[2] = mk; B.u4c[3] = B.base !== undefined ? B.base : -1e5;   // (fix: w, the flat base's height)
      gl.uniform3fv(P.u.uVC, B.c); gl.uniform3fv(P.u.uVH, B.h); gl.uniform2fv(P.u.uVY, B.yaw); gl.uniform4fv(P.u.uVR, B.u4a); gl.uniform4fv(P.u.uVS, B.u4b); gl.uniform4fv(P.u.uVR2, B.u4c);
      gl.activeTexture(gl.TEXTURE10); gl.bindTexture(gl.TEXTURE_3D, B.t); gl.activeTexture(gl.TEXTURE0);
      dc(gl.TRIANGLES, 36); m++;
    }
    gl.disable(gl.CULL_FACE); gl.cullFace(gl.BACK); gl.disable(gl.DEPTH_TEST); gl.depthFunc(gl.LESS); gl.depthMask(true);
    ST.vols = m;
  }
  var MIST_IN = 20, MIST_OUT = 80, MISTMAX = 0;   // (dev: the most mist about the eye drawn since the last state read)
  function mistK(B) {   // 1 - smoothstep(20, 80, the eye's distance to the surface of the body's nearest lobe)
    var sb = B.soft; if (!sb || !B.cell || !B.cell.soft) return 0;
    var S = B.cell.soft, x = CAM.pos[0], y = CAM.pos[1], z = CAM.pos[2];
    var bx = sb[0] - x, by = sb[1] - y, bz = sb[2] - z;
    if (Math.sqrt(bx * bx + by * by + bz * bz) - sb[3] > MIST_OUT) return 0;   // (the body's bound: no lobe within reach)
    var dm = 1e9;
    for (var i = sb[4]; i < sb[5]; i += 4) { var dx = S[i] - x, dy = S[i + 1] - y, dz = S[i + 2] - z, d = Math.sqrt(dx * dx + dy * dy + dz * dz) - S[i + 3]; if (d < dm) dm = d; }
    return 1 - smooth(MIST_IN, MIST_OUT, dm);
  }
  /* the flocks about the camera: the cells' (within 1.6 km and in view) and the events' crossing ahead; the nearest
     eight are drawn (birds, rays, moths and caps as solid forms; jellies after them, their light added) */
  var FLKD = new Float32Array(64), FLKO = new Int32Array(64), FLK_IN = 1150, FLK_FAR = 1600;   // (world6 fix: a flock comes in out of the air's far colour over FLK_IN .. FLK_FAR m)
  function drawCreatures(V) {
    FLK.length = 0;
    var L = V.cellList, i, k, n = 0;
    if (L) for (i = 0; i < L.length; i++) { var C = L[i]; if (C.st < 2) continue; for (k = 0; k < C.flocks.length; k++) { var f = C.flocks[k].set; if (BIRDS && f.kind === 1) continue; var dx = f.a[0] - CAM.pos[0], dz = f.a[2] - CAM.pos[2], d2 = dx * dx + dz * dz; if (d2 < FLK_FAR * FLK_FAR && inView(f.a[0], f.a[1], f.a[2], f.b[2] + 60)) { f.fd = 1 - smooth(FLK_IN, FLK_FAR, Math.sqrt(d2)); FLK.push(f); } } }
    if (V.flocksEv) for (i = 0; i < V.flocksEv.length; i++) if (!(BIRDS && V.flocksEv[i].kind === 1)) FLK.push(V.flocksEv[i]);   // (the ink birds stand for the realms' birds)
    ST.flocks = FLK.length;
    if (!FLK.length) return;
    n = Math.min(FLK.length, 64);
    for (i = 0; i < n; i++) { var F0 = FLK[i], ex = F0.a[0] - CAM.pos[0], ey = F0.a[1] - CAM.pos[1], ez = F0.a[2] - CAM.pos[2]; FLKD[i] = ex * ex + ey * ey + ez * ez; FLKO[i] = i; }
    if (n > 8) for (i = 1; i < n; i++) { var oi = FLKO[i], dv = FLKD[oi]; k = i - 1; while (k >= 0 && FLKD[FLKO[k]] > dv) { FLKO[k + 1] = FLKO[k]; k--; } FLKO[k + 1] = oi; }
    var P = EP.creature; gl.useProgram(P.p); setFrameUniforms(P, V);
    gl.bindVertexArray(CREATURE.vao);
    var m8 = Math.min(n, 8), adds = 0;
    if (WLOG) for (i = 0; i < n; i++) { var Fw = FLK[n > 8 ? FLKO[i] : i]; if (!Fw.wid) Fw.wid = ++WID; wl('flk', Fw.wid, i < m8 ? 1 : 0, Math.sqrt(FLKD[n > 8 ? FLKO[i] : i]), 1); }
    for (var pass = 0; pass < 2; pass++) {
      if (pass === 1) { if (!adds) break; gl.enable(gl.BLEND); gl.blendFuncSeparate(gl.ONE, gl.ONE, gl.ZERO, gl.ONE); gl.depthMask(false); }
      for (i = 0; i < m8; i++) {
        var F = FLK[n > 8 ? FLKO[i] : i];
        if ((F.kind === 4) !== (pass === 1)) { if (F.kind === 4) adds++; continue; }
        var m = F.kind === 2 ? CREATURE.ray : F.kind === 3 ? CREATURE.moth : F.kind === 4 ? CREATURE.jelly : F.kind === 5 ? CREATURE.cap : CREATURE.bird;
        if (P.u.uCrF) gl.uniform1f(P.u.uCrF, F.fd === undefined ? 1 : F.fd);   // (world6 fix: out of the haze, never popped in)
        gl.uniform4fv(P.u.uFa, F.a); gl.uniform4fv(P.u.uFb, F.b); gl.uniform4fv(P.u.uFc, F.c); var Fc = skyFlock(F); gl.uniform3fv(P.u.uCrL, Fc.lit); gl.uniform3fv(P.u.uCrS, Fc.shade);   // (tod: through the sky's paint)
        if (P.u.uFd) gl.uniform4fv(P.u.uFd, F.d); if (P.u.uFe) gl.uniform4fv(P.u.uFe, F.e); if (P.u.uCrE) gl.uniform3fv(P.u.uCrE, F.glow); if (P.u.uCrA) gl.uniform1f(P.u.uCrA, pass);
        ST.draws++; ST.tris += m[1] / 3 * F.n; ST.inst += F.n;
        gl.drawArraysInstanced(gl.TRIANGLES, m[0], m[1], F.n);
      }
    }
    if (adds) { gl.disable(gl.BLEND); gl.depthMask(true); }
  }
  /* (world6 fix, the judges' defect 16) the sand under the camera: its weight, less where the cloud sea lies (the
     camera's place, between its last two steps: smooth in time) */
  var PCOL = new Float32Array(4);
  function sandAt() { if (!KW.ok) return 1; var k = kwAt(CAM.pos[0], CAM.pos[2]); return clamp(k[0], 0, 1) * (1 - smooth(0.2, 0.6, k[3])); }
  function useTarget(T, w, h) { gl.bindFramebuffer(gl.FRAMEBUFFER, T ? T.f : null); gl.viewport(0, 0, w, h); }
  var CACC = { i: 0, ok: false, w: 0, h: 0, u: -1e9, t: -1e9, ca: 1, tx: 0, ty: 0, turn: 0, mid: 0, pb: new Float64Array(9), m: new Float32Array(9) }, CLT = null;   // (E1 Fix 3: the clouds' accumulation; CLT the cloud target the frame reads; E1.1: the last view's basis pb and the reprojection m)
  var PVP2 = new Float32Array(16), PCAM2 = new Float32Array(3), PVK = -1, PU2 = 0, PVOK = false, MBK = 0;   // (E1 Fix 3: the last frame's view, for the motes)
  var MBS = { u: -1e9, k: -1, vp: new Float32Array(16), cam: new Float32Array(3), mbk: 0 };   // (E1.1: the motes' last view and share as a moment's first drawing used them)
  /* (E1.1, item 7) the last frame's scene (TG.sceneH) and its view: its colour and its samples' depth codes, read by the
     composite at an outline in front of a cloud, where it is reprojected by the near depth and mixed in at half; a
     frame drawn again at the same moment reads what the frame first drawn then read */
  var SHIST = { ok: false, t: -1e9, k: -1, w: 0, h: 0, vp: new Float32Array(16), cam: new Float32Array(3), use: 0, uvp: new Float32Array(16), ucam: new Float32Array(3) };
  var BDIM = new Int32Array(10);
  function drawFrame(V, u) {
    var L = V.L || V.light, DP = V.def.P;
    ST.draws = 0; ST.tris = 0; ST.inst = 0; ST.cellsDrawn = 0;
    camPose(V, u, SIM.alpha, CAM);
    if (SW.look) devLook(CAM, SW.look * DEG);   // (dev: the view turned aside about the vertical, the flight unchanged: looking back, P6)
    viewProj(CAM);
    /* (E1 Fix 3) the share of the last frame's motion a mote is drawn along: the whole of it at 30 fps and faster, at most
       1/30 s of it after a longer frame; none across a change of visit (its coordinates), a jump of the camera or a
       frame drawn again (stage G's trials, stage H) */
    /* (E1.1, item 8: W7's pair) a frame drawn again at the same moment draws the motes as that moment's first drawing
       did (its last view and share): Fix 3 drew them as points in a redraw, so W7's pair compared the shipped frame's
       streaked motes with points (verify-regress-3's `lowerShipped`, booked to the accumulation; here 2,716-15,890
       channels a film, every one at a mote) */
    if (Math.abs(u - MBS.u) <= 1e-4 && MBS.k === V.k) MBK = MBS.mbk;
    else {
      var dU = u - PU2, dC = Math.hypot(CAM.pos[0] - PCAM2[0], CAM.pos[1] - PCAM2[1], CAM.pos[2] - PCAM2[2]);
      MBK = PVOK && PVK === V.k && dU > 1e-4 && dC < Math.max(4, V.speed * 0.2) ? Math.min(1, (1 / 30) / dU) : 0;
      MBS.u = u; MBS.k = V.k; MBS.vp.set(PVP2); MBS.cam.set(PCAM2); MBS.mbk = MBK;
    }
    UT[0] = u + 40;
    if (SW.frz) { if (FRZT === null) FRZT = UT[0]; UT[0] = FRZT; } else FRZT = null;   // (dev: nothing animated: the shaders' clock held)
    if (WLOG) { WLOG.cur = WLOG.pend || []; WLOG.pend = null; wl('rung', 0, RUNGS[RUNG], 0, 1); }
    var sc = TRIALSC > 0 ? TRIALSC : RUNGS[RUNG], W = Math.max(1, Math.round(TG.W * sc)), H = Math.max(1, Math.round(TG.H * sc));   // (E1: stage G's trials draw at their own scale)
    var w2 = Math.max(1, Math.ceil(W / 2)), h2 = Math.max(1, Math.ceil(H / 2));
    RES[0] = W; RES[1] = H;
    ST.px.scene = W * H; ST.px.half = w2 * h2; ST.px.quarter = Math.ceil(W / 4) * Math.ceil(H / 4); ST.px.out = FULL.w * FULL.h;
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_3D, NOISE3);
    drawInkKeep();
    gl.activeTexture(gl.TEXTURE11); gl.bindTexture(gl.TEXTURE_2D, GCT ? GCT.t : null); gl.activeTexture(gl.TEXTURE0);
    prof('start');
    // -------- the scene (E1 Fix 3: into its samples where it has them, cleared whole so a tile GPU loads nothing)
    var MS = TG.ms;
    if (TG.sceneH) {   // (E1.1, item 7: the scene's two colour textures in turn; the last frame's kept for the composite; with samples or without, TWIN0)
      var tH = SIM.t - (1 - SIM.alpha) * SIM_DT, dH = tH - SHIST.t;
      if (!(SHIST.ok && Math.abs(dH) <= 1e-4 && SHIST.w === W && SHIST.h === H)) {
        var tw = TG.scene; TG.scene = TG.sceneH; TG.sceneH = tw;
        SHIST.use = SHIST.ok && SHIST.k === V.k && SHIST.w === W && SHIST.h === H && dH > 1e-4 && dH < 0.25 ? 1 : 0;
        SHIST.uvp.set(SHIST.vp); SHIST.ucam.set(SHIST.cam);
      }
    }
    useTarget(MS || TG.scene, W, H);
    gl.depthMask(true); gl.clearDepth(1);
    if (MS) { gl.clearColor(0, 0, 0, 1); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT); } else gl.clear(gl.DEPTH_BUFFER_BIT);
    gl.disable(gl.BLEND); gl.disable(gl.CULL_FACE);
    gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL);
    var P;
    // the surfaces: rings from the camera outward
    for (var si = 0; si < DP.surf.length; si++) {
      var S = DP.surf[si]; P = S.P; gl.useProgram(P.p); setFrameUniforms(P, V);
      gl.bindVertexArray(GRID.vao);
      for (var l = 0; l < S.levels; l++) {
        var g = S.g0 * Math.pow(2, l), cx = Math.floor(CAM.pos[0] / (2 * g)) * 2 * g, cz = Math.floor(CAM.pos[2] / (2 * g)) * 2 * g;
        var set = 0;
        if (l > 0) { var gf = g / 2, fx = Math.floor(CAM.pos[0] / (2 * gf)) * 2 * gf, fz = Math.floor(CAM.pos[2] / (2 * gf)) * 2 * gf; set = 1 + Math.round((fx - cx) / g) + 2 * Math.round((fz - cz) / g); }
        gl.uniform4f(P.u.uLev, cx - GN / 2 * g, cz - GN / 2 * g, g, GN / 2);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, GRID.ib[set].b);
        dc(gl.TRIANGLES, GRID.ib[set].n, 0, true);
      }
    }
    prof('surfaces');
    // the landmarks: one mesh a cell, the cells in view
    var CL = V.cellList;
    if (CL) {
      P = DP.lm; gl.useProgram(P.p); setFrameUniforms(P, V);
      for (var ci = 0; ci < CL.length; ci++) {
        var C = CL[ci]; if (!C.mesh || !C.mesh.vao) continue;
        if (C.bound[3] > 0 && !inView(C.bound[0], C.bound[1], C.bound[2], C.bound[3])) { if (WLOG) { C.lastVis = 0; } continue; }
        if (INJ.key !== null && INJ.key === V.k + ':' + C.key && !INJ.on) continue;   // (dev: the injected pop, held)
        UF[0] = fadeCell(C, C.mborn); if (UF[0] <= 0) continue; gl.uniform1fv(P.u.uFade, UF);
        if (WLOG) { C.lastW = UF[0]; C.lastVis = 1; wl('lm', V.k + ':' + C.key, UF[0], nearDist(C, CAM.pos[0], CAM.pos[2]), 1); }
        gl.bindVertexArray(C.mesh.vao); dc(gl.TRIANGLES, C.mesh.n); ST.cellsDrawn++;
      }
    }
    // the sets' instances: one draw a set a cell (the coarse mesh past the set's `far`)
    if (CL && DP.lmi) {
      P = DP.lmi; var lmiOn = false;
      for (var ii = 0; ii < CL.length; ii++) {
        var Ci = CL[ii]; if (!Ci.inst || Ci.st < 3) continue;
        if (Ci.bound[3] > 0 && !inView(Ci.bound[0], Ci.bound[1], Ci.bound[2], Ci.bound[3])) continue;
        if (!lmiOn) { gl.useProgram(P.p); setFrameUniforms(P, V); lmiOn = true; }
        UF[0] = fadeCell(Ci, Ci.mborn); if (UF[0] <= 0) continue; gl.uniform1fv(P.u.uFade, UF);
        var farD = nearDist(Ci, CAM.pos[0], CAM.pos[2]);
        if (WLOG) wl('lmi', V.k + ':' + Ci.key, UF[0], farD, 1);
        for (var qi = 0; qi < Ci.inst.length; qi++) {
          var Q = Ci.inst[qi]; if (!Q.vaoF) continue;
          var useC = Q.vaoC && farD > Q.S.far;
          if (WLOG && Q.vaoC) wl('lod', V.k + ':' + Ci.key + ':' + qi, useC ? 0 : 1, farD, 1);
          gl.bindVertexArray(useC ? Q.vaoC : Q.vaoF); dc(gl.TRIANGLES, (useC ? Q.S.coarse : Q.S.full).n, Q.n);
        }
      }
    }
    ST.cells = CL ? CL.length : 0;
    prof('landmarks');
    // the scatter
    var SCM = V.G.scatter;
    if (SCM && SCM.length && DP.sc) {
      P = DP.sc; gl.useProgram(P.p); setFrameUniforms(P, V);
      for (var k = 0; k < SCM.length; k++) {
        var M = SCM[k]; if (!M.n) continue;
        var gq = TIER < 1 ? Math.max(8, Math.round(M.grid * Math.sqrt(TIER) / 2) * 2) : M.grid;   // (a lower tier: the same cells, nearer only)
        gl.uniform4f(P.u.uSc, M.cell, gq, M.density, M.salt);
        gl.uniform4f(P.u.uSc2, M.size[0], M.size[1], M.sink, M.tilt);
        gl.uniform4f(P.u.uSc3, 0, M.stretch, 0, 0);
        gl.bindVertexArray(M.vao); dc(gl.TRIANGLES, M.n, gq * gq);
      }
    }
    prof('scatter');
    if (!SW.noanim) drawCreatures(V);
    prof('creatures');
    // the sky, where nothing stands (its triangle on the far plane, tested against the land's depth)
    P = DP.sky || EP.sky; gl.useProgram(P.p); setFrameUniforms(P, V);
    gl.uniform4fv(P.u.uSunD, L.discK); gl.uniform4fv(P.u.uHi, L.hi); gl.uniform3fv(P.u.uHiC, L.hiC);
    skyNightUniforms(P);   // (tod: the moon, the belt, the wisps, the stars' twinkle and top)
    gl.depthMask(false); gl.bindVertexArray(FULLVAO); dc(gl.TRIANGLES, 3); gl.depthMask(true);
    prof('sky');
    // the glow sprites: light added, depth-tested, never written (the scene's alpha, water's flag, left alone)
    if (CL) {
      var GP = EP.glow, gOn = false;
      for (var gi = 0; gi < CL.length; gi++) {
        var Cg = CL[gi], Gb = Cg.glowB; if (!Gb || !Gb.vao || Cg.st < 3) continue;
        if (!inView(Gb.bound[0], Gb.bound[1], Gb.bound[2], Gb.bound[3])) continue;
        if (!gOn) { gl.useProgram(GP.p); setFrameUniforms(GP, V); gl.enable(gl.BLEND); gl.blendFuncSeparate(gl.ONE, gl.ONE, gl.ZERO, gl.ONE); gl.depthMask(false); gOn = true; }
        UF[0] = fadeCell(Cg, Cg.mborn); if (UF[0] <= 0) continue; gl.uniform1fv(GP.u.uGlowK, UF);
        if (WLOG) wl('glow', V.k + ':' + Cg.key, UF[0], nearDist(Cg, CAM.pos[0], CAM.pos[2]), 1);
        gl.bindVertexArray(Gb.vao); dc(gl.TRIANGLE_STRIP, 4, Gb.n);
      }
      if (gOn) { gl.depthMask(true); gl.disable(gl.BLEND); }
      prof('glows');
    }
    // the particles: grains, motes and veils of sand (blended, no depth written)
    gl.enable(gl.BLEND); gl.blendFuncSeparate(gl.ONE, gl.ONE_MINUS_SRC_ALPHA, gl.ZERO, gl.ONE); gl.depthMask(false);
    if (V.parts && V.parts.length && DP.pt && !SW.noanim) {
      P = DP.pt; gl.useProgram(P.p); setFrameUniforms(P, V); gl.bindVertexArray(STRIP.vaoP);
      if (P.u.uPVP2) { gl.uniformMatrix4fv(P.u.uPVP2, false, MBS.vp); gl.uniform3fv(P.u.uPCam2, MBS.cam); gl.uniform1f(P.u.uMB, MBK); }   // (E1 Fix 3: the motes along their motion)
      var LL = V.L || V.light;
      for (var pi = 0; pi < V.parts.length; pi++) {
        var pa = V.parts[pi], share = 1, kd = pa.hop[3];
        if (pa.areas && V.LA) { share = 0; for (var ai = 0; ai < pa.areas.length; ai++) { var ax = V.areaIx[pa.areas[ai]]; if (ax !== undefined) share += V.aw[ax]; } }
        if (pa.rainScale) share *= LL.rain;
        var sk = V.def.sandFx ? sandAt() : 1;   // (world6 fix: the sand's grains and motes as faint as the sand under the camera is thin: their opacity, never their count)
        if (share * sk <= 0.002) continue;
        var cnt = kd < 2.5 ? Math.round(pa.count * TIER * share) : Math.round(pa.count * TIER);
        if (cnt <= 0) continue;
        skyPart(pa, PCOL); PCOL[3] *= sk;   // (tod: the grains and veils through the sky's paint, the motes by the sky's own amount)
        gl.uniform4f(P.u.uPa, pa.box, pa.height, pa.streak, pa.width); gl.uniform3fv(P.u.uWind, pa.wind); gl.uniform4fv(P.u.uPc, PCOL); gl.uniform4fv(P.u.uPb, pa.hop);
        if (kd > 2.5) { pa.ug[2] = Math.min(share, 1); gl.uniform4fv(P.u.uPd, pa.ud); gl.uniform4fv(P.u.uPe, pa.ue); gl.uniform4fv(P.u.uPf, pa.uf); gl.uniform4fv(P.u.uPg, pa.ug); }
        dc(gl.TRIANGLE_STRIP, 4, cnt);
      }
    }
    var skR = V.def.sandFx ? sandAt() : 1;
    if (V.ribbons && V.ribbons.count && DP.rb && !SW.noanim && skR > 0.002) {
      var rb = V.ribbons; P = DP.rb; gl.useProgram(P.p); setFrameUniforms(P, V);
      skyPart(rb, PCOL, true); PCOL[3] *= skR;
      gl.uniform4f(P.u.uRa, rb.box, rb.length, rb.width, rb.lift); gl.uniform3fv(P.u.uWind, rb.wind); gl.uniform4fv(P.u.uPc, PCOL); gl.uniform4f(P.u.uRb, rb.gust || 9, 0, 0, 0);
      gl.bindVertexArray(STRIP.vaoR); dc(gl.TRIANGLE_STRIP, STRIP.n, rb.count);
    }
    gl.depthMask(true); gl.disable(gl.BLEND); gl.disable(gl.DEPTH_TEST);
    PVP2.set(VP); PCAM2[0] = CAM.pos[0]; PCAM2[1] = CAM.pos[1]; PCAM2[2] = CAM.pos[2]; PVK = V.k; PU2 = u; PVOK = true;   // (E1 Fix 3: this frame's view, the next one's motes' last)
    prof('particles');
    if (MS) { resolveMS(MS, TG.scene, W, H); prof('resolve'); }   // (E1 Fix 3: the samples into the scene's texture and depth)
    // -------- the depth at half resolution
    useTarget(TG.lind, w2, h2);
    RES[0] = w2; RES[1] = h2;
    P = EP.depth; gl.useProgram(P.p); setFrameUniforms(P, V); gl.uniform2f(P.u.uScale, W - 1, H - 1);
    gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, TG.scene.d); gl.activeTexture(gl.TEXTURE0);
    gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.ALWAYS); gl.depthMask(true);
    gl.bindVertexArray(FULLVAO); dc(gl.TRIANGLES, 3);
    gl.depthFunc(gl.LESS);
    prof('depth');
    // -------- beams: their light gathered along each pixel's ray, cut by the linear depth just made, added to the scene
    if (CL) {
      var BP = EP.beam, bOn = false;
      for (var bi = 0; bi < CL.length; bi++) {
        var Cb = CL[bi], Bb = Cb.beamB; if (!Bb || !Bb.vao || Cb.st < 3) continue;
        if (Bb.dirty) { gl.bindBuffer(gl.ARRAY_BUFFER, Bb.buf); gl.bufferSubData(gl.ARRAY_BUFFER, 0, Bb.data); Bb.dirty = false; }
        if (!inView(Bb.bound[0], Bb.bound[1], Bb.bound[2], Bb.bound[3])) continue;
        if (!bOn) {
          useTarget(TG.scene, W, H); RES[0] = W; RES[1] = H;
          gl.useProgram(BP.p); setFrameUniforms(BP, V); gl.uniform2f(BP.u.uLinS, w2 - 1, h2 - 1);
          gl.activeTexture(gl.TEXTURE9); gl.bindTexture(gl.TEXTURE_2D, TG.lind.t); gl.activeTexture(gl.TEXTURE0);
          gl.disable(gl.DEPTH_TEST); gl.depthMask(false); gl.enable(gl.BLEND); gl.blendFuncSeparate(gl.ONE, gl.ONE, gl.ZERO, gl.ONE);
          gl.enable(gl.CULL_FACE); gl.cullFace(gl.FRONT); bOn = true;
        }
        gl.bindVertexArray(Bb.vao); dc(gl.TRIANGLES, 36, Bb.n);
      }
      if (bOn) { gl.disable(gl.CULL_FACE); gl.cullFace(gl.BACK); gl.disable(gl.BLEND); gl.depthMask(true); RES[0] = w2; RES[1] = h2; }
      prof('beams');
    }
    // -------- the clouds at half resolution
    useTarget(TG.cloud, w2, h2);
    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
    if (CL && !NOOCC) {   // the clouds' opaque cores into the depth (no colour): what stands behind them is never marched
      P = EP.occ; var occOn = false;
      for (var oi = 0; oi < CL.length; oi++) {
        var Co = CL[oi]; if (!Co.occ || Co.st < 4 || fadeCell(Co, Co.born) < 0.999) continue;
        if (!inView(Co.bound[0], Co.bound[1], Co.bound[2], Co.bound[3])) continue;
        if (!occOn) { gl.useProgram(P.p); setFrameUniforms(P, V); gl.colorMask(false, false, false, false); gl.disable(gl.CULL_FACE); occOn = true; }
        gl.bindVertexArray(Co.occ.vao); dc(gl.TRIANGLES, 60, Co.occ.n);
      }
      if (occOn) gl.colorMask(true, true, true, true);
    }
    gl.depthMask(false);
    gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.activeTexture(gl.TEXTURE9); gl.bindTexture(gl.TEXTURE_2D, TG.lind.t); gl.activeTexture(gl.TEXTURE0);
    drawVolumes(V, u);
    gl.disable(gl.BLEND);
    prof('clouds');
    /* (E1 Fix 3, G0) the clouds accumulated over frames (FS_CACC): this frame's share SW.cacc (0.5; 0 turns it off),
       the whole of it on the first frame, after a resize, a change of scale (stage G's trials, the governor's rungs), a
       frame drawn again at the same moment (stage H, the stills: a still is exactly its own frame) or more than a
       quarter second after the last. Measured against the 4x reference (WebKit 491x668, the cloud edge at 42 m/s):
       the moving silhouettes' excess p99 0.370 -> 0.050 codes, the literal p99 0.135 -> 0.128; nowhere worse but by a
       few hundredths (rounds/E1/notes.md, Fix 3) */
    CLT = TG.cloud;
    if (SW.cacc > 0 && TG.ch) {
      var tA = SIM.t - (1 - SIM.alpha) * SIM_DT, dA = tA - CACC.t, src, dst, ca;
      if (CACC.ok && CACC.w === w2 && CACC.h === h2 && Math.abs(dA) <= 1e-4) {
        /* (E1.1, item 8: W7's pair) a frame drawn again at the same moment (W7's pair, stage G's and H's redraws, the
           stills drawn again): the history, share and reprojection the frame drawn first at this moment used, into the
           same target, so it is that frame bit for bit. Fix 3 reset the accumulation here (the share 1), so a redraw
           was never the shipped frame and W7's pair compared redraws (verify-gates-3: the shipped frame below the
           words-off one in 9,476 channels in Chromium, every one the accumulation's) */
        ca = CACC.ca; src = TG.ch[CACC.i ^ 1]; dst = TG.ch[CACC.i];
      } else {
        ca = CACC.ok && CACC.w === w2 && CACC.h === h2 && dA > 1e-4 && dA < 0.25 && CACC.tx === FR.tanX && CACC.ty === FR.tanY ? Math.min(1, SW.cacc) : 1;   // (a frame of the next moment, within a quarter second; across a junction too, where the cloud about the eye is continuous)
        src = TG.ch[CACC.i]; dst = TG.ch[CACC.i ^ 1];
        // (E1.1, item 3) this frame's rays into the last frame's view: d = x tanX R + y tanY U + F, then (d.R' / tanX,
        // d.U' / tanY, d.F') (column-major: the coefficients of x, of y, of 1)
        var pb = CACC.pb, M = CACC.m, tx = FR.tanX, ty = FR.tanY, R0 = CAM.r, U0 = CAM.u, F0 = CAM.f;
        if (ca < 1) {
          M[0] = tx * (R0[0] * pb[0] + R0[1] * pb[1] + R0[2] * pb[2]) / tx; M[1] = tx * (R0[0] * pb[3] + R0[1] * pb[4] + R0[2] * pb[5]) / ty; M[2] = tx * (R0[0] * pb[6] + R0[1] * pb[7] + R0[2] * pb[8]);
          M[3] = ty * (U0[0] * pb[0] + U0[1] * pb[1] + U0[2] * pb[2]) / tx; M[4] = ty * (U0[0] * pb[3] + U0[1] * pb[4] + U0[2] * pb[5]) / ty; M[5] = ty * (U0[0] * pb[6] + U0[1] * pb[7] + U0[2] * pb[8]);
          M[6] = (F0[0] * pb[0] + F0[1] * pb[1] + F0[2] * pb[2]) / tx; M[7] = (F0[0] * pb[3] + F0[1] * pb[4] + F0[2] * pb[5]) / ty; M[8] = F0[0] * pb[6] + F0[1] * pb[7] + F0[2] * pb[8];
        } else { M[0] = 1; M[1] = 0; M[2] = 0; M[3] = 0; M[4] = 1; M[5] = 0; M[6] = 0; M[7] = 0; M[8] = 1; }
        /* and in a fast turn this frame stands alone: the share raised toward 1 (at once; eased back by at most a
           quarter a frame) as the
           window's middle moves from 1 to 3 half-resolution texels a frame (at 491 x 668 about 15-45 deg/s), so a fast
           drag shows each frame's own clouds and never a resampled history (the drag film, 69 deg/s: reprojected and
           accumulated, its flicker p99 0.277 against 0.269 alone, every other reading lower); held still, or turning
           slowly, the history reprojected */
        var mid = M[8] > 1e-4 ? Math.hypot(M[6] / M[8] * 0.5 * w2, M[7] / M[8] * 0.5 * h2) : 1e3;
        CACC.mid = Math.max(mid, CACC.mid * 0.7);   // (held through a frame in which a drag's events left the view still: the drag film's every third frame)
        var tgt = ca < 1 ? smooth(1, 3, CACC.mid) : CACC.turn;
        CACC.turn = tgt > CACC.turn ? tgt : Math.max(tgt, CACC.turn - 0.25);   // (into a turn at once: no frame of a stale history; out of it over four frames)
        if (ca < 1) ca = ca + (1 - ca) * CACC.turn;
        pb[0] = R0[0]; pb[1] = R0[1]; pb[2] = R0[2]; pb[3] = U0[0]; pb[4] = U0[1]; pb[5] = U0[2]; pb[6] = F0[0]; pb[7] = F0[1]; pb[8] = F0[2];
        CACC.tx = tx; CACC.ty = ty;
      }
      useTarget(dst, w2, h2); P = EP.cacc; gl.useProgram(P.p);
      gl.uniform4f(P.u.uCA, ca, 0, w2, h2); gl.uniformMatrix3fv(P.u.uRM, false, CACC.m); gl.uniform2f(P.u.uHS, src.w, src.h);
      gl.activeTexture(gl.TEXTURE4); gl.bindTexture(gl.TEXTURE_2D, TG.cloud.t); gl.activeTexture(gl.TEXTURE14); gl.bindTexture(gl.TEXTURE_2D, src.t); gl.activeTexture(gl.TEXTURE9); gl.bindTexture(gl.TEXTURE_2D, TG.lind.t); gl.activeTexture(gl.TEXTURE0);
      gl.bindVertexArray(FULLVAO); dc(gl.TRIANGLES, 3);
      gl.activeTexture(gl.TEXTURE14); gl.bindTexture(gl.TEXTURE_2D, null); gl.activeTexture(gl.TEXTURE0);
      if (dst !== TG.ch[CACC.i]) { CACC.i ^= 1; CACC.t = tA; CACC.ca = ca; }
      CACC.ok = true; CACC.w = w2; CACC.h = h2; CACC.u = u; CLT = dst;
      prof('cacc');
    }
    // -------- bloom
    var E = easedLight(V, u), bl = E.bloom;
    var sUx = W / TG.W, sUy = H / TG.H, hUx = w2 / TG.cloud.w, hUy = h2 / TG.cloud.h;
    useTarget(TG.bd[0], w2, h2); RES[0] = w2; RES[1] = h2;
    P = EP.pre; gl.useProgram(P.p); setFrameUniforms(P, V);
    gl.uniform4f(P.u.uBl, bl[0], bl[1], sUx, sUy); gl.uniform4f(P.u.uBlL, sUx - 0.5 / TG.W, sUy - 0.5 / TG.H, hUx - 0.5 / TG.cloud.w, hUy - 0.5 / TG.cloud.h);
    gl.activeTexture(gl.TEXTURE3); gl.bindTexture(gl.TEXTURE_2D, TG.scene.t); gl.activeTexture(gl.TEXTURE4); gl.bindTexture(gl.TEXTURE_2D, CLT.t); gl.activeTexture(gl.TEXTURE0);
    gl.bindVertexArray(FULLVAO); dc(gl.TRIANGLES, 3);
    BDIM[0] = w2; BDIM[1] = h2;
    for (var b = 1; b < 5; b++) {
      var cw = Math.max(1, Math.ceil(BDIM[(b - 1) * 2] / 2)), ch = Math.max(1, Math.ceil(BDIM[(b - 1) * 2 + 1] / 2)); BDIM[b * 2] = cw; BDIM[b * 2 + 1] = ch;
      useTarget(TG.bd[b], cw, ch); P = EP.down; gl.useProgram(P.p);
      var src0 = TG.bd[b - 1];
      gl.uniform2f(P.u.uTexel, 1 / src0.w, 1 / src0.h); gl.uniform2f(P.u.uLim, (BDIM[(b - 1) * 2] - 0.5) / src0.w, (BDIM[(b - 1) * 2 + 1] - 0.5) / src0.h);
      gl.activeTexture(gl.TEXTURE7); gl.bindTexture(gl.TEXTURE_2D, src0.t); gl.activeTexture(gl.TEXTURE0);
      dc(gl.TRIANGLES, 3);
    }
    var src = TG.bd[4], sw = BDIM[8], sh = BDIM[9];
    for (b = 3; b >= 0; b--) {
      useTarget(TG.bu[b], BDIM[b * 2], BDIM[b * 2 + 1]); P = EP.up; gl.useProgram(P.p);
      gl.uniform2f(P.u.uTexel, 1 / src.w, 1 / src.h); gl.uniform2f(P.u.uLim, (sw - 0.5) / src.w, (sh - 0.5) / src.h);
      gl.activeTexture(gl.TEXTURE7); gl.bindTexture(gl.TEXTURE_2D, src.t); gl.activeTexture(gl.TEXTURE0);
      dc(gl.TRIANGLES, 3);
      src = TG.bu[b]; sw = BDIM[b * 2]; sh = BDIM[b * 2 + 1];
    }
    prof('bloom');
    // -------- light shafts, when the sun is near the view
    var sd = L.sunDir, sf = sd[0] * CAM.f[0] + sd[1] * CAM.f[1] + sd[2] * CAM.f[2], shaftK = 0, sx = 0, sy = 0;
    var qw = Math.ceil(W / 4), qh = Math.ceil(H / 4);
    if (sf > 0.05 && (L.shafts || 0) > 0) {
      sx = 0.5 + 0.5 * (sd[0] * CAM.r[0] + sd[1] * CAM.r[1] + sd[2] * CAM.r[2]) / sf / FR.tanX;
      sy = 0.5 + 0.5 * (sd[0] * CAM.u[0] + sd[1] * CAM.u[1] + sd[2] * CAM.u[2]) / sf / FR.tanY;
      shaftK = L.shafts * smooth(0.05, 0.4, sf) * (1 - smooth(0.6, 1.4, Math.max(Math.abs(sx - 0.5), Math.abs(sy - 0.5)) * 2 - 1 + 0.6));
    }
    if (shaftK > 0.001) {
      useTarget(TG.sm, qw, qh); RES[0] = qw; RES[1] = qh;
      P = EP.smask; gl.useProgram(P.p); setFrameUniforms(P, V);
      gl.uniform4f(P.u.uSh, sx, sy, 0.45, 0); gl.uniform4f(P.u.uShS, sUx, sUy, hUx, hUy); gl.uniform4f(P.u.uShL, sUx - 0.5 / TG.W, sUy - 0.5 / TG.H, hUx - 0.5 / TG.cloud.w, hUy - 0.5 / TG.cloud.h);
      gl.activeTexture(gl.TEXTURE3); gl.bindTexture(gl.TEXTURE_2D, TG.scene.t); gl.activeTexture(gl.TEXTURE4); gl.bindTexture(gl.TEXTURE_2D, CLT.t);
      gl.activeTexture(gl.TEXTURE9); gl.bindTexture(gl.TEXTURE_2D, TG.lind.t); gl.activeTexture(gl.TEXTURE0);
      dc(gl.TRIANGLES, 3);
      useTarget(TG.sb, qw, qh); P = EP.sblur; gl.useProgram(P.p);
      gl.uniform4f(P.u.uSh, sx * qw / TG.sm.w, sy * qh / TG.sm.h, 0, 0.9); gl.uniform2f(P.u.uRes2, TG.sm.w, TG.sm.h); gl.uniform2f(P.u.uLim, (qw - 0.5) / TG.sm.w, (qh - 0.5) / TG.sm.h);
      gl.activeTexture(gl.TEXTURE7); gl.bindTexture(gl.TEXTURE_2D, TG.sm.t); gl.activeTexture(gl.TEXTURE0);
      dc(gl.TRIANGLES, 3);
    }
    prof('shafts');
    // -------- the composite, to the window
    useTarget(DIRECT && !TRIAL ? null : TG.win, OUT.w, OUT.h); RES[0] = W; RES[1] = H;   // (round 3: straight onto the canvas when it is the world's size; E1: stage G's trials offscreen)
    P = EP.comp; gl.useProgram(P.p); setFrameUniforms(P, V);
    gl.uniform4f(P.u.uSc, sUx, sUy, RUNG === 0 ? SS : 1, SW.fxaa > 0 || (SW.fxaa < 0 && !MS) ? 1 : 0);   // (E1 Fix 3: w, FXAA: off where the scene has its samples)
    gl.uniform4f(P.u.uClS, hUx, hUy, w2, h2);
    gl.uniform4f(P.u.uBlK, bl[2], shaftK, BDIM[0] / TG.bu[0].w, BDIM[1] / TG.bu[0].h);
    gl.uniform4f(P.u.uShK, qw / TG.sb.w, qh / TG.sb.h, E.exposure, E.sat);
    gl.uniform3fv(P.u.uShC, E.shaftC); gl.uniform3fv(P.u.uLift, E.lift); gl.uniform3fv(P.u.uGain, E.gain);
    if (P.u.uCeil) gl.uniform4f(P.u.uCeil, L.ceil === undefined ? 2 : L.ceil, CEIL_KNEE, 0, 0);   // (tod: the light ceiling, the cycle's blended value: 2 off)
    gl.uniform2f(P.u.uOut, OUT.w, OUT.h);
    if (DBG === 5) devMotionField(V, u, P);
    if (DBG === 8) { if (!FILMPREV) { FILMPREV = { pos: CAM.pos.slice(), f: CAM.f.slice(), r: CAM.r.slice(), u: CAM.u.slice() }; } }
    if (DBG === 8) devPrevField(P);
    if (P.u.uSSR) gl.uniform4f(P.u.uSSR, V.def.water ? 1 : 0, V.def.waterReach || 240, 0, 0);
    if (P.u.uHC) { gl.uniformMatrix4fv(P.u.uHVP, false, SHIST.uvp); gl.uniform4f(P.u.uHC, SHIST.ucam[0], SHIST.ucam[1], SHIST.ucam[2], TG.sceneH ? SHIST.use : 0); if (P.u.uStb) gl.uniform1f(P.u.uStb, SW.stb > 0 ? 1 : 0); if (P.u.uLay) gl.uniform1f(P.u.uLay, SW.lay > 0 ? 1 : 0); gl.activeTexture(gl.TEXTURE15); gl.bindTexture(gl.TEXTURE_2D, TG.sceneH ? TG.sceneH.t : TG.scene.t); gl.activeTexture(gl.TEXTURE0); }   // (E1.1, item 7)
    if (P.u.uMi) { gl.uniform4f(P.u.uMi, 0, 0, 0, MS ? AAS : 0); }   // (E1.1: w the samples a pixel)   // (Fix 3: the cloud about the eye coming out, brought up plainly where it stands: FS_COMP)
    gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, TG.scene.d);
    gl.activeTexture(gl.TEXTURE3); gl.bindTexture(gl.TEXTURE_2D, TG.scene.t);
    gl.activeTexture(gl.TEXTURE4); gl.bindTexture(gl.TEXTURE_2D, CLT.t);
    gl.activeTexture(gl.TEXTURE5); gl.bindTexture(gl.TEXTURE_2D, TG.bu[0].t);
    gl.activeTexture(gl.TEXTURE6); gl.bindTexture(gl.TEXTURE_2D, TG.sb.t);
    gl.activeTexture(gl.TEXTURE9); gl.bindTexture(gl.TEXTURE_2D, TG.lind.t);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindVertexArray(FULLVAO);
    // (world6w) the words' ground: the composite (which takes nothing from the words) at an eighth, read back for the
    // inks' choice (agUpdate); the frame itself is then drawn alike with the words' machinery on or off
    if (TG.gs && !TRIAL && SW.words && AG.on) {
      useTarget(TG.gs, TG.gs.w, TG.gs.h); gl.uniform2f(P.u.uOut, TG.gs.w, TG.gs.h);
      dc(gl.TRIANGLES, 3); wordsGroundRead();
      useTarget(DIRECT && !TRIAL ? null : TG.win, OUT.w, OUT.h); gl.uniform2f(P.u.uOut, OUT.w, OUT.h);
    }
    if (SW.words && !TRIAL) agUpdate();
    dc(gl.TRIANGLES, 3);
    if (!DIRECT && !TRIAL) {   // (put up to the canvas's own resolution: the birds' ink is drawn at it)
      useTarget(null, FULL.w, FULL.h); P = EP.blit; gl.useProgram(P.p);
      gl.uniform2f(P.u.uOut, FULL.w, FULL.h);
      gl.activeTexture(gl.TEXTURE7); gl.bindTexture(gl.TEXTURE_2D, TG.win.t); gl.activeTexture(gl.TEXTURE0);
      dc(gl.TRIANGLES, 3);
    }
    gl.bindVertexArray(null);
    prof('composite');
    LASTE = E; LASTU = u; LASTBL[0] = bl[2]; LASTBL[1] = BDIM[0] / TG.bu[0].w; LASTBL[2] = BDIM[1] / TG.bu[0].h;
    if (BIRDS && SW.birds && !SW.noanim && !TRIAL) { BIRDS.draw(); gl.bindVertexArray(null); prof('birds'); }
    ST.shaftK = shaftK;
    if (WLOG && WLOG.cur) { WLOG.frames.push({ t: +SIM.t.toFixed(4), e: WLOG.cur }); WLOG.cur = null; }
    REPTG = TG;
    if (TG.sceneH) {   // (E1.1: this frame's view, the next frame's history's)
      var tH2 = SIM.t - (1 - SIM.alpha) * SIM_DT;
      if (!(SHIST.ok && Math.abs(tH2 - SHIST.t) <= 1e-4 && SHIST.w === W && SHIST.h === H)) { SHIST.vp.set(VP); SHIST.cam[0] = CAM.pos[0]; SHIST.cam[1] = CAM.pos[1]; SHIST.cam[2] = CAM.pos[2]; SHIST.t = tH2; SHIST.k = V.k; SHIST.w = W; SHIST.h = H; SHIST.ok = true; }
    }
  }
  /* (E0 Fix 2) the last frame put up again as it was, for reduced motion's still while the canvas dissolves in (the
     canvas must be drawn every frame of the dissolve: WebKit, its buffer not preserved, put up a cleared one): nothing
     else has drawn since, so the composite's inputs and its program's uniforms are as the frame left them, and the
     window is composited again (or its copy put up again) with the birds' ink over it: a pass or two a frame, not the
     whole scene (on a CPU renderer the whole scene again each frame held the page's frames back for seconds, and the
     resting SVG birds' fade with them). False when the targets or the words' mask changed since: drawn whole instead */
  var REPTG = null;
  function represent() {
    if (LOST || DEAD || gl.isContextLost() || !TG || REPTG !== TG || KEEPDIRTY || !LASTE) return false;
    var P;
    gl.disable(gl.BLEND); gl.disable(gl.DEPTH_TEST); gl.disable(gl.CULL_FACE); gl.depthMask(false);
    if (DIRECT) {
      useTarget(null, OUT.w, OUT.h); P = EP.comp; gl.useProgram(P.p);
      gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, TG.scene.d);
      gl.activeTexture(gl.TEXTURE3); gl.bindTexture(gl.TEXTURE_2D, TG.scene.t);
      gl.activeTexture(gl.TEXTURE4); gl.bindTexture(gl.TEXTURE_2D, CLT.t);
      gl.activeTexture(gl.TEXTURE5); gl.bindTexture(gl.TEXTURE_2D, TG.bu[0].t);
      gl.activeTexture(gl.TEXTURE6); gl.bindTexture(gl.TEXTURE_2D, TG.sb.t);
      gl.activeTexture(gl.TEXTURE9); gl.bindTexture(gl.TEXTURE_2D, TG.lind.t);
    } else {
      useTarget(null, FULL.w, FULL.h); P = EP.blit; gl.useProgram(P.p);
      gl.activeTexture(gl.TEXTURE7); gl.bindTexture(gl.TEXTURE_2D, TG.win.t);
    }
    gl.activeTexture(gl.TEXTURE0);
    gl.bindVertexArray(FULLVAO); dc(gl.TRIANGLES, 3);
    gl.bindVertexArray(null); gl.depthMask(true);
    if (BIRDS && SW.birds && !SW.noanim) { BIRDS.draw(); gl.bindVertexArray(null); }
    return true;
  }
  var NOOCC = false;
  var PCAM = { pos: [0, 0, 0], f: [0, 0, 1], r: [1, 0, 0], u: [0, 1, 0] };
  /* (dev, E0) the look aside: the drawn camera turned about the vertical by a (rad), the flight left as it is */
  var FRZT = null;
  function devLook(c, a) {
    var ca = Math.cos(a), sa = Math.sin(a);
    function r(v) { var x = v[0] * ca + v[2] * sa, z = -v[0] * sa + v[2] * ca; v[0] = x; v[2] = z; }
    r(c.f); r(c.r); r(c.u);
  }
  /* (dev, E0: the pop detector's motion field, gate C3) each pixel's displacement on the window since the film's last
     frame, from the scene's depth and the two cameras exactly (dbg 8; the film keeps the last frame's camera) */
  var FILMPREV = null;
  function devPrevField(P) {
    var keep = new Float32Array(VP), kc = new Float32Array(CAMV);
    if (!FILMPREV) FILMPREV = { pos: CAM.pos.slice(), f: CAM.f.slice(), r: CAM.r.slice(), u: CAM.u.slice() };
    viewProj(FILMPREV);
    gl.uniformMatrix4fv(P.u.uPVP, false, VP); gl.uniform3fv(P.u.uPCam, FILMPREV.pos);
    VP.set(keep); CAMV.set(kc);
    viewProj(CAM);
  }
  function devMotionField(V, u, P) {   // dev: the camera 0.1 s before (from the trace of the last steps' states)
    var keep = new Float32Array(VP), kc = new Float32Array(CAMV);
    var a = CSP, b = CS, dtb = 0.1 / SIM_DT;   // (the last step's motion, scaled to 0.1 s)
    PCAM.pos[0] = CAM.pos[0] - (b.x - a.x) * dtb; PCAM.pos[1] = CAM.pos[1] - (b.y - a.y) * dtb; PCAM.pos[2] = CAM.pos[2] - (b.z - a.z) * dtb;
    var dyaw = angDiff(b.yawV + b.phi, a.yawV + a.phi) * dtb, cy = Math.cos(-dyaw), sy = Math.sin(-dyaw);
    function rot(v, o) { o[0] = v[0] * cy + v[2] * sy; o[1] = v[1]; o[2] = -v[0] * sy + v[2] * cy; }
    rot(CAM.f, PCAM.f); rot(CAM.r, PCAM.r); rot(CAM.u, PCAM.u);
    viewProj(PCAM);
    gl.uniformMatrix4fv(P.u.uPVP, false, VP); gl.uniform3fv(P.u.uPCam, PCAM.pos);
    VP.set(keep); CAMV.set(kc);
  }

  /* ---------------------------------------------------------------- the warm table (E1, design-v5 8.2) */
  /* Every pipeline the world will draw with is drawn once at boot (stage F), behind the still sky, so no first use of a
     pipeline ever happens in flight: on ANGLE-Metal a first draw builds its MTLRenderPipelineState in the GPU process
     inside that frame (and its PrepareForDisplay waits for it); on ANGLE over Vulkan without extended dynamic state the
     depth function, test and write and the colour mask are pipeline state too (a 565 ms first draw in the audit's
     re-run). So the table holds each draw site's full key: its program, its vertex layout (the real VAO's, or one of
     the very same layout), its topology, the target's attachment formats and draw buffers, the write mask, the blend
     state, and the depth function, test and write and the cull mode. The table is generated from the draw code's own
     sites (warmTable: the sites of drawFrame, the bakes, the probes, the birds, each with the state it draws in), and
     each entry is drawn once (3 vertices, one instance) into a 4 x 4 target of exactly its formats, at most WARM_N a
     frame and fewer if the frame runs long; the canvas's keys into the hidden canvas itself. A restored context runs
     the same table. The record counts every key first drawn after the world shows (S1's test: expected 0) and how many
     distinct Metal keys the table holds (S2: 48 binds from E4; round 3b's per-realm programs come to about 45 here). */
  var WARM = { list: null, i: 0, done: false, ms: [], tg: null, vao: null, frames: 0, keysF: 0 };
  var WARM_N = 5;
  /* stage B: the 4 x 4 targets of every format a draw site writes, and VAOs of the layouts that are made per cell in
     flight (the landmarks' meshes, the sets' instances, the glows, the beams, the clouds' cores) */
  function warmInit() {
    var T = {}, rb;
    T.scene = target(4, 4, 'hdr', true);
    T.lind = target(4, 4, 'r16'); T.cloud = target(4, 4, 'hdr');
    rb = gl.createRenderbuffer(); gl.bindRenderbuffer(gl.RENDERBUFFER, rb); gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT24, 4, 4);
    [T.lind, T.cloud].forEach(function (X) { gl.bindFramebuffer(gl.FRAMEBUFFER, X.f); gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, rb); });
    T.rb = rb;
    T.hdr = target(4, 4, 'hdr'); T.rgba8 = target(4, 4, 'rgba8');
    T.r32f = { f: gl.createFramebuffer() }; T.r32f.t = tex2d(4, 4, FLOAT32_RT ? gl.R32F : gl.RGBA8, FLOAT32_RT ? gl.RED : gl.RGBA, FLOAT32_RT ? gl.FLOAT : gl.UNSIGNED_BYTE, gl.NEAREST);
    gl.bindFramebuffer(gl.FRAMEBUFFER, T.r32f.f); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, T.r32f.t, 0);
    T.rg8 = { f: gl.createFramebuffer() }; T.rg8.t = tex2d(4, 4, gl.RG8, gl.RG, gl.UNSIGNED_BYTE, gl.NEAREST);
    gl.bindFramebuffer(gl.FRAMEBUFFER, T.rg8.f); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, T.rg8.t, 0);
    // (E1 Fix 3) the clouds' bakes at 16 bits where the hotfix's probe asks for them (VOL16: the scratch volume RG16F, the
    // body's volume RGBA16F, the 'hdr' target's own format), and the scene's samples (AAS a pixel, as TG.ms)
    if (FLOAT_RT) { T.rg16f = { f: gl.createFramebuffer() }; T.rg16f.t = tex2d(4, 4, gl.RG16F, gl.RG, gl.HALF_FLOAT, gl.NEAREST); gl.bindFramebuffer(gl.FRAMEBUFFER, T.rg16f.f); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, T.rg16f.t, 0); }
    if (AAS > 1) T.sceneMS = targetMS(4, 4, AAS);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.bindRenderbuffer(gl.RENDERBUFFER, null);
    WARM.tg = T;
    // the layouts made per cell in flight, each on a VAO of its own over small buffers (the same formats, offsets,
    // strides and divisors as uploadMesh, uploadInst and cellUpload give them)
    var A = {}, mb = gl.createBuffer(), ib = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, mb); gl.bufferData(gl.ARRAY_BUFFER, 64 * VSTRIDE, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, ib); gl.bufferData(gl.ARRAY_BUFFER, 8 * 80, gl.STATIC_DRAW);
    var M = { vb: mb };
    A.mesh = gl.createVertexArray(); gl.bindVertexArray(A.mesh); meshAttribs(M);
    A.lmi = gl.createVertexArray(); gl.bindVertexArray(A.lmi); meshAttribs(M); instAttribs(ib, 5, 5, 0);
    A.glow = gl.createVertexArray(); gl.bindVertexArray(A.glow); gl.bindBuffer(gl.ARRAY_BUFFER, QUAD); gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0); instAttribs(ib, 1, 4, 0);
    A.beam = gl.createVertexArray(); gl.bindVertexArray(A.beam); gl.bindBuffer(gl.ARRAY_BUFFER, VCUBE.vb); gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0); instAttribs(ib, 1, 5, 0);
    A.occ = gl.createVertexArray(); gl.bindVertexArray(A.occ); gl.bindBuffer(gl.ARRAY_BUFFER, ICO.vb); gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, ib); gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 4, gl.FLOAT, false, 0, 0); gl.vertexAttribDivisor(1, 1);
    gl.bindVertexArray(null); gl.bindBuffer(gl.ARRAY_BUFFER, null);
    A.bufs = [mb, ib];
    WARM.vao = A; WARM.list = null; WARM.i = 0; WARM.done = false; WARM.ms = []; WARM.frames = 0;
  }
  /* the table, from the draw sites (built once every program is finished: stage F's start). Each entry: name, program,
     VAO, mode, vertex count, instanced, indexed, target, colour mask, blend (null or [src, dst, srcA, dstA]), depth (0
     off, else its function) and its writes, cull (0 off, else the face) */
  var BL_ADD = null, BL_OVER = null, BL_PRE = null;
  function warmTable() {
    var L = [], T = gl.TRIANGLES, TS = gl.TRIANGLE_STRIP, LE = gl.LEQUAL, A = WARM.vao;
    var SC = AAS > 1 && WARM.tg.sceneMS ? 'sceneMS' : 'scene';   // (E1 Fix 3: the scene pass's draws, into its samples)
    BL_ADD = [gl.ONE, gl.ONE, gl.ZERO, gl.ONE]; BL_OVER = [gl.ONE, gl.ONE_MINUS_SRC_ALPHA, gl.ZERO, gl.ONE]; BL_PRE = [gl.ONE, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA];
    function E(n, P, vao, mode, cnt, inst, idx, tg, bl, dt, dw, cull, cm) { if (P && P.ok) L.push({ n: n, p: P, vao: vao, mode: mode, cnt: cnt, inst: inst, idx: idx, tg: tg, bl: bl || null, dt: dt || 0, dw: dw !== false, cull: cull || 0, cm: cm === undefined ? 15 : cm }); }
    // the realms' sites, every built realm's (any may come into view)
    for (var k = 0; k < ORDER.length; k++) {
      var d = REALMS[ORDER[k]]; if (d.bad || !d.P || d.P.st !== 2) continue;
      var P = d.P, id = d.id;
      for (var si = 0; si < P.surf.length; si++) E(id + '.surface' + si, P.surf[si].P, GRID.vao, T, 3, 0, true, SC, null, LE, true);
      E(id + '.landmark', P.lm, A.mesh, T, 3, 0, false, SC, null, LE, true);
      E(id + '.landmarkInst', P.lmi, A.lmi, T, 3, 1, false, SC, null, LE, true);
      E(id + '.scatter', P.sc, A.mesh, T, 3, 1, false, SC, null, LE, true);
      E(id + '.particle', P.pt, STRIP.vaoP, TS, 4, 1, false, SC, BL_OVER, LE, false);
      E(id + '.ribbon', P.rb, STRIP.vaoR, TS, 4, 1, false, SC, BL_OVER, LE, false);
      E(id + '.sky', P.sky, FULLVAO, T, 3, 0, false, SC, null, LE, false);
      E(id + '.probe', P.pr, FULLVAO, T, 3, 0, false, 'rgba8');
      E(id + '.probe.grid', P.pr, FULLVAO, T, 3, 0, false, 'r32f');
    }
    // the engine's sites, in drawFrame's order
    E('creature', EP.creature, CREATURE.vao, T, 3, 1, false, SC, null, LE, true);
    E('creature.add', EP.creature, CREATURE.vao, T, 3, 1, false, SC, BL_ADD, LE, false);
    E('sky', EP.sky, FULLVAO, T, 3, 0, false, SC, null, LE, false);
    E('glow', EP.glow, A.glow, TS, 4, 1, false, SC, BL_ADD, LE, false);
    if (SC === 'sceneMS') L.push({ n: 'resolve', rs: true, p: EP.blit });   // (the samples' resolve: ANGLE-Metal makes a pipeline of its own for it)
    E('depth', EP.depth, FULLVAO, T, 3, 0, false, 'lind', null, gl.ALWAYS, true);
    E('beam', EP.beam, A.beam, T, 3, 1, false, 'scene', BL_ADD, 0, false, gl.FRONT);
    E('occ', EP.occ, A.occ, T, 3, 1, false, 'cloud', null, gl.LESS, true, 0, 0);
    E('occ.nodepth', EP.occ, A.occ, T, 3, 1, false, 'cloud', null, 0, true, 0, 0);   // (after a frame's beams, which leave the depth test off)
    E('vbody', EP.vbody, VCUBE.vao, T, 3, 0, false, 'cloud', BL_PRE, LE, false, gl.BACK);
    E('vbody.inside', EP.vbody, VCUBE.vao, T, 3, 0, false, 'cloud', BL_PRE, 0, false, gl.FRONT);
    E('cacc', EP.cacc, FULLVAO, T, 3, 0, false, 'hdr');   // (E1 Fix 3: the clouds' accumulation)
    E('pre', EP.pre, FULLVAO, T, 3, 0, false, 'hdr');
    E('down', EP.down, FULLVAO, T, 3, 0, false, 'hdr');
    E('up', EP.up, FULLVAO, T, 3, 0, false, 'hdr');
    E('smask', EP.smask, FULLVAO, T, 3, 0, false, 'hdr');
    E('sblur', EP.sblur, FULLVAO, T, 3, 0, false, 'hdr');
    E('inkkeep', EP.inkkeep, FULLVAO, T, 3, 0, false, 'rgba8');
    E('comp.win', EP.comp, FULLVAO, T, 3, 0, false, 'rgba8');
    E('comp', EP.comp, FULLVAO, T, 3, 0, false, 'canvas');
    E('blit', EP.blit, FULLVAO, T, 3, 0, false, 'canvas');
    E('vdens', EP.vdens, FULLVAO, T, 3, 0, false, VOL16 ? 'rg16f' : 'rg8');   // (E1 Fix 3: the bakes' 16-bit formats where the probe makes them so: the scratch RG16F, the body RGBA16F, 'hdr')
    E('vlight', EP.vlight, FULLVAO, T, 3, 0, false, VOL16 ? 'hdr' : 'rgba8');
    // the ink birds' (their real VAO, made at boot: HOST.warm)
    for (var b = 0; b < WARMX.length; b++) { var W = WARMX[b]; E(W.n, W.p, W.vao, W.mode, W.cnt, W.inst, false, 'canvas', W.bl, 0, false); }
    return L;
  }
  var WARMX = [];   // (entries the ink birds' module gives through HOST.warm)
  /* stage F, a slice: up to WARM_N entries drawn (sync: all); true once the table is through. (Fix 2 of round E1) an
     entry that is its program's first use, or a heavy program's (its link took over WARM_HEAVY ms from issue to done,
     or a draw of it did), is drawn alone in its frame: on ANGLE-Metal a first draw builds its pipeline in the GPU
     process, and WebKit's cold first draws here took 0.5-3.5 s each, so five of them in one frame was one long frame.
     Each program keeps its first use's time and frame (P.firstMs, P.firstF) for the record */
  var WARM_HEAVY = 50;
  function warmHeavy(P) { return !P.warmed || P.heavy || (P.doneAt && P.issAt && P.doneAt - P.issAt > WARM_HEAVY); }
  function warmStep(sync, deadline) {
    if (WARM.done) return true;
    if (!WARM.list) { WARM.list = warmTable(); WARM.i = 0; WARM.keysF = WARM.list.length; }
    var L = WARM.list, n = 0, T = WARM.tg;
    WARM.frames++;
    gl.activeTexture(gl.TEXTURE0);
    while (WARM.i < L.length && (sync || (n < WARM_N && clockNow() < deadline))) {
      var e = L[WARM.i], alone = !sync && !e.rs && warmHeavy(e.p);
      if (alone && n > 0) break;   // (alone: the next frame's first)
      WARM.i++;
      var t0 = clockNow();
      if (e.rs) { resolveMS(T.sceneMS, T.scene, 4, 4); WARM.ms.push([e.n, +(clockNow() - t0).toFixed(2), FRAMEN]); n++; continue; }   // (E1 Fix 3: the resolve, once)
      if (e.tg === 'canvas') { gl.bindFramebuffer(gl.FRAMEBUFFER, null); }
      else gl.bindFramebuffer(gl.FRAMEBUFFER, T[e.tg].f);
      gl.viewport(0, 0, 4, 4);
      gl.colorMask(!!(e.cm & 1), !!(e.cm & 2), !!(e.cm & 4), !!(e.cm & 8));
      if (e.bl) { gl.enable(gl.BLEND); gl.blendFuncSeparate(e.bl[0], e.bl[1], e.bl[2], e.bl[3]); } else gl.disable(gl.BLEND);
      if (e.dt) { gl.enable(gl.DEPTH_TEST); gl.depthFunc(e.dt); } else gl.disable(gl.DEPTH_TEST);
      gl.depthMask(e.dw);
      if (e.cull) { gl.enable(gl.CULL_FACE); gl.cullFace(e.cull); } else gl.disable(gl.CULL_FACE);
      gl.useProgram(e.p.p); gl.bindVertexArray(e.vao);
      if (e.idx) { gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, GRID.ib[0].b); if (e.inst) gl.drawElementsInstanced(e.mode, e.cnt, gl.UNSIGNED_SHORT, 0, 1); else gl.drawElements(e.mode, e.cnt, gl.UNSIGNED_SHORT, 0); }
      else if (e.inst) gl.drawArraysInstanced(e.mode, 0, e.cnt, 1); else gl.drawArrays(e.mode, 0, e.cnt);
      var ms = clockNow() - t0;
      WARM.ms.push([e.n, +ms.toFixed(2), FRAMEN]);
      if (!e.p.warmed) { e.p.warmed = true; e.p.firstMs = +ms.toFixed(2); e.p.firstF = FRAMEN; e.p.firstAt = +clockNow().toFixed(1); }
      if (ms > WARM_HEAVY) e.p.heavy = true;
      n++;
      if (alone) break;   // (nothing after it in this frame)
    }
    gl.bindVertexArray(null); gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.colorMask(true, true, true, true); gl.disable(gl.BLEND); gl.disable(gl.DEPTH_TEST); gl.disable(gl.CULL_FACE); gl.depthMask(true); gl.depthFunc(gl.LESS); gl.cullFace(gl.BACK);
    if (WARM.i >= L.length) { WARM.done = true; return true; }
    return false;
  }
  /* ---------------------------------------------------------------- the simulation, driven */
  function simStepOnce() {
    copyState(CS, CSP); SIM.junction = false;
    var ok = simStep();
    if (ok) {   // the camera's travel (for the cloud it is in: continuous across the change of realm, wrapped on the noise's period)
      var V = SIM.V, v = V.speed;
      if (BIRDS && SW.birds && (STILLMODE || (SHOWNT >= 0 && SIM.t >= SHOWNT + DISSOLVE_S))) { BIRDB.at = clockNow(); BIRDS.step(SIM_DT); BIRDB.spent += clockNow() - BIRDB.at; BIRDB.at = 0; }   // (the birds' clock and planning: a fixed step, as the flight's; timed for their budget. E0: from the dissolve's end, when today's SVG birds have handed over the sky)
    }
    return ok;
  }
  /* the live loop: fixed steps covering the frame's time (at most 0.1 s of it), drawn between the last two */
  /* (dev: data-dtmax lets a slow harness's frames carry more of the flight, so its streaming is that of real time;
     E1, dev: data-tscale multiplies the frame's time, so a slow harness flies a long course in less of its own) */
  var DTMAX = DEVMODE && OPT.dtmax && +OPT.dtmax > 0 ? Math.min(+OPT.dtmax, 2) : 0.1, NMAX = Math.ceil(DTMAX / SIM_DT) + 2;
  var TSCALE = 1;
  function simAdvance(dt) {
    SIM.acc += Math.min(dt, DTMAX);
    var n = 0;
    while (SIM.acc >= SIM_DT && n < NMAX) { if (!simStepOnce()) { SIM.acc = 0; break; } SIM.acc -= SIM_DT; n++; }
    if (n >= NMAX) SIM.acc = 0;
    SIM.alpha = clamp(SIM.acc / SIM_DT, 0, 1);
  }
  /* the harness: stepped until t, each step's ground and the cells about the camera made at once (their solids and
     places: the flight needs them; their meshes and clouds only for the frame drawn at the end) */
  function simTo(t) {
    if (!SIM.V || t < SIM.t - 1e-9) simReset();
    var guard = 0;
    while (SIM.t + SIM_DT <= t + 1e-9 && guard++ < 2e6) {
      if (!SIM.V) { var V0 = worldAt(0).V; visitStep(V0, true); groundCache(V0, 0, 0, true); }
      if (!simStepOnce()) break;
      var V = SIM.V;
      groundCache(V, CS.x, CS.z, true);
      streamCells(V, CS.x, CS.z, Math.sin(CS.psi), Math.cos(CS.psi), false);
      kwFollow(CS.x, CS.z, true); kwUpload();   // (world6: the weights' grid kept about the camera)
      cellWork(V, true, 0.85, 2);   // (every cell that can hold a place the autopilot may choose, 2 km: a still is the same drawn alone or in a film)
    }
    SIM.alpha = 1; SIM.acc = 0;
    freeDrain();
  }
  /* the world, built (world6: every stage; there is no passage bake) */
  function visitBuilt(V) { return V.st >= VSTAGES.length; }
  /* ---------------------------------------------------------------- a frame's work, split (E1, design-v5 4.3) */
  /* The slice's CPU work (cells laid out, resolved and built; the next visit's CPU stages; cells freed far behind) runs
     after the frame's flush and makes no GL call; the GPU half of it (uploads, bakes under one bake budget, the next
     visit's GPU stages, the GL objects let go, the ground's grid and its read, the probes' batch and its read) runs at
     the start of the next drawn frame, before its draws, so the GPU process encodes it while the script runs on
     (design order, switch order=0), or after that frame's flush (order=1: the A/B the iPhone settles). */
  var WDL = 0;   // (a work deadline, clockNow ms: the boot's slices; 0 in flight, where round 3b's counts hold until E2a)
  /* (E1, design-v5 4.3 step 6: the GPU jobs "each under its AIMD budget") the bake's layers a frame in flight, learnt
     from the read-back's fence: halved when the oldest fence had not signalled at the frame's poll (the GPU a frame
     and more behind), else grown by 4, between 4 and round 3b's 24 (VOL_LAYERS). The boot's own (BOOT.bake, 6-96) is
     learnt the same way */
  /* (Fix 2) and from the frame's own interval: a frame over 1.5 periods (the period the governor learns) halves it too.
     Where frames are paced by the GPU (SwiftShader here; a phone's GPU kept busy) the next frame starts only once the
     GPU is done, so the fence is always signalled at the poll and round E1's learning never engaged (lagged 0 on both
     engines); the interval sees it either way */
  var FBAKE = { n: 24, lagged: 0, halvings: 0, late: 0 };
  function bakeLearn(polled, dtMs) {
    var late = dtMs > 1.5 * GOVN[13] && dtMs < 1000;
    if (!polled && !late) return;
    if ((polled && RB.lagged) || late) { if (polled && RB.lagged) FBAKE.lagged++; if (late) FBAKE.late++; if (FBAKE.n > 4) { FBAKE.n = Math.max(4, FBAKE.n >> 1); FBAKE.halvings++; } }
    else FBAKE.n = Math.min(VOL_LAYERS, FBAKE.n + 4);
  }
  function gpuJobs() {
    freeDrain();
    var V = SIM.V; if (!V) return;
    BAKE.left = READY && shown ? FBAKE.n : BUD.bake;
    kwUpload();   // (world6: the weights' rows baked in the last slice)
    if (SW.stream) {
      cellWork(V, false, 0, 4, 'gpu'); prof('cells.gpu');
    }
    groundRead(); groundCache(V, CS.x, CS.z, false);
    probeFlush(shown ? PROBE_FRAME : PROBE_BOOT); prof('probe');
    if (REC) REC.fr.layers = WORK.layers;
  }
  function cpuSlice() {
    var V = SIM.V; if (!V || !SW.stream) return;
    streamCells(V, CS.x, CS.z, Math.sin(CS.psi), Math.cos(CS.psi), false);
    cellWork(V, false, 0, 4, 'cpu'); prof('cells.cpu');
    kwFollow(CS.x, CS.z, false); prof('weights');   // (world6: the weights' grid kept about the camera, a share a slice)
  }
  function stream() { gpuJobs(); cpuSlice(); }   // (dev hooks: a frame's whole share at once)
  function budgets(boot) {   // the frame's counts: round 3b's in flight; the boot's, four times them, behind the still sky (and its slices timed)
    BUD.layouts = boot ? 4 * LAYOUT_BUDGET : LAYOUT_BUDGET; BUD.resolves = boot ? 4 * RESOLVE_BUDGET : RESOLVE_BUDGET; BUD.verts = boot ? 4 * VERT_BUDGET : VERT_BUDGET;
    BUD.uploads = boot ? 4 : 1; BUD.bake = boot ? BOOT.bake : VOL_LAYERS;
  }

  /* ---------------------------------------------------------------- the loop, the governor, the device tier */
  var PREP0 = 0;   // (round 3: the frame the reduced motion's still sky began planning on)
  var STILLTS = -1;   // (Fix 2: the rAF time the reduced motion's still was first drawn; it is drawn again until the dissolve is over)
  /* (E0, 12.5) today's SVG birds (birds.js; in production birds.v11.js, the first deferred script) fly over the still sky while the world boots.
     skyAir.handover tells them who has the sky: 0 theirs; 1 the world's (from the first frame shown: they plan no new
     flight, finish the crossings that end within 6 s and fade the rest with the dissolve); 2 nobody's (the record's
     control tail). The ink birds step from the dissolve's end (DISSOLVE_S after the first frame), so the first ink
     flight is planned then. A lost context, the world giving up and forced colours hand the sky back (0). skyAir.aim is
     today's sky's hook for the birds' camera: the world has its own, so it is a no-op here. */
  var SKYAIR = window.skyAir || (window.skyAir = {});
  if (typeof SKYAIR.aim !== 'function') SKYAIR.aim = function () {};
  SKYAIR.handover = 0;
  var SHOWNT = -1, DISSOLVE_S = 2, HASSVG = !!document.querySelector('svg.bird');
  function handTo(v) { SKYAIR.handover = v; if (typeof SKYAIR.handed === 'function') { try { SKYAIR.handed(v); } catch (e) { /* theirs */ } } }
  var TIER = 1, CLK = new Float64Array([0, -1]), running = false, rafId = 0, shown = false, NEEDSIZE = false, SKYMARK = null, DEAD = false, GAVEUP = false, READY = false, FRAMEN = 0;
  /* the governor: every frame's time in a ring (two seconds); each second, the median. Never asked to beat 60 Hz.
     Three slow seconds in a row (median over 1.35 frames of the period) step the render scale down a rung; three
     seconds later, if the step did not help, one more rung is tried (a cost quantised by the display's sync needs two
     steps to show its knee); if neither helped, both are undone and the frame time they could not beat is learnt as
     the period (a 30 fps cap is then simply the pace). No step is taken while one is on trial. Twenty seconds at ease
     step back up. The floor: ten seconds at under half the pace at the last rung, or under 15 fps with the period
     learnt at its 50 ms ceiling (a cost the scale cannot touch: vertex work, the CPU, the driver) at any rung, give
     up: the loop stops and the still sky stays. */
  var GOVD = new Float32Array(120), GOVS = new Float32Array(120), GOVN = new Float64Array(18), FRAME60 = 1000 / 60;
  function govReset() { GOVN.fill(0); GOVN[10] = 60; GOVN[11] = 20; GOVN[12] = 1e9; GOVN[13] = FRAME60; }
  govReset();
  function governor(dtMs, force) {
    if ((STILLMODE || OPT.nogov) && !force) return;
    if (!(dtMs > 0) || dtMs > 1000) return;   // (a hidden tab's gap)
    GOVD[GOVN[1]] = dtMs; GOVN[1] = (GOVN[1] + 1) % 120; GOVN[0] = Math.min(GOVN[0] + 1, 120);
    GOVN[5] += dtMs;
    if (GOVN[5] < 1000 || GOVN[0] < 20) return;
    GOVN[5] = 0;
    var n = GOVN[0], i;
    for (i = 0; i < 120; i++) GOVS[i] = i < n ? GOVD[(GOVN[1] - 1 - i + 240) % 120] : 1e9;   // the last n samples
    GOVS.sort();
    var p50 = GOVS[Math.floor(n * 0.5)], p10 = GOVS[Math.floor(n * 0.1)]; GOVN[2] = p50;
    GOVN[8] += 1; GOVN[12] += 1; if (GOVN[6] > 0) GOVN[6] -= 1;
    if (GOVN[13] > FRAME60 && p10 < GOVN[13] * 0.8) { GOVN[15] += 1; if (GOVN[15] >= 5) { GOVN[13] = Math.max(FRAME60, p50); GOVN[15] = 0; } } else GOVN[15] = 0;
    var PER = GOVN[13];
    var stuck = (RUNG === RUNGS.length - 1 && p50 > 2 * PER) || (PER >= 49.9 && p50 > 1.3 * PER);   // (under 15 fps that the scale cannot help)
    if (stuck) { GOVN[14] += 1; if (GOVN[14] >= 10) { GOVN[14] = force ? -1e9 : 0; if (!force) giveUp(); return; } } else if (GOVN[14] > 0) GOVN[14] = 0;
    if (GOVN[9] === 1 && GOVN[8] >= 3) {
      GOVN[9] = 0;
      if (p50 > GOVN[7] * 0.85 && RUNG > 0) {
        if (GOVN[16] === 0 && RUNG < RUNGS.length - 1) { GOVN[16] = 1; RUNG++; GOVN[3] = 0; GOVN[8] = 0; GOVN[9] = 1; GOVN[0] = 0; return; }
        RUNG = Math.max(RUNG - 1 - GOVN[16], 0); GOVN[16] = 0;
        GOVN[6] = GOVN[10]; GOVN[10] = Math.min(GOVN[10] * 2, 960); GOVN[13] = clamp(Math.max(GOVN[7], p50), FRAME60, 50); GOVN[0] = 0; return;
      }
      GOVN[16] = 0; GOVN[10] = 60;
    }
    if (p50 > PER * 1.35) {
      GOVN[3] += 1; GOVN[4] = 0;
      if (GOVN[3] >= 3 && GOVN[6] <= 0 && GOVN[9] === 0 && RUNG < RUNGS.length - 1) {   // (never while a step is on trial)
        if (GOVN[12] < 10) GOVN[11] = Math.min(GOVN[11] * 2, 160);
        GOVN[7] = p50; RUNG++; GOVN[3] = 0; GOVN[8] = 0; GOVN[9] = 1; GOVN[0] = 0; GOVN[16] = 0;
      }
    } else {
      GOVN[3] = 0;
      if (p50 < PER * 1.12) { GOVN[4] += 1; if (GOVN[4] >= GOVN[11] && RUNG > 0) { RUNG--; GOVN[4] = 0; GOVN[0] = 0; GOVN[12] = 0; } } else GOVN[4] = 0;
    }
  }
  /* too slow even so: the world steps aside for the stylesheet's still sky (the words to its colours) */
  /* (Fix 3, W4) the still sky under the canvas is the hour's until the canvas hides: data-sky is never written while
     the canvas shows (nor at boot: the hour's still sky snapped to the realm's in one frame, rain's grey-green to
     ABOVE's blue at 0.6-2.0 s, verify-regress-2's lose and rm runs); when it hides (a lost context, the world giving up,
     forced colours, the record's quiet tail) the realm it was drawing is marked, once, so the words the stylesheet then
     gives (the realm's, dark) are the words that were showing */
  function markStill() { if (SKYMARK && root.getAttribute('data-sky') !== SKYMARK) root.setAttribute('data-sky', SKYMARK); skyThemeStill(SKYMARK || root.getAttribute('data-sky')); }   // (tod: the browser's bar takes the still's top; never shown, the hour's group's still)
  function giveUp() { DEAD = true; GAVEUP = true; stop(); shown = false; canvas.classList.remove('on'); markStill(); clearWords(); handTo(0); recMark('gave up'); }   // (the sky handed back to today's SVG birds)
  /* (E1) the boot declines (stage G's floor not met, a first frame doubted twice, a broken engine program): the canvas
     never shows; the hour's still sky stays, with today's SVG birds (they kept the sky all along) */
  function decline(why) { DEAD = true; GAVEUP = true; BOOT.declined = why; stop(); shown = false; canvas.classList.remove('on'); markStill(); clearWords(); handTo(0); recMark('declined: ' + why); fail('declined: ' + why); }
  function render() {
    if (LOST || DEAD || gl.isContextLost() || !TG) return false;
    var V = SIM.V; if (!V || !visitBuilt(V) || !V.def.P || V.def.P.st !== 2) return false;
    TIER = RUNG >= 3 ? 0.6 : 1;
    var ur = SIM.u - (1 - SIM.alpha) * SIM_DT;   // (Fix 3: between the last two steps at the junction too)
    setWords(AG.sk || SKYI.words || V.def.words || 'dark');   // (tod: the stack's ink once taken, else the sky's words: the root's text and selection, today's SVG birds; world6 fix: before the frame, so its adaptive greys and floors (agUpdate) are the first frame's too)
    if (!shown) inkRestart(true);   // (ink fix: the words' reading begins with the first frame shown: the boot's hidden check frame (stage H), a restored world's too, is never taken)
    drawFrame(V, ur);
    SKYMARK = SKYI.group || V.def.still;   // (tod: the current sky's time of day, the world's still sky for it, marked only when the canvas hides: markStill; Fix 3)
    skyTheme(false);   // (tod: the browser's bars follow the drawn sky)
    if (!shown) { shown = true; canvas.classList.add('on'); SHOWNT = SIM.t; handTo(1); recShown(); BOOT.shownAt = clockNow(); AG.w0 = BOOT.shownAt; }   // (ink fix: AG.w0, the dissolve's start: the take waits INK_TAKE s from it, however long the first frame took)   // (E0: the dissolve begins; today's SVG birds plan no new flight, 12.5)
    return true;
  }
  /* at the start the engine, the first visit and its cells about the origin are built a step a frame while the
     stylesheet's still sky shows; the journey's clock starts with the first frame drawn */
  function heading0() { return RNG(subseed(J.seed, 77)).r(0, 2 * PI); }

  /* ---------------------------------------------------------------- the boot, staged (E1, design-v5 14) */
  /* Everything behind the still sky, with the canvas hidden and today's SVG birds flying, each frame's slice of CPU work
     at most BOOT_MS (8 ms) at unit granularity, so a tap on a link always works and the birds' frames run.
     (Fix 3 of round E1) Nothing waits for today's birds but the steps that are heavy on the main thread: Fix 2's yield
     (the boot doing nothing at all until a bird of their first flight was in view, up to 3 s) brought back E0's wait
     (the owner's E0 record: 1.9 s) and put D8 out of reach before B began; and it did not shield the birds from the
     rest. Fix 3 began B and C at once and made only the first-use draws and stage G's trials wait (at most 1 s each);
     its first frames held today's birds' clock, and their first bird came 0.35-1.5 s late (B5). (E1.1) The boot begins
     (A) once a bird of today's first flight is in view, or at once without SVG birds, under reduced motion or forced
     colours (bootMayStart, w13_dev.js; a 2.5 s safety net), and nothing in it waits after that. The record keeps the
     start's wait (rec.bootStages.waits.start, rec.d8.bootWaitMs) and every boot frame over 50 ms while the first flight
     was in view (rec.bootStages.birdFrames):
       A  the context and its extensions, the device's hints (boot(), in the boot's first frame);
       B  every object: the targets (resize), the engine's buffers and arrays, the noise's texture, the read-back ring,
          the warm table's targets and layouts, the ink birds' program, VAO and buffers; every program registered; and
          (Fix 3) the first program issued in the same frame;
       C  the programs, one at a time (progStep: one compiled and linked, its completion asked once a frame; Fix 3: the
          next issued in the frame after the last one's completion was read, so each boot frame carries one program's
          calls and the record names exactly one program for it), and nothing else synchronous while one is
          outstanding (no read-back until the frame after C);
       D  beside C: the first visit planned and built, its cells about the landing laid out, resolved and built
          (CPU, after the frame's GPU work, as in flight), under four times the flight's counts and the slice's time;
       E  the GPU's fills, once every program is: the noise first (a draw of K layers a frame, its first draw, the
          noise program's first use, in a frame of its own: Fix 3, never C's last frame), then (after F) the probes, the ground's grid, the cells'
          uploads and their clouds' bakes (a bake budget that halves when the GPU falls behind: the ring's oldest fence
          unsignalled at a frame's start, and grows back by 8 a frame to 96);
       F  the warm table, after the noise and before D's GPU half (so no draw of D's is a first use): an entry that is
          its program's first use, or a heavy program's (its link took over 50 ms, or a draw of it did), alone in its
          frame, else at most five a frame (warmStep);
       G  the warm-up measurement: the real frame drawn offscreen at scene scales 0.35, 0.5, 0.7 and 1.0, ascending,
          stopping at the first over 65% of the period, five timed trials a scale, one a frame (stageG); its
          largest scale within the bar starts the governor; under the floor (21.7 ms at 0.35) the still sky stays;
       H  the first real frame drawn into the hidden canvas and read back as a 16 x 16 thumbnail: doubted once
          (black, blank, white) it is drawn and read again; doubted twice the world declines (stageH). Then today's
          birds are told, and in the next frame the canvas shows and dissolves in.
     A restored context runs B to F and H again (G's measurement is kept). Under reduced motion the boot is lean: no F
     and no G; they run behind the still when the preference ends, before the flight starts. */
  var BOOT_MS = 8;   // (E1.1: HEAVY_WAIT_MS and G_WAIT_MS gone with their waits; the boot's start waits instead: bootMayStart, w13_dev.js)
  var BOOT = { st: 'A', marks: [], frames: 0, slices: [], sliceMax: 0, sliceOver: 0, ts: [], cDone: false, cDoneF: -1, world: false, bake: 96, hOk: false, hFails: 0, thumb: null, declined: null, restore: false, shownAt: -1, startAt: -1,
    fts: [], fly: [], bw: { due: -1, ms: 0, frames: 0, why: null, fly: 0 } };   // (E1.1: bw, the boot's start waiting for today's first bird; Fix 3's heavy and G waits gone)   // (Fix 2: fts every boot frame's [frame, rAF time]; Fix 3: fly, today's first flight's state at each; the heavy steps' and G's waits)
  function bootMark(name) { BOOT.marks.push([name, +clockNow().toFixed(1), FRAMEN]); recMark('boot ' + name); }
  function bootReset(restore) {
    BOOT.st = 'B'; BOOT.cDone = false; BOOT.cDoneF = -1; BOOT.world = false; BOOT.bake = 96; BOOT.hOk = false; BOOT.hFails = 0; BOOT.restore = !!restore;
    PROGX.compiled = PROGX.linked = PROGX.finished = PROGX.broken = 0; PROGX.cur = null; PORDER = null;
  }
  function bootSlice(t0, label) {
    var ms = clockNow() - t0;
    if (ms > BOOT.sliceMax) BOOT.sliceMax = ms;
    if (ms > BOOT_MS) BOOT.sliceOver++;
    if (BOOT.slices.length < 400) BOOT.slices.push([FRAMEN, +ms.toFixed(2), label]);
  }
  /* one frame of the boot (stages B-G); READY once G is through (or skipped) */
  function bootFrame(ts) {
    var t0 = clockNow(), dl = t0 + BOOT_MS, label = BOOT.st;
    if (BOOT.fts.length < 4000) { BOOT.fts.push(FRAMEN, +ts.toFixed(2)); BOOT.fly.push(SKYAIR.flying | 0); }
    BOOT.frames++; if (BOOT.ts.length < 400) BOOT.ts.push(ts);
    WORK.verts = WORK.layers = WORK.layouts = WORK.uploads = WORK.resolves = 0;
    /* (E1.1 Fix 2, B5's second half: verify-regress-1 defect 8) while today's first flight is in view, a boot frame
       whose work ran over twice BOOT_MS (a link, a program's first draw, the noise's first layers, a timed trial: single
       calls no slice can cut) is followed by a frame with no boot work, so the birds get a frame between two heavy ones
       (on the CPU renderers here they drew 9-14 frames a second while the world built). At most one in a row; the boot's
       start and its order are unchanged (rec.bootStages.birdFrames.rests counts them) */
    if (BOOT.rest) { BOOT.rest = 0; BOOT.rests = (BOOT.rests || 0) + 1; bootSlice(t0, 'rest'); return; }
    if (BOOT.st === 'B') {   // (Fix 3: and the first program issued in this frame: no frame of the boot is idle)
      bootMark('B objects'); bootObjects(); if (BIRDS && BIRDS.boot) BIRDS.boot();
      BOOT.st = 'C'; bootMark('C programs');
      var r0 = progStep(false, dl); if (r0 === LOSTP) return;
      bootSlice(t0, 'B C' + (PROGX.cur ? ':' + PROGX.cur.name : '')); return;
    }
    // (Fix 2) the read-back only from stage E: no synchronous call while a link is outstanding (Fix 3: from the frame after C's last)
    var afterC = BOOT.cDone && BOOT.cDoneF < FRAMEN;
    if (afterC) { rbPoll(); if (RB.lagged) BOOT.bake = Math.max(6, BOOT.bake >> 1); else BOOT.bake = Math.min(96, BOOT.bake + 8); }
    // C: the programs
    if (!BOOT.cDone) {
      var pd = PROGX.cur, r = progStep(false, dl);
      label += r === true ? ' C-done' + (pd ? '<' + pd.name : '') : (PROGX.cur && PROGX.cur !== pd ? ' C:' + PROGX.cur.name : PROGX.cur ? ' C?' + PROGX.cur.name : pd ? ' C<' + pd.name : ' C');   // (Fix 3: C:x issued, C?x asked, C<x read: one of them a frame)
      if (r === LOSTP) return;
      if (r === true) {
        BOOT.cDone = true; BOOT.cDoneF = FRAMEN; bootMark('C done (' + PROGS.length + ' programs, ' + PROGX.broken + ' broken)');
        if (!engineOk()) { decline('an engine program will not link here'); return; }
        var Vw = theWorld(); if (Vw && (linkStep(Vw.def) || realmProgs(Vw.def).st !== -1)) { /* linked */ } else if (Vw) { setAside(Vw); recMark('the world will not link here'); }
        if (!ORDER.some(function (x) { return !REALMS[x].bad; })) { decline('no realm will link here'); return; }
      }
    }
    /* E: the noise, a draw a frame, once every program is (Fix 2: its first draw, the noise program's first use, in a
       frame with no other GPU work of the boot's); then F, the warm table (Fix 2: before D's GPU half, so none of D's
       draws is a program's first use), each one's first use alone in its frame */
    var gpuFree = afterC && NOISE.done && (WARM.done || reduced());
    if (afterC && !NOISE.done && NOISE.prog && NOISE.prog.st === 3) {
      var NP = NOISE.prog, tn = clockNow(); noiseStep(false); label += ' noise';   // (E1.1: no wait: the boot began with today's first bird in view)
      if (!NP.firstF) { NP.firstF = FRAMEN; NP.firstMs = +(clockNow() - tn).toFixed(2); NP.firstAt = +clockNow().toFixed(1); NP.warmed = true; }
      if (NOISE.done) bootMark('E noise baked');
    } else if (afterC && NOISE.done && !WARM.done && !reduced()) {
      var wi = WARM.ms.length; warmStep(false, dl); label += ' F';
      for (var wk = wi; wk < WARM.ms.length; wk++) label += (wk === wi ? ':' : ',') + WARM.ms[wk][0];   // (Fix 2: the keys drawn in the slice)
      if (WARM.done) bootMark('F warmed (' + WARM.list.length + ' keys)');
    }
    // D and E: the world about the landing (or, after a restore, about the camera)
    var V = SIM.V || worldAt(SIM.t).V;
    if (V && !BOOT.world) {
      budgets(true); BAKE.left = BUD.bake; WDL = dl;
      var h = SIM.V ? CS.psi : heading0(), cx = SIM.V ? CS.x : 0, cz = SIM.V ? CS.z : 0;
      if (gpuFree) {   // (the GPU's half first, as in flight)
        freeDrain();
        visitStep(V, false, 'gpu');
        if (V.cellList) cellWork(V, false, 0, 4, 'gpu');
        groundRead(); groundCache(V, cx, cz, false);
        probeFlush(PROBE_BOOT);
      }
      if (clockNow() < dl) visitStep(V, false, 'cpu');
      if (V.st >= 8 && clockNow() < dl) { streamCells(V, cx, cz, Math.sin(h), Math.cos(h), false); cellWork(V, false, 0, 4, 'cpu'); }
      WDL = 0;
      label += ' D' + V.st;
      if (BOOT.cDone && NOISE.done && visitBuilt(V) && V.st >= 8 && cellsReady(V, 0.5)) { BOOT.world = true; bootMark('D world ready'); }
    }
    if (afterC) rbFence();
    // G: the measurement (once the world is ready and the table warm); first the flight's first step (its camera)
    if (BOOT.world && (WARM.done || reduced())) {
      if (!SIM.V) { simAdvance(SIM_DT); CLK[0] = SIM.t; }
      if (SIM.V && (reduced() || BOOT.restore || stageG())) {   // (E1.1: no wait for today's first flight to leave: Fix 3's G_WAIT_MS always ran out, its flight taking 15-20 s to cross)
        READY = true; dt0 = true; PREP0 = FRAMEN; bootMark('G done: ready'); budgets(false);
        if (REC) REC.readyAt = clockNow();
      } else label += ' G';
    }
    bootSlice(t0, label);
  }
  var dt0 = false;
  /* G: the warm-up measurement, one timed trial a frame (design-v5 14: drawn m = 2 times, then one blocking 1-pixel
     read, timed by clockNow from before the draws to after the read; the same read after a clear alone gives the round
     trip, subtracted; five trials a scale, the median). Pinned (no trials: the scale the harness asks, data-rung or
     the full one) in development and with the switch gtrial=0 */
  var GS = { sc: [0.35, 0.5, 0.7, 1], i: 0, rt: [], tr: [[], [], [], []], med: [null, null, null, null], m: 2, done: false, pick: -1, P: 0, pinned: false, ms: null, rung: 0, px: new Uint8Array(4) };
  var TRIALSC = 0, TRIAL = false;
  function median(a) { var b = a.slice().sort(function (x, y) { return x - y; }); return b.length ? b[b.length >> 1] : 0; }
  function bootPeriod() {   // the display's period from the boot's own frames (their quickest quarter: the boot's long frames aside)
    var d = []; for (var i = 1; i < BOOT.ts.length; i++) { var x = BOOT.ts[i] - BOOT.ts[i - 1]; if (x > 4 && x < 200) d.push(x); }
    if (d.length < 4) return 1000 / 60;
    d.sort(function (a, b) { return a - b; });
    return clamp(d[Math.floor(d.length * 0.25)], 6.9, 34);
  }
  function stageG() {
    if (GS.done) return true;
    if (!SW.gtrial || (DEVMODE && SW.gtrial < 2)) { GS.done = true; GS.pinned = true; GS.rung = RUNG; bootMark('G pinned (rung ' + RUNG + ')'); return true; }
    if (!GS.P) { GS.P = bootPeriod(); bootMark('G period ' + GS.P.toFixed(2) + ' ms'); }
    var V = SIM.V, t0, ms;
    gl.bindFramebuffer(gl.FRAMEBUFFER, TG.win.f); gl.viewport(0, 0, 1, 1);
    if (GS.rt.length < 3) {   // the round trip: a clear and the read alone
      t0 = clockNow(); gl.clearColor(0, 0, 0, 1); gl.clear(gl.COLOR_BUFFER_BIT); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, GS.px); GS.rt.push(clockNow() - t0);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      return false;
    }
    var sc = GS.sc[GS.i];
    TRIALSC = sc; TRIAL = true;
    t0 = clockNow();
    for (var q = 0; q < GS.m; q++) drawFrame(V, SIM.u);
    gl.bindFramebuffer(gl.FRAMEBUFFER, TG.win.f); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, GS.px);
    ms = (clockNow() - t0 - median(GS.rt)) / GS.m;
    TRIALSC = 0; TRIAL = false; gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    GS.tr[GS.i].push(+ms.toFixed(2));
    if (GS.tr[GS.i].length < 5) return false;
    var med = median(GS.tr[GS.i]); GS.med[GS.i] = +med.toFixed(2);
    if (med <= 0.65 * GS.P) { if (GS.i === GS.sc.length - 1) GS.pick = GS.i; else { GS.i++; return false; } }
    else GS.pick = GS.i - 1;
    GS.done = true;
    if (GS.pick < 0 && GS.med[0] > 0.65 * 33.34) { bootMark('G floor not met: ' + GS.med[0] + ' ms at 0.35'); decline('stage G: the frame at scale 0.35 takes ' + GS.med[0] + ' ms (over 21.7)'); return false; }
    var s = GS.pick < 0 ? 0.35 : GS.sc[GS.pick], ru = RUNGS.length - 1;
    for (var k = 0; k < RUNGS.length; k++) if (RUNGS[k] <= s + 1e-6) { ru = k; break; }
    RUNG = ru; GS.rung = ru;
    bootMark('G measured: scale ' + s + ' (rung ' + ru + '), medians ' + GS.med.join('/') + ' ms, period ' + GS.P.toFixed(1));
    return true;
  }
  /* H: the first real frame, drawn into the hidden canvas and read back small (sky.v2's rule): true once it looks like
     a sky; a frame doubted twice declines */
  function stageH() {
    if (BOOT.hOk) return true;
    var V = SIM.V; if (!V || !TG) return false;
    var ur = SIM.u - (1 - SIM.alpha) * SIM_DT;   // (Fix 3: between the last two steps at the junction too)
    drawFrame(V, ur);
    if (!BOOT.thumb) BOOT.thumb = target(16, 16, 'rgba8');
    var T = BOOT.thumb, px = new Uint8Array(16 * 16 * 4);
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, DIRECT ? null : TG.win.f); gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, T.f);
    gl.blitFramebuffer(0, 0, OUT.w, OUT.h, 0, 0, 16, 16, gl.COLOR_BUFFER_BIT, gl.LINEAR);
    gl.bindFramebuffer(gl.FRAMEBUFFER, T.f); gl.readPixels(0, 0, 16, 16, gl.RGBA, gl.UNSIGNED_BYTE, px); gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    if (DEVMODE && SW.hblack) px.fill(0);   // (dev: a forced-black first frame, the fallback's test)
    var sum = 0, same = true, i, lo = 255, hi = 0;
    for (i = 0; i < 256; i++) { var y = 0.2126 * px[i * 4] + 0.7152 * px[i * 4 + 1] + 0.0722 * px[i * 4 + 2]; sum += y; if (y < lo) lo = y; if (y > hi) hi = y; if (px[i * 4] !== px[0] || px[i * 4 + 1] !== px[1] || px[i * 4 + 2] !== px[2]) same = false; }
    var mean = sum / 256, doubt = mean < 3 || mean > 252 || same;
    BOOT.thumbStat = { mean: +mean.toFixed(1), lo: +lo.toFixed(1), hi: +hi.toFixed(1), same: same };
    if (!doubt) { BOOT.hOk = true; bootMark('H first frame looks like a sky (mean ' + mean.toFixed(1) + ')'); return true; }
    BOOT.hFails++; bootMark('H first frame doubted (' + BOOT.hFails + ': mean ' + mean.toFixed(1) + (same ? ', blank' : '') + ')');
    if (BOOT.hFails >= 2) decline('the first frame doubted twice');
    return false;
  }
  /* (E1.1 Fix 2, S10: verify-gates-1 defect 8, verify-regress-1 defect 10) a handler reads no layout and writes no DOM:
     what it would write (the canvas hidden, the still sky marked, the words' colours cleared, the sky handed to today's
     birds, data-steer, the selection cleared) and what it would read (the words' boxes, the touch mode) is stored here
     and done at the start of the next animation frame: the loop's own (frameBody), or, the loop stopped, a frame of its
     own (domNext) */
  var DOMQ = { hide: false, fc: false, words: false, touch: false, steer: -1, unsel: false }, DOMRAF = 0;
  function domNext() { if (!DOMRAF) DOMRAF = requestAnimationFrame(function () { DOMRAF = 0; domFlush(); }); }
  function domFlush() {
    if (DOMQ.hide) { DOMQ.hide = false; if (!shown) { canvas.classList.remove('on'); markStill(); clearWords(); handTo(0); } }
    if (DOMQ.fc) { DOMQ.fc = false; if (forced() && !HASSVG && !LOST && !DEAD) fstart(); }
    if (DOMQ.steer >= 0) { if (DOMQ.steer) root.setAttribute('data-steer', ''); else root.removeAttribute('data-steer'); DOMQ.steer = -1; }
    if (DOMQ.unsel) { DOMQ.unsel = false; var sel = window.getSelection ? window.getSelection() : null; if (sel && sel.removeAllRanges) sel.removeAllRanges(); }
    if (DOMQ.touch) { DOMQ.touch = false; touchMode(); }
    if (DOMQ.words) {
      DOMQ.words = false; measureWords(); touchMode();
      if (!running && !LOST && shown && READY && !forced()) { resize(); render(); }   // (a still frame (reduced motion) drawn again, so the veil is where the words are)
    }
  }
  function frame(ts) {
    if (!running) return;
    rafId = requestAnimationFrame(frame);
    domFlush();
    if (REC) recStart(ts);
    frameBody(ts);
    if (REC) recEnd(ts);
  }
  /* (E1) the read-back's rhythm (the switch fence): 1 at the frame's start every frame (the design's), 2 every second
     frame, 3 polled at the start and fenced after the flush, 0 all but off (every eighth frame: the flight on its last
     ground) */
  function fenceDue() { var f = SW.fence; return f === 1 || f === 3 ? true : f === 2 ? FRAMEN % 2 === 0 : FRAMEN % 8 === 0; }
  /* (E1) the rest of the boot behind the still, once reduced motion ends (F and G), and a restore's own end */
  function bootTail() {
    if (!WARM.done) { warmStep(false, clockNow() + BOOT_MS); if (WARM.done) bootMark('F warmed (after the still)'); if (!represent()) render(); return false; }   // (the canvas's keys were drawn into its corner: the still put back over them)
    if (!GS.done) { var ok = stageG(); if (!represent()) render(); return ok; }
    return true;
  }
  function frameBody(ts) {
    var dt = CLK[1] < 0 ? 0 : ts - CLK[1]; CLK[1] = ts; FRAMEN++;
    var dtRaw = dt;   // (the interval itself, for the bake's learning)
    if (TSCALE !== 1) dt *= TSCALE;
    if (SUPPRESS && FRAMEN > SUPPRESS_F + 3) SUPPRESS = false;   // (a drag's click comes at once, or never)
    if (gl.isContextLost()) return;
    prof('frame');
    if (!READY) { if (REC && REC.bootStartAt < 0) { REC.bootStartAt = clockNow(); recMark('boot: first frame'); } var tb0 = clockNow(); bootFrame(ts); if (!READY && (SKYAIR.flying | 0) >= 2 && clockNow() - tb0 > 2 * BOOT_MS) BOOT.rest = 1; prof('boot'); return; }
    if (dt0) { dt0 = false; dt = 0; }
    if (reduced() && !STILLMODE) {   // one still frame (round 3: the birds' still sky planned first, a share a frame, while the still sky shows)
      var fresh = false; if (NEEDSIZE) { NEEDSIZE = false; resize(); fresh = true; if (REC) recResized(); } if (!SIM.V) simAdvance(SIM_DT);
      if (STILLTS < 0 && BIRDS && BIRDS.prepare) {   // (round 3, second part: each call timed against the birds' budget, BIRDB.prep ms of it: nothing else runs in these frames)
        BIRDB.spent = BIRDB.ms - BIRDB.prep; BIRDB.at = clockNow(); var prepared = BIRDS.prepare(); BIRDB.at = 0; BIRDB.spent = 0;
        if (!prepared && FRAMEN - PREP0 < 120) return;
      }
      if (!shown && !stageH()) return;   // (E1: stage H for the still too)
      /* (Fix 2) the still is drawn again, the same still (no time passes), every frame until the canvas has dissolved
         in (its 2 s and a frame or so more), then the loop stops: a browser may present the canvas after any frame that
         drew at all, and WebKit, its drawing buffer not preserved, put up a cleared one under the dissolve (a black
         page, the black name gone). sky.v2's own rule (fadeUntil). After the first, the frame is put up again
         (represent: the composite or its copy, and the birds' ink), not drawn whole, unless the window changed */
      if (STILLTS < 0 || fresh || !represent()) { if (!render()) return; }
      else if (SW.words && AG.on && !AG.ink) agUpdate();   // (ink fix: the still's take, once the canvas has dissolved INK_TAKE s in)
      if (STILLTS < 0) STILLTS = ts;
      if (ts - STILLTS >= (DISSOLVE_S + 0.1) * 1000 && (AG.ink || !(SW.words && AG.on) || clockNow() - AG.w0 >= 2 * INK_TAKE * 1000)) { STILLTS = -1; stop(); }   // (ink fix: and not before the still has taken its ink, its INK_TAKE s from the canvas shown having passed in a frame: a slow first frame outlasts the dissolve's frames)
      return;
    }
    STILLTS = -1;
    if (shown && (!WARM.done || !GS.done)) { bootTail(); return; }   // (reduced motion ended: F and G behind the still, then the flight)
    // the read-back and the frame's fence (design-v5 4.3 steps 2-3, 7.5)
    var fd = fenceDue();
    if (fd) rbPoll();
    if (shown) bakeLearn(fd, dtRaw);
    if (fd && SW.fence !== 3) rbFence();
    prof('poll');
    /* (E1) stage H: the first frame checked in the hidden canvas; (Fix 3) today's SVG birds told a frame before the canvas
       shows: their frame runs before this one in an animation frame, so told in the frame that shows the canvas they
       had already let a bird enter at the edge (verify-regress-2's b5); told now, they hand the sky over at the start
       of their next frame, before any bird is drawn, and the world shows in its own next frame */
    if (!shown && !BOOT.hOk) { if (stageH()) { handTo(1); recMark('hand-over told (the world shows next frame)'); } return; }
    governor(dt);
    if (NEEDSIZE) { NEEDSIZE = false; resize(); if (REC) recResized(); }
    easeFrustum(Math.min(dt, 100) / 1000);
    WORK.verts = WORK.layers = WORK.layouts = WORK.uploads = WORK.resolves = 0;
    BIRDB.spent = 0;
    SIM.fdt = Math.min(dt / 1000, DTMAX);   // (the flight's time a frame, for the next visit's deadline)
    if (SW.order === 0) { gpuJobs(); prof('jobs'); }
    simAdvance(dt / 1000); prof('sim');
    CLK[0] = SIM.t;
    render(); prof('end');
    gl.flush();
    if (SW.order === 1) { gpuJobs(); gl.flush(); prof('jobs'); }
    if (fd && SW.fence === 3) rbFence();
    cpuSlice(); prof('slice');
  }
  function start() {
    if (running || LOST || DEAD || forced()) return;
    running = true; CLK[1] = -1; rafId = requestAnimationFrame(frame);
  }
  function stop() { running = false; if (rafId) cancelAnimationFrame(rafId); rafId = 0; }
  /* (E1.1, S10) a still drawn again (reduced motion's, the loop stopped): in the next animation frame, the window
     measured there if a handler marked it (NEEDSIZE); handlers only store */
  var STILLRAF = 0;
  function stillNext() {
    if (STILLRAF) return;
    STILLRAF = requestAnimationFrame(function () { STILLRAF = 0; if (running || LOST || DEAD || !READY || forced()) return; if (NEEDSIZE || !TG) { NEEDSIZE = false; resize(); } render(); });
  }
  var SUPPRESS_F = 0;

  /* ---------------------------------------------------------------- reduced motion: one still frame, live both ways */
  var MQ = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  function reduced() { return !!(MQ && MQ.matches); }
  function onMotionPref() {
    if (STILLMODE || LOST || DEAD) return;
    if (reduced()) { if (DRAG.id !== -1) endDrag(false); if (READY && shown) { stop(); STILLTS = -1; NEEDSIZE = true; stillNext(); } else start(); } else start();   // (Fix 2: a still not yet shown is drawn by the loop, through its dissolve; E1.1, S10: the still drawn in the next animation frame, never in the handler)
  }
  /* forced colours: the stylesheet hides the world; nothing is drawn while they hold, and when they end the window is
     measured again and the world drawn */
  var FC = window.matchMedia ? window.matchMedia('(forced-colors: active)') : null;
  function forced() { return !!(FC && FC.matches); }
  function onForced() {
    if (LOST || DEAD) return;
    if (forced()) { stop(); shown = false; STILLTS = -1; DOMQ.hide = true; DOMQ.fc = true; domNext(); }   // (E0: with today's SVG birds on the page they fly, in CanvasText, 15.4; Fix 2, S10: the DOM's part in the next frame, domFlush)
    else { fstop(); if (BIRDS) BIRDS.visit(-1); NEEDSIZE = true; start(); }   // (Fix 2: under reduced motion too: the loop draws the still until the canvas has dissolved back in; E1.1, S10: the window measured and the targets made in the loop's first frame, not here)
  }
  /* (round 2) under forced colours the world is not drawn, but the birds fly on, as the live site's do: the canvas
     cleared to the system's Canvas colour, the birds drawn over it in CanvasText at full ink, the flight held where it
     was (the birds' own still camera, the live's); their clock stepped here at the flight's fixed rate */
  var FRUN = false, FRAF = 0, FCLK = -1, FACC = 0, FALPHA = 1, FCOL = { on: false, ink: [0, 0, 0], paper: [1, 1, 1] };
  function systemColour(c, out) {
    var m = /rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)/.exec(c || ''); if (!m) return out;
    out[0] = +m[1] / 255; out[1] = +m[2] / 255; out[2] = +m[3] / 255; return out;
  }
  function forcedColours() {
    FCOL.on = forced();
    if (FCOL.on) { var cs = window.getComputedStyle(canvas); systemColour(cs.color, FCOL.ink); systemColour(cs.backgroundColor, FCOL.paper); }
    return FCOL;
  }
  function fstart() {
    if (FRUN || LOST || !BIRDS) return;
    forcedColours(); FRUN = true; FCLK = -1; FACC = 0; FRAF = requestAnimationFrame(fframe);
  }
  function fstop() { FRUN = false; if (FRAF) cancelAnimationFrame(FRAF); FRAF = 0; }
  function fframe(ts) {
    if (!FRUN) return;
    var still = reduced() && !STILLMODE;
    if (!still) FRAF = requestAnimationFrame(fframe); else FRUN = false;
    var dt = FCLK < 0 ? 0 : Math.min(ts - FCLK, 100) / 1000; FCLK = ts;
    if (NEEDSIZE || !TG) { NEEDSIZE = false; resize(); }
    if (!TG || gl.isContextLost()) return;
    FACC += dt; var n = 0;
    BIRDB.spent = 0;
    while (FACC >= SIM_DT && n < NMAX) { BIRDB.at = clockNow(); BIRDS.step(SIM_DT); BIRDB.spent += clockNow() - BIRDB.at; BIRDB.at = 0; FACC -= SIM_DT; n++; }
    if (n >= NMAX) FACC = 0;
    FALPHA = clamp(FACC / SIM_DT, 0, 1);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, FULL.w, FULL.h);
    gl.clearColor(FCOL.paper[0], FCOL.paper[1], FCOL.paper[2], 1); gl.clear(gl.COLOR_BUFFER_BIT);
    BIRDS.draw(); gl.bindVertexArray(null);
    if (!shown) { shown = true; canvas.classList.add('on'); }
  }

  /* ---------------------------------------------------------------- a lost context */
  canvas.addEventListener('webglcontextlost', function (e) {
    e.preventDefault(); LOST = true; MEMN.lost++; stop(); shown = false; STILLTS = -1; DOMQ.hide = true; domNext(); recMark('context lost');   // (Fix 2, S10: the canvas hidden and the still marked in the next frame)
    BOOT.hOk = false;
    if (RESTORERAF) { cancelAnimationFrame(RESTORERAF); RESTORERAF = 0; }
  });
  /* (Fix 2 of round E1, S10) the restore's work runs in the next animation frame's callback, never in the event's
     handler (round E1 called initExtensions and resize there: GL calls outside a frame) */
  var RESTORERAF = 0;
  canvas.addEventListener('webglcontextrestored', function () {
    if (!RESTORERAF) RESTORERAF = requestAnimationFrame(function () { RESTORERAF = 0; restoreNow(); });
  });
  function restoreNow() {
    if (gl.isContextLost()) return;   // (lost again before this frame: the next restore's event comes)
    // a restored context starts empty: its extensions off (asked for again first), every program, buffer and texture
    // gone; (E1) the boot's stages B to F and H run again (the measurement of G is kept): every object, every program
    // (compile all, link all, flush, status last), the noise, the warm table, the cells about the camera (the same
    // places: every cell is its seed's and its coordinates'), while the still sky shows; the flight goes on from where
    // it was
    GROUND.rd = 0; GROUND.ok = false; GROUND.got = 0; probeDropAll(); rbForget(); FREEQ.length = 0; poolReset();   // (while still marked lost: the jobs' buffers and fences died with the old context, never deleted in the new one)
    LOST = false; FBOK = {}; initExtensions();   // (E1.1: a new context asks each kind of target's completeness again, once)
    PROGS.length = 0; TG = null; PROBE_T = null; PROBE_PTS = []; GCT = null; GCCT = null; BAKEFB = null; QUAD = null; OUT.w = 0; GCK[0] = -1; ENG.st = 0; READY = false;
    NOISE.done = false; NOISE.t = null; NOISE.prog = null; WARM.list = null; WARM.done = false; WARMX.length = 0; BOOT.thumb = null;
    ORDER.forEach(function (id) { REALMS[id].P = null; });
    J.visits.forEach(forgetVisit); kwForget();
    BIRDPL.length = 0; if (BIRDS) BIRDS.lost();   // (the birds' programs died with the context: the module makes them again)
    if (!GAVEUP) DEAD = false;
    if (BIRDS && BIRDS.visit) BIRDS.visit(-1);   // (E0: the ink birds' flights ended with the canvas; they begin again from the dissolve's end)
    MEMN.restored++; recMark('context restored');
    bootReset(true);
    inkRestart();   // (ink load fix: the restored world's first reading sets the inks at once)
    resize();
    start();
  }
  /* ---------------------------------------------------------------- the birds' host
     The ink birds are their own module (inkbirds.js, a classic deferred script loaded after world.js): it registers a
     factory with WORLD.birds(factory) before the engine boots, and the factory is handed HOST, which is all the birds
     ever see of the engine. The engine, for its part, calls the module's five hooks and nothing else:
       step(dt)      after every fixed step of the flight (1/60 s): the birds' clock and their planning, deterministic
       draw()        after the composite, onto the window: the birds as ink, over the finished frame
       visit(k)      a visit (a realm) begins about the camera: its coordinates are new, the sky is cleared
       reset()       the journey starts again (the harness's draw(t) going back in time)
       lost()        the context was lost: every GL object of the module is gone (made again on the next draw)
     See notes.md, "The birds' interface", for the contract. */
  var BIRDB = { ms: 1.5, spent: 0, at: 0, prep: 6 };   // (round 3: the birds' planning budget a frame, ms; their steps' time this frame)
  var BIRDS = null, LASTE = null, LASTU = 0, LASTBL = new Float32Array([0, 1, 1]), HW = { boxes: null, kind: 'dark', text: '#000000' }, BIRDPL = [];
  var CAMP = { pos: [0, 0, 0], f: [0, 0, 1], r: [1, 0, 0], u: [0, 1, 0], roll: 0, pitch: 0, inCloud: 0, arrive: 0, cover: 0, pmode: 0, hold: -1, open: -1, expo: 1, yaw: 0 };
  /* (E1 Fix 3, defect 16) s, how far the birds' planner trusts the flight's forecast (HOST.courseTrust). With the heading
     held the forecast is the flight itself, so a longer look-ahead was tried: four of the seven judged runs, the same
     build but for this (rounds/E1/fix3/out/birds-t12, -t20, birds-c4): the empty sky 7.6-17.9% at 12 s, 9.9-18.3% at
     20 s, 10.9-24.1% at 30 s (ABOVE s7 1440: the first 22, 27 and 57 s without a bird). Planned further along the course,
     a flight must clear more of it (the clouds and banks the straight flight meets); 12 s, E1's own, is kept */
  var COURSE_TRUST = 12;
  var HOST = {
    gl: null,   // (Fix 2: the context, from the boot's first frame; the module is made then, makeBirds)
    glsl: { HEAD: HEAD, FRAME_U: FRAME_U, LIB: LIB, AIR: LIB_AIR },
    /* programs: compiled with the engine's defines when asked (the module asks as it is made, before the engine boots);
       linked as the engine's own are: with parallel compiles once the driver says it is done, else in the boot's
       prelink (one a frame, while the still sky shows), never in flight. linked() never waits: true once linked, false
       while not yet (or broken: P.ok false with P.u set), 'lost' */
    /* (E1) a program is registered for the boot's stage C (compile all, link all, flush, status last): after the world
       shows that is an error (compile() fails it; development throws). linked() never asks the context: true once the
       boot has finished it (false while not yet, or broken: P.ok false), 'lost' with the context. Under forced colours
       and in the harness's stills there is no staged boot: their programs are made at once */
    program: function (vs, fs, name) { var P = compile(vs, fs, 'birds:' + name); BIRDPL.push(P); if (STILLMODE || FRUN) progStep(true, 0); return P; },
    linked: function (P) {
      if (gl.isContextLost()) return 'lost';
      if (P.st !== 3 && (STILLMODE || FRUN)) progStep(true, 0);
      return P.st === 3 ? P.ok : false;
    },
    /* (E1) an entry for the warm table (design-v5 8.2): the module's own draw, its real VAO and state */
    warm: function (e) { WARMX.push(e); },
    frameUniforms: function (P) { if (SIM.V) setFrameUniforms(P, SIM.V); },
    /* the window: the canvas in device px (out), its size in CSS px, and the scene's and the cloud's uv scales (the
       scene is drawn at the governor's rung, the clouds at half of it) */
    view: function (o) {
      var sc = RUNGS[RUNG], W = Math.max(1, Math.round((TG ? TG.W : OUT.w) * sc)), H = Math.max(1, Math.round((TG ? TG.H : OUT.h) * sc));
      o.outW = FULL.w || OUT.w; o.outH = FULL.h || OUT.h; o.cssW = OUT.cssW || OUT.w; o.cssH = OUT.cssH || OUT.h; o.dpr = o.outW / Math.max(o.cssW, 1);
      o.bdpr = OUT.w / Math.max(o.cssW, 1);   // (the words' boxes are the world's px: OUT)
      o.ddpr = window.devicePixelRatio || 1;   // (round 3: the device's own px a CSS px: the canvas is put up to it when FULL is capped under it)
      o.bUx = LASTBL[1]; o.bUy = LASTBL[2]; o.bloom = LASTBL[0];   // (the bloom's uv scale and gain, as the composite used them)
      o.tanX = FR.tanX; o.tanY = FR.tanY; o.near = NEAR; o.far = FAR;
      if (TG) { o.sUx = W / TG.W; o.sUy = H / TG.H; o.hUx = Math.max(1, Math.ceil(W / 2)) / TG.cloud.w; o.hUy = Math.max(1, Math.ceil(H / 2)) / TG.cloud.h; o.mUx = OUT.w / (4 * TG.inkKeep.w); o.mUy = OUT.h / (4 * TG.inkKeep.h); }
      return o;
    },
    /* the camera as drawn this frame (CAM), and as it is at the end of the last fixed step (for the birds' planning) */
    camera: function () { return CAM; },
    cameraStep: function () { var V = SIM.V; if (!V) return null; camPose(V, SIM.u, 1, CAMP); return CAMP; },
    /* the flight: the view's yaw (the way the camera looks), its heading and speed, its climb rate, its clearance band */
    flight: function (o) {
      var V = SIM.V; o.ok = !!V; if (!V) return o;
      o.x = CS.x; o.y = CS.y; o.z = CS.z; o.psi = CS.psi; o.view = CS.yawV + CS.phi; o.speed = V.speed; o.vy = CS.vy;
      o.ground = groundAt(V, CS.x, CS.z, false); o.clear = V.clear; o.u = SIM.u; o.D = V.D; o.k = V.k; o.realm = V.id; o.alpha = SIM.alpha;
      return o;
    },
    time: function () { return SIM.t; },
    alpha: function () { return FRUN ? FALPHA : SIM.junction ? 1 : SIM.alpha; },
    /* (round 2) forced colours: { on, ink, paper } (sRGB 0-1: CanvasText and Canvas); while on, the world is not drawn
       and the camera is held: the birds fly in their own still view, drawn in the ink at full strength */
    forced: function () { return FCOL; },
    /* the grade the composite used this frame (exposure, saturation, lift, gain), and the light (sun, haze) */
    grade: function () { return LASTE; },
    light: function () { var V = SIM.V; return V ? (V.L || V.light) : null; },
    /* the words: their boxes (name, bio, credit, link, link: x0, y0, x1, y1 in canvas px) and their colours in effect */
    words: function () { HW.kind = AG.sk || SKYI.words || (SIM.V && SIM.V.def.words) || 'dark';   /* (tod: the stack's ink: the ink birds' light path at night) */ HW.text = WORDSETS[HW.kind].text; return HW; },
    /* the scene's depth, the clouds (premultiplied, half resolution) and the ink birds' keep-off (the words' ink boxes),
       bound on the units the engine's programs use (uDepth 2, uCloud 4, uInkKeep 12) */
    bindTextures: function () {
      if (!TG) return false;
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_3D, NOISE3);
      gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, TG.scene.d);
      gl.activeTexture(gl.TEXTURE4); gl.bindTexture(gl.TEXTURE_2D, (CLT || TG.cloud).t);
      gl.activeTexture(gl.TEXTURE5); gl.bindTexture(gl.TEXTURE_2D, TG.bu[0].t);   // (the bloom, as the composite added it)
      gl.activeTexture(gl.TEXTURE12); gl.bindTexture(gl.TEXTURE_2D, TG.inkKeep.t);
      gl.activeTexture(gl.TEXTURE13); gl.bindTexture(gl.TEXTURE_2D, TG.win.t);   // (the finished frame, the world's resolution: what lies under a stroke)
      gl.activeTexture(gl.TEXTURE0);
      return true;
    },
    target: function () { gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, FULL.w || OUT.w, FULL.h || OUT.h); },
    /* (round 2) the camera's coming view, for the planner: n samples `step` s apart into out { yaw, pitch, roll, x, y, z
       (typed arrays), n, t0, step }, from the flight as it is now (reset) or on from the last chunk (w07: flightAhead) */
    ahead: function (reset, n, step, out, ch) { return flightAhead(reset, n, step, out, ch); },
    aheadCh: 2,   // (round 3: forecasts on channels 0 and 1, each carried on by its own caller)
    /* (E1 Fix 3) how far the forecast can be trusted, s: the heading is held left alone (Revision 3), so the forecast is
       the flight itself until the visitor drags (a drag starts the planner's course again); its slip is the flight's own
       plan. COURSE_TRUST s: about a flight's crossing */
    courseTrust: function () { return COURSE_TRUST; },
    /* (round 3) the birds' calm: the autopilot's own turning held under `rate` rad/s (its way round a cloud's body under
       `ev`) while the birds have a flight in the sky; 0: as it was. Eased over CALM_T s; the forecast (ahead) knows it */
    calm: function (rate, ev) { CALM.want = rate > 0 ? 1 : 0; if (rate > 0) { CALM.rate = rate; CALM.ev = Math.max(ev || 0, rate); } },
    /* (round 3) the time left for the birds' planning this frame, ms (the module reads no clock): BIRDB.ms a frame,
       less what its steps have taken so far; unbounded in the harness (data-still: the same whatever the machine) */
    budget: function () { if (STILLMODE) return Infinity; return BIRDB.ms - BIRDB.spent - (BIRDB.at ? clockNow() - BIRDB.at : 0); },
    /* (round 3) the canvas drawn straight (the world's px the canvas's own: no copy pass), what lies under the ink is
       copied into TG.win for its boxes only (CSS px, y down: x0, y0, x1, y1 each); a no-op when the frame is in TG.win */
    under: function (B, n) {
      if (!DIRECT || !TG) return;
      var k = OUT.w / Math.max(OUT.cssW || OUT.w, 1), i, x0, y0, x1, y1;
      gl.bindFramebuffer(gl.READ_FRAMEBUFFER, null); gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, TG.win.f);
      for (i = 0; i < n; i++) {
        x0 = clamp(Math.floor(B[4 * i] * k) - 2, 0, OUT.w); x1 = clamp(Math.ceil(B[4 * i + 2] * k) + 2, 0, OUT.w);
        y0 = clamp(OUT.h - Math.ceil(B[4 * i + 3] * k) - 2, 0, OUT.h); y1 = clamp(OUT.h - Math.floor(B[4 * i + 1] * k) + 2, 0, OUT.h);
        if (x1 > x0 && y1 > y0) gl.blitFramebuffer(x0, y0, x1, y1, x0, y0, x1, y1, gl.COLOR_BUFFER_BIT, gl.NEAREST);
      }
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    },
    /* how much cloud stands between two points: the length (m) of the segment inside the visible lobes of the clouds
       about the camera (each lobe a sphere; the bodies' bounds tested first) */
    cloudBetween: function (ax, ay, az, bx, by, bz) {
      var V = SIM.V, L = V && V.cellList, tot = 0, i, k, q;
      if (!L) return 0;
      var dx = bx - ax, dy = by - ay, dz = bz - az, len = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1e-6;
      CBS[0] = ax; CBS[1] = ay; CBS[2] = az; CBS[3] = dx / len; CBS[4] = dy / len; CBS[5] = dz / len; CBS[6] = len;
      for (i = 0; i < L.length; i++) {
        var C = L[i]; if (C.st < 3 || !C.soft || !C.softB) continue;
        for (k = 0; k < C.softB.length; k++) {
          var B = C.softB[k]; if (!cbChord(B[0], B[1], B[2], B[3])) continue;
          for (q = B[4]; q < B[5]; q += 4) tot += cbChord(C.soft[q], C.soft[q + 1], C.soft[q + 2], C.soft[q + 3]);
        }
      }
      return tot;
    },
    /* the cover over the view: the cloud about the eye (a passage), a passage's dark or light */
    cover: function () { return Math.max(CAM.inCloud || 0, CAM.cover || 0); },
    ground: function (x, z) { var V = SIM.V; return V ? groundAt(V, x, z, false) : 0; },
    /* the realm's places with birds (its cells' bird flocks, within r of the camera): centre, height, orbit, wheel */
    places: function (r, out) {
      out.length = 0; var V = SIM.V, L = V && V.cellList; if (!L) return out;
      for (var i = 0; i < L.length; i++) {
        var C = L[i]; if (C.st < 2) continue;
        for (var k = 0; k < C.flocks.length; k++) {
          var f = C.flocks[k]; if (f.kind !== 'bird' || !f.at) continue;
          var dx = f.at[0] - CS.x, dz = f.at[2] - CS.z; if (dx * dx + dz * dz > r * r) continue;
          out.push({ x: f.at[0], y: f.at[1], z: f.at[2], orbit: f.orbit || 40, wheel: f.wheel || 0.2, n: f.n || 8, size: f.size || 1.5, key: (C.ix * 73856093 ^ C.iz * 19349663 ^ k * 83492791 ^ C.sc * 2654435761) >>> 0 });
        }
      }
      return out;
    },
    /* randomness: a stream from the visit's weather (the journey's seed and a salt): never any other */
    rng: function (salt) { return splitmix32(subseed(J.seed, salt)); },
    reduced: function () { return reduced() && !STILLMODE; },
    dev: DEVMODE,
    count: function (draws, inst) { ST.draws += draws; ST.inst += inst; ST.tris += 2 * inst; }
  };
  /* the length of the segment (CBS: its start, its direction, its length) within a sphere (no closure a call) */
  var CBS = new Float64Array(7);
  function cbChord(cx, cy, cz, r) {
    var ox = cx - CBS[0], oy = cy - CBS[1], oz = cz - CBS[2], tc = ox * CBS[3] + oy * CBS[4] + oz * CBS[5], d2 = ox * ox + oy * oy + oz * oz - tc * tc;
    if (d2 >= r * r) return 0;
    var h = Math.sqrt(r * r - d2), t0 = Math.max(tc - h, 0), t1 = Math.min(tc + h, CBS[6]);
    return t1 > t0 ? t1 - t0 : 0;
  }
  var BIRDF = null;
  function registerBirds(factory) {
    if (REC) REC.regs.push(['inkbirds', +clockNow().toFixed(1)]);   // (E0: the ink birds' file, the last deferred script, ends here)
    HW.boxes = WORDS;
    if (BIRDS || BIRDF || typeof factory !== 'function') return;
    BIRDF = factory;
    if (gl) makeBirds();
    bootSoon();   // (E0: the last deferred script has run: the boot, a frame on, once today's birds are flying)
  }
  /* (Fix 2) the module made once the context is (boot stage A): its factory compiles its programs through HOST */
  function makeBirds() {
    if (BIRDS || !BIRDF || !gl) return;
    HOST.gl = gl;
    try { BIRDS = BIRDF(HOST) || null; } catch (e) { BIRDS = null; fail('birds: ' + (e && e.message)); }
  }
  /* ---------------------------------------------------------------- the record and the switches (E0: diag v2's engine side)
     data-dev-switch on <html> is a list of name=value pairs ("rec=1 course=1 ab=order"), written by the preview's and
     staging's own diag script before the world boots. The site never writes it, and nothing here reads the URL. With
     rec=1 the engine keeps a record of how it runs (design-v5 3.1, 3.6): every presented interval in units of the
     period, with the phase it fell in and the tags of the frame before (cpu, stage, sync, stream, gpu), the
     synchronous calls timed, the frame fence's lag, per-stage CPU a second, the boot's timeline, each script's
     evaluation, each program's link, each pipeline key's first use, objects made and freed and uploads from client
     memory after the world shows, the flips, input latency, the phone's raw and filtered orientation, the switches in
     force. (The shipped page: no switch is read and the record is never made.)
     (Fix 2) Every interval carries its phase: boot (until the world shows), dissolve (its first 2 s), steady, control
     (the world halted), resume (the 2 s after a hidden tab, an app switch or the control tail; the interval across the
     gap itself is never recorded) and resize (the second after a resize or a rotation). The gates' numbers (D1-D3:
     percentiles, histogram, misses, their tags, intervals over 3 kP) are steady flight's; the other phases are
     reported apart. The stage tag (3.1) now also takes the first use of a pipeline key (8.2's full key: program,
     vertex layout, topology, target formats and draw buffers, colour mask, blend, depth and cull state; its Metal part
     counted apart) and every GL object freed after the world shows (the fence ring's syncs exempt).
     The switches (3.6): live ones flip at once (order, fence, birds, stream); dpr1, wrap and course apply at boot; ab
     until the world shows; stats, march, ubo and worker are reserved names (their mechanisms arrive in E6, E7, E3a and
     E7) and are recorded but do nothing in E0. words=0 (dev) draws the world with the words' machinery off: W7's pair. */
  var SW = { rec: 0, order: 0, fence: 1, birds: 1, stats: 1, march: 0, stream: 1, ubo: 1, dpr1: 0, worker: 0, wrap: 0, course: 0, ab: 'e1', words: 1, frz: 0, look: 0, noanim: 0, camhold: 0, gtrial: 1, rbfix: 0, hblack: 0, lab: 0, volres: 0, aa: 4, fxaa: -1, vol16: -1, cacc: 0.5, memtier: '', stb: 1, lay: 1, wlive: 0, wsync: 0, inks: -1, inkl: -1 };   // (world6 step B fix, dev: wlive 1: the words' machinery as in the live loop (ring reads, eased gains and inks) in the harness's films)   // (Fix 3: aa the scene's MSAA samples, at boot; fxaa -1 off where the scene has samples, 0 off, 1 on; cacc this frame's share of the clouds' accumulation, 0 off)
  /* (E1) the switches' meanings now: order 0 the slice's GPU jobs at the start of the next drawn frame, before its draws
     (the design's), 1 after the frame's flush; fence 1 polled and made at the frame's start every frame (the design's),
     2 every second frame, 3 polled at the start and made after the flush, 0 all but off (every eighth frame); gtrial
     stage G's timed trials (0: pinned at the full scale; in development pinned unless 2); rbfix (dev) the read-back's
     arrival fixed two frames after its fence; hblack (dev) stage H's thumbnail read as black (the fallback's test);
     ab the record mode's experiment: 'e1' the five arms of E1's A/B pairs in rotating 20 s blocks (recArm), 'order' and
     'fence' E0's two-minute halves, 'none' */
  var SWLIVE = { order: 1, fence: 1, birds: 1, stream: 1, words: 1, frz: 1, look: 1, noanim: 1, camhold: 1, cacc: 1, stb: 1, lay: 1, wlive: 1, wsync: 1, inks: 1, inkl: 1 };   // (E1.1: cacc live, the record's arm)   // (Fix 2: the weave switch is gone with the autopilot; camhold, dev: the camera held, the clock running: G0's frozen-scene film)
  var REC = null, RECW = null;
  var RING = 1 << 16;
  var PHN = ['boot', 'dissolve', 'steady', 'control', 'resume', 'resize'], PH_BOOT = 0, PH_DIS = 1, PH_STEADY = 2, PH_CTL = 3, PH_RES = 4, PH_SIZE = 5;
  var TOPN = [8, 8, 20, 8, 8, 8];   // (the longest intervals kept a phase: 20 of steady flight's for D1, 8 of the others)
  function recInit() {
    REC = {
      started: clockNow(), nav0: 0,
      boot: [['world.js eval start', EVAL0]], regs: [], links: [], prog1: [], scripts: null,
      // every presented interval (ms), its phase, the tags of the frame before it, its callback's CPU (ms), sim time and sync ms
      ints: new Float32Array(RING), ph: new Uint8Array(RING), tags: new Uint8Array(RING), cpu: new Float32Array(RING), simt: new Float32Array(RING), syn: new Float32Array(RING), n: 0,
      lastTs: -1, P: 1000 / 60, k: 1,
      fr: { c0: 0, sync: 0, syncN: 0, fence: 0, poll: 0, read: 0, stage: 0, stageWhy: '', up: 0, upN: 0, layers: 0, probes: 0, gpu: 0, made: 0, rbBytes: 0 },
      tagsPrev: 0, cpuPrev: 0, syncPrev: 0, whyPrev: '',
      // the phases: each a time (rAF ms) until which an interval ending then counts as it
      dissolveUntil: -1, resumeUntil: -1, resizeUntil: -1, resumePending: false, resizePending: false, hidden: 0,
      // each synchronous call: [calls, ms] before the world shows (the boot) and [calls, ms] after
      sync: { fenceSync: [0, 0, 0, 0], clientWaitSync: [0, 0, 0, 0], getBufferSubData: [0, 0, 0, 0], readPixels: [0, 0, 0, 0], finish: [0, 0, 0, 0], getError: [0, 0, 0, 0], getParameter: [0, 0, 0, 0], getProgramParameter: [0, 0, 0, 0], getShaderParameter: [0, 0, 0, 0], checkFramebufferStatus: [0, 0, 0, 0], getUniformLocation: [0, 0, 0, 0], getActiveUniform: [0, 0, 0, 0], getSyncParameter: [0, 0, 0, 0], isContextLost: [0, 0, 0, 0], getExtension: [0, 0, 0, 0] },
      syncMaxFrame: 0, syncSumMaxFrame: 0, syncMaxBoot: 0, syncSumMaxBoot: 0,
      fenceN: 0, fenceLag: 0, fencePolls: 0, fenceNow: null,
      rbPolledLast: 0, armNow: 0,
      cac: new Uint8Array(RING), cacPrev: 0,   // (E1.1, item 5: the clouds' accumulation on (1) or off (0) in the frame before each interval)
      arm: new Uint8Array(RING), syF: new Float32Array(RING), syP: new Float32Array(RING), syR: new Float32Array(RING), up: new Float32Array(RING), lay: new Uint16Array(RING), prb: new Uint16Array(RING), lagF: new Uint8Array(RING),
      armPrev: 0, syFPrev: 0, syPPrev: 0, syRPrev: 0, upPrev: 0, layPrev: 0, prbPrev: 0, lagPrev: 0, armLog: [],
      tsI: new Float64Array(RING), pass: [], passOpen: null, visitK: -1,   // (E1, D3: each passage's intervals; tsI each interval's end)
      madeAfter: { Buffer: 0, Texture: 0, VertexArray: 0, Framebuffer: 0, Renderbuffer: 0, Program: 0, Shader: 0, Sync: 0, linkProgram: 0, compileShader: 0 },
      freedAfter: { Buffer: 0, Texture: 0, VertexArray: 0, Framebuffer: 0, Renderbuffer: 0, Program: 0, Shader: 0, Sync: 0 },
      upAfter: { clientTex: 0, clientTexBytes: 0, pboTex: 0, bufBytes: 0, bufN: 0, overCap: 0 },
      keys: { full: 0, metal: 0, fullAfter: 0, metalAfter: 0, first: [] },   // pipeline keys first drawn: in all, and after the world shows (8.2)
      perSec: { miss: new Uint16Array(1800), frames: new Uint16Array(1800) }, stageCpu: {}, profLast: 0, profName: null,
      rung: [], cadence: [], period: [], flips: [], firstFlip: null, lat: [], ori: [], oriF: [], minute: [], sw: [], ab: null,
      shownAt: -1, dissolveEnd: -1, readyAt: -1, bootStartAt: -1, course: null, halted: false, ctl: null, lowPower: null,
      hold: { n: 0, frames: 0, ms: 0, longestMs: 0, list: [] }, holdCur: null, holdFirstTs: -1, waitsAtJ: 0, heldAtJ: 0,   // (Fix 2: the flight's holds at junctions)
      longest: [[], [], [], [], [], []]   // a phase each: [interval ms, kP, tags, sim t, callback ms, sync ms, frame index, phase, why]
    };
    REC.nav0 = 0;   // (performance's own origin is navigation start: clockNow() is ms since it)
    for (var k in SW) REC.sw.push([0, k, SW[k]]);
    PROF = recProf;
  }
  /* the synchronous calls (each a round trip to the GPU process: timed) and the GL objects, uploads and pipeline keys
     (counted): the context's own methods wrapped on this context, so the engine's calls (and the ink birds', through
     HOST.gl) go through them. Only the synchronous calls carry a clock read; the rest keep small integers, and a draw
     builds its key as a number (no allocation but a key's first sight). Wrapped once the context is made (boot stage A) */
  var KS = { prog: 0, dfb: null, rfb: null, vao: null, blend: 0, bf: 0, be: 0x8006, cmask: 15, dt: 0, df: 1, dw: 1, cull: 0, cm: 2 };
  function recWrap() {
    if (!REC || REC.wrapped || !gl) return;
    REC.wrapped = true;
    var names = Object.keys(REC.sync);
    names.forEach(function (n) {
      var f = gl[n]; if (typeof f !== 'function') return;
      var S = REC.sync[n];
      gl[n] = function () {
        var a = clockNow(), r = f.apply(gl, arguments), d = clockNow() - a;
        if (shown) { S[2]++; S[3] += d; } else { S[0]++; S[1] += d; }
        if (n !== 'isContextLost' && n !== 'getExtension') { REC.fr.sync += d; REC.fr.syncN++; if (n === 'fenceSync') REC.fr.fence += d; else if (n === 'clientWaitSync') REC.fr.poll += d; else if (n === 'getBufferSubData') REC.fr.read += d; }
        return r;
      };
    });
    ['Buffer', 'Texture', 'VertexArray', 'Framebuffer', 'Renderbuffer', 'Program', 'Shader'].forEach(function (k) {
      var c = gl['create' + k], d = gl['delete' + k];
      gl['create' + k] = function () { if (shown) { REC.madeAfter[k]++; REC.fr.made++; REC.fr.stage |= 1; REC.fr.stageWhy = 'create' + k; } return c.apply(gl, arguments); };
      gl['delete' + k] = function (o) { if (shown && o) { REC.freedAfter[k]++; REC.fr.stage |= 16; REC.fr.stageWhy = 'delete' + k; } return d.call(gl, o); };   // (Fix 2: a free outside the fence ring is stage work too, 3.1)
    });
    var lp = gl.linkProgram, cs = gl.compileShader;
    gl.linkProgram = function (p) { if (shown) { REC.madeAfter.linkProgram++; REC.fr.stage |= 2; REC.fr.stageWhy = 'link'; } return lp.call(gl, p); };
    gl.compileShader = function (s) { if (shown) { REC.madeAfter.compileShader++; REC.fr.stage |= 2; REC.fr.stageWhy = 'compile'; } return cs.call(gl, s); };
    var ds = gl.deleteSync; gl.deleteSync = function (o) { if (shown && o) REC.freedAfter.Sync++; return ds.call(gl, o); };   // (the fence ring: exempt)
    var bd = gl.bufferData, bsd = gl.bufferSubData;
    gl.bufferData = function (t, a) { var b = typeof a === 'number' ? a : (a && a.byteLength) || 0; REC.fr.up += b; REC.fr.upN++; if (shown) { REC.upAfter.bufBytes += b; REC.upAfter.bufN++; } return bd.apply(gl, arguments); };
    gl.bufferSubData = function (t, o, a) { var b = (a && a.byteLength) || 0; REC.fr.up += b; REC.fr.upN++; if (shown) { REC.upAfter.bufBytes += b; REC.upAfter.bufN++; } return bsd.apply(gl, arguments); };
    ['texImage2D', 'texSubImage2D', 'texImage3D', 'texSubImage3D'].forEach(function (n) {
      var f = gl[n];
      gl[n] = function () {
        var a = arguments, last = a[a.length - 1], pbo = typeof last === 'number' && a.length >= 9, b = last && last.byteLength ? last.byteLength : 0;
        REC.fr.up += b; if (b || pbo) REC.fr.upN++;
        if (shown && (b || pbo)) { if (pbo) REC.upAfter.pboTex++; else { REC.upAfter.clientTex++; REC.upAfter.clientTexBytes += b; } }
        if ((n === 'texImage2D' || n === 'texImage3D') && a.length >= 3) { var x = texBound(a[0]); if (x) TEXF.set(x, a[2]); }   // (its format, for the targets' keys)
        return f.apply(gl, arguments);
      };
    });
    var up = gl.useProgram, seen = new Set();
    gl.useProgram = function (p) {
      KS.prog = p ? progId(p) : 0;
      if (p && !seen.has(p)) { seen.add(p); var nm = progName(p); REC.prog1.push([+clockNow().toFixed(1), nm, shown ? 1 : 0]); if (shown) { REC.fr.stage |= 4; REC.fr.stageWhy = 'first use ' + nm; } }
      return up.call(gl, p);
    };
    recWrapKeys();
  }
  /* (Fix 2) the pipeline key of every draw (8.2), kept as the GL state that makes it: the program; the target's
     attachment formats and draw buffers; the vertex array's layout (formats, offsets, strides, divisors, enabled
     arrays); the topology class; the colour mask; the blend state; and, for the full key, depth test, function and
     writes and the cull state. Targets and layouts get small ids when they change (their strings made then, never in
     a draw); a draw packs the ids into one number and looks it up */
  var PIDS = new WeakMap(), PIDN = 0, PNAMES = [''], FBR = new WeakMap(), VAR = new WeakMap(), VDEF = { att: [], div: [], en: 0, sig: -1 }, TEXF = new WeakMap(), RBF = new WeakMap(), TEXB = [], FSIGS = new Map(), VSIGS = new Map(), BLENDS = new Map();
  var KEYF = new Set(), KEYM = new Set(), TUNIT = 0;
  function progId(p) { var i = PIDS.get(p); if (i === undefined) { i = ++PIDN; PIDS.set(p, i); PNAMES[i] = progName(p); } return i; }
  function sigId(M, s) { var i = M.get(s); if (i === undefined) { i = M.size + 1; M.set(s, i); } return i; }
  function texBound(target) { return TEXB[TUNIT * 4 + (target === 0x806F ? 1 : target === 0x8C1A ? 2 : target === 0x8513 ? 3 : 0)] || null; }
  function fbRec(fb) { var r = FBR.get(fb); if (!r) { r = { att: {}, db: 1, sig: -1 }; FBR.set(fb, r); } return r; }
  function vaoRec(v) { if (!v) return VDEF; var r = VAR.get(v); if (!r) { r = { att: [], div: [], en: 0, sig: -1 }; VAR.set(v, r); } return r; }
  function fbSig(fb) {
    if (!fb) return 0;   // (the canvas: its own format)
    var r = fbRec(fb);
    if (r.sig < 0) { var ks = Object.keys(r.att).sort(), s = 'fb'; for (var i = 0; i < ks.length; i++) if (r.att[ks[i]] !== null) s += ' ' + ks[i] + ':' + r.att[ks[i]]; r.sig = sigId(FSIGS, s + ' db' + r.db) & 255; }
    return r.sig;
  }
  function vaoSig(r) {
    if (r.sig < 0) { var s = 'va'; for (var i = 0; i < 32; i++) if ((r.en >> i) & 1) s += ' ' + i + '=' + (r.att[i] || '?') + (r.div[i] ? '/d' + r.div[i] : ''); r.sig = sigId(VSIGS, s) & 1023; }
    return r.sig;
  }
  function recWrapKeys() {
    function wrap(n, before) { var f = gl[n]; if (typeof f !== 'function') return; gl[n] = function (a, b, c, d, e, g) { before(a, b, c, d, e, g); return f.call(gl, a, b, c, d, e, g); }; }
    wrap('bindFramebuffer', function (t, fb) { if (t === 0x8D40) { KS.dfb = fb; KS.rfb = fb; } else if (t === 0x8CA9) KS.dfb = fb; else if (t === 0x8CA8) KS.rfb = fb; });
    function attFb(t) { return t === 0x8CA8 ? KS.rfb : KS.dfb; }
    wrap('activeTexture', function (u) { TUNIT = u - 0x84C0; });
    wrap('bindTexture', function (t, x) { TEXB[TUNIT * 4 + (t === 0x806F ? 1 : t === 0x8C1A ? 2 : t === 0x8513 ? 3 : 0)] = x; });
    wrap('texStorage2D', function (t, l, f) { var x = texBound(t); if (x) TEXF.set(x, f); });
    wrap('texStorage3D', function (t, l, f) { var x = texBound(t); if (x) TEXF.set(x, f); });
    var rbNow = null;
    wrap('bindRenderbuffer', function (t, r) { rbNow = r; });
    wrap('renderbufferStorage', function (t, f) { if (rbNow) RBF.set(rbNow, f); });
    wrap('renderbufferStorageMultisample', function (t, s, f) { if (rbNow) RBF.set(rbNow, f + '/' + s); });
    wrap('framebufferTexture2D', function (t, a, tt, x) { var fb = attFb(t); if (!fb) return; var r = fbRec(fb); r.att[a] = x ? 't' + (TEXF.get(x) || '?') : null; r.sig = -1; });
    wrap('framebufferTextureLayer', function (t, a, x) { var fb = attFb(t); if (!fb) return; var r = fbRec(fb); r.att[a] = x ? 't' + (TEXF.get(x) || '?') : null; r.sig = -1; });
    wrap('framebufferRenderbuffer', function (t, a, rt, rb) { var fb = attFb(t); if (!fb) return; var r = fbRec(fb); r.att[a] = rb ? 'r' + (RBF.get(rb) || '?') : null; r.sig = -1; });
    wrap('drawBuffers', function (list) { if (!KS.dfb || !list) return; var r = fbRec(KS.dfb), m = 0; for (var i = 0; i < list.length; i++) if (list[i] !== 0) m |= 1 << i; if (r.db !== m) { r.db = m; r.sig = -1; } });
    wrap('bindVertexArray', function (v) { KS.vao = v; });
    var arrNow = null;
    wrap('bindBuffer', function (t, b) { if (t === 0x8892) arrNow = b; });
    wrap('vertexAttribPointer', function (i, n, ty, nm, st, off) { var r = vaoRec(KS.vao), s = n + ':' + ty + ':' + (nm ? 1 : 0) + ':' + st + ':' + (off || 0); if (r.att[i] !== s) { r.att[i] = s; r.sig = -1; } });
    wrap('vertexAttribIPointer', function (i, n, ty, st, off) { var r = vaoRec(KS.vao), s = 'I' + n + ':' + ty + ':' + st + ':' + (off || 0); if (r.att[i] !== s) { r.att[i] = s; r.sig = -1; } });
    wrap('vertexAttribDivisor', function (i, d) { var r = vaoRec(KS.vao); if ((r.div[i] || 0) !== d) { r.div[i] = d; r.sig = -1; } });
    wrap('enableVertexAttribArray', function (i) { var r = vaoRec(KS.vao); if (!((r.en >> i) & 1)) { r.en |= 1 << i; r.sig = -1; } });
    wrap('disableVertexAttribArray', function (i) { var r = vaoRec(KS.vao); if ((r.en >> i) & 1) { r.en &= ~(1 << i); r.sig = -1; } });
    wrap('enable', function (c) { if (c === 0x0BE2) KS.blend = 1; else if (c === 0x0B71) KS.dt = 1; else if (c === 0x0B44) KS.cull = 1; });
    wrap('disable', function (c) { if (c === 0x0BE2) KS.blend = 0; else if (c === 0x0B71) KS.dt = 0; else if (c === 0x0B44) KS.cull = 0; });
    function bf(code) { var i = BLENDS.get(code); if (i === undefined) { i = BLENDS.size + 1; BLENDS.set(code, i); } return i & 63; }
    function fct(x) { return x <= 1 ? x : x >= 0x8001 ? x - 0x8001 + 12 : x - 0x300 + 2; }   // (a blend factor in 4 bits)
    wrap('blendFunc', function (s, d) { KS.bf = bf(fct(s) * 4096 + fct(d) * 256 + fct(s) * 16 + fct(d)); });
    wrap('blendFuncSeparate', function (a, b, c, d) { KS.bf = bf(fct(a) * 4096 + fct(b) * 256 + fct(c) * 16 + fct(d)); });
    wrap('blendEquation', function (e) { KS.be = e; });
    wrap('colorMask', function (r, g, b, a) { KS.cmask = (r ? 1 : 0) | (g ? 2 : 0) | (b ? 4 : 0) | (a ? 8 : 0); });
    wrap('depthFunc', function (f) { KS.df = (f - 0x200) & 7; });
    wrap('depthMask', function (m) { KS.dw = m ? 1 : 0; });
    wrap('cullFace', function (m) { KS.cm = m === 0x404 ? 1 : m === 0x405 ? 2 : 3; });
    function draw(mode) {
      var topo = mode === 0 ? 0 : mode <= 3 ? 1 : 2;
      var mk = (((((KS.prog & 255) * 256 + fbSig(KS.dfb)) * 1024 + vaoSig(vaoRec(KS.vao))) * 4 + topo) * 256 + (KS.blend ? 1 + (KS.bf & 63) + ((KS.be || 0x8006) === 0x8006 ? 0 : 64) : 0)) * 16 + KS.cmask;   // (40 bits: a double holds it exactly)
      var fk = mk * 256 + (KS.dt ? (1 | (KS.df << 1) | (KS.dw << 4)) : 0) * 8 + (KS.cull ? (1 | (KS.cm << 1)) : 0);
      if (KEYF.has(fk)) return;
      KEYF.add(fk); var K = REC.keys, nm = !KEYM.has(mk);
      if (nm) { KEYM.add(mk); K.metal++; if (shown) K.metalAfter++; }
      K.full++;
      if (shown) { K.fullAfter++; REC.fr.stage |= 8; REC.fr.stageWhy = nm ? 'metal key ' + PNAMES[KS.prog] : 'key ' + PNAMES[KS.prog]; }
      if (K.first.length < 120) K.first.push([+clockNow().toFixed(1), PNAMES[KS.prog] || '?', shown ? 1 : 0, nm ? 1 : 0, FRAMEN]);
    }
    wrap('drawArrays', draw); wrap('drawElements', draw); wrap('drawArraysInstanced', draw); wrap('drawElementsInstanced', draw); wrap('drawRangeElements', draw);
  }
  function progName(p) { for (var i = 0; i < PROGS.length; i++) if (PROGS[i].p === p) return PROGS[i].name; return '?'; }
  /* each pass's CPU, summed a second (the engine's prof() marks, on when the record is) */
  function recProf(name) {
    var now = clockNow();
    if (name !== 'frame' && REC.profName !== null) {
      var sec = Math.floor((now - REC.started) / 1000);
      if (sec >= 0 && sec < 1800) { var A = REC.stageCpu[name] || (REC.stageCpu[name] = new Float32Array(1800)); A[sec] += now - REC.profLast; }
    }
    REC.profName = name; REC.profLast = now;
  }
  function recMark(name) { if (REC) REC.boot.push([name, +clockNow().toFixed(1)]); }
  function recLink(P, ok) { if (REC) REC.links.push([P.name, +clockNow().toFixed(1), ok ? 1 : 0, shown ? 1 : 0]); }
  /* which phase an interval ending at ts falls in */
  function recPhase(ts) {
    var R = REC;
    if (R.halted) return PH_CTL;
    if (!shown) return PH_BOOT;
    if (ts <= R.resumeUntil) return PH_RES;
    if (ts <= R.resizeUntil) return PH_SIZE;
    if (ts <= R.dissolveUntil) return PH_DIS;
    return PH_STEADY;
  }
  /* the start of a frame: the interval that ends here closes with the tags of the frame before; the frame fence (the
     switch: every frame, every second frame, off) is polled once, and made again once it has signalled */
  var TAGN = ['cpu', 'stage', 'sync', 'stream', 'gpu', 'hold'];   // (Fix 2: hold, a frame in which the flight held at a junction for the next visit's build)
  function recStart(ts) {
    var R = REC, f = R.fr;
    f.c0 = clockNow();
    if (R.resumePending) { R.resumePending = false; R.lastTs = -1; R.resumeUntil = ts + 2000; }   // (a hidden tab or an app switch: the gap is not an interval)
    if (R.resizePending) { R.resizePending = false; R.resizeUntil = ts + 1000; }
    if (R.dissolveUntil === -2) R.dissolveUntil = ts + 2000;   // (the world shown in the frame before: its dissolve, from its first presented frame)
    if (R.lastTs >= 0) {
      var d = ts - R.lastTs, i = R.n & (RING - 1), ph = recPhase(ts);
      R.ints[i] = d; R.ph[i] = ph; R.tags[i] = R.tagsPrev; R.cpu[i] = R.cpuPrev; R.simt[i] = SIM.t; R.syn[i] = R.syncPrev; R.n++;
      R.cac[i] = R.cacPrev; R.arm[i] = R.armPrev; R.syF[i] = R.syFPrev; R.syP[i] = R.syPPrev; R.syR[i] = R.syRPrev; R.up[i] = R.upPrev; R.lay[i] = R.layPrev; R.prb[i] = R.prbPrev; R.lagF[i] = R.lagPrev; R.tsI[i] = ts;
      if (R.passOpen) { if (ts <= R.passOpen.at + 4000 && ph !== PH_CTL) recPassAdd(R.passOpen, d); else { R.passOpen.waitsAfter = SIM.waits - R.passOpen.waits; R.passOpen.at = undefined; R.passOpen = null; } }
      if (R.tagsPrev & 32) { R.hold.ms += d; if (R.holdCur) { R.holdCur.ms += d; if (R.holdCur.ms > R.hold.longestMs) R.hold.longestMs = +R.holdCur.ms.toFixed(1); } }   // (Fix 2: a held frame's interval)
      var P = R.P, sec = Math.floor((f.c0 - R.started) / 1000);
      if (sec >= 0 && sec < 1800) { R.perSec.frames[sec]++; if (d > 1.5 * R.k * P) R.perSec.miss[sec]++; }
      var L = R.longest[ph], top = TOPN[ph];
      if (L.length < top || d > L[L.length - 1][0]) {
        L.push([+d.toFixed(1), +(d / (R.k * P)).toFixed(2), tagStr(R.tagsPrev), +SIM.t.toFixed(2), +R.cpuPrev.toFixed(2), +R.syncPrev.toFixed(2), R.n - 1, PHN[ph], R.whyPrev]);
        L.sort(function (a, b) { return b[0] - a[0]; }); if (L.length > top) L.length = top;
      }
    }
    R.lastTs = ts;
    recPassage(ts);
    f.waits0 = SIM.waits || 0;
    f.sync = 0; f.syncN = 0; f.fence = 0; f.poll = 0; f.read = 0; f.stage = 0; f.stageWhy = ''; f.up = 0; f.upN = 0; f.gpu = 0; f.made = 0; f.rbBytes = 0; f.probes = 0; f.layers = 0;
    /* (E1) no fence of the record's own: the engine's read-back ring makes the frame's one fence (S3: at most one a
       frame) and its poll says whether the GPU was behind (recEnd: the gpu tag) */
    recCourse(f.c0);
    if (INP.evT0 === undefined) INP.evT0 = 0;
    REC.latPending = INP.evT0 && (INP.dx !== 0 || INP.dy !== 0) ? INP.evT0 : 0;
  }
  /* (E1, D3 "over ten passages: no interval over 3P") each passage the record sees while the world shows: the visit
     changing under the flight; the intervals from 2 s before it to 4 s after, their longest in kP, how many over 3 kP,
     the arm in force, the flight's waits for the next visit's build at the junction (S1's streamed build: the
     synchronous fallback is gone) */
  function recPassAdd(J, d) { var R = REC, x = d / (R.k * R.P); J.n++; if (x > J.maxKP) J.maxKP = +x.toFixed(2); if (x > 3) J.over3++; if (x > 1.5) J.misses++; }
  function recPassage(ts) {
    var R = REC; if (!shown || R.halted || !SIM.V) return;
    var vk = SIM.V.k; if (R.visitK < 0) { R.visitK = vk; return; }
    if (vk === R.visitK) return;
    R.visitK = vk; if (R.pass.length >= 60) return;
    if (R.passOpen) { R.passOpen.waitsAfter = SIM.waits - R.passOpen.waits; R.passOpen.at = undefined; }
    /* (Fix 2) the flight holds before the visit changes (simStep waits at the junction): the waits are counted since
       the last passage (round E1 counted only those after the change, so junctionWaits was 0 by construction), with
       the held frames' wall time, and the window looks back to the hold's start */
    var J = { visit: vk, realm: SIM.V.id, sim: +SIM.t.toFixed(2), wallS: +((clockNow() - R.started) / 1000).toFixed(1), arm: R.armNow ? ARMS[R.armNow - 1].id : null, phase: PHN[recPhase(ts)], n: 0, maxKP: 0, over3: 0, misses: 0, waits: SIM.waits, waitsAfter: 0, at: ts,
      waitsBefore: SIM.waits - R.waitsAtJ, heldMs: +(R.hold.ms - R.heldAtJ).toFixed(1), raise: 0, raiseFrames: 0 };   // (Fix 3: the next visit's largest bake budget raised before this passage, and its frames)
    var back = Math.min(ts - 2000, R.holdFirstTs >= 0 ? R.holdFirstTs : ts);
    for (var q = 1; q <= Math.min(R.n, RING, 20000); q++) { var ii = (R.n - q) & (RING - 1); if (R.tsI[ii] <= back) break; if (R.ph[ii] !== PH_CTL) recPassAdd(J, R.ints[ii]); }
    R.waitsAtJ = SIM.waits; R.heldAtJ = R.hold.ms; R.holdFirstTs = -1;
    R.pass.push(J); R.passOpen = J;
  }
  function tagStr(m) { var o = []; for (var i = 0; i < TAGN.length; i++) if (m & (1 << i)) o.push(TAGN[i]); return o.join('+'); }
  /* the end of a frame: its tags */
  var UPCAP = 256 * 1024;   // (the high tier's upload cap a frame, 5.4: an upload over it is stage work; E2a/E3a enforce it)
  function recEnd(ts) {
    var R = REC, f = R.fr, cpu = clockNow() - f.c0, P = R.P, t = 0;
    if (f.up > UPCAP) { f.stage |= 32; f.stageWhy = 'upload ' + Math.round(f.up / 1024) + ' KB'; if (shown) R.upAfter.overCap++; }
    if (cpu > 0.5 * R.k * P) t |= 1;
    if (f.stage) t |= 2;
    if (f.sync >= 1) t |= 4;
    if (f.up > RECALLOW.bytes || WORK.layers > RECALLOW.layers || f.upN > RECALLOW.calls) t |= 8;
    if (RB.lagged && shown) { f.gpu = 1; R.fenceLag++; }
    if (shown && RB.polled !== R.rbPolledLast) { R.fencePolls++; R.rbPolledLast = RB.polled; }
    R.fenceN = RB.made;
    if (f.gpu) t |= 16;
    /* (Fix 2) the flight held in this frame at a junction (SIM.waits grew): tagged hold, counted (frames, wall ms, each
       hold apart) and carried to the passage it ends in (recPassage: junctionWaits, heldMs, its window from the hold's
       start). A hold is the flight stopped in the cloud: it fails the run here and on the phone */
    if ((SIM.waits || 0) > f.waits0 && shown && !R.halted) {
      t |= 32; R.hold.frames++;
      if (!R.holdCur) { R.holdCur = { at: +SIM.t.toFixed(2), wallS: +((clockNow() - R.started) / 1000).toFixed(1), frames: 0, ms: 0 }; R.hold.n++; if (R.holdFirstTs < 0) R.holdFirstTs = R.lastTs; if (R.hold.list.length < 60) R.hold.list.push(R.holdCur); }
      R.holdCur.frames++;
    } else if (R.holdCur && !((SIM.waits || 0) > f.waits0)) R.holdCur = null;
    R.tagsPrev = t; R.cpuPrev = cpu; R.syncPrev = f.sync; R.whyPrev = f.stage ? f.stageWhy : '';
    R.cacPrev = SW.cacc > 0 ? 1 : 0; R.armPrev = R.armNow || 0; R.syFPrev = f.fence; R.syPPrev = f.poll; R.syRPrev = f.read; R.upPrev = f.up; R.layPrev = Math.min(WORK.layers, 65535); R.prbPrev = Math.min(f.probes, 65535); R.lagPrev = f.gpu ? 1 : 0;
    if (shown && !R.halted) { if (f.syncN > R.syncMaxFrame) R.syncMaxFrame = f.syncN; if (f.sync > R.syncSumMaxFrame) R.syncSumMaxFrame = f.sync; }
    else { if (f.syncN > R.syncMaxBoot) R.syncMaxBoot = f.syncN; if (f.sync > R.syncSumMaxBoot) R.syncSumMaxBoot = f.sync; }
    if (f.stage && shown) { if (!R.stageEv) R.stageEv = []; if (R.stageEv.length < 200) R.stageEv.push([+SIM.t.toFixed(2), f.stageWhy]); }
    if (R.latPending && INP.dx === 0 && INP.dy === 0) { if (R.lat.length < 4000) R.lat.push(+(ts - R.latPending).toFixed(1)); INP.evT0 = 0; }
    // the period: learnt as the governor learns it (its median of a second's frames, held under a cap it finds)
    R.P = GOVN[13] > 0 ? GOVN[13] : 1000 / 60;
    if (!R.rung.length || R.rung[R.rung.length - 1][1] !== RUNG) R.rung.push([+SIM.t.toFixed(2), RUNG]);
    var p = +R.P.toFixed(1); if (!R.period.length || R.period[R.period.length - 1][1] !== p) R.period.push([+SIM.t.toFixed(2), p]);
    if (MOTION.on && R.oriF.length < 6000 && FRAMEN % 2 === 0) R.oriF.push([+ts.toFixed(1), +(MOTION.sy / DEG).toFixed(2), +(MOTION.sp / DEG).toFixed(2), +(MOTION.yaw / DEG).toFixed(2), +(MOTION.pitch / DEG).toFixed(2)]);
    var m = Math.floor((clockNow() - R.started) / 60000);
    if (R.minute.length <= m) R.minute.push(recSnap());
  }
  var RECALLOW = { bytes: 256 * 1024, layers: 24, calls: 6 };   // (the stream tag's allowance: provisional until E1's A/B sets it on the phone)
  function recSnap() {
    var mm = devMem();
    return { t: +((clockNow() - REC.started) / 1000).toFixed(0), sim: +SIM.t.toFixed(1), realm: SIM.V ? SIM.V.id : null, visit: SIM.V ? SIM.V.k : -1, rung: RUNG, period: +REC.P.toFixed(1),
      cells: mm.cells, vols: mm.vols, volMB: mm.volMB, meshMB: mm.meshMB, probes: mm.probesInFlight, gln: null, frames: REC.n, words: WORDCOL };
  }
  /* the record mode: a scripted course while the owner leaves the phone. The A/B halves alternate a live switch in two
     minutes at a time (ABAB, then the last two minutes A, with the owner's own drags if any). (hotfix H1, design-v5
     Revision 3) The course flies straight: its synthetic drags (52 deg/s, 1 s every 20 s in minutes 2-8) are gone, so
     the view turns only when the visitor drags, and the input's latency (D6) is measured from the visitor's own drags
     alone (course.drags stays 0) */
  /* (E1) the five arms of E1's A/B pairs (design-v5 4.3, 7.5, 3.6): A the design's frame (the GPU jobs before the
     draws, the fence at the frame's start every frame), B the jobs after the flush (the order's pair: A against B), C
     the fence every second frame, D the fence after the flush, E the read-back all but off (the fence's pairs: A
     against C, D and E). In blocks of BLOCK_S (20 s), a rotation of the five a cycle (block b: arm (b + cycle) mod 5),
     so in a ten-minute course each arm runs six blocks, two minutes, each once in every place of the cycle; every
     interval is tagged with the arm in force when its frame began, and the record sums each arm apart (recArms) */
  var ARMS = [{ id: 'A', order: 0, fence: 1, what: 'jobs before the draws; fence at the start, every frame (the design)' }, { id: 'B', order: 1, fence: 1, what: 'jobs after the flush' },
    { id: 'C', order: 0, fence: 2, what: 'fence every second frame' }, { id: 'D', order: 0, fence: 3, what: 'fence after the flush' }, { id: 'E', order: 0, fence: 0, what: 'read-back all but off (every eighth frame)' }];
  var BLOCK_S = 20, CACC_ON = 0.5;   // (E1.1: the accumulation's share when on in the course)
  function recArmAt(s) { var b = Math.floor(s / BLOCK_S), c = Math.floor(b / ARMS.length); return (b + c) % ARMS.length; }
  function recCourse(now) {
    var C = REC.course; if (!C || !shown || REC.halted) return;
    var s = (now - C.t0) / 1000;
    if (C.e1) {
      if (C.ended) return;
      var a = recArmAt(s);
      if (REC.armNow !== a + 1) { REC.armNow = a + 1; recSet('order', ARMS[a].order, 'arm ' + ARMS[a].id); recSet('fence', ARMS[a].fence, 'arm ' + ARMS[a].id); REC.armLog.push([+s.toFixed(2), ARMS[a].id]); }
      // (E1.1, item 5) the clouds' accumulation off in every second cycle of the five (three of the six a course), so each
      // arm runs three blocks with it and three without: the record sums them apart (rec.arms[k].cacc, rec.cacc)
      var cy = Math.floor(Math.floor(s / BLOCK_S) / ARMS.length), cw = cy % 2 ? 0 : CACC_ON;
      if (SW.cacc !== cw) { recSet('cacc', cw, 'cacc arm'); REC.armLog.push([+s.toFixed(2), 'cacc ' + cw]); }
    } else if (C.ab) {
      var half = Math.floor(s / 120), want = half >= 4 ? C.ab[0] : C.ab[half % 2];
      if (SW[C.name] !== want) recSet(C.name, want, 'course');
    }
    C.last = now;
  }
  function recSet(k, v, why) {
    if (!(k in SW)) return false;
    var nv = typeof SW[k] === 'number' ? (+v || 0) : String(v);
    if (SW[k] === nv) return true;
    if (!SWLIVE[k] && READY && !(k === 'ab' && !shown)) return false;   // (a boot-time switch: next load; the A/B arm until the course begins, as the world shows)
    SW[k] = nv; if (REC) REC.sw.push([+((clockNow() - REC.started) / 1000).toFixed(2), k, nv, why || 'set']);
    if (k === 'birds' && !nv && BIRDS && BIRDS.visit) BIRDS.visit(-1);   // (the module's sky cleared: it begins again when they return)
    return true;
  }
  function recShown() {
    if (!REC) return;
    REC.shownAt = clockNow(); REC.dissolveEnd = REC.shownAt + 2000; REC.dissolveUntil = -2; recMark('shown (dissolve begins)');
    if (!REC.course && SW.course) REC.course = { t0: REC.shownAt, last: -1, down: false, n: 0, e1: SW.ab === 'e1', name: SW.ab === 'fence' ? 'fence' : SW.ab === 'order' ? 'order' : null, ab: SW.ab === 'fence' ? [1, 2] : SW.ab === 'order' ? [0, 1] : null };
    if (REC.course && !REC.course.name) REC.course.ab = null;
  }
  /* (Fix 2) the window was resized or rotated (its second is not steady flight), or the page came back from a hidden
     tab or an app switch (diag tells: the world has no visibility listener, 18.5): the interval across the gap is
     dropped and the next 2 s are the resume's */
  function recResized() { if (REC) REC.resizePending = true; }
  function recVisibility(hidden) { if (!REC) return; if (hidden) REC.hidden++; else REC.resumePending = true; }
  /* the record, as diag reads it (plain numbers; the rings cut to what was recorded). The gates' numbers are steady
     flight's; each other phase is summarised apart */
  function phaseStats(vals, n, misses, tagged, over3, byTag, P, k) {
    vals.sort(function (a, b) { return a - b; });
    function q(x) { return vals.length ? +vals[Math.min(vals.length - 1, Math.floor(x * vals.length))].toFixed(2) : null; }
    return { frames: n, p50: q(0.5), p90: q(0.9), p99: q(0.99), p999: q(0.999), max: q(1), misses: misses, missesTagged: tagged, over3kP: over3, missesByTag: byTag };
  }
  /* (E1.1 Fix 2, the lead's ruling) the samples' plan with the memory facts: the samples asked and made, the targets' MB,
     the context's losses and restores, samples the driver would not make, and the governor's give-up, so a record
     that shows memory pressure on the phone can bring the question back */
  function memRec() {
    var o = {}, k; if (MEMP) for (k in MEMP) o[k] = MEMP[k];
    o.aaNow = AAS; o.msMade = !!(TG && TG.ms); o.lost = MEMN.lost; o.restored = MEMN.restored; o.msFail = MEMN.msFail; o.gaveUp = !!GAVEUP;
    return o;
  }
  function recGet(full) {
    var R = REC, n = Math.min(R.n, RING), P = R.P, kP = R.k * P, i, j, hist = new Array(64).fill(0), ints = [], cbs = [], phs = [], sts = [], ars = [];
    var start = R.n - n, vals = [[], [], [], [], [], []], mis = [0, 0, 0, 0, 0, 0], tg = [0, 0, 0, 0, 0, 0], o3 = [0, 0, 0, 0, 0, 0], bt = [];
    for (j = 0; j < 6; j++) bt.push({ cpu: 0, stage: 0, sync: 0, stream: 0, gpu: 0, hold: 0, none: 0 });
    for (j = 0; j < n; j++) {
      i = (start + j) & (RING - 1);
      var d = R.ints[i], ph = R.ph[i];
      vals[ph].push(d);
      if (ph === PH_STEADY) hist[Math.min(63, Math.floor(d / kP * 10))]++;
      if (d > 1.5 * kP) { mis[ph]++; var t = R.tags[i]; if (t) tg[ph]++; else bt[ph].none++; for (var b2 = 0; b2 < TAGN.length; b2++) if (t & (1 << b2)) bt[ph][TAGN[b2]]++; }
      if (d > 3 * kP) o3[ph]++;
      if (full) { ints.push(+d.toFixed(1)); cbs.push(+R.cpu[i].toFixed(3)); phs.push(ph); sts.push(+R.simt[i].toFixed(3)); ars.push(R.arm[i]); }
    }
    var S = phaseStats(vals[PH_STEADY], vals[PH_STEADY].length, mis[PH_STEADY], tg[PH_STEADY], o3[PH_STEADY], bt[PH_STEADY], P, R.k), phases = {};
    for (j = 0; j < 6; j++) if (j !== PH_STEADY) { var st = phaseStats(vals[j], vals[j].length, mis[j], tg[j], o3[j], bt[j], P, R.k); st.longest = R.longest[j]; phases[PHN[j]] = st; }
    var cpuS = {}; for (var k in R.stageCpu) { var A = R.stageCpu[k], o = []; var last = Math.min(1800, Math.ceil((clockNow() - R.started) / 1000)); for (j = 0; j < last; j++) o.push(+A[j].toFixed(1)); cpuS[k] = o; }
    var secs = Math.min(1800, Math.ceil((clockNow() - R.started) / 1000)), missS = [], frS = [];
    for (j = 0; j < secs; j++) { missS.push(R.perSec.miss[j]); frS.push(R.perSec.frames[j]); }
    // low power, inferred: a steady 2P (33 ms) with short callbacks and fences signalled (steady flight's)
    var med = S.p50, cpuMed = 0; if (n) { var cc = []; for (j = Math.max(0, n - 3600); j < n; j++) { i = (start + j) & (RING - 1); if (R.ph[i] === PH_STEADY) cc.push(R.cpu[i]); } cc.sort(function (a, b) { return a - b; }); cpuMed = cc[Math.floor(cc.length / 2)] || 0; }
    var lp = med !== null && med > 30 && med < 36.5 && cpuMed < 8 && R.fencePolls > 0 && R.fenceLag / R.fencePolls < 0.05;
    var syncOut = {}; for (k in R.sync) if (R.sync[k][0] || R.sync[k][2]) syncOut[k] = { boot: [R.sync[k][0], +R.sync[k][1].toFixed(2)], world: [R.sync[k][2], +R.sync[k][3].toFixed(2)] };
    return {
      d8: recD8(),   // (Fix 3: the world's first frame from navigation start, raw, first in the record)
      v: 'E1', round: 'E1.1', fix: 3, build: BUILD, period: +P.toFixed(2), k: R.k, frames: R.n, kept: n,   // (Fix 3: build, world.js's md5 prefix as built before the tag was written in: records of two builds can be told apart)
      arms: recArms(), cacc: REC.course && REC.course.e1 ? recCaccSplit(0) : null, armDefs: ARMS, armLog: R.armLog.slice(0, 200),
      passages: R.pass.map(function (J) { return { visit: J.visit, realm: J.realm, sim: J.sim, wallS: J.wallS, arm: J.arm, phase: J.phase, frames: J.n, maxKP: J.maxKP, over3kP: J.over3, misses: J.misses, junctionWaits: J.waitsBefore + J.waitsAfter, waitsBefore: J.waitsBefore, waitsAfter: J.waitsAfter, heldMs: J.heldMs, bakeRaise: J.raise, bakeRaiseFrames: J.raiseFrames }; }),   // (D3: each passage's window, 2 s before it (or from its hold's start) to 4 s after; Fix 2: its waits counted before the change)
      holds: { n: R.hold.n, frames: R.hold.frames, ms: +R.hold.ms.toFixed(1), longestMs: R.hold.longestMs, list: R.hold.list },   // (Fix 2: every hold at a junction while the world shows; expected none)
      // the gates' numbers: steady flight only (3.1; D1-D3)
      steadyFrames: S.frames, percentiles: { p50: S.p50, p90: S.p90, p99: S.p99, p999: S.p999, max: S.max }, hist10thKP: hist, misses: S.misses, missesTagged: S.missesTagged, over3kP: S.over3kP, missesByTag: S.missesByTag,
      longest: R.longest[PH_STEADY], phases: phases,   // (boot, dissolve (D3), control, resume, resize: each with its own percentiles, misses, tags and longest)
      missPerSec: missS, framesPerSec: frS, cpuPerSec: cpuS,
      sync: syncOut, syncCallsMaxFrame: R.syncMaxFrame, syncMsMaxFrame: +R.syncSumMaxFrame.toFixed(2), syncCallsMaxBootFrame: R.syncMaxBoot, syncMsMaxBootFrame: +R.syncSumMaxBoot.toFixed(2),
      fence: { made: R.fenceN, polled: R.fencePolls, lagged: R.fenceLag, frac: R.fencePolls ? +(R.fenceLag / R.fencePolls).toFixed(4) : null },
      cadence: [[0, 1]], rung: R.rung, periodTrace: R.period, panics: 0,
      boot: R.boot, scripts: R.regs, scriptEval: recScripts(), links: R.links, progFirstUse: R.prog1, pipelineKeys: R.keys,
      bootStages: { marks: BOOT.marks, frames: BOOT.frames, sliceMaxMs: +BOOT.sliceMax.toFixed(2), slicesOver8: BOOT.sliceOver, longestSlices: BOOT.slices.slice().sort(function (a, b) { return b[1] - a[1]; }).slice(0, 12), declined: BOOT.declined,
        G: { pinned: GS.pinned, period: GS.P ? +GS.P.toFixed(2) : null, roundTripMs: GS.rt.map(function (x) { return +x.toFixed(2); }), trialsMs: GS.tr, mediansMs: GS.med, scales: GS.sc, pick: GS.pick, rung: GS.rung },
        H: { ok: BOOT.hOk, fails: BOOT.hFails, thumb: BOOT.thumbStat || null }, warm: { keys: WARM.list ? WARM.list.length : 0, frames: WARM.frames, ms: WARM.ms.slice(0, 80).map(function (w) { return [w[0], w[1], w[2], recFrameMs(w[2])]; }) },   // (Fix 2: [key, draw call ms, frame, that frame's interval ms])
        programs: { n: PROGS.length, broken: PROGX.broken, par: !!EXT.par, each: PROGS.map(function (P) { return [P.name, P.kb || 0, P.cms || 0, P.lms || 0, P.fms || 0, P.doneAt || null]; }), one: recProgs() },
        waits: { start: BOOT.bw }, birdFrames: recBirdFrames(), noise: { K: NOISE.K, fixed: NOISE.fixed } },   // (Fix 3: the yield is gone; the first-use draws' and G's waits for today's first flight, and the boot frames over 50 ms while it was in view)
      readback: { bakeAIMD: { layers: FBAKE.n, lagged: FBAKE.lagged, halvings: FBAKE.halvings, late: FBAKE.late }, nextDeadline: null, fencesMade: RB.made, polls: RB.polled, reads: RB.reads, readKB: Math.round(RB.readBytes / 1024), slotSkips: RB.skipped, fenceSkips: RB.fenceSkipped, lagged: RB.lagN, forcedReads: RB.forced || 0, probes: PSTAT, junctionWaits: SIM.waits, wordsTrim: typeof AG !== 'undefined' ? AG.trim : null, wordsMiss: typeof AG !== 'undefined' ? AG.miss : null },   // ((line2) wordsTrim: the words' reads made without the line's block for room in the slot; wordsMiss: those refused even so)   // (forcedReads: the dev harness's unconditional reads, Fix 2; 0 in a live visit)
      madeAfterShown: R.madeAfter, freedAfterShown: R.freedAfter, uploadsAfterShown: R.upAfter, stageEvents: R.stageEv || [],
      pools: R.minute, objPools: { pre: POOL_PRE, cap: POOL_CAP, madeShown: POOL.madeShown, made: POOL.made, reused: POOL.reused, peakLive: POOL.peakLive, deleted: POOL.deleted, free: (function () { var o = {}; POOL_KINDS.forEach(function (k) { o[k] = POOL.lists[k].length; }); return o; })() },   // (Fix 3: the cells' and visits' object pools)
      flips: R.flips, firstFlipAfterDissolve: R.firstFlip,
      tod: recTod(R),   // (tod: the cycle each second (t, sky, next, k, q, qs, group, words, ceiling), the landing, every ink flip with its reason (sky, ground, rescue, take), the bars' writes, the ceiling's engaged share, the boot's thumbnail)
      keepout: null, contrast: null,   // (E6: the keep-out and the statistics pass do not exist yet)
      inputLatencyMs: R.lat, orientRaw: R.ori, orientFiltered: R.oriF,
      device: { renderer: EXT.renderer, floatRT: FLOAT_RT, f32: FLOAT32_RT, aa: AAS, memPlan: memRec(), vol16: VOL16, filtErr: +FILTERR.toFixed(5), par: !!EXT.par, out: [OUT.w, OUT.h, +OUT.dpr.toFixed(3)], full: [FULL.w, FULL.h, +FULL.dpr.toFixed(3)], css: [Math.round(OUT.cssW), Math.round(OUT.cssH)], dpr: window.devicePixelRatio || 1, mem: navigator.deviceMemory || null, cores: navigator.hardwareConcurrency || null, classGuess: null, hints: DEVHINT, warmup: { pinned: GS.pinned, mediansMs: GS.med, rung: GS.rung, period: GS.P ? +GS.P.toFixed(2) : null } },
      context: { top: recTop(), touch: TOUCHMODE, motion: MOTION.st, viewport: [window.innerWidth, window.innerHeight], reduced: reduced(), forced: forced(), lost: LOST, dead: DEAD, gaveUp: GAVEUP, ready: READY, shown: shown, hiddenTimes: R.hidden, error: FAILMSG ? String(FAILMSG).slice(0, 2000) : null },
      switches: SW, switchLog: R.sw, course: R.course ? { drags: R.course.n, ab: R.course.name, halves: R.course.ab } : null, control: R.ctl,
      lowPowerInferred: lp, callbackMedianMs: +cpuMed.toFixed(2), state: { t: +SIM.t.toFixed(1), realm: SIM.V ? SIM.V.id : null, visit: SIM.V ? SIM.V.k : -1, words: WORDCOL },
      ints: full ? ints : undefined, callbackMs: full ? cbs : undefined, intPhases: full ? phs : undefined, intSimT: full ? sts : undefined, intArms: full ? ars : undefined
    };
  }
  function recTod(R) {   // (tod; the record's unit test runs the record alone, without the cycle: null there)
    if (typeof SKY === 'undefined' || typeof AG === 'undefined') return null;
    return { cycle: R.cycle || [], landing: SKY.landing || null, inks: AG.log.slice(0, 400), theme: { writes: THEME.n, last: THEME.hex }, ceilEngaged: R.cycle ? +(R.cycle.filter(function (c) { return c[8] < 1.5; }).length / Math.max(1, R.cycle.length)).toFixed(3) : 0, thumb: BOOT.thumbStat || null };
  }
  /* (E1) each arm's own numbers, from steady flight's intervals tagged with it: what the lead reads back to settle the
     frame's order and the fence's place (design-v5 4.3, 7.5): the interval percentiles and histogram in tenths of kP
     (D2), the misses with their tags (D1), the intervals over 3 kP (D3), the synchronous calls' ms a frame, each of
     fenceSync, the poll and the read (D9), the fence's lag, and the frames and misses by the GPU jobs' size in the frame
     before (the stream tag's allowance: bytes uploaded, bake units, probe points) */
  function recArms() {
    var R = REC; if (!R.course || !R.course.e1) return null;
    var n = Math.min(R.n, RING), start = R.n - n, kP = R.k * R.P, out = [], a, j, i;
    var UPB = [0, 16384, 65536, 262144], LYB = [0, 8, 16, 24], PRB = [0, 512, 2048];
    function bin(x, edges) { var b = 0; for (var q = 0; q < edges.length; q++) if (x > edges[q]) b = q + 1; return b; }
    for (a = 0; a < ARMS.length; a++) {
      var vals = [], hist = new Array(64).fill(0), mis = 0, tg = 0, o3 = 0, bt = { cpu: 0, stage: 0, sync: 0, stream: 0, gpu: 0, hold: 0, none: 0 }, sF = 0, sP = 0, sR = 0, sMax = 0, lag = 0, fr = 0;
      var up = [[0, 0], [0, 0], [0, 0], [0, 0], [0, 0]], ly = [[0, 0], [0, 0], [0, 0], [0, 0], [0, 0]], pr = [[0, 0], [0, 0], [0, 0], [0, 0]];
      for (j = 0; j < n; j++) {
        i = (start + j) & (RING - 1);
        if (R.ph[i] !== PH_STEADY || R.arm[i] !== a + 1) continue;
        var d = R.ints[i], miss = d > 1.5 * kP ? 1 : 0;
        vals.push(d); hist[Math.min(63, Math.floor(d / kP * 10))]++; fr++;
        if (miss) { mis++; var t = R.tags[i]; if (t) tg++; else bt.none++; for (var b2 = 0; b2 < TAGN.length; b2++) if (t & (1 << b2)) bt[TAGN[b2]]++; }
        if (d > 3 * kP) o3++;
        var s3 = R.syF[i] + R.syP[i] + R.syR[i]; sF += R.syF[i]; sP += R.syP[i]; sR += R.syR[i]; if (s3 > sMax) sMax = s3;
        lag += R.lagF[i];
        var ub = up[bin(R.up[i], UPB)]; ub[0]++; ub[1] += miss; var lb = ly[bin(R.lay[i], LYB)]; lb[0]++; lb[1] += miss; var pb = pr[bin(R.prb[i], PRB)]; pb[0]++; pb[1] += miss;
      }
      var st = phaseStats(vals, fr, mis, tg, o3, bt, R.P, R.k), cs = recCaccSplit(a + 1);
      out.push({ cacc: cs, arm: ARMS[a].id, what: ARMS[a].what, order: ARMS[a].order, fence: ARMS[a].fence, frames: fr, p50: st.p50, p90: st.p90, p99: st.p99, p999: st.p999, max: st.max, hist10thKP: hist, misses: mis, missesTagged: tg, missesByTag: bt, over3kP: o3,
        syncMsPerFrame: fr ? { fence: +(sF / fr).toFixed(4), poll: +(sP / fr).toFixed(4), read: +(sR / fr).toFixed(4), all: +((sF + sP + sR) / fr).toFixed(4), maxFrame: +sMax.toFixed(2) } : null,
        fenceLagFrac: fr ? +(lag / fr).toFixed(4) : null,
        jobs: { uploadBytes: { edges: UPB, framesMisses: up }, bakeUnits: { edges: LYB, framesMisses: ly }, probePoints: { edges: PRB, framesMisses: pr } } });
    }
    return out;
  }
  /* (E1.1, item 5) steady flight's intervals of one arm (0: every arm) with the clouds' accumulation on and off: frames,
     percentiles, misses with their tags (gpu: the fence still unsignalled at the next frame), the fence's lag: what the
     accumulation's pass costs on this device */
  function recCaccSplit(arm) {
    var R = REC, n = Math.min(R.n, RING), start = R.n - n, kP = R.k * R.P, out = {}, c, j, i;
    for (c = 0; c < 2; c++) {
      var vals = [], mis = 0, tg = 0, o3 = 0, bt = { cpu: 0, stage: 0, sync: 0, stream: 0, gpu: 0, hold: 0, none: 0 }, lag = 0, fr = 0;
      for (j = 0; j < n; j++) {
        i = (start + j) & (RING - 1);
        if (R.ph[i] !== PH_STEADY || R.cac[i] !== c || (arm && R.arm[i] !== arm) || !R.arm[i]) continue;
        var d = R.ints[i]; vals.push(d); fr++; lag += R.lagF[i];
        if (d > 1.5 * kP) { mis++; var t = R.tags[i]; if (t) tg++; else bt.none++; for (var b2 = 0; b2 < TAGN.length; b2++) if (t & (1 << b2)) bt[TAGN[b2]]++; }
        if (d > 3 * kP) o3++;
      }
      var st = phaseStats(vals, fr, mis, tg, o3, bt, R.P, R.k);
      out[c ? 'on' : 'off'] = { frames: fr, p50: st.p50, p90: st.p90, p99: st.p99, misses: mis, missesByTag: bt, over3kP: o3, fenceLagFrac: fr ? +(lag / fr).toFixed(4) : null };
    }
    return out;
  }
  /* (Fix 3, D8) the world's first frame from navigation start, raw and net of the boot's wait for today's first bird
     (boot due to boot start: E0's trade of D8 for B5, which design 14 does not have; 3.2 D8's ceiling is 3.0 s) */
  /* (Fix 2 of round E1) each program one at a time, in the order stage C made them: when it was issued (its compile and
     link given: clock ms from navigation, and the frame), when it was found done (the same), the frame interval
     containing each (from that boot frame's rAF to the next one's: a frame that carried its link or its first draw),
     its completion queries (how many, their time on the main thread: a query that waits shows here), the main thread's
     compile, link and status calls, and its first use (the warm table's draw, or the noise's first layers) with that
     frame's interval. The record can then say which program is slow on the phone (the lead's ask) */
  function recFrameMs(f) {   // the interval from boot frame f's rAF to the next one's, or null
    var A = BOOT.fts; if (!A || f === undefined || f === null) return null;
    for (var i = 0; i + 2 < A.length; i += 2) if (A[i] === f) return +(A[i + 3] - A[i + 1]).toFixed(1);
    return null;
  }
  function recProgs() {
    var L = PORDER || PROGS, out = [];
    for (var i = 0; i < L.length; i++) {
      var P = L[i];
      out.push({ name: P.name, kb: P.kb || 0, issueAt: P.issAt === undefined ? null : P.issAt, issueF: P.issF === undefined ? null : P.issF, issueFrameMs: recFrameMs(P.issF),
        doneAt: P.doneAt || null, doneF: P.doneF === undefined ? null : P.doneF, doneFrameMs: recFrameMs(P.doneF), wallMs: P.doneAt && P.issAt !== undefined ? +(P.doneAt - P.issAt).toFixed(1) : null,
        polls: P.polls || 0, pollMs: P.qms || 0, compileMs: P.cms || 0, linkMs: P.lms || 0, statusMs: P.fms || 0, ok: !!P.ok,
        firstAt: P.firstAt || null, firstF: P.firstF === undefined ? null : P.firstF, firstMs: P.firstMs === undefined ? null : P.firstMs, firstFrameMs: recFrameMs(P.firstF), heavy: !!P.heavy });
    }
    return out;
  }
  function recD8() {   // (Fix 3 of round E1: judged raw, as design-v5 3.2 defines it; no yield to net out any more)
    var R = REC, st = -1, told = -1, i, b;
    for (i = 0; i < R.boot.length; i++) { b = R.boot[i]; if (b[0].indexOf('boot start') === 0 && st < 0) st = b[1]; else if (b[0].indexOf('hand-over told') === 0 && told < 0) told = b[1]; }
    var shown = R.shownAt >= 0 ? R.shownAt : -1;
    return { firstFrameMs: shown >= 0 ? +shown.toFixed(1) : null, ceilingMs: 3000, within: shown >= 0 ? shown <= 3000 : null, from: 'navigation start',
      bootStartMs: st >= 0 ? +st.toFixed(1) : null, bootWaitMs: BOOT.bw.ms, bootWaitWhy: BOOT.bw.why, handoverToldMs: told >= 0 ? +told.toFixed(1) : null };
  }
  /* (Fix 3, B5) the boot frames over 50 ms while a bird of today's first flight was in view (skyAir.flying 2 at the
     frame's start): [frame, interval ms, the slice's label (the stage and the program or key it carried)], at most 40,
     with their count and the longest; and how long the first flight was in view during the boot */
  function recBirdFrames() {
    var A = BOOT.fts, Fl = BOOT.fly, out = [], n = 0, mx = 0, inView = 0, lab = {}, i;
    for (i = 0; i < BOOT.slices.length; i++) lab[BOOT.slices[i][0]] = BOOT.slices[i][2];
    for (i = 0; i + 2 < A.length; i += 2) {
      if (Fl[i >> 1] !== 2) continue;
      var d = A[i + 3] - A[i + 1]; inView += d;
      if (d > 50) { n++; if (d > mx) mx = d; if (out.length < 40) out.push([A[i], +d.toFixed(1), lab[A[i]] || '']); }
    }
    return { over50: n, maxMs: +mx.toFixed(1), inViewMs: +inView.toFixed(1), rests: BOOT.rests || 0, list: out };   // (E1.1 Fix 2: rests, the frames left free after a heavy one)
  }
  /* (Fix 3, D8's "each script's evaluation") every script's evaluation, bounded by what can be known without reading a
     clock inside it: world.js stamps its own start and end; each realm file and the ink birds stamp their top and
     register as their last statement (exact); the kit's end is the next file's top; today's birds (deferred, before
     world.js) start no sooner than both its response's end and the parse's end (domInteractive) and end no later
     than world.js's start; the parser-blocking hour.v2.js and site.js lie between their response's end and the parse's
     end. Each: { name, how: 'exact' | 'bounds', start, end (or startMin, endMax), ms (or msMax) } in ms from navigation */
  function recScripts() {
    var out = [], nav = null, res = {}, st = {}, i, k;
    try { nav = performance.getEntriesByType('navigation')[0] || null; (performance.getEntriesByType('resource') || []).forEach(function (e) { var m = /\/([^\/?#]+)(?:[?#].*)?$/.exec(e.name); if (m) res[m[1]] = e; }); } catch (e) { /* no timing */ }
    var di = nav ? nav.domInteractive : -1, R = REC, DIAGEV = null, afterDiag = false;
    for (i = 0; i < R.regs.length; i++) st[R.regs[i][0]] = R.regs[i][1];
    for (i = 0; i < R.boot.length; i++) if (R.boot[i][0] === 'world.js eval start' || R.boot[i][0] === 'world.js eval end') st[R.boot[i][0]] = R.boot[i][1];
    var scripts; try { scripts = document.querySelectorAll('script[src]'); } catch (e) { return { error: 'no document' }; }
    var order = []; for (i = 0; i < scripts.length; i++) { var m2 = /(?:^|\/)([^\/?#]+)(?:[?#].*)?$/.exec(scripts[i].getAttribute('src') || ''); if (m2) order.push({ name: m2[1], defer: scripts[i].defer }); }   // (E1: a bare relative src too: the preview's)
    function r1(x) { return x === null || x < 0 ? null : +x.toFixed(1); }
    function base(n) { return n.replace(/\.v\d+(?=\.js$)/, ''); }   // (production's versioned names: world.v1.js stamps as world.js)
    function regOf(n) { var b = base(n); if (b === 'inkbirds.js') return st.inkbirds; var m3 = /^realm-(\w+)\.js$/.exec(b); return m3 ? st['realm ' + m3[1]] : undefined; }
    for (i = 0; i < order.length; i++) {
      var o = order[i], b = base(o.name), e = res[o.name], rEnd = e ? e.responseEnd : -1, top = st[b + ' top'], reg = regOf(o.name), x = { name: o.name, responseEnd: r1(rEnd) };
      if (b === 'world.js' && st['world.js eval start'] !== undefined && st['world.js eval end'] !== undefined) { x.how = 'exact'; x.start = r1(st['world.js eval start']); x.end = r1(st['world.js eval end']); x.ms = r1(x.end - x.start); }
      else if (b === 'diag.js' && DIAGEV) { x.how = 'exact'; x.start = r1(DIAGEV[0]); x.end = r1(DIAGEV[1]); x.ms = r1(DIAGEV[1] - DIAGEV[0]); afterDiag = true; }   // (staging and the preview: diag.js stamps its own evaluation)
      else if (top !== undefined && reg !== undefined) { x.how = 'exact'; x.start = r1(top); x.end = r1(reg); x.ms = r1(reg - top); }
      else if (top !== undefined) {   // (the kit: its end is the next file's top)
        var nx = null; for (k = i + 1; k < order.length && nx === null; k++) { var bt = st[base(order[k].name) + ' top']; if (bt !== undefined) nx = bt; }
        x.how = 'bounds'; x.start = r1(top); x.endMax = r1(nx); x.msMax = nx !== null ? r1(nx - top) : null;
      } else if (o.defer && st['world.js eval start'] !== undefined && order.slice(i + 1).some(function (q) { return base(q.name) === 'world.js'; })) {   // (today's birds, and diag on staging: deferred, before world.js, no stamp of their own)
        var s0 = Math.max(rEnd, di, afterDiag ? DIAGEV[1] : -1); x.how = 'bounds'; x.startMin = r1(s0); x.endMax = r1(st['world.js eval start']); x.msMax = s0 >= 0 ? r1(st['world.js eval start'] - s0) : null;
        if (b !== 'birds.js') x.note = 'with the deferred scripts after it and before world.js';
      } else if (!o.defer) { x.how = 'bounds'; x.startMin = r1(rEnd); x.endMax = r1(di); x.msMax = rEnd >= 0 && di >= 0 ? r1(di - rEnd) : null; x.note = 'parser-blocking: between its response and the parse\'s end'; }
      else { x.how = 'unknown'; }
      out.push(x);
    }
    return { domInteractive: r1(di), domContentLoaded: nav ? r1(nav.domContentLoadedEventStart) : null, loadEvent: nav ? r1(nav.loadEventStart) : null, scripts: out };
  }
  function recTop() { try { return window.top === window ? 'top' : 'framed'; } catch (e) { return 'framed'; } }
  /* the control tail: the world stopped and hidden (the still sky, no birds planned), so diag can record an empty
     clearing canvas in the same viewer and session; then the world again. Neither gap is an interval of the world's
     (Fix 2: the first frame after the tail measured ts - lastTs across it), and the 2 s after it (the canvas dissolving
     back in) are the resume's */
  function recHalt(on) {
    if (!REC) return false;
    if (on && !REC.halted) {
      /* (E1) the course ends where the control tail begins: the arms stop (arm A's switches, the design's, back in
         force; the intervals after it carry no arm), so the tail's fence and whatever flight follows it count in no arm */
      var C = REC.course; if (C && C.e1 && !C.ended) { C.ended = true; REC.armNow = 0; recSet('order', ARMS[0].order, 'course end'); recSet('fence', ARMS[0].fence, 'course end'); REC.armLog.push([+((clockNow() - C.t0) / 1000).toFixed(2), 'end']); recSet('cacc', CACC_ON, 'course end'); }
      REC.halted = true; REC.lastTs = -1; stop(); canvas.classList.remove('on'); if (shown) markStill(); handTo(2); recMark('control: world halted'); return true;
    }
    if (!on && REC.halted) {
      REC.halted = false; REC.lastTs = -1;
      if (DEAD || LOST) { handTo(0); recMark('control: the world stays stopped (' + (LOST ? 'lost' : 'gave up') + ')'); return true; }   // (E1, the lead's guard on the published E0: the package's black page: a dead or lost world's canvas is never put back)
      REC.resumePending = true; handTo(shown ? 1 : 0); if (shown) canvas.classList.add('on'); CLK[1] = -1; start(); recMark('control: world resumed'); return true;
    }
    return false;
  }
  /* (the switches' own effects live where they act: order and fence in frame(), birds in the step and draw, stream in
     frame(), dpr1 in resize(), wrap in w13, words in the composite) */

  /* ---------------------------------------------------------------- the realms' kit, and the dev harness */
  var KITAPI = {
    Builder: Builder, box: KIT.box, prism: KIT.prism, lathe: KIT.lathe, rock: KIT.rock, cumulus: cumulus, bank: bank, range: range, wall: wall, mound: mound,
    lch: lch, lab: lab, hex: hex, lum: lum, dirAzEl: dirAzEl, norm: norm, cross: cross, add: add, sub: sub3, mul: mul, dot: dot, clamp: clamp, smooth: smooth, lerp: lerp, RNG: RNG,
    cellHash: cellHash, ihash: ihash, hfl: hfl, hk: hk, angDiff: angDiff, glowBake: glowBake
  };
  /* (Fix 3) stamp: each realm file and the ink birds' stamp their own top (their registration stamps their end), so
     the record bounds every script's evaluation (recScripts); without a record it does nothing */
  window.WORLD = { realm: registerRealm, kit: KITAPI, birds: registerBirds, stamp: function (name) { if (REC) REC.regs.push([String(name), +clockNow().toFixed(1)]); } };
  /* dev: GL objects counted as made and freed (the harness checks they stay bounded); wrapped once the context is made
     (devGL, boot stage A) */
  var GLN = { Buffer: 0, Texture: 0, VertexArray: 0, Framebuffer: 0, Program: 0, Renderbuffer: 0, Sync: 0 };
  function devGL() {
    if (DEVMODE) Object.keys(GLN).forEach(function (k) {
      var c = 'create' + k, d = 'delete' + k, fc = gl[c], fd = gl[d];
      if (k === 'Sync') { c = 'fenceSync'; fc = gl.fenceSync; }
      if (!fc || !fd) return;
      gl[c] = function () { GLN[k]++; return fc.apply(gl, arguments); };
      gl[d] = function (o) { if (o) GLN[k]--; return fd.apply(gl, arguments); };
    });
    if (SW.wrap) WRAPF = devWrapFull();
  }
  function finishCellsNear() {   // the harness's frame: every cell about the camera whole (meshes, clouds)
    var V = SIM.V; if (!V) return;
    streamCells(V, CS.x, CS.z, Math.sin(CS.psi), Math.cos(CS.psi), true);
    cellWork(V, true, 9);
    groundCache(V, CS.x, CS.z, true);
    // (world6 fix, the judges' defect 7) the cells' births as the live loop's: the harness's first frame is the boot's
    // (bornNow: nothing yet shown, everything simply there); a cloud or a cell made for a later frame comes in out of the
    // haze from that frame on, as in flight (the step set every birth to long ago, so a cloud baked between two frames
    // of a film showed at once: frame 154's pop)
  }
  var DEVLIN = null;   // (dev: sRGB codes to linear, for the pair's block means)
  var DEVSNAP = null;   // (Fix 3, dev: targets read back under a tag)
  function devB64(px) {   // (dev: bytes to base64, in chunks: no giant argument lists)
    var s = '', i, CH = 0x8000;
    for (i = 0; i < px.length; i += CH) s += String.fromCharCode.apply(null, px.subarray(i, Math.min(px.length, i + CH)));
    return btoa(s);
  }
  /* (E0) the full wrapped context: every call counted by kind and frame; the synchronous ones timed; GL objects made and
     freed (the fence ring exempt); links; every draw's pipeline key (ANGLE-Metal's: program, vertex layout, topology,
     attachment formats, write mask, blend, depth attachment, samples; and the full key: with depth func, test, write
     and cull, 8.2), each first use's time and whether the world showed; each buffer's and texture's last draw and the
     writes into one used in the last 3 frames (S5); texture uploads by source (S9). On in development with data-wrap,
     and in a structural record (data-dev-switch wrap=1): never in a pacing record, which wraps only the synchronous
     calls (3.2). */
  var WRAPF = null;
  function devWrapFull() {
    var P = {}, W = { calls: {}, frameCalls: [], frameSync: [], keys: {}, mkeys: {}, first: [], objs: {}, links: 0, linksAfter: 0, s5buf: 0, s5tex: 0, s5ev: [], up: { client: 0, pbo: 0, dom: 0, clientAfter: 0, pboAfter: 0, domAfter: 0 }, fr: -1, fc: 0, fs: 0 };
    var S = { prog: null, fb: null, vao: null, blend: false, bf: '', cmask: '1111', dt: false, df: 0x201, dm: true, cull: false, cm: 0x405, tex: new Map(), rb: new Map(), fbAtt: new Map(), vaoAtt: new Map(), vaoBuf: new Map(), arr: null, unit: 0, units: [], lastDrawBuf: new Map(), lastDrawTex: new Map(), boundTex: new Map(), pack: null, unpack: null };
    var pid = 0, pname = new Map();
    var SYNC = { fenceSync: 1, clientWaitSync: 1, getBufferSubData: 1, readPixels: 1, finish: 1, getError: 1, getParameter: 1, getProgramParameter: 1, getShaderParameter: 1, checkFramebufferStatus: 1, getUniformLocation: 1, getActiveUniform: 1, getSyncParameter: 1, getShaderInfoLog: 1, getProgramInfoLog: 1 };
    // (each frame's calls and synchronous calls, and whether the world was shown when the frame began; after it shows,
    // each synchronous call's largest count in one frame, by kind)
    W.frameShown = []; W.sh = 0; W.fsk = {}; W.syncKMax = {};
    function roll() {
      if (W.fr !== FRAMEN) {
        if (W.fr >= 0 && W.frameCalls.length < 200000) { W.frameCalls.push(W.fc); W.frameSync.push(W.fs); W.frameShown.push(W.sh); }
        if (W.sh) for (var kk in W.fsk) if (W.fsk[kk] > (W.syncKMax[kk] || 0)) W.syncKMax[kk] = W.fsk[kk];
        W.fr = FRAMEN; W.fc = 0; W.fs = 0; W.fsk = {}; W.sh = shown ? 1 : 0;
      }
    }
    function att(a, v) { var m = S.fbAtt.get(S.fb) || {}; m[a] = v; S.fbAtt.set(S.fb, m); }
    function key(mode) {
      var fa = S.fb ? (S.fbAtt.get(S.fb) || {}) : { def: 'default' }, va = S.vao ? (S.vaoAtt.get(S.vao) || {}) : {};
      var topo = (mode === 0) ? 'p' : (mode >= 1 && mode <= 3) ? 'l' : 't';
      var metal = [pname.get(S.prog), JSON.stringify(va), topo, JSON.stringify(fa), 'm' + S.cmask, S.blend ? 'B' + S.bf : 'b-'].join(' | ');
      return [metal, metal + ' | ' + (S.dt ? 'D' + S.df : 'd-') + (S.dm ? 'w' : 'r') + ' | ' + (S.cull ? 'C' + S.cm : 'c-')];
    }
    Object.getOwnPropertyNames(WebGL2RenderingContext.prototype).forEach(function (n) {
      var f = gl[n]; if (typeof f !== 'function' || n === 'constructor') return;
      var sync = !!SYNC[n];
      gl[n] = function () {
        roll(); W.fc++; W.calls[n] = (W.calls[n] || 0) + 1;
        var h = P[n]; if (h) h.apply(null, arguments);
        if (sync) { W.fs++; W.fsk[n] = (W.fsk[n] || 0) + 1; }
        var r = f.apply(gl, arguments);
        var hr = P['>' + n]; if (hr) hr(r, arguments);
        return r;
      };
    });
    P['>createProgram'] = function (r) { pname.set(r, 'p' + (pid++)); };
    ['Buffer', 'Texture', 'VertexArray', 'Framebuffer', 'Renderbuffer', 'Program', 'Shader'].forEach(function (k) {
      P['>create' + k] = (function (prev) { return function (r) { if (prev) prev(r); var o = W.objs[k] || (W.objs[k] = [0, 0, 0, 0]); o[0]++; if (shown) o[2]++; }; })(P['>create' + k]);
      P['delete' + k] = function (x) { if (!x) return; var o = W.objs[k] || (W.objs[k] = [0, 0, 0, 0]); o[1]++; if (shown) o[3]++; };
    });
    P.linkProgram = function () { W.links++; if (shown) W.linksAfter++; };
    P.useProgram = function (p) { S.prog = p; };
    P.bindFramebuffer = function (t, f) { if (t === 0x8D40 || t === 0x8CA9) S.fb = f; };
    P.activeTexture = function (u) { S.unit = u - 0x84C0; };
    P.bindTexture = function (t, x) { S.units[S.unit] = x; };
    function texOf() { return S.units[S.unit]; }
    function texUpload(n, a) {
      var x = texOf(), last = a[a.length - 1], pbo = !!S.unpack && typeof last === 'number', dom = last && typeof last === 'object' && !last.byteLength && last.nodeType !== undefined;
      if (n === 'texImage2D' || n === 'texImage3D' || n === 'texStorage2D' || n === 'texStorage3D') if (x) S.tex.set(x, a[2]);
      if (n.indexOf('Storage') >= 0) return;
      if (pbo) { W.up.pbo++; if (shown) W.up.pboAfter++; } else if (dom) { W.up.dom++; if (shown) W.up.domAfter++; } else if (last && last.byteLength) { W.up.client++; if (shown) W.up.clientAfter++; }
      var ld = x ? S.lastDrawTex.get(x) : undefined;
      if (ld !== undefined && FRAMEN - ld < 3 && (n === 'texSubImage2D' || n === 'texSubImage3D' || n === 'texImage2D' || n === 'texImage3D')) { W.s5tex++; if (W.s5ev.length < 200) W.s5ev.push(['tex', n, FRAMEN - ld, shown ? 1 : 0]); }
    }
    ['texImage2D', 'texSubImage2D', 'texImage3D', 'texSubImage3D', 'texStorage2D', 'texStorage3D'].forEach(function (n) { P[n] = function () { texUpload(n, arguments); }; });
    var curRb = null; P.bindRenderbuffer = function (t, r) { curRb = r; }; P.renderbufferStorage = function (t, ifmt) { if (curRb) S.rb.set(curRb, ifmt); };
    P.framebufferTexture2D = function (t, a, tt, x) { att(a, x ? 't' + (S.tex.get(x) || '?') : null); };
    P.framebufferTextureLayer = function (t, a, x) { att(a, x ? 't' + (S.tex.get(x) || '?') : null); };
    P.framebufferRenderbuffer = function (t, a, rt, r) { att(a, r ? 'r' + (S.rb.get(r) || '?') : null); };
    P.bindVertexArray = function (v) { S.vao = v; };
    P.bindBuffer = function (t, b) { if (t === 0x8892) S.arr = b; else if (t === 0x88EB) S.pack = b; else if (t === 0x88EC) S.unpack = b; else if (t === 0x8893 && S.vao) { var bs = S.vaoBuf.get(S.vao) || []; if (bs.indexOf(b) < 0) bs.push(b); S.vaoBuf.set(S.vao, bs); } };
    P.vertexAttribPointer = function (i, n, ty, norm, st, off) { var m = S.vaoAtt.get(S.vao) || {}; m[i] = n + ':' + ty + ':' + (norm ? 1 : 0) + ':' + st + ':' + (off || 0); S.vaoAtt.set(S.vao, m); var bs = S.vaoBuf.get(S.vao) || []; if (S.arr && bs.indexOf(S.arr) < 0) bs.push(S.arr); S.vaoBuf.set(S.vao, bs); };
    P.vertexAttribIPointer = function (i, n, ty, st, off) { var m = S.vaoAtt.get(S.vao) || {}; m[i] = 'I' + n + ':' + ty + ':' + st + ':' + (off || 0); S.vaoAtt.set(S.vao, m); var bs = S.vaoBuf.get(S.vao) || []; if (S.arr && bs.indexOf(S.arr) < 0) bs.push(S.arr); S.vaoBuf.set(S.vao, bs); };
    P.vertexAttribDivisor = function (i, d) { var m = S.vaoAtt.get(S.vao) || {}; m[i] = (m[i] || '') + '/d' + d; S.vaoAtt.set(S.vao, m); };
    P.enable = function (c) { if (c === 0x0BE2) S.blend = true; if (c === 0x0B71) S.dt = true; if (c === 0x0B44) S.cull = true; };
    P.disable = function (c) { if (c === 0x0BE2) S.blend = false; if (c === 0x0B71) S.dt = false; if (c === 0x0B44) S.cull = false; };
    P.blendFunc = function (a, b) { S.bf = [a, b, a, b].join(','); };   // (E1: one notation for one blend state, as the record's and the independent counter's keys)
    P.blendFuncSeparate = function (a, b, c, d) { S.bf = [a, b, c, d].join(','); };   // (E1.1: back in force; E1 had left it inside the comment above, so a separate blend state was keyed as the last blendFunc's)
    P.colorMask = function (r, g, b, a) { S.cmask = '' + (+r) + (+g) + (+b) + (+a); };
    P.depthFunc = function (f) { S.df = f; }; P.depthMask = function (m) { S.dm = !!m; }; P.cullFace = function (m) { S.cm = m; };
    function bufWrite(n) { var b = S.arr; if (!b) return; var ld = S.lastDrawBuf.get(b); if (ld !== undefined && FRAMEN - ld < 3) { W.s5buf++; if (W.s5ev.length < 200) W.s5ev.push(['buf', n, FRAMEN - ld, shown ? 1 : 0]); } }
    P.bufferData = function () { bufWrite('bufferData'); }; P.bufferSubData = function () { bufWrite('bufferSubData'); };
    function draw(mode) {
      var k = key(mode), t = clockNow();
      if (!W.keys[k[1]]) { W.keys[k[1]] = 1; W.first.push([+t.toFixed(1), k[1].slice(0, 400), shown ? 1 : 0, FRAMEN]); } else W.keys[k[1]]++;
      W.mkeys[k[0]] = (W.mkeys[k[0]] || 0) + 1;
      var bs = S.vao ? S.vaoBuf.get(S.vao) : null; if (bs) for (var i = 0; i < bs.length; i++) S.lastDrawBuf.set(bs[i], FRAMEN);
      for (var u = 0; u < S.units.length; u++) if (S.units[u]) S.lastDrawTex.set(S.units[u], FRAMEN);
    }
    P.drawArrays = function (m) { draw(m); }; P.drawElements = function (m) { draw(m); }; P.drawArraysInstanced = function (m) { draw(m); }; P.drawElementsInstanced = function (m) { draw(m); };
    W.report = function () {
      var fc = W.frameCalls.slice().sort(function (a, b) { return a - b; }), fs = W.frameSync.slice().sort(function (a, b) { return a - b; });
      function q(a, x) { return a.length ? a[Math.min(a.length - 1, Math.floor(x * a.length))] : null; }
      var fcS = W.frameCalls.filter(function (x, i) { return W.frameShown[i]; }).sort(function (a, b) { return a - b; }), fsS = W.frameSync.filter(function (x, i) { return W.frameShown[i]; }).sort(function (a, b) { return a - b; });
      return { frames: fc.length, callsP50: q(fc, 0.5), callsP90: q(fc, 0.9), callsMax: q(fc, 1), syncP50: q(fs, 0.5), syncMax: q(fs, 1),
        shownFrames: fcS.length, shownCallsP50: q(fcS, 0.5), shownCallsP90: q(fcS, 0.9), shownCallsMax: q(fcS, 1), shownSyncP50: q(fsS, 0.5), shownSyncMax: q(fsS, 1), shownSyncKindMax: W.syncKMax, calls: W.calls, fullKeys: Object.keys(W.keys).length, metalKeys: Object.keys(W.mkeys).length, firstUse: W.first, objects: W.objs, links: W.links, linksAfter: W.linksAfter, s5buf: W.s5buf, s5tex: W.s5tex, s5ev: W.s5ev, uploads: W.up };
    };
    W.reset = function () { W.frameCalls = []; W.frameSync = []; W.frameShown = []; W.syncKMax = {}; W.calls = {}; };
    return W;
  }
  /* dev: the clearance about the camera: to the nearest landmark vertex (cells kept with set({ keep: true })), and to
     every solid and cloud core (signed: < 0 inside) */
  var DEVWORST = { vert: 1e9, solid: 1e9, core: 1e9, n: 0 };
  function devClearance() {
      if (!DEVMODE || !SIM.V) return null;
      var V = SIM.V, best = 1e9, bo = 1e9, bc = 1e9, x = CS.x, y = CS.y, z = CS.z;
      (V.cellList || []).forEach(function (C) {
        var dx = C.bound[0] - x, dz = C.bound[2] - z; if (Math.sqrt(dx * dx + dz * dz) > C.bound[3] + 300) return;
        if (C.pts) for (var i = 0; i < C.pts.length; i += 6) { var ex = C.pts[i] - x, ey = C.pts[i + 1] - y, ez = C.pts[i + 2] - z, d = ex * ex + ey * ey + ez * ez; if (d < best) best = d; }
        C.obst.forEach(function (o) {
          var dd;
          if (o.c) { var hx = Math.sqrt((o.x - x) * (o.x - x) + (o.z - z) * (o.z - z)) - o.r, vy = y > o.y1 ? y - o.y1 : (y < o.y0 ? o.y0 - y : 0); dd = hx > 0 ? Math.sqrt(hx * hx + vy * vy) : (vy > 0 ? vy : Math.max(hx, -vy)); if (dd < bo) bo = dd; }
          else { dd = Math.sqrt((o.x - x) * (o.x - x) + (o.y - y) * (o.y - y) + (o.z - z) * (o.z - z)) - o.r; if (dd < bc) bc = dd; }
        });
      });
      return { vert: Math.sqrt(best), solid: bo, core: bc };
  }
  /* dev: how deep the camera stands in the nearest cloud's visible lobes (m; > 0 inside) */
  function devInsideLobes() {
      if (!DEVMODE || !SIM.V) return null;
      var best = -1e9, x = CS.x, y = CS.y, z = CS.z;
      (SIM.V.cellList || []).forEach(function (C) { if (!C.soft) return; for (var i = 0; i < C.soft.length; i += 4) { var dx = C.soft[i] - x, dy = C.soft[i + 1] - y, dz = C.soft[i + 2] - z, d = C.soft[i + 3] - Math.sqrt(dx * dx + dy * dy + dz * dz); if (d > best) best = d; } });
      return best;
  }
  function devMem() {
    var vb = 0, mb = 0, cells = 0, vols = 0;
    J.visits.forEach(function (V) {
      if (V.cellList) V.cellList.forEach(function (C) { cells++; if (C.mesh && C.mesh.n) mb += C.mesh.n * VSTRIDE; for (var i = 0; i < C.vols.length; i++) { vols++; vb += C.vols[i].out.bytes; } });
      if (V.pass) V.pass.forEach(function (o) { vb += o.bytes; vols++; });
    });
    return { cells: cells, vols: vols, volMB: +(vb / 1048576).toFixed(2), meshMB: +(mb / 1048576).toFixed(2), visits: J.visits.length, probesInFlight: RB.fences.length, probeJobs: PJOBS.length };
  }

  /* ---------------------------------------------------------------- start */
  /* the words moved (a scroll, a reflow the ResizeObserver catches, the fonts arriving): the veil is measured again;
     a still frame (reduced motion) is drawn again on the next animation frame, so the veil is where the words are */
  function layoutChanged() {   // (E1.1 Fix 2, S10: only stored; measured, and a still drawn again, in the next frame: domFlush)
    DOMQ.words = true; if (!running) domNext();
  }
  function boot() {
    if (!ORDER.length) { fail('no realms'); return; }
    /* (Fix 2) stage A: the context and its extensions (then the record's and the harness's wrappers, then the ink
       birds' module, which compiles through HOST); without a context today's birds keep the still sky */
    if (!gl) {
      recMark('boot: context');
      if (!getGL()) { DEAD = true; markStill(); fail('no WebGL2 context'); return; }   // (tod: the bar takes the hour's still's top)
      recWrap(); devGL(); recMark('boot: context made');
      deviceHints();
    }
    makeBirds();
    if (OPT.realm && !REALMS[OPT.realm]) fail('unknown realm ' + OPT.realm);
    if (OPT.ss) SS = Math.max(1, Math.min(4, +OPT.ss | 0));
    // the realm the journey opens on (its still sky is marked only if the canvas, once shown, hides again: markStill)
    var V0 = worldAt(0).V;
    SKYMARK = SKYTOP[HOUR] ? HOUR : 'day';   // (tod fix3, problem 4: the hour's group, never the realm's own still ('dunes'): this stylesheet has a still sky and words for each time of day and none for a realm, so a boot declined before the first frame (a slow device) left a night visitor on the daylight still with black words; Fix 3: not written: the hour's still sky stays until the canvas hides, markStill)
    // a renderer on the CPU keeps that still sky (the world would run at a frame or two a second)
    if (!DEVMODE && /SwiftShader|llvmpipe|Software/i.test(EXT.renderer)) { DEAD = true; return; }
    resize();
    if (typeof ResizeObserver !== 'undefined') { var ro = new ResizeObserver(layoutChanged); ro.observe(document.querySelector('main')); var ft = document.querySelector('footer'); if (ft) ro.observe(ft); ro.observe(canvas); }
    window.addEventListener('resize', function () { NEEDSIZE = true; if (!(running || FRUN || !READY || LOST)) stillNext(); });   // (E1.1, S10: only stored; the window measured and drawn in the next frame)
    window.addEventListener('scroll', layoutChanged, { passive: true });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(layoutChanged);
    if (MQ) { if (MQ.addEventListener) MQ.addEventListener('change', onMotionPref); else if (MQ.addListener) MQ.addListener(onMotionPref); }
    if (FC) { if (FC.addEventListener) FC.addEventListener('change', onForced); else if (FC.addListener) FC.addListener(onForced); }
    inputInit();
    if (forced()) { if (!HASSVG) fstart(); return; }   // (round 2: forced colours from the start: the birds alone, on the system's colours; E0: today's SVG birds instead, where the page has them)
    if (DEVMODE && SW.rbfix) RB.fix = true;   // (dev: the read-back's arrival fixed in frames; the stills' harness too: jwfast's ticks)
    bootReset(false);
    start();   // (the staged boot, then the flight; under reduced motion the loop builds, draws one still frame and stops)
  }
  /* (E0, design-v5 14) the boot starts in the first animation frame after the ink birds register (inkbirds.js is the
     last deferred script, so every realm has registered by then), or at load if a file failed to arrive; the scripts'
     top levels only define, and nothing runs before the boot but them and today's SVG birds.
     (E1) E0's wait for today's first bird (up to 3 s from their start: WAIT_COMMIT, waitBirds) was gone in E1; Fix 2
     yielded every frame to them until a bird of their first flight was in view (up to 3 s), which brought E0's wait
     back; (Fix 3) the boot started and worked at once, and only its first-use draws and stage G's timed trials waited
     for today's first flight, at most 1 s each; (E1.1) the boot starts once a bird of today's first flight is in view
     (bootMayStart), and nothing in it waits after that */
  var booted = false, bootRaf = 0;
  function bootOnce() {
    bootRaf = 0;
    if (booted) return;
    if (BOOT.bw.due < 0) recMark('boot due');
    if (!bootMayStart()) { bootRaf = requestAnimationFrame(bootOnce); return; }
    booted = true; BOOT.startAt = clockNow();
    recMark('boot start: ' + BOOT.bw.why + ' (' + BOOT.bw.ms + ' ms, ' + BOOT.bw.frames + ' frames)');
    boot();
  }
  /* (E1.1, item 6: B5) the boot begins once a bird of today's first flight is in view (skyAir.flying 2: the bird shown
     and its appear a third done), and at once where there is none to wait for (no SVG birds, reduced motion, forced
     colours, the harness). Fix 3 began at once, and its first frames (the context, about 0.2 s here; the objects; the
     first links, 0.2-0.7 s each on a renderer that links synchronously) held the birds' clock (a step at most 50 ms a
     frame), so their first bird came 350-1,541 ms later than on the page without the world in 8 of 8 paired loads,
     over 2 s in 5 (verify-regress-3). The bird comes 0.8-1.7 s after load on that page; the boot then starts about a
     second after the scripts. A safety net, never the rule: BOOT_WAIT_CAP ms (2.5 s) after the boot was due with no bird
     in view (today's sky can find no room for a first flight: a phone held sideways whose words fill it, which looks
     again 3-6 s later). Stage G's wait (Fix 3: its timed trials while the first flight was in the window, which takes
     15-20 s to cross, so its 1 s cap always ran out) and the first-use draws' wait (its bird already in view) are gone */
  var BOOT_WAIT_CAP = 2500;
  function bootMayStart() {
    var W = BOOT.bw; if (W.why) return true;
    var now = clockNow(); if (W.due < 0) W.due = now;
    var f = SKYAIR.flying | 0;
    var why = STILLMODE ? 'the harness' : !HASSVG ? 'no SVG birds' : reduced() ? 'reduced motion' : forced() ? 'forced colours' : f >= 2 ? 'the first bird in view' : null;
    if (!why && now - W.due >= BOOT_WAIT_CAP) why = f === 1 ? 'the cap: a first flight committed, none of it in view yet' : 'the cap: no first flight committed';
    if (!why) { W.frames++; return false; }
    W.why = why; W.ms = +(now - W.due).toFixed(1); W.fly = f;
    return true;
  }
  function bootSoon() { if (!booted && !bootRaf) bootRaf = requestAnimationFrame(bootOnce); }
  /* (E1, stage A) the device's hints, read once (each getter a round trip on Safari: never in a frame): the renderer,
     the screen and its density, an iPad behind a Mac user agent, WebGPU's presence, the cores and the memory, the draw
     buffers. The record keeps them; the class itself is E7's */
  var DEVHINT = null;
  function deviceHints() {
    try {
      var nav = navigator, sc = window.screen || {};
      DEVHINT = { renderer: EXT.renderer, screen: [sc.width || 0, sc.height || 0], dpr: window.devicePixelRatio || 1, touch: nav.maxTouchPoints || 0, ipadMac: /Macintosh/.test(nav.userAgent) && (nav.maxTouchPoints || 0) > 1,
        gpu: !!nav.gpu, cores: nav.hardwareConcurrency || null, mem: nav.deviceMemory || null, drawBuffers: gl.getParameter(gl.MAX_DRAW_BUFFERS), par: !!EXT.par, f32: FLOAT32_RT };
    } catch (e) { DEVHINT = { error: String(e) }; }
  }
  if (REC) recMark('world.js eval end');
  if (document.readyState === 'complete') bootSoon();
  else window.addEventListener('load', bootSoon);
})();
