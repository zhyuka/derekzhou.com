// birds-wind.mjs: the ink birds in wind (physics: birds/wind, the hub's flock physics spec, .work/hub/physics/birds.md 3.7),
// measured in the headless sim (tools/birds/sim.mjs). The dunes realm's wind only; still air everywhere else.
//   air speed  a bird flies a little faster through the air into a headwind (gulls 0.16 m/s a m/s: doi:10.3354/meps14431),
//              slower over the ground: its goal is an air speed along its track, crabbed against the side wind
//   crab       the body drawn along its way through the air: yaw - track = asin(W_side / V), to 1 deg
//   landing    in a side wind the last leg runs into it (ledge landings fail with the wind behind: doi:10.7554/eLife.43842),
//              the bird touches facing into it and does not turn round within 2 s of the touch
//   node --test test/birds-wind.mjs        CI (tools/checks/35-birds.sh: a process a test)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeSim } from '../tools/birds/sim.mjs';
import { SCENES } from './birds-scenes.mjs';

test('into a headwind a bird flies faster through the air, about 0.2 m/s a m/s (never held to its ground speed)', () => {
  const X = [], Y = [];
  for (let seed = 1; seed <= 3; seed++) {
    const sc = SCENES.natural(seed, '960x600'); sc.opt.dt = 1 / 60; sc.opt.draw = null; sc.opt.speed = 0; sc.opt.yaw = 0; sc.opt.wind = [6.5, 0]; sc.opt.sky = 'afterglow';   // (afterglow: the sky's full count of flocks)
    const sim = makeSim(sc.opt); if (sc.setup) sc.setup(sim);
    for (let k = 0; k < 120 * 20; k++) {
      sim.step(); if (k % 20) continue;
      for (const F of sim.B.FLOCKS) {
        const b = F.lead; if (!b || b.st !== 'fly' || (b.K.perch && F.m.length < 2) || b.P) continue;   // (flocks and the commuting kinds: a lone bird that perches works the view at its pace over the ground)
        const ax = b.v[0] - 6.5, az = b.v[2], va = Math.sqrt(ax * ax + az * az);
        X.push(-6.5 * ax / (va || 1)); Y.push(va - b.K.v);
      }
    }
  }
  const n = X.length, mx = X.reduce((a, c) => a + c) / n, my = Y.reduce((a, c) => a + c) / n;
  let sxy = 0, sxx = 0; for (let i = 0; i < n; i++) { sxy += (X[i] - mx) * (Y[i] - my); sxx += (X[i] - mx) ** 2; }
  const slope = sxy / sxx;
  console.log(`# ${n} leader samples in a 6.5 m/s wind: air speed ${slope.toFixed(3)} m/s more a m/s of headwind`);
  assert.ok(n > 500, 'too few samples');
  assert.ok(slope >= 0.1 && slope <= 0.3, `air speed rose ${slope.toFixed(3)} m/s a m/s of headwind (0.1-0.3 wanted)`);
});

/* a perched gull's landing in a side wind on the window (w m/s along the camera's right) */
function sideWind(each, winds = [6.5, -6.5, 3, -3], seeds = 8) {
  for (const w of winds) for (let seed = 1; seed <= seeds; seed++) {
    const sc = SCENES.perch(seed, '960x600'); const WV = [0, 0]; sc.opt.speed = 0; sc.opt.yaw = 0; sc.opt.wind = WV; sc.opt.dt = 1 / 60; sc.opt.frames = true; sc.opt.draw = { data: null };
    const sim = makeSim(sc.opt); WV[0] = w * sim.C.r[0]; WV[1] = w * sim.C.r[2];
    const [b] = sc.setup(sim);
    each(sim, b, WV, w, seed);
  }
}

test('in a side wind the body is drawn crabbed along its way through the air (to 1 deg)', () => {
  let n = 0, worst = 0, at = '';
  sideWind((sim, b, WV, w, seed) => {
    let sc = 0;
    for (let k = 0; k < 20 * 60; k++) {
      const st0 = b.st; sim.frame(1 / 60); if (b.st !== st0) sc = sim.t;
      const s = b.s; if (b.st !== 'fly' || sim.t - sc < 1 || !s || s.seenF !== sim.B.DF()) continue;   // (a second after any change of state: no basis blend)
      const y = Math.atan2(s.B[0], s.B[2]), e = [b.v0, b.v].map((v) => { const d = y - Math.atan2(v[0] - WV[0], v[2] - WV[1]); return Math.atan2(Math.sin(d), Math.cos(d)); });
      const d = e[0] * e[1] <= 0 ? 0 : Math.min(Math.abs(e[0]), Math.abs(e[1])) * 180 / Math.PI;   // (drawn between the last two steps' ways)
      n++; if (d > worst) { worst = d; at = `w ${w} seed ${seed} t ${sim.t.toFixed(2)}`; }
    }
  });
  console.log(`# ${n} drawn frames in a side wind: the body off its way through the air at most ${worst.toFixed(2)} deg (${at})`);
  assert.ok(n > 1000, 'too few frames');
  assert.ok(worst <= 1, `drawn ${worst.toFixed(2)} deg off its way through the air at ${at}`);
});

test('in a side wind a landing comes in against it (at least 90 %) and never turns round within 2 s of the touch', () => {
  let n = 0, up = 0, turned = 0; const bad = [];
  sideWind((sim, b, WV, w, seed) => {
    let tT = -1, yaw0 = 0, rel = 0;
    for (let k = 0; k < 30 * 60; k++) {
      const st0 = b.st; sim.frame(1 / 60);
      if (b.st === 'land' && st0 !== 'land') rel = b.v[0] * WV[0] + b.v[2] * WV[1];   // (the last leg's start: its way over the ground against the wind's)
      if (st0 === 'land' && b.st === 'perch' && tT < 0) { tT = sim.t; n++; yaw0 = b.P.yaw; if (rel < 0) up++; else bad.push(`w ${w} seed ${seed}`); }
      if (tT > 0 && b.st === 'perch' && sim.t - tT < 2 && b.P.hopTurn && b.P.yawTo !== yaw0) { turned++; bad.push(`turned: w ${w} seed ${seed}`); tT = -2; }
    }
  }, [6.5, -6.5], 32);   // (the round-7 review: on 8 seeds a wind the test passed with the fix reverted, 13 of 14; the 3 m/s winds never land, the camera still)
  console.log(`# ${n} landings in a side wind: ${up} against it (${(100 * up / n).toFixed(0)} %), ${turned} turned round within 2 s (${bad.join('; ')})`);
  assert.ok(n >= 10, `only ${n} landings`);
  assert.ok(up >= 0.9 * n, `only ${up} of ${n} landings came in against the wind`);
  assert.equal(turned, 0, `${turned} birds turned round within 2 s of the touch`);
});
