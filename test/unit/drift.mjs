// test/unit/drift.mjs: the clouds' drift with the wind at their level (physics: clouds/drift)
// plant: {"file": "src/world/212-cloud-drift.js", "find": "r[0] = o.c0[0] + (w ? w[0] * t : 0);", "with": "r[0] = o.c0[0] + (w ? w[0] * Math.fround(t) : 0);", "why": "the place taken in single precision: a body an hour in slides by centimetres a frame"}
import { test, assert, vm, WORLD, cut } from '../unit-lib.mjs';

const SRC = cut(WORLD, '  var CLOUD_U10 =', '  /* ----');
const make = (simT, alpha) => vm.runInThisContext('(function (SIM, SIM_DT) {' + SRC + ' return { cloudWind: cloudWind, cloudPos: cloudPos, cloudT: cloudT }; })')(simT === undefined ? { t: 0, alpha: 1 } : { t: simT, alpha }, 1 / 60);
const D = make();
const deg = (v) => Math.atan2(v[0], v[1]) * 180 / Math.PI;

test('drift: the hub\'s profile: the low layer 8.45 m/s at the wind + 20 deg, the deck 13 m/s at + 40, the cloud sea none', () => {
  for (const az of [0, 37, 200, 333]) {
    const a = az * Math.PI / 180, V = { wind: [Math.sin(a), Math.cos(a)] };
    const lo = D.cloudWind(V, 'low'), dk = D.cloudWind(V, 'deck'), sea = D.cloudWind(V, 'sea');
    assert.ok(Math.abs(Math.hypot(lo[0], lo[1]) - 1.3 * 6.5) < 1e-9, `low speed ${Math.hypot(lo[0], lo[1])}`);
    assert.ok(Math.abs(((deg(lo) - az - 20) % 360 + 540) % 360 - 180) < 1e-9, `low azimuth ${deg(lo)} for wind ${az}`);
    assert.ok(Math.abs(Math.hypot(dk[0], dk[1]) - 13) < 1e-9 && Math.abs(((deg(dk) - az - 40) % 360 + 540) % 360 - 180) < 1e-9, 'the deck');
    assert.deepEqual(Array.from(sea), [0, 0], 'the cloud sea is held');
  }
  assert.deepEqual(Array.from(D.cloudWind({}, 'low')), [0, 0], 'a visit with no wind: no drift');
});

test('drift: a body\'s place is a pure function of t, in doubles; its height never moves', () => {
  const o = { c0: Float64Array.from([1234.5, 812.25, -9876.125]), w: Float64Array.from([3.1, -7.9]) };
  const t = 3600 + 1 / 7, p = D.cloudPos(o, t);
  assert.equal(p[0], 1234.5 + 3.1 * t); assert.equal(p[2], -9876.125 - 7.9 * t); assert.equal(p[1], 812.25);
  assert.deepEqual(Array.from(D.cloudPos(o, t)), Array.from(p), 'the same t, the same place');
  // a frame later at an hour: the step is the wind's, to a micrometre (no single-precision steps)
  const q = D.cloudPos(o, t + 1 / 60);
  assert.ok(Math.abs((q[0] - p[0]) - 3.1 / 60) < 1e-6 && Math.abs((q[2] - p[2]) + 7.9 / 60) < 1e-6, 'a frame\'s step is not the wind\'s');
  assert.deepEqual(Array.from(D.cloudPos({ c0: o.c0 }, t)), Array.from(o.c0), 'a body with no wind stays put');
});

test('drift: the draw\'s moment is between the last two steps, as the camera\'s', () => {
  const M = make(100, 0.25);
  assert.ok(Math.abs(M.cloudT() - (100 - 0.75 / 60)) < 1e-12);
  assert.ok(/vb\.out\.c0 = Float64Array\.from\(vb\.out\.c\); vb\.out\.w = cloudWind\(V, clb && clb\.kind === 'wall' \? 'sea' : 'low'\);/.test(WORLD), 'resolve does not give each body its centre and its layer\'s wind');
});
