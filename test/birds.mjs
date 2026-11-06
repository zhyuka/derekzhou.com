// birds.mjs: the ink birds' behaviour, measured on the headless sim (tools/birds/sim.mjs) over random scenes
// (test/birds-scenes.mjs: seeds, start ranges and bearings, winds, the camera's turn, both window sizes, pointer
// paths), against numbers from the research (docs/birds-design.md). Each case prints its pass rate and its worst
// scenes, and fails under its bar.
//   node --test test/birds.mjs            CI (validate.yml): 3 scenes a case and size, the long scenes halved (~30 s)
//   BIRDS_N=16 BIRDS_LONG=1 node test/birds.mjs   the full run: the same report, more scenes, full length (~4 min)
//   node test/birds.mjs --svg DIR         also each landing case's paths (perch frame, top and side) as SVG
// A scene that fails names its case, size and seed: `node tools/birds/sim.mjs --case C --size S --seed N` replays it.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { makeSim, svgPaths, DT, groundAt, seaW } from '../tools/birds/sim.mjs';
import { SCENES } from './birds-scenes.mjs';

const N = +(process.env.BIRDS_N || 3), SIZES = ['960x600', '390x844'];
const SVG = process.argv.includes('--svg') ? process.argv[process.argv.indexOf('--svg') + 1] : null;
const G = 9.81, FLY = { fly: 1, appr: 1, round: 1 };
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));

/* every step of a scene: the watched birds' records, and for every bird in the world the invariants (a turn only by
   its bank; added or taken out only where it cannot be seen) */
function play(name, size, seed) {
  const sc = SCENES[name](seed, size), sim = makeSim(sc.opt), tag = sc.setup(sim), t0 = sim.t, tracks = tag.map(() => []);
  const bad = { turn: 0, turnWorst: 0, popIn: 0, popOut: 0, popWorst: 0, low: 0, lowWorst: 0, rise: 0 }, last = new Map(), wasHidden = new Map();
  let clicks = 0;
  let maxPop = 0, maxFlocks = 0;
  sim.run(sc.secs, () => {
    const B = sim.B, now = new Map();
    for (const b of B.BIRDS) {
      const was = last.get(b);
      if (b.st in FLY && was && was.st in FLY && !(b.F && b.F.far)) {
        const rate = Math.abs(wrap(b.psi - was.psi)) / DT, may = G * Math.tan(Math.max(Math.abs(b.phi), Math.abs(was.phi))) / Math.max(Math.min(b.V, was.V), 3);
        if (rate > may * 1.05 + 0.02) { bad.turn++; bad.turnWorst = Math.max(bad.turnWorst, rate - may); }
      }
      if (!was && sim.t - t0 > DT && (B.STATS.clicks || 0) === clicks) seen(b, 'popIn');   // (a click's bird is made where it is clicked: the owner's)
      /* never under the land and 15 m (but into the sea of cloud, going down into it) */
      if (b.st in FLY) { const g = groundAt(b.p[0], b.p[2]), under = g + 12 - b.p[1]; if (under > 0 && !(seaW(b.p[0], b.p[2]) && b.F && b.F.goal && b.F.goal.k === 'sink')) { bad.low++; bad.lowWorst = Math.max(bad.lowWorst, under + 12); } }
      /* never first seen coming out from under the land or the cloud: hidden, then seen while within sight */
      const hid = B.hidden(b); if (wasHidden.get(b) && !hid && px(b) >= 0.5) bad.rise++; wasHidden.set(b, hid);
      now.set(b, { st: b.st, psi: b.psi, phi: b.phi, V: b.V });
    }
    for (const [b] of last) if (!now.has(b)) seen(b, 'popOut');
    last.clear(); for (const [b, v] of now) last.set(b, v);
    maxPop = Math.max(maxPop, B.BIRDS.length); maxFlocks = Math.max(maxFlocks, B.FLOCKS.length); clicks = B.STATS.clicks || 0;
    tag.forEach((b, i) => { if (B.BIRDS.includes(b)) tracks[i].push(sim.rec(b)); });
    if (sc.each) sc.each(sim, tag);
  });
  /* its span on the largest window, through the air between (px) */
  function px(b) { const B = sim.B, L = B.LVC, dx = b.p[0] - L.x, dy = b.p[1] - L.y, dz = b.p[2] - L.z, d = Math.hypot(dx, dy, dz) || 1e-3; return (b.sz / B.MODEL_K) * B.FDEV_MAX / d * B.airT(dx, dy, dz); }
  /* added: only beyond sight (under half a pixel there); taken out: beyond sight, or wholly hidden in the sea of cloud */
  function seen(b, k) { const v = px(b); if (v >= 0.5 && (k === 'popIn' || !sim.B.hidden(b))) { bad[k]++; bad.popWorst = Math.max(bad.popWorst, v); } }
  return { name, size, seed, sim, tracks, bad, maxPop, maxFlocks, t0 };
}

