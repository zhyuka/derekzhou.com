// test/unit/rates.mjs: what counts frames counts time: the clouds' history and a speck's pose at any display rate
// plant: {"file": "src/world/415-draw-half.js", "find": "? 1 - Math.pow(1 - Math.min(1, SW.cacc), dA * 60) : 1;", "with": "? Math.min(1, SW.cacc) : 1;", "why": "the clouds' share a frame's: at 144 Hz the history holds 2.4 x less time"}
// plant: {"file": "src/world/415-draw-half.js", "find": "        var k60 = ca < 1 ? dA * 60 : 1;", "with": "        var k60 = 1;", "why": "the turn's trip, hold and ease a frame's: a turn at 144 Hz trips it late and lets go early"}
// plant: {"file": "src/birds/inkbirds/240-pass-one-instanced-draw-every.js", "find": "      var pk = Math.floor(ft * SPECK_HZ + (b.id & 3) / 4 + 1e-6);", "with": "      var pk = Math.floor((DF + (b.id & 3)) / 4);", "why": "a speck posed one frame in four: 36 times a second at 144 Hz"}
import { test, assert, vm, WORLD, cut } from '../unit-lib.mjs';
import fs from 'node:fs'; import path from 'node:path'; import { ROOT } from '../unit-lib.mjs';

// ------------------------------------------------------------------ the clouds' history, in time
// (time-based-constants) the share of the clouds' accumulation and its turn (415), cut from the world as it ships, fed
// a frame's time and the window's middle's move a frame as the draw computes them. SW.cacc is the share a 60th of a
// second, and the turn's trip (1-3 texels), hold (0.7) and ease (a quarter) are a 60th of a second's too: at 60 Hz the
// values are main's, and the same motion at 60 and 144 Hz leaves the same history and the same turn at the same
// moment. (Before: a frame's: at 144 Hz the history held 2.4 x less time, a 30 deg/s turn moved 2.4 x fewer texels a
// frame and tripped nothing, and the ease out of a turn took 2.4 x less time.)
const SHARE = /\? (1 - Math\.pow\(1 - Math\.min\(1, SW\.cacc\), dA \* 60\)) : 1;/.exec(WORLD);
const TURN = cut(WORLD, '        var k60 = ', '        pb[0] = R0[0];');
const CLOUD = SHARE && vm.runInThisContext('(function () {\n  \'use strict\';\n  var SW = { cacc: 0.5 }, CACC = { turn: 0, mid: 0 }, w2 = 491, h2 = 668, M = new Float32Array(9);\n' +
  '  function clamp(x, a, b) { return x < a ? a : x > b ? b : x; }\n  function smooth(a, b, x) { var t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); }\n' +
  '  return function (dA, pxs) {\n    var ca = ' + SHARE[1] + ';\n    M[8] = 1; M[6] = pxs * dA / (0.5 * w2); M[7] = 0;\n' + TURN + '    return { ca: ca, turn: CACC.turn, mid: CACC.mid };\n  };\n})');
