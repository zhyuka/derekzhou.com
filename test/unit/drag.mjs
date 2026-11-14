// test/unit/drag.mjs: the drag: where it starts, how far it turns
// (split from test/unit.mjs, 2026-11-07: one file an area, found by glob, so two PRs that add tests never share a file)
// plant: {"file": "src/world/340-input-drag-anywhere-phone-turn.js", "find": "if (dx * dx + dy * dy < 64) return;", "with": "if (dx * dx + dy * dy < 16) return;", "why": "a drag that starts after 4 px, not 8"}
import { test, assert, fs, os, path, vm, crypto, execFileSync, ROOT, TMP, WORLD, cut, golden, md5, upd, digest, STREAMS, VEC, fileURLToPath } from '../unit-lib.mjs';

// ------------------------------------------------------------------ the drag: where it starts, how far it turns
// (dev-speed item 5c) onMove cut from the world as it ships (the start: 8 px, the first 8 px taken too; a vertical swipe
// on a touch page that scrolls left to the page), and applyInput's gain line (90 degrees across the window's width)
const MOVE = cut(WORLD, '  function onMove(e) {', '  function onUp(e) {');
const GAIN = /\n(\s*var G = \(PI \/ 2\) \/ Math\.max\(OUT\.cssW \|\| 800, 240\),)/.exec(WORLD);
function dragging(type = 'mouse', mode = 'none') {
  return vm.runInThisContext('(function (TYPE, MODE) {\n  \'use strict\';\n  var DRAG = { id: 1, x0: 100, y0: 100, x: 100, y: 100, on: false, type: TYPE }, TOUCHMODE = MODE, DOMQ = {}, running = true, REC = null,\n' +
    '    INP = { dx: 0, dy: 0, down: false }, root = { setPointerCapture: function () {} };\n  function domNext() {}\n' + MOVE +
    '\n  return { move: function (x, y) { onMove({ pointerId: 1, clientX: x, clientY: y, timeStamp: 0 }); }, on: function () { return DRAG.on; }, inp: INP };\n})')(type, mode);
}
test('drag: under 8 px is still a tap; from 8 px it steers, the first 8 px taken too', () => {
  const D = dragging(); D.move(104, 104); D.move(105.6, 105.6);   // (7.9 px from the press)
  assert.equal(D.on(), false, 'under 8 px: a tap'); assert.equal(D.inp.dx, 0);
  D.move(108, 100);   // (8 px across)
  assert.equal(D.on(), true, '8 px: a drag'); assert.equal(D.inp.dx, 8, 'the first 8 px steer too'); assert.equal(D.inp.down, true);
  D.move(130, 90); assert.equal(D.inp.dx, 30); assert.equal(D.inp.dy, -10);
});
test('drag: a vertical swipe on a touch page that scrolls is the page\'s; across it steers', () => {
  const V = dragging('touch', 'scroll'); V.move(103, 140); assert.equal(V.on(), false, 'vertical: the page scrolls');
  const H = dragging('touch', 'scroll'); H.move(140, 103); assert.equal(H.on(), true, 'across: it steers');
});
test('drag: across the window\'s width the view turns 90 degrees, on any width', () => {
  assert.ok(GAIN, 'applyInput\'s gain line not found in world.js');
  const g = (w) => vm.runInThisContext('(function (OUT) { var PI = Math.PI, INP = {};' + GAIN[1].replace(/,$/, ';') + ' return G; })')({ cssW: w });
  for (const w of [1440, 393, 800, 2560, 240]) assert.ok(Math.abs(g(w) * w - Math.PI / 2) < 1e-12, `${w} px: ${(g(w) * w * 180) / Math.PI} degrees`);
  assert.ok(Math.abs(g(100) * 240 - Math.PI / 2) < 1e-12, 'a window under 240 px turns as one of 240');
  assert.ok(Math.abs(g(0) * 800 - Math.PI / 2) < 1e-12, 'a window not yet measured turns as one of 800');
});

