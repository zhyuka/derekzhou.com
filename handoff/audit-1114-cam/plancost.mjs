import { makeSim } from './sim.mjs';
const now = () => Number(process.hrtime.bigint()) / 1e6;
globalThis.__now = now;
const patch = [
  ['  function slipPlan(V, S) {\n    var c0', '  function slipPlan(V, S) { var __t0 = NOW(); slipPlan0(V, S); var __d = NOW() - __t0; PL.n++; PL.ms += __d; if (__d > PL.max) PL.max = __d; PL.spn = Math.max(PL.spn, SPN); }\n  function slipPlan0(V, S) {\n    var c0'],
  ['  var SIM_DT = 1 / 60;', '  var SIM_DT = 1 / 60; var PL = { n: 0, ms: 0, max: 0, spn: 0 };'],
  ['    applyInput: applyInput', '    applyInput: applyInput, pl: function () { var r = { n: PL.n, ms: PL.ms, max: PL.max, spn: PL.spn }; PL.n = 0; PL.ms = 0; PL.max = 0; PL.spn = 0; return r; }'],
  ['  var DEVMODE = false,', '  var NOW = __nowf; var DEVMODE = false,'],
];
// pass the clock into the context
import vm from 'node:vm';
const S = makeSim({ world: './asm/src/world.js', seed: 3, obstOpts: { clouds: true, cloudP: +(process.argv[2] || 0.3), lobes: +(process.argv[3] || 60) }, patch, ctxExtra: { __nowf: now } });
const G = (Math.PI / 2) / 1440; let fp = 0;
function seg(name, secs, drag) {
  S.pl();
  for (let f = 0; f < secs * 60; f++) {
    if (drag) { if (!S.INP.down) { S.INP.down = true; fp = 0; } const fx = (f / (secs * 60)) * (Math.PI / 2) / G; S.INP.dx += fx - fp; fp = fx; }
    else if (S.INP.down) S.release();
    S.frame(1 / 60);
  }
  const r = S.pl();
  console.log(name.padEnd(26), 'plans/s', (r.n / secs).toFixed(1), 'ms/plan', (r.ms / Math.max(r.n, 1)).toFixed(3), 'max ms', r.max.toFixed(2), 'slip ms/s', (r.ms / secs).toFixed(1), 'constraints max', r.spn);
}
seg('straight', 30, false); seg('turning (90 deg in 3 s)', 3, true); seg('straight', 10, false); seg('turning (90 deg in 3 s)', 3, true);
