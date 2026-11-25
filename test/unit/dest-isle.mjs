// test/unit/dest-isle.mjs: the horizon's destination over the cloud sea (realm-above.js aDest; 217 destKind's 'isle'):
// one great isle, the isles' own form at about four times theirs, at destOf()'s point, laid out only by the cell that
// holds it, from the destination's own seed (never the cell's stream), its keel over the cruise so the flight passes
// under it, its size about 6-9 deg at 7.5 km, its temple scaled with it (30-45 px on a laptop), a clear field of
// ordinary isles in front of it (10 deg either side of its bearing), its destination POI within FLIGHT's ruler (r at
// most 800 m).
// plant: {"file": "src/realm-above.js", "find": "    dest: function (C, R) { aDest(C); },\n", "with": "", "why": "no isle: the cloud-sea lands get the dunes' rock rising out of the cloud"}
// plant: {"file": "src/realm-above.js", "find": "  var DEST_KEEL = 150,", "with": "  var DEST_KEEL = -200,", "why": "the isle's keel in the flight band: the flight meets its underside"}
// plant: {"file": "src/realm-above.js", "find": "r = Q.r(460, 540),", "with": "r = Q.r(110, 140),", "why": "the isle at an ordinary isle's size: a speck at 7.5 km, no destination"}
// plant: {"file": "src/realm-above.js", "find": "var D = W.dest(); if (!C.inside(D.x, D.z)) return;", "with": "var D = W.dest();", "why": "the isle laid out by every cell of its scale: four isles at one place"}
// plant: {"file": "src/realm-above.js", "find": "size = r * Q.r(0.6, 0.7);", "with": "size = r * Q.r(0.32, 0.4);", "why": "the temple at its old scale: a nub at 7.5 km, the isle a plain cone"}
// plant: {"file": "src/realm-above.js", "find": "    if (!destClear(x, z)) return;\n", "with": "", "why": "ordinary islands in front of the destination: one isle among isles"}
// plant: {"file": "src/realm-above.js", "find": "return Math.abs(b) > DEST_CLEAR || Math.sqrt(x * x + z * z) > D.d;", "with": "return Math.abs(b) > DEST_CLEAR;", "why": "the field cleared behind the destination too, past it, where nothing stands in front of it"}
// plant: {"file": "src/realm-above.js", "find": "    var yaw = R.r(0, 360), stu = R.f() < stupaP, sd = R.seed();   // (drawn whether kept or not: the cell's stream the same)\n    if (!destClear(x, z)) return;", "with": "    if (!destClear(x, z)) return;\n    var yaw = R.r(0, 360), stu = R.f() < stupaP, sd = R.seed();", "why": "a skipped island skips its draws: every later piece of its cell moves"}
// plant: {"file": "src/realm-above.js", "find": "r: r * 1.15, top:", "with": "r: r * 2.2, top:", "why": "the destination's reach past FLIGHT's 800 m"}
import { test, assert, fs, path, vm, TMP, STREAMS } from '../unit-lib.mjs';

const ABOVE = fs.readFileSync(path.join(TMP, 'src', 'realm-above.js'), 'utf8');
const cutA = (a, b) => { const i = ABOVE.indexOf(a); assert.ok(i >= 0, a + ' found'); const j = ABOVE.indexOf(b, i); assert.ok(j > i, b + ' found'); return ABOVE.slice(i, j); };
const SRC = cutA('  var DEST_KEEL = ', '  function aIsland(');
const CRUISE = +/CRUISE = (\d+);/.exec(ABOVE)[1];
const make = (D, get = 'aDest') => vm.runInThisContext('(function (D) { var PI = Math.PI, CRUISE = ' + CRUISE + ';\n' + STREAMS +
  ' var W = { dest: function () { return D; } }, K = { RNG: RNG, hk: hk };\n' + SRC + ' return ' + get + '; })')(D);
function cellOf(D, x0, z0, size = 16000) {
  const C = { items: [], pois: [], x0, z0, size, inside: (x, z) => x >= x0 && x < x0 + size && z >= z0 && z < z0 + size };
  C.add = (it) => { C.items.push(it); return it; }; C.poi = (p) => { C.pois.push(p); return p; };
  make(D)(C); return C;
}
const dests = Array.from({ length: 64 }, (_, k) => { const a = k * 0.7, d = 7000 + (k * 137) % 1000; return { x: Math.sin(a) * d, z: Math.cos(a) * d, d, bearing: a - Math.floor((a + Math.PI) / (2 * Math.PI)) * 2 * Math.PI, seed: (11 + k * 0x9e3779b9) >>> 0, kind: 'isle' }; });

