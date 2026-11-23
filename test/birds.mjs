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

const N = +(process.env.BIRDS_N || 4), SIZES = ['960x600', '390x844'];
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
      if (b.st in FLY && was && was.st in FLY && !(b.F && (b.F.far || b.F.off || b.F.spk))) {
        const rate = Math.abs(wrap(b.psi - was.psi)) / DT, may = G * Math.tan(Math.max(Math.abs(b.phi), Math.abs(was.phi))) / Math.max(Math.min(b.V, was.V), 3);
        if (rate > may * 1.05 + 0.02) { bad.turn++; bad.turnWorst = Math.max(bad.turnWorst, rate - may); }
      }
      if (!was && sim.t - t0 > DT && sim.clicks === clicks) seen(b, 'popIn');   // (a click's bird is made where it is clicked: the owner's)
      /* never under the land and 15 m (but into the sea of cloud, going down into it) */
      if (b.st in FLY) { const g = groundAt(b.p[0], b.p[2]), under = g + 12 - b.p[1]; if (under > 0 && !(seaW(b.p[0], b.p[2]) && b.F && b.F.goal && b.F.goal.k === 'sink')) { bad.low++; bad.lowWorst = Math.max(bad.lowWorst, under + 12); } }
      /* never first seen coming out from under the land or the cloud: hidden, then out over the top that hid it while
         within sight (the 18 m under it that counts as hidden is a margin, not the cloud's edge) */
      const hid = B.hidden(b);
      if (hid) wasHidden.set(b, true); else if (wasHidden.get(b) && b.p[1] - b.sz > B.hideTop(b.p[0], b.p[2])) { if (px(b) >= 0.5) bad.rise++; wasHidden.set(b, false); }
      now.set(b, { st: b.st, psi: b.psi, phi: b.phi, V: b.V });
    }
    for (const [b] of last) if (!now.has(b)) seen(b, 'popOut');
    last.clear(); for (const [b, v] of now) last.set(b, v);
    maxPop = Math.max(maxPop, B.BIRDS.length); maxFlocks = Math.max(maxFlocks, B.FLOCKS.length); clicks = sim.clicks;
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
function landTest(title, name, by, kind, lateBar = 1 / 6) {
  const R = landCase(name, by, kind);
  report(title, R.rows, 1);
  console.log(`#   median ${fmt(R.med)}, not down by ${2 * by} s: ${(100 * R.late).toFixed(0)} %, scenes breaking a rule: ${R.hard}`);
  assert.ok(R.med <= 1.25 * by, `median ${fmt(R.med)} over ${1.25 * by} s`);
  assert.ok(R.late <= lateBar + 1e-9, `${(100 * R.late).toFixed(0)} % not down by ${2 * by} s`);
  assert.equal(R.hard, 0, 'a scene broke a rule (in view, feet, turns, unseen births)');
}

