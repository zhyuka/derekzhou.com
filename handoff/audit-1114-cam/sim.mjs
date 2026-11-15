// sim.mjs: the flight's own code (cut verbatim from an assembled world.js) flown headless over a synthetic land.
// export makeSim({ world, seed, land, obst, latency }) -> { step(), frame(dtMs), S (CS), SIM, camPose(alpha), input... }
import fs from 'node:fs';
import vm from 'node:vm';

function cutLines(src, a, b) {
  const L = src.split('\n');
  const i = L.findIndex((l) => l.startsWith(a));
  const j = L.findIndex((l, k) => k > i && l.startsWith(b));
  if (i < 0 || j < 0) throw new Error('anchor ' + a + ' / ' + b);
  return L.slice(i, j).join('\n');
}

// ---- a synthetic land with the dunes' statistics (dunes(p) and ridges(p) in dunes-glsl.glsl, value noise for gnd)
function hash2(i, j, s) { let h = (Math.imul(i, 0x8da6b343) ^ Math.imul(j, 0x68e31da4) ^ Math.imul(s, 0x27d4eb2d)) >>> 0; h ^= h >>> 15; h = Math.imul(h, 0x2c1b3c6d) >>> 0; h ^= h >>> 12; h = Math.imul(h, 0x297a2d39) >>> 0; h ^= h >>> 15; return (h >>> 0) / 4294967296; }
function vnoise(x, y, s) {   // [-1, 1], C1
  const i = Math.floor(x), j = Math.floor(y), fx = x - i, fy = y - j, ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
  const a = hash2(i, j, s), b = hash2(i + 1, j, s), c = hash2(i, j + 1, s), d = hash2(i + 1, j + 1, s);
  return 2 * ((a * (1 - ux) + b * ux) * (1 - uy) + (c * (1 - ux) + d * ux) * uy) - 1;
}
function duneWave(px, pz, wx, wz, lam, c, warp) {
  const f = ((px * wx + pz * wz) / lam + warp) % 1, ff = f < 0 ? f + 1 : f;
  if (ff < c) { const x = ff / c; return x * x * (2 - x); }
  const y = (ff - c) / (1 - c); return 1 - y * y * (3 - 2 * y);
}
export function makeLand(seed) {
  const wa = hash2(seed, 1, 9) * 2 * Math.PI, wx = Math.sin(wa), wz = Math.cos(wa);
  const RS = 2400, ridgesCache = new Map();
  function ridgeCell(i, j) {
    const k = i + ',' + j; if (ridgesCache.has(k)) return ridgesCache.get(k);
    let r = null;
    if (hash2(i, j, seed + 2) < 0.45) r = { cx: (i + 0.25 + 0.5 * hash2(i, j, seed + 3)) * RS, cz: (j + 0.25 + 0.5 * hash2(i, j, seed + 4)) * RS, L: 900 + 700 * hash2(i, j, seed + 5), H: 30 + 30 * hash2(i, j, seed + 6), a: hash2(i, j, seed + 7) * Math.PI, w: 0.5 + 0.3 * hash2(i, j, seed + 8) };
    ridgesCache.set(k, r); return r;
  }
  function sstep(a, b, x) { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); }
  return function H(x, z) {
    let h = 40 * vnoise(x / 760, z / 760, seed) + 15 * vnoise((0.8 * x - 0.6 * z) / 330, (0.6 * x + 0.8 * z) / 330, seed + 1);
    const warp = 0.42 * vnoise(x / 340, z / 340, seed + 2) + 0.13 * vnoise(x / 95, z / 95, seed + 3);
    const amp = sstep(-0.42, 0.3, vnoise((x * wx + z * wz) / 420, (-x * wz + z * wx) / 190, seed + 4)) * 0.75 + 0.25;
    h += 32 * duneWave(x, z, wx, wz, 205, 0.68, warp) * amp;
    const w2x = wx + 1.3 * -wz, w2z = wz + 1.3 * wx, l2 = Math.hypot(w2x, w2z);
    h += 4 * duneWave(x + 37, z + 37, w2x / l2, w2z / l2, 64, 0.7, 0.25 * vnoise(x / 80, z / 80, seed + 5)) * sstep(-0.5, 0.4, vnoise(x / 160, z / 160, seed + 6));
    const ci = Math.floor(x / RS), cj = Math.floor(z / RS);
    for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
      const r = ridgeCell(ci + i, cj + j); if (!r) continue;
      const dx = x - r.cx, dz = z - r.cz, ca = Math.cos(r.a), sa = Math.sin(r.a), lx = (ca * dx + sa * dz) / r.L, ly = (-sa * dx + ca * dz) / r.L;
      if (Math.abs(lx) > 1.3 || Math.abs(ly) > r.w * 2.2 + 0.2) continue;
      const across = sstep(1, 0, Math.abs(ly) / r.w), along = sstep(1.15, 0.45, Math.abs(lx));
      h += r.H * (across * across * 0.35 + across * 0.65) * along;
    }
    return h;
  };
}
export function makeCloudWeight(seed) {   // the maps' cloud-sea weight (kw[3]): mostly sand, now and then a sea
  return (x, z) => Math.min(1, Math.max(0, 0.5 + 0.9 * vnoise(x / 2600, z / 2600, seed + 40)));
}
export function makeObstacles(seed, H, opts = {}) {   // cells of 500 m: small stones (climbable), now and then a tall mesa (passed beside)
  const cells = new Map(), CS = 500;
  return function cellsAbout(x, z, R) {
    const out = [], ci = Math.floor(x / CS), cj = Math.floor(z / CS), n = Math.ceil(R / CS);
    for (let j = cj - n; j <= cj + n; j++) for (let i = ci - n; i <= ci + n; i++) {
      const k = i + ',' + j; let C = cells.get(k);
      if (!C) {
        C = { st: 2, obst: [], bound: [(i + 0.5) * CS, 0, (j + 0.5) * CS, CS * 0.75] };
        const f = hash2(i, j, seed + 50);
        if (opts.mesas !== false && f < 0.05) {   // a tall mesa: 105-250 m across, its top 170-335 m over the land
          const ox = (i + 0.2 + 0.6 * hash2(i, j, seed + 51)) * CS, oz = (j + 0.2 + 0.6 * hash2(i, j, seed + 52)) * CS, g = H(ox, oz);
          if (opts.tall) C.obst.push({ c: true, x: ox, z: oz, r: 52 + 73 * hash2(i, j, seed + 53), y0: g - 10, y1: g + 170 + 165 * hash2(i, j, seed + 54) });
          else C.obst.push({ c: true, x: ox, z: oz, r: 195 + 195 * hash2(i, j, seed + 53), y0: g - 30, y1: g + 50 + 64 * hash2(i, j, seed + 54) });   // (world6's formations: FORM_K 0.25, a mesa's solid r 195-390 m, its top 50-114 m)
        } else if (opts.stones !== false && f < 0.35) {   // small stones, 4-13 m
          const nn = 1 + Math.floor(3 * hash2(i, j, seed + 55));
          for (let q = 0; q < nn; q++) { const ox = (i + hash2(i, j, seed + 60 + q)) * CS, oz = (j + hash2(i, j, seed + 70 + q)) * CS, g = H(ox, oz); C.obst.push({ c: true, x: ox, z: oz, r: 2 + 3 * hash2(i, j, seed + 80 + q), y0: g - 1, y1: g + 4 + 9 * hash2(i, j, seed + 90 + q) }); }
        }
        if (opts.clouds && f > 1 - (opts.cloudP || 0.1)) {   // a cloud's core, and its visible body (lobes about it)
          const ox = (i + 0.5) * CS, oz = (j + 0.5) * CS, oy = H(ox, oz) + 20 + 30 * hash2(i, j, seed + 99), orr = 40 + 40 * hash2(i, j, seed + 98);
          C.obst.push({ x: ox, z: oz, y: oy, r: orr, cloud: true });
          if (opts.lobes) {
            const L = [], nl = opts.lobes;
            for (let q = 0; q < nl; q++) L.push(ox + (hash2(i, q, seed + 101) - 0.5) * 3 * orr, oy + (hash2(i, q, seed + 102) - 0.5) * orr, oz + (hash2(j, q, seed + 103) - 0.5) * 3 * orr, 15 + 25 * hash2(j, q, seed + 104));
            C.soft = new Float64Array(L); C.softB = [[ox, oy, oz, 2.2 * orr, 0, L.length]];
          }
        }
        cells.set(k, C);
      }
      out.push(C);
    }
    return out;
  };
}

