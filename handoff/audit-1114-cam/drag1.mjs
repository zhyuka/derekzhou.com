// the drag's judder: a steady drag at SPD px/s, pointer moves delivered once a frame (rAF-aligned), frames at HZ with jitter
import { makeSim } from './sim.mjs';
import { FIX_DRAG } from './fixdrag.mjs';
const FIX = process.env.FIX === '1';
const world = process.argv[2] || './asm/src/world.js';
const SPD = 600, CSSW = 1440, OUT = { pose: { pos: [0, 0, 0], f: [0, 0, 1], r: [1, 0, 0], u: [0, 1, 0] } };
function run(hz, jitterMs, seed = 1) {
  const S = makeSim({ world, seed, obstOpts: { mesas: false, stones: false }, patch: FIX ? FIX_DRAG : [] });
  let rs = 12345; const rnd = () => ((rs = (Math.imul(rs, 1103515245) + 12345) >>> 0) / 4294967296);
  // fly 2 s, then drag for 3 s, then release
  let t = 0, last = 0, fingerPrev = 0, yaws = [], times = [], down = false;
  const P = 1000 / hz;
  for (let f = 0; f < hz * 6; f++) {
    const tf = f * P + (f ? (rnd() - 0.5) * 2 * jitterMs : 0), dt = tf - last; last = tf;
    const ts = tf / 1000;
    if (ts >= 2 && ts < 5) {   // the finger at SPD px/s from t=2 s; its move since the last frame delivered before the frame
      const fx = (ts - 2) * SPD;
      if (!down) { S.INP.down = true; down = true; fingerPrev = 0; }
      S.INP.dx += fx - fingerPrev; fingerPrev = fx;
    } else if (down) { S.release(); down = false; }
    S.frame(f ? dt / 1000 : 0);
    const p = S.pose(S.alpha(), { pos: [0, 0, 0], f: [0, 0, 1], r: [1, 0, 0], u: [0, 1, 0] });
    yaws.push(p.yaw); times.push(ts);
  }
  // steady drag: frames from 2.5 s to 4.8 s; ideal increment = dt * SPD * G
  const G = (Math.PI / 2) / CSSW, rat = [];
  for (let i = 1; i < yaws.length; i++) if (times[i] > 2.5 && times[i] < 4.8) rat.push((yaws[i] - yaws[i - 1]) / ((times[i] - times[i - 1]) * SPD * G));
  const mean = rat.reduce((a, b) => a + b, 0) / rat.length, sd = Math.sqrt(rat.reduce((a, b) => a + (b - mean) * (b - mean), 0) / rat.length);
  const stalls = rat.filter((r) => r < 0.25).length, doubles = rat.filter((r) => r > 1.6).length;
  return { hz, jitterMs, frames: rat.length, mean: +mean.toFixed(3), sd: +sd.toFixed(3), min: +Math.min(...rat).toFixed(3), max: +Math.max(...rat).toFixed(3), stalls, doubles, seq: rat.slice(0, 14).map((r) => +r.toFixed(2)).join(' ') };
}
for (const [hz, j] of [[60, 0], [60, 0.3], [59.94, 0.3], [120, 0.2], [144, 0.2], [165, 0.2], [240, 0.2]]) console.log(JSON.stringify(run(hz, j)));
