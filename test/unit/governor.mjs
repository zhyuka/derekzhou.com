// test/unit/governor.mjs: the render scale's governor on synthetic frame clocks
// (split from test/unit.mjs, 2026-11-07: one file an area, found by glob, so two PRs that add tests never share a file)
// plant: {"file": "src/world/450-loop-governor-device-tier.js", "find": "    if (p50 > PER * 1.08) {", "with": "    if (p50 > PER * 3) {", "why": "the governor slow to step down"}
import { test, assert, fs, os, path, vm, crypto, execFileSync, ROOT, TMP, WORLD, cut, golden, md5, upd, digest, STREAMS, VEC, fileURLToPath } from '../unit-lib.mjs';

// ------------------------------------------------------------------ the governor, on synthetic frame clocks
// (dev-speed item 5) governor() cut from the world as it ships, run against frame times made here: the render scale's
// ladder (RUNG over RUNGS), its steps down and back up, the pace it learns, and the floor that gives up
const GOV = cut(WORLD, '  var GOVD = new Float32Array(120)', '  /* too slow even so: the world steps aside');
function governed(rungs = [1, 0.85, 0.72, 0.6, 0.5]) {
  return vm.runInThisContext('(function (RUNGS) {\n  \'use strict\';\n  var STILLMODE = false, OPT = {}, RUNG = 0, gave = 0;\n' +
    '  function clamp(x, a, b) { return x < a ? a : x > b ? b : x; }\n  function giveUp() { gave++; }\n' + GOV +
    '\n  return { step: governor, rung: function () { return RUNG; }, pace: function () { return GOVN[13]; }, gave: function () { return gave; } };\n})')(rungs);
}
function play(G, seconds, frameMs, log) {   // frames at frameMs(rung, t) for `seconds` of their own time; log: the rung each second
  let t = 0, next = 1000;
  while (t < seconds * 1000) { const d = frameMs(G.rung(), t); G.step(d); t += d; if (log && t >= next) { log.push(G.rung()); next += 1000; } }
}
test('governor: a steady 60 Hz frame keeps the top rung and never gives up', () => {
  const G = governed(); play(G, 120, () => 1000 / 60);
  assert.equal(G.rung(), 0); assert.equal(G.gave(), 0); assert.ok(Math.abs(G.pace() - 1000 / 60) < 1e-9);
});
test('governor: a cost the scale fixes steps down within about four seconds and stays down', () => {
  const G = governed(), log = [];
  play(G, 120, (r) => (r === 0 ? 30 : 12), log);   // (30 ms at the full scale, 12 ms a rung down)
  const first = log.findIndex((r) => r > 0);
  assert.ok(first >= 0 && first <= 5, `first step down at ${first} s`);
  const top = log.slice(30).filter((r) => r === 0).length;
  assert.ok(top <= 10, `back at the slow top rung ${top} of the last 90 s (each try up costs a slow second or few)`);
  assert.equal(G.gave(), 0);
});
test('governor: a cost the scale cannot touch (a 30 fps cap) is undone and learnt as the pace', () => {
  const G = governed(); play(G, 60, () => 1000 / 30);
  assert.equal(G.rung(), 0, 'both steps undone');
  assert.ok(Math.abs(G.pace() - 1000 / 30) < 0.5, `pace ${G.pace()}`);
  const before = G.rung(); play(G, 60, () => 1000 / 30);
  assert.equal(G.rung(), before, 'no more steps at the learnt pace'); assert.equal(G.gave(), 0);
});
test('governor: under 15 fps that no rung helps gives up; a steady 22 fps is kept as the pace', () => {
  const G = governed(); play(G, 120, () => 80);   // (12.5 fps at every rung: the pace learnt hits its 50 ms ceiling)
  assert.ok(G.gave() >= 1, 'the still sky stays');
  const H = governed(); play(H, 120, () => 45);   // (22 fps at every rung: learnt as the pace, flown)
  assert.equal(H.gave(), 0); assert.ok(Math.abs(H.pace() - 45) < 0.5, `pace ${H.pace()}`);
});
test('governor: a hidden tab\'s gap (over a second) is not a frame', () => {
  const G = governed(); play(G, 30, () => 1000 / 60); G.step(5000); G.step(30000); play(G, 30, () => 1000 / 60);
  assert.equal(G.rung(), 0); assert.equal(G.gave(), 0);
});
test('governor: a 144 Hz display is never asked to beat 60 Hz', () => {
  const G = governed(); play(G, 60, () => 1000 / 144);
  assert.equal(G.rung(), 0); assert.ok(Math.abs(G.pace() - 1000 / 60) < 1e-9);
});
// (the owner, 2026-11-15: "Smooth, >=60 fps") a display over 60 Hz quantises a frame to its own period, so the multiple
// after one 60 Hz frame can land under the old 1.35 periods: a 90 Hz phone sat at 45 fps, a 144 Hz monitor at 48, never
// stepping down. Frames here are a pixel-bound cost (the scale squared) put on the display's next sync
function synced(hz, costMs, fixed = false) {   // fixed: a cost the scale cannot touch (the CPU, the driver)
  const V = 1000 / hz, sc = [1, 0.85, 0.72, 0.6, 0.5]; let seed = 1;
  return (r) => { seed = (seed * 16807) % 2147483647; const c = costMs * (fixed ? 1 : sc[r] * sc[r]) * (0.9 + 0.2 * seed / 2147483647); return Math.max(1, Math.ceil(c / V - 1e-9)) * V; };
}
function fpsAfter(G, seconds, f, settle) {   // play `settle` s, then the mean fps over the rest
  let t = 0, n = 0, tm = 0; while (t < seconds * 1000) { const d = f(G.rung(), t); G.step(d); t += d; if (t > settle * 1000) { n++; tm += d; } }
  return 1000 * n / tm;
}
for (const [hz, cost, lo] of [[90, 20, 60], [100, 15, 60], [144, 20, 60], [165, 15, 60], [75, 26, 60]]) {
  test(`governor: a ${hz} Hz display at ${cost} ms a frame steps down to 60 fps or more`, () => {
    const G = governed(), fps = fpsAfter(G, 180, synced(hz, cost), 90);
    assert.ok(fps >= lo, `${fps.toFixed(1)} fps at rung ${G.rung()}`); assert.ok(G.rung() > 0); assert.equal(G.gave(), 0);
  });
}
test('governor: 60 and 120 Hz displays keep their rungs (cheap: the top; 20 ms: one down)', () => {
  for (const hz of [60, 120]) {
    const A = governed(); fpsAfter(A, 120, synced(hz, 12), 60); assert.equal(A.rung(), 0, `${hz} Hz, 12 ms`);
    const B = governed(), fps = fpsAfter(B, 180, synced(hz, 20), 90); assert.equal(B.rung(), 1, `${hz} Hz, 20 ms`); assert.ok(fps >= 58, `${hz} Hz ${fps}`);
  }
});
// (review of #282) a cost the scale cannot touch gets main's two trials, not the third: a 30 fps cap (Low Power Mode,
// Energy Saver), a CPU-bound phone on a 60 or 120 Hz display, a 48-55 Hz display under its own frame. The boot's detour
// stays at three rung changes, never below rung 2, and the cost is learnt as the pace
function detour(f, seconds = 60) {
  const G = governed(); let t = 0, prev = 0, changes = 0, deepest = 0;
  while (t < seconds * 1000) { const d = f(G.rung(), t); G.step(d); t += d; const r = G.rung(); if (r !== prev) { changes++; prev = r; } deepest = Math.max(deepest, r); }
  return { G, changes, deepest };
}
for (const [name, f] of [
  ['a 30 fps cap', () => 1000 / 30],
  ['a CPU-bound phone on 60 Hz (20 ms at every rung)', synced(60, 20, true)],
  ['a CPU-bound phone on 120 Hz (20 ms at every rung)', synced(120, 20, true)],
  ['a 50 Hz display', () => 20],
  ['a 48 Hz display', () => 1000 / 48],
]) {
  test(`governor: ${name} keeps main's two trials (no third rung)`, () => {
    const { G, changes, deepest } = detour(f);
    assert.ok(deepest <= 2, `deepest rung ${deepest}`); assert.ok(changes <= 3, `${changes} rung changes`);
    assert.equal(G.rung(), 0); assert.equal(G.gave(), 0);
  });
}
