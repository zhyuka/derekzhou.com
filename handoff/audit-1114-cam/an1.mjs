// per-step derivatives of the camera, flown alone (no input), several seeds
import { makeSim } from './sim.mjs';
const world = process.argv[2] || './asm/src/world.js', T = +(process.argv[3] || 600), seeds = (process.argv[4] || '1,2,3').split(',').map(Number);
const DT = 1 / 60;
for (const seed of seeds) {
  const S = makeSim({ world, seed, obstOpts: { clouds: true } });
  const N = Math.round(T / DT), y = new Float64Array(N), lat = new Float64Array(N), x = new Float64Array(N), z = new Float64Array(N), sv = new Float64Array(N), roll = new Float64Array(N), yt = new Float64Array(N), vy = new Float64Array(N);
  let psi0 = null;
  for (let k = 0; k < N; k++) {
    S.stepOnce(); const { CS } = S.st();
    if (psi0 === null) psi0 = CS.psi;
    x[k] = CS.x; z[k] = CS.z; y[k] = CS.y; sv[k] = CS.sv; roll[k] = CS.roll; vy[k] = CS.vy;
    lat[k] = -Math.cos(psi0) * CS.x + Math.sin(psi0) * CS.z;   // m to the right of the first heading
  }
  const d = (a) => { const o = new Float64Array(a.length - 1); for (let i = 0; i < o.length; i++) o[i] = (a[i + 1] - a[i]) / DT; return o; };
  const vyv = d(y), ay = d(vyv), jy = d(ay), vl = d(lat), al = d(vl), jl = d(al);
  const stat = (a, from = 120) => { let mx = 0, s = 0, n = 0, big = 0; for (let i = from; i < a.length; i++) { const v = Math.abs(a[i]); if (v > mx) mx = v; s += v * v; n++; } return { max: +mx.toFixed(3), rms: +Math.sqrt(s / n).toFixed(4) }; };
  const count = (a, th, from = 120) => { let c = 0; for (let i = from; i < a.length; i++) if (Math.abs(a[i]) > th) c++; return c; };
  // acceleration steps: |a[k+1]-a[k]| over 0.05 m/s2 in one step
  const steps = (a, th) => { let c = 0; for (let i = 120; i < a.length - 1; i++) if (Math.abs(a[i + 1] - a[i]) > th) c++; return c; };
  console.log(JSON.stringify({ seed, T, fixG: S.SIM.fixG, fixO: S.SIM.fixO,
    vy: stat(vyv), ay: stat(ay), jerkY: stat(jy), ayJumpsOver0_05: steps(ay, 0.05), ayJumpsOver0_2: steps(ay, 0.2),
    vlat: stat(vl), alat: stat(al), jerkLat: stat(jl), alJumpsOver0_05: steps(al, 0.05), alJumpsOver0_2: steps(al, 0.2),
    roll: stat(roll) }));
  if (process.env.DUMP) { const fs = await import('node:fs'); fs.writeFileSync(`dump-${seed}.json`, JSON.stringify({ y: [...y], lat: [...lat], vy: [...vy] })); }
}
