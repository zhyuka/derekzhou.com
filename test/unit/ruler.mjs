// test/unit/ruler.mjs: the visit ruler (tools/visit/ruler.mjs) runs on the world as it ships
// plant: {"file": "tools/visit/ruler.mjs", "find": "export const DUNE_MIN = 8;", "with": "export const DUNE_MIN = 0;", "why": "every land opens over dunes"}
// plant: {"file": "tools/visit/ruler.mjs", "find": "keep = (o) => L.pickOf(o, salt) < dens(o.x, o.z);", "with": "keep = () => true;", "why": "a cell keeps every piece, whatever its density"}
// plant: {"file": "tools/visit/look-rule.mjs", "find": "GLOW_KEEP = 0.5,", "with": "GLOW_KEEP = 0,", "why": "the glow the land's own heading shows may be lost"}
// plant: {"file": "tools/visit/look-rule.mjs", "find": "NAME_CAP = 0.02,", "with": "NAME_CAP = 1,", "why": "the name's cap loosened past 2%"}
// plant: {"file": "tools/visit/look-rule.mjs", "find": "if (!(l.wordCloud <= WORD_CAP)) bad.push(", "with": "if (false) bad.push(", "why": "rule() never weighs the words: a cloud moved over them passes"}
// plant: {"file": "tools/visit/look-rule.mjs", "find": "'src/realm-above.js',", "with": "", "why": "the air above the land out of the key: a cumulus moved, the gate does not measure"}
// plant: {"file": "tools/visit/look-rule.mjs", "find": "+ '\\0' + JSON.stringify(tableOf(", "with": "+ '\\0' + JSON.stringify(0 && tableOf(", "why": "the table out of looksKey: a new heading, never measured"}
// plant: {"file": ".github/workflows/gate.yml", "find": "-s${{ matrix.shard }}-${{ needs.plan.outputs.looks_key }}", "with": "-s${{ matrix.shard }}", "why": "a shard's record kept whatever the world: a cloud moved over the words passes on the old figures"}
// plant: {"file": ".github/workflows/gate.yml", "find": "        if: success() && steps.lrec.outputs.cache-hit != 'true' && needs.plan.outputs.looks_key != ''", "with": "        if: always() && steps.lrec.outputs.cache-hit != 'true' && needs.plan.outputs.looks_key != ''", "why": "a failing record kept: the next push reuses a measure that failed"}
// plant: {"file": ".github/workflows/gate.yml", "find": "needs: [static, plan, t1, looks, paint]", "with": "needs: [static, plan, t1, paint]", "why": "the looks job's answer not the verdict's"}
// plant: {"file": "tools/visit/ruler.mjs", "find": "  const pass = (o) => {", "with": "  { const L0 = landOf(k); pois.push({ realm: 'dunes', site: 'dest', kind: 'destination', x: Math.sin(L0.heading) * 3000, z: Math.cos(L0.heading) * 3000, pass: 600, r: 500, top: 700 }); }\n  const pass = (o) => {", "why": "a destination 3 km out: met in 4 min, not 8-14"}
// plant: {"file": "tools/visit/ruler.mjs", "find": "  const pass = (o) => {", "with": "  { pois.push({ realm: 'dunes', site: 'dest', kind: 'destination', x: Math.sin(psi) * 9000, z: Math.cos(psi) * 9000, pass: 600, r: 500, top: 700 }); }\n  const pass = (o) => {", "why": "a destination laid out by the way flown, not by the land: another path finds another"}
// plant: {"file": "tools/visit/ruler.mjs", "find": "keep = (o) => L.pickOf(o, salt) < dens(o.x, o.z);", "with": "keep = (o) => L.pickOf(o, salt) < dens(o.x, o.z) * 0.6;", "why": "the kits keep 40% fewer places: the visits emptier"}
import { test, assert, golden, WORLD } from '../unit-lib.mjs';
const { flyLand, measure, report, HOURS, MIST_BY_SKY, DUNE_MIN, NEAR } = await import('../../tools/visit/ruler.mjs');

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
// is measured in its first frames by tools/visit/looks.mjs, live, in the gate (gate.yml's looks job, whenever
// look-rule.mjs's looksKey moved base to head: the cloud layout, the opening's view, the words' boxes, the table, the
// measuring code; the hub's ask of 02:09Z Nov 25: no stored record to re-measure, so no PR invalidates another's).
// rule() is what fails it: no heading puts more than WORD_CAP (10% at most) of the words' boxes, or NAME_CAP (2% at
// most) of the name's, under cloud in any of its three frames (laptop night, laptop sunset, phone dawn), nor loses the
// low sun's disc or glow the land's own heading shows (keepsDiscs: GLOW_KEEP of its light in frame at least; waived only
// on a land where no measured heading keeps both, glowWaived); a heading not measured fails too. These tests hold the
// rule and the key to that; the frames are the gate's.
const LR = await import('../../tools/visit/look-rule.mjs');
const entry = (o) => Object.assign({ wordCloud: 0, nameCloud: 0, nameSolid: 0, topCloud: 0, galaxy: 1, galaxyIn: 5, sun: 1, sunIn: 5, discs: { 'laptop-sunset': null, 'phone-dawn': null } }, o);
const TABLE = LR.tableOf((await import('node:fs')).readFileSync(new URL('../../' + LR.AIR, import.meta.url), 'utf8'));
const clear = () => ({ lands: Object.fromEntries(TABLE.map((d, k) => [k, d === null ? { own: entry() } : { [d]: entry(), own: entry() }])) });
const atK = (k) => LR.lookKey(TABLE[k]);
test('ruler: rule() passes a table whose headings keep the words clear, and fails each way one does not', () => {
  assert.equal(TABLE.length, 16, 'airHeading0\'s table: 16 headings');
  assert.deepEqual(LR.rule(clear(), TABLE), [], 'every heading clear');
  assert.ok(LR.WORD_CAP <= 0.1 && LR.NAME_CAP <= 0.02 && LR.GLOW_KEEP >= 0.5, `the caps: words ${LR.WORD_CAP}, the name ${LR.NAME_CAP}, the glow ${LR.GLOW_KEEP}`);
  const k = TABLE.findIndex((d) => d !== null), m = TABLE.findIndex((d) => d === null);
  const fails = (why, edit, want) => { const r = clear(); edit(r); const bad = LR.rule(r, TABLE); assert.ok(bad.length === 1 && want.test(bad[0]), `${why}: ${JSON.stringify(bad)}`); };
  // a cloud moved over the words: the plant the hub asked for, as the record shows it (the gate's frames make the record)
  fails('a cloud over the words', (r) => { r.lands[k][atK(k)].wordCloud = 0.3; }, new RegExp(`^k${k}: heading ${atK(k)} puts 30\\.0% of the words' boxes`));
  fails('a cloud over the name', (r) => { r.lands[m].own.nameCloud = 0.03; }, new RegExp(`^k${m}: heading own puts 3\\.0% of the name's box`));
  // a floating island behind the name (k1 at 340 on Nov 25's world: 4.2% on the laptop, 5.3% on the phone)
  fails('a solid behind the name', (r) => { r.lands[k][atK(k)].nameSolid = 0.053; }, new RegExp(`^k${k}: heading ${atK(k)} puts 5\\.3% of the name's box behind a solid`));
  fails('a record from before the solids were measured', (r) => { delete r.lands[k][atK(k)].nameSolid; }, new RegExp(`^k${k}: heading ${atK(k)} puts NaN% of the name's box behind a solid`));
  fails('the glow lost', (r) => { r.lands[k][atK(k)].sunIn = 1; }, /keeps sun light 1 against the own heading's 5/);
  fails('the disc lost', (r) => { r.lands[k].own.discs['phone-dawn'] = { shown: true }; }, /loses its disc/);
  fails('a heading not measured', (r) => { delete r.lands[k][atK(k)]; }, new RegExp(`^k${k}: heading ${atK(k)} was not measured`));
  fails('the own heading not measured', (r) => { delete r.lands[k].own; }, /the land's own heading was not measured/);
  // the glow waived only where no measured heading keeps both (k0 on Nov 24's world)
  const w = clear(); w.lands[k][atK(k)].sunIn = 1; w.lands[k].own = entry({ nameCloud: 0.5 });   // (no heading keeps the words and the glow both: waived)
  assert.deepEqual(LR.rule(w, TABLE), []);
  assert.deepEqual(LR.rule(Object.assign(clear(), { lands: {} }), TABLE, [k]).length, 1, 'only the lands asked for (a shard)');
});

// looksKey: the gate measures when it moved, base against head; so it must move with what moves a cloud near the words,
// the table and the measuring code, and not with a comment or the sky
test('ruler: looksKey moves with a cloud, the opening\'s view, the words and the table, not with a comment or the sky', async () => {
  const fs = await import('node:fs'), os = await import('node:os'), path = await import('node:path');
  const root = path.join(path.dirname(new URL(import.meta.url).pathname), '..', '..'), d = fs.mkdtempSync(path.join(os.tmpdir(), 'looks-key-'));
  const files = [...LR.KEY_INPUTS.map((x) => (Array.isArray(x) ? x[0] : x)), ...LR.MEASURE_INPUTS, 'src/world/glsl/sky-body.glsl'];
  for (const f of files) { fs.mkdirSync(path.join(d, path.dirname(f)), { recursive: true }); fs.copyFileSync(path.join(root, f), path.join(d, f)); }
  const k0 = await LR.looksKey(d);
  assert.equal(k0, await LR.looksKey(root), 'the copy keys as the tree');
  assert.match(k0, /^[0-9a-f]{16}$/);
  const edit = async (f, a, b, moves, why) => {
    const p = path.join(d, f), src = fs.readFileSync(p, 'utf8'); assert.ok(src.includes(a), `${f}: ${a} not found`);
    fs.writeFileSync(p, src.replace(a, b)); const k = await LR.looksKey(d); fs.writeFileSync(p, src);
    assert.equal(k !== k0, moves, `${why}: the key ${moves ? 'must move' : 'must hold'}`);
  };
  await edit('src/realm-above.js', "C.cloud({ kind: 'cumulus', x: x, z: z, y: R.r(-30, 0)", "C.cloud({ kind: 'cumulus', x: x, z: z, y: R.r(-31, 0)", true, 'a cumulus moved');
  await edit(LR.AIR, 'var T = [', 'var T = [7, ', true, 'the table');   // (worldKey blanks it; looksKey keeps it)
  await edit('site/style.css', '{', '{ margin-top: 1px;', true, 'the words\' boxes');
  await edit('tools/visit/looks.mjs', 'const MASK = 8,', 'const MASK = 9,', true, 'the measure');
  await edit(LR.AIR, 'function airHeading0() {', '// a note\nfunction airHeading0() {', false, 'a comment');
  await edit('src/world/glsl/sky-body.glsl', 'const float STF = 1.1083;', 'const float STF = 1.2083;', false, 'the stars brighter (the sky is not a cap)');
  fs.rmSync(path.join(d, 'src/world/270-flight.js'));
  assert.match(await LR.looksKey(d), /^unread-/, 'a tree it cannot read is measured');
  assert.notEqual(await LR.looksKey(d), await LR.looksKey(d), '(never equal to another unread tree)');
  fs.rmSync(d, { recursive: true, force: true });
});

// the gate measures: the plan keys base and head, the looks job runs on a move (four runners, every 4th land), with
// --check, on the plan's pinned head build, and the verdict needs it
test('ruler: the gate measures the looks when looksKey moved, and its answer is the verdict\'s', async () => {
  const fs = await import('node:fs'), g = fs.readFileSync(new URL('../../.github/workflows/gate.yml', import.meta.url), 'utf8');
  assert.match(g, /looks_changed: \$\{\{ steps\.looks\.outputs\.looks_changed \}\}/, 'the plan says whether the looks key moved');
  assert.match(g, /look-rule\.mjs.*looksKey/, 'the plan keys with looksKey');
  const job = g.slice(g.indexOf('\n  looks:\n'), g.indexOf('\n  verdict:\n'));
  assert.ok(job.length > 100, 'gate.yml has a looks job before the verdict');
  assert.match(job, /if: always\(\) && needs\.plan\.outputs\.looks_changed == 'true' && needs\.plan\.outputs\.has_pr != 'false'/);
  assert.match(job, /tools\/visit\/looks\.mjs --build "\$RUNNER_TEMP\/served\/head" --table --check --shard \$\{\{ matrix\.shard \}\}\/(\d+)/);
  const n = +/--shard \$\{\{ matrix\.shard \}\}\/(\d+)/.exec(job)[1], ms = /shard: \[([\d, ]+)\]/.exec(job)[1].split(',').map(Number);
  assert.deepEqual(ms, [...Array(n).keys()], 'one runner for each shard');
  assert.match(job, /handoff\.mjs get served "\$RUNNER_TEMP\/served" --pinned/);
  assert.match(g, /\n  verdict:\n    needs: \[[^\]]*\blooks\b[^\]]*\]/, 'the verdict needs the looks job');
  // (CI lane, 2026-11-25, the hub's gate p90) a shard's record kept by the head's looksKey, the image and the shard, and
  // weighed by the same rule (--check) when it is found; kept only from a fresh measure that passed
  assert.match(g, /looks_key: \$\{\{ steps\.looks\.outputs\.looks_key \}\}/, 'the plan hands on the head\'s looksKey');
  assert.match(job, /key=looks-v1-\$\{\{ runner\.os \}\}-\$\{ImageOS:-selfhosted\}-s\$\{\{ matrix\.shard \}\}-\$\{\{ needs\.plan\.outputs\.looks_key \}\}/, 'the record kept by the head\'s looksKey, the image and the shard');
  assert.match(job, /from="--from \$RUNNER_TEMP\/looks-rec\/rec\.json"\n\s+node tools\/visit\/looks\.mjs [^\n]*--check[^\n]*\$from\n/, 'a found record is weighed by the rule (--check) like a fresh one');
  assert.match(job, /if: success\(\) && steps\.lrec\.outputs\.cache-hit != 'true' && needs\.plan\.outputs\.looks_key != ''/, 'kept only from a fresh measure that passed');
});

