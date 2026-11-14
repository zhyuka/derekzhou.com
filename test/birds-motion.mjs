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

/* (the audit's bird-frame-time-pose) everything posed reads the frame's own time, not the step's: at 144 Hz a bird's
   drawn form changes as much on the frames that took no step as on those that did (main: the wings moved on 42 % of
   frames, a fine judder at 120-165 Hz) */
function d1(a, b) { let m = 0; for (let i = 0; i < NV; i++) { const p = sh(a, i), q = sh(b, i); m = Math.max(m, Math.hypot(p[0] - q[0], p[1] - q[1])); } return m; }
test('144 Hz: the wings and attitude move on every frame, not only on those with a step', () => {
  const S = {};
  for (const cs of ['perch', 'cursor']) for (let seed = 1; seed <= SEEDS; seed++) for (const F of run(cs, seed, 144, 20).values())
    for (let n = 1; n < F.length; n++) {
      const a = F[n - 1], b = F[n]; if (b.k !== a.k + 1 || a.st !== b.st || b.span < 6) continue;
      const d = d1(a, b) / b.span, o = S[b.st] || (S[b.st] = { s0: 0, n0: 0, s1: 0, n1: 0 });
      if (b.n) { o.s1 += d; o.n1++; } else { o.s0 += d; o.n0++; }
    }
  const bad = [];
  for (const st of ['fly', 'appr', 'land', 'perch']) {
    const o = S[st]; if (!o || o.n0 < 20 || o.n1 < 20) continue;
    const r = (o.s0 / o.n0) / (o.s1 / o.n1); console.log(`# 144 Hz ${st}: form change without a step ${r.toFixed(2)} of that with one (${o.n0 + o.n1} frames)`);
    if (!(r > 0.6 && r < 1.6)) bad.push(`${st} ${r.toFixed(2)}`);
  }
  assert.ok(Object.keys(S).length > 0, 'no frames');
  assert.equal(bad.length, 0, `form change without a step out of 0.6-1.6 of that with one: ${bad.join(', ')}`);
});

/* (the audit's bird-leap-up) a bird leaves its perch upward: the perch's motion is its foot's, not its body's rest
   point (main: the crouch and the rest re-solved under it counted as the perch moving down; 48 of 53 leaps went down) */
test('a leap off a perch goes up', () => {
  let n = 0, down = 0, worst = 1e9;
  for (let seed = 1; seed <= SEEDS; seed++) {
    const sc = SCENES.perch(seed, '960x600'); sc.opt.dt = 1 / 60; sc.opt.frames = true; sc.opt.draw = { data: null };
    const sim = makeSim(sc.opt); sc.setup(sim); const was = new Map();
    for (let k = 0; k < 95 * 60; k++) {
      const pc = sim.C.pos.slice(); sim.frame(1 / 60);   // (drawn: the draw once wrote the perch's rest)
      for (const b of sim.B.BIRDS) {
        const w = was.get(b);
        if (w === 'L' && b.st === 'fly') { n++; const vy = b.v[1] - (sim.C.pos[1] - pc[1]) * 60; worst = Math.min(worst, vy); if (vy < 0) down++; }
        was.set(b, b.st === 'perch' && b.P && b.P.leaving ? 'L' : b.st);
      }
    }
  }
  console.log(`# leaps: ${n}, ${down} down; the lowest climb ${worst.toFixed(2)} m/s`);
  assert.ok(n > 0 && down === 0, `${down} of ${n} leaps went down`);
});

test('144 Hz: a take-off never steps back on the window', () => {
  let worst = 0, at = '', n = 0;
  for (let seed = 1; seed <= SEEDS; seed++) {
    const sc = SCENES.perch(seed, '960x600'); sc.opt.dt = 1 / 60; sc.opt.frames = true; sc.opt.draw = { data: null };
    const sim = makeSim(sc.opt); const [b] = sc.setup(sim); let perchT = -1, left = -1, prev = null;
    for (let k = 0; k < 40 * 144; k++) {
      sim.frame(1 / 144); const s = b.s, DF = sim.B.DF();
      if (b.st === 'perch' && perchT < 0) perchT = sim.t;
      if (perchT >= 0 && left < 0 && sim.t - perchT > 2) { sim.B.leave(b, 'own'); left = k; }
      if (left < 0 || !s || s.seenF !== DF) { prev = null; continue; }
      const cur = [s.HB[0], s.HB[1]];
      if (b.st === 'fly' && prev && prev.st !== 'fly') n++;
      if (prev && prev.st === 'fly' && b.st === 'fly' && prev.v) {   // (moving: a frame's step against the last frame's, where it moved at all)
        const dx = cur[0] - prev.x, dy = cur[1] - prev.y, dot = dx * prev.v[0] + dy * prev.v[1], pl = Math.hypot(...prev.v);
        if (pl > 0.05 && -dot / pl > worst) { worst = -dot / pl; at = `seed ${seed} frame ${k}`; }
      }
      prev = { x: cur[0], y: cur[1], st: b.st, v: prev ? [cur[0] - prev.x, cur[1] - prev.y] : null };
      if (k - left > 1.5 * 144) break;
    }
  }
  console.log(`# take-offs: ${n}; the worst step back on the window ${worst.toFixed(2)} px (${at})`);
  assert.ok(n > 0, 'no take-off');
  assert.ok(worst <= 0.3, `a take-off stepped back ${worst.toFixed(2)} px at ${at}`);
});

