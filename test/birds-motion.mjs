// birds-motion.mjs: the ink birds' drawn motion, frame by frame, in the headless sim run as the page's loop runs it
// (fixed 1/60 s steps; the camera and the birds drawn between the last two: tools/birds/sim.mjs, o.frames). A drawn
// bird's form (its 46 points about its body) and its body on the window are bounded in their second difference: no
// snap, no flicker, no jump (the owner, 2026-11-14: "the birds sometimes feel choppy at times (esp when they
// land/takeoff, but not only then) and not 100% smooth as intended"). The bounds are per kind, by its wingbeat rate.
//   node --test test/birds-motion.mjs        CI (tools/checks/35-birds.sh: a process a test); BIRDS_N=8 for more seeds
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeSim } from '../tools/birds/sim.mjs';
import { SCENES } from './birds-scenes.mjs';

const NV = 46, SEEDS = +(process.env.BIRDS_N || 4), RATE = { gull: 1.95, crow: 2.45, swallow: 4.8, finch: 3 };
/* a scene at hz frames a second for secs: the tagged birds' drawn records, frame by frame */
function run(cs, seed, hz, secs, each) {
  const sc = SCENES[cs](seed, '960x600'); sc.opt.dt = 1 / 60; sc.opt.frames = true; sc.opt.draw = { data: null };
  const sim = makeSim(sc.opt); const tags = sc.setup(sim) || [];
  const tr = new Map();
  for (let k = 0; k < Math.round(secs * hz); k++) {
    const n = sim.frame(1 / hz), DF = sim.B.DF();
    for (const b of tags) {
      const s = b.s; if (!s || s.seenF !== DF || sim.t < 0.2) continue;
      let a = tr.get(b); if (!a) tr.set(b, a = []);
      a.push({ k, n, span: s.spanPx, hb: [s.HB[0], s.HB[1]], D: Float64Array.from(s.D46), kind: b.kind, st: b.st });
    }
    if (each) each(sim, tags);
  }
  return tr;
}
const sh = (f, i) => [f.D[2 * i] - f.hb[0], f.D[2 * i + 1] - f.hb[1]];
function d2(a, b, c) { let m = 0; for (let i = 0; i < NV; i++) { const p = sh(a, i), q = sh(b, i), r = sh(c, i); m = Math.max(m, Math.hypot(p[0] - 2 * q[0] + r[0], p[1] - 2 * q[1] + r[1])); } return m; }
/* the worst form and body second differences over the landing scenes, each over its bound (1: at the bound) */
function jumps(hz, scenes, states) {
  const k60 = (60 / hz) ** 2; let worst = { f: 0 }, worstB = { b: 0 };
  for (const cs of scenes) for (let seed = 1; seed <= SEEDS; seed++) for (const F of run(cs, seed, hz, 24).values())
    for (let n = 1; n < F.length - 1; n++) {
      const a = F[n - 1], b = F[n], c = F[n + 1]; if (a.k < 10 || b.k !== a.k + 1 || c.k !== b.k + 1 || b.span < 6 || (states && !states.includes(b.st))) continue;   // (the first frames: the scene was set up on the step clock)
      const lim = 0.25 * k60 * Math.max(1, ((RATE[b.kind] || 2) / 1.95) ** 2) * 1.2, f = d2(a, b, c) / b.span / lim;
      const bb = Math.hypot(a.hb[0] - 2 * b.hb[0] + c.hb[0], a.hb[1] - 2 * b.hb[1] + c.hb[1]) / b.span / (0.1 * Math.max(k60, 0.25));
      if (f > worst.f) worst = { f, at: `${cs} ${seed} frame ${b.k} ${b.st}` };
      if (bb > worstB.b) worstB = { b: bb, at: `${cs} ${seed} frame ${b.k} ${b.st}` };
    }
  return { worst, worstB };
}

test('60 Hz: no landing or perched bird\'s drawn form or body jumps', () => {
  const { worst, worstB } = jumps(60, ['perch', 'drop', 'click', 'cursor'], ['land', 'perch']);
  console.log(`# 60 Hz: worst form step ${worst.f.toFixed(2)} of its bound (${worst.at}), body ${worstB.b.toFixed(2)} (${worstB.at})`);
  assert.ok(worst.f <= 1, `form jump ${worst.f.toFixed(2)}x its bound at ${worst.at}`);
  assert.ok(worstB.b <= 1, `body jump ${worstB.b.toFixed(2)}x its bound at ${worstB.at}`);
});

test('a landing\'s rest is fixed once in the step, and the drawn bird is never upside down', () => {
  let changed = 0, upside = 0, lands = 0;
  for (const cs of ['perch', 'drop', 'click']) for (let seed = 1; seed <= SEEDS; seed++) {
    const was = new Map();
    run(cs, seed, 60, 24, (sim, tags) => {
      for (const b of tags) {
        if (b.st !== 'land' || !b.P) { was.delete(b); continue; }
        const w = was.get(b); if (w === undefined) { lands++; was.set(b, b.P.rest); } else if (b.P.rest !== w) { changed++; was.set(b, b.P.rest); }
        if (b.s && b.s.seenF === sim.B.DF() && b.s.B[7] < 0) upside++;
      }
    });
  }
  console.log(`# landings: ${lands}; the rest changed in flight ${changed} times; drawn upside down ${upside} frames`);
  assert.ok(lands > 0, 'no landing');
  assert.equal(changed, 0, `the landing's rest changed ${changed} times during the landing (the draw fed it back)`);
  assert.equal(upside, 0, `a landing bird drawn upside down on ${upside} frames`);
});
