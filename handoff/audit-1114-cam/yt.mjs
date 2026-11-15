// the height target's jumps: per step |dyT|; split by whether the camera's grid landed this step
import { makeSim } from './sim.mjs';
const seeds = (process.argv[2] || '1,2').split(',').map(Number), T = +(process.argv[3] || 200);
for (const seed of seeds) {
  const S = makeSim({ world: './asm/src/world.js', seed, obstOpts: { stones: true } });
  let g = 0, prev = null, land = [], other = [], acc = [], prevVy = 0;
  for (let k = 0; k < T * 60; k++) {
    S.stepOnce(); const yT = S.heightTarget(), gl = S.GROUND.gen2 !== g; g = S.GROUND.gen2;
    if (prev !== null && k > 300) (gl ? land : other).push(Math.abs(yT - prev));
    prev = yT;
  }
  const s = (a) => { a.sort((x, y) => x - y); return { n: a.length, p50: +a[Math.floor(a.length * 0.5)].toFixed(3), p99: +a[Math.floor(a.length * 0.99)].toFixed(2), max: +a[a.length - 1].toFixed(2), over1m: a.filter((x) => x > 1).length }; };
  console.log(JSON.stringify({ seed, atGridLanding: s(land), otherSteps: s(other) }));
}
