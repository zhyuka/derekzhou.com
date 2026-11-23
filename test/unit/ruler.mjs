// test/unit/ruler.mjs: the visit ruler (tools/visit/ruler.mjs) runs on the world as it ships
// plant: {"file": "tools/visit/ruler.mjs", "find": "export const DUNE_MIN = 8;", "with": "export const DUNE_MIN = 0;", "why": "every land opens over dunes"}
// plant: {"file": "tools/visit/ruler.mjs", "find": "keep = (o) => L.pickOf(o, salt) < dens(o.x, o.z);", "with": "keep = () => true;", "why": "a cell keeps every piece, whatever its density"}
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
  assert.ok(Math.abs(k3.mistAtCut - 9.17) < 0.05, `k3 at dawn: ${k3.mistAtCut} m of mist (want 9.17: first light's 10 m by its moisture 0.917)`);
  assert.equal(k4.mistAtCut, 0, `k4 at dawn: ${k4.mistAtCut} m (want 0: a dry visit)`);
});

// ------------------------------------------------------------------ the first headings keep the words clear of cloud
// (the hub's review of #312, Nov 23) each land's first heading in airHeading0's table (null: the land's own draw) was
// measured in its first frames by tools/visit/looks.mjs (tools/visit/looks.json), and none puts more than look-rule.mjs's
// WORD_CAP of the words' boxes under cloud in any of its three frames (laptop night, laptop sunset, phone dawn). A table
// entry never measured fails too: run looks.mjs on it (then headings.mjs) before it ships
test('ruler: each land\'s first heading keeps the words\' boxes clear of cloud (looks.json, WORD_CAP)', async () => {
  const fs = await import('node:fs');
  const { WORD_CAP, lookKey } = await import('../../tools/visit/look-rule.mjs');
  const T = /function airHeading0\(\) \{ var T = (\[[^\]]*\])/.exec(WORLD);
  assert.ok(T, 'airHeading0\'s table not found in world.js');
  const table = JSON.parse(T[1]), looks = JSON.parse(fs.readFileSync(new URL('../../tools/visit/looks.json', import.meta.url), 'utf8')).lands;
  assert.equal(table.length, 16, 'the table has one heading for each of the 16 lands');
  for (let k = 0; k < 16; k++) {
    const l = (looks[k] || {})[lookKey(table[k])];
    assert.ok(l, `k${k}: heading ${lookKey(table[k])} was never measured (node tools/visit/looks.mjs, then headings.mjs)`);
    assert.ok(l.wordCloud <= WORD_CAP, `k${k}: heading ${lookKey(table[k])} puts ${(l.wordCloud * 100).toFixed(1)}% of the words' boxes under cloud (want ${WORD_CAP * 100}% at most)`);
  }
});