// the history's weight on what the cloud was `back` s ago, after a run of frames at hz (the product of each frame's 1 - ca)
function run(hz, secs, pxs) {
  const F = CLOUD(), dt = 1 / hz, out = [];
  for (let k = 1; k <= Math.round(secs * hz); k++) { const t = k * dt, r = F(dt, pxs(t - dt / 2)); out.push({ t, ca: r.ca, turn: r.turn }); }   // (a frame's move: the motion over its own time)
  return out;
}
test('rates: the clouds\' share is a 60th of a second\'s: at 60 Hz main\'s, and the same history at 144 Hz', () => {
  assert.ok(SHARE, 'the share\'s expression not found in 415');
  const a = run(60, 1, () => 0);
  for (const f of a) assert.ok(Math.abs(f.ca - 0.5) < 1e-12, `60 Hz, held still: the share ${f.ca} (main's 0.5)`);
  for (const hz of [30, 75, 120, 144, 240]) {
    // (the weight left on the cloud n frames back: at 60 Hz 0.5 a 60th of a second, so 0.5 ^ (60 n / hz) at any rate)
    const b = run(hz, 1, () => 0);
    for (const n of [1, 2, 5, 12]) {
      let w = 1; for (let i = 0; i < n; i++) w *= 1 - b[b.length - 1 - i].ca;
      const want = Math.pow(0.5, 60 * n / hz);
      assert.ok(Math.abs(w - want) < 1e-9, `${hz} Hz: the history's weight ${n} frames (${(n / hz * 1000).toFixed(1)} ms) back ${w.toExponential(3)}, a 60 Hz history's over that time ${want.toExponential(3)}`);
    }
  }
});
test('rates: a turn trips, holds and eases the same at 60 and 144 Hz', () => {
  // (the window's middle moving at 240 px/s for 0.5 s, then still: 4 texels a 60th, a fast drag; then a slow one at 90 px/s)
  for (const v of [240, 90]) {
    const pxs = (t) => (t < 0.5 ? v : 0), a = run(60, 1.2, pxs), b = run(144, 1.2, pxs);
    for (const f of a) {
      const g = b.reduce((p, q) => (Math.abs(q.t - f.t) < Math.abs(p.t - f.t) ? q : p));
      if (Math.abs(g.t - f.t) > 1e-3) continue;   // (the moments both rates draw: every 1/12 s)
      assert.ok(Math.abs(g.turn - f.turn) < 0.1, `${v} px/s, at ${f.t.toFixed(3)} s: the turn ${g.turn.toFixed(3)} at 144 Hz, ${f.turn.toFixed(3)} at 60 Hz`);
    }
  }
  const main = run(60, 1, () => 120).map((f) => f.turn);   // (2 texels a frame at 60 Hz: main's smooth(1, 3, 2) = 0.5)
  assert.ok(Math.abs(main[main.length - 1] - 0.5) < 1e-6, `60 Hz, 2 texels a frame: the turn ${main[main.length - 1]} (main's 0.5)`);
});

// ------------------------------------------------------------------ a speck's pose, in time
// (time-based-constants) the speck's hold (240), cut from the ink birds as they ship: a speck poses its wings 15 times
// a second at any rate, each at its own phase; at 60 Hz one frame in four, as main (one frame in four was 36 times a
// second at 144 Hz)
const BIRDS = fs.readFileSync(path.join(ROOT, 'src/birds/inkbirds/240-pass-one-instanced-draw-every.js'), 'utf8');
const PK = /\n(\s*var pk = Math\.floor\(ft \* SPECK_HZ[^\n]*)/.exec(BIRDS), HZ = /SPECK_HZ = (\d+)/.exec(BIRDS);
test('rates: a speck poses 15 times a second at any rate, at 60 Hz one frame in four as main', () => {
  assert.ok(PK && HZ, 'the speck\'s pose line not found in 240');
  const pose = vm.runInThisContext('(function (ft, id, s) { var SPECK_HZ = ' + HZ[1] + ', b = { id: id };' + PK[1] + ' var hold = pk === s.pk; if (!hold) s.pk = pk; return !hold; })');
  for (const id of [0, 1, 2, 3, 7]) {
    for (const hz of [60, 75, 120, 144, 240]) {
      const s = {}; let n = 0, first = -1;
      for (let k = 0; k < 4 * hz; k++) { const p = pose(1000 + k / hz, id, s); if (k > 0 && p) { n++; if (first < 0) first = k; } }
      assert.ok(Math.abs(n / 4 - 15) <= 0.5, `${hz} Hz, speck ${id}: posed ${(n / 4).toFixed(2)} times a second (want 15)`);
    }
    const s = {}, at = [];
    for (let k = 0; k < 120; k++) if (pose(1000 + k / 60, id, s) && k > 0) at.push(k);
    for (let i = 1; i < at.length; i++) assert.equal(at[i] - at[i - 1], 4, `60 Hz, speck ${id}: poses at frames ${at.slice(0, 8).join(', ')}... (want every fourth)`);
  }
});
