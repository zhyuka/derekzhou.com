// test/unit/sky.mjs: the order of the skies (skyInit, skyPush, skyNext) and their hold and change timing
// (split from test/unit.mjs, 2026-11-07: one file an area, found by glob, so two PRs that add tests never share a file)
// plant: {"file": "src/world/222-sky-order-cycle.js", "find": "hold: S.hold * (0.9 + 0.25 * r.f())", "with": "hold: S.hold * (0.9 + 0.5 * r.f())", "why": "a sky held up to 1.4 of its hold"}
// plant: {"file": "src/world/glsl/sky-body.glsl", "find": "const float HALO_N = 1.31;", "with": "const float HALO_N = 1.5;", "why": "the halo from glass, not ice: a 38-deg ring"}
// plant: {"file": "src/world/glsl/sky-body.glsl", "find": "c += haloAt(rd) * uMoon.w;", "with": "c += haloAt(rd);", "why": "the halo whole whatever the moon's depth: it stays as the moon sinks"}
// plant: {"file": "src/world/222-sky-order-cycle.js", "find": "veil: mix32(SKY.vS ^ Math.imul(seq.length + 1, 0x9e3779b9))", "with": "veil: mix32(SKY.vS)", "why": "the veil the visit's, not the stay's: every moonlit stay of a visit veiled, or none"}
import { test, assert, fs, os, path, vm, crypto, execFileSync, ROOT, TMP, WORLD, cut, golden, md5, upd, digest, STREAMS, VEC, fileURLToPath } from '../unit-lib.mjs';

