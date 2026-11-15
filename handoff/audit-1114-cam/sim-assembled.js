(function (H, KWF, cells, cssW, tanY) {
"use strict";

  var PI = Math.PI, DEG = Math.PI / 180;
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

  function clamp(x, a, b) { return x < a ? a : x > b ? b : x; }
  function smooth(a, b, x) { var t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); }
  function lerp(a, b, t) { return a + (b - a) * t; }
    function angDiff(a, b) { var d = a - b; d -= Math.floor((d + Math.PI) / (2 * Math.PI)) * 2 * Math.PI; return d; }   // a - b in (-pi, pi]
  var DEVMODE = false, STILLMODE = false, OPT = {}, REC = null, SW = { camhold: 0, birds: 0, stream: 1, look: 0 }, BIRDS = null, J = { seed: 5 }, SEEDR = 7, shown = true, SHOWNT = 0;
  var VSTAGES = [], NOISE = { done: true }, KW = { tex: 1, ok: true }, WORLD_FLYERS = true, LATEK = {}, FRAMEN = 0, SUPPRESS_F = 0, DOMQ = {}, running = true, FCOL = { on: false }, DEAD = false, LOST = false;
  var OUT = { cssW: cssW }, FR = { tanX: 1, tanY: tanY }, FRT = { tanX: 1, tanY: tanY }, SV = { u: 0 }, CAMLIFT = 0, root = null, window = {}, document = {};
  var BIRDB = { at: 0, spent: 0 }, CTR = { plans: 0 };
  function reduced() { return false; } function clockNow() { return 0; } function lateBirds() { return false; }
  function planVisit() {} function kwFollow() {} function kwUpload() {} function climateLight() {} function directorStep() {} function beamWake() {} function flockOf(f) { return f; } function domNext() {}
  var KWA = [0, 0, 0, 0]; function kwAt(x, z) { KWA[0] = 1; KWA[3] = KWF(x, z); return KWA; }
  var V = { k: 1, st: 0, speed: 12, clear: [7, 14, 45], cellList: [], evRng: null, def: { speed: 12, clear: [7, 14, 45], frame: [0.55, 0.58], cruise: [14, 32], look: 90, pitchFollow: 0, margin: 12, marginB: 26, lookT: 20, lookTan: 0.15, event: null, P: { st: 2 } }, paramsFlat: 1 };
  V.evRng = RNG(5);
  function worldAt(t) { return { V: V, u: t }; }
    /* ---------------------------------------------------------------- the ground about the camera */
  /* Two grids of the realm's ground, 160 x 160 at 4 m (640 m across), drawn when the camera has moved 16 m: the land's
     height for the scatter, the particles and the veils of sand (a float target where the context can); and the
     camera's own ground (the realm's camGround: over a bay of cloud, the cloud's top), packed and read back for the
     flight. The camera's grid is 100 KB of bytes, so it comes back in two halves of 80 rows (50 KB each, each in one
     frame's slot beside the frame's probes); the grid is not drawn again until both halves are read out of it.
     The flight reads the last grid that has landed: a few frames late, always about the camera. */
  var GCN = 160, GCCELL = 4, GCT = null, GCCT = null, GCU = new Float32Array(4), GCK = new Float64Array([-1, 0, 0, 0]);
  var GROUND = { V: null, x0: 0, z0: 0, cell: GCCELL, n: GCN, h: new Float32Array(GCN * GCN), e: new Float32Array(GCN * GCN), ok: false, rd: 0, gen: 0, got: 0, P: { V: null, x0: 0, z0: 0, gen: 0 }, nx: 0, nz: 0, nV: null };
  var GPX = new Uint8Array(GCN * GCN * 4), GHALF = GCN / 2;
  function groundCache(V, cx, cz, sync) {
    if (!V.def.P || V.def.P.st !== 2 || !NOISE.done || !V.paramsFlat || !KW.tex) return;   // (and the visit planned (its field's parameters) and its weights' grid on the GPU (vsKW))
    if (!sync && GROUND.rd > 0) return;   // (the last grid's halves not yet read out of the target)
    var x0 = Math.floor(cx / 16) * 16 - GCN / 2 * GCCELL, z0 = Math.floor(cz / 16) * 16 - GCN / 2 * GCCELL;
    if (GCK[0] === V.k && GCK[1] === x0 && GCK[2] === z0 && GCK[3] === J.seed) return;
    GCK[0] = V.k; GCK[1] = x0; GCK[2] = z0; GCK[3] = J.seed;
    if (!GCT) {
      GCT = /** @type {{ f: WebGLFramebuffer, t: WebGLTexture }} */ ({ f: gl.createFramebuffer() }); gl.activeTexture(gl.TEXTURE11); GCT.t = tex2d(GCN, GCN, FLOAT32_RT ? gl.R32F : gl.RGBA8, FLOAT32_RT ? gl.RED : gl.RGBA, FLOAT32_RT ? gl.FLOAT : gl.UNSIGNED_BYTE, gl.NEAREST); gl.activeTexture(gl.TEXTURE0);
      gl.bindFramebuffer(gl.FRAMEBUFFER, GCT.f); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, GCT.t, 0);
      GCCT = target(GCN, GCN, 'rgba8');
    }
    GCU[0] = x0; GCU[1] = z0; GCU[2] = GCCELL; GCU[3] = GCN;
    gl.activeTexture(gl.TEXTURE11); gl.bindTexture(gl.TEXTURE_2D, null); gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_3D, NOISE3);
    gl.disable(gl.DEPTH_TEST); gl.disable(gl.BLEND); gl.disable(gl.CULL_FACE); gl.colorMask(true, true, true, true); gl.bindVertexArray(FULLVAO);
    if (V.def.P.hp) hpRun(V, 2, GCN, GCN, null, x0, z0, GCCELL);   // (both of the grid's draws read it)
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
  /* the surface the flight follows: the camera's ground's upper envelope at ENV_K m per m, E(p) = max over q of H(q) - ENV_K |p - q| (a cone dilation, worked as two chamfer passes over the
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
  /* the formations in the envelope too: each solid standing on the land (a cell's cylinder: a mesa, a shard, a slab, a
     ruin's wall, a talus foot) raises the surface flown by its own cone, its top plus SOL_M less ENV_K per metre beyond
     its radius, worked analytically from the solids within SOL_R of the camera (refreshed every step: ENV_SOL), so
     whatever line the visitor turns to, a formation is climbed over from as far off as its height asks, never met: the
     slip passes beside what it can, the hard rule is never needed (without the solids, a mesa's face met after a drag
     has the hard rule slide the camera along it, 875 pushes) */
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
     between samples is missed); the envelope's unless raw is asked */
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
    copyState(CS, CSP);   // (the arrival is the previous step too, its heading and tilt included: the first frame, drawn between the two, was turned 4-5 deg toward the fresh state's heading and snapped on the next)
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
         passage's cover, until it is (counted: SIM.waits). */
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
    pitchLook(V, CS, dt);   // (the look at the ground ahead)
    var yT = heightTarget(V, t), w = VY_W, acc = clamp(w * w * (yT - CS.y) - 2 * w * CS.vy, -VY_ACC, yT > CS.y ? VY_ACCU : VY_ACC);
    acc = clamp(acc, (-VY_DN - CS.vy) / 0.5, (VY_UP - CS.vy) / 0.5); CS.ay = (CS.ay || 0) + clamp(acc - (CS.ay || 0), -1.5 * dt, 1.5 * dt); acc = CS.ay;
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
  /* (the one camera) the height's spring and its limits: the vertical speed within VY_UP / VY_DN and its change within
     VY_ACC (well under what reads as a nod: a climb at 5.5 m/s with a 41 deg turn of the view reads as one),
     the ground ahead looked at over HT_T s at TAN_CLIMB (the slope those limits can climb, with room), so a rise is
     climbed early and gently */
  var TAN_CLIMB = Math.tan(11 * DEG), VY_UP = 2.6, VY_DN = 2.2, VY_ACC = 0.5, VY_ACCU = 1.0, VY_W = 0.55, HT_T = 12, CEIL_OVER = 10, PUSH_V = 3.9;   // (a climb may gather at up to VY_ACCU m/s2, a descent's change at VY_ACC)
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
    // on the slip's planned way (between the line now and the line it is going to: e), and with a lead of CLIMB_LEAD s:
    // the height's spring lags a ramp at TAN_CLIMB by about 2 s of it (2 x its rate / 0.95), so a ramp aimed at the top's
    // edge meets it a few metres low and the hard rule lifts the camera in one step (seed 13: 5.5 m); a floating stone
    // above the eye is passed under or beside (slipPlan), never climbed from below
    var O = nearObstacles(V, v * T + 60), m = V.margin || V.def.margin || 14, e = CS.latT - CS.lat, lo = Math.min(0, e), hi = Math.max(0, e), lead = v * CLIMB_LEAD;
    for (i = 0; i < O.length; i++) {
      var o = O[i], ox = o.x - CS.x, oz = o.z - CS.z, s2 = ox * hx + oz * hz;
      if (s2 < -o.r - m || s2 > v * T + o.r) continue;
      var l2 = -ox * hz + oz * hx, lat = l2 < lo ? lo - l2 : (l2 > hi ? l2 - hi : 0), top = obstTop(o) + m;
      if (lat > o.r + m || (!o.c && !o.cloud && o.y > CS.y + 5) || !climbOK(V, CS, o, s2, top)) continue;   // (passed beside it, or too tall to climb: flown round; judged as slipGather judges it, climbOK)
      var ye2 = top + 4 - Math.max(s2 - o.r - lead, 0) * TAN_CLIMB;
      if (ye2 > yT) yT = ye2;
    }
    // the solids under the ceiling on the planned way further off (slipPlan's climbs), beyond the HT_T s looked at
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
  /* can the camera climb over a solid (its top with the margin, `top`, s m ahead on the heading)? Only under the
     ceiling the camera will have: simStep's is the ground under the camera + clear[2] + CEIL_OVER. The top against the ground
     at the solid's centre + clear[2] alone is not enough: that reads the camera's grid there (160 x 4 m about the
     camera: a solid farther off reads the grid's edge), so on seed 27 (day, from 34 s) a mesa whose centre reads 2 m
     while the valley the camera crosses lies at -159 m (its ceiling 21 m, the height wanted 52 m) is taken for
     climbable: the slip plans no way past it and the hard rule pushes the camera along its face for 27 s (1,619
     pushes, the course 41-53 deg off the heading). So a solid is climbable only if its top is under both (1) the
     ground under it + clear[2], that ground never above the item's own seat (exact, from the GPU: a column's y0 + 30)
     and (2) on the way in, at CR_D lengths of the height spring's lead short of it on the planned line, the solid's
     own top + CR_CLEAR (6 m: over the hard rule's 3.5) less TAN_CLIMB beyond the lead, under the ground there +
     clear[2] + CEIL_OVER (where the ceiling holds the camera under heightTarget's top + margin + 4, it still passes over
     without a push; asking the margin here too slips seed 29, climbable without a push, past at 0.35 x the speed);
     else it is a slip constraint, passed beside from first sight. Allocates nothing */
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
  /* the way past what stands ahead with the heading held, planned from first sight. A slip round the nearest solid
     only, seen 24 s ahead, wanting the offset still needed over the time left, is not enough: a wide mesa (DUNES:
     105-250 m across, its top 170-335 m over the camera) or a great tower's core (ABOVE: up to 186 m) needs more than
     14 deg of crab can give, and the hard rule pushes the camera along their faces for seconds (6 of 11 seeds, 81-1091
     pushes); a solid climbed only once heightTarget sees it, HT_T s off, is met too late if tall; and clouds' visible
     bodies have to be seen too.
     So every SLIP_PLAN = 0.25 s (and at once when the heading has turned) slipPlan looks SLIP_T = 90 s of flight
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
     landing before its first frame), a line that would meet a solid's own zone is not flown at all: the camera is placed on the nearest
     clear line beside it (up to 420 m; never inside a solid), unseen. The slip (S.sv, m/s, + to the right) flies the chosen line
     by a controller eased at SLIP_ACC x the speed a second and braking in time (slipCtl), so its lateral acceleration
     is never over 1.05 m/s2 (the hard rule's onsets: 35-72 m/s2). The view never turns; the hard rule (pushOut) is
     untouched, the last resort.
     Two rates of easing: SLIP_ACC = 0.034 x the speed a second, so the course never swings more than 9.7 deg in 5 s
     (tan 9.7 deg = 0.034 x 5; 0.05 swings 10.2-14.0 deg on 6 of 50 seeds), and SLIP_ACC2 = 0.05 only where no plan
     eased at the first keeps out of a solid's own zone (the plan's cost there, SLIP_WIN x 0.02 and over) and one eased
     at the second does better: the plan is made at the first and, only then, again at the second (S.acc: the factor
     the plan in hand was made at). Not one rate for every plan: 0.035 slips later where it is urgent, and the hard rule
     pushes (seeds 4 and 8) */
  var SLIP_T = 90, SLIP_REACH = 1200, SLIP_SPD = [0.04, 0.08, 0.13, 0.2, 0.25, 0.35, 0.45], SLIP_SPDK = [0, 0, 0, 3000, 5000, 8000, 12000], SLIP_ACC = 0.034, SLIP_ACC2 = 0.05, SLIP_PLAN = 0.25, SLIP_DT = 0.5;
  var SLIP_IN = 6, SLIP_WIN = 1e5, SLIP_WOUT = 15, SLIP_SOFT = 8, SLIP_WSOFT = 3, SLIP_KC = 100, SLIP_URG = 15, SLIP_URGI = 20, SLIP_NC = 30, CLIMB_LEAD = 2.2;
  var SLIP_O = [], SPN = 0, SPMAX = 400, SPS = new Float64Array(SPMAX), SPSH = new Float64Array(SPMAX), SPL = new Float64Array(SPMAX), SPLH = new Float64Array(SPMAX), SPRI = new Float64Array(SPMAX), SPU = new Float64Array(SPMAX), SPUI = new Float64Array(SPMAX);
  var SPK0 = new Int32Array(SPMAX), SPK1 = new Int32Array(SPMAX), SPORD = new Int32Array(SPMAX), SPX = new Float64Array(420), SPC = new Float64Array(900);
  /* the plan's constants made once: ladders, the order's view and comparator made at every plan (four times a second)
     make the slip the frame path's largest allocator (9.9 MB in 26 s of flight); the plan allocates nothing once warm
     (the order kept by an insertion sort, stable) */
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
      if (!o.cloud && (o.c || o.y <= S.y + 5) && climbOK(V, S, o, s, obstTop(o) + m)) { climbs.push(o); continue; }   // (a floating stone above the eye: passed under or beside, never climbed; climbable only under the ceiling the camera will have, climbOK)
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
  /* the plan made at the gentle easing; again at the quicker (SLIP_ACC2) only where that meets a solid's own zone and
     the quicker does better (the plan in hand then kept at the rate that costs it least) */
  function slipPlan(V, S) {
    var c0 = slipPlanA(V, S, SLIP_ACC, true);
    if (c0 < SLIP_WIN * 0.02) { S.acc = SLIP_ACC; return; }
    var lt = S.latT, lt2 = S.latT2, tw = S.tsw, vs = S.vs;
    var c1 = slipPlanA(V, S, SLIP_ACC2, false);
    if (c1 < c0) S.acc = SLIP_ACC2;
    else { S.latT = lt; S.latT2 = lt2; S.tsw = tw; S.vs = vs; S.acc = SLIP_ACC; }
  }
  /* ---------------------------------------------------------------- the slip: a plan at one easing, the controller's way */
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
  /* the view not yet shown: the landing before its first frame (there is no other cover) */
  function arrivalCovered(V) { return !shown && SIM.t < 1; }
  /* a step of the slip (the flight's, plan true; the forecast's, flying the plan it was given) */
  function slipStep(V, S, dt, plan) {
    var v = V.speed;
    if (!(S.fpsi === S.fpsi) || Math.abs(angDiff(S.psi, S.fpsi)) > 0.004) { S.latT -= S.lat; S.latT2 -= S.lat; S.lat = 0; S.fpsi = S.psi; if (plan) S.pt = -1e9; }   // (the heading turned: the line still to go, in the new frame)
    if (plan && SIM.t - S.pt >= SLIP_PLAN) { S.pt = SIM.t; slipPlan(V, S); }
    var now = plan ? SIM.t : S.t;
    if (S.tsw > 0 && now >= S.tsw) { S.latT = S.latT2; S.tsw = -1; }   // (the plan's second line, from its time on)
    S.sv = slipCtl(S.sv, S.latT - S.lat, S.vs || SLIP_SPD[0] * v, (S.acc || SLIP_ACC) * v, dt);   // (at the rate its plan was made at)
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

  /* ---------------------------------------------------------------- the places, the look ahead */
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
  /* the camera's look at the ground ahead (the realm's pitchFollow of its slope over V.def.look m). S.pfT: the look
     now; S.pf: as followed */
  var CALM_PITCH = 1.6, PF_EASE = 1.5, PF_K = 0.3;
  /* (round E1 Fix 3) the look eased in when a visit's own ground first arrives (the grid's first read, a few frames after
     the change of realm): until then groundAt has only the realm's placeholder height, the look is level, and its read
     landing stepped the view's pitch by 0.6-0.8 deg in one frame inside the cloud (seed 1: at all four junctions, H1's
     camera bound being 0.5 deg a frame); now followed over PF_EASE s at CALM_PITCH x PF_K (0.48 s), the following
     itself eased out over its last 0.5 s */
  function pitchLook(V, S, dt) {
    var look = V.def.look || 90, yaw = S.yawV + S.phi, ga = groundAt(V, S.x + Math.sin(yaw) * look, S.z + Math.cos(yaw) * look, false), gh = groundAt(V, S.x, S.z, false);
    S.pfT = Math.atan2(ga - gh, look) * pfK(V);
    if (GROUND.V === V && GROUND.ok && S.gV !== V) { S.gV = V; if (S.pf === S.pf) S.pfE = PF_EASE; }   // (the visit's own ground arrived)
    var kk = S.pfE > 0 ? PF_K * Math.min(1, S.pfE / 0.5) : 0; if (S.pfE > 0) S.pfE -= dt;   // (its last 0.5 s eased out: ended at once, the lag of a look still moving stepped the pitch 0.5-0.9 deg: seeds 8, 19, 20)
    var pf0 = S.pf;
    if (!(S.pf === S.pf) || kk <= 0) S.pf = S.pfT;
    else S.pf += (S.pfT - S.pf) * (1 - Math.exp(-dt / (CALM_PITCH * kk)));
    if (pf0 === pf0) S.pf = pf0 + clamp(S.pf - pf0, -PF_RATE * dt, PF_RATE * dt);   // (Fix 3: at most PF_RATE)
  }
  /* (E1 Fix 3, the hotfix verify-2's item 1) the look followed at most PF_RATE (1.5 deg/s): without the birds' calm it
     followed the ground at once, and over DUNES (seed 13 at 405-408 s, a visit's middle) the view pitched 7 deg in 3 s,
     at up to 3.77 deg/s, by itself; the look is the one turn of the view left alone besides the carry inside the cloud */
  var PF_RATE = 1.5 * DEG;
  /* ---------------------------------------------------------------- events on the way */
  /* creatures crossing ahead now and then (the realm's events: a flock across the way, a ray) */
  function events(V, t, u) {
    if (!V.def.event || !V.flocksEv) return;
    for (var i = V.flocksEv.length - 1; i >= 0; i--) if (u > V.flocksEv[i].end) V.flocksEv.splice(i, 1);
    if (u < V.evNext) return;
    var e = V.def.event(V, V.evRng, { x: CS.x, y: CS.y, z: CS.z, psi: CS.psi, u: u, ground: function (x, z) { return groundAt(V, x, z, false); } });
    V.evNext = u + (e && e.next ? e.next : 20);
    if (e && e.flock && !WORLD_FLYERS && (e.flock.kind === 'bird' || e.flock.kind === 'ray')) e = null;   // (no birds or rays while WORLD_FLYERS is off)
    if (e && e.flock && V.flocksEv.length < 2) { e.flock.u0 = u; e.flock.at = [e.flock.x, e.flock.y, e.flock.z]; var f = flockOf(e.flock); f.end = u + (e.life || 30); V.flocksEv.push(f); LATEK.creature = 1; }
  }

  /* ---------------------------------------------------------------- the camera, drawn between the last two steps */
  var CAM = { pos: [0, 0, 0], f: [0, 0, 1], r: [1, 0, 0], u: [0, 1, 0], roll: 0, pitch: 0, inCloud: 0, arrive: 0, cover: 0, pmode: 0, hold: -1, open: -1, expo: 1 };
  var CAMV = new Float32Array(12);   // pos, r, u, f (for the uniforms)
  function camPose(V, u, a, out) {
    var A = CSP, Bs = CS;   // (at the junction too, CSP being the arrival's own place: arrive)
    var x = lerp(A.x, Bs.x, a), y = lerp(A.y, Bs.y, a), z = lerp(A.z, Bs.z, a);
    var yaw = A.yawV + A.phi + angDiff(Bs.yawV + Bs.phi, A.yawV + A.phi) * a, uth = lerp(A.thU + A.thP, Bs.thU + Bs.thP, a), roll = lerp(A.roll, Bs.roll, a);
    y += (SV.u > 0 ? lerp(CAMLIFT, SV.cl, SV.u) : CAMLIFT) * Math.min(V.clear[1], 12);   // (A2: the still's lift, eased)
    // the pitch: the realm's framing for this window's shape, a look at the ground ahead, the visitor's tilt
    var look = V.def.look || 90, fx = Math.sin(yaw), fz = Math.cos(yaw);
    var ga = groundAt(V, x + fx * look, z + fz * look, false), gh = groundAt(V, x, z, false);
    var pfNow = Math.atan2(ga - gh, look) * pfK(V), pfA = A.pf === A.pf ? A.pf : pfNow, pfB = Bs.pf === Bs.pf ? Bs.pf : pfNow;
    // (the followed look, CS.pf, alone wherever both states have one: the ground read again here less the targets read
    // in the step is nothing until the ground under the look point is refined between the step and the drawing (a cell's
    // ground arriving), when it steps the pitch by itself: 0.055 deg in one frame, 3.3 deg/s, in DUNES at 197.13 s of
    // seed 7's test-order flight, c6b as well)
    if (A.pf === A.pf && Bs.pf === Bs.pf) pfNow = lerp(pfA, pfB, a);
    else pfNow += lerp(pfA, pfB, a) - lerp(A.pf === A.pf ? A.pfT : pfNow, Bs.pf === Bs.pf ? Bs.pfT : pfNow, a);
    // the one framing; the ground's look is off (pfK 0), so the pitch is the framing and the visitor's tilt
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
  /* (the owner's yes to 9 deg) a wide window's camera pitched up CAMUP deg over the realm's framing: on a desktop
     the horizon from 55 % to about three quarters of the way down, the words wholly on sky. WIDEK is 1 on a window 6 : 5
     or wider and 0 on any other (an upright tablet, a phone, a window near square: their own framing, exactly 0
     added), the stylesheet's own query (wideWin), so the world's tilt and the still sky it dissolves in over agree on
     every window; set with TALLK in setFrustum, so a resize or a rotation re-aims at once, and eased with the frustum
     when only the height changes (WIDEKT). Not a fade between: the credit row stands 54-59 % down on these windows, about
     where the unraised horizon is (55 %), so any share of the 9 between carries the horizon through the credit row at
     some shape ((1 - TALLK) gives an upright tablet 4.8 deg; 1 - smooth(0.75, 1.0, h / w) gives a 1000x900 window
     3.2 deg, the horizon behind the credit). Not 11-12 deg: there the sunrise sky's stack takes light ink over a
     light ground. Everything that frames the view reads basePitch (the camera, the planner's forecast of it,
     the moon's place). */
  var CAMUP = 9;
  var WIDEK = 1, WIDEKT = 1;
  function basePitch(V) {
    var fr = V.def.frame || [0.4, 0.6];
    if (SV.u > 0) return Math.atan((2 * lerp(fr[0], fr[1], lerp(TALLK, SV.tk, SV.u)) - 1) * lerp(FRT.tanY, SV.tanY, SV.u)) + CAMUP * DEG * WIDEK;   // (A2: the still's framing, eased)
    return Math.atan((2 * lerp(fr[0], fr[1], TALLK) - 1) * FR.tanY) + CAMUP * DEG * WIDEK;
  }
  /* the look at the ground ahead's share of the pitch: the world's own (0: none: one pitch everywhere) */
  function pfK(V) { return V.def.pitchFollow === undefined ? 0.2 : V.def.pitchFollow; }
  /* (the one camera) the cruise clearance: one band over the surface flown (the higher of the land and the
     cloud sea's top: the camera's ground), CRUISE[0] m over the sand to CRUISE[1] over the cloud sea, by a smooth function
     of the maps ahead (the cloud weight averaged over CW_S m along the held heading, through smooth(CW_A, CW_B)),
     followed at most CW_V a second (of the weight: 18 m of clearance over about 90 s at the most). There is no framing
     to blend and no mode: a framing weight turns the view by 41 deg and lifts the camera 150 m at every coast. The margin
     about solids follows the same weight */
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
    TRACE.push([+SIM.t.toFixed(3), V.k, +CS.x.toFixed(2), +CS.y.toFixed(2), +CS.z.toFixed(2), +(CS.psi / DEG).toFixed(2), +((CS.yawV + CS.phi) / DEG).toFixed(2), +CS.c.toFixed(1), +CS.auto.toFixed(2), null, SIM.fixG, SIM.fixO, 0, +SIM.u.toFixed(2), +CS.sv.toFixed(3), V.speed, SIM.reseat || 0]);   // (in cloud, u, the slip's speed, the realm's speed, the arrivals placed: H1 on the course)
    if (DEVKEEP) { var c = devClearance(); if (c) { DEVWORST.n++; if (c.vert < DEVWORST.vert) DEVWORST.vert = c.vert; if (c.solid < DEVWORST.solid) DEVWORST.solid = c.solid; if (c.core < DEVWORST.core) DEVWORST.core = c.core; } }
    if (TRACE.length > 40000) TRACE.splice(0, 10000);
  }

  /* ---------------------------------------------------------------- input: a drag anywhere, the phone's turn */
  /* No control is shown. A drag anywhere on the page (touch, pen, or a mouse with its main button held; it begins after
     8 px, so a tap stays a tap) turns the view and the flight: across the window's width, 90 deg (a little more than a
     desktop's view is wide, so a swipe across looks aside; the same on a phone, whose view is narrower), the scene
     following the finger; up and down, the view tilts and the flight climbs or dives. Let go, and the turn runs on a
     little and eases out; the tilt is kept. A pointer's moves are read only while it is pressed (no hover), there
     is no key handler, nothing is stored. A drag begun on a link steers and never follows it; a tap on a link is a tap.
     Two fingers are never steering (pinch-zoom is the page's: touch-action pinch-zoom, pan-y as well on a page that
     scrolls, and everything the browser's while it is zoomed in). The phone: its turn and tilt from where it was when
     motion began (iOS asks first, only inside a gesture: at the end of the first drag or a tap on the page, never on a
     link, never at load; refused, never asked again). Under reduced motion all of it is inert. */
  var INP = { dx: 0, dy: 0, down: false, rel: false, n: 0, lastDx: 0, evT0: 0 };
  var INPLOG = [], INPQ = /** @type {any[] & { i: number }} */ ([]); INPQ.i = 0;   // (dev: what the flight received a step; a script to replay)
  var DRAG = { id: -1, x0: 0, y0: 0, x: 0, y: 0, on: false, type: '', multi: false, cap: false, t0: 0, ts: 0 };
  /* (the owner: "the birds should be more interactive with the mouse") the birds' play reads the
     pointer where the device hovers: one passive listener of its moves (onHover: a mouse's or a pen's place, CSS px,
     hover included) and one of its leaving (onHoverOut: the pointer off the window), both added and removed by hoverSync
     only (never under reduced motion or forced colours, never where no pointer hovers); they only store, and nothing
     but the birds reads HOVER (the links and the words react to nothing). A touch held still HOLD_S s without a drag is
     read by the birds as a resting pointer HOLD_UP px above the fingertip (HOST.pointer); its lift is never a tap */
  var HOVER = { x: -1, y: -1, n: 0, gone: true, down: false, type: '' }, HOVERON = false, HOLD_S = 0.8, HOLD_UP = 50;
  function onHover(e) {
    if (e.pointerType === 'touch') return;
    HOVER.x = e.clientX; HOVER.y = e.clientY; HOVER.n++; HOVER.gone = false; HOVER.down = e.buttons !== 0; HOVER.type = e.pointerType || 'mouse';
  }
  function onHoverOut(e) { if (!e.relatedTarget && e.pointerType !== 'touch') HOVER.gone = true; }
  var SUPPRESS = false, SUPPRESS_N = 0;
  var CLICKQ = [];   // (clicks and taps for the birds, x, y CSS px pairs; drained by the birds each step)
  function inert() { return reduced() || DEAD || LOST; }
  function onLink(el) { for (var e = el; e && e !== root; e = e.parentNode) if (e.tagName === 'A' || e.tagName === 'BUTTON') return true; return false; }
  function onDown(e) {
    if (inert()) return;
    if (DRAG.id !== -1) { if (e.pointerId !== DRAG.id) { DRAG.multi = true; endDrag(false); } return; }   // (a second finger: no steering)
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if (e.pointerType === 'touch' && TOUCHMODE === 'zoom') return;   // (zoomed in: the finger is the browser's)
    DRAG.id = e.pointerId; DRAG.x0 = DRAG.x = e.clientX; DRAG.y0 = DRAG.y = e.clientY; DRAG.on = false; DRAG.type = e.pointerType || 'mouse'; DRAG.multi = false; DRAG.t0 = SIM.t; DRAG.ts = e.timeStamp;
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
      DRAG.on = true; DOMQ.steer = 1; DOMQ.unsel = true; if (!running) domNext();   // (data-steer and the selection cleared in the next frame)
      if (DRAG.type === 'mouse') { try { root.setPointerCapture(e.pointerId); DRAG.cap = true; } catch (er) { DRAG.cap = false; } }
      INP.down = true; DRAG.x = DRAG.x0; DRAG.y = DRAG.y0;   // (the first 8 px are taken too: the scene catches the finger up)
    }
    INP.dx += x - DRAG.x; INP.dy += y - DRAG.y; DRAG.x = x; DRAG.y = y;
    if (REC && !INP.evT0) INP.evT0 = e.timeStamp;   // (the record: the oldest move not yet drawn, for the input's latency)
  }
  function onUp(e) {
    if (e.pointerId !== DRAG.id) return;
    var was = DRAG.on;
    var held = DRAG.type === 'touch' && e.timeStamp - DRAG.ts >= HOLD_S * 1000;   // (a touch held for the birds is no tap)
    if (!was && !held && !onLink(e.target) && !FCOL.on && CLICKQ.length < 16) CLICKQ.push(e.clientX, e.clientY);   // (each click spawns a bird)
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
  /* (the owner, 2026-11-06: "Keep drag-only") the phone's turn is asked for only on iOS and iPadOS (an iPad behind a
     Mac user agent too): Chrome has DeviceOrientationEvent.requestPermission as well, grants it on a desktop's or an
     Android's first tap, and its listener then only logs the Permissions-Policy's refusal */
  var MOTIONIOS = (function () { var ua = navigator.userAgent || ''; return /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && (navigator.maxTouchPoints || 0) > 1); })();
  function askMotion() {
    if (MOTION.st !== 'off' || inert() || !MOTIONIOS) return;
    var DOE = /** @type {any} */ (window.DeviceOrientationEvent);   // (iOS's requestPermission: not in the DOM's types)
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
    if (REC && REC.ori.length < 6000) REC.ori.push([+e.timeStamp.toFixed(1), +e.alpha.toFixed(2), +e.beta.toFixed(2), +e.gamma.toFixed(2)]);   // (the record: raw, for the filter's lag)
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
      CS.om = clamp(sx / (12 * dt), -0.8, 0.8); CS.omP = clamp(sy / (12 * dt), -0.5, 0.5);   // (the coast: the speed x 0.3 s, at most 14 deg; the tilt's x 0.2 s, at most 5.7 deg)
    }
    if (!INP.down) {
      CS.yawV += CS.om * dt; CS.om *= Math.exp(-dt / 0.3);
      // (nothing turns the view by itself) the tilt the visitor set is kept: an ease to level after the release swings an
      // 18 deg tilt back 24.6 deg by itself over 8 s, at up to 8.8 deg/s. The climb or dive it drives stops at the
      // realm's clearance limits (simStep); the release's coast of the tilt is short (0.2 s, at most 0.5 rad/s), so 0.8 s after it the tilt's
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
      IDLE_K++; CS.idleAfter = 6 + 4 * hfl(ihash((IDLE_K * 2654435761 + (shown ? SEEDR : J.seed)) >>> 0));   // (6-10 s before the clearance eases back to the cruise height)
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
    hoverSync();   // (the birds' play's two listeners, added only while motion and colours allow it and the device hovers)
    window.addEventListener('click', onClick, true);
    window.addEventListener('touchend', onTouchEnd, { passive: true, capture: true });
    document.addEventListener('dragstart', function (e) { if (!inert()) e.preventDefault(); }, true);   // (a link is never dragged away)
    if (window.visualViewport) window.visualViewport.addEventListener('resize', function () { DOMQ.touch = true; if (!running) domNext(); });   // (measured in the next frame)
    touchMode();
    // the phone's motion only where it is asked for (iOS, inside a gesture: askMotion); elsewhere no listener at all (the
    // owner, 2026-11-06: "Keep drag-only": the Permissions-Policy denies the sensors, and a listener only logs its error)
  }

  /* ---------------------------------------------------------------- the simulation, driven */
  function simStepOnce() {
    copyState(CS, CSP); SIM.junction = false;
    var ok = simStep();
    if (ok) {   // the camera's travel (for the cloud it is in: continuous across the change of realm, wrapped on the noise's period)
      var V = SIM.V, v = V.speed;
      if (BIRDS && SW.birds && (STILLMODE || (SHOWNT >= 0 && SIM.t >= SHOWNT && lateBirds()))) { BIRDB.at = clockNow(); BIRDS.step(SIM_DT); BIRDB.spent += clockNow() - BIRDB.at; BIRDB.at = 0; }   // (the birds' clock and planning: a fixed step, as the flight's; timed for their budget; from the first frame shown)
    }
    return ok;
  }
  /* the live loop: fixed steps covering the frame's time (at most 0.1 s of it), drawn between the last two */
  /* (dev: data-dtmax lets a slow harness's frames carry more of the flight, so its streaming is that of real time;
     data-tscale multiplies the frame's time, so a slow harness flies a long course in less of its own) */
  var DTMAX = DEVMODE && OPT.dtmax && +OPT.dtmax > 0 ? Math.min(+OPT.dtmax, 2) : 0.1, NMAX = Math.ceil(DTMAX / SIM_DT) + 2;
  var TSCALE = 1;
  function simAdvance(dt) {
    SIM.acc += Math.min(dt, DTMAX);
    var n = 0;
    while (SIM.acc >= SIM_DT && n < NMAX) { if (!simStepOnce()) { SIM.acc = 0; break; } SIM.acc -= SIM_DT; n++; }
    if (n >= NMAX) SIM.acc = 0;
    SIM.alpha = clamp(SIM.acc / SIM_DT, 0, 1);
  }

  /* the harness: the camera's grid of ground (160 x 160 at 4 m, its envelope), drawn when the camera has moved 16 m, landing LAT frames late */
  var GQ = [], GLAT = 3, GK = [NaN, NaN];
  function gridAbout(cx, cz, sync) {
    var x0 = Math.floor(cx / 16) * 16 - GCN / 2 * GCCELL, z0 = Math.floor(cz / 16) * 16 - GCN / 2 * GCCELL;
    if (GK[0] === x0 && GK[1] === z0) return false;
    if (!sync && GQ.length) return false;   // (one grid in flight at a time, as GROUND.rd)
    GK[0] = x0; GK[1] = z0;
    var h = new Float32Array(GCN * GCN);
    for (var j = 0; j < GCN; j++) for (var i = 0; i < GCN; i++) h[j * GCN + i] = H(x0 + (i + 0.5) * GCCELL, z0 + (j + 0.5) * GCCELL);
    var g = { h: h, x0: x0, z0: z0, n: sync ? 0 : GLAT };
    if (sync) land(g); else GQ.push(g);
    return true;
  }
  function land(g) { GROUND.h.set(g.h); groundEnv(GROUND.h, GROUND.e); GROUND.V = V; GROUND.x0 = g.x0; GROUND.z0 = g.z0; GROUND.ok = true; GROUND.gen2 = (GROUND.gen2 || 0) + 1; }
  function gridTick() { if (GQ.length && --GQ[0].n <= 0) land(GQ.shift()); gridAbout(CS.x, CS.z, false); }
  function cellsTick() { V.cellList = cells(CS.x, CS.z, 6000); }
  var API = {
    SIM: SIM, INP: INP, V: V, GROUND: GROUND,
    start: function () { cellsTick(); gridAbout(0, 0, true); },
    stepOnce: function () { gridTick(); if (SIM.steps % 30 === 0) cellsTick(); var ok = simStepOnce(); FRAMEN++; return ok; },
    frame: function (dtS) { gridTick(); if (SIM.steps % 30 === 0) cellsTick(); simAdvance(dtS); FRAMEN++; },
    pose: function (a, out) { return camPose(V, SIM.u, a, out); },
    alpha: function () { return SIM.alpha; },
    groundAt: function (x, z, c, r) { return groundAt(V, x, z, c, r); },
    heightTarget: function () { return heightTarget(V, SIM.t); },
    st: function () { return { CS: CS, CSP: CSP }; },
    drag: function (dx, dy) { INP.down = true; INP.dx += dx; INP.dy += dy; },
    release: function () { INP.down = false; INP.rel = true; },
    setCss: function (w) { OUT.cssW = w; },
    applyInput: applyInput
  };
  
return API;
})