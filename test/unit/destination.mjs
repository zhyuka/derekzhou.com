// test/unit/destination.mjs: the horizon's destination (src/world/217-destination.js; realm-dunes.js dDest): one form per
// land, on the landing's heading (airHeading0, SEED0's), 7-8 km out, where the seed alone puts it (never the flight), laid
// out by the one cell of its own layout scale (5, 16 km cells reaching 12 km) that holds it.
// plant: {"file": "src/world/217-destination.js", "find": "var DEST_D = [7000, 8000], DEST = null;", "with": "var DEST_D = [2000, 3000], DEST = null;", "why": "the destination 2-3 km out: under the land's own forms, met in 3-4 minutes"}
// plant: {"file": "src/world/217-destination.js", "find": "var a = airHeading0(),", "with": "var a = airHeading0() + 0.6,", "why": "the destination off the landing's heading: out of the first frame"}
// plant: {"file": "src/realm-dunes.js", "find": "var rf = it.foot2[0] = Math.max(rad * 1.45, bornReach(it) + 4);", "with": "var rf = it.foot2[0] = rad * 1.45;", "why": "the foot solid at rad x 1.45 whatever the rock: k13's flared foot reaches 25 m past it, and the camera passing 6 m off the solid grazes the rock"}
// plant: {"file": "src/realm-dunes.js", "find": "var t = T[T.length - 1], i, j, e;", "with": "var t = [0, 0], i, j, e;", "why": "the shoulder dome measured at the main dome's centre: its reach past the foot unseen"}
import { test, assert, fs, path, vm, TMP, WORLD, cut, STREAMS } from '../unit-lib.mjs';

const DEST = cut(WORLD, '  /* ---------------------------------------------------------------- the destination (delight-visit 5) */', '\n  }\n', true);
const HEAD = cut(WORLD, '  function airHeading0() {', '\n', true);
function page(seed) {
  const ctx = { Math, J: { seed }, DEG: Math.PI / 180, PI: Math.PI };
  vm.runInNewContext(STREAMS + HEAD + DEST + '\n  this.destOf = destOf; this.airHeading0 = airHeading0; this.DEST_D = DEST_D;', ctx);
  return ctx;
}

test('destination: on the landing\'s heading, 7-8 km out, for every opening', () => {
  for (let k = 0; k < 16; k++) {
    const seed = (11 + k * 0x9e3779b9) >>> 0, G = page(seed), D = G.destOf(), a = G.airHeading0();
    assert.ok(Math.abs(D.bearing - a) < 1e-12, `opening ${k}: the bearing ${D.bearing} is not the landing's heading ${a}`);
    const d = Math.hypot(D.x, D.z), b = Math.atan2(D.x, D.z);
    assert.ok(Math.abs(d - D.d) < 1e-6 && D.d >= 7000 && D.d <= 8000, `opening ${k}: ${d.toFixed(0)} m out (7-8 km)`);
    assert.ok(Math.abs(Math.atan2(Math.sin(b - a), Math.cos(b - a))) < 1e-9, `opening ${k}: it stands off the heading`);
    assert.ok(D.d / 12 / 60 >= 8 && D.d / 12 / 60 <= 14, `opening ${k}: met in ${(D.d / 720).toFixed(1)} min at 12 m/s (8-14)`);
  }
});

test('destination: the seed\'s alone (the same whenever asked; another seed, another place)', () => {
  const G = page((11 + 3 * 0x9e3779b9) >>> 0), A = G.destOf(), B = G.destOf();
  assert.equal(A.x, B.x); assert.equal(A.z, B.z);
  G.J.seed = (11 + 4 * 0x9e3779b9) >>> 0; const C = G.destOf();
  assert.ok(C.x !== A.x || C.z !== A.z, 'a new seed kept the old destination');
  // the section reads no camera, clock or flight: only the seed and the heading
  assert.ok(!/CS\.|CAM\.|SIM\.|clockNow|Math\.random/.test(DEST), 'destOf reads the flight, the camera or a clock');
});

test('destination: laid out by its own scale\'s one cell, the dunes kit\'s', () => {
  assert.match(WORLD, /\{ size: 16000, radius: 12000, one: true \}\]/, 'the destination\'s layout scale (16 km cells to 12 km, making only the one cell that holds it: the others reordered the boot\'s cloud bakes) is gone');
  assert.match(WORLD, /if \(C\.scale === 5\) \{ var DK = destKind\(destOf\(\)\)\.kind === 'isle' && KA\.dest \? KA : KD, kn = DK === KA \? 'above' : 'dunes', A5 = kitApi\(C, kn, DK === KA \? densA : densD, DK === KA\); A5\.add = function \(it\) \{ it\.kit = kn; return C\.add\(it\); \}; A5\.poi = C\.poi; if \(DK\.dest\) DK\.dest\(A5, R, K2\); \}/, 'scale 5 is not handed to its kind\'s dest (the above kit\'s isle over the cloud sea once it has one, else the dunes kit\'s rock), kept whatever the density');
  assert.match(WORLD, /function destKind\(D\) \{ if \(!D\.kind\) D\.kind = kitAt\(D\.x, D\.z\)\.wC > 0\.5 \? 'isle' : 'rock'; return D; \}/, 'destKind is not the maps\' cloud sea at the point, read once (wC over 0.5: the isle)');
});