// ------------------------------------------------------------------ the sky order
const SKYDEF = cut(WORLD, '  var WSKY = {', '  /* ---- a sky\'s light on a kit');
const SKYORD = cut(WORLD, '  /* ---- the order (the live\'s pushSky and nextSky, on the world\'s streams) */', '  /* ---- the cycle at t');
const HEAD0 = cut(WORLD, '  function airHeading0()', '\n', true);   // (the landing's heading: the air's, 215)
function skyWorld(seed, hour, at) {   // skyInit, skyPush and skyNext as the page runs them, a fake page under them (the colours unread)
  return vm.runInThisContext('(function (SEED, HOURV, AT) {\n  \'use strict\';\n' +
    '  var DEVMODE = false, OPT = { skyScene: null, skyNext: null, skyDt: null }, HOUR = HOURV, J = { seed: SEED };\n' +
    '  function attr(n) { return n === \'data-sky-at\' ? String(AT) : null; }\n' +
    '  function lin2lab(c) { return [0, 0, 0]; } function lab2linA() { return [0, 0, 0]; } function lin2lab3() { return [0, 0, 0]; }\n' +
    '  var PI = Math.PI, DEG = Math.PI / 180;\n' + STREAMS + VEC +
    '  function lch() { return [0, 0, 0]; }\n' + SKYDEF + HEAD0 + SKYORD +
    '  skyInit({ paramsBase: new Float32Array(128) });\n' +
    '  return { SKY: SKY, WSKY: WSKY, skyNext: skyNext, skyReseed: skyReseed, SKY_RECENT: SKY_RECENT, SKY_FAR: SKY_FAR };\n})')(seed, hour, at);
}
// (the openings as a set) the cut: the order after the sky on show drawn again from the visit's own read; the opening
// (its sky, hold and place) is the opening seed's, the rest the read's, and the order's rules still hold after it
test('sky: after the cut the order is the visit\'s own read\'s, the opening kept', () => {
  const after = (read, inMove) => {
    const K = skyWorld(11, 'sunset', 0.5); K.skyNext(); K.SKY.i = 0; K.SKY.k = inMove ? 0.3 : 0;
    const open = JSON.stringify(K.SKY.seq.slice(0, inMove ? 2 : 1));
    K.skyReseed(read); for (let n = 0; n < 30; n++) K.skyNext();
    const ids = K.SKY.seq.map((x) => x.id), back = Math.min(K.SKY_RECENT, K.SKY.ids.length - 2);
    for (let i = 1; i < ids.length; i++) assert.ok(!ids.slice(Math.max(0, i - back), i).includes(ids[i]), `read ${read}: sky ${i} (${ids[i]}) is one of the last ${back}`);
    for (const id of new Set(ids)) assert.equal(K.SKY.visits[id], ids.filter((x) => x === id).length, `read ${read}: ${id}'s visits count the order`);
    return { open, head: JSON.stringify(K.SKY.seq.slice(0, inMove ? 2 : 1).map((x) => [x.id, x.at, x.hold, x.move])), rest: K.SKY.seq.slice(inMove ? 2 : 1).map((x) => x.id + ':' + x.hold.toFixed(4)).join(' ') };
  };
  for (const inMove of [false, true]) {
    const a = after(5, inMove), b = after(5 + 16, inMove), c = after(5, inMove);
    assert.equal(a.head, b.head, 'the skies on show are kept, whatever the read');
    assert.notEqual(a.rest, b.rest, 'two reads of one opening go on differently');
    assert.equal(a.rest, c.rest, 'one read, one order');
  }
});
test('sky: the order\'s rules', () => {
  const hours = ['dawn', 'day', 'rain', 'sunset', 'dusk', 'night'];
  let far = 0, steps = 0; const K0 = skyWorld(1, 'day', 0.5);
  for (let seed = 1; seed <= 120; seed++) {
    const hour = hours[seed % hours.length], K = skyWorld(seed * 2654435761 >>> 0, hour, (seed % 10) / 10), { SKY, WSKY } = K;
    const land = SKY.land[hour] || SKY.land.day;
    assert.ok(land.includes(SKY.seq[0].id), `seed ${seed}: the landing sky ${SKY.seq[0].id} is not one ${hour} lists (${land})`);
    assert.equal(SKY.landing.sky, SKY.seq[0].id);
    for (let n = 0; n < 40; n++) K.skyNext();
    const seen = new Set(SKY.seq.map((x) => x.id));
    assert.equal(seen.size, SKY.ids.length, `seed ${seed}: every sky seen in 40 changes (${[...seen]})`);
    const back = Math.min(K.SKY_RECENT, SKY.ids.length - 2);
    for (let i = 1; i < SKY.seq.length; i++) {
      const id = SKY.seq[i].id, prev = SKY.seq[i - 1];
      assert.ok(SKY.ids.includes(id));
      assert.ok(!SKY.seq.slice(Math.max(0, i - back), i).some((x) => x.id === id), `seed ${seed}: sky ${i} (${id}) is one of the last ${back}`);
      if (!prev.far) assert.ok(WSKY[prev.id].near.includes(id), `seed ${seed}: ${prev.id} -> ${id} is not near, but not marked far`);
      else far++;
      steps++;
      assert.ok(SKY.seq[i].at > prev.at && SKY.seq[i].hold > 0 && SKY.seq[i].move >= 55 && SKY.seq[i].move < 60);
    }
  }
  assert.ok(far > 0 && far / steps < K0.SKY_FAR, `far changes ${(far / steps).toFixed(3)} of ${steps} (some, and fewer than SKY_FAR's draws: a far draw may still land on a near sky)`);
});
test('sky: the same seed, the same order (golden)', () => {
  const order = (seed) => { const K = skyWorld(seed, 'night', 0.5); for (let n = 0; n < 30; n++) K.skyNext(); return K.SKY.seq.map((x) => x.id + ':' + x.hold.toFixed(6) + ':' + x.move.toFixed(6)); };
  assert.deepEqual(order(424242), order(424242));
  assert.notDeepEqual(order(424242), order(424243));
  golden('sky.order', { 424242: digest(order(424242)), 7: digest(order(7)) });
});