test('a gull sent to a letter is down by 15 s', () => landTest('perch: down by 15 s', 'perch', 15));
// (a 6.5 m/s tail wind on a 12 m/s camera leaves a bird keeping pace near its slowest airspeed: some cannot)
test('a gull lands in the page\'s wind along the camera\'s way (5586a97 landed none)', () => landTest('gale: down by 15 s, 6.5 m/s head or tail', 'gale', 15, undefined, 1 / 3));
test('a flock\'s droppers are down by 20 s', () => landTest('drop: droppers down by 20 s', 'drop', 20));
test('a gull rides the moving pointer by 10 s', () => landTest('cursor: on the moving tip by 10 s', 'cursor', 10, 'pointer'));
test('a gull comes to the moving pointer in the page\'s wind along the camera\'s way', () => landTest('gale cursor: on the tip by 10 s, 6.5 m/s head or tail', 'galeCursor', 10, 'pointer', 1 / 3));
test('a flock sent down into the sea of cloud is hidden in it, then taken out', () => {
  const gone = [];
  const rows = cases('sink', (p) => {
    const w = invariants(p), out = p.tracks.every((tr) => !p.sim.B.BIRDS.some((b) => tr.length && b.id === tr[0].id));
    const t = Math.max(...p.tracks.map((tr) => (tr.length ? tr[tr.length - 1].t : 0))) - p.t0; if (out) gone.push(t);
    if (!out) w.push('still in the world at the end');
    return { ok: !w.length, why: w.join('; ') };
  });
  gone.sort((a, b) => a - b);
  report('sink: into the cloud and out of the world', rows, 1);
  console.log(`#   taken out after a median ${fmt(gone[gone.length >> 1] ?? Infinity)}`);
  assert.ok(rows.every((r) => r.ok), 'a scene broke a rule or kept its flock');
});
test('a bird sent into the cloud keeps over it: never under the land, never out again in sight', () => {
  for (const seed of [7, 12]) { const p = play('sinkLong', '960x600', seed), w = invariants(p); assert.equal(w.join('; '), '', `sink seed ${seed}`); }
});
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
  let T = 0, steps = 0, hops = 0, comfort = 0, small = 0, sweep = 0, edgeOn = 0;
  const rows = cases('life', (p) => {
    let prev = null;
    for (const q of p.tracks[0]) {
      if (q.st === 'perch' && !q.leaving && prev && prev.st === 'perch' && !prev.leaving) {
        T += q.t - prev.t; if (q.act) comfort += q.t - prev.t;
        if (q.yawTo !== prev.yawTo) { if (q.hopTurn) { hops++; if (Math.abs(q.yawTo - prev.yaw) < 90) small++; } else steps++; }
        if (q.yaw !== prev.yaw && q.yaw !== q.yawTo) sweep++;
        if (Math.abs(q.yaw) < 60 || Math.abs(q.yaw) > 125) edgeOn++;   // (a profile always: from in front or behind its form is a thin tent)
      }
      prev = q;
    }
    return { ok: true, why: '' };
  });
  const st = T / Math.max(steps, 1), hp = T / Math.max(hops, 1), cf = comfort / Math.max(T, 1e-9);
  console.log(`# life: ${(T / 60).toFixed(0)} perched minutes over ${rows.length} scenes: a step turn every ${st.toFixed(1)} s (5-20), a hop-turn every ${hp.toFixed(1)} s (15-90; ${small} under 90 deg), comfort ${(100 * cf).toFixed(1)} % (<= 10), ${sweep} sweeps, ${edgeOn} steps seen end-on`);
  assert.ok(st >= 5 && st <= 20, 'step turns every ' + st.toFixed(1) + ' s');
  assert.ok(hp >= 15 && hp <= 90, 'hop-turns every ' + hp.toFixed(1) + ' s');
  assert.equal(small, 0, 'hop-turns under 90 deg');
  assert.ok(cf <= 0.1, 'comfort ' + (100 * cf).toFixed(1) + ' %');
  assert.equal(sweep, 0, 'a turn swept, not stepped');
  assert.equal(edgeOn, 0, 'a perched bird seen from in front or behind');
});
/* the step and the draw make no objects in steady state (no array, object, closure or store a frame): the world flown
   and drawn on the sim's GL stub for 300 s, then 30 s with V8's sampling heap profiler, the collected objects counted
   too. What a birth, a goal, a landing or a perched bird's act makes is the event's, not a frame's, and is left out;
   V8's boxed numbers (16 B or less each) are reported, not barred. The count is the mean of three runs (seeds 2, 3 and 4):
   the profiler samples, so one run of the same code reads 0.45-0.52 against a 0.5 bar (the hub, 2026-11-21: a single
   run that flaps across its bar is a flaky test). The 300 s are V8's to settle: after 100 s its compiler is still
   re-optimizing (code and feedback it makes, counted against whatever bird code runs then), and that churn read
   0.40-0.57, growing with the code, where the birds' own read 0.10-0.15 once it has settled (2026-11-21). And no bird's
   wing history grows without end */
