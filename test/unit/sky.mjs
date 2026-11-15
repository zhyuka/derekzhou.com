// test/unit/sky.mjs: the order of the skies (skyInit, skyPush, skyNext) and their hold and change timing
// (split from test/unit.mjs, 2026-11-07: one file an area, found by glob, so two PRs that add tests never share a file)
// plant: {"file": "src/world/225-night-sky-moon-path.js", "find": "var CEIL_KNEE = 0.04,", "with": "var CEIL_KNEE = 0.08,", "why": "the ceiling's knee wide again: a night's highlights flattened under it"}
// plant: {"file": "src/world/glsl/sky-body.glsl", "find": "  return F * starBox(d.x, sg) * starBox(d.y, sg);", "with": "  return b * exp(-dot(d, d) / (2.0 * 0.1764));", "why": "a star sampled at the pixel's centre: it pulses as it slides across pixels"}
// plant: {"file": "src/world/glsl/sky-body.glsl", "find": "c += auroraAt(rd, eS) * hzT;", "with": "c += auroraAt(rd, eS);", "why": "the aurora added over the haze at full strength"}
// plant: {"file": "src/world/222-sky-order-cycle.js", "find": "hold: S.hold * (0.9 + 0.25 * r.f())", "with": "hold: S.hold * (0.9 + 0.5 * r.f())", "why": "a sky held up to 1.4 of its hold"}
// plant: {"file": "src/world/glsl/sky-body.glsl", "find": "float lit = smoothstep(hs - 0.5, hs + 0.5, z);", "with": "float lit = 1.0;", "why": "the far storm lit whole whatever the sun's depth: lit in the blue hour and at night"}
// plant: {"file": "src/world/225-night-sky-moon-path.js", "find": "FL_SEP = 0.36,", "with": "FL_SEP = 0.2,", "why": "the flicker's flashes closer: four or five in a second"}
// plant: {"file": "src/world/glsl/sky-body.glsl", "find": "const float ANV_FK = 0.02 / 0.8966;", "with": "const float ANV_FK = 0.2 / 0.8966;", "why": "the flicker ten times brighter: a flash"}
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

