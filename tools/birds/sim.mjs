// sim.mjs: the ink birds run headless in Node, in seconds: the real module (src/ assembled as the build assembles it)
// on a stub host with no GL. A camera flies its heading at the page's speed; the words' boxes are the page's at
// 960x600 or 390x844; low hills and patches of the sea of cloud below; a pointer path, clicks and drags are
// scripted; the clock steps 50 ms. Every bird's state is
// read each step (sim.rec). test/birds.mjs runs its cases on it; run alone it prints one scenario and draws its paths.
//
//   node tools/birds/sim.mjs [--case perch|drop|cursor|click|drag|natural] [--seed N] [--size 960x600|390x844]
//                            [--secs S] [--svg FILE]      one scenario: a line a second, the paths as SVG
//
// Nothing here ships. The module is read as the build reads it; a few lines are put at the top of its birdsStep so
// the sim can see its records (BIRDS, PERCHED, ...) and make scenes with its own functions (newFlock, startApproach).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { loadGround } from '../../test/ground.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const DT = 0.05;
/* the words' boxes (CSS px: name ink, line, credit, link, link) and the name's viewBox (x, y, scale) as the served page
   lays them out, measured in Chromium (2026-11-06); the perches' tables (255-perch-ink.js) are in the name's units */
export const SIZES = {
  '960x600': { W: 960, H: 600, boxes: [279.25, 120.24, 680.69, 214.56, 278, 247.84, 660.5, 326.88, 278, 358.88, 682, 378.38, 28.8, 550.2, 64, 571.2, 88, 550.2, 142.3, 571.2], nvb: [278.018, 119.016, 0.30837] },
  '390x844': { W: 390, H: 844, boxes: [25.05, 253.41, 364.89, 333.25, 24, 366.34, 366, 445.37, 24, 477.37, 366, 496.87, 20, 803, 55.2, 824, 79.2, 803, 133.5, 824], nvb: [24.014, 252.37, 0.261047] },
};
const TANX = Math.tan(36 * Math.PI / 180), G = 9.81;
/* the land: the world's real ground, recorded on the 4090 (tools/gpu/record-ground.mjs: world seed 11, the camera's
   ground and the sea of cloud's weight and level, +-1500 m about the landing, every 10 m; outside it, its edge).
   tools/checks/37-ground-fresh.sh fails a stale recording (the world's ground moved since), saying to re-record.
   BIRDS_GROUND=stub: the old low hills and patches of sea instead. The sea is where the module's own test
   holds (its weight over 0.85: a sink starts only there), and its level is the page's (SEA_LO + RISE x weight) */
export const GROUND = process.env.BIRDS_GROUND === 'stub' ? null : loadGround(11);
export const groundAt = GROUND ? (x, z) => GROUND.groundAt(x, z) : (x, z) => -60 + 35 * Math.sin(x / 700) * Math.cos(z / 900);
export const seaW = GROUND ? (x, z) => (GROUND.seaW(x, z) > 0.85 ? 1 : 0) : (x, z) => (Math.sin(x / 1500 + z / 1100) > 0.3 ? 1 : 0);
const seaLv = GROUND ? (x, z) => GROUND.seaLv(x, z) : (x, z) => groundAt(x, z);