test('every landing starts its flare from none (a second landing keeps nothing of the first)', () => {
  let lands = 0, stale = 0, at = '';
  for (const cs of ['natural', 'cursor', 'click']) for (const size of ['960x600', '390x844']) for (let seed = 1; seed <= SEEDS; seed++) {
    const sc = SCENES[cs](seed, size); sc.opt.dt = 1 / 60; sc.opt.frames = true; sc.opt.draw = { data: null };
    const sim = makeSim(sc.opt); sc.setup(sim); const was = new Map();
    for (let k = 0; k < 80 * 60; k++) {   // (80 s: long enough for birds to land, leave and land again)
      sim.frame(1 / 60);
      for (const b of sim.B.BIRDS) {
        if (b.st === 'land' && was.get(b) !== 'land') { lands++; if (b.flareU > 0.5) { stale++; at = `${cs} ${size} ${seed} t ${sim.t.toFixed(2)}`; } }
        was.set(b, b.st);
      }
    }
  }
  console.log(`# landings begun: ${lands}; begun with the last one's flare ${stale}`);
  assert.ok(lands > 0, 'no landing');
  assert.equal(stale, 0, `${stale} landings began with the last landing's flare (${at})`);
});

test('no perched bird stands in the air above its ink (at most 1 px under its feet)', () => {
  const FT = [0, 0]; let n = 0, over = 0, max = -1e9, at = '';
  for (const cs of ['drop', 'perch']) for (const size of ['960x600', '390x844']) for (let seed = 1; seed <= SEEDS; seed++) {
    const sc = SCENES[cs](seed, size); sc.opt.dt = 1 / 60; sc.opt.draw = { data: null };
    const sim = makeSim(sc.opt); const tags = sc.setup(sim) || [];
    for (let k = 0; k < 26 * 60; k++) {
      if (sc.each) sc.each(sim, tags);
      sim.step(); const B = sim.B, C = sim.C, W = sim.W, H = sim.H, k2 = (W / 2) / B.VW.tanX;
      for (const b of B.PERCHED) {
        const s = b.s, P = b.P; if (!s || b.st !== 'perch' || !P || P.kind === 'pointer' || P.leaving || s.seenF !== B.DF()) continue;
        if (P.hop || (P.yawTo !== undefined && sim.t - P.yawT < P.yawD)) continue;   // (a hop or a turn lifts it on purpose)
        B.perchFoot(P, FT); const sp = B.perchSpan(b, P.k); let low = -1e9;
        for (let i = 0; i < NV; i++) {
          const X = s.X46[3 * i], Y = s.X46[3 * i + 1], Z = s.X46[3 * i + 2], zc = X * C.f[0] + Y * C.f[1] + Z * C.f[2];
          const sx = W / 2 + (X * C.r[0] + Y * C.r[1] + Z * C.r[2]) / zc * k2, sy = H / 2 - (X * C.u[0] + Y * C.u[1] + Z * C.u[2]) / zc / B.VW.tanY * (H / 2);
          if (Math.abs(sx - FT[0]) <= 0.18 * sp) low = Math.max(low, sy);
        }
        const air = FT[1] - low; n++;
        if (air > max) { max = air; at = `${cs} ${size} ${seed} t ${sim.t.toFixed(2)}`; }
        if (air > 1) over++;
      }
    }
  }
  console.log(`# perched frames: ${n}; over 1 px of air under the feet ${over}; most ${max.toFixed(2)} px (${at})`);
  assert.ok(n > 1000, 'too few perched frames');
  assert.equal(over, 0, `${over} perched frames with over 1 px of air under the feet (most ${max.toFixed(2)} px, ${at})`);
});