const EVENT = /^(newBird|newFlock|newGoal|nextGoal|drawRec|make|startApproach|touchDown|leave|toAir|clickBird|recruit|addFar|splitOff|soloFlock|endPlace|pickLedge|perchRec|gateFor|relead|grow|drawBeats|slotsOf|perchWhat|flockWhat|placeWing|makeRoom|jab|goRound|giveUp|leavingStep|notice|noticePointer|touchGeom|gmean|nameLedges|ledges|bootRing|seed|dropBird|dropFlock|homeStep|joinStep|perchedStep)$/;
test('the step and the draw make no objects a frame; wing histories stay short', async () => {
  const { Session } = await import('node:inspector/promises');
  const s = new Session(); s.connect();
  let objs = 0, objB = 0, nums = 0, steps = 0, worstWing = 0;
  const where = new Map();
  for (const seed of [2, 3, 4]) for (const [name, size] of [['life', '960x600'], ['natural', '390x844']]) {
    const sc = SCENES[name](seed, size); sc.opt.draw = {}; const sim = makeSim(sc.opt); sc.setup(sim);
    sim.run(300);
    await s.post('HeapProfiler.startSampling', { samplingInterval: 8, includeObjectsCollectedByMajorGC: true, includeObjectsCollectedByMinorGC: true });
    sim.run(30); steps += Math.round(30 / DT);
    const { profile } = await s.post('HeapProfiler.stopSampling'), info = new Map();
    (function walk(node, path, ev, mine) {
      const f = node.callFrame, e = ev || EVENT.test(f.functionName), m = mine || /inkbirds|birdwing|labbird|facet|wingmodel|model\.js/.test(f.url || ''), p = path + ' > ' + f.functionName;
      info.set(node.id, { e, m, p }); for (const c of node.children) walk(c, p, e, m);
    })(profile.head, '', false, false);
    for (const q of profile.samples) {
      const n = info.get(q.nodeId); if (!n || !n.m || n.e) continue;
      if (q.size <= 16) { nums++; continue; }
      objs++; objB += q.size; const k = n.p.split(' > ').slice(-3).join(' > '); where.set(k, (where.get(k) || 0) + 1);
    }
    for (const b of sim.B.BIRDS) { const w = b.w.wing; worstWing = Math.max(worstWing, w.nk / 400, w.BO.length / 120, w.nbt / 300); }
  }
  s.disconnect();
  const per = objs / steps, top = [...where].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k, v]) => `${v} ${k}`).join('; ');
  console.log(`# allocation: ${per.toFixed(2)} objects a step (the mean of 3 runs) (${(objB / steps).toFixed(0)} B; bar 0.5), ${(nums / steps).toFixed(0)} boxed numbers a step; the longest wing history ${(100 * worstWing).toFixed(0)} % of its bar` + (top ? `\n#   most: ${top}` : ''));
  assert.ok(per < 0.5, `${per.toFixed(2)} objects made a step: ${top}`);
  assert.ok(worstWing <= 1, 'a wing history grew past its bar');
});

/* the birds' share of a frame: the step and the draw (on the GL stub) at the page's 1/60 s, in the world left to
   itself, printed against the phone's 1 ms (a desktop core's time x 4 models the slowest phone the tools have: 0.25 ms
   here; alone 0.06-0.1 ms, 0.2 ms with the other checks on the same cores). The bar, 0.5 ms, fails a regression the
   size of the contextified sandbox's (every global read some 60 times slower: the sim now runs on a plain global, as
   the page does), never a busy runner */
test('the birds take well under a millisecond of a slow phone\'s frame', () => {
  const F = [];
  for (const [size, seed] of [['390x844', 1], ['390x844', 2], ['390x844', 3], ['960x600', 1]]) {
    const sc = SCENES.natural(seed, size); sc.opt.dt = 1 / 60; sc.opt.draw = {}; const sim = makeSim(sc.opt); sc.setup(sim);
    sim.run(20);
    for (let i = 0; i < 3000; i++) { const a = performance.now(); sim.step(); F.push(performance.now() - a); }
  }
  const mean = F.reduce((x, y) => x + y, 0) / F.length, p99 = [...F].sort((x, y) => x - y)[Math.floor(0.99 * (F.length - 1))];
  console.log(`# cost: ${mean.toFixed(3)} ms a frame (bar 0.5; the phone's 1 ms is 0.25; x 4 on a slow phone: ${(4 * mean).toFixed(2)} ms), p99 ${p99.toFixed(3)} ms`);
  assert.ok(mean < 0.5, `the birds took ${mean.toFixed(3)} ms a frame`);
});

