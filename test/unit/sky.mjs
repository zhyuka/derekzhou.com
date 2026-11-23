// test/unit/sky.mjs: the order of the skies (skyInit, skyPush, skyNext) and their hold and change timing
// (split from test/unit.mjs, 2026-11-07: one file an area, found by glob, so two PRs that add tests never share a file)
// plant: {"file": "src/world/225-night-sky-moon-path.js", "find": "var CEIL_KNEE = 0.04,", "with": "var CEIL_KNEE = 0.08,", "why": "the ceiling's knee wide again: a night's highlights flattened under it"}
// plant: {"file": "src/world/glsl/sky-body.glsl", "find": "  return F * starBox(d.x, sg) * starBox(d.y, sg);", "with": "  return b * exp(-dot(d, d) / (2.0 * 0.1764));", "why": "a star sampled at the pixel's centre: it pulses as it slides across pixels"}
// plant: {"file": "src/world/glsl/sky-body.glsl", "find": "c += auroraAt(rd, eS) * hzT;", "with": "c += auroraAt(rd, eS);", "why": "the aurora added over the haze at full strength"}
// plant: {"file": "src/world/222-sky-order-cycle.js", "find": "hold: S.hold * (0.9 + 0.25 * r.f())", "with": "hold: S.hold * (0.9 + 0.5 * r.f())", "why": "a sky held up to 1.4 of its hold"}
// plant: {"file": "src/world/229-meteors.js", "find": "var y = M.long ? M.y : M.y * Math.sin(Math.PI * e / M.dur);", "with": "var y = M.y;", "why": "a short meteor that pops on and off at full light"}
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

