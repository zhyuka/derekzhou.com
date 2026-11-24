// test/unit/band.mjs: the clouds' lift over the flight band as the air carries them (physics: clouds/drift, the band)
// The maps' own JS in Node (mapsInit, kitAt, bandTopAt) and the world's own lift (212: cellLift): bodies seated over the
// band in air cells, carried by the low layer's wind for 20 minutes; at every second the lowest billow of every body is
// at or over the band's top where it then stands, and the lift never moves faster than 0.5 m/s.
// The suite runs 100 bodies; BAND_FULL=1 node test/unit/band.mjs runs the spec's 10,000.
// The land term: bandTopAt takes the land a body was seated over (the layout's probe of its cell, as 231 records it);
// the page has no land model on the CPU, so the sim gives each body a seat land drawn as the layout's probes fall.
// plant: {"file": "src/world/212-cloud-drift.js", "find": "var e = n - LIFT_V * Math.abs(t - k * LIFT_DT); if (e > y) y = e;", "with": "var e = n - LIFT_V * Math.abs(t - k * LIFT_DT); if (k * LIFT_DT <= t && e > y) y = e;", "why": "the lift looks only behind: a body meets a higher sea before it has risen and its billows dip into the band"}
import { test, assert, vm, WORLD, cut } from '../unit-lib.mjs';

const A1 = '  var CW = (function () {\n', A2 = '  var MAPS = {', A3 = '  var KN = 256, KSTEP = 64,';
const E1 = '\n  })();\n', E2 = '    return w.kit(MAPS.mc, MAPS.pc, MAPS.kw);\n  }\n', E3 = '  var KFROWS = FN * FN / KN;';
const MAPSRC = cut(WORLD, A1, E1, true) + cut(WORLD, A2, E2, true) + cut(WORLD, A3, E3);
const BANDSRC = cut(WORLD, '  function densD(', '\n', true) + cut(WORLD, '  var HEAP_MAX = 55,', '\n', true) + cut(WORLD, '  var BQ = [', '\n', true) + cut(WORLD, '  function bandTopAt(', '  function aboveKeep(');
const AIRSRC = cut(WORLD, '  var AIR_H = {', '\n', true) + cut(WORLD, '  var AIR_U10 =', '\n', true) + cut(WORLD, '  var AIR_W = {', '\n', true) + cut(WORLD, '  var AIR_P = {', '  function airU10(') + cut(WORLD, '  function u10Of(', '\n', true) + cut(WORLD, '  function airSpeed(', '\n', true) + cut(WORLD, '  function airBase(', '  function airVec3(');
const DRIFT = cut(WORLD, '  function cloudWind(', '  /* ----');
const PRE = '  var PI = Math.PI, DEG = Math.PI / 180, FRT = { tanX: Math.tan(36 * DEG), tanY: 1 }; function bootMark() {}\n' +
  '  function angDiff(a, b) { var d = a - b; d -= Math.floor((d + Math.PI) / (2 * Math.PI)) * 2 * Math.PI; return d; }\n' +
  '  function clamp(x, a, b) { return x < a ? a : x > b ? b : x; } function smooth(a, b, x) { var t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); }\n' +
  '  var SIM = { t: 0, alpha: 1 }, SIM_DT = 1 / 60;\n';
const make = vm.runInThisContext('(function (G, CS) {\n  \'use strict\';\n' + PRE + MAPSRC + BANDSRC + AIRSRC + DRIFT +
  '\n  G.mapsInit = mapsInit; G.kwFollow = kwFollow; G.bandTopAt = bandTopAt; G.cellLift = cellLift; G.airW = airW; G.airD = airD; G.LIFT_V = LIFT_V; G.kitAt = kitAt; G.bandTopMost = bandTopMost; G.LIFT_M = LIFT_M;\n})');