/* a landing's numbers from its track: when it was down; its last stretch in view before it (it must begin 25 m or more
   from the perch, or where the bird began: a bird coming into view near its perch pops in); its feet on the perch */
const inView = (q, sim) => q.z > 0.5 && q.x + q.span / 2 >= 0 && q.x - q.span / 2 <= sim.W && q.y + q.span / 2 >= 0 && q.y - q.span / 2 <= sim.H;   // (any of it on the window)
function landing(tr, sim, kind) {
  const r = { down: Infinity, seenFrom: NaN, slide: 0, slideWorst: 0 };
  const td = tr.findIndex((q) => q.st === 'perch' && (!kind || q.kind === kind));
  if (td >= 0) {
    r.down = tr[td].t;
    let i = td - 1; while (i >= 0 && inView(tr[i], sim)) i--;
    r.seenFrom = i < 0 ? Infinity : (tr[i + 1].rng ?? Infinity);
  }
  for (let i = Math.max(td, 1); td >= 0 && i < tr.length; i++) {
    const q = tr[i], prev = tr[i - 1];
    if (q.st === 'perch' && !q.walking && !q.leaving && prev.st === 'perch' && !prev.walking && !prev.leaving && q.foot && prev.foot) {
      const s = Math.abs((q.x - q.foot[0]) - (prev.x - prev.foot[0]));   // (across: its body stands over its feet; the rest height may settle once)
      if (s > 0.05) { r.slide++; r.slideWorst = Math.max(r.slideWorst, s); }
    }
  }
  return r;
}

function cases(name, check) {
  const out = [];
  for (const size of SIZES) for (let seed = 1; seed <= N; seed++) { const p = play(name, size, seed); out.push({ p, ...check(p) }); }
  return out;
}
function report(title, rows, bar) {
  const pass = rows.filter((r) => r.ok).length, rate = pass / rows.length;
  const worst = rows.filter((r) => !r.ok).slice(0, 5).map((r) => `${r.p.size} seed ${r.p.seed}: ${r.why}`);
  console.log(`# ${title}: ${pass}/${rows.length} (${(100 * rate).toFixed(0)} %)` + (worst.length ? '\n#   ' + worst.join('\n#   ') : ''));
  if (SVG) { fs.mkdirSync(SVG, { recursive: true }); const tr = rows.flatMap((r) => r.p.tracks); fs.writeFileSync(path.join(SVG, title.replace(/\W+/g, '-') + '.svg'), svgPaths(tr.slice(0, 40), title)); }
  return rate;
}
function invariants(p) {
  const b = p.bad, w = [];
  if (b.turn) w.push(`${b.turn} steps turned faster than its bank (worst by ${b.turnWorst.toFixed(2)} rad/s)`);
  if (b.popIn || b.popOut) w.push(`${b.popIn} added, ${b.popOut} taken out where seen (worst ${b.popWorst.toFixed(1)} px)`);
  if (b.low) w.push(`${b.low} bird-steps under the land and 15 m (worst ${b.lowWorst.toFixed(1)} m under)`);
  if (b.rise) w.push(`${b.rise} times a bird came out from under the land or the cloud in sight`);
  return w;
}
const fmt = (x) => (x === Infinity ? 'never' : x.toFixed(1) + ' s');

/* a scene's landings: each watched bird down by `by` s from its setup (the research's number: its share reported),
   in view, feet fixed; and the invariants. CI's guard, steady on a few scenes: every invariant, the median down by
   1.25 `by`, and 5 in 6 down by twice it */
function landCase(name, by, kind) {
  const downs = [];
  const rows = cases(name, (p) => {
    const w = invariants(p), hard = [];
    p.tracks.forEach((tr, i) => {
      const L = landing(tr, p.sim, kind), down = L.down - p.t0; downs.push(down);
      if (!(down <= by)) w.push(`bird ${i} down ${fmt(down)} (by ${by} s)`);
      if (L.seenFrom < 25) hard.push(`bird ${i} came into view only ${L.seenFrom.toFixed(1)} m from its perch`);
      if (L.slide) hard.push(`bird ${i} feet slid ${L.slide} steps (worst ${L.slideWorst.toFixed(2)} px)`);
    });
    return { ok: !w.length && !hard.length, hard: invariants(p).length + hard.length, why: w.concat(hard).join('; ') };
  });
  downs.sort((a, b) => a - b);
  const med = downs[downs.length >> 1], late = downs.filter((d) => !(d <= 2 * by)).length / downs.length;
  return { rows, med, late, hard: rows.filter((r) => r.hard).length, by };
}
function landTest(title, name, by, kind) {
  const R = landCase(name, by, kind);
  report(title, R.rows, 1);
  console.log(`#   median ${fmt(R.med)}, not down by ${2 * by} s: ${(100 * R.late).toFixed(0)} %, scenes breaking a rule: ${R.hard}`);
  assert.ok(R.med <= 1.25 * by, `median ${fmt(R.med)} over ${1.25 * by} s`);
  assert.ok(R.late <= 1 / 6 + 1e-9, `${(100 * R.late).toFixed(0)} % not down by ${2 * by} s`);
  assert.equal(R.hard, 0, 'a scene broke a rule (in view, feet, turns, unseen births)');
}

