// test/unit/flight.mjs: the flight's heading and bank after a drag
// plant: {"file": "src/world/270-flight.js", "find": "var HEAD_T = 0.035, HEAD_MAX = 2.5, BANK_MAX = 2 * DEG, BANK_T = 0.045;", "with": "var HEAD_T = 0.25, HEAD_MAX = 2.5, BANK_MAX = 2 * DEG, BANK_T = 0.045;", "why": "the heading slow to catch the view"}
// plant: {"file": "src/world/270-flight.js", "find": "var bk = damped2(CS.roll, CS.rollV, CS.bank, BANK_T, dt); CS.roll = bk[0]; CS.rollV = bk[1];", "with": "CS.roll += (rl - CS.roll) * (1 - Math.exp(-dt / 0.08));", "why": "the bank eased first-order (main's): its 2 deg snaps in from rest in a step"}
// plant: {"file": "src/world/270-flight.js", "find": "var rl = BANK_MAX * Math.tanh(-Math.atan(v * CS.yawRate / 9.81) / BANK_MAX)", "with": "var rl = clamp(-Math.atan(v * CS.yawRate / 9.81), -BANK_MAX, BANK_MAX)", "why": "the bank's limit a hard corner, not a smooth one"}
import { test, assert, vm, WORLD, cut } from '../unit-lib.mjs';

// ------------------------------------------------------------------ the heading follows the view; a flyer's bank
// (flight-bank) applyInput, the heading's follow and the bank cut from the world as it ships, run in its fixed 1/60 s
// steps under a test drag on a 1000 px window: 0.3-0.9 s a turn right of 400 px (36 deg), the finger then still until
// 1.3 s and let go; 2.2-2.6 s a flick left of 300 px let go while moving (its coast). The flight's heading catches the
// view about 0.1 s after a drag stops, the bank stays within 2 deg, leans into the turn, and is level about 0.6 s after
// the way stops curving; the bank never turns the heading. (flight-controllers-smooth) Both follow critically damped:
// the bank's rate, acceleration and jerk stay under a damped follow's own bounds, and neither the bank nor the heading
// steps its acceleration as a drag begins. (Before: the heading trailed the view by 14 deg in the turn
// and still more than 1.3 s after it, and the bank reached 5.9 deg, still rolling when the next drag began.)
const INPUT = cut(WORLD, '  var IDLE_K = 0;', '  /* dev: an input injected');
const CONSTS = cut(WORLD, '  var HEAD_T = ', '\n', true) + '\n' + cut(WORLD, '  function damped2(', '\n  }\n', true);
const FOLLOW = cut(WORLD, '    var want = CS.yawV + CS.phi, ', '    // (world6 step B) one framing');
const BANK = cut(WORLD, '    var rl = ', '    directorStep(t);');
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
    '  var SIM = { V: {} }, SIM_DT = 1 / 60, DTMAX = 0.1, CSP = { yawV: 0, thU: 0 }, CLK = new Float64Array([0, -1]);\n' +
    '  var CS = { psi: 0, yawV: 0, phi: 0, thU: 0, thP: 0, thPraw: 0, roll: 0, rollV: 0, bank: 0, bankV: 0, yawRate: 0, ring: new Float32Array(12), ringP: new Float32Array(12), ringT: new Float32Array(12), ri: 0, om: 0, omP: 0, since: 9, lastIn: 0, auto: 0, idleAfter: 0 };\n' +
    '  function clamp(x, a, b) { return x < a ? a : x > b ? b : x; }\n  function angDiff(a, b) { return a - b; }\n  function hfl() { return 0.5; }\n  function ihash(x) { return x; }\n  function devInput() {}\n' +
    INPUT + '\n  var out = [], px = 0, was = false, V = { speed: 12 }, v = V.speed;\n' +
    '  for (var k = 0; k <= ' + STEPS + '; k++) {\n    var t = k / 60, dt = 1 / 60, s = drag(t);\n' +
    '    if (s.down) { if (!was && typeof REL !== "undefined") REL.n = 0; INP.down = true; INP.dx += s.x - px; if (typeof relAdd === "function") relAdd(s.x, 0, t * 1000); } else if (was) { INP.down = false; INP.rel = true; if (typeof relAdd === "function") { REL.tl = t * 1000; relAdd(px, 0, REL.t[(REL.i + REL_N - 1) % REL_N]); } }\n' +   // (the drag's samples and its lift, as onMove and onUp take them)
    '    px = s.x; was = s.down;\n' +
    '    CLK[1] = t * 1000 + 0.4; if (typeof inputFrame === "function") inputFrame(dt);\n' +   // (the frame just after the step\'s move)
   // (the drag and its coast drawn in frame time, before the step, a frame a step here: #222)
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