function rng(s) { return () => { s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

export function bandProbe(seed) { const G = {}; make(G, { x: 0, z: 0 }); G.mapsInit(seed); G.kwFollow(0, 0, true); return G; }
export function bandSim(nBodies, minutes, seed) {
  const G = {}; make(G, { x: 0, z: 0 }); G.mapsInit(seed); G.kwFollow(0, 0, true);
  const r = rng(seed * 7919 + 1), PER = 20, T = minutes * 60;
  const out = { bodies: 0, checks: 0, under: 0, worst: Infinity, vyMax: 0, lifted: 0, liftMax: 0, left: 0, most: 0 };
  for (let c = 0; c * PER < nBodies; c++) {
    // a visit's wind: any way; the low layer's free clouds carried at 1.3 U10 (3.9-9.75 m/s), the air's own profile
    const a = r() * 2 * Math.PI, V = { wind: [Math.sin(a), Math.cos(a)], u10: 3 + 4.5 * r() };   // (a visit's U10 over its range, 3.0-7.5 m/s: the low layer 1.3 U10, veered 20 deg)
    assert.ok(Math.hypot(...G.airW(V)) >= 3, `a visit's low layer at ${Math.hypot(...G.airW(V)).toFixed(2)} m/s: the sim carries nothing`);
    const tL = r() * 3600, C = { air: true, V, dL: G.airD(V, tL), lift: [], all: [] };
    const cx = (r() - 0.5) * 60000, cz = (r() - 0.5) * 60000, w = G.airW(V);
    for (let i = 0; i < PER && c * PER + i < nBodies; i++) {
      // a body's centre where the cell stood at tL, its seat land as the layout's probe gives it (the sea's floor to
      // the formations' tops, or none over open sea), its lowest billow laid out at or over the band (resolve: dB)
      const x = cx + (r() - 0.5) * 5200, z = cz + (r() - 0.5) * 5200, land = r() < 0.25 ? undefined : -110 + 260 * r();
      const low = G.bandTopAt(x, z, land) + 400 * r() * r();
      const b = { x, z, low, land }; C.all.push(b); out.bodies++;
      if (low < G.bandTopMost(land) + G.LIFT_M) { b.lifted = true; C.lift.push(b); } else out.left++;   // (as resolve: one over the band's most left out)
    }
    let yPrev = null;
    for (let t = tL; t <= tL + T; t += 1) {
      const y = G.cellLift(C, t + 0.5);   // (between two of its samples: the worst place for them)
      if (y > 0) out.lifted++;
      out.liftMax = Math.max(out.liftMax, y);
      if (yPrev !== null) out.vyMax = Math.max(out.vyMax, Math.abs(y - yPrev));
      yPrev = y;
      for (const b of C.all) {
        const tt = t + 0.5, px = b.x + w[0] * tt - C.dL[0], pz = b.z + w[1] * tt - C.dL[1];
        const bt = G.bandTopAt(px, pz, b.land), m = b.low + (b.lifted ? y : 0) - bt; out.checks++;
        if (bt > G.bandTopMost(b.land)) out.most++;
        if (m < 0) out.under++;
        out.worst = Math.min(out.worst, m);
      }
    }
  }
  return out;
}

if (!process.env.BAND_SKIP) test('band: bodies carried over the band for 20 minutes keep their lowest billow over its top; the lift at most 0.5 m/s', () => {
  const full = process.env.BAND_FULL === '1', n = full ? 10000 : 100;
  for (const seed of full ? (process.env.BAND_SEEDS || '11').split(',').map(Number) : [11]) {
    const o = bandSim(n, 20, seed);
    if (full) console.log(`band: seed ${seed}: ${o.bodies} bodies x 20 min, ${o.checks} checks, ${o.under} under, worst margin ${o.worst.toFixed(2)} m, |vy| at most ${o.vyMax.toFixed(4)} m/s, lifted ${o.lifted} cell-seconds, ${o.left} left out (over the band's most), at most ${o.liftMax.toFixed(1)} m`);
    assert.equal(o.under, 0, `seed ${seed}: ${o.under} of ${o.checks} checks under the band's top (worst ${o.worst.toFixed(2)} m)`);
    assert.ok(o.vyMax <= 0.5 + 1e-9, `seed ${seed}: the lift moved ${o.vyMax} m/s`);
    assert.equal(o.most, 0, `seed ${seed}: the band's top over bandTopMost ${o.most} times`);
    assert.ok(o.lifted > 0, `seed ${seed}: no body ever needed a lift (the sim proves nothing)`);
  }
});
