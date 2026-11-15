// the release: a drag that ends at rest (smoothstep profile, or a hold of H s), then let go: how far the view turns on by itself
import { makeSim } from './sim.mjs';
import { FIX_DRAG } from './fixdrag.mjs';
const DEGR = 180 / Math.PI;
function run(A, D, hold, fix) {
  const S = makeSim({ world: fix ? './asmfix/src/world.js' : './asm/src/world.js', seed: 1, obstOpts: { mesas: false, stones: false } });
  const G = (Math.PI / 2) / 1440, px = A / DEGR / G, hz = 60; let fp = 0, yawAtRelease = null, yaw0 = null, yawEnd = 0;
  for (let f = 0; f < hz * 6; f++) {
    const ts = f / hz;
    if (ts >= 1 && ts < 1 + D + hold) { if (!S.INP.down) { S.INP.down = true; fp = 0; } const s = Math.min(1, (ts - 1) / D), fx = px * s * s * (3 - 2 * s); S.INP.dx += fx - fp; fp = fx; }
    else if (S.INP.down) { S.release(); }
    S.frame(f ? 1 / hz : 0);
    const { CS } = S.st();
    if (ts < 1) yaw0 = CS.yawV;
    if (ts < 1 + D + hold) yawAtRelease = CS.yawV;
    yawEnd = CS.yawV;
  }
  return { dragDeg: A, overS: D, heldS: hold, fingerTurnedDeg: +((yawAtRelease - yaw0) * DEGR).toFixed(2), runOnAfterStopDeg: +((yawEnd - yawAtRelease) * DEGR).toFixed(2) };
}
for (const fix of [false, true]) for (const [A, D, h] of [[10, 0.3, 0], [10, 0.3, 0.034], [10, 0.3, 0.05], [10, 0.3, 0.1], [45, 0.6, 0], [45, 0.6, 0.05], [90, 1.0, 0]]) console.log(fix ? 'fix ' : 'main', JSON.stringify(run(A, D, h, fix)));
