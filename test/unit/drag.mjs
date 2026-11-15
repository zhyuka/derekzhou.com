// test/unit/drag.mjs: the drag: where it starts, how far it turns
// (split from test/unit.mjs, 2026-11-07: one file an area, found by glob, so two PRs that add tests never share a file)
// plant: {"file": "src/world/340-input-drag-anywhere-phone-turn.js", "find": "if (dx * dx + dy * dy < 64) return;", "with": "if (dx * dx + dy * dy < 16) return;", "why": "a drag that starts after 4 px, not 8"}
// plant: {"file": "src/world/340-input-drag-anywhere-phone-turn.js", "find": "      INP.down = true; INP.held = true; DRAG.x = DRAG.x0;", "with": "      INP.down = true; DRAG.x = DRAG.x0;", "why": "the drag's 8 px catch-up counted in the release's speed: a small drag coasts at the cap"}
// plant: {"file": "src/world/340-input-drag-anywhere-phone-turn.js", "find": "CS.thU = clamp(CS.thU + ay, -TH_MAX, TH_MAX); CSP.thU = clamp(CSP.thU + ay, -TH_MAX, TH_MAX);", "with": "CS.thU = CS.thU + ay; CSP.thU = CSP.thU + ay;", "why": "the drag's tilt not held within 35 deg"}
// plant: {"file": "src/world/340-input-drag-anywhere-phone-turn.js", "find": "CS.thU = clamp(CS.thU + cp, -TH_MAX, TH_MAX); CSP.thU = clamp(CSP.thU + cp, -TH_MAX, TH_MAX);", "with": "CS.thU = CS.thU + cp; CSP.thU = CSP.thU + cp;", "why": "the coast's tilt not held within 35 deg"}
// plant: {"file": "src/world/340-input-drag-anywhere-phone-turn.js", "find": "clamp(sy / st, -0.5, 0.5)", "with": "clamp(sy / st, -0.6, 0.6)", "why": "the tilt's coast past its 0.5 rad/s cap"}
// plant: {"file": "src/world/340-input-drag-anywhere-phone-turn.js", "find": "clamp(sx / st, -0.8, 0.8)", "with": "clamp(sx / st, -1, 1)", "why": "the turn's coast past its 0.8 rad/s cap"}
// plant: {"file": "src/world/340-input-drag-anywhere-phone-turn.js", "find": "        CS.yawV += ax; CSP.yawV += ax;", "with": "        CS.yawV += ax;", "why": "the drag drawn on one state only: a frame turns part of the finger's move"}
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
function flying(phase, boot = false) {   // boot: not yet landed (no frame before the pre-roll; arrive, its first step, sets the yaw and keeps the tilt)
  return vm.runInThisContext('(function (PHASE, BOOT) {\n  \'use strict\';\n' +
    '  var PI = Math.PI, DEG = PI / 180, SIM_DT = 1 / 60, DTMAX = 0.1, NMAX = Math.ceil(DTMAX / SIM_DT) + 2, TH_MAX = 35 * DEG, DEVMODE = false, shown = true, SEEDR = 1, J = { seed: 1 };\n' +
    '  var CLK = new Float64Array([0, -1]), SIM = { acc: PHASE * SIM_DT, alpha: 0, t: 0, V: BOOT ? null : {} }, OUT = { cssW: 1000 }, MOTION = { on: false }, INPQ = []; INPQ.i = 0;\n' +
    '  var INP = { dx: 0, dy: 0, down: true, rel: false, evT0: 0, fx: 0, fy: 0, ft: 0, relAny: false, held: false, qx: 0, qy: 0 }, DRAG = { id: 1, x0: 0, y0: 0, x: 0, y: 0, on: true, type: \'mouse\' };\n' +
    '  var TOUCHMODE = \'none\', DOMQ = {}, running = true, REC = null, root = {}, coast = null, drawnTh = 0;\n' +
    '  function S() { return { yawV: 0, thU: 0, ring: new Float32Array(12), ringP: new Float32Array(12), ringT: new Float32Array(12), ri: 0, om: 0, omP: 0, since: 0, lastIn: 0, auto: 0, idleAfter: 0, phi: 0, thP: 0, thPraw: 0 }; }\n' +
    '  var CS = S(), CSP = S();\n' +
    '  function clamp(x, a, b) { return x < a ? a : x > b ? b : x; }\n  function angDiff(a, b) { return a - b; }\n  function hfl() { return 0.5; }\n  function ihash(x) { return x; }\n' +
    '  function domNext() {}\n  function devInput() {}\n' +
    '  function simStepOnce() {\n    if (!SIM.V) { SIM.V = {}; CS.yawV = CSP.yawV = 0; CS.thU = clamp(CS.thU, -TH_MAX, TH_MAX); CSP.thU = CS.thU; }   // (arrive: the landing sets the yaw, keeps the tilt)\n' +
    '    CSP.yawV = CS.yawV; CSP.thU = CS.thU;\n    applyInput(SIM_DT, SIM.t, null); SIM.t += SIM_DT;\n    return true;\n  }\n' +
    INPUT + '\n' + MOVE2 + '\n' + ADV +
    '\n  return {\n    move: function (x, ts, y) { onMove({ pointerId: 1, clientX: x, clientY: y || 0, timeStamp: ts }); },\n    up: function () { INP.down = false; INP.rel = true; },\n    press: function () { INP.down = true; },\n    start: function (x0) { DRAG.on = false; DRAG.x0 = DRAG.x = x0; DRAG.y0 = DRAG.y = 0; INP.down = false; },\n    preroll: function (n) { for (var i = 0; i < n; i++) simAdvance(SIM_DT); },\n    prevYaw: function () { return CSP.yawV; },\n    cancel: function () { INP.down = false; INP.rel = false; },\n' +
    '    frame: function (ts, dtMs) { var dt = dtMs !== undefined ? dtMs : CLK[1] < 0 ? 0 : ts - CLK[1]; CLK[1] = ts; var rel = INP.rel; simAdvance(dt / 1000);\n' +
    '      if (rel && !INP.rel) coast = { yaw: CS.yawV, om: CS.om, omP: CS.omP };   // (the release taken: the coast runs from the next frame)\n' +
    '      drawnTh = CSP.thU + (CS.thU - CSP.thU) * SIM.alpha; return CSP.yawV + (CS.yawV - CSP.yawV) * SIM.alpha; },\n' +
    '    tilt: function () { return drawnTh; }, rel: function () { return INP.rel; }, coast: function () { return coast; }, yaw: function () { return CS.yawV; }, om: function () { return CS.om; }, omP: function () { return CS.omP; }\n  };\n})')(phase, boot);
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
    // the coast: every frame turns on, never more than the finger's last move a frame, and
    // never stands still while it has speed
    for (let n = 0; n < hz / 2; n++) {
      const omNow = F.om(), wNow = F.omP(), th1 = F.tilt(), y2 = F.frame(ts += P), d = y2 - y; y = y2;
      assert.ok(Math.abs(F.tilt() - th1 - wNow * P / 1000) < 1e-12, `${tag}: coast frame ${n} tilted ${F.tilt() - th1}, its speed x the frame's time is ${wNow * P / 1000}`);
      assert.ok(d <= move * (1 + 1e-6), `${tag}: coast frame ${n} turned ${(d / move * 100).toFixed(1)}% of the finger's last move`);
      assert.ok(omNow <= 1e-6 || d > 0, `${tag}: coast frame ${n} stood still at ${omNow.toFixed(3)} rad/s`);
      assert.ok(Math.abs(d - omNow * P / 1000) < 1e-12, `${tag}: coast frame ${n} turned ${d}, its speed x the frame's time is ${omNow * P / 1000}`);
    }
  }
  // (the speed the coast takes is the drag's last 0.2 s, its newest moves included: a drag speeding up, let go at 60 Hz;
  // the tilt's too)
  for (const sp of STEPS) {
    const F = flying(sp), P = 1000 / 60, xs = []; let ts = 0;
    for (let k = 0; k < 60; k++) { ts = 1000 + k * P; const t = ts - 1000; const x = 0.15 * t + 0.0002 * t * t; xs.push(x); F.move(x, ts - 0.4, 0.1 * x); if (k === 59) F.up(); F.frame(ts); }
    const c = F.coast(), om = (xs[59] - xs[47]) * GAIN1000 / 0.2;
    assert.ok(c && Math.abs(c.om - om) / om < 1e-6, `60 Hz, steps at ${sp}, a drag speeding up: the coast's speed ${c && c.om.toFixed(4)} rad/s, the last 0.2 s of the drag ${om.toFixed(4)}`);
    assert.ok(Math.abs(c.omP - 0.1 * om) / om < 1e-6, `60 Hz, steps at ${sp}: the tilt's coast ${c.omP.toFixed(4)} rad/s, the last 0.2 s of its drag ${(0.1 * om).toFixed(4)}`);
    // the run-on, frame by frame: the speed x the frame's time, eased out over 0.3 s (the tilt's over 0.2 s); in all,
    // a geometric series of its frames
    const th0 = F.tilt(); let thL = th0;
    for (let n = 0; n < 300; n++) { const w = F.omP(); F.frame(ts += P); assert.ok(Math.abs(F.tilt() - thL - w * P / 1000) < 1e-12, `60 Hz, steps at ${sp}: tilt coast frame ${n} drew ${F.tilt() - thL}, its speed x the frame's time is ${w * P / 1000}`); thL = F.tilt(); }
    const runOn = (w, tau) => w * (P / 1000) / (1 - Math.exp(-P / 1000 / tau)) * (1 - Math.exp(-300 * P / 1000 / tau));
    assert.ok(Math.abs(F.yaw() - c.yaw - runOn(c.om, 0.3)) < 1e-9, `60 Hz, steps at ${sp}: the turn ran on ${F.yaw() - c.yaw} rad, want ${runOn(c.om, 0.3)}`);
    assert.ok(Math.abs(F.tilt() - th0 - runOn(c.omP, 0.2)) < 1e-9, `60 Hz, steps at ${sp}: the tilt ran on ${F.tilt() - th0} rad, want ${runOn(c.omP, 0.2)}`);
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
test('drag: a release read in a long frame coasts at the finger\'s speed; the coast holds the tilt within 35 deg and its speeds within their caps', () => {
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
    for (let k = 0; k < hz; k++) { ts += P; F.move(3 * ts, ts - 0.4, -dir * 2 * ts); F.frame(ts); }   // (3 px/ms across, 2 px/ms up or down: past both caps, and the tilt pushed past 35 deg)
    F.up(); F.frame(ts += P);
    const c = F.coast();
    assert.equal(c.om, 0.8, `${hz} Hz: the turn's coast capped at 0.8 rad/s (${c.om})`);
    assert.equal(c.omP, -dir * 0.5, `${hz} Hz: the tilt's coast capped at 0.5 rad/s (${c.omP})`);
    for (let k = 0; k < 60; k++) { F.frame(ts += P); assert.ok(Math.abs(F.tilt()) <= TH + 1e-12, `${hz} Hz: coast frame ${k} drew a tilt of ${(F.tilt() * 180 / Math.PI).toFixed(2)} deg`); }
    assert.ok(Math.abs(Math.abs(F.tilt()) - TH) < 1e-12, `${hz} Hz: the coast left the tilt at ${(F.tilt() * 180 / Math.PI).toFixed(2)} deg, held at 35`);
  }
});

