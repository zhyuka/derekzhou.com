// birds-scenes.mjs: the scenes test/birds.mjs runs on the headless sim (tools/birds/sim.mjs), each made from a seed:
// where the bird starts (range, side, height, heading), the wind, the camera's speed and turn, the pointer's path.
// A scene is { opt (makeSim's), setup(sim) -> the birds it watches, secs, at (when its clock starts) }.
const D2R = Math.PI / 180, LONG = !!process.env.BIRDS_LONG;   // (BIRDS_LONG: the world's and the perch's long scenes at full length)
function rand(seed) { let a = (seed * 0x9e3779b9) >>> 0; return () => { a = (a + 0x6d2b79f5) | 0; let q = Math.imul(a ^ (a >>> 15), 1 | a); q = (q + Math.imul(q ^ (q >>> 7), 61 | q)) ^ q; return ((q ^ (q >>> 14)) >>> 0) / 4294967296; }; }
const mix = (r, a, b) => a + (b - a) * r();
/* the world round it: a wind up to 7 m/s from anywhere, the camera at 9-14 m/s turning up to 3 deg/s */
function air(r, size) {
  const w = mix(r, 0, 7), wa = mix(r, 0, 2 * Math.PI);
  return { size, seed: 1 + Math.floor(r() * 1e6), speed: mix(r, 9, 14), wind: [w * Math.sin(wa), w * Math.cos(wa)], yaw: mix(r, -3, 3) };
}
const side = (r) => (r() < 0.5 ? -1 : 1);

export const SCENES = {
  /* one gull beside the camera's way, sent to a letter: down by 15 s */
  perch: (seed, size) => {
    const r = rand(seed), opt = air(r, size);
    const d = mix(r, 30, 90), xs = side(r) * mix(r, 0.5, 1.4), up = mix(r, 2, 14), dh = mix(r, -25, 25) * D2R;
    return { opt, secs: 30, setup: (sim) => { sim.run(0.5); const F = sim.flock(sim.ahead(d, xs, up), 'single', 'gull', 1, sim.heading() + dh); sim.land(F.lead, 0); return [F.lead]; } };
  },
  /* a loose flock of 5 beside the camera's way, flying its way; 1-3 drop out to the letters: each down by 20 s */
  drop: (seed, size) => {
    const r = rand(seed), opt = air(r, size);
    const d = mix(r, 40, 90), xs = side(r) * mix(r, 0.7, 1.4), up = mix(r, 4, 16), n = 1 + Math.floor(r() * 3), gaps = [0.5, mix(r, 1, 2.5), mix(r, 2.5, 4)];
    return { opt, secs: 30, setup: (sim) => {
      sim.run(0.5); const F = sim.flock(sim.ahead(d, xs, up), 'loose', 'gull', 5);
      const g = sim.B.newGoal(F, 'commute', F.r, sim.B.skyCls()); g.psi = sim.heading(); g.T = 999;
      return F.m.slice(1, 1 + n).filter((b, i) => sim.land(b, gaps[i]));   // (one given no free ledge is not sent, as in the page)
    } };
  },
  /* a gull down on a letter, kept there (its own wish to leave put off), its life watched for 4 minutes (CI: 2) */
  life: (seed, size) => {
    const sc = SCENES.perch(seed, size);
    return { opt: sc.opt, secs: LONG ? 240 : 120, setup: sc.setup, each: (sim, [b]) => { if (b.st === 'perch' && b.P && !b.P.kept) { b.P.stay = Infinity; b.P.kept = true; } } };
  },
  /* the pointer resting, then moving at 28 px/s: a gull comes to its tip and rides it, by 10 s */
  cursor: (seed, size) => {
    const r = rand(seed), opt = air(r, size), Z = size === '390x844' ? [390, 844] : [960, 600];
    const x0 = mix(r, 0.3, 0.8) * Z[0], y0 = mix(r, 0.15, 0.4) * Z[1], a = mix(r, 0, 2 * Math.PI), go = mix(r, 1, 3);
    opt.pointer = (t) => { const k = Math.max(0, t - go) * 28; return { x: Math.min(Z[0] - 40, Math.max(40, x0 + k * Math.cos(a))), y: Math.min(Z[1] - 40, Math.max(40, y0 + k * Math.sin(a))) }; };
    const d = mix(r, 35, 80), xs = side(r) * mix(r, 0.5, 1.2), up = mix(r, 4, 14);
    return { opt, secs: 20, setup: (sim) => { sim.run(0.5); const F = sim.flock(sim.ahead(d, xs, up), 'single', 'gull', 1); sim.B.PW.ptrNext = 0; return [F.lead]; } };
  },
  /* a click on the sky: its bird, sent to a letter at 3 s: down by 20 s from then */
  click: (seed, size) => {
    const r = rand(seed), opt = air(r, size), Z = size === '390x844' ? [390, 844] : [960, 600];
    opt.clicks = [{ t: 0.3, x: mix(r, 0.15, 0.85) * Z[0], y: mix(r, 0.1, 0.4) * Z[1] }];
    return { opt, secs: 26, setup: (sim) => { sim.run(0.5); const b = sim.B.BIRDS[sim.B.BIRDS.length - 1]; sim.run(2.5); sim.land(b, 0); return [b]; } };
  },
  /* B17: a gull 60-120 m ahead, near the camera's line, flying at it, while a drag swings the view onto it */
  drag: (seed, size) => {
    const r = rand(seed), opt = air(r, size), off = side(r) * mix(r, 0.04, 0.2);
    opt.wind = [0, 0]; opt.yaw = 0; opt.drag = { t0: 1, t1: mix(r, 2, 4), rate: -Math.sign(off) * mix(r, 3, 25) };
    const d = mix(r, 60, 120), up = mix(r, -2, 6);
    return { opt, secs: 14, setup: (sim) => { sim.run(0.5); const F = sim.flock(sim.ahead(d, off, up), 'single', 'gull', 1, sim.heading() + Math.PI);
      const g = sim.B.newGoal(F, 'commute', F.r, sim.B.skyCls()); g.psi = sim.heading() + Math.PI; g.T = 999; return [F.lead]; } };
  },
  /* the world left to itself: what it adds and takes out, how its birds turn */
  natural: (seed, size) => {
    const r = rand(seed), opt = air(r, size);
    return { opt, secs: LONG ? 180 : 90, setup: () => [] };
  },
};
