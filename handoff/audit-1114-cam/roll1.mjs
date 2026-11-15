// the bank after a drag: a look aside of A deg over D s (1440 px window), then let go with the finger stopped; the horizon's roll
import { makeSim } from './sim.mjs';
import { FIX_DRAG } from './fixdrag.mjs';
const DEGR = 180 / Math.PI;
function run(A, D, hold = 0) {
  const S = makeSim({ world: './asm/src/world.js', seed: 1, obstOpts: { mesas: false, stones: false }, patch: FIX_DRAG });
  const G = (Math.PI / 2) / 1440, px = A / DEGR / G, hz = 60;
  let fp = 0, rollMax = 0, tRollMax = 0, rollRateMax = 0, prevRoll = 0, tOver1 = 0, view0 = null, viewEnd = null, psiLagMax = 0;
  for (let f = 0; f < hz * 12; f++) {
    const ts = f / hz;
    if (ts >= 1 && ts < 1 + D + hold) { if (!S.INP.down) { S.INP.down = true; fp = 0; } const s = Math.min(1, (ts - 1) / D), fx = px * s * s * (3 - 2 * s); S.INP.dx += fx - fp; fp = fx; }
    else if (S.INP.down) S.release();
    S.frame(f ? 1 / hz : 0);
    const p = S.pose(S.alpha(), { pos: [0, 0, 0], f: [0, 0, 1], r: [1, 0, 0], u: [0, 1, 0] });
    const { CS } = S.st();
    if (view0 === null) view0 = p.yaw;
    const r = Math.abs(p.roll) * DEGR; if (r > rollMax) { rollMax = r; tRollMax = ts - 1; }
    if (r > 1) tOver1 += 1 / hz;
    rollRateMax = Math.max(rollRateMax, Math.abs(p.roll - prevRoll) * DEGR * hz); prevRoll = p.roll;
    psiLagMax = Math.max(psiLagMax, Math.abs(((CS.yawV - CS.psi + Math.PI) % (2 * Math.PI)) - Math.PI) * DEGR);
    viewEnd = p.yaw;
  }
  return { lookAsideDeg: A, overS: D, rollMaxDeg: +rollMax.toFixed(2), atS: +tRollMax.toFixed(2), rolledOver1degS: +tOver1.toFixed(2), rollRateMaxDegS: +rollRateMax.toFixed(2), headingLagMaxDeg: +psiLagMax.toFixed(1), turnedDeg: +((viewEnd - view0) * DEGR).toFixed(1) };
}
for (const [A, D] of [[3, 0.2], [10, 0.3], [20, 0.4], [45, 0.6], [90, 0.8], [90, 3]]) console.log(JSON.stringify(run(A, D)));
