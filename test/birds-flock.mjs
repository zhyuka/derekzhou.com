// birds-flock.mjs: how a flock's birds fly together (the hub's flock physics spec, .work/hub/physics/birds.md), measured in
// the headless sim (tools/birds/sim.mjs) with the eye held still and a flock made in view.
//   physics: birds/phase   an ibis or a goose in a skein beats with the bird ahead on its leg in wake bouts at the spatial
//                          phase (doi:10.1038/nature12939, doi:10.1073/pnas.1413589112); directly behind in a line, in antiphase; every other flock free
//   node --test test/birds-flock.mjs        CI (tools/checks/35-birds.sh: a process a test)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeSim } from '../tools/birds/sim.mjs';
import { SCENES } from './birds-scenes.mjs';

/* a flock of n of kind in pattern pat, made 400 m ahead crossing the view, flown straight for secs: each follower's phase to
   the bird it locks to (or, unlocked, to its leader), in its wake bouts (the lock full on) and out of them; the glide share */
function phases(kind, pat, n, secs, seed) {
  const sc = SCENES.natural(seed || 1, '960x600'); sc.opt.dt = 1 / 60; sc.opt.draw = { data: null }; sc.opt.speed = 0; sc.opt.yaw = 0;
  const sim = makeSim(sc.opt); sc.setup(sim);
  for (let k = 0; k < 60; k++) sim.step();
  const B = sim.B, C = sim.C, BW = B.BW, psi0 = Math.atan2(C.f[0], C.f[2]) + Math.PI / 2;
  const F = B.newFlock(C.pos[0] + 400 * C.f[0], C.pos[1] + 20, C.pos[2] + 400 * C.f[2], psi0, 'day', [pat, kind, n]);
  const g = B.newGoal(F, 'commute', F.r, 'day'); g.psi = psi0; g.T = 1e9; g.y = F.lead.p[1]; F.goal = g; F.lead.goal = g;
  const inB = [0, 0, 0], out = [0, 0, 0], ST = {}; let lockN = 0, n1 = 0, fl = 0, all = 0;
  for (let k = 0; k < 60 * secs; k++) {
    sim.step(); assert.ok(!F.out, 'the flock went out');
    for (const b of F.m) {
      const w = b.w && b.w.wing; if (!w || b.st !== 'fly') continue;
      const S = BW.state(w, b.age, ST); all++; if (S.flap > 0.5) fl++;
      if (b === F.lead) continue;
      let s;
      if (w.lead) s = BW.psiAt(w.lead, b.age + w.loff) - w.f * w.lock.d / w.lock.U - BW.psiAt(w, b.age);
      else { const L = F.lead; s = BW.psiAt(L.w.wing, L.age) - BW.psiAt(w, b.age); }
      s -= Math.round(s);
      const on = !!w.lead && S.lock > 0.99; n1++; if (on) lockN++;
      if (!(S.flap > 0.5)) continue;   // (a glide has no beat to keep)
      const a = on ? inB : out; a[0] += Math.cos(2 * Math.PI * s); a[1] += Math.sin(2 * Math.PI * s); a[2]++;
    }
  }
  const st = (a) => ({ mean: Math.atan2(a[1], a[0]) / (2 * Math.PI), R: Math.hypot(a[0], a[1]) / Math.max(1, a[2]), n: a[2] });
  return { inB: st(inB), out: st(out), share: lockN / Math.max(1, n1), glide: 1 - fl / Math.max(1, all) };
}
const show = (k, p) => console.log(`# ${k}: in bouts ${p.inB.mean.toFixed(3)} cycle, R ${p.inB.R.toFixed(2)} (${p.inB.n}); out R ${p.out.R.toFixed(2)}; locked ${(100 * p.share).toFixed(0)} %; gliding ${(100 * p.glide).toFixed(1)} %`);

test('a skein beats in its wake bouts at the spatial phase (ibis and goose: -0.18 cycle, R 0.8, a third of the time)', () => {
  for (const [kind, n] of [['ibis', 5], ['goose', 7]]) {
    const p = phases(kind, 'skein', n, 180); show(`${kind} skein of ${n}`, p);
    assert.ok(Math.abs(p.inB.mean + 0.18) <= 0.05, `${kind}: the spatial phase in bouts is ${p.inB.mean.toFixed(3)} cycle, not -0.18 +- 0.05`);
    assert.ok(p.inB.R >= 0.8, `${kind}: R in bouts ${p.inB.R.toFixed(2)} < 0.8`);
    assert.ok(p.out.R <= 0.3, `${kind}: R out of bouts ${p.out.R.toFixed(2)} > 0.3 (never lockstep)`);
    assert.ok(p.share >= 0.25 && p.share <= 0.4, `${kind}: locked ${(100 * p.share).toFixed(0)} % of the time, not 25-40 %`);
  }
});

