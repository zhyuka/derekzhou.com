// test/unit/sky.mjs: the order of the skies (skyInit, skyPush, skyNext) and their hold and change timing
// (split from test/unit.mjs, 2026-11-07: one file an area, found by glob, so two PRs that add tests never share a file)
// plant: {"file": "src/world/glsl/sky-body.glsl", "find": "  return F * starBox(d.x, sg) * starBox(d.y, sg);", "with": "  return b * exp(-dot(d, d) / (2.0 * 0.1764));", "why": "a star sampled at the pixel's centre: it pulses as it slides across pixels"}
// plant: {"file": "src/world/222-sky-order-cycle.js", "find": "hold: S.hold * (0.9 + 0.25 * r.f())", "with": "hold: S.hold * (0.9 + 0.5 * r.f())", "why": "a sky held up to 1.4 of its hold"}
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

// ------------------------------------------------------------------ the night's bodies (delight-night §1 and §4)
// 215's airSkyFrame and eclPole and 227's starLim and venusDir run here as the page runs them; the shader's own tint
// and Venus constants read from sky-body.glsl
const NIGHT = cut(WORLD, '  var AIR_LAT =', '  function weather()') + cut(WORLD, '  var STAR_LIM =', '  function venusFails(');
function nightWorld(seed, keyAz) {
  return vm.runInThisContext('(function (SEED, KEYAZ) {\n  \'use strict\';\n  var PI = Math.PI, DEG = Math.PI / 180, J = { seed: SEED }, AIR_SUN_NIGHT = -24, SUNU = { on: false }, SKY = {};\n' +
    '  var SIM = { V: { light: { sunAz: KEYAZ } } };\n  function airSkySun(V, el) { return dirAzEl(V.light.sunAz, el); }\n' + STREAMS + VEC + NIGHT +
    '  return { F: function (m) { return airSkyFrame(SIM.V, m); }, eclPole: eclPole, starLim: starLim, venusDir: venusDir, V: SIM.V, STAR_LIM: STAR_LIM, VEN_EL: VEN_EL, VEN_TOP_Y: VEN_TOP_Y };\n})')(seed, keyAz);
}
const dot3 = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2], cross3 = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const angD = (a, b) => Math.atan2(Math.hypot(...cross3(a, b)), dot3(a, b)) * 180 / Math.PI;
test('night: the sky frame (the pole, north, east, the ecliptic through the sun) is the sky\'s own', () => {
  for (let s = 1; s <= 60; s++) for (const morning of [false, true]) {
    const keyAz = (s * 47) % 360, K = nightWorld(s * 2654435761 >>> 0, keyAz), F = K.F(morning);
    assert.ok(F.lat >= 28 && F.lat <= 48, `seed ${s}: latitude ${F.lat}`);
    assert.ok(Math.abs(Math.hypot(...F.P) - 1) < 1e-9 && Math.abs(Math.asin(F.P[1]) * 180 / Math.PI - F.lat) < 1e-9, `seed ${s}: the pole stands the latitude up`);
    assert.ok(Math.abs(F.N[1]) < 1e-12 && Math.abs(dot3(F.N, F.E)) < 1e-12, 'north and east are level and at right angles');
    const R = cross3(F.N, [0, 1, 0]); assert.ok(angD(R, F.E) < 1e-6, 'east is on north\'s right (the camera\'s right: cross(f, up))');
    const key = [Math.sin(keyAz * Math.PI / 180), 0, Math.cos(keyAz * Math.PI / 180)], bear = (Math.atan2(dot3(key, F.E), dot3(key, F.N)) * 180 / Math.PI + 360) % 360;
    const want = morning ? 90 - F.bear : 270 + F.bear;
    assert.ok(Math.abs(((bear - want + 540) % 360) - 180) < 1e-6, `seed ${s}: the key's bearing ${bear} (${want})`);
    for (const D of [3, 7, 12, 18, 24]) {
      const S = [key[0] * Math.cos(-D * Math.PI / 180), Math.sin(-D * Math.PI / 180), key[2] * Math.cos(-D * Math.PI / 180)], E = K.eclPole(F, S, [0, 0, 0]);
      assert.ok(Math.abs(dot3(E, S)) < 1e-9 && Math.abs(Math.hypot(...E) - 1) < 1e-9, 'the ecliptic passes through the sun');
      const dec = 90 - angD(F.P, S);
      assert.ok(Math.abs(angD(E, F.P) - Math.max(23.44, Math.abs(dec))) < 1e-6, `seed ${s}, D ${D}: the ecliptic's pole ${angD(E, F.P)} deg from the pole (23.44, or the nearest past the solstices' declination: ${dec})`);
    }
  }
});
test('night: the evening star keeps to the sun (its elongation, its side, east in the evening) and sets with its depth', () => {
  for (let s = 1; s <= 60; s++) for (const morning of [false, true]) {
    const K = nightWorld(s * 40503 >>> 0, (s * 71) % 360), F = K.F(morning), side = morning ? -1 : 1, eps = K.VEN_EL[0] + (K.VEN_EL[1] - K.VEN_EL[0]) * ((s * 0.618) % 1);
    assert.ok(K.VEN_EL[1] <= 47 && K.VEN_EL[0] > 0, 'within 47 deg of the sun');
    let prev = null; const D0 = [3, 7, 24][s % 3];
    for (let D = 3; D <= 24; D += 0.5) {
      const v = K.venusDir(F, eps, side, D, D0, [0, 0, 0]), S = K.venusDir(F, 0, side, D, D0, [0, 0, 0]), S0 = K.venusDir(F, 0, side, D0, D0, [0, 0, 0]);
      assert.ok(Math.abs(Math.asin(S[1]) * 180 / Math.PI + D) < 1e-9, 'elongation 0 is the sun itself');
      assert.ok(Math.abs(angD(v, S) - eps) < 1e-6, `elongation ${angD(v, S)} (${eps})`);
      if (D === D0) {
        assert.ok(Math.abs(dot3(v, K.eclPole(F, S0, [0, 0, 0]))) < 1e-9, 'on the ecliptic at the opening\'s depth');
        assert.ok(side * dot3(v, cross3(F.P, S)) > 0, `seed ${s}: ${morning ? 'west' : 'east'} of the sun on the sky (cross(P, S) is east)`);
      }
      if (D <= 7 && D0 <= 7) assert.ok(v[1] > S[1], `seed ${s}, D ${D}: above the sun in its own twilight (${v[1]} under ${S[1]})`);
      if (prev && v[1] > -0.3) { assert.ok(v[1] < prev[1] + 1e-12, `seed ${s}: it sinks as the sun does (D ${D})`); assert.ok(angD(v, prev) < 0.5 + 1e-9, `seed ${s}: no jump (${angD(v, prev)} deg in 0.5 deg of the sun)`); }
      prev = v;
    }
  }
});
test('night: the stars come out by the sun\'s depth, brightest first; their colours never move their light; Venus under L 0.50', () => {
  const K = nightWorld(1, 0), g = fs.readFileSync(path.join(ROOT, 'src', 'world', 'glsl', 'sky-body.glsl'), 'utf8');
  for (let D = 0; D < 30; D += 0.25) assert.ok(K.starLim(D + 0.25) >= K.starLim(D), 'the limit only deepens with the sun');
  assert.ok(K.starLim(3) < 1.5 && K.starLim(6) >= 0.9 && K.starLim(6) <= 1.5 && Math.abs(K.starLim(12) - 4.5) < 1e-9 && K.starLim(18) >= 6, 'civil, nautical, astronomical');
  assert.ok(g.includes('float starMag(float b) { return 6.2 - 4.0 * log(b / 0.07) / log(10.0); }'), 'starMag');
  const mag = (b) => 6.2 - 4.0 * Math.log10(b / 0.07);
  assert.ok(mag(1.02) < mag(0.3) && mag(0.3) < mag(0.07), 'brightest first');
  assert.ok(/float bk = clamp\(\(ml - starMag\(b\)\) \/ 0\.6, 0\.0, 1\.0\);/.test(g) && g.includes('b *= bk;'), 'each star by its own margin under the limit');
  assert.ok(!/uSunD\.z \* \(/.test(g) && /, sk = uSunD\.z \* smoothstep/.test(g), 'the amount is only the stars\' on/off');
  const stars = [...WORLD.matchAll(/post:\{[^}]*stars:([\d.]+)/g)].map((m) => +m[1]);
  assert.equal(stars.length, 6); assert.ok(stars.every((x) => x === 1), `every sky's stars' amount is 1 (no blend between skies): ${stars}`);
  const lab = (c) => { const l = Math.cbrt(0.4122214708 * c[0] + 0.5363325363 * c[1] + 0.0514459929 * c[2]), m = Math.cbrt(0.2119034982 * c[0] + 0.6806995451 * c[1] + 0.1073969566 * c[2]), s = Math.cbrt(0.0883024619 * c[0] + 0.2817188376 * c[1] + 0.6299787005 * c[2]); return [0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s, 1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s]; };
  const Y = (c) => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2], W = [0.92 / 0.94, 1, 1 / 0.94];
  const T = g.match(/^vec3 starTint[\s\S]*?^}/m)[0], cols = [...T.matchAll(/vec3\(([\d.]+), ([\d.]+), ([\d.]+)\)/g)].map((m) => [+m[1], +m[2], +m[3]]).filter((c) => c[0] !== 0.92);
  assert.equal(cols.length, 4);
  for (const c of cols) { const L = lab(c); assert.ok(Math.abs(Y(c) - Y(W)) < 2e-3, `tint ${c}: Y ${Y(c)}`); assert.ok(Math.abs(L[0] - lab(W)[0]) < 5e-3, `tint ${c}: L ${L[0]}`); assert.ok(Math.hypot(L[1], L[2]) < 0.065, `tint ${c}: pastel`); }
  const vc = g.match(/return vec3\(([\d.]+), ([\d.]+), ([\d.]+)\) \* min\(v, hv\)/); assert.ok(vc, 'Venus\'s colour, capped at its head');
  const V = [+vc[1], +vc[2], +vc[3]]; assert.ok(Math.abs(Y(V) - 1) < 2e-3, 'Venus\'s colour at Y 1');
  for (const bg of [[0, 0, 0], [0.01, 0.012, 0.03], [0.05, 0.06, 0.1]]) { const hv = Math.max(K.VEN_TOP_Y - Y(bg), 0), top = bg.map((x, i) => x + V[i] * hv); assert.ok(lab(top)[0] <= 0.5, `Venus over ${bg}: L ${lab(top)[0]}`); }
});
test('night: the evening star never glitters as it slides between pixels (its light the same within 2%)', () => {
  const g = fs.readFileSync(path.join(ROOT, 'src', 'world', 'glsl', 'sky-body.glsl'), 'utf8');
  const fn = (name) => g.match(new RegExp('^float ' + name + '\\(([^)]*)\\) \\{(.*)\\}\\s*$', 'm'));
  const js = (src) => src.replace(/\bfloat\s+/g, 'let ').replace(/\b(sign|sqrt|exp)\(/g, 'Math.$1(').replace(/(\d)\.(?!\d)/g, '$1.0');
  const E = fn('starErf'), B = fn('starBox'), starErf = new Function(E[1].replace(/float /g, ''), js(E[2])), starBox = new Function('starErf', B[1].replace(/float /g, ''), js(B[2])).bind(null, starErf);
  const V = g.match(/^vec3 venusAt[\s\S]*?^}/m)[0];
  assert.ok(V.includes('sg = 0.7, F = 1.1 * SKYTAU * hv * sg * sg;') && V.includes('float v = F * starBox(d.x, sg) * starBox(d.y, sg) + 0.2 * hv * exp(-length(d) / 3.0);') && V.includes('min(v, hv)') && !/uT\b/.test(V), 'venusAt: its core, glow and cap as measured here, and no clock (steady)');
  let seed = 3; const rnd = () => ((seed = (seed * 1103515245 + 12345) >>> 0) / 2 ** 32);
  for (const hv of [0.02, 0.05, 0.1]) {
    let lo = Infinity, hi = 0;
    for (let k = 0; k < 64; k++) {
      const ox = rnd() - 0.5, oy = rnd() - 0.5, F = 1.1 * 2 * Math.PI * hv * 0.49; let sum = 0, peak = 0;
      for (let y = -20; y <= 20; y++) for (let x = -20; x <= 20; x++) { const dx = x - ox, dy = y - oy; if (dx * dx + dy * dy > 400) continue; const v = Math.min(F * starBox(dx, 0.7) * starBox(dy, 0.7) + 0.2 * hv * Math.exp(-Math.hypot(dx, dy) / 3), hv); sum += v; peak = Math.max(peak, v); }
      lo = Math.min(lo, sum); hi = Math.max(hi, sum); assert.ok(peak <= hv + 1e-12);
    }
    assert.ok((hi - lo) / hi < 0.02, `head ${hv}: its light swings ${(100 * (hi - lo) / hi).toFixed(2)}% as it slides`);
  }
});