/* (the owner, 2026-11-13: "there shouldnt be any limit") every click that is not a drag and not on a link lets a bird
   go: 300 at once make 300 birds. And 1,000 at once: the work a frame is barred (it does not ride on a busy runner's
   clock): at most half the drawn birds and 20 posed in full (the specks held between), under 400 stepped in full (the
   unseen and the specks stepped coarsely; main uncapped: every drawn bird posed, ~900 stepped); the clock's ms printed
   against the slow phone's 1 ms (posing on the GPU is what would bring 1,000 under it: the follow-up) */
test('every click lets a bird go: no limit on them', () => {
  const sc = SCENES.natural(1, '390x844'); sc.opt.dt = 1 / 60; sc.opt.draw = {};
  sc.opt.clicks = Array.from({ length: 300 }, (_, i) => ({ t: 20, x: 195 + (i % 7) - 3, y: 300 + (i % 5) - 2 }));
  const sim = makeSim(sc.opt); sc.setup(sim);
  while (sim.t < 19.9) sim.step();
  const n0 = sim.B.BIRDS.length; sim.run(0.5);
  console.log(`# clicks: 300 at once, ${sim.B.BIRDS.length - n0} birds more`);
  assert.equal(sim.clicks, 300);
  assert.ok(sim.B.BIRDS.length - n0 >= 300, `300 clicks let ${sim.B.BIRDS.length - n0} birds go`);
});
test('1,000 clicked birds: the work a frame stays that of the birds one can see (and its cost printed)', () => {
  const sc = SCENES.natural(1, '390x844'); sc.opt.dt = 1 / 60; sc.opt.draw = {};
  sc.opt.clicks = Array.from({ length: 1000 }, (_, i) => ({ t: 20, x: 195 + (i % 7) - 3, y: 300 + (i % 5) - 2 }));
  const sim = makeSim(sc.opt); sc.setup(sim);
  while (sim.t < 50) sim.step();
  let F = 0, n = 0, steps = 0, poses = 0, drawn = 0, k = 0;
  while (sim.t < 170) {
    const a = performance.now(); sim.step(); F += performance.now() - a; n++;
    if (++k % 10) continue;   // (the work counted every 10th frame, outside the clock)
    const B = sim.B; let df = -1;
    for (const f of B.FLOCKS) if (!f.far && !f.off && !f.spk) steps += f.m.length;
    for (const b of B.BIRDS) if (b.s && b.s.seenF > df) df = b.s.seenF;
    for (const b of B.BIRDS) if (b.s && b.s.seenF === df) { drawn++; if (!b.s.hold) poses++; }
  }
  const st = steps / (n / 10), po = poses / (n / 10), dr = drawn / (n / 10);
  console.log(`# 1,000 clicked birds, 30-150 s on: ${(F / n).toFixed(3)} ms a frame (x 4 on a slow phone: ${(4 * F / n).toFixed(2)} ms; its 1 ms is 0.25 here); a frame: ${dr.toFixed(0)} drawn, ${po.toFixed(0)} posed in full, ${st.toFixed(0)} stepped in full; ${sim.B.BIRDS.length} birds awake`);
  assert.ok(po < 0.5 * dr + 20, `${po.toFixed(0)} of ${dr.toFixed(0)} drawn birds posed in full a frame: the specks are posed every frame again`);
  assert.ok(st < 400, `${st.toFixed(0)} birds stepped in full a frame: the unseen and the specks are stepped every frame again`);
});

/* (the owner, 2026-11-13: "if you fly towards those birds ... theyll get back to normal") a flock gone beyond sight is
   kept, asleep, and wakes, the same birds, when the eye comes to it: here one 40 km ahead of a camera flying 120 m/s */
