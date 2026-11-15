// how often the slip plans: flown straight vs while the view turns (a drag of 90 deg over 3 s)
import { makeSim } from './sim.mjs';
const patch = [['  function slipPlan(V, S) {\n', '  function slipPlan(V, S) {\n    PLANS.n++;\n'], ['  var SIM_DT = 1 / 60;', '  var SIM_DT = 1 / 60; var PLANS = { n: 0 }; API_PLANS = PLANS;']];
const S = makeSim({ world: './asm/src/world.js', seed: 3, obstOpts: { clouds: true }, patch: patch.map(([a, b]) => [a, b.replace('API_PLANS = PLANS;', '')]).concat([['    applyInput: applyInput', '    applyInput: applyInput, plans: function () { return PLANS.n; }']]) });
const G = (Math.PI / 2) / 1440; let fp = 0;
function seg(name, secs, drag) {
  const n0 = S.plans(), t0 = process.hrtime.bigint();
  for (let f = 0; f < secs * 60; f++) {
    if (drag) { if (!S.INP.down) { S.INP.down = true; fp = 0; } const fx = (f / (secs * 60)) * (Math.PI / 2) / G; S.INP.dx += fx - fp; fp = fx; }
    else if (S.INP.down) S.release();
    S.frame(1 / 60);
  }
  const ms = Number(process.hrtime.bigint() - t0) / 1e6;
  console.log(name, 'plans/s', ((S.plans() - n0) / secs).toFixed(1), 'ms/frame', (ms / (secs * 60)).toFixed(3));
}
seg('straight', 20, false); seg('turning (90 deg in 3 s)', 3, true); seg('straight after', 10, false); seg('turning again', 3, true);
