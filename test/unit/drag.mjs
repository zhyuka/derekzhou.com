// test/unit/drag.mjs: the drag: where it starts, how far it turns
// (split from test/unit.mjs, 2026-11-07: one file an area, found by glob, so two PRs that add tests never share a file)
// plant: {"file": "src/world/340-input-drag-anywhere-phone-turn.js", "find": "if (dx * dx + dy * dy < 64) return;", "with": "if (dx * dx + dy * dy < 16) return;", "why": "a drag that starts after 4 px, not 8"}
// plant: {"file": "src/world/340-input-drag-anywhere-phone-turn.js", "find": " DRAG.y = DRAG.y0; REL.n = 0;", "with": " DRAG.y = DRAG.y0;", "why": "the last drag's samples kept at the start: its catch-up counted in the release's speed, a small drag coasts at the cap"}
// plant: {"file": "src/world/345-input-each-step.js", "find": "CS.thU = clamp(CS.thU + ay, -TH_MAX, TH_MAX); CSP.thU = clamp(CSP.thU + ay, -TH_MAX, TH_MAX);", "with": "CS.thU = CS.thU + ay; CSP.thU = CSP.thU + ay;", "why": "the drag's tilt not held within 35 deg"}
// plant: {"file": "src/world/345-input-each-step.js", "find": "CS.thU = clamp(CS.thU + cp, -TH_MAX, TH_MAX); CSP.thU = clamp(CSP.thU + cp, -TH_MAX, TH_MAX);", "with": "CS.thU = CS.thU + cp; CSP.thU = CSP.thU + cp;", "why": "the coast's tilt not held within 35 deg"}
// plant: {"file": "src/world/345-input-each-step.js", "find": "clamp(REL.vx * GR, -OM_MAX, OM_MAX)", "with": "clamp(REL.vx * GR, -0.8, 0.8)", "why": "the release's speed cut at the lift (the old 0.8 rad/s cap): a fast flick snaps to a quarter of its speed"}
// plant: {"file": "src/world/345-input-each-step.js", "find": "return v * tau * (2 - (2 + t / tau) * Math.exp(-t / tau));", "with": "return v * 2 * tau * (1 - Math.exp(-t / (2 * tau)));", "why": "the coast eased out (the old exponential, the same run-on): it brakes hardest at once, a jerk at the lift"}
// plant: {"file": "src/world/345-input-each-step.js", "find": "function coastTau(v, tau, run) { return Math.abs(v) * 2 * tau > run ?", "with": "function coastTau(v, tau, run) { return false ?", "why": "a fast flick's run-on not held: it coasts on past 13.75 deg"}
// plant: {"file": "src/world/345-input-each-step.js", "find": "CS.omP = clamp(REL.vy * GR, -OM_MAX, OM_MAX); CS.ct = 0;", "with": "CS.omP = clamp(REL.vy * GR, -OM_MAX, OM_MAX);", "why": "the coast's clock not reset at the lift: a second flick starts part-settled"}
// plant: {"file": "src/world/345-input-each-step.js", "find": "        CS.yawV += ax; CSP.yawV += ax;", "with": "        CS.yawV += ax;", "why": "the drag drawn on one state only: a frame turns part of the finger's move"}
// plant: {"file": "src/world/345-input-each-step.js", "find": "    if (Math.max(REL.tl, tU) - tS >= REL_STOP) return;", "with": "    if (false) return;", "why": "no stop: a glance let go 24 ms or more after it rested runs on"}
// plant: {"file": "src/world/345-input-each-step.js", "find": "    var b, det = m > 2 ? ", "with": "    var b, det = m > 1e9 ? ", "why": "the release's speed a line's, not a quadratic's: a glance easing out runs on more"}
// plant: {"file": "src/world/345-input-each-step.js", "find": "    return b * (A[j0] - A[j]) > 0 ? b : 0;", "with": "    return b;", "why": "the release's speed against the drag: a glance settling back as it lifts coasts back"}
// plant: {"file": "src/world/340-input-drag-anywhere-phone-turn.js", "find": "    if (was) { REL.tl = e.timeStamp;", "with": "    if (was) { REL.tl = -1e9;", "why": "no lift time: a rest with no moves before the lift is not seen"}
// plant: {"file": "src/world/345-input-each-step.js", "find": "    REL.vx = relFit(REL.x, j0, m, tU) * share;", "with": "    REL.vx = relFit(REL.x, j0, m, tU);", "why": "a short drag coasts at its whole speed, not its share"}
// plant: {"file": "src/world/345-input-each-step.js", "find": "if (tU - REL.t[j] > REL_H && nt >= 3) break;", "with": "if (tU - REL.t[j] > REL_H) break;", "why": "a long frame's one move: no speed"}
// plant: {"file": "src/world/345-input-each-step.js", "find": "    if (REL.rs && (INP.down || INP.rel) && REL.n) {", "with": "    if (false) {", "why": "the finger drawn where its newest move put it (main's): uneven touch judders, 60 Hz touch on a 120 Hz screen standing still every other frame"}
// plant: {"file": "src/world/345-input-each-step.js", "find": "var RS_MAX = 24, RS_DECAY = 5, RS_TOUCH = 20;", "with": "var RS_MAX = 24, RS_DECAY = 200, RS_TOUCH = 20;", "why": "the latency eased down at once: it is never enough for the next late move"}
// plant: {"file": "src/world/340-input-drag-anywhere-phone-turn.js", "find": "REL.st = DRAG.type === 'mouse' ? Infinity : e.timeStamp - RS_TOUCH; if (DRAG.type !== 'mouse') REL.lat = Math.max(REL.lat, RS_TOUCH);", "with": "REL.st = Infinity;", "why": "a finger's drag started as today (#430): the latency from 0 and the catch-up drawn whole, the drawn finger standing still a frame early in the drag"}
// plant: {"file": "src/world/340-input-drag-anywhere-phone-turn.js", "find": "REL.st = DRAG.type === 'mouse' ? Infinity : e.timeStamp - RS_TOUCH; if (DRAG.type !== 'mouse')", "with": "REL.st = e.timeStamp - RS_TOUCH; if (true)", "why": "a mouse's drag started late too: a desktop's catch-up no longer drawn at once, and the finger drawn RS_TOUCH ms behind"}
import { test, assert, fs, os, path, vm, crypto, execFileSync, ROOT, TMP, WORLD, cut, golden, md5, upd, digest, STREAMS, VEC, fileURLToPath } from '../unit-lib.mjs';

