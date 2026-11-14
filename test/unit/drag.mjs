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

// ------------------------------------------------------------------ the drag, even: the view turns the same each frame
// (drag-even) onMove, dragTake and applyInput and simAdvance cut from the world as it ships, a steady drag fed at a
// display's rate (one coalesced move a frame, or a 1000 Hz mouse's every move), the frames drawn between the last two
// steps as the camera draws them: the yaw a drawn frame turns is the same on every frame at 60, 120 and 144 Hz, whatever
// the phase of the steps, of the frames and of the moves. (Before: the first step of a frame took the whole frame's
// drag, so at 60 Hz a frame turned 0, 1 or 2 frames' worth and at 144 Hz the turn came in lumps.)
const INPUT = cut(WORLD, '  var IDLE_K = 0;', '  /* dev: an input injected');
const ADV = cut(WORLD, '  var TSCALE = 1;', '  /* the world, built');
function flying(phase) {
  return vm.runInThisContext('(function (PHASE) {\n  \'use strict\';\n' +
    '  var PI = Math.PI, DEG = PI / 180, SIM_DT = 1 / 60, DTMAX = 0.1, NMAX = Math.ceil(DTMAX / SIM_DT) + 2, TH_MAX = 1, DEVMODE = false, shown = true, SEEDR = 1, J = { seed: 1 }, NOW = 0;\n' +
    '  var CLK = new Float64Array([0, -1]), SIM = { acc: PHASE * SIM_DT, alpha: 0, t: 0 }, OUT = { cssW: 1000 }, MOTION = { on: false }, INPQ = []; INPQ.i = 0;\n' +
    '  var INP = { dx: 0, dy: 0, down: true, rel: false, evT0: 0, q: [], until: Infinity, lt: -1, ln: 0, lag: -1, lnF: 0 }, DRAG = { id: 1, x0: 0, y0: 0, x: 0, y: 0, on: true, type: \'mouse\', lt: -1 };\n' +
    '  var TOUCHMODE = \'none\', DOMQ = {}, running = true, REC = null, root = {};\n' +
    '  function S() { return { yawV: 0, thU: 0, ring: new Float64Array(12), ringP: new Float64Array(12), ri: 0, om: 0, omP: 0, since: 0, lastIn: 0, auto: 0, idleAfter: 0, phi: 0, thP: 0, thPraw: 0 }; }\n' +
    '  var CS = S(), CSP = S();\n' +
    '  function clamp(x, a, b) { return x < a ? a : x > b ? b : x; }\n  function angDiff(a, b) { return a - b; }\n  function hfl() { return 0.5; }\n  function ihash(x) { return x; }\n' +
    '  function domNext() {}\n  function clockNow() { return NOW; }\n  function devInput() {}\n' +
    '  function simStepOnce() { CSP.yawV = CS.yawV; applyInput(SIM_DT, SIM.t, null); SIM.t += SIM_DT; return true; }\n' +
    INPUT + '\n' + cut(WORLD, '  function onMove(e) {', '  function onUp(e) {') + '\n' + ADV +
    '\n  return {\n    move: function (x, ts) { NOW = ts; onMove({ pointerId: 1, clientX: x, clientY: 0, timeStamp: ts }); },\n' +
    '    frame: function (ts) { NOW = ts; var dt = CLK[1] < 0 ? 0 : ts - CLK[1]; CLK[1] = ts; simAdvance(dt / 1000); return CSP.yawV + (CS.yawV - CSP.yawV) * SIM.alpha; }\n  };\n})')(phase);
}
// a steady drag of 600 px/s for 3 s: the turn each drawn frame (after the first half second), its spread over its mean
function evenness(hz, stepPhase, framePhase, moveLag, mouse1k) {
  const F = flying(stepPhase), P = 1000 / hz, V = 0.6, out = [];
  let last = null, tm = 1000 - P;
  for (let k = 0; k < 3 * hz; k++) {
    const ts = 1000 + framePhase * P + k * P;
    if (mouse1k) { for (; tm <= ts - moveLag; tm += 1) F.move(V * tm, tm); }
    else F.move(V * (ts - moveLag), ts - moveLag);
    const y = F.frame(ts);
    if (last !== null && k > hz / 2) out.push(y - last);
    last = y;
  }
  const mean = out.reduce((a, b) => a + b, 0) / out.length;
  return { spread: (Math.max(...out) - Math.min(...out)) / mean, mean };
}
test('drag: a steady drag turns the view the same each drawn frame at 60, 120 and 144 Hz, any phase', () => {
  const worst = {};
  for (const hz of [60, 120, 144]) for (const sp of [0, 0.13, 0.5, 0.87]) for (const fp of [0, 0.31, 0.77]) for (const lag of [0.4, 3.1]) for (const k1 of [false, true]) {
    const e = evenness(hz, sp, fp, lag, k1);
    const G = (Math.PI / 2) / 1000, want = 0.6 * G * (1000 / hz);
    assert.ok(Math.abs(e.mean - want) / want < 1e-3, `${hz} Hz: the mean turn a frame ${e.mean} (want ${want})`);
    worst[hz] = Math.max(worst[hz] || 0, e.spread);
    if (process.env.SPREAD) console.log(hz, sp, fp, lag, k1, (e.spread * 100).toFixed(3) + '%');
    assert.ok(e.spread < 0.01, `${hz} Hz, steps at ${sp}, frames at ${fp}, moves ${lag} ms early${k1 ? ', a 1000 Hz mouse' : ''}: the turn a frame spreads ${(e.spread * 100).toFixed(1)}% of its mean`);
  }
});
