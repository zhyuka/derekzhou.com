// test/unit/destination.mjs: the horizon's destination (src/world/217-destination.js; realm-dunes.js dDest): one form per
// land, on the landing's heading (airHeading0, SEED0's), 7-8 km out, where the seed alone puts it (never the flight), laid
// out by the one cell of its own layout scale (5, 16 km cells reaching 12 km) that holds it.
// plant: {"file": "src/world/217-destination.js", "find": "var DEST_D = [7000, 8000], DEST = null;", "with": "var DEST_D = [2000, 3000], DEST = null;", "why": "the destination 2-3 km out: under the land's own forms, met in 3-4 minutes"}
// plant: {"file": "src/world/217-destination.js", "find": "var a = airHeading0(),", "with": "var a = airHeading0() + 0.6,", "why": "the destination off the landing's heading: out of the first frame"}
import { test, assert, vm, WORLD, cut, STREAMS } from '../unit-lib.mjs';

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