// ------------------------------------------------------------------ the sky's hold and change timing
// (dev-speed item 5d) skyInit and skyPush as the page runs them (skyWorld above): every hold 0.9-1.15 of its sky's own
// (the moonlit sea's 190 s among them), each change 55-60 s, each sky starting as the last change ends, and the visit
// opening as far through its first hold as the hour's data-sky-at says (0.9 of the hold at the most; 0.5 when unread)
test('sky timing: holds 0.9-1.15 of their sky\'s, changes 55-60 s, each sky as the last change ends', () => {
  let moon = 0;
  for (let seed = 1; seed <= 60; seed++) {
    const K = skyWorld(seed * 40503 >>> 0, ['dawn', 'day', 'rain', 'sunset', 'dusk', 'night'][seed % 6], 0.3); const { SKY, WSKY } = K;
    for (let n = 0; n < 30; n++) K.skyNext();
    SKY.seq.forEach((s, i) => {
      const own = WSKY[s.id].hold;
      assert.ok(s.hold >= 0.9 * own - 1e-9 && s.hold < 1.15 * own + 1e-9, `seed ${seed}, sky ${i} (${s.id}): hold ${s.hold} against its ${own}`);
      assert.ok(s.move >= 55 && s.move < 60, `seed ${seed}, sky ${i}: change ${s.move} s`);
      if (i) { const p = SKY.seq[i - 1]; assert.equal(s.at, p.at + p.hold + p.move, `seed ${seed}, sky ${i} starts as the last change ends`); }
      if (s.id === 'moonlit') { moon++; assert.ok(s.hold >= 171, `the moonlit sea's hold ${s.hold} (190 x 0.9 at the least)`); }
    });
  }
  assert.ok(moon > 0, 'the moonlit sea came in 60 visits');
});
test('sky timing: the visit opens as far through its first hold as data-sky-at says', () => {
  for (const at of [0, 0.25, 0.5, 0.999, 1]) {
    const { SKY } = skyWorld(7, 'night', at), s = SKY.seq[0];
    assert.ok(Math.abs(s.at + s.hold * at * 0.9) < 1e-9, `at ${at}: the first sky starts ${s.at} (hold ${s.hold})`);
    assert.equal(SKY.landing.at, at);
  }
  for (const bad of ['x', -1, 2]) { const { SKY } = skyWorld(7, 'night', bad); assert.equal(SKY.landing.at, 0.5, `data-sky-at ${bad}: opens halfway`); }
});

