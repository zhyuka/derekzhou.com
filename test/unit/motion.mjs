// test/unit/motion.mjs: the phone's motion steering (iOS: MOTION), held still and turned
// plant: {"file": "src/world/340-input-drag-anywhere-phone-turn.js", "find": "      if (MOTION.my) { CS.phi += ey * kf; any = true; if (Math.abs(ey) * (1 - kf) < MO_REST && Math.abs(MOTION.vy) < MO_STILL) MOTION.my = false; }", "with": "      if (Math.abs(ey) > dz) { CS.phi += ey - (ey > 0 ? dz : -dz); any = true; }", "why": "the view followed only to the dead zone's edge (main's): held still after a turn, the sensor's noise crept it on"}
// plant: {"file": "src/world/340-input-drag-anywhere-phone-turn.js", "find": "var MO_T = 0.1, MO_REST = 0.1 * DEG, MO_STILL = 0.3 * DEG;", "with": "var MO_T = 0.1, MO_REST = 0.1 * DEG, MO_STILL = 0;", "why": "the follow never rests: held still, the view follows the sensor's noise"}
// plant: {"file": "src/world/340-input-drag-anywhere-phone-turn.js", "find": "var MO_T = 0.1, MO_REST = 0.1 * DEG, MO_STILL = 0.3 * DEG;", "with": "var MO_T = 0.1, MO_REST = 0.1 * DEG, MO_STILL = 1 * DEG;", "why": "the follow rests in a slow turn: a 1 deg/s turn of the phone goes in steps"}
import { test, assert, vm, WORLD, cut } from '../unit-lib.mjs';

