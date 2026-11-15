// the height's character: time at the climb/descent limits, reversals, clearance over the raw sand, spring vs target
import { makeSim } from './sim.mjs';
for (const seed of [1, 2, 3, 4, 5]) {
  const S = makeSim({ world: './asm/src/world.js', seed });
  let atUp = 0, atDn = 0, rev = 0, lastSign = 0, clr = [], N = 300 * 60, accSat = 0, lag = [];
  for (let k = 0; k < N; k++) {
    S.stepOnce(); const { CS } = S.st();
    if (k < 600) continue;
    if (CS.vy >= 2.6 - 1e-9) atUp++; if (CS.vy <= -2.2 + 1e-9) atDn++;
    const sg = Math.abs(CS.vy) < 0.05 ? lastSign : Math.sign(CS.vy); if (lastSign && sg && sg !== lastSign) rev++; if (sg) lastSign = sg;
    clr.push(CS.y - S.groundAt(CS.x, CS.z, false, true));
    lag.push(S.heightTarget() - CS.y);
  }
  clr.sort((a, b) => a - b); lag.sort((a, b) => a - b);
  const q = (a, p) => a[Math.floor(p * (a.length - 1))].toFixed(1);
  const n = N - 600;
  console.log(JSON.stringify({ seed, atClimbLimitPct: +(100 * atUp / n).toFixed(1), atDescentLimitPct: +(100 * atDn / n).toFixed(1), reversalsPerMin: +(rev / (n / 3600)).toFixed(1), clearOverSand: { p1: q(clr, 0.01), p50: q(clr, 0.5), p99: q(clr, 0.99) }, targetMinusY: { p1: q(lag, 0.01), p50: q(lag, 0.5), p99: q(lag, 0.99) }, fixG: S.SIM.fixG }));
}