test('a flock beyond sight sleeps, and wakes the same birds when the eye comes to it', () => {
  const sc = SCENES.natural(1, '960x600'); sc.opt.dt = 1 / 60; sc.opt.speed = 120; sc.opt.yaw = 0;
  const sim = makeSim(sc.opt); sc.setup(sim); sim.run(2);
  const C = sim.C, F = sim.B.newFlock(C.pos[0] + 40000 * C.f[0], C.pos[1] + 60, C.pos[2] + 40000 * C.f[2], Math.atan2(-C.f[0], -C.f[2]), sim.B.skyCls(), ['single', 'gull', 1]);
  const b = F.lead; let slept = -1, woke = -1;
  for (let k = 0; k < 60 * 400 && woke < 0; k++) {
    sim.step(); const inn = sim.B.BIRDS.includes(b);
    if (!inn && slept < 0) slept = sim.t; if (inn && slept >= 0) woke = sim.t;
  }
  const d = Math.hypot(b.p[0] - C.pos[0], b.p[2] - C.pos[2]);
  console.log(`# sleep: asleep at ${slept.toFixed(1)} s, awake at ${woke.toFixed(1)} s, ${(d / 1000).toFixed(1)} km off`);
  assert.ok(slept >= 0, 'it never slept'); assert.ok(woke > slept, 'it never woke'); assert.ok(d > 3000, 'it woke within 3 km');
});

/* (the round-6 review) a formation holds together in a side wind: a goose skein, an ibis skein and a crow flock flown
   25 s straight across a 6.5 m/s wind (the dunes' own), each member's distance from its place (its slot on its leader's
   way, the drift about it left out) in spans. A member's wanted way over the ground is its leader's track, not its
   heading through the air: along the heading each member slid upwind at V sin(crab), the goose skein's median 6.9-11.6
   spans */
test('a formation keeps its places in a side wind (median within 1.5 spans)', () => {
  const E = [], by = [];
  for (const [pat, kind, n] of [['skein', 'goose', 9], ['skein', 'ibis', 7], ['loose', 'crow', 8]]) for (let seed = 1; seed <= 3; seed++) {
    const sc = SCENES.perch(seed, '960x600'), WV = [0, 0]; sc.opt.speed = 0; sc.opt.yaw = 0; sc.opt.wind = WV;
    const sim = makeSim(sc.opt); WV[0] = 6.5 * sim.C.r[0]; WV[1] = 6.5 * sim.C.r[2];
    sim.run(0.5);
    const F = sim.flock(sim.ahead(400, 0.1, 60), pat, kind, n, sim.heading()), B = sim.B, e = [];
    const g = B.newGoal(F, 'commute', F.r, B.skyCls()); g.psi = sim.heading(); g.T = 999; g.y = F.lead.p[1];
    sim.run(25, () => {
      if (sim.t < 8 || !B.FLOCKS.includes(F)) return;   // (from 7.5 s in: formed)
      for (const b of F.m) { if (b === F.lead || !b.slot) continue; const sp = F.lead.sz; B.slotAt(F, b, b.slot[0] * sp, b.slot[1] * sp, b.slot[2] * sp);
        e.push(Math.hypot(b.p[0] - B.TP[0], b.p[1] - B.TP[1], b.p[2] - B.TP[2]) / (sp / B.MODEL_K)); }
    });
    e.sort((a, b) => a - b); const med = e[Math.floor(e.length / 2)]; E.push(...e); by.push(`${kind} ${pat} ${seed}: ${med.toFixed(2)}`);
  }
  E.sort((a, b) => a - b); const med = E[Math.floor(E.length / 2)], p90 = E[Math.floor(0.9 * E.length)];
  console.log(`# side wind 6.5 m/s: ${E.length} member samples, place error median ${med.toFixed(2)} spans, p90 ${p90.toFixed(2)} (${by.join('; ')})`);
  assert.ok(E.length > 1000, 'too few samples');
  assert.ok(med <= 1.5, `place error median ${med.toFixed(2)} spans in a side wind`);
  /* and the pull to its place is at most a tenth of its speed however the place lies (by its length: clamped by axis
     it reached 0.1 x sqrt 3, the round-6 review): a member put 50 m off its place on all three axes at once */
  const sc = SCENES.perch(1, '960x600'); sc.opt.speed = 0; sc.opt.yaw = 0; sc.opt.wind = [0, 0];
  const sim = makeSim(sc.opt); sim.run(0.5);
  const F = sim.flock(sim.ahead(400, 0.1, 60), 'skein', 'goose', 5, sim.heading()), B = sim.B; sim.run(5);
  let worst = 0;
  for (const b of F.m) {
    if (b === F.lead) continue;
    const L = F.lead, p0 = [...b.p], sp = L.sz, h = B.slotAt(F, b, b.slot[0] * sp, b.slot[1] * sp, b.slot[2] * sp), V = Math.hypot(L.v[0], L.v[2]);
    const g = h + Math.atan2(Math.sin(Math.atan2(L.v[0], L.v[2]) - L.psi), Math.cos(Math.atan2(L.v[0], L.v[2]) - L.psi));
    b.p[0] = B.TP[0] + 50; b.p[1] = B.TP[1] - 50; b.p[2] = B.TP[2] + 50;   // (far off on every axis: the pull at its clamp)
    const v = B.placeVel(F, b); worst = Math.max(worst, Math.hypot(v[0] - V * Math.sin(g), v[1] - L.v[1], v[2] - V * Math.cos(g)) / b.K.v);
    b.p[0] = p0[0]; b.p[1] = p0[1]; b.p[2] = p0[2];
  }
  console.log(`# the pull to a place 50 m off on every axis: ${worst.toFixed(3)} of the bird's speed (a tenth, its drifting place's heading a little off the nominal one; by axis 0.176)`);
  assert.ok(worst > 0.09 && worst <= 0.11, `a member pulled to its place at ${worst.toFixed(3)} of its speed`);
});