export function makeSim(o = {}) {
  const src = fs.readFileSync(o.world, 'utf8');
  const head = cutLines(src, '  function mix32(a)', '  /* ---------------------------------------------------------------- colour */') +
    '\n' + cutLines(src, '  function clamp(x, a, b)', '  function dirAzEl(');
  const angd = cutLines(src, '  function angDiff(a, b)', '  var PI = Math.PI');
  const body = cutLines(src, '  /* ---------------------------------------------------------------- the ground about the camera */', '  /* ---------------------------------------------------------------- shaders: the scene */');
  const drive = cutLines(src, '  /* ---------------------------------------------------------------- the simulation, driven */', '  /* the world, built (every stage; there is no passage bake) */');
  const H = o.land || makeLand(o.seed || 1), KWF = o.cw || makeCloudWeight(o.seed || 1), cells = o.cells || makeObstacles(o.seed || 1, H, o.obstOpts || {});
  const ctx = { ...(o.ctxExtra || {}), H, KWF, cells, console, Float32Array, Float64Array, Int32Array, Uint8Array, Math, navigator: { userAgent: 'node', maxTouchPoints: 0 }, cssW: o.cssW || 1440, tanY: o.tanY || Math.tan(0.5 * 2 * Math.atan(Math.tan(36 * Math.PI / 180) * 900 / 1440)) };
  vm.createContext(ctx);
  const prelude = `
  var PI = Math.PI, DEG = Math.PI / 180;
  ${head}
  ${angd}
  var DEVMODE = false, STILLMODE = false, OPT = {}, REC = null, SW = { camhold: 0, birds: 0, stream: 1, look: 0 }, BIRDS = null, J = { seed: ${o.seed || 1} }, SEEDR = ${o.seedr || 7}, shown = true, SHOWNT = 0;
  var VSTAGES = [], NOISE = { done: true }, KW = { tex: 1, ok: true }, WORLD_FLYERS = true, LATEK = {}, FRAMEN = 0, SUPPRESS_F = 0, DOMQ = {}, running = true, FCOL = { on: false }, DEAD = false, LOST = false;
  var OUT = { cssW: cssW }, FR = { tanX: 1, tanY: tanY }, FRT = { tanX: 1, tanY: tanY }, SV = { u: 0 }, CAMLIFT = 0, root = null, window = {}, document = {};
  var BIRDB = { at: 0, spent: 0 }, CTR = { plans: 0 };
  function reduced() { return false; } function clockNow() { return 0; } function lateBirds() { return false; }
  function planVisit() {} function kwFollow() {} function kwUpload() {} function climateLight() {} function directorStep() {} function beamWake() {} function flockOf(f) { return f; } function domNext() {}
  var KWA = [0, 0, 0, 0]; function kwAt(x, z) { KWA[0] = 1; KWA[3] = KWF(x, z); return KWA; }
  var V = { k: 1, st: 0, speed: 12, clear: [7, 14, 45], cellList: [], evRng: null, def: { speed: 12, clear: [7, 14, 45], frame: [0.55, 0.58], cruise: [14, 32], look: 90, pitchFollow: 0, margin: 12, marginB: 26, lookT: 20, lookTan: 0.15, event: null, P: { st: 2 } }, paramsFlat: 1 };
  V.evRng = RNG(5);
  function worldAt(t) { return { V: V, u: t }; }
  `;
  const tail = `
  /* the harness: the camera's grid of ground (160 x 160 at 4 m, its envelope), drawn when the camera has moved 16 m, landing LAT frames late */
  var GQ = [], GLAT = ${o.latency === undefined ? 3 : o.latency}, GK = [NaN, NaN];
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
  `;
  let code = '(function (H, KWF, cells, cssW, tanY) {\n"use strict";\n' + prelude + body + '\n' + drive + '\n' + tail + '\nreturn API;\n})';
  for (const [a, b] of (o.patch || [])) { if (code.split(a).length !== 2) throw new Error('patch anchor not once: ' + a.slice(0, 60)); code = code.replace(a, b); }
  fs.writeFileSync(new URL('./sim-assembled.js', import.meta.url), code);
  const fn = vm.runInContext(code, ctx, { filename: 'sim-assembled.js' });
  const api = fn(H, KWF, cells, ctx.cssW, ctx.tanY);
  api.start();
  return api;
}
