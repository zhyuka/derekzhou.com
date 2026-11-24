// test/unit/ruler.mjs: the visit ruler (tools/visit/ruler.mjs) runs on the world as it ships
// plant: {"file": "tools/visit/ruler.mjs", "find": "export const DUNE_MIN = 8;", "with": "export const DUNE_MIN = 0;", "why": "every land opens over dunes"}
// plant: {"file": "tools/visit/ruler.mjs", "find": "keep = (o) => L.pickOf(o, salt) < dens(o.x, o.z);", "with": "keep = () => true;", "why": "a cell keeps every piece, whatever its density"}
// plant: {"file": "src/world/215-air.js", "find": "305, 270, 295", "with": "20, 270, 295", "why": "k11's first heading back to 20 deg: 47% of the words' boxes under cloud (looks.json)"}
// plant: {"file": "src/realm-above.js", "find": "C.cloud({ kind: 'cumulus', x: x, z: z, y: R.r(-30, 0)", "with": "C.cloud({ kind: 'cumulus', x: x, z: z, y: R.r(-31, 0)", "why": "a cumulus moved: looks.json was measured on another world"}
// plant: {"file": "tools/visit/look-rule.mjs", "find": "GLOW_KEEP = 0.5,", "with": "GLOW_KEEP = 0,", "why": "the glow the land's own heading shows may be lost"}
// plant: {"file": "tools/visit/look-rule.mjs", "find": "NAME_CAP = 0.02,", "with": "NAME_CAP = 1,", "why": "the name's cap loosened past 2%"}
import { test, assert, golden, WORLD } from '../unit-lib.mjs';
const { flyLand, measure, report, HOURS, MIST_BY_SKY, DUNE_MIN } = await import('../../tools/visit/ruler.mjs');

// ------------------------------------------------------------------ the ruler's cuts still hold, and it measures
// (the visit ruler, delight-visit 5.1) its cuts of the world (the maps and director, the kits' cells, the sky order, the
// landing's heading) found in world.js as it ships, and a 10-minute visit on two lands measured: places passed, the
// director's looks, the sky's changes (a sky holds 70-190 s and changes over 55-60 s: 3-8 changes in 10 minutes), the
// flocks and crossings counted, the same twice. Its bars (a near pass by 40 s, no 180 s without a reward) are measured,
// not held: they are the curated openings' to meet
test('ruler: a 10-minute visit on two lands, measured, the same twice', () => {
  for (const k of [0, 9]) {
    const a = flyLand(k, 600), b = flyLand(k, 600);
    assert.ok(a.looks.length >= 100 && a.looks.length <= 121, `k${k}: ${a.looks.length} looks in 600 s (one every 5 s)`);
    assert.ok(a.places.length > 0, `k${k}: no place beside the way in 600 s`);
    assert.ok(a.heading >= 0 && a.heading < 2 * Math.PI, `k${k}: the heading ${a.heading}`);
    assert.ok(a.cut && a.cut.wD >= 0 && a.cut.wD <= 1 && a.cut.wC >= 0 && a.cut.wC <= 1, `k${k}: the land at the cut ${JSON.stringify(a.cut)}`);
    assert.ok(typeof a.cut.onDunes === 'boolean' && a.cut.duneH >= 0 && a.cut.duneH <= 32, `k${k}: the dunes at the cut ${JSON.stringify(a.cut)}`);
    assert.deepEqual(JSON.stringify(a), JSON.stringify(b), `k${k}: the ruler is not the same twice`);
    for (const hour of HOURS) {
      const m = measure(a, hour, k + 16, 0.5, 600);
      assert.ok(m.skyChanges >= 3 && m.skyChanges <= 8, `k${k} ${hour}: ${m.skyChanges} sky changes in 600 s`);
      assert.ok(m.firstSight === null || (m.firstSight >= 0 && m.firstSight <= 600), `k${k} ${hour}: the first place in sight at ${m.firstSight}`);
      assert.ok(m.maxGap > 0 && m.maxGap <= 600, `k${k} ${hour}: the longest gap ${m.maxGap}`);
    }
  }
  assert.match(report([measure(flyLand(0, 600), 'day', 16, 0.5, 600)], 600), /bars: a near pass/);
  // (pinned: the places and flocks a 10-minute visit passes on k0 and k9, so what a cell keeps can't drift unseen)
  const pinned = {}; for (const k of [0, 9]) { const a = flyLand(k, 600); pinned['k' + k] = { places: a.places.length, near: a.places.filter((p) => p.d <= 150).length, flocks: a.flocks.length }; }
  golden('ruler.places', pinned);
});