// ------------------------------------------------------------------ the arrival: the rock inside its solids
// (FLIGHT, the hub's arrival pass, Nov 25) The flight passes the destination's foot solid (a cylinder: rad x 1.45 or the
// rock's own reach) about 6 m off its face (the slip's own zone, flight-sim.mjs). So the rock must stand inside that
// solid at every height the camera can fly beside it: from the land at its lowest under the dome (it.sink over its base,
// where the build seats it) to the solid's top. On all 16 lands, the realm's own dDest and the rock its near build makes
// (bornG through the forms' grid, recorded here, not through bornReach), read every metre up each column between its
// rings: the foot solid is the rock's widest reach there, 4 m out, or more; the ruler's r is that foot, at most 800 m
// (the slip's proven width, #484). (Main before: k13's lobed, flared foot reached 25 m past rad x 1.45 at the land's
// level; the other 15 kept 18-117 m inside.)
const KITSRC = fs.readFileSync(path.join(TMP, 'src', 'realm-kit.js'), 'utf8'), DUNSRC = fs.readFileSync(path.join(TMP, 'src', 'realm-dunes.js'), 'utf8');
const BORN = cut(DUNSRC, '  function* bornG(B, R, rad, H, col, sh) {', '  var FORM_N = ');
const FORMS = cut(KITSRC, '  function outline(R, n, rad, squash) {', '  // a cap over a ring');
function arrival(seed) {
  const ctx = { Math, J: { seed }, DEG: Math.PI / 180, PI: Math.PI, rec: [], added: [], pois: [] };
  vm.runInNewContext(STREAMS + HEAD + DEST + FORMS +
    '\n  var T = [[0, 0]]; function* gridSurfG(B, rows) { var t = T[T.length - 1]; rec.push(rows.map(function (r) { return r.map(function (p) { return [p[0] + t[0], p[1], p[2] + t[1]]; }); })); }' +
    '\n  var F = { outline: outline, flutes: flutes, gridSurfG: gridSurfG }, K = { RNG: RNG, hk: hk, smooth: function (a, b, x) { var t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); } }, W = { dest: destOf };\n' + BORN +
    '\n  var C = { inside: function () { return true; }, add: function (it) { added.push(it); return it; }, poi: function (p) { pois.push(p); return p; } };' +
    '\n  dDest(C, null); var it = added[0];' +
    '\n  var B = { lod: 0, push: function () { T.push(T[T.length - 1].slice()); }, pop: function () { T.pop(); }, xf: function (x, y, z) { var t = T[T.length - 1]; t[0] += x; t[1] += z; } };' +
    '\n  var g = bornG(B, RNG(it.seed), it.rad, it.H, null, true); while (!g.next().done) {}', ctx);
  const it = ctx.added[0], y0 = it.sink, y1 = it.H * 0.5;
  let reach = 0;
  for (let y = y0; y <= y1; y += 1) for (const rows of ctx.rec) for (let i = 0; i + 1 < rows.length; i++) for (let j = 0; j < rows[i].length; j++) {
    const a = rows[i][j], b = rows[i + 1][j]; if (y < a[1] || y > b[1] || a[1] === b[1]) continue;
    const u = (y - a[1]) / (b[1] - a[1]); reach = Math.max(reach, Math.hypot(a[0] + (b[0] - a[0]) * u, a[2] + (b[2] - a[2]) * u));
  }
  return { it, poi: ctx.pois[0], reach, meshes: ctx.rec.length };
}
test('destination: the rock stands inside its foot solid wherever the camera can pass it, on every land; the ruler\'s r is that foot, at most 800 m', () => {
  for (let k = 0; k < 16; k++) {
    const A = arrival((11 + k * 0x9e3779b9) >>> 0), f = A.it.foot2[0], tag = `opening ${k}`;
    assert.equal(A.meshes, 2, `${tag}: the dome and its shoulder (${A.meshes} meshes)`);
    assert.ok(f >= A.it.rad * 1.45 - 1e-9, `${tag}: the foot solid ${f.toFixed(0)} m under rad x 1.45`);
    assert.ok(f >= A.reach + 4 - 1e-6, `${tag}: the rock reaches ${A.reach.toFixed(1)} m from its centre between ${A.it.sink} m and ${(A.it.H * 0.5).toFixed(0)} m over its base, the foot solid ${f.toFixed(1)} m (want 4 m out at least: the camera passes the solid 6 m off)`);
    assert.equal(A.poi.r, f, `${tag}: the ruler's r ${A.poi.r} is not the foot solid ${f}`);
    assert.ok(f <= 800, `${tag}: the foot ${f.toFixed(0)} m past the slip's proven 800 m`);
  }
});