test('physics: weather/moon-halo: the 22 deg ring and the moon dogs, only adding light, under the ceiling, never glittering', () => {
  // sky-body.glsl's own haloDev and haloAt, made JS a channel at a time (their vec3s are colours)
  const g = fs.readFileSync(path.join(ROOT, 'src', 'world', 'glsl', 'sky-body.glsl'), 'utf8');
  const N = +g.match(/const float HALO_N = ([\d.]+);/)[1], K = +WORLD.match(/var HALO_K = ([\d.]+);/)[1];
  const fbody = (name) => { const a = g.indexOf(name), b = g.indexOf('\n}\n', a); return g.slice(g.indexOf('{', a) + 1, b); };
  const js = (t) => t.replace(/\bfloat\s+/g, 'let ').replace(/\bvec3\s+/g, 'let ').replace(/\bvec3\(/g, 'V3(').replace(/(\d)\.(?!\d)/g, '$1.0');
  const hdev = (n) => 2 * Math.asin(Math.min(Math.max(n * 0.5, -1), 1)) * 180 / Math.PI - 60;
  const H = new Function('rd', 'uMoon', 'uHalo', 'CH', 'HALO_N', 'haloDev', 'const V3 = (a, b, c) => (b === undefined ? a : [a, b, c][CH]), { abs, sqrt, exp, sin, cos, asin, acos, atan2, max, min } = Math, atan = (y, x) => Math.atan2(y, x), clamp = (x, a, b) => Math.min(Math.max(x, a), b), degrees = (x) => x * 180 / Math.PI, radians = (x) => x * Math.PI / 180, pow = Math.pow, mix = (a, b, t) => a + (b - a) * t, smoothstep = (e0, e1, x) => { const t = Math.min(Math.max((x - e0) / (e1 - e0), 0), 1); return t * t * (3 - 2 * t); }, dot = (a, b) => a.x * b.x + a.y * b.y + a.z * b.z;' + js(fbody('vec3 haloAt(')).replace('dot(rd, uMoon.xyz)', 'dot(rd, uMoon)'));
  const halo = (rd, m) => [0, 1, 2].map((ch) => H({ x: rd[0], y: rd[1], z: rd[2] }, { x: m[0], y: m[1], z: m[2] }, { x: 1, y: K }, ch, N, hdev));
  const dirAE = (az, e) => [Math.sin(az) * Math.cos(e), Math.sin(e), Math.cos(az) * Math.cos(e)], D2R = Math.PI / 180;
  assert.ok(Math.abs(hdev(N) - 21.84) < 0.05, `ice's minimum deviation ${hdev(N).toFixed(2)} deg (21.84)`);
  for (const me of [5, 15, 30, 45]) {
    const m = dirAE(0.4, me * D2R);
    // the ring straight above the moon (away from the dogs): its peak and its empty inside
    let best = { v: -1 };
    for (let th = 10; th <= 30; th += 0.02) { const v = halo(dirAE(0.4, (me + th) * D2R), m)[1]; if (v > best.v) best = { v, th }; if (th < 21.3) assert.ok(v === 0, `the halo brightens ${th.toFixed(1)} deg from the moon (inside its ring: nothing)`); }
    if (me + 30 < 89) assert.ok(best.th >= 21.8 && best.th <= 22.4, `moon at ${me} deg: the ring peaks ${best.th.toFixed(2)} deg out (21.8-22.4)`);
    // the dogs: at the moon's height, their azimuth offset the plates' minimum deviation (n' = sqrt(n^2 - sin^2 e) / cos e)
    const np = Math.sqrt(N * N - Math.sin(me * D2R) ** 2) / Math.cos(me * D2R), want = hdev(np);
    let bd = { v: -1 };
    for (let da = 15; da <= 55; da += 0.02) { const v = halo(dirAE(0.4 + da * D2R, me * D2R), m)[1]; if (v > bd.v) bd = { v, da }; }
    assert.ok(Math.abs(bd.da - want) <= 0.3, `moon at ${me} deg: its dog stands ${bd.da.toFixed(2)} deg off in azimuth (the plates': ${want.toFixed(2)} +-0.3)`);
  }
  // composited over the moonlit sky at its brightest place (the dog, the moon at 15 deg), saturated and under the ceiling
  const { WSKY } = skyWorld(1, 'night', 0.5), S = WSKY.moonlit;
  const o2l = (L, a, b) => { let l = L + 0.3963377774 * a + 0.2158037573 * b, mm = L - 0.1055613458 * a - 0.0638541728 * b, s = L - 0.0894841775 * a - 1.2914855480 * b; l **= 3; mm **= 3; s **= 3; return [4.0767416621 * l - 3.3077115913 * mm + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * mm - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * mm + 1.7076147010 * s]; };
  const Lof = (c) => Math.cbrt(0.2104542553 * 0 + 0.4122214708 * c[0] + 0.5363325363 * c[1] + 0.0514459929 * c[2]) * 0.2104542553 + Math.cbrt(0.2119034982 * c[0] + 0.6806995451 * c[1] + 0.1073969566 * c[2]) * 0.7936177850 - Math.cbrt(0.0883024619 * c[0] + 0.2817188376 * c[1] + 0.6299787005 * c[2]) * 0.0040720468;
  const m15 = dirAE(0.4, 15 * D2R), np15 = Math.sqrt(N * N - Math.sin(15 * D2R) ** 2) / Math.cos(15 * D2R);
  const dogAdd = halo(dirAE(0.4 + hdev(np15) * D2R, 15 * D2R), m15), ringAdd = halo(dirAE(0.4, (15 + 22.1) * D2R), m15);
  // the dog at the moon's height (the low sky's stops, 1-3), the ring's top 37 deg up (the high sky's, 3-5)
  for (const [st, add] of S.sky.slice(1, 4).map((x) => [x, dogAdd]).concat(S.sky.slice(3, 6).map((x) => [x, ringAdd]))) {
    const c0 = o2l(st[0], st[1] * Math.cos(st[2] * D2R), st[1] * Math.sin(st[2] * D2R)).map((x) => Math.max(x, 0)), c1 = c0.map((v, i) => v + add[i]);
    const L0 = Lof(c0), L1 = Lof(c1), Y = (c) => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];   // (unclamped: the halo itself must stay under 0.53, not the ceiling for it)
    assert.ok(L1 - L0 >= 0.02 && L1 - L0 <= 0.07, `over the moonlit sky's [${st}] the halo adds L ${(L1 - L0).toFixed(3)} (about 0.03-0.06)`);
    assert.ok(L1 <= 0.53, `the halo's brightest place reaches L ${L1.toFixed(3)} (at most 0.53)`);
    assert.ok((0.82 + 0.05) / (Y(c1) + 0.05) >= 4.5, `the credit over the halo's brightest place reads ${((0.82 + 0.05) / (Y(c1) + 0.05)).toFixed(2)}:1 (at least 4.5)`);
  }
  // never glittering: 1x against 2x2 at a laptop's pixel (0.0578 deg) across the ring and a dog, in display codes of its light alone
  const code = (x) => { x = Math.min(Math.max(x, 0), 1); return 255 * (x <= 0.0031308 ? 12.92 * x : 1.055 * Math.pow(x, 1 / 2.4) - 0.055); };
  let worst = 0;
  for (let dx = -40; dx <= 40; dx += 0.37) for (const dy of [0, 7.3, 22.1]) {
    const at = (x, y) => halo(dirAE(0.4 + x * D2R, (15 + y) * D2R), m15);
    const one = at(dx, dy), ref = [0, 0, 0];
    for (const [ox, oy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) at(dx + ox * 0.25 * 0.0578, dy + oy * 0.25 * 0.0578).forEach((v, i) => { ref[i] += v / 4; });
    worst = Math.max(worst, ...[0, 1, 2].map((i) => Math.abs(code(one[i]) - code(ref[i]))));
  }
  assert.ok(worst <= 3, `the halo at 1x is ${worst.toFixed(1)} codes from 2x2 (at most 3)`);
  // with the moon's depth and under the haze: the line in the moon block, before the haze is laid over the moon's lights
  const mb = g.indexOf('if (uHalo.x > 0.0) c += haloAt(rd) * uMoon.w;'), hz = g.indexOf('c = c0 + (c - c0) * (1.0 - hazeSky(rd));', mb);
  assert.ok(mb > 0 && hz > mb && hz - mb < 200, 'the halo is not added with the moon\'s depth (uMoon.w) just before the haze is laid over the moon\'s lights');
  // the veil is the stay's: about one moonlit stay in three, across the 16 openings and after the cut; the opening's stay by
  // the opening's seed (its baked still), a stay kept at the cut keeps its veil, and the uniform reads the moon's own stay
  assert.ok(WORLD.includes('gl.uniform4f(u.uHalo, MOON.E ? MOON.E.veil : 0, HALO_K, 0, 0);'), 'the halo\'s uniform does not read the veil of the stay whose moon is up');
  let lit = 0, all = 0, mixed = 0;
  for (let k = 0; k < 16; k++) {
    const seed0 = (11 + k * 0x9e3779b9) >>> 0, W = skyWorld(seed0, 'night', 0.5), W2 = skyWorld(seed0, 'night', 0.5);
    assert.equal(W.SKY.seq[0].veil, W2.SKY.seq[0].veil, `opening ${k}: its first stay's veil is not the opening seed's`);
    for (let j = 0; j < 40; j++) W.skyNext();
    const before = W.SKY.seq.map((e) => e.veil);
    W.SKY.i = 0; W.SKY.k = 0; W.skyReseed((seed0 * 2654435761 + 977) >>> 0);
    assert.equal(W.SKY.seq[0].veil, before[0], `opening ${k}: the stay on show changed its veil at the cut`);
    for (let j = 0; j < 40; j++) W.skyNext();
    const ms = W.SKY.seq.filter((e) => e.id === 'moonlit'), v = ms.reduce((a, e) => a + e.veil, 0);
    lit += v; all += ms.length; if (v > 0 && v < ms.length) mixed++;
  }
  assert.ok(lit / all >= 0.22 && lit / all <= 0.45, `the ice veil over ${lit} of ${all} moonlit stays (about one in three)`);
  assert.ok(mixed >= 12, `only ${mixed} of 16 visits have both veiled and clear moonlit stays (the veil is each stay's own)`);
});