// ------------------------------------------------------------------ the land at the cut, pinned
// (the hub's round 7) the 16 openings' cut rows: the cloud and sand weights, the main dunes' drawn height (32 amp wD, the
// visit's wind through mainAt) and whether the land opens over dunes. A change to the maps, the dunes or the rule moves
// them: rewrite with node test/unit/ruler.mjs --write on a deliberate change. (Main: 2 of 16 open over dunes, k3 and k6)
test('ruler: the 16 openings\' land at the cut, pinned; a land opens over dunes by DUNE_MIN', () => {
  const rows = {};
  for (let k = 0; k < 16; k++) { const c = flyLand(k, 5).cut; rows['k' + k] = { wC: c.wC, wD: c.wD, duneH: c.duneH, onDunes: c.onDunes, kind: c.kind }; }
  for (const [k, r] of Object.entries(rows)) assert.equal(r.onDunes, r.wC < 0.5 && r.duneH >= DUNE_MIN, `${k}: onDunes ${r.onDunes} by the rule`);
  assert.ok(DUNE_MIN >= 5, `DUNE_MIN ${DUNE_MIN} m: under a mist pool's 3-5 m`);
  golden('ruler.cut', rows);
});
// (once AIR's weather is in the world: the mist at the cut is the sky's depth by the visit's moisture, never the full depth)
test('ruler: the mist at the cut is by the visit\'s moisture (AIR\'s weather, when in the world)', () => {
  if (!MIST_BY_SKY) return;
  const at = (k) => measure(flyLand(k, 5), 'dawn', k + 16, 0.5, 600);
  const k3 = at(3), k4 = at(4);
  assert.equal(k3.sky0, 'firstlight');
  const q3 = flyLand(3, 5).cut.mistQ, want = +(q3 * MIST_BY_SKY.firstlight).toFixed(2);   // (the band is AIR's: read it, never pin it)
  assert.ok(q3 > 0.5, `k3: moisture ${q3} (want a moist visit: the live seed's U10 3.97 m/s)`);
  assert.ok(Math.abs(k3.mistAtCut - want) < 0.05, `k3 at dawn: ${k3.mistAtCut} m of mist (want ${want}: first light's ${MIST_BY_SKY.firstlight} m by its moisture ${q3})`);
  assert.equal(k4.mistAtCut, 0, `k4 at dawn: ${k4.mistAtCut} m (want 0: a dry visit)`);
});

// ------------------------------------------------------------------ the first headings keep the words clear of cloud
// (the hub's reviews of #312, Nov 23 and 24) each land's first heading in airHeading0's table (null: the land's own draw)
// was measured in its first frames by tools/visit/looks.mjs (tools/visit/looks.json), on this very world: the record
// keeps look-rule.mjs's worldKey (the assembled world with the table blanked, and the realms that lay out the clouds),
// and a record of another world fails ("re-run looks.mjs": a cloud moved anywhere can stand behind the words). No
// heading puts more than WORD_CAP (10% at most) of the words' boxes, or NAME_CAP (2% at most) of the name's, under cloud
// in any of its three frames (laptop night, laptop sunset, phone dawn), nor loses the low sun's disc or glow the land's
// own heading shows (keepsDiscs: GLOW_KEEP of its light in frame at least); a table entry never measured fails too
test('ruler: each land\'s first heading keeps the words and the name clear of cloud, measured on this world (looks.json)', async () => {
  const fs = await import('node:fs');
  const { WORD_CAP, NAME_CAP, GLOW_KEEP, lookKey, worldKey, keepsDiscs } = await import('../../tools/visit/look-rule.mjs');
  assert.ok(WORD_CAP <= 0.1 && NAME_CAP <= 0.02, `the caps: words ${WORD_CAP} (want 0.1 at most), the name ${NAME_CAP} (want 0.02 at most)`);
  const T = /function airHeading0\(\) \{ var T = (\[[^\]]*\])/.exec(WORLD);
  assert.ok(T, 'airHeading0\'s table not found in world.js');
  const table = JSON.parse(T[1]), rec = JSON.parse(fs.readFileSync(new URL('../../tools/visit/looks.json', import.meta.url), 'utf8'));
  assert.equal(rec.world, worldKey(), 'looks.json was measured on another world: re-run looks.mjs (then headings.mjs)');
  assert.equal(table.length, 16, 'the table has one heading for each of the 16 lands');
  for (let k = 0; k < 16; k++) {
    const l = (rec.lands[k] || {})[lookKey(table[k])];
    assert.ok(l, `k${k}: heading ${lookKey(table[k])} was never measured (node tools/visit/looks.mjs, then headings.mjs)`);
    assert.ok(l.wordCloud <= WORD_CAP, `k${k}: heading ${lookKey(table[k])} puts ${(l.wordCloud * 100).toFixed(1)}% of the words' boxes under cloud (want ${WORD_CAP * 100}% at most)`);
    assert.ok(l.nameCloud <= NAME_CAP, `k${k}: heading ${lookKey(table[k])} puts ${(l.nameCloud * 100).toFixed(1)}% of the name's box under cloud (want ${NAME_CAP * 100}% at most)`);
    const own = rec.lands[k].own;
    assert.ok(own, `k${k}: the land's own heading was never measured`);
    assert.ok(GLOW_KEEP >= 0.5 && keepsDiscs(l, own), `k${k}: heading ${lookKey(table[k])} keeps sun light ${l.sunIn} against the own heading's ${own.sunIn} (want ${GLOW_KEEP} of it) or loses its disc`);
  }
});
