// a real trace's numbers: the camera's derivatives, its clearance over the sand, the height target's jumps, the slip's plans
import fs from 'node:fs';
const f = process.argv[2], R = JSON.parse(fs.readFileSync(f, 'utf8')).filter((r) => typeof r[0] === 'number');
const DT = 1 / 60, N = R.length, col = (i) => R.map((r) => r[i]);
const t = col(0), x = col(1), y = col(2), z = col(3), psi = col(4), sv = col(5), vy = col(6), raw = col(8), env = col(9), yT = col(10), cl1 = col(11), c = col(12), plans = col(15), spn = col(16), gen = col(17);
const d = (a) => a.slice(1).map((v, i) => (v - a[i]) / DT);
const ay = d(vy), jy = d(ay), asv = d(sv);
const q = (a, p) => { const b = a.slice().sort((u, v) => u - v); return +b[Math.floor(p * (b.length - 1))].toFixed(3); };
const absA = (a) => a.map(Math.abs);
let atUp = 0, atDn = 0; for (const v of vy) { if (v >= 2.6 - 1e-6) atUp++; if (v <= -2.2 + 1e-6) atDn++; }
const clr = y.map((v, i) => v - raw[i]), overEnv = y.map((v, i) => v - env[i]);
const dyT = [], dyTland = []; for (let i = 1; i < N; i++) (gen[i] !== gen[i - 1] ? dyTland : dyT).push(Math.abs(yT[i] - yT[i - 1]));
let chat = 0; for (let i = 1; i < asv.length; i++) if (Math.abs(asv[i]) > 0.2 && Math.sign(asv[i]) !== Math.sign(asv[i - 1])) chat++;
const secs = N * DT;
console.log(JSON.stringify({
  file: f, seconds: +secs.toFixed(1), fixG: R[N - 1][13], fixO: R[N - 1][14],
  climbLimitPct: +(100 * atUp / N).toFixed(1), descentLimitPct: +(100 * atDn / N).toFixed(1),
  vy: { p50: q(absA(vy), 0.5), p99: q(absA(vy), 0.99) }, ay: { p99: q(absA(ay), 0.99), max: q(absA(ay), 1) }, ayStepsOver0_2: ay.slice(1).filter((v, i) => Math.abs(v - ay[i]) > 0.2).length,
  clearOverSand: { p1: q(clr, 0.01), p10: q(clr, 0.1), p50: q(clr, 0.5), p90: q(clr, 0.9), p99: q(clr, 0.99) }, overEnvelope: { p1: q(overEnv, 0.01), p50: q(overEnv, 0.5), p99: q(overEnv, 0.99) },
  envelopeOverSand: { p50: q(env.map((v, i) => v - raw[i]), 0.5), p99: q(env.map((v, i) => v - raw[i]), 0.99) },
  cruise: { p50: q(cl1, 0.5) }, c: { p50: q(c, 0.5) },
  dyTstep: { p50: q(dyT, 0.5), p99: q(dyT, 0.99), max: q(dyT, 1), over1m: dyT.filter((v) => v > 1).length }, dyTatGridLanding: dyTland.length ? { n: dyTland.length, p99: q(dyTland, 0.99), max: q(dyTland, 1), over1m: dyTland.filter((v) => v > 1).length } : null,
  slip: { plansPerS: +(plans.reduce((a, b) => a + b, 0) / secs).toFixed(1), constraintsP50: q(spn, 0.5), constraintsMax: q(spn, 1), svMax: q(absA(sv), 1), accelSignFlipsPerS: +(chat / secs).toFixed(1) }
}, null, 0));
