// test/unit/flight.mjs: the flight's heading and bank after a drag
// plant: {"file": "src/world/270-flight.js", "find": "var HEAD_T = 0.07, HEAD_MAX = 2.5, BANK_MAX = 2 * DEG, BANK_T = 0.08;", "with": "var HEAD_T = 0.45, HEAD_MAX = 2.5, BANK_MAX = 2 * DEG, BANK_T = 0.08;", "why": "the heading slow to catch the view"}
import { test, assert, vm, WORLD, cut } from '../unit-lib.mjs';

// ------------------------------------------------------------------ the heading follows the view; a flyer's bank
// (flight-bank) applyInput, the heading's follow and the bank cut from the world as it ships, run in its fixed 1/60 s
// steps under a test drag on a 1000 px window: 0.3-0.9 s a turn right of 400 px (36 deg), the finger then still until
// 1.3 s and let go; 2.2-2.6 s a flick left of 300 px let go while moving (its coast). The flight's heading catches the
// view about 0.1 s after a drag stops, the bank stays within 2 deg, leans into the turn, and is level about 0.6 s after
// the way stops curving; the bank never turns the heading. (Before: the heading trailed the view by 14 deg in the turn
// and still more than 1.3 s after it, and the bank reached 5.9 deg, still rolling when the next drag began.)
const INPUT = cut(WORLD, '  var IDLE_K = 0;', '  /* dev: an input injected');
const CONSTS = WORLD.includes('  var HEAD_T = ') ? cut(WORLD, '  var HEAD_T = ', '\n', true) : '';   // (main had its numbers inline)
const FOLLOW = cut(WORLD, '    var want = CS.yawV + CS.phi, d = angDiff(want, CS.psi)', '    // (world6 step B) one framing');
const BANK = cut(WORLD, '    var rl = clamp(', '    directorStep(t);');
const DEG = Math.PI / 180, STEPS = 300;
function ease(a, b, x) { const u = Math.min(1, Math.max(0, (x - a) / (b - a))); return u * u * (3 - 2 * u); }
function testDrag(t) {
  if (t < 2.2) return { x: 400 * ease(0.3, 0.9, t), down: t >= 0.3 && t < 1.3 };
  const u = Math.min(1, (t - 2.2) / 0.4); return { x: 400 - 300 * u * u, down: t < 2.6 };
}
function fly(drag = testDrag, { bank = true } = {}) {
  return vm.runInThisContext('(function (drag) {\n  \'use strict\';\n' +
    '  var PI = Math.PI, DEG = PI / 180, TH_MAX = 35 * DEG, DEVMODE = false, shown = true, SEEDR = 1, J = { seed: 1 };\n' + CONSTS +
    '  var OUT = { cssW: 1000 }, MOTION = { on: false }, INPQ = []; INPQ.i = 0;\n' +
    '  var INP = { dx: 0, dy: 0, down: false, rel: false, fx: 0, fy: 0, ft: 0, relAny: false, held: false, qx: 0, qy: 0 };\n' +
    '  var SIM = { V: {} }, SIM_DT = 1 / 60, DTMAX = 0.1, CSP = { yawV: 0, thU: 0 };\n' +
    '  var CS = { psi: 0, yawV: 0, phi: 0, thU: 0, thP: 0, thPraw: 0, roll: 0, yawRate: 0, ring: new Float32Array(12), ringP: new Float32Array(12), ringT: new Float32Array(12), ri: 0, om: 0, omP: 0, since: 9, lastIn: 0, auto: 0, idleAfter: 0 };\n' +
    '  function clamp(x, a, b) { return x < a ? a : x > b ? b : x; }\n  function angDiff(a, b) { return a - b; }\n  function hfl() { return 0.5; }\n  function ihash(x) { return x; }\n  function devInput() {}\n' +
    INPUT + '\n  var out = [], px = 0, was = false, V = { speed: 12 }, v = V.speed;\n' +
    '  for (var k = 0; k <= ' + STEPS + '; k++) {\n    var t = k / 60, dt = 1 / 60, s = drag(t);\n' +
    '    if (s.down) { if (!was && typeof REL !== "undefined") REL.n = 0; INP.down = true; INP.dx += s.x - px; if (typeof relAdd === "function") relAdd(s.x, 0, t * 1000); } else if (was) { INP.down = false; INP.rel = true; if (typeof relAdd === "function") { REL.tl = t * 1000; relAdd(px, 0, REL.t[(REL.i + REL_N - 1) % REL_N]); } }\n' +   // (the drag's samples and its lift, as onMove and onUp take them)
    '    px = s.x; was = s.down;\n' +
    '    if (typeof inputFrame === "function") inputFrame(dt);\n' +   // (the drag and its coast drawn in frame time, before the step, a frame a step here: #222)
    '    applyInput(dt, t, V);\n' +
    FOLLOW + (bank ? BANK : '') +
    '    out.push({ t: t, view: CS.yawV + CS.phi, psi: CS.psi, roll: CS.roll, rate: CS.yawRate, down: s.down });\n  }\n  return out;\n})')(drag);
}
const at = (r, t) => r[Math.round(t * 60)];
test('flight: the heading catches the view about 0.1 s after a drag stops, and never turns faster than 143 deg/s', () => {
  const r = fly();
  const caught = r.findIndex((s, i) => s.t >= 0.9 && r.slice(i, 78).every((q) => Math.abs(q.view - q.psi) < 0.5 * DEG));
  assert.ok(caught >= 0 && r[caught].t <= 1.0 + 1e-9, `the heading within 0.5 deg of the view ${caught >= 0 ? (r[caught].t - 0.9).toFixed(3) + ' s' : 'never'} after the turn's drag stops (want 0.1 s)`);
  assert.ok(Math.abs(at(r, 0.6).view - at(r, 0.6).psi) < 6 * DEG, `mid-turn the heading trails the view ${((at(r, 0.6).view - at(r, 0.6).psi) / DEG).toFixed(1)} deg`);
  const fast = fly((t) => ({ x: t >= 0.3 ? 2000 * ease(0.3, 0.4, t) : 0, down: t >= 0.3 && t < 1 }));   // (180 deg in 0.1 s)
  for (const s of fast) assert.ok(Math.abs(s.rate) <= 2.5 + 1e-9, `the heading turned ${(s.rate / DEG).toFixed(0)} deg/s at ${s.t.toFixed(2)} s`);
});
test('flight: a flyer\'s bank, within 2 deg, into the turn, and level about 0.6 s after the way stops curving', () => {
  const r = fly();
  for (const s of r) assert.ok(Math.abs(s.roll) <= 2 * DEG + 1e-12, `the bank ${(s.roll / DEG).toFixed(2)} deg at ${s.t.toFixed(2)} s`);
  for (const s of r) if (Math.abs(s.rate) > 0.05) assert.ok(Math.sign(s.roll) === -Math.sign(s.rate) || Math.abs(s.roll) < 0.01 * DEG, `at ${s.t.toFixed(2)} s the bank leans out of the turn`);
  assert.ok(Math.max(...r.map((s) => Math.abs(s.roll))) > 1.5 * DEG, 'the turn banks');
  // the way stops curving when the heading has caught the view; level (under 0.1 deg) within 0.6 s of it
  const still = r.findIndex((s) => s.t >= 0.9 && Math.abs(s.rate) < 0.01);
  const level = r.findIndex((s, i) => i >= still && r.slice(i, 132).every((q) => Math.abs(q.roll) < 0.1 * DEG));
  assert.ok(level >= 0 && r[level].t - r[still].t <= 0.6, `level ${level >= 0 ? (r[level].t - r[still].t).toFixed(2) + ' s' : 'never'} after the way stops curving (want 0.6 s at most)`);
  assert.ok(at(r, 0.9 + 0.7).roll === 0 || Math.abs(at(r, 1.6).roll) < 0.1 * DEG, 'still banked 0.7 s after the drag stopped');
});
test('flight: the bank never turns the heading', () => {
  const a = fly(), b = fly(testDrag, { bank: false });
  for (let i = 0; i < a.length; i++) assert.equal(a[i].psi, b[i].psi, `the heading at ${a[i].t.toFixed(2)} s differs with the bank drawn`);
});