test('dest isle: one great isle at the destination, laid out only by the cell that holds it', () => {
  for (const D of dests) {
    const ix = Math.floor(D.x / 16000) * 16000, iz = Math.floor(D.z / 16000) * 16000;
    const C = cellOf(D, ix, iz);
    assert.equal(C.items.length, 1, 'not one item in the destination\'s cell'); assert.equal(C.pois.length, 1);
    const it = C.items[0];
    assert.ok(it.kind === 'isle' && it.air && it.x === D.x && it.z === D.z, 'the isle not at the destination');
    for (const [dx, dz] of [[-16000, 0], [16000, 0], [0, -16000], [0, 16000]]) assert.equal(cellOf(D, ix + dx, iz + dz).items.length, 0, 'a neighbouring cell lays out the isle too');
    const B = cellOf(D, ix, iz).items[0]; assert.deepEqual(B, it, 'not the seed\'s alone: laid out twice, another isle');
  }
  assert.ok(!/\bR\./.test(SRC), 'aDest draws from the cell\'s stream');
  assert.match(ABOVE, /    dest: function \(C, R\) \{ aDest\(C\); \},\n/, 'the above kit has no dest hook: 180 gives its lands the dunes\' rock');
});

test('dest isle: its keel over the cruise (the flight passes under), about 5-8 deg at 7.5 km, its reach within FLIGHT\'s 800 m', () => {
  for (const D of dests) {
    const C = cellOf(D, Math.floor(D.x / 16000) * 16000, Math.floor(D.z / 16000) * 16000), it = C.items[0], p = C.pois[0];
    const keel = it.y - it.depth, top = it.y + it.size * 0.5;
    assert.ok(keel >= CRUISE + 140, `its keel ${keel.toFixed(0)} m, under ${CRUISE + 140} (the cruise and 140 m)`);
    assert.ok(!it.spheres && !it.solid, 'the isle steers the flight (it stands clear over the band)');
    const wide = 2 * it.r / 7500 * 180 / Math.PI, tall = (top - CRUISE) / 7500 * 180 / Math.PI;
    assert.ok(wide >= 6 && wide <= 9 && tall >= 6 && tall <= 9.5, `${wide.toFixed(1)} deg wide, ${tall.toFixed(1)} deg tall at 7.5 km`);
    assert.ok(p.kind === 'destination' && p.x === D.x && p.z === D.z && p.r <= 800 && p.top >= top - 1e-9 && p.pass > p.r, `the destination POI ${JSON.stringify(p)}`);
  }
});

test('dest isle: its temple scaled with it, 30-45 px tall at 7.5 km on a laptop, its spires over 1.2 px', () => {
  const PXR = 720 / Math.tan(36 * Math.PI / 180);   // (the laptop's px per radian: 1440 px across a 72 deg view)
  for (const D of dests) {
    const it = cellOf(D, Math.floor(D.x / 16000) * 16000, Math.floor(D.z / 16000) * 16000).items[0];
    const px = it.size / 7500 * PXR, spire = 0.035 * it.size / 7500 * PXR;
    assert.ok(px >= 30 && px <= 50 && spire >= 1.2, `the temple ${px.toFixed(0)} px tall, its spires ${spire.toFixed(2)} px wide`);
  }
});

test('dest isle: a clear field, no ordinary isle within 10 deg of its bearing and nearer; the rest as they were', () => {
  for (const D of dests) {
    const clear = make(D, 'destClear');
    for (const [db, f, want] of [[0, 0.5, false], [0.15, 0.9, false], [-0.15, 0.3, false], [0.2, 0.5, true], [0, 1.1, true], [Math.PI, 0.5, true]]) {
      const a = D.bearing + db, d = D.d * f;
      assert.equal(clear(Math.sin(a) * d, Math.cos(a) * d), want, `an isle at ${(db * 180 / Math.PI).toFixed(0)} deg, ${(f * 100).toFixed(0)}% of the way: ${want ? 'kept' : 'cleared'}`);
    }
    const rock = make({ ...D, kind: 'rock' }, 'destClear');
    assert.ok(rock(Math.sin(D.bearing) * D.d * 0.5, Math.cos(D.bearing) * D.d * 0.5), 'the field cleared for the dunes\' rock too');
  }
  const AI = cutA('  function aIsland(', '\n  }\n');
  assert.ok(AI.indexOf('R.seed()') < AI.indexOf('destClear'), 'aIsland returns before its draws: its cell\'s later pieces move');
});