/* (delight 2) the score's read of the birds: WORLD.birds.feed(o) fills the caller's arrays, the nearest flocks first
   and the nearest birds' wings, and changes nothing in the world: two runs, one read every step, end the same */
test('the score\'s bird feed: nearest first, finite, and read only', () => {
  const run = (read) => {
    const sc = SCENES.natural(3, '960x600'); sc.opt.dt = DT; sc.opt.draw = null; sc.opt.sky = 'afterglow';
    const sim = makeSim(sc.opt); if (sc.setup) sc.setup(sim);
    const o = { f: new Float32Array(48), w: new Float32Array(24) }; let reads = 0, flocks = 0, wings = 0;
    for (let k = 0; k < 90 / DT; k++) {
      sim.step(); if (!read || !sim.B) continue;
      sim.feed(o); reads++; flocks += o.n; wings += o.m;
      assert.ok(o.n <= 8 && o.m <= 4 && o.kinds.length > 4, 'the feed\'s counts');
      for (let i = 0; i < o.n; i++) {
        const q = 6 * i; assert.ok(o.f.slice(q, q + 6).every(Number.isFinite), 'a flock slot not finite');
        assert.ok(o.f[q] >= 0 && o.f[q] < o.kinds.length && o.f[q + 5] >= 1, 'a flock\'s kind or count');
        if (i) assert.ok(o.f[q + 1] >= o.f[q - 5] - 1e-3, 'flocks not nearest first');
      }
      for (let i = 0; i < o.m; i++) { const q = 6 * i; assert.ok(o.w.slice(q, q + 6).every(Number.isFinite) && o.w[q] >= 0 && o.w[q] <= 4 && o.w[q + 2] >= 0 && o.w[q + 2] < 1, 'a wing slot'); }
    }
    return { reads, flocks, wings, end: sim.B.BIRDS.map((b) => b.p.join(',')).join(';') };
  };
  const a = run(true), b = run(false);
  console.log(`# feed: ${a.reads} reads, ${(a.flocks / a.reads).toFixed(1)} flocks and ${(a.wings / a.reads).toFixed(1)} wings a read`);
  assert.ok(a.reads > 1000 && a.flocks > a.reads, 'too few reads or flocks');
  assert.equal(a.end, b.end, 'reading the feed changed the world');
});
