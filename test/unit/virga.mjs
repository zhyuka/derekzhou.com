// test/unit/virga.mjs: virga (physics: clouds/virga, 213-virga.js): the strands' share by sky from the body's own
// seed, their lowest point, and their tilt by the air's shear against the body's wind, atan(dU / w), at every step.
// plant: {"file": "src/world/213-virga.js", "find": "a = airBase(0, 0, y, V); x += (a.x - bx) / w * dz; z += (a.z - bz) / w * dz;", "with": "a = airBase(0, 0, y, V); x += a.x / w * dz; z += a.z / w * dz;", "why": "the strand blown by the wind itself, not by the wind against its body (laid over in still shear)"}
// plant: {"file": "src/world/213-virga.js", "find": "a = airBase(0, 0, y, V); x += (a.x - bx) / w * dz; z += (a.z - bz) / w * dz;", "with": "a = airBase(0, 0, y, V); x += (a.x - bx) / w0 * dz; z += (a.z - bz) / w0 * dz;", "why": "the drops never shrink (the strand's tilt by the fall at its base all the way down)"}
// plant: {"file": "src/world/213-virga.js", "find": "var VIRGA_SHARE = { afterglow: 0.3, bluehour: 0.2 },", "with": "var VIRGA_SHARE = { afterglow: 0.3, bluehour: 0.2, firstlight: 0.2 },", "why": "virga on a sky that is not a dusk's"}
// plant: {"file": "src/world/213-virga.js", "find": "VIRGA_END = [0.4, 0.7],", "with": "VIRGA_END = [0.2, 0.7],", "why": "strands hanging nearly to the ground"}
// plant: {"file": "src/world/213-virga.js", "find": "return !!s && hfl(hk(seed >>> 0, 0x76a1)) < s;", "with": "return !!s && hfl(hk(seed >>> 0, 0x76a1)) < 2 * s;", "why": "twice the share of strands"}
import { test, assert, vm, WORLD, cut, STREAMS } from '../unit-lib.mjs';

const AIRSRC = cut(WORLD, '  var AIR_H = {', '\n', true) + cut(WORLD, '  var AIR_U10 =', '\n', true) + cut(WORLD, '  var AIR_W = {', '\n', true) + cut(WORLD, '  var AIR_P = {', '  function airU10(') +
  cut(WORLD, '  function u10Of(', '\n', true) + cut(WORLD, '  function airBase(', '  function airVec3(');
const VIRGA = cut(WORLD, '  var VIRGA_SHARE = ', '  /* ---------------------------------------------------------------- the air');
const G = vm.runInThisContext('(function () { var PI = Math.PI, SIM = { V: null };\n' + STREAMS + AIRSRC + VIRGA +
  ' return { virgaOn: virgaOn, virgaPath: virgaPath, airBase: airBase, AIR_H: AIR_H, VIRGA_N: VIRGA_N }; })')();
const visit = (u10, a = 0.7) => ({ wind: [Math.sin(a), Math.cos(a)], u10 });
const SEEDS = Array.from({ length: 400 }, (_, i) => (i * 2654435761 + 977) >>> 0);

test('virga: on 30% of the afterglow\'s new bodies and 20% of the blue hour\'s, by the body\'s own seed; on no other sky', () => {
  const N = 40000, share = (sky) => { let n = 0; for (let i = 0; i < N; i++) n += G.virgaOn((i * 2246822519 + 3) >>> 0, sky); return n / N; };
  assert.ok(Math.abs(share('afterglow') - 0.3) < 0.01, `afterglow ${share('afterglow')}`);
  assert.ok(Math.abs(share('bluehour') - 0.2) < 0.01, `blue hour ${share('bluehour')}`);
  for (const sky of ['firstlight', 'moonlit', 'milkyway', 'aurora', undefined]) assert.equal(share(sky), 0, `virga on ${sky}`);
  for (const s of SEEDS) assert.equal(G.virgaOn(s, 'afterglow'), G.virgaOn(s, 'afterglow'), 'the same body, the same answer');
});

test('virga: the lowest point 40-70% of the base\'s height (never under 0.3 of it), the fall 1-4 m/s slowing as the drops shrink', () => {
  for (const base of [480, 560, 680, 1200]) for (const s of SEEDS) {
    const P = G.virgaPath(visit(6), s, base), low = base + P.p[P.p.length - 2];
    assert.ok(low >= 0.3 * base && low >= 0.4 * base - 1e-6 && low <= 0.7 * base + 1e-6, `the strand ends ${low.toFixed(1)} m up under a ${base} m base`);
    assert.ok(P.w0 >= 1 && P.w0 <= 4, `a fall of ${P.w0} m/s`);
    for (let i = 1; i < P.w.length; i++) assert.ok(P.w[i] < P.w[i - 1], 'the fall does not slow');
  }
});

test('virga: each step leans off the vertical by atan(dU / w), dU the air there against the body\'s (within 5 deg); straight where there is no shear', () => {
  let bent = 0, worst = 0;
  for (const u10 of [3, 5, 6, 7.5]) for (const a of [0, 1.3, 2.9, 4.4]) for (const base of [480, 600, 680]) for (const s of SEEDS.slice(0, 60)) {
    const V = visit(u10, a), P = G.virgaPath(V, s, base), n = G.VIRGA_N, dz = (base - P.end) / n;
    const B = { ...G.airBase(0, 0, G.AIR_H.clouds, V) };
    for (let i = 0; i < n; i++) {
      const dx = P.p[3 * (i + 1)] - P.p[3 * i], dzz = P.p[3 * (i + 1) + 2] - P.p[3 * i + 2], y = base - (i + 0.5) * dz;
      const W = { ...G.airBase(0, 0, y, V) }, du = Math.hypot(W.x - B.x, W.z - B.z), w = (P.w[i] + P.w[i + 1]) / 2;
      const want = Math.atan(du / w) * 180 / Math.PI, got = Math.atan(Math.hypot(dx, dzz) / dz) * 180 / Math.PI;
      worst = Math.max(worst, Math.abs(got - want));
      assert.ok(Math.abs(got - want) <= 5, `U10 ${u10}, ${y.toFixed(0)} m: leans ${got.toFixed(1)} deg, the shear gives ${want.toFixed(1)}`);
      if (y > 300 + dz) assert.ok(got < 1e-6, `bent ${got} deg at ${y.toFixed(0)} m, where the air is the body's`);
      if (du > 0.5) { bent++; assert.ok((dx * B.x + dzz * B.z) < 0, 'the strand leans ahead of its body (it trails back in slower air)'); }
    }
  }
  assert.ok(bent > 100, `only ${bent} steps bent: no shear met`);
  console.log(`# virga: the worst step ${worst.toFixed(2)} deg off atan(dU / w); ${bent} steps in shear`);
});