// ------------------------------------------------------------------ the drag: where it starts, how far it turns
// (dev-speed item 5c) onMove cut from the world as it ships (the start: 8 px, the first 8 px taken too; a vertical swipe
// on a touch page that scrolls left to the page), and applyInput's gain line (90 degrees across the window's width)
const MOVE = cut(WORLD, '  function onMove(e) {', '  function onUp(e) {');
const GAIN = /\n(\s*var G = \(PI \/ 2\) \/ Math\.max\(OUT\.cssW \|\| 800, 240\),)/.exec(WORLD);
function dragging(type = 'mouse', mode = 'none') {
  return vm.runInThisContext('(function (TYPE, MODE) {\n  \'use strict\';\n  var DRAG = { id: 1, x0: 100, y0: 100, x: 100, y: 100, on: false, type: TYPE }, TOUCHMODE = MODE, DOMQ = {}, running = true, REC = null,\n' +
    '    INP = { dx: 0, dy: 0, down: false }, REL = { n: 0, lat: 0 }, RS_TOUCH = 20, root = { setPointerCapture: function () {} };\n  function domNext() {}\n  function relAdd() {}\n' + MOVE +
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
const INPUT = cut(WORLD, '  var IDLE_K = 0;', '  /* the page\'s touch: one finger steers');
const ADV = cut(WORLD, '  var TSCALE = 1;', '  /* the world, built');
const MOVE2 = cut(WORLD, '  function onMove(e) {', '  function onClick(e) {');   // (onUp and endDrag too: the lift's sample)
function flying(phase, boot = false) {   // boot: not yet landed (no frame before the pre-roll; arrive, its first step, sets the yaw and keeps the tilt)
  return vm.runInThisContext('(function (PHASE, BOOT) {\n  \'use strict\';\n' +
    '  var PI = Math.PI, DEG = PI / 180, SIM_DT = 1 / 60, DTMAX = 0.1, NMAX = Math.ceil(DTMAX / SIM_DT) + 2, TH_MAX = 35 * DEG, DEVMODE = false, shown = true, SEEDR = 1, J = { seed: 1 };\n' +
    '  var CLK = new Float64Array([0, -1]), SIM = { acc: PHASE * SIM_DT, alpha: 0, t: 0, V: BOOT ? null : {} }, OUT = { cssW: 1000 }, MOTION = { on: false };\n' +
    '  var INP = { dx: 0, dy: 0, down: true, rel: false, evT0: 0, fx: 0, fy: 0, ft: 0, relAny: false, held: false, qx: 0, qy: 0 }, DRAG = { id: 1, x0: 0, y0: 0, x: 0, y: 0, on: true, type: \'mouse\' };\n' +
    '  var TOUCHMODE = \'none\', DOMQ = {}, running = true, REC = null, root = {}, coast = null, drawnTh = 0, HOLD_S = 0.5, FCOL = { on: false }, CLICKQ = [], SUPPRESS = false, SUPPRESS_F = 0, SUPPRESS_N = 0, FRAMEN = 0, MOTIONASK = {}, window = { removeEventListener: function () {} };\n' +
    '  function onLink() { return false; }\n' +
    '  function S() { return { yawV: 0, thU: 0, ring: new Float32Array(12), ringP: new Float32Array(12), ringT: new Float32Array(12), ri: 0, om: 0, omP: 0, since: 0, lastIn: 0, auto: 0, idleAfter: 0, phi: 0, thP: 0, thPraw: 0 }; }\n' +
    '  var CS = S(), CSP = S();\n' +
    '  function clamp(x, a, b) { return x < a ? a : x > b ? b : x; }\n  function angDiff(a, b) { return a - b; }\n  function hfl() { return 0.5; }\n  function ihash(x) { return x; }\n' +
    '  function domNext() {}\n' +
    '  function simStepOnce() {\n    if (!SIM.V) { SIM.V = {}; CS.yawV = CSP.yawV = 0; CS.thU = clamp(CS.thU, -TH_MAX, TH_MAX); CSP.thU = CS.thU; }   // (arrive: the landing sets the yaw, keeps the tilt)\n' +
    '    CSP.yawV = CS.yawV; CSP.thU = CS.thU;\n    applyInput(SIM_DT, SIM.t, null); SIM.t += SIM_DT;\n    return true;\n  }\n' +
    INPUT + '\n' + MOVE2 + '\n' + ADV +
    '\n  return {\n    move: function (x, ts, y) { onMove({ pointerId: 1, clientX: x, clientY: y || 0, timeStamp: ts }); },\n    up: function (ts) { onUp({ pointerId: 1, timeStamp: ts !== undefined ? ts : REL.t[(REL.i + REL_N - 1) % REL_N], clientX: DRAG.x, clientY: DRAG.y, target: null }); },   // (the lift, at its time: by default right after the last move)\n    press: function () { INP.down = true; },\n    start: function (x0, type) { DRAG.id = 1; DRAG.on = false; DRAG.x0 = DRAG.x = x0; DRAG.y0 = DRAG.y = 0; DRAG.type = type || \'mouse\'; INP.down = false; },\n    preroll: function (n) { for (var i = 0; i < n; i++) simAdvance(SIM_DT); },\n    prevYaw: function () { return CSP.yawV; },\n    cancel: function () { INP.down = false; INP.rel = false; },\n' +
    '    frame: function (ts, dtMs) { var dt = dtMs !== undefined ? dtMs : CLK[1] < 0 ? 0 : ts - CLK[1]; CLK[1] = ts; var rel = INP.rel; simAdvance(dt / 1000);\n' +
    '      if (rel && !INP.rel) coast = { yaw: CS.yawV, om: CS.om, omP: CS.omP };   // (the release taken: the coast runs from the next frame)\n' +
    '      drawnTh = CSP.thU + (CS.thU - CSP.thU) * SIM.alpha; return CSP.yawV + (CS.yawV - CSP.yawV) * SIM.alpha; },\n' +
    '    tilt: function () { return drawnTh; }, rel: function () { return INP.rel; }, coast: function () { return coast; }, yaw: function () { return CS.yawV; }, om: function () { return CS.om; }, omP: function () { return CS.omP; }\n  };\n})')(phase, boot);
}
const GAIN1000 = (Math.PI / 2) / 1000;
// the release's run-on t s after the lift, as the physics has it (critically damped, speed v (1 + t/T) e^(-t/T), T = tau
// or shorter so the whole run-on 2 v T is at most run): the turn tau 0.15 s, run 0.24 rad; the tilt 0.1 s, 0.1 rad
const RUNF = (v, tau, run, t) => { const T = Math.abs(v) * 2 * tau > run ? run / (2 * Math.abs(v)) : tau; return v * T * (2 - (2 + t / T) * Math.exp(-t / T)); };
const RUN_YAW = (v, t) => RUNF(v, 0.15, 0.24, t), RUN_TILT = (v, t) => RUNF(v, 0.1, 0.1, t);
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
test('drag: released, the coast starts from the whole drag at the drag\'s speed, and runs on in frame time; cancelled, its last moves are not drawn', () => {
  const V = 0.3;   // (300 px/s: 0.47 rad/s, under the coast's 0.8 cap)
  for (const hz of [60, 75, 120, 144, 240]) for (const sp of [0, 0.13, 0.5, 0.87, 0.9]) for (const fp of [0, 0.5]) {
    const F = flying(sp), P = 1000 / hz; let x = 0, k = 0, ts = 0, y = 0, last = 0;
    for (; k < hz; k++) { ts = 1000 + fp * P + k * P; x = V * (ts - 0.4); F.move(x, ts - 0.4, 0.1 * x); if (k === hz - 1) F.up(); last = y; y = F.frame(ts); }   // (the release right after the last move, in its frame)
    const c = F.coast(), move = V * P * GAIN1000, tag = `${hz} Hz, steps at ${sp}, frames at ${fp}`;
    assert.ok(c, `${tag}: the release was not taken in its own frame`);
    assert.ok(Math.abs(c.yaw - x * GAIN1000) < 1e-9, `${tag}: the coast starts at ${c.yaw} rad, the drag was ${x * GAIN1000}`);
    assert.ok(Math.abs(y - last - move) < 1e-9, `${tag}: the release's frame turned ${((y - last) / move * 100).toFixed(1)}% of the finger's move`);
    const om = V * 1000 * GAIN1000;
    // (the coast's speed is the ring's moves over the frames' time they were drawn in: exact at any rate)
    assert.ok(Math.abs(c.om - om) / om < 1e-6, `${tag}: the coast's speed ${c.om.toFixed(3)} rad/s, the drag's ${om.toFixed(3)}`);
    // the coast: each frame turns the run-on's exact share of its time (from the next frame), never more than the
    // finger's last move a frame, and never stands still while it has speed
    for (let n = 0; n < hz / 2; n++) {
      const th1 = F.tilt(), y2 = F.frame(ts += P), d = y2 - y, t0 = n * P / 1000, t1 = (n + 1) * P / 1000; y = y2;
      const wd = RUN_YAW(c.om, t1) - RUN_YAW(c.om, t0), wt = RUN_TILT(c.omP, t1) - RUN_TILT(c.omP, t0);
      assert.ok(Math.abs(F.tilt() - th1 - wt) < 1e-12, `${tag}: coast frame ${n} tilted ${F.tilt() - th1}, the run-on's share of its time is ${wt}`);
      assert.ok(d <= move * (1 + 1e-6), `${tag}: coast frame ${n} turned ${(d / move * 100).toFixed(1)}% of the finger's last move`);
      assert.ok(d > 0, `${tag}: coast frame ${n} stood still`);
      assert.ok(Math.abs(d - wd) < 1e-12, `${tag}: coast frame ${n} turned ${d}, the run-on's share of its time is ${wd}`);
    }
  }
  // (the speed the coast takes is the finger's as it lifts, its newest moves included: a drag speeding up, let go at 60
  // Hz, coasts at its last move's speed, not its last 0.2 s's; the tilt's too)
  for (const sp of STEPS) {
    const F = flying(sp), P = 1000 / 60, xs = []; let ts = 0;
    for (let k = 0; k < 60; k++) { ts = 1000 + k * P; const t = ts - 1000; const x = 0.1 * t + 0.0001 * t * t; xs.push(x); F.move(x, ts - 0.4, 0.1 * x); if (k === 59) F.up(); F.frame(ts); }
    const c = F.coast(), om = (0.1 + 0.0002 * 59 * P) * 1000 * GAIN1000, mean = (xs[59] - xs[47]) * GAIN1000 / 0.2;
    assert.ok(c && Math.abs(c.om - om) / om < 1e-6, `60 Hz, steps at ${sp}, a drag speeding up: the coast's speed ${c && c.om.toFixed(4)} rad/s, the finger's as it lifts ${om.toFixed(4)} (its last 0.2 s: ${mean.toFixed(4)})`);
    assert.ok(Math.abs(c.omP - 0.1 * om) / om < 1e-6, `60 Hz, steps at ${sp}: the tilt's coast ${c.omP.toFixed(4)} rad/s, its drag's as it lifts ${(0.1 * om).toFixed(4)}`);
    // the run-on, frame by frame: the run-on's share of each frame's time; in all, 0.3 s of the turn's speed (0.2 s of
    // the tilt's), as the eased coast before it
    const th0 = F.tilt(); let thL = th0;
    for (let n = 0; n < 300; n++) { F.frame(ts += P); const w = RUN_TILT(c.omP, (n + 1) * P / 1000) - RUN_TILT(c.omP, n * P / 1000); assert.ok(Math.abs(F.tilt() - thL - w) < 1e-12, `60 Hz, steps at ${sp}: tilt coast frame ${n} drew ${F.tilt() - thL}, the run-on's share of its time is ${w}`); thL = F.tilt(); }
    assert.ok(Math.abs(F.yaw() - c.yaw - 0.3 * c.om) < 1e-9, `60 Hz, steps at ${sp}: the turn ran on ${F.yaw() - c.yaw} rad, want 0.3 s of its speed, ${0.3 * c.om}`);
    assert.ok(Math.abs(F.tilt() - th0 - 0.2 * c.omP) < 1e-9, `60 Hz, steps at ${sp}: the tilt ran on ${F.tilt() - th0} rad, want 0.2 s of its speed, ${0.2 * c.omP}`);
  }
  // pressed again during the coast, the view holds still under the finger
  for (const hz of [60, 144]) for (const sp of STEPS) {
    const F = flying(sp), P = 1000 / hz; let ts = 1000;
    for (let k = 0; k < hz; k++) { F.move(0.3 * ts, ts - 0.4); if (k === hz - 1) F.up(); F.frame(ts += P); }
    F.frame(ts += P); F.frame(ts += P);
    const held = F.yaw(); F.press();
    for (let k = 0; k < 10; k++) { F.frame(ts += P); assert.equal(F.yaw(), held, `${hz} Hz, steps at ${sp}: pressed during the coast, frame ${k} still turned`); }
  }
  const C = flying(0.5); let ts = 1000;
  for (let k = 0; k < 30; k++) { C.move(0.3 * ts, ts - 0.4); C.frame(ts += 1000 / 60); }
  const before = C.yaw(); C.move(0.3 * ts + 50, ts); C.cancel(); C.frame(ts += 1000 / 60);
  assert.equal(C.yaw(), before, 'a cancelled drag\'s last moves are not drawn');
  for (let k = 0; k < 30; k++) C.frame(ts += 1000 / 60);
  assert.equal(C.yaw(), before, 'a cancelled drag does not coast');
});
test('drag: the tilt follows the finger up and down in the frame that reads it, held within 35 deg, at 60-240 Hz', () => {
  const TH = 35 * Math.PI / 180;
  for (const hz of RATES) for (const sp of STEPS) {
    const F = flying(sp), P = 1000 / hz; let th = 0, py = 0;
    for (let k = 0; k < 2 * hz; k++) {
      const ts = 1000 + k * P, t = k / hz, y = 600 * Math.sin(Math.PI * t);   // (600 px up and back: past the 35 deg limit, 389 px, and back)
      F.move(0, ts - 0.4, -y); F.frame(ts);
      th = Math.max(-TH, Math.min(TH, th + (-y - py) * GAIN1000)); py = -y;
      assert.ok(Math.abs(F.tilt() - th) < 1e-9, `${hz} Hz, steps at ${sp}, frame ${k}: the drawn tilt ${F.tilt()}, the finger's ${th}`);
    }
  }
});
test('drag: before the landing a held drag waits for it and a released one is dropped (no turn by itself after the world shows)', () => {
  const P = 1000 / 60;
  const R = flying(0.5, true); let ts = 1000;
  for (let k = 0; k < 10; k++) { R.move(30 * k, ts += P); } R.up();   // (moved and let go during the boot: no frame runs then)
  R.preroll(1);   // (PREROLL: one step, its arrive)
  for (let k = 0; k < 90; k++) R.frame(ts += P);
  assert.equal(R.yaw(), 0, 'a drag let go before the landing turns nothing after it');
  for (const hz of [60, 144]) {
    const H = flying(0.5, true), Q = 1000 / hz; let x = 0; ts = 1000;
    for (let k = 0; k < 40; k++) { x = 30 * k; H.move(x, ts += Q); }   // (a fast drag, held through the boot)
    H.preroll(1);
    const y0 = H.frame(ts += Q);
    assert.ok(Math.abs(y0 - x * GAIN1000) < 1e-9 && Math.abs(H.prevYaw() - x * GAIN1000) < 1e-9, `${hz} Hz: the first frame after the landing draws ${y0} rad, the boot's drag ${x * GAIN1000}`);
    for (let k = 0; k < 6; k++) { x += 0.3 * Q; H.move(x, ts); if (k === 5) H.up(); H.frame(ts += Q); }   // (then 0.3 px/ms for 6 frames, let go)
    const c = H.coast(), om = 0.3 * 1000 * GAIN1000;
    assert.ok(c && c.om <= om * (1 + 1e-6), `${hz} Hz: let go just after the show, the coast's speed ${c && c.om.toFixed(3)} rad/s, the finger's ${om.toFixed(3)} (the boot's drag is not in it)`);
  }
});
test('drag: a release read in a long frame coasts at the finger\'s speed; the coast holds the tilt within 35 deg and its run-on within its caps', () => {
  for (const hz of [60, 144]) for (const long of [33, 100, 250]) for (const sp of [0, 0.5]) {
    const F = flying(sp), P = 1000 / hz, V = 0.15; let ts = 1000, x = 0;
    for (let k = 0; k < hz; k++) { ts += P; x = V * ts; F.move(x, ts - 0.4); F.frame(ts); }
    ts += long; x = V * ts; F.move(x, ts - 0.4); F.up(); F.frame(ts, long);   // (the release's frame: long, its moves the finger's over it)
    const c = F.coast(), om = V * 1000 * GAIN1000;
    assert.ok(c && Math.abs(c.om - om) / om < 1e-6, `${hz} Hz, a ${long} ms release frame, steps at ${sp}: the coast's speed ${c && c.om.toFixed(4)} rad/s, the finger's ${om.toFixed(4)}`);
  }
  const TH = 35 * Math.PI / 180;
  for (const hz of [60, 144]) for (const dir of [1, -1]) {
    const F = flying(0.3), P = 1000 / hz; let ts = 1000;
    for (let k = 0; k < hz; k++) { ts += P; F.move(3 * ts, ts - 0.4, -dir * 2 * ts); F.frame(ts); }   // (3 px/ms across, 2 px/ms up or down: past both run-on caps, and the tilt pushed past 35 deg)
    F.up(); F.frame(ts += P);
    const c = F.coast(), yaw0 = F.yaw();
    assert.ok(Math.abs(c.om - 3000 * GAIN1000) < 1e-9, `${hz} Hz: the turn's coast takes the flick's whole speed, ${3000 * GAIN1000} rad/s (${c.om}), never cut at the lift`);
    for (let k = 0; k < 60; k++) { F.frame(ts += P); assert.ok(Math.abs(F.tilt()) <= TH + 1e-12, `${hz} Hz: coast frame ${k} drew a tilt of ${(F.tilt() * 180 / Math.PI).toFixed(2)} deg`); }
    assert.ok(Math.abs(Math.abs(F.tilt()) - TH) < 1e-12, `${hz} Hz: the coast left the tilt at ${(F.tilt() * 180 / Math.PI).toFixed(2)} deg, held at 35`);
    for (let k = 0; k < 300; k++) F.frame(ts += P);
    assert.ok(Math.abs(F.yaw() - yaw0 - 0.24) < 1e-9, `${hz} Hz: a 4.7 rad/s flick ran on ${F.yaw() - yaw0} rad, want the cap, 0.24 (13.75 deg)`);
  }
});

test('drag: a small drag just past the 8 px start runs on little: its catch-up is no speed', () => {
  // (a drag begins 8 px from the press and takes those 8 px at once, the scene catching the finger up: they were moved
  // over the time since the press, so counted as one frame's move they threw the coast to its cap, a 9-16 px drag
  // running on 6.8-14.1 deg by itself; main ran on 0.9-6.0)
  const DEG = Math.PI / 180;
  for (const hz of [60, 144]) for (const v of [0.15, 0.3, 0.6]) for (const len of [9, 12, 16]) for (const hold of [0, 1, 3]) for (const after of [false, true]) {
    const F = flying(0.5), P = 1000 / hz; let ts = 1000, x = 0;
    if (after) {   // (a flick first, let go a second before: its samples are not the small drag's)
      F.start(0); for (let k = 1; k <= hz / 5; k++) { ts += P; F.move(k * P, ts - 0.4); F.frame(ts); } F.up(); for (let k = 0; k < hz; k++) F.frame(ts += P);
    }
    const x0 = after ? 200 : 0; F.start(x0); F.frame(ts);
    while (x < len) { ts += P; x = Math.min(len, x + v * P); F.move(x0 + x, ts - 0.4); if (x >= len && !hold) F.up(); F.frame(ts); }
    for (let k = 0; k < hold; k++) { if (k === hold - 1) F.up(); F.frame(ts += P); }
    const at = F.yaw(); for (let k = 0; k < 2 * hz; k++) F.frame(ts += P);
    const runOn = (F.yaw() - at) / DEG;
    assert.ok(runOn <= 2, `${hz} Hz, a ${len} px drag at ${v * 1000} px/s${after ? ' after a flick' : ''}, let go ${hold} frames after: ran on ${runOn.toFixed(2)} deg by itself`);
  }
});

// ------------------------------------------------------------------ let go after a rest, the view stays
// (release-run-on) the release's speed is the finger's as it lifts, from the drag's own samples (each move's place and
// time, and the lift's): a glance that comes to rest and is let go 25 ms or more later runs on nothing, with no moves in
// the rest (a resting finger sends none) or with still ones; one easing out as it lifts runs on a little, never against
// the drag; a flick let go moving coasts as it did; a steady drag's coast is its own speed on any display, 60 Hz touch
// on a 144 Hz screen too. (Before: the mean of the last 0.2 s of steps: a 10 deg glance let go 2 frames after it rested
// ran on 6-14 deg by itself, ending at 16-24 deg; and with 60 Hz touch on a 144 Hz screen a steady drag coasted at
// 0.94-1.07 x its speed, by the moves' phase.)
const D = 180 / Math.PI, ease3 = (u) => (u <= 0 ? 0 : u >= 1 ? 1 : u * u * (3 - 2 * u));
function glance({ hz, sp, deg, dur, rest = 0, still = false, flick = false, back = 0 }) {
  const F = flying(sp), P = 1000 / hz, X = deg / D / GAIN1000, n = Math.round(dur * hz); let ts = 1000, x = 8;
  F.start(0); F.move(8, ts - 0.4);
  for (let k = 1; k <= n; k++) { ts += P; x = 8 + X * (flick ? k / n : ease3(k / n)); F.move(x, ts - 0.4); F.frame(ts); }
  if (back) { ts += P; x -= back; F.move(x, ts - 0.4); F.frame(ts); }   // (it settles back as it lifts)
  const tm = ts - 0.4;
  for (let k = 0; k < rest; k++) { ts += P; if (still) F.move(x, ts - 0.4); F.frame(ts); }
  F.up(rest ? ts - 0.4 : tm); F.frame(ts += P);
  const c = F.coast();
  for (let k = 0; k < 3 * hz; k++) F.frame(ts += P);
  return { c, runOn: (F.yaw() - c.yaw) * D };
}
test('drag: let go after it rests, the view runs on nothing; easing out, a little and never back; a flick coasts as it did', () => {
  for (const hz of [60, 120, 144, 240]) for (const sp of [0, 0.5, 0.87]) for (const dur of [0.15, 0.25, 0.4]) for (const deg of [5, 10, 20]) {
    const tag = `${hz} Hz, steps at ${sp}, a ${deg} deg glance over ${dur} s`;
    for (const flick of [false, true]) for (const still of [false, true]) for (const rest of [Math.ceil(25 * hz / 1000), Math.ceil(60 * hz / 1000), Math.ceil(300 * hz / 1000)]) {
      const r = glance({ hz, sp, deg, dur, rest, still, flick });   // (eased to rest, or stopped dead)
      assert.equal(r.runOn, 0, `${tag}${flick ? ' stopped dead' : ''}, let go ${(rest * 1000 / hz).toFixed(0)} ms after it rested${still ? ' (still moves)' : ''}: ran on ${r.runOn.toFixed(2)} deg`);
    }
    const e = glance({ hz, sp, deg, dur });
    const most = (dur < 0.2 ? 0.8 : 0.25) * deg;   // (#222's mean: 165-168% of the glance over 0.15 s, 127-133% over 0.25 s, 67-73% over 0.4 s)
    assert.ok(e.runOn >= 0 && e.runOn <= most, `${tag}, let go as it eased to rest: ran on ${e.runOn.toFixed(2)} deg (want 0-${most.toFixed(1)}, never back)`);
    for (const back of [1.5, 3]) {
      const k = glance({ hz, sp, deg, dur, back });
      assert.ok(k.runOn >= 0, `${tag}, settling back ${back} px as it lifts: ran on ${k.runOn.toFixed(2)} deg (back by itself)`);
    }
    const f = glance({ hz, sp, deg: 15, dur, flick: true });
    assert.ok(f.runOn > 3, `${hz} Hz, steps at ${sp}, a 15 deg flick over ${dur} s let go moving: ran on ${f.runOn.toFixed(2)} deg (want over 3)`);
  }
});
test('drag: a steady drag\'s coast is its own speed with 60 Hz touch on a 60-240 Hz screen, at any phase', () => {
  for (const hz of [60, 120, 144, 240]) for (const sp of [0, 0.13, 0.5, 0.87]) for (const ip of [0, 0.3, 0.7, 0.99]) {
    const F = flying(sp), P = 1000 / hz, Q = 1000 / 60, V = 0.3; let ts = 1000, te = 1000 + ip * Q;
    for (let k = 1; k <= hz / 2; k++) { ts += P; for (; te <= ts - 0.4; te += Q) F.move(V * te, te); F.frame(ts); }
    F.up(); F.frame(ts += P);
    const c = F.coast(), om = V * 1000 * GAIN1000;
    assert.ok(c && Math.abs(c.om - om) / om < 1e-6, `${hz} Hz, 60 Hz touch at ${ip}, steps at ${sp}: the coast's speed ${c && c.om.toFixed(4)} rad/s, the finger's ${om.toFixed(4)}`);
  }
});
test('drag: a flick lifted a digitizer frame after its last move coasts at the finger\'s speed, on any display', () => {
  // (the hub's review of #286: a lift's pointerup comes a digitizer frame after the last move, 4-17 ms; taken as a sample
  // at its own time, the fit saw the finger stop for that frame, and a steady 300 px/s flick coasted at 0.41-0.84 x its
  // speed (main: 0.91-0.99). The lift's place is the last move's, at the last move's time; its own time only says how
  // long the finger rested)
  for (const [inHz, gaps] of [[60, [4, 8.3, 16.7]], [120, [4, 8.3]]]) for (const gap of gaps) for (const hz of [60, 120, 144, 240]) for (const sp of [0, 0.5, 0.87]) {
    const F = flying(sp), P = 1000 / hz, Q = 1000 / inHz, V = 0.3; let ts = 1000, te = 1000.3, last = 0;
    for (let k = 1; k <= hz / 2; k++) { ts += P; for (; te <= ts - 0.4; te += Q) { F.move(V * te, te); last = te; } F.frame(ts); }
    F.up(last + gap); F.frame(ts += P);
    const c = F.coast(), om = V * 1000 * GAIN1000;
    assert.ok(c && Math.abs(c.om - om) / om < 1e-6, `${inHz} Hz touch, lifted ${gap} ms after its last move, a ${hz} Hz display, steps at ${sp}: the coast's speed ${c && (c.om / om).toFixed(3)} x the finger's`);
  }
});

// ------------------------------------------------------------------ the release's run-on: no snap, no jerk, no overshoot
// (physics map, Camera flight: release-run-on) a steady drag let go, the view drawn frame by frame through the lift and
// the settle, at 60-240 Hz, slow to fast flicks (0.1-6 px/ms across 1000 px: 0.16-9.4 rad/s). From the frames' turns:
// the speed a frame (its turn over its time), its rate (the deceleration) and that rate's (the jerk). Against the
// physics' own bounds for the flick's speed v and settle time T: the deceleration at most v / (T e), the jerk at most
// v / T^2. The speed runs on from the finger's (no cut at the lift: its change there no more than the deceleration
// allows in half a frame), never reverses (no overshoot), and is 99% done within a second.
function releaseRun(V, hz, sp) {
  const F = flying(sp), P = 1000 / hz; let ts = 1000, y = 0;
  const yaws = [];
  for (let k = 0; k < hz; k++) { ts += P; F.move(V * ts, ts - 0.4); if (k === hz - 1) F.up(); y = F.frame(ts); if (k >= hz - 4) yaws.push(y); }
  for (let k = 0; k < 4 * hz; k++) yaws.push(F.frame(ts += P));   // (4 s: the slowest settle's last 1e-9 rad)
  return { yaws, P: P / 1000, om: F.coast().om };
}
test('drag: let go, the view runs on at the finger\'s speed and settles with no snap, no jerk past the physics\' and no overshoot', () => {
  for (const V of [0.1, 0.3, 1, 3, 6]) for (const hz of [60, 144, 240]) for (const sp of [0, 0.5]) {
    const { yaws, P, om } = releaseRun(V, hz, sp), v0 = V * 1000 * GAIN1000, tag = `${V} px/ms (${v0.toFixed(2)} rad/s), ${hz} Hz, steps at ${sp}`;
    assert.ok(Math.abs(om - v0) / v0 < 1e-6, `${tag}: the coast took ${om} rad/s, the finger's ${v0}`);
    const T = v0 * 0.3 > 0.24 ? 0.24 / (2 * v0) : 0.15, aMax = v0 / (T * Math.E), jMax = v0 / (T * T);
    const s = []; for (let k = 1; k < yaws.length; k++) s.push((yaws[k] - yaws[k - 1]) / P);   // (s[0..2]: the drag's frames; s[3]: the first coast frame)
    const a = []; for (let k = 1; k < s.length; k++) a.push((s[k] - s[k - 1]) / P);
    const j = []; for (let k = 1; k < a.length; k++) j.push((a[k] - a[k - 1]) / P);
    assert.ok(Math.abs(s[2] - v0) / v0 < 1e-6, `${tag}: the drag's last frame turned at ${s[2]} rad/s`);
    assert.ok(v0 - s[3] <= aMax * P / 2 * (1 + 1e-6), `${tag}: at the lift the speed fell ${(v0 - s[3]).toFixed(4)} rad/s in a frame (a snap: the physics allows ${(aMax * P / 2).toFixed(4)})`);
    const aPeak = Math.max(...a.map((x) => -x)), jPeak = Math.max(...j.map(Math.abs));
    assert.ok(aPeak <= aMax * (1 + 1e-6), `${tag}: the coast braked at ${aPeak.toFixed(3)} rad/s^2, the physics' most is ${aMax.toFixed(3)}`);
    assert.ok(jPeak <= jMax * (1 + 1e-6), `${tag}: a jerk of ${jPeak.toFixed(2)} rad/s^3, the physics' most is ${jMax.toFixed(2)}`);
    for (let k = 3; k < s.length; k++) assert.ok(s[k] >= 0, `${tag}: coast frame ${k - 3} turned back (${s[k]} rad/s): an overshoot`);
    const run = yaws[yaws.length - 1] - yaws[3];
    assert.ok(Math.abs(run - Math.min(0.3 * v0, 0.24)) < 1e-9, `${tag}: it ran on ${run} rad, want ${Math.min(0.3 * v0, 0.24)}`);
    const by1 = yaws[3 + Math.round(1 / P)] - yaws[3];
    assert.ok(by1 >= 0.99 * run, `${tag}: a second after the lift only ${(by1 / run * 100).toFixed(1)}% of the run-on was done (want 99%)`);
  }
});

// ------------------------------------------------------------------ the drag on phones: no judder from uneven touch
// (the hub's 01:40Z item, the drag's feel on phones) a phone's touch comes at 60-120 Hz, its moves stamped at the
// digitizer's time and delivered up to a few ms late. A steady drag (0.6 px/ms) through the flight's own input and
// frame loop at 60-144 Hz: each frame's turn against the finger's mean travel a frame. Once the drag has run 0.25 s
// (the latency settled: REL.lat), at every pairing of touch 60/90/120 Hz and screen 60/90/120/144 Hz with delivery 0-4
// ms late, three seeds each: the turn's spread (sd) at most 0.06 of the mean, under 2% of frames more than 25% off, the
// mean the finger's. (Main: a spread of up to 1.18 and every frame off by 25% or more: 60 Hz touch on a 120 Hz screen
// stood still every other frame; 90 Hz on 60 turned 0.67 and 1.33 by turns.) A desktop's moves, coalesced to come just
// before each frame, still draw at once (the tests above: the view trails the finger only by the move's own lag)
function lcgD(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
function touchTurns(hzIn, hzOut, late, seed, V = 0.6) {
  const F = flying(0.37), P = 1000 / hzOut, Q = 1000 / hzIn, r = lcgD(seed), turns = [], moves = [];
  for (let t = 1000 + Q * r(); t < 4000; t += Q) moves.push([t, V * t, t + 1 + r() * 2 * late]);   // (stamped at t, delivered 1 to 1 + 2 late ms after)
  let mi = 0, last = null;
  for (let k = 0; k * P < 2800; k++) {
    const fts = 1100 + k * P;
    while (mi < moves.length && moves[mi][2] <= fts) { F.move(moves[mi][1], moves[mi][0]); mi++; }
    const y = F.frame(fts);
    if (last !== null && k * P > 250) turns.push((y - last) / (GAIN1000 * V * P));
    last = y;
  }
  const mean = turns.reduce((a, b) => a + b, 0) / turns.length, sd = Math.sqrt(turns.reduce((a, b) => a + (b - mean) ** 2, 0) / turns.length);
  return { mean, sd, off: turns.filter((x) => Math.abs(x - 1) > 0.25).length / turns.length };
}
test('drag: uneven touch (60-120 Hz, delivered up to 4 ms late) turns the view evenly a frame on 60-144 Hz screens', () => {
  for (const hzIn of [60, 90, 120]) for (const hzOut of [60, 90, 120, 144]) for (const late of [0, 2, 4]) for (const seed of [1, 2, 3]) {
    const r = touchTurns(hzIn, hzOut, late, seed), tag = `${hzIn} Hz touch on a ${hzOut} Hz screen, up to ${late} ms late, seed ${seed}`;
    assert.ok(Math.abs(r.mean - 1) < 0.01, `${tag}: the view turned ${r.mean.toFixed(3)} x the finger a frame on average`);
    assert.ok(r.sd <= 0.06, `${tag}: each frame's turn spread ${r.sd.toFixed(3)} of the finger's (want 0.06 at most: judder)`);
    assert.ok(r.off < 0.02, `${tag}: ${(r.off * 100).toFixed(1)}% of frames turned more than 25% off the finger's travel (want under 2%)`);
  }
});

// ------------------------------------------------------------------ the drag's start on phones: no stand-still
// (the hub's 02:12Z follow-up to #430) the moment a visitor feels most. A finger's drag from its press, its first move
// 8 px out (the start) and then steady at 0.6 px/ms, touch 60/90/120 Hz on 60/90/120/144 Hz screens delivered up to
// 4 ms late, three seeds: each of the first 8 frames drawn turns between 0.3 and 1.1 of the finger's travel a frame
// (it eases in over the start's latency, RS_TOUCH, never standing still and never jumping). (#430 alone: a frame stood
// still, under 0.05x, in 37 of the 108 starts, and a frame jumped past 1.1x, up to 1.92x, in 94.) A mouse's drag, its moves
// coalesced just before each frame, still draws its catch-up whole in its first frame and then the finger at once
function startTurns(hzIn, hzOut, late, seed, type, V = 0.6, aligned = false) {
  const F = flying(0.37), P = 1000 / hzOut, Q = aligned ? P : 1000 / hzIn, r = lcgD(seed), moves = [], t0 = aligned ? 1100 + 3 * P - 0.4 : 1000 + Q * r();
  for (let t = t0; t < 2500; t += Q) moves.push([t, 8 + V * (t - t0), aligned ? t : t + 1 + r() * 2 * late]);
  F.start(0, type);
  let mi = 0, last = 0; const turns = [];
  const fts0 = Math.ceil((moves[0][2] - 1100) / P - 1e-9) * P + 1100;   // (the first frame after the first move)
  for (let k = 0; k < 20; k++) {
    const fts = fts0 + k * P;
    while (mi < moves.length && moves[mi][2] <= fts + 1e-9) { F.move(moves[mi][1], moves[mi][0]); mi++; }
    const y = F.frame(fts); turns.push((y - last) / (GAIN1000 * V * P)); last = y;
  }
  return { turns, P };
}
test('drag: a finger\'s drag eases in from its press with no frame standing still; a mouse\'s catch-up is drawn at once', () => {
  let still = 0;
  for (const hzIn of [60, 90, 120]) for (const hzOut of [60, 90, 120, 144]) for (const late of [0, 2, 4]) for (const seed of [1, 2, 3]) {
    const { turns } = startTurns(hzIn, hzOut, late, seed, 'touch'), f = turns.slice(0, 8), tag = `${hzIn} Hz touch on a ${hzOut} Hz screen, up to ${late} ms late, seed ${seed}`;
    for (let k = 0; k < 8; k++) assert.ok(f[k] >= 0.3 && f[k] <= 1.1, `${tag}: frame ${k + 1} of the drag turned ${f[k].toFixed(2)} x the finger's travel (want 0.3-1.1: ${f.map((x) => x.toFixed(2)).join(' ')})`);
    if (f.some((x) => x < 0.05)) still++;
  }
  assert.equal(still, 0);
  for (const hz of [60, 120, 144]) {   // (a desktop's mouse: one move just before each frame)
    const { turns, P } = startTurns(hz, hz, 0, 1, 'mouse', 0.6, true);
    assert.ok(Math.abs(turns[0] - 8 / (0.6 * P)) < 0.02, `${hz} Hz mouse: the first frame turned ${turns[0].toFixed(3)} x a frame's travel, want the whole 8 px catch-up at once, ${(8 / (0.6 * P)).toFixed(3)}`);
    for (let k = 1; k < 12; k++) assert.ok(Math.abs(turns[k] - 1) < 0.01, `${hz} Hz mouse: frame ${k + 1} turned ${turns[k].toFixed(3)} x the finger's travel`);
  }
});