let SCRIPTS = null;
function scripts() {
  if (SCRIPTS) return SCRIPTS;
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'birdsim-'));
  execFileSync(process.execPath, [path.join(ROOT, 'tools/parts.mjs'), 'assemble', path.join(ROOT, 'src'), tmp], { stdio: 'pipe' });
  const at = '  function birdsStep(C, dt) {\n';
  let src = fs.readFileSync(path.join(tmp, 'inkbirds.js'), 'utf8');
  fs.rmSync(tmp, { recursive: true, force: true });
  if (src.indexOf(at) < 0) throw new Error('sim: birdsStep not found in the assembled inkbirds.js');
  src = src.replace(at, at + '    if (!self.__SIM) self.__SIM = { BIRDS: BIRDS, FLOCKS: FLOCKS, PERCHED: PERCHED, PW: PW, PTR: PTR, LVC: LVC,\n' +
    '      t: function () { return t; }, W: function () { return [W, H]; }, MODEL_K: MODEL_K, FDEV_MAX: FDEV_MAX, WINDV: WINDV,\n' +
    '      hidden: hidden, hideTop: hideTop, airT: airT, perchFoot: perchFoot, perchSpan: perchSpan, projReal: projReal, skyCls: skyCls,\n' +
    '      newFlock: newFlock, newGoal: newGoal, pickLedge: pickLedge, startApproach: startApproach, SLEEP: SLEEP, DF: function () { return DF; }, leave: leave, STEP_DT: function () { return STEP_DT; }, LB: LB, VW: VW, ledges: ledges, surfY: surfY, BW: BW, TD: function () { return TD; }, AD: function () { return AD; }, slotAt: slotAt, TP: TP, placeVel: placeVel };\n');
  const model = ['facetform', 'facetpose', 'wingmodel', 'model', 'labbird', 'birdwing'].map((f) => new vm.Script(fs.readFileSync(path.join(ROOT, 'src/birds/model', f + '.js'), 'utf8'), { filename: f + '.js' }));
  SCRIPTS = { model, birds: new vm.Script(src, { filename: 'inkbirds.js' }) };
  return SCRIPTS;
}

/* a scenario: o = { size, seed, pos (the eye's start, m), speed (m/s), wind [x, z] (m/s), yaw (deg/s, the camera's turn), pitch (deg),
   pointer (t -> {x, y} | null), clicks [{t, x, y}], drag {t0, t1, rate (deg/s)}, draw (also draw each step, on a GL
   stub; draw.data(array, n) sees every buffer the draw uploads), dt (the step, s: DT unless set; 1/60 is the page's), frames (sim.frame(fdt) draws display frames between steps, as the
   page does: the camera and the birds at the loop's alpha) } */
