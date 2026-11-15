// The events (src/world/216-events.js, physics: air/events): rare sights placed by where they are, on a hex lattice a
// tier, from the read's own stream after the cut. Path-independent (a site is the same however it is asked for and
// in whatever order), each tier's sites apart, at most one rare site in reach anywhere, none before the cut, none
// near the landing, a tier's share of the ground in reach as its spacing says.
// plant: {"file": "src/world/216-events.js", "find": "if (ti === 0 || !evYields(seed, all[i])) out.push(all[i]);", "with": "out.push(all[i]);", "why": "two rare sites in reach at once"}
// plant: {"file": "src/world/216-events.js", "find": "var EV_JIT = 0.24,", "with": "var EV_JIT = 0.45,", "why": "a tier's sites jittered close enough to meet"}
// plant: {"file": "src/world/216-events.js", "find": "function evSeed() { return AFTER ?", "with": "function evSeed() { return true ?", "why": "sites before the cut (the opening's frames would show the read's own sights)"}
import { test, assert, vm, WORLD, cut, STREAMS } from '../unit-lib.mjs';

const EV = cut(WORLD, '  /* ---------------------------------------------------------------- the events: rare sights, placed */', '  /* ---------------------------------------------------------------- ');
function page(read, after = true) {
  return vm.runInThisContext('(function () {\n  \'use strict\';\n  var PI = Math.PI, SEEDR = ' + (read >>> 0) + ', AFTER = ' + after + ';\n' + STREAMS + EV +
    '  return { eventsNear: eventsNear, EVAPI: EVAPI, EV_TIERS: EV_TIERS, EV_JIT: EV_JIT, EV_REACH: EV_REACH, EV_CLEAR: EV_CLEAR, evTier: evTier, evSeed: evSeed };\n})')();
}
const READS = [1, 77, 0xdeadbeef, 123456789];

test('events: none before the cut, none near the landing (the opening\'s frames never show the read\'s own sights)', () => {
  assert.equal(page(77, false).eventsNear(20000, 0, 50000).length, 0, 'before the cut: none');
  for (const r of READS) {
    const G = page(r); assert.ok(G.EV_CLEAR >= G.EV_REACH + 2000, 'the landing\'s clear ring is wider than the reach');
    assert.equal(G.eventsNear(0, 0, G.EV_CLEAR - 1).length, 0, 'none within the clear ring');
  }
});

test('events: placed and path-independent (a site is the same however and in whatever order it is asked for)', () => {
  for (const r of READS) {
    const A = page(r), B = page(r), C = page(r ^ 1);
    const a = A.eventsNear(30000, -12000, 40000), seen = new Map(a.map((s) => [s.id, s]));
    const pts = [[52000, 5000], [10000, -30000], [30000, -12000]]; pts.reverse();
    let shared = 0;
    for (const [x, z] of pts) for (const s of B.eventsNear(x, z, 25000)) { const t = seen.get(s.id); if (t && t.d <= 40000) { shared++; assert.deepEqual([s.kind, s.x, s.z, s.tier], [t.kind, t.x, t.z, t.tier], `site ${s.id} the same from (${x}, ${z})`); } }
    assert.ok(shared > 5, 'the sites asked for from elsewhere are the same sites');
    assert.deepEqual(A.eventsNear(30000, -12000, 40000), a, 'asked again: the same');
    const c = C.eventsNear(30000, -12000, 40000); assert.notDeepEqual(c.map((s) => s.id + s.x), a.map((s) => s.id + s.x), 'another read: other sites');
    for (let i = 1; i < a.length; i++) assert.ok(a[i].d >= a[i - 1].d, 'nearest first');
  }
});

test('events: each tier\'s sites apart, at most one rare site in reach anywhere, and each tier\'s share of the ground in reach', () => {
  const G = page(0xdeadbeef), seed = G.evSeed(), R = G.EV_REACH, out = {};
  for (let ti = 0; ti < G.EV_TIERS.length; ti++) {
    const T = G.EV_TIERS[ti]; if (!T.kinds.length) continue;
    const s = G.evTier(seed, ti, 150000, 150000, 160000, []); let least = Infinity;
    for (let i = 0; i < s.length; i++) for (let j = i + 1; j < s.length; j++) least = Math.min(least, Math.hypot(s[i].x - s[j].x, s[i].z - s[j].z));
    assert.ok(least >= T.D * (1 - 2 * G.EV_JIT) - 1e-6 && (ti === 0 || least > 2 * R), `${T.name}: its sites ${(least / 1000).toFixed(1)} km apart at least (a rare tier's over twice the reach, ${2 * R / 1000} km)`);
  }
  let rare2 = 0, n = 0; const cover = [0, 0, 0];
  for (let x = 8000; x < 300000; x += 1500) for (let z = 8000; z < 300000; z += 1500) {
    const e = G.eventsNear(x, z, R); n++;
    if (e.filter((s) => s.tier > 0).length > 1) rare2++;
    for (let ti = 0; ti < 3; ti++) if (e.some((s) => s.tier === ti)) cover[ti]++;
  }
  assert.equal(rare2, 0, 'at most one rare site in reach, anywhere');
  for (let ti = 0; ti < 3; ti++) out[G.EV_TIERS[ti].name] = cover[ti] / n;
  if (process.env.EVN) console.log(JSON.stringify(out));
  const want = (D) => Math.PI * R * R / (D * D * Math.sqrt(3) / 2);
  assert.ok(Math.abs(out.common - Math.min(1, want(8000))) < 0.12, `common: in reach over ${(100 * out.common).toFixed(0)}% of the ground (about ${(100 * want(8000)).toFixed(0)}%)`);
  assert.ok(Math.abs(out.uncommon - want(19000)) < 0.05, `uncommon: ${(100 * out.uncommon).toFixed(1)}% (about ${(100 * want(19000)).toFixed(1)}%)`);
  assert.equal(out.rare, 0, 'rare: no kind yet');
  assert.deepEqual(G.EVAPI.TIERS.map((t) => t.kinds), [['fogpool'], ['murmuration'], []], 'the first kinds: fog pools, a dusk murmuration');
  assert.match(WORLD, /events: EVAPI,/, 'the realms and the birds read it as WORLD.events');
  // the rare tier given a kind (as it will be): still at most one rare site in reach (a rare site yields to a rarer one)
  const H = page(0xdeadbeef); H.EV_TIERS[2].kinds.push('a rare sight'); let both = 0, yielded = 0;
  for (let x = 8000; x < 400000; x += 1500) for (let z = 8000; z < 400000; z += 1500) {
    const e = H.eventsNear(x, z, R).filter((s) => s.tier > 0); if (e.length > 1) both++;
  }
  for (const s of H.evTier(H.evSeed(), 1, 200000, 200000, 200000, [])) if (H.evTier(H.evSeed(), 2, s.x, s.z, 2 * R, []).length) yielded++;
  assert.ok(yielded > 0, 'some uncommon sites stand near a rare one (so yielding is tried)');
  assert.equal(both, 0, 'at most one rare site in reach, with the rarest tier filled');
});