test('drag: a small drag just past the 8 px start runs on little: its catch-up is no speed', () => {
  // (a drag begins 8 px from the press and takes those 8 px at once, the scene catching the finger up: they were moved
  // over the time since the press, so counted as one frame's move they threw the coast to its cap, a 9-16 px drag
  // running on 6.8-14.1 deg by itself; main ran on 0.9-6.0)
  const DEG = Math.PI / 180;
  for (const hz of [60, 144]) for (const v of [0.15, 0.3, 0.6]) for (const len of [9, 12, 16]) for (const hold of [0, 1, 3]) {
    const F = flying(0.5), P = 1000 / hz; let ts = 1000, x = 0;
    F.start(0); F.frame(ts);
    while (x < len) { ts += P; x = Math.min(len, x + v * P); F.move(x, ts - 0.4); if (x >= len && !hold) F.up(); F.frame(ts); }
    for (let k = 0; k < hold; k++) { if (k === hold - 1) F.up(); F.frame(ts += P); }
    const at = F.yaw(); for (let k = 0; k < 2 * hz; k++) F.frame(ts += P);
    const runOn = (F.yaw() - at) / DEG;
    assert.ok(runOn <= 2, `${hz} Hz, a ${len} px drag at ${v * 1000} px/s, let go ${hold} frames after: ran on ${runOn.toFixed(2)} deg by itself`);
  }
});