// (the hub's 02:33Z item, the phone's motion) orientAt (the device's angles to the view's yaw and pitch) and
// applyInput (the smoothing, the dead zone, the follow) cut from the world as it ships, stepped at the flight's 60 Hz,
// fed deviceorientation events at 60 Hz delivered 1-5 ms late. The phone upright (beta 90, looking at the horizon).
// The noise model, assumed (there is no recorded orientation in this repository): each angle white noise of sigma
// 0.05-0.2 deg an event (a phone's fused attitude, compass-free: alpha relative), and alpha a random walk of 0.05
// deg/sqrt(s) (about 0.4 deg a minute: a gyroscope's bias left in the fused yaw).
// MOTION is iOS's only, asked inside a gesture and used only if the visitor allows it (Android is drag-only: the
// owner, 2026-11-06; docs/security.md).
const ORIENT = cut(WORLD, '  function orientAt(', '  /* each step:');
const INPUT = cut(WORLD, '  var IDLE_K = 0;', '  /* dev: an input injected');
function lcg(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
function normal(r) { return Math.sqrt(-2 * Math.log(r() + 1e-12)) * Math.cos(2 * Math.PI * r()); }
const MAKE = () => vm.runInThisContext('(function () {\n  \'use strict\';\n' +
  '  var PI = Math.PI, DEG = PI / 180, SIM_DT = 1 / 60, DTMAX = 0.1, TH_MAX = 35 * DEG, DEVMODE = false, shown = true, SEEDR = 1, J = { seed: 1 }, CLK = new Float64Array([0, -1]);\n' +
  '  var SIM = { V: {} }, OUT = { cssW: 1000 }, INPQ = []; INPQ.i = 0; var REC = null;\n' +
  '  var MOTION = { st: "on", on: true, has: false, yaw: 0, pitch: 0, yaw0: 0, pitch0: 0, sy: 0, sp: 0, ref: false, tries: 0, n: 0, gen: 0, my: false, mp: false, vy: 0, vp: 0 };\n' +
  '  var INP = { dx: 0, dy: 0, down: false, rel: false, fx: 0, fy: 0, relAny: false, qx: 0, qy: 0 };\n' +
  '  var CS = { yawV: 0, thU: 0, phi: 0, thP: 0, thPraw: 0, om: 0, omP: 0, since: 0, lastIn: 0, auto: 0, idleAfter: 0 }, CSP = { yawV: 0, thU: 0 };\n' +
  '  function clamp(x, a, b) { return x < a ? a : x > b ? b : x; }\n  function angDiff(a, b) { var d = (a - b) % (2 * PI); return d > PI ? d - 2 * PI : d < -PI ? d + 2 * PI : d; }\n  function hfl() { return 0.5; }\n  function ihash(x) { return x; }\n  function devInput() {}\n  function inert() { return false; }\n' +
  ORIENT + '\n' + INPUT + '\n  return { orient: orientAt, step: function (t) { applyInput(SIM_DT, t, null); }, CS: CS };\n})')();
// the phone's alpha over time (deg, its own turn) and noise: the view's yaw (phi) and tilt each step, deg
function fly(alphaAt, secs, sigma, seed) {
  const M = MAKE(), r = lcg(seed), ev = []; let walk = 0;
  for (let t = 0; t < secs * 1000; t += 1000 / 60) {
    walk += normal(r) * 0.05 * Math.sqrt(1 / 60);
    ev.push([t + 1 + r() * 4, 30 + alphaAt(t / 1000) + walk + sigma * normal(r), 90 + sigma * normal(r), sigma * normal(r)]);
  }
  ev.sort((p, q) => p[0] - q[0]);
  let ei = 0; const yaw = [], tilt = [];
  for (let k = 0; k * 1000 / 60 < secs * 1000; k++) {
    const ts = k * 1000 / 60;
    while (ei < ev.length && ev[ei][0] <= ts) { M.orient(ev[ei][1], ev[ei][2], ev[ei][3]); ei++; }
    M.step(ts / 1000); yaw.push(M.CS.phi * 180 / Math.PI); tilt.push(M.CS.thP * 180 / Math.PI);
  }
  return { yaw, tilt };
}
const ease = (u) => (u <= 0 ? 0 : u >= 1 ? 1 : u * u * (3 - 2 * u));
test('motion: held still (after a turn or none), the view neither moves nor creeps over 10 s', () => {
  // a turn of 0, +20 or -35 deg over 0.5-1.5 s, then held: from 3 s to 13 s the view's yaw and tilt move at most 0.01
  // deg in all and turn at most 0.1 deg/s in any step. (Main: after a turn, it crept 0.13-0.30 deg in 10 s in up to 25
  // steps, up to 3.7 deg/s in a step: it rested at the dead zone's edge, and the noise crossed it again and again.)
  for (const sigma of [0.05, 0.1, 0.2]) for (const turn of [0, 20, -35]) for (const seed of [1, 2, 3, 4, 5]) {
    const { yaw, tilt } = fly((t) => turn * ease(t - 0.5), 13, sigma, seed), tag = `noise ${sigma} deg, a turn of ${turn} deg, seed ${seed}`;
    for (const [name, a] of [['yaw', yaw], ['tilt', tilt]]) {
      const h = a.slice(3 * 60), drift = Math.max(...h) - Math.min(...h), rate = Math.max(...h.slice(1).map((x, i) => Math.abs(x - h[i]) * 60));
      assert.ok(drift <= 0.01, `${tag}: held still 10 s, the view's ${name} crept ${drift.toFixed(3)} deg (want 0.01 at most)`);
      assert.ok(rate <= 0.1, `${tag}: held still, the view's ${name} turned ${rate.toFixed(2)} deg/s in a step (want 0.1 at most: judder)`);
    }
  }
});
test('motion: a steady turn of the phone from 1 deg/s is followed with no step standing still, and the view ends where the phone points', () => {
  // (main: a 2 deg/s turn stood still in 28-35 steps of 6 s, and every turn ended 1.2 deg short: the dead zone's edge)
  for (const rate of [1, 2, 5]) for (const seed of [1, 2, 3]) {
    const { yaw } = fly((t) => rate * Math.min(10, Math.max(0, t - 1)), 14, 0.1, seed), w = yaw.slice(4 * 60, 10 * 60), st = w.slice(1).map((x, i) => (x - w[i]) * 60), tag = `${rate} deg/s, seed ${seed}`;
    const still = st.filter((x) => Math.abs(x) < 0.05 * rate).length;
    assert.equal(still, 0, `${tag}: ${still} steps of the turn stood still`);
    const end = yaw[yaw.length - 1];
    assert.ok(Math.abs(end - 10 * rate) <= 0.4, `${tag}: the view ended at ${end.toFixed(2)} deg, the phone at ${10 * rate} (within 0.4: the noise's walk)`);
  }
});