// ------------------------------------------------------------------ the drag, even and at once
// (drag-even) inputFrame, applyInput and simAdvance cut from the world as it ships, onMove fed a steady drag at a
// display's rate (one coalesced move a frame, or every move of a 1000 Hz mouse), each frame drawn between the last two
// steps as camPose draws it. The view shows the finger where its newest move put it, in the frame that reads the move,
// on every frame at 60 to 240 Hz and any phase of the steps: the turn a frame is the finger's move that frame, and the
// time behind the finger is only the move's own lag. (Before: the first step of a frame took the frame's whole drag,
// drawn between the steps, so a frame turned 0, 1 or 2 frames' worth and the view trailed the finger by 0-17 ms.)
const INPUT = cut(WORLD, '  var IDLE_K = 0;', '  /* dev: an input injected');
const ADV = cut(WORLD, '  var TSCALE = 1;', '  /* the world, built');
const MOVE2 = cut(WORLD, '  function onMove(e) {', '  function onUp(e) {');
function flying(phase) {
  return vm.runInThisContext('(function (PHASE) {\n  \'use strict\';\n' +
    '  var PI = Math.PI, DEG = PI / 180, SIM_DT = 1 / 60, DTMAX = 0.1, NMAX = Math.ceil(DTMAX / SIM_DT) + 2, TH_MAX = 35 * DEG, DEVMODE = false, shown = true, SEEDR = 1, J = { seed: 1 };\n' +
    '  var CLK = new Float64Array([0, -1]), SIM = { acc: PHASE * SIM_DT, alpha: 0, t: 0 }, OUT = { cssW: 1000 }, MOTION = { on: false }, INPQ = []; INPQ.i = 0;\n' +
    '  var INP = { dx: 0, dy: 0, down: true, rel: false, evT0: 0, fx: 0, fy: 0 }, DRAG = { id: 1, x0: 0, y0: 0, x: 0, y: 0, on: true, type: \'mouse\' };\n' +
    '  var TOUCHMODE = \'none\', DOMQ = {}, running = true, REC = null, root = {}, coast = null;\n' +
    '  function S() { return { yawV: 0, thU: 0, ring: new Float32Array(12), ringP: new Float32Array(12), ri: 0, om: 0, omP: 0, since: 0, lastIn: 0, auto: 0, idleAfter: 0, phi: 0, thP: 0, thPraw: 0 }; }\n' +
    '  var CS = S(), CSP = S();\n' +
    '  function clamp(x, a, b) { return x < a ? a : x > b ? b : x; }\n  function angDiff(a, b) { return a - b; }\n  function hfl() { return 0.5; }\n  function ihash(x) { return x; }\n' +
    '  function domNext() {}\n  function devInput() {}\n' +
    '  function simStepOnce() {\n    CSP.yawV = CS.yawV; CSP.thU = CS.thU; var rel = INP.rel;\n    applyInput(SIM_DT, SIM.t, null); SIM.t += SIM_DT;\n' +
    '    if (rel && !INP.rel) { var om = CS.om / Math.exp(-SIM_DT / 0.3); coast = { yaw: CS.yawV - om * SIM_DT, om: om }; }   // (the coast begins: the yaw before its first step, its speed)\n    return true;\n  }\n' +
    INPUT + '\n' + MOVE2 + '\n' + ADV +
    '\n  return {\n    move: function (x, ts) { onMove({ pointerId: 1, clientX: x, clientY: 0, timeStamp: ts }); },\n    up: function () { INP.down = false; INP.rel = true; },\n    cancel: function () { INP.down = false; INP.rel = false; },\n' +
    '    frame: function (ts) { var dt = CLK[1] < 0 ? 0 : ts - CLK[1]; CLK[1] = ts; simAdvance(dt / 1000); return CSP.yawV + (CS.yawV - CSP.yawV) * SIM.alpha; },\n' +
    '    rel: function () { return INP.rel; }, coast: function () { return coast; }, yaw: function () { return CS.yawV; }\n  };\n})')(phase);
}
const GAIN1000 = (Math.PI / 2) / 1000;
// a steady drag of V px/ms for 3 s: the time each drawn frame trails the finger, and the turn each frame
function steady(hz, stepPhase, framePhase, moveLag, mouse1k, V = 0.6) {
  const F = flying(stepPhase), P = 1000 / hz, lat = [], turn = [];
  let last = null, tm = 1000 - P;
  for (let k = 0; k < 3 * hz; k++) {
    const ts = 1000 + framePhase * P + k * P;
    if (mouse1k) { for (; tm <= ts - moveLag; tm += 1) F.move(V * tm, tm); } else F.move(V * (ts - moveLag), ts - moveLag);
    const y = F.frame(ts);
    if (k > hz / 2) { lat.push(ts - y / (GAIN1000 * V)); turn.push(y - last); }
    last = y;
  }
  return { lat, turn };
}
const RATES = [60, 75, 120, 144, 240], STEPS = [0, 0.13, 0.5, 0.87], FRAMES = [0, 0.31, 0.77];
test('drag: the view shows the finger in the frame that reads its move, at 60-240 Hz and any phase (no step behind)', () => {
  for (const hz of RATES) for (const sp of STEPS) for (const fp of FRAMES) for (const lag of [0.4, 3.1]) for (const k1 of [false, true]) {
    const { lat } = steady(hz, sp, fp, lag, k1), lo = Math.min(...lat), hi = Math.max(...lat), want = [lag, k1 ? lag + 1 : lag];
    assert.ok(lo > want[0] - 1e-6 && hi < want[1] + 1e-6, `${hz} Hz, steps at ${sp}, frames at ${fp}, moves ${lag} ms early${k1 ? ', a 1000 Hz mouse' : ''}: the view trails the finger ${lo.toFixed(2)}-${hi.toFixed(2)} ms (want ${want[0]}-${want[1]})`);
  }
});
test('drag: a steady drag turns the view the same each drawn frame, at 60-240 Hz and any phase', () => {
  for (const hz of RATES) for (const sp of STEPS) for (const fp of FRAMES) {
    const { turn } = steady(hz, sp, fp, 0.4, false), want = 0.6 * GAIN1000 * (1000 / hz);
    for (const d of turn) assert.ok(Math.abs(d - want) / want < 1e-6, `${hz} Hz, steps at ${sp}, frames at ${fp}: a frame turned ${(d / want * 100).toFixed(1)}% of the finger's move`);
  }
});
test('drag: released, the coast starts from the whole drag and at the drag\'s speed; cancelled, its last moves are not drawn', () => {
  const V = 0.3;   // (300 px/s: 0.47 rad/s, under the coast's 0.8 cap)
  for (const hz of [60, 144]) for (const sp of STEPS) for (const fp of [0, 0.5]) {
    const F = flying(sp), P = 1000 / hz; let x = 0, k = 0, ts = 0;
    for (; k < hz; k++) { ts = 1000 + fp * P + k * P; x = V * (ts - 0.4); F.move(x, ts - 0.4); if (k === hz - 1) F.up(); F.frame(ts); }   // (the release right after the last move, in its frame)
    for (let n = 0; n < 10 && F.rel(); n++) F.frame(ts += P);
    const c = F.coast();
    assert.ok(c, `${hz} Hz, steps at ${sp}: the release never began the coast`);
    assert.ok(Math.abs(c.yaw - x * GAIN1000) < 1e-9, `${hz} Hz, steps at ${sp}, frames at ${fp}: the coast starts at ${c.yaw} rad, the drag was ${x * GAIN1000}`);
    const om = V * 1000 * GAIN1000;
    // (the coast's speed is the ring's last 12 steps of drag: exact at 60 Hz; at 144 Hz a step holds 2 or 3 frames' moves,
    // so its last 0.2 s is off by up to a frame's worth or so: up to 6.3% here, as on main)
    assert.ok(Math.abs(c.om - om) / om < (hz === 60 ? 1e-6 : 0.07), `${hz} Hz, steps at ${sp}, frames at ${fp}: the coast's speed ${c.om.toFixed(3)} rad/s, the drag's ${om.toFixed(3)}`);
  }
  // (the speed the coast takes is the drag's last 0.2 s, its newest moves included: a drag speeding up, let go at 60 Hz)
  for (const sp of STEPS) {
    const F = flying(sp), P = 1000 / 60, xs = []; let ts = 0;
    for (let k = 0; k < 60; k++) { ts = 1000 + k * P; const t = ts - 1000; const x = 0.15 * t + 0.0002 * t * t; xs.push(x); F.move(x, ts - 0.4); if (k === 59) F.up(); F.frame(ts); }
    for (let n = 0; n < 10 && F.rel(); n++) F.frame(ts += P);
    const c = F.coast(), om = (xs[59] - xs[47]) * GAIN1000 / 0.2;
    assert.ok(c && Math.abs(c.om - om) / om < 1e-6, `60 Hz, steps at ${sp}, a drag speeding up: the coast's speed ${c && c.om.toFixed(4)} rad/s, the last 0.2 s of the drag ${om.toFixed(4)}`);
  }
  const C = flying(0.5); let ts = 1000;
  for (let k = 0; k < 30; k++) { C.move(0.3 * ts, ts - 0.4); C.frame(ts += 1000 / 60); }
  const before = C.yaw(); C.move(0.3 * ts + 50, ts); C.cancel(); C.frame(ts += 1000 / 60);
  assert.equal(C.yaw(), before, 'a cancelled drag\'s last moves are not drawn');
});
