import { makeSim } from './sim.mjs';
import { FIX_DRAG } from './fixdrag.mjs';
const S = makeSim({ world: './asm/src/world.js', seed: 1, obstOpts: { mesas: false, stones: false }, patch: process.env.FIX === '1' ? FIX_DRAG : [] });
const hz = 144, P = 1000 / hz; let last = 0, fp = 0, st0 = 0, prevYaw = null, prevPos = null;
for (let f = 0; f < hz * 3; f++) {
  const tf = f * P, dt = tf - last; last = tf; const ts = tf / 1000;
  if (ts >= 2) { if (!S.INP.down) { S.INP.down = true; fp = 0; } const fx = (ts - 2) * 600; S.INP.dx += fx - fp; fp = fx; }
  S.frame(f ? dt / 1000 : 0);
  const p = S.pose(S.alpha(), { pos: [0, 0, 0], f: [0, 0, 1], r: [1, 0, 0], u: [0, 1, 0] });
  const { CS, CSP } = S.st();
  if (ts > 2.5 && ts < 2.62) console.log(f, 'steps', S.SIM.steps - st0, 'a', S.alpha().toFixed(3), 'CSP.yawV', CSP.yawV.toFixed(5), 'CS.yawV', CS.yawV.toFixed(5), 'drawn', p.yaw.toFixed(5), 'dYaw', (p.yaw - prevYaw).toFixed(5), 'dPos', Math.hypot(p.pos[0] - prevPos[0], p.pos[2] - prevPos[2]).toFixed(4));
  st0 = S.SIM.steps; prevYaw = p.yaw; prevPos = p.pos.slice();
}