test('a line\'s bird directly behind beats in antiphase in its bouts (+0.46 cycle)', () => {
  const p = phases('ibis', 'line', 4, 180); show('ibis line of 4', p);
  assert.ok(Math.abs(p.inB.mean - 0.46) <= 0.06, `the phase in bouts is ${p.inB.mean.toFixed(3)} cycle, not 0.46 +- 0.06`);
  assert.ok(p.inB.n > 1000, 'too few locked frames');
});

test('gulls, loose flocks and pairs beat free (R to their leader at most 0.3 over 60 s)', () => {
  for (const [kind, pat, n] of [['gull', 'line', 4], ['gull', 'cloud', 6], ['crow', 'cloud', 8], ['goose', 'pair', 2]]) {
    const p = phases(kind, pat, n, 60); show(`${kind} ${pat} of ${n}`, p);
    assert.equal(p.inB.n, 0, `${kind} ${pat}: locked`);
    assert.ok(p.out.R <= 0.3, `${kind} ${pat}: R to the leader ${p.out.R.toFixed(2)} > 0.3`);
  }
});

test('an ibis in a skein flies the ibis-in-a-V schedule (gliding a few % of the time, as measured: 3 %)', () => {
  const p = phases('ibis', 'skein', 5, 120); show('ibis skein of 5', p);
  assert.ok(p.glide < 0.1, `an ibis in a skein glides ${(100 * p.glide).toFixed(1)} % of the time`);
});

/* physics: birds/glides. A flock made in view and flown 120 s, level or with its way 200 m down: the share of its birds'
   flying time gliding; and each glide its leader is sent into, its followers' starts against their lag (distance back over
   speed, and their reaction): a glide begins at a beat's end, so to within a beat */
function glides(kind, pat, n, down) {
  const sc = SCENES.natural(1, '960x600'); sc.opt.dt = 1 / 60; sc.opt.draw = { data: null }; sc.opt.speed = 0; sc.opt.yaw = 0;
  const sim = makeSim(sc.opt); sc.setup(sim);
  for (let k = 0; k < 60; k++) sim.step();
  const B = sim.B, C = sim.C, BW = B.BW, psi0 = Math.atan2(C.f[0], C.f[2]) + Math.PI / 2;
  const F = B.newFlock(C.pos[0] + 400 * C.f[0], C.pos[1] + 60 + down, C.pos[2] + 400 * C.f[2], psi0, 'day', [pat, kind, n]);
  const g = B.newGoal(F, 'commute', F.r, 'day'); g.psi = psi0; g.T = 1e9; g.y = F.lead.p[1] - down; F.goal = g; F.lead.goal = g;
  const ST = {}, req = new Map(), prev = new Map(), g0 = BW.glide; let fl = 0, all = 0, LS = -1; const err = [];
  BW.glide = (w, age, dur) => { req.set(w, sim.t); return g0(w, age, dur); };
  try {
    for (let k = 0; k < 60 * 120; k++) {
      sim.step(); assert.ok(!F.out, 'the flock went out');
      for (const b of F.m) {
        const w = b.w && b.w.wing; if (!w || b.st !== 'fly') continue;
        const f = BW.state(w, b.age, ST).flap > 0.5, was = prev.get(b); prev.set(b, f); all++; if (f) fl++;
        if (was && !f && req.has(w)) { req.delete(w); if (b === F.lead) LS = sim.t; else if (LS >= 0) err.push(Math.abs(sim.t - LS - (Math.max(0, b.slot[0] * F.lead.sz) / Math.max(F.lead.V, 3) + b.lat))); }
      }
    }
  } finally { BW.glide = g0; }
  err.sort((a, b) => a - b);
  return { glide: 1 - fl / Math.max(1, all), med: err.length ? err[err.length >> 1] : NaN, n: err.length };
}

test('every kind glides more going down than level (geese and herons too: the owner, 2026-11-04)', () => {
  for (const [kind, pat, n] of [['goose', 'skein', 5], ['heron', 'single', 1], ['ibis', 'skein', 5], ['gull', 'cloud', 5], ['crow', 'cloud', 6]]) {
    const lv = glides(kind, pat, n, 0), dn = glides(kind, pat, n, 200);
    console.log(`# ${kind}: gliding ${(100 * lv.glide).toFixed(1)} % level, ${(100 * dn.glide).toFixed(1)} % going down`);
    assert.ok(dn.glide > lv.glide + 0.02, `${kind}: glides ${(100 * dn.glide).toFixed(1)} % going down against ${(100 * lv.glide).toFixed(1)} % level`);
  }
});

test('a skein glides in turn after its leader, each bird as it reaches where its leader began (median within 0.15 s)', () => {
  for (const [kind, n] of [['goose', 7], ['ibis', 5]]) {
    const p = glides(kind, 'skein', n, 200);
    console.log(`# ${kind} skein: ${p.n} follower glides, their start off their lag by ${p.med.toFixed(3)} s (median)`);
    assert.ok(p.n >= 10, `${kind}: only ${p.n} follower glides`);
    assert.ok(p.med <= 0.15, `${kind}: followers' glides off their lag by ${p.med.toFixed(3)} s (median)`);
  }
});
