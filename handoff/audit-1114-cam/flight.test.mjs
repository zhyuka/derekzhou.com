// test/unit/flight.mjs: the drag as drawn: a steady drag turns the drawn view evenly on any display (60-240 Hz), and a
// drag that stops does not run on by itself. applyInput and simAdvance cut from the world as it ships; the step
// is the input's alone (the view's yaw drawn between the last two steps, as camPose draws it)
import { test, assert, WORLD, cut } from '../unit-lib.mjs';
import vm from 'node:vm';
const INPUT = cut(WORLD, '  var INP = { dx: 0, dy: 0,', '  var INPLOG = ');
const APPLY = cut(WORLD, '  /* each step: the drag\'s motion', '  /* dev: an input injected');
const ADV = cut(WORLD, '  var DTMAX = ', '  /* the world, built');
function flight(cssW = 1440) {
  return vm.runInThisContext('(function (CSSW) {\n  \'use strict\';\n  var PI = Math.PI, DEG = PI / 180, SIM_DT = 1 / 60, DEVMODE = false, OPT = {}, OUT = { cssW: CSSW }, J = { seed: 1 }, SEEDR = 1, shown = true;\n' +
    '  var INPQ = []; INPQ.i = 0; var INPLOG = [], MOTION = { on: false };\n' +
    '  function clamp(x, a, b) { return x < a ? a : x > b ? b : x; } function hfl(h) { return (h >>> 8) / 16777216; } function ihash(x) { return x >>> 0; } function devInput() {}\n' +
    '  function st() { return { yawV: 0, thU: 0, phi: 0, thP: 0, thPraw: 0, om: 0, omP: 0, since: 0, ring: new Float32Array(12), ringP: new Float32Array(12), ri: 0, lastIn: 0, auto: 0, idleAfter: 8 }; }\n' +
    '  var CS = st(), CSP = st(), SIM = { t: 0, acc: 0, alpha: 1, steps: 0 }, TH_MAX = 35 * DEG;\n' +
    INPUT + APPLY +
    '  function simStepOnce() { CSP.yawV = CS.yawV; CSP.thU = CS.thU; SIM.t += SIM_DT; SIM.steps++; applyInput(SIM_DT, SIM.t, null); return true; }\n' + ADV +
    '\n  return { INP: INP, frame: function (dt) { simAdvance(dt); }, yaw: function () { return CSP.yawV + (CS.yawV - CSP.yawV) * SIM.alpha; }, end: function () { return CS.yawV; } };\n})')(cssW);
}
function steady(hz, jit) {   // a drag at 600 px/s, its move delivered once a frame before the frame (rAF-aligned input)
  const F = flight(), G = (Math.PI / 2) / 1440; let s = 12345, last = 0, fp = 0, prev = null; const r = [];
  const rnd = () => ((s = (Math.imul(s, 1103515245) + 12345) >>> 0) / 4294967296);
  for (let f = 0; f < hz * 3; f++) {
    const t = f / hz + (f ? (rnd() - 0.5) * 2 * jit : 0), dt = t - last; last = t;
    if (t >= 0.5) { F.INP.down = true; const fx = (t - 0.5) * 600; F.INP.dx += fx - fp; fp = fx; }
    F.frame(f ? dt : 0); const y = F.yaw();
    if (prev !== null && t > 1) r.push((y - prev) / (dt * 600 * G));
    prev = y;
  }
  return r;
}
test('flight: a steady drag turns the drawn view evenly at 60, 120, 144, 165 and 240 Hz (each frame within 5% of its share)', () => {
  for (const hz of [60, 120, 144, 165, 240]) {
    const r = steady(hz, 0.0003);
    const lo = Math.min(...r), hi = Math.max(...r);
    assert.ok(lo > 0.95 && hi < 1.05, `${hz} Hz: a frame turned ${lo.toFixed(2)}-${hi.toFixed(2)} x its share of the drag`);
  }
});
test('flight: a drag that stops does not run on: held still 2 frames, none; lifted as it stops, under 5 degrees; a flick still coasts', () => {
  const G = (Math.PI / 2) / 1440, run = (A, D, hold, flick) => {
    const F = flight(), px = A * Math.PI / 180 / G; let fp = 0, atUp = 0;
    for (let f = 0; f < 360; f++) {
      const t = f / 60;
      if (t >= 1 && t < 1 + D + hold) { F.INP.down = true; const s = Math.min(1, (t - 1) / D), fx = flick ? px * s : px * s * s * (3 - 2 * s); F.INP.dx += fx - fp; fp = fx; }
      else if (F.INP.down) { F.INP.down = false; F.INP.rel = true; }
      F.frame(f ? 1 / 60 : 0); if (t < 1 + D + hold) atUp = F.end();
    }
    return (F.end() - atUp) * 180 / Math.PI;
  };
  for (const [A, D] of [[10, 0.3], [45, 0.6], [90, 1]]) {
    const held = run(A, D, 2 / 60 + 1e-6, false), lifted = run(A, D, 0, false);
    assert.ok(Math.abs(held) < 0.5, `a ${A} degree drag over ${D} s, held still 2 frames, ran on ${held.toFixed(1)} degrees`);
    assert.ok(Math.abs(lifted) < 5, `a ${A} degree drag over ${D} s, lifted as it stopped, ran on ${lifted.toFixed(1)} degrees`);
  }
  const fl = run(20, 0.25, 0, true); assert.ok(fl > 3, `a flick (80 deg/s at the release) coasted only ${fl.toFixed(1)} degrees`);
});