test('physics: weather/far-anvil: the far storm hides the sky in the air\'s colour, its top lit above the Earth\'s shadow, its lightning a soft, slow flicker', () => {
  const g = fs.readFileSync(path.join(ROOT, 'src', 'world', 'glsl', 'sky-body.glsl'), 'utf8');
  const K = +g.match(/const float ANV_K = ([\d.]+);/)[1], FK = 0.02 / 0.8966;
  assert.ok(g.includes('const float ANV_FK = 0.02 / 0.8966;'), 'the flicker\'s peak is not Y +0.02 (ANV_FK)');
  const FC = [0.85, 0.9, 1.0], Y = (c) => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  assert.ok(Math.abs(Y(FC) - 0.8966) < 1e-4, `the flicker colour's luminance ${Y(FC).toFixed(4)} (ANV_FK's 0.8966)`);
  const NZ = cut(WORLD, '  var NOISE = { t: null', '  /* stage B: the texture');
  const VOL = new Function(STREAMS + VEC + NZ + '\n NOISE.data = noiseData(); NOISE.d64 = new Float64Array(NOISE.data); NOISE.vol = new Uint8Array(NOISE_N * NOISE_N * NOISE_N * 4); for (var z = 0; z < NOISE_N; z++) noiseLayer(z); return NOISE.vol;')();
  const w3 = (i) => ((i % 32) + 32) % 32, na = (x, y, z) => { const X = x * 32 - 0.5, Y2 = y * 32 - 0.5, Z = z * 32 - 0.5, x0 = Math.floor(X), y0 = Math.floor(Y2), z0 = Math.floor(Z), fx = X - x0, fy = Y2 - y0, fz = Z - z0; let v = 0; for (let dz = 0; dz < 2; dz++) for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) v += (dx ? fx : 1 - fx) * (dy ? fy : 1 - fy) * (dz ? fz : 1 - fz) * VOL[((w3(z0 + dz) * 32 + w3(y0 + dy)) * 32 + w3(x0 + dx)) * 4 + 3]; return v / 255; };
  // anvilAt's own lines: (its cover, its lit part, its flicker), a part at a time
  const a = g.indexOf('vec3 anvilAt('), b = g.indexOf('\n}\n', a);
  let body = g.slice(g.indexOf('{', a) + 1, b).replace(/\/\*[\s\S]*?\*\//g, '');
  assert.ok(!/flash|ray/i.test(body), 'the storm throws rays or flashes (its lightning is the flicker\'s soft glow)');
  body = body.replace(/\bfloat\s+/g, 'let ').replace(/textureLod\(uN3, vec3\(([^;]*?)\), 0\.0\)\.a/g, (m, x) => 'NA(' + x + ')').replace(/\bvec3\(/g, 'V3(');
  const AN = new Function('rd', 'uAnv', 'uAnvF', 'CH', 'NA', 'const V3 = (p, q, r) => (q === undefined ? p : [p, q, r][CH]), { abs, sqrt, exp, sin, cos, tan, max, min, pow } = Math, clamp = (x, a, b) => Math.min(Math.max(x, a), b), atan = (y, x) => Math.atan2(y, x), radians = (x) => x * Math.PI / 180, smoothstep = (e0, e1, x) => { const t = Math.min(Math.max((x - e0) / (e1 - e0), 0), 1); return t * t * (3 - 2 * t); };' + body);
  const D2R = Math.PI / 180, A = 0.9, OFF = 95, sunAz = A - OFF * D2R, D = 120;
  const anv = (phi, e, sunEl, F) => { const rd = { x: Math.sin(A + phi) * Math.cos(e), y: Math.sin(e), z: Math.cos(A + phi) * Math.cos(e) }, U = { x: A, y: D, z: sunEl, w: sunAz }, UF = F || { x: 0, y: 0, z: 0, w: 1 }; return [0, 1, 2].map((ch) => AN(rd, U, UF, ch, na)); };
  // where it is lit, the sun 3 deg down: only over the Earth's shadow at the storm, R (1 / cos d - 1); its cover whole, its parts within it
  const dc = 3 * D2R - D / 6371 * Math.cos(OFF * D2R), hs = 6371 * (1 / Math.cos(dc) - 1), F1 = { x: 1, y: 3, z: 9, w: 6 };
  let lowLit = 99, cov = 0, fpk = 0;
  for (let phi = -0.6; phi <= 0.6; phi += 0.005) for (let e = -0.004; e <= 0.12; e += 0.0005) {
    const c = anv(phi, e, -3, F1);
    assert.ok(c[0] >= 0 && c[0] <= 1 + 1e-9 && c[1] >= 0 && c[1] <= c[0] + 1e-9 && c[2] >= 0 && c[2] <= c[0] + 1e-9, 'the storm\'s lit part or flicker outside its cover');
    cov = Math.max(cov, c[0]); fpk = Math.max(fpk, c[2]);
    if (c[1] > 1e-5) lowLit = Math.min(lowLit, D * Math.tan(e) + D * D / 12742);
  }
  assert.ok(cov > 0.99 && fpk > 0.5, 'the storm has no whole cover, or its flicker no light');
  assert.ok(Math.abs(lowLit - hs) < 0.8, `its lit part begins ${lowLit.toFixed(2)} km up (the Earth's shadow there: ${hs.toFixed(2)} km)`);
  for (const se of [-7, -24]) for (let phi = -0.6; phi <= 0.6; phi += 0.02) for (let e = 0; e <= 0.12; e += 0.002) assert.ok(anv(phi, e, se)[1] === 0, `the storm is lit with the sun ${se} deg down`);
  for (let phi = -0.6; phi <= 0.6; phi += 0.02) for (let e = 0; e <= 0.12; e += 0.002) assert.ok(anv(phi, e, -24)[2] === 0, 'the storm flickers with no flash on');
  // its body is the far land's own colour at its range (atmos), and at 100 km that air is whole in every realm's kit
  assert.ok(g.includes('c = mix(c, atmos(uClShade, rd, 1000.0 * uAnv.y / max(length(rd.xz), 1e-3)), aM.x);'), 'the storm\'s body is not the air at its range (atmos: the far land\'s distance haze)');
  for (const f of ['realm-dunes.js', 'realm-above.js']) { const m = fs.readFileSync(path.join(ROOT, 'src', f), 'utf8').match(/fog: \[([\d.e-]+), [^,]+, [^,]+, ([\d.e-]+)\]/); assert.ok(m && +m[2] * 1e5 >= 5, `${f}: the air at 100 km is not whole (its depth ${m && (+m[2] * 1e5).toFixed(1)})`); }
  // the sky behind it as the page draws it: the twilight's stops at their heights, darker away from the sun, under the ground haze
  // (the dunes' at 0.45-0.85), its body the air's colour from a little lower (fogCol), its lit top through the haze and the cap
  const { WSKY } = skyWorld(1, 'night', 0.5);
  const o2l = (L, aa, bb) => { let l = L + 0.3963377774 * aa + 0.2158037573 * bb, m = L - 0.1055613458 * aa - 0.0638541728 * bb, s = L - 0.0894841775 * aa - 1.2914855480 * bb; l **= 3; m **= 3; s **= 3; return [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s].map((x) => Math.max(x, 0)); };
  const lc = (s) => o2l(s[0], s[1] * Math.cos(s[2] * D2R), s[1] * Math.sin(s[2] * D2R));
  const Lof = (c) => 0.2104542553 * Math.cbrt(0.4122214708 * c[0] + 0.5363325363 * c[1] + 0.0514459929 * c[2]) + 0.7936177850 * Math.cbrt(0.2119034982 * c[0] + 0.6806995451 * c[1] + 0.1073969566 * c[2]) - 0.0040720468 * Math.cbrt(0.0883024619 * c[0] + 0.2817188376 * c[1] + 0.6299787005 * c[2]);
  assert.ok(g.includes('float yA = dot(aA, LUMA), room = max(0.118 - dot(c, LUMA), 0.0);') && g.includes('c += aA * (yA > 1e-6 ? room * (1.0 - exp(-yA / max(room, 1e-6))) / yA : 1.0);'), 'the storm\'s light is not held by the room under its cap (the lines this test models)');
  assert.ok(g.includes('vec3 aA = (vec3(1.0, 0.6, 0.46) * aM.y * ANV_K + vec3(0.85, 0.9, 1.0) * aM.z * ANV_FK) * (1.0 - hazeSky(rd));'), 'the storm\'s light is not its lit top and its flicker through the haze (the line this test models)');
  const capAdd = (c0, ad) => { const yA = Y(ad), room = Math.max(0.118 - Y(c0), 0); return ad.map((v) => v * (yA > 1e-6 ? room * (1 - Math.exp(-yA / Math.max(room, 1e-6))) / yA : 1)); };
  const E = [0, 3, 10, 26, 58];
  const skyAt = (S, e) => { const st = S.sky.map(lc); let c = st[4]; for (let i = 0; i < 4; i++) if (e <= E[i + 1]) { const t = (e - E[i]) / (E[i + 1] - E[i]); c = st[i].map((v, j) => v + (st[i + 1][j] - v) * t); break; } return c.map((v) => v * (1 - S.skyK[2] * Math.exp(-e / S.skyK[1]))); };
  const scene = (S, e, hz) => { const h = 1 - Math.exp(-1e-3 * hz * Math.exp(-24 / 30) * 30 / Math.sin(e * D2R)), hc = lc(S.hazeC), haze = (c) => c.map((v, i) => v + (hc[i] - v) * h), ep = Math.asin(Math.sin(e * D2R) * 0.45 + 0.02) / D2R; return { h, sky: haze(skyAt(S, e)), body: haze(skyAt(S, ep)) }; };
  let showMin = 9, showMax = -9;
  for (const id of ['afterglow', 'firstlight']) for (const hz of [0.45, 0.85]) for (const e of [4, 5.5, 7]) {
    const S = WSKY[id], sc = scene(S, e, hz), ad = capAdd(sc.body, [1, 0.6, 0.46].map((v) => v * K * (1 - sc.h))), c1 = sc.body.map((v, i) => v + ad[i]);
    assert.ok(Lof(c1) <= Math.max(0.50, Lof(sc.sky)) + 1e-9, `${id}: the storm's lit top at ${e} deg reaches L ${Lof(c1).toFixed(3)} (at most 0.50, or the sky's own behind it)`);
    assert.ok((0.82 + 0.05) / (Y(c1) + 0.05) >= 4.5, `${id}: the credit over the storm's lit top reads ${((0.82 + 0.05) / (Y(c1) + 0.05)).toFixed(2)}:1`);
    showMin = Math.min(showMin, Lof(c1) - Lof(sc.sky)); showMax = Math.max(showMax, Lof(c1) - Lof(sc.sky));
  }
  assert.ok(showMax - showMin < 0.1, `the storm over the twilight's sky: L ${showMin.toFixed(3)} to ${showMax.toFixed(3)} (the air at its range is the horizon's own colour)`);
  // its flicker over the nights' and the blue hour's skies where it stands: Y +0.02 at most, under the cap, the credit kept
  for (const id of ['bluehour', 'moonlit', 'milkyway', 'aurora']) for (const hz of [0.45, 0.85]) for (const e of [3, 6]) {
    const S = WSKY[id]; if (!S) continue;
    const sc = scene(S, e, hz), ad = capAdd(sc.body, FC.map((v) => v * FK * (1 - sc.h))), c1 = sc.body.map((v, i) => v + ad[i]);
    assert.ok(Y(ad) <= 0.02 + 1e-9, `${id}: the flicker adds Y ${Y(ad).toFixed(4)} (at most 0.02: far under a flash's 10%)`);
    assert.ok(Lof(c1) <= Math.max(0.50, Lof(sc.body)) + 1e-9 && (0.82 + 0.05) / (Y(c1) + 0.05) >= 4.5, `${id}: the flicker at ${e} deg passes L 0.50 or the credit's 4.5:1`);
  }
  // the flicker's clock: 225's own lines, over an hour in 32 visits: every flash rises and falls over 100 ms or more, never two at
  // once, never more than 3 in any second, its groups 10-40 s apart; from the read (SEEDR) only after the cut, with the sun 5 deg
  // or more down, never in reduced motion
  const FL = new Function(STREAMS + cut(WORLD, '  var FL_GAP = ', '  function anvFlashAt(') + '\nreturn { RNG, subseed, anvGroup, anvEnv, FL_GAP, FL_SUN };')();
  assert.ok(FL.FL_SUN <= -5, `the flicker plays with the sun ${FL.FL_SUN} deg down (the storm unlit: 5 or more)`);
  assert.ok(WORLD.includes('if (!SKY.anv || !AFTER || reduced()) return out;') && WORLD.includes('F.r = RNG(subseed(SEEDR, 86));') && WORLD.includes('F.g.on = anvSunEl() <= FL_SUN;'), 'the flicker is not held to the storm, the read after the cut, motion and the storm unlit');
  assert.ok(WORLD.includes('if (u.uAnvF) gl.uniform4fv(u.uAnvF, anvFlashAt(SIM.t - (1 - SIM.alpha) * SIM_DT + SKY.dt));'), 'the flicker is not uploaded at the drawn time');
  let nfl = 0, minRise = 9, maxIn1 = 0, minGap = 99, maxGap = 0;
  for (let k = 0; k < 32; k++) {
    const r = FL.RNG(FL.subseed((k * 2654435761 + 7) >>> 0, 86)); let t = r.r(10, 40), lastEnd = -1e9;
    while (t < 3600) {
      const G = FL.anvGroup(r, t), f = G.fl;
      if (lastEnd > -1e9) { minGap = Math.min(minGap, f[0].s - lastEnd); maxGap = Math.max(maxGap, f[0].s - lastEnd); }
      for (let i = 0; i < f.length; i++) {
        nfl++;
        let pk = 0, tp = f[i].s; for (let u = 0; u <= 1; u += 0.001) { const v = FL.anvEnv(f[i], f[i].s + u * f[i].d); if (v > pk) { pk = v; tp = f[i].s + u * f[i].d; } }
        assert.ok(pk <= 1 && FL.anvEnv(f[i], f[i].s) < 1e-9 && FL.anvEnv(f[i], f[i].s + f[i].d) < 1e-9, 'a flash past its peak, or not from nothing to nothing');
        minRise = Math.min(minRise, tp - f[i].s, f[i].s + f[i].d - tp);
        if (i > 0) assert.ok(f[i].s >= f[i - 1].s + f[i - 1].d, 'two flashes at once');
        if (i > 0) assert.ok(f[i].s - f[i - 1].s >= 0.34, `two flashes ${(f[i].s - f[i - 1].s).toFixed(3)} s apart (a third of a second at least: so never 4 in a second)`);
        { let n = 1; for (let j = i - 1; j >= 0 && f[i].s - f[j].s < 1; j--) n++; maxIn1 = Math.max(maxIn1, n); }   // (the flashes started within the second before this one's start, itself included)
      }
      for (let i = 3; i < f.length; i++) assert.ok(f[i].s - f[i - 3].s >= 1, 'four flashes inside a second');
      lastEnd = f[f.length - 1].s + f[f.length - 1].d; t = G.next;
    }
  }
  assert.ok(minRise >= 0.1, `a flash rises or falls in ${(1000 * minRise).toFixed(0)} ms (at least 100)`);
  assert.ok(maxIn1 <= 3, `${maxIn1} flashes in a second (at most 3)`);
  assert.ok(minGap >= 10 && maxGap <= 41, `the flicker's groups ${minGap.toFixed(1)}-${maxGap.toFixed(1)} s apart (10-40)`);
  assert.ok(nfl > 32 * 3600 / 50, `only ${nfl} flashes in 32 hours`);
  // in about 3 of the 16 openings (their seeds: the bake's), 80-110 deg off the sun's bearing, 100-150 km away
  const { RNG, subseed } = new Function(STREAMS + '\nreturn { RNG, subseed };')();
  let n = 0;
  for (let k = 0; k < 16; k++) { const r = RNG(subseed((11 + k * 0x9e3779b9) >>> 0, 83)); if (r.f() < 3 / 16) n++; r.sign(); const off = r.r(80, 110), d = r.r(100, 150); assert.ok(off >= 80 && off <= 110 && d >= 100 && d <= 150, 'the storm stands outside 80-110 deg off the sun, or 100-150 km'); }
  assert.ok(n >= 2 && n <= 4, `the far storm stands in ${n} of the 16 openings (about 3)`);
  assert.ok(/var rA = RNG\(subseed\(J\.seed, 83\)\), anv = rA\.f\(\) < 3 \/ 16, side = rA\.sign\(\), off = rA\.r\(80, 110\), dist = rA\.r\(100, 150\);/.test(WORLD), 'the storm\'s draw is not the one this test models');
  // never glittering: 1x against 2x2 at a laptop's pixel across it, in display codes as shown, its lit top over the afterglow
  // and its flicker at its peak over the moonlit sky, each through the cap over the sky where it stands
  const code = (x) => { x = Math.min(Math.max(x, 0), 1); return 255 * (x <= 0.0031308 ? 12.92 * x : 1.055 * Math.pow(x, 1 / 2.4) - 0.055); };
  const px = 0.0578 * D2R, Ff = { x: 1, y: 3, z: 9, w: 4 };
  let worst = 0;
  for (const [id, se, F, pick] of [['afterglow', -3, null, (c) => [1, 0.6, 0.46].map((v) => v * K * c[1])], ['moonlit', -24, Ff, (c) => FC.map((v) => v * FK * c[2])]]) {
    const bg = scene(WSKY[id], 5, 0.45).body;
    for (let phi = -0.5; phi <= 0.5; phi += 0.0029) for (let e = 0; e <= 0.11; e += 0.0013) {
      const one = capAdd(bg, pick(anv(phi, e, se, F))), ref = [0, 0, 0];
      for (const [ox, oy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) capAdd(bg, pick(anv(phi + ox * px / 4, e + oy * px / 4, se, F))).forEach((v, i) => { ref[i] += v / 4; });
      worst = Math.max(worst, ...[0, 1, 2].map((i) => Math.abs(code(bg[i] + one[i]) - code(bg[i] + ref[i]))));
    }
  }
  assert.ok(worst <= 3, `the storm at 1x is ${worst.toFixed(1)} codes from 2x2 (at most 3)`);
});

// ------------------------------------------------------------------ the light ceiling's knee (night contrast A)
// fs-comp's own ceiling line, with 225's knee: never past the ceiling (W8), continuous and rising, and a highlight up to
// 0.06 under the ceiling passed as it is (the knee narrowed: a night keeps its highlights' contrast)
test('sky: the light ceiling keeps every pixel under it and passes highlights to within 0.06 of it', () => {
  const comp = fs.readFileSync(path.join(ROOT, 'src', 'world', 'glsl', 'fs-comp.glsl'), 'utf8');
  assert.ok(comp.includes('if (Lk > Kc) c *= pow((Kc + uCeil.y * (1.0 - exp(-(Lk - Kc) / uCeil.y))) / Lk, 3.0);'), 'fs-comp\'s light ceiling is not the line this test models');
  const knee = +WORLD.match(/var CEIL_KNEE = ([\d.]+),/)[1], ceil = 0.525, Kc = ceil - knee;
  const out = (L) => (L > Kc ? Kc + knee * (1 - Math.exp(-(L - Kc) / knee)) : L);
  let prev = 0;
  for (let L = 0; L <= 1.5; L += 0.0005) {
    const o = out(L);
    assert.ok(o <= ceil + 1e-12, `L ${L.toFixed(4)} leaves the ceiling at ${o} (W8: at most ${ceil})`);
    assert.ok(o >= prev - 1e-12 && o <= L + 1e-12, `the ceiling's curve at L ${L.toFixed(4)} goes back or brightens`);
    prev = o;
  }
  assert.ok(Math.abs(out(ceil - 0.06) - (ceil - 0.06)) < 1e-12, `a highlight 0.06 under the ceiling is changed (the knee ${knee}: at most 0.06)`);
});

// ------------------------------------------------------------------ the stars never glitter as they slide (stars-flux)
// sky-body.glsl's own starErf and starBox run here (their GLSL lines, made JS); a star at a random place between the pixel
// centres, its pixels each min(its share, the head) as the shader adds them: the light it puts on the screen is the
// same wherever it stands (within 2%), and no pixel passes the head, bright stars included
test('sky: a star\'s light on the screen is the same wherever it stands between pixels (no glitter)', () => {
  const g = fs.readFileSync(path.join(ROOT, 'src', 'world', 'glsl', 'sky-body.glsl'), 'utf8');
  const fn = (name) => { const m = g.match(new RegExp('^float ' + name + '\\(([^)]*)\\) \\{(.*)\\}\\s*$', 'm')); assert.ok(m, name + ' not found as a one-line function in sky-body.glsl'); return m; };
  const js = (src) => src.replace(/\bfloat\s+/g, 'let ').replace(/\b(sign|sqrt|exp)\(/g, 'Math.$1(').replace(/(\d)\.(?!\d)/g, '$1.0');
  const E = fn('starErf'), B = fn('starBox');
  const starErf = new Function(E[1].replace(/float /g, ''), js(E[2]));
  const starBox = new Function('starErf', B[1].replace(/float /g, ''), js(B[2])).bind(null, starErf);
  const STF = +g.match(/const float STF = ([\d.]+);/)[1];
  assert.ok(g.includes('return F * starBox(d.x, sg) * starBox(d.y, sg);'), 'starAt does not integrate its bell over the pixel (starBox on both axes)');
  const PX = g.match(/^\s*vec2 d = gl_FragCoord\.xy - (.*);\s*$/m);
  assert.ok(PX, 'starAt does not measure the star from the pixel in screen pixels (vec2 d = gl_FragCoord.xy - ...)');
  assert.ok(g.includes('sg = clamp(sqrt(F / cp), 0.5, 0.7);') && g.includes('F = min(F, cp * sg * sg);'), 'starAt does not cap the star (at most 0.7 px wide, its flux cut to fit)');
  assert.ok(!/head \* \(1\.0 - exp\(-s/.test(g), 'the stars still go through the pixel\'s saturating cap');
  const shown = (b, head, ox, oy) => {   // the star's light on the screen, its pixels each capped as the shader caps them
    const cp = 2 * Math.PI * Math.max(head, 1e-5), sg = Math.min(Math.max(Math.sqrt(b * STF / cp), 0.5), 0.7), F = Math.min(b * STF, cp * sg * sg);
    let sum = 0, peak = 0, half = 0;
    for (let y = -12; y <= 12; y++) for (let x = -12; x <= 12; x++) { const v = Math.min(F * starBox(x - ox, sg) * starBox(y - oy, sg), head); sum += v; peak = Math.max(peak, v); }
    for (let y = -12; y <= 12; y++) for (let x = -12; x <= 12; x++) if (Math.min(F * starBox(x - ox, sg) * starBox(y - oy, sg), head) >= peak / 2) half++;
    return { sum, peak, half };
  };
  {   // the shader's own projection (its vec2 d line, made JS) on a tall window (393 x 852, 60 deg up): a star's pixel offset
    // is the true one at the centre and at the side (a step of one pixel moves it 1 +- 0.01 pixel), so the box is the footprint
    const V = (a, b, c) => [a, b, c], dotv = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2], nrm = (a) => { const l = Math.hypot(...a); return a.map((x) => x / l); };
    const uRes = [393, 852], ty = Math.tan(Math.PI / 6), uProj = [ty * 393 / 852, ty], uCamR = V(1, 0, 0), uCamU = V(0, 1, 0), uCamF = V(0, 0, 1);
    const expr = PX[1].replace(/vec2\(([^,]+), ([^)]*\))\) \* 0\.5 \+ 0\.5\) \* uRes/, '[($1) * 0.5 + 0.5, ($2) * 0.5 + 0.5]');
    const proj = (sd) => { const zf = Math.max(dotv(sd, uCamF), 1e-4); return [((dotv(sd, uCamR) / (zf * uProj[0])) * 0.5 + 0.5) * uRes[0], ((dotv(sd, uCamU) / (zf * uProj[1])) * 0.5 + 0.5) * uRes[1]]; };
    assert.ok(/zf \* uProj\.x/.test(PX[1]) && /zf \* uProj\.y/.test(PX[1]) && /\* uRes$/.test(PX[1].trim()), 'the star\'s screen place is not main\'s projection inverted (dot(sd, uCamR) / (zf * uProj.x) ... * uRes): ' + expr);
    const rdAt = (x, y) => nrm([uCamF[0] + uCamR[0] * (x / uRes[0] * 2 - 1) * uProj[0], uCamF[1] + uCamU[1] * (y / uRes[1] * 2 - 1) * uProj[1], 1]);
    for (const [x, y] of [[196.5, 426.5], [10.5, 840.5], [380.5, 20.5]]) {
      const a = proj(rdAt(x, y)), b = proj(rdAt(x + 1, y)), c = proj(rdAt(x, y + 1));
      assert.ok(Math.abs(a[0] - x) < 1e-6 && Math.abs(a[1] - y) < 1e-6, `the pixel (${x}, ${y})'s own direction projects to (${a})`);
      assert.ok(Math.abs(b[0] - a[0] - 1) < 0.01 && Math.abs(c[1] - a[1] - 1) < 0.01, `at (${x}, ${y}) a pixel's step is ${(b[0] - a[0]).toFixed(3)}, ${(c[1] - a[1]).toFixed(3)} pixels (1)`);
    }
  }
  let seed = 7; const rnd = () => ((seed = (seed * 1103515245 + 12345) >>> 0) / 2 ** 32);
  for (const b of [0.07, 0.3, 1.02]) for (const head of [0.02, 0.05, 0.09]) {
    let lo = Infinity, hi = 0;
    for (let k = 0; k < 64; k++) { const r = shown(b, head, rnd() - 0.5, rnd() - 0.5); lo = Math.min(lo, r.sum); hi = Math.max(hi, r.sum); assert.ok(r.peak <= head + 1e-9, `b ${b}, head ${head}: a pixel at ${r.peak} passes the head`);
      assert.ok(r.half <= 6, `b ${b}, head ${head}: ${r.half} pixels at half its peak (a point: at most 6)`); }
    assert.ok((hi - lo) / hi < 0.02, `b ${b}, head ${head}: the star's light swings ${(100 * (hi - lo) / hi).toFixed(1)}% as it slides (at most 2%)`);
  }
});

// ------------------------------------------------------------------ the sky's lights behind its haze (aurora-haze)
// the galaxy and the aurora are behind the haze, as the moon is: each term scaled by what the haze lets through
test('sky: the galaxy and the aurora are seen through the haze (1 - hazeSky), never over it', () => {
  const g = fs.readFileSync(path.join(ROOT, 'src', 'world', 'glsl', 'sky-body.glsl'), 'utf8');
  const m = g.match(/float (\w+) = 1\.0 - hazeSky\(rd\);\s*vec3 (\w+) = \1 \*/);
  assert.ok(m, 'the haze\'s transmittance (1.0 - hazeSky(rd)) and its tint are not worked out before the galaxy and the aurora');
  for (const f of ['galaxyAt', 'auroraAt']) {
    const uses = g.split('\n').filter((l) => l.includes('c += ' + f + '('));
    assert.ok(uses.length >= 1, f + ' is not added to the sky');
    for (const l of uses) assert.ok(l.includes(f + '(rd, eS) * ' + m[2]), f + ' is added without the haze over it: ' + l.trim());
  }
});
