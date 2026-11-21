// test/unit/ruler.mjs: the visit ruler (tools/visit/ruler.mjs) runs on the world as it ships
import { test, assert } from '../unit-lib.mjs';
const { flyLand, measure, report, HOURS } = await import('../../tools/visit/ruler.mjs');

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
    assert.deepEqual(JSON.stringify(a), JSON.stringify(b), `k${k}: the ruler is not the same twice`);
    for (const hour of HOURS) {
      const m = measure(a, hour, k + 16, 0.5, 600);
      assert.ok(m.skyChanges >= 3 && m.skyChanges <= 8, `k${k} ${hour}: ${m.skyChanges} sky changes in 600 s`);
      assert.ok(m.firstSight === null || (m.firstSight >= 0 && m.firstSight <= 600), `k${k} ${hour}: the first place in sight at ${m.firstSight}`);
      assert.ok(m.maxGap > 0 && m.maxGap <= 600, `k${k} ${hour}: the longest gap ${m.maxGap}`);
    }
  }
  assert.match(report([measure(flyLand(0, 600), 'day', 16, 0.5, 600)], 600), /bars: a near pass/);
});