test('a gull sent to a letter is down by 15 s', () => landTest('perch: down by 15 s', 'perch', 15));
test('a gull lands in the page\'s wind along the camera\'s way (5586a97 landed none)', () => landTest('gale: down by 15 s, 6.5 m/s head or tail', 'gale', 15));
test('a flock\'s droppers are down by 20 s', () => landTest('drop: droppers down by 20 s', 'drop', 20));
test('a gull rides the moving pointer by 10 s', () => landTest('cursor: on the moving tip by 10 s', 'cursor', 10, 'pointer'));
test('a clicked bird lands on a letter', () => landTest('click: down by 23 s from the click (sent at 3 s)', 'click', 23));
test('B17: a bird banks away from a dragged camera\'s way', () => {
  const rows = cases('drag', (p) => {
    const w = invariants(p); let near = Infinity, big = 0;
    const b = p.tracks[0].length && p.sim.B.BIRDS.find((o) => o.id === p.tracks[0][0].id), m = b ? b.sz / p.sim.B.MODEL_K : 3;   // (its span, m)
    for (const q of p.tracks[0]) { near = Math.min(near, q.eye); if (q.z > 0.5 && q.x + q.span / 2 > 0 && q.x - q.span / 2 < p.sim.W && q.y + q.span / 2 > 0 && q.y - q.span / 2 < p.sim.H) big = Math.max(big, q.span / p.sim.W); }
    if (near < 3 * m) w.push(`came within ${near.toFixed(1)} m of the eye (${(near / m).toFixed(1)} spans)`);
    if (big > 0.35) w.push(`filled ${(100 * big).toFixed(0)} % of the window`);
    return { ok: !w.length, why: w.join('; ') };
  });
  assert.ok(report('drag: clear of the eye', rows, 1) >= 1);
});
test('the world left to itself: turns by bank, adds and takes out unseen, stays bounded', () => {
  const rows = cases('natural', (p) => { const w = invariants(p); if (p.maxFlocks > 20 || p.maxPop > 120) w.push(`${p.maxFlocks} flocks, ${p.maxPop} birds`); return { ok: !w.length, why: w.join('; ') }; });
  assert.ok(report('natural: invariants', rows, 1) >= 1);
});
/* perched life (the research: a 10-30 deg step turn every 5-20 s, a hop-turn of 90 deg or more every 15-90 s, comfort
   acts no more than a tenth of the time), over every scene's perched minutes together; each turn a step, never a sweep */
test('a perched bird turns, hops round and preens at the research\'s rates', () => {
  let T = 0, steps = 0, hops = 0, comfort = 0, small = 0, sweep = 0;
  const rows = cases('life', (p) => {
    let prev = null;
    for (const q of p.tracks[0]) {
      if (q.st === 'perch' && !q.leaving && prev && prev.st === 'perch' && !prev.leaving) {
        T += q.t - prev.t; if (q.act) comfort += q.t - prev.t;
        if (q.yawTo !== prev.yawTo) { if (q.hopTurn) { hops++; if (Math.abs(q.yawTo - prev.yaw) < 90) small++; } else steps++; }
        if (q.yaw !== prev.yaw && q.yaw !== q.yawTo) sweep++;
      }
      prev = q;
    }
    return { ok: true, why: '' };
  });
  const st = T / Math.max(steps, 1), hp = T / Math.max(hops, 1), cf = comfort / Math.max(T, 1e-9);
  console.log(`# life: ${(T / 60).toFixed(0)} perched minutes over ${rows.length} scenes: a step turn every ${st.toFixed(1)} s (5-20), a hop-turn every ${hp.toFixed(1)} s (15-90; ${small} under 90 deg), comfort ${(100 * cf).toFixed(1)} % (<= 10), ${sweep} sweeps`);
  assert.ok(st >= 5 && st <= 20, 'step turns every ' + st.toFixed(1) + ' s');
  assert.ok(hp >= 15 && hp <= 90, 'hop-turns every ' + hp.toFixed(1) + ' s');
  assert.equal(small, 0, 'hop-turns under 90 deg');
  assert.ok(cf <= 0.1, 'comfort ' + (100 * cf).toFixed(1) + ' %');
  assert.equal(sweep, 0, 'a turn swept, not stepped');
});