// ------------------------------------------------------------------ the horizon destination (delight-visit 5.3)
// (the hub, Nov 25: FLIGHT's proof ahead of LAND's build) One colossal form a land, which LAND lays out in a kit's cell as a
// point of interest: C.poi({ kind: 'destination', x, z, r, top, pass }), x and z in the world's metres (the landing at
// 0, 0), r its radius at the flight band (m), top its height over the land (m), pass as the other places'. What it must
// be, measured by the ruler on all 16 lands, the flight left alone (12 m/s on the landing's heading):
//   - one a land in the visit's first 14 min, and only one;
//   - on the landing's heading, 6-10 km out (its centre within r + SIGHT of the way);
//   - reached in 8-14 min (passed at 480-840 s);
//   - the same from any path: found again from a heading 2 deg off and from a shorter visit, the same place and size;
//   - passed by the slip with no rule's push: r at most the widest form test/unit/flight-sim.mjs flies past (#484), or
//     its foot off the way by more than r + the slip's own zone.
// Until LAND lays one out the test is a TODO (it runs, and says what is missing); once any land has one, every land is held to it.
const DEST_MIN = 14 * 60;
const DEST_R = Math.max(...[...(await import('node:fs')).readFileSync(new URL('./flight-sim.mjs', import.meta.url), 'utf8').matchAll(/\[(\d+), 3200\]/g)].map((m) => +m[1]));
const destOf = (land) => land.places.filter((p) => p.kind === 'destination');
const DEST_LANDS = Array.from({ length: 16 }, (_, k) => flyLand(k, DEST_MIN)), DEST_ANY = DEST_LANDS.some((l) => destOf(l).length > 0);   // (flown once: the TODO's check and the test's own)
test('ruler: the horizon destination: one a land on the landing heading 6-10 km out, reached in 8-14 min, the same from any path, passed by the slip', { todo: DEST_ANY ? false : 'LAND: no destination in any kit yet (C.poi({ kind: \'destination\', x, z, r, top, pass }))' }, () => {
  assert.ok(DEST_R >= 800, `the widest form flight-sim.mjs flies past: ${DEST_R} m`);
  for (let k = 0; k < 16; k++) {
    const land = DEST_LANDS[k], D = destOf(land);
    assert.equal(D.length, 1, `k${k}: ${D.length} destinations in the first ${DEST_MIN / 60} min (want one)`);
    const d = D[0], dist = Math.hypot(d.x, d.z), tag = `k${k}: its destination at (${d.x.toFixed(0)}, ${d.z.toFixed(0)})`;
    assert.ok(typeof d.r === 'number' && d.r > 0 && typeof d.top === 'number' && d.top > 0, `${tag}: r ${d.r}, top ${d.top} (want both, in m)`);
    assert.ok(dist >= 6000 && dist <= 10000, `${tag}: ${dist.toFixed(0)} m out (want 6-10 km)`);
    assert.ok(d.d <= d.r + 600, `${tag}: ${d.d.toFixed(0)} m off the way, its radius ${d.r} (want within r + 600: on the heading)`);
    assert.ok(d.t >= 480 && d.t <= 840, `${tag}: reached at ${d.t.toFixed(0)} s (want 8-14 min)`);
    assert.ok(d.r <= DEST_R || d.d > d.r + 6, `${tag}: ${2 * d.r} m across on the way (the slip is proven past ${2 * DEST_R} m: flight-sim.mjs)`);
    for (const other of [flyLand(k, DEST_MIN, land.heading + 2 * Math.PI / 180), flyLand(k, d.t + 60)]) {
      const e = destOf(other).find((p) => p.x === d.x && p.z === d.z);
      assert.ok(e && e.r === d.r && e.top === d.top, `${tag}: not the same from another path (a heading 2 deg off, or a shorter visit)`);
    }
  }
});