// (flight-controllers-smooth) the bank and the heading through a drag that starts and stops at once and one that turns
// back at once (the finger's own steps in rate): the bank's rate, acceleration and jerk (from its steps) under the
// bounds one critically damped stage of BANK_T can reach as its target swings across the whole limit (2 B / (T e),
// 2 B / T^2, 4 B / T^3: the two stages' are under them), never past the limit; and in the step a drag begins the bank's
// acceleration is not more than 0.7 of its own peak in the turn (a first-order follow's, main's, is its peak: a step).
// (The heading, critically damped too, is not drawn (the view's yaw is the finger's) and must catch the view within
// 0.1 s: its 0.035 s is two steps, so on the steps' clock its acceleration rises within one.)
test('flight: the bank follows critically damped: no step in its acceleration, its jerk bounded', () => {
  const B = 2 * DEG, T = +/BANK_T = ([\d.]+)/.exec(CONSTS)[1];
  const lin = (t) => ({ x: t < 0.3 ? 0 : t < 0.9 ? 400 * (t - 0.3) / 0.6 : 400, down: t >= 0.3 && t < 1.3 });   // (0.67 px/ms from rest and back at once)
  const back = (t) => ({ x: t < 0.3 ? 0 : t < 0.8 ? 400 * (t - 0.3) / 0.5 : 400 - 400 * (t - 0.8) / 0.5, down: t >= 0.3 && t < 1.3 });   // (turned back at once)
  for (const [name, drag] of [['a drag from rest', lin], ['a drag turned back', back], ['the test drag', testDrag]]) {
    const r = fly(drag), d = (a) => a.slice(1).map((x, i) => (x - a[i]) * 60), mx = (a) => Math.max(...a.map(Math.abs));
    const R = r.map((s) => s.roll), r1 = d(R), r2 = d(r1), r3 = d(r2);
    assert.ok(mx(R) <= B + 1e-12, `${name}: the bank reached ${(mx(R) / DEG).toFixed(3)} deg`);
    assert.ok(mx(r1) <= 2 * B / (T * Math.E) * (1 + 1e-6), `${name}: the bank turned at ${(mx(r1) / DEG).toFixed(1)} deg/s (a damped follow's most ${(2 * B / (T * Math.E) / DEG).toFixed(1)})`);
    assert.ok(mx(r2) <= 2 * B / (T * T) * (1 + 1e-6), `${name}: the bank's acceleration ${(mx(r2) / DEG).toFixed(0)} deg/s2 (most ${(2 * B / T / T / DEG).toFixed(0)})`);
    assert.ok(mx(r3) <= 4 * B / (T * T * T) * (1 + 1e-6), `${name}: the bank's jerk ${(mx(r3) / DEG).toFixed(0)} deg/s3 (most ${(4 * B / T ** 3 / DEG).toFixed(0)})`);
  }
  const r = fly(lin), k0 = r.findIndex((s, i) => i > 0 && s.view !== r[i - 1].view), R = r.map((s) => s.roll);   // (k0: the first step the view turns)
  const acc = (a, i) => (a[i + 1] - 2 * a[i] + a[i - 1]) * 3600, rPeak = Math.max(...r.slice(k0, k0 + 40).map((s, i) => Math.abs(acc(R, k0 + i))));
  for (let i = k0 - 1; i <= k0; i++) assert.ok(Math.abs(acc(R, i)) <= 0.7 * rPeak, `the bank's acceleration ${(acc(R, i) / DEG).toFixed(0)} deg/s2 in step ${i - k0} of the drag, its peak ${(rPeak / DEG).toFixed(0)}: a step`);
});
// the bank's limit is a smooth knee, not a corner: in a steady turn right at it (atan(v w / g) = 2 deg: 18.2 px/s on a
// 1000 px window at 12 m/s) the bank is tanh(1) of its limit, 0.76 (clamped, it would be the whole limit, and its
// slope would break there)
test('flight: the bank\'s limit is a smooth knee: a steady turn right at it banks 0.76 of the limit', () => {
  const B = 2 * DEG, w = 9.81 * Math.tan(B) / 12, pxs = w / ((Math.PI / 2) / 1000);
  const r = fly((t) => ({ x: pxs * t, down: true }));
  const end = r[r.length - 1];
  const k = Math.atan(12 * end.rate / 9.81) / B;   // (the turn reached, against the knee: 1 at it)
  assert.ok(Math.abs(k - 1) < 0.03, `the steady turn is ${k.toFixed(3)} of the knee's`);
  assert.ok(Math.abs(-end.roll / B - Math.tanh(k)) < 0.005, `a steady turn at ${k.toFixed(3)} of the knee banks ${(-end.roll / B).toFixed(3)} of the limit (want tanh, ${Math.tanh(k).toFixed(3)}; clamped: ${Math.min(1, k).toFixed(3)})`);
});