export function makeSim(o = {}) {
  const Z0 = SIZES[o.size || '960x600'], Z = { W: Z0.W, H: Z0.H, boxes: Z0.boxes.slice(), nvb: Z0.nvb.slice() }, W = Z.W, H = Z.H, SPEED = o.speed ?? 12, seed = o.seed ?? 11;
  const C = { pos: o.pos ? o.pos.slice() : [0, 40, 0], f: [0, 0, 1], r: [-1, 0, 0], u: [0, 1, 0], pitch: 0, roll: 0, inCloud: 0, cover: 0 };
  const PT = { x: 0, y: 0, n: 0, gone: true, down: false, steer: false, touch: false };
  const clicks = (o.clicks || []).slice().sort((a, b) => a.t - b.t);
  let t = 0, psi = 0, M = null, fed = 0;
  const SDT = o.dt || DT;
  const pitch = (o.pitch || 0) * Math.PI / 180;
  /* the GL stub: constants are numbers, calls do nothing (one function each: the stub itself allocates nothing) */
  const NOOP = () => null, GLF = {}, dd = o.draw && o.draw.data;
  if (dd) { GLF.bufferSubData = (t, off, a, s, n) => dd(a, n); GLF.texSubImage2D = (t, l, x, y, w, h, f, ty, a) => dd(a, w * h * 4); }
  const glStub = new Proxy({}, { get: (_, k) => { let v = GLF[k]; if (v === undefined) v = GLF[k] = typeof k === 'string' && /^[A-Z0-9_]+$/.test(k) ? 1 : NOOP; return v; } });
  const PROG = { p: {}, u: {}, ok: true }, LIGHT = { fog: [1e-4, 1 / 260, 0, 1.1e-4] }, WORDS = { boxes: Z.boxes, nvb: Z.nvb, kind: 'light' }, FORCED = { on: false };
  const HOST = { gl: glStub, glsl: { HEAD: '', FRAME_U: '', LIB: '', AIR: '' }, program: () => PROG, linked: () => !!o.draw, warm() {}, frameUniforms() {},
    view: (v) => { v.cssW = W; v.cssH = H; v.outW = W; v.outH = H; v.dpr = 1; v.bdpr = 1; v.ddpr = 1; v.tanX = TANX; v.tanY = TANX * H / W; v.sUx = v.sUy = v.hUx = v.hUy = 1; return v; },
    camera: () => (o.frames ? CD : C), cameraStep: () => C, wind: (v) => { v[0] = o.wind ? o.wind[0] : 0; v[1] = 0; v[2] = o.wind ? o.wind[1] : 0; return v; },
    flight: (v) => { v.ok = true; v.x = C.pos[0]; v.y = C.pos[1]; v.z = C.pos[2]; v.psi = psi; v.view = 0; v.speed = SPEED; v.vy = 0; v.ground = -60; return v; },
    sky: () => 'moonlit', pointer: (v) => Object.assign(v, PT), alpha: () => (o.frames ? ALPHA : 1), forced: () => FORCED,
    clicks: (v) => { v.length = 0; while (clicks.length && clicks[0].t <= t) { const k = clicks.shift(); v.push(k.x, k.y); fed++; } return v; },
    grade: () => null, light: () => LIGHT, words: () => WORDS,
    bindTextures: () => !!o.draw, target() {}, cloudBetween3: (ax, ay, az, P, v) => { v[0] = v[1] = v[2] = 0; return v; }, cover: () => 0, ground: (x, z) => groundAt(x, z), groundReach: () => 300,
    seaAt: (x, z, v) => { v.w = seaW(x, z); v.lv = seaLv(x, z); return v; }, places: (r, v) => { v.length = 0; return v; }, night: () => 1, pois: (r, v) => { v.length = 0; return v; },
    rng: (salt) => { let a = (seed ^ salt) >>> 0; return () => { a = (a + 0x9e3779b9) | 0; let q = a ^ (a >>> 16); q = Math.imul(q, 0x21f0aaad); q ^= q >>> 15; q = Math.imul(q, 0x735a2d97); return ((q ^ (q >>> 15)) >>> 0) / 4294967296; }; },
    reduced: () => false, budget: () => Infinity, count() {}, time: () => t };
  /* (a plain global, not a contextified sandbox: a sandbox's interceptors make every global read, Math's included,
     some 60 times slower than a page's, and the sim's timings measured that, not the birds) */
  const ctx = vm.createContext(vm.constants.DONT_CONTEXTIFY);
  ctx.console = console; ctx.self = ctx; ctx.window = ctx;
  ctx.WORLD = { birds: (f) => { M = f(HOST); }, stamp() {} };
  const S = scripts();
  for (const s of S.model) s.runInContext(ctx);
  S.birds.runInContext(ctx);
  if (!M) throw new Error('sim: the module did not register');
  const aimC = (C, psi) => { const cp = Math.cos(pitch), sp = Math.sin(pitch), s = Math.sin(psi), c = Math.cos(psi); C.f[0] = s * cp; C.f[1] = sp; C.f[2] = c * cp; C.r[0] = -c; C.r[1] = 0; C.r[2] = s; C.u[0] = -s * sp; C.u[1] = cp; C.u[2] = -c * sp; };
  const aim = () => aimC(C, psi);
  /* (o.frames) the camera as drawn: between the last two steps, by the loop's alpha, as the page draws it */
  const CD = { pos: C.pos.slice(), f: [0, 0, 1], r: [-1, 0, 0], u: [0, 1, 0], pitch: 0, roll: 0, inCloud: 0, cover: 0 }; let ALPHA = 1, ACC = 0, PPOS = C.pos.slice(), PPSI = 0;
  aim();
  /* one step: the pointer and the camera, then the module's step */
  const advance = () => {
    let yaw = o.yaw || 0;
    const d = o.drag; PT.steer = !!(d && t >= d.t0 && t < d.t1);
    if (PT.steer) yaw += d.rate;
    if (o.pointer) { const p = o.pointer(t); if (p) { PT.x = p.x; PT.y = p.y; PT.gone = false; } else PT.gone = true; }
    psi += yaw * Math.PI / 180 * SDT; aim();
    C.pos[0] += SPEED * Math.sin(psi) * SDT; C.pos[2] += SPEED * Math.cos(psi) * SDT;
    M.step(SDT);
  };
  const sim = {
    W, H, C, PT, get t() { return t; }, get clicks() { return fed; },   // clicks: how many the sim has fed the page
    get B() { return ctx.__SIM; },
    step() { advance(); if (o.draw) M.draw(); t += SDT; },
    /* (o.frames) one display frame of fdt s, as the page's loop runs it: the fixed steps of SDT it covers, then the
       draw with the camera and the birds between the last two steps (alpha) */
    frame(fdt) {
      ACC += Math.min(fdt, 0.1); let n = 0;
      while (ACC >= SDT - 1e-12 && n < 8) { PPOS = C.pos.slice(); PPSI = psi; advance(); t += SDT; ACC -= SDT; n++; }
      ALPHA = Math.min(1, Math.max(0, ACC / SDT));
      for (let i = 0; i < 3; i++) CD.pos[i] = PPOS[i] + (C.pos[i] - PPOS[i]) * ALPHA;
      aimC(CD, PPSI + (psi - PPSI) * ALPHA);
      M.draw(); return n;
    },
    get alpha() { return ALPHA; },
    run(secs, each) { const n = Math.round(secs / SDT); for (let i = 0; i < n; i++) { sim.step(); if (each && each(sim) === false) return; } },
    /* a point ahead of the eye: d m on, xs*d m to the right, up m over */
    ahead(d, xs, up) { return [C.pos[0] + d * C.f[0] + d * xs * C.r[0], C.pos[1] + d * C.f[1] + up, C.pos[2] + d * C.f[2] + d * xs * C.r[2]]; },
    flock(p, pat, kind, n, heading) { const F = sim.B.newFlock(p[0], p[1], p[2], 0, sim.B.skyCls(), [pat, kind, n]); for (const b of F.m) b.psi = heading ?? psi; return F; },
    land(b, delay) { const P = sim.B.pickLedge(b, b.r); if (P) sim.B.startApproach(b, P, delay || 0); return !!P; },
    heading() { return psi; },
    /* one bird now: its state, where it is from the eye and from its perch (m), its speed, bank, heading, climb, and on
       the window its middle and its span (CSS px; NaN behind the eye) */
    rec(b) {
      const B = sim.B, q = B.projReal(b.p[0], b.p[1], b.p[2], C, {}), span = q.z > 0.5 ? (b.sz / B.MODEL_K) * (W / 2) / TANX / q.z : 0;
      const r = { t, id: b.id, st: b.st, p: b.p.slice(), V: b.V, phi: b.phi, psi: b.psi, gam: b.gam, x: q.x, y: q.y, z: q.z, span, eye: Math.hypot(b.p[0] - C.pos[0], b.p[1] - C.pos[1], b.p[2] - C.pos[2]) };
      const P = b.P;
      if (P && P.at && P.ok) {
        const d = [b.p[0] - P.at[0], b.p[1] - P.at[1], b.p[2] - P.at[2]], u = [b.v[0] - P.v[0], b.v[1] - P.v[1], b.v[2] - P.v[2]], rng = Math.hypot(...d);
        r.kind = P.kind; r.gated = !!P.gated; r.d0 = P.d0; r.tau0 = P.tau0; r.go = P.go; r.tries = P.tries; r.pf = d; r.rng = rng; r.close = -(d[0] * u[0] + d[1] * u[1] + d[2] * u[2]) / (rng || 1);
        r.tau = r.close > 1e-3 ? rng / r.close : Infinity;
        const f = B.perchFoot(P, [0, 0]); r.foot = f.slice(); r.walking = !!P.walk;
        if (b.st === 'perch') { r.yaw = P.yaw; r.yawTo = P.yawTo; r.hopTurn = !!P.hopTurn; r.act = P.act ? P.act.k : null; r.leaving = !!P.leaving; }
      }
      return r;
    },
  };
  return sim;
}

