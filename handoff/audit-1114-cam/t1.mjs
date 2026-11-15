import { makeSim } from './sim.mjs';
const S = makeSim({ world: process.argv[2] || './asm/src/world.js', seed: 3 });
const t0 = Date.now();
for (let f = 0; f < 60 * 60; f++) S.frame(1 / 60);
const { CS } = S.st();
console.log('t', S.SIM.t.toFixed(2), 'steps', S.SIM.steps, 'x', CS.x.toFixed(1), 'y', CS.y.toFixed(1), 'z', CS.z.toFixed(1), 'c', CS.c.toFixed(1), 'fixG', S.SIM.fixG, 'fixO', S.SIM.fixO, 'ms', Date.now() - t0);