// ------------------------------------------------------------------ the meteors (delight-night §2)
// 229's own plan and stroke run here (meteorList, meteorPlan, meteorShape): the counts a stay over 10^4 stays; a long one
// from under 2 deg up or out of the view to out of it, its wake rigid, its light constant, at most 2.7 px a frame at 60 Hz
// on a laptop; a short one 0.3-1 s at 3-25 deg/s, its light rising and falling softly (the owner's one exception to
// no-fades, quoted in RULES.json), its stroke over each frame's own path; none in a twilight; none under reduced motion;
// sky-body.glsl's meteorAt keeps its light within 2% as it slides between pixels
const METEORS = cut(WORLD, '  var METEOR = {', '  function meteorStep(');
const metWorld = () => vm.runInThisContext('(function () { var PI = Math.PI, DEG = PI / 180;\n' + STREAMS + VEC + METEORS + ' return { meteorList, meteorPlan, meteorShape, meteorAt3, METEOR }; })')();
test('night: meteors, long grazers crossing the view and short soft ones, on the night skies only', () => {
  const K = metWorld(), ang = (a, b) => Math.acos(Math.max(-1, Math.min(1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2]))) * 180 / Math.PI;
  const tanX = Math.tan(36 * Math.PI / 180), tanY = tanX / 1.6, pxDeg = 900 / (2 * Math.atan(tanY) * 180 / Math.PI);   // (1440x900)
  const inView = (d, psi, pitch) => { const a = psi * Math.PI / 180, b = pitch * Math.PI / 180, f = [Math.sin(a) * Math.cos(b), Math.sin(b), Math.cos(a) * Math.cos(b)], r = [Math.cos(a), 0, -Math.sin(a)], u = [-Math.sin(a) * Math.sin(b), Math.cos(b), -Math.cos(a) * Math.sin(b)], z = d[0] * f[0] + d[1] * f[1] + d[2] * f[2]; if (z <= 0) return false; return Math.abs((d[0] * r[0] + d[2] * r[2]) / z / tanX) < 1 && Math.abs((d[0] * u[0] + d[1] * u[1] + d[2] * u[2]) / z / tanY) < 1; };
  for (const id of ['afterglow', 'bluehour', 'firstlight']) assert.equal(K.meteorList({ id, n: 3, at: 0, hold: 100 }, 7, 4, 100).length, 0, id + ': no meteor in a twilight');
  const N = 10000, cnt = { milkyway: [0, 0], aurora: [0, 0], moonlit: [0, 0] };
  for (const id of Object.keys(cnt)) for (let s = 1; s <= N; s++) {
    const L = K.meteorList({ id, n: s % 9, at: 0, hold: id === 'moonlit' ? 190 : 100 }, s * 2654435761 >>> 0, 4, id === 'moonlit' ? 190 : 100);
    let t = -Infinity;
    for (const M of L) {
      cnt[id][M.long ? 0 : 1]++;
      assert.ok(M.at >= 4 && M.at + M.dur <= (id === 'moonlit' ? 190 : 100) + 1e-9 && M.at >= t, `${id}: in its stay, in turn, apart`); t = M.at + M.dur + K.METEOR.GAP - 1e-9;
      if (id === 'moonlit') assert.ok(M.y >= K.METEOR.BRIGHT, 'the moonlit sky: bright ones only');
      if (!M.long) assert.ok(M.dur >= 0.3 && M.dur <= 1 && M.w >= 3 && M.w <= 25, 'a short one: 0.3-1 s at 3-25 deg/s');
    }
  }
  const mean = (id, k) => cnt[id][k] / N;
  assert.ok(mean('milkyway', 0) > 0.85 && mean('milkyway', 0) < 1.15, `about one long one a stay (${mean('milkyway', 0).toFixed(2)})`);
  assert.ok(mean('aurora', 1) > 1.5 && mean('aurora', 1) <= 3, `1-3 short ones a stay (${mean('aurora', 1).toFixed(2)})`);
  assert.ok(mean('moonlit', 0) < 0.6 && mean('moonlit', 1) <= 0.6, `the moonlit sky's fewer (${mean('moonlit', 0).toFixed(2)}, ${mean('moonlit', 1).toFixed(2)})`);
  let worst = 0;
  for (let s = 1; s <= 400; s++) for (const long of [true, false]) {
    const R = ((x) => () => ((x = (x * 1103515245 + 12345) >>> 0) / 2 ** 32))(s), w = long ? 3 + 2 * R() : 3 + 22 * R(), M = { long, w, dur: long ? K.METEOR.SPAN / w : 0.3 + 0.7 * R(), y: 0.08, u: [R(), R(), R(), R()], at: 0, plan: null };
    const psi = 360 * R(), pitch = 6; M.plan = K.meteorPlan(M, psi, pitch, tanX, tanY);
    const a = K.meteorShape(M, 0, 1 / 60), b = K.meteorShape(M, M.dur - 1e-6, 1 / 60);
    if (long) {
      assert.ok(a.head[1] <= Math.sin(2.05 * Math.PI / 180) || !inView(a.head, psi, pitch), `seed ${s}: a long one starts under 2 deg up or out of the view`);
      assert.ok(!inView(b.head, psi, pitch) || b.head[1] <= Math.sin(2 * Math.PI / 180), `seed ${s}: and ends out of it`);
      for (let t = 1; t < M.dur - 1; t += 0.7) { const p = K.meteorShape(M, t, 1 / 60), q = K.meteorShape(M, t + 1 / 60, 1 / 60); assert.ok(Math.abs(ang(p.head, p.tail) - K.METEOR.WAKE) < 1e-6 && p.y === M.y, 'rigid, its light constant'); worst = Math.max(worst, ang(p.head, q.head) * pxDeg); }
    } else {
      assert.ok(a.y < 1e-4 && b.y < 1e-3, 'a short one rises from nothing and falls to nothing');
      const m = K.meteorShape(M, M.dur / 2, 1 / 60); assert.ok(Math.abs(m.y - M.y) < 1e-9, 'its light at its height mid-way');
      const p = K.meteorShape(M, 0.2, 1 / 60), q = K.meteorShape(M, 0.2 + 1 / 60, 1 / 60); if (p && q) assert.ok(ang(q.head, q.tail) >= ang(p.head, q.head) - 1e-9, 'its stroke covers the frame\'s own path');
      const el0 = Math.asin(a.head[1]) * 180 / Math.PI; assert.ok(el0 >= 20 - 1e-6 && el0 <= 55 + 1e-6, `a short one starts mid-sky (${el0.toFixed(1)} deg up)`);
    }
  }
  assert.ok(worst <= 2.7, `a long one moves ${worst.toFixed(2)} px a frame at 60 Hz (1440x900; at most 2.7)`);
  const S = fs.readFileSync(path.join(ROOT, 'src', 'world', '229-meteors.js'), 'utf8');
  assert.ok(S.includes('var E = SKY.seq[SKY.i]; if (!E || reduced() || !SIM.V) return;') && S.includes("if (E && E.met && !reduced())"), 'none under reduced motion');
  assert.ok(S.includes('first ? METEOR.QUIET : 4'), 'none in the opening stay\'s first seconds (its still)');
  const RJ = JSON.parse(fs.readFileSync(path.join(ROOT, 'RULES.json'), 'utf8')), NF = (RJ.rules || RJ).find((r) => r.id === 'no-fades');
  assert.ok(NF.rule.includes('short meteor') && NF.source.some((q) => q.quote === 'Allow short ones too' && q.date === '2026-11-15'), 'no-fades names the short meteors\' exception, quoting the owner');
  console.log(`# meteors a stay: milky way ${mean('milkyway', 0).toFixed(2)} long + ${mean('milkyway', 1).toFixed(2)} short, moonlit ${mean('moonlit', 0).toFixed(2)} + ${mean('moonlit', 1).toFixed(2)}; a long one ${worst.toFixed(2)} px a frame`);
});
test('night: a meteor\'s stroke keeps its light as it slides between pixels (no glitter)', () => {
  const g = fs.readFileSync(path.join(ROOT, 'src', 'world', 'glsl', 'sky-body.glsl'), 'utf8');
  const fn = (name) => g.match(new RegExp('^float ' + name + '\\(([^)]*)\\) \\{(.*)\\}\\s*$', 'm'));
  const js = (src) => src.replace(/\bfloat\s+/g, 'let ').replace(/\b(sign|sqrt|exp)\(/g, 'Math.$1(').replace(/(\d)\.(?!\d)/g, '$1.0');
  const E = fn('starErf'), B = fn('starBox'), starErf = new Function(E[1].replace(/float /g, ''), js(E[2])), starBox = new Function('starErf', B[1].replace(/float /g, ''), js(B[2])).bind(null, starErf);
  assert.ok(g.includes('float v = uMetH.w * (starBox(d, sg) * along * tap + SKYTAU * sg * sg * starBox(dh.x, sg) * starBox(dh.y, sg));'), 'meteorAt\'s light as measured here');
  const shown = (Ax, Ay, Bx, By, sg) => { const L = Math.hypot(Bx - Ax, By - Ay), ax = (Bx - Ax) / L, ay = (By - Ay) / L, k = 0.70710678 / sg; let sum = 0;
    for (let y = -40; y <= 40; y++) for (let x = -60; x <= 60; x++) { const fx = x - Ax, fy = y - Ay, s = fx * ax + fy * ay, d = Math.abs(fx * ay - fy * ax), along = 0.5 * (starErf(s * k) - starErf((s - L) * k)), tap = 0.2 + 0.8 * Math.min(Math.max(s / L, 0), 1);
      sum += starBox(d, sg) * along * tap + 2 * Math.PI * sg * sg * starBox(x - Bx, sg) * starBox(y - By, sg); } return sum; };
  let lo = Infinity, hi = 0, seed = 5; const rnd = () => ((seed = (seed * 1103515245 + 12345) >>> 0) / 2 ** 32);
  for (let k = 0; k < 48; k++) { const ox = rnd() - 0.5, oy = rnd() - 0.5, v = shown(-20 + ox, -6 + oy, 20 + ox, 6 + oy, 0.75); lo = Math.min(lo, v); hi = Math.max(hi, v); }
  assert.ok((hi - lo) / hi < 0.02, `its light swings ${(100 * (hi - lo) / hi).toFixed(2)}% as it slides (at most 2%)`);
});