/* the paths as a small SVG: each tagged bird's track in its perch's frame (top: across and along the camera's way;
   side: along and up), m, the perch at the origin; touchdown marked */
export function svgPaths(tracks, title) {
  const pane = (name, ix, iy, ox) => {
    let s = `<g transform="translate(${ox},20)"><text x="0" y="-6" font-size="11">${name}</text><rect width="300" height="300" fill="none" stroke="#999"/>`;
    s += '<line x1="150" y1="0" x2="150" y2="300" stroke="#ddd"/><line x1="0" y1="150" x2="300" y2="150" stroke="#ddd"/>';
    let R = 10; for (const tr of tracks) for (const q of tr) if (q.pf) R = Math.max(R, Math.abs(q.pf[ix]), Math.abs(q.pf[iy]));
    const k = 145 / R;
    for (const tr of tracks) {
      const pts = tr.filter((q) => q.pf).map((q) => `${(150 + q.pf[ix] * k).toFixed(1)},${(150 - q.pf[iy] * k).toFixed(1)}`);
      if (pts.length) s += `<polyline points="${pts.join(' ')}" fill="none" stroke="#246" stroke-width="1"/>`;
      const td = tr.find((q) => q.st === 'perch'); if (td) s += `<circle cx="150" cy="150" r="3" fill="#c33"/>`;
    }
    return s + `<text x="0" y="314" font-size="10">${(2 * R).toFixed(0)} m across</text></g>`;
  };
  return `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="350" font-family="sans-serif"><text x="10" y="12" font-size="12">${title || ''}</text>${pane('top (x across, z along)', 0, 2, 10)}${pane('side (z along, y up)', 2, 1, 330)}</svg>`;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const A = {}; for (let i = 2; i < process.argv.length; i += 2) A[process.argv[i].replace(/^--/, '')] = process.argv[i + 1];
  const { SCENES } = await import(path.join(ROOT, 'test/birds-scenes.mjs'));
  const sc = SCENES[A.case || 'perch'](+(A.seed || 1), A.size || '960x600');
  const sim = makeSim(sc.opt); const tag = sc.setup(sim); const secs = +(A.secs || sc.secs), track = [];
  let last = -1, landings = 0; const was = new Map();
  sim.run(secs, () => {
    for (const b of sim.B.BIRDS) { if (b.st === 'perch' && was.get(b) !== 'perch') landings++; was.set(b, b.st); }
    for (const b of tag) {
      const q = sim.rec(b); track.push(q);
      if (Math.floor(sim.t) !== last) { last = Math.floor(sim.t); console.log(`${q.t.toFixed(1)} ${q.st}${q.kind ? '/' + q.kind : ''}${q.gated ? '+g' : ''}${q.go ? ' re' + q.go : ''}${q.tries ? ' round' + q.tries : ''} eye ${q.eye.toFixed(0)} m  win ${q.x.toFixed(0)},${q.y.toFixed(0)} span ${q.span.toFixed(0)} px` + (q.rng !== undefined ? `  perch ${q.rng.toFixed(1)} m closing ${q.close.toFixed(1)} m/s tau ${q.tau.toFixed(1)} s` : '')); }
    }
  });
  console.log('birds', sim.B.BIRDS.length, 'flocks', sim.B.FLOCKS.length, 'landings', landings, 'clicks', sim.clicks);
  if (A.svg) fs.writeFileSync(A.svg, svgPaths([track], `${A.case || 'perch'} seed ${A.seed || 1}`));
}