// ------------------------------------------------------------------ the visit's bars (delight-visit item B)
// (the hub, Nov 25: "CI turns its bars into a gate test", so no later change makes the visits emptier) Every visit the
// ruler measures on the 16 lands (6 hours x 3 reads each, the first 14 min: the flights above, flown once), held to
// today's worst land with a small margin. Main, Nov 25, the worst of 288 visits:
//   - the first near pass (a place within NEAR m of the way): 379.9 s (k10)              -> by 400 s;
//   - the longest stretch with no reward (a place, a flock, a sky's change): 265 s (k8)   -> at most 280 s;
//   - the places passed (in sight, a site once): 5 in 14 min, 3.57 per 10 min (k8, k10)    -> at least 4 (one place less: a
//     count's margin is a whole place);
//   - the first sky change: 189.7 s (k3)                                                   -> by 200 s.
// These are floors under today's visits, not the curated openings' targets (BARS: a near pass by 40 s, no 180 s without a
// reward), which stand as they were. A deliberate change that moves a bar moves it here, in a PR that says why.
const VISIT_BARS = { firstNear: 400, maxGap: 280, places: 4, firstChange: 200 };
test('ruler: the visits\' bars: a near pass, no long stretch without a reward, places passed, a sky change, never worse than today\'s worst land', () => {
  let worst = { firstNear: 0, maxGap: 0, places: Infinity, firstChange: 0 };
  for (let k = 0; k < 16; k++) for (const hour of HOURS) for (let j = 0; j < 3; j++) {
    const read = (k + 16 * (1 + j * 7919)) >>> 0, at = ((read * 2654435761) >>> 0) / 4294967296 * 0.999, m = measure(DEST_LANDS[k], hour, read, at, DEST_MIN), tag = `k${k} ${hour} read ${j}`;
    assert.ok(m.firstNear !== null && m.firstNear <= VISIT_BARS.firstNear, `${tag}: the first near pass (within ${NEAR} m) at ${m.firstNear} s (bar ${VISIT_BARS.firstNear} s)`);
    assert.ok(m.maxGap <= VISIT_BARS.maxGap, `${tag}: ${m.maxGap} s with no reward from ${m.maxGapAt} s (bar ${VISIT_BARS.maxGap} s)`);
    assert.ok(m.places >= VISIT_BARS.places, `${tag}: ${m.places} places passed in ${DEST_MIN / 60} min (bar ${VISIT_BARS.places})`);
    assert.ok(m.firstChange !== null && m.firstChange <= VISIT_BARS.firstChange, `${tag}: the first sky change at ${m.firstChange} s (bar ${VISIT_BARS.firstChange} s)`);
    worst = { firstNear: Math.max(worst.firstNear, m.firstNear), maxGap: Math.max(worst.maxGap, m.maxGap), places: Math.min(worst.places, m.places), firstChange: Math.max(worst.firstChange, m.firstChange) };
  }
  if (process.env.BARS_LOG) console.log(worst);
});
