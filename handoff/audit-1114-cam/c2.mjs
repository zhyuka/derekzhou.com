// the height's spring made C2: its acceleration eased toward the spring's at most J m/s3, and the speed limits approached
// smoothly (the acceleration toward them shrinks over 0.5 s of travel); pushes, acceleration steps, lag behind the target
import { makeSim } from './sim.mjs';
const J = +(process.argv[2] || 1.5), seeds = (process.argv[3] || '1,2,3').split(',').map(Number), T = +(process.argv[4] || 200);
const C2 = [[
  '    var yT = heightTarget(V, t), w = VY_W, acc = clamp(w * w * (yT - CS.y) - 2 * w * CS.vy, -VY_ACC, yT > CS.y ? VY_ACCU : VY_ACC);\n    CS.vy = clamp(CS.vy + acc * dt, -VY_DN, VY_UP);',
  '    var yT = heightTarget(V, t), w = VY_W, acc = clamp(w * w * (yT - CS.y) - 2 * w * CS.vy, -VY_ACC, yT > CS.y ? VY_ACCU : VY_ACC);\n    acc = clamp(acc, (-VY_DN - CS.vy) / 0.5, (VY_UP - CS.vy) / 0.5); CS.ay = (CS.ay || 0) + clamp(acc - (CS.ay || 0), -' + J + ' * dt, ' + J + ' * dt); acc = CS.ay;\n    CS.vy = clamp(CS.vy + acc * dt, -VY_DN, VY_UP);']];
for (const mode of ['main', 'c2']) for (const seed of seeds) {
  const S = makeSim({ world: './asm/src/world.js', seed, patch: mode === 'c2' ? C2 : [] });
  let pv = null, pa = null, steps = 0, jmax = 0, lag = 0;
  for (let k = 0; k < T * 60; k++) {
    S.stepOnce(); const { CS } = S.st();
    if (pv !== null) { const a = (CS.vy - pv) * 60; if (pa !== null && k > 300) { const j = Math.abs(a - pa) * 60; if (j > jmax) jmax = j; if (Math.abs(a - pa) > 0.05) steps++; } pa = a; }
    pv = CS.vy; if (k > 300) lag = Math.max(lag, S.heightTarget() - CS.y);
  }
  console.log(JSON.stringify({ mode, seed, fixG: S.SIM.fixG, fixO: S.SIM.fixO, accelStepsOver0_05: steps, jerkMax: +jmax.toFixed(2), worstBelowTarget: +lag.toFixed(1) }));
}
