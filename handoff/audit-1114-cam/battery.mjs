// random drags over many seeds: the hard rule's pushes, the slip's plans a second, its chatter; main against the fix
import { makeSim } from './sim.mjs';
const world = process.argv[2], T = +(process.argv[3] || 240), seeds = (process.argv[4] || '1,2,3,4').split(',').map(Number);
const patch = [['  var SIM_DT = 1 / 60;', '  var SIM_DT = 1 / 60; var PL = { n: 0 };'], ['    applyInput: applyInput', '    applyInput: applyInput, pl: function () { return PL.n; }'], ['  function slipPlan(V, S) {\n', '  function slipPlan(V, S) {\n    PL.n++;\n']];
let tot = { fixG: 0, fixO: 0, plans: 0, secs: 0, flips: 0, turnPlans: 0, turnSecs: 0, minSolid: 1e9 };
for (const seed of seeds) {
  const S = makeSim({ world, seed, obstOpts: { clouds: true, cloudP: 0.2, lobes: 40 }, patch });
  let rs = seed * 7919 + 1; const rnd = () => ((rs = (Math.imul(rs, 1103515245) + 12345) >>> 0) / 4294967296);
  let next = 4 + 6 * rnd(), dur = 0, end = 0, amt = 0, fp = 0, prevA = 0, prevSv = 0, flips = 0, turnPlans = 0, turnSecs = 0;
  const G = (Math.PI / 2) / 1440;
  for (let f = 0; f < T * 60; f++) {
    const t = f / 60;
    if (t >= next && !S.INP.down) { dur = 0.3 + 1.7 * rnd(); amt = (rnd() < 0.5 ? -1 : 1) * (10 + 110 * rnd()) * Math.PI / 180 / G; end = t + dur; fp = 0; S.INP.down = true; next = end + 5 + 10 * rnd(); }
    const p0 = S.pl();
    if (S.INP.down) { if (t < end) { const s = 1 - (end - t) / dur, fx = amt * s * s * (3 - 2 * s); S.INP.dx += fx - fp; fp = fx; } else S.release(); }
    S.frame(1 / 60);
    const { CS } = S.st();
    if (Math.abs(CS.yawRate) > 0.02) { turnPlans += S.pl() - p0; turnSecs += 1 / 60; }
    const a = (CS.sv - prevSv) * 60; if (Math.abs(a) > 0.2 && Math.abs(prevA) > 0.2 && Math.sign(a) !== Math.sign(prevA)) flips++; prevA = a; prevSv = CS.sv;
  }
  tot.fixG += S.SIM.fixG; tot.fixO += S.SIM.fixO; tot.plans += S.pl(); tot.secs += T; tot.flips += flips; tot.turnPlans += turnPlans; tot.turnSecs += turnSecs;
  console.log(JSON.stringify({ seed, fixG: S.SIM.fixG, fixO: S.SIM.fixO, plansPerS: +(S.pl() / T).toFixed(1), plansPerSturning: +(turnPlans / Math.max(turnSecs, 1e-9)).toFixed(1), turningS: +turnSecs.toFixed(1), slipFlipsPerS: +(flips / T).toFixed(2) }));
}
console.log('TOTAL', JSON.stringify({ fixG: tot.fixG, fixO: tot.fixO, plansPerS: +(tot.plans / tot.secs).toFixed(1), plansPerSturning: +(tot.turnPlans / tot.turnSecs).toFixed(1), slipFlipsPerS: +(tot.flips / tot.secs).toFixed(2) }));
